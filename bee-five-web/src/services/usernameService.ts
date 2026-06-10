import { supabase } from '../lib/supabase';
import { normalizeUsername, validateUsername } from '../lib/internalAuthEmail';

export async function isUsernameAvailable(username: string): Promise<{ available: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase is not configured, skipping username check');
    return { available: true };
  }

  const formatError = validateUsername(username);
  if (formatError) {
    return { available: false, error: formatError };
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
