-- ========================================
-- Bee Five Multiplayer Database Setup
-- ========================================
-- Copy and paste this entire file into Supabase SQL Editor and run it
-- ========================================

-- Step 1: Create game_rooms table
CREATE TABLE game_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  host_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create game_players table
CREATE TABLE game_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_number INTEGER NOT NULL CHECK (player_number IN (1, 2)),
  is_host BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, player_number)
);

-- Step 3: Create game_moves table
CREATE TABLE game_moves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_number INTEGER NOT NULL CHECK (player_number IN (1, 2)),
  row INTEGER NOT NULL CHECK (row >= 0 AND row < 10),
  col INTEGER NOT NULL CHECK (col >= 0 AND col < 10),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create game_state table
CREATE TABLE game_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  board_state TEXT NOT NULL, -- JSON string
  current_player INTEGER NOT NULL CHECK (current_player IN (1, 2)),
  winner INTEGER NOT NULL DEFAULT 0 CHECK (winner IN (0, 1, 2)),
  is_game_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id)
);

-- Step 5: Create indexes for better performance
CREATE INDEX idx_game_players_room_id ON game_players(room_id);
CREATE INDEX idx_game_moves_room_id ON game_moves(room_id);
CREATE INDEX idx_game_state_room_id ON game_state(room_id);
CREATE INDEX idx_game_rooms_room_code ON game_rooms(room_code);

-- Step 6: Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Apply triggers
CREATE TRIGGER update_game_rooms_updated_at
  BEFORE UPDATE ON game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_state_updated_at
  BEFORE UPDATE ON game_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Enable Row Level Security
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policies (allow anonymous access)
CREATE POLICY "Allow public read access" ON game_rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON game_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON game_rooms FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON game_players FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON game_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON game_players FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON game_players FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON game_moves FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON game_moves FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access" ON game_state FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON game_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON game_state FOR UPDATE USING (true);

-- Step 10: Enable Real-Time replication
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_moves;
ALTER PUBLICATION supabase_realtime ADD TABLE game_state;

-- ========================================
-- Setup Complete!
-- ========================================
-- You should see "Success. No rows returned" for each statement
-- Next: Configure your .env.local file with Supabase credentials
-- See SUPABASE_SETUP.md for detailed instructions
-- ========================================




