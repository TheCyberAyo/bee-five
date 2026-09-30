import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:gameanalytics_sdk/gameanalytics.dart' as ga;

/// SDK ingestion keys belong to the game, not to an administrative account.
/// Android and iOS use separate projects so retention cohorts stay comparable.
class GameAnalyticsProvider {
  static bool _ready = false;
  static Future<void>? _initializing;

  static Future<void> initialize() => _initializing ??= _initialize();

  static Future<void> _initialize() async {
    if (kIsWeb) return; // The Next.js site has its own JavaScript integration.
    final (key, secret) = switch (defaultTargetPlatform) {
      TargetPlatform.android => (
        '79df8fe5cc6982d6306a239c12ae4af9',
        '9866b80534a464172b7f79d79a2861071c029d63',
      ),
      TargetPlatform.iOS => (
        'f78bf2629895420e0e4cc0e5aea90bfa',
        'f0dce338f1de9798a5e2b76f8a181b08499c31f6',
      ),
      _ => ('', ''),
    };
    if (key.isEmpty) return;
    try {
      await ga.GameAnalytics.configureAutoDetectAppVersion(true);
      await ga.GameAnalytics.configureAvailableCustomDimensions01([
        'release',
        'development',
      ]);
      await ga.GameAnalytics.setCustomDimension01(
        kReleaseMode ? 'release' : 'development',
      );
      await ga.GameAnalytics.setEnabledInfoLog(kDebugMode);
      await ga.GameAnalytics.initialize(key, secret);
      _ready = true;
    } catch (error) {
      if (kDebugMode) {
        debugPrint('[GameAnalytics] initialization failed: $error');
      }
    }
  }

  static Future<void> track(String name, Map<String, Object> parameters) async {
    if (!_ready) return;
    final event = gameAnalyticsDesignEvent(name, parameters);
    if (event != null) await ga.GameAnalytics.addDesignEvent(event);
  }
}

/// Deliberately bounded event names. Never put attempt IDs or user input in the
/// event hierarchy. Custom fields are allowlisted and contain no account PII.
Map<String, Object>? gameAnalyticsDesignEvent(
  String name,
  Map<String, Object> parameters,
) {
  const events = {
    'app_open',
    'game_mode_selected',
    'match_started',
    'match_completed',
    'match_quit',
    'rematch_requested',
    'forfeit_requested',
    'rules_viewed',
    'rules_continue',
    'async_match_viewed',
    'async_result_viewed',
    'tutorial_begin',
    'tutorial_step',
    'tutorial_complete',
    'tutorial_skipped',
    'adventure_rules_viewed',
  };
  if (!events.contains(name)) return null;
  const modes = {
    'practice',
    'classic_streak',
    'adventure',
    'daily_challenge',
    'local_multiplayer',
    'online_live',
    'online_async',
  };
  final mode = parameters['game_mode'];
  final parts = [name, if (modes.contains(mode)) mode as String];
  final outcome = parameters['outcome'];
  if (name == 'match_completed' && {'win', 'loss', 'draw'}.contains(outcome)) {
    parts.add(outcome as String);
  }
  final step = parameters['step'];
  if (name == 'tutorial_step' &&
      {'first_move', 'practice_started'}.contains(step)) {
    parts.add(step as String);
  }
  const fields = {
    'game_mode',
    'outcome',
    'reason',
    'difficulty',
    'level',
    'round',
    'series_length',
    'tutorial_id',
    'step',
    'rule',
  };
  final duration = parameters['duration_seconds'];
  return {
    'eventId': parts.join(':'),
    if (duration is num && duration.isFinite && duration >= 0)
      'value': duration,
    'customFields': jsonEncode({
      for (final entry in parameters.entries)
        if (fields.contains(entry.key)) entry.key: entry.value,
    }),
  };
}
