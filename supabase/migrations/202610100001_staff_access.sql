-- B06: staff access. Membership is server-controlled: only the database owner (Supabase SQL editor /
-- migrations) can add, change or remove rows. service_role may only read, so no website code path,
-- and no staff member, can grant or change a role. Auth user metadata is never consulted.
-- Removing a row revokes access on the user's next page load or action.
create table inquiry_private.staff_members (
  user_id uuid primary key,
  role text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);
alter table inquiry_private.staff_members enable row level security;
revoke all on inquiry_private.staff_members from public, anon, authenticated, service_role;
grant select on inquiry_private.staff_members to service_role;

create function public.staff_role(p_user uuid) returns text
language sql stable security invoker set search_path = '' as $$
  select role from inquiry_private.staff_members where user_id = p_user;
$$;
revoke all on function public.staff_role(uuid) from public, anon, authenticated;
grant execute on function public.staff_role(uuid) to service_role;

-- Staff sign-in attempts share the B05 fixed-window counters under their own bucket prefix.
alter table inquiry_private.rate_limit_hits drop constraint rate_limit_hits_bucket_check;
alter table inquiry_private.rate_limit_hits add constraint rate_limit_hits_bucket_check
  check (bucket ~ '^(global|subject:[0-9a-f]{64}|login:[0-9a-f]{64})$');

create function public.check_login_limit(p_subject text, p_limit integer, p_seconds integer)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare retry integer;
begin
  if p_subject is null or p_subject !~ '^[0-9a-f]{64}$'
     or p_limit not between 1 and 100000 or p_seconds not between 1 and 86400 then
    raise exception using errcode = '22023', message = 'invalid limit arguments';
  end if;
  delete from inquiry_private.rate_limit_hits where expires_at <= now();
  retry := inquiry_private.hit_rate_limit('login:' || p_subject, p_seconds, p_limit);
  if retry = 0 then return jsonb_build_object('allowed', true); end if;
  return jsonb_build_object('allowed', false, 'retryAfter', retry);
end;
$$;
revoke all on function public.check_login_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_login_limit(text, integer, integer) to service_role;
