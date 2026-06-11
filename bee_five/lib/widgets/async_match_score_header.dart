import 'package:flutter/material.dart';

import '../head_to_head_series.dart';
import '../services/async_game_service.dart' show AsyncGameService, AsyncMatchRow;
import '../widgets/online_bee_five_board.dart';

/// Compact scoreboard for multi-day matches — timer under VS, active player in green.
class AsyncMatchScoreHeader extends StatelessWidget {
  const AsyncMatchScoreHeader({
    super.key,
    required this.myId,
    required this.myUsername,
    required this.opponentId,
    required this.opponentUsername,
    required this.seriesScore,
    required this.match,
  });

  final String myId;
  final String myUsername;
  final String opponentId;
  final String opponentUsername;
  final HeadToHeadSeriesScore? seriesScore;
  final AsyncMatchRow? match;

  String get _p1Id => onlineMatchPlayer1Id(myId, opponentId);
  String get _p2Id => onlineMatchPlayer2Id(myId, opponentId);

  String get _p1Name => _p1Id == myId ? myUsername : opponentUsername;
  String get _p2Name => _p2Id == myId ? myUsername : opponentUsername;

  String? get _activePlayerId {
    final m = match;
    if (m == null || !m.isActive) return null;
    return m.currentSeat == 1 ? _p1Id : _p2Id;
  }

  String _timerLabel() {
    final m = match;
    if (m == null || !m.isActive) return '';
    final left = m.timeLeft;
    if (left == null) return '24h per turn';
    if (m.isTurnExpired) return 'Time expired';
    final formatted = AsyncGameService.formatTurnTimeLeft(left);
    return formatted.isNotEmpty ? formatted : '24h per turn';
  }

  @override
  Widget build(BuildContext context) {
    final activeId = _activePlayerId;
    final timer = _timerLabel();

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(12, 6, 12, 4),
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.black, width: 2),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: _playerColumn(
              name: _p1Name,
              playerId: _p1Id,
              isActive: activeId == _p1Id,
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Column(
              children: [
                const Text(
                  'VS',
                  style: TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 15,
                    color: Colors.black45,
                  ),
                ),
                if (timer.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    timer,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: match?.isTurnExpired == true
                          ? const Color(0xFFC62828)
                          : Colors.black54,
                    ),
                  ),
                ],
              ],
            ),
          ),
          Expanded(
            child: _playerColumn(
              name: _p2Name,
              playerId: _p2Id,
              isActive: activeId == _p2Id,
            ),
          ),
        ],
      ),
    );
  }

  Widget _playerColumn({
    required String name,
    required String playerId,
    required bool isActive,
  }) {
    final wins = seriesScore?.winsFor(playerId);
    return Column(
      children: [
        Text(
          name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 14,
            color: isActive ? const Color(0xFF2E7D32) : Colors.black,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          wins == null ? '—' : '$wins',
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w900,
            color: Colors.black,
          ),
        ),
        const Text(
          'series wins',
          style: TextStyle(fontSize: 10, color: Colors.black54),
        ),
      ],
    );
  }
}
