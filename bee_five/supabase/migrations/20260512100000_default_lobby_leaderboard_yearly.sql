-- Bee Five default lobby (join_code 00BEE00): leaderboard resets once per year (1 Jan 00:00 UTC).
-- All other schools: unchanged bi-monthly reset (even calendar months), excluding default lobby.

create or replace function public.reset_school_leaderboard_season()
returns void
language sql
security definer
set search_path = public
as $$
  update public.mg_profiles p
  set elo = 1200, wins = 0, losses = 0
  where p.school_id is not null
    and not exists (
      select 1
      from public.mg_schools s
      where s.id = p.school_id
        and upper(trim(s.join_code)) = '00BEE00'
    );
$$;

comment on function public.reset_school_leaderboard_season() is
  'Resets elo/wins/losses for school lobby players except Bee Five default lobby (00BEE00). Runs after each even calendar month (pg_cron).';

create or replace function public.reset_default_lobby_leaderboard_yearly()
returns void
language sql
security definer
set search_path = public
as $$
  update public.mg_profiles p
  set elo = 1200, wins = 0, losses = 0
  where exists (
    select 1
    from public.mg_schools s
    where s.id = p.school_id
      and upper(trim(s.join_code)) = '00BEE00'
  );
$$;

revoke all on function public.reset_default_lobby_leaderboard_yearly() from public;
grant execute on function public.reset_default_lobby_leaderboard_yearly() to service_role;

comment on function public.reset_default_lobby_leaderboard_yearly() is
  'Resets elo/wins/losses only for mg_profiles in Bee Five default lobby (join_code 00BEE00). Yearly on 1 Jan UTC via pg_cron.';

do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname in (
      'reset_school_leaderboard_even_months',
      'reset_default_lobby_leaderboard_yearly'
    );

    perform cron.schedule(
      'reset_school_leaderboard_even_months',
      '0 0 1 1,3,5,7,9,11 *',
      $cmd$select public.reset_school_leaderboard_season();$cmd$
    );

    perform cron.schedule(
      'reset_default_lobby_leaderboard_yearly',
      '0 0 1 1 *',
      $cmd$select public.reset_default_lobby_leaderboard_yearly();$cmd$
    );
  end if;
end $cron$;
