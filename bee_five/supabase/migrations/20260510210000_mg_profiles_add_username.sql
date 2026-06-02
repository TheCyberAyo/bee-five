-- Flutter app and Edge submit-match flows expect public.mg_profiles.username.
-- Legacy / hand-created tables may be missing this column.

alter table public.mg_profiles
  add column if not exists username text;

-- Stable unique-ish display handle for any row missing a username.
update public.mg_profiles p
set username = 'p_' || substring(replace(p.id::text, '-', ''), 1, 12)
where p.username is null or btrim(p.username) = '';

alter table public.mg_profiles
  alter column username set not null;

create unique index if not exists mg_profiles_username_lower_idx
  on public.mg_profiles (lower(btrim(username)));

comment on column public.mg_profiles.username is
  'Lobby display name; app sets from auth metadata or generated id-based slug.';
