import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if environment variables are set
const isConfigured = supabaseUrl && supabaseAnonKey && 
                    supabaseUrl !== 'YOUR_SUPABASE_URL' && 
                    supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';

export const supabase = isConfigured 
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : null;

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => !!supabase;

// Database types
export interface GameRoom {
  id: string;
  room_code: string;
  host_id: string;
  status: 'waiting' | 'active' | 'finished';
  created_at: string;
  updated_at: string;
}

export interface GamePlayer {
  id: string;
  room_id: string;
  player_name: string;
  player_number: 1 | 2;
  is_host: boolean;
  created_at: string;
}

export interface GameMove {
  id: string;
  room_id: string;
  player_number: 1 | 2;
  row: number;
  col: number;
  timestamp: string;
  created_at: string;
}

export interface GameState {
  id: string;
  room_id: string;
  board_state: string; // JSON string of the board
  current_player: 1 | 2;
  winner: 0 | 1 | 2;
  is_game_active: boolean;
  updated_at: string;
}


