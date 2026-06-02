-- Country flag support: ISO 3166-1 alpha-2 code set at signup (e.g. ZA, US).

alter table public.mg_profiles
  add column if not exists country_code text;

comment on column public.mg_profiles.country_code is
  'ISO 3166-1 alpha-2 country code; shown as flag emoji next to username in lobby.';
