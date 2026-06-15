/** Lexicographically lower userId is seat 1 (Black, moves first on even match count). */
export function onlineMatchPlayer1Id(a: string, b: string): string {
  return a.localeCompare(b) < 0 ? a : b;
}

export function onlineMatchPlayer2Id(a: string, b: string): string {
  return a.localeCompare(b) < 0 ? b : a;
}

/** Seat (1 = Black, 2 = Yellow) that opens, alternating across prior H2H games. */
export function onlineMatchFirstSeat(completedMatchCount: number): 1 | 2 {
  return completedMatchCount % 2 === 0 ? 1 : 2;
}

/** When both players challenge each other, pick one shared match id. */
export function canonicalMutualMatchId({
  myId,
  opponentId,
  myMatchId,
  theirMatchId,
}: {
  myId: string;
  opponentId: string;
  myMatchId: string;
  theirMatchId: string;
}): string {
  return myId.localeCompare(opponentId) < 0 ? myMatchId : theirMatchId;
}
