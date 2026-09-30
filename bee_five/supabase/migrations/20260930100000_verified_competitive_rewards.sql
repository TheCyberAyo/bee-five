-- Solo events remain offline-capable; competitive/ad rewards are server-only.
BEGIN;
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
      WHEN 'hard_practice_win' THEN 1
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

CREATE TABLE public.xp_verified_rewards (
  receipt text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK(reason IN ('live_win','live_loss','rewarded_ad')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.xp_verified_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_verified_rewards ON public.xp_verified_rewards FOR SELECT TO authenticated USING(user_id=auth.uid());
REVOKE ALL ON public.xp_verified_rewards FROM anon, authenticated;
GRANT SELECT ON public.xp_verified_rewards TO authenticated;

CREATE FUNCTION public._credit_verified_xp(p_user uuid, p_receipt text, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer; amount integer;
BEGIN
  amount := CASE p_reason WHEN 'live_win' THEN 1 WHEN 'live_loss' THEN -1 WHEN 'rewarded_ad' THEN 2 END;
  IF amount IS NULL THEN RAISE EXCEPTION 'Invalid verified reward'; END IF;
  INSERT INTO public.adventure_progress(user_id) VALUES(p_user) ON CONFLICT(user_id) DO NOTHING;
  PERFORM 1 FROM public.adventure_progress WHERE user_id=p_user FOR UPDATE;
  INSERT INTO public.xp_verified_rewards(receipt,user_id,reason) VALUES(p_receipt,p_user,p_reason) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n=1 THEN
    UPDATE public.adventure_progress SET user_xp=least(2147483647::bigint,greatest(0::bigint,user_xp::bigint+amount))::integer WHERE user_id=p_user;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public._credit_verified_xp(uuid,text,text) FROM PUBLIC,anon,authenticated;

CREATE TABLE public.mg_live_games (
  id uuid PRIMARY KEY,
  player1_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player2_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  p1_joined boolean NOT NULL DEFAULT false,
  p2_joined boolean NOT NULL DEFAULT false,
  p1_seen timestamptz, p2_seen timestamptz,
  board integer[] NOT NULL DEFAULT array_fill(0,ARRAY[100]),
  moves jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_seat integer NOT NULL,
  prior_match_count integer NOT NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','active','completed','draw','void')),
  winner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(player1_id<player2_id)
);
ALTER TABLE public.mg_live_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY live_game_participants ON public.mg_live_games FOR SELECT TO authenticated USING(auth.uid() IN (player1_id,player2_id));
REVOKE ALL ON public.mg_live_games FROM anon,authenticated;
GRANT SELECT ON public.mg_live_games TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.mg_matches FROM anon,authenticated;
REVOKE DELETE ON public.mg_profiles FROM anon,authenticated;
DO $guard$
DECLARE fn text;
BEGIN
 FOREACH fn IN ARRAY ARRAY['reset_school_leaderboard_season','reset_default_lobby_leaderboard_yearly'] LOOP
   IF to_regprocedure('public.'||fn||'()') IS NOT NULL THEN
     EXECUTE format('REVOKE ALL ON FUNCTION public.%I() FROM PUBLIC,anon,authenticated',fn);
     EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I() TO service_role',fn);
   END IF;
 END LOOP;
END $guard$;

-- Competitive profile fields cannot be set by a player editing their profile.
CREATE FUNCTION public.protect_competitive_stats() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF TG_OP='INSERT' THEN NEW.elo:=1200; NEW.wins:=0; NEW.losses:=0; NEW.win_streak:=0;
    ELSE NEW.elo:=OLD.elo; NEW.wins:=OLD.wins; NEW.losses:=OLD.losses; NEW.win_streak:=OLD.win_streak; END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER protect_competitive_stats BEFORE INSERT OR UPDATE ON public.mg_profiles
 FOR EACH ROW EXECUTE FUNCTION public.protect_competitive_stats();

CREATE FUNCTION public._settle_verified_match(mid uuid,p1 uuid,p2 uuid,winner uuid,is_draw boolean,award_xp boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.mg_profiles; b public.mg_profiles; logged public.mg_matches;
  d1 integer; d2 integer; band integer; mag integer; gap integer;
BEGIN
  -- Called only after a locked live/async row proves its terminal result.
  SELECT * INTO logged FROM public.mg_matches WHERE id=mid;
  IF FOUND AND (logged.player1_id<>p1 OR logged.player2_id<>p2 OR logged.winner_id IS DISTINCT FROM winner) THEN RAISE EXCEPTION 'Match identifier collision'; END IF;
  IF logged.id IS NULL THEN
    PERFORM 1 FROM public.mg_profiles WHERE id IN(p1,p2) ORDER BY id FOR UPDATE;
    SELECT * INTO a FROM public.mg_profiles WHERE id=p1;
    SELECT * INTO b FROM public.mg_profiles WHERE id=p2;
    IF a.id IS NULL OR b.id IS NULL THEN RAISE EXCEPTION 'Players not found'; END IF;
    gap:=abs(a.elo-b.elo); band:=CASE WHEN gap<=30 THEN 0 ELSE (gap-1)/30 END;
    IF is_draw THEN
      d1:=CASE WHEN a.elo<b.elo THEN 2*band WHEN a.elo>b.elo THEN -2*band ELSE 0 END; d2:=-d1;
    ELSE
      IF winner NOT IN(p1,p2) OR winner IS NULL THEN RAISE EXCEPTION 'Invalid winner'; END IF;
      mag:=CASE WHEN a.elo=b.elo THEN 10
        WHEN (winner=p1 AND a.elo<b.elo) OR (winner=p2 AND b.elo<a.elo) THEN 10+2*band
        ELSE greatest(2,10-2*band) END;
      d1:=CASE WHEN winner=p1 THEN mag ELSE -mag END; d2:=-d1;
    END IF;
    INSERT INTO public.mg_matches(id,player1_id,player2_id,winner_id,player1_elo_change,player2_elo_change,school_id)
      VALUES(mid,p1,p2,winner,d1,d2,coalesce(a.school_id,b.school_id)) RETURNING * INTO logged;
    UPDATE public.mg_profiles SET elo=greatest(0,elo+d1),
      wins=wins+CASE WHEN winner=p1 THEN 1 ELSE 0 END,
      losses=losses+CASE WHEN winner=p2 THEN 1 ELSE 0 END,
      win_streak=CASE WHEN is_draw THEN win_streak WHEN winner=p1 THEN coalesce(win_streak,0)+1 ELSE 0 END WHERE id=p1;
    UPDATE public.mg_profiles SET elo=greatest(0,elo+d2),
      wins=wins+CASE WHEN winner=p2 THEN 1 ELSE 0 END,
      losses=losses+CASE WHEN winner=p1 THEN 1 ELSE 0 END,
      win_streak=CASE WHEN is_draw THEN win_streak WHEN winner=p2 THEN coalesce(win_streak,0)+1 ELSE 0 END WHERE id=p2;
    IF award_xp AND NOT is_draw THEN
      -- Stable receipts and one transaction update both players, even if one is offline.
      PERFORM public._credit_verified_xp(p1,'live:'||mid||':'||p1,CASE WHEN winner=p1 THEN 'live_win' ELSE 'live_loss' END);
      PERFORM public._credit_verified_xp(p2,'live:'||mid||':'||p2,CASE WHEN winner=p2 THEN 'live_win' ELSE 'live_loss' END);
    END IF;
  END IF;
  RETURN jsonb_build_object('winner_id',logged.winner_id,'isDraw',logged.winner_id IS NULL,
    'player1Change',logged.player1_elo_change,'player2Change',logged.player2_elo_change,
    'winnerChange',CASE WHEN logged.winner_id=p1 THEN logged.player1_elo_change ELSE logged.player2_elo_change END,
    'loserChange',CASE WHEN logged.winner_id=p1 THEN logged.player2_elo_change ELSE logged.player1_elo_change END);
END; $$;
REVOKE ALL ON FUNCTION public._settle_verified_match(uuid,uuid,uuid,uuid,boolean,boolean) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.mg_join_verified_live(p_match_id uuid,p_opponent uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE me uuid:=auth.uid(); lo uuid; hi uuid; prior integer; g public.mg_live_games;
BEGIN
  IF me IS NULL OR p_opponent IS NULL OR me=p_opponent THEN RAISE EXCEPTION 'Invalid participants'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.mg_profiles WHERE id=me) OR NOT EXISTS(SELECT 1 FROM public.mg_profiles WHERE id=p_opponent) THEN RAISE EXCEPTION 'Player profile missing'; END IF;
  INSERT INTO public.adventure_progress(user_id) VALUES(me) ON CONFLICT(user_id) DO NOTHING;
  IF (SELECT user_xp FROM public.adventure_progress WHERE user_id=me)<=0 THEN RAISE EXCEPTION 'Earn XP before joining a Live Match'; END IF;
  IF EXISTS(SELECT 1 FROM public.mg_matches WHERE id=p_match_id) OR EXISTS(SELECT 1 FROM public.mg_async_matches WHERE id=p_match_id) THEN RAISE EXCEPTION 'Match identifier already used'; END IF;
  lo:=least(me,p_opponent); hi:=greatest(me,p_opponent);
  SELECT count(*) INTO prior FROM public.mg_matches WHERE (player1_id=lo AND player2_id=hi) OR (player1_id=hi AND player2_id=lo);
  INSERT INTO public.mg_live_games(id,player1_id,player2_id,next_seat,prior_match_count)
    VALUES(p_match_id,lo,hi,1+(prior%2),prior) ON CONFLICT DO NOTHING;
  SELECT * INTO g FROM public.mg_live_games WHERE id=p_match_id FOR UPDATE;
  IF g.player1_id<>lo OR g.player2_id<>hi THEN RAISE EXCEPTION 'Match participants mismatch'; END IF;
  IF g.status NOT IN ('waiting','active') THEN RAISE EXCEPTION 'Match already finished'; END IF;
  UPDATE public.mg_live_games SET
    p1_joined=p1_joined OR me=lo,p2_joined=p2_joined OR me=hi,
    p1_seen=CASE WHEN me=lo THEN now() ELSE p1_seen END,
    p2_seen=CASE WHEN me=hi THEN now() ELSE p2_seen END,
    status=CASE WHEN (p1_joined OR me=lo) AND (p2_joined OR me=hi) THEN 'active' ELSE 'waiting' END
    WHERE id=p_match_id;
  RETURN jsonb_build_object('prior_match_count',g.prior_match_count);
END; $$;
REVOKE ALL ON FUNCTION public.mg_join_verified_live(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mg_join_verified_live(uuid,uuid) TO authenticated;

CREATE FUNCTION public.mg_live_heartbeat(p_match_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.mg_live_games SET p1_seen=CASE WHEN auth.uid()=player1_id THEN now() ELSE p1_seen END,
 p2_seen=CASE WHEN auth.uid()=player2_id THEN now() ELSE p2_seen END
 WHERE id=p_match_id AND auth.uid() IN(player1_id,player2_id) AND status IN ('waiting','active');
END; $$;
REVOKE ALL ON FUNCTION public.mg_live_heartbeat(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mg_live_heartbeat(uuid) TO authenticated;

CREATE FUNCTION public.mg_record_live_move(p_match_id uuid,p_row integer,p_col integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE g public.mg_live_games; seat integer; idx integer; dr integer; dc integer;
  rr integer; cc integer; n integer; direction integer; sign integer; won boolean:=false;
  dirs integer[][]:=ARRAY[[0,1],[1,0],[1,1],[1,-1]];
BEGIN
 SELECT * INTO g FROM public.mg_live_games WHERE id=p_match_id FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR auth.uid() NOT IN(g.player1_id,g.player2_id) THEN RAISE EXCEPTION 'Not a participant'; END IF;
 IF p_row IS NULL OR p_col IS NULL OR p_row NOT BETWEEN 0 AND 9 OR p_col NOT BETWEEN 0 AND 9 THEN RAISE EXCEPTION 'Invalid cell'; END IF;
 seat:=CASE WHEN auth.uid()=g.player1_id THEN 1 ELSE 2 END; idx:=p_row*10+p_col+1;
 -- A retried request for the player's already accepted cell is harmless.
 IF g.board[idx]=seat THEN RETURN jsonb_build_object('seat',seat,'status',g.status,'winner_id',g.winner_id); END IF;
 IF g.status<>'active' OR g.next_seat<>seat OR g.board[idx]<>0 THEN RAISE EXCEPTION 'Illegal move'; END IF;
 g.board[idx]:=seat;
 FOR direction IN 1..4 LOOP
   dr:=dirs[direction][1]; dc:=dirs[direction][2]; n:=1;
   FOREACH sign IN ARRAY ARRAY[-1,1] LOOP
     rr:=p_row+dr*sign; cc:=p_col+dc*sign;
     WHILE rr BETWEEN 0 AND 9 AND cc BETWEEN 0 AND 9 AND g.board[rr*10+cc+1]=seat LOOP
       n:=n+1; rr:=rr+dr*sign; cc:=cc+dc*sign;
     END LOOP;
   END LOOP;
   IF n>=5 THEN won:=true; EXIT; END IF;
 END LOOP;
 g.status:=CASE WHEN won THEN 'completed' WHEN NOT (0=ANY(g.board)) THEN 'draw' ELSE 'active' END;
 g.winner_id:=CASE WHEN won THEN auth.uid() ELSE NULL END;
 UPDATE public.mg_live_games SET board=g.board,moves=moves||jsonb_build_array(jsonb_build_object('type','move','row',p_row,'col',p_col,'seat',seat,'player_id',auth.uid())),next_seat=3-seat,status=g.status,winner_id=g.winner_id,
   p1_seen=CASE WHEN seat=1 THEN now() ELSE p1_seen END,p2_seen=CASE WHEN seat=2 THEN now() ELSE p2_seen END WHERE id=p_match_id;
 IF g.status IN ('completed','draw') THEN
   PERFORM public._settle_verified_match(g.id,g.player1_id,g.player2_id,g.winner_id,g.status='draw',true);
 END IF;
 RETURN jsonb_build_object('seat',seat,'status',g.status,'winner_id',g.winner_id);
END; $$;
REVOKE ALL ON FUNCTION public.mg_record_live_move(uuid,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mg_record_live_move(uuid,integer,integer) TO authenticated;

CREATE FUNCTION public.mg_confirm_match_result(p_match_id uuid,p_kind text DEFAULT 'live',p_resign boolean DEFAULT false,p_void boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE g public.mg_live_games; a public.mg_async_matches; other_seen timestamptz; winner uuid;
BEGIN
 IF p_kind='async' THEN
   SELECT * INTO a FROM public.mg_async_matches WHERE id=p_match_id FOR UPDATE;
   IF NOT FOUND OR (auth.uid() IS NULL AND coalesce(auth.role(),'')<>'service_role') OR
      (auth.uid() IS NOT NULL AND auth.uid() NOT IN(a.player1_id,a.player2_id)) THEN RAISE EXCEPTION 'Not a participant'; END IF;
   IF a.status NOT IN('completed','draw','forfeited') THEN RAISE EXCEPTION 'Result not confirmed'; END IF;
   RETURN public._settle_verified_match(a.id,a.player1_id,a.player2_id,a.winner_id,a.status='draw',false);
 ELSIF p_kind<>'live' THEN RAISE EXCEPTION 'Unknown match kind'; END IF;
 SELECT * INTO g FROM public.mg_live_games WHERE id=p_match_id FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR auth.uid() NOT IN(g.player1_id,g.player2_id) THEN RAISE EXCEPTION 'Not a participant'; END IF;
 IF g.status IN('waiting','active') THEN
   IF p_void AND g.board<>array_fill(0,ARRAY[100]) THEN RAISE EXCEPTION 'A played match cannot be voided'; END IF;
   IF NOT p_resign AND NOT p_void THEN
     other_seen:=CASE WHEN auth.uid()=g.player1_id THEN g.p2_seen ELSE g.p1_seen END;
     IF other_seen IS NULL OR other_seen>now()-interval '45 seconds' THEN RAISE EXCEPTION 'Result not confirmed; opponent still connected'; END IF;
   END IF;
   IF g.board=array_fill(0,ARRAY[100]) THEN g.status:='void';
   ELSE g.status:='completed'; g.winner_id:=CASE WHEN p_resign THEN
     CASE WHEN auth.uid()=g.player1_id THEN g.player2_id ELSE g.player1_id END ELSE auth.uid() END; END IF;
   UPDATE public.mg_live_games SET status=g.status,winner_id=g.winner_id WHERE id=g.id;
 END IF;
 IF g.status='void' THEN RETURN jsonb_build_object('isDraw',true,'voidNoMoves',true,'player1Change',0,'player2Change',0); END IF;
 RETURN public._settle_verified_match(g.id,g.player1_id,g.player2_id,g.winner_id,g.status='draw',true);
END; $$;
REVOKE ALL ON FUNCTION public.mg_confirm_match_result(uuid,text,boolean,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mg_confirm_match_result(uuid,text,boolean,boolean) TO authenticated,service_role;

CREATE TABLE public.xp_ad_claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 ad_unit text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), verified_at timestamptz, transaction_id text UNIQUE
);
ALTER TABLE public.xp_ad_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_ad_claims ON public.xp_ad_claims FOR SELECT TO authenticated USING(user_id=auth.uid());
REVOKE ALL ON public.xp_ad_claims FROM anon,authenticated;
GRANT SELECT ON public.xp_ad_claims TO authenticated;
CREATE FUNCTION public.begin_xp_ad(p_ad_unit text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE claim uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to receive ad XP'; END IF;
 IF p_ad_unit NOT IN ('ca-app-pub-6740638137327567/2005976804','ca-app-pub-6740638137327567/8356435492') THEN RAISE EXCEPTION 'Unconfigured ad unit'; END IF;
 IF (SELECT count(*) FROM public.xp_ad_claims WHERE user_id=auth.uid() AND created_at>now()-interval '1 minute')>=5 THEN RAISE EXCEPTION 'Please wait before requesting another ad'; END IF;
 INSERT INTO public.xp_ad_claims(user_id,ad_unit) VALUES(auth.uid(),p_ad_unit) RETURNING id INTO claim;
 RETURN claim;
END; $$;
REVOKE ALL ON FUNCTION public.begin_xp_ad(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.begin_xp_ad(text) TO authenticated;
CREATE FUNCTION public.confirm_xp_ad(p_claim uuid,p_user uuid,p_transaction text,p_ad_unit text,p_earned_at timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE claim public.xp_ad_claims;
BEGIN
 SELECT * INTO claim FROM public.xp_ad_claims WHERE id=p_claim FOR UPDATE;
 IF NOT FOUND OR claim.user_id<>p_user OR split_part(claim.ad_unit,'/',2)<>p_ad_unit THEN RAISE EXCEPTION 'Ad claim mismatch'; END IF;
 IF claim.verified_at IS NOT NULL THEN
   IF claim.transaction_id<>p_transaction THEN RAISE EXCEPTION 'Claim already used'; END IF;
   RETURN;
 END IF;
 IF p_earned_at<claim.created_at-interval '5 minutes' OR p_earned_at>claim.created_at+interval '2 hours' THEN RAISE EXCEPTION 'Ad claim expired'; END IF;
 UPDATE public.xp_ad_claims SET verified_at=now(),transaction_id=p_transaction WHERE id=p_claim;
 PERFORM public._credit_verified_xp(p_user,'ad:'||p_transaction,'rewarded_ad');
END; $$;
REVOKE ALL ON FUNCTION public.confirm_xp_ad(uuid,uuid,text,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_xp_ad(uuid,uuid,text,text,timestamptz) TO service_role;
COMMIT;
