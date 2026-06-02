-- Replace self-referential EXISTS(subquery on mg_profiles) policy: it can trigger
-- infinite recursion or 500s under RLS. Use SECURITY DEFINER to read the caller's
-- school_id without re-entering policies.

drop policy if exists "mg_profiles_select_same_school" on public.mg_profiles;

drop function if exists public.mg_current_user_school_id();

-- Cast to text so this works whether mg_profiles.school_id is uuid or text.
create or replace function public.mg_current_user_school_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select school_id::text from public.mg_profiles where id = auth.uid() limit 1;
$$;

revoke all on function public.mg_current_user_school_id() from public;
grant execute on function public.mg_current_user_school_id() to authenticated;

create policy "mg_profiles_select_same_school"
on public.mg_profiles
for select
to authenticated
using (
  school_id is not null
  and school_id::text = public.mg_current_user_school_id()
);
