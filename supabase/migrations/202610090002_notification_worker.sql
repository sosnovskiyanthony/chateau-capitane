-- B03a: recoverable notification worker. Inactive until B03b switches public intake.
-- A worker claims jobs with an expiring lease and reports one outcome per attempt.
-- Every attempt sends with the job's stable Resend idempotency key, so retries are only
-- safe inside Resend's 24-hour key window; after that, ambiguous jobs become 'uncertain'
-- for manual reconciliation instead of being resent blindly.
alter table inquiry_private.notification_jobs
  add column lease_token uuid,
  add column leased_until timestamptz,
  add column first_attempt_at timestamptz,
  add column maybe_sent boolean not null default false,
  add column provider_message_id text check (char_length(provider_message_id) between 1 and 200),
  add column last_error text check (last_error ~ '^[a-z0-9_]{1,64}$'),
  add column updated_at timestamptz not null default now(),
  add constraint lease_matches_state check ((state = 'leased') = (lease_token is not null and leased_until is not null)),
  add constraint accepted_has_message check ((state = 'accepted') = (provider_message_id is not null));
create index jobs_expired_leases on inquiry_private.notification_jobs (leased_until, id) where state = 'leased';

-- Only worker bookkeeping columns are writable; the payload trigger still guards the snapshot.
grant update (state, attempts, available_at, lease_token, leased_until, first_attempt_at,
  maybe_sent, provider_message_id, last_error, updated_at)
  on inquiry_private.notification_jobs to service_role;

create function public.claim_notification_jobs(p_limit integer, p_lease_seconds integer)
returns table (job_id uuid, lease_token uuid, attempt integer, sender text, recipient text,
  reply_to text, subject text, body text)
language plpgsql volatile security invoker set search_path = '' as $$
begin
  if p_limit is null or p_limit not between 1 and 20 or p_lease_seconds is null or p_lease_seconds not between 30 and 900 then
    raise exception using errcode = '22023', message = 'invalid claim bounds';
  end if;
  -- A lease that expired means a worker crashed mid-attempt: the send may have happened.
  -- ponytail: also counts crashes before the send as "maybe sent"; record a send-started
  -- marker if lease expiry turns out to strand never-sent jobs as 'uncertain'.
  -- Finish jobs that can no longer retry safely before claiming anything.
  update inquiry_private.notification_jobs j
     set state = case when j.maybe_sent or j.state = 'leased' then 'uncertain' else 'failed' end,
         lease_token = null, leased_until = null, updated_at = now(),
         last_error = case when j.state = 'leased' then 'lease_expired' else j.last_error end,
         maybe_sent = j.maybe_sent or j.state = 'leased'
   where j.id in (
     select c.id from inquiry_private.notification_jobs c
      where ((c.state = 'pending' and c.available_at <= now()) or (c.state = 'leased' and c.leased_until < now()))
        and (c.attempts >= 8 or c.first_attempt_at < now() - interval '23 hours')
      for update skip locked);
  return query
  update inquiry_private.notification_jobs j
     set state = 'leased', lease_token = gen_random_uuid(),
         leased_until = now() + make_interval(secs => p_lease_seconds),
         attempts = j.attempts + 1, first_attempt_at = coalesce(j.first_attempt_at, now()),
         maybe_sent = j.maybe_sent or j.state = 'leased', updated_at = now()
   where j.id in (
     select c.id from inquiry_private.notification_jobs c
      where ((c.state = 'pending' and c.available_at <= now()) or (c.state = 'leased' and c.leased_until < now()))
        -- Repeat the limits: the sweep above skips rows locked by a concurrent worker.
        and c.attempts < 8 and (c.first_attempt_at is null or c.first_attempt_at >= now() - interval '23 hours')
      order by c.available_at, c.id
      limit p_limit
      for update skip locked)
  returning j.id, j.lease_token, j.attempts, j.sender, j.recipient, j.reply_to, j.subject, j.body;
end;
$$;
revoke all on function public.claim_notification_jobs(integer, integer) from public, anon, authenticated;
grant execute on function public.claim_notification_jobs(integer, integer) to service_role;

-- Outcomes: accepted (provider ID), rejected (permanent, not sent), retryable (definitely
-- not sent, e.g. 429), ambiguous (timeout/lost response/5xx: may have been sent).
-- Returns false when the lease was lost; the caller must not assume its outcome was stored.
create function public.complete_notification_job(p_job_id uuid, p_lease_token uuid, p_outcome text,
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
  if not found then return false; end if;
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
revoke all on function public.complete_notification_job(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.complete_notification_job(uuid, uuid, text, text, text) to service_role;
