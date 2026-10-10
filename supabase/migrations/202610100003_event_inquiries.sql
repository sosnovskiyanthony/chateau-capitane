-- B08: private-event inquiries share storage, inbox and permissions with contact messages.
-- event_package is the package label as the guest saw it (name and price), copied at submission,
-- so later menu or price changes never rewrite what was asked for. The website checks the choice
-- against the published packages; the database checks shape only.
-- kind/eventPackage are optional (default: contact, none), so the six-field B02 shape still works:
-- apply this migration before deploying the app that sends them; rolling the app back stays safe.
-- Recovery: hide the form field; stored kinds and packages stay readable in the inbox.
alter table inquiry_private.inquiries drop constraint inquiries_kind_check;
alter table inquiry_private.inquiries add constraint inquiries_kind_check check (kind in ('contact', 'event'));
alter table inquiry_private.inquiries add column event_package text
  check (char_length(event_package) between 1 and 200 and event_package = btrim(event_package) and event_package !~ '[[:cntrl:]]');
alter table inquiry_private.inquiries add constraint inquiries_package_needs_event check (event_package is null or kind = 'event');

create or replace function public.record_contact_inquiry(p_inquiry jsonb, p_key uuid, p_notification jsonb)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare
  inquiry_uuid uuid := gen_random_uuid();
  claimed_uuid uuid;
  prior inquiry_private.submission_keys%rowtype;
  payload_hash bytea;
  requested_date text;
  guest_count integer;
  required constant text[] := array['name','email','phone','date','guests','message'];
begin
  -- Validate shape/types as well as SQL constraints. Extra routing/workflow fields cannot enter storage.
  if p_inquiry is null or jsonb_typeof(p_inquiry) <> 'object'
     or not (p_inquiry ?& required) or (p_inquiry - required - 'kind' - 'eventPackage') <> '{}'::jsonb
     or exists (select 1 from jsonb_each(p_inquiry) e where jsonb_typeof(e.value) <> 'string')
then
    raise exception using errcode = '22023', message = 'invalid inquiry shape';
  end if;
  p_inquiry := p_inquiry || jsonb_build_object('kind', coalesce(p_inquiry->>'kind', 'contact'),
    'eventPackage', coalesce(p_inquiry->>'eventPackage', ''));
  if p_inquiry->>'kind' not in ('contact', 'event') or (p_inquiry->>'kind' = 'contact' and p_inquiry->>'eventPackage' <> '') then
    raise exception using errcode = '22023', message = 'invalid inquiry kind';
  end if;
  if p_notification is null or jsonb_typeof(p_notification) <> 'object'
     or not (p_notification ?& array['sender','recipient','reply_to','subject','body'])
     or (p_notification - array['sender','recipient','reply_to','subject','body']) <> '{}'::jsonb
     or exists (select 1 from jsonb_each(p_notification) e where jsonb_typeof(e.value) <> 'string')
     or p_notification->>'reply_to' <> p_inquiry->>'email' then
    raise exception using errcode = '22023', message = 'invalid notification shape';
  end if;
  if p_inquiry->>'date' <> '' then
    if not inquiry_private.is_calendar_date(p_inquiry->>'date') then
      raise exception using errcode = '22023', message = 'invalid date';
    end if;
    requested_date := p_inquiry->>'date';
  end if;
  if p_inquiry->>'guests' <> '' then
    if p_inquiry->>'guests' !~ '^[1-9][0-9]{0,3}$' then
      raise exception using errcode = '22023', message = 'invalid guests';
    end if;
    guest_count := (p_inquiry->>'guests')::integer;
  end if;
  -- Plain contact messages keep the B02 fingerprint, so retries spanning this release still deduplicate.
  payload_hash := sha256(convert_to((case when p_inquiry->>'kind' = 'contact' then jsonb_build_array(
    1, 'contact', p_inquiry->>'name', p_inquiry->>'email', p_inquiry->>'phone',
    p_inquiry->>'date', p_inquiry->>'guests', p_inquiry->>'message',
    1, p_notification->>'sender', p_notification->>'recipient', p_notification->>'reply_to',
    p_notification->>'subject', p_notification->>'body')
  else jsonb_build_array(
    2, p_inquiry->>'kind', p_inquiry->>'eventPackage', p_inquiry->>'name', p_inquiry->>'email', p_inquiry->>'phone',
    p_inquiry->>'date', p_inquiry->>'guests', p_inquiry->>'message',
    1, p_notification->>'sender', p_notification->>'recipient', p_notification->>'reply_to',
    p_notification->>'subject', p_notification->>'body') end)::text, 'UTF8'));
  if p_key is not null then
    insert into inquiry_private.submission_keys(endpoint, key, fingerprint, inquiry_id)
      values ('contact', p_key, payload_hash, inquiry_uuid)
      on conflict (endpoint, key) do nothing returning inquiry_id into claimed_uuid;
    if claimed_uuid is null then
      -- A separate statement gets a fresh READ COMMITTED snapshot after a competing claim commits.
      select * into strict prior from inquiry_private.submission_keys where endpoint = 'contact' and key = p_key;
      if prior.fingerprint <> payload_hash then
        return jsonb_build_object('kind', 'conflict');
      end if;
      return jsonb_build_object('kind', 'recorded', 'inquiryId', prior.inquiry_id);
    end if;
  end if;
  insert into inquiry_private.inquiries(id, name, email, phone, requested_date, guests, message, kind, event_package)
    values (inquiry_uuid, p_inquiry->>'name', p_inquiry->>'email', p_inquiry->>'phone',
      requested_date, guest_count, p_inquiry->>'message', p_inquiry->>'kind', nullif(p_inquiry->>'eventPackage', ''));
  insert into inquiry_private.notification_jobs(inquiry_id, purpose, payload_version, sender, recipient, reply_to, subject, body)
    values (inquiry_uuid, 'staff_notification', 1, p_notification->>'sender', p_notification->>'recipient',
      p_notification->>'reply_to', p_notification->>'subject', p_notification->>'body');
  return jsonb_build_object('kind', 'recorded', 'inquiryId', inquiry_uuid);
end;
$$;

-- Same as B07, plus kind and eventPackage on each row.
create or replace function public.staff_list_inquiries(p_staff uuid, p_status text, p_search text,
  p_before_at timestamptz, p_before_id uuid, p_limit integer)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare pattern text;
begin
  perform inquiry_private.require_staff(p_staff);
  if p_limit is null or p_limit not between 1 and 100
     or (p_status is not null and p_status not in ('new', 'in_progress', 'resolved'))
     or char_length(p_search) > 100 or ((p_before_at is null) <> (p_before_id is null)) then
    raise exception using errcode = '22023', message = 'invalid listing arguments';
  end if;
  if nullif(btrim(p_search), '') is not null then
    pattern := '%' || replace(replace(replace(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;
  return coalesce((select jsonb_agg(row_json order by created_at desc, id desc) from (
    select i.created_at, i.id, jsonb_build_object('id', i.id, 'name', i.name, 'email', i.email,
             'status', i.status, 'kind', i.kind, 'eventPackage', i.event_package,
             'requestedDate', i.requested_date, 'guests', i.guests,
             'createdAt', i.created_at, 'notification', inquiry_private.notification_summary(i.id)) row_json
      from inquiry_private.inquiries i
     where (p_status is null or i.status = p_status)
       and (pattern is null or i.name ilike pattern or i.email ilike pattern)
       and (p_before_at is null or (i.created_at, i.id) < (p_before_at, p_before_id))
     order by i.created_at desc, i.id desc
     limit p_limit) page), '[]'::jsonb);
end;
$$;

create or replace function public.staff_get_inquiry(p_staff uuid, p_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  perform inquiry_private.require_staff(p_staff);
  return (select jsonb_build_object('id', i.id, 'name', i.name, 'email', i.email, 'phone', i.phone,
      'kind', i.kind, 'eventPackage', i.event_package,
      'requestedDate', i.requested_date, 'guests', i.guests, 'message', i.message, 'status', i.status,
      'version', i.version, 'createdAt', i.created_at, 'updatedAt', i.updated_at,
      'notification', inquiry_private.notification_summary(i.id),
      'notes', coalesce((select jsonb_agg(jsonb_build_object('author', n.author_email, 'body', n.body,
          'createdAt', n.created_at) order by n.created_at, n.id)
        from inquiry_private.inquiry_notes n where n.inquiry_id = i.id), '[]'::jsonb),
      'history', coalesce((select jsonb_agg(jsonb_build_object('actor', a.actor_email, 'from', a.from_value,
          'to', a.to_value, 'at', a.created_at) order by a.created_at, a.id)
        from (select * from inquiry_private.audit_events where inquiry_id = i.id
              order by created_at desc, id desc limit 200) a), '[]'::jsonb))
    from inquiry_private.inquiries i where i.id = p_id);
end;
$$;
