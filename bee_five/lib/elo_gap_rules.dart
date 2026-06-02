// ============================================================
// Gap-based ELO (30-point brackets). Mirrors
// supabase/functions/submit-match/index.ts — keep in sync.
//
// Rules: win/loss always ±same magnitude (two's). Draws: lower
// gains +2×band, higher loses −2×band (band≥1); band 0 → 0.
// ============================================================

/// Bracket index: 0 = gap 0–30, 1 = 31–60, 2 = 61–90, …
int eloBandFromGap(int gap) {
  if (gap <= 30) return 0;
  return (gap - 1) ~/ 30;
}

/// Win outcome: winner +mag, loser −mag (always opposite, even magnitude).
({int winnerChange, int loserChange}) eloWinChanges({
  required int winnerElo,
  required int loserElo,
}) {
  final gap = (winnerElo - loserElo).abs();
  final band = eloBandFromGap(gap);
  int mag;
  if (winnerElo == loserElo) {
    mag = 10;
  } else if (winnerElo < loserElo) {
    // Lower-rated (underdog) won
    mag = 10 + 2 * band;
  } else {
    // Higher-rated (favorite) won
    if (band == 0) {
      mag = 10;
    } else {
      final h = 10 - 2 * band;
      mag = h < 2 ? 2 : h;
    }
  }
  return (winnerChange: mag, loserChange: -mag);
}

/// Draw: lower ELO +2×band, higher ELO −2×band; gap 0–30 → no change.
({int player1Change, int player2Change}) eloDrawChanges({
  required int player1Elo,
  required int player2Elo,
}) {
  final gap = (player1Elo - player2Elo).abs();
  final band = eloBandFromGap(gap);
  if (band == 0) {
    return (player1Change: 0, player2Change: 0);
  }
  final d = 2 * band;
  if (player1Elo < player2Elo) {
    return (player1Change: d, player2Change: -d);
  }
  if (player2Elo < player1Elo) {
    return (player1Change: -d, player2Change: d);
  }
  return (player1Change: 0, player2Change: 0);
}
