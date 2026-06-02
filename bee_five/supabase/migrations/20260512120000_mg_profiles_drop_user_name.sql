-- Remove legacy user_name column; app and RPC use username only.

drop trigger if exists mg_profiles_mirror_username_cols on public.mg_profiles;
drop function if exists public.mg_profiles_mirror_username_cols();

do $$
begin
  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'mg_profiles'
      and c.column_name = 'user_name'
  ) then
    update public.mg_profiles p
    set username = coalesce(
      nullif(btrim(p.username::text), ''),
      nullif(btrim(p.user_name::text), '')
    )
    where p.username is null or btrim(p.username::text) = '';

    update public.mg_profiles p
    set username = 'p_' || substring(replace(p.id::text, '-', ''), 1, 12)
    where p.username is null or btrim(p.username::text) = '';

    execute 'alter table public.mg_profiles drop column user_name';
  end if;
end $$;

-- Ensure RPC matches username-only columns (idempotent).
create or replace function public.mg_join_school_for_user(p_join_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  un text;
  fn text;
  em text;
  out_username text;
  out_elo int;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select s.id into sid
  from public.mg_schools s
  where upper(trim(s.join_code)) = upper(trim(p_join_code))
  limit 1;

  if sid is null then
    raise exception 'invalid_join_code';
  end if;

  select
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'username'), ''),
      nullif(trim(split_part(u.email, '@', 1)), ''),
      'p_' || substring(replace(u.id::text, '-', ''), 1, 12)
    ),
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.email), '')
  into un, fn, em
  from auth.users u
  where u.id = uid;

  if un is null or trim(un) = '' then
    un := 'p_' || substring(replace(uid::text, '-', ''), 1, 12);
  end if;

  un := left(regexp_replace(trim(un), '[^a-zA-Z0-9_-]', '_', 'g'), 32);
  if length(trim(un)) < 3 then
    un := 'p_' || substring(replace(uid::text, '-', ''), 1, 12);
  end if;

  if exists (
    select 1
    from public.mg_profiles o
    where lower(btrim(o.username)) = lower(btrim(un))
      and o.id <> uid
  ) then
    un := 'p_' || substring(replace(uid::text, '-', ''), 1, 12);
  end if;

  insert into public.mg_profiles (
    id, username, school_id, elo, wins, losses, full_name, email
  )
  values (
    uid, un, sid, 1200, 0, 0, fn, em
  )
  on conflict (id) do update set
    school_id = excluded.school_id,
    username = coalesce(nullif(trim(mg_profiles.username), ''), excluded.username),
    full_name = coalesce(nullif(trim(mg_profiles.full_name), ''), excluded.full_name),
    email = coalesce(nullif(trim(mg_profiles.email), ''), excluded.email);

  select m.username, m.elo into out_username, out_elo
  from public.mg_profiles m
  where m.id = uid;

  return json_build_object(
    'id', uid,
    'username', out_username,
    'elo', out_elo,
    'school_id', sid
  );
end;
$$;

revoke all on function public.mg_join_school_for_user(text) from public;
grant execute on function public.mg_join_school_for_user(text) to authenticated;

comment on function public.mg_join_school_for_user(text) is
  'Join school by code for the current user; upserts mg_profiles.username only (definer bypasses RLS).';
