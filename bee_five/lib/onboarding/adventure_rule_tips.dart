import 'package:flutter/material.dart';

import '../adventure_game_logic.dart' as logic;
import '../adventure_game_rules.dart';

class AdventureRuleTip {
  const AdventureRuleTip(this.id, this.title, this.body);
  final String id;
  final String title;
  final String body;
}

/// Descriptions follow the actual round-specific obstacle predicates, including
/// mechanics that are not represented by GameRules.description.
List<AdventureRuleTip> adventureRuleTips(int level, int round) {
  final rules = getGameRules(level, round);
  final tips = <AdventureRuleTip>[
    AdventureRuleTip(
      'timer_${rules.timeLimit}',
      'Watch the turn timer',
      'You have ${rules.timeLimit} seconds for each move. The clock resets after a move. Run out of time and you lose the round.',
    ),
    if (rules.startingPlayer == 2)
      const AdventureRuleTip(
        'ai_starts',
        'The AI goes first',
        'Wait for its opening move, then place your piece on an empty square.',
      ),
    if (rules.isMatchGame)
      AdventureRuleTip(
        'series_${rules.matchType}',
        rules.matchType == 'best-of-5' ? 'Best of five' : 'Best of three',
        rules.matchType == 'best-of-5'
            ? 'Aim for three round wins. Rules can change between rounds.'
            : 'Aim for two round wins. Rules can change between rounds.',
      ),
    if (!rules.hasBlindPlay &&
        logic.generateBlockedCells(level, round).isNotEmpty)
      const AdventureRuleTip(
        'blocked_cells',
        'Blocked squares',
        'Squares marked with a cross cannot hold a piece. Build your line around them.',
      ),
    if (rules.hasBlindPlay)
      const AdventureRuleTip(
        'blind_play',
        'Blind play',
        'The board becomes hidden when play starts. Remember your moves and tap the board to place a piece. Occupied squares cannot be played again.',
      ),
    if (rules.hasMudZones)
      const AdventureRuleTip(
        'mud_zones',
        'Mud zones',
        'Brown markers show mud squares. They cannot be played on while blind play is active.',
      ),
    if (rules.hasProgressiveBlocks)
      const AdventureRuleTip(
        'progressive_blocks',
        'New obstacles appear',
        'Extra blocked squares appear as you make moves. Keep an alternative route to five.',
      ),
    if (rules.hasDisappearingBlocks)
      const AdventureRuleTip(
        'disappearing_blocks',
        'Blocks disappear',
        'Every three moves you make, up to two blocked squares open up.',
      ),
    if (rules.hasShiftingBlocks)
      const AdventureRuleTip(
        'shifting_blocks',
        'Moving obstacles',
        'Blocked squares shift during play. Check the board before choosing your next move.',
      ),
    if (rules.hasDisappearingPieces)
      const AdventureRuleTip(
        'disappearing_pieces',
        'Older pieces disappear',
        'Every fourth move by a player removes up to two of their opponent’s oldest pieces. Long-term lines may change.',
      ),
    if (rules.hasPieceCapacity)
      const AdventureRuleTip(
        'piece_capacity',
        'Room for 35 pieces',
        'Once the board holds more than 35 pieces, the oldest pieces are removed to make room.',
      ),
    if (logic.isMultipleOf50Match3(level, round))
      const AdventureRuleTip(
        'rearrangement',
        'The board rearranges',
        'Every five moves in total, pieces are rearranged. Look again for a winning line after each change.',
      ),
    if (logic.isMultipleOf50Match4(level, round) ||
        logic.isMultipleOf10Match2From30(level, round))
      const AdventureRuleTip(
        'piece_swapping',
        'Pieces swap places',
        'Pairs of opposing pieces swap positions at intervals during this round. Recheck both players’ lines after a swap.',
      ),
    if (logic.isMultipleOf10Match1From60(level, round) ||
        (level % 10 == 1 &&
            level >= 31 &&
            !logic.gameEndsWith1InSpecifiedRanges(level)))
      const AdventureRuleTip(
        'swap_all',
        'Colours switch',
        'At intervals, all player pieces switch sides. Watch for the colour change before your next move.',
      ),
    if (logic.isMultipleOf10Match1From210(level, round))
      const AdventureRuleTip(
        'temporary_blind',
        'A brief blind turn',
        'Later in this round, the board briefly hides after certain moves. Keep track of the positions until it reappears.',
      ),
    if ((level % 50 == 0 && round == 1) ||
        logic.gameEndsWith1InSpecifiedRanges(level))
      const AdventureRuleTip(
        'strategic_blocks',
        'Your route can be blocked',
        'Every eight moves you make, a new obstacle can appear in a useful position. Leave yourself another route.',
      ),
    if (level >= 400 && level % 10 == 9)
      const AdventureRuleTip(
        'strategic_shift',
        'An obstacle moves',
        'After 27 moves in total, a blocked square can move into a strategic position.',
      ),
  ];
  return tips;
}

class AdventureRuleBriefing extends StatelessWidget {
  const AdventureRuleBriefing({
    super.key,
    required this.level,
    required this.round,
    required this.tips,
    required this.onContinue,
    required this.onExit,
  });
  final int level;
  final int round;
  final List<AdventureRuleTip> tips;
  final VoidCallback onContinue;
  final VoidCallback onExit;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF8DE),
      appBar: AppBar(
        backgroundColor: const Color(0xFFFFF8DE),
        leading: IconButton(
          onPressed: onExit,
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Back to menu',
        ),
        title: Text('Level $level · Round $round'),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Before you play',
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Still connect five to win. Here’s what to watch for in this round.',
                  ),
                  const SizedBox(height: 20),
                  for (final tip in tips)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tip.title,
                            style: const TextStyle(
                              fontSize: 19,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            tip.body,
                            style: const TextStyle(fontSize: 16, height: 1.5),
                          ),
                        ],
                      ),
                    ),
                  FilledButton(
                    onPressed: onContinue,
                    child: const Text('Got it — continue'),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'The timer starts when the round begins.',
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
