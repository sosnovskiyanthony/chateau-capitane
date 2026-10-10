-- B09: restaurant content (menus, hours, banquet packages) with drafts, publication and history.
-- Every saved draft is a new immutable revision; the newest revision is the working draft.
-- Publishing points the site at one revision; republishing an older revision rolls back.
-- The server validates the document before saving and again before publishing and reading; the
-- database bounds its shape and size. Only any current staff member (owner or staff) can save or
-- publish, through the two security-definer functions below; the server key cannot write directly.
-- Recovery: republish a known revision from /admin/content, or as the database owner
--   insert into inquiry_private.content_publications(revision_id, publisher_id, publisher_email)
--     values (<revision id>, <owner user id>, 'database owner');
-- With no publication at all, the site shows the built-in content from src/lib/data/.
create table inquiry_private.content_revisions (
  id bigint generated always as identity primary key,
  document jsonb not null check (jsonb_typeof(document) = 'object' and octet_length(document::text) <= 262144),
  author_id uuid not null,
  author_email text not null check (char_length(author_email) <= 254),
  -- The revision this one was edited from (null for the first draft).
  base_id bigint references inquiry_private.content_revisions(id),
  created_at timestamptz not null default now()
);

create table inquiry_private.content_publications (
  id bigint generated always as identity primary key,
  revision_id bigint not null references inquiry_private.content_revisions(id),
  publisher_id uuid not null,
  publisher_email text not null check (char_length(publisher_email) <= 254),
  published_at timestamptz not null default now()
);

alter table inquiry_private.content_revisions enable row level security;
alter table inquiry_private.content_publications enable row level security;
revoke all on inquiry_private.content_revisions, inquiry_private.content_publications
  from public, anon, authenticated, service_role;
grant select on inquiry_private.content_revisions, inquiry_private.content_publications to service_role;

-- What the public site shows: {revision, document}, or null before the first publication.
create function public.published_content() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('revision', r.id, 'document', r.document)
    from inquiry_private.content_publications p
    join inquiry_private.content_revisions r on r.id = p.revision_id
   order by p.id desc limit 1;
$$;
revoke all on function public.published_content() from public, anon, authenticated;
grant execute on function public.published_content() to service_role;

-- Editor state: the working draft, what is live, and the 30 newest revisions and publications.
create function public.staff_content_state(p_staff uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare live bigint := (select revision_id from inquiry_private.content_publications order by id desc limit 1);
begin
  perform inquiry_private.require_staff(p_staff);
  return jsonb_build_object(
    'draft', (select jsonb_build_object('id', id, 'document', document, 'author', author_email, 'createdAt', created_at)
                from inquiry_private.content_revisions order by id desc limit 1),
    'publishedId', live,
    'revisions', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'author', author_email, 'createdAt', created_at)
        order by id desc) from (select * from inquiry_private.content_revisions order by id desc limit 30) r), '[]'::jsonb),
    'publications', coalesce((select jsonb_agg(jsonb_build_object('revision', revision_id, 'by', publisher_email,
        'at', published_at) order by id desc) from (select * from inquiry_private.content_publications
        order by id desc limit 30) p), '[]'::jsonb));
end;
$$;
revoke all on function public.staff_content_state(uuid) from public, anon, authenticated;
grant execute on function public.staff_content_state(uuid) to service_role;

-- One revision's document, for preview, publishing and restoring; null when missing.
create function public.staff_content_revision(p_staff uuid, p_id bigint) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  perform inquiry_private.require_staff(p_staff);
  return (select jsonb_build_object('id', id, 'document', document, 'author', author_email, 'createdAt', created_at)
            from inquiry_private.content_revisions where id = p_id);
end;
$$;
revoke all on function public.staff_content_revision(uuid, bigint) from public, anon, authenticated;
grant execute on function public.staff_content_revision(uuid, bigint) to service_role;

-- Saves a new draft only if nobody saved since the editor loaded p_base (null = no draft existed).
-- Returns {kind: saved, id} or {kind: stale}.
create function public.staff_save_content_draft(p_staff uuid, p_email text, p_base bigint, p_document jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare saved bigint;
begin
  perform inquiry_private.require_staff(p_staff);
  -- Serialize saves so two editors who loaded the same draft cannot both pass the check.
  perform pg_advisory_xact_lock(hashtext('inquiry_private.content_revisions'));
  if (select max(id) from inquiry_private.content_revisions) is distinct from p_base then
    return jsonb_build_object('kind', 'stale');
  end if;
  insert into inquiry_private.content_revisions(document, author_id, author_email, base_id)
    values (p_document, p_staff, left(coalesce(p_email, ''), 254), p_base) returning id into saved;
  return jsonb_build_object('kind', 'saved', 'id', saved);
end;
$$;
revoke all on function public.staff_save_content_draft(uuid, text, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.staff_save_content_draft(uuid, text, bigint, jsonb) to service_role;

-- Makes one revision live (the draft, or an older one to roll back). Returns {kind: published|not_found}.
create function public.staff_publish_content(p_staff uuid, p_email text, p_revision bigint)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  perform inquiry_private.require_staff(p_staff);
  if not exists (select 1 from inquiry_private.content_revisions where id = p_revision) then
    return jsonb_build_object('kind', 'not_found');
  end if;
  insert into inquiry_private.content_publications(revision_id, publisher_id, publisher_email)
    values (p_revision, p_staff, left(coalesce(p_email, ''), 254));
  return jsonb_build_object('kind', 'published');
end;
$$;
revoke all on function public.staff_publish_content(uuid, text, bigint) from public, anon, authenticated;
grant execute on function public.staff_publish_content(uuid, text, bigint) to service_role;
