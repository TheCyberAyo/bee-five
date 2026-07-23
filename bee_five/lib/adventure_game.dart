import 'package:flutter/material.dart';
import 'dart:math' as math;
import 'dart:async';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'ads/ad_unit_ids.dart';
import 'ads/ad_log.dart';
import 'adventure_game_rules.dart';
import 'adventure_game_logic.dart' as logic;
import 'background_sound.dart';
import 'adventure_progress_service.dart';
import 'xp_service.dart';
import 'bee_facts.dart';
import 'theme/adventure_theme.dart';

/// Hides scrollbar completely (no vertical bar on the side).
class _NoScrollbarBehavior extends ScrollBehavior {
  @override
  Widget buildScrollbar(BuildContext context, Widget child, ScrollableDetails details) {
    return child;
  }
}

const Color primaryYellow = beeFivePrimaryYellow;
const Color _turnAnnouncementOrange = Color(0xFFFF9800);
const int boardSize = 10;
/// Web GameCanvas draws pieces with radius cellSize / 3 (diameter 2/3 of cell).
const double _adventurePieceDiameterFactor = 2 / 3;

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

class _AdventureGameState extends State<AdventureGame> with WidgetsBindingObserver {
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
  Timer? _countdownSequenceTimer;

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
  RewardedAd? _skipLevelRewardedAd;
  int _actionCount = 0;
  int _consecutiveLevelLosses = 0;
  int _consecutiveGameWins = 0;
  bool _isWaitingForNextMatch = false;
  int _matchCountdownTimer = 0;
  bool _showMatchWinnerAnnouncement = false;
  String _matchWinnerMessage = '';
  bool _showWowAnnouncement = false;
  bool _showHayiJongaAnnouncement = false;
  bool _showUnstoppableAnnouncement = false;
  String _unstoppableFlowerAsset = _unstoppableFlowerAssets.first;
  String? _lastAnnouncedMatchKey;

  static const List<String> _unstoppableFlowerAssets = [
    'assets/mapImagery/sunflower.png',
    'assets/mapImagery/lavender.png',
    'assets/mapImagery/echinacea.png',
    'assets/mapImagery/borage.png',
    'assets/mapImagery/clover.png',
  ];

  String _unstoppableFlowerForWin(int consecutiveWins) {
    return _unstoppableFlowerAssets[
        (consecutiveWins - 3) % _unstoppableFlowerAssets.length];
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    currentGame = widget.initialGame;
    _initializeGame();
    BackgroundSound.instance.startIfEnabled();
    getXp().then((xp) {
      if (mounted) setState(() => _headerXp = xp);
    });
    getAdventureConsecutiveLosses().then((losses) {
      if (mounted) setState(() => _consecutiveLevelLosses = losses);
    });
    _loadBannerAd();
    _loadInterstitialAd();
    _loadSkipLevelRewardedAd();
  }

  void _loadBannerAd() {
    _bannerAd = BannerAd(
      adUnitId: kBannerAdUnitId,
      size: AdSize.banner,
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (ad) {
          if (mounted) setState(() => _isBannerAdLoaded = true);
        },
        onAdFailedToLoad: (ad, error) {
          logAdLoadFailure('adventure banner', error);
          ad.dispose();
        },
      ),
    )..load();
  }

  void _loadInterstitialAd() {
    InterstitialAd.load(
      adUnitId: kInterstitialAdUnitId,
      request: const AdRequest(),
      adLoadCallback: InterstitialAdLoadCallback(
        onAdLoaded: (ad) {
          _interstitialAd = ad;
        },
        onAdFailedToLoad: (error) {
          logAdLoadFailure('adventure interstitial', error);
          _interstitialAd = null;
        },
      ),
    );
  }

  void _loadSkipLevelRewardedAd() {
    RewardedAd.load(
      adUnitId: kRewardedAdUnitId,
      request: const AdRequest(),
      rewardedAdLoadCallback: RewardedAdLoadCallback(
        onAdLoaded: (ad) => _skipLevelRewardedAd = ad,
        onAdFailedToLoad: (error) {
          logAdLoadFailure('adventure skip rewarded', error);
          _skipLevelRewardedAd = null;
        },
      ),
    );
  }

  void _beginMatchCountdown() {
    setState(() {
      _isWaitingForNextMatch = true;
      _matchCountdownTimer = 3;
    });
    _startMatchCountdown();
  }

  void _scheduleCelebrationThen(
    void Function() applyShow,
    void Function() applyHide,
    VoidCallback onComplete,
  ) {
    Future.delayed(const Duration(seconds: 2), () {
      if (!mounted) return;
      setState(applyShow);
      Future.delayed(const Duration(seconds: 2), () {
        if (!mounted) return;
        setState(applyHide);
        onComplete();
      });
    });
  }

  void _resetWinCelebrationStreak() {
    _consecutiveGameWins = 0;
    _lastAnnouncedMatchKey = null;
  }

  bool _scheduleWinCelebrationIfEligible(VoidCallback onComplete) {
    if (winner == 1 && _consecutiveGameWins >= 3) {
      _scheduleCelebrationThen(
        () {
          _unstoppableFlowerAsset =
              _unstoppableFlowerForWin(_consecutiveGameWins);
          _showUnstoppableAnnouncement = true;
          gameStatus = 'Unstoppable 🐝';
        },
        () => _showUnstoppableAnnouncement = false,
        onComplete,
      );
      return true;
    }

    if (winner == 1 && _consecutiveGameWins == 2) {
      _scheduleCelebrationThen(
        () {
          _showHayiJongaAnnouncement = true;
          gameStatus = 'Hayi Jonga 🔥🔥';
        },
        () => _showHayiJongaAnnouncement = false,
        onComplete,
      );
      return true;
    }

    if (winner == 1 && _consecutiveGameWins == 1) {
      _scheduleCelebrationThen(
        () {
          _showWowAnnouncement = true;
          gameStatus = 'Wow!';
        },
        () => _showWowAnnouncement = false,
        onComplete,
      );
      return true;
    }

    return false;
  }

  void _scheduleMidMatchContinuation() {
    final matchKey = '$currentGame-$currentMatch';
    if (_lastAnnouncedMatchKey == matchKey) return;
    _lastAnnouncedMatchKey = matchKey;

    if (_scheduleWinCelebrationIfEligible(_beginMatchCountdown)) return;

    final message = winner == 1
        ? 'You Won Match $currentMatch/$totalGames! 🎉'
        : 'AI won Match $currentMatch/$totalGames! 😔';
    setState(() {
      _showMatchWinnerAnnouncement = true;
      _matchWinnerMessage = message;
      gameStatus = message;
    });
    Future.delayed(const Duration(seconds: 2), () {
      if (!mounted) return;
      setState(() => _showMatchWinnerAnnouncement = false);
      _beginMatchCountdown();
    });
  }

  bool _isLevelWin() {
    if (winner != 1) return false;
    if (!(gameRules?.isMatchGame ?? false)) return true;
    return playerWins >= requiredWins;
  }

  bool get _canOfferSkipLevelAd =>
      _consecutiveLevelLosses >= adventureLossesBeforeSkipAdOffer;

  void _watchAdToSkipLevel() {
    final ad = _skipLevelRewardedAd;
    if (ad == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Ad not ready yet, please try again in a moment.'),
          backgroundColor: Colors.orange,
        ),
      );
      _loadSkipLevelRewardedAd();
      return;
    }

    ad.fullScreenContentCallback = FullScreenContentCallback(
      onAdDismissedFullScreenContent: (ad) {
        ad.dispose();
        _skipLevelRewardedAd = null;
        _loadSkipLevelRewardedAd();
      },
      onAdFailedToShowFullScreenContent: (ad, error) {
        logAdFailure('adventure skip rewarded show', error);
        ad.dispose();
        _skipLevelRewardedAd = null;
        _loadSkipLevelRewardedAd();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Could not show the ad. Please try again.'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      },
    );

    ad.show(
      onUserEarnedReward: (_, reward) {
        if (mounted) _showSkipLevelCountdown();
      },
    );
  }

  void _showSkipLevelCountdown() {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withValues(alpha: 0.7),
      builder: (dialogContext) {
        return _AdSkipCountdownDialog(
          seconds: 30,
          onComplete: () {
            Navigator.of(dialogContext).pop();
            _skipToNextLevelViaAd();
          },
        );
      },
    );
  }

  void _skipToNextLevelViaAd() {
    resetAdventureConsecutiveLosses();
    final nextLevel = currentGame + 1;

    Future.microtask(() async {
      try {
        await saveAdventureLevel(nextLevel);
      } catch (_) {}
    });

    setState(() {
      _consecutiveLevelLosses = 0;
      currentGame = nextLevel;
      currentMatch = 1;
      playerWins = 0;
      aiWins = 0;
      isMatchComplete = false;
      _isWaitingForNextMatch = false;
      _matchCountdownTimer = 0;
      _showMatchWinnerAnnouncement = false;
      _showWowAnnouncement = false;
      _showHayiJongaAnnouncement = false;
      _showUnstoppableAnnouncement = false;
      _lastAnnouncedMatchKey = null;
    });
    _initializeGame();
  }

  void _onActionPressed({required bool isContinue}) {
    _actionCount++;
    if (_actionCount % 6 == 0 && _interstitialAd != null) {
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
    WidgetsBinding.instance.removeObserver(this);
    _persistProgressBestEffort();
    timer?.cancel();
    _countdownSequenceTimer?.cancel();
    _bannerAd?.dispose();
    _interstitialAd?.dispose();
    _skipLevelRewardedAd?.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused ||
        state == AppLifecycleState.detached) {
      _persistProgressBestEffort();
    } else if (state == AppLifecycleState.resumed) {
      if (mounted) {
        setState(_resetWinCelebrationStreak);
      }
    }
  }

  void _persistProgressBestEffort() {
    saveAdventureLevel(currentGame).catchError((_) {});
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

    if (currentMatch == 1) {
      _lastAnnouncedMatchKey = null;
    }

    _currentBeeFact = getBeeFactForGame(currentGame);
    final shouldShowStartCountdown =
        !gameRules!.isMatchGame || currentMatch == 1;

    if (_currentBeeFact != null && currentMatch == 1) {
      showStartCountdown = false;
      _showBeeFactScreen = true;
    } else {
      _showBeeFactScreen = false;
      if (shouldShowStartCountdown) {
        showStartCountdown = true;
        startCountdown = 3;
        _startCountdown();
      } else {
        showStartCountdown = false;
        startCountdown = 0;
        _beginGameAfterCountdown();
      }
    }
  }

  void _beginGameAfterCountdown() {
    showStartCountdown = false;
    gameStarted = true;
    gameInitialized = true;
    _startTimer();
    if (currentPlayer == 2) {
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) _makeAIMove();
      });
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
    _countdownSequenceTimer?.cancel();
    startCountdown = 3;
    showStartCountdown = true;

    Future<void> run() async {
      for (var i = 3; i >= 1; i--) {
        if (!mounted || !showStartCountdown) return;
        setState(() => startCountdown = i);
        await Future.delayed(const Duration(seconds: 1));
      }
      if (!mounted || !showStartCountdown) return;
      setState(() => startCountdown = 0);
      if (!mounted || !showStartCountdown) return;
      setState(_beginGameAfterCountdown);
    }

    run();
  }

  void _startMatchCountdown() {
    _countdownSequenceTimer?.cancel();

    Future<void> run() async {
      for (var i = 3; i >= 1; i--) {
        if (!mounted || !_isWaitingForNextMatch) return;
        setState(() => _matchCountdownTimer = i);
        await Future.delayed(const Duration(seconds: 1));
      }
      if (!mounted || !_isWaitingForNextMatch) return;
      setState(() {
        _isWaitingForNextMatch = false;
        _matchCountdownTimer = 0;
        currentMatch++;
        _initializeGame();
      });
    }

    run();
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
      _consecutiveGameWins++;
      onAdventureGameWon(
        levelJustPlayed: currentGame,
        levelClearingWin: _isLevelWin(),
      ).then((result) {
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
      _resetWinCelebrationStreak();
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
        _scheduleMidMatchContinuation();
        return;
      }
    }

    Future.delayed(const Duration(milliseconds: 500), () async {
      if (!mounted) return;
      if (!_isLevelWin()) {
        final losses = await recordAdventureLevelFailure(currentGame);
        if (mounted) setState(() => _consecutiveLevelLosses = losses);
      }
      if (mounted) {
        if (!_scheduleWinCelebrationIfEligible(_showGameOverPopup)) {
          _showGameOverPopup();
        }
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
                      if (_canOfferSkipLevelAd) ...[
                        ElevatedButton(
                          onPressed: () {
                            Navigator.of(dialogContext).pop();
                            _watchAdToSkipLevel();
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF7B1FA2),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 24,
                              vertical: 16,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: const Text(
                            'Watch Ad to Skip (30s)',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
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
    _countdownSequenceTimer?.cancel();
    setState(() {
      currentMatch = 1;
      playerWins = 0;
      aiWins = 0;
      isMatchComplete = false;
      _isWaitingForNextMatch = false;
      _matchCountdownTimer = 0;
      _showMatchWinnerAnnouncement = false;
      _showWowAnnouncement = false;
      _showHayiJongaAnnouncement = false;
      _showUnstoppableAnnouncement = false;
      _lastAnnouncedMatchKey = null;
      _lastXpDelta = 0;
    });
    getXp().then((xp) {
      if (mounted) setState(() => _headerXp = xp);
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
      _consecutiveLevelLosses = 0;
      _isWaitingForNextMatch = false;
      _matchCountdownTimer = 0;
      _showMatchWinnerAnnouncement = false;
      _showWowAnnouncement = false;
      _showHayiJongaAnnouncement = false;
      _showUnstoppableAnnouncement = false;
      _lastAnnouncedMatchKey = null;
    });

    _initializeGame();
  }

  // CHANGE 4: _backToMenu is fully synchronous
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
    final theme = getThemeForGame(currentGame);
    final boardGridColor = adventureBoardGridColor(
      theme: theme,
      consecutiveGameWins: _consecutiveGameWins,
    );

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
      backgroundColor: primaryYellow,
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
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: theme.textColor,
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
              : Stack(
            children: [
            Column(
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
                  if (gameRules != null && gameRules!.timeLimit > 0 && gameStarted)
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
                  if (_isWaitingForNextMatch && _matchCountdownTimer > 0)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        'Next game in $_matchCountdownTimer...',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
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
                                border: Border.all(color: theme.borderColor, width: 3),
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
                                                ? (winner == 1
                                                    ? primaryYellow
                                                    : theme.player1Color)
                                                : isBlocked
                                                    ? theme.accentColor
                                                    : isMudZone
                                                        ? adventureMudColor
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
                                                    width: cellSize * _adventurePieceDiameterFactor,
                                                    height: cellSize * _adventurePieceDiameterFactor,
                                                    decoration: BoxDecoration(
                                                      color: theme.player1Color,
                                                      shape: BoxShape.circle,
                                                    ),
                                                  )
                                                : cellValue == 2
                                                    ? Container(
                                                        width: cellSize * _adventurePieceDiameterFactor,
                                                        height: cellSize * _adventurePieceDiameterFactor,
                                                        decoration: BoxDecoration(
                                                          color: primaryYellow,
                                                          shape: BoxShape.circle,
                                                        ),
                                                      )
                                                    : isBlocked
                                                        ? Text(
                                                            '✕',
                                                            style: TextStyle(
                                                              fontSize: cellSize * 0.45,
                                                              color: theme.player1Color,
                                                              fontWeight: FontWeight.bold,
                                                            ),
                                                          )
                                                        : isMudZone
                                                            ? Text('🟤', style: TextStyle(fontSize: cellSize * 0.35))
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
            if (showStartCountdown && !_isWaitingForNextMatch)
              _AdventureCountdownOverlay(
                text: startCountdown > 0 ? '$startCountdown' : 'GO!',
              ),
            if (_showWowAnnouncement)
              const _WowHoneyJarAnnouncement(),
            if (_showHayiJongaAnnouncement)
              const _HayiJongaAnnouncement(),
            if (_showUnstoppableAnnouncement)
              _UnstoppableAnnouncement(flowerAsset: _unstoppableFlowerAsset),
            if (_showMatchWinnerAnnouncement)
              _MatchWinnerAnnouncement(message: _matchWinnerMessage),
            if (_isWaitingForNextMatch &&
                _matchCountdownTimer > 0 &&
                !showStartCountdown)
              _AdventureCountdownOverlay(text: '$_matchCountdownTimer'),
          ],
        ),
      ),
      ),
    );
  }
}

class _AdventureCountdownOverlay extends StatelessWidget {
  final String text;

  const _AdventureCountdownOverlay({required this.text});

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: ColoredBox(
        color: Colors.black.withValues(alpha: 0.8),
        child: Center(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 120,
              fontWeight: FontWeight.bold,
              color: primaryYellow,
              shadows: [
                Shadow(
                  offset: Offset(4, 4),
                  blurRadius: 8,
                  color: Colors.black,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _WowHoneyJarAnnouncement extends StatelessWidget {
  const _WowHoneyJarAnnouncement();

  static const Color _jarGold = Color(0xFFFFD700);
  static const Color _jarGoldDeep = Color(0xFFDAA520);
  static const Color _jarLid = Color(0xFFB8860B);

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: ColoredBox(
        color: Colors.black.withValues(alpha: 0.8),
        child: Center(
          child: Container(
            width: 210,
            padding: const EdgeInsets.fromLTRB(24, 14, 24, 28),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [_jarGold, _jarGoldDeep],
              ),
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: Colors.black, width: 4),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.45),
                  blurRadius: 14,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 118,
                  height: 14,
                  decoration: BoxDecoration(
                    color: _jarLid,
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: Colors.black, width: 2),
                  ),
                ),
                const SizedBox(height: 10),
                Image.asset(
                  'assets/mapImagery/honey.png',
                  height: 72,
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) =>
                      const Text('🍯', style: TextStyle(fontSize: 56)),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Wow!',
                  style: TextStyle(
                    fontSize: 40,
                    fontWeight: FontWeight.bold,
                    color: Colors.black,
                    height: 1,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HayiJongaAnnouncement extends StatelessWidget {
  const _HayiJongaAnnouncement();

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: ColoredBox(
        color: Colors.black.withValues(alpha: 0.8),
        child: Center(
          child: Container(
            width: 280,
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.black, width: 4),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.45),
                  blurRadius: 14,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: SizedBox(
                width: 264,
                height: 196,
                child: Stack(
                  children: [
                    CustomPaint(
                      size: const Size(264, 196),
                      painter: const _HayiJongaBeePainter(),
                    ),
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.black.withValues(alpha: 0.0),
                              Colors.black.withValues(alpha: 0.45),
                            ],
                          ),
                        ),
                        child: const Text(
                          'Hayi Jonga 🔥🔥',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            shadows: [
                              Shadow(
                                offset: Offset(2, 2),
                                blurRadius: 4,
                                color: Colors.black,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _HayiJongaBeePainter extends CustomPainter {
  const _HayiJongaBeePainter();

  static const Color _beeYellow = primaryYellow;
  static const Color _beeAmber = Color(0xFFE6A800);
  static const Color _wingFill = Color(0xCCFFFFFF);
  static const Color _wingEdge = Color(0x99000000);

  @override
  void paint(Canvas canvas, Size size) {
    final background = Rect.fromLTWH(0, 0, size.width, size.height);
    canvas.drawRect(
      background,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFFFF3B0), _beeYellow, _beeAmber],
        ).createShader(background),
    );

    final center = Offset(size.width * 0.5, size.height * 0.46);
    final bodyWidth = size.width * 0.34;
    final bodyHeight = size.height * 0.42;

    _drawWing(
      canvas,
      center: Offset(center.dx - bodyWidth * 0.42, center.dy - bodyHeight * 0.18),
      width: bodyWidth * 0.72,
      height: bodyHeight * 0.62,
      rotation: -0.35,
    );
    _drawWing(
      canvas,
      center: Offset(center.dx + bodyWidth * 0.42, center.dy - bodyHeight * 0.18),
      width: bodyWidth * 0.72,
      height: bodyHeight * 0.62,
      rotation: 0.35,
    );

    final bodyRect = RRect.fromRectAndRadius(
      Rect.fromCenter(
        center: center.translate(0, bodyHeight * 0.08),
        width: bodyWidth,
        height: bodyHeight,
      ),
      Radius.circular(bodyWidth * 0.42),
    );
    canvas.drawRRect(bodyRect, Paint()..color = _beeYellow);
    canvas.drawRRect(
      bodyRect,
      Paint()
        ..color = Colors.black
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3,
    );

    final stripePaint = Paint()..color = Colors.black;
    final stripeTop = center.dy - bodyHeight * 0.02;
    for (var i = 0; i < 3; i++) {
      final stripeY = stripeTop + (i * bodyHeight * 0.18);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(
            center: Offset(center.dx, stripeY),
            width: bodyWidth * 0.88,
            height: bodyHeight * 0.11,
          ),
          Radius.circular(bodyHeight * 0.05),
        ),
        stripePaint,
      );
    }

    final headCenter = Offset(center.dx, center.dy - bodyHeight * 0.52);
    final headRadius = bodyWidth * 0.28;
    canvas.drawCircle(headCenter, headRadius, Paint()..color = _beeYellow);
    canvas.drawCircle(
      headCenter,
      headRadius,
      Paint()
        ..color = Colors.black
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3,
    );

    final eyeOffset = headRadius * 0.38;
    final eyeRadius = headRadius * 0.18;
    for (final dx in [-eyeOffset, eyeOffset]) {
      canvas.drawCircle(
        headCenter.translate(dx, -headRadius * 0.08),
        eyeRadius,
        Paint()..color = Colors.white,
      );
      canvas.drawCircle(
        headCenter.translate(dx, -headRadius * 0.08),
        eyeRadius,
        Paint()
          ..color = Colors.black
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2,
      );
      canvas.drawCircle(
        headCenter.translate(dx + eyeRadius * 0.25, -headRadius * 0.02),
        eyeRadius * 0.45,
        Paint()..color = Colors.black,
      );
    }

    final smilePath = Path();
    smilePath.moveTo(headCenter.dx - headRadius * 0.28, headCenter.dy + headRadius * 0.18);
    smilePath.quadraticBezierTo(
      headCenter.dx,
      headCenter.dy + headRadius * 0.42,
      headCenter.dx + headRadius * 0.28,
      headCenter.dy + headRadius * 0.18,
    );
    canvas.drawPath(
      smilePath,
      Paint()
        ..color = Colors.black
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5
        ..strokeCap = StrokeCap.round,
    );

    for (final dx in [-headRadius * 0.35, headRadius * 0.35]) {
      final antennaBase = headCenter.translate(dx, -headRadius * 0.75);
      final antennaTip = antennaBase.translate(dx * 0.45, -headRadius * 0.55);
      canvas.drawLine(
        antennaBase,
        antennaTip,
        Paint()
          ..color = Colors.black
          ..strokeWidth = 2.5
          ..strokeCap = StrokeCap.round,
      );
      canvas.drawCircle(antennaTip, 4, Paint()..color = Colors.black);
    }

    final stingerPath = Path()
      ..moveTo(center.dx, center.dy + bodyHeight * 0.48)
      ..lineTo(center.dx - bodyWidth * 0.08, center.dy + bodyHeight * 0.62)
      ..lineTo(center.dx + bodyWidth * 0.08, center.dy + bodyHeight * 0.62)
      ..close();
    canvas.drawPath(stingerPath, Paint()..color = Colors.black);
  }

  void _drawWing(
    Canvas canvas, {
    required Offset center,
    required double width,
    required double height,
    required double rotation,
  }) {
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(rotation);
    final wingRect = Rect.fromCenter(
      center: Offset.zero,
      width: width,
      height: height,
    );
    canvas.drawOval(wingRect, Paint()..color = _wingFill);
    canvas.drawOval(
      wingRect,
      Paint()
        ..color = _wingEdge
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(-width * 0.12, -height * 0.05),
        width: width * 0.35,
        height: height * 0.55,
      ),
      Paint()
        ..color = Colors.white.withValues(alpha: 0.55)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5,
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _UnstoppableAnnouncement extends StatelessWidget {
  final String flowerAsset;

  const _UnstoppableAnnouncement({required this.flowerAsset});

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: ColoredBox(
        color: Colors.black.withValues(alpha: 0.8),
        child: Center(
          child: Container(
            width: 280,
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.black, width: 4),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.45),
                  blurRadius: 14,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: SizedBox(
                width: 264,
                height: 196,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Image.asset(
                      flowerAsset,
                      width: 264,
                      height: 196,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => Container(
                        width: 264,
                        height: 196,
                        color: const Color(0xFFFFE082),
                        alignment: Alignment.center,
                        child: const Text('🌸', style: TextStyle(fontSize: 72)),
                      ),
                    ),
                    Container(
                      width: 264,
                      height: 196,
                      color: Colors.black.withValues(alpha: 0.2),
                    ),
                    const Text(
                      'Unstoppable 🐝',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 34,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: 0.5,
                        shadows: [
                          Shadow(
                            offset: Offset(2, 2),
                            blurRadius: 6,
                            color: Colors.black,
                          ),
                          Shadow(
                            offset: Offset(-1, -1),
                            blurRadius: 4,
                            color: Colors.black54,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _MatchWinnerAnnouncement extends StatelessWidget {
  final String message;

  const _MatchWinnerAnnouncement({required this.message});

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: ColoredBox(
        color: Colors.black.withValues(alpha: 0.8),
        child: Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 30),
            decoration: BoxDecoration(
              color: primaryYellow,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.black, width: 4),
            ),
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.black,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _AdSkipCountdownDialog extends StatefulWidget {
  final int seconds;
  final VoidCallback onComplete;

  const _AdSkipCountdownDialog({
    required this.seconds,
    required this.onComplete,
  });

  @override
  State<_AdSkipCountdownDialog> createState() => _AdSkipCountdownDialogState();
}

class _AdSkipCountdownDialogState extends State<_AdSkipCountdownDialog> {
  late int _remaining;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _remaining = widget.seconds;
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      if (_remaining <= 1) {
        timer.cancel();
        widget.onComplete();
        return;
      }
      setState(() => _remaining -= 1);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        decoration: BoxDecoration(
          color: primaryYellow,
          borderRadius: BorderRadius.circular(25),
          border: Border.all(color: const Color(0xFF6c757d), width: 5),
        ),
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Thanks for watching!',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.black,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              'Next level unlocks in $_remaining seconds…',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.black,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}