import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AdventureProgress {
  user_id: string;
  current_game: number;
  highest_unlocked_game: number;
  games_completed: number[];
  games_won: number;
  updated_at: string;
}

const LOCAL_STORAGE_KEY = 'beeAdventureProgress';

/**
 * Load adventure game progress for the current user from Supabase
 */
export async function loadAdventureProgress(userId: string): Promise<AdventureProgress | null> {
  if (!supabase) {
    console.warn('Supabase is not configured');
    // Try to load from local storage as fallback
    return loadLocalProgress(userId);
  }

  try {
    const { data, error } = await supabase
      .from('adventure_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No progress found, try local storage
        return loadLocalProgress(userId);
      }
      console.error('Error loading progress:', error);
      // Fallback to local storage on error
      return loadLocalProgress(userId);
    }

    const progress = {
      user_id: data.user_id,
      current_game: data.current_game || 1,
      highest_unlocked_game: data.highest_unlocked_game || 1,
      games_completed: data.games_completed || [],
      games_won: data.games_won || 0,
      updated_at: data.updated_at,
    };

    // Also save to local storage as backup
    await saveLocalProgress(userId, progress);

    return progress;
  } catch (error) {
    console.error('Error loading progress:', error);
    // Fallback to local storage on error
    return loadLocalProgress(userId);
  }
}

/**
 * Save adventure game progress for the current user to Supabase
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
  // Always save to local storage first (for offline support)
  const localProgress = await loadLocalProgress(userId);
  const mergedProgress = {
    current_game: progress.current_game ?? localProgress?.current_game ?? 1,
    highest_unlocked_game: progress.highest_unlocked_game ?? localProgress?.highest_unlocked_game ?? 1,
    games_completed: progress.games_completed ?? localProgress?.games_completed ?? [],
    games_won: progress.games_won ?? localProgress?.games_won ?? 0,
  };
  await saveLocalProgress(userId, { ...mergedProgress, user_id: userId, updated_at: new Date().toISOString() });

  if (!supabase) {
    console.warn('Supabase is not configured, saved to local storage only');
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
          current_game: mergedProgress.current_game,
          highest_unlocked_game: mergedProgress.highest_unlocked_game,
          games_completed: mergedProgress.games_completed,
          games_won: mergedProgress.games_won,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating progress:', error);
        // Progress is still saved locally, so return true
        return true;
      }
    } else {
      // Create new progress
      const { error } = await supabase.from('adventure_progress').insert({
        user_id: userId,
        current_game: mergedProgress.current_game || 1,
        highest_unlocked_game: mergedProgress.highest_unlocked_game || 1,
        games_completed: mergedProgress.games_completed || [],
        games_won: mergedProgress.games_won || 0,
      });

      if (error) {
        console.error('Error creating progress:', error);
        // Progress is still saved locally, so return true
        return true;
      }
    }

    return true;
  } catch (error) {
    console.error('Error saving progress:', error);
    // Progress is still saved locally, so return true
    return true;
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

/**
 * Load progress from local storage (for offline support)
 */
async function loadLocalProgress(userId: string | null): Promise<AdventureProgress | null> {
  try {
    const key = userId ? `${LOCAL_STORAGE_KEY}:${userId}` : `${LOCAL_STORAGE_KEY}:guest`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed as AdventureProgress;
  } catch (error) {
    console.warn('Failed to load local progress', error);
    return null;
  }
}

/**
 * Save progress to local storage (for offline support)
 */
async function saveLocalProgress(userId: string | null, progress: AdventureProgress): Promise<void> {
  try {
    const key = userId ? `${LOCAL_STORAGE_KEY}:${userId}` : `${LOCAL_STORAGE_KEY}:guest`;
    await AsyncStorage.setItem(key, JSON.stringify(progress));
  } catch (error) {
    console.warn('Failed to save local progress', error);
  }
}

/**
 * Sync local progress to Supabase (call when coming back online)
 */
export async function syncLocalProgressToServer(userId: string): Promise<boolean> {
  const localProgress = await loadLocalProgress(userId);
  if (!localProgress) {
    return false;
  }

  // Check if server has newer progress
  if (supabase) {
    try {
      const { data: serverProgress } = await supabase
        .from('adventure_progress')
        .select('updated_at')
        .eq('user_id', userId)
        .single();

      // If server has newer progress, don't overwrite
      if (serverProgress && serverProgress.updated_at > localProgress.updated_at) {
        // Load server progress instead
        return false;
      }
    } catch (error) {
      // No server progress, continue with sync
    }
  }

  // Sync local progress to server
  return await saveAdventureProgress(userId, {
    current_game: localProgress.current_game,
    highest_unlocked_game: localProgress.highest_unlocked_game,
    games_completed: localProgress.games_completed,
    games_won: localProgress.games_won,
  });
}























