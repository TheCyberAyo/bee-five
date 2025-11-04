import { supabase } from '../lib/supabase';

export interface AdventureProgress {
  user_id: string;
  current_game: number;
  highest_unlocked_game: number;
  games_completed: number[];
  games_won: number;
  updated_at: string;
}

/**
 * Load adventure game progress for the current user
 */
export async function loadAdventureProgress(userId: string): Promise<AdventureProgress | null> {
  if (!supabase) {
    console.warn('Supabase is not configured');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('adventure_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No progress found, return null to create new progress
        return null;
      }
      console.error('Error loading progress:', error);
      return null;
    }

    return {
      user_id: data.user_id,
      current_game: data.current_game || 1,
      highest_unlocked_game: data.highest_unlocked_game || 1,
      games_completed: data.games_completed || [],
      games_won: data.games_won || 0,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Error loading progress:', error);
    return null;
  }
}

/**
 * Save adventure game progress for the current user
 */
export async function saveAdventureProgress(
  userId: string,
  progress: {
    current_game?: number;
    highest_unlocked_game?: number;
    games_completed?: number[];
    games_won?: number;
  }
): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase is not configured');
    return false;
  }

  try {
    // Check if progress exists
    const { data: existing } = await supabase
      .from('adventure_progress')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Update existing progress
      const { error } = await supabase
        .from('adventure_progress')
        .update({
          current_game: progress.current_game,
          highest_unlocked_game: progress.highest_unlocked_game,
          games_completed: progress.games_completed,
          games_won: progress.games_won,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating progress:', error);
        return false;
      }
    } else {
      // Create new progress
      const { error } = await supabase.from('adventure_progress').insert({
        user_id: userId,
        current_game: progress.current_game || 1,
        highest_unlocked_game: progress.highest_unlocked_game || 1,
        games_completed: progress.games_completed || [],
        games_won: progress.games_won || 0,
      });

      if (error) {
        console.error('Error creating progress:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error saving progress:', error);
    return false;
  }
}

/**
 * Auto-save progress (debounced to avoid too many saves)
 */
let saveTimeout: NodeJS.Timeout | null = null;
const SAVE_DELAY = 2000; // 2 seconds debounce

export async function autoSaveProgress(
  userId: string,
  progress: {
    current_game?: number;
    highest_unlocked_game?: number;
    games_completed?: number[];
    games_won?: number;
  }
): Promise<void> {
  if (!userId) return;

  // Clear existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Set new timeout
  saveTimeout = setTimeout(async () => {
    await saveAdventureProgress(userId, progress);
  }, SAVE_DELAY);
}

