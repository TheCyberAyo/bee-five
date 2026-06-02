-- Optional: run in Supabase SQL Editor if your project was created before these columns existed.
-- Stores dashboard stats on the same row as adventure progress so signed-in users keep them across devices.

ALTER TABLE adventure_progress
  ADD COLUMN IF NOT EXISTS user_xp INTEGER NOT NULL DEFAULT 10;

ALTER TABLE adventure_progress
  ADD COLUMN IF NOT EXISTS login_streak INTEGER NOT NULL DEFAULT 0;

ALTER TABLE adventure_progress
  ADD COLUMN IF NOT EXISTS classic_best_streak INTEGER NOT NULL DEFAULT 0;
