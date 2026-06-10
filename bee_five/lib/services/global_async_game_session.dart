import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/async_game_service.dart';
import '../services/local_notification_service.dart';
import '../services/push_notification_service.dart';

typedef AsyncMatchOpener = void Function({
  required String matchId,
  required String opponentId,
  required String opponentUsername,
});

/// Listens for async challenges and notification rows while Home is open.
class GlobalAsyncGameSession {
  GlobalAsyncGameSession({
    required AsyncMatchOpener onOpenMatch,
    VoidCallback? onTurnsChanged,
  })  : _onOpenMatch = onOpenMatch,
        _onTurnsChanged = onTurnsChanged;

  final AsyncMatchOpener _onOpenMatch;
  final VoidCallback? _onTurnsChanged;
  final _async = AsyncGameService.instance;

  StreamSubscription<List<Map<String, dynamic>>>? _notifSub;
  final Set<String> _seenNotificationIds = {};
  bool _pollingChallenges = false;

  BuildContext? _dialogContext;

  void updateContext(BuildContext context) {
    _dialogContext = context;
  }

  Future<void> startIfEligible() async {
    final uid = Supabase.instance.client.auth.currentUser?.id;
    if (uid == null) return;

    await LocalNotificationService.instance.init();
    unawaited(PushNotificationService.instance.registerIfNeeded());
    _notifSub ??= _async.notificationStream().listen(_onNotifications);
    await _pollPendingChallenges();
  }

  void stop() {
    _notifSub?.cancel();
    _notifSub = null;
  }

  void dispose() => stop();

  Future<void> _pollPendingChallenges() async {
    if (_pollingChallenges) return;
    _pollingChallenges = true;
    try {
      final pending = await _async.fetchPendingChallengesForMe();
      for (final c in pending) {
        if (_seenNotificationIds.contains('challenge-${c.id}')) continue;
        _seenNotificationIds.add('challenge-${c.id}');
        await _showAsyncChallengeDialog(c);
      }
    } finally {
      _pollingChallenges = false;
    }
  }

  void _onNotifications(List<Map<String, dynamic>> rows) {
    for (final row in rows) {
      final id = row['id']?.toString();
      if (id == null || _seenNotificationIds.contains(id)) continue;
      _seenNotificationIds.add(id);

      final title = row['title']?.toString() ?? 'Bee Five';
      final body = row['body']?.toString() ?? '';
      unawaited(
        LocalNotificationService.instance.show(
          title: title,
          body: body,
          payload: id,
        ),
      );

      final type = row['type']?.toString() ?? '';
      if (type == 'async_challenge') {
        unawaited(_pollPendingChallenges());
      }
      if (type == 'async_challenge' || type == 'async_move') {
        _onTurnsChanged?.call();
      }
    }
  }

  Future<String> _usernameFor(String userId) async {
    try {
      final row = await Supabase.instance.client
          .from('mg_profiles')
          .select('username')
          .eq('id', userId)
          .maybeSingle();
      final name = row?['username']?.toString().trim();
      if (name != null && name.isNotEmpty) return name;
    } catch (_) {}
    return 'Player';
  }

  Future<void> _showAsyncChallengeDialog(AsyncChallengeRow challenge) async {
    final ctx = _dialogContext;
    if (ctx == null) return;

    final name = challenge.challengerUsername ?? 'A player';
    await showDialog<void>(
      context: ctx,
      barrierDismissible: false,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: const Color(0xFFFFC30B),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Colors.black, width: 3),
        ),
        title: const Text(
          'Async challenge',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: Text(
          '$name challenged you to a multi-day Bee Five match. '
          'You can play over several days — each move is saved with Save Move.',
          style: const TextStyle(fontSize: 15, height: 1.35),
        ),
        actions: [
          TextButton(
            onPressed: () async {
              Navigator.pop(dialogCtx);
              try {
                await _async.declineAsyncChallenge(challenge.id);
              } catch (_) {}
            },
            child: const Text('Decline'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(dialogCtx);
              try {
                final matchId =
                    await _async.acceptAsyncChallenge(challenge.id);
                final oppName = await _usernameFor(challenge.challengerId);
                _onOpenMatch(
                  matchId: matchId,
                  opponentId: challenge.challengerId,
                  opponentUsername: oppName,
                );
              } catch (e) {
                if (ctx.mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    SnackBar(content: Text(e.toString())),
                  );
                }
              }
            },
            child: const Text(
              'Accept',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}
