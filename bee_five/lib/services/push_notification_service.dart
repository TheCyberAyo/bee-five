import 'dart:async';
import 'dart:io' show Platform;

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

import 'async_game_service.dart';
import 'local_notification_service.dart';

/// Registers the device FCM token with Supabase for async-match push.
class PushNotificationService {
  PushNotificationService._();
  static final PushNotificationService instance = PushNotificationService._();

  final _messaging = FirebaseMessaging.instance;
  StreamSubscription<String>? _tokenRefreshSub;
  StreamSubscription<RemoteMessage>? _foregroundMessageSub;
  StreamSubscription<RemoteMessage>? _openedAppSub;
  bool _registeredForUser = false;

  static String get _platform {
    if (kIsWeb) return 'web';
    if (Platform.isAndroid) return 'android';
    if (Platform.isIOS) return 'ios';
    return 'unknown';
  }

  /// Call when a signed-in user session is available.
  Future<void> registerIfNeeded() async {
    if (kIsWeb) return;

    await LocalNotificationService.instance.init();

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
    _foregroundMessageSub ??=
        FirebaseMessaging.onMessage.listen(_showForegroundNotification);
    _openedAppSub ??=
        FirebaseMessaging.onMessageOpenedApp.listen(_showForegroundNotification);
    _registeredForUser = true;
  }

  Future<void> _showForegroundNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;
    await LocalNotificationService.instance.show(
      title: notification.title ?? 'Bee Five',
      body: notification.body ?? '',
      payload: message.data['match_id']?.toString(),
    );
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
    _foregroundMessageSub?.cancel();
    _foregroundMessageSub = null;
    _openedAppSub?.cancel();
    _openedAppSub = null;
    _registeredForUser = false;
  }

  bool get isRegistered => _registeredForUser;
}
