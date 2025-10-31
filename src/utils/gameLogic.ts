// Shared game logic utilities to avoid duplication

export const checkWinCondition = (board: (0 | 1 | 2 | 3)[][], row: number, col: number, player: 1 | 2): boolean => {
  const winningPieces = getWinningPieces(board, row, col, player);
  return winningPieces.length >= 5;
};

export const getWinningPieces = (board: (0 | 1 | 2 | 3)[][], row: number, col: number, player: 1 | 2): { row: number; col: number }[] => {
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal \
    [1, -1]   // diagonal /
  ];

  for (const [dx, dy] of directions) {
    const winningPieces: { row: number; col: number }[] = [];
    
    // Start with the current piece
    winningPieces.push({ row, col });

    // Check in positive direction
    for (let i = 1; i < 5; i++) {
      const newRow = row + i * dx;
      const newCol = col + i * dy;
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
        winningPieces.push({ row: newRow, col: newCol });
      } else {
        break;
      }
    }

    // Check in negative direction
    for (let i = 1; i < 5; i++) {
      const newRow = row - i * dx;
      const newCol = col - i * dy;
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
        winningPieces.unshift({ row: newRow, col: newCol });
      } else {
        break;
      }
    }

    if (winningPieces.length >= 5) {
      return winningPieces;
    }
  }

  return [];
};

export const isBoardFull = (board: (0 | 1 | 2 | 3)[][]): boolean => {
  return board.every(row => row.every(cell => cell !== 0 && cell !== BLOCKED_CELL));
};

export const createEmptyBoard = (): (0 | 1 | 2 | 3)[][] => {
  return Array(10).fill(null).map(() => Array(10).fill(0));
};

// Blocked cell value (3 represents a blocked cell with bee)
export const BLOCKED_CELL = 3;

// Remove 2 blocked cells from the board (for games ending with 4)
export const removeTwoBlockedCells = (board: (0 | 1 | 2 | 3)[][]): (0 | 1 | 2 | 3)[][] => {
  const newBoard = board.map(row => [...row]);
  const blockedPositions: { row: number; col: number }[] = [];
  
  // Find all blocked cells
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (newBoard[row][col] === BLOCKED_CELL) {
        blockedPositions.push({ row, col });
      }
    }
  }
  
  // Remove 2 blocked cells (or all if less than 2 remain)
  const cellsToRemove = Math.min(2, blockedPositions.length);
  for (let i = 0; i < cellsToRemove; i++) {
    const randomIndex = Math.floor(Math.random() * blockedPositions.length);
    const { row, col } = blockedPositions[randomIndex];
    newBoard[row][col] = 0; // Remove the blocked cell
    blockedPositions.splice(randomIndex, 1); // Remove from array
  }
  
  return newBoard;
};

// Check if a game number ends with 3 (for progressive blocks)
export const gameEndsWith3 = (gameNumber: number): boolean => {
  return gameNumber % 10 === 3 && gameNumber > 50;
};

// Check if a game number ends with 5 (for 5 blocked cells) - only from level 100 onwards
export const gameEndsWith5 = (gameNumber: number): boolean => {
  return gameNumber >= 100 && gameNumber % 10 === 5;
};

// Check if a game number ends with 4 (for disappearing blocks) - only from level 400 onwards
export const gameEndsWith4 = (gameNumber: number): boolean => {
  return gameNumber >= 400 && gameNumber % 10 === 4;
};

// Check if a game number ends with 7 and is after game 250 (for shifting blocks)
export const gameEndsWith7After250 = (gameNumber: number): boolean => {
  return gameNumber > 250 && gameNumber % 10 === 7;
};

// Check if a game number ends with 8 and is after game 600 (for shifting blocks)
export const gameEndsWith8After600 = (gameNumber: number): boolean => {
  return gameNumber > 600 && gameNumber % 10 === 8;
};

// Check if a game number is a multiple of 7 between 500-1000 (for disappearing pieces after 4 turns)
export const isMultipleOf7Between500And1000 = (gameNumber: number): boolean => {
  return gameNumber >= 500 && gameNumber <= 1000 && gameNumber % 7 === 0;
};

// Check if a game number is a multiple of 4 from game 1000 onwards (for disappearing pieces after 3 moves)
export const isMultipleOf4From1000 = (gameNumber: number): boolean => {
  return gameNumber >= 1000 && gameNumber % 4 === 0;
};

// Check if a game number is a multiple of 10 (for mud zones) - REMOVED: No longer used
// export const isMultipleOf10 = (gameNumber: number): boolean => {
//   return gameNumber % 10 === 0;
// };

// Check if a game number is a multiple of 40 (for enhanced mud zones with 5 zones)
export const isMultipleOf40 = (gameNumber: number): boolean => {
  return gameNumber % 40 === 0;
};

// Check if a game number is a multiple of 200 (for mud zones)
export const isMultipleOf200 = (gameNumber: number): boolean => {
  return gameNumber % 200 === 0;
};

// Check if a game number follows the specific pattern (42, 92, 142, 192, etc.)
export const gameEndsWith2SpecificPattern = (gameNumber: number): boolean => {
  // The pattern is: 42, 92, 142, 192, 242, 292, 342, 392, 442, 492, 542, 592, 642, 692, 742, 792, 842, 892, 942, 992, 1042, 1092, 1142, 1192, 1242, 1292, 1342, 1392, 1442, 1492, 1542, 1592, 1642, 1692, 1742, 1792, 1842, 1892, 1942, 1992
  // This is every 50 games starting from 42: 42 + (n * 50) where n = 0, 1, 2, 3, ...
  
  if (gameNumber < 42) {
    return false;
  }
  
  // Check if it's in the sequence: 42, 92, 142, 192, 242, 292, etc.
  return (gameNumber - 42) % 50 === 0;
};

// Determine the starting player for adventure games based on game number patterns
export const getAdventureStartingPlayer = (gameNumber: number): 1 | 2 => {
  // AI goes first (player 2) for certain patterns:
  // - Games ending in 1 (11, 21, 31, 41, 51, 61, 71, 81, 91, 101, 111, 121, 131, 141, 151, 161, 171, 181, 191, 201, 211, etc.)
  if (gameNumber % 10 === 1) {
    return 2; // AI starts first
  }
  
  // AI goes first for games with special mechanics (ending in 3-9) to balance difficulty:
  // - Games ending in 3: Progressive blocks (from game 51+)
  // - Games ending in 4: 16 blocked cells (from game 400+)
  // - Games ending in 5: 5 blocked cells (from game 100+)
  // - Games ending in 7: 6 blocked cells (from game 27+)
  // - Games ending in 8: 8 blocked cells (from game 38+)
  // - Games ending in 9: 10 blocked cells (from game 50+)
  const lastDigit = gameNumber % 10;
  if (lastDigit >= 3 && lastDigit <= 9) {
    // Check if the special mechanics apply based on game number thresholds
    if ((lastDigit === 3 && gameNumber > 50) ||  // Progressive blocks
        (lastDigit === 4 && gameNumber >= 400) || // 16 blocked cells
        (lastDigit === 5 && gameNumber >= 100) || // 5 blocked cells
        (lastDigit === 7 && gameNumber >= 27) ||  // 6 blocked cells
        (lastDigit === 8 && gameNumber >= 600) || // 8 blocked cells
        (lastDigit === 9 && gameNumber >= 50)) {  // 10 blocked cells
      return 2; // AI starts first
    }
  }
  
  // Human goes first (player 1) for all other games
  return 1;
};

// Check if a game number is a multiple of 50 and in match 2/5 (for blind play mode)
export const isMultipleOf50Match2 = (gameNumber: number, currentMatch: number): boolean => {
  return gameNumber % 50 === 0 && currentMatch === 2;
};

// Check if a game number is a multiple of 50 and in match 3/5 (for board rearrangement every 21 moves)
export const isMultipleOf50Match3 = (gameNumber: number, currentMatch: number): boolean => {
  return gameNumber % 50 === 0 && currentMatch === 3;
};

// Check if a game number is a multiple of 50 and in match 4/5 (for piece swapping every 15 moves)
export const isMultipleOf50Match4 = (gameNumber: number, currentMatch: number): boolean => {
  return gameNumber % 50 === 0 && currentMatch === 4;
};

// Check if a game number is a multiple of 17 (for piece capacity limitation)
export const isMultipleOf17 = (gameNumber: number): boolean => {
  return gameNumber % 17 === 0;
};

// Check if a game number is a multiple of 10 (excluding multiples of 50) from game 60 in match 1/3 (for 5 blocked cells)
export const isMultipleOf10Match1From60 = (gameNumber: number, currentMatch: number): boolean => {
  return gameNumber >= 60 && 
         gameNumber % 10 === 0 && 
         gameNumber % 50 !== 0 && 
         currentMatch === 1;
};

// Check if a game number is a multiple of 10 (excluding multiples of 50) from game 110 in match 1/3 (for blind play after 21 moves)
export const isMultipleOf10Match1From110 = (gameNumber: number, currentMatch: number): boolean => {
  return gameNumber >= 110 && 
         gameNumber % 10 === 0 && 
         gameNumber % 50 !== 0 && 
         currentMatch === 1;
};

// Check if a game number is a multiple of 10 (excluding multiples of 50) from game 810 in match 1/3 (for blind play after 17 moves)
export const isMultipleOf10Match1From810 = (gameNumber: number, currentMatch: number): boolean => {
  return gameNumber >= 810 && 
         gameNumber % 10 === 0 && 
         gameNumber % 50 !== 0 && 
         currentMatch === 1;
};

// Check if a game number is a multiple of 10 (excluding multiples of 50) from game 30 in match 2/3 (for piece swapping every 17 moves)
export const isMultipleOf10Match2From30 = (gameNumber: number, currentMatch: number): boolean => {
  return gameNumber >= 30 && 
         gameNumber % 10 === 0 && 
         gameNumber % 50 !== 0 && 
         currentMatch === 2;
};

// Check if a game number is a multiple of 10 (excluding multiples of 50) from game 1200 in match 2/3 (for piece swapping every 15 moves)
export const isMultipleOf10Match2From1200 = (gameNumber: number, currentMatch: number): boolean => {
  return gameNumber >= 1200 && 
         gameNumber % 10 === 0 && 
         gameNumber % 50 !== 0 && 
         currentMatch === 2;
};

// Check if a game number is a multiple of 10 from 799-1999 (excluding multiples of 50) for board rearrangement - REMOVED: No longer used
// export const shouldRearrangeBoard = (gameNumber: number): boolean => {
//   if (gameNumber < 799 || gameNumber > 1999) {
//     return false;
//   }
//   
//   // Must be a multiple of 10
//   if (gameNumber % 10 !== 0) {
//     return false;
//   }
//   
//   // Exclude multiples of 50
//   if (gameNumber % 50 === 0) {
//     return false;
//   }
//   
//   return true;
// };

// Check if a game number ends with 1 and is level 200+ (for human player blocking)
// BUT exclude games that are part of any 5-match series
export const gameEndsWith1After200 = (gameNumber: number): boolean => {
  if (gameNumber < 200 || gameNumber % 10 !== 1) {
    return false;
  }
  
  // Check if this game is part of ANY 5-match series
  // 5-match series start at: 200, 250, 300, 350, 400, 450, 500, etc.
  const seriesStart = Math.floor((gameNumber - 200) / 50) * 50 + 200;
  const positionInSeries = gameNumber - seriesStart;
  
  // If it's in position 0-4 of any 5-match series, don't apply blocking
  if (positionInSeries >= 0 && positionInSeries <= 4) {
    return false;
  }
  
  return true;
};

// Check if a game number is the first game of a 5-match series (200, 250, 300, etc)
export const isFirstGameOfFiveMatchSeries = (gameNumber: number): boolean => {
  return gameNumber >= 200 && (gameNumber - 200) % 50 === 0;
};

// Check if a game number ends with 1 and is in the specified ranges (500-700, 1001-1591)
export const gameEndsWith1InSpecifiedRanges = (gameNumber: number): boolean => {
  if (gameNumber % 10 !== 1) {
    return false;
  }
  
  // Range 1: 500-700
  if (gameNumber >= 500 && gameNumber <= 700) {
    return true;
  }
  
  // Range 2: 1001-1591
  if (gameNumber >= 1001 && gameNumber <= 1591) {
    return true;
  }
  
  return false;
};

// Get progressive blocking rules for games ending with 3
export const getProgressiveBlockRules = (gameNumber: number): { blocksToAdd: number; movesInterval: number } => {
  if (gameNumber >= 50 && gameNumber <= 200) {
    return { blocksToAdd: 1, movesInterval: 5 }; // 1 block every 5 moves
  } else if (gameNumber >= 201 && gameNumber <= 399) {
    return { blocksToAdd: 1, movesInterval: 4 }; // 1 block every 4 moves
  } else if (gameNumber >= 400 && gameNumber <= 599) {
    return { blocksToAdd: 2, movesInterval: 5 }; // 2 blocks every 5 moves
  } else if (gameNumber >= 600 && gameNumber <= 799) {
    return { blocksToAdd: 2, movesInterval: 4 }; // 2 blocks every 4 moves
  } else if (gameNumber >= 800) {
    return { blocksToAdd: 2, movesInterval: 3 }; // 2 blocks every 3 moves
  }
  return { blocksToAdd: 0, movesInterval: 0 }; // No progressive blocks
};

// Add progressive blocks to the board (for games ending with 3)
export const addProgressiveBlocks = (board: (0 | 1 | 2 | 3)[][], blocksToAdd: number): (0 | 1 | 2 | 3)[][] => {
  const newBoard = board.map(row => [...row]);
  const emptyPositions: { row: number; col: number }[] = [];
  
  // Find all empty cells
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (newBoard[row][col] === 0) {
        emptyPositions.push({ row, col });
      }
    }
  }
  
  // Add the specified number of blocks (or all available if less than requested)
  const blocksToPlace = Math.min(blocksToAdd, emptyPositions.length);
  for (let i = 0; i < blocksToPlace; i++) {
    const randomIndex = Math.floor(Math.random() * emptyPositions.length);
    const { row, col } = emptyPositions[randomIndex];
    newBoard[row][col] = BLOCKED_CELL; // Add the blocked cell
    emptyPositions.splice(randomIndex, 1); // Remove from array
  }
  
  return newBoard;
};

// Add a single block to the board (for games ending with 1 and first games of 5-match series)
export const addSingleBlock = (board: (0 | 1 | 2 | 3)[][]): (0 | 1 | 2 | 3)[][] => {
  return addProgressiveBlocks(board, 1);
};

// Find strategic blocking position based on human player's moves
export const findStrategicBlockPosition = (board: (0 | 1 | 2 | 3)[][]): { row: number; col: number } | null => {
  const emptyPositions: { row: number; col: number }[] = [];
  const strategicPositions: { row: number; col: number; priority: number }[] = [];
  
  // Find all empty cells
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (board[row][col] === 0) {
        emptyPositions.push({ row, col });
      }
    }
  }
  
  if (emptyPositions.length === 0) {
    return null;
  }
  
  // Analyze each empty position for strategic value
  for (const pos of emptyPositions) {
    let priority = 0;
    
    // Check if blocking this position would prevent human from completing a line
    priority += checkBlockingValue(board, pos.row, pos.col, 1);
    
    // Check if this position is near human pieces (closer to human pieces = higher priority)
    priority += checkProximityValue(board, pos.row, pos.col, 1);
    
    // Check if this position would block potential AI threats
    priority += checkBlockingValue(board, pos.row, pos.col, 2);
    
    strategicPositions.push({ ...pos, priority });
  }
  
  // Sort by priority (highest first) and return the best position
  strategicPositions.sort((a, b) => b.priority - a.priority);
  
  return strategicPositions.length > 0 ? {
    row: strategicPositions[0].row,
    col: strategicPositions[0].col
  } : null;
};

// Check how valuable a position is for blocking a specific player
const checkBlockingValue = (board: (0 | 1 | 2 | 3)[][], row: number, col: number, player: 1 | 2): number => {
  let value = 0;
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal \
    [1, -1]   // diagonal /
  ];

  for (const [dx, dy] of directions) {
    let count = 0;
    
    // Count consecutive pieces in this direction
    for (let i = -4; i <= 4; i++) {
      const newRow = row + i * dx;
      const newCol = col + i * dy;
      
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10) {
        if (board[newRow][newCol] === player) {
          count++;
        } else if (board[newRow][newCol] !== 0) {
          break; // Hit a different player or block, stop counting
        }
      }
    }
    
    // Higher value for positions that would block longer sequences
    if (count >= 2) {
      value += count * 10; // Exponential value for longer sequences
    }
  }
  
  return value;
};

// Check proximity value - positions closer to human pieces are more valuable to block
const checkProximityValue = (board: (0 | 1 | 2 | 3)[][], row: number, col: number, player: 1 | 2): number => {
  let value = 0;
  
  // Check in a 3x3 area around the position
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const newRow = row + dr;
      const newCol = col + dc;
      
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && 
          board[newRow][newCol] === player) {
        const distance = Math.abs(dr) + Math.abs(dc);
        value += Math.max(0, 5 - distance); // Closer pieces give higher value
      }
    }
  }
  
  return value;
};

// Add strategic block based on human player's move patterns
export const addStrategicBlock = (board: (0 | 1 | 2 | 3)[][]): (0 | 1 | 2 | 3)[][] => {
  const newBoard = board.map(row => [...row]);
  const blockPosition = findStrategicBlockPosition(newBoard);
  
  if (blockPosition) {
    newBoard[blockPosition.row][blockPosition.col] = BLOCKED_CELL;
  }
  
  return newBoard;
};

// Move one random block to a strategic position to block the human player (for games ending with 9 from game 400)
export const moveRandomBlockToStrategicPosition = (board: (0 | 1 | 2 | 3)[][]): (0 | 1 | 2 | 3)[][] => {
  const newBoard = board.map(row => [...row]);
  const blockedPositions: { row: number; col: number }[] = [];
  
  // Find all blocked cells
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (newBoard[row][col] === BLOCKED_CELL) {
        blockedPositions.push({ row, col });
      }
    }
  }
  
  if (blockedPositions.length === 0) {
    return newBoard; // No blocks to move
  }
  
  // Select a random block to move
  const randomBlockIndex = Math.floor(Math.random() * blockedPositions.length);
  const { row: oldRow, col: oldCol } = blockedPositions[randomBlockIndex];
  
  // Remove the selected block
  newBoard[oldRow][oldCol] = 0;
  
  // Find strategic position to place the block (near human pieces)
  const strategicPosition = findStrategicBlockPosition(newBoard);
  
  if (strategicPosition && newBoard[strategicPosition.row][strategicPosition.col] === 0) {
    // Place the block at the strategic position
    newBoard[strategicPosition.row][strategicPosition.col] = BLOCKED_CELL;
  } else {
    // If no strategic position found or position is occupied, place randomly
    const emptyPositions: { row: number; col: number }[] = [];
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        if (newBoard[row][col] === 0) {
          emptyPositions.push({ row, col });
        }
      }
    }
    
    if (emptyPositions.length > 0) {
      const randomPosition = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
      newBoard[randomPosition.row][randomPosition.col] = BLOCKED_CELL;
    }
  }
  
  return newBoard;
};

// Shift all blocks one position each turn (for games ending with 7 or 8 after game 250)
export const shiftAllBlocks = (board: (0 | 1 | 2 | 3)[][]): (0 | 1 | 2 | 3)[][] => {
  const newBoard = board.map(row => [...row]);
  const blockedPositions: { row: number; col: number }[] = [];
  
  // Find all blocked cells
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (newBoard[row][col] === BLOCKED_CELL) {
        blockedPositions.push({ row, col });
      }
    }
  }
  
  // Clear all blocked cells first
  blockedPositions.forEach(({ row, col }) => {
    newBoard[row][col] = 0;
  });
  
  // Shift each block one position (rightward, wrapping to next row if needed)
  blockedPositions.forEach(({ row, col }) => {
    let newRow = row;
    let newCol = col + 1;
    
    // Wrap to next row if we go beyond the board
    if (newCol >= 10) {
      newRow = (row + 1) % 10;
      newCol = 0;
    }
    
    // Only place the block if the new position is empty
    if (newBoard[newRow][newCol] === 0) {
      newBoard[newRow][newCol] = BLOCKED_CELL;
    } else {
      // If the new position is occupied, find the next available position
      let foundPosition = false;
      for (let attempts = 0; attempts < 100 && !foundPosition; attempts++) {
        newCol++;
        if (newCol >= 10) {
          newRow = (newRow + 1) % 10;
          newCol = 0;
        }
        if (newBoard[newRow][newCol] === 0) {
          newBoard[newRow][newCol] = BLOCKED_CELL;
          foundPosition = true;
        }
      }
    }
  });
  
  return newBoard;
};

// Remove old pieces (both player 1 and player 2) that have been on the board for the specified number of turns
export const removeOldPieces = (board: (0 | 1 | 2 | 3)[][], pieceAges: number[][], turnsToLive: number): { board: (0 | 1 | 2 | 3)[][]; pieceAges: number[][] } => {
  const newBoard = board.map(row => [...row]);
  const newPieceAges = pieceAges.map(row => [...row]);
  
  // Collect all pieces with their positions and ages for FIFO removal
  const piecesToRemove: { row: number; col: number; age: number; player: number }[] = [];
  
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if ((newBoard[row][col] === 1 || newBoard[row][col] === 2) && newPieceAges[row][col] >= turnsToLive) {
        piecesToRemove.push({
          row,
          col,
          age: newPieceAges[row][col],
          player: newBoard[row][col] as 1 | 2
        });
      }
    }
  }
  
  // Sort by age (oldest first) and remove the oldest pieces
  piecesToRemove.sort((a, b) => b.age - a.age);
  
  // Remove the oldest pieces
  piecesToRemove.forEach(({ row, col }) => {
    newBoard[row][col] = 0; // Remove the piece
    newPieceAges[row][col] = 0; // Reset age
  });
  
  return { board: newBoard, pieceAges: newPieceAges };
};

// Age all pieces (both player 1 and player 2) by 1 turn
export const ageAllPieces = (board: (0 | 1 | 2 | 3)[][], pieceAges: number[][]): number[][] => {
  const newPieceAges = pieceAges.map(row => [...row]);
  
  // Increment age for all existing pieces (both player 1 and player 2)
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (board[row][col] === 1 || board[row][col] === 2) {
        // Increment age for existing pieces
        newPieceAges[row][col] = (newPieceAges[row][col] || 0) + 1;
      } else {
        newPieceAges[row][col] = 0; // Reset age for empty cells or blocks
      }
    }
  }
  
  return newPieceAges;
};

// Remove oldest pieces of a specific player based on move count
export const removeOldestPiecesOfPlayer = (board: (0 | 1 | 2 | 3)[][], pieceAges: number[][], player: 1 | 2, piecesToRemove: number = 1): { board: (0 | 1 | 2 | 3)[][]; pieceAges: number[][] } => {
  const newBoard = board.map(row => [...row]);
  const newPieceAges = pieceAges.map(row => [...row]);
  
  // Collect all pieces of the specified player with their positions and ages
  const playerPieces: { row: number; col: number; age: number }[] = [];
  
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (newBoard[row][col] === player) {
        playerPieces.push({
          row,
          col,
          age: newPieceAges[row][col]
        });
      }
    }
  }
  
  if (playerPieces.length === 0) {
    return { board: newBoard, pieceAges: newPieceAges };
  }
  
  // Sort by age (oldest first) and remove the oldest pieces
  playerPieces.sort((a, b) => b.age - a.age);
  
  // Remove the specified number of oldest pieces
  const piecesToActuallyRemove = Math.min(piecesToRemove, playerPieces.length);
  for (let i = 0; i < piecesToActuallyRemove; i++) {
    const { row, col } = playerPieces[i];
    newBoard[row][col] = 0; // Remove the piece
    newPieceAges[row][col] = 0; // Reset age
  }
  
  return { board: newBoard, pieceAges: newPieceAges };
};

// Remove pieces of a specific player that have reached a specific age
export const removePiecesByAge = (board: (0 | 1 | 2 | 3)[][], pieceAges: number[][], player: 1 | 2, targetAge: number): { board: (0 | 1 | 2 | 3)[][]; pieceAges: number[][] } => {
  const newBoard = board.map(row => [...row]);
  const newPieceAges = pieceAges.map(row => [...row]);
  
  // Find pieces of the specified player that have reached the target age
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (newBoard[row][col] === player && newPieceAges[row][col] === targetAge) {
        // Remove this piece
        newBoard[row][col] = 0;
        newPieceAges[row][col] = 0;
      }
    }
  }
  
  return { board: newBoard, pieceAges: newPieceAges };
};

// Initialize piece ages array
export const initializePieceAges = (): number[][] => {
  return Array(10).fill(null).map(() => Array(10).fill(0));
};

// Count total pieces on the board (excluding blocked cells)
export const countPiecesOnBoard = (board: (0 | 1 | 2 | 3)[][]): number => {
  let count = 0;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (board[row][col] === 1 || board[row][col] === 2) {
        count++;
      }
    }
  }
  return count;
};

// Remove oldest pieces when board capacity is exceeded (for multiples of 13 levels)
export const enforcePieceCapacity = (board: (0 | 1 | 2 | 3)[][], pieceAges: number[][], maxCapacity: number = 35): { board: (0 | 1 | 2 | 3)[][]; pieceAges: number[][] } => {
  const currentPieceCount = countPiecesOnBoard(board);
  
  if (currentPieceCount <= maxCapacity) {
    return { board, pieceAges };
  }
  
  const piecesToRemove = currentPieceCount - maxCapacity;
  
  // Collect all pieces with their positions and ages for FIFO removal
  const piecesToRemoveList: { row: number; col: number; age: number; player: number }[] = [];
  
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (board[row][col] === 1 || board[row][col] === 2) {
        piecesToRemoveList.push({
          row,
          col,
          age: pieceAges[row][col],
          player: board[row][col] as 1 | 2
        });
      }
    }
  }
  
  // Sort by age (oldest first) and remove the oldest pieces
  piecesToRemoveList.sort((a, b) => b.age - a.age);
  
  const newBoard = board.map(row => [...row]);
  const newPieceAges = pieceAges.map(row => [...row]);
  
  // Remove the oldest pieces
  for (let i = 0; i < piecesToRemove && i < piecesToRemoveList.length; i++) {
    const { row, col } = piecesToRemoveList[i];
    newBoard[row][col] = 0; // Remove the piece
    newPieceAges[row][col] = 0; // Reset age
  }
  
  return { board: newBoard, pieceAges: newPieceAges };
};

// Rearrange board while preserving all pieces and win conditions
export const rearrangeBoard = (board: (0 | 1 | 2 | 3)[][], pieceAges: number[][]): { board: (0 | 1 | 2 | 3)[][]; pieceAges: number[][] } => {
  const newBoard = Array(10).fill(null).map(() => Array(10).fill(0));
  const newPieceAges = Array(10).fill(null).map(() => Array(10).fill(0));
  
  // Collect all pieces with their positions and ages
  const pieces: { row: number; col: number; value: 1 | 2 | 3; age: number }[] = [];
  
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (board[row][col] !== 0) {
        pieces.push({
          row,
          col,
          value: board[row][col] as 1 | 2 | 3,
          age: pieceAges[row][col]
        });
      }
    }
  }
  
  // Shuffle the pieces array to randomize their positions
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  
  // Place pieces in new positions
  pieces.forEach((piece, index) => {
    const newRow = Math.floor(index / 10);
    const newCol = index % 10;
    newBoard[newRow][newCol] = piece.value;
    newPieceAges[newRow][newCol] = piece.age;
  });
  
  return { board: newBoard, pieceAges: newPieceAges };
};

// Swap AI pieces with human pieces for Game 50, Match 4/5
export const swapOpponentPiecePairs = (board: (0 | 1 | 2 | 3)[][], pieceAges: number[][]): { board: (0 | 1 | 2 | 3)[][]; pieceAges: number[][] } => {
  const newBoard = board.map(row => [...row]);
  const newPieceAges = pieceAges.map(row => [...row]);
  
  // Collect all pieces (player 1 and player 2) with their positions
  const player1Pieces: { row: number; col: number }[] = [];
  const player2Pieces: { row: number; col: number }[] = [];
  
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (newBoard[row][col] === 1) {
        player1Pieces.push({ row, col });
      } else if (newBoard[row][col] === 2) {
        player2Pieces.push({ row, col });
      }
    }
  }
  
  // Need at least 2 pieces from each player to swap
  if (player1Pieces.length < 2 || player2Pieces.length < 2) {
    return { board: newBoard, pieceAges: newPieceAges };
  }
  
  // Perform 2 swaps - each swap exchanges one AI piece with one human piece
  for (let swap = 0; swap < 2; swap++) {
    // Pick 1 random piece from player 1 (AI)
    const player1Index = Math.floor(Math.random() * player1Pieces.length);
    // Pick 1 random piece from player 2 (Human)
    const player2Index = Math.floor(Math.random() * player2Pieces.length);
    
    const player1Piece = player1Pieces[player1Index];
    const player2Piece = player2Pieces[player2Index];
    
    // Store the original values and ages
    const player1Value = newBoard[player1Piece.row][player1Piece.col];
    const player2Value = newBoard[player2Piece.row][player2Piece.col];
    const player1Age = newPieceAges[player1Piece.row][player1Piece.col];
    const player2Age = newPieceAges[player2Piece.row][player2Piece.col];
    
    // Swap the pieces: AI piece goes to human position, human piece goes to AI position
    newBoard[player1Piece.row][player1Piece.col] = player2Value; // Human piece in AI position
    newBoard[player2Piece.row][player2Piece.col] = player1Value; // AI piece in human position
    newPieceAges[player1Piece.row][player1Piece.col] = player2Age; // Human age in AI position
    newPieceAges[player2Piece.row][player2Piece.col] = player1Age; // AI age in human position
    
    // Remove the swapped pieces from the arrays to avoid double-swapping
    player1Pieces.splice(player1Index, 1);
    player2Pieces.splice(player2Index, 1);
    
    // Break if we don't have enough pieces for another swap
    if (player1Pieces.length === 0 || player2Pieces.length === 0) {
      break;
    }
  }
  
  return { board: newBoard, pieceAges: newPieceAges };
};

// Swap 3 random pairs of AI and human pieces for Game 1200+ Match 2/3
export const swapThreeOpponentPiecePairs = (board: (0 | 1 | 2 | 3)[][], pieceAges: number[][]): { board: (0 | 1 | 2 | 3)[][]; pieceAges: number[][] } => {
  const newBoard = board.map(row => [...row]);
  const newPieceAges = pieceAges.map(row => [...row]);
  
  // Collect all pieces (player 1 and player 2) with their positions
  const player1Pieces: { row: number; col: number }[] = [];
  const player2Pieces: { row: number; col: number }[] = [];
  
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (newBoard[row][col] === 1) {
        player1Pieces.push({ row, col });
      } else if (newBoard[row][col] === 2) {
        player2Pieces.push({ row, col });
      }
    }
  }
  
  // Need at least 3 pieces from each player to swap
  if (player1Pieces.length < 3 || player2Pieces.length < 3) {
    return { board: newBoard, pieceAges: newPieceAges };
  }
  
  // Perform 3 swaps - each swap exchanges one AI piece with one human piece
  for (let swap = 0; swap < 3; swap++) {
    // Pick 1 random piece from player 1 (AI)
    const player1Index = Math.floor(Math.random() * player1Pieces.length);
    // Pick 1 random piece from player 2 (Human)
    const player2Index = Math.floor(Math.random() * player2Pieces.length);
    
    const player1Piece = player1Pieces[player1Index];
    const player2Piece = player2Pieces[player2Index];
    
    // Store the original values and ages
    const player1Value = newBoard[player1Piece.row][player1Piece.col];
    const player2Value = newBoard[player2Piece.row][player2Piece.col];
    const player1Age = newPieceAges[player1Piece.row][player1Piece.col];
    const player2Age = newPieceAges[player2Piece.row][player2Piece.col];
    
    // Swap the pieces: AI piece goes to human position, human piece goes to AI position
    newBoard[player1Piece.row][player1Piece.col] = player2Value; // Human piece in AI position
    newBoard[player2Piece.row][player2Piece.col] = player1Value; // AI piece in human position
    newPieceAges[player1Piece.row][player1Piece.col] = player2Age; // Human age in AI position
    newPieceAges[player2Piece.row][player2Piece.col] = player1Age; // AI age in human position
    
    // Remove the swapped pieces from the arrays to avoid double-swapping
    player1Pieces.splice(player1Index, 1);
    player2Pieces.splice(player2Index, 1);
    
    // Break if we don't have enough pieces for another swap
    if (player1Pieces.length === 0 || player2Pieces.length === 0) {
      break;
    }
  }
  
  return { board: newBoard, pieceAges: newPieceAges };
};

// Generate mud zone positions for multiples of 200 games only
// This automatically excludes all other multiples of 10 (match system games) from having mud zones
export const generateMudZones = (gameNumber: number): { row: number; col: number }[] => {
  // Only multiples of 200 can have mud zones
  if (!isMultipleOf200(gameNumber)) {
    return []; // No mud zones except for multiples of 200
  }
  
  // Multiples of 200 (200, 400, 600, 800, 1000, etc.) get mud zones
  // All other multiples of 10 and 40 do NOT get mud zones
  
  const numMudZones = 5; // 5 for multiples of 200
  
  // Use game number as seed for consistent positioning per level
  const positions: { row: number; col: number }[] = [];
  const usedPositions = new Set<string>();
  
  // Generate positions using a simple pseudo-random algorithm based on game number
  let seed = gameNumber * 7; // Use different seed multiplier to avoid conflicts with blocked cells
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  
  while (positions.length < numMudZones) {
    const row = Math.floor(random() * 10);
    const col = Math.floor(random() * 10);
    const key = `${row},${col}`;
    
    if (!usedPositions.has(key)) {
      usedPositions.add(key);
      positions.push({ row, col });
    }
  }
  
  return positions;
};

// Check if a position is in a mud zone
export const isInMudZone = (row: number, col: number, mudZones: { row: number; col: number }[]): boolean => {
  return mudZones.some(zone => zone.row === row && zone.col === col);
};

// Process mud zone effects - reduce stuck turns and remove pieces that are no longer stuck
export const processMudZoneEffects = (stuckPieces: { [key: string]: number }): { [key: string]: number } => {
  const newStuckPieces: { [key: string]: number } = {};
  
  Object.entries(stuckPieces).forEach(([key, turnsRemaining]) => {
    if (turnsRemaining > 1) {
      newStuckPieces[key] = turnsRemaining - 1;
    }
    // If turnsRemaining === 1, the piece is no longer stuck, so we don't add it to newStuckPieces
  });
  
  return newStuckPieces;
};

// Generate blocked cell positions for different levels
export const generateBlockedCells = (gameNumber: number, currentMatch: number = 1): { row: number; col: number }[] => {
  const isMultipleOf5 = gameNumber % 5 === 0;
  const endsWith3 = gameNumber % 10 === 3;
  const endsWith4 = gameEndsWith4(gameNumber); // Use the updated function
  const endsWith5 = gameEndsWith5(gameNumber); // Use the updated function
  const endsWith7 = gameNumber % 10 === 7 && gameNumber >= 27; // Games ending with 7 show blocks starting from game 27
  const endsWith8 = gameNumber % 10 === 8 && gameNumber >= 38; // Games ending with 8 show blocks starting from game 38
  const endsWith9 = gameNumber % 10 === 9 && gameNumber >= 50; // Games ending with 9 show blocks starting from game 50
  const multipleOf10Match1From60 = isMultipleOf10Match1From60(gameNumber, currentMatch); // Multiples of 10 from game 60 in match 1/3
  
  if (!isMultipleOf5 && !endsWith3 && !endsWith4 && !endsWith5 && !endsWith7 && !endsWith8 && !endsWith9 && !multipleOf10Match1From60) {
    return []; // No blocked cells for regular levels
  }
  
  const numBlocks = endsWith3 ? 0 : // Games ending with 3 start with no blocks (progressive system)
                   endsWith4 ? 16 : 
                   endsWith5 ? 5 : 
                   endsWith7 ? 6 : 
                   endsWith8 ? 8 : 
                   endsWith9 ? 10 : // Games ending with 9 have 10 blocks
                   multipleOf10Match1From60 ? 5 : // Multiples of 10 from game 60 in match 1/3 have 5 blocks
                   (isMultipleOf5 ? 4 : 7); // 0 for ending with 3 (progressive), 16 for ending with 4, 5 for ending with 5, 6 for ending with 7, 8 for ending with 8, 4 for other multiples of 5, 7 for ending with 9
  
  // Use game number as seed for consistent positioning per level
  const positions: { row: number; col: number }[] = [];
  const usedPositions = new Set<string>();
  
  // Generate positions using a simple pseudo-random algorithm based on game number
  let seed = gameNumber;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  
  while (positions.length < numBlocks) {
    const row = Math.floor(random() * 10);
    const col = Math.floor(random() * 10);
    const key = `${row},${col}`;
    
    if (!usedPositions.has(key)) {
      usedPositions.add(key);
      positions.push({ row, col });
    }
  }
  
  return positions;
};

// Create board with blocked cells for specific game
export const createBoardWithBlocks = (gameNumber: number, isBlindPlay: boolean = false, currentMatch: number = 1): (0 | 1 | 2 | 3)[][] => {
  const board = Array(10).fill(null).map(() => Array(10).fill(0));
  
  // In blind play mode, don't add any blocks
  if (isBlindPlay) {
    return board;
  }
  
  const blockedCells = generateBlockedCells(gameNumber, currentMatch);
  
  blockedCells.forEach(({ row, col }) => {
    board[row][col] = BLOCKED_CELL;
  });
  
  return board;
};

export const getPlayerName = (player: 1 | 2): string => {
  return player === 1 ? 'Black' : 'Yellow';
};

export const getWinnerName = (winner: 1 | 2): string => {
  return getPlayerName(winner);
};

// Get time limit based on game level (following stage intervals of 200 games)
export const getTimeLimitForLevel = (gameNumber: number): number => {
  if (gameNumber >= 1 && gameNumber <= 200) {
    return 12; // The Whispering Egg: 12 seconds
  } else if (gameNumber >= 201 && gameNumber <= 400) {
    return 10; // Larva of Legends: 10 seconds
  } else if (gameNumber >= 401 && gameNumber <= 600) {
    return 9; // Chamber of Royal Nectar: 9 seconds
  } else if (gameNumber >= 601 && gameNumber <= 800) {
    return 8; // Silken Cocoon of Secrets: 8 seconds
  } else if (gameNumber >= 801 && gameNumber <= 1000) {
    return 7; // Dreams of the Pupa Realm: 7 seconds
  } else if (gameNumber >= 1001 && gameNumber <= 1200) {
    return 6; // Wings of Dawn: 6 seconds
  } else if (gameNumber >= 1201 && gameNumber <= 1400) {
    return 5; // Hive of Trials: 5 seconds
  } else if (gameNumber >= 1401 && gameNumber <= 1600) {
    return 4; // Trails of Golden Pollen: 4 seconds
  } else if (gameNumber >= 1601 && gameNumber <= 1800) {
    return 3; // Sentinel of the Hiveheart: 3 seconds
  } else if (gameNumber >= 1801 && gameNumber <= 2000) {
    return 2; // Crown of the Queen-Bee: 2 seconds
  } else {
    return 15; // Default: 15 seconds (for any levels beyond 2000)
  }
};

