import {
  DEFAULT_USER_XP,
  getProgressSyncUserId,
  readLocalPlayerStats,
  readLocalXpAuxState,
  scheduleProgressCloudSync,
  writeLocalPlayerStats,
  writeLocalXpAuxState,
} from './progressService';

const LAST_LOGIN_DATE_KEY = 'last_login_date';

export const defaultXp = DEFAULT_USER_XP;
export const xpClassicThreeWins = 2;
export const xpHardPracticeWin = 1;
export const xpAdventureOneLoss = 1;
export const xpAdventureTwoWins = 1;
export const xpAdventureFirstLevelComplete = 1;
export const xpAdventureMultipleOf10 = 5;
export const xpSchoolLobbyMatchDelta = 1;

export const liveMatchesRequiresXpMessage =
  'You need at least 1 XP to play Live Matches. Earn XP in Adventure or Classic mode.';

export type XpResult = { newXp: number; delta: number };

export interface AdventureXpContext {
  currentLevel: number;
  highestUnlocked: number;
}

const LOCAL_PROGRESS_KEY = 'beeAdventureProgress';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function todayDateString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function readAdventureProgressSnapshot(userId?: string | null): { current: number; highest: number } {
  if (!canUseStorage()) {
    return { current: 1, highest: 1 };
  }

  const keys = userId
    ? [`${LOCAL_PROGRESS_KEY}:${userId}`, `${LOCAL_PROGRESS_KEY}:guest`]
    : [`${LOCAL_PROGRESS_KEY}:guest`];

  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const progress = JSON.parse(raw) as {
        current_game?: number;
        highest_unlocked_game?: number;
      };
      const current = progress.current_game ?? 1;
      const highest = progress.highest_unlocked_game ?? current;
      return { current, highest: Math.max(current, highest) };
    } catch {
      // try next key
    }
  }

  return { current: 1, highest: 1 };
}

function effectiveAdventureFrontierLevel(ctx?: AdventureXpContext, userId?: string | null): number {
  if (ctx) {
    return Math.max(ctx.currentLevel, ctx.highestUnlocked);
  }
  const snap = readAdventureProgressSnapshot(userId);
  return Math.max(snap.current, snap.highest);
}

function isAdventureFrontierLevel(
  levelJustPlayedOrCompleted: number,
  ctx?: AdventureXpContext,
  userId?: string | null
): boolean {
  return levelJustPlayedOrCompleted === effectiveAdventureFrontierLevel(ctx, userId);
}

function currentUserId(): string | null {
  return getProgressSyncUserId();
}

function triggerCloudSync(): void {
  scheduleProgressCloudSync(currentUserId());
}

function ensureAdventureFirstClearXpMigrated(ctx?: AdventureXpContext, userId?: string | null): void {
  const resolvedUserId = userId ?? currentUserId();
  const aux = readLocalXpAuxState(resolvedUserId);
  if (aux.adventureFirstClearXpMigrated) return;

  const snap = ctx
    ? { current: ctx.currentLevel, highest: Math.max(ctx.currentLevel, ctx.highestUnlocked) }
    : readAdventureProgressSnapshot(resolvedUserId);
  const top = Math.max(snap.current, snap.highest);

  const existing = new Set(aux.adventureLevelsFirstClear.map(String));
  for (let i = 1; i < top; i++) {
    existing.add(String(i));
  }

  const list = Array.from(existing)
    .map((level) => Number.parseInt(level, 10))
    .filter((level) => Number.isFinite(level) && level > 0)
    .sort((a, b) => a - b);

  writeLocalXpAuxState(resolvedUserId, {
    adventureLevelsFirstClear: list,
    adventureFirstClearXpMigrated: true,
  });
  triggerCloudSync();
}

export function ensureXpInitialized(): void {
  if (!canUseStorage()) return;
  const userId = currentUserId();
  const stats = readLocalPlayerStats(userId);
  if (stats.userXp === DEFAULT_USER_XP) {
    writeLocalPlayerStats(userId, { userXp: DEFAULT_USER_XP });
  }
}

export function onAppOpen(): void {
  if (!canUseStorage()) return;
  ensureXpInitialized();

  const today = todayDateString();
  const last = window.localStorage.getItem(LAST_LOGIN_DATE_KEY);
  if (last === today) return;

  const userId = currentUserId();
  let streak = readLocalPlayerStats(userId).loginStreak;

  if (last == null) {
    streak = 1;
  } else {
    const lastDate = new Date(last);
    if (!Number.isNaN(lastDate.getTime())) {
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak += 1;
      } else if (diffDays > 1) {
        streak = 1;
      }
    } else {
      streak = 1;
    }
  }

  writeLocalPlayerStats(userId, { loginStreak: streak });
  window.localStorage.setItem(LAST_LOGIN_DATE_KEY, today);
  triggerCloudSync();
}

export function getXp(): number {
  if (!canUseStorage()) return DEFAULT_USER_XP;
  ensureXpInitialized();
  return readLocalPlayerStats(currentUserId()).userXp;
}

export function addXp(delta: number): number {
  if (delta <= 0) return getXp();
  const userId = currentUserId();
  const next = getXp() + delta;
  writeLocalPlayerStats(userId, { userXp: next });
  triggerCloudSync();
  return next;
}

export function removeXp(delta: number): number {
  if (delta <= 0) return getXp();
  const userId = currentUserId();
  const next = Math.max(0, getXp() - delta);
  writeLocalPlayerStats(userId, { userXp: next });
  triggerCloudSync();
  return next;
}

export function canPlayLiveMatches(xp: number): boolean {
  return xp > 0;
}

export function onAdventureMatchLost(options?: {
  levelJustPlayed?: number;
  adventureContext?: AdventureXpContext;
  userId?: string | null;
}): XpResult {
  const resolvedUserId = options?.userId ?? currentUserId();
  ensureAdventureFirstClearXpMigrated(options?.adventureContext, resolvedUserId);
  writeLocalXpAuxState(resolvedUserId, { adventureConsecutiveWins: 0 });
  triggerCloudSync();

  const levelJustPlayed = options?.levelJustPlayed;
  if (levelJustPlayed != null) {
    const eligible = isAdventureFrontierLevel(
      levelJustPlayed,
      options?.adventureContext,
      resolvedUserId
    );
    if (!eligible) {
      return { newXp: getXp(), delta: 0 };
    }
  }

  const newXp = removeXp(xpAdventureOneLoss);
  return { newXp, delta: -xpAdventureOneLoss };
}

export function onAdventureGameWon(options?: {
  levelJustPlayed?: number;
  adventureContext?: AdventureXpContext;
  userId?: string | null;
}): XpResult {
  const resolvedUserId = options?.userId ?? currentUserId();
  ensureAdventureFirstClearXpMigrated(options?.adventureContext, resolvedUserId);

  const levelJustPlayed = options?.levelJustPlayed;
  if (levelJustPlayed != null) {
    const eligible = isAdventureFrontierLevel(
      levelJustPlayed,
      options?.adventureContext,
      resolvedUserId
    );
    if (!eligible) {
      return { newXp: getXp(), delta: 0 };
    }
  }

  const aux = readLocalXpAuxState(resolvedUserId);
  const wins = aux.adventureConsecutiveWins + 1;

  if (wins >= 2) {
    writeLocalXpAuxState(resolvedUserId, { adventureConsecutiveWins: 0 });
    const newXp = addXp(xpAdventureTwoWins);
    return { newXp, delta: xpAdventureTwoWins };
  }

  writeLocalXpAuxState(resolvedUserId, { adventureConsecutiveWins: wins });
  triggerCloudSync();
  return { newXp: getXp(), delta: 0 };
}

export function onAdventureLevelWon(
  levelJustCompleted: number,
  options?: {
    adventureContext?: AdventureXpContext;
    userId?: string | null;
  }
): XpResult {
  const resolvedUserId = options?.userId ?? currentUserId();
  ensureAdventureFirstClearXpMigrated(options?.adventureContext, resolvedUserId);

  const aux = readLocalXpAuxState(resolvedUserId);
  writeLocalXpAuxState(resolvedUserId, { adventureConsecutiveLosses: 0 });

  let delta = 0;
  const levelKey = levelJustCompleted;
  if (!aux.adventureLevelsFirstClear.includes(levelKey)) {
    const nextList = [...aux.adventureLevelsFirstClear, levelKey].sort((a, b) => a - b);
    writeLocalXpAuxState(resolvedUserId, { adventureLevelsFirstClear: nextList });
    addXp(xpAdventureFirstLevelComplete);
    delta += xpAdventureFirstLevelComplete;
  } else {
    triggerCloudSync();
  }

  const eligible = isAdventureFrontierLevel(
    levelJustCompleted,
    options?.adventureContext,
    resolvedUserId
  );
  if (!eligible) {
    return { newXp: getXp(), delta };
  }

  if (levelJustCompleted > 0 && levelJustCompleted % 10 === 0) {
    addXp(xpAdventureMultipleOf10);
    delta += xpAdventureMultipleOf10;
  }

  return { newXp: getXp(), delta };
}

export function onClassicStreakWin(classicGamesWonAfterThisWin: number): XpResult {
  if (classicGamesWonAfterThisWin >= 3 && classicGamesWonAfterThisWin % 3 === 0) {
    const newXp = addXp(xpClassicThreeWins);
    return { newXp, delta: xpClassicThreeWins };
  }
  return { newXp: getXp(), delta: 0 };
}

export function onHardPracticeWin(): XpResult {
  const newXp = addXp(xpHardPracticeWin);
  return { newXp, delta: xpHardPracticeWin };
}

export function getDailyChallengeStatus(): { playedToday: boolean; won: boolean | null } {
  const aux = readLocalXpAuxState(currentUserId());
  const today = todayDateString();
  if (aux.dailyChallengeDate !== today) return { playedToday: false, won: null };
  return { playedToday: true, won: aux.dailyChallengeWon };
}

export function setDailyChallengeResult(won: boolean): number {
  const userId = currentUserId();
  writeLocalXpAuxState(userId, {
    dailyChallengeDate: todayDateString(),
    dailyChallengeWon: won,
  });
  triggerCloudSync();
  return getXp();
}

export function recordSchoolLobbyMatchOutcome(won: boolean): void {
  if (won) addXp(xpSchoolLobbyMatchDelta);
  else removeXp(xpSchoolLobbyMatchDelta);
}

export function getTodaysChallengeGameIndex(): number {
  const now = new Date();
  const dayCode = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return dayCode % 6;
}
