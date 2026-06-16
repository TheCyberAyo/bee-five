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
    const [profilesRes, mgProfilesRes] = await Promise.all([
      supabase.from('profiles').select('username'),
      supabase.from('mg_profiles').select('username'),
    ]);

    if (profilesRes.error && mgProfilesRes.error) {
      console.error('Error checking username:', profilesRes.error, mgProfilesRes.error);
      return { available: true };
    }

    const allRows = [...(profilesRes.data ?? []), ...(mgProfilesRes.data ?? [])] as Row[];
    const exists = allRows.some((p) => p.username?.toLowerCase() === normalizedUsername);

    return { available: !exists };
  } catch (error) {
    console.error('Error checking username:', error);
    return { available: true };
  }
}
