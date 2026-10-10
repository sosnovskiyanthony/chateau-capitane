-- B10: gallery photos. Uploaded photos are stored in the database as processed WebP (the server
-- decodes, rotates, resizes and re-encodes them, which also strips metadata), so they are backed up
-- and restored with everything else. An asset is private until a published content revision lists it
-- (document.gallery[].photos[].media); unpublishing the entry or rolling back makes it private again.
-- Assets are immutable and never deleted by the application; delete only unreferenced ones, by hand.
-- Only current staff can add assets (security definer); the server key cannot write the table.
create table inquiry_private.media_assets (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type = 'image/webp'),
  -- RIFF....WEBP container, at most 2 MiB.
  data bytea not null check (octet_length(data) between 12 and 2097152
    and substring(data from 1 for 4) = '\x52494646' and substring(data from 9 for 4) = '\x57454250'),
  width integer not null check (width between 1 and 4096),
  height integer not null check (height between 1 and 4096),
  -- When the photo was taken or posted: new photos must come from 2026 or later.
  source_date date not null check (source_date >= date '2026-01-01'),
  source_url text check (source_url ~ '^https://[^[:space:]]+$' and char_length(source_url) <= 500),
  uploader_id uuid not null,
  uploader_email text not null check (char_length(uploader_email) <= 254),
  created_at timestamptz not null default now()
);

alter table inquiry_private.media_assets enable row level security;
revoke all on inquiry_private.media_assets from public, anon, authenticated, service_role;
grant select on inquiry_private.media_assets to service_role;

-- Public: one photo, only while the live revision lists it. Null otherwise.
create function public.published_media(p_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('type', m.content_type, 'data', replace(encode(m.data, 'base64'), E'\n', ''))
    from inquiry_private.media_assets m
   where m.id = p_id
     and exists (
       select 1 from (select r.document from inquiry_private.content_publications p
                        join inquiry_private.content_revisions r on r.id = p.revision_id
                       order by p.id desc limit 1) live
        where jsonb_path_exists(live.document, '$.gallery[*].photos[*] ? (@.media == $id)',
                                jsonb_build_object('id', p_id::text)));
$$;
revoke all on function public.published_media(uuid) from public, anon, authenticated;
grant execute on function public.published_media(uuid) to service_role;

-- Staff: any photo, for editing and preview.
create function public.staff_media(p_staff uuid, p_id uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  perform inquiry_private.require_staff(p_staff);
  return (select jsonb_build_object('type', content_type, 'data', replace(encode(data, 'base64'), E'\n', ''))
            from inquiry_private.media_assets where id = p_id);
end;
$$;
revoke all on function public.staff_media(uuid, uuid) from public, anon, authenticated;
grant execute on function public.staff_media(uuid, uuid) to service_role;

-- Adds a processed photo. Returns {kind: added, id} or {kind: full}. Bad data raises (not base64, not WebP,
-- too large, date before 2026); the server only sends what it has just encoded.
create function public.staff_add_media(p_staff uuid, p_email text, p_data text, p_width integer, p_height integer,
                                       p_source_date date, p_source_url text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare added uuid;
begin
  perform inquiry_private.require_staff(p_staff);
  -- Bound storage growth: staff cannot fill the database by repeating uploads (serialized so the cap is exact).
  perform pg_advisory_xact_lock(hashtext('inquiry_private.media_assets'));
  if (select count(*) from inquiry_private.media_assets) >= 500 then
    return jsonb_build_object('kind', 'full');
  end if;
  insert into inquiry_private.media_assets(content_type, data, width, height, source_date, source_url, uploader_id, uploader_email)
    values ('image/webp', decode(p_data, 'base64'), p_width, p_height, p_source_date, nullif(p_source_url, ''),
            p_staff, left(coalesce(p_email, ''), 254))
    returning id into added;
  return jsonb_build_object('kind', 'added', 'id', added);
end;
$$;
revoke all on function public.staff_add_media(uuid, text, text, integer, integer, date, text) from public, anon, authenticated;
grant execute on function public.staff_add_media(uuid, text, text, integer, integer, date, text) to service_role;
