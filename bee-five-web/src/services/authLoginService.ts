import { supabase } from '../lib/supabase';
import { internalEmailFromUsername } from '../lib/internalAuthEmail';

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
    return 'Invalid username or password. Use the same BeeFive username and password as the mobile app.';
  }
  if (m.includes('email not confirmed')) {
    return 'Email confirmation is still pending. Try signing in on the mobile app, or contact support.';
  }
  return message?.trim() || 'Failed to sign in. Please try again.';
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
      if (!error && typeof data === 'string' && data.includes('@')) {
        return data;
      }
    } catch {
      // Fall through to synthetic email.
    }
  }

  return internalEmailFromUsername(trimmed);
}
