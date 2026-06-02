-- School leaderboard reset: end of every *even* calendar month (Feb, Apr, Jun, Aug, Oct, Dec).
-- Fires at 00:00 UTC on the 1st of the following month (Jan 1, Mar 1, May 1, Jul 1, Sep 1, Nov 1).
--
-- Resets mg_profiles.elo / wins / losses for rows tied to a school (school lobby rankings).
-- mg_matches history is untouched.

create or replace function public.reset_school_leaderboard_season()
returns void
language sql
security definer
set search_path = public
as $$
  update public.mg_profiles
  set
    elo = 1200,
    wins = 0,
    losses = 0
  where school_id is not null;
$$;

revoke all on function public.reset_school_leaderboard_season() from public;
grant execute on function public.reset_school_leaderboard_season() to service_role;

comment on function public.reset_school_leaderboard_season() is
  'Resets school leaderboard stats (elo 1200, wins/losses 0) after each even month ends. Scheduled via pg_cron when available.';

-- Schedule when pg_cron is enabled (Supabase Dashboard → Database → Extensions → pg_cron).
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'reset_school_leaderboard_even_months';

    perform cron.schedule(
      'reset_school_leaderboard_even_months',
      '0 0 1 1,3,5,7,9,11 *',
      $cmd$select public.reset_school_leaderboard_season();$cmd$
    );
  end if;
end $cron$;
