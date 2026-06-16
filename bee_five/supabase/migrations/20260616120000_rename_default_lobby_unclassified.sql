-- Default lobby (00BEE00) is shown as "Unclassified" in Live Matches UI.

update public.mg_schools
set name = 'Unclassified'
where upper(trim(join_code)) = '00BEE00'
  and trim(name) <> 'Unclassified';
