import 'package:bee_five/head_to_head_series.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const a = 'aaa-0000-0000-0000-000000000001';
  const b = 'bbb-0000-0000-0000-000000000002';

  List<Map<String, dynamic>> wins(String winnerId, int count) => List.generate(
        count,
        (_) => {'winner_id': winnerId},
      );

  test('empty history is 0-0', () {
    final s = computeHeadToHeadSeriesScore(
      userA: a,
      userB: b,
      matchesOldestFirst: [],
    );
    expect(s.player1Wins, 0);
    expect(s.player2Wins, 0);
    expect(s.winsFor(a), 0);
    expect(s.winsFor(b), 0);
  });

  test('draws are ignored', () {
    final s = computeHeadToHeadSeriesScore(
      userA: a,
      userB: b,
      matchesOldestFirst: [
        {'winner_id': a},
        {'winner_id': null},
        {'winner_id': b},
      ],
    );
    expect(s.player1Wins, 1);
    expect(s.player2Wins, 1);
  });

  test('resets when either player reaches 100 in the series', () {
    final history = [
      ...wins(a, 99),
      ...wins(b, 50),
      {'winner_id': a},
    ];
    final s = computeHeadToHeadSeriesScore(
      userA: a,
      userB: b,
      matchesOldestFirst: history,
    );
    expect(s.player1Wins, 0);
    expect(s.player2Wins, 0);
  });

  test('new series accumulates after a reset', () {
    final history = [
      ...wins(a, 100),
      {'winner_id': b},
      {'winner_id': b},
    ];
    final s = computeHeadToHeadSeriesScore(
      userA: a,
      userB: b,
      matchesOldestFirst: history,
    );
    expect(s.player1Wins, 0);
    expect(s.player2Wins, 2);
  });
}
