import 'package:flutter/material.dart';

/// Canonical Bee Five yellow — matches home screen, scaffold, and app chrome.
const Color beeFivePrimaryYellow = Color(0xFFFFC30B);

/// Adventure stage theme — ported from bee-five-web/src/hooks/useTheme.ts
class AdventureTheme {
  final String name;
  final String description;
  final Color primaryColor;
  final Color secondaryColor;
  final Color backgroundColor;
  final Color gridColor;
  final Color player1Color;
  final Color player2Color;
  final Color textColor;
  final Color accentColor;
  final Color borderColor;
  final String stageIcon;

  const AdventureTheme({
    required this.name,
    required this.description,
    required this.primaryColor,
    required this.secondaryColor,
    required this.backgroundColor,
    required this.gridColor,
    required this.player1Color,
    required this.player2Color,
    required this.textColor,
    required this.accentColor,
    required this.borderColor,
    required this.stageIcon,
  });
}

const Color adventureWinningPieceColor = Color(0xFFC0C0C0);
const Color adventureMudColor = Color(0xFF8B4513);

/// Board grid after 2 consecutive game wins in adventure mode.
const Color adventureStreakSilverGridColor = Color(0xFFC0C0C0);

/// Board grid after 3+ consecutive game wins in adventure mode.
const Color adventureStreakBronzeGridColor = Color(0xFFCD7F32);

/// Resolves adventure board cell color from stage theme and in-session win streak.
Color adventureBoardGridColor({
  required AdventureTheme theme,
  required int consecutiveGameWins,
}) {
  if (consecutiveGameWins >= 3) return adventureStreakBronzeGridColor;
  if (consecutiveGameWins >= 2) return adventureStreakSilverGridColor;
  return theme.gridColor;
}

const List<AdventureTheme> adventureThemes = [
  AdventureTheme(
    name: 'The Whispering Egg',
    description: 'The prophecy of a hero is laid within a golden cell.',
    primaryColor: Color(0xFFFFD700),
    secondaryColor: Color(0xFFFFA500),
    backgroundColor: Color(0xFFFFF8DC),
    gridColor: Color(0xFFFFE4B5),
    player1Color: Color(0xFF000000),
    player2Color: beeFivePrimaryYellow,
    textColor: Color(0xFF8B4513),
    accentColor: Color(0xFFFF6347),
    borderColor: Color(0xFFDAA520),
    stageIcon: '🥚',
  ),
  AdventureTheme(
    name: 'Larva of Legends',
    description: 'A tiny creature begins its fabled journey of growth.',
    primaryColor: Color(0xFFFFA500),
    secondaryColor: Color(0xFFFF8C00),
    backgroundColor: Color(0xFFFFFACD),
    gridColor: Color(0xFFFFEBCD),
    player1Color: Color(0xFF000000),
    player2Color: beeFivePrimaryYellow,
    textColor: Color(0xFFCD853F),
    accentColor: Color(0xFFFF6347),
    borderColor: Color(0xFFFF8C00),
    stageIcon: '🐛',
  ),
  AdventureTheme(
    name: 'Chamber of Royal Nectar',
    description: 'A mystical hall where power and destiny are forged.',
    primaryColor: Color(0xFFFF6347),
    secondaryColor: Color(0xFFDC143C),
    backgroundColor: Color(0xFFFFE4E1),
    gridColor: Color(0xFFFFB6C1),
    player1Color: Color(0xFF000000),
    player2Color: beeFivePrimaryYellow,
    textColor: Color(0xFF8B0000),
    accentColor: Color(0xFFFF1493),
    borderColor: Color(0xFFDC143C),
    stageIcon: '🍯',
  ),
  AdventureTheme(
    name: 'Silken Cocoon of Secrets',
    description: 'Spinning a magical shell to transform.',
    primaryColor: Color(0xFF9370DB),
    secondaryColor: Color(0xFF8A2BE2),
    backgroundColor: Color(0xFFE6E6FA),
    gridColor: Color(0xFFDDA0DD),
    player1Color: Color(0xFF000000),
    player2Color: beeFivePrimaryYellow,
    textColor: Color(0xFF4B0082),
    accentColor: Color(0xFFDA70D6),
    borderColor: Color(0xFF8A2BE2),
    stageIcon: '🕸️',
  ),
  AdventureTheme(
    name: 'Dreams of the Pupa Realm',
    description: 'Visions of wings and future battles stir inside.',
    primaryColor: Color(0xFF4169E1),
    secondaryColor: Color(0xFF0000CD),
    backgroundColor: Color(0xFFE0E0FF),
    gridColor: Color(0xFFB0C4DE),
    player1Color: Color(0xFF000000),
    player2Color: beeFivePrimaryYellow,
    textColor: Color(0xFF191970),
    accentColor: Color(0xFF00BFFF),
    borderColor: Color(0xFF0000CD),
    stageIcon: '🦋',
  ),
  AdventureTheme(
    name: 'Wings of Dawn',
    description: 'Breaking free and taking the first heroic flight.',
    primaryColor: Color(0xFF00CED1),
    secondaryColor: Color(0xFF20B2AA),
    backgroundColor: Color(0xFFE0FFFF),
    gridColor: Color(0xFFAFEEEE),
    player1Color: Color(0xFF000000),
    player2Color: beeFivePrimaryYellow,
    textColor: Color(0xFF008B8B),
    accentColor: Color(0xFF00FFFF),
    borderColor: Color(0xFF20B2AA),
    stageIcon: '🌅',
  ),
  AdventureTheme(
    name: 'Hive of Trials',
    description: 'Training in ancient duties and learning hidden arts.',
    primaryColor: Color(0xFF32CD32),
    secondaryColor: Color(0xFF228B22),
    backgroundColor: Color(0xFFF0FFF0),
    gridColor: Color(0xFF90EE90),
    player1Color: Color(0xFF000000),
    player2Color: beeFivePrimaryYellow,
    textColor: Color(0xFF006400),
    accentColor: Color(0xFF00FF00),
    borderColor: Color(0xFF228B22),
    stageIcon: '🏠',
  ),
  AdventureTheme(
    name: 'Trails of Golden Pollen',
    description: 'Quests across wildflower kingdoms to gather treasure.',
    primaryColor: Color(0xFFFFC30B),
    secondaryColor: Color(0xFFFFD700),
    backgroundColor: Color(0xFFFFFACD),
    gridColor: Color(0xFFFFE4B5),
    player1Color: Color(0xFF000000),
    player2Color: beeFivePrimaryYellow,
    textColor: Color(0xFFB8860B),
    accentColor: Color(0xFFFFA500),
    borderColor: Color(0xFFDAA520),
    stageIcon: '🌻',
  ),
  AdventureTheme(
    name: 'Sentinel of the Hiveheart',
    description: 'Standing guard against dark invaders.',
    primaryColor: Color(0xFFDC143C),
    secondaryColor: Color(0xFFB22222),
    backgroundColor: Color(0xFFFFE4E1),
    gridColor: Color(0xFFFFB6C1),
    player1Color: Color(0xFF000000),
    player2Color: beeFivePrimaryYellow,
    textColor: Color(0xFF8B0000),
    accentColor: Color(0xFFFF6347),
    borderColor: Color(0xFFB22222),
    stageIcon: '🛡️',
  ),
  AdventureTheme(
    name: 'Crown of the Queen-Bee',
    description: 'Ascend the throne, lead the swarm, or begin a new dynasty.',
    primaryColor: Color(0xFF8B008B),
    secondaryColor: Color(0xFF9932CC),
    backgroundColor: Color(0xFFF0E6FF),
    gridColor: Color(0xFFDDA0DD),
    player1Color: Color(0xFF000000),
    player2Color: beeFivePrimaryYellow,
    textColor: Color(0xFF4B0082),
    accentColor: Color(0xFFDA70D6),
    borderColor: Color(0xFF9932CC),
    stageIcon: '👑',
  ),
];

AdventureTheme getThemeForGame(int gameNumber) {
  final stageIndex = ((gameNumber - 1) ~/ 200).clamp(0, adventureThemes.length - 1);
  return adventureThemes[stageIndex];
}

int getStageIndex(int gameNumber) => ((gameNumber - 1) ~/ 200).clamp(0, adventureThemes.length - 1);

String getStageName(int gameNumber) => getThemeForGame(gameNumber).name;
