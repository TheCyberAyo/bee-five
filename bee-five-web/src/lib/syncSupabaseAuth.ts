import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** Attach JWT to Realtime (and verify client) after sign-in or session restore. */
export function syncSupabaseAuth(session: Session | null | undefined): void {
  if (!supabase || !session?.access_token) return;
  supabase.realtime.setAuth(session.access_token);
}

/** True when REST + Realtime can use an authenticated JWT. */
export function hasUsableAuthSession(session: Session | null | undefined): boolean {
  return Boolean(session?.access_token && session.user?.id);
}
