/** When either player reaches this many wins in the current series, both reset to 0. */
export const headToHeadSeriesResetAt = 100;

export interface HeadToHeadSeriesScore {
  player1Id: string;
  player2Id: string;
  player1Wins: number;
  player2Wins: number;
}

export const emptyHeadToHeadSeriesScore: HeadToHeadSeriesScore = {
  player1Id: '',
  player2Id: '',
  player1Wins: 0,
  player2Wins: 0,
};

export function winsForSeries(score: HeadToHeadSeriesScore, playerId: string): number {
  if (playerId === score.player1Id) return score.player1Wins;
  if (playerId === score.player2Id) return score.player2Wins;
  return 0;
}

export function computeHeadToHeadSeriesScore({
  userA,
  userB,
  matchesOldestFirst,
  resetAt = headToHeadSeriesResetAt,
}: {
  userA: string;
  userB: string;
  matchesOldestFirst: { winner_id?: string | null }[];
  resetAt?: number;
}): HeadToHeadSeriesScore {
  if (userA === userB) return emptyHeadToHeadSeriesScore;

  const p1 = userA.localeCompare(userB) < 0 ? userA : userB;
  const p2 = userA.localeCompare(userB) < 0 ? userB : userA;

  let p1Wins = 0;
  let p2Wins = 0;

  for (const row of matchesOldestFirst) {
    const winner = row.winner_id?.toString();
    if (!winner) continue;

    if (winner === p1) p1Wins++;
    else if (winner === p2) p2Wins++;
    else continue;

    if (p1Wins >= resetAt || p2Wins >= resetAt) {
      p1Wins = 0;
      p2Wins = 0;
    }
  }

  return { player1Id: p1, player2Id: p2, player1Wins, player2Wins };
}
