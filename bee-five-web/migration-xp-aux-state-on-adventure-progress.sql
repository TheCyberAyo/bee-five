-- Optional: run in Supabase SQL Editor if your project was created before these columns existed.
-- Syncs daily challenge, adventure streak counters, and first-clear XP tracking across devices.

ALTER TABLE adventure_progress
  ADD COLUMN IF NOT EXISTS daily_challenge_date TEXT;

ALTER TABLE adventure_progress
  ADD COLUMN IF NOT EXISTS daily_challenge_won BOOLEAN;

ALTER TABLE adventure_progress
  ADD COLUMN IF NOT EXISTS adventure_consecutive_wins INTEGER NOT NULL DEFAULT 0;

ALTER TABLE adventure_progress
  ADD COLUMN IF NOT EXISTS adventure_consecutive_losses INTEGER NOT NULL DEFAULT 0;

ALTER TABLE adventure_progress
  ADD COLUMN IF NOT EXISTS adventure_levels_first_clear INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

ALTER TABLE adventure_progress
  ADD COLUMN IF NOT EXISTS adventure_first_clear_xp_migrated BOOLEAN NOT NULL DEFAULT FALSE;
