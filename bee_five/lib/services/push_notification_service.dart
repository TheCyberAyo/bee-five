import 'dart:async';
import 'dart:io' show Platform;

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

import 'async_game_service.dart';

/// Registers the device FCM token with Supabase for async-match push.
class PushNotificationService {
  PushNotificationService._();
  static final PushNotificationService instance = PushNotificationService._();

  final _messaging = FirebaseMessaging.instance;
  StreamSubscription<String>? _tokenRefreshSub;
  bool _registeredForUser = false;

  static String get _platform {
    if (kIsWeb) return 'web';
    if (Platform.isAndroid) return 'android';
    if (Platform.isIOS) return 'ios';
    return 'unknown';
  }

  /// Call when a signed-in user reaches Home (async session start).
  Future<void> registerIfNeeded() async {
    if (kIsWeb) return;

    await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    final token = await _messaging.getToken();
    if (token != null) {
      await _saveToken(token);
    }

    _tokenRefreshSub ??= _messaging.onTokenRefresh.listen(_saveToken);
    _registeredForUser = true;
  }

  Future<void> _saveToken(String token) async {
    try {
      await AsyncGameService.instance.upsertPushToken(
        token,
        platform: _platform,
      );
    } catch (_) {
      // Best-effort; realtime notifications still work while app is open.
    }
  }

  void stop() {
    _tokenRefreshSub?.cancel();
    _tokenRefreshSub = null;
    _registeredForUser = false;
  }

  bool get isRegistered => _registeredForUser;
}
