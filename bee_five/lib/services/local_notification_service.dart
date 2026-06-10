import 'dart:async';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Shows device notifications when Supabase inserts [mg_notifications] rows.
class LocalNotificationService {
  LocalNotificationService._();
  static final LocalNotificationService instance = LocalNotificationService._();

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  bool _initialized = false;
  int _id = 0;

  Future<void> init() async {
    if (_initialized) return;
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings();
    await _plugin.initialize(
      const InitializationSettings(android: android, iOS: ios),
    );
    _initialized = true;
  }

  Future<void> show({
    required String title,
    required String body,
    String? payload,
  }) async {
    if (!_initialized) await init();
    _id++;
    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        'bee_five_async',
        'Async matches',
        channelDescription: 'Challenges and saved moves in multi-day games',
        importance: Importance.high,
        priority: Priority.high,
      ),
      iOS: DarwinNotificationDetails(),
    );
    await _plugin.show(_id, title, body, details, payload: payload);
  }
}
