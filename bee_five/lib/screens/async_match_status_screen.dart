import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../ads/multiplayer_ad_constants.dart';
import '../head_to_head_series.dart';
import '../screens/async_match_screen.dart';
import '../services/async_game_service.dart';
import '../services/multiplayer_service.dart';
import '../simple_game.dart' show primaryYellow;
import '../theme/bee_five_multiplayer_theme.dart';
import '../widgets/async_bee_five_board.dart';
import '../widgets/async_match_score_header.dart';

/// View-only async match screen — after saving a move or when waiting on opponent.
class AsyncMatchStatusScreen extends StatefulWidget {
  final String matchId;
  final String myId;
  final String myUsername;
  final String opponentId;
  final String opponentUsername;
  final bool justSaved;

  const AsyncMatchStatusScreen({
    super.key,
    required this.matchId,
    required this.myId,
    required this.myUsername,
    required this.opponentId,
    required this.opponentUsername,
    this.justSaved = false,
  });

  @override
  State<AsyncMatchStatusScreen> createState() => _AsyncMatchStatusScreenState();
}

class _AsyncMatchStatusScreenState extends State<AsyncMatchStatusScreen> {
  final _async = AsyncGameService.instance;
  final _multiplayer = MultiplayerService();

  AsyncMatchRow? _match;
  HeadToHeadSeriesScore? _seriesScore;
  bool _finishedHandled = false;
  StreamSubscription<List<Map<String, dynamic>>>? _matchSub;
  Timer? _clockTimer;
  Timer? _syncTimer;
  BannerAd? _bannerAd;
  bool _isBannerLoaded = false;

  @override
  void initState() {
    super.initState();
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
      _maybeOpenPlayIfMyTurn(row);
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
      _maybeOpenPlayIfMyTurn(synced);
    });
  }

  void _maybeOpenPlayIfMyTurn(AsyncMatchRow match) {
    if (!mounted || !match.isActive) return;
    if (match.seatFor(widget.myId) == match.currentSeat) {
      _openPlayScreen();
    }
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
    if (match != null) {
      await _handleFinishedIfNeeded(match);
      _maybeOpenPlayIfMyTurn(match);
    }
  }

  Future<void> _handleFinishedIfNeeded(AsyncMatchRow match) async {
    if (_finishedHandled || !match.isFinished) return;
    _finishedHandled = true;

    if (match.status == 'completed' && match.winnerId != null) {
      await _submitCompletedMatch(match.winnerId!);
      if (mounted) _showFinishedDialog(winnerId: match.winnerId);
    } else if (match.status == 'draw') {
      await _submitDraw();
      if (mounted) _showFinishedDialog(isDraw: true);
    } else if (match.isForfeited && match.winnerId != null) {
      await _submitCompletedMatch(match.winnerId!);
      if (mounted) {
        _showFinishedDialog(winnerId: match.winnerId, forfeited: true);
      }
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

  void _openPlayScreen() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => AsyncMatchScreen(
          matchId: widget.matchId,
          myId: widget.myId,
          myUsername: widget.myUsername,
          opponentId: widget.opponentId,
          opponentUsername: widget.opponentUsername,
        ),
      ),
    );
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
        : 'This $asyncGameModeLabel match is complete.';

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
                myUserId: widget.myId,
                opponentUserId: widget.opponentId,
                board: match.board,
                currentSeat: match.currentSeat,
                isSaving: false,
                readOnly: true,
                onSaveMove: (_, _) async {},
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
