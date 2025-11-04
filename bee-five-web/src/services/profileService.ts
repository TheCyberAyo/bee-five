import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string | null;
  username: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Load user profile from database
 */
export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) {
    console.warn('Supabase is not configured');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error loading profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error loading profile:', error);
    return null;
  }
}

/**
 * Update user profile (username)
 */
export async function updateUserProfile(
  userId: string,
  updates: { username?: string; email?: string }
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase is not configured');
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    // If updating username, check if it's available
    if (updates.username) {
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', updates.username.trim())
        .neq('id', userId)
        .limit(1);

      if (existing && existing.length > 0) {
        return { success: false, error: 'Username is already taken' };
      }
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505' || error.message.includes('unique')) {
        return { success: false, error: 'Username is already taken' };
      }
      console.error('Error updating profile:', error);
      return { success: false, error: error.message || 'Failed to update profile' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return { success: false, error: error.message || 'Failed to update profile' };
  }
}

