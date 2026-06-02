/// Bee rank titles from multiplayer ELO (school lobby ratings).
String eloRankTitle(int elo) {
  if (elo <= 1300) return 'Worker';
  if (elo <= 1700) return 'Scout';
  if (elo <= 2200) return 'Guardian';
  return 'Queen';
}

/// e.g. "Ayo the Guardian"
String formatPlayerRankTitle(String username, int elo) {
  final name = username.trim().isEmpty ? 'Player' : username.trim();
  return '$name the ${eloRankTitle(elo)}';
}
