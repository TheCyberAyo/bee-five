import { eloRankTitle } from '../utils/playerRank';
import { defaultXp } from '../services/xpService';

export type PlayerStatus = 'idle' | 'searching' | 'in_match';

export interface PlayerPresence {
  userId: string;
  username: string;
  elo: number;
  institution: string;
  countryCode: string;
  beeFiveXp: number;
  status: PlayerStatus;
  rankTitle: string;
  hasLobbyChallengeXp: boolean;
}

function parseIntField(v: unknown, fallback?: number): number | undefined {
  if (v == null) return fallback;
  if (typeof v === 'number') return Math.trunc(v);
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? fallback : n;
}

function parseXp(v: unknown): number {
  return parseIntField(v, defaultXp) ?? defaultXp;
}

export function parsePlayerStatus(raw: unknown): PlayerStatus {
  if (raw == null) return 'idle';
  let s = String(raw).trim().toLowerCase().replace(/-/g, '_');
  if (s === 'inmatch') s = 'in_match';
  if (s === 'searching') return 'searching';
  if (s === 'in_match') return 'in_match';
  return 'idle';
}

export function statusRank(status: PlayerStatus): number {
  switch (status) {
    case 'idle':
      return 0;
    case 'searching':
      return 1;
    case 'in_match':
      return 2;
  }
}

export function playerPresenceFromMap(map: Record<string, unknown>): PlayerPresence {
  const userId = map.user_id?.toString() ?? '';
  const rawUsername = map.username?.toString().trim();
  const username = rawUsername && rawUsername.length > 0 ? rawUsername : 'Player';
  const elo = parseIntField(map.elo, 1200) ?? 1200;
  const rawInst = map.institution?.toString().trim();
  const institution = rawInst && rawInst.length > 0 ? rawInst : '';
  const rawCc = map.country_code?.toString().trim();
  const countryCode = rawCc && rawCc.length > 0 ? rawCc.toUpperCase() : '';
  const beeFiveXp = parseXp(map.xp);
  const status = parsePlayerStatus(map.status);

  return {
    userId,
    username,
    elo,
    institution,
    countryCode,
    beeFiveXp,
    status,
    rankTitle: eloRankTitle(elo),
    hasLobbyChallengeXp: beeFiveXp > 0,
  };
}
