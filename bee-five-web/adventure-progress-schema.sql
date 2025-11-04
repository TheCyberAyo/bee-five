-- ========================================
-- Adventure Progress Database Schema
-- ========================================
-- Run this in Supabase SQL Editor to create the tables for user progress tracking
-- 
-- IMPORTANT: Run this in the SAME Supabase project where you already have:
--   - game_rooms table (from supabase-setup.sql)
--   - game_players table
--   - game_moves table
--   - game_state table
--
-- This ensures:
--   ✅ Same user accounts work for both multiplayer and adventure modes
--   ✅ Progress syncs between web and app versions
--   ✅ Single authentication system for everything
-- ========================================

-- Step 1: Create user_profiles table (stores user metadata)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create adventure_progress table (stores adventure game progress)
CREATE TABLE IF NOT EXISTS adventure_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  current_game INTEGER NOT NULL DEFAULT 1,
  highest_unlocked_game INTEGER NOT NULL DEFAULT 1,
  games_completed INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  games_won INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_adventure_progress_user_id ON adventure_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Step 4: Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Apply triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_adventure_progress_updated_at ON adventure_progress;
CREATE TRIGGER update_adventure_progress_updated_at
  BEFORE UPDATE ON adventure_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE adventure_progress ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies
-- Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can only read/update their own progress
CREATE POLICY "Users can view own progress" ON adventure_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON adventure_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON adventure_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 8: Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- Setup Complete!
-- ========================================
-- Users can now:
-- 1. Sign up and have a profile created automatically
-- 2. Save and load their adventure game progress
-- 3. Progress syncs across web and app versions
-- ========================================

