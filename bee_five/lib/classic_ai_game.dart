import 'package:flutter/material.dart';
import 'dart:math' as math;
import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'adventure_game_logic.dart' as logic;
import 'background_sound.dart';
import 'adventure_progress_service.dart' show scheduleProgressCloudSync;
import 'xp_service.dart';

const Color primaryYellow = Color(0xFFFFC30B);
const int boardSize = 10;
const int _classicSessionSeconds = 10 * 60; // 10 minutes
const String _prefClassicBestStreak = 'classic_best_streak';

class ClassicAIGame extends StatefulWidget {
  final VoidCallback onBackToMenu;
  final String initialDifficulty;
  final int initialTimer;
  final String? backgroundColor;
  final bool isClassicStreakMode;

  const ClassicAIGame({
    super.key,
    required this.onBackToMenu,
    this.initialDifficulty = 'medium',
    this.initialTimer = 15,
    this.backgroundColor,
    this.isClassicStreakMode = false,
  });

  @override
  State<ClassicAIGame> createState() => _ClassicAIGameState();
}

class _ClassicAIGameState extends State<ClassicAIGame> {
  List<List<int>> board = [];
  int currentPlayer = 2; // 1 = human (yellow), 2 = AI (black)
  int winner = 0; // 0 = no winner/draw, 1 = human, 2 = AI
  List<List<int>> winningPieces = [];
  bool showWinModal = false;
  String winMessage = '';
  String aiDifficulty = 'medium';
  int timeLeft = 15;
  Timer? timer;
  bool isAITurn = false;

  // Classic streak mode only
  int classicSessionTimeLeft = _classicSessionSeconds;
  int classicGamesWon = 0;
  int classicBestStreak = 0;
  Timer? sessionTimer;
  bool classicGameOver = false;
  /// Game index in the current streak session (1-based). Sequence: 2 easy, 2 medium, 2 hard, repeat.
  int _classicGameIndex = 1;

  // Blocked cells (cannot be played on) — stored as "row,col" strings
  Set<String> _blockedCells = {};

  int _headerXp = 0;
  int _lastXpDelta = 0;

  // Track "Play Again" clicks for interstitial (show on every 4th click)
  int _playAgainCount = 0;

  /// Difficulty for classic streak: games 1–2 easy, 3–4 medium, 5–6 hard, then repeat.
  /// Games ending in 6 or 7 within first 100 games are forced to medium.
  static String _classicStreakDifficultyForGame(int gameIndex) {
    if (gameIndex <= 100 && (gameIndex % 10 == 6 || gameIndex % 10 == 7)) {
      return 'medium';
    }
    final slot = (gameIndex - 1) % 6;
    if (slot < 2) return 'easy';
    if (slot < 4) return 'medium';
    return 'hard';
  }

  /// Returns the score increment for a win based on difficulty.
  static int _scoreForDifficulty(String difficulty) {
    switch (difficulty) {
      case 'easy':
        return 1;
      case 'medium':
        return 2;
      case 'hard':
        return 3;
      default:
        return 1;
    }
  }

  /// Returns how many cells should be blocked for the given game index.
  /// Games 1–6: 0 blocked, 7–12: 4 blocked, 13–18: 7 blocked, 19+: 12 blocked.
  static int _blockedCellCountForGame(int gameIndex) {
    if (gameIndex <= 6) return 0;
    if (gameIndex <= 12) return 4;
    if (gameIndex <= 18) return 7;
    return 12;
  }

  /// Generates a set of random blocked cell keys ("row,col") for the board,
  /// ensuring they don't overlap with each other.
  Set<String> _generateBlockedCells(int count) {
    if (count == 0) return {};
    final random = math.Random();
    final blocked = <String>{};
    while (blocked.length < count) {
      final row = random.nextInt(boardSize);
      final col = random.nextInt(boardSize);
      blocked.add('$row,$col');
    }
    return blocked;
  }

  bool _isCellBlocked(int row, int col) => _blockedCells.contains('$row,$col');

  // Banner ad variables
  BannerAd? _bannerAd;
  bool _isBannerAdLoaded = false;

  // Interstitial ad variables
  InterstitialAd? _interstitialAd;

  @override
  void initState() {
    super.initState();
    if (widget.isClassicStreakMode) {
      aiDifficulty = _classicStreakDifficultyForGame(1);
      timeLeft = 0;
      _loadBestStreak();
      _startSessionTimer();
    } else {
      aiDifficulty = widget.initialDifficulty;
      timeLeft = widget.initialTimer;
    }
    _resetBoard();
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

  // Show interstitial only when "Play Again" is clicked the 4th time
  void _onPlayAgainPressed() {
    _playAgainCount++;
    if (_playAgainCount % 4 == 0 && _interstitialAd != null) {
      _interstitialAd!.fullScreenContentCallback = FullScreenContentCallback(
        onAdDismissedFullScreenContent: (ad) {
          ad.dispose();
          _interstitialAd = null;
          _loadInterstitialAd();
          setState(() => showWinModal = false);
          _resetGame();
        },
        onAdFailedToShowFullScreenContent: (ad, error) {
          ad.dispose();
          _interstitialAd = null;
          _loadInterstitialAd();
          setState(() => showWinModal = false);
          _resetGame();
        },
      );
      _interstitialAd!.show();
    } else {
      setState(() => showWinModal = false);
      _resetGame();
    }
  }

  Future<void> _loadBestStreak() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      classicBestStreak = prefs.getInt(_prefClassicBestStreak) ?? 0;
    });
  }

  Future<void> _saveBestStreak(int streak) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_prefClassicBestStreak, streak);
    scheduleProgressCloudSync();
  }

  void _startSessionTimer() {
    sessionTimer?.cancel();
    sessionTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || classicGameOver) return;
      setState(() {
        if (classicSessionTimeLeft > 0 && winner == 0) {
          classicSessionTimeLeft--;
        }
        if (classicSessionTimeLeft <= 0) {
          _classicSessionEnd(timeUp: true);
        }
      });
    });
  }

  void _classicSessionEnd({required bool timeUp, bool delayModal = true}) {
    if (classicGameOver) return;
    sessionTimer?.cancel();
    classicGameOver = true;
    if (classicGamesWon > classicBestStreak) {
      classicBestStreak = classicGamesWon;
      _saveBestStreak(classicBestStreak);
    }
    void showModal() {
      if (!mounted) return;
      setState(() {
        _lastXpDelta = 0;
        winMessage = timeUp
            ? 'Time\'s up!\nScore: $classicGamesWon\nBest: $classicBestStreak'
            : 'Game Over\nScore: $classicGamesWon\nBest: $classicBestStreak';
        showWinModal = true;
      });
    }

    if (delayModal) {
      Future.delayed(const Duration(seconds: 2), showModal);
    } else {
      showModal();
    }
  }

  void _scheduleEndGameModal() {
    Future.delayed(const Duration(seconds: 2), () {
      if (!mounted) return;
      setState(() => showWinModal = true);
    });
  }

  Color? _winningCellBackground(int row, int col) {
    if (winner == 0 || winningPieces.isEmpty) return null;
    if (!winningPieces.any((p) => p[0] == row && p[1] == col)) return null;
    if (winner == 1) return Colors.black;
    if (winner == 2) return primaryYellow;
    return null;
  }

  @override
  void dispose() {
    timer?.cancel();
    sessionTimer?.cancel();
    _bannerAd?.dispose();
    _interstitialAd?.dispose();
    super.dispose();
  }

  void _resetBoard() {
    // Compute blocked cells for current game index (only in classic streak mode)
    final int blockedCount = widget.isClassicStreakMode
        ? _blockedCellCountForGame(_classicGameIndex)
        : 0;
    final newBlockedCells = _generateBlockedCells(blockedCount);

    setState(() {
      board = List.generate(boardSize, (_) => List.filled(boardSize, 0));
      _blockedCells = newBlockedCells;
      currentPlayer = 1;
      winner = 0;
      winningPieces = [];
      showWinModal = false;
      winMessage = '';
      _lastXpDelta = 0;
      isAITurn = false;
      if (!widget.isClassicStreakMode) {
        timeLeft = widget.initialTimer;
      }
    });
    timer?.cancel();
    if (!widget.isClassicStreakMode && widget.initialTimer > 0) {
      _startTimer();
    }
  }

  void _resetGame() {
    _resetBoard();
  }

  void _startTimer() {
    timer?.cancel();
    timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() {
        if (timeLeft > 0 && currentPlayer == 1 && winner == 0) {
          timeLeft--;
        } else if (timeLeft <= 0) {
          _handleTimeUp();
          timer.cancel();
        }
      });
    });
  }

  void _handleTimeUp() {
    if (widget.isClassicStreakMode) {
      _classicSessionEnd(timeUp: true);
      return;
    }
    setState(() {
      _lastXpDelta = 0;
      winner = 2;
      winningPieces = [];
      winMessage = 'Time\'s up! AI wins!';
    });
    _scheduleEndGameModal();
  }

  bool _checkWinner(int row, int col, int player) {
    return logic.checkWinCondition(board, row, col, player);
  }

  void _handleCellClick(int row, int col) {
    // Blocked cells cannot be played on
    if (_isCellBlocked(row, col)) return;
    if (board[row][col] != 0 || winner != 0 || currentPlayer != 1 || isAITurn) {
      return;
    }

    setState(() {
      board[row][col] = currentPlayer;
      timeLeft = widget.initialTimer;
    });

    if (_checkWinner(row, col, currentPlayer)) {
      if (widget.isClassicStreakMode) {
        final int points = _scoreForDifficulty(aiDifficulty);
        setState(() {
          classicGamesWon += points;
          if (classicGamesWon > classicBestStreak) {
            classicBestStreak = classicGamesWon;
            _saveBestStreak(classicBestStreak);
          }
          _classicGameIndex++;
          aiDifficulty = _classicStreakDifficultyForGame(_classicGameIndex);
          winner = 1;
          winningPieces = logic.getWinningPieces(board, row, col, 1);
        });
        onClassicStreakWin(classicGamesWon).then((result) {
          if (mounted) {
            setState(() {
              _headerXp = result.$1;
              _lastXpDelta = result.$2;
            });
          }
        });
        timer?.cancel();
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) _resetBoard();
        });
        return;
      }
      if (widget.initialDifficulty == 'hard') {
        onHardPracticeWin().then((result) {
          if (mounted) {
            setState(() {
              _headerXp = result.$1;
              _lastXpDelta = result.$2;
            });
          }
        });
      } else {
        setState(() => _lastXpDelta = 0);
      }
      setState(() {
        winner = currentPlayer;
        winMessage = 'You win!';
        winningPieces = logic.getWinningPieces(board, row, col, currentPlayer);
      });
      timer?.cancel();
      _scheduleEndGameModal();
    } else {
      bool isDraw = true;
      for (int r = 0; r < boardSize; r++) {
        for (int c = 0; c < boardSize; c++) {
          if (board[r][c] == 0 && !_isCellBlocked(r, c)) {
            isDraw = false;
            break;
          }
        }
        if (!isDraw) break;
      }

      if (isDraw) {
        if (widget.isClassicStreakMode) {
          _classicSessionEnd(timeUp: false);
          return;
        }
        setState(() {
          _lastXpDelta = 0;
          winner = 0;
          winningPieces = [];
          winMessage = 'Game Over - Draw!';
        });
        timer?.cancel();
        _scheduleEndGameModal();
      } else {
        setState(() {
          currentPlayer = 2;
          isAITurn = true;
        });
        _makeAIMove();
      }
    }
  }

  void _makeAIMove() {
    final availableCells = <Map<String, int>>[];
    for (int row = 0; row < boardSize; row++) {
      for (int col = 0; col < boardSize; col++) {
        if (board[row][col] == 0 && !_isCellBlocked(row, col)) {
          availableCells.add({'row': row, 'col': col});
        }
      }
    }

    if (availableCells.isEmpty) {
      setState(() {
        _lastXpDelta = 0;
        winner = 0;
        winningPieces = [];
        winMessage = 'Game Over - Draw!';
      });
      timer?.cancel();
      _scheduleEndGameModal();
      return;
    }

    Future.delayed(const Duration(milliseconds: 500), () {
      if (!mounted || winner != 0) return;

      final aiMove = _getBestAIMove(availableCells, board);
      final row = aiMove['row']!;
      final col = aiMove['col']!;

      setState(() {
        board[row][col] = 2;
        isAITurn = false;
      });

      if (_checkWinner(row, col, 2)) {
        if (widget.isClassicStreakMode) {
          setState(() {
            _lastXpDelta = 0;
            winner = 2;
            winningPieces = logic.getWinningPieces(board, row, col, 2);
            winMessage = 'AI wins!';
          });
          timer?.cancel();
          Future.delayed(const Duration(seconds: 2), () {
            if (!mounted) return;
            _classicSessionEnd(timeUp: false, delayModal: false);
          });
          return;
        }
        setState(() {
          _lastXpDelta = 0;
          winner = 2;
          winMessage = 'AI wins!';
          winningPieces = logic.getWinningPieces(board, row, col, 2);
        });
        timer?.cancel();
        _scheduleEndGameModal();
      } else {
        bool isDraw = true;
        for (int r = 0; r < boardSize; r++) {
          for (int c = 0; c < boardSize; c++) {
            if (board[r][c] == 0 && !_isCellBlocked(r, c)) {
              isDraw = false;
              break;
            }
          }
          if (!isDraw) break;
        }

        if (isDraw) {
          if (widget.isClassicStreakMode) {
            _classicSessionEnd(timeUp: false);
            return;
          }
          setState(() {
            _lastXpDelta = 0;
            winner = 0;
            winningPieces = [];
            winMessage = 'Game Over - Draw!';
          });
          timer?.cancel();
          _scheduleEndGameModal();
        } else {
          setState(() {
            currentPlayer = 1;
            timeLeft = widget.initialTimer;
          });
          if (widget.initialTimer > 0) {
            _startTimer();
          }
        }
      }
    });
  }

  Map<String, int> _getBestAIMove(List<Map<String, int>> availableCells, List<List<int>> currentBoard) {
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

  void _handleExit() {
    timer?.cancel();
    sessionTimer?.cancel();
    widget.onBackToMenu();
  }

  Future<void> _confirmExit() async {
    final shouldExit = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Exit Game?'),
        content: const Text('Are you sure you want to exit?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext, rootNavigator: true).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext, rootNavigator: true).pop(true),
            child: const Text('Exit'),
          ),
        ],
      ),
    );

    if (shouldExit == true && mounted) {
      _handleExit();
    }
  }

  /// Builds the widget for a blocked cell.
  Widget _buildBlockedCell(double cellSize) {
    return Container(
      width: cellSize,
      height: cellSize,
      decoration: BoxDecoration(
        color: Colors.grey.shade800,
        border: Border.all(color: Colors.white, width: 2.0),
      ),
      child: Center(
        child: Image.asset(
          'assets/BEE-FIVE.png',
          width: cellSize * 0.7,
          height: cellSize * 0.7,
          fit: BoxFit.contain,
          // Fallback: grey X icon if image not found
          errorBuilder: (_, _, _) => Icon(
            Icons.block,
            color: primaryYellow,
            size: cellSize * 0.6,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const double borderWidth = 2.0;
    final totalBorders = (boardSize + 1) * borderWidth;

    return Stack(
      children: [
        Scaffold(
          backgroundColor: const Color(0xFF808080),
          body: SafeArea(
            child: Column(
              children: [
                // Header
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 15),
                  decoration: const BoxDecoration(
                    color: Colors.black,
                    border: Border(
                      bottom: BorderSide(color: primaryYellow, width: 2),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const SizedBox(width: 40),
                      Image.asset(
                        'assets/BEE-FIVE.png',
                        height: 40,
                        fit: BoxFit.contain,
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Image.asset(
                            'assets/homeImagery/xp_gem.png',
                            width: 28,
                            height: 28,
                            fit: BoxFit.contain,
                            errorBuilder: (_, Object error, StackTrace? stackTrace) => Icon(Icons.star, color: primaryYellow, size: 28),
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
                    ],
                  ),
                ),

                // Classic mode: Best streak at top
                if (widget.isClassicStreakMode)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                    color: primaryYellow.withValues(alpha: 0.95),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Best: $classicBestStreak',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.black,
                          ),
                        ),
                        const SizedBox(width: 24),
                        Text(
                          'Score: $classicGamesWon',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.black,
                          ),
                        ),
                        const SizedBox(width: 24),
                        Text(
                          'Time: ${classicSessionTimeLeft ~/ 60}:${(classicSessionTimeLeft % 60).toString().padLeft(2, '0')}',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: classicSessionTimeLeft <= 60 ? Colors.red : Colors.black,
                          ),
                        ),
                      ],
                    ),
                  ),

                // Game Info
                Container(
                  padding: const EdgeInsets.all(15),
                  child: Column(
                    children: [
                      Text(
                        currentPlayer == 1 ? '▶ Your Turn (Yellow)' : '🤖 AI\'s Turn (Black)',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.black,
                        ),
                      ),
                      if (!widget.isClassicStreakMode && widget.initialTimer > 0 && currentPlayer == 1 && winner == 0)
                        Text(
                          'Time: ${timeLeft}s',
                          style: TextStyle(
                            fontSize: 16,
                            color: timeLeft <= 5 ? Colors.red : Colors.black,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      // Show blocked cell count hint in classic streak mode
                      if (widget.isClassicStreakMode && _blockedCells.isNotEmpty)
                        Text(
                          '🚫 ${_blockedCells.length} blocked cell${_blockedCells.length == 1 ? '' : 's'}',
                          style: const TextStyle(
                            fontSize: 13,
                            color: Colors.black54,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                    ],
                  ),
                ),

                // Game Board
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final boardSide = constraints.maxWidth;
                      final cellSize = (boardSide - totalBorders) / boardSize;
                      return Center(
                        child: Container(
                          width: boardSide,
                          height: boardSide,
                          decoration: BoxDecoration(
                            color: const Color(0xFF87CEEB),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.black, width: 3),
                          ),
                          padding: EdgeInsets.all(borderWidth),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: List.generate(boardSize, (row) {
                              return Row(
                                mainAxisSize: MainAxisSize.min,
                                children: List.generate(boardSize, (col) {
                                  // Blocked cell — show logo, no interaction
                                  if (_isCellBlocked(row, col)) {
                                    return _buildBlockedCell(cellSize);
                                  }

                                  return GestureDetector(
                                    onTap: () => _handleCellClick(row, col),
                                    child: Container(
                                      width: cellSize,
                                      height: cellSize,
                                      decoration: BoxDecoration(
                                        color: _winningCellBackground(row, col) ??
                                            const Color(0xFF87CEEB),
                                        border: Border.all(
                                          color: Colors.white,
                                          width: borderWidth,
                                        ),
                                      ),
                                      child: board[row][col] != 0
                                          ? Center(
                                              child: Container(
                                                width: cellSize / 1.5,
                                                height: cellSize / 1.5,
                                                decoration: BoxDecoration(
                                                  color: board[row][col] == 1
                                                      ? primaryYellow
                                                      : Colors.black,
                                                  shape: BoxShape.circle,
                                                ),
                                              ),
                                            )
                                          : null,
                                    ),
                                  );
                                }),
                              );
                            }),
                          ),
                        ),
                      );
                    },
                  ),
                ),

                // Banner ad above footer
                if (_isBannerAdLoaded && _bannerAd != null)
                  Container(
                    alignment: Alignment.center,
                    width: _bannerAd!.size.width.toDouble(),
                    height: _bannerAd!.size.height.toDouble(),
                    color: Colors.black,
                    child: AdWidget(ad: _bannerAd!),
                  ),

                // Footer
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 15),
                  decoration: const BoxDecoration(
                    color: Colors.black,
                    border: Border(
                      top: BorderSide(color: primaryYellow, width: 2),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          child: ElevatedButton(
                            onPressed: _confirmExit,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: primaryYellow,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                                side: const BorderSide(color: Colors.black, width: 2),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Image.asset(
                                  'assets/homeImagery/home.png',
                                  width: 20,
                                  height: 20,
                                  fit: BoxFit.contain,
                                  errorBuilder: (_, _, _) => const SizedBox.shrink(),
                                ),
                                const SizedBox(width: 6),
                                const Text(
                                  'Home',
                                  style: TextStyle(
                                    color: Colors.black,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      if (!widget.isClassicStreakMode)
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            child: ElevatedButton(
                              onPressed: _resetGame,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: primaryYellow,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  side: const BorderSide(color: Colors.black, width: 2),
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Image.asset(
                                    'assets/homeImagery/restart_icon.png',
                                    width: 22,
                                    height: 22,
                                    fit: BoxFit.contain,
                                    errorBuilder: (_, _, _) => const SizedBox.shrink(),
                                  ),
                                  const SizedBox(width: 8),
                                  const Text(
                                    'Restart',
                                    style: TextStyle(
                                      color: Colors.black,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
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
              ],
            ),
          ),
        ),

        // Win Modal
        if (showWinModal)
          Container(
            color: Colors.black.withValues(alpha: 0.8),
            child: Center(
              child: Container(
                margin: const EdgeInsets.all(20),
                padding: const EdgeInsets.all(30),
                decoration: BoxDecoration(
                  color: primaryYellow,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.black, width: 4),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      winMessage,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.black,
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
                    const SizedBox(height: 30),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (classicGameOver)
                          ElevatedButton(
                            onPressed: () {
                              setState(() {
                                classicGameOver = false;
                                classicSessionTimeLeft = _classicSessionSeconds;
                                classicGamesWon = 0;
                                _classicGameIndex = 1;
                                aiDifficulty = _classicStreakDifficultyForGame(1);
                              });
                              _onPlayAgainPressed();
                              _startSessionTimer();
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 24,
                                vertical: 12,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                                side: const BorderSide(color: Colors.black, width: 2),
                              ),
                            ),
                            child: const Text(
                              'Try Again',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                          )
                        else
                          ElevatedButton(
                            onPressed: _onPlayAgainPressed,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 24,
                                vertical: 12,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                                side: const BorderSide(color: Colors.black, width: 2),
                              ),
                            ),
                            child: const Text(
                              'Play Again',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                          ),
                        const SizedBox(width: 15),
                        ElevatedButton(
                          onPressed: () {
                            setState(() => showWinModal = false);
                            _handleExit();
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 24,
                              vertical: 12,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                              side: const BorderSide(color: Colors.black, width: 2),
                            ),
                          ),
                          child: const Text(
                            'Back to Menu',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}