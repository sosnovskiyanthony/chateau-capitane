-- B11: owner-approved retention (2026-10-10). One bounded, repeatable cleanup call:
--   * resolved inquiries 24 months after resolution, with their notes, jobs, delivery events,
--     audit rows and duplicate-protection keys; open (new / in progress) ones are never touched,
--     and neither is any inquiry with a job still pending or leased
--   * delivery events and duplicate-protection keys older than 90 days
--   * role-change audit rows older than 24 months
-- Each call handles at most p_limit rows per step, so a backlog drains over repeated calls
-- (the route calls until nothing is left or its time budget ends). Safe to re-run or stop.
-- Backups made before a cleanup still hold the deleted rows until they expire (7 days on Pro).
create function public.run_retention(p_limit integer default 200) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  ids uuid[];
  events integer; keys integer; inquiries integer := 0; audits integer;
begin
  if p_limit is null or p_limit not between 1 and 5000 then
    raise exception using errcode = '22023', message = 'invalid limit';
  end if;

  select coalesce(array_agg(id), '{}') into ids from (
    select i.id from inquiry_private.inquiries i
     where i.status = 'resolved' and i.updated_at < now() - interval '24 months'
       and not exists (select 1 from inquiry_private.notification_jobs j
                        where j.inquiry_id = i.id and j.state in ('pending', 'leased'))
     order by i.updated_at limit p_limit for update skip locked) s;
  if cardinality(ids) > 0 then
    delete from inquiry_private.delivery_events where job_id in
      (select id from inquiry_private.notification_jobs where inquiry_id = any(ids));
    delete from inquiry_private.notification_jobs where inquiry_id = any(ids);
    delete from inquiry_private.inquiry_notes where inquiry_id = any(ids);
    delete from inquiry_private.audit_events where inquiry_id = any(ids);
    delete from inquiry_private.submission_keys where inquiry_id = any(ids);
    delete from inquiry_private.inquiries where id = any(ids);
    inquiries := cardinality(ids);
  end if;

  -- Events of a job that is still active are kept even if old (its status is still needed).
  with doomed as (
    select e.event_id from inquiry_private.delivery_events e
     where e.received_at < now() - interval '90 days'
       and not exists (select 1 from inquiry_private.notification_jobs j
                        where j.id = e.job_id and j.state in ('pending', 'leased'))
     limit p_limit)
  delete from inquiry_private.delivery_events where event_id in (select event_id from doomed);
  get diagnostics events = row_count;

  with doomed as (
    select endpoint, key from inquiry_private.submission_keys
     where created_at < now() - interval '90 days' limit p_limit)
  delete from inquiry_private.submission_keys k using doomed d where k.endpoint = d.endpoint and k.key = d.key;
  get diagnostics keys = row_count;

  with doomed as (
    select id from inquiry_private.audit_events
     where inquiry_id is null and created_at < now() - interval '24 months' limit p_limit)
  delete from inquiry_private.audit_events where id in (select id from doomed);
  get diagnostics audits = row_count;

  return jsonb_build_object('inquiries', inquiries, 'deliveryEvents', events, 'submissionKeys', keys, 'auditEvents', audits);
end;
$$;
revoke all on function public.run_retention(integer) from public, anon, authenticated;
grant execute on function public.run_retention(integer) to service_role;
