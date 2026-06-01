import { supabase } from '../lib/supabase';
import { normalizeUsername } from '../lib/internalAuthEmail';

export async function isUsernameAvailable(username: string): Promise<{ available: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase is not configured, skipping username check');
    return { available: true };
  }

  if (!username || username.trim().length < 3) {
    return { available: false, error: 'Username must be at least 3 characters' };
  }

  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username.trim())) {
    return {
      available: false,
      error: 'Username can only contain letters, numbers, underscores, and hyphens',
    };
  }

  try {
    const normalizedUsername = normalizeUsername(username);

    type Row = { username: string | null };
    const { data, error } = await supabase.from('profiles').select('username');

    if (error) {
      console.error('Error checking username:', error);
      return { available: true };
    }

    const exists =
      (data as Row[] | null)?.some((p) => p.username?.toLowerCase() === normalizedUsername) || false;

    return { available: !exists };
  } catch (error) {
    console.error('Error checking username:', error);
    return { available: true };
  }
}
