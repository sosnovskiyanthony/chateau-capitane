-- B04: signed Resend delivery events. The route verifies the Svix signature; this log
-- deduplicates by Svix message ID and never stores addresses, subjects or bodies.
-- Delivery status is derived from the log (highest rank wins), so duplicate, delayed or
-- out-of-order events cannot regress it. 'accepted' on a job only means Resend took the
-- send request; delivery is a separate fact read from job_delivery_status.
create table inquiry_private.delivery_events (
  event_id text primary key check (event_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  event_type text not null check (event_type in ('email.sent', 'email.delivery_delayed', 'email.delivered',
    'email.bounced', 'email.failed', 'email.suppressed', 'email.complained')),
  email_id text not null check (char_length(email_id) between 1 and 200),
  -- Only set when a job sent with this ID's tag or message ID exists; never guessed.
  job_id uuid references inquiry_private.notification_jobs(id),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now()
);
alter table inquiry_private.delivery_events enable row level security;
revoke all on inquiry_private.delivery_events from public, anon, authenticated, service_role;
grant select, insert on inquiry_private.delivery_events to service_role;
create index delivery_events_job on inquiry_private.delivery_events (job_id) where job_id is not null;
create index delivery_events_unmatched on inquiry_private.delivery_events (email_id) where job_id is null;
create unique index jobs_provider_message on inquiry_private.notification_jobs (provider_message_id)
  where provider_message_id is not null;

create function inquiry_private.delivery_rank(event_type text) returns integer
language sql immutable strict set search_path = '' as $$
  select case event_type when 'email.sent' then 1 when 'email.delivery_delayed' then 2
    when 'email.delivered' then 3 when 'email.complained' then 5 else 4 end;
$$;
revoke all on function inquiry_private.delivery_rank(text) from public, anon, authenticated;
grant execute on function inquiry_private.delivery_rank(text) to service_role;

create view inquiry_private.job_delivery_status with (security_invoker = true) as
select distinct on (job_id) job_id, event_type as delivery_status, occurred_at
  from inquiry_private.delivery_events where job_id is not null
 order by job_id, inquiry_private.delivery_rank(event_type) desc, occurred_at desc;
revoke all on inquiry_private.job_delivery_status from public, anon, authenticated, service_role;
grant select on inquiry_private.job_delivery_status to service_role;

-- Any tracked event proves Resend created the email, so a job whose send response was
-- lost (leased, pending retry, uncertain or failed) is resolved to accepted; its worker's
-- later report then finds the job settled. The Resend email ID is authoritative; the job
-- tag is only trusted for a job that has no message ID yet.
-- Returns 'recorded', 'duplicate', 'unrelated' (untagged mail this site did not send, e.g.
-- other senders on the account: not stored) or 'overflow' (tagged-but-unmatched backlog
-- full: the route answers 503 so Resend retries later and nothing is dropped).
create function public.record_delivery_event(p_event_id text, p_event_type text, p_email_id text,
  p_job_id uuid, p_occurred_at timestamptz)
returns text language plpgsql volatile security invoker set search_path = '' as $$
declare matched uuid;
begin
  -- Serialize per event ID so a concurrent duplicate waits and then sees the first insert.
  perform pg_advisory_xact_lock(hashtextextended('delivery_event:' || coalesce(p_event_id, ''), 0));
  if exists (select 1 from inquiry_private.delivery_events where event_id = p_event_id) then
    return 'duplicate';
  end if;
  select id into matched from inquiry_private.notification_jobs where provider_message_id = p_email_id for update;
  if matched is null and p_job_id is not null then
    update inquiry_private.notification_jobs set state = 'accepted', provider_message_id = p_email_id,
      lease_token = null, leased_until = null, last_error = null, updated_at = now()
     where id = p_job_id and provider_message_id is null
    returning id into matched;
  end if;
  if matched is null then
    if p_job_id is null then return 'unrelated'; end if;
    -- ponytail: global count; partition or expire unmatched events in B11 retention.
    if (select count(*) from inquiry_private.delivery_events where job_id is null) >= 10000 then
      return 'overflow';
    end if;
  end if;
  insert into inquiry_private.delivery_events(event_id, event_type, email_id, job_id, occurred_at)
  values (p_event_id, p_event_type, p_email_id, matched, p_occurred_at);
  return 'recorded';
end;
$$;
revoke all on function public.record_delivery_event(text, text, text, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.record_delivery_event(text, text, text, uuid, timestamptz) to service_role;

-- Unchanged except the lost-lease answer: true when a delivery event already settled the job
-- as accepted, so the worker does not report delivered mail as a lost outcome.
create or replace function public.complete_notification_job(p_job_id uuid, p_lease_token uuid, p_outcome text,
  p_provider_message_id text, p_error text)
returns boolean language plpgsql volatile security invoker set search_path = '' as $$
declare job inquiry_private.notification_jobs%rowtype;
begin
  if p_outcome is null or p_outcome not in ('accepted', 'rejected', 'retryable', 'ambiguous')
     or (p_outcome = 'accepted') <> (p_provider_message_id is not null) then
    raise exception using errcode = '22023', message = 'invalid outcome';
  end if;
  select * into job from inquiry_private.notification_jobs
   where id = p_job_id and lease_token = p_lease_token and state = 'leased' for update;
  if not found then
    return exists (select 1 from inquiry_private.notification_jobs where id = p_job_id and state = 'accepted');
  end if;
  job.maybe_sent := job.maybe_sent or p_outcome = 'ambiguous';
  update inquiry_private.notification_jobs set
    state = case
      when p_outcome = 'accepted' then 'accepted'
      when p_outcome = 'rejected' then case when job.maybe_sent then 'uncertain' else 'failed' end
      when job.attempts >= 8 or job.first_attempt_at < now() - interval '23 hours'
        then case when job.maybe_sent then 'uncertain' else 'failed' end
      else 'pending' end,
    -- Backoff 1, 2, 4 ... 60 minutes keeps all eight attempts well inside the key window.
    available_at = now() + least(power(2, job.attempts - 1) * interval '1 minute', interval '60 minutes'),
    provider_message_id = p_provider_message_id, last_error = p_error, maybe_sent = job.maybe_sent,
    lease_token = null, leased_until = null, updated_at = now()
  where id = p_job_id;
  return true;
end;
$$;
