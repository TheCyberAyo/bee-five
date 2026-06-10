import 'package:flutter/material.dart';

import '../adventure_game_logic.dart' as logic;
import '../simple_game.dart' show boardSize, primaryYellow;
import '../widgets/online_bee_five_board.dart';

/// Async board: pick a cell, then tap Save Move to commit server-side.
class AsyncBeeFiveBoard extends StatefulWidget {
  const AsyncBeeFiveBoard({
    super.key,
    required this.myUserId,
    required this.opponentUserId,
    required this.myUsername,
    required this.opponentUsername,
    required this.board,
    required this.currentSeat,
    required this.isSaving,
    required this.onSaveMove,
    this.readOnly = false,
  });

  final String myUserId;
  final String opponentUserId;
  final String myUsername;
  final String opponentUsername;
  final List<List<int>> board;
  final int currentSeat;
  final bool isSaving;
  final bool readOnly;
  final Future<void> Function(int row, int col) onSaveMove;

  @override
  State<AsyncBeeFiveBoard> createState() => AsyncBeeFiveBoardState();
}

class AsyncBeeFiveBoardState extends State<AsyncBeeFiveBoard> {
  int? _pendingRow;
  int? _pendingCol;

  String get _p1Id =>
      onlineMatchPlayer1Id(widget.myUserId, widget.opponentUserId);
  String get _p2Id =>
      onlineMatchPlayer2Id(widget.myUserId, widget.opponentUserId);
  int get _mySeat => widget.myUserId == _p1Id ? 1 : 2;

  bool get _isMyTurn =>
      !widget.readOnly && !widget.isSaving && widget.currentSeat == _mySeat;

  String _seatName(int seat) =>
      seat == 1
          ? (_p1Id == widget.myUserId
              ? widget.myUsername
              : widget.opponentUsername)
          : (_p2Id == widget.myUserId
              ? widget.myUsername
              : widget.opponentUsername);

  String _turnText() {
    if (widget.readOnly) {
      if (widget.currentSeat == _mySeat) {
        return 'Your turn — switch to play mode to move';
      }
      return "Viewing board · ${_seatName(widget.currentSeat)}'s turn";
    }
    if (!_isMyTurn) {
      return "${_seatName(widget.currentSeat)}'s turn · multi-day match";
    }
    if (_pendingRow != null) {
      return 'Tap Save Move to confirm your stone';
    }
    return 'Your turn · tap a cell, then Save Move';
  }

  void clearPending() {
    setState(() {
      _pendingRow = null;
      _pendingCol = null;
    });
  }

  void _onCellTap(int row, int col) {
    if (!_isMyTurn) return;
    if (widget.board[row][col] != 0) return;
    setState(() {
      _pendingRow = row;
      _pendingCol = col;
    });
  }

  Future<void> _confirmSave() async {
    if (_pendingRow == null || _pendingCol == null) return;
    await widget.onSaveMove(_pendingRow!, _pendingCol!);
  }

  @override
  Widget build(BuildContext context) {
    const borderWidth = 2.0;
    final totalBorders = (boardSize + 1) * borderWidth;
    return Column(
      children: [
        Container(
          width: double.infinity,
          margin: const EdgeInsets.fromLTRB(12, 8, 12, 6),
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.black, width: 2),
          ),
          child: Text(
            _turnText(),
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: Colors.black,
            ),
            textAlign: TextAlign.center,
          ),
        ),
        Expanded(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final side = constraints.maxWidth.clamp(0.0, 500.0);
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
                          final isPending =
                              _pendingRow == row && _pendingCol == col;
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
                                  color: isPending
                                      ? Colors.black
                                      : Colors.white,
                                  width: isPending ? 3 : borderWidth,
                                ),
                              ),
                              child: cell != 0 || isPending
                                  ? Center(
                                      child: Container(
                                        width: cellSize * 0.55,
                                        height: cellSize * 0.55,
                                        decoration: BoxDecoration(
                                          color: (cell != 0 ? cell : previewSeat) ==
                                                  1
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
          ),
        ),
        if (!widget.readOnly)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: (!_isMyTurn ||
                        _pendingRow == null ||
                        widget.isSaving)
                    ? null
                    : _confirmSave,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.black,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: Colors.black26,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: widget.isSaving
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Save Move',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Quick win check for UI feedback after save (server is authoritative).
bool asyncBoardHasWin(List<List<int>> board, int row, int col, int seat) =>
    logic.checkWinCondition(board, row, col, seat);
