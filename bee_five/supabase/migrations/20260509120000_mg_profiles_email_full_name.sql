-- Contact fields on multiplayer/school profiles (mirrors auth user metadata where relevant).
-- Safe to re-run: columns are added only if missing.

alter table public.mg_profiles
  add column if not exists full_name text;

alter table public.mg_profiles
  add column if not exists email text;

comment on column public.mg_profiles.full_name is 'Display/legal name from signup metadata; leaderboards still use username.';
comment on column public.mg_profiles.email is 'Cached auth email for admin/reporting; source of truth remains auth.users.';
