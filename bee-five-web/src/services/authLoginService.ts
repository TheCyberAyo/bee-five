import { supabase } from '../lib/supabase';
import { internalEmailFromUsername, normalizeUsername } from '../lib/internalAuthEmail';

/** Map Supabase auth errors to user-facing copy (aligned with Dart sign-in). */
export function mapSignInErrorMessage(message: string | undefined): string {
  const m = (message ?? '').toLowerCase();
  if (
    m.includes('invalid login') ||
    m.includes('invalid_credentials') ||
    m.includes('invalid grant') ||
    m.includes('user not found') ||
    m.includes('does not exist') ||
    m.includes('no user') ||
    m.includes('not found')
  ) {
    return 'Incorrect password for that username. Try again or reset your password on the mobile app.';
  }
  if (m.includes('email not confirmed')) {
    return 'Email confirmation is still pending. Try signing in on the mobile app, or contact support.';
  }
  return message?.trim() || 'Failed to sign in. Please try again.';
}

export function usernameNotFoundMessage(username: string): string {
  const un = normalizeUsername(username);
  return `No BeeFive account exists for "${un}". If you play on mobile, tap Sign In there (not "Continue as Guest") and use that exact username. Otherwise create an account with Sign Up.`;
}

/**
 * Whether Supabase has an auth user for this public username.
 * Returns null when the check could not run (caller should still attempt sign-in).
 */
export async function isUsernameRegistered(username: string): Promise<boolean | null> {
  if (!supabase) return null;
  const trimmed = username.trim();
  if (!trimmed || trimmed.includes('@')) return null;

  try {
    const { data, error } = await supabase.rpc('username_is_registered', {
      p_username: trimmed,
    });
    if (error) {
      console.warn('username_is_registered:', error.message);
      return null;
    }
    return data === true;
  } catch {
    return null;
  }
}

/**
 * Resolve auth.users.email from a public username (RPC), then synthetic @beefive.app.
 */
export async function resolveLoginEmail(identifier: string): Promise<string> {
  const trimmed = identifier.trim();
  if (trimmed.includes('@')) {
    return trimmed;
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('resolve_auth_email_for_username', {
        p_username: trimmed,
      });
      if (error) {
        console.warn('resolve_auth_email_for_username:', error.message);
      } else if (typeof data === 'string' && data.includes('@')) {
        return data;
      }
    } catch {
      // Fall through to synthetic email.
    }
  }

  return internalEmailFromUsername(trimmed);
}
