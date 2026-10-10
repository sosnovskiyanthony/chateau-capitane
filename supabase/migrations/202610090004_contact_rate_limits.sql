-- B05: contact limits shared by every Vercel instance. Fixed-window counters keyed by an
-- HMAC of the client network (never the raw IP), plus one site-wide bucket. Rows expire
-- with their window and are deleted on later calls. Thresholds come from the caller
-- (src/lib/server/inquiries/abuse-limit.ts) so they can be tuned without a migration.
create table inquiry_private.rate_limit_hits (
  bucket text not null check (bucket ~ '^(global|subject:[0-9a-f]{64})$'),
  window_start timestamptz not null,
  expires_at timestamptz not null check (expires_at > window_start),
  hits integer not null default 1 check (hits > 0),
  primary key (bucket, window_start)
);
create index rate_limit_hits_expiry on inquiry_private.rate_limit_hits (expires_at);
alter table inquiry_private.rate_limit_hits enable row level security;
revoke all on inquiry_private.rate_limit_hits from public, anon, authenticated, service_role;
grant select, insert, update, delete on inquiry_private.rate_limit_hits to service_role;

create function inquiry_private.hit_rate_limit(p_bucket text, p_seconds integer, p_limit integer)
returns integer language plpgsql volatile security invoker set search_path = '' as $$
declare
  window_begin timestamptz := to_timestamp(floor(extract(epoch from now()) / p_seconds) * p_seconds);
  window_end timestamptz := window_begin + make_interval(secs => p_seconds);
  total integer;
begin
  insert into inquiry_private.rate_limit_hits as h (bucket, window_start, expires_at)
    values (p_bucket, window_begin, window_end)
    on conflict (bucket, window_start) do update set hits = least(h.hits + 1, 1000000000)
    returning hits into total;
  -- 0 = allowed; otherwise whole seconds until this window ends.
  if total <= p_limit then return 0; end if;
  return greatest(1, ceil(extract(epoch from window_end - now()))::integer);
end;
$$;
revoke all on function inquiry_private.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function inquiry_private.hit_rate_limit(text, integer, integer) to service_role;

create function public.check_contact_limit(p_subject text, p_key uuid,
  p_subject_limit integer, p_subject_seconds integer, p_global_limit integer, p_global_seconds integer)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare retry integer;
begin
  if p_subject is null or p_subject !~ '^[0-9a-f]{64}$'
     or p_subject_limit not between 1 and 100000 or p_global_limit not between 1 and 100000
     or p_subject_seconds not between 1 and 86400 or p_global_seconds not between 1 and 86400 then
    raise exception using errcode = '22023', message = 'invalid limit arguments';
  end if;
  -- An unchanged retry of a recorded submission cannot add a job, so it is never limited.
  if p_key is not null and exists (select 1 from inquiry_private.submission_keys
      where endpoint = 'contact' and key = p_key) then
    return jsonb_build_object('allowed', true);
  end if;
  delete from inquiry_private.rate_limit_hits where expires_at <= now();
  retry := inquiry_private.hit_rate_limit('subject:' || p_subject, p_subject_seconds, p_subject_limit);
  if retry = 0 then
    retry := inquiry_private.hit_rate_limit('global', p_global_seconds, p_global_limit);
  end if;
  if retry = 0 then return jsonb_build_object('allowed', true); end if;
  return jsonb_build_object('allowed', false, 'retryAfter', retry);
end;
$$;
revoke all on function public.check_contact_limit(text, uuid, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.check_contact_limit(text, uuid, integer, integer, integer, integer) to service_role;
