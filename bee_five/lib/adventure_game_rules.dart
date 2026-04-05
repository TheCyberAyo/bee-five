// Adventure Game Rules and Obstacles
// Ported from BeefiveApp/src/utils/adventureGameRules.ts

enum DifficultyLevel { easy, medium, hard, veryHard, extreme }

class GameRules {
  final int timeLimit;
  final bool hasMudZones;
  final int mudZoneCount;
  final bool hasBlindPlay;
  final bool hasBlockedCells;
  final int blockedCellCount;
  final int startingPlayer; // 1 = player, 2 = AI
  final bool hasProgressiveBlocks;
  final bool hasDisappearingBlocks;
  final bool hasShiftingBlocks;
  final bool hasDisappearingPieces;
  final bool hasPieceCapacity;
  final bool hasBoardRearrangement;
  final bool hasPieceSwapping;
  final bool isMatchGame;
  final String? matchType; // 'best-of-3' | 'best-of-5' | 'single'
  final String aiDifficulty; // 'easy' | 'medium' | 'hard'
  final DifficultyLevel difficultyLevel;
  final int difficultyScore;
  final String description;
  final String icon;

  GameRules({
    required this.timeLimit,
    required this.hasMudZones,
    required this.mudZoneCount,
    required this.hasBlindPlay,
    required this.hasBlockedCells,
    required this.blockedCellCount,
    required this.startingPlayer,
    required this.hasProgressiveBlocks,
    required this.hasDisappearingBlocks,
    required this.hasShiftingBlocks,
    required this.hasDisappearingPieces,
    required this.hasPieceCapacity,
    required this.hasBoardRearrangement,
    required this.hasPieceSwapping,
    required this.isMatchGame,
    this.matchType,
    required this.aiDifficulty,
    required this.difficultyLevel,
    required this.difficultyScore,
    required this.description,
    required this.icon,
  });
}

// Get time limit based on game level
int getTimeLimitForLevel(int gameNumber) {
  if (gameNumber >= 1 && gameNumber <= 200) return 12;
  if (gameNumber >= 201 && gameNumber <= 400) return 10;
  if (gameNumber >= 401 && gameNumber <= 600) return 9;
  if (gameNumber >= 601 && gameNumber <= 800) return 8;
  if (gameNumber >= 801 && gameNumber <= 1000) return 7;
  if (gameNumber >= 1001 && gameNumber <= 1200) return 6;
  if (gameNumber >= 1201 && gameNumber <= 1400) return 5;
  if (gameNumber >= 1401 && gameNumber <= 1600) return 4;
  if (gameNumber >= 1601 && gameNumber <= 1800) return 3;
  if (gameNumber >= 1801 && gameNumber <= 2000) return 2;
  return 15;
}

// Check if game has mud zones (multiples of 200)
bool hasMudZones(int gameNumber) {
  return gameNumber % 200 == 0;
}

// Check if game has blind play
bool hasBlindPlay(int gameNumber, [int? currentMatch]) {
  // Games ending with 2 in pattern: 42, 92, 142, 192, etc.
  if (gameNumber >= 42 && (gameNumber - 42) % 50 == 0) {
    return true;
  }
  // Multiples of 50 match 2 have blind play for entire game
  if (gameNumber % 50 == 0 && currentMatch == 2) {
    return true;
  }
  return false;
}

// Check if game has blocked cells
bool hasBlockedCells(int gameNumber) {
  final lastDigit = gameNumber % 10;
  
  // Games ending in 3 (progressive blocks from 51+)
  if (lastDigit == 3 && gameNumber > 50) return true;
  
  // Games ending in 4 (16 blocked cells from 400+)
  if (lastDigit == 4 && gameNumber >= 400) return true;
  
  // Games ending in 5 (5 blocked cells from 100+)
  if (lastDigit == 5 && gameNumber >= 100) return true;
  
  // Games ending in 7 (6 blocked cells from 27+)
  if (lastDigit == 7 && gameNumber >= 27) return true;
  
  // Games ending in 8 (8 blocked cells from 600+)
  if (lastDigit == 8 && gameNumber >= 600) return true;
  
  // Games ending in 9 (10 blocked cells from 50+)
  if (lastDigit == 9 && gameNumber >= 50) return true;
  
  // Multiples of 10 (excluding 50) from game 60+ have 5 blocked cells in match 1
  if (gameNumber >= 60 && gameNumber % 10 == 0 && gameNumber % 50 != 0) return true;
  
  // Multiples of 5 (4 blocked cells)
  if (gameNumber % 5 == 0 && gameNumber % 10 != 0) return true;
  
  return false;
}

// Get blocked cell count
int getBlockedCellCount(int gameNumber) {
  final lastDigit = gameNumber % 10;
  
  // Multiples of 10 (excluding 50) from game 60+ have 5 blocked cells in match 1
  if (gameNumber >= 60 && gameNumber % 10 == 0 && gameNumber % 50 != 0) return 5;
  
  if (lastDigit == 4 && gameNumber >= 400) return 16;
  if (lastDigit == 5 && gameNumber >= 100) return 5;
  if (lastDigit == 7 && gameNumber >= 27) return 6;
  if (lastDigit == 8 && gameNumber >= 600) return 8;
  if (lastDigit == 9 && gameNumber >= 50) return 10;
  if (gameNumber % 5 == 0 && gameNumber % 10 != 0) return 4;
  if (lastDigit == 3 && gameNumber > 50) return 0; // Progressive blocks
  
  return 0;
}

// Get starting player
int getAdventureStartingPlayer(int gameNumber) {
  if (gameNumber % 10 == 1) return 2; // AI starts
  
  final lastDigit = gameNumber % 10;
  if (lastDigit >= 3 && lastDigit <= 9) {
    if ((lastDigit == 3 && gameNumber > 50) ||
        (lastDigit == 4 && gameNumber >= 400) ||
        (lastDigit == 5 && gameNumber >= 100) ||
        (lastDigit == 7 && gameNumber >= 27) ||
        (lastDigit == 8 && gameNumber >= 600) ||
        (lastDigit == 9 && gameNumber >= 50)) {
      return 2; // AI starts
    }
  }
  
  return 1; // Human starts
}

// Check if game is a match game
bool isMatchGame(int gameNumber) {
  return gameNumber % 10 == 0;
}

// Get match type
String? getMatchType(int gameNumber) {
  if (gameNumber % 50 == 0) return 'best-of-5';
  if (gameNumber % 10 == 0) return 'best-of-3';
  return null;
}

// Calculate AI difficulty based on game number
String getAIDifficulty(int gameNumber) {
  final lastDigit = gameNumber % 10;
  
  // SPECIAL RULE: Levels 10-200 ending with 9 = HARD
  if (gameNumber >= 10 && gameNumber <= 200 && lastDigit == 9) {
    return 'hard';
  }
  
  // SPECIAL RULE: Levels 100-200 ending with 2 = HARD
  if (gameNumber >= 100 && gameNumber <= 200 && lastDigit == 2) {
    return 'hard';
  }
  
  // SPECIAL RULE: Levels 200-600 ending with 2, 5, or 9 = HARD
  if (gameNumber >= 200 && gameNumber <= 600 && (lastDigit == 2 || lastDigit == 5 || lastDigit == 9)) {
    return 'hard';
  }
  
  // First 100 games: easy by default, levels ending in 6 or 8 are medium
  if (gameNumber <= 100) {
    if (lastDigit == 6 || lastDigit == 8) return 'medium';
    return 'easy';
  }
  
  // Games 101-600: medium by default, but some are already caught by hard rules above
  if (gameNumber >= 101 && gameNumber <= 600) {
    if (lastDigit == 5) return 'easy'; // Only ending with 5 is easy (if not caught by hard rule)
    return 'medium';
  }
  
  // Games 601-2000: ending in 1-4 = medium, ending in 9 = easy, else hard
  if (gameNumber >= 601 && gameNumber <= 2000) {
    if (lastDigit >= 1 && lastDigit <= 4) return 'medium';
    if (lastDigit == 9) return 'easy';
    return 'hard';
  }
  
  // Games 2001+ use Hard AI
  if (gameNumber >= 2001) return 'hard';
  
  return 'medium';
}

// Calculate difficulty score (0-100, higher = harder)
int calculateDifficultyScore(
  int gameNumber,
  int timeLimit,
  int startingPlayer,
  bool mudZones,
  bool blindPlay,
  bool blockedCells,
  int blockedCount,
  bool hasProgressiveBlocks,
  bool hasDisappearingBlocks,
  bool hasShiftingBlocks,
  bool hasDisappearingPieces,
  bool hasPieceCapacity,
  bool isMatch,
) {
  double score = 0;
  
  // Base difficulty from game number (0-40 points)
  score += (gameNumber / 2000 * 40).clamp(0, 40);
  
  // Time limit penalty (0-20 points, shorter = harder)
  score += ((15 - timeLimit) * 1.5).clamp(0, 20);
  
  // Starting player (AI starts = +10 points)
  if (startingPlayer == 2) score += 10;
  
  // Obstacles (0-30 points)
  if (mudZones) score += 8;
  if (blindPlay) score += 15;
  if (blockedCells) {
    score += (blockedCount * 0.5).clamp(0, 10);
    if (hasProgressiveBlocks) score += 5;
    if (hasDisappearingBlocks) score += 7;
    if (hasShiftingBlocks) score += 6;
  }
  if (hasDisappearingPieces) score += 8;
  if (hasPieceCapacity) score += 5;
  if (isMatch) score += 5;
  
  return score.round().clamp(0, 100);
}

// Get difficulty level from score
DifficultyLevel getDifficultyLevel(int score) {
  if (score >= 80) return DifficultyLevel.extreme;
  if (score >= 60) return DifficultyLevel.veryHard;
  if (score >= 40) return DifficultyLevel.hard;
  if (score >= 20) return DifficultyLevel.medium;
  return DifficultyLevel.easy;
}

// Get comprehensive game rules
GameRules getGameRules(int gameNumber, [int? currentMatch]) {
  final timeLimit = getTimeLimitForLevel(gameNumber);
  final mudZones = hasMudZones(gameNumber);
  final blindPlay = hasBlindPlay(gameNumber, currentMatch);
  final blockedCells = hasBlockedCells(gameNumber);
  final blockedCount = getBlockedCellCount(gameNumber);
  final startingPlayer = getAdventureStartingPlayer(gameNumber);
  final isMatch = isMatchGame(gameNumber);
  final matchType = isMatch ? getMatchType(gameNumber) : null;
  final aiDifficulty = getAIDifficulty(gameNumber);
  
  // Progressive blocks (games ending in 3)
  final hasProgressiveBlocks = (gameNumber % 10 == 3 && gameNumber > 50);
  
  // Disappearing blocks (games ending in 4)
  final hasDisappearingBlocks = (gameNumber % 10 == 4 && gameNumber >= 400);
  
  // Shifting blocks (games ending in 7 or 8)
  final hasShiftingBlocks = (gameNumber % 10 == 7 && gameNumber > 250) || 
                           (gameNumber % 10 == 8 && gameNumber > 600);
  
  // Disappearing pieces
  final hasDisappearingPieces = (gameNumber >= 500 && gameNumber <= 1000 && gameNumber % 7 == 0) ||
                                (gameNumber >= 1000 && gameNumber % 4 == 0);
  
  // Piece capacity (multiples of 17)
  final hasPieceCapacity = gameNumber % 17 == 0;
  
  // Board rearrangement (multiples of 50, match 3)
  final hasBoardRearrangement = gameNumber % 50 == 0;
  
  // Piece swapping (multiples of 50, match 4)
  final hasPieceSwapping = gameNumber % 50 == 0;
  
  // Calculate difficulty
  final difficultyScore = calculateDifficultyScore(
    gameNumber,
    timeLimit,
    startingPlayer,
    mudZones,
    blindPlay,
    blockedCells,
    blockedCount,
    hasProgressiveBlocks,
    hasDisappearingBlocks,
    hasShiftingBlocks,
    hasDisappearingPieces,
    hasPieceCapacity,
    isMatch,
  );
  final difficultyLevel = getDifficultyLevel(difficultyScore);
  
  // Build description
  final rules = <String>[];
  if (mudZones) {
    rules.add('Mud Zones');
  }
  if (blindPlay) {
    rules.add('Blind Play');
  }
  if (blockedCells) {
    if (hasProgressiveBlocks) {
      rules.add('Progressive Blocks');
    } else if (hasDisappearingBlocks) {
      rules.add('Disappearing Blocks');
    } else if (hasShiftingBlocks) {
      rules.add('Shifting Blocks');
    } else {
      rules.add('$blockedCount Blocked Cells');
    }
  }
  if (hasDisappearingPieces) {
    rules.add('Disappearing Pieces');
  }
  if (hasPieceCapacity) {
    rules.add('Piece Capacity');
  }
  if (isMatch) {
    rules.add(matchType == 'best-of-5' ? 'Best of 5' : 'Best of 3');
  }
  
  final description = rules.isNotEmpty ? rules.join(', ') : 'Standard Game';
  
  // Get icon based on rules
  String icon = '🎮';
  if (mudZones) {
    icon = '🌊';
  } else if (blindPlay) {
    icon = '👁️';
  } else if (hasProgressiveBlocks) {
    icon = '📈';
  } else if (hasDisappearingBlocks) {
    icon = '💨';
  } else if (hasShiftingBlocks) {
    icon = '↔️';
  } else if (hasDisappearingPieces) {
    icon = '✨';
  } else if (blockedCells) {
    icon = '🚫';
  } else if (isMatch) {
    icon = '🏆';
  }
  
  return GameRules(
    timeLimit: timeLimit,
    hasMudZones: mudZones,
    mudZoneCount: mudZones ? 5 : 0,
    hasBlindPlay: blindPlay,
    hasBlockedCells: blockedCells,
    blockedCellCount: blockedCount,
    startingPlayer: startingPlayer,
    hasProgressiveBlocks: hasProgressiveBlocks,
    hasDisappearingBlocks: hasDisappearingBlocks,
    hasShiftingBlocks: hasShiftingBlocks,
    hasDisappearingPieces: hasDisappearingPieces,
    hasPieceCapacity: hasPieceCapacity,
    hasBoardRearrangement: hasBoardRearrangement,
    hasPieceSwapping: hasPieceSwapping,
    isMatchGame: isMatch,
    matchType: matchType,
    aiDifficulty: aiDifficulty,
    difficultyLevel: difficultyLevel,
    difficultyScore: difficultyScore,
    description: description,
    icon: icon,
  );
}