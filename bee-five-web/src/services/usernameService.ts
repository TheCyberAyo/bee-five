import { supabase } from '../lib/supabase';

/**
 * Check if a username is available
 */
export async function isUsernameAvailable(username: string): Promise<{ available: boolean; error?: string }> {
  if (!supabase) {
    return { available: false, error: 'Supabase is not configured' };
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
    const { data, error } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('username', username.trim())
      .limit(1);

    if (error) {
      console.error('Error checking username:', error);
      return { available: false, error: 'Error checking username availability' };
    }

    return { available: data.length === 0 };
  } catch (error) {
    console.error('Error checking username:', error);
    return { available: false, error: 'Error checking username availability' };
  }
}

