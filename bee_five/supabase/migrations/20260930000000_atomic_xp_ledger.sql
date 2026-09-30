-- Deploy before the updated clients. Existing balances are preserved.
-- Clients submit fixed reward reasons, never a replacement XP balance.
-- Offline game/ad outcomes remain client-reported; this is accounting integrity,
-- not proof that a game was won or an ad was watched.
BEGIN;
CREATE TABLE public.xp_events (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL,
  reason text NOT NULL,
  delta integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players can read own XP events" ON public.xp_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.xp_events FROM anon, authenticated;
GRANT SELECT ON public.xp_events TO authenticated;

-- Column grants are insufficient while a table-level UPDATE grant exists.
REVOKE INSERT, UPDATE, DELETE ON public.adventure_progress FROM anon, authenticated;
GRANT INSERT (user_id, current_game, highest_unlocked_game, games_completed,
  games_won, updated_at, login_streak, classic_best_streak, daily_challenge_date,
  daily_challenge_won, adventure_consecutive_wins, adventure_levels_first_clear,
  adventure_first_clear_xp_migrated) ON public.adventure_progress TO authenticated;
GRANT UPDATE (user_id, current_game, highest_unlocked_game, games_completed,
  games_won, updated_at, login_streak, classic_best_streak, daily_challenge_date,
  daily_challenge_won, adventure_consecutive_wins, adventure_levels_first_clear,
  adventure_first_clear_xp_migrated) ON public.adventure_progress TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_xp_events(owner_id uuid, events jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  item jsonb;
  event_key uuid;
  event_reason text;
  amount integer;
  applied integer;
  balance integer;
  losses integer;
  existing_reason text;
BEGIN
  IF auth.uid() IS NULL OR owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'XP account mismatch' USING ERRCODE = '42501';
  END IF;
  IF events IS NULL OR jsonb_typeof(events) <> 'array' OR jsonb_array_length(events) > 100 THEN
    RAISE EXCEPTION 'Expected at most 100 XP events';
  END IF;
  INSERT INTO public.adventure_progress(user_id) VALUES (owner_id)
    ON CONFLICT (user_id) DO NOTHING;
  -- Serialize all devices for this player, including an empty balance refresh.
  SELECT p.user_xp, p.adventure_consecutive_losses INTO balance, losses
    FROM public.adventure_progress p WHERE p.user_id = owner_id FOR UPDATE;
  FOR item IN SELECT value FROM jsonb_array_elements(events) LOOP
    IF jsonb_typeof(item) <> 'object' OR NOT (item ? 'id' AND item ? 'reason')
      OR (item - 'id' - 'reason') <> '{}'::jsonb THEN
      RAISE EXCEPTION 'Invalid XP event';
    END IF;
    event_key := (item->>'id')::uuid;
    event_reason := item->>'reason';
    amount := CASE event_reason
      WHEN 'adventure_win' THEN 1 WHEN 'adventure_milestone' THEN 3
      WHEN 'adventure_loss' THEN -1 WHEN 'classic_three_wins' THEN 2
      WHEN 'hard_practice_win' THEN 1 WHEN 'rewarded_ad' THEN 2
      WHEN 'live_win' THEN 1 WHEN 'live_loss' THEN -1
      WHEN 'adventure_failure' THEN 0 WHEN 'adventure_reset' THEN 0
      ELSE NULL END;
    IF amount IS NULL OR event_key IS NULL THEN RAISE EXCEPTION 'Unknown XP event'; END IF;
    INSERT INTO public.xp_events(user_id, event_id, reason, delta)
      VALUES (owner_id, event_key, event_reason, amount) ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS applied = ROW_COUNT;
    IF applied = 1 THEN
      balance := least(2147483647::bigint, greatest(0::bigint, balance::bigint + amount))::integer;
      IF event_reason = 'adventure_reset' THEN losses := 0; END IF;
      IF event_reason = 'adventure_failure' THEN losses := least(2147483647::bigint, losses::bigint + 1)::integer; END IF;
    ELSE
      SELECT reason INTO existing_reason FROM public.xp_events
        WHERE user_id = owner_id AND event_id = event_key;
      IF existing_reason IS DISTINCT FROM event_reason THEN
        RAISE EXCEPTION 'An XP event ID cannot be reused for another reward';
      END IF;
    END IF;
  END LOOP;
  UPDATE public.adventure_progress SET user_xp = balance,
    adventure_consecutive_losses = losses WHERE user_id = owner_id;
  RETURN jsonb_build_object('user_xp', balance, 'adventure_consecutive_losses', losses);
END;
$$;
REVOKE ALL ON FUNCTION public.apply_xp_events(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_xp_events(uuid, jsonb) TO authenticated;
COMMIT;
