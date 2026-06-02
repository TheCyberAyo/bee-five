-- Track account activity and purge auth users inactive for 90+ days (daily pg_cron).
-- Deploy: supabase db push && supabase functions deploy submit-match

alter table public.mg_profiles
  add column if not exists last_active_at timestamptz not null default now();

comment on column public.mg_profiles.last_active_at is
  'Last app / multiplayer activity; used with auth.users.last_sign_in_at for 90-day account retention.';

create index if not exists mg_profiles_last_active_at_idx
  on public.mg_profiles (last_active_at);

-- Backfill from auth sign-in time, then profile creation time.
update public.mg_profiles p
set last_active_at = coalesce(
  (select u.last_sign_in_at from auth.users u where u.id = p.id),
  p.created_at,
  now()
);

create or replace function public.touch_account_activity()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  update public.mg_profiles
  set last_active_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.touch_account_activity() from public;
grant execute on function public.touch_account_activity() to authenticated;

comment on function public.touch_account_activity() is
  'Called by the app on sign-in / lobby use to refresh mg_profiles.last_active_at.';

create or replace function public.sync_last_active_from_sign_in()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at
     and new.last_sign_in_at is not null then
    update public.mg_profiles
    set last_active_at = greatest(last_active_at, new.last_sign_in_at)
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_signed_in_touch_activity on auth.users;
create trigger on_auth_user_signed_in_touch_activity
  after update of last_sign_in_at on auth.users
  for each row
  execute function public.sync_last_active_from_sign_in();

create or replace function public.purge_inactive_accounts()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  deleted_count integer := 0;
  cutoff timestamptz := now() - interval '90 days';
  inactive_id uuid;
begin
  for inactive_id in
    select u.id
    from auth.users u
    left join public.mg_profiles p on p.id = u.id
    where coalesce(p.last_active_at, u.last_sign_in_at, u.created_at) < cutoff
  loop
    delete from auth.users where id = inactive_id;
    deleted_count := deleted_count + 1;
  end loop;

  return deleted_count;
end;
$$;

revoke all on function public.purge_inactive_accounts() from public;
grant execute on function public.purge_inactive_accounts() to service_role;

comment on function public.purge_inactive_accounts() is
  'Deletes auth users (and cascaded profiles/matches) inactive for 90+ days. Runs daily via pg_cron.';

do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'purge_inactive_accounts_daily';

    perform cron.schedule(
      'purge_inactive_accounts_daily',
      '15 3 * * *',
      $cmd$select public.purge_inactive_accounts();$cmd$
    );
  end if;
end $cron$;
