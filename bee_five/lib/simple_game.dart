import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'adventure_game_logic.dart' as logic;
import 'background_sound.dart';
import 'xp_service.dart';

const Color primaryYellow = Color(0xFFFFC30B);
const int boardSize = 10;

class SimpleGame extends StatefulWidget {
  final VoidCallback onBackToMenu;
  final String? backgroundColor;

  const SimpleGame({
    super.key,
    required this.onBackToMenu,
    this.backgroundColor,
  });

  @override
  State<SimpleGame> createState() => _SimpleGameState();
}

class _SimpleGameState extends State<SimpleGame> {
  List<List<int>> board = [];
  int currentPlayer = 1; // 1 = black, 2 = yellow
  int winner = 0; // 0 = no winner/draw, 1 = black, 2 = yellow
  List<List<int>> winningPieces = [];
  bool showWinModal = false;
  String winMessage = '';
  int _headerXp = 0;

  // Banner ad variables
  BannerAd? _bannerAd;
  bool _isBannerAdLoaded = false;

  // Interstitial ad variables
  InterstitialAd? _interstitialAd;
  // CHANGED: Track "Play Again" clicks; show interstitial on every 5th click
  int _playAgainCount = 0;

  @override
  void initState() {
    super.initState();
    _resetGame();
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

  // CHANGED: Show interstitial only when "Play Again" is clicked the 5th time
  void _onPlayAgainPressed() {
    _playAgainCount++;
    if (_playAgainCount % 5 == 0 && _interstitialAd != null) {
      _interstitialAd!.fullScreenContentCallback = FullScreenContentCallback(
        onAdDismissedFullScreenContent: (ad) {
          ad.dispose();
          _interstitialAd = null;
          _loadInterstitialAd();
          // Proceed with resetting the game after ad is dismissed
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

  @override
  void dispose() {
    _bannerAd?.dispose();
    _interstitialAd?.dispose();
    super.dispose();
  }

  void _resetGame() {
    setState(() {
      board = List.generate(boardSize, (_) => List.filled(boardSize, 0));
      currentPlayer = 1;
      winner = 0;
      winningPieces = [];
      showWinModal = false;
      winMessage = '';
    });
  }

  void _scheduleWinModal() {
    Future.delayed(const Duration(seconds: 2), () {
      if (!mounted) return;
      setState(() => showWinModal = true);
    });
  }

  bool _checkWinner(int row, int col, int player) {
    return logic.checkWinCondition(board, row, col, player);
  }

  void _handleCellClick(int row, int col) {
    if (board[row][col] != 0 || winner != 0) {
      return;
    }

    setState(() {
      board[row][col] = currentPlayer;
    });

    if (_checkWinner(row, col, currentPlayer)) {
      setState(() {
        winner = currentPlayer;
        winningPieces = logic.getWinningPieces(board, row, col, currentPlayer);
        winMessage = '${currentPlayer == 1 ? 'Black' : 'Yellow'} wins!';
      });
      _scheduleWinModal();
    } else {
      bool isDraw = true;
      for (int r = 0; r < boardSize; r++) {
        for (int c = 0; c < boardSize; c++) {
          if (board[r][c] == 0) {
            isDraw = false;
            break;
          }
        }
        if (!isDraw) break;
      }

      if (isDraw) {
        setState(() {
          winner = 0;
          winningPieces = [];
          winMessage = 'Game Over - Draw!';
        });
        _scheduleWinModal();
      } else {
        setState(() {
          currentPlayer = currentPlayer == 1 ? 2 : 1;
        });
      }
    }
  }

  void _handleExit() {
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

                // Current Player Indicator
                Container(
                  padding: const EdgeInsets.all(15),
                  child: Text(
                    '▶ ${currentPlayer == 1 ? 'Black' : 'Yellow'}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                    ),
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
                                  final isWinning = winningPieces.any(
                                    (p) => p[0] == row && p[1] == col,
                                  );
                                  return GestureDetector(
                                    onTap: () => _handleCellClick(row, col),
                                    child: Container(
                                      width: cellSize,
                                      height: cellSize,
                                      decoration: BoxDecoration(
                                        color: isWinning && winner != 0
                                            ? (winner == 1
                                                ? primaryYellow
                                                : Colors.black)
                                            : const Color(0xFF87CEEB),
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
                                                      ? Colors.black
                                                      : primaryYellow,
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
                    const SizedBox(height: 30),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        ElevatedButton(
                          // CHANGED: routes through _onPlayAgainPressed instead of direct reset
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