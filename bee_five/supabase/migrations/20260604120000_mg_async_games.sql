-- Async (correspondence) Bee Five: durable challenges, saved moves, push tokens.
-- Live realtime matches are unchanged; these tables power multi-day games.

create table if not exists public.mg_push_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  fcm_token text not null,
  platform text,
  updated_at timestamptz not null default now()
);

alter table public.mg_push_tokens enable row level security;

create policy "mg_push_tokens_own"
  on public.mg_push_tokens
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.mg_push_tokens is 'FCM device tokens for offline push (challenge / async move).';

-- ── In-app notification log (also triggers push from Edge Functions) ─────────
create table if not exists public.mg_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mg_notifications_user_created_idx
  on public.mg_notifications (user_id, created_at desc);

alter table public.mg_notifications enable row level security;

create policy "mg_notifications_select_own"
  on public.mg_notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "mg_notifications_update_own"
  on public.mg_notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Async matches (board persisted server-side) ─────────────────────────────
create table if not exists public.mg_async_matches (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid not null references auth.users (id) on delete cascade,
  player2_id uuid not null references auth.users (id) on delete cascade,
  board jsonb not null,
  current_seat smallint not null default 1 check (current_seat in (1, 2)),
  first_seat smallint not null default 1 check (first_seat in (1, 2)),
  status text not null default 'active'
    check (status in ('active', 'completed', 'draw', 'forfeited')),
  winner_id uuid references auth.users (id) on delete set null,
  school_id uuid references public.mg_schools (id) on delete set null,
  last_move_at timestamptz,
  last_move_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint mg_async_matches_distinct_players check (player1_id <> player2_id)
);

create index if not exists mg_async_matches_player1_idx on public.mg_async_matches (player1_id);
create index if not exists mg_async_matches_player2_idx on public.mg_async_matches (player2_id);
create index if not exists mg_async_matches_status_idx on public.mg_async_matches (status);

alter table public.mg_async_matches enable row level security;

create policy "mg_async_matches_select_participants"
  on public.mg_async_matches
  for select
  to authenticated
  using (auth.uid() = player1_id or auth.uid() = player2_id);

-- Writes go through Edge Function (service role).

-- ── Async challenges (works when opponent is offline) ───────────────────────
create table if not exists public.mg_async_challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references auth.users (id) on delete cascade,
  challenged_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  match_id uuid references public.mg_async_matches (id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint mg_async_challenges_distinct_users check (challenger_id <> challenged_id)
);

create index if not exists mg_async_challenges_challenged_pending_idx
  on public.mg_async_challenges (challenged_id)
  where status = 'pending';

create index if not exists mg_async_challenges_challenger_idx
  on public.mg_async_challenges (challenger_id);

alter table public.mg_async_challenges enable row level security;

create policy "mg_async_challenges_select_participants"
  on public.mg_async_challenges
  for select
  to authenticated
  using (auth.uid() = challenger_id or auth.uid() = challenged_id);

create policy "mg_async_challenges_insert_challenger"
  on public.mg_async_challenges
  for insert
  to authenticated
  with check (auth.uid() = challenger_id and status = 'pending');

create policy "mg_async_challenges_update_challenged"
  on public.mg_async_challenges
  for update
  to authenticated
  using (auth.uid() = challenged_id and status = 'pending')
  with check (auth.uid() = challenged_id);

-- Empty 10×10 board JSON for new async matches.
create or replace function public.mg_empty_board_json()
returns jsonb
language sql
immutable
as $$
  select jsonb_agg(jsonb_build_array(0,0,0,0,0,0,0,0,0,0))
  from generate_series(1, 10);
$$;

-- Send async challenge to any linked player (online not required).
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
    raise exception 'There is already a pending async challenge with this player.';
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

revoke all on function public.mg_send_async_challenge(uuid) from public;
grant execute on function public.mg_send_async_challenge(uuid) to authenticated;

-- Accept → create async match; opening seat alternates from prior completed games.
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
    player1_id, player2_id, board, current_seat, first_seat, school_id
  )
  values (
    v_p1, v_p2, mg_empty_board_json(), v_first, v_first, v_school
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
    'Your async match has started.',
    jsonb_build_object('match_id', v_match_id)
  );

  return v_match_id;
end;
$$;

revoke all on function public.mg_accept_async_challenge(uuid) from public;
grant execute on function public.mg_accept_async_challenge(uuid) to authenticated;

create or replace function public.mg_decline_async_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row mg_async_challenges%rowtype;
begin
  select * into v_row from mg_async_challenges where id = p_challenge_id for update;
  if not found then raise exception 'Challenge not found.'; end if;
  if v_row.challenged_id <> auth.uid() then
    raise exception 'Only the challenged player can decline.';
  end if;
  if v_row.status <> 'pending' then return; end if;

  update mg_async_challenges
  set status = 'declined', responded_at = now()
  where id = p_challenge_id;

  insert into mg_notifications (user_id, type, title, body, data)
  values (
    v_row.challenger_id,
    'async_challenge_declined',
    'Challenge declined',
    'Your async challenge was declined.',
    jsonb_build_object('challenge_id', p_challenge_id)
  );
end;
$$;

revoke all on function public.mg_decline_async_challenge(uuid) from public;
grant execute on function public.mg_decline_async_challenge(uuid) to authenticated;
