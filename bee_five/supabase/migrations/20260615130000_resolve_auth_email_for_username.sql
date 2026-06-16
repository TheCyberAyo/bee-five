-- Resolve auth.users.email from a public username (for web sign-in).
-- Covers synthetic @beefive.app logins, mg_profiles.username, and legacy profiles rows.

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

  select u.email into resolved
  from auth.users u
  where lower(split_part(u.email, '@', 1)) = normalized
     or lower(u.email) = normalized || '@beefive.app'
  limit 1;

  if resolved is not null then
    return resolved;
  end if;

  select u.email into resolved
  from public.mg_profiles mp
  join auth.users u on u.id = mp.id
  where lower(trim(mp.username)) = normalized
  limit 1;

  if resolved is not null then
    return resolved;
  end if;

  select u.email into resolved
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(trim(p.username)) = normalized
  limit 1;

  return resolved;
end;
$$;

revoke all on function public.resolve_auth_email_for_username(text) from public;
grant execute on function public.resolve_auth_email_for_username(text) to anon, authenticated;

comment on function public.resolve_auth_email_for_username(text) is
  'Maps BeeFive username to auth.users.email for password sign-in (anon-safe).';
