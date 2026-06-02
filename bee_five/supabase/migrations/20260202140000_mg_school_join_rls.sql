-- Allow signed-in players to resolve join codes and set their school_id.
-- Run in Supabase SQL Editor if you do not use CLI migrations.
--
-- If a policy with the same name already exists, drop it or rename below.

alter table public.mg_schools enable row level security;

drop policy if exists "mg_schools_select_authenticated" on public.mg_schools;

create policy "mg_schools_select_authenticated"
on public.mg_schools
for select
to authenticated
using (true);

-- Users may already have other UPDATE policies on mg_profiles; permissive policies combine with OR.
drop policy if exists "mg_profiles_update_own_row_for_join" on public.mg_profiles;

create policy "mg_profiles_update_own_row_for_join"
on public.mg_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- First-time join: app may INSERT a row if none exists yet.
drop policy if exists "mg_profiles_insert_own_row" on public.mg_profiles;

create policy "mg_profiles_insert_own_row"
on public.mg_profiles
for insert
to authenticated
with check (auth.uid() = id);
