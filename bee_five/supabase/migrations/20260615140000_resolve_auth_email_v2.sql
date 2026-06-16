-- Broader username → auth email resolution + existence check for sign-in UX.

create or replace function public.resolve_auth_email_for_username(p_username text)
returns text
language plpgsql
security definer
stable
set search_path = public, auth
as $$
declare
  normalized text := lower(trim(p_username));
  resolved text;
begin
  if normalized is null or normalized = '' or position('@' in normalized) > 0 then
    return null;
  end if;

  -- 1) auth.users metadata username (source of truth for mobile sign-up)
  select u.email into resolved
  from auth.users u
  where lower(trim(coalesce(u.raw_user_meta_data->>'username', ''))) = normalized
  limit 1;

  if resolved is not null then
    return resolved;
  end if;

  -- 2) mg_profiles.username
  select u.email into resolved
  from public.mg_profiles mp
  join auth.users u on u.id = mp.id
  where lower(trim(mp.username)) = normalized
  limit 1;

  if resolved is not null then
    return resolved;
  end if;

  -- 3) public.profiles.username
  select u.email into resolved
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(trim(p.username)) = normalized
  limit 1;

  if resolved is not null then
    return resolved;
  end if;

  -- 4) legacy public.user_profiles (older web deployments)
  if to_regclass('public.user_profiles') is not null then
    execute $q$
      select u.email
      from public.user_profiles up
      join auth.users u on u.id = up.id
      where lower(trim(up.username)) = $1
      limit 1
    $q$
    into resolved
    using normalized;

    if resolved is not null then
      return resolved;
    end if;
  end if;

  -- 5) email local-part match
  select u.email into resolved
  from auth.users u
  where lower(split_part(u.email, '@', 1)) = normalized
  limit 1;

  if resolved is not null then
    return resolved;
  end if;

  -- 6) synthetic @beefive.app
  select u.email into resolved
  from auth.users u
  where lower(u.email) = normalized || '@beefive.app'
  limit 1;

  return resolved;
end;
$$;

create or replace function public.username_is_registered(p_username text)
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select public.resolve_auth_email_for_username(p_username) is not null;
$$;

revoke all on function public.resolve_auth_email_for_username(text) from public;
revoke all on function public.username_is_registered(text) from public;
grant execute on function public.resolve_auth_email_for_username(text) to anon, authenticated;
grant execute on function public.username_is_registered(text) to anon, authenticated;

comment on function public.username_is_registered(text) is
  'True when a BeeFive auth account exists for the given public username.';
