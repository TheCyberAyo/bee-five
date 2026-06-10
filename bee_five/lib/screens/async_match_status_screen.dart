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
import '../widgets/online_bee_five_board.dart';

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
        : 'This async match is complete.';

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
            Text(
              widget.justSaved ? 'Move saved' : 'Multi-day match',
              style: const TextStyle(fontSize: 12, color: Colors.black87),
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
                      if (widget.justSaved) _buildSavedBanner(),
                      _buildStatusBanner(match),
                      _buildScoreHeader(),
                      if (_isMyTurn && match.isActive)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                          child: SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _openPlayScreen,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.black,
                                foregroundColor: primaryYellow,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                              ),
                              child: const Text(
                                'Your turn — play move',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                        ),
                      Expanded(
                        child: AsyncBeeFiveBoard(
                          myUserId: widget.myId,
                          opponentUserId: widget.opponentId,
                          myUsername: widget.myUsername,
                          opponentUsername: widget.opponentUsername,
                          board: match.board,
                          currentSeat: match.currentSeat,
                          isSaving: false,
                          readOnly: true,
                          onSaveMove: (_, _) async {},
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                        child: SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            onPressed: () => Navigator.pop(context),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.black,
                              side: const BorderSide(color: Colors.black, width: 2),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            child: const Text(
                              'Back to Home',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ),
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

  Widget _buildSavedBanner() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(12, 10, 12, 0),
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
      decoration: BoxDecoration(
        color: Colors.green.shade100,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.black, width: 2),
      ),
      child: const Text(
        'Move saved! Waiting for your opponent — they have 24 hours.',
        textAlign: TextAlign.center,
        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
      ),
    );
  }

  Widget _buildStatusBanner(AsyncMatchRow match) {
    if (!match.isActive) return const SizedBox.shrink();

    final myTurn = _isMyTurn;
    String text;
    if (myTurn) {
      final left = AsyncGameService.formatTurnTimeLeft(match.timeLeft);
      text = left.isNotEmpty ? 'Your turn · $left' : 'Your turn · 24h clock';
    } else {
      final left = AsyncGameService.formatTurnTimeLeft(match.timeLeft);
      text = left.isNotEmpty
          ? 'Waiting for ${widget.opponentUsername} · $left on their clock'
          : 'Waiting for ${widget.opponentUsername}';
    }

    return Container(
      width: double.infinity,
      margin: EdgeInsets.fromLTRB(12, widget.justSaved ? 8 : 10, 12, 0),
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
      decoration: BoxDecoration(
        color: myTurn ? Colors.orange.shade100 : Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.black, width: 2),
      ),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: const TextStyle(fontWeight: FontWeight.bold),
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
