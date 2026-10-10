-- B11: one read-only snapshot for the protected /api/health check. Counts and ages only:
-- no addresses, names or message text. Server key only; read via invoker rights.
create function public.ops_snapshot() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'jobs', coalesce((select jsonb_object_agg(state, n) from
      (select state, count(*)::int n from inquiry_private.notification_jobs group by state) s), '{}'::jsonb),
    -- Age of the oldest job that is due now (pending past its retry time, or a lease that expired).
    'oldestDueJobSeconds', (select coalesce(floor(extract(epoch from now() - min(
        case when state = 'pending' then available_at else leased_until end)))::int, 0)
      from inquiry_private.notification_jobs
      where (state = 'pending' and available_at <= now()) or (state = 'leased' and leased_until <= now())),
    'deliveryProblems7d', (select count(*)::int from inquiry_private.job_delivery_status
      where delivery_status in ('email.bounced', 'email.failed', 'email.suppressed', 'email.complained')
        and occurred_at > now() - interval '7 days'),
    'unmatchedDeliveryEvents', (select count(*)::int from inquiry_private.delivery_events where job_id is null),
    'inquiries24h', (select count(*)::int from inquiry_private.inquiries where created_at > now() - interval '24 hours'),
    'loginHitsNow', (select coalesce(sum(hits), 0)::int from inquiry_private.rate_limit_hits
      where bucket like 'login:%' and expires_at > now())
  );
$$;
revoke all on function public.ops_snapshot() from public, anon, authenticated;
grant execute on function public.ops_snapshot() to service_role;
