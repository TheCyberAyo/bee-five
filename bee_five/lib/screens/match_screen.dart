// ============================================================
// FILE: lib/screens/match_screen.dart
// PURPOSE: Live Bee Five match — synced moves via Supabase Broadcast,
//          ELO via submit-match Edge Function.
// ============================================================

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../ads/multiplayer_ad_constants.dart';
import '../head_to_head_series.dart';
import '../services/multiplayer_service.dart';
import '../xp_service.dart';
import '../simple_game.dart' show primaryYellow;
import '../theme/bee_five_multiplayer_theme.dart';
import '../widgets/challenge_dialog.dart';
import '../widgets/online_bee_five_board.dart';

class MatchScreen extends StatefulWidget {
  final String matchId;
  final String myId;
  final String myUsername;
  final int myElo;
  final String opponentId;
  final String opponentUsername;

  /// After the match route is popped, lobby presence uses searching vs idle.
  final bool restoreSearchingWhenLeaving;

  /// Bee Five XP when the match opened (lobby presence); restore uses latest [getXp].
  final int lobbyBeeFiveXp;

  const MatchScreen({
    super.key,
    required this.matchId,
    required this.myId,
    required this.myUsername,
    required this.myElo,
    required this.opponentId,
    required this.opponentUsername,
    required this.lobbyBeeFiveXp,
    this.restoreSearchingWhenLeaving = false,
  });

  @override
  State<MatchScreen> createState() => _MatchScreenState();
}

class _MatchScreenState extends State<MatchScreen> {
  final _service = MultiplayerService();
  final _uuid = const Uuid();
  final GlobalKey<OnlineBeeFiveBoardState> _boardKey =
      GlobalKey<OnlineBeeFiveBoardState>();

  late StreamSubscription<Map<String, dynamic>> _gameEventSub;
  late StreamSubscription<Map<String, dynamic>> _matchOverSub;
  StreamSubscription<Map<String, dynamic>>? _rematchChallengeSub;
  StreamSubscription<Map<String, dynamic>>? _rematchChallengeResponseSub;
  StreamSubscription<Map<String, dynamic>>? _rematchMatchStartSub;

  bool _matchEnded = false;
  bool _waitingDrawConfirm = false;
  bool _rematchHandled = false;
  bool _showingRematchDialog = false;

  /// No moves played — skip interstitial / “completed match” counter on exit.
  bool _voidNoMovesEnd = false;

  /// Prior recorded H2H games; null until loaded from [mg_matches].
  int? _priorMatchCount;

  /// Series wins (resets when either player reaches [headToHeadSeriesResetAt]).
  HeadToHeadSeriesScore? _seriesScore;

  BannerAd? _matchBannerAd;
  bool _isMatchBannerLoaded = false;
  InterstitialAd? _multiplayerInterstitial;

  String get _p1Id => onlineMatchPlayer1Id(widget.myId, widget.opponentId);
  String get _p2Id => onlineMatchPlayer2Id(widget.myId, widget.opponentId);
  String get _p1Name =>
      _p1Id == widget.myId ? widget.myUsername : widget.opponentUsername;
  String get _p2Name =>
      _p2Id == widget.myId ? widget.myUsername : widget.opponentUsername;

  int get _openingSeat =>
      onlineMatchFirstSeat(_priorMatchCount ?? 0);

  @override
  void initState() {
    super.initState();
    // Listen before joining so broadcast StreamController does not drop events
    // that arrive in the first ms after subscribe (broadcast has no buffer).
    _gameEventSub = _service.onGameEvent.listen((payload) {
      if (mounted) {
        _handleOpponentEvent(payload);
      }
    });

    _matchOverSub = _service.onMatchOver.listen((payload) {
      if (mounted) {
        _handleMatchOverBroadcast(payload);
      }
    });

    _loadMatchBannerAd();
    _loadMultiplayerInterstitial();
    unawaited(
      _service.setInMatch(
        userId: widget.myId,
        username: widget.myUsername,
        elo: widget.myElo,
        beeFiveXp: widget.lobbyBeeFiveXp,
      ),
    );
    _joinMatch();
    unawaited(_loadMatchHeaderData());
  }

  Future<void> _loadMatchHeaderData() async {
    final results = await Future.wait([
      _service.countCompletedMatchesBetween(widget.myId, widget.opponentId),
      _service.fetchHeadToHeadSeriesScore(widget.myId, widget.opponentId),
    ]);
    if (!mounted) return;
    setState(() {
      _priorMatchCount = results[0] as int;
      _seriesScore = results[1] as HeadToHeadSeriesScore;
    });
  }

  Future<void> _refreshHeadToHeadSeriesScore() async {
    final score = await _service.fetchHeadToHeadSeriesScore(
      widget.myId,
      widget.opponentId,
    );
    if (!mounted) return;
    setState(() => _seriesScore = score);
  }

  void _loadMatchBannerAd() {
    _matchBannerAd = BannerAd(
      adUnitId: kMultiplayerBannerAdUnitId,
      size: AdSize.banner,
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (ad) {
          if (mounted) setState(() => _isMatchBannerLoaded = true);
        },
        onAdFailedToLoad: (ad, error) {
          ad.dispose();
          if (mounted) setState(() => _isMatchBannerLoaded = false);
        },
      ),
    )..load();
  }

  void _loadMultiplayerInterstitial() {
    InterstitialAd.load(
      adUnitId: kMultiplayerInterstitialAdUnitId,
      request: const AdRequest(),
      adLoadCallback: InterstitialAdLoadCallback(
        onAdLoaded: (ad) {
          if (mounted) {
            setState(() => _multiplayerInterstitial = ad);
          } else {
            ad.dispose();
          }
        },
        onAdFailedToLoad: (error) {
          if (mounted) {
            setState(() => _multiplayerInterstitial = null);
          }
        },
      ),
    );
  }

  Widget _buildMatchBannerAd() {
    if (!_isMatchBannerLoaded || _matchBannerAd == null) {
      return const SizedBox.shrink();
    }
    return SizedBox(
      width: _matchBannerAd!.size.width.toDouble(),
      height: _matchBannerAd!.size.height.toDouble(),
      child: AdWidget(ad: _matchBannerAd!),
    );
  }

  /// One increment per finished lobby match (skipped if match ended with zero moves).
  /// Shows interstitial after every [kMultiplayerInterstitialEveryNMatches]-th completion:
  /// first after game **4**, then **8**, **12**, … before popping back to the lobby.
  Future<void> _incrementMatchCountAndMaybeShowInterstitial() async {
    final prefs = await SharedPreferences.getInstance();
    final n = (prefs.getInt(kPrefsMultiplayerMatchesCompleted) ?? 0) + 1;
    await prefs.setInt(kPrefsMultiplayerMatchesCompleted, n);

    if (n % kMultiplayerInterstitialEveryNMatches != 0) {
      return;
    }

    final ad = _multiplayerInterstitial;
    if (ad == null) {
      _loadMultiplayerInterstitial();
      return;
    }

    final completer = Completer<void>();
    ad.fullScreenContentCallback = FullScreenContentCallback(
      onAdDismissedFullScreenContent: (ad) {
        ad.dispose();
        if (mounted) {
          setState(() => _multiplayerInterstitial = null);
        }
        _loadMultiplayerInterstitial();
        if (!completer.isCompleted) {
          completer.complete();
        }
      },
      onAdFailedToShowFullScreenContent: (ad, error) {
        ad.dispose();
        if (mounted) {
          setState(() => _multiplayerInterstitial = null);
        }
        _loadMultiplayerInterstitial();
        if (!completer.isCompleted) {
          completer.complete();
        }
      },
    );

    unawaited(ad.show());
    await completer.future;
  }

  Future<void> _onBackToSchoolLobbyFromEndDialog() async {
    _cancelRematchListeners();
    Navigator.pop(context);
    final skipCompletedMatchCount = _voidNoMovesEnd;
    if (!skipCompletedMatchCount) {
      await _incrementMatchCountAndMaybeShowInterstitial();
    }
    _voidNoMovesEnd = false;
    if (!mounted) {
      return;
    }
    Navigator.pop(context);
  }

  void _cancelRematchListeners() {
    _rematchChallengeSub?.cancel();
    _rematchChallengeSub = null;
    _rematchChallengeResponseSub?.cancel();
    _rematchChallengeResponseSub = null;
    _rematchMatchStartSub?.cancel();
    _rematchMatchStartSub = null;
  }

  void _beginRematchPhase() {
    _cancelRematchListeners();
    _rematchChallengeSub = _service.onChallenge.listen(_onIncomingRematchChallenge);
    _rematchChallengeResponseSub =
        _service.onChallengeResponse.listen(_onRematchChallengeResponse);
    _rematchMatchStartSub = _service.onMatchStart.listen(_onRematchMatchStart);
  }

  Future<void> _onIncomingRematchChallenge(Map<String, dynamic> payload) async {
    if (!_matchEnded || _rematchHandled || !mounted || _showingRematchDialog) {
      return;
    }
    if (payload['from_id']?.toString() != widget.opponentId) {
      return;
    }

    _showingRematchDialog = true;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => ChallengeDialog(
        isRematch: true,
        fromUsername: widget.opponentUsername,
        fromElo: int.tryParse(payload['from_elo']?.toString() ?? '') ??
            widget.myElo,
        onAccept: () async {
          Navigator.pop(dialogCtx);
          final matchId = _service.matchIdForChallengeAccept(
            opponentId: widget.opponentId,
            theirMatchId: payload['match_id']?.toString() ?? '',
          );
          await _service.respondToChallenge(
            matchId: matchId,
            challengerId: widget.opponentId,
            accepted: true,
            responderId: widget.myId,
            responderUsername: widget.myUsername,
          );
          _openRematch(matchId);
        },
        onDecline: () async {
          Navigator.pop(dialogCtx);
          await _service.respondToChallenge(
            matchId: payload['match_id']?.toString() ?? '',
            challengerId: widget.opponentId,
            accepted: false,
            responderId: widget.myId,
            responderUsername: widget.myUsername,
          );
        },
      ),
    );
    _showingRematchDialog = false;
  }

  void _onRematchChallengeResponse(Map<String, dynamic> payload) {
    if (!_matchEnded || _rematchHandled || !mounted) {
      return;
    }
    if (payload['responder_id']?.toString() != widget.opponentId) {
      return;
    }

    if (payload['accepted'] == true) {
      _openRematch(payload['match_id']?.toString() ?? '');
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${widget.opponentUsername} declined the rematch'),
      ),
    );
  }

  void _onRematchMatchStart(Map<String, dynamic> payload) {
    if (!_matchEnded || _rematchHandled || !mounted) {
      return;
    }
    if (payload['opponent_id']?.toString() != widget.opponentId) {
      return;
    }
    _openRematch(payload['match_id']?.toString() ?? '');
  }

  void _openRematch(String matchId) {
    if (!mounted || matchId.isEmpty || _rematchHandled) {
      return;
    }
    _rematchHandled = true;
    _cancelRematchListeners();

    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => MatchScreen(
          matchId: matchId,
          myId: widget.myId,
          myUsername: widget.myUsername,
          myElo: widget.myElo,
          opponentId: widget.opponentId,
          opponentUsername: widget.opponentUsername,
          lobbyBeeFiveXp: widget.lobbyBeeFiveXp,
          restoreSearchingWhenLeaving: widget.restoreSearchingWhenLeaving,
        ),
      ),
    );
  }

  Future<void> _onRematchPressed() async {
    if (!_matchEnded || _rematchHandled) {
      return;
    }

    Navigator.of(context, rootNavigator: true).pop();

    await ensureXpInitialized();
    final xp = await getXp();
    await _service.setIdle(
      userId: widget.myId,
      username: widget.myUsername,
      elo: widget.myElo,
      beeFiveXp: xp,
    );

    final matchId = _service.matchIdForOutgoingChallenge(
      widget.opponentId,
      _uuid.v4(),
    );
    await _service.sendChallenge(
      fromId: widget.myId,
      fromUsername: widget.myUsername,
      fromElo: widget.myElo,
      fromBeeFiveXp: xp,
      toId: widget.opponentId,
      matchId: matchId,
    );

    if (!mounted || _rematchHandled) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Rematch sent to ${widget.opponentUsername}…'),
      ),
    );
  }

  List<Widget> _matchEndDialogActions() {
    return [
      ElevatedButton(
        onPressed: () => unawaited(_onRematchPressed()),
        style: BeeFiveMultiplayerTheme.primaryBlackButton,
        child: const Text('Rematch'),
      ),
      TextButton(
        onPressed: () {
          unawaited(_onBackToSchoolLobbyFromEndDialog());
        },
        child: const Text(
          'Back to School Lobby',
          style: TextStyle(color: Colors.black87, fontWeight: FontWeight.w600),
        ),
      ),
    ];
  }

  Future<void> _joinMatch() async {
    await _service.joinMatch(
      matchId: widget.matchId,
      userId: widget.myId,
      opponentId: widget.opponentId,
    );
  }

  void _handleOpponentEvent(Map<String, dynamic> payload) {
    if (payload['type'] == 'move') {
      _boardKey.currentState?.applyRemoteMove(payload);
    }
  }

  /// After server + broadcast from winner / draw submitter / disconnect.
  void _handleMatchOverBroadcast(Map<String, dynamic> payload) {
    if (_matchEnded) {
      return;
    }

    final disconnect = payload['reason'] == 'opponent_disconnected';
    final isDraw = payload['is_draw'] == true;

    if (disconnect) {
      final wid = payload['winner_id'] as String?;
      if (wid != null) {
        // Only the connected player who detected the drop submits to the server.
        unawaited(
          _finishMatchEnd(
            winnerId: wid,
            submitToServer: wid == widget.myId,
          ),
        );
      }
      return;
    }

    if (isDraw) {
      setState(() {
        _matchEnded = true;
        _waitingDrawConfirm = false;
      });
      _voidNoMovesEnd = payload['void_no_moves'] == true;
      _service.leaveMatch();
      if (mounted) {
        if (_voidNoMovesEnd) {
          _showVoidNoMovesDialog();
        } else {
          _showDrawDialog(payload);
        }
      }
      return;
    }

    final wid = payload['winner_id'] as String?;
    if (wid == null) {
      return;
    }

    // Normal win: opponent already invoked submit-match; show result only.
    setState(() => _matchEnded = true);
    _service.leaveMatch();
    unawaited(_refreshHeadToHeadSeriesScore());
    if (mounted) {
      _showResultDialog(
        wid,
        <String, dynamic>{
          'winnerChange': payload['winnerChange'],
          'loserChange': payload['loserChange'],
        },
      );
    }
  }

  Future<void> sendMove(Map<String, dynamic> eventData) async {
    await _service.sendGameEvent(widget.myId, eventData);
  }

  /// Local five-in-a-row — this client submits the result.
  Future<void> _onLocalWin(String winnerUserId) async {
    await _finishMatchEnd(winnerId: winnerUserId, submitToServer: true);
  }

  /// Full board — lexicographically lower user id submits draw to the server.
  Future<void> _onLocalDraw() async {
    if (_matchEnded || _waitingDrawConfirm) {
      return;
    }
    final iSubmitDraw = widget.myId.compareTo(widget.opponentId) < 0;
    if (iSubmitDraw) {
      await _finishMatchDrawSubmit();
    } else {
      setState(() => _waitingDrawConfirm = true);
    }
  }

  Future<void> _finishMatchDrawSubmit() async {
    if (_matchEnded) {
      return;
    }
    setState(() {
      _matchEnded = true;
      _waitingDrawConfirm = false;
    });

    Map<String, dynamic> result;
    try {
      result = await _service.submitMatchResult(
        player1Id: widget.myId,
        player2Id: widget.opponentId,
        isDraw: true,
      );
    } catch (_) {
      if (mounted) {
        setState(() => _matchEnded = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not record draw. Try again.')),
        );
      }
      return;
    }

    await _service.leaveMatch();
    await _refreshHeadToHeadSeriesScore();
    if (mounted) {
      _showDrawDialog(result);
    }
  }

  /// [submitToServer]: true when this device must call the Edge Function
  /// (local win, forfeit, or disconnect as remaining player).
  Future<void> _finishMatchEnd({
    required String winnerId,
    required bool submitToServer,
  }) async {
    if (_matchEnded) {
      return;
    }
    setState(() => _matchEnded = true);

    final hadMoves = _boardKey.currentState?.hasPlacedPieces ?? false;

    Map<String, dynamic>? result;
    if (submitToServer) {
      try {
        if (!hadMoves) {
          result = await _service.submitMatchResult(
            player1Id: widget.myId,
            player2Id: widget.opponentId,
            isDraw: true,
            voidNoMoves: true,
          );
        } else {
          result = await _service.submitMatchResult(
            player1Id: widget.myId,
            player2Id: widget.opponentId,
            winnerId: winnerId,
          );
        }
      } catch (_) {
        if (mounted) {
          setState(() => _matchEnded = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Could not submit match. Check connection.'),
            ),
          );
        }
        return;
      }
    }

    await _service.leaveMatch();
    if (submitToServer && hadMoves) {
      await _refreshHeadToHeadSeriesScore();
    }
    if (mounted) {
      if (submitToServer && !hadMoves) {
        _voidNoMovesEnd = true;
        _showVoidNoMovesDialog();
      } else {
        final resolvedWinner = result?['duplicate'] == true
            ? (result?['winner_id']?.toString() ?? winnerId)
            : winnerId;
        _showResultDialog(resolvedWinner, result);
      }
    }
  }

  void _showVoidNoMovesDialog() {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => BeeFiveMultiplayerTheme.yellowDialog(
        title: const Text(
          'Match ended',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.black,
          ),
        ),
        content: const Text(
          'No moves were played, so there is no winner or loser and your '
          'record is unchanged.',
          style: TextStyle(color: Colors.black87, fontSize: 16),
        ),
        actions: [
          TextButton(
            onPressed: () {
              unawaited(_onBackToSchoolLobbyFromEndDialog());
            },
            child: const Text(
              'Back to School Lobby',
              style: TextStyle(color: Colors.black87, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  void _showDrawDialog(Map<String, dynamic> payload) {
    _beginRematchPhase();

    final d1 = payload['player1Change'];
    final d2 = payload['player2Change'];
    final mine = widget.myId == _p1Id ? d1 : d2;
    final mineStr = mine is int
        ? (mine >= 0 ? '+$mine' : '$mine')
        : (mine is num ? (mine >= 0 ? '+${mine.toInt()}' : '${mine.toInt()}') : null);

    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => BeeFiveMultiplayerTheme.yellowDialog(
        title: const Text(
          'Draw',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.black,
          ),
        ),
        content: Text(
          mineStr != null
              ? 'Match drawn. Your ELO change: $mineStr'
              : 'Match drawn.',
          style: const TextStyle(color: Colors.black87, fontSize: 16),
        ),
        actions: _matchEndDialogActions(),
      ),
    );
  }

  void _showResultDialog(String winnerId, Map<String, dynamic>? eloResult) {
    unawaited(_presentResultDialog(winnerId, eloResult));
  }

  Future<void> _presentResultDialog(
    String winnerId,
    Map<String, dynamic>? eloResult,
  ) async {
    await recordSchoolLobbyMatchOutcome(winnerId == widget.myId);
    if (!mounted) {
      return;
    }

    _beginRematchPhase();

    final iWon = winnerId == widget.myId;
    int? eloChange;
    if (eloResult != null) {
      eloChange = iWon
          ? (eloResult['winnerChange'] as num?)?.toInt()
          : (eloResult['loserChange'] as num?)?.toInt();
    }

    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => BeeFiveMultiplayerTheme.yellowDialog(
        title: Text(
          iWon ? 'You won!' : 'You lost',
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.black,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              iWon
                  ? 'You beat ${widget.opponentUsername}!'
                  : '${widget.opponentUsername} beat you.',
              style: const TextStyle(color: Colors.black87, fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              iWon ? '+1 XP' : '-1 XP',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: iWon ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
              ),
            ),
            if (eloChange != null) ...[
              const SizedBox(height: 12),
              Text(
                iWon ? '+$eloChange ELO' : '$eloChange ELO',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: iWon ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
                ),
              ),
            ],
          ],
        ),
        actions: _matchEndDialogActions(),
      ),
    );
  }

  @override
  void dispose() {
    _cancelRematchListeners();
    _gameEventSub.cancel();
    _matchOverSub.cancel();
    _matchBannerAd?.dispose();
    _multiplayerInterstitial?.dispose();
    _service.leaveMatch();
    unawaited(_restoreLobbyPresenceAfterMatch());
    super.dispose();
  }

  Future<void> _restoreLobbyPresenceAfterMatch() async {
    await ensureXpInitialized();
    final xp = await getXp();
    if (widget.restoreSearchingWhenLeaving) {
      await _service.setSearching(
        userId: widget.myId,
        username: widget.myUsername,
        elo: widget.myElo,
        beeFiveXp: xp,
      );
    } else {
      await _service.setIdle(
        userId: widget.myId,
        username: widget.myUsername,
        elo: widget.myElo,
        beeFiveXp: xp,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BeeFiveMultiplayerTheme.scaffoldBackground,
      appBar: AppBar(
        backgroundColor: primaryYellow,
        foregroundColor: Colors.black,
        elevation: 0,
        automaticallyImplyLeading: false,
        shape: const Border(
          bottom: BorderSide(color: Colors.black, width: 2),
        ),
        title: Text(
          '${widget.myUsername} vs ${widget.opponentUsername}',
          style: const TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.w800,
            fontSize: 16,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              if (_matchEnded) {
                return;
              }
              unawaited(
                _finishMatchEnd(
                  winnerId: widget.opponentId,
                  submitToServer: true,
                ),
              );
            },
            child: const Text(
              'Forfeit',
              style: TextStyle(
                color: Colors.black,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          _buildSeatHeader(),
          if (_waitingDrawConfirm)
            Padding(
              padding: const EdgeInsets.all(8),
              child: Text(
                'Recording draw…',
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.black.withValues(alpha: 0.55),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          const Divider(height: 1, color: Colors.black26),
          Expanded(
            child: _priorMatchCount == null
                ? const Center(child: CircularProgressIndicator())
                : IgnorePointer(
                    ignoring: _matchEnded || _waitingDrawConfirm,
                    child: OnlineBeeFiveBoard(
                      key: _boardKey,
                      myUserId: widget.myId,
                      opponentUserId: widget.opponentId,
                      myUsername: widget.myUsername,
                      opponentUsername: widget.opponentUsername,
                      initialFirstSeat:
                          onlineMatchFirstSeat(_priorMatchCount!),
                      sendNetworkEvent: sendMove,
                      onWin: _onLocalWin,
                      onDraw: _onLocalDraw,
                    ),
                  ),
          ),
          _buildMatchBannerAd(),
        ],
      ),
    );
  }

  Widget _buildSeatHeader() {
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
          Expanded(
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 14,
                      height: 14,
                      decoration: const BoxDecoration(
                        color: Colors.black,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        _p1Name,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.black,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                _buildSeriesWinsLabel(_p1Id),
                const SizedBox(height: 4),
                Text(
                  _seatSubtitle(
                    seat: 1,
                    colorLabel: 'Black',
                    isYou: _p1Id == widget.myId,
                  ),
                  style: const TextStyle(fontSize: 12, color: Colors.black54),
                ),
              ],
            ),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 6),
            child: Text(
              'VS',
              style: TextStyle(
                color: Colors.black45,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          Expanded(
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 14,
                      height: 14,
                      decoration: const BoxDecoration(
                        color: primaryYellow,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        _p2Name,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.black,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                _buildSeriesWinsLabel(_p2Id),
                const SizedBox(height: 4),
                Text(
                  _seatSubtitle(
                    seat: 2,
                    colorLabel: 'Yellow',
                    isYou: _p2Id == widget.myId,
                  ),
                  style: const TextStyle(fontSize: 12, color: Colors.black54),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSeriesWinsLabel(String playerId) {
    final wins = _seriesScore?.winsFor(playerId);
    return Column(
      children: [
        Text(
          wins == null ? '—' : '$wins',
          style: const TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w900,
            color: Colors.black,
            height: 1,
          ),
        ),
        const Text(
          'series wins',
          style: TextStyle(
            fontSize: 11,
            color: Colors.black54,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  String _seatSubtitle({
    required int seat,
    required String colorLabel,
    required bool isYou,
  }) {
    final who = isYou ? 'You · $colorLabel' : colorLabel;
    if (_priorMatchCount != null && seat == _openingSeat) {
      return '$who · opens';
    }
    return who;
  }
}
