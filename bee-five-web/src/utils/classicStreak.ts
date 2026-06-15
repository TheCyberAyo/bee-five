export const CLASSIC_SESSION_SECONDS = 10 * 60;
export const PREF_CLASSIC_BEST_STREAK = 'classic_best_streak';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

/** Games 1–2 easy, 3–4 medium, 5–6 hard, then repeat. Games ending in 6 or 7 (≤100) are medium. */
export function classicStreakDifficultyForGame(gameIndex: number): AIDifficulty {
  if (gameIndex <= 100 && (gameIndex % 10 === 6 || gameIndex % 10 === 7)) {
    return 'medium';
  }
  const slot = (gameIndex - 1) % 6;
  if (slot < 2) return 'easy';
  if (slot < 4) return 'medium';
  return 'hard';
}

export function scoreForDifficulty(difficulty: AIDifficulty): number {
  switch (difficulty) {
    case 'easy':
      return 1;
    case 'medium':
      return 2;
    case 'hard':
      return 3;
    default:
      return 1;
  }
}

/** Games 1–6: 0, 7–12: 4, 13–18: 7, 19+: 12 blocked cells. */
export function blockedCellCountForGame(gameIndex: number): number {
  if (gameIndex <= 6) return 0;
  if (gameIndex <= 12) return 4;
  if (gameIndex <= 18) return 7;
  return 12;
}

export function loadClassicBestStreak(): number {
  if (typeof window === 'undefined') return 0;
  const raw = window.localStorage.getItem(PREF_CLASSIC_BEST_STREAK);
  const parsed = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function saveClassicBestStreak(streak: number): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PREF_CLASSIC_BEST_STREAK, String(streak));
}

export function formatSessionTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
