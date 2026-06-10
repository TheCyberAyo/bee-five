// Persistent head-to-head win counts between two players (not tied to ELO seasons).

/// When either player reaches this many wins in the current series, both reset to 0.
const int headToHeadSeriesResetAt = 100;

/// Wins in the active series for the lexicographically lower user id (seat 1 / Black).
class HeadToHeadSeriesScore {
  final String player1Id;
  final String player2Id;
  final int player1Wins;
  final int player2Wins;

  const HeadToHeadSeriesScore({
    required this.player1Id,
    required this.player2Id,
    required this.player1Wins,
    required this.player2Wins,
  });

  static const empty = HeadToHeadSeriesScore(
    player1Id: '',
    player2Id: '',
    player1Wins: 0,
    player2Wins: 0,
  );

  int winsFor(String playerId) {
    if (playerId == player1Id) return player1Wins;
    if (playerId == player2Id) return player2Wins;
    return 0;
  }
}

/// Builds the current series from completed matches (oldest first).
/// Draws and void matches do not change the tally.
HeadToHeadSeriesScore computeHeadToHeadSeriesScore({
  required String userA,
  required String userB,
  required List<Map<String, dynamic>> matchesOldestFirst,
  int resetAt = headToHeadSeriesResetAt,
}) {
  if (userA == userB) {
    return HeadToHeadSeriesScore.empty;
  }

  final p1 = userA.compareTo(userB) < 0 ? userA : userB;
  final p2 = userA.compareTo(userB) < 0 ? userB : userA;

  var p1Wins = 0;
  var p2Wins = 0;

  for (final row in matchesOldestFirst) {
    final winner = row['winner_id']?.toString();
    if (winner == null || winner.isEmpty) continue;

    if (winner == p1) {
      p1Wins++;
    } else if (winner == p2) {
      p2Wins++;
    } else {
      continue;
    }

    if (p1Wins >= resetAt || p2Wins >= resetAt) {
      p1Wins = 0;
      p2Wins = 0;
    }
  }

  return HeadToHeadSeriesScore(
    player1Id: p1,
    player2Id: p2,
    player1Wins: p1Wins,
    player2Wins: p2Wins,
  );
}
