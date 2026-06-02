-- Online lobby consecutive win streak (resets on loss; unchanged on draw).

alter table public.mg_profiles
  add column if not exists win_streak integer not null default 0;

comment on column public.mg_profiles.win_streak is
  'Consecutive online lobby wins; incremented on win, reset to 0 on loss.';

create or replace function public.reset_school_leaderboard_season()
returns void
language sql
security definer
set search_path = public
as $$
  update public.mg_profiles p
  set elo = 1200, wins = 0, losses = 0, win_streak = 0
  where p.school_id is not null
    and not exists (
      select 1
      from public.mg_schools s
      where s.id = p.school_id
        and upper(trim(s.join_code)) = '00BEE00'
    );
$$;

create or replace function public.reset_default_lobby_leaderboard_yearly()
returns void
language sql
security definer
set search_path = public
as $$
  update public.mg_profiles p
  set elo = 1200, wins = 0, losses = 0, win_streak = 0
  where exists (
    select 1
    from public.mg_schools s
    where s.id = p.school_id
      and upper(trim(s.join_code)) = '00BEE00'
  );
$$;
