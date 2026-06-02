// Shared look for school lobby, match, and related multiplayer UI.
// Matches home / dialogs: primaryYellow + black accents.

import 'package:flutter/material.dart';
import '../simple_game.dart' show primaryYellow;

abstract final class BeeFiveMultiplayerTheme {
  static const Color scaffoldBackground = primaryYellow;

  /// School lobby header (username + institution).
  static const Color lobbyHeaderBackground = Color(0xFF43A047);

  /// Highlight for the signed-in player's row on ranking tables.
  static const Color lobbySelfRowBackground = Color(0xFFFF9800);

  /// Selected tab label and underline on the lobby tab bar.
  static const Color lobbyTabSelected = Color(0xFFE53935);

  static ShapeBorder dialogShape = RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(20),
    side: const BorderSide(color: Colors.black, width: 4),
  );

  static AlertDialog yellowDialog({
    required Widget title,
    required Widget content,
    List<Widget>? actions,
  }) {
    return AlertDialog(
      backgroundColor: primaryYellow,
      shape: dialogShape,
      title: title,
      content: content,
      actions: actions,
    );
  }

  static ButtonStyle primaryBlackButton = ElevatedButton.styleFrom(
    backgroundColor: Colors.black,
    foregroundColor: primaryYellow,
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(10),
      side: const BorderSide(color: Colors.black, width: 2),
    ),
  );

  static ButtonStyle primaryYellowButton = ElevatedButton.styleFrom(
    backgroundColor: primaryYellow,
    foregroundColor: Colors.black,
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(10),
      side: const BorderSide(color: Colors.black, width: 2),
    ),
  );
}
