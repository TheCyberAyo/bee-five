-- XP auxiliary state for cross-device sync (daily challenge, streak counters, first-clear tracking).

ALTER TABLE public.adventure_progress
  ADD COLUMN IF NOT EXISTS daily_challenge_date TEXT;

ALTER TABLE public.adventure_progress
  ADD COLUMN IF NOT EXISTS daily_challenge_won BOOLEAN;

ALTER TABLE public.adventure_progress
  ADD COLUMN IF NOT EXISTS adventure_consecutive_wins INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.adventure_progress
  ADD COLUMN IF NOT EXISTS adventure_consecutive_losses INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.adventure_progress
  ADD COLUMN IF NOT EXISTS adventure_levels_first_clear INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

ALTER TABLE public.adventure_progress
  ADD COLUMN IF NOT EXISTS adventure_first_clear_xp_migrated BOOLEAN NOT NULL DEFAULT FALSE;
