-- School lobby leaderboard (non-default schools): reset monthly on 1st 00:00 UTC
-- (was bi-monthly — 1st of odd months only after each even month ended).

comment on function public.reset_school_leaderboard_season() is
  'Resets elo/wins/losses for school lobby players except Bee Five default lobby (00BEE00). Runs monthly on the 1st at 00:00 UTC (pg_cron).';

do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname in (
      'reset_school_leaderboard_even_months',
      'reset_school_leaderboard_monthly'
    );

    perform cron.schedule(
      'reset_school_leaderboard_monthly',
      '0 0 1 * *',
      $cmd$select public.reset_school_leaderboard_season();$cmd$
    );
  end if;
end $cron$;
