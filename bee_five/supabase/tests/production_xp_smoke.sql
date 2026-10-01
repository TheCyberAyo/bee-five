-- Run after the XP migrations with `supabase db query --linked --file ...`.
-- Exercise the real authenticated permissions, then roll back every test write.
-- No account IDs, emails, or balances are returned.
BEGIN;
SET LOCAL statement_timeout = '15s';
SELECT set_config('request.jwt.claim.sub',
  (SELECT user_id::text FROM public.adventure_progress ORDER BY user_id LIMIT 1), true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  owner uuid := auth.uid();
  event_id uuid := gen_random_uuid();
  before_xp integer;
  after_xp integer;
  retried_xp integer;
  events jsonb;
BEGIN
  IF owner IS NULL THEN RAISE EXCEPTION 'An existing progress row is required'; END IF;
  before_xp := (public.apply_xp_events(owner, '[]'::jsonb)->>'user_xp')::integer;
  events := jsonb_build_array(jsonb_build_object('id', event_id, 'reason', 'adventure_win'));
  after_xp := (public.apply_xp_events(owner, events)->>'user_xp')::integer;
  retried_xp := (public.apply_xp_events(owner, events)->>'user_xp')::integer;
  IF after_xp <> least(2147483647::bigint, before_xp::bigint + 1)
    OR retried_xp <> after_xp THEN
    RAISE EXCEPTION 'XP increment or retry protection failed';
  END IF;
  BEGIN
    UPDATE public.adventure_progress SET user_xp = 999999 WHERE user_id = owner;
    RAISE EXCEPTION 'Direct XP overwrite was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.apply_xp_events(gen_random_uuid(), '[]'::jsonb);
    RAISE EXCEPTION 'Cross-account XP access was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
ROLLBACK;
SELECT 'PASS: authenticated XP, retry protection, write restrictions and ownership; all test writes rolled back' AS result;
