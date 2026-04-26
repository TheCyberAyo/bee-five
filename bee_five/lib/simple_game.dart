import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'adventure_game_logic.dart' as logic;
import 'background_sound.dart';
import 'xp_service.dart';

const Color primaryYellow = Color(0xFFFFC30B);
const int boardSize = 10;

// ---------------------------------------------------------------------------
// Game-mode constants
// ---------------------------------------------------------------------------
enum GameMode { single, series5, series9 }

// ---------------------------------------------------------------------------
// Root widget – shows mode-selection screen first, then the game
// ---------------------------------------------------------------------------
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
  // null → mode-selection screen visible
  GameMode? _selectedMode;
  String _player1Name = 'Black';
  String _player2Name = 'Yellow';

  void _startGame(GameMode mode, {String p1 = 'Black', String p2 = 'Yellow'}) {
    setState(() {
      _selectedMode = mode;
      _player1Name = p1;
      _player2Name = p2;
    });
  }

  void _returnToModeSelect() {
    setState(() => _selectedMode = null);
  }

  @override
  Widget build(BuildContext context) {
    if (_selectedMode == null) {
      return _ModeSelectionScreen(
        onModeSelected: _startGame,
        onBackToMenu: widget.onBackToMenu,
      );
    }

    return _GameSession(
      mode: _selectedMode!,
      player1Name: _player1Name,
      player2Name: _player2Name,
      onBackToMenu: widget.onBackToMenu,
      onReturnToModeSelect: _returnToModeSelect,
    );
  }
}

// ---------------------------------------------------------------------------
// Mode selection + optional name-entry screen
// ---------------------------------------------------------------------------
class _ModeSelectionScreen extends StatefulWidget {
  final void Function(GameMode mode, {String p1, String p2}) onModeSelected;
  final VoidCallback onBackToMenu;

  const _ModeSelectionScreen({
    required this.onModeSelected,
    required this.onBackToMenu,
  });

  @override
  State<_ModeSelectionScreen> createState() => _ModeSelectionScreenState();
}

class _ModeSelectionScreenState extends State<_ModeSelectionScreen> {
  GameMode? _pendingMode;
  final _p1Controller = TextEditingController();
  final _p2Controller = TextEditingController();
  String? _nameError;
  BannerAd? _bannerAd;
  bool _isBannerAdLoaded = false;

  void _pickMode(GameMode mode) {
    if (mode == GameMode.single) {
      widget.onModeSelected(mode);
    } else {
      setState(() {
        _pendingMode = mode;
        _p1Controller.clear();
        _p2Controller.clear();
        _nameError = null;
      });
    }
  }

  void _confirmNames() {
    final p1 = _p1Controller.text.trim();
    final p2 = _p2Controller.text.trim();

    if (p1.isEmpty || p2.isEmpty) {
      setState(() => _nameError = 'Both names are required.');
      return;
    }
    if (p1.length > 7 || p2.length > 7) {
      setState(() => _nameError = 'Names must be 7 characters or fewer.');
      return;
    }
    if (p1.toLowerCase() == p2.toLowerCase()) {
      setState(() => _nameError = 'Names must be different.');
      return;
    }

    widget.onModeSelected(_pendingMode!, p1: p1, p2: p2);
  }

  @override
  void initState() {
    super.initState();
    _loadBannerAd();
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
        onAdFailedToLoad: (ad, error) => ad.dispose(),
      ),
    )..load();
  }

  @override
  void dispose() {
    _p1Controller.dispose();
    _p2Controller.dispose();
    _bannerAd?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
                border: Border(bottom: BorderSide(color: primaryYellow, width: 2)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: primaryYellow),
                    onPressed: widget.onBackToMenu,
                  ),
                  Image.asset('assets/BEE-FIVE.png', height: 40, fit: BoxFit.contain),
                  const SizedBox(width: 48),
                ],
              ),
            ),

            Expanded(
              child: _pendingMode == null
                  ? _buildModeButtons()
                  : _buildNameEntry(),
            ),
            if (_isBannerAdLoaded && _bannerAd != null)
              Container(
                alignment: Alignment.center,
                width: _bannerAd!.size.width.toDouble(),
                height: _bannerAd!.size.height.toDouble(),
                color: Colors.black,
                child: AdWidget(ad: _bannerAd!),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildModeButtons() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Select Game Mode',
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.bold,
                color: Colors.black,
              ),
            ),
            const SizedBox(height: 32),
            _ModeButton(
              label: 'Single Match',
              icon: Icons.sports_esports,
              onTap: () => _pickMode(GameMode.single),
            ),
            const SizedBox(height: 16),
            _ModeButton(
              label: '5-Game Series',
              icon: Icons.filter_5,
              onTap: () => _pickMode(GameMode.series5),
            ),
            const SizedBox(height: 16),
            _ModeButton(
              label: '9-Game Series',
              icon: Icons.filter_9,
              onTap: () => _pickMode(GameMode.series9),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNameEntry() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.black,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: primaryYellow, width: 2),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _pendingMode == GameMode.series5
                    ? '5-Game Series'
                    : '9-Game Series',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: primaryYellow,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Enter player names (max 7 chars)',
                style: TextStyle(color: Colors.white70, fontSize: 13),
              ),
              const SizedBox(height: 24),
              _NameField(
                controller: _p1Controller,
                label: 'Player 1 (Black)',
                color: Colors.white,
              ),
              const SizedBox(height: 16),
              _NameField(
                controller: _p2Controller,
                label: 'Player 2 (Yellow)',
                color: primaryYellow,
              ),
              if (_nameError != null) ...[
                const SizedBox(height: 12),
                Text(
                  _nameError!,
                  style: const TextStyle(color: Colors.redAccent, fontSize: 13),
                ),
              ],
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => setState(() => _pendingMode = null),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white38),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: const Text('Back'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _confirmNames,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryYellow,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text(
                        'Start',
                        style: TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
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
    );
  }
}

class _ModeButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  const _ModeButton({required this.label, required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: onTap,
        icon: Icon(icon, color: Colors.black),
        label: Text(
          label,
          style: const TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryYellow,
          padding: const EdgeInsets.symmetric(vertical: 18),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: Colors.black, width: 2),
          ),
        ),
      ),
    );
  }
}

class _NameField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final Color color;

  const _NameField({
    required this.controller,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      maxLength: 7,
      style: TextStyle(color: color, fontWeight: FontWeight.bold),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: color.withValues(alpha: 0.8)),
        counterStyle: const TextStyle(color: Colors.white38),
        enabledBorder: OutlineInputBorder(
          borderSide: BorderSide(color: color.withValues(alpha: 0.5)),
          borderRadius: BorderRadius.circular(8),
        ),
        focusedBorder: OutlineInputBorder(
          borderSide: BorderSide(color: color, width: 2),
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _GameSession – manages series state & delegates per-game to _GameBoard
// ---------------------------------------------------------------------------
class _GameSession extends StatefulWidget {
  final GameMode mode;
  final String player1Name;
  final String player2Name;
  final VoidCallback onBackToMenu;
  final VoidCallback onReturnToModeSelect;

  const _GameSession({
    required this.mode,
    required this.player1Name,
    required this.player2Name,
    required this.onBackToMenu,
    required this.onReturnToModeSelect,
  });

  @override
  State<_GameSession> createState() => _GameSessionState();
}

class _GameSessionState extends State<_GameSession> {
  int _currentGame = 1;
  int _score1 = 0; // player 1 (black)
  int _score2 = 0; // player 2 (yellow)
  bool _showSeriesEnd = false;

  // Ads
  InterstitialAd? _interstitialAd;

  int get _totalGames => widget.mode == GameMode.series9 ? 9 : 5;
  bool get _isSeries => widget.mode != GameMode.single;

  @override
  void initState() {
    super.initState();
    _loadInterstitialAd();
  }

  void _loadInterstitialAd() {
    InterstitialAd.load(
      adUnitId: 'ca-app-pub-6740638137327567/9168616109',
      request: const AdRequest(),
      adLoadCallback: InterstitialAdLoadCallback(
        onAdLoaded: (ad) => _interstitialAd = ad,
        onAdFailedToLoad: (_) => _interstitialAd = null,
      ),
    );
  }

  // Returns number of logo-blockages for a given game number
  int _blockagesForGame(int gameNumber) {
    if (!_isSeries) return 0;

    if (widget.mode == GameMode.series5) {
      if (gameNumber == 3) return 4;
      if (gameNumber == 5) return 10;
    } else {
      // 9-game series
      if (gameNumber == 3) return 4;
      if (gameNumber == 5) return 10;
      if (gameNumber == 7) return 6;
      if (gameNumber == 9) return 10;
    }
    return 0;
  }

  // Should interstitial play after this game ends?
  bool _shouldShowAdAfterGame(int gameNumber) {
    if (widget.mode == GameMode.series5 && gameNumber == 3) return true;
    if (widget.mode == GameMode.series9 && gameNumber == 4) return true;
    return false;
  }

  void _onGameFinished(int winnerPlayer /* 0=draw, 1=p1, 2=p2 */) {
    if (_isSeries) {
      setState(() {
        if (winnerPlayer == 1) _score1++;
        if (winnerPlayer == 2) _score2++;
      });
    }

    final isLastGame = _isSeries && _currentGame == _totalGames;
    final showAd = _shouldShowAdAfterGame(_currentGame);

    void proceed() {
      if (isLastGame) {
        setState(() => _showSeriesEnd = true);
      } else if (_isSeries) {
        setState(() => _currentGame++);
      }
      // For single match the GameBoard itself shows the exit/play-again modal
    }

    if (showAd && _interstitialAd != null) {
      _interstitialAd!.fullScreenContentCallback = FullScreenContentCallback(
        onAdDismissedFullScreenContent: (ad) {
          ad.dispose();
          _interstitialAd = null;
          _loadInterstitialAd();
          proceed();
        },
        onAdFailedToShowFullScreenContent: (ad, error) {
          ad.dispose();
          _interstitialAd = null;
          _loadInterstitialAd();
          proceed();
        },
      );
      _interstitialAd!.show();
    } else {
      proceed();
    }
  }

  @override
  @override
  void dispose() {
    _interstitialAd?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_showSeriesEnd) {
      return _SeriesScoreboard(
        player1Name: widget.player1Name,
        player2Name: widget.player2Name,
        score1: _score1,
        score2: _score2,
        totalGames: _totalGames,
        onPlayAgain: () {
          setState(() {
            _currentGame = 1;
            _score1 = 0;
            _score2 = 0;
            _showSeriesEnd = false;
          });
        },
        onBackToModeSelect: widget.onReturnToModeSelect,
        onBackToMenu: widget.onBackToMenu,
      );
    }

    return _GameBoard(
      key: ValueKey('game_$_currentGame'),
      player1Name: widget.player1Name,
      player2Name: widget.player2Name,
      isSeries: _isSeries,
      currentGame: _currentGame,
      totalGames: _isSeries ? _totalGames : 1,
      score1: _score1,
      score2: _score2,
      blockageCount: _blockagesForGame(_currentGame),
      onGameFinished: _onGameFinished,
      onBackToMenu: widget.onBackToMenu,
      onReturnToModeSelect: widget.onReturnToModeSelect,
      // Single match uses built-in play-again counter; series resets via session
      isSingleMatch: !_isSeries,
    );
  }
}

// ---------------------------------------------------------------------------
// _GameBoard – the actual Gomoku board for a single game
// ---------------------------------------------------------------------------
class _GameBoard extends StatefulWidget {
  final String player1Name;
  final String player2Name;
  final bool isSeries;
  final bool isSingleMatch;
  final int currentGame;
  final int totalGames;
  final int score1;
  final int score2;
  final int blockageCount;
  final void Function(int winnerPlayer) onGameFinished;
  final VoidCallback onBackToMenu;
  final VoidCallback onReturnToModeSelect;

  const _GameBoard({
    super.key,
    required this.player1Name,
    required this.player2Name,
    required this.isSeries,
    required this.isSingleMatch,
    required this.currentGame,
    required this.totalGames,
    required this.score1,
    required this.score2,
    required this.blockageCount,
    required this.onGameFinished,
    required this.onBackToMenu,
    required this.onReturnToModeSelect,
  });

  @override
  State<_GameBoard> createState() => _GameBoardState();
}

class _GameBoardState extends State<_GameBoard> {
  List<List<int>> board = [];
  int currentPlayer = 1;
  int winner = 0;
  List<List<int>> winningPieces = [];
  bool showWinModal = false;
  String winMessage = '';
  bool _gameFinishedReported = false;
  int _headerXp = 0;

  // Blockage cells: cells that are pre-filled / blocked (value = 3)
  Set<String> _blockedCells = {};

  // Banner ad
  BannerAd? _bannerAd;
  bool _isBannerAdLoaded = false;

  // Interstitial for single-match play-again (every 5th click)
  InterstitialAd? _singleMatchInterstitial;
  int _playAgainCount = 0;

  @override
  void initState() {
    super.initState();
    _initBoard();
    BackgroundSound.instance.startIfEnabled();
    getXp().then((xp) {
      if (mounted) setState(() => _headerXp = xp);
    });
    _loadBannerAd();
    if (widget.isSingleMatch) _loadSingleMatchInterstitial();
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
        onAdFailedToLoad: (ad, error) => ad.dispose(),
      ),
    )..load();
  }

  void _loadSingleMatchInterstitial() {
    InterstitialAd.load(
      adUnitId: 'ca-app-pub-6740638137327567/9168616109',
      request: const AdRequest(),
      adLoadCallback: InterstitialAdLoadCallback(
        onAdLoaded: (ad) => _singleMatchInterstitial = ad,
        onAdFailedToLoad: (_) => _singleMatchInterstitial = null,
      ),
    );
  }

  void _initBoard() {
    board = List.generate(boardSize, (_) => List.filled(boardSize, 0));
    currentPlayer = 1;
    winner = 0;
    winningPieces = [];
    showWinModal = false;
    winMessage = '';
    _gameFinishedReported = false;
    _blockedCells = {};

    // Place blockages randomly
    if (widget.blockageCount > 0) {
      final allCells = <String>[];
      for (int r = 0; r < boardSize; r++) {
        for (int c = 0; c < boardSize; c++) {
          allCells.add('$r,$c');
        }
      }
      allCells.shuffle();
      final chosen = allCells.take(widget.blockageCount).toList();
      for (final key in chosen) {
        final parts = key.split(',');
        final r = int.parse(parts[0]);
        final c = int.parse(parts[1]);
        board[r][c] = 3; // 3 = blocked
        _blockedCells.add(key);
      }
    }
  }

  @override
  void dispose() {
    _bannerAd?.dispose();
    _singleMatchInterstitial?.dispose();
    super.dispose();
  }

  void _scheduleWinModal(int winnerPlayer) {
    Future.delayed(const Duration(seconds: 2), () {
      if (!mounted) return;
      setState(() => showWinModal = true);

      if (!_gameFinishedReported) {
        _gameFinishedReported = true;
        if (widget.isSeries) {
          // Notify session after modal is shown for series
          widget.onGameFinished(winnerPlayer);
        }
      }
    });
  }

  void _handleCellClick(int row, int col) {
    if (board[row][col] != 0 || winner != 0) return;

    setState(() => board[row][col] = currentPlayer);

    if (logic.checkWinCondition(board, row, col, currentPlayer)) {
      setState(() {
        winner = currentPlayer;
        winningPieces = logic.getWinningPieces(board, row, col, currentPlayer);
        winMessage =
            '${currentPlayer == 1 ? widget.player1Name : widget.player2Name} wins!';
      });
      _scheduleWinModal(currentPlayer);
    } else {
      bool isDraw = true;
      outer:
      for (int r = 0; r < boardSize; r++) {
        for (int c = 0; c < boardSize; c++) {
          if (board[r][c] == 0) {
            isDraw = false;
            break outer;
          }
        }
      }

      if (isDraw) {
        setState(() {
          winner = -1; // -1 = draw
          winMessage = 'Draw!';
        });
        _scheduleWinModal(0);
      } else {
        setState(() => currentPlayer = currentPlayer == 1 ? 2 : 1);
      }
    }
  }

  // ---- Single-match play-again (with interstitial every 5th) ----
  void _onPlayAgainSingle() {
    _playAgainCount++;
    if (_playAgainCount % 5 == 0 && _singleMatchInterstitial != null) {
      _singleMatchInterstitial!.fullScreenContentCallback =
          FullScreenContentCallback(
        onAdDismissedFullScreenContent: (ad) {
          ad.dispose();
          _singleMatchInterstitial = null;
          _loadSingleMatchInterstitial();
          setState(() => _initBoard());
        },
        onAdFailedToShowFullScreenContent: (ad, error) {
          ad.dispose();
          _singleMatchInterstitial = null;
          _loadSingleMatchInterstitial();
          setState(() => _initBoard());
        },
      );
      _singleMatchInterstitial!.show();
    } else {
      setState(() => _initBoard());
    }
  }

  Future<void> _confirmExit() async {
    final shouldExit = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('Exit Game?'),
        content: const Text('Are you sure you want to exit?'),
        actions: [
          TextButton(
            onPressed: () =>
                Navigator.of(ctx, rootNavigator: true).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () =>
                Navigator.of(ctx, rootNavigator: true).pop(true),
            child: const Text('Exit'),
          ),
        ],
      ),
    );
    if (shouldExit == true && mounted) widget.onBackToMenu();
  }

  @override
  Widget build(BuildContext context) {
    const double borderWidth = 2.0;
    final totalBorders = (boardSize + 1) * borderWidth;

    final currentPlayerName =
        currentPlayer == 1 ? widget.player1Name : widget.player2Name;

    return Stack(
      children: [
        Scaffold(
          backgroundColor: const Color(0xFF808080),
          body: SafeArea(
            child: Column(
              children: [
                // ---- Header ----
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                      vertical: 15, horizontal: 15),
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
                            errorBuilder: (_, _, _) =>
                                const Icon(Icons.star,
                                    color: primaryYellow, size: 28),
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

                // ---- Series info bar ----
                if (widget.isSeries)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                        vertical: 8, horizontal: 16),
                    color: Colors.black87,
                    child: Row(
                      mainAxisAlignment:
                          MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Game ${widget.currentGame} of ${widget.totalGames}',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 13,
                          ),
                        ),
                        Row(
                          children: [
                            _ScorePill(
                              name: widget.player1Name,
                              score: widget.score1,
                              isBlack: true,
                            ),
                            const SizedBox(width: 8),
                            const Text(':',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold)),
                            const SizedBox(width: 8),
                            _ScorePill(
                              name: widget.player2Name,
                              score: widget.score2,
                              isBlack: false,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                // ---- Current player indicator ----
                Container(
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    '▶ $currentPlayerName',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                    ),
                  ),
                ),

                // ---- Board ----
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final boardSide = constraints.maxWidth;
                      final cellSize =
                          (boardSide - totalBorders) / boardSize;

                      return Center(
                        child: Container(
                          width: boardSide,
                          height: boardSide,
                          decoration: BoxDecoration(
                            color: const Color(0xFF87CEEB),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                                color: Colors.black, width: 3),
                          ),
                          padding: EdgeInsets.all(borderWidth),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: List.generate(boardSize, (row) {
                              return Row(
                                mainAxisSize: MainAxisSize.min,
                                children: List.generate(boardSize,
                                    (col) {
                                  final isWinning = winningPieces.any(
                                      (p) =>
                                          p[0] == row && p[1] == col);
                                  final isBlocked =
                                      board[row][col] == 3;

                                  return GestureDetector(
                                    onTap: isBlocked
                                        ? null
                                        : () => _handleCellClick(
                                            row, col),
                                    child: Container(
                                      width: cellSize,
                                      height: cellSize,
                                      decoration: BoxDecoration(
                                        color: isWinning && winner > 0
                                            ? (winner == 1
                                                ? primaryYellow
                                                : Colors.black)
                                            : const Color(0xFF87CEEB),
                                        border: Border.all(
                                          color: Colors.white,
                                          width: borderWidth,
                                        ),
                                      ),
                                      child: isBlocked
                                          ? _BlockedCell(
                                              size: cellSize)
                                          : board[row][col] != 0
                                              ? Center(
                                                  child: Container(
                                                    width:
                                                        cellSize / 1.5,
                                                    height:
                                                        cellSize / 1.5,
                                                    decoration:
                                                        BoxDecoration(
                                                      color: board[row]
                                                                  [col] ==
                                                              1
                                                          ? Colors.black
                                                          : primaryYellow,
                                                      shape:
                                                          BoxShape.circle,
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

                // ---- Banner ad ----
                if (_isBannerAdLoaded && _bannerAd != null)
                  Container(
                    alignment: Alignment.center,
                    width: _bannerAd!.size.width.toDouble(),
                    height: _bannerAd!.size.height.toDouble(),
                    color: Colors.black,
                    child: AdWidget(ad: _bannerAd!),
                  ),

                // ---- Footer ----
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                      vertical: 15, horizontal: 15),
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
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10),
                          child: ElevatedButton(
                            onPressed: _confirmExit,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: primaryYellow,
                              padding: const EdgeInsets.symmetric(
                                  vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                                side: const BorderSide(
                                    color: Colors.black, width: 2),
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
                                  errorBuilder: (_, _, _) =>
                                      const SizedBox.shrink(),
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
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10),
                          child: ElevatedButton(
                            onPressed: () => setState(() => _initBoard()),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: primaryYellow,
                              padding: const EdgeInsets.symmetric(
                                  vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                                side: const BorderSide(
                                    color: Colors.black, width: 2),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              mainAxisAlignment:
                                  MainAxisAlignment.center,
                              children: [
                                Image.asset(
                                  'assets/homeImagery/restart_icon.png',
                                  width: 22,
                                  height: 22,
                                  fit: BoxFit.contain,
                                  errorBuilder: (_, _, _) =>
                                      const SizedBox.shrink(),
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

        // ---- Win modal ----
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
                        if (widget.isSingleMatch)
                          ElevatedButton(
                            onPressed: _onPlayAgainSingle,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 24, vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                                side: const BorderSide(
                                    color: Colors.black, width: 2),
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

                        if (widget.isSeries &&
                            widget.currentGame < widget.totalGames)
                          ElevatedButton(
                            onPressed: () {
                              setState(() => showWinModal = false);
                              // Session already notified; it will rebuild next game
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 24, vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                                side: const BorderSide(
                                    color: Colors.black, width: 2),
                              ),
                            ),
                            child: Text(
                              'Game ${widget.currentGame + 1}',
                              style: const TextStyle(
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
                            widget.onBackToMenu();
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 24, vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                              side: const BorderSide(
                                  color: Colors.black, width: 2),
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

// ---------------------------------------------------------------------------
// Blocked cell widget – displays the app logo inside the cell
// ---------------------------------------------------------------------------
class _BlockedCell extends StatelessWidget {
  final double size;
  const _BlockedCell({required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black87,
      child: Center(
        child: Image.asset(
          'assets/BEE-FIVE.png',
          width: size * 0.85,
          height: size * 0.85,
          fit: BoxFit.contain,
          errorBuilder: (_, _, _) => Icon(
            Icons.block,
            color: primaryYellow,
            size: size * 0.6,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Score pill used in the series info bar
// ---------------------------------------------------------------------------
class _ScorePill extends StatelessWidget {
  final String name;
  final int score;
  final bool isBlack;

  const _ScorePill({
    required this.name,
    required this.score,
    required this.isBlack,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isBlack ? Colors.black : primaryYellow,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: primaryYellow, width: 1.5),
      ),
      child: Text(
        '$name: $score',
        style: TextStyle(
          color: isBlack ? primaryYellow : Colors.black,
          fontWeight: FontWeight.bold,
          fontSize: 13,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Final series scoreboard
// ---------------------------------------------------------------------------
class _SeriesScoreboard extends StatefulWidget {
  final String player1Name;
  final String player2Name;
  final int score1;
  final int score2;
  final int totalGames;
  final VoidCallback onPlayAgain;
  final VoidCallback onBackToModeSelect;
  final VoidCallback onBackToMenu;

  const _SeriesScoreboard({
    required this.player1Name,
    required this.player2Name,
    required this.score1,
    required this.score2,
    required this.totalGames,
    required this.onPlayAgain,
    required this.onBackToModeSelect,
    required this.onBackToMenu,
  });

  @override
  State<_SeriesScoreboard> createState() => _SeriesScoreboardState();
}

class _SeriesScoreboardState extends State<_SeriesScoreboard> {
  BannerAd? _bannerAd;
  bool _isBannerAdLoaded = false;

  @override
  void initState() {
    super.initState();
    _loadBannerAd();
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
        onAdFailedToLoad: (ad, error) => ad.dispose(),
      ),
    )..load();
  }

  @override
  void dispose() {
    _bannerAd?.dispose();
    super.dispose();
  }

  String get _overallWinner {
    if (widget.score1 > widget.score2) return '${widget.player1Name} wins the series!';
    if (widget.score2 > widget.score1) return '${widget.player2Name} wins the series!';
    return "It's a tie series!";
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
                border: Border(bottom: BorderSide(color: primaryYellow, width: 2)),
              ),
              child: Center(
                child: Image.asset(
                  'assets/BEE-FIVE.png',
                  height: 40,
                  fit: BoxFit.contain,
                ),
              ),
            ),
            Expanded(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Container(
                    padding: const EdgeInsets.all(28),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: primaryYellow, width: 3),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'Series Complete!',
                          style: TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.bold,
                            color: primaryYellow,
                            decoration: TextDecoration.none,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '${widget.totalGames}-Game Series',
                          style: const TextStyle(
                            fontSize: 14,
                            color: Colors.white54,
                            decoration: TextDecoration.none,
                          ),
                        ),
                        const SizedBox(height: 28),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _ScoreCard(name: widget.player1Name, score: widget.score1, isBlack: true),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              child: Text(
                                '${widget.score1} – ${widget.score2}',
                                style: const TextStyle(
                                  fontSize: 32,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                  decoration: TextDecoration.none,
                                ),
                              ),
                            ),
                            _ScoreCard(name: widget.player2Name, score: widget.score2, isBlack: false),
                          ],
                        ),
                        const SizedBox(height: 28),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                          decoration: BoxDecoration(
                            color: primaryYellow,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            _overallWinner,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.black,
                              decoration: TextDecoration.none,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                        const SizedBox(height: 32),
                        _ActionButton(
                          label: 'Play Series Again',
                          color: Colors.green,
                          onTap: widget.onPlayAgain,
                        ),
                        const SizedBox(height: 12),
                        _ActionButton(
                          label: 'Change Mode',
                          color: Colors.orange,
                          onTap: widget.onBackToModeSelect,
                        ),
                        const SizedBox(height: 12),
                        _ActionButton(
                          label: 'Back to Menu',
                          color: Colors.blue,
                          onTap: widget.onBackToMenu,
                        ),
                      ],
                    ),
                  ),
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
          ],
        ),
      ),
    );
  }
}

class _ScoreCard extends StatelessWidget {
  final String name;
  final int score;
  final bool isBlack;

  const _ScoreCard({
    required this.name,
    required this.score,
    required this.isBlack,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: isBlack ? Colors.black : primaryYellow,
            shape: BoxShape.circle,
            border: Border.all(color: primaryYellow, width: 2),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          name,
          style: const TextStyle(
              color: Colors.white70,
              fontSize: 12,
              decoration: TextDecoration.none),
        ),
        Text(
          '$score',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 22,
            fontWeight: FontWeight.bold,
            decoration: TextDecoration.none,
          ),
        ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
            side: const BorderSide(color: Colors.black, width: 2),
          ),
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 15,
          ),
        ),
      ),
    );
  }
}