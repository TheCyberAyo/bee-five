// Adventure Game Logic - Obstacles and Special Features
// Ported from BeefiveApp/src/utils/adventureGameLogic.ts

import 'dart:math' as math;

const int blockedCell = 3; // Value representing a blocked cell
// CellValue: 0 = empty, 1 = player, 2 = AI, 3 = blocked

// Helper functions for match-specific rules
bool isMultipleOf10Match1From60(int gameNumber, [int currentMatch = 1]) {
  return gameNumber >= 60 && 
         gameNumber % 10 == 0 && 
         gameNumber % 50 != 0 && 
         currentMatch == 1;
}

bool isMultipleOf10Match1From210(int gameNumber, [int currentMatch = 1]) {
  return gameNumber >= 210 && 
         gameNumber % 10 == 0 && 
         gameNumber % 50 != 0 && 
         currentMatch == 1;
}

bool isMultipleOf10Match1From810(int gameNumber, [int currentMatch = 1]) {
  return gameNumber >= 810 && 
         gameNumber % 10 == 0 && 
         gameNumber % 50 != 0 && 
         currentMatch == 1;
}

bool isMultipleOf10Match1From1210(int gameNumber, [int currentMatch = 1]) {
  return gameNumber >= 1210 && 
         gameNumber % 10 == 0 && 
         gameNumber % 50 != 0 && 
         currentMatch == 1;
}

bool isMultipleOf10Match2From30(int gameNumber, [int currentMatch = 2]) {
  return gameNumber >= 30 && 
         gameNumber % 10 == 0 && 
         gameNumber % 50 != 0 && 
         currentMatch == 2;
}

bool isMultipleOf10Match2From330(int gameNumber, [int currentMatch = 2]) {
  return gameNumber >= 330 && 
         gameNumber % 10 == 0 && 
         gameNumber % 50 != 0 && 
         currentMatch == 2;
}

bool isMultipleOf10Match2From730(int gameNumber, [int currentMatch = 2]) {
  return gameNumber >= 730 && 
         gameNumber % 10 == 0 && 
         gameNumber % 50 != 0 && 
         currentMatch == 2;
}

bool isMultipleOf50Match2(int gameNumber, [int currentMatch = 2]) {
  return gameNumber % 50 == 0 && currentMatch == 2;
}

// Generate blocked cell positions for different levels
List<Map<String, int>> generateBlockedCells(int gameNumber, [int currentMatch = 1]) {
  final isMultipleOf5 = gameNumber % 5 == 0;
  final endsWith3 = gameNumber % 10 == 3;
  final endsWith4 = gameNumber % 10 == 4 && gameNumber >= 400;
  final endsWith5 = gameNumber % 10 == 5 && gameNumber >= 100;
  final endsWith7 = gameNumber % 10 == 7 && gameNumber >= 27;
  final endsWith8 = gameNumber % 10 == 8 && gameNumber >= 600;
  final endsWith9 = gameNumber % 10 == 9 && gameNumber >= 50;
  final multipleOf10Match1From60 = isMultipleOf10Match1From60(gameNumber, currentMatch);
  
  if (!isMultipleOf5 && !endsWith3 && !endsWith4 && !endsWith5 && !endsWith7 && !endsWith8 && !endsWith9 && !multipleOf10Match1From60) {
    return []; // No blocked cells for regular levels
  }
  
  final numBlocks = endsWith3 ? 0 : // Games ending with 3 start with no blocks (progressive system)
                   endsWith4 ? 16 : 
                   endsWith5 ? 5 : 
                   endsWith7 ? 6 : 
                   endsWith8 ? 8 : 
                   endsWith9 ? 10 :
                   multipleOf10Match1From60 ? 5 : // Multiples of 10 from game 60 in match 1/3 have 5 blocks
                   (isMultipleOf5 ? 4 : 0);
  
  // Use game number as seed for consistent positioning per level
  final positions = <Map<String, int>>[];
  final usedPositions = <String>{};
  
  // Generate positions using a simple pseudo-random algorithm based on game number (matching bee-five-web)
  int seed = gameNumber;
  double random() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  
  while (positions.length < numBlocks) {
    final row = (random() * 10).floor();
    final col = (random() * 10).floor();
    final key = '$row,$col';
    
    if (!usedPositions.contains(key)) {
      usedPositions.add(key);
      positions.add({'row': row, 'col': col});
    }
  }
  
  return positions;
}

// Create board with blocked cells
List<List<int>> createBoardWithBlocks(int gameNumber, [bool isBlindPlay = false, int currentMatch = 1]) {
  final board = List.generate(10, (_) => List.generate(10, (_) => 0));
  
  // In blind play mode, don't add any blocks
  if (isBlindPlay) {
    return board;
  }
  
  final blockedCells = generateBlockedCells(gameNumber, currentMatch);
  for (final cell in blockedCells) {
    board[cell['row']!][cell['col']!] = blockedCell;
  }
  
  return board;
}

// Generate mud zones (for multiples of 200)
List<Map<String, int>> generateMudZones(int gameNumber) {
  if (gameNumber % 200 != 0) {
    return [];
  }
  
  final positions = <Map<String, int>>[];
  final usedPositions = <String>{};
  
  // Use game number as seed for consistent positioning (matching bee-five-web)
  int seed = gameNumber;
  double random() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  
  // Generate 5 mud zones
  while (positions.length < 5) {
    final row = (random() * 10).floor();
    final col = (random() * 10).floor();
    final key = '$row,$col';
    
    if (!usedPositions.contains(key)) {
      usedPositions.add(key);
      positions.add({'row': row, 'col': col});
    }
  }
  
  return positions;
}

// Check if a position is in a mud zone
bool isInMudZone(int row, int col, List<Map<String, int>> mudZones) {
  return mudZones.any((zone) => zone['row'] == row && zone['col'] == col);
}

// Get progressive blocking rules for games ending with 3
Map<String, int> getProgressiveBlockRules(int gameNumber) {
  if (gameNumber >= 50 && gameNumber <= 200) {
    return {'blocksToAdd': 1, 'movesInterval': 5};
  } else if (gameNumber >= 201 && gameNumber <= 399) {
    return {'blocksToAdd': 1, 'movesInterval': 4};
  } else if (gameNumber >= 400 && gameNumber <= 599) {
    return {'blocksToAdd': 2, 'movesInterval': 5};
  } else if (gameNumber >= 600 && gameNumber <= 799) {
    return {'blocksToAdd': 2, 'movesInterval': 4};
  } else if (gameNumber >= 800) {
    return {'blocksToAdd': 2, 'movesInterval': 3};
  }
  return {'blocksToAdd': 0, 'movesInterval': 0};
}

// Add progressive blocks to the board
List<List<int>> addProgressiveBlocks(List<List<int>> board, int blocksToAdd) {
  final newBoard = board.map((row) => List<int>.from(row)).toList();
  final emptyPositions = <Map<String, int>>[];
  
  for (int row = 0; row < 10; row++) {
    for (int col = 0; col < 10; col++) {
      if (newBoard[row][col] == 0) {
        emptyPositions.add({'row': row, 'col': col});
      }
    }
  }
  
  final blocksToPlace = math.min(blocksToAdd, emptyPositions.length);
  final random = math.Random();
  for (int i = 0; i < blocksToPlace; i++) {
    final randomIndex = random.nextInt(emptyPositions.length);
    final cell = emptyPositions[randomIndex];
    newBoard[cell['row']!][cell['col']!] = blockedCell;
    emptyPositions.removeAt(randomIndex);
  }
  
  return newBoard;
}

// Remove 2 blocked cells (for games ending with 4)
List<List<int>> removeTwoBlockedCells(List<List<int>> board) {
  final newBoard = board.map((row) => List<int>.from(row)).toList();
  final blockedPositions = <Map<String, int>>[];
  
  for (int row = 0; row < 10; row++) {
    for (int col = 0; col < 10; col++) {
      if (newBoard[row][col] == blockedCell) {
        blockedPositions.add({'row': row, 'col': col});
      }
    }
  }
  
  final cellsToRemove = math.min(2, blockedPositions.length);
  final random = math.Random();
  for (int i = 0; i < cellsToRemove; i++) {
    final randomIndex = random.nextInt(blockedPositions.length);
    final cell = blockedPositions[randomIndex];
    newBoard[cell['row']!][cell['col']!] = 0;
    blockedPositions.removeAt(randomIndex);
  }
  
  return newBoard;
}

// Shift all blocks one position (for games ending with 7 or 8)
List<List<int>> shiftAllBlocks(List<List<int>> board) {
  final newBoard = board.map((row) => List<int>.from(row)).toList();
  final blockedPositions = <Map<String, int>>[];
  
  for (int row = 0; row < 10; row++) {
    for (int col = 0; col < 10; col++) {
      if (newBoard[row][col] == blockedCell) {
        blockedPositions.add({'row': row, 'col': col});
      }
    }
  }
  
  // Clear all blocked cells first
  for (final cell in blockedPositions) {
    newBoard[cell['row']!][cell['col']!] = 0;
  }
  
  // Shift each block one position (rightward, wrapping to next row if needed)
  for (final cell in blockedPositions) {
    int newRow = cell['row']!;
    int newCol = cell['col']! + 1;
    
    if (newCol >= 10) {
      newRow = (newRow + 1) % 10;
      newCol = 0;
    }
    
    if (newBoard[newRow][newCol] == 0) {
      newBoard[newRow][newCol] = blockedCell;
    } else {
      // Find next available position
      bool foundPosition = false;
      for (int attempts = 0; attempts < 100 && !foundPosition; attempts++) {
        newCol++;
        if (newCol >= 10) {
          newRow = (newRow + 1) % 10;
          newCol = 0;
        }
        if (newBoard[newRow][newCol] == 0) {
          newBoard[newRow][newCol] = blockedCell;
          foundPosition = true;
        }
      }
    }
  }
  
  return newBoard;
}

// Get winning pieces for highlighting
List<List<int>> getWinningPieces(List<List<int>> board, int row, int col, int player) {
  final directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal \
    [1, -1]   // diagonal /
  ];

  for (final direction in directions) {
    final winningPieces = <List<int>>[];
    final dx = direction[0];
    final dy = direction[1];
    
    // Start with the current piece
    winningPieces.add([row, col]);

    // Check in positive direction
    for (int i = 1; i < 5; i++) {
      final newRow = row + i * dx;
      final newCol = col + i * dy;
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] == player) {
        winningPieces.add([newRow, newCol]);
      } else {
        break;
      }
    }

    // Check in negative direction
    for (int i = 1; i < 5; i++) {
      final newRow = row - i * dx;
      final newCol = col - i * dy;
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] == player) {
        winningPieces.insert(0, [newRow, newCol]);
      } else {
        break;
      }
    }

    if (winningPieces.length >= 5) {
      return winningPieces;
    }
  }

  return [];
}

// Check win condition (accounting for blocked cells)
bool checkWinCondition(List<List<int>> board, int row, int col, int player) {
  final directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal \
    [1, -1]   // diagonal /
  ];

  for (final direction in directions) {
    int count = 1;
    final dx = direction[0];
    final dy = direction[1];

    // Check in positive direction
    for (int i = 1; i < 5; i++) {
      final newRow = row + i * dx;
      final newCol = col + i * dy;
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] == player) {
        count++;
      } else {
        break;
      }
    }

    // Check in negative direction
    for (int i = 1; i < 5; i++) {
      final newRow = row - i * dx;
      final newCol = col - i * dy;
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] == player) {
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
}

// Check if game ends with specific patterns
bool gameEndsWith3(int gameNumber) {
  return gameNumber % 10 == 3 && gameNumber > 50;
}

bool gameEndsWith4(int gameNumber) {
  return gameNumber % 10 == 4 && gameNumber >= 400;
}

bool gameEndsWith7After250(int gameNumber) {
  return gameNumber % 10 == 7 && gameNumber > 250;
}

bool gameEndsWith8After600(int gameNumber) {
  return gameNumber % 10 == 8 && gameNumber > 600;
}

// Check if game number is a multiple of 7 between 500-1000 (for disappearing pieces)
bool isMultipleOf7Between500And1000(int gameNumber) {
  return gameNumber >= 500 && gameNumber <= 1000 && gameNumber % 7 == 0;
}

// Check if game number is a multiple of 4 from game 1000 onwards (for disappearing pieces)
bool isMultipleOf4From1000(int gameNumber) {
  return gameNumber >= 1000 && gameNumber % 4 == 0;
}

// Check if game number is a multiple of 17 (for piece capacity)
bool isMultipleOf17(int gameNumber) {
  return gameNumber % 17 == 0;
}

// Check if game is multiple of 50 match 3 (for board rearrangement)
bool isMultipleOf50Match3(int gameNumber, [int currentMatch = 3]) {
  return gameNumber % 50 == 0 && currentMatch == 3;
}

// Check if game is multiple of 50 match 4 (for piece swapping)
bool isMultipleOf50Match4(int gameNumber, [int currentMatch = 4]) {
  return gameNumber % 50 == 0 && currentMatch == 4;
}

// Initialize piece ages array
List<List<int>> initializePieceAges() {
  return List.generate(10, (_) => List.generate(10, (_) => 0));
}

// Age all pieces by 1 turn
List<List<int>> ageAllPieces(List<List<int>> board, List<List<int>> pieceAges) {
  final newPieceAges = pieceAges.map((row) => List<int>.from(row)).toList();
  
  for (int row = 0; row < 10; row++) {
    for (int col = 0; col < 10; col++) {
      if (board[row][col] == 1 || board[row][col] == 2) {
        newPieceAges[row][col] = (newPieceAges[row][col]) + 1;
      } else {
        newPieceAges[row][col] = 0;
      }
    }
  }
  
  return newPieceAges;
}

// Count total pieces on the board (excluding blocked cells)
int countPiecesOnBoard(List<List<int>> board) {
  int count = 0;
  for (int row = 0; row < 10; row++) {
    for (int col = 0; col < 10; col++) {
      if (board[row][col] == 1 || board[row][col] == 2) {
        count++;
      }
    }
  }
  return count;
}

// Remove oldest pieces of a specific player
Map<String, dynamic> removeOldestPiecesOfPlayer(
  List<List<int>> board,
  List<List<int>> pieceAges,
  int player,
  [int piecesToRemove = 1]
) {
  final newBoard = board.map((row) => List<int>.from(row)).toList();
  final newPieceAges = pieceAges.map((row) => List<int>.from(row)).toList();
  
  final playerPieces = <Map<String, int>>[];
  
  for (int row = 0; row < 10; row++) {
    for (int col = 0; col < 10; col++) {
      if (newBoard[row][col] == player) {
        playerPieces.add({
          'row': row,
          'col': col,
          'age': newPieceAges[row][col]
        });
      }
    }
  }
  
  if (playerPieces.isEmpty) {
    return {'board': newBoard, 'pieceAges': newPieceAges};
  }
  
  // Sort by age (oldest first)
  playerPieces.sort((a, b) => b['age']!.compareTo(a['age']!));
  
  // Remove the specified number of oldest pieces
  final piecesToActuallyRemove = math.min(piecesToRemove, playerPieces.length);
  for (int i = 0; i < piecesToActuallyRemove; i++) {
    final cell = playerPieces[i];
    newBoard[cell['row']!][cell['col']!] = 0;
    newPieceAges[cell['row']!][cell['col']!] = 0;
  }
  
  return {'board': newBoard, 'pieceAges': newPieceAges};
}

// Enforce piece capacity limit (remove oldest pieces when capacity exceeded)
Map<String, dynamic> enforcePieceCapacity(
  List<List<int>> board,
  List<List<int>> pieceAges,
  [int maxCapacity = 35]
) {
  final currentPieceCount = countPiecesOnBoard(board);
  
  if (currentPieceCount <= maxCapacity) {
    return {'board': board, 'pieceAges': pieceAges};
  }
  
  final piecesToRemove = currentPieceCount - maxCapacity;
  
  final piecesToRemoveList = <Map<String, int>>[];
  
  for (int row = 0; row < 10; row++) {
    for (int col = 0; col < 10; col++) {
      if (board[row][col] == 1 || board[row][col] == 2) {
        piecesToRemoveList.add({
          'row': row,
          'col': col,
          'age': pieceAges[row][col],
          'player': board[row][col]
        });
      }
    }
  }
  
  // Sort by age (oldest first)
  piecesToRemoveList.sort((a, b) => b['age']!.compareTo(a['age']!));
  
  final newBoard = board.map((row) => List<int>.from(row)).toList();
  final newPieceAges = pieceAges.map((row) => List<int>.from(row)).toList();
  
  // Remove the oldest pieces
  for (int i = 0; i < piecesToRemove && i < piecesToRemoveList.length; i++) {
    final cell = piecesToRemoveList[i];
    newBoard[cell['row']!][cell['col']!] = 0;
    newPieceAges[cell['row']!][cell['col']!] = 0;
  }
  
  return {'board': newBoard, 'pieceAges': newPieceAges};
}

// Rearrange board while preserving all pieces
Map<String, dynamic> rearrangeBoard(
  List<List<int>> board,
  List<List<int>> pieceAges
) {
  final newBoard = List.generate(10, (_) => List.generate(10, (_) => 0));
  final newPieceAges = List.generate(10, (_) => List.generate(10, (_) => 0));
  
  // Collect all pieces with their positions and ages
  final pieces = <Map<String, int>>[];
  
  for (int row = 0; row < 10; row++) {
    for (int col = 0; col < 10; col++) {
      if (board[row][col] != 0) {
        pieces.add({
          'row': row,
          'col': col,
          'value': board[row][col],
          'age': pieceAges[row][col]
        });
      }
    }
  }
  
  // Shuffle the pieces array to randomize their positions
  final random = math.Random();
  for (int i = pieces.length - 1; i > 0; i--) {
    final j = random.nextInt(i + 1);
    final temp = pieces[i];
    pieces[i] = pieces[j];
    pieces[j] = temp;
  }
  
  // Place pieces in new positions
  for (int index = 0; index < pieces.length; index++) {
    final piece = pieces[index];
    final newRow = (index / 10).floor();
    final newCol = index % 10;
    newBoard[newRow][newCol] = piece['value']!;
    newPieceAges[newRow][newCol] = piece['age']!;
  }
  
  return {'board': newBoard, 'pieceAges': newPieceAges};
}

// Swap opponent piece pairs (for multiples of 50, match 4)
Map<String, dynamic> swapOpponentPiecePairs(
  List<List<int>> board,
  List<List<int>> pieceAges
) {
  final newBoard = board.map((row) => List<int>.from(row)).toList();
  final newPieceAges = pieceAges.map((row) => List<int>.from(row)).toList();
  
  // Collect all pieces (player 1 and player 2) with their positions
  final player1Pieces = <Map<String, int>>[];
  final player2Pieces = <Map<String, int>>[];
  
  for (int row = 0; row < 10; row++) {
    for (int col = 0; col < 10; col++) {
      if (newBoard[row][col] == 1) {
        player1Pieces.add({'row': row, 'col': col});
      } else if (newBoard[row][col] == 2) {
        player2Pieces.add({'row': row, 'col': col});
      }
    }
  }
  
  // Need at least 1 piece from each player to swap
  if (player1Pieces.isEmpty || player2Pieces.isEmpty) {
    return {'board': newBoard, 'pieceAges': newPieceAges};
  }
  
  // Perform 1 swap - exchange one AI piece with one human piece
  final random = math.Random();
  final player1Index = random.nextInt(player1Pieces.length);
  final player2Index = random.nextInt(player2Pieces.length);
  
  final player1Piece = player1Pieces[player1Index];
  final player2Piece = player2Pieces[player2Index];
  
  // Store the original values and ages
  final player1Value = newBoard[player1Piece['row']!][player1Piece['col']!];
  final player2Value = newBoard[player2Piece['row']!][player2Piece['col']!];
  final player1Age = newPieceAges[player1Piece['row']!][player1Piece['col']!];
  final player2Age = newPieceAges[player2Piece['row']!][player2Piece['col']!];
  
  // Swap the pieces: AI piece goes to human position, human piece goes to AI position
  newBoard[player1Piece['row']!][player1Piece['col']!] = player2Value;
  newBoard[player2Piece['row']!][player2Piece['col']!] = player1Value;
  newPieceAges[player1Piece['row']!][player1Piece['col']!] = player2Age;
  newPieceAges[player2Piece['row']!][player2Piece['col']!] = player1Age;
  
  return {'board': newBoard, 'pieceAges': newPieceAges};
}

// Swap all pieces between player 1 and player 2 (for multiples of 10 match 1 from game 60)
// All player 1 pieces (black) become player 2 pieces (yellow), and vice versa
Map<String, dynamic> swapAllPieces(
  List<List<int>> board,
  List<List<int>> pieceAges
) {
  final newBoard = board.map((row) => List<int>.from(row)).toList();
  final newPieceAges = pieceAges.map((row) => List<int>.from(row)).toList();
  
  // Swap all pieces: 1 becomes 2, 2 becomes 1
  for (int row = 0; row < 10; row++) {
    for (int col = 0; col < 10; col++) {
      if (newBoard[row][col] == 1) {
        newBoard[row][col] = 2;
      } else if (newBoard[row][col] == 2) {
        newBoard[row][col] = 1;
      }
      // Empty cells (0) and blocked cells (3) remain unchanged
    }
  }
  
  // Piece ages remain the same (they stay with their positions)
  // No need to swap ages since pieces are swapped in place
  
  return {'board': newBoard, 'pieceAges': newPieceAges};
}

// Check if a game number ends with 1 and is in the specified ranges (500-700, 1001-1591)
bool gameEndsWith1InSpecifiedRanges(int gameNumber) {
  if (gameNumber % 10 != 1) {
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
}

// Check how valuable a position is for blocking a specific player
int checkBlockingValue(List<List<int>> board, int row, int col, int player) {
  int value = 0;
  final directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal \
    [1, -1]   // diagonal /
  ];

  for (final direction in directions) {
    int count = 0;
    final dx = direction[0];
    final dy = direction[1];
    
    // Count consecutive pieces in this direction
    for (int i = -4; i <= 4; i++) {
      final newRow = row + i * dx;
      final newCol = col + i * dy;
      
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10) {
        if (board[newRow][newCol] == player) {
          count++;
        } else if (board[newRow][newCol] != 0) {
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
}

// Check proximity value - positions closer to human pieces are more valuable to block
int checkProximityValue(List<List<int>> board, int row, int col, int player) {
  int value = 0;
  
  // Check in a 5x5 area around the position
  for (int dr = -2; dr <= 2; dr++) {
    for (int dc = -2; dc <= 2; dc++) {
      final newRow = row + dr;
      final newCol = col + dc;
      
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && 
          board[newRow][newCol] == player) {
        final distance = dr.abs() + dc.abs();
        value += math.max(0, 5 - distance); // Closer pieces give higher value
      }
    }
  }
  
  return value;
}

// Find strategic blocking position based on human player's moves
Map<String, int>? findStrategicBlockPosition(List<List<int>> board) {
  final emptyPositions = <Map<String, int>>[];
  final strategicPositions = <Map<String, dynamic>>[];
  
  // Find all empty cells
  for (int row = 0; row < 10; row++) {
    for (int col = 0; col < 10; col++) {
      if (board[row][col] == 0) {
        emptyPositions.add({'row': row, 'col': col});
      }
    }
  }
  
  if (emptyPositions.isEmpty) {
    return null;
  }
  
  // Analyze each empty position for strategic value
  for (final pos in emptyPositions) {
    int priority = 0;
    
    // Check if blocking this position would prevent human from completing a line
    priority += checkBlockingValue(board, pos['row']!, pos['col']!, 1);
    
    // Check if this position is near human pieces (closer to human pieces = higher priority)
    priority += checkProximityValue(board, pos['row']!, pos['col']!, 1);
    
    // Check if this position would block potential AI threats
    priority += checkBlockingValue(board, pos['row']!, pos['col']!, 2);
    
    strategicPositions.add({...pos, 'priority': priority});
  }
  
  // Sort by priority (highest first) and return the best position
  strategicPositions.sort((a, b) => b['priority'].compareTo(a['priority']));
  
  return strategicPositions.isNotEmpty ? {
    'row': strategicPositions[0]['row'],
    'col': strategicPositions[0]['col']
  } : null;
}

// Add strategic block based on human player's move patterns
List<List<int>> addStrategicBlock(List<List<int>> board) {
  final newBoard = board.map((row) => List<int>.from(row)).toList();
  final blockPosition = findStrategicBlockPosition(newBoard);
  
  if (blockPosition != null) {
    newBoard[blockPosition['row']!][blockPosition['col']!] = blockedCell;
  }
  
  return newBoard;
}

// Move one random block to a strategic position to block the human player (for games ending with 9 from game 400)
List<List<int>> moveRandomBlockToStrategicPosition(List<List<int>> board) {
  final newBoard = board.map((row) => List<int>.from(row)).toList();
  final blockedPositions = <Map<String, int>>[];
  
  // Find all blocked cells
  for (int row = 0; row < 10; row++) {
    for (int col = 0; col < 10; col++) {
      if (newBoard[row][col] == blockedCell) {
        blockedPositions.add({'row': row, 'col': col});
      }
    }
  }
  
  if (blockedPositions.isEmpty) {
    return newBoard; // No blocks to move
  }
  
  // Select a random block to move
  final random = math.Random();
  final randomBlockIndex = random.nextInt(blockedPositions.length);
  final oldCell = blockedPositions[randomBlockIndex];
  
  // Remove the selected block
  newBoard[oldCell['row']!][oldCell['col']!] = 0;
  
  // Find strategic position to place the block (near human pieces)
  final strategicPosition = findStrategicBlockPosition(newBoard);
  
  if (strategicPosition != null && newBoard[strategicPosition['row']!][strategicPosition['col']!] == 0) {
    // Place the block at the strategic position
    newBoard[strategicPosition['row']!][strategicPosition['col']!] = blockedCell;
  } else {
    // If no strategic position found or position is occupied, place randomly
    final emptyPositions = <Map<String, int>>[];
    for (int row = 0; row < 10; row++) {
      for (int col = 0; col < 10; col++) {
        if (newBoard[row][col] == 0) {
          emptyPositions.add({'row': row, 'col': col});
        }
      }
    }
    
    if (emptyPositions.isNotEmpty) {
      final randomPosition = emptyPositions[random.nextInt(emptyPositions.length)];
      newBoard[randomPosition['row']!][randomPosition['col']!] = blockedCell;
    }
  }
  
  return newBoard;
}

