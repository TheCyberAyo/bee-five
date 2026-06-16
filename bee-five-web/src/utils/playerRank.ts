/** Bee rank titles from multiplayer ELO (school lobby ratings). */
export function eloRankTitle(elo: number): string {
  if (elo <= 1300) return 'Worker Bee';
  if (elo <= 1700) return 'Scout Bee';
  if (elo <= 2200) return 'Guardian Bee';
  return 'Queen Bee';
}

/** e.g. "Ayo the Guardian Bee" */
export function formatPlayerRankTitle(username: string, elo: number): string {
  const name = username.trim() || 'Player';
  return `${name} the ${eloRankTitle(elo)}`;
}

/** Compact stats for the live lobby green header (matches mobile rank banner fields). */
export function formatLobbyHeaderStats({
  globalRank,
  institutionalRank,
  elo,
}: {
  globalRank: number | null;
  institutionalRank: number | null;
  elo: number;
}): string {
  const parts: string[] = [];
  if (globalRank != null) parts.push(`Global #${globalRank}`);
  if (institutionalRank != null) parts.push(`Institutional #${institutionalRank}`);
  parts.push(`${elo} ELO`);
  return parts.join(' · ');
}
