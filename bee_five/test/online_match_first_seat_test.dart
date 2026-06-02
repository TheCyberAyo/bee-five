import 'package:flutter_test/flutter_test.dart';
import 'package:bee_five/widgets/online_bee_five_board.dart';

void main() {
  group('onlineMatchFirstSeat', () {
    test('even prior counts → seat 1 (Black)', () {
      expect(onlineMatchFirstSeat(0), 1);
      expect(onlineMatchFirstSeat(2), 1);
      expect(onlineMatchFirstSeat(4), 1);
    });

    test('odd prior counts → seat 2 (Yellow)', () {
      expect(onlineMatchFirstSeat(1), 2);
      expect(onlineMatchFirstSeat(3), 2);
      expect(onlineMatchFirstSeat(5), 2);
    });
  });
}
