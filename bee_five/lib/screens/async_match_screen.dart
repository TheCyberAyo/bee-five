import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../ads/multiplayer_ad_constants.dart';
import '../head_to_head_series.dart';
import '../navigation/async_match_navigation.dart';
import '../services/async_game_service.dart';
import '../services/multiplayer_service.dart';
import '../simple_game.dart' show primaryYellow;
import '../theme/bee_five_multiplayer_theme.dart';
import '../widgets/async_bee_five_board.dart';
import '../widgets/online_bee_five_board.dart';

class AsyncMatchScreen extends StatefulWidget {
  final String matchId;
  final String myId;
  final String myUsername;
  final String opponentId;
  final String opponentUsername;

  const AsyncMatchScreen({
    super.key,
    required this.matchId,
    required this.myId,
    required this.myUsername,
    required this.opponentId,
    required this.opponentUsername,
  });

  @override
  State<AsyncMatchScreen> createState() => _AsyncMatchScreenState();
}

class _AsyncMatchScreenState extends State<AsyncMatchScreen> {
  final _async = AsyncGameService.instance;
  final _multiplayer = MultiplayerService();
  final _boardKey = GlobalKey<AsyncBeeFiveBoardState>();

  AsyncMatchRow? _match;
  HeadToHeadSeriesScore? _seriesScore;
  bool _saving = false;
  bool _finishedHandled = false;
  StreamSubscription<List<Map<String, dynamic>>>? _matchSub;
  Timer? _clockTimer;
  InterstitialAd? _interstitialAd;
  BannerAd? _bannerAd;
  bool _isBannerLoaded = false;

  String get _p1Id => onlineMatchPlayer1Id(widget.myId, widget.opponentId);
  String get _p2Id => onlineMatchPlayer2Id(widget.myId, widget.opponentId);
  String get _p1Name =>
      _p1Id == widget.myId ? widget.myUsername : widget.opponentUsername;
  String get _p2Name =>
      _p2Id == widget.myId ? widget.myUsername : widget.opponentUsername;

  bool get _isMyTurn =>
      _match != null && _match!.seatFor(widget.myId) == _match!.currentSeat;

  @override
  void initState() {
    super.initState();
    _loadAsyncInterstitial();
    _loadBannerAd();
    unawaited(_load());
    _matchSub = Supabase.instance.client
        .from('mg_async_matches')
        .stream(primaryKey: ['id'])
        .eq('id', widget.matchId)
        .listen((rows) {
      if (!mounted || rows.isEmpty) return;
      final row = AsyncMatchRow.fromMap(Map<String, dynamic>.from(rows.first));
      setState(() => _match = row);
      unawaited(_handleFinishedIfNeeded(row));
    });
    _clockTimer = Timer.periodic(const Duration(seconds: 30), (_) async {
      if (!mounted || _match == null || !_match!.isActive) return;
      final synced = await _async.syncMatch(widget.matchId);
      if (!mounted || synced == null) return;
      setState(() => _match = synced);
      await _handleFinishedIfNeeded(synced);
    });
  }

  int _countBoardMoves(List<List<int>> board) {
    var count = 0;
    for (final row in board) {
      for (final cell in row) {
        if (cell != 0) count++;
      }
    }
    return count;
  }

  void _loadAsyncInterstitial() {
    InterstitialAd.load(
      adUnitId: kMultiplayerInterstitialAdUnitId,
      request: const AdRequest(),
      adLoadCallback: InterstitialAdLoadCallback(
        onAdLoaded: (ad) {
          if (mounted) {
            setState(() => _interstitialAd = ad);
          } else {
            ad.dispose();
          }
        },
        onAdFailedToLoad: (_) {
          if (mounted) setState(() => _interstitialAd = null);
        },
      ),
    );
  }

  void _maybeShowInterstitialAfterMove(int totalMovesOnBoard) {
    if (totalMovesOnBoard == 0 ||
        totalMovesOnBoard % kAsyncInterstitialEveryNMoves != 0) {
      return;
    }
    final ad = _interstitialAd;
    if (ad == null) {
      _loadAsyncInterstitial();
      return;
    }
    ad.fullScreenContentCallback = FullScreenContentCallback(
      onAdDismissedFullScreenContent: (ad) {
        ad.dispose();
        if (mounted) setState(() => _interstitialAd = null);
        _loadAsyncInterstitial();
      },
      onAdFailedToShowFullScreenContent: (ad, error) {
        ad.dispose();
        if (mounted) setState(() => _interstitialAd = null);
        _loadAsyncInterstitial();
      },
    );
    ad.show();
  }

  void _loadBannerAd() {
    _bannerAd = BannerAd(
      adUnitId: kMultiplayerBannerAdUnitId,
      size: AdSize.banner,
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (ad) {
          if (mounted) setState(() => _isBannerLoaded = true);
        },
        onAdFailedToLoad: (ad, error) {
          ad.dispose();
          if (mounted) setState(() => _isBannerLoaded = false);
        },
      ),
    )..load();
  }

  Widget _buildBannerAd() {
    if (!_isBannerLoaded || _bannerAd == null) {
      return const SizedBox.shrink();
    }
    return SizedBox(
      width: _bannerAd!.size.width.toDouble(),
      height: _bannerAd!.size.height.toDouble(),
      child: AdWidget(ad: _bannerAd!),
    );
  }

  Future<void> _load() async {
    final match = await _async.syncMatch(widget.matchId);
    final series = await _multiplayer.fetchHeadToHeadSeriesScore(
      widget.myId,
      widget.opponentId,
    );
    if (!mounted) return;
    setState(() {
      _match = match;
      _seriesScore = series;
    });
    if (match != null) await _handleFinishedIfNeeded(match);
  }

  Future<void> _handleFinishedIfNeeded(AsyncMatchRow match) async {
    if (_finishedHandled || !match.isFinished) return;
    _finishedHandled = true;

    if (match.status == 'completed' && match.winnerId != null) {
      await _submitCompletedMatch(match.winnerId!);
      if (mounted) {
        _showFinishedDialog(
          winnerId: match.winnerId,
          forfeited: false,
        );
      }
    } else if (match.status == 'draw') {
      await _submitDraw();
      if (mounted) _showFinishedDialog(isDraw: true);
    } else if (match.isForfeited && match.winnerId != null) {
      await _submitCompletedMatch(match.winnerId!);
      if (mounted) {
        _showFinishedDialog(
          winnerId: match.winnerId,
          forfeited: true,
        );
      }
    }
  }

  Future<void> _saveMove(int row, int col) async {
    if (_saving || _match == null || !_match!.isActive) return;
    if (_isMyTurn && _match!.isTurnExpired) {
      await _load();
      return;
    }
    setState(() => _saving = true);
    try {
      final result = await _async.saveMove(
        matchId: widget.matchId,
        row: row,
        col: col,
      );
      if (!mounted) return;
      setState(() {
        _match = AsyncMatchRow(
          id: _match!.id,
          player1Id: _match!.player1Id,
          player2Id: _match!.player2Id,
          board: result.board,
          currentSeat: result.currentSeat,
          status: result.status,
          winnerId: result.winnerId,
          lastMoveAt: DateTime.now().toUtc(),
          turnDeadlineAt: result.turnDeadlineAt,
        );
        _saving = false;
      });
      _boardKey.currentState?.clearPending();

      _maybeShowInterstitialAfterMove(_countBoardMoves(result.board));

      if (result.status == 'completed' && result.winnerId != null) {
        _finishedHandled = true;
        await _submitCompletedMatch(result.winnerId!);
        if (mounted) _showFinishedDialog(winnerId: result.winnerId);
      } else if (result.isDraw) {
        _finishedHandled = true;
        await _submitDraw();
        if (mounted) _showFinishedDialog(isDraw: true);
      } else if (mounted) {
        replaceWithAsyncMatchStatus(
          context,
          matchId: widget.matchId,
          myId: widget.myId,
          myUsername: widget.myUsername,
          opponentId: widget.opponentId,
          opponentUsername: widget.opponentUsername,
        );
      }
    } on AsyncGameException catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      await _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message)),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not save move. Try again.')),
      );
    }
  }

  Future<void> _submitCompletedMatch(String winnerId) async {
    try {
      await _multiplayer.submitMatchResult(
        player1Id: widget.myId,
        player2Id: widget.opponentId,
        winnerId: winnerId,
      );
    } catch (_) {}
  }

  Future<void> _submitDraw() async {
    try {
      await _multiplayer.submitMatchResult(
        player1Id: widget.myId,
        player2Id: widget.opponentId,
        isDraw: true,
      );
    } catch (_) {}
  }

  void _showFinishedDialog({
    String? winnerId,
    bool isDraw = false,
    bool forfeited = false,
  }) {
    final iWon = winnerId == widget.myId;
    final title = isDraw
        ? 'Draw'
        : forfeited
            ? (iWon ? 'You win by forfeit' : 'Time expired')
            : (iWon ? 'You win!' : 'You lost');
    final message = forfeited
        ? (iWon
            ? 'Your opponent did not move within 24 hours.'
            : 'You did not move within 24 hours.')
        : 'This async match is complete. Your series score will update on your next match.';

    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => BeeFiveMultiplayerTheme.yellowDialog(
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black),
        ),
        content: Text(
          message,
          style: const TextStyle(color: Colors.black87, fontSize: 16),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            child: const Text('Back'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    _matchSub?.cancel();
    _interstitialAd?.dispose();
    _bannerAd?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final match = _match;
    return Scaffold(
      backgroundColor: BeeFiveMultiplayerTheme.scaffoldBackground,
      appBar: AppBar(
        backgroundColor: primaryYellow,
        foregroundColor: Colors.black,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '${widget.myUsername} vs ${widget.opponentUsername}',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
            ),
            const Text(
              'Multi-day match · 24h per turn',
              style: TextStyle(fontSize: 12, color: Colors.black87),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: match == null
                ? const Center(child: CircularProgressIndicator())
                : Column(
                    children: [
                      _buildTurnClock(match),
                      _buildScoreHeader(),
                      Expanded(
                        child: AsyncBeeFiveBoard(
                          key: _boardKey,
                          myUserId: widget.myId,
                          opponentUserId: widget.opponentId,
                          myUsername: widget.myUsername,
                          opponentUsername: widget.opponentUsername,
                          board: match.board,
                          currentSeat: match.currentSeat,
                          isSaving: _saving || !match.isActive,
                          onSaveMove: _saveMove,
                        ),
                      ),
                    ],
                  ),
          ),
          _buildBannerAd(),
        ],
      ),
    );
  }

  Widget _buildTurnClock(AsyncMatchRow match) {
    if (!match.isActive) return const SizedBox.shrink();

    final myTurn = _isMyTurn;
    final label = myTurn
        ? AsyncGameService.formatTurnTimeLeft(match.timeLeft)
        : 'Waiting for ${widget.opponentUsername}';

    Color bg;
    Color fg;
    if (myTurn && match.isTurnExpired) {
      bg = Colors.red.shade100;
      fg = Colors.red.shade900;
    } else if (myTurn) {
      bg = Colors.orange.shade100;
      fg = Colors.black87;
    } else {
      bg = Colors.white;
      fg = Colors.black54;
    }

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(12, 10, 12, 0),
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.black, width: 2),
      ),
      child: Text(
        myTurn ? 'Your turn · $label' : label,
        textAlign: TextAlign.center,
        style: TextStyle(fontWeight: FontWeight.bold, color: fg),
      ),
    );
  }

  Widget _buildScoreHeader() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(12, 10, 12, 6),
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.black, width: 2),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          Expanded(child: _playerColumn(_p1Name, _p1Id)),
          const Text('VS', style: TextStyle(fontWeight: FontWeight.w900)),
          Expanded(child: _playerColumn(_p2Name, _p2Id)),
        ],
      ),
    );
  }

  Widget _playerColumn(String name, String playerId) {
    final wins = _seriesScore?.winsFor(playerId);
    return Column(
      children: [
        Text(
          name,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(
          wins == null ? '—' : '$wins',
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
        ),
        const Text(
          'series wins',
          style: TextStyle(fontSize: 11, color: Colors.black54),
        ),
      ],
    );
  }
}
