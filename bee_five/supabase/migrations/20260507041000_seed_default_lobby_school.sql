-- Default lobby school row.
-- Lets users opt into a shared lobby when they do not have a school code.

do $$
begin
  if not exists (
    select 1 from public.mg_schools where join_code = '00BEE00'
  ) then
    insert into public.mg_schools (name, join_code)
    values ('Bee Five Default Lobby', '00BEE00');
  end if;
end $$;
