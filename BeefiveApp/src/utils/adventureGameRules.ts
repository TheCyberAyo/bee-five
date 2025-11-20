// Adventure Game Rules and Obstacles
// Based on bee-five-web game logic

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard' | 'Very Hard' | 'Extreme';

export interface GameRules {
  timeLimit: number;
  hasMudZones: boolean;
  mudZoneCount: number;
  hasBlindPlay: boolean;
  hasBlockedCells: boolean;
  blockedCellCount: number;
  startingPlayer: 1 | 2;
  hasProgressiveBlocks: boolean;
  hasDisappearingBlocks: boolean;
  hasShiftingBlocks: boolean;
  hasDisappearingPieces: boolean;
  hasPieceCapacity: boolean;
  hasBoardRearrangement: boolean;
  hasPieceSwapping: boolean;
  isMatchGame: boolean;
  matchType?: 'best-of-3' | 'best-of-5' | 'single';
  aiDifficulty: 'easy' | 'medium' | 'hard';
  difficultyLevel: DifficultyLevel;
  difficultyScore: number;
  description: string;
  icon: string;
}

// Get time limit based on game level
export const getTimeLimitForLevel = (gameNumber: number): number => {
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
};

// Check if game has mud zones (multiples of 200)
export const hasMudZones = (gameNumber: number): boolean => {
  return gameNumber % 200 === 0;
};

// Check if game has blind play
export const hasBlindPlay = (gameNumber: number): boolean => {
  // Games ending with 2 in pattern: 42, 92, 142, 192, etc.
  if (gameNumber >= 42 && (gameNumber - 42) % 50 === 0) {
    return true;
  }
  return false;
};

// Check if game has blocked cells
export const hasBlockedCells = (gameNumber: number): boolean => {
  const lastDigit = gameNumber % 10;
  
  // Games ending in 3 (progressive blocks from 51+)
  if (lastDigit === 3 && gameNumber > 50) return true;
  
  // Games ending in 4 (16 blocked cells from 400+)
  if (lastDigit === 4 && gameNumber >= 400) return true;
  
  // Games ending in 5 (5 blocked cells from 100+)
  if (lastDigit === 5 && gameNumber >= 100) return true;
  
  // Games ending in 7 (6 blocked cells from 27+)
  if (lastDigit === 7 && gameNumber >= 27) return true;
  
  // Games ending in 8 (8 blocked cells from 600+)
  if (lastDigit === 8 && gameNumber >= 600) return true;
  
  // Games ending in 9 (10 blocked cells from 50+)
  if (lastDigit === 9 && gameNumber >= 50) return true;
  
  // Multiples of 5 (4 blocked cells)
  if (gameNumber % 5 === 0 && gameNumber % 10 !== 0) return true;
  
  return false;
};

// Get blocked cell count
export const getBlockedCellCount = (gameNumber: number): number => {
  const lastDigit = gameNumber % 10;
  
  if (lastDigit === 4 && gameNumber >= 400) return 16;
  if (lastDigit === 5 && gameNumber >= 100) return 5;
  if (lastDigit === 7 && gameNumber >= 27) return 6;
  if (lastDigit === 8 && gameNumber >= 600) return 8;
  if (lastDigit === 9 && gameNumber >= 50) return 10;
  if (gameNumber % 5 === 0 && gameNumber % 10 !== 0) return 4;
  if (lastDigit === 3 && gameNumber > 50) return 0; // Progressive blocks
  
  return 0;
};

// Get starting player
export const getAdventureStartingPlayer = (gameNumber: number): 1 | 2 => {
  if (gameNumber % 10 === 1) return 2; // AI starts
  
  const lastDigit = gameNumber % 10;
  if (lastDigit >= 3 && lastDigit <= 9) {
    if ((lastDigit === 3 && gameNumber > 50) ||
        (lastDigit === 4 && gameNumber >= 400) ||
        (lastDigit === 5 && gameNumber >= 100) ||
        (lastDigit === 7 && gameNumber >= 27) ||
        (lastDigit === 8 && gameNumber >= 600) ||
        (lastDigit === 9 && gameNumber >= 50)) {
      return 2; // AI starts
    }
  }
  
  return 1; // Human starts
};

// Check if game is a match game
export const isMatchGame = (gameNumber: number): boolean => {
  return gameNumber % 10 === 0;
};

// Get match type
export const getMatchType = (gameNumber: number): 'best-of-3' | 'best-of-5' | 'single' => {
  if (gameNumber % 50 === 0) return 'best-of-5';
  if (gameNumber % 10 === 0) return 'best-of-3';
  return 'single';
};

// Calculate AI difficulty based on game number
export const getAIDifficulty = (gameNumber: number): 'easy' | 'medium' | 'hard' => {
  // Games 601+ use Hard AI, games 1-600 use Medium AI
  if (gameNumber >= 601) return 'hard';
  return 'medium';
};

// Calculate difficulty score (0-100, higher = harder)
export const calculateDifficultyScore = (
  gameNumber: number,
  timeLimit: number,
  startingPlayer: 1 | 2,
  mudZones: boolean,
  blindPlay: boolean,
  blockedCells: boolean,
  blockedCount: number,
  hasProgressiveBlocks: boolean,
  hasDisappearingBlocks: boolean,
  hasShiftingBlocks: boolean,
  hasDisappearingPieces: boolean,
  hasPieceCapacity: boolean,
  isMatch: boolean
): number => {
  let score = 0;
  
  // Base difficulty from game number (0-40 points)
  score += Math.min(40, (gameNumber / 2000) * 40);
  
  // Time limit penalty (0-20 points, shorter = harder)
  score += Math.max(0, (15 - timeLimit) * 1.5);
  
  // Starting player (AI starts = +10 points)
  if (startingPlayer === 2) score += 10;
  
  // Obstacles (0-30 points)
  if (mudZones) score += 8;
  if (blindPlay) score += 15;
  if (blockedCells) {
    score += Math.min(10, blockedCount * 0.5);
    if (hasProgressiveBlocks) score += 5;
    if (hasDisappearingBlocks) score += 7;
    if (hasShiftingBlocks) score += 6;
  }
  if (hasDisappearingPieces) score += 8;
  if (hasPieceCapacity) score += 5;
  if (isMatch) score += 5;
  
  return Math.min(100, Math.round(score));
};

// Get difficulty level from score
export const getDifficultyLevel = (score: number): DifficultyLevel => {
  if (score >= 80) return 'Extreme';
  if (score >= 60) return 'Very Hard';
  if (score >= 40) return 'Hard';
  if (score >= 20) return 'Medium';
  return 'Easy';
};

// Get comprehensive game rules
export const getGameRules = (gameNumber: number): GameRules => {
  const timeLimit = getTimeLimitForLevel(gameNumber);
  const mudZones = hasMudZones(gameNumber);
  const blindPlay = hasBlindPlay(gameNumber);
  const blockedCells = hasBlockedCells(gameNumber);
  const blockedCount = getBlockedCellCount(gameNumber);
  const startingPlayer = getAdventureStartingPlayer(gameNumber);
  const isMatch = isMatchGame(gameNumber);
  const matchType = isMatch ? getMatchType(gameNumber) : undefined;
  const aiDifficulty = getAIDifficulty(gameNumber);
  
  // Progressive blocks (games ending in 3)
  const hasProgressiveBlocks = (gameNumber % 10 === 3 && gameNumber > 50);
  
  // Disappearing blocks (games ending in 4)
  const hasDisappearingBlocks = (gameNumber % 10 === 4 && gameNumber >= 400);
  
  // Shifting blocks (games ending in 7 or 8)
  const hasShiftingBlocks = (gameNumber % 10 === 7 && gameNumber > 250) || 
                           (gameNumber % 10 === 8 && gameNumber > 600);
  
  // Disappearing pieces
  const hasDisappearingPieces = (gameNumber >= 500 && gameNumber <= 1000 && gameNumber % 7 === 0) ||
                                (gameNumber >= 1000 && gameNumber % 4 === 0);
  
  // Piece capacity (multiples of 17)
  const hasPieceCapacity = gameNumber % 17 === 0;
  
  // Board rearrangement (multiples of 50, match 3)
  const hasBoardRearrangement = gameNumber % 50 === 0;
  
  // Piece swapping (multiples of 50, match 4)
  const hasPieceSwapping = gameNumber % 50 === 0;
  
  // Calculate difficulty
  const difficultyScore = calculateDifficultyScore(
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
    isMatch
  );
  const difficultyLevel = getDifficultyLevel(difficultyScore);
  
  // Build description
  const rules: string[] = [];
  if (mudZones) rules.push('Mud Zones');
  if (blindPlay) rules.push('Blind Play');
  if (blockedCells) {
    if (hasProgressiveBlocks) rules.push('Progressive Blocks');
    else if (hasDisappearingBlocks) rules.push('Disappearing Blocks');
    else if (hasShiftingBlocks) rules.push('Shifting Blocks');
    else rules.push(`${blockedCount} Blocked Cells`);
  }
  if (hasDisappearingPieces) rules.push('Disappearing Pieces');
  if (hasPieceCapacity) rules.push('Piece Capacity');
  if (isMatch) rules.push(`${matchType === 'best-of-5' ? 'Best of 5' : 'Best of 3'}`);
  
  const description = rules.length > 0 ? rules.join(', ') : 'Standard Game';
  
  // Get icon based on rules
  let icon = '🎮';
  if (mudZones) icon = '🌊';
  else if (blindPlay) icon = '👁️';
  else if (hasProgressiveBlocks) icon = '📈';
  else if (hasDisappearingBlocks) icon = '💨';
  else if (hasShiftingBlocks) icon = '🔄';
  else if (hasDisappearingPieces) icon = '✨';
  else if (blockedCells) icon = '🚫';
  else if (isMatch) icon = '🏆';
  
  return {
    timeLimit,
    hasMudZones: mudZones,
    mudZoneCount: mudZones ? 5 : 0,
    hasBlindPlay: blindPlay,
    hasBlockedCells: blockedCells,
    blockedCellCount: blockedCount,
    startingPlayer,
    hasProgressiveBlocks,
    hasDisappearingBlocks,
    hasShiftingBlocks,
    hasDisappearingPieces,
    hasPieceCapacity,
    hasBoardRearrangement,
    hasPieceSwapping,
    isMatchGame: isMatch,
    matchType,
    aiDifficulty,
    difficultyLevel,
    difficultyScore,
    description,
    icon,
  };
};

