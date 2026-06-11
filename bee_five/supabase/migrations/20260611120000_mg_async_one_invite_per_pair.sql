-- One async invite per player pair until the match ends (or invite is declined).

create or replace function public.mg_send_async_challenge(p_challenged_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_challenger uuid := auth.uid();
  v_name text;
begin
  if v_challenger is null then
    raise exception 'You must be signed in.';
  end if;
  if p_challenged_id is null or p_challenged_id = v_challenger then
    raise exception 'Invalid opponent.';
  end if;

  if exists (
    select 1 from mg_async_challenges
    where status = 'pending'
      and (
        (challenger_id = v_challenger and challenged_id = p_challenged_id)
        or (challenger_id = p_challenged_id and challenged_id = v_challenger)
      )
  ) then
    raise exception 'There is already a pending multi-day challenge with this player.';
  end if;

  if exists (
    select 1 from mg_async_matches
    where status = 'active'
      and (
        (player1_id = v_challenger and player2_id = p_challenged_id)
        or (player1_id = p_challenged_id and player2_id = v_challenger)
      )
  ) then
    raise exception 'You already have an active multi-day match with this player.';
  end if;

  insert into mg_async_challenges (challenger_id, challenged_id)
  values (v_challenger, p_challenged_id)
  returning id into v_id;

  select username into v_name from mg_profiles where id = v_challenger limit 1;
  v_name := coalesce(nullif(trim(v_name), ''), 'A player');

  insert into mg_notifications (user_id, type, title, body, data)
  values (
    p_challenged_id,
    'async_challenge',
    'Async challenge',
    v_name || ' challenged you to a multi-day Bee Five match.',
    jsonb_build_object('challenge_id', v_id, 'challenger_id', v_challenger)
  );

  return v_id;
end;
$$;
