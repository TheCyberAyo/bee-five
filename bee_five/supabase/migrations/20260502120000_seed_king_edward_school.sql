-- King Edward High School — school lobby join code (app normalizes to uppercase).
-- Apply with Supabase CLI migrations or paste into SQL Editor.
--
-- Adjust the INSERT list if your mg_schools columns differ (e.g. no `name` column:
-- use only join_code, or match your actual schema).

do $$
begin
  if not exists (
    select 1 from public.mg_schools where join_code = '30KIN11'
  ) then
    insert into public.mg_schools (name, join_code)
    values ('King Edward High School', '30KIN11');
  end if;
end $$;
