// Adventure Game Logic - Obstacles and Special Features
// Ported from bee-five-web to match exact behavior

export const BLOCKED_CELL = 3; // Value representing a blocked cell

export type CellValue = 0 | 1 | 2 | 3; // 0 = empty, 1 = player, 2 = AI, 3 = blocked

// Helper functions for match-specific rules
export const isMultipleOf10Match1From60 = (gameNumber: number, currentMatch: number = 1): boolean => {
  return gameNumber >= 60 && 
         gameNumber % 10 === 0 && 
         gameNumber % 50 !== 0 && 
         currentMatch === 1;
};

// Check if a game number is a multiple of 10 (excluding multiples of 50) from game 210 in match 1/3 (for blind play after 15 moves)
export const isMultipleOf10Match1From210 = (gameNumber: number, currentMatch: number = 1): boolean => {
  return gameNumber >= 210 && 
         gameNumber % 10 === 0 && 
         gameNumber % 50 !== 0 && 
         currentMatch === 1;
};

// Check if a game number is a multiple of 10 (excluding multiples of 50) from game 810 in match 1/3 (for blind play after 13 moves)
export const isMultipleOf10Match1From810 = (gameNumber: number, currentMatch: number = 1): boolean => {
  return gameNumber >= 810 && 
         gameNumber % 10 === 0 && 
         gameNumber % 50 !== 0 && 
         currentMatch === 1;
};

// Check if a game number is a multiple of 10 (excluding multiples of 50) from game 1210 in match 1/3 (for blind play after 9 moves)
export const isMultipleOf10Match1From1210 = (gameNumber: number, currentMatch: number = 1): boolean => {
  return gameNumber >= 1210 && 
         gameNumber % 10 === 0 && 
         gameNumber % 50 !== 0 && 
         currentMatch === 1;
};

// Check if a game number is a multiple of 10 (excluding multiples of 50) from game 30 in match 2/3 (for piece swapping every 9 moves)
export const isMultipleOf10Match2From30 = (gameNumber: number, currentMatch: number = 2): boolean => {
  return gameNumber >= 30 && 
         gameNumber % 10 === 0 && 
         gameNumber % 50 !== 0 && 
         currentMatch === 2;
};

// Check if a game number is a multiple of 10 (excluding multiples of 50) from game 330 in match 2/3 (for piece swapping every 7 moves)
export const isMultipleOf10Match2From330 = (gameNumber: number, currentMatch: number = 2): boolean => {
  return gameNumber >= 330 && 
         gameNumber % 10 === 0 && 
         gameNumber % 50 !== 0 && 
         currentMatch === 2;
};

// Check if a game number is a multiple of 10 (excluding multiples of 50) from game 730 in match 2/3 (for piece swapping every 5 moves)
export const isMultipleOf10Match2From730 = (gameNumber: number, currentMatch: number = 2): boolean => {
  return gameNumber >= 730 && 
         gameNumber % 10 === 0 && 
         gameNumber % 50 !== 0 && 
         currentMatch === 2;
};

export const isMultipleOf50Match2 = (gameNumber: number, currentMatch: number = 2): boolean => {
  return gameNumber % 50 === 0 && currentMatch === 2;
};

// Generate blocked cell positions for different levels
export const generateBlockedCells = (gameNumber: number, currentMatch: number = 1): { row: number; col: number }[] => {
  const isMultipleOf5 = gameNumber % 5 === 0;
  const endsWith3 = gameNumber % 10 === 3;
  const endsWith4 = gameNumber % 10 === 4 && gameNumber >= 400;
  const endsWith5 = gameNumber % 10 === 5 && gameNumber >= 100;
  const endsWith7 = gameNumber % 10 === 7 && gameNumber >= 27;
  const endsWith8 = gameNumber % 10 === 8 && gameNumber >= 600;
  const endsWith9 = gameNumber % 10 === 9 && gameNumber >= 50;
  const multipleOf10Match1From60 = isMultipleOf10Match1From60(gameNumber, currentMatch);
  
  if (!isMultipleOf5 && !endsWith3 && !endsWith4 && !endsWith5 && !endsWith7 && !endsWith8 && !endsWith9 && !multipleOf10Match1From60) {
    return []; // No blocked cells for regular levels
  }
  
  const numBlocks = endsWith3 ? 0 : // Games ending with 3 start with no blocks (progressive system)
                   endsWith4 ? 16 : 
                   endsWith5 ? 5 : 
                   endsWith7 ? 6 : 
                   endsWith8 ? 8 : 
                   endsWith9 ? 10 :
                   multipleOf10Match1From60 ? 5 : // Multiples of 10 from game 60 in match 1/3 have 5 blocks
                   (isMultipleOf5 ? 4 : 0);
  
  // Use game number as seed for consistent positioning per level
  const positions: { row: number; col: number }[] = [];
  const usedPositions = new Set<string>();
  
  // Generate positions using a simple pseudo-random algorithm based on game number (matching bee-five-web)
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

// Create board with blocked cells
export const createBoardWithBlocks = (gameNumber: number, isBlindPlay: boolean = false, currentMatch: number = 1): CellValue[][] => {
  const board: CellValue[][] = Array(10).fill(null).map(() => Array(10).fill(0));
  
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

// Generate mud zones (for multiples of 200)
export const generateMudZones = (gameNumber: number): { row: number; col: number }[] => {
  if (gameNumber % 200 !== 0) {
    return [];
  }
  
  const positions: { row: number; col: number }[] = [];
  const usedPositions = new Set<string>();
  
  // Use game number as seed for consistent positioning (matching bee-five-web)
  let seed = gameNumber;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  
  // Generate 5 mud zones
  while (positions.length < 5) {
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

// Get progressive blocking rules for games ending with 3
export const getProgressiveBlockRules = (gameNumber: number): { blocksToAdd: number; movesInterval: number } => {
  if (gameNumber >= 50 && gameNumber <= 200) {
    return { blocksToAdd: 1, movesInterval: 5 };
  } else if (gameNumber >= 201 && gameNumber <= 399) {
    return { blocksToAdd: 1, movesInterval: 4 };
  } else if (gameNumber >= 400 && gameNumber <= 599) {
    return { blocksToAdd: 2, movesInterval: 5 };
  } else if (gameNumber >= 600 && gameNumber <= 799) {
    return { blocksToAdd: 2, movesInterval: 4 };
  } else if (gameNumber >= 800) {
    return { blocksToAdd: 2, movesInterval: 3 };
  }
  return { blocksToAdd: 0, movesInterval: 0 };
};

// Add progressive blocks to the board
export const addProgressiveBlocks = (board: CellValue[][], blocksToAdd: number): CellValue[][] => {
  const newBoard = board.map(row => [...row]);
  const emptyPositions: { row: number; col: number }[] = [];
  
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (newBoard[row][col] === 0) {
        emptyPositions.push({ row, col });
      }
    }
  }
  
  const blocksToPlace = Math.min(blocksToAdd, emptyPositions.length);
  for (let i = 0; i < blocksToPlace; i++) {
    const randomIndex = Math.floor(Math.random() * emptyPositions.length);
    const { row, col } = emptyPositions[randomIndex];
    newBoard[row][col] = BLOCKED_CELL;
    emptyPositions.splice(randomIndex, 1);
  }
  
  return newBoard;
};

// Remove 2 blocked cells (for games ending with 4)
export const removeTwoBlockedCells = (board: CellValue[][]): CellValue[][] => {
  const newBoard = board.map(row => [...row]);
  const blockedPositions: { row: number; col: number }[] = [];
  
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (newBoard[row][col] === BLOCKED_CELL) {
        blockedPositions.push({ row, col });
      }
    }
  }
  
  const cellsToRemove = Math.min(2, blockedPositions.length);
  for (let i = 0; i < cellsToRemove; i++) {
    const randomIndex = Math.floor(Math.random() * blockedPositions.length);
    const { row, col } = blockedPositions[randomIndex];
    newBoard[row][col] = 0;
    blockedPositions.splice(randomIndex, 1);
  }
  
  return newBoard;
};

// Shift all blocks one position (for games ending with 7 or 8)
export const shiftAllBlocks = (board: CellValue[][]): CellValue[][] => {
  const newBoard = board.map(row => [...row]);
  const blockedPositions: { row: number; col: number }[] = [];
  
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
    
    if (newCol >= 10) {
      newRow = (row + 1) % 10;
      newCol = 0;
    }
    
    if (newBoard[newRow][newCol] === 0) {
      newBoard[newRow][newCol] = BLOCKED_CELL;
    } else {
      // Find next available position
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

// Check win condition (accounting for blocked cells)
export const checkWinCondition = (board: CellValue[][], row: number, col: number, player: 1 | 2): boolean => {
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal \
    [1, -1]   // diagonal /
  ];

  for (const [dx, dy] of directions) {
    let count = 1;

    // Check in positive direction
    for (let i = 1; i < 5; i++) {
      const newRow = row + i * dx;
      const newCol = col + i * dy;
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
        count++;
      } else {
        break;
      }
    }

    // Check in negative direction
    for (let i = 1; i < 5; i++) {
      const newRow = row - i * dx;
      const newCol = col - i * dy;
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
        count++;
      } else {
        break;
      }
    }

    if (count >= 5) {
      return true;
    }
  }

  return false;
};

// Check if game ends with specific patterns
export const gameEndsWith3 = (gameNumber: number): boolean => {
  return gameNumber % 10 === 3 && gameNumber > 50;
};

export const gameEndsWith4 = (gameNumber: number): boolean => {
  return gameNumber % 10 === 4 && gameNumber >= 400;
};

export const gameEndsWith7After250 = (gameNumber: number): boolean => {
  return gameNumber % 10 === 7 && gameNumber > 250;
};

export const gameEndsWith8After600 = (gameNumber: number): boolean => {
  return gameNumber % 10 === 8 && gameNumber > 600;
};

// Check if game number is a multiple of 7 between 500-1000 (for disappearing pieces)
export const isMultipleOf7Between500And1000 = (gameNumber: number): boolean => {
  return gameNumber >= 500 && gameNumber <= 1000 && gameNumber % 7 === 0;
};

// Check if game number is a multiple of 4 from game 1000 onwards (for disappearing pieces)
export const isMultipleOf4From1000 = (gameNumber: number): boolean => {
  return gameNumber >= 1000 && gameNumber % 4 === 0;
};

// Check if game number is a multiple of 17 (for piece capacity)
export const isMultipleOf17 = (gameNumber: number): boolean => {
  return gameNumber % 17 === 0;
};

// Check if game is multiple of 50 match 3 (for board rearrangement)
export const isMultipleOf50Match3 = (gameNumber: number, currentMatch: number = 3): boolean => {
  return gameNumber % 50 === 0 && currentMatch === 3;
};

// Check if game is multiple of 50 match 4 (for piece swapping)
export const isMultipleOf50Match4 = (gameNumber: number, currentMatch: number = 4): boolean => {
  return gameNumber % 50 === 0 && currentMatch === 4;
};

// Initialize piece ages array
export const initializePieceAges = (): number[][] => {
  return Array(10).fill(null).map(() => Array(10).fill(0));
};

// Age all pieces by 1 turn
export const ageAllPieces = (board: CellValue[][], pieceAges: number[][]): number[][] => {
  const newPieceAges = pieceAges.map(row => [...row]);
  
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (board[row][col] === 1 || board[row][col] === 2) {
        newPieceAges[row][col] = (newPieceAges[row][col] || 0) + 1;
      } else {
        newPieceAges[row][col] = 0;
      }
    }
  }
  
  return newPieceAges;
};

// Count total pieces on the board (excluding blocked cells)
export const countPiecesOnBoard = (board: CellValue[][]): number => {
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

// Remove oldest pieces of a specific player
export const removeOldestPiecesOfPlayer = (
  board: CellValue[][],
  pieceAges: number[][],
  player: 1 | 2,
  piecesToRemove: number = 1
): { board: CellValue[][]; pieceAges: number[][] } => {
  const newBoard = board.map(row => [...row]);
  const newPieceAges = pieceAges.map(row => [...row]);
  
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
  
  // Sort by age (oldest first)
  playerPieces.sort((a, b) => b.age - a.age);
  
  // Remove the specified number of oldest pieces
  const piecesToActuallyRemove = Math.min(piecesToRemove, playerPieces.length);
  for (let i = 0; i < piecesToActuallyRemove; i++) {
    const { row, col } = playerPieces[i];
    newBoard[row][col] = 0;
    newPieceAges[row][col] = 0;
  }
  
  return { board: newBoard, pieceAges: newPieceAges };
};

// Enforce piece capacity limit (remove oldest pieces when capacity exceeded)
export const enforcePieceCapacity = (
  board: CellValue[][],
  pieceAges: number[][],
  maxCapacity: number = 35
): { board: CellValue[][]; pieceAges: number[][] } => {
  const currentPieceCount = countPiecesOnBoard(board);
  
  if (currentPieceCount <= maxCapacity) {
    return { board, pieceAges };
  }
  
  const piecesToRemove = currentPieceCount - maxCapacity;
  
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
  
  // Sort by age (oldest first)
  piecesToRemoveList.sort((a, b) => b.age - a.age);
  
  const newBoard = board.map(row => [...row]);
  const newPieceAges = pieceAges.map(row => [...row]);
  
  // Remove the oldest pieces
  for (let i = 0; i < piecesToRemove && i < piecesToRemoveList.length; i++) {
    const { row, col } = piecesToRemoveList[i];
    newBoard[row][col] = 0;
    newPieceAges[row][col] = 0;
  }
  
  return { board: newBoard, pieceAges: newPieceAges };
};

// Rearrange board while preserving all pieces
export const rearrangeBoard = (
  board: CellValue[][],
  pieceAges: number[][]
): { board: CellValue[][]; pieceAges: number[][] } => {
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

// Swap opponent piece pairs (for multiples of 50, match 4)
export const swapOpponentPiecePairs = (
  board: CellValue[][],
  pieceAges: number[][]
): { board: CellValue[][]; pieceAges: number[][] } => {
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
  
  // Need at least 1 piece from each player to swap
  if (player1Pieces.length < 1 || player2Pieces.length < 1) {
    return { board: newBoard, pieceAges: newPieceAges };
  }
  
  // Perform 1 swap - exchange one AI piece with one human piece
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
  newBoard[player1Piece.row][player1Piece.col] = player2Value;
  newBoard[player2Piece.row][player2Piece.col] = player1Value;
  newPieceAges[player1Piece.row][player1Piece.col] = player2Age;
  newPieceAges[player2Piece.row][player2Piece.col] = player1Age;
  
  return { board: newBoard, pieceAges: newPieceAges };
};

// Swap all pieces between player 1 and player 2 (for multiples of 10 match 1 from game 60)
// All player 1 pieces (black) become player 2 pieces (yellow), and vice versa
export const swapAllPieces = (
  board: CellValue[][],
  pieceAges: number[][]
): { board: CellValue[][]; pieceAges: number[][] } => {
  const newBoard = board.map(row => [...row]);
  const newPieceAges = pieceAges.map(row => [...row]);
  
  // Swap all pieces: 1 becomes 2, 2 becomes 1
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (newBoard[row][col] === 1) {
        newBoard[row][col] = 2;
      } else if (newBoard[row][col] === 2) {
        newBoard[row][col] = 1;
      }
      // Empty cells (0) and blocked cells (3) remain unchanged
    }
  }
  
  // Piece ages remain the same (they stay with their positions)
  // No need to swap ages since pieces are swapped in place
  
  return { board: newBoard, pieceAges: newPieceAges };
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

// Check how valuable a position is for blocking a specific player
const checkBlockingValue = (board: CellValue[][], row: number, col: number, player: 1 | 2): number => {
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
const checkProximityValue = (board: CellValue[][], row: number, col: number, player: 1 | 2): number => {
  let value = 0;
  
  // Check in a 5x5 area around the position
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

// Find strategic blocking position based on human player's moves
export const findStrategicBlockPosition = (board: CellValue[][]): { row: number; col: number } | null => {
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

// Add strategic block based on human player's move patterns
export const addStrategicBlock = (board: CellValue[][]): CellValue[][] => {
  const newBoard = board.map(row => [...row]);
  const blockPosition = findStrategicBlockPosition(newBoard);
  
  if (blockPosition) {
    newBoard[blockPosition.row][blockPosition.col] = BLOCKED_CELL;
  }
  
  return newBoard;
};

// Move one random block to a strategic position to block the human player (for games ending with 9 from game 400)
export const moveRandomBlockToStrategicPosition = (board: CellValue[][]): CellValue[][] => {
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

