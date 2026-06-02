-- mg_profiles had INSERT/UPDATE policies for joining schools but no SELECT policies
-- in repo migrations. With RLS enabled and no SELECT policy, authenticated clients
-- see zero rows: lobby setup thinks there is no profile, joinSchool tries INSERT
-- and hits duplicate key, or users cannot open My Lobby / leaderboard reads fail.
--
-- Same-school reads for leaderboards are added in 20260510200000 (SECURITY DEFINER)
-- to avoid self-referential RLS recursion.

alter table public.mg_profiles enable row level security;

drop policy if exists "mg_profiles_select_own" on public.mg_profiles;

create policy "mg_profiles_select_own"
on public.mg_profiles
for select
to authenticated
using (auth.uid() = id);
