import { supabase } from '../lib/supabase';

export interface AdventureProgress {
  user_id: string;
  current_game: number;
  highest_unlocked_game: number;
  games_completed: number[];
  games_won: number;
  updated_at: string;
  user_xp?: number;
  login_streak?: number;
  classic_best_streak?: number;
}

export interface SyncedAdventureProgress {
  currentGame: number;
  highestUnlockedGame: number;
  gamesCompleted: number[];
  gamesWon: number;
  userXp: number;
  loginStreak: number;
  classicBestStreak: number;
  xpAux: XpAuxState;
}

export interface XpAuxState {
  dailyChallengeDate: string | null;
  dailyChallengeWon: boolean | null;
  adventureConsecutiveWins: number;
  adventureConsecutiveLosses: number;
  adventureLevelsFirstClear: number[];
  adventureFirstClearXpMigrated: boolean;
}

const LOCAL_STORAGE_KEY = 'beeAdventureProgress';
const PREF_USER_XP = 'user_xp';
const PREF_LOGIN_STREAK = 'login_streak';
const PREF_CLASSIC_BEST_STREAK = 'classic_best_streak';
const PREF_ADVENTURE_RESET_PENDING = 'adventure_progress_reset_pending';

export const PREF_DAILY_CHALLENGE_DATE = 'daily_challenge_date';
export const PREF_DAILY_CHALLENGE_WON = 'daily_challenge_won';
export const PREF_ADVENTURE_CONSECUTIVE_WINS = 'adventure_consecutive_wins';
export const PREF_ADVENTURE_CONSECUTIVE_LOSSES = 'adventure_consecutive_losses';
export const PREF_ADVENTURE_LEVELS_FIRST_CLEAR = 'adventure_levels_first_clear_xp';
export const PREF_ADVENTURE_FIRST_CLEAR_MIGRATED = 'adventure_first_clear_xp_migrated';

export const DEFAULT_USER_XP = 10;

let syncProgressDebounce: ReturnType<typeof setTimeout> | null = null;
let progressSyncUserId: string | null = null;

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function clampLevel(level: number): number {
  return Math.max(1, Math.min(level, 0x7fffffff));
}

function scopedPrefKey(base: string, userId: string | null | undefined): string {
  return userId ? `${base}:${userId}` : base;
}

function mergeMaxStat(local: number, remote: number | null | undefined): number {
  if (remote == null || Number.isNaN(remote)) return local;
  return Math.max(local, remote);
}

function deriveGamesCompleted(highestUnlocked: number): number[] {
  if (highestUnlocked <= 1) return [];
  return Array.from({ length: highestUnlocked - 1 }, (_, i) => i + 1);
}

function todayDateString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function emptyXpAuxState(): XpAuxState {
  return {
    dailyChallengeDate: null,
    dailyChallengeWon: null,
    adventureConsecutiveWins: 0,
    adventureConsecutiveLosses: 0,
    adventureLevelsFirstClear: [],
    adventureFirstClearXpMigrated: false,
  };
}

function parseFirstClearLevels(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
}

function mergeFirstClearLevels(local: number[], remote: number[]): number[] {
  return Array.from(new Set([...local, ...remote])).sort((a, b) => a - b);
}

function mergeDailyChallenge(local: XpAuxState, remote: XpAuxState): Pick<XpAuxState, 'dailyChallengeDate' | 'dailyChallengeWon'> {
  const today = todayDateString();
  const localPlayedToday = local.dailyChallengeDate === today;
  const remotePlayedToday = remote.dailyChallengeDate === today;

  if (localPlayedToday && remotePlayedToday) {
    return {
      dailyChallengeDate: today,
      dailyChallengeWon: local.dailyChallengeWon === true || remote.dailyChallengeWon === true,
    };
  }
  if (remotePlayedToday) {
    return { dailyChallengeDate: today, dailyChallengeWon: remote.dailyChallengeWon };
  }
  if (localPlayedToday) {
    return { dailyChallengeDate: today, dailyChallengeWon: local.dailyChallengeWon };
  }

  if (!local.dailyChallengeDate && !remote.dailyChallengeDate) {
    return { dailyChallengeDate: null, dailyChallengeWon: null };
  }
  if (!local.dailyChallengeDate) {
    return {
      dailyChallengeDate: remote.dailyChallengeDate,
      dailyChallengeWon: remote.dailyChallengeWon,
    };
  }
  if (!remote.dailyChallengeDate) {
    return {
      dailyChallengeDate: local.dailyChallengeDate,
      dailyChallengeWon: local.dailyChallengeWon,
    };
  }
  return local.dailyChallengeDate >= remote.dailyChallengeDate
    ? {
        dailyChallengeDate: local.dailyChallengeDate,
        dailyChallengeWon: local.dailyChallengeWon,
      }
    : {
        dailyChallengeDate: remote.dailyChallengeDate,
        dailyChallengeWon: remote.dailyChallengeWon,
      };
}

function mergeXpAuxState(local: XpAuxState, remote: XpAuxState): XpAuxState {
  const daily = mergeDailyChallenge(local, remote);
  return {
    ...daily,
    adventureConsecutiveWins: Math.min(
      1,
      Math.max(local.adventureConsecutiveWins, remote.adventureConsecutiveWins)
    ),
    adventureConsecutiveLosses: Math.max(
      local.adventureConsecutiveLosses,
      remote.adventureConsecutiveLosses
    ),
    adventureLevelsFirstClear: mergeFirstClearLevels(
      local.adventureLevelsFirstClear,
      remote.adventureLevelsFirstClear
    ),
    adventureFirstClearXpMigrated:
      local.adventureFirstClearXpMigrated || remote.adventureFirstClearXpMigrated,
  };
}

function xpAuxFromRemoteRow(data: Record<string, unknown>): XpAuxState {
  return {
    dailyChallengeDate:
      typeof data.daily_challenge_date === 'string' ? data.daily_challenge_date : null,
    dailyChallengeWon:
      typeof data.daily_challenge_won === 'boolean' ? data.daily_challenge_won : null,
    adventureConsecutiveWins:
      typeof data.adventure_consecutive_wins === 'number'
        ? data.adventure_consecutive_wins
        : 0,
    adventureConsecutiveLosses:
      typeof data.adventure_consecutive_losses === 'number'
        ? data.adventure_consecutive_losses
        : 0,
    adventureLevelsFirstClear: parseFirstClearLevels(data.adventure_levels_first_clear),
    adventureFirstClearXpMigrated: data.adventure_first_clear_xp_migrated === true,
  };
}

function xpAuxToRemotePayload(xpAux: XpAuxState): Record<string, unknown> {
  return {
    daily_challenge_date: xpAux.dailyChallengeDate,
    daily_challenge_won: xpAux.dailyChallengeWon,
    adventure_consecutive_wins: xpAux.adventureConsecutiveWins,
    adventure_consecutive_losses: xpAux.adventureConsecutiveLosses,
    adventure_levels_first_clear: xpAux.adventureLevelsFirstClear,
    adventure_first_clear_xp_migrated: xpAux.adventureFirstClearXpMigrated,
  };
}

export function readLocalXpAuxState(userId: string | null = progressSyncUserId): XpAuxState {
  if (!canUseLocalStorage()) return emptyXpAuxState();

  const readBool = (base: string): boolean | null => {
    const raw = window.localStorage.getItem(scopedPrefKey(base, userId));
    if (raw == null && userId) {
      const legacy = window.localStorage.getItem(base);
      if (legacy == null) return null;
      return legacy === 'true';
    }
    if (raw == null) return null;
    return raw === 'true';
  };

  const readString = (base: string): string | null => {
    const raw = window.localStorage.getItem(scopedPrefKey(base, userId));
    if (raw == null && userId) {
      return window.localStorage.getItem(base);
    }
    return raw;
  };

  const readInt = (base: string): number => {
    const raw = window.localStorage.getItem(scopedPrefKey(base, userId));
    let parsed = raw != null ? Number.parseInt(raw, 10) : Number.NaN;
    if (Number.isNaN(parsed) && userId) {
      parsed = Number.parseInt(window.localStorage.getItem(base) ?? '', 10);
    }
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  let adventureLevelsFirstClear: number[] = [];
  try {
    const raw =
      window.localStorage.getItem(scopedPrefKey(PREF_ADVENTURE_LEVELS_FIRST_CLEAR, userId)) ??
      (userId ? window.localStorage.getItem(PREF_ADVENTURE_LEVELS_FIRST_CLEAR) : null);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      adventureLevelsFirstClear = parsed
        .map((level) => Number.parseInt(level, 10))
        .filter((level) => Number.isFinite(level) && level > 0)
        .sort((a, b) => a - b);
    }
  } catch {
    adventureLevelsFirstClear = [];
  }

  const migratedRaw =
    window.localStorage.getItem(scopedPrefKey(PREF_ADVENTURE_FIRST_CLEAR_MIGRATED, userId)) ??
    (userId ? window.localStorage.getItem(PREF_ADVENTURE_FIRST_CLEAR_MIGRATED) : null);

  return {
    dailyChallengeDate: readString(PREF_DAILY_CHALLENGE_DATE),
    dailyChallengeWon: readBool(PREF_DAILY_CHALLENGE_WON),
    adventureConsecutiveWins: readInt(PREF_ADVENTURE_CONSECUTIVE_WINS),
    adventureConsecutiveLosses: readInt(PREF_ADVENTURE_CONSECUTIVE_LOSSES),
    adventureLevelsFirstClear,
    adventureFirstClearXpMigrated: migratedRaw === 'true',
  };
}

export function writeLocalXpAuxState(
  userId: string | null,
  xpAux: Partial<XpAuxState>
): void {
  if (!canUseLocalStorage()) return;

  if (xpAux.dailyChallengeDate !== undefined) {
    const key = scopedPrefKey(PREF_DAILY_CHALLENGE_DATE, userId);
    if (xpAux.dailyChallengeDate == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, xpAux.dailyChallengeDate);
  }
  if (xpAux.dailyChallengeWon !== undefined) {
    const key = scopedPrefKey(PREF_DAILY_CHALLENGE_WON, userId);
    if (xpAux.dailyChallengeWon == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, xpAux.dailyChallengeWon ? 'true' : 'false');
  }
  if (xpAux.adventureConsecutiveWins != null) {
    window.localStorage.setItem(
      scopedPrefKey(PREF_ADVENTURE_CONSECUTIVE_WINS, userId),
      String(xpAux.adventureConsecutiveWins)
    );
  }
  if (xpAux.adventureConsecutiveLosses != null) {
    window.localStorage.setItem(
      scopedPrefKey(PREF_ADVENTURE_CONSECUTIVE_LOSSES, userId),
      String(xpAux.adventureConsecutiveLosses)
    );
  }
  if (xpAux.adventureLevelsFirstClear != null) {
    window.localStorage.setItem(
      scopedPrefKey(PREF_ADVENTURE_LEVELS_FIRST_CLEAR, userId),
      JSON.stringify(xpAux.adventureLevelsFirstClear.map(String))
    );
  }
  if (xpAux.adventureFirstClearXpMigrated != null) {
    window.localStorage.setItem(
      scopedPrefKey(PREF_ADVENTURE_FIRST_CLEAR_MIGRATED, userId),
      xpAux.adventureFirstClearXpMigrated ? 'true' : 'false'
    );
  }
}

export function setProgressSyncUserId(userId: string | null): void {
  progressSyncUserId = userId;
}

export function getProgressSyncUserId(): string | null {
  return progressSyncUserId;
}

export function readLocalPlayerStats(userId: string | null = progressSyncUserId): {
  userXp: number;
  loginStreak: number;
  classicBestStreak: number;
} {
  if (!canUseLocalStorage()) {
    return { userXp: DEFAULT_USER_XP, loginStreak: 0, classicBestStreak: 0 };
  }

  const xpKey = scopedPrefKey(PREF_USER_XP, userId);
  const streakKey = scopedPrefKey(PREF_LOGIN_STREAK, userId);
  const classicKey = scopedPrefKey(PREF_CLASSIC_BEST_STREAK, userId);

  let userXp = Number.parseInt(window.localStorage.getItem(xpKey) ?? '', 10);
  if (Number.isNaN(userXp) && userId) {
    const legacyXp = Number.parseInt(window.localStorage.getItem(PREF_USER_XP) ?? '', 10);
    userXp = Number.isNaN(legacyXp) ? DEFAULT_USER_XP : legacyXp;
  } else if (Number.isNaN(userXp)) {
    userXp = DEFAULT_USER_XP;
  }

  let loginStreak = Number.parseInt(window.localStorage.getItem(streakKey) ?? '', 10);
  if (Number.isNaN(loginStreak) && userId) {
    const legacy = Number.parseInt(window.localStorage.getItem(PREF_LOGIN_STREAK) ?? '', 10);
    loginStreak = Number.isNaN(legacy) ? 0 : legacy;
  } else if (Number.isNaN(loginStreak)) {
    loginStreak = 0;
  }

  let classicBestStreak = Number.parseInt(window.localStorage.getItem(classicKey) ?? '', 10);
  if (Number.isNaN(classicBestStreak) && userId) {
    const legacy = Number.parseInt(window.localStorage.getItem(PREF_CLASSIC_BEST_STREAK) ?? '', 10);
    classicBestStreak = Number.isNaN(legacy) ? 0 : legacy;
  } else if (Number.isNaN(classicBestStreak)) {
    classicBestStreak = 0;
  }

  return { userXp, loginStreak, classicBestStreak };
}

export function writeLocalPlayerStats(
  userId: string | null,
  stats: { userXp?: number; loginStreak?: number; classicBestStreak?: number }
): void {
  if (!canUseLocalStorage()) return;

  if (stats.userXp != null) {
    window.localStorage.setItem(scopedPrefKey(PREF_USER_XP, userId), String(stats.userXp));
  }
  if (stats.loginStreak != null) {
    window.localStorage.setItem(scopedPrefKey(PREF_LOGIN_STREAK, userId), String(stats.loginStreak));
  }
  if (stats.classicBestStreak != null) {
    window.localStorage.setItem(scopedPrefKey(PREF_CLASSIC_BEST_STREAK, userId), String(stats.classicBestStreak));
  }
}

export function scheduleProgressCloudSync(userId: string | null = progressSyncUserId): void {
  if (!userId) return;
  if (syncProgressDebounce) {
    clearTimeout(syncProgressDebounce);
  }
  syncProgressDebounce = setTimeout(() => {
    void syncAdventureProgress(userId);
  }, 900);
}

async function loadLocalProgress(userId: string | null): Promise<AdventureProgress | null> {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const key = userId ? `${LOCAL_STORAGE_KEY}:${userId}` : `${LOCAL_STORAGE_KEY}:guest`;
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as AdventureProgress;
  } catch (error) {
    console.warn('Failed to load local progress', error);
    return null;
  }
}

async function saveLocalProgress(userId: string | null, progress: AdventureProgress): Promise<void> {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    const key = userId ? `${LOCAL_STORAGE_KEY}:${userId}` : `${LOCAL_STORAGE_KEY}:guest`;
    window.localStorage.setItem(key, JSON.stringify(progress));
  } catch (error) {
    console.warn('Failed to save local progress', error);
  }
}

async function loadRemoteAdventureProgress(userId: string): Promise<RemoteAdventureProgress | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('adventure_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    const current = clampLevel(data.current_game ?? 1);
    const highestRaw = data.highest_unlocked_game ?? current;
    const highest = clampLevel(highestRaw);
    const completedRaw = (data.games_completed as number[] | null) ?? [];
    const gamesCompleted = completedRaw
      .map((value) => Number(value))
      .filter((value) => value > 0)
      .sort((a, b) => a - b);

    return {
      user_id: userId,
      current_game: current,
      highest_unlocked_game: highest,
      games_completed: gamesCompleted,
      games_won: data.games_won ?? 0,
      updated_at: data.updated_at ?? new Date().toISOString(),
      user_xp: typeof data.user_xp === 'number' ? data.user_xp : undefined,
      login_streak: typeof data.login_streak === 'number' ? data.login_streak : undefined,
      classic_best_streak:
        typeof data.classic_best_streak === 'number' ? data.classic_best_streak : undefined,
      xp_aux: xpAuxFromRemoteRow(data as Record<string, unknown>),
    };
  } catch {
    return null;
  }
}

interface RemoteAdventureProgress extends AdventureProgress {
  xp_aux?: XpAuxState;
}

async function upsertRemoteAdventureProgress(
  userId: string,
  payload: {
    currentGame: number;
    highestUnlockedGame: number;
    gamesWon?: number;
    dashboardXp?: number;
    dashboardLoginStreak?: number;
    dashboardClassicBest?: number;
    xpAux?: XpAuxState;
  }
): Promise<void> {
  if (!supabase) return;

  const safeCurrent = clampLevel(payload.currentGame);
  const safeHighest = clampLevel(payload.highestUnlockedGame);
  const completed = deriveGamesCompleted(safeHighest);
  const localStats = readLocalPlayerStats(userId);
  const xpOut = payload.dashboardXp ?? localStats.userXp;
  const streakOut = payload.dashboardLoginStreak ?? localStats.loginStreak;
  const classicOut = payload.dashboardClassicBest ?? localStats.classicBestStreak;
  const auxOut = payload.xpAux ?? readLocalXpAuxState(userId);
  const ts = new Date().toISOString();

  const legacyPayload = {
    user_id: userId,
    current_game: safeCurrent,
    highest_unlocked_game: safeHighest,
    games_completed: completed,
    games_won: payload.gamesWon ?? completed.length,
    updated_at: ts,
  };

  const statsPayload = {
    ...legacyPayload,
    user_xp: xpOut,
    login_streak: streakOut,
    classic_best_streak: classicOut,
  };

  const fullPayload = {
    ...statsPayload,
    ...xpAuxToRemotePayload(auxOut),
  };

  const { error: fullError } = await supabase.from('adventure_progress').upsert(fullPayload);
  if (!fullError) return;

  const { error: statsError } = await supabase.from('adventure_progress').upsert(statsPayload);
  if (!statsError) return;

  await supabase.from('adventure_progress').upsert(legacyPayload);
}

function toAdventureProgress(userId: string, synced: SyncedAdventureProgress): AdventureProgress {
  return {
    user_id: userId,
    current_game: synced.currentGame,
    highest_unlocked_game: synced.highestUnlockedGame,
    games_completed: synced.gamesCompleted,
    games_won: synced.gamesWon,
    updated_at: new Date().toISOString(),
    user_xp: synced.userXp,
    login_streak: synced.loginStreak,
    classic_best_streak: synced.classicBestStreak,
  };
}

/**
 * Merge local and remote adventure progress + dashboard stats (XP, streaks).
 * Mirrors `bee_five/lib/adventure_progress_service.dart`.
 */
export async function syncAdventureProgress(userId: string): Promise<SyncedAdventureProgress | null> {
  if (!userId) return null;

  const localProgress = await loadLocalProgress(userId);
  const localCurrent = clampLevel(localProgress?.current_game ?? 1);
  const localHighest = clampLevel(
    Math.max(localProgress?.highest_unlocked_game ?? 1, localCurrent)
  );
  const localStats = readLocalPlayerStats(userId);
  const localXpAux = readLocalXpAuxState(userId);
  const resetPending =
    canUseLocalStorage() &&
    window.localStorage.getItem(PREF_ADVENTURE_RESET_PENDING) === 'true';

  if (!supabase) {
    const mergedHighest = Math.max(localHighest, localCurrent);
    return {
      currentGame: localCurrent,
      highestUnlockedGame: mergedHighest,
      gamesCompleted: deriveGamesCompleted(mergedHighest),
      gamesWon: localProgress?.games_won ?? Math.max(0, mergedHighest - 1),
      ...localStats,
      xpAux: localXpAux,
    };
  }

  const remote = await loadRemoteAdventureProgress(userId);

  if (resetPending) {
    const forcedHighest = Math.max(localHighest, localCurrent);
    await upsertRemoteAdventureProgress(userId, {
      currentGame: localCurrent,
      highestUnlockedGame: forcedHighest,
      dashboardXp: localStats.userXp,
      dashboardLoginStreak: localStats.loginStreak,
      dashboardClassicBest: localStats.classicBestStreak,
      xpAux: localXpAux,
    });
    if (canUseLocalStorage()) {
      window.localStorage.removeItem(PREF_ADVENTURE_RESET_PENDING);
    }
    const synced = {
      currentGame: localCurrent,
      highestUnlockedGame: forcedHighest,
      gamesCompleted: deriveGamesCompleted(forcedHighest),
      gamesWon: Math.max(0, forcedHighest - 1),
      ...localStats,
      xpAux: localXpAux,
    };
    await saveLocalProgress(userId, toAdventureProgress(userId, synced));
    writeLocalPlayerStats(userId, localStats);
    writeLocalXpAuxState(userId, localXpAux);
    return synced;
  }

  if (!remote) {
    const mergedHighest = Math.max(localHighest, localCurrent);
    await upsertRemoteAdventureProgress(userId, {
      currentGame: localCurrent,
      highestUnlockedGame: mergedHighest,
      dashboardXp: localStats.userXp,
      dashboardLoginStreak: localStats.loginStreak,
      dashboardClassicBest: localStats.classicBestStreak,
      xpAux: localXpAux,
    });
    const synced = {
      currentGame: localCurrent,
      highestUnlockedGame: mergedHighest,
      gamesCompleted: deriveGamesCompleted(mergedHighest),
      gamesWon: localProgress?.games_won ?? Math.max(0, mergedHighest - 1),
      ...localStats,
      xpAux: localXpAux,
    };
    await saveLocalProgress(userId, toAdventureProgress(userId, synced));
    writeLocalPlayerStats(userId, localStats);
    writeLocalXpAuxState(userId, localXpAux);
    return synced;
  }

  const remoteHighest = Math.max(remote.highest_unlocked_game, remote.current_game);
  let mergedHighest = localHighest;
  if (localCurrent > mergedHighest) mergedHighest = localCurrent;
  if (remoteHighest > mergedHighest) mergedHighest = remoteHighest;

  const hasMeaningfulLocalState = localCurrent !== 1 || localHighest !== 1;
  const mergedCurrent = clampLevel(hasMeaningfulLocalState ? localCurrent : remote.current_game);

  const mergedXp = mergeMaxStat(localStats.userXp, remote.user_xp);
  const mergedStreak = mergeMaxStat(localStats.loginStreak, remote.login_streak);
  const mergedClassic = mergeMaxStat(localStats.classicBestStreak, remote.classic_best_streak);
  const mergedXpAux = mergeXpAuxState(localXpAux, remote.xp_aux ?? emptyXpAuxState());
  const mergedGamesWon =
    remote.games_won > 0 ? remote.games_won : Math.max(localProgress?.games_won ?? 0, mergedHighest - 1);

  writeLocalPlayerStats(userId, {
    userXp: mergedXp,
    loginStreak: mergedStreak,
    classicBestStreak: mergedClassic,
  });
  writeLocalXpAuxState(userId, mergedXpAux);

  await upsertRemoteAdventureProgress(userId, {
    currentGame: mergedCurrent,
    highestUnlockedGame: mergedHighest,
    gamesWon: remote.games_won > 0 ? remote.games_won : undefined,
    dashboardXp: mergedXp,
    dashboardLoginStreak: mergedStreak,
    dashboardClassicBest: mergedClassic,
    xpAux: mergedXpAux,
  });

  const synced = {
    currentGame: mergedCurrent,
    highestUnlockedGame: mergedHighest,
    gamesCompleted: deriveGamesCompleted(mergedHighest),
    gamesWon: mergedGamesWon,
    userXp: mergedXp,
    loginStreak: mergedStreak,
    classicBestStreak: mergedClassic,
    xpAux: mergedXpAux,
  };
  await saveLocalProgress(userId, toAdventureProgress(userId, synced));
  return synced;
}

/** Merge guest local progress into a signed-in account before cloud sync. */
export async function promoteGuestProgressToUser(userId: string): Promise<void> {
  const guestProgress = await loadLocalProgress(null);
  const userProgress = await loadLocalProgress(userId);
  const guestStats = readLocalPlayerStats(null);
  const userStats = readLocalPlayerStats(userId);
  const guestXpAux = readLocalXpAuxState(null);
  const userXpAux = readLocalXpAuxState(userId);

  const guestCurrent = guestProgress?.current_game ?? 1;
  const guestHighest = Math.max(guestProgress?.highest_unlocked_game ?? 1, guestCurrent);
  const userCurrent = userProgress?.current_game ?? 1;
  const userHighest = Math.max(userProgress?.highest_unlocked_game ?? 1, userCurrent);

  const mergedCurrent = Math.max(guestCurrent, userCurrent);
  const mergedHighest = Math.max(guestHighest, userHighest, mergedCurrent);

  await saveLocalProgress(userId, {
    user_id: userId,
    current_game: mergedCurrent,
    highest_unlocked_game: mergedHighest,
    games_completed: deriveGamesCompleted(mergedHighest),
    games_won: Math.max(guestProgress?.games_won ?? 0, userProgress?.games_won ?? 0),
    updated_at: new Date().toISOString(),
  });

  writeLocalPlayerStats(userId, {
    userXp: Math.max(guestStats.userXp, userStats.userXp),
    loginStreak: Math.max(guestStats.loginStreak, userStats.loginStreak),
    classicBestStreak: Math.max(guestStats.classicBestStreak, userStats.classicBestStreak),
  });
  writeLocalXpAuxState(userId, mergeXpAuxState(guestXpAux, userXpAux));
}

export async function loadAdventureProgress(userId: string): Promise<AdventureProgress | null> {
  const synced = await syncAdventureProgress(userId);
  if (synced) {
    return toAdventureProgress(userId, synced);
  }
  return loadLocalProgress(userId);
}

export async function saveAdventureProgress(
  userId: string,
  progress: {
    current_game?: number;
    highest_unlocked_game?: number;
    games_completed?: number[];
    games_won?: number;
  }
): Promise<boolean> {
  const localProgress = await loadLocalProgress(userId);
  const mergedCurrent = clampLevel(progress.current_game ?? localProgress?.current_game ?? 1);
  const mergedHighest = clampLevel(
    Math.max(
      progress.highest_unlocked_game ?? localProgress?.highest_unlocked_game ?? 1,
      mergedCurrent
    )
  );
  const localStats = readLocalPlayerStats(userId);
  const localXpAux = readLocalXpAuxState(userId);
  const mergedProgress: AdventureProgress = {
    user_id: userId,
    current_game: mergedCurrent,
    highest_unlocked_game: mergedHighest,
    games_completed: deriveGamesCompleted(mergedHighest),
    games_won: progress.games_won ?? localProgress?.games_won ?? Math.max(0, mergedHighest - 1),
    updated_at: new Date().toISOString(),
    user_xp: localStats.userXp,
    login_streak: localStats.loginStreak,
    classic_best_streak: localStats.classicBestStreak,
  };
  await saveLocalProgress(userId, mergedProgress);

  if (!supabase) {
    console.warn('Supabase is not configured, saved to local storage only');
    return false;
  }

  try {
    await upsertRemoteAdventureProgress(userId, {
      currentGame: mergedProgress.current_game,
      highestUnlockedGame: mergedProgress.highest_unlocked_game,
      gamesWon: mergedProgress.games_won,
      dashboardXp: localStats.userXp,
      dashboardLoginStreak: localStats.loginStreak,
      dashboardClassicBest: localStats.classicBestStreak,
      xpAux: localXpAux,
    });
    return true;
  } catch (error) {
    console.error('Error saving progress:', error);
    return true;
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const SAVE_DELAY = 2000;

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

  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    await saveAdventureProgress(userId, progress);
  }, SAVE_DELAY);
}

export async function syncLocalProgressToServer(userId: string): Promise<boolean> {
  const synced = await syncAdventureProgress(userId);
  return synced != null;
}

export async function loadSessionAdventureProgress(
  userId: string | null
): Promise<AdventureProgress | null> {
  if (userId) {
    return loadAdventureProgress(userId);
  }
  return loadLocalProgress(null);
}

export async function saveSessionAdventureProgress(
  userId: string | null,
  progress: {
    current_game?: number;
    highest_unlocked_game?: number;
    games_completed?: number[];
    games_won?: number;
  }
): Promise<boolean> {
  if (userId) {
    return saveAdventureProgress(userId, progress);
  }
  const localProgress = await loadLocalProgress(null);
  const mergedCurrent = clampLevel(progress.current_game ?? localProgress?.current_game ?? 1);
  const mergedHighest = clampLevel(
    Math.max(
      progress.highest_unlocked_game ?? localProgress?.highest_unlocked_game ?? 1,
      mergedCurrent
    )
  );
  const guestStats = readLocalPlayerStats(null);
  await saveLocalProgress(null, {
    current_game: mergedCurrent,
    highest_unlocked_game: mergedHighest,
    games_completed: deriveGamesCompleted(mergedHighest),
    games_won: progress.games_won ?? localProgress?.games_won ?? 0,
    user_id: 'guest',
    updated_at: new Date().toISOString(),
    user_xp: guestStats.userXp,
    login_streak: guestStats.loginStreak,
    classic_best_streak: guestStats.classicBestStreak,
  });
  return true;
}

let guestSaveTimeout: ReturnType<typeof setTimeout> | null = null;

export async function autoSaveSessionProgress(
  userId: string | null,
  progress: {
    current_game?: number;
    highest_unlocked_game?: number;
    games_completed?: number[];
    games_won?: number;
  }
): Promise<void> {
  if (guestSaveTimeout) {
    clearTimeout(guestSaveTimeout);
  }
  guestSaveTimeout = setTimeout(async () => {
    await saveSessionAdventureProgress(userId, progress);
  }, SAVE_DELAY);
}

export async function resetAdventureProgress(userId: string): Promise<boolean> {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(PREF_ADVENTURE_RESET_PENDING, 'true');
  }
  return saveAdventureProgress(userId, {
    current_game: 1,
    highest_unlocked_game: 1,
    games_completed: [],
    games_won: 0,
  });
}
