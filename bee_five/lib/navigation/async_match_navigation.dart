import 'package:flutter/material.dart';

import '../screens/async_match_screen.dart';
import '../screens/async_match_status_screen.dart';
import '../services/async_game_service.dart';

/// Opens the play screen when it is the user's turn, otherwise the status/view screen.
Future<void> openAsyncMatch(
  BuildContext context, {
  required String matchId,
  required String myId,
  required String myUsername,
  required String opponentId,
  required String opponentUsername,
  AsyncMatchRow? match,
}) async {
  final row = match ?? await AsyncGameService.instance.syncMatch(matchId);
  if (!context.mounted) return;

  final myTurn = row != null &&
      row.isActive &&
      row.seatFor(myId) == row.currentSeat;

  final route = MaterialPageRoute(
    builder: (_) => myTurn
        ? AsyncMatchScreen(
            matchId: matchId,
            myId: myId,
            myUsername: myUsername,
            opponentId: opponentId,
            opponentUsername: opponentUsername,
          )
        : AsyncMatchStatusScreen(
            matchId: matchId,
            myId: myId,
            myUsername: myUsername,
            opponentId: opponentId,
            opponentUsername: opponentUsername,
          ),
  );

  await Navigator.of(context).push(route);
}

/// After saving a move, replace the play screen with the waiting/status screen.
void replaceWithAsyncMatchStatus(
  BuildContext context, {
  required String matchId,
  required String myId,
  required String myUsername,
  required String opponentId,
  required String opponentUsername,
}) {
  Navigator.of(context).pushReplacement(
    MaterialPageRoute(
      builder: (_) => AsyncMatchStatusScreen(
        matchId: matchId,
        myId: myId,
        myUsername: myUsername,
        opponentId: opponentId,
        opponentUsername: opponentUsername,
        justSaved: true,
      ),
    ),
  );
}
