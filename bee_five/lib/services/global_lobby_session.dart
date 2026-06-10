// Keeps universal-lobby presence and challenge handling active while Home is open,
// so signed-in players are challengeable outside the Online Gaming screen.

import 'dart:async';

import 'package:flutter/material.dart';

import '../widgets/challenge_dialog.dart';
import '../xp_service.dart';
import 'multiplayer_service.dart';

typedef GlobalLobbyMatchOpener = void Function({
  required String matchId,
  required String opponentId,
  required String opponentUsername,
});

/// Subscribes to lobby realtime while [HomePage] is mounted.
class GlobalLobbySession {
  GlobalLobbySession({
    required MultiplayerService service,
    required GlobalLobbyMatchOpener onOpenMatch,
  })  : _service = service,
        _onOpenMatch = onOpenMatch;

  final MultiplayerService _service;
  final GlobalLobbyMatchOpener _onOpenMatch;

  StreamSubscription<Map<String, dynamic>>? _challengeSub;
  StreamSubscription<Map<String, dynamic>>? _challengeResponseSub;
  StreamSubscription<Map<String, dynamic>>? _matchStartSub;

  String? _userId;
  String? _lastOpenedMatchId;
  DateTime? _lastOpenedMatchAt;
  String? _username;
  int _elo = 1200;
  int _lobbyXp = defaultXp;

  bool get isBound => _userId != null;

  /// Join the universal lobby when the user is signed in and linked to a school.
  Future<void> startIfEligible() async {
    final joined = await _service.joinLobbyFromCurrentProfile();
    if (!joined) {
      stopListening();
      _clearIdentity();
      return;
    }
    final identity = _service.lobbyIdentity;
    if (identity == null) {
      stopListening();
      _clearIdentity();
      return;
    }
    _userId = identity.userId;
    _username = identity.username;
    _elo = identity.elo;
    _lobbyXp = identity.beeFiveXp;
    _ensureListening();
  }

  void _ensureListening() {
    if (_userId == null) return;
    _challengeSub ??= _service.onChallenge.listen(_onIncomingChallenge);
    _challengeResponseSub ??=
        _service.onChallengeResponse.listen(_onChallengeResponse);
    _matchStartSub ??= _service.onMatchStart.listen(_onMatchStart);
  }

  void stopListening() {
    _challengeSub?.cancel();
    _challengeSub = null;
    _challengeResponseSub?.cancel();
    _challengeResponseSub = null;
    _matchStartSub?.cancel();
    _matchStartSub = null;
  }

  void _clearIdentity() {
    _userId = null;
    _username = null;
    _elo = 1200;
    _lobbyXp = defaultXp;
  }

  /// Call after [MultiplayerService.leaveSchoolLobby] or sign-out clears the channel.
  void onLeftSchoolLobby() {
    stopListening();
    _clearIdentity();
  }

  void dispose() {
    onLeftSchoolLobby();
  }

  Future<void> _onIncomingChallenge(Map<String, dynamic> payload) async {
    final ctx = _dialogContext;
    final userId = _userId;
    final username = _username;
    if (ctx == null || userId == null || username == null) return;

    await showDialog<void>(
      context: ctx,
      barrierDismissible: false,
      builder: (dialogCtx) => ChallengeDialog(
        fromUsername: payload['from_username']?.toString() ?? 'Player',
        fromElo: int.tryParse(payload['from_elo']?.toString() ?? '') ?? 1200,
        onAccept: () async {
          Navigator.pop(dialogCtx);
          final challengerId = payload['from_id']?.toString() ?? '';
          final theirMatchId = payload['match_id']?.toString() ?? '';
          final matchId = _service.matchIdForChallengeAccept(
            opponentId: challengerId,
            theirMatchId: theirMatchId,
          );
          await _service.respondToChallenge(
            matchId: matchId,
            challengerId: challengerId,
            accepted: true,
            responderId: userId,
            responderUsername: username,
          );
          _openMatchIfNew(
            matchId: matchId,
            opponentId: challengerId,
            opponentUsername: payload['from_username']?.toString() ?? 'Player',
          );
        },
        onDecline: () async {
          Navigator.pop(dialogCtx);
          await _service.respondToChallenge(
            matchId: payload['match_id']?.toString() ?? '',
            challengerId: payload['from_id']?.toString() ?? '',
            accepted: false,
            responderId: userId,
            responderUsername: username,
          );
        },
      ),
    );
  }

  void _onChallengeResponse(Map<String, dynamic> payload) {
    final ctx = _snackContext;
    if (ctx == null) return;

    if (payload['accepted'] == true) {
      _openMatchIfNew(
        matchId: payload['match_id']?.toString() ?? '',
        opponentId: payload['responder_id']?.toString() ?? '',
        opponentUsername:
            payload['responder_username']?.toString() ?? 'Player',
      );
      return;
    }

    final name = payload['responder_username']?.toString() ?? 'Player';
    ScaffoldMessenger.of(ctx).showSnackBar(
      SnackBar(content: Text('$name declined your challenge')),
    );
  }

  void _onMatchStart(Map<String, dynamic> payload) {
    _openMatchIfNew(
      matchId: payload['match_id']?.toString() ?? '',
      opponentId: payload['opponent_id']?.toString() ?? '',
      opponentUsername: payload['opponent_username']?.toString() ?? 'Player',
    );
  }

  void _openMatchIfNew({
    required String matchId,
    required String opponentId,
    required String opponentUsername,
  }) {
    if (matchId.isEmpty || opponentId.isEmpty) return;

    final now = DateTime.now();
    if (_lastOpenedMatchId == matchId &&
        _lastOpenedMatchAt != null &&
        now.difference(_lastOpenedMatchAt!) < const Duration(seconds: 8)) {
      return;
    }
    _lastOpenedMatchId = matchId;
    _lastOpenedMatchAt = now;

    _onOpenMatch(
      matchId: matchId,
      opponentId: opponentId,
      opponentUsername: opponentUsername,
    );
  }

  BuildContext? _dialogContext;
  BuildContext? _snackContext;

  void updateContexts({
    required BuildContext dialogContext,
    required BuildContext snackContext,
  }) {
    _dialogContext = dialogContext;
    _snackContext = snackContext;
  }

  Future<void> refreshLobbyPresence() => startIfEligible();

  Future<void> restoreIdleAfterMatch() async {
    final userId = _userId;
    final username = _username;
    if (userId == null || username == null) return;
    await ensureXpInitialized();
    final xp = await getXp();
    _lobbyXp = xp;
    await _service.setIdle(
      userId: userId,
      username: username,
      elo: _elo,
      beeFiveXp: xp,
    );
  }

  int get lobbyBeeFiveXp => _lobbyXp;
  int get elo => _elo;
  String? get userId => _userId;
  String? get username => _username;
}
