import { supabase } from '../lib/supabase';
import {
  INTERNAL_EMAIL_DOMAIN,
  internalEmailFromUsername,
  normalizeUsername,
} from '../lib/internalAuthEmail';

export interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  school: string | null;
  elo: number;
  created_at: string;
}

export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) {
    console.warn('Supabase is not configured');
    return null;
  }

  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

    if (error) {
      console.error('Error loading profile:', error);
      return null;
    }

    return data as UserProfile;
  } catch (error) {
    console.error('Error loading profile:', error);
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: { username?: string; full_name?: string | null; school?: string | null }
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase is not configured');
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    const nextUsername = updates.username?.trim();

    if (nextUsername) {
      const normalized = normalizeUsername(nextUsername);
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', normalized)
        .neq('id', userId)
        .limit(1);

      if (existing && existing.length > 0) {
        return { success: false, error: 'Username is already taken' };
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email?.toLowerCase().endsWith(`@${INTERNAL_EMAIL_DOMAIN}`)) {
        const newEmail = internalEmailFromUsername(normalized);
        const { error: authErr } = await supabase.auth.updateUser({ email: newEmail });
        if (authErr) {
          return { success: false, error: authErr.message || 'Could not update login identifier' };
        }
      }

      updates = { ...updates, username: normalized };
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);

    if (error) {
      if (error.code === '23505' || error.message.includes('unique')) {
        return { success: false, error: 'Username is already taken' };
      }
      console.error('Error updating profile:', error);
      return { success: false, error: error.message || 'Failed to update profile' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update profile',
    };
  }
}
