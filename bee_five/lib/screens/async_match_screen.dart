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
import '../widgets/async_match_score_header.dart';

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
  Timer? _syncTimer;
  InterstitialAd? _interstitialAd;
  BannerAd? _bannerAd;
  bool _isBannerLoaded = false;

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
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && _match?.isActive == true) setState(() {});
    });
    _syncTimer = Timer.periodic(const Duration(seconds: 30), (_) async {
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
        : 'This $asyncGameModeLabel match is complete. Your series score will update on your next match.';

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
    _syncTimer?.cancel();
    _matchSub?.cancel();
    _interstitialAd?.dispose();
    _bannerAd?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final match = _match;
    final canSave = match != null &&
        match.isActive &&
        _isMyTurn &&
        (_boardKey.currentState?.hasPendingMove ?? false) &&
        !_saving;

    return Scaffold(
      backgroundColor: BeeFiveMultiplayerTheme.scaffoldBackground,
      appBar: AppBar(
        backgroundColor: primaryYellow,
        foregroundColor: Colors.black,
        title: Text(
          '${widget.myUsername} vs ${widget.opponentUsername}',
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
        ),
      ),
      body: Column(
        children: [
          if (match == null)
            const Expanded(
              child: Center(child: CircularProgressIndicator()),
            )
          else ...[
            AsyncMatchScoreHeader(
              myId: widget.myId,
              myUsername: widget.myUsername,
              opponentId: widget.opponentId,
              opponentUsername: widget.opponentUsername,
              seriesScore: _seriesScore,
              match: match,
            ),
            Expanded(
              child: AsyncBeeFiveBoard(
                key: _boardKey,
                myUserId: widget.myId,
                opponentUserId: widget.opponentId,
                board: match.board,
                currentSeat: match.currentSeat,
                isSaving: _saving || !match.isActive,
                onPendingChanged: () => setState(() {}),
                onSaveMove: _saveMove,
              ),
            ),
            if (match.isActive && _isMyTurn)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 2, 16, 6),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: canSave
                        ? () =>
                            unawaited(_boardKey.currentState?.confirmSave())
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: Colors.black26,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: _saving
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Save Move',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                  ),
                ),
              ),
          ],
          SafeArea(
            top: false,
            child: Center(child: _buildBannerAd()),
          ),
        ],
      ),
    );
  }
}
