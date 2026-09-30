import 'dart:async';

import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import '../firebase_bootstrap.dart';
import 'gameanalytics_provider.dart';

typedef AnalyticsSink =
    Future<void> Function(String name, Map<String, Object> parameters);

/// Best-effort telemetry: never blocks gameplay and never includes player PII.
class GameAnalytics {
  GameAnalytics({AnalyticsSink? sink, List<AnalyticsSink>? sinks})
    : _sinks =
          sinks ??
          (sink != null
              ? [sink]
              : [_firebaseSink, GameAnalyticsProvider.track]);

  static final instance = GameAnalytics();
  final List<AnalyticsSink> _sinks;

  /// Call after Firebase initialization, only in the foreground app isolate.
  Future<void> initialize() async {
    await Future.wait([
      _initializeFirebase(),
      GameAnalyticsProvider.initialize(),
    ]);
  }

  Future<void> _initializeFirebase() async {
    if (!isFirebaseReady) {
      if (kDebugMode) {
        debugPrint('[Analytics] Firebase configuration unavailable');
      }
      return;
    }
    try {
      await FirebaseAnalytics.instance.setDefaultEventParameters({
        'build_type': kReleaseMode ? 'release' : 'development',
      });
      await FirebaseAnalytics.instance.setAnalyticsCollectionEnabled(true);
      await FirebaseAnalytics.instance.setUserProperty(
        name: 'build_type',
        value: kReleaseMode ? 'release' : 'development',
      );
    } catch (error) {
      if (kDebugMode) debugPrint('[Analytics] initialization failed: $error');
    }
  }

  static Future<void> _firebaseSink(
    String name,
    Map<String, Object> parameters,
  ) async {
    if (!isFirebaseReady) return;
    await FirebaseAnalytics.instance.logEvent(
      name: name,
      parameters: parameters,
    );
  }

  void event(String name, [Map<String, Object> parameters = const {}]) {
    unawaited(_send(name, parameters));
  }

  Future<void> _send(String name, Map<String, Object> parameters) async {
    await Future.wait(
      _sinks.map((sink) async {
        try {
          await sink(name, parameters);
        } catch (error) {
          if (kDebugMode) debugPrint('[Analytics] $name failed: $error');
        }
      }),
    );
  }

  void selectMode(String mode) =>
      event('game_mode_selected', {'game_mode': mode});

  // Wire these only to a real tutorial; opening the home screen is not one.
  void tutorialBegin(String id) => event('tutorial_begin', {'tutorial_id': id});
  void tutorialComplete(String id) =>
      event('tutorial_complete', {'tutorial_id': id});
}

/// One local player's board attempt, with exactly one terminal event.
/// A live multiplayer match emits one attempt per participating device.
class MatchTelemetry {
  MatchTelemetry({GameAnalytics? analytics})
    : _analytics = analytics ?? GameAnalytics.instance;

  final GameAnalytics _analytics;
  Map<String, Object>? _parameters;
  Stopwatch? _clock;
  bool _ended = true;

  void start(String mode, {Map<String, Object> details = const {}}) {
    quit(reason: 'restart');
    _parameters = {
      ...details,
      'game_mode': mode,
      'attempt_id': const Uuid().v4(),
    };
    _clock = Stopwatch()..start();
    _ended = false;
    _analytics.event('match_started', _parameters!);
  }

  void complete(String outcome) =>
      _end('match_completed', {'outcome': outcome});

  void quit({String reason = 'screen_exit'}) =>
      _end('match_quit', {'reason': reason});

  void rematchRequested() {
    if (_parameters == null) return;
    _analytics.event('rematch_requested', _parameters!);
  }

  void _end(String name, Map<String, Object> details) {
    if (_ended || _parameters == null) return;
    _ended = true;
    _clock?.stop();
    _analytics.event(name, {
      ..._parameters!,
      ...details,
      'duration_seconds': _clock!.elapsed.inSeconds,
    });
  }
}
