-- Username-first accounts: synthetic emails `${username}@beefive.app` in auth.users.
-- Public.profile rows mirror signup metadata (trigger on auth.users insert).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  full_name text not null,
  school text,
  elo integer not null default 1200,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Optional: backfill from legacy user_profiles (uncomment if both tables exist)
-- insert into public.profiles (id, username, full_name, school, elo)
-- select up.id,
--        lower(trim(up.username)),
--        coalesce(nullif(trim(up.full_name), ''), lower(trim(up.username))),
--        null,
--        1200
-- from public.user_profiles up
-- on conflict (id) do nothing;

create or replace function public.handle_new_profile ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_user text := trim(coalesce(new.raw_user_meta_data->>'username', ''));
  meta_fn text := trim(coalesce(new.raw_user_meta_data->>'full_name', ''));
  email_local text := split_part(new.email, '@', 1);
  un text;
begin
  un := lower(meta_user);
  if length(un) < 1 then
    un := lower(email_local);
  end if;
  if length(un) < 1 then
    un := 'user_' || replace(substring(new.id::text, 1, 8), '-', '');
  end if;

  insert into public.profiles (id, username, full_name, school, elo)
  values (
    new.id,
    un,
    case when length(meta_fn) >= 1 then meta_fn else un end,
    null,
    1200
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profiles on auth.users;
create trigger on_auth_user_created_profiles
  after insert on auth.users
  for each row
  execute function public.handle_new_profile ();

comment on table public.profiles is 'App profile for BeeFive; login uses synthetic ${username}@beefive.app in auth.users.';
