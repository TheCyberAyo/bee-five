import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Check if environment variables are set and valid
const supabaseUrl = SUPABASE_URL?.trim();
const supabaseAnonKey = SUPABASE_ANON_KEY?.trim();

const isConfigured = supabaseUrl && supabaseAnonKey && 
                    supabaseUrl !== '' &&
                    supabaseAnonKey !== '' &&
                    supabaseUrl !== 'YOUR_SUPABASE_URL' && 
                    supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
                    supabaseUrl.startsWith('https://') &&
                    supabaseAnonKey.startsWith('eyJ');

export const supabase = isConfigured 
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // React Native doesn't use URL-based auth
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : null;

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => !!supabase;
