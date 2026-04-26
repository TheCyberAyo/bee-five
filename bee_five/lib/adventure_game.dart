import 'package:flutter/material.dart';
import 'dart:math' as math;
import 'dart:async';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'adventure_game_rules.dart';
import 'adventure_game_logic.dart' as logic;
import 'background_sound.dart';
import 'adventure_progress_service.dart';
import 'xp_service.dart';
import 'bee_facts.dart';

/// Hides scrollbar completely (no vertical bar on the side).
class _NoScrollbarBehavior extends ScrollBehavior {
  @override
  Widget buildScrollbar(BuildContext context, Widget child, ScrollableDetails details) {
    return child;
  }
}

const Color primaryYellow = Color(0xFFFFC30B);
const Color _turnAnnouncementOrange = Color(0xFFFF9800);
const Color classicBoardGridColor = Color(0xFF87CEEB);
const Color countdownBoardGridColor = Color(0xFFE53935);
const Color classicBoardBackground = Color(0xFF424242);
const int boardSize = 10;

class AdventureGame extends StatefulWidget {
  // CHANGE 1: onBackToMenu now carries the current level back to the home page.
  // This eliminates the SharedPreferences timing race — the home page always
  // receives the exact level number the player was on, synchronously.
  final void Function(int currentLevel) onBackToMenu;
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
  int currentPlayer = 1;
  List<List<int>> board = [];
  int winner = 0;
  List<List<int>> winningPieces = [];
  bool isGameOver = false;
  String gameStatus = '';
  bool gameStarted = false;
  bool gameInitialized = false;
  bool showGameOverPopup = false;
  int startCountdown = 3;
  bool showStartCountdown = true;

  GameRules? gameRules;
  List<Map<String, int>> mudZones = [];
  bool isBlindPlay = false;
  bool temporaryBlindPlay = false;
  int blindPlayTriggerMove = 0;

  int currentMatch = 1;
  int playerWins = 0;
  int aiWins = 0;
  bool isMatchComplete = false;
  int requiredWins = 1;
  int totalGames = 1;

  int timeLeft = 15;
  Timer? timer;

  int humanMoveCount = 0;
  int player1MoveCount = 0;
  int player2MoveCount = 0;
  int totalMoveCount = 0;
  int blockShiftMoveCount = 0;

  List<List<int>> pieceAges = [];
  String aiDifficulty = 'medium';

  int _headerXp = 0;
  int _lastXpDelta = 0;
  String? _currentBeeFact;
  bool _showBeeFactScreen = false;

  BannerAd? _bannerAd;
  bool _isBannerAdLoaded = false;
  InterstitialAd? _interstitialAd;
  int _actionCount = 0;

  @override
  void initState() {
    super.initState();
    currentGame = widget.initialGame;
    _initializeGame();
    BackgroundSound.instance.startIfEnabled();
    getXp().then((xp) {
      if (mounted) setState(() => _headerXp = xp);
    });
    _loadBannerAd();
    _loadInterstitialAd();
  }

  void _loadBannerAd() {
    _bannerAd = BannerAd(
      adUnitId: 'ca-app-pub-6740638137327567/1435131168',
      size: AdSize.banner,
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (ad) {
          if (mounted) setState(() => _isBannerAdLoaded = true);
        },
        onAdFailedToLoad: (ad, error) {
          ad.dispose();
        },
      ),
    )..load();
  }

  void _loadInterstitialAd() {
    InterstitialAd.load(
      adUnitId: 'ca-app-pub-6740638137327567/9168616109',
      request: const AdRequest(),
      adLoadCallback: InterstitialAdLoadCallback(
        onAdLoaded: (ad) {
          _interstitialAd = ad;
        },
        onAdFailedToLoad: (error) {
          _interstitialAd = null;
        },
      ),
    );
  }

  void _onActionPressed({required bool isContinue}) {
    _actionCount++;
    if (_actionCount % 8 == 0 && _interstitialAd != null) {
      _interstitialAd!.fullScreenContentCallback = FullScreenContentCallback(
        onAdDismissedFullScreenContent: (ad) {
          ad.dispose();
          _interstitialAd = null;
          _loadInterstitialAd();
          if (isContinue) {
            _nextGame();
          } else {
            _resetGame();
          }
        },
        onAdFailedToShowFullScreenContent: (ad, error) {
          ad.dispose();
          _interstitialAd = null;
          _loadInterstitialAd();
          if (isContinue) {
            _nextGame();
          } else {
            _resetGame();
          }
        },
      );
      _interstitialAd!.show();
    } else {
      if (isContinue) {
        _nextGame();
      } else {
        _resetGame();
      }
    }
  }

  @override
  void dispose() {
    timer?.cancel();
    _bannerAd?.dispose();
    _interstitialAd?.dispose();
    super.dispose();
  }

  void _initializeGame() {
    timer?.cancel();
    timer = null;

    gameRules = getGameRules(currentGame, currentMatch);
    aiDifficulty = gameRules!.aiDifficulty;
    
    isBlindPlay = gameRules!.hasBlindPlay;
    board = logic.createBoardWithBlocks(currentGame, isBlindPlay, currentMatch);
    
    if (gameRules!.hasMudZones) {
      mudZones = logic.generateMudZones(currentGame);
    } else {
      mudZones = [];
    }
    
    pieceAges = logic.initializePieceAges();
    
    winner = 0;
    winningPieces = [];
    isGameOver = false;
    currentPlayer = gameRules!.startingPlayer;
    gameStarted = false;
    gameInitialized = false;
    showStartCountdown = true;
    startCountdown = 3;
    timeLeft = gameRules!.timeLimit;
    
    humanMoveCount = 0;
    player1MoveCount = 0;
    player2MoveCount = 0;
    totalMoveCount = 0;
    blockShiftMoveCount = 0;
    temporaryBlindPlay = false;
    blindPlayTriggerMove = 0;

    if (gameRules!.isMatchGame) {
      requiredWins = gameRules!.matchType == 'best-of-5' ? 3 : 2;
      totalGames = gameRules!.matchType == 'best-of-5' ? 5 : 3;
      gameStatus = 'Match $currentMatch of $totalGames (You: $playerWins, AI: $aiWins)';
    } else {
      requiredWins = 1;
      totalGames = 1;
      gameStatus = currentPlayer == 1 ? 'Your turn' : 'AI thinking...';
    }

    _currentBeeFact = getBeeFactForGame(currentGame);

    if (_currentBeeFact != null) {
      showStartCountdown = false;
      _showBeeFactScreen = true;
    } else {
      _showBeeFactScreen = false;
      _startCountdown();
    }
  }

  void _startFromBeeFactScreen() {
    if (!mounted) return;
    setState(() {
      _showBeeFactScreen = false;
      showStartCountdown = true;
    });
    _startCountdown();
  }

  void _startCountdown() {
    if (startCountdown > 0) {
      Future.delayed(const Duration(seconds: 1), () {
        if (!mounted) return;
        if (!showStartCountdown) return;
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
          final timeWinner = currentPlayer == 1 ? 2 : 1;
          winner = timeWinner;
          isGameOver = true;
          gameStatus = timeWinner == 1 ? 'Time\'s Up - You Won!' : 'Time\'s Up - You Lost';
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

    final effectiveBlindPlay = isBlindPlay || temporaryBlindPlay;
    if (effectiveBlindPlay && logic.isInMudZone(row, col, mudZones)) {
      return;
    }

    final newBoard = board.map((row) => List<int>.from(row)).toList();
    newBoard[row][col] = 1;
    
    var updatedPieceAges = logic.ageAllPieces(newBoard, pieceAges);
    updatedPieceAges[row][col] = 0;
    
    final newHumanMoveCount = humanMoveCount + 1;
    final newPlayer1MoveCount = player1MoveCount + 1;
    final newTotalMoveCount = totalMoveCount + 1;
    final newBlockShiftMoveCount = blockShiftMoveCount + 1;
    
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
      
      if (logic.checkWinCondition(board, row, col, 1)) {
        winner = 1;
        winningPieces = logic.getWinningPieces(board, row, col, 1);
        isGameOver = true;
        _handleGameEnd();
        return;
      }
      
      if (_isBoardFull()) {
        winner = 0;
        isGameOver = true;
        gameStatus = 'Draw!';
        setState(() => _lastXpDelta = 0);
        _handleGameEnd();
        return;
      }
      
      currentPlayer = 2;
      gameStatus = 'AI thinking...';
      _resetTimer();
      
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
    
    if (gameRules!.hasProgressiveBlocks) {
      final rules = logic.getProgressiveBlockRules(currentGame);
      if (rules['blocksToAdd']! > 0 && newHumanMoveCount % rules['movesInterval']! == 0) {
        workingBoard = logic.addProgressiveBlocks(workingBoard, rules['blocksToAdd']!);
      }
    }
    
    if (gameRules!.hasDisappearingBlocks) {
      if (newHumanMoveCount % 3 == 0) {
        workingBoard = logic.removeTwoBlockedCells(workingBoard);
      }
    }
    
    if (currentGame % 50 == 0 && currentMatch == 1) {
      if (newHumanMoveCount % 8 == 0) {
        workingBoard = logic.addStrategicBlock(workingBoard);
      }
    }
    
    if (logic.gameEndsWith1InSpecifiedRanges(currentGame)) {
      if (newHumanMoveCount % 8 == 0) {
        workingBoard = logic.addStrategicBlock(workingBoard);
      }
    }
    
    if (gameRules!.hasShiftingBlocks) {
      if (logic.gameEndsWith7After250(currentGame) && newBlockShiftMoveCount % 2 == 0) {
        workingBoard = logic.shiftAllBlocks(workingBoard);
      } else if (logic.gameEndsWith8After600(currentGame) && newBlockShiftMoveCount % 5 == 0) {
        workingBoard = logic.shiftAllBlocks(workingBoard);
      }
    }
    
    if (currentGame >= 400 && currentGame % 10 == 9 && newTotalMoveCount == 27) {
      workingBoard = logic.moveRandomBlockToStrategicPosition(workingBoard);
    }
    
    if (gameRules!.hasPieceCapacity) {
      final capacityResult = logic.enforcePieceCapacity(workingBoard, workingPieceAges, 35);
      workingBoard = capacityResult['board'] as List<List<int>>;
      workingPieceAges = capacityResult['pieceAges'] as List<List<int>>;
    }
    
    if (gameRules!.hasDisappearingPieces) {
      if (newPlayer1MoveCount % 4 == 0) {
        final disappearResult = logic.removeOldestPiecesOfPlayer(workingBoard, workingPieceAges, 2, 2);
        workingBoard = disappearResult['board'] as List<List<int>>;
        workingPieceAges = disappearResult['pieceAges'] as List<List<int>>;
      }
    }
    
    if (logic.isMultipleOf50Match3(currentGame, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 5 == 0) {
      final rearrangeResult = logic.rearrangeBoard(workingBoard, workingPieceAges);
      workingBoard = rearrangeResult['board'] as List<List<int>>;
      workingPieceAges = rearrangeResult['pieceAges'] as List<List<int>>;
    }
    
    if (logic.isMultipleOf50Match4(currentGame, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 5 == 0) {
      final swapResult = logic.swapOpponentPiecePairs(workingBoard, workingPieceAges);
      workingBoard = swapResult['board'] as List<List<int>>;
      workingPieceAges = swapResult['pieceAges'] as List<List<int>>;
    }
    
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
    
    if (logic.isMultipleOf10Match1From60(currentGame, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 11 == 0) {
      final swapAllResult = logic.swapAllPieces(workingBoard, workingPieceAges);
      workingBoard = swapAllResult['board'] as List<List<int>>;
      workingPieceAges = swapAllResult['pieceAges'] as List<List<int>>;
    }
    
    if (currentGame % 10 == 1 && currentGame >= 31 && !logic.gameEndsWith1InSpecifiedRanges(currentGame) && newTotalMoveCount > 0 && newTotalMoveCount % 13 == 0) {
      final swapAllResult = logic.swapAllPieces(workingBoard, workingPieceAges);
      workingBoard = swapAllResult['board'] as List<List<int>>;
      workingPieceAges = swapAllResult['pieceAges'] as List<List<int>>;
    }
    
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
      final availableCells = <Map<String, int>>[];
      final effectiveBlindPlay = isBlindPlay || temporaryBlindPlay;
      
      for (int row = 0; row < boardSize; row++) {
        for (int col = 0; col < boardSize; col++) {
          if (board[row][col] == 0) {
            if (effectiveBlindPlay && logic.isInMudZone(row, col, mudZones)) {
              continue;
            }
            availableCells.add({'row': row, 'col': col});
          }
        }
      }

      if (availableCells.isEmpty) {
        winner = 0;
        isGameOver = true;
        gameStatus = 'Draw!';
        setState(() => _lastXpDelta = 0);
        _handleGameEnd();
        return;
      }

      final selectedCell = _getBestAIMove(availableCells, board, effectiveBlindPlay);

      board[selectedCell['row']!][selectedCell['col']!] = 2;

      pieceAges = logic.ageAllPieces(board, pieceAges);
      pieceAges[selectedCell['row']!][selectedCell['col']!] = 0;
      
      player2MoveCount++;
      totalMoveCount++;

      final obstacleResult = _handleAIMoveObstacles(board, pieceAges, player2MoveCount, totalMoveCount);
      board = obstacleResult['board'] as List<List<int>>;
      pieceAges = obstacleResult['pieceAges'] as List<List<int>>;

      if (logic.checkWinCondition(board, selectedCell['row']!, selectedCell['col']!, 2)) {
        winner = 2;
        winningPieces = logic.getWinningPieces(board, selectedCell['row']!, selectedCell['col']!, 2);
        isGameOver = true;
        _handleGameEnd();
        return;
      }

      if (_isBoardFull()) {
        winner = 0;
        isGameOver = true;
        gameStatus = 'Draw!';
        setState(() => _lastXpDelta = 0);
        _handleGameEnd();
        return;
      }

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
    
    if (gameRules!.hasPieceCapacity) {
      final capacityResult = logic.enforcePieceCapacity(workingBoard, workingPieceAges, 35);
      workingBoard = capacityResult['board'] as List<List<int>>;
      workingPieceAges = capacityResult['pieceAges'] as List<List<int>>;
    }
    
    if (gameRules!.hasDisappearingPieces) {
      if (newPlayer2MoveCount % 4 == 0) {
        final disappearResult = logic.removeOldestPiecesOfPlayer(workingBoard, workingPieceAges, 1, 2);
        workingBoard = disappearResult['board'] as List<List<int>>;
        workingPieceAges = disappearResult['pieceAges'] as List<List<int>>;
      }
    }
    
    if (logic.isMultipleOf50Match3(currentGame, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 5 == 0) {
      final rearrangeResult = logic.rearrangeBoard(workingBoard, workingPieceAges);
      workingBoard = rearrangeResult['board'] as List<List<int>>;
      workingPieceAges = rearrangeResult['pieceAges'] as List<List<int>>;
    }
    
    if (logic.isMultipleOf50Match4(currentGame, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 5 == 0) {
      final swapResult = logic.swapOpponentPiecePairs(workingBoard, workingPieceAges);
      workingBoard = swapResult['board'] as List<List<int>>;
      workingPieceAges = swapResult['pieceAges'] as List<List<int>>;
    }
    
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
    
    if (logic.isMultipleOf10Match1From60(currentGame, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 11 == 0) {
      final swapAllResult = logic.swapAllPieces(workingBoard, workingPieceAges);
      workingBoard = swapAllResult['board'] as List<List<int>>;
      workingPieceAges = swapAllResult['pieceAges'] as List<List<int>>;
    }
    
    if (currentGame % 10 == 1 && currentGame >= 31 && !logic.gameEndsWith1InSpecifiedRanges(currentGame) && newTotalMoveCount > 0 && newTotalMoveCount % 13 == 0) {
      final swapAllResult = logic.swapAllPieces(workingBoard, workingPieceAges);
      workingBoard = swapAllResult['board'] as List<List<int>>;
      workingPieceAges = swapAllResult['pieceAges'] as List<List<int>>;
    }
    
    return {'board': workingBoard, 'pieceAges': workingPieceAges};
  }

  Map<String, int> _getBestAIMove(List<Map<String, int>> availableCells, List<List<int>> currentBoard, bool blindPlay) {
    if (blindPlay) {
      final random = math.Random();
      return availableCells[random.nextInt(availableCells.length)];
    }
    
    if (aiDifficulty == 'easy') {
      return _getEasyAIMove(availableCells, currentBoard);
    } else if (aiDifficulty == 'medium') {
      return _getMediumAIMove(availableCells, currentBoard);
    } else {
      return _getHardAIMove(availableCells, currentBoard);
    }
  }

  Map<String, int> _getEasyAIMove(List<Map<String, int>> availableCells, List<List<int>> currentBoard) {
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (logic.checkWinCondition(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (logic.checkWinCondition(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    if (math.Random().nextDouble() > 0.5) {
      for (final cell in availableCells) {
        final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
        testBoard[cell['row']!][cell['col']!] = 1;
        if (_checkThreeInARow(testBoard, cell['row']!, cell['col']!, 1)) {
          return cell;
        }
      }
    }

    final random = math.Random();
    return availableCells[random.nextInt(availableCells.length)];
  }

  Map<String, int> _getMediumAIMove(List<Map<String, int>> availableCells, List<List<int>> currentBoard) {
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (logic.checkWinCondition(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (logic.checkWinCondition(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (_checkThreeInARow(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (_checkThreeInARow(testBoard, cell['row']!, cell['col']!, 2) && _canReachFive(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (_checkTwoInARow(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (_checkTwoInARow(testBoard, cell['row']!, cell['col']!, 2) && _canReachFive(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    final random = math.Random();
    return availableCells[random.nextInt(availableCells.length)];
  }

  Map<String, int> _getHardAIMove(List<Map<String, int>> availableCells, List<List<int>> currentBoard) {
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (logic.checkWinCondition(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (logic.checkWinCondition(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (_checkFourInARow(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (_checkFourInARow(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (_checkThreeInARow(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (_checkThreeInARow(testBoard, cell['row']!, cell['col']!, 2) && _canReachFive(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (_checkTwoInARow(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (_checkTwoInARow(testBoard, cell['row']!, cell['col']!, 2) && _canReachFive(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    for (final cell in availableCells) {
      if (_isNearHumanPiece(currentBoard, cell['row']!, cell['col']!)) {
        return cell;
      }
    }

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
            break;
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
      gameStatus = 'You Won!';
      onAdventureGameWon(levelJustPlayed: currentGame).then((result) {
        if (mounted) {
          setState(() {
            _headerXp = result.$1;
            _lastXpDelta = result.$2;
          });
        }
      });
    } else if (winner == 2) {
      aiWins++;
      gameStatus = 'Hive Lost!';
      onAdventureMatchLost(levelJustPlayed: currentGame).then((result) {
        if (mounted) {
          setState(() {
            _headerXp = result.$1;
            _lastXpDelta = result.$2;
          });
        }
      });
    }

    final requiresMatch = gameRules?.isMatchGame ?? false;
    if (requiresMatch) {
      if (playerWins >= requiredWins) {
        isMatchComplete = true;
        gameStatus = 'You Won! You: $playerWins, AI: $aiWins';
      } else if (aiWins >= requiredWins) {
        isMatchComplete = true;
        gameStatus = 'Hive Lost! You: $playerWins, AI: $aiWins';
      } else if (currentMatch < totalGames) {
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

    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted) {
        _showGameOverPopup();
      }
    });
  }
  
  void _showGameOverPopup() {
    String title;
    Color titleColor;
    if (winner == 1) {
      title = 'You Won!';
      titleColor = Colors.green;
    } else if (winner == 2) {
      title = 'You Lost';
      titleColor = Colors.black;
    } else {
      title = 'Draw!';
      titleColor = Colors.black;
    }
    
    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withValues(alpha: 0.7),
      builder: (BuildContext dialogContext) {
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
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: titleColor,
                    decoration: TextDecoration.none,
                  ),
                  textAlign: TextAlign.center,
                ),
                if (_lastXpDelta != 0) ...[
                  const SizedBox(height: 8),
                  Text(
                    _lastXpDelta > 0 ? '+$_lastXpDelta XP' : '$_lastXpDelta XP',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: _lastXpDelta > 0 ? Colors.green : Colors.red,
                    ),
                  ),
                ],
                const SizedBox(height: 20),
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
                            playerWins > aiWins ? 'Match won!' : 'Match lost',
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
                Column(
                  children: [
                    if (winner == 1) ...[
                      ElevatedButton(
                        onPressed: () {
                          Navigator.of(dialogContext).pop();
                          _onActionPressed(isContinue: true);
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
                          Navigator.of(dialogContext).pop();
                          _onActionPressed(isContinue: false);
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
                          'Play Again',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    // CHANGE 2: Back to Menu — navigate immediately, save in background.
                    // _backToMenu() is synchronous so it never freezes.
                    ElevatedButton(
                      onPressed: () {
                        Navigator.of(dialogContext).pop();
                        _backToMenu();
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
    });
    _initializeGame();
  }
  
  void _nextGame() {
    final levelJustCompleted = currentGame;
    final nextLevel = currentGame + 1;

    // Award XP for completing the level — fire and forget
    onAdventureLevelWon(levelJustCompleted).then((result) {
      if (mounted) setState(() => _headerXp = result.$1);
    });

    // Persist completed level then next level **in order**. Two concurrent
    // `saveAdventureLevel` calls can finish out of order and regress
    // `adventure_current_level` in SharedPreferences (e.g. save "1" after save "2"),
    // which makes the next app open look like you are still on level 1.
    Future.microtask(() async {
      try {
        await saveAdventureLevel(levelJustCompleted);
        await saveAdventureLevel(nextLevel);
      } catch (_) {}
    });

    setState(() {
      currentGame = nextLevel;
      currentMatch = 1;
      playerWins = 0;
      aiWins = 0;
      isMatchComplete = false;
    });

    _initializeGame();
  }

  // CHANGE 4: _backToMenu is fully synchronous — no async, no await, never freezes.
  // It passes currentGame directly to the home page via the callback.
  // saveAdventureLevel fires in the background after navigation has already happened.
  void _backToMenu() {
    if (!mounted) return;
    final levelToReport = currentGame;
    // Fire-and-forget save — never blocks navigation
    saveAdventureLevel(levelToReport).catchError((_) {});
    // Pass the current level directly to home page — no SharedPreferences read needed
    widget.onBackToMenu(levelToReport);
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final cellSize = math.min(
      (screenSize.width - 46) / boardSize,
      (screenSize.height - 300) / boardSize,
    );
    final boardGridColor = showStartCountdown ? countdownBoardGridColor : classicBoardGridColor;

    // CHANGE 5: showExitDialog calls _backToMenu directly — same synchronous pattern
    void showExitDialog() {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (BuildContext exitDialogContext) => AlertDialog(
          title: const Text('Exit Game?'),
          content: const Text('Are you sure you want to exit? Your progress will be saved.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(exitDialogContext).pop(),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(exitDialogContext).pop();
                _backToMenu();
              },
              child: const Text('Exit'),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      backgroundColor: classicBoardBackground,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        toolbarHeight: 56,
        titleSpacing: 0,
        backgroundColor: Colors.black,
        foregroundColor: primaryYellow,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(2),
          child: Container(color: primaryYellow),
        ),
        title: Row(
          children: [
            Expanded(
              flex: 5,
              child: Align(
                alignment: Alignment.centerLeft,
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: showExitDialog,
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.only(left: 4, top: 4, bottom: 4),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Image.asset(
                            'assets/BEE-FIVE.png',
                            height: 32,
                            fit: BoxFit.contain,
                            errorBuilder: (_, _, _) => const SizedBox(width: 32, height: 32),
                          ),
                          const SizedBox(width: 6),
                          const Text(
                            'Adventure',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: primaryYellow,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Expanded(
              flex: 3,
              child: Center(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    'Level $currentGame',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.green,
                    ),
                  ),
                ),
              ),
            ),
            Expanded(
              flex: 5,
              child: Align(
                alignment: Alignment.centerRight,
                child: Padding(
                  padding: const EdgeInsets.only(right: 4),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Image.asset(
                        'assets/homeImagery/xp_gem.png',
                        width: 28,
                        height: 28,
                        fit: BoxFit.contain,
                        errorBuilder: (_, _, _) => Icon(Icons.star, color: primaryYellow, size: 28),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '$_headerXp',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: primaryYellow,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      body: ScrollConfiguration(
        behavior: _NoScrollbarBehavior(),
        child: SafeArea(
          child: (_showBeeFactScreen && _currentBeeFact != null)
              ? Center(
                  child: Container(
                    margin: const EdgeInsets.all(24),
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E1E1E),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: primaryYellow, width: 2),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'Bee Fact',
                          style: TextStyle(
                            color: primaryYellow,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          _currentBeeFact!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 18),
                        ElevatedButton(
                          onPressed: _startFromBeeFactScreen,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: primaryYellow,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                              side: const BorderSide(color: Colors.black, width: 2),
                            ),
                          ),
                          child: const Text(
                            'Start',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              : Column(
            children: [
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
                      style: TextStyle(
                        color: (gameStatus == 'Your turn' ||
                                gameStatus == 'AI thinking...')
                            ? _turnAnnouncementOrange
                            : (winner == 1 &&
                                    (gameStatus == 'You Won!' ||
                                        gameStatus.startsWith('Match won')))
                                ? Colors.green
                                : primaryYellow,
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
            ),
            Expanded(
              child: Container(
                padding: const EdgeInsets.only(top: 10, left: 20, right: 20, bottom: 20),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.start,
                  children: [
                    const SizedBox(height: 10),
                    Stack(
                        children: [
                          Opacity(
                            opacity: ((isBlindPlay || temporaryBlindPlay) && gameStarted && gameInitialized) ? 0 : 1,
                            child: Container(
                              decoration: BoxDecoration(
                                color: boardGridColor,
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
                                                ? (winner == 1 ? Colors.black : primaryYellow)
                                                : isBlocked
                                                    ? Colors.grey.shade400
                                                    : isMudZone
                                                        ? Colors.brown.shade200
                                                        : boardGridColor,
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
            if (_isBannerAdLoaded && _bannerAd != null)
              Container(
                alignment: Alignment.center,
                width: _bannerAd!.size.width.toDouble(),
                height: _bannerAd!.size.height.toDouble(),
                color: Colors.black,
                child: AdWidget(ad: _bannerAd!),
              ),
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
                        onPressed: showExitDialog,
                        style: TextButton.styleFrom(
                          backgroundColor: primaryYellow,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                            side: const BorderSide(color: Colors.black, width: 2),
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Image.asset(
                              'assets/homeImagery/home.png',
                              width: 22,
                              height: 22,
                              fit: BoxFit.contain,
                              errorBuilder: (_, _, _) => const Icon(Icons.home, size: 22),
                            ),
                            const SizedBox(width: 8),
                            const Text('Home'),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextButton(
                        onPressed: _resetGame,
                        style: TextButton.styleFrom(
                          backgroundColor: primaryYellow,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                            side: const BorderSide(color: Colors.black, width: 2),
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Image.asset(
                              'assets/homeImagery/restart_icon.png',
                              width: 22,
                              height: 22,
                              fit: BoxFit.contain,
                              errorBuilder: (_, _, _) => const Icon(Icons.refresh, size: 22),
                            ),
                            const SizedBox(width: 8),
                            const Text('Restart'),
                          ],
                        ),
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