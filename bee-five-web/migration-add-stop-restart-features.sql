-- Migration: Add stop game request and alternating first player features
-- Run this in Supabase SQL Editor

-- Add stop_game_requested_by field to game_state (1 or 2 for player number, or NULL)
ALTER TABLE game_state 
ADD COLUMN IF NOT EXISTS stop_game_requested_by INTEGER CHECK (stop_game_requested_by IN (1, 2)) DEFAULT NULL;

-- Add next_first_player field to track who should play first in next game (for alternating)
ALTER TABLE game_state 
ADD COLUMN IF NOT EXISTS next_first_player INTEGER CHECK (next_first_player IN (1, 2)) DEFAULT 1;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_game_state_stop_request ON game_state(room_id, stop_game_requested_by) WHERE stop_game_requested_by IS NOT NULL;

