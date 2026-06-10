-- Async matches: 24-hour turn clock; miss the deadline → forfeit (opponent wins).

alter table public.mg_async_matches
  add column if not exists turn_deadline_at timestamptz;

comment on column public.mg_async_matches.turn_deadline_at is
  'UTC deadline for current_seat to save a move; resets +24h after each move.';

-- Backfill active games (best effort for rows created before this migration).
update public.mg_async_matches
set turn_deadline_at = coalesce(last_move_at, created_at) + interval '24 hours'
where status = 'active'
  and turn_deadline_at is null;

-- Forfeit any active async match whose turn clock has expired.
create or replace function public.mg_forfeit_expired_async_turns(p_match_id uuid default null)
returns table(
  match_id uuid,
  winner_id uuid,
  loser_id uuid,
  player1_id uuid,
  player2_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.mg_async_matches%rowtype;
  v_loser uuid;
  v_winner uuid;
  v_loser_name text;
begin
  for v_row in
    select *
    from public.mg_async_matches m
    where m.status = 'active'
      and m.turn_deadline_at is not null
      and m.turn_deadline_at < now()
      and (p_match_id is null or m.id = p_match_id)
    for update
  loop
    v_loser := case v_row.current_seat
      when 1 then v_row.player1_id
      else v_row.player2_id
    end;
    v_winner := case v_row.current_seat
      when 1 then v_row.player2_id
      else v_row.player1_id
    end;

    update public.mg_async_matches
    set
      status = 'forfeited',
      winner_id = v_winner,
      completed_at = now()
    where id = v_row.id;

    select coalesce(nullif(trim(username), ''), 'Your opponent')
    into v_loser_name
    from public.mg_profiles
    where id = v_loser
    limit 1;

    insert into public.mg_notifications (user_id, type, title, body, data)
    values
      (
        v_winner,
        'async_match_over',
        'You win by forfeit',
        v_loser_name || ' ran out of time. You win the async match.',
        jsonb_build_object('match_id', v_row.id, 'type', 'forfeited')
      ),
      (
        v_loser,
        'async_match_over',
        'Time expired',
        'You did not move within 24 hours. You lost the async match.',
        jsonb_build_object('match_id', v_row.id, 'type', 'forfeited')
      );

    match_id := v_row.id;
    winner_id := v_winner;
    loser_id := v_loser;
    player1_id := v_row.player1_id;
    player2_id := v_row.player2_id;
    return next;
  end loop;
end;
$$;

revoke all on function public.mg_forfeit_expired_async_turns(uuid) from public;
grant execute on function public.mg_forfeit_expired_async_turns(uuid) to authenticated;
grant execute on function public.mg_forfeit_expired_async_turns(uuid) to service_role;

-- New async matches start a 24h clock for the opening player.
create or replace function public.mg_accept_async_challenge(p_challenge_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row mg_async_challenges%rowtype;
  v_match_id uuid;
  v_p1 uuid;
  v_p2 uuid;
  v_first smallint;
  v_prior int;
  v_school uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select * into v_row
  from mg_async_challenges
  where id = p_challenge_id
  for update;

  if not found then
    raise exception 'Challenge not found.';
  end if;
  if v_row.challenged_id <> auth.uid() then
    raise exception 'Only the challenged player can accept.';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'Challenge is no longer pending.';
  end if;

  if v_row.challenger_id::text < v_row.challenged_id::text then
    v_p1 := v_row.challenger_id;
    v_p2 := v_row.challenged_id;
  else
    v_p1 := v_row.challenged_id;
    v_p2 := v_row.challenger_id;
  end if;

  select count(*)::int into v_prior
  from mg_matches
  where (player1_id = v_p1 and player2_id = v_p2)
     or (player1_id = v_p2 and player2_id = v_p1);

  v_prior := v_prior + (
    select count(*)::int from mg_async_matches
    where status in ('completed', 'draw', 'forfeited')
      and player1_id = v_p1 and player2_id = v_p2
  );

  v_first := case when v_prior % 2 = 0 then 1 else 2 end;

  select school_id into v_school from mg_profiles where id = auth.uid() limit 1;

  insert into mg_async_matches (
    player1_id, player2_id, board, current_seat, first_seat, school_id, turn_deadline_at
  )
  values (
    v_p1, v_p2, mg_empty_board_json(), v_first, v_first, v_school, now() + interval '24 hours'
  )
  returning id into v_match_id;

  update mg_async_challenges
  set status = 'accepted', match_id = v_match_id, responded_at = now()
  where id = p_challenge_id;

  insert into mg_notifications (user_id, type, title, body, data)
  values (
    v_row.challenger_id,
    'async_challenge_accepted',
    'Challenge accepted',
    'Your async match has started. Each player has 24 hours per turn.',
    jsonb_build_object('match_id', v_match_id)
  );

  return v_match_id;
end;
$$;
