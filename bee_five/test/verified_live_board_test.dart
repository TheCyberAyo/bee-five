import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bee_five/widgets/online_bee_five_board.dart';

void main() {
  Widget board(GlobalKey<OnlineBeeFiveBoardState> key,
      Future<void> Function(Map<String, dynamic>) send) => MaterialApp(
    home: Scaffold(body: OnlineBeeFiveBoard(key: key,
      myUserId: 'a', opponentUserId: 'b', myUsername: 'Alice', opponentUsername: 'Bob',
      initialFirstSeat: 1, sendNetworkEvent: send, onWin: (_) {}, onDraw: () {})),
  );
  Finder cell(int index) => find.descendant(of: find.byType(OnlineBeeFiveBoard),
      matching: find.byType(GestureDetector)).at(index);

  testWidgets('waits for server acknowledgement and ignores a second tap', (tester) async {
    final key = GlobalKey<OnlineBeeFiveBoardState>();
    final accepted = Completer<void>();
    var sent = 0;
    await tester.pumpWidget(board(key, (_) { sent++; return accepted.future; }));
    await tester.tap(cell(0)); await tester.pump();
    expect(key.currentState!.hasPlacedPieces, isFalse);
    await tester.tap(cell(1)); await tester.pump(); expect(sent, 1);
    accepted.complete(); await tester.pumpAndSettle();
    expect(key.currentState!.hasPlacedPieces, isTrue);
    expect(find.text("Bob's turn"), findsOneWidget);
  });
  testWidgets('rejected move leaves the cell and turn available for retry', (tester) async {
    final key = GlobalKey<OnlineBeeFiveBoardState>();
    await tester.pumpWidget(board(key, (_) async => throw StateError('offline')));
    await tester.tap(cell(0)); await tester.pump();
    expect(key.currentState!.hasPlacedPieces, isFalse);
    expect(find.text('Your turn · Alice'), findsOneWidget);
    expect(find.text('Move not confirmed. Please try again.'), findsOneWidget);
  });
  testWidgets('late response cannot undo a newer polled opponent move', (tester) async {
    final key = GlobalKey<OnlineBeeFiveBoardState>();
    final accepted = Completer<void>();
    await tester.pumpWidget(board(key, (_) => accepted.future));
    await tester.tap(cell(0)); await tester.pump();
    key.currentState!.applyRemoteMove({'type':'move','row':0,'col':0,'seat':1});
    key.currentState!.applyRemoteMove({'type':'move','row':9,'col':9,'seat':2});
    await tester.pump(); accepted.complete(); await tester.pumpAndSettle();
    expect(find.text('Your turn · Alice'), findsOneWidget);
  });
}
