import 'package:bee_five/services/game_analytics.dart';
import 'package:bee_five/services/gameanalytics_provider.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'provider failure does not block delivery to the other provider',
    () async {
      final delivered = <String>[];
      final analytics = GameAnalytics(
        sinks: [
          (_, _) async => throw StateError('blocked'),
          (name, _) async {
            delivered.add(name);
          },
        ],
      );
      analytics.event('tutorial_begin');
      await Future<void>.delayed(Duration.zero);
      expect(delivered, ['tutorial_begin']);
    },
  );

  test('GameAnalytics hierarchy excludes IDs and separates match outcomes', () {
    final event = gameAnalyticsDesignEvent('match_completed', {
      'game_mode': 'practice',
      'outcome': 'win',
      'duration_seconds': 42,
      'attempt_id': 'private-attempt',
      'email': 'player@example.com',
    })!;
    expect(event['eventId'], 'match_completed:practice:win');
    expect(event['value'], 42);
    expect(
      event['customFields'].toString(),
      isNot(contains('private-attempt')),
    );
    expect(event['customFields'].toString(), isNot(contains('player@example')));
    expect(gameAnalyticsDesignEvent('arbitrary-user-input', {}), isNull);
  });

  test('tutorial steps remain distinct without unbounded event IDs', () {
    expect(
      gameAnalyticsDesignEvent('tutorial_step', {
        'step': 'practice_started',
      })!['eventId'],
      'tutorial_step:practice_started',
    );
    expect(
      gameAnalyticsDesignEvent('tutorial_step', {
        'step': 'first_move',
      })!['eventId'],
      'tutorial_step:first_move',
    );
    expect(
      gameAnalyticsDesignEvent('match_started', {
        'game_mode': 'untrusted',
      })!['eventId'],
      'match_started',
    );
  });

  late List<(String, Map<String, Object>)> events;
  late MatchTelemetry telemetry;
  setUp(() {
    events = [];
    telemetry = MatchTelemetry(
      analytics: GameAnalytics(
        sink: (name, params) async {
          events.add((name, params));
        },
      ),
    );
  });

  test(
    'completion then disposal or duplicate result emits one terminal event',
    () {
      telemetry.start('practice');
      telemetry.complete('win');
      telemetry.complete('win');
      telemetry.quit();
      expect(events.map((e) => e.$1), ['match_started', 'match_completed']);
      expect(events.last.$2['attempt_id'], events.first.$2['attempt_id']);
      expect(events.last.$2['outcome'], 'win');
    },
  );

  test('restart closes unfinished attempt and creates a separate attempt', () {
    telemetry.start('practice');
    telemetry.start('practice');
    telemetry.quit();
    telemetry.quit();
    expect(events.map((e) => e.$1), [
      'match_started',
      'match_quit',
      'match_started',
      'match_quit',
    ]);
    expect(events[1].$2['reason'], 'restart');
    expect(events[0].$2['attempt_id'], isNot(events[2].$2['attempt_id']));
  });

  test('rematch request does not count as a new match before play starts', () {
    telemetry.start('online_live');
    telemetry.complete('draw');
    telemetry.rematchRequested();
    telemetry.quit();
    expect(events.map((e) => e.$1), [
      'match_started',
      'match_completed',
      'rematch_requested',
    ]);
  });

  test('leaving before a match starts emits no quit', () {
    telemetry.quit();
    expect(events, isEmpty);
  });

  test('analytics failure cannot escape into gameplay', () async {
    final failing = MatchTelemetry(
      analytics: GameAnalytics(
        sink: (_, _) async {
          throw StateError('offline');
        },
      ),
    );
    failing.start('practice');
    failing.complete('loss');
    await Future<void>.delayed(Duration.zero);
  });
}
