-- Allow any signed-in player to read profiles that belong to a school (global rankings).
-- Complements mg_profiles_select_same_school (institutional) and mg_profiles_select_own.

drop policy if exists "mg_profiles_select_global_leaderboard" on public.mg_profiles;

create policy "mg_profiles_select_global_leaderboard"
on public.mg_profiles
for select
to authenticated
using (school_id is not null);

comment on policy "mg_profiles_select_global_leaderboard" on public.mg_profiles is
  'Lets lobby clients build the global rankings table (id, username, elo, school).';
