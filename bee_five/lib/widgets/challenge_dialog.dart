// ============================================================
// FILE: lib/widgets/challenge_dialog.dart
// PURPOSE: Popup shown when someone challenges you
// ============================================================

import 'package:flutter/material.dart';
import '../theme/bee_five_multiplayer_theme.dart';

class ChallengeDialog extends StatelessWidget {
  final String fromUsername;
  final int fromElo;
  final VoidCallback onAccept;
  final VoidCallback onDecline;

  /// When set, Accept is disabled and this message is shown (e.g. 0 XP).
  final String? acceptBlockedReason;

  /// Rematch offer after a live game (vs school-lobby challenge).
  final bool isRematch;

  const ChallengeDialog({
    super.key,
    required this.fromUsername,
    required this.fromElo,
    required this.onAccept,
    required this.onDecline,
    this.acceptBlockedReason,
    this.isRematch = false,
  });

  @override
  Widget build(BuildContext context) {
    return BeeFiveMultiplayerTheme.yellowDialog(
      title: Text(
        isRematch ? 'Rematch' : 'School lobby challenge',
        style: const TextStyle(
          fontWeight: FontWeight.bold,
          color: Colors.black,
        ),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            isRematch
                ? '$fromUsername wants a rematch.'
                : '$fromUsername wants to play (from your school lobby).',
            style: const TextStyle(fontSize: 16, color: Colors.black87),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            '$fromElo ELO',
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.black,
            ),
          ),
          if (acceptBlockedReason != null) ...[
            const SizedBox(height: 12),
            Text(
              acceptBlockedReason!,
              style: const TextStyle(fontSize: 13, color: Colors.black54),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: onDecline,
          child: const Text(
            'Decline',
            style: TextStyle(color: Colors.black87, fontWeight: FontWeight.w600),
          ),
        ),
        ElevatedButton(
          onPressed: acceptBlockedReason == null ? onAccept : null,
          style: BeeFiveMultiplayerTheme.primaryBlackButton,
          child: const Text('Accept'),
        ),
      ],
    );
  }
}
