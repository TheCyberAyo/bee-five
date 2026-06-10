import 'package:bee_five/widgets/online_bee_five_board.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('canonicalMutualMatchId', () {
    test('lower user id keeps their match id', () {
      const a = 'aaaaaaaa-0000-0000-0000-000000000001';
      const b = 'bbbbbbbb-0000-0000-0000-000000000002';
      const matchA = 'match-from-a';
      const matchB = 'match-from-b';

      expect(
        canonicalMutualMatchId(
          myId: a,
          opponentId: b,
          myMatchId: matchA,
          theirMatchId: matchB,
        ),
        matchA,
      );
      expect(
        canonicalMutualMatchId(
          myId: b,
          opponentId: a,
          myMatchId: matchB,
          theirMatchId: matchA,
        ),
        matchA,
      );
    });

    test('both players derive the same id', () {
      const a = 'user-a';
      const b = 'user-z';
      const matchA = 'room-a';
      const matchB = 'room-b';

      final fromA = canonicalMutualMatchId(
        myId: a,
        opponentId: b,
        myMatchId: matchA,
        theirMatchId: matchB,
      );
      final fromB = canonicalMutualMatchId(
        myId: b,
        opponentId: a,
        myMatchId: matchB,
        theirMatchId: matchA,
      );

      expect(fromA, fromB);
      expect(fromA, matchA);
    });
  });
}
