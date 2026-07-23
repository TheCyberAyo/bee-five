import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../adventure_game_logic.dart' as logic;
import '../adventure_game_rules.dart';
import '../theme/adventure_theme.dart';

const int _boardSize = 10;

double homeBoardMaxWidth(bool isMobile) => isMobile ? 400.0 : 470.0;

/// Non-interactive adventure board preview for the home screen (web parity).
class AdventureBoardPreview extends StatelessWidget {
  final int gameNumber;
  final bool isMobile;
  final double? size;

  const AdventureBoardPreview({
    super.key,
    required this.gameNumber,
    required this.isMobile,
    this.size,
  });

  @override
  Widget build(BuildContext context) {
    final theme = getThemeForGame(gameNumber);
    final rules = getGameRules(gameNumber, 1);
    final board = logic.createBoardWithBlocks(gameNumber, rules.hasBlindPlay, 1);
    final mudZones = rules.hasMudZones
        ? logic.generateMudZones(gameNumber)
        : <Map<String, int>>[];

    final boardMaxWidth = size ?? homeBoardMaxWidth(isMobile);

    return LayoutBuilder(
      builder: (context, constraints) {
        final available = math.min(constraints.maxWidth, constraints.maxHeight);
        final boardSizePx = math.min(available, boardMaxWidth);
        const outerBorder = 3.0;
        final innerSize = boardSizePx - outerBorder * 2;
        final cellSize = innerSize / _boardSize;

        return SizedBox(
          width: boardSizePx,
          height: boardSizePx,
          child: IgnorePointer(
            child: Container(
              decoration: BoxDecoration(
                color: theme.gridColor,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: theme.borderColor, width: outerBorder),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(7),
                child: Column(
                  mainAxisSize: MainAxisSize.max,
                  children: List.generate(_boardSize, (row) {
                    return Row(
                      mainAxisSize: MainAxisSize.max,
                      children: List.generate(_boardSize, (col) {
                        final cellValue = board[row][col];
                        final isBlocked = cellValue == logic.blockedCell;
                        final isMudZone = logic.isInMudZone(row, col, mudZones);

                        return Container(
                          width: cellSize,
                          height: cellSize,
                          decoration: BoxDecoration(
                            color: isBlocked
                                ? theme.accentColor
                                : isMudZone
                                    ? adventureMudColor
                                    : theme.gridColor,
                            border: Border.all(color: Colors.white),
                          ),
                          child: Center(
                            child: cellValue == 1
                                ? Container(
                                    width: cellSize * 0.8,
                                    height: cellSize * 0.8,
                                    decoration: BoxDecoration(
                                      color: theme.player1Color,
                                      shape: BoxShape.circle,
                                    ),
                                  )
                                : cellValue == 2
                                    ? Container(
                                        width: cellSize * 0.8,
                                        height: cellSize * 0.8,
                                        decoration: BoxDecoration(
                                          color: beeFivePrimaryYellow,
                                          shape: BoxShape.circle,
                                        ),
                                      )
                                    : isBlocked
                                        ? Text(
                                            '✕',
                                            style: TextStyle(
                                              fontSize: cellSize * 0.45,
                                              color: theme.player1Color,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          )
                                        : isMudZone
                                            ? Text('🟤', style: TextStyle(fontSize: cellSize * 0.35))
                                            : null,
                          ),
                        );
                      }),
                    );
                  }),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
