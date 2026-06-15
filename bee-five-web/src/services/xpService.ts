const XP_KEY = 'user_xp';

export const defaultXp = 10;
export const xpSchoolLobbyMatchDelta = 1;

export const liveMatchesRequiresXpMessage =
  'You need at least 1 XP to play Live Matches. Earn XP in Adventure or Classic mode.';

export function ensureXpInitialized(): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(XP_KEY) == null) {
    localStorage.setItem(XP_KEY, String(defaultXp));
  }
}

export function getXp(): number {
  if (typeof window === 'undefined') return defaultXp;
  ensureXpInitialized();
  const raw = localStorage.getItem(XP_KEY);
  if (raw == null) return defaultXp;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? defaultXp : n;
}

export function addXp(delta: number): number {
  if (delta <= 0) return getXp();
  const next = getXp() + delta;
  localStorage.setItem(XP_KEY, String(next));
  return next;
}

export function removeXp(delta: number): number {
  if (delta <= 0) return getXp();
  const next = Math.max(0, getXp() - delta);
  localStorage.setItem(XP_KEY, String(next));
  return next;
}

export function canPlayLiveMatches(xp: number): boolean {
  return xp > 0;
}

export function recordSchoolLobbyMatchOutcome(won: boolean): void {
  if (won) addXp(xpSchoolLobbyMatchDelta);
  else removeXp(xpSchoolLobbyMatchDelta);
}

/** Optional: +2 XP on every 3rd classic streak win. */
export function onClassicStreakWin(classicGamesWonAfterThisWin: number): number {
  if (classicGamesWonAfterThisWin >= 3 && classicGamesWonAfterThisWin % 3 === 0) {
    return addXp(2) - 2;
  }
  return 0;
}
