import 'package:flutter/material.dart';

import '../simple_game.dart' show boardSize, primaryYellow;
import '../widgets/online_bee_five_board.dart';

/// Async board: pick a cell, then confirm with Save Move (button lives on parent screen).
class AsyncBeeFiveBoard extends StatefulWidget {
  const AsyncBeeFiveBoard({
    super.key,
    required this.myUserId,
    required this.opponentUserId,
    required this.board,
    required this.currentSeat,
    required this.isSaving,
    required this.onSaveMove,
    this.readOnly = false,
    this.onPendingChanged,
  });

  final String myUserId;
  final String opponentUserId;
  final List<List<int>> board;
  final int currentSeat;
  final bool isSaving;
  final bool readOnly;
  final Future<void> Function(int row, int col) onSaveMove;
  final VoidCallback? onPendingChanged;

  @override
  State<AsyncBeeFiveBoard> createState() => AsyncBeeFiveBoardState();
}

class AsyncBeeFiveBoardState extends State<AsyncBeeFiveBoard> {
  int? _pendingRow;
  int? _pendingCol;

  String get _p1Id =>
      onlineMatchPlayer1Id(widget.myUserId, widget.opponentUserId);
  int get _mySeat => widget.myUserId == _p1Id ? 1 : 2;

  bool get _isMyTurn =>
      !widget.readOnly && !widget.isSaving && widget.currentSeat == _mySeat;

  bool get hasPendingMove => _pendingRow != null && _pendingCol != null;

  void clearPending() {
    setState(() {
      _pendingRow = null;
      _pendingCol = null;
    });
    widget.onPendingChanged?.call();
  }

  Future<void> confirmSave() async {
    if (_pendingRow == null || _pendingCol == null) return;
    await widget.onSaveMove(_pendingRow!, _pendingCol!);
  }

  void _onCellTap(int row, int col) {
    if (!_isMyTurn) return;
    if (widget.board[row][col] != 0) return;
    setState(() {
      _pendingRow = row;
      _pendingCol = col;
    });
    widget.onPendingChanged?.call();
  }

  @override
  Widget build(BuildContext context) {
    const borderWidth = 2.0;
    final totalBorders = (boardSize + 1) * borderWidth;
    return LayoutBuilder(
      builder: (context, constraints) {
        final maxSide = constraints.maxWidth.clamp(0.0, 500.0);
        final maxHeight = constraints.maxHeight;
        final side = maxSide < maxHeight ? maxSide : maxHeight;
        final cellSize = (side - totalBorders) / boardSize;
        return Center(
          child: Container(
            width: side,
            height: side,
            decoration: BoxDecoration(
              color: const Color(0xFF87CEEB),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.black, width: 3),
            ),
            padding: EdgeInsets.all(borderWidth),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(boardSize, (row) {
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(boardSize, (col) {
                    final cell = widget.board[row][col];
                    final isPending = _pendingRow == row && _pendingCol == col;
                    final previewSeat = _mySeat;
                    return GestureDetector(
                      onTap: () => _onCellTap(row, col),
                      child: Container(
                        width: cellSize,
                        height: cellSize,
                        decoration: BoxDecoration(
                          color: isPending
                              ? Colors.white.withValues(alpha: 0.35)
                              : const Color(0xFF87CEEB),
                          border: Border.all(
                            color: isPending ? Colors.black : Colors.white,
                            width: isPending ? 3 : borderWidth,
                          ),
                        ),
                        child: cell != 0 || isPending
                            ? Center(
                                child: Container(
                                  width: cellSize * 0.55,
                                  height: cellSize * 0.55,
                                  decoration: BoxDecoration(
                                    color:
                                        (cell != 0 ? cell : previewSeat) == 1
                                            ? Colors.black
                                            : primaryYellow,
                                    shape: BoxShape.circle,
                                    border: isPending
                                        ? Border.all(
                                            color: Colors.white,
                                            width: 2,
                                          )
                                        : null,
                                  ),
                                ),
                              )
                            : null,
                      ),
                    );
                  }),
                );
              }),
            ),
          ),
        );
      },
    );
  }
}
