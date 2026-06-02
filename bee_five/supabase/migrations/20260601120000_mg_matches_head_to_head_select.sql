-- Head-to-head match count for alternating who opens (client reads mg_matches).
drop policy if exists "mg_matches_select_participants" on public.mg_matches;

create policy "mg_matches_select_participants"
  on public.mg_matches
  for select
  to authenticated
  using (
    auth.uid() = player1_id
    or auth.uid() = player2_id
  );

create index if not exists mg_matches_player_pair_idx
  on public.mg_matches (
    least(player1_id, player2_id),
    greatest(player1_id, player2_id)
  );

comment on policy "mg_matches_select_participants" on public.mg_matches is
  'Players can read matches they participated in (H2H first-move alternation).';
