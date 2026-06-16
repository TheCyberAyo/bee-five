-- Leaderboard reads via SECURITY DEFINER (same pattern as mg_join_school_for_user).
-- Avoids RLS / client JWT timing issues on web.

create or replace function public.mg_fetch_leaderboards(p_school_id uuid)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  global_rows json;
  institutional_rows json;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select coalesce(json_agg(row order by row.elo desc), '[]'::json)
  into global_rows
  from (
    select
      p.id,
      p.username,
      p.elo,
      p.wins,
      p.losses,
      p.school_id,
      p.country_code,
      case
        when s.id is not null then json_build_object('name', s.name, 'join_code', s.join_code)
        else null
      end as mg_schools
    from public.mg_profiles p
    left join public.mg_schools s on s.id = p.school_id
    where p.school_id is not null
    order by p.elo desc
    limit 100
  ) row;

  if p_school_id is null then
    institutional_rows := '[]'::json;
  else
    select coalesce(json_agg(row order by row.elo desc), '[]'::json)
    into institutional_rows
    from (
      select
        p.id,
        p.username,
        p.elo,
        p.wins,
        p.losses,
        p.country_code
      from public.mg_profiles p
      where p.school_id = p_school_id
      order by p.elo desc
      limit 100
    ) row;
  end if;

  return json_build_object(
    'global', global_rows,
    'institutional', institutional_rows
  );
end;
$$;

revoke all on function public.mg_fetch_leaderboards(uuid) from public;
grant execute on function public.mg_fetch_leaderboards(uuid) to authenticated;

comment on function public.mg_fetch_leaderboards(uuid) is
  'Returns global + institutional leaderboard rows for the signed-in lobby client.';
