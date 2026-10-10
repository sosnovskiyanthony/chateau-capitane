-- B02: inactive until durable intake and the B03 worker are ready.
-- Supabase supplies anon/authenticated/service_role. Only the latter can ingest.
create schema inquiry_private;
revoke all on schema inquiry_private from public, anon, authenticated;
grant usage on schema inquiry_private to service_role;

-- Keep the parser's exact YYYY-MM-DD string, including ISO year 0000.
-- PostgreSQL date has no year zero; substitute another leap year for validation only.
create function inquiry_private.is_calendar_date(value text) returns boolean
language plpgsql immutable strict set search_path = '' as $$
declare candidate text;
begin
  if value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return false; end if;
  candidate := case when left(value, 4) = '0000' then '2000' || substring(value from 5) else value end;
  return to_char(candidate::date, 'YYYY-MM-DD') = candidate;
exception when datetime_field_overflow or invalid_datetime_format then return false;
end;
$$;
revoke all on function inquiry_private.is_calendar_date(text) from public, anon, authenticated;
grant execute on function inquiry_private.is_calendar_date(text) to service_role;

create table inquiry_private.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200 and name = btrim(name) and name !~ '[[:cntrl:]]'),
  email text not null check (char_length(email) between 3 and 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text not null check (char_length(phone) <= 40 and phone = btrim(phone) and phone !~ '[\r\n]'),
  requested_date text check (inquiry_private.is_calendar_date(requested_date)),
  guests integer check (guests between 1 and 9999),
  message text not null check (char_length(message) between 1 and 5000 and message = btrim(message)),
  kind text not null default 'contact' check (kind = 'contact'),
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inquiries_staff_listing on inquiry_private.inquiries (status, created_at desc, id);

create table inquiry_private.submission_keys (
  endpoint text not null check (endpoint = 'contact'),
  key uuid not null check (key::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  fingerprint bytea not null check (octet_length(fingerprint) = 32),
  inquiry_id uuid not null references inquiry_private.inquiries(id) deferrable initially deferred,
  created_at timestamptz not null default now(),
  -- No cleanup/reuse policy yet. Keys stay reserved until one is approved.
  primary key (endpoint, key)
);

create table inquiry_private.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references inquiry_private.inquiries(id),
  purpose text not null check (purpose = 'staff_notification'),
  payload_version integer not null check (payload_version = 1),
  sender text not null check (char_length(sender) between 3 and 320 and sender !~ '[\r\n]' and
    sender ~ '^([^[:space:]<>@]+@[^[:space:]<>@]+\.[^[:space:]<>@]+|[^<>]+ <[^[:space:]<>@]+@[^[:space:]<>@]+\.[^[:space:]<>@]+>)$'),
  recipient text not null check (char_length(recipient) between 3 and 254 and recipient ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  reply_to text not null check (char_length(reply_to) between 3 and 254 and reply_to ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  subject text not null check (char_length(subject) between 1 and 300 and subject !~ '[\r\n]'),
  body text not null check (char_length(body) between 1 and 10000),
  state text not null default 'pending' check (state in ('pending', 'leased', 'accepted', 'uncertain', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 100),
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (inquiry_id, purpose)
);
create index jobs_pending on inquiry_private.notification_jobs (available_at, id) where state = 'pending';

alter table inquiry_private.inquiries enable row level security;
alter table inquiry_private.submission_keys enable row level security;
alter table inquiry_private.notification_jobs enable row level security;
revoke all on all tables in schema inquiry_private from public, anon, authenticated, service_role;
grant select, insert on all tables in schema inquiry_private to service_role;
-- No staff policies yet: B06 must introduce trusted membership before access opens.

create function inquiry_private.protect_notification_payload() returns trigger
language plpgsql set search_path = '' as $$
begin
  if row(new.inquiry_id, new.purpose, new.payload_version, new.sender, new.recipient,
         new.reply_to, new.subject, new.body, new.created_at)
     is distinct from
     row(old.inquiry_id, old.purpose, old.payload_version, old.sender, old.recipient,
         old.reply_to, old.subject, old.body, old.created_at) then
    raise exception using errcode = '23514', message = 'immutable notification payload';
  end if;
  return new;
end;
$$;
revoke all on function inquiry_private.protect_notification_payload() from public, anon, authenticated;
create trigger immutable_notification_payload before update on inquiry_private.notification_jobs
for each row execute function inquiry_private.protect_notification_payload();

create function public.record_contact_inquiry(p_inquiry jsonb, p_key uuid, p_notification jsonb)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare
  inquiry_uuid uuid := gen_random_uuid();
  claimed_uuid uuid;
  prior inquiry_private.submission_keys%rowtype;
  payload_hash bytea;
  requested_date text;
  guest_count integer;
begin
  -- Validate shape/types as well as SQL constraints. Extra routing/workflow fields cannot enter storage.
  if p_inquiry is null or jsonb_typeof(p_inquiry) <> 'object'
     or not (p_inquiry ?& array['name','email','phone','date','guests','message'])
     or (p_inquiry - array['name','email','phone','date','guests','message']) <> '{}'::jsonb
     or exists (select 1 from jsonb_each(p_inquiry) e where jsonb_typeof(e.value) <> 'string') then
    raise exception using errcode = '22023', message = 'invalid inquiry shape';
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
  payload_hash := sha256(convert_to(jsonb_build_array(
    1, 'contact', p_inquiry->>'name', p_inquiry->>'email', p_inquiry->>'phone',
    p_inquiry->>'date', p_inquiry->>'guests', p_inquiry->>'message',
    1, p_notification->>'sender', p_notification->>'recipient', p_notification->>'reply_to',
    p_notification->>'subject', p_notification->>'body')::text, 'UTF8'));
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
  insert into inquiry_private.inquiries(id, name, email, phone, requested_date, guests, message)
    values (inquiry_uuid, p_inquiry->>'name', p_inquiry->>'email', p_inquiry->>'phone',
      requested_date, guest_count, p_inquiry->>'message');
  insert into inquiry_private.notification_jobs(inquiry_id, purpose, payload_version, sender, recipient, reply_to, subject, body)
    values (inquiry_uuid, 'staff_notification', 1, p_notification->>'sender', p_notification->>'recipient',
      p_notification->>'reply_to', p_notification->>'subject', p_notification->>'body');
  return jsonb_build_object('kind', 'recorded', 'inquiryId', inquiry_uuid);
end;
$$;
revoke all on function public.record_contact_inquiry(jsonb, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.record_contact_inquiry(jsonb, uuid, jsonb) to service_role;
