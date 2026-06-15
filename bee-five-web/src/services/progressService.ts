import { supabase } from '../lib/supabase';

async function saveAdventureProgress(
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
    const { data: existing } = await supabase
      .from('adventure_progress')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (existing) {
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

/** Reset adventure progress to level 1 for the given user (requires prior password confirmation by caller). */
export async function resetAdventureProgress(userId: string): Promise<boolean> {
  return saveAdventureProgress(userId, {
    current_game: 1,
    highest_unlocked_game: 1,
    games_completed: [],
    games_won: 0,
  });
}
