import { createClient } from '@supabase/supabase-js';
// @ts-ignore - react-native-dotenv types
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Universal Supabase configuration for React Native
// Reads from .env file in BeefiveApp directory
// This allows sharing the same credentials with the web version

// Get values from environment variables (react-native-dotenv)
// Fallback to empty string if not set
const supabaseUrl = (SUPABASE_URL || '').trim();
const supabaseAnonKey = (SUPABASE_ANON_KEY || '').trim();

// Check if environment variables are set and valid
const isConfigured = supabaseUrl && supabaseAnonKey && 
                    supabaseUrl !== '' &&
                    supabaseAnonKey !== '' &&
                    supabaseUrl !== 'YOUR_SUPABASE_URL' && 
                    supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
                    supabaseUrl.startsWith('https://') &&
                    supabaseAnonKey.startsWith('eyJ');

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false // React Native doesn't use URL-based auth
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
  stop_game_requested_by: 1 | 2 | null;
  next_first_player: 1 | 2;
  updated_at: string;
}

