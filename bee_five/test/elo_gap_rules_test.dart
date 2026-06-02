import 'package:flutter_test/flutter_test.dart';
import 'package:bee_five/elo_gap_rules.dart';

void main() {
  group('eloBandFromGap', () {
    test('0–30 → 0', () {
      expect(eloBandFromGap(0), 0);
      expect(eloBandFromGap(30), 0);
    });
    test('31–60 → 1', () {
      expect(eloBandFromGap(31), 1);
      expect(eloBandFromGap(60), 1);
    });
    test('61–90 → 2', () {
      expect(eloBandFromGap(61), 2);
      expect(eloBandFromGap(90), 2);
    });
  });

  group('eloWinChanges (symmetric two\'s)', () {
    test('even match gap 0–30: ±10', () {
      final r = eloWinChanges(winnerElo: 1200, loserElo: 1185);
      expect(r.winnerChange, 10);
      expect(r.loserChange, -10);
    });
    test('equal ELO: ±10', () {
      final r = eloWinChanges(winnerElo: 1200, loserElo: 1200);
      expect(r.winnerChange, 10);
      expect(r.loserChange, -10);
    });
    test('gap 31–60 underdog wins: ±12', () {
      final r = eloWinChanges(winnerElo: 1150, loserElo: 1190);
      expect(r.winnerChange, 12);
      expect(r.loserChange, -12);
    });
    test('gap 31–60 favorite wins: ±8', () {
      final r = eloWinChanges(winnerElo: 1190, loserElo: 1150);
      expect(r.winnerChange, 8);
      expect(r.loserChange, -8);
    });
    test('gap 61–90 underdog wins: ±14', () {
      final r = eloWinChanges(winnerElo: 1100, loserElo: 1165);
      expect(r.winnerChange, 14);
      expect(r.loserChange, -14);
    });
    test('gap 61–90 favorite wins: ±6', () {
      final r = eloWinChanges(winnerElo: 1165, loserElo: 1100);
      expect(r.winnerChange, 6);
      expect(r.loserChange, -6);
    });
  });

  group('eloDrawChanges', () {
    test('gap 0–30: no change', () {
      final r = eloDrawChanges(player1Elo: 1200, player2Elo: 1190);
      expect(r.player1Change, 0);
      expect(r.player2Change, 0);
    });
    test('gap 31–60: lower +2, higher −2', () {
      final r = eloDrawChanges(player1Elo: 1150, player2Elo: 1190);
      expect(r.player1Change, 2);
      expect(r.player2Change, -2);
    });
    test('gap 61–90: lower +4, higher −4', () {
      final r = eloDrawChanges(player1Elo: 1100, player2Elo: 1165);
      expect(r.player1Change, 4);
      expect(r.player2Change, -4);
    });
    test('equal ELO draw: 0', () {
      final r = eloDrawChanges(player1Elo: 1200, player2Elo: 1200);
      expect(r.player1Change, 0);
      expect(r.player2Change, 0);
    });
  });
}
