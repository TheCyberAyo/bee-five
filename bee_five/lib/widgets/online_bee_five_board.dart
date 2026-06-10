// ============================================================
// Online Bee Five (10×10, five in a row) for MatchScreen.
// Seat 1 = Black (first), seat 2 = Yellow. Same board on both devices.
// ============================================================

import 'package:flutter/material.dart';
import '../adventure_game_logic.dart' as logic;
import '../simple_game.dart' show boardSize, primaryYellow;

/// Realtime JSON often decodes numbers as [double]; board logic needs [int].
int? _payloadInt(dynamic v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v);
  return null;
}

/// Lexicographically lower [userId] is seat 1 (Black, moves first).
String onlineMatchPlayer1Id(String a, String b) =>
    a.compareTo(b) < 0 ? a : b;

String onlineMatchPlayer2Id(String a, String b) =>
    a.compareTo(b) < 0 ? b : a;

/// Seat (1 = Black, 2 = Yellow) that opens, alternating across prior H2H games.
int onlineMatchFirstSeat(int completedMatchCount) =>
    completedMatchCount.isEven ? 1 : 2;

/// When both players challenge each other, pick one shared match id (lower user id
/// keeps the match id from their outgoing challenge).
String canonicalMutualMatchId({
  required String myId,
  required String opponentId,
  required String myMatchId,
  required String theirMatchId,
}) =>
    myId.compareTo(opponentId) < 0 ? myMatchId : theirMatchId;

class OnlineBeeFiveBoard extends StatefulWidget {
  const OnlineBeeFiveBoard({
    super.key,
    required this.myUserId,
    required this.opponentUserId,
    required this.myUsername,
    required this.opponentUsername,
    required this.initialFirstSeat,
    required this.sendNetworkEvent,
    required this.onWin,
    required this.onDraw,
  }) : assert(initialFirstSeat == 1 || initialFirstSeat == 2);

  final String myUserId;
  final String opponentUserId;
  final String myUsername;
  final String opponentUsername;

  /// 1 or 2 — who places the opening stone (alternates by H2H history).
  final int initialFirstSeat;

  /// Broadcast one game event (move, etc.).
  final Future<void> Function(Map<String, dynamic> event) sendNetworkEvent;

  /// Called when this device applies the move that yields five in a row for a seat.
  final void Function(String winnerUserId) onWin;

  /// Called when this device detects a full-board draw after a move (local or remote).
  final void Function() onDraw;

  @override
  State<OnlineBeeFiveBoard> createState() => OnlineBeeFiveBoardState();
}

class OnlineBeeFiveBoardState extends State<OnlineBeeFiveBoard> {
  late List<List<int>> _board;
  late int _currentSeat;
  int _winnerSeat = 0;
  List<List<int>> _winningPieces = [];
  bool _gameOver = false;

  String get _p1Id =>
      onlineMatchPlayer1Id(widget.myUserId, widget.opponentUserId);
  String get _p2Id =>
      onlineMatchPlayer2Id(widget.myUserId, widget.opponentUserId);

  String get _p1Name =>
      _p1Id == widget.myUserId ? widget.myUsername : widget.opponentUsername;
  String get _p2Name =>
      _p2Id == widget.myUserId ? widget.myUsername : widget.opponentUsername;

  int get _mySeat => widget.myUserId == _p1Id ? 1 : 2;

  /// True if any stone has been placed (local or remote).
  bool get hasPlacedPieces {
    for (final row in _board) {
      for (final cell in row) {
        if (cell != 0) return true;
      }
    }
    return false;
  }

  @override
  void initState() {
    super.initState();
    _board = List.generate(boardSize, (_) => List.filled(boardSize, 0));
    _currentSeat = widget.initialFirstSeat;
  }

  String _seatName(int seat) => seat == 1 ? _p1Name : _p2Name;

  /// Uses each player's username for who must move.
  String _turnDisplayText() {
    if (_gameOver) {
      if (_winnerSeat > 0) {
        return '${_seatName(_winnerSeat)} wins';
      }
      return 'Draw';
    }
    final moverName = _seatName(_currentSeat);
    if (_currentSeat == _mySeat) {
      return 'Your turn · $moverName';
    }
    return "$moverName's turn";
  }

  /// Apply opponent move from realtime payload `{ type, row, col, seat }`.
  void applyRemoteMove(Map<String, dynamic> payload) {
    if (_gameOver) return;
    if (payload['type'] != 'move') return;
    final row = _payloadInt(payload['row']);
    final col = _payloadInt(payload['col']);
    final seat = _payloadInt(payload['seat']);
    if (row == null || col == null || seat == null) return;
    if (row < 0 ||
        row >= boardSize ||
        col < 0 ||
        col >= boardSize ||
        seat < 1 ||
        seat > 2) {
      return;
    }
    if (_board[row][col] != 0) return;

    setState(() {
      _board[row][col] = seat;
      _currentSeat = seat == 1 ? 2 : 1;
    });

    if (logic.checkWinCondition(_board, row, col, seat)) {
      _setWin(seat, row, col, notifyParent: false);
      return;
    }
    if (_isBoardFull()) {
      setState(() => _gameOver = true);
      widget.onDraw();
    }
  }

  bool _isBoardFull() {
    for (int r = 0; r < boardSize; r++) {
      for (int c = 0; c < boardSize; c++) {
        if (_board[r][c] == 0) return false;
      }
    }
    return true;
  }

  void _setWin(int seat, int row, int col, {required bool notifyParent}) {
    setState(() {
      _winnerSeat = seat;
      _winningPieces = logic.getWinningPieces(_board, row, col, seat);
      _gameOver = true;
    });
    if (notifyParent) {
      final winnerUserId = seat == 1 ? _p1Id : _p2Id;
      widget.onWin(winnerUserId);
    }
  }

  Future<void> _onCellTap(int row, int col) async {
    if (_gameOver) return;
    if (_board[row][col] != 0) return;
    if (_currentSeat != _mySeat) return;

    setState(() {
      _board[row][col] = _mySeat;
      _currentSeat = _mySeat == 1 ? 2 : 1;
    });

    await widget.sendNetworkEvent({
      'type': 'move',
      'row': row,
      'col': col,
      'seat': _mySeat,
    });

    if (logic.checkWinCondition(_board, row, col, _mySeat)) {
      _setWin(_mySeat, row, col, notifyParent: true);
      return;
    }
    if (_isBoardFull()) {
      setState(() => _gameOver = true);
      widget.onDraw();
    }
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
            _turnDisplayText(),
            style: const TextStyle(
              fontSize: 16,
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
                          final isWinning = _winningPieces.any(
                            (p) => p[0] == row && p[1] == col,
                          );
                          return GestureDetector(
                            onTap: () => _onCellTap(row, col),
                            child: Container(
                              width: cellSize,
                              height: cellSize,
                              decoration: BoxDecoration(
                                color: isWinning && _winnerSeat > 0
                                    ? (_winnerSeat == 1
                                        ? primaryYellow
                                        : Colors.black)
                                    : const Color(0xFF87CEEB),
                                border: Border.all(
                                  color: Colors.white,
                                  width: borderWidth,
                                ),
                              ),
                              child: _board[row][col] != 0
                                  ? Center(
                                      child: Container(
                                        width: cellSize / 1.5,
                                        height: cellSize / 1.5,
                                        decoration: BoxDecoration(
                                          color: _board[row][col] == 1
                                              ? Colors.black
                                              : primaryYellow,
                                          shape: BoxShape.circle,
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
      ],
    );
  }
}
