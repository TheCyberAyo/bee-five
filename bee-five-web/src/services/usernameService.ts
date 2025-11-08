import { supabase } from '../lib/supabase';

/**
 * Check if a username is available
 */
export async function isUsernameAvailable(username: string): Promise<{ available: boolean; error?: string }> {
  if (!supabase) {
    // If Supabase is not configured, allow the username (will fail later during signup)
    console.warn('Supabase not configured, skipping username check');
    return { available: true };
  }

  if (!username || username.trim().length < 3) {
    return { available: false, error: 'Username must be at least 3 characters' };
  }

  // Check for invalid characters
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username.trim())) {
    return { 
      available: false, 
      error: 'Username can only contain letters, numbers, underscores, and hyphens' 
    };
  }

  try {
    // Normalize username for comparison (lowercase, trimmed)
    const normalizedUsername = username.trim().toLowerCase();
    
    type UsernameRow = { username: string | null };
    // Fetch all usernames and check case-insensitively
    const { data, error } = await supabase
      .from('user_profiles')
      .select('username');

    if (error) {
      console.error('Error checking username:', error);
      // On error, allow the username (optimistic approach)
      return { available: true };
    }

    // Check if any existing username matches (case-insensitive)
    const exists =
      (data as UsernameRow[] | null)?.some((profile) => profile.username?.toLowerCase() === normalizedUsername) || false;

    return { available: !exists };
  } catch (error) {
    console.error('Error checking username:', error);
    // On error, allow the username (optimistic approach)
    return { available: true };
  }
}

