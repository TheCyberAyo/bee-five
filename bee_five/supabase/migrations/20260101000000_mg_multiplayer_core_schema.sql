-- Core tables for Bee Five multiplayer (school lobby, profiles, match history).
-- This repo previously assumed these tables already existed. Fresh projects need this first.
--
-- After creating a new Supabase project:
--   1. supabase link --project-ref <your-new-ref>
--   2. supabase db push
--   3. supabase functions deploy submit-match
--   4. Set SUPABASE_URL + SUPABASE_ANON_KEY in bee_five/.env and BeefiveApp/.env

-- ── Schools (join codes) ───────────────────────────────────────────────────
create table if not exists public.mg_schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists mg_schools_join_code_key
  on public.mg_schools (join_code);

-- ── Player profiles (one row per auth user in multiplayer) ───────────────────
create table if not exists public.mg_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  school_id uuid references public.mg_schools (id) on delete set null,
  full_name text,
  email text,
  elo integer not null default 1200,
  wins integer not null default 0,
  losses integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists mg_profiles_school_id_idx
  on public.mg_profiles (school_id);

-- ── Match log (Edge submit-match; service role bypasses RLS) ───────────────
create table if not exists public.mg_matches (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid not null references auth.users (id) on delete cascade,
  player2_id uuid not null references auth.users (id) on delete cascade,
  winner_id uuid references auth.users (id) on delete set null,
  player1_elo_change integer not null default 0,
  player2_elo_change integer not null default 0,
  school_id uuid references public.mg_schools (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists mg_matches_school_id_idx
  on public.mg_matches (school_id);

alter table public.mg_matches enable row level security;

comment on table public.mg_schools is 'School / lobby buckets identified by join_code.';
comment on table public.mg_profiles is 'Multiplayer ELO and school membership per auth user.';
comment on table public.mg_matches is 'Recorded school lobby matches; written by submit-match Edge Function.';
