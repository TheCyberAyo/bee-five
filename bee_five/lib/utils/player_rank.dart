/// Bee rank titles from multiplayer ELO (school lobby ratings).
String eloRankTitle(int elo) {
  if (elo <= 1300) return 'Worker Bee';
  if (elo <= 1700) return 'Scout Bee';
  if (elo <= 2200) return 'Guardian Bee';
  return 'Queen Bee';
}

/// e.g. "Ayo the Guardian Bee"
String formatPlayerRankTitle(String username, int elo) {
  final name = username.trim().isEmpty ? 'Player' : username.trim();
  return '$name the ${eloRankTitle(elo)}';
}
