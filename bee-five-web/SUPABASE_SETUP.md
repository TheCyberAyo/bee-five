# Supabase Multiplayer Setup Guide

Follow these steps to enable multiplayer functionality in Bee-Five.

## Step 1: Create a Supabase Account and Project

1. **Go to [Supabase](https://supabase.com)**
   - Visit https://supabase.com
   - Click "Start your project" (or sign up if you don't have an account)

2. **Create a new project**
   - Click "New Project"
   - Fill in project details:
     - **Project Name**: `bee-five` (or any name you prefer)
     - **Database Password**: Create a strong password (save this!)
     - **Region**: Choose closest to your users
     - **Pricing Plan**: Free tier is fine for development

3. **Wait for project creation** (takes 1-2 minutes)

---

## Step 2: Get Your Supabase Credentials

1. **Open your project** in Supabase dashboard

2. **Go to Settings → API**
   - Click the ⚙️ Settings icon (left sidebar)
   - Click "API" in the settings menu

3. **Copy these values:**
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJhbGc...` - this is the anon key)

4. **Keep this page open** - you'll need these values in the next step!

---

## Step 3: Configure Environment Variables

1. **Create `.env.local` file** in your project root (same folder as `package.json`)
   - If the file doesn't exist, create it
   - ⚠️ **Important**: This file is already in `.gitignore`, so it won't be committed to git

2. **Add these two lines** (replace with YOUR actual values from Step 2):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHh4eHgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MTk2ODAwMCwiZXhwIjoxOTU3NTQ0MDAwfQ.your_actual_anon_key_here
```

3. **Example with dummy values** (replace these!):
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MTk2ODAwMCwiZXhwIjoxOTU3NTQ0MDAwfQ.dummy_key_replace_with_real_one
```

4. **Save the file**

5. **Restart your development server** if it's running:
   ```bash
   # Stop the server (Ctrl+C), then:
   npm run dev
   ```

---

## Step 4: Create Database Tables

1. **Go to SQL Editor** in Supabase dashboard
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

2. **Copy and paste this SQL** (select all, copy, then paste into the SQL Editor):

```sql
-- Create game_rooms table
CREATE TABLE game_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  host_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create game_players table
CREATE TABLE game_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_number INTEGER NOT NULL CHECK (player_number IN (1, 2)),
  is_host BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, player_number)
);

-- Create game_moves table
CREATE TABLE game_moves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_number INTEGER NOT NULL CHECK (player_number IN (1, 2)),
  row INTEGER NOT NULL CHECK (row >= 0 AND row < 10),
  col INTEGER NOT NULL CHECK (col >= 0 AND col < 10),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create game_state table
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

-- Create indexes for better performance
CREATE INDEX idx_game_players_room_id ON game_players(room_id);
CREATE INDEX idx_game_moves_room_id ON game_moves(room_id);
CREATE INDEX idx_game_state_room_id ON game_state(room_id);
CREATE INDEX idx_game_rooms_room_code ON game_rooms(room_code);

-- Create updated_at trigger function (automatically updates updated_at timestamp)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to game_rooms
CREATE TRIGGER update_game_rooms_updated_at
  BEFORE UPDATE ON game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to game_state
CREATE TRIGGER update_game_state_updated_at
  BEFORE UPDATE ON game_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

3. **Click "Run"** button (or press Ctrl+Enter)
   - You should see "Success. No rows returned"
   - If you see errors, check that you copied the entire SQL block

4. **Verify tables were created:**
   - Go to "Table Editor" in left sidebar
   - You should see 4 tables: `game_rooms`, `game_players`, `game_moves`, `game_state`

---

## Step 5: Enable Row Level Security (RLS) Policies

1. **Enable RLS on all tables:**
   - Go to "Table Editor"
   - Click on each table (`game_rooms`, `game_players`, `game_moves`, `game_state`)
   - Click the "..." menu → "Enable RLS" (if not already enabled)

2. **Go back to SQL Editor** and run this SQL to allow public access (for anonymous users):

```sql
-- Enable anonymous access to read and write (for multiplayer)
-- ⚠️ For production, you may want to restrict this further

-- game_rooms policies
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON game_rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON game_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON game_rooms FOR UPDATE USING (true);

-- game_players policies
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON game_players FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON game_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON game_players FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON game_players FOR DELETE USING (true);

-- game_moves policies
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON game_moves FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON game_moves FOR INSERT WITH CHECK (true);

-- game_state policies
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON game_state FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON game_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON game_state FOR UPDATE USING (true);
```

3. **Click "Run"**

---

## Step 6: Enable Real-Time for Tables

1. **Enable Realtime** for each table:

   **For `game_rooms` table:**
   - Go to "Database" → "Replication" (or "Table Editor" → select `game_rooms`)
   - Toggle ON the "Realtime" switch for `game_rooms`
   - Or use SQL:
     ```sql
     ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
     ```

   **For `game_players` table:**
   - Same process for `game_players`
   - Toggle ON the "Realtime" switch
   - Or use SQL:
     ```sql
     ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
     ```

   **For `game_moves` table:**
   - Same process for `game_moves`
   - Toggle ON the "Realtime" switch
   - Or use SQL:
     ```sql
     ALTER PUBLICATION supabase_realtime ADD TABLE game_moves;
     ```

   **For `game_state` table:**
   - Same process for `game_state`
   - Toggle ON the "Realtime" switch
   - Or use SQL:
     ```sql
     ALTER PUBLICATION supabase_realtime ADD TABLE game_state;
     ```

2. **OR run all at once in SQL Editor:**
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
   ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
   ALTER PUBLICATION supabase_realtime ADD TABLE game_moves;
   ALTER PUBLICATION supabase_realtime ADD TABLE game_state;
   ```

---

## Step 7: Verify Setup

1. **Restart your Next.js dev server** (if running):
   ```bash
   # Stop (Ctrl+C) and restart:
   npm run dev
   ```

2. **Test multiplayer:**
   - Open your game in two different browsers (or incognito windows)
   - Try creating a room in one and joining with the room code in the other
   - Make moves - they should sync in real-time!

---

## Troubleshooting

### Issue: "Supabase is not configured"
- ✅ Check that `.env.local` exists in project root
- ✅ Check that environment variables are named exactly: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ Restart your dev server after adding/changing `.env.local`

### Issue: "Room not found" or database errors
- ✅ Verify tables were created (check Table Editor)
- ✅ Check RLS policies are set (should allow SELECT, INSERT, UPDATE)
- ✅ Verify real-time is enabled for all 4 tables

### Issue: Moves not syncing
- ✅ Check real-time is enabled (Database → Replication)
- ✅ Check browser console for errors
- ✅ Verify both players are in the same room

### Issue: Can't see real-time toggle
- ✅ Make sure you're on the Supabase dashboard
- ✅ Try using the SQL method instead: `ALTER PUBLICATION supabase_realtime ADD TABLE table_name;`

---

## Quick Reference: Your Supabase Credentials

```
Project URL: https://[your-project-ref].supabase.co
Anon Key: eyJhbG...[your-anon-key]
```

Save these somewhere safe - you'll need them if you deploy or reset your project!

---

## Next Steps

Once setup is complete:
1. ✅ Multiplayer should work across different devices/browsers
2. ✅ Players can create and join rooms
3. ✅ Game moves sync in real-time
4. ✅ Game state persists in the database

Happy gaming! 🐝🎮




