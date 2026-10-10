-- B07: staff inbox. Every function takes the staff user ID that the server resolved from the
-- session (never from the browser) and re-checks membership, so a revoked member fails even
-- mid-request. Status changes carry the version the editor saw; a stale version changes nothing.
-- Audit rows hold IDs, statuses and roles only, never guest text. The server key cannot write
-- status, notes or audit rows directly: only the two security-definer functions below can, so every
-- status change follows the allowed moves and is audited.
-- Recovery (read-only inbox): as the database owner,
--   revoke execute on function public.staff_set_inquiry_status(uuid, text, uuid, integer, text),
--     public.staff_add_inquiry_note(uuid, text, uuid, text) from service_role;
-- Reading stays available; actions show "unavailable" until execute is granted back.
alter table inquiry_private.inquiries add column version integer not null default 1 check (version >= 1);
-- Newest-first keyset listing, with and without a status filter.
drop index inquiry_private.inquiries_staff_listing;
create index inquiries_staff_listing on inquiry_private.inquiries (status, created_at desc, id desc);
create index inquiries_newest on inquiry_private.inquiries (created_at desc, id desc);

create table inquiry_private.inquiry_notes (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references inquiry_private.inquiries(id),
  author_id uuid not null,
  author_email text not null check (char_length(author_email) <= 254),
  body text not null check (char_length(body) between 1 and 2000 and body = btrim(body)),
  created_at timestamptz not null default now()
);
create index inquiry_notes_by_inquiry on inquiry_private.inquiry_notes (inquiry_id, created_at);

create table inquiry_private.audit_events (
  id bigint generated always as identity primary key,
  action text not null check (action in ('status_changed', 'role_granted', 'role_changed', 'role_revoked')),
  -- Null actor: the database owner (role changes happen only in SQL).
  actor_id uuid,
  actor_email text check (char_length(actor_email) <= 254),
  inquiry_id uuid references inquiry_private.inquiries(id),
  subject_user uuid,
  from_value text check (from_value in ('new', 'in_progress', 'resolved', 'owner', 'staff')),
  to_value text check (to_value in ('new', 'in_progress', 'resolved', 'owner', 'staff')),
  created_at timestamptz not null default now()
);
create index audit_by_inquiry on inquiry_private.audit_events (inquiry_id, created_at) where inquiry_id is not null;

alter table inquiry_private.inquiry_notes enable row level security;
alter table inquiry_private.audit_events enable row level security;
revoke all on inquiry_private.inquiry_notes, inquiry_private.audit_events from public, anon, authenticated, service_role;
-- Read-only for the server; rows are added only through the functions below (append-only).
grant select on inquiry_private.inquiry_notes, inquiry_private.audit_events to service_role;

-- Role changes are audited however they are made (SQL editor, migration).
create function inquiry_private.audit_staff_role() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into inquiry_private.audit_events(action, subject_user, to_value) values ('role_granted', new.user_id, new.role);
  elsif tg_op = 'DELETE' then
    insert into inquiry_private.audit_events(action, subject_user, from_value) values ('role_revoked', old.user_id, old.role);
  elsif new.user_id is distinct from old.user_id then
    insert into inquiry_private.audit_events(action, subject_user, from_value) values ('role_revoked', old.user_id, old.role);
    insert into inquiry_private.audit_events(action, subject_user, to_value) values ('role_granted', new.user_id, new.role);
  elsif new.role is distinct from old.role then
    insert into inquiry_private.audit_events(action, subject_user, from_value, to_value)
      values ('role_changed', new.user_id, old.role, new.role);
  end if;
  return null;
end;
$$;
revoke all on function inquiry_private.audit_staff_role() from public, anon, authenticated, service_role;
create trigger audit_staff_role after insert or update or delete on inquiry_private.staff_members
for each row execute function inquiry_private.audit_staff_role();

create function inquiry_private.require_staff(p_staff uuid) returns void
language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_staff is null or not exists (select 1 from inquiry_private.staff_members where user_id = p_staff) then
    raise exception using errcode = '42501', message = 'not staff';
  end if;
end;
$$;
revoke all on function inquiry_private.require_staff(uuid) from public, anon, authenticated;
grant execute on function inquiry_private.require_staff(uuid) to service_role;

-- Notification state as staff see it: job state plus the best delivery event, if any.
create function inquiry_private.notification_summary(p_inquiry uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('state', j.state, 'attempts', j.attempts, 'lastError', j.last_error,
           'delivery', d.delivery_status)
    from inquiry_private.notification_jobs j
    left join inquiry_private.job_delivery_status d on d.job_id = j.id
   where j.inquiry_id = p_inquiry and j.purpose = 'staff_notification';
$$;
revoke all on function inquiry_private.notification_summary(uuid) from public, anon, authenticated;
grant execute on function inquiry_private.notification_summary(uuid) to service_role;

-- Newest first, keyset pagination on (created_at, id). Search is a substring match on name/email:
-- ponytail: sequential scan, fine for a few thousand inquiries; add pg_trgm indexes past that.
create function public.staff_list_inquiries(p_staff uuid, p_status text, p_search text,
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
             'status', i.status, 'requestedDate', i.requested_date, 'guests', i.guests,
             'createdAt', i.created_at, 'notification', inquiry_private.notification_summary(i.id)) row_json
      from inquiry_private.inquiries i
     where (p_status is null or i.status = p_status)
       and (pattern is null or i.name ilike pattern or i.email ilike pattern)
       and (p_before_at is null or (i.created_at, i.id) < (p_before_at, p_before_id))
     order by i.created_at desc, i.id desc
     limit p_limit) page), '[]'::jsonb);
end;
$$;
revoke all on function public.staff_list_inquiries(uuid, text, text, timestamptz, uuid, integer) from public, anon, authenticated;
grant execute on function public.staff_list_inquiries(uuid, text, text, timestamptz, uuid, integer) to service_role;

create function public.staff_get_inquiry(p_staff uuid, p_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  perform inquiry_private.require_staff(p_staff);
  return (select jsonb_build_object('id', i.id, 'name', i.name, 'email', i.email, 'phone', i.phone,
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
revoke all on function public.staff_get_inquiry(uuid, uuid) from public, anon, authenticated;
grant execute on function public.staff_get_inquiry(uuid, uuid) to service_role;

-- Allowed moves: new -> in_progress, new/in_progress -> resolved, resolved -> in_progress (reopen).
-- Returns {kind: updated|stale|invalid|not_found, status, version}.
create function public.staff_set_inquiry_status(p_staff uuid, p_email text, p_id uuid, p_version integer, p_status text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare current inquiry_private.inquiries%rowtype;
begin
  perform inquiry_private.require_staff(p_staff);
  select * into current from inquiry_private.inquiries where id = p_id for update;
  if not found then return jsonb_build_object('kind', 'not_found'); end if;
  if current.version is distinct from p_version then
    return jsonb_build_object('kind', 'stale', 'status', current.status, 'version', current.version);
  end if;
  if (current.status, p_status) not in (('new', 'in_progress'), ('new', 'resolved'),
       ('in_progress', 'resolved'), ('resolved', 'in_progress')) then
    return jsonb_build_object('kind', 'invalid', 'status', current.status, 'version', current.version);
  end if;
  update inquiry_private.inquiries set status = p_status, version = version + 1, updated_at = now() where id = p_id;
  insert into inquiry_private.audit_events(action, actor_id, actor_email, inquiry_id, from_value, to_value)
    values ('status_changed', p_staff, left(p_email, 254), p_id, current.status, p_status);
  return jsonb_build_object('kind', 'updated', 'status', p_status, 'version', current.version + 1);
end;
$$;
revoke all on function public.staff_set_inquiry_status(uuid, text, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.staff_set_inquiry_status(uuid, text, uuid, integer, text) to service_role;

-- Notes are append-only, so concurrent notes never overwrite each other. At most 100 per inquiry.
-- Returns {kind: added|full|not_found}.
create function public.staff_add_inquiry_note(p_staff uuid, p_email text, p_id uuid, p_body text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  perform inquiry_private.require_staff(p_staff);
  -- Lock the inquiry so concurrent notes cannot both pass the count check.
  perform 1 from inquiry_private.inquiries where id = p_id for update;
  if not found then return jsonb_build_object('kind', 'not_found'); end if;
  if (select count(*) from inquiry_private.inquiry_notes where inquiry_id = p_id) >= 100 then
    return jsonb_build_object('kind', 'full');
  end if;
  insert into inquiry_private.inquiry_notes(inquiry_id, author_id, author_email, body)
    values (p_id, p_staff, left(coalesce(p_email, ''), 254), btrim(p_body));
  return jsonb_build_object('kind', 'added');
end;
$$;
revoke all on function public.staff_add_inquiry_note(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.staff_add_inquiry_note(uuid, text, uuid, text) to service_role;
