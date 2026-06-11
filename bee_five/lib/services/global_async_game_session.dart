import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/async_game_service.dart';
import '../services/local_notification_service.dart';
import '../services/push_notification_service.dart';

/// Listens for async push/in-app notifications while Home is open.
class GlobalAsyncGameSession {
  GlobalAsyncGameSession({VoidCallback? onTurnsChanged})
      : _onTurnsChanged = onTurnsChanged;

  final VoidCallback? _onTurnsChanged;
  final _async = AsyncGameService.instance;

  StreamSubscription<List<Map<String, dynamic>>>? _notifSub;
  final Set<String> _seenNotificationIds = {};
  bool _pollingChallenges = false;

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
      var changed = false;
      for (final c in pending) {
        if (_seenNotificationIds.contains('challenge-${c.id}')) continue;
        _seenNotificationIds.add('challenge-${c.id}');
        changed = true;
      }
      if (changed) {
        _onTurnsChanged?.call();
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

}
