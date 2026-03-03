import 'package:flutter/material.dart';
import 'dart:math' as math;
import 'dart:async';
import 'adventure_game_rules.dart';
import 'adventure_game_logic.dart' as logic;

/// Hides scrollbar completely (no vertical bar on the side).
class _NoScrollbarBehavior extends ScrollBehavior {
  @override
  Widget buildScrollbar(BuildContext context, Widget child, ScrollableDetails details) {
    return child;
  }
}

const Color primaryYellow = Color(0xFFFFC30B);
/// Classic board style (matches reference): sky blue grid, white lines, black border
const Color classicBoardGridColor = Color(0xFF87CEEB);
const Color classicBoardBackground = Color(0xFF424242);
const int boardSize = 10; // Adventure games use 10x10 board

class AdventureGame extends StatefulWidget {
  final VoidCallback onBackToMenu;
  final int initialGame;

  const AdventureGame({
    super.key,
    required this.onBackToMenu,
    this.initialGame = 1,
  });

  @override
  State<AdventureGame> createState() => _AdventureGameState();
}

class _AdventureGameState extends State<AdventureGame> {
  int currentGame = 1;
  int currentPlayer = 1; // 1 = player (yellow), 2 = AI (black)
  List<List<int>> board = [];
  int winner = 0; // 0 = no winner/draw, 1 = player, 2 = AI
  List<List<int>> winningPieces = [];
  bool isGameOver = false;
  String gameStatus = '';
  bool gameStarted = false;
  bool gameInitialized = false;
  bool showGameOverPopup = false;
  int startCountdown = 3;
  bool showStartCountdown = true;

  // Game rules
  GameRules? gameRules;
  List<Map<String, int>> mudZones = [];
  bool isBlindPlay = false;
  bool temporaryBlindPlay = false;
  int blindPlayTriggerMove = 0;

  // Match system state
  int currentMatch = 1;
  int playerWins = 0;
  int aiWins = 0;
  bool isMatchComplete = false;
  int requiredWins = 1;
  int totalGames = 1;

  // Timer
  int timeLeft = 15;
  Timer? timer;

  // Move tracking
  int humanMoveCount = 0;
  int player1MoveCount = 0;
  int player2MoveCount = 0;
  int totalMoveCount = 0;
  int blockShiftMoveCount = 0;

  // Piece aging
  List<List<int>> pieceAges = [];

  // AI difficulty
  String aiDifficulty = 'medium';

  @override
  void initState() {
    super.initState();
    currentGame = widget.initialGame;
    _initializeGame();
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  void _initializeGame() {
    // Get game rules - IMPORTANT: recalculate with currentMatch for proper rule application
    gameRules = getGameRules(currentGame, currentMatch);
    aiDifficulty = gameRules!.aiDifficulty;
    
    // Initialize board with blocks - use currentMatch to get correct blocks for this match
    isBlindPlay = gameRules!.hasBlindPlay;
    board = logic.createBoardWithBlocks(currentGame, isBlindPlay, currentMatch);
    
    // Initialize mud zones
    if (gameRules!.hasMudZones) {
      mudZones = logic.generateMudZones(currentGame);
    } else {
      mudZones = [];
    }
    
    // Initialize piece ages
    pieceAges = logic.initializePieceAges();
    
    // Reset game state
    winner = 0;
    winningPieces = [];
    isGameOver = false;
    currentPlayer = gameRules!.startingPlayer;
    gameStarted = false;
    gameInitialized = false;
    showStartCountdown = true;
    startCountdown = 3;
    timeLeft = gameRules!.timeLimit;
    
    // Reset move counts
    humanMoveCount = 0;
    player1MoveCount = 0;
    player2MoveCount = 0;
    totalMoveCount = 0;
    blockShiftMoveCount = 0;
    temporaryBlindPlay = false;
    blindPlayTriggerMove = 0;

    // Determine match system
    if (gameRules!.isMatchGame) {
      requiredWins = gameRules!.matchType == 'best-of-5' ? 3 : 2;
      totalGames = gameRules!.matchType == 'best-of-5' ? 5 : 3;
      gameStatus = 'Match $currentMatch of $totalGames (You: $playerWins, AI: $aiWins)';
    } else {
      requiredWins = 1;
      totalGames = 1;
      gameStatus = currentPlayer == 1 ? 'Your turn' : 'AI thinking...';
    }

    // Start countdown
    _startCountdown();
  }

  void _startCountdown() {
    if (startCountdown > 0) {
      Future.delayed(const Duration(seconds: 1), () {
        if (mounted) {
          setState(() {
            startCountdown--;
            if (startCountdown > 0) {
              _startCountdown();
            } else {
              showStartCountdown = false;
              gameStarted = true;
              gameInitialized = true;
              _startTimer();
              if (currentPlayer == 2) {
                Future.delayed(const Duration(milliseconds: 500), () {
                  _makeAIMove();
                });
              }
            }
          });
        }
      });
    }
  }

  void _startTimer() {
    timer?.cancel();
    if (gameRules!.timeLimit == 0) return;
    
    timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted || winner != 0 || !gameStarted) {
        timer.cancel();
        return;
      }
      
      setState(() {
        timeLeft--;
        if (timeLeft <= 0) {
          timer.cancel();
          // Time's up - current player loses
          final timeWinner = currentPlayer == 1 ? 2 : 1;
          winner = timeWinner;
          isGameOver = true;
          gameStatus = timeWinner == 1 ? 'Time\'s Up - You Won! 🐝' : 'Time\'s Up - You Lost 🐝';
          _handleGameEnd();
        }
      });
    });
  }

  void _resetTimer() {
    timer?.cancel();
    if (gameRules!.timeLimit > 0 && gameStarted && winner == 0) {
      timeLeft = gameRules!.timeLimit;
      _startTimer();
    }
  }

  void _makeMove(int row, int col) {
    if (!gameStarted || !gameInitialized || isGameOver || board[row][col] != 0 || currentPlayer != 1) {
      return;
    }

    // Check if in mud zone during blind play (persistent or temporary)
    final effectiveBlindPlay = isBlindPlay || temporaryBlindPlay;
    if (effectiveBlindPlay && logic.isInMudZone(row, col, mudZones)) {
      return;
    }

    // Make player move (create new board copy to ensure state updates)
    final newBoard = board.map((row) => List<int>.from(row)).toList();
    newBoard[row][col] = 1;
    
    // Update piece ages
    var updatedPieceAges = logic.ageAllPieces(newBoard, pieceAges);
    updatedPieceAges[row][col] = 0; // New piece starts at age 0
    
    // Update move counts
    final newHumanMoveCount = humanMoveCount + 1;
    final newPlayer1MoveCount = player1MoveCount + 1;
    final newTotalMoveCount = totalMoveCount + 1;
    final newBlockShiftMoveCount = blockShiftMoveCount + 1;
    
    // Handle adventure mode obstacles on human moves
    final obstacleResult = _handleHumanMoveObstacles(newBoard, updatedPieceAges, newHumanMoveCount, newPlayer1MoveCount, newTotalMoveCount, newBlockShiftMoveCount);
    final finalBoard = obstacleResult['board'] as List<List<int>>;
    final finalPieceAges = obstacleResult['pieceAges'] as List<List<int>>;
    
    setState(() {
      board = finalBoard;
      pieceAges = finalPieceAges;
      humanMoveCount = newHumanMoveCount;
      player1MoveCount = newPlayer1MoveCount;
      totalMoveCount = newTotalMoveCount;
      blockShiftMoveCount = newBlockShiftMoveCount;
      
      // Check for winner
      if (logic.checkWinCondition(board, row, col, 1)) {
        winner = 1;
        winningPieces = logic.getWinningPieces(board, row, col, 1);
        isGameOver = true;
        _handleGameEnd();
        return;
      }
      
      // Check for draw
      if (_isBoardFull()) {
        winner = 0;
        isGameOver = true;
        gameStatus = 'Draw! 🐝';
        _handleGameEnd();
        return;
      }
      
      // Switch to AI
      currentPlayer = 2;
      gameStatus = 'AI thinking...';
      _resetTimer();
      
      // Make AI move after delay
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted && currentPlayer == 2 && winner == 0) {
          _makeAIMove();
        }
      });
    });
  }

  Map<String, dynamic> _handleHumanMoveObstacles(
    List<List<int>> currentBoard,
    List<List<int>> currentPieceAges,
    int newHumanMoveCount,
    int newPlayer1MoveCount,
    int newTotalMoveCount,
    int newBlockShiftMoveCount,
  ) {
    if (gameRules == null) {
      return {'board': currentBoard, 'pieceAges': currentPieceAges};
    }
    
    var workingBoard = currentBoard.map((row) => List<int>.from(row)).toList();
    var workingPieceAges = currentPieceAges.map((row) => List<int>.from(row)).toList();
    
    // Progressive blocks (games ending with 3)
    if (gameRules!.hasProgressiveBlocks) {
      final rules = logic.getProgressiveBlockRules(currentGame);
      if (rules['blocksToAdd']! > 0 && newHumanMoveCount % rules['movesInterval']! == 0) {
        workingBoard = logic.addProgressiveBlocks(workingBoard, rules['blocksToAdd']!);
      }
    }
    
    // Disappearing blocks (games ending with 4)
    if (gameRules!.hasDisappearingBlocks) {
      if (newHumanMoveCount % 3 == 0) {
        workingBoard = logic.removeTwoBlockedCells(workingBoard);
      }
    }
    
    // Strategic blocking (multiples of 50, match 1)
    if (currentGame % 50 == 0 && currentMatch == 1) {
      if (newHumanMoveCount % 8 == 0) {
        workingBoard = logic.addStrategicBlock(workingBoard);
      }
    }
    
    // Strategic blocking (games ending with 1 in ranges 500-700 and 1001-1591)
    if (logic.gameEndsWith1InSpecifiedRanges(currentGame)) {
      if (newHumanMoveCount % 8 == 0) {
        workingBoard = logic.addStrategicBlock(workingBoard);
      }
    }
    
    // Block shifting (games ending with 7 or 8)
    if (gameRules!.hasShiftingBlocks) {
      if (logic.gameEndsWith7After250(currentGame) && newBlockShiftMoveCount % 2 == 0) {
        workingBoard = logic.shiftAllBlocks(workingBoard);
      } else if (logic.gameEndsWith8After600(currentGame) && newBlockShiftMoveCount % 5 == 0) {
        workingBoard = logic.shiftAllBlocks(workingBoard);
      }
    }
    
    // Strategic block movement for games ending with 9 from game 400
    if (currentGame >= 400 && currentGame % 10 == 9 && newTotalMoveCount == 27) {
      workingBoard = logic.moveRandomBlockToStrategicPosition(workingBoard);
    }
    
    // Piece capacity (multiples of 17)
    if (gameRules!.hasPieceCapacity) {
      final capacityResult = logic.enforcePieceCapacity(workingBoard, workingPieceAges, 35);
      workingBoard = capacityResult['board'] as List<List<int>>;
      workingPieceAges = capacityResult['pieceAges'] as List<List<int>>;
    }
    
    // Disappearing pieces - remove 2 oldest opponent pieces every 4 moves
    if (gameRules!.hasDisappearingPieces) {
      if (newPlayer1MoveCount % 4 == 0) {
        final disappearResult = logic.removeOldestPiecesOfPlayer(workingBoard, workingPieceAges, 2, 2);
        workingBoard = disappearResult['board'] as List<List<int>>;
        workingPieceAges = disappearResult['pieceAges'] as List<List<int>>;
      }
    }
    
    // Board rearrangement (multiples of 50, match 3) - every 5 total moves
    if (logic.isMultipleOf50Match3(currentGame, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 5 == 0) {
      final rearrangeResult = logic.rearrangeBoard(workingBoard, workingPieceAges);
      workingBoard = rearrangeResult['board'] as List<List<int>>;
      workingPieceAges = rearrangeResult['pieceAges'] as List<List<int>>;
    }
    
    // Piece swapping (multiples of 50, match 4) - every 5 total moves
    if (logic.isMultipleOf50Match4(currentGame, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 5 == 0) {
      final swapResult = logic.swapOpponentPiecePairs(workingBoard, workingPieceAges);
      workingBoard = swapResult['board'] as List<List<int>>;
      workingPieceAges = swapResult['pieceAges'] as List<List<int>>;
    }
    
    // Piece swapping for multiples of 10 Match 2/3
    if (logic.isMultipleOf10Match2From30(currentGame, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 9 == 0) {
      final swapResult = logic.swapOpponentPiecePairs(workingBoard, workingPieceAges);
      workingBoard = swapResult['board'] as List<List<int>>;
      workingPieceAges = swapResult['pieceAges'] as List<List<int>>;
    }
    
    if (logic.isMultipleOf10Match2From330(currentGame, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 7 == 0) {
      final swapResult = logic.swapOpponentPiecePairs(workingBoard, workingPieceAges);
      workingBoard = swapResult['board'] as List<List<int>>;
      workingPieceAges = swapResult['pieceAges'] as List<List<int>>;
    }
    
    if (logic.isMultipleOf10Match2From730(currentGame, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 5 == 0) {
      final swapResult = logic.swapOpponentPiecePairs(workingBoard, workingPieceAges);
      workingBoard = swapResult['board'] as List<List<int>>;
      workingPieceAges = swapResult['pieceAges'] as List<List<int>>;
    }
    
    // Swap all pieces for multiples of 10 match 1 from game 60 every 11 moves
    if (logic.isMultipleOf10Match1From60(currentGame, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 11 == 0) {
      final swapAllResult = logic.swapAllPieces(workingBoard, workingPieceAges);
      workingBoard = swapAllResult['board'] as List<List<int>>;
      workingPieceAges = swapAllResult['pieceAges'] as List<List<int>>;
    }
    
    // Swap all pieces for games ending with 1 (from game 31) every 13 moves
    if (currentGame % 10 == 1 && currentGame >= 31 && !logic.gameEndsWith1InSpecifiedRanges(currentGame) && newTotalMoveCount > 0 && newTotalMoveCount % 13 == 0) {
      final swapAllResult = logic.swapAllPieces(workingBoard, workingPieceAges);
      workingBoard = swapAllResult['board'] as List<List<int>>;
      workingPieceAges = swapAllResult['pieceAges'] as List<List<int>>;
    }
    
    // Temporary blind play triggers
    if (logic.isMultipleOf10Match1From210(currentGame, currentMatch) && newPlayer1MoveCount == 15) {
      setState(() {
        temporaryBlindPlay = true;
        blindPlayTriggerMove = newTotalMoveCount;
      });
    }
    
    if (logic.isMultipleOf10Match1From810(currentGame, currentMatch) && newPlayer1MoveCount == 13) {
      setState(() {
        temporaryBlindPlay = true;
        blindPlayTriggerMove = newTotalMoveCount;
      });
    }
    
    if (logic.isMultipleOf10Match1From1210(currentGame, currentMatch) && newPlayer1MoveCount == 9) {
      setState(() {
        temporaryBlindPlay = true;
        blindPlayTriggerMove = newTotalMoveCount;
      });
    }
    
    // Reset temporary blind play after one move
    if (temporaryBlindPlay && !gameRules!.hasBlindPlay && newTotalMoveCount > blindPlayTriggerMove && blindPlayTriggerMove > 0) {
      setState(() {
        temporaryBlindPlay = false;
        blindPlayTriggerMove = 0;
      });
    }
    
    return {'board': workingBoard, 'pieceAges': workingPieceAges};
  }

  void _makeAIMove() {
    if (!gameStarted || !gameInitialized || isGameOver || currentPlayer != 2 || winner != 0) {
      return;
    }

    setState(() {
      // Get available cells
      final availableCells = <Map<String, int>>[];
      final effectiveBlindPlay = isBlindPlay || temporaryBlindPlay;
      
      for (int row = 0; row < boardSize; row++) {
        for (int col = 0; col < boardSize; col++) {
          if (board[row][col] == 0) {
            // In blind play mode, AI should avoid mud zones too
            if (effectiveBlindPlay && logic.isInMudZone(row, col, mudZones)) {
              continue;
            }
            availableCells.add({'row': row, 'col': col});
          }
        }
      }

      if (availableCells.isEmpty) {
        // Board is full - draw
        winner = 0;
        isGameOver = true;
        gameStatus = 'Draw! 🐝';
        _handleGameEnd();
        return;
      }

      // Get AI move based on difficulty
      final selectedCell = _getBestAIMove(availableCells, board, effectiveBlindPlay);

      // Make the AI move
      board[selectedCell['row']!][selectedCell['col']!] = 2;

      // Update piece ages
      pieceAges = logic.ageAllPieces(board, pieceAges);
      pieceAges[selectedCell['row']!][selectedCell['col']!] = 0; // New piece starts at age 0
      
      // Update move counts
      player2MoveCount++;
      totalMoveCount++;

      // Handle adventure mode obstacles on AI moves
      final obstacleResult = _handleAIMoveObstacles(board, pieceAges, player2MoveCount, totalMoveCount);
      board = obstacleResult['board'] as List<List<int>>;
      pieceAges = obstacleResult['pieceAges'] as List<List<int>>;

      // Check for winner
      if (logic.checkWinCondition(board, selectedCell['row']!, selectedCell['col']!, 2)) {
        winner = 2;
        winningPieces = logic.getWinningPieces(board, selectedCell['row']!, selectedCell['col']!, 2);
        isGameOver = true;
        _handleGameEnd();
        return;
      }

      // Check for draw
      if (_isBoardFull()) {
        winner = 0;
        isGameOver = true;
        gameStatus = 'Draw! 🐝';
        _handleGameEnd();
        return;
      }

      // Switch to player
      currentPlayer = 1;
      gameStatus = 'Your turn';
      _resetTimer();
    });
  }

  Map<String, dynamic> _handleAIMoveObstacles(
    List<List<int>> currentBoard,
    List<List<int>> currentPieceAges,
    int newPlayer2MoveCount,
    int newTotalMoveCount,
  ) {
    if (gameRules == null) {
      return {'board': currentBoard, 'pieceAges': currentPieceAges};
    }
    
    var workingBoard = currentBoard.map((row) => List<int>.from(row)).toList();
    var workingPieceAges = currentPieceAges.map((row) => List<int>.from(row)).toList();
    
    // Piece capacity (multiples of 17)
    if (gameRules!.hasPieceCapacity) {
      final capacityResult = logic.enforcePieceCapacity(workingBoard, workingPieceAges, 35);
      workingBoard = capacityResult['board'] as List<List<int>>;
      workingPieceAges = capacityResult['pieceAges'] as List<List<int>>;
    }
    
    // Disappearing pieces - remove 2 oldest opponent pieces every 4 moves
    if (gameRules!.hasDisappearingPieces) {
      if (newPlayer2MoveCount % 4 == 0) {
        final disappearResult = logic.removeOldestPiecesOfPlayer(workingBoard, workingPieceAges, 1, 2);
        workingBoard = disappearResult['board'] as List<List<int>>;
        workingPieceAges = disappearResult['pieceAges'] as List<List<int>>;
      }
    }
    
    // Board rearrangement (multiples of 50, match 3) - every 5 total moves
    if (logic.isMultipleOf50Match3(currentGame, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 5 == 0) {
      final rearrangeResult = logic.rearrangeBoard(workingBoard, workingPieceAges);
      workingBoard = rearrangeResult['board'] as List<List<int>>;
      workingPieceAges = rearrangeResult['pieceAges'] as List<List<int>>;
    }
    
    // Piece swapping (multiples of 50, match 4) - every 5 total moves
    if (logic.isMultipleOf50Match4(currentGame, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 5 == 0) {
      final swapResult = logic.swapOpponentPiecePairs(workingBoard, workingPieceAges);
      workingBoard = swapResult['board'] as List<List<int>>;
      workingPieceAges = swapResult['pieceAges'] as List<List<int>>;
    }
    
    // Piece swapping for multiples of 10 Match 2/3
    if (logic.isMultipleOf10Match2From30(currentGame, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 9 == 0) {
      final swapResult = logic.swapOpponentPiecePairs(workingBoard, workingPieceAges);
      workingBoard = swapResult['board'] as List<List<int>>;
      workingPieceAges = swapResult['pieceAges'] as List<List<int>>;
    }
    
    if (logic.isMultipleOf10Match2From330(currentGame, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 7 == 0) {
      final swapResult = logic.swapOpponentPiecePairs(workingBoard, workingPieceAges);
      workingBoard = swapResult['board'] as List<List<int>>;
      workingPieceAges = swapResult['pieceAges'] as List<List<int>>;
    }
    
    if (logic.isMultipleOf10Match2From730(currentGame, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 5 == 0) {
      final swapResult = logic.swapOpponentPiecePairs(workingBoard, workingPieceAges);
      workingBoard = swapResult['board'] as List<List<int>>;
      workingPieceAges = swapResult['pieceAges'] as List<List<int>>;
    }
    
    // Swap all pieces for multiples of 10 match 1 from game 60 every 11 moves
    if (logic.isMultipleOf10Match1From60(currentGame, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 11 == 0) {
      final swapAllResult = logic.swapAllPieces(workingBoard, workingPieceAges);
      workingBoard = swapAllResult['board'] as List<List<int>>;
      workingPieceAges = swapAllResult['pieceAges'] as List<List<int>>;
    }
    
    // Swap all pieces for games ending with 1 (from game 31) every 13 moves
    if (currentGame % 10 == 1 && currentGame >= 31 && !logic.gameEndsWith1InSpecifiedRanges(currentGame) && newTotalMoveCount > 0 && newTotalMoveCount % 13 == 0) {
      final swapAllResult = logic.swapAllPieces(workingBoard, workingPieceAges);
      workingBoard = swapAllResult['board'] as List<List<int>>;
      workingPieceAges = swapAllResult['pieceAges'] as List<List<int>>;
    }
    
    return {'board': workingBoard, 'pieceAges': workingPieceAges};
  }

  Map<String, int> _getBestAIMove(List<Map<String, int>> availableCells, List<List<int>> currentBoard, bool blindPlay) {
    // For blind play games, AI makes completely random moves
    if (blindPlay) {
      final random = math.Random();
      return availableCells[random.nextInt(availableCells.length)];
    }
    
    // For normal games, use difficulty-based AI
    if (aiDifficulty == 'easy') {
      return _getEasyAIMove(availableCells, currentBoard);
    } else if (aiDifficulty == 'medium') {
      return _getMediumAIMove(availableCells, currentBoard);
    } else {
      return _getHardAIMove(availableCells, currentBoard);
    }
  }

  Map<String, int> _getEasyAIMove(List<Map<String, int>> availableCells, List<List<int>> currentBoard) {
    // Priority 1: Take winning move if available
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (logic.checkWinCondition(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    // Priority 2: Block if human can win immediately (but only 50% of the time)
    if (math.Random().nextDouble() > 0.5) {
      for (final cell in availableCells) {
        final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
        testBoard[cell['row']!][cell['col']!] = 1;
        if (logic.checkWinCondition(testBoard, cell['row']!, cell['col']!, 1)) {
          return cell;
        }
      }
    }

    // Priority 3: Random move
    final random = math.Random();
    return availableCells[random.nextInt(availableCells.length)];
  }

  Map<String, int> _getMediumAIMove(List<Map<String, int>> availableCells, List<List<int>> currentBoard) {
    // Priority 1: Take winning move if available
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (logic.checkWinCondition(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    // Priority 2: Block if human can win immediately
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (logic.checkWinCondition(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    // Priority 3: Block 3-in-a-row threats
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (_checkThreeInARow(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    // Priority 4: Create 3-in-a-row if it can lead to 5
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (_checkThreeInARow(testBoard, cell['row']!, cell['col']!, 2) && _canReachFive(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    // Priority 5: Block 2-in-a-row threats
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (_checkTwoInARow(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    // Priority 6: Create 2-in-a-row if it can lead to 5
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (_checkTwoInARow(testBoard, cell['row']!, cell['col']!, 2) && _canReachFive(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    // Priority 7: Random move
    final random = math.Random();
    return availableCells[random.nextInt(availableCells.length)];
  }

  Map<String, int> _getHardAIMove(List<Map<String, int>> availableCells, List<List<int>> currentBoard) {
    // Priority 1: Take winning move if available
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (logic.checkWinCondition(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    // Priority 2: Block if human can win immediately
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (logic.checkWinCondition(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    // Priority 3: Block 4-in-a-row threats
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (_checkFourInARow(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    // Priority 4: Create 4-in-a-row if possible
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (_checkFourInARow(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    // Priority 5: Block 3-in-a-row threats
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (_checkThreeInARow(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    // Priority 6: Create 3-in-a-row if it can lead to 5
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (_checkThreeInARow(testBoard, cell['row']!, cell['col']!, 2) && _canReachFive(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    // Priority 7: Block 2-in-a-row threats
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (_checkTwoInARow(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    // Priority 8: Create 2-in-a-row if it can lead to 5
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (_checkTwoInARow(testBoard, cell['row']!, cell['col']!, 2) && _canReachFive(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    // Priority 9: Strategic positioning near existing pieces
    for (final cell in availableCells) {
      if (_isNearHumanPiece(currentBoard, cell['row']!, cell['col']!)) {
        return cell;
      }
    }

    // Priority 10: Try to control center area
    final centerCells = availableCells.where((cell) {
      final centerRow = 4.5;
      final centerCol = 4.5;
      final distance = math.sqrt(math.pow(cell['row']! - centerRow, 2) + math.pow(cell['col']! - centerCol, 2));
      return distance <= 2;
    }).toList();
    
    if (centerCells.isNotEmpty) {
      final random = math.Random();
      return centerCells[random.nextInt(centerCells.length)];
    }

    // Priority 11: Random move
    final random = math.Random();
    return availableCells[random.nextInt(availableCells.length)];
  }

  bool _checkThreeInARow(List<List<int>> testBoard, int row, int col, int player) {
    final directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (final direction in directions) {
      int count = 1;
      final dRow = direction[0];
      final dCol = direction[1];
      for (int i = 1; i < 4; i++) {
        final newRow = row + i * dRow;
        final newCol = col + i * dCol;
        if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize && testBoard[newRow][newCol] == player) {
          count++;
        } else {
          break;
        }
      }
      for (int i = 1; i < 4; i++) {
        final newRow = row - i * dRow;
        final newCol = col - i * dCol;
        if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize && testBoard[newRow][newCol] == player) {
          count++;
        } else {
          break;
        }
      }
      if (count >= 3) return true;
    }
    return false;
  }

  bool _checkTwoInARow(List<List<int>> testBoard, int row, int col, int player) {
    final directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (final direction in directions) {
      int count = 1;
      final dRow = direction[0];
      final dCol = direction[1];
      for (int i = 1; i < 3; i++) {
        final newRow = row + i * dRow;
        final newCol = col + i * dCol;
        if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize && testBoard[newRow][newCol] == player) {
          count++;
        } else {
          break;
        }
      }
      for (int i = 1; i < 3; i++) {
        final newRow = row - i * dRow;
        final newCol = col - i * dCol;
        if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize && testBoard[newRow][newCol] == player) {
          count++;
        } else {
          break;
        }
      }
      if (count >= 2) return true;
    }
    return false;
  }

  bool _checkFourInARow(List<List<int>> testBoard, int row, int col, int player) {
    final directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (final direction in directions) {
      int count = 1;
      final dRow = direction[0];
      final dCol = direction[1];
      for (int i = 1; i < 5; i++) {
        final newRow = row + i * dRow;
        final newCol = col + i * dCol;
        if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize && testBoard[newRow][newCol] == player) {
          count++;
        } else {
          break;
        }
      }
      for (int i = 1; i < 5; i++) {
        final newRow = row - i * dRow;
        final newCol = col - i * dCol;
        if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize && testBoard[newRow][newCol] == player) {
          count++;
        } else {
          break;
        }
      }
      if (count >= 4) return true;
    }
    return false;
  }

  bool _isNearHumanPiece(List<List<int>> testBoard, int row, int col) {
    for (int dRow = -2; dRow <= 2; dRow++) {
      for (int dCol = -2; dCol <= 2; dCol++) {
        if (dRow == 0 && dCol == 0) continue;
        final newRow = row + dRow;
        final newCol = col + dCol;
        if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize && testBoard[newRow][newCol] == 1) {
          return true;
        }
      }
    }
    return false;
  }

  bool _canReachFive(List<List<int>> testBoard, int row, int col, int player) {
    final directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (final direction in directions) {
      int count = 1;
      int emptySpaces = 0;
      final dr = direction[0];
      final dc = direction[1];
      for (int direction = -1; direction <= 1; direction += 2) {
        for (int i = 1; i <= 4; i++) {
          final newRow = row + (dr * i * direction);
          final newCol = col + (dc * i * direction);
          if (newRow < 0 || newRow >= boardSize || newCol < 0 || newCol >= boardSize) break;
          if (testBoard[newRow][newCol] == player) {
            count++;
          } else if (testBoard[newRow][newCol] == 0) {
            emptySpaces++;
          } else {
            break; // Blocked cells or opponent pieces stop the line
          }
        }
      }
      if (count + emptySpaces >= 5) return true;
    }
    return false;
  }

  bool _isBoardFull() {
    for (int row = 0; row < boardSize; row++) {
      for (int col = 0; col < boardSize; col++) {
        final cell = board[row][col];
        if (cell == 0) {
          // In blind play mode, mud zones are not playable, so they count as "full"
          if ((isBlindPlay || temporaryBlindPlay) && logic.isInMudZone(row, col, mudZones)) {
            continue;
          }
          return false;
        }
      }
    }
    return true;
  }

  void _handleGameEnd() {
    timer?.cancel();
    
    if (winner == 1) {
      playerWins++;
      gameStatus = 'You won! 🐝';
    } else if (winner == 2) {
      aiWins++;
      gameStatus = 'AI won! 🐝';
    }

    final requiresMatch = gameRules?.isMatchGame ?? false;
    if (requiresMatch) {
      if (playerWins >= requiredWins) {
        isMatchComplete = true;
        gameStatus = 'Match won! You: $playerWins, AI: $aiWins';
      } else if (aiWins >= requiredWins) {
        isMatchComplete = true;
        gameStatus = 'Match lost! You: $playerWins, AI: $aiWins';
      } else if (currentMatch < totalGames) {
        // Continue to next match
        gameStatus = 'Match $currentMatch complete. Starting match ${currentMatch + 1}...';
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) {
            setState(() {
              currentMatch++;
              _initializeGame();
            });
          }
        });
        return;
      }
    }
    
    // Show popup after a short delay
    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted) {
        _showGameOverPopup();
      }
    });
  }
  
  void _showGameOverPopup() {
    String title;
    String emoji = '🐝';
    
    if (winner == 1) {
      title = 'You Won! 🐝';
    } else if (winner == 2) {
      title = 'You Lost 🐝';
    } else {
      title = 'Draw! 🐝';
    }
    
    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withValues(alpha: 0.7),
      builder: (BuildContext context) {
        return Dialog(
          backgroundColor: Colors.transparent,
          child: Container(
            decoration: BoxDecoration(
              color: primaryYellow,
              borderRadius: BorderRadius.circular(25),
              border: Border.all(
                color: const Color(0xFF6c757d),
                width: 5,
              ),
            ),
            padding: const EdgeInsets.all(50),
            constraints: const BoxConstraints(
              minWidth: 300,
              maxWidth: 450,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Emoji
                Text(
                  emoji,
                  style: const TextStyle(fontSize: 60),
                ),
                const SizedBox(height: 20),
                // Title
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.black,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                // Match progress if it's a match game
                if (gameRules?.isMatchGame ?? false) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.black, width: 2),
                    ),
                    child: Column(
                      children: [
                        Text(
                          'Match: $playerWins - $aiWins',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.black,
                          ),
                        ),
                        if (isMatchComplete) ...[
                          const SizedBox(height: 8),
                          Text(
                            playerWins > aiWins ? 'Match Won! 🎉' : 'Match Lost',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: playerWins > aiWins ? Colors.green : Colors.red,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
                // Buttons
                Column(
                  children: [
                    // Continue/Play Again button
                    if (winner == 1) ...[
                      ElevatedButton(
                        onPressed: () {
                          Navigator.of(context).pop();
                          _nextGame();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 32,
                            vertical: 16,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: const Text(
                          '➡️ Continue',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ] else ...[
                      ElevatedButton(
                        onPressed: () {
                          Navigator.of(context).pop();
                          _resetGame();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 32,
                            vertical: 16,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: const Text(
                          '🔄 Play Again',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    // Back to Menu button
                    ElevatedButton(
                      onPressed: () {
                        Navigator.of(context).pop();
                        widget.onBackToMenu();
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 32,
                          vertical: 16,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: const Text(
                        'Back to Menu',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
  
  void _resetGame() {
    setState(() {
      currentMatch = 1;
      playerWins = 0;
      aiWins = 0;
      isMatchComplete = false;
      _initializeGame();
    });
  }
  
  void _nextGame() {
    setState(() {
      currentGame++;
      currentMatch = 1;
      playerWins = 0;
      aiWins = 0;
      isMatchComplete = false;
      _initializeGame();
    });
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    // Use 46 so board fits in padded area (avoids "Right overflowed by 6.0 Pixels" with SafeArea)
    final cellSize = math.min(
      (screenSize.width - 46) / boardSize,
      (screenSize.height - 300) / boardSize,
    );

    return Scaffold(
      backgroundColor: classicBoardBackground,
      appBar: AppBar(
        title: Text('Adventure Game - Level $currentGame'),
        backgroundColor: Colors.black,
        foregroundColor: primaryYellow,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(2),
          child: Container(color: primaryYellow),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            showDialog(
              context: context,
              builder: (context) => AlertDialog(
                title: const Text('Exit Game?'),
                content: const Text('Are you sure you want to exit? Your progress will be saved.'),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  TextButton(
                    onPressed: () {
                      Navigator.pop(context);
                      widget.onBackToMenu();
                    },
                    child: const Text('Exit'),
                  ),
                ],
              ),
            );
          },
        ),
      ),
      body: ScrollConfiguration(
        behavior: _NoScrollbarBehavior(),
        child: SafeArea(
          child: Column(
            children: [
            // Game status (black bar with yellow bottom border, like reference)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Colors.black,
                border: Border(bottom: BorderSide(color: primaryYellow, width: 2)),
              ),
              child: Column(
                children: [
                  if (showStartCountdown)
                    Text(
                      'Starting in $startCountdown...',
                      style: const TextStyle(
                        color: primaryYellow,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    )
                  else ...[
                    Text(
                      gameStatus,
                      style: const TextStyle(
                        color: primaryYellow,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (gameRules != null && gameRules!.timeLimit > 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          'Time: ${timeLeft}s',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    if (gameRules != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          '${gameRules!.icon} ${gameRules!.description}',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    if (gameRules != null && gameRules!.isMatchGame)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          'Match $currentMatch of $totalGames | You: $playerWins | AI: $aiWins',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                          ),
                        ),
                      ),
                  ],
                ],
              ),
            ),  // Game status Container - comma before next child
            // Game board
            Expanded(
              child: Container(
                padding: const EdgeInsets.only(top: 10, left: 20, right: 20, bottom: 20),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.start,
                  children: [
                    const SizedBox(height: 10),
                    // Board with blind play overlay
                    Stack(
                        children: [
                          // Board
                          Opacity(
                            opacity: ((isBlindPlay || temporaryBlindPlay) && gameStarted && gameInitialized) ? 0 : 1,
                            child: Container(
                              decoration: BoxDecoration(
                                color: classicBoardGridColor,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: Colors.black, width: 3),
                              ),
                              child: Column(
                                children: List.generate(boardSize, (row) {
                                  return Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: List.generate(boardSize, (col) {
                                      final isWinning = winningPieces.any(
                                        (piece) => piece[0] == row && piece[1] == col,
                                      );
                                      final cellValue = board[row][col];
                                      final isBlocked = cellValue == logic.blockedCell;
                                      final isMudZone = logic.isInMudZone(row, col, mudZones);
                                      final effectiveBlindPlay = isBlindPlay || temporaryBlindPlay;
                                      final isBlindMudZone = effectiveBlindPlay && isMudZone;

                                      return GestureDetector(
                                        onTap: () => _makeMove(row, col),
                                        child: Container(
                                          width: cellSize,
                                          height: cellSize,
                                          decoration: BoxDecoration(
                                            color: isWinning
                                                ? Colors.green.withValues(alpha: 0.3)
                                                : isBlocked
                                                    ? Colors.grey.shade400
                                                    : isMudZone
                                                        ? Colors.brown.shade200
                                                        : classicBoardGridColor,
                                            border: Border.all(
                                              color: isBlindMudZone
                                                  ? Colors.red.shade300
                                                  : Colors.white,
                                              width: isBlindMudZone ? 2 : 1,
                                            ),
                                          ),
                                          child: Center(
                                            child: cellValue == 1
                                                ? Container(
                                                    width: cellSize * 0.8,
                                                    height: cellSize * 0.8,
                                                    decoration: const BoxDecoration(
                                                      color: primaryYellow,
                                                      shape: BoxShape.circle,
                                                    ),
                                                  )
                                                : cellValue == 2
                                                    ? Container(
                                                        width: cellSize * 0.8,
                                                        height: cellSize * 0.8,
                                                        decoration: const BoxDecoration(
                                                          color: Colors.black,
                                                          shape: BoxShape.circle,
                                                        ),
                                                      )
                                                    : isBlocked
                                                        ? const Icon(Icons.block, size: 16, color: Colors.grey)
                                                        : isMudZone
                                                            ? const Text('🌊', style: TextStyle(fontSize: 12))
                                                            : null,
                                          ),
                                        ),
                                      );
                                    }),
                                  );
                                }),
                              ),
                            ),
                          ),
                          // Blind Play Overlay
                          if ((isBlindPlay || temporaryBlindPlay) && gameStarted && gameInitialized)
                            Positioned.fill(
                              child: IgnorePointer(
                                child: Container(
                                  color: const Color(0xFF2C2C2C).withValues(alpha: 0.95),
                                  child: Center(
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        const Text(
                                          'BLIND PLAY MODE',
                                          style: TextStyle(
                                            fontSize: 32,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white,
                                          ),
                                        ),
                                        const SizedBox(height: 20),
                                        const Text(
                                          'Click anywhere to place your piece',
                                          style: TextStyle(
                                            fontSize: 18,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            // Footer (black bar with yellow top border, Home & Restart - like reference)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: const BoxDecoration(
                color: Colors.black,
                border: Border(top: BorderSide(color: primaryYellow, width: 2)),
              ),
              child: SafeArea(
                top: false,
                child: Row(
                  children: [
                    Expanded(
                      child: TextButton(
                        onPressed: () {
                          showDialog(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('Exit Game?'),
                              content: const Text(
                                  'Are you sure you want to exit? Your progress will be saved.'),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(context),
                                  child: const Text('Cancel'),
                                ),
                                TextButton(
                                  onPressed: () {
                                    Navigator.pop(context);
                                    widget.onBackToMenu();
                                  },
                                  child: const Text('Exit'),
                                ),
                              ],
                            ),
                          );
                        },
                        style: TextButton.styleFrom(
                          backgroundColor: primaryYellow,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                            side: const BorderSide(color: Colors.black, width: 2),
                          ),
                        ),
                        child: const Text('Home'),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextButton(
                        onPressed: () {
                          _initializeGame();
                        },
                        style: TextButton.styleFrom(
                          backgroundColor: primaryYellow,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                            side: const BorderSide(color: Colors.black, width: 2),
                          ),
                        ),
                        child: const Text('Restart'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      ),
    );
  }
}
