-- Adventure progress + dashboard stats (web + Flutter cross-device sync).
-- Remote projects that only had mg_* tables need this before xp aux ALTER migrations.

CREATE TABLE IF NOT EXISTS public.adventure_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  current_game INTEGER NOT NULL DEFAULT 1,
  highest_unlocked_game INTEGER NOT NULL DEFAULT 1,
  games_completed INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  games_won INTEGER NOT NULL DEFAULT 0,
  user_xp INTEGER NOT NULL DEFAULT 10,
  login_streak INTEGER NOT NULL DEFAULT 0,
  classic_best_streak INTEGER NOT NULL DEFAULT 0,
  daily_challenge_date TEXT,
  daily_challenge_won BOOLEAN,
  adventure_consecutive_wins INTEGER NOT NULL DEFAULT 0,
  adventure_consecutive_losses INTEGER NOT NULL DEFAULT 0,
  adventure_levels_first_clear INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  adventure_first_clear_xp_migrated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Existing rows created before aux columns were added to CREATE TABLE.
ALTER TABLE public.adventure_progress
  ADD COLUMN IF NOT EXISTS user_xp INTEGER NOT NULL DEFAULT 10;

ALTER TABLE public.adventure_progress
  ADD COLUMN IF NOT EXISTS login_streak INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.adventure_progress
  ADD COLUMN IF NOT EXISTS classic_best_streak INTEGER NOT NULL DEFAULT 0;

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

CREATE INDEX IF NOT EXISTS idx_adventure_progress_user_id ON public.adventure_progress(user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_adventure_progress_updated_at ON public.adventure_progress;
CREATE TRIGGER update_adventure_progress_updated_at
  BEFORE UPDATE ON public.adventure_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.adventure_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own progress" ON public.adventure_progress;
CREATE POLICY "Users can view own progress" ON public.adventure_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON public.adventure_progress;
CREATE POLICY "Users can update own progress" ON public.adventure_progress
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progress" ON public.adventure_progress;
CREATE POLICY "Users can insert own progress" ON public.adventure_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
