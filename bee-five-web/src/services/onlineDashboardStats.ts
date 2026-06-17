import { supabase } from '../lib/supabase';
import { displayInstitutionName } from '../utils/institutionDisplay';
import { eloRankTitle } from '../utils/playerRank';
import { mgMultiplayerService } from './mgMultiplayerService';

export interface OnlineDashboardStats {
  institution: string;
  rank: string;
  globalRanking: string;
  institutionalRanking: string;
  onlineWinStreak: number;
}

export function guestOnlineDashboardStats(): OnlineDashboardStats {
  return {
    institution: '—',
    rank: '—',
    globalRanking: '—',
    institutionalRanking: '—',
    onlineWinStreak: 0,
  };
}

function parseProfileInt(raw: unknown, fallback = 0): number {
  if (typeof raw === 'number' && !Number.isNaN(raw)) return Math.trunc(raw);
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export async function fetchOnlineDashboardStats(userId: string): Promise<OnlineDashboardStats> {
  if (!supabase) return guestOnlineDashboardStats();

  try {
    const { data: raw } = await supabase
      .from('mg_profiles')
      .select('id, elo, win_streak, school_id, mg_schools(name, join_code)')
      .eq('id', userId)
      .maybeSingle();

    if (!raw) return guestOnlineDashboardStats();

    const row = raw as Record<string, unknown>;
    const elo = parseProfileInt(row.elo, 1200);
    const winStreak = parseProfileInt(row.win_streak);
    const schoolRaw = row.school_id;
    const hasSchool = schoolRaw != null && String(schoolRaw).trim() !== '';

    let institutionName: string | null = null;
    let joinCode: string | null = null;
    const schools = row.mg_schools;
    if (schools && typeof schools === 'object' && !Array.isArray(schools)) {
      const schoolRow = schools as Record<string, unknown>;
      institutionName = schoolRow.name?.toString().trim() || null;
      joinCode = schoolRow.join_code?.toString().trim().toUpperCase() || null;
    }

    if (!hasSchool) {
      return {
        institution: 'Not linked',
        rank: eloRankTitle(elo),
        globalRanking: '—',
        institutionalRanking: '—',
        onlineWinStreak: winStreak,
      };
    }

    const globalRank = await mgMultiplayerService.getLeaderboardRank(elo);
    const institutionalRank = await mgMultiplayerService.getLeaderboardRank(
      elo,
      String(schoolRaw),
    );

    return {
      institution: displayInstitutionName(institutionName, joinCode),
      rank: eloRankTitle(elo),
      globalRanking: globalRank != null ? `#${globalRank}` : '—',
      institutionalRanking: institutionalRank != null ? `#${institutionalRank}` : '—',
      onlineWinStreak: winStreak,
    };
  } catch {
    return guestOnlineDashboardStats();
  }
}
