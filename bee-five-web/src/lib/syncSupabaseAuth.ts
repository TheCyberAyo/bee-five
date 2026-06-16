import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** Attach JWT to Realtime after sign-in or session restore. */
export function syncSupabaseAuth(session: Session | null | undefined): void {
  if (!supabase || !session?.access_token) return;
  supabase.realtime.setAuth(session.access_token);
}

/** True when REST + Realtime can use an authenticated JWT. */
export function hasUsableAuthSession(session: Session | null | undefined): boolean {
  return Boolean(session?.access_token && session.user?.id);
}

/**
 * Ensure the Supabase JS client uses the same session as React AuthContext
 * so PostgREST requests include Authorization (RLS as authenticated).
 */
export async function bindSupabaseSession(
  session: Session | null | undefined,
): Promise<boolean> {
  if (!supabase || !session?.access_token) return false;

  const { data: { session: current } } = await supabase.auth.getSession();
  if (current?.access_token === session.access_token) {
    syncSupabaseAuth(current);
    return true;
  }

  if (!session.refresh_token) {
    syncSupabaseAuth(session);
    return true;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  if (error || !data.session?.access_token) {
    console.warn('bindSupabaseSession: setSession failed', error?.message);
    syncSupabaseAuth(session);
    return false;
  }

  syncSupabaseAuth(data.session);
  return true;
}
