import 'package:flutter/material.dart';
import 'dart:math' as math;
import 'dart:async';
import 'adventure_game_logic.dart' as logic;
import 'background_sound.dart';
import 'xp_service.dart';

const Color primaryYellow = Color(0xFFFFC30B);
const int boardSize = 10;
const int blockedCell = 3;

/// Challenge type: same for everyone each day (index from date).
class DailyChallengeConfig {
  final String name;
  final String description;
  final int totalSeconds;
  final int moveSeconds; // 0 = no per-move limit
  final int numObstacles;

  const DailyChallengeConfig({
    required this.name,
    required this.description,
    required this.totalSeconds,
    this.moveSeconds = 0,
    this.numObstacles = 0,
  });
}

const List<DailyChallengeConfig> dailyChallengeConfigs = [
  DailyChallengeConfig(
    name: 'Beat the Clock',
    description: 'Win before time runs out!',
    totalSeconds: 90,
    numObstacles: 0,
  ),
  DailyChallengeConfig(
    name: 'Obstacle Course',
    description: 'Navigate blocked cells. 2 min.',
    totalSeconds: 120,
    numObstacles: 6,
  ),
  DailyChallengeConfig(
    name: 'Blitz',
    description: '25 seconds per move.',
    totalSeconds: 180,
    moveSeconds: 25,
    numObstacles: 0,
  ),
  DailyChallengeConfig(
    name: 'Speed Round',
    description: 'Win in 60 seconds!',
    totalSeconds: 60,
    numObstacles: 0,
  ),
  DailyChallengeConfig(
    name: 'Obstacle Blitz',
    description: '8 obstacles, 100 seconds.',
    totalSeconds: 100,
    numObstacles: 8,
  ),
  DailyChallengeConfig(
    name: 'Hive Maze',
    description: '10 obstacles, 2.5 min.',
    totalSeconds: 150,
    numObstacles: 10,
  ),
];

/// Generate blocked cell positions with a deterministic seed (same each day).
List<Map<String, int>> generateBlockedForSeed(int seed, int count) {
  if (count <= 0) return [];
  final positions = <Map<String, int>>[];
  final used = <String>{};
  int s = seed;
  double next() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  }
  while (positions.length < count) {
    final row = (next() * 10).floor().clamp(0, 9);
    final col = (next() * 10).floor().clamp(0, 9);
    final key = '$row,$col';
    if (!used.contains(key)) {
      used.add(key);
      positions.add({'row': row, 'col': col});
    }
  }
  return positions;
}

class DailyChallengeGame extends StatefulWidget {
  final VoidCallback onBackToMenu;

  const DailyChallengeGame({super.key, required this.onBackToMenu});

  @override
  State<DailyChallengeGame> createState() => _DailyChallengeGameState();
}

class _DailyChallengeGameState extends State<DailyChallengeGame> {
  late DailyChallengeConfig config;
  late List<List<int>> board;
  int currentPlayer = 1;
  int winner = 0;
  int timeLeft = 0;
  int moveTimeLeft = 0;
  Timer? timer;
  Timer? moveTimer;
  bool isAITurn = false;
  bool showWinModal = false;
  String winMessage = '';
  int _headerXp = 0;
  int _xpEarned = 0;
  bool _resultRecorded = false;
  bool _showRulesOverlay = true;

  @override
  void initState() {
    super.initState();
    final index = getTodaysChallengeGameIndex().clamp(0, dailyChallengeConfigs.length - 1);
    config = dailyChallengeConfigs[index];
    timeLeft = config.totalSeconds;
    moveTimeLeft = config.moveSeconds > 0 ? config.moveSeconds : 0;
    _initBoard();
    BackgroundSound.instance.startIfEnabled();
    getXp().then((xp) {
      if (mounted) {
        setState(() => _headerXp = xp);
      }
    });
    // Timers start only after user taps Continue on rules
  }

  void _onRulesContinue() {
    setState(() => _showRulesOverlay = false);
    if (config.totalSeconds > 0) {
      _startMainTimer();
    }
    if (config.moveSeconds > 0 && currentPlayer == 1) {
      _startMoveTimer();
    }
  }

  void _initBoard() {
    board = List.generate(boardSize, (_) => List.filled(boardSize, 0));
    final now = DateTime.now();
    final seed = now.year * 10000 + now.month * 100 + now.day;
    for (final cell in generateBlockedForSeed(seed, config.numObstacles)) {
      board[cell['row']!][cell['col']!] = blockedCell;
    }
  }

  @override
  void dispose() {
    timer?.cancel();
    moveTimer?.cancel();
    super.dispose();
  }

  void _startMainTimer() {
    timer?.cancel();
    timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || winner != 0) return;
      setState(() {
        if (timeLeft > 0) {
          timeLeft--;
        } else {
          _onTimeUp();
        }
      });
    });
  }

  void _startMoveTimer() {
    moveTimer?.cancel();
    if (config.moveSeconds <= 0) return;
    moveTimeLeft = config.moveSeconds;
    moveTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || winner != 0 || currentPlayer != 1) return;
      setState(() {
        if (moveTimeLeft > 0) {
          moveTimeLeft--;
        } else {
          _onMoveTimeUp();
        }
      });
    });
  }

  void _onMoveTimeUp() {
    moveTimer?.cancel();
    setState(() {
      winner = 2;
      winMessage = 'Move time\'s up! AI wins!';
      showWinModal = true;
    });
    _recordResult(false);
  }

  void _onTimeUp() {
    timer?.cancel();
    moveTimer?.cancel();
    setState(() {
      winner = 2;
      winMessage = 'Time\'s up! AI wins!';
      showWinModal = true;
    });
    _recordResult(false);
  }

  void _recordResult(bool won) {
    if (_resultRecorded) return;
    _resultRecorded = true;
    setDailyChallengeResult(won).then((newXp) {
      if (won) _xpEarned = xpDailyChallengeWin;
      if (mounted) setState(() => _headerXp = newXp);
    });
  }

  bool _checkWinner(int row, int col, int player) {
    return logic.checkWinCondition(board, row, col, player);
  }

  void _handleCellClick(int row, int col) {
    if (board[row][col] != 0 || winner != 0 || currentPlayer != 1 || isAITurn) return;
    moveTimer?.cancel();
    setState(() {
      board[row][col] = 1;
      if (config.moveSeconds > 0) moveTimeLeft = config.moveSeconds;
    });

    if (_checkWinner(row, col, 1)) {
      timer?.cancel();
      moveTimer?.cancel();
      setState(() {
        winner = 1;
        winMessage = 'You win!';
        showWinModal = true;
      });
      _recordResult(true);
      return;
    }

    bool isDraw = true;
    for (int r = 0; r < boardSize; r++) {
      for (int c = 0; c < boardSize; c++) {
        if (board[r][c] == 0) {
          isDraw = false;
          break;
        }
      }
      if (!isDraw) break;
    }
    if (isDraw) {
      setState(() {
        winner = 0;
        winMessage = 'Draw!';
        showWinModal = true;
      });
      _recordResult(false);
      timer?.cancel();
      return;
    }

    setState(() {
      currentPlayer = 2;
      isAITurn = true;
    });
    _makeAIMove();
  }

  List<Map<String, int>> _getAvailableCells() {
    final list = <Map<String, int>>[];
    for (int r = 0; r < boardSize; r++) {
      for (int c = 0; c < boardSize; c++) {
        if (board[r][c] == 0) list.add({'row': r, 'col': c});
      }
    }
    return list;
  }

  void _makeAIMove() {
    final available = _getAvailableCells();
    if (available.isEmpty) {
      setState(() {
        winner = 0;
        winMessage = 'Draw!';
        showWinModal = true;
        isAITurn = false;
      });
      _recordResult(false);
      timer?.cancel();
      return;
    }

    Future.delayed(const Duration(milliseconds: 400), () {
      if (!mounted || winner != 0) return;
      final move = _getHardAIMove(available, board);
      final r = move['row']!;
      final c = move['col']!;
      setState(() {
        board[r][c] = 2;
        isAITurn = false;
        currentPlayer = 1;
        if (config.moveSeconds > 0) _startMoveTimer();
      });

      if (_checkWinner(r, c, 2)) {
        timer?.cancel();
        moveTimer?.cancel();
        setState(() {
          winner = 2;
          winMessage = 'AI wins!';
          showWinModal = true;
        });
        _recordResult(false);
        return;
      }

      bool isDraw = true;
      for (int row = 0; row < boardSize; row++) {
        for (int col = 0; col < boardSize; col++) {
          if (board[row][col] == 0) {
            isDraw = false;
            break;
          }
        }
        if (!isDraw) break;
      }
      if (isDraw) {
        setState(() {
          winner = 0;
          winMessage = 'Draw!';
          showWinModal = true;
        });
        _recordResult(false);
        timer?.cancel();
      }
    });
  }

  Map<String, int> _getHardAIMove(List<Map<String, int>> available, List<List<int>> b) {
    for (final cell in available) {
      final test = _copyBoard(b);
      test[cell['row']!][cell['col']!] = 2;
      if (logic.checkWinCondition(test, cell['row']!, cell['col']!, 2)) return cell;
    }
    for (final cell in available) {
      final test = _copyBoard(b);
      test[cell['row']!][cell['col']!] = 1;
      if (logic.checkWinCondition(test, cell['row']!, cell['col']!, 1)) return cell;
    }
    for (final cell in available) {
      final test = _copyBoard(b);
      test[cell['row']!][cell['col']!] = 1;
      if (_checkFourInARow(test, cell['row']!, cell['col']!, 1)) return cell;
    }
    for (final cell in available) {
      final test = _copyBoard(b);
      test[cell['row']!][cell['col']!] = 2;
      if (_checkFourInARow(test, cell['row']!, cell['col']!, 2)) return cell;
    }
    for (final cell in available) {
      final test = _copyBoard(b);
      test[cell['row']!][cell['col']!] = 1;
      if (_checkThreeInARow(test, cell['row']!, cell['col']!, 1)) return cell;
    }
    for (final cell in available) {
      final test = _copyBoard(b);
      test[cell['row']!][cell['col']!] = 2;
      if (_checkThreeInARow(test, cell['row']!, cell['col']!, 2) && _canReachFive(test, cell['row']!, cell['col']!, 2)) return cell;
    }
    for (final cell in available) {
      if (_isNearHumanPiece(b, cell['row']!, cell['col']!)) return cell;
    }
    final centerCells = available.where((cell) {
      final d = math.sqrt(math.pow(cell['row']! - 4.5, 2) + math.pow(cell['col']! - 4.5, 2));
      return d <= 2;
    }).toList();
    if (centerCells.isNotEmpty) {
      return centerCells[math.Random().nextInt(centerCells.length)];
    }
    return available[math.Random().nextInt(available.length)];
  }

  List<List<int>> _copyBoard(List<List<int>> b) {
    return b.map((row) => List<int>.from(row)).toList();
  }

  bool _checkThreeInARow(List<List<int>> testBoard, int row, int col, int player) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (final d in directions) {
      int count = 1;
      final dr = d[0], dc = d[1];
      for (int i = 1; i < 4; i++) {
        final nr = row + i * dr, nc = col + i * dc;
        if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && testBoard[nr][nc] == player) {
          count++;
        } else {
          break;
        }
      }
      for (int i = 1; i < 4; i++) {
        final nr = row - i * dr, nc = col - i * dc;
        if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && testBoard[nr][nc] == player) {
          count++;
        } else {
          break;
        }
      }
      if (count >= 3) return true;
    }
    return false;
  }

  bool _checkFourInARow(List<List<int>> testBoard, int row, int col, int player) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (final d in directions) {
      int count = 1;
      final dr = d[0], dc = d[1];
      for (int i = 1; i < 5; i++) {
        final nr = row + i * dr, nc = col + i * dc;
        if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && testBoard[nr][nc] == player) {
          count++;
        } else {
          break;
        }
      }
      for (int i = 1; i < 5; i++) {
        final nr = row - i * dr, nc = col - i * dc;
        if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && testBoard[nr][nc] == player) {
          count++;
        } else {
          break;
        }
      }
      if (count >= 4) return true;
    }
    return false;
  }

  bool _canReachFive(List<List<int>> testBoard, int row, int col, int player) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (final d in directions) {
      int count = 1, empty = 0;
      final dr = d[0], dc = d[1];
      for (int dir = -1; dir <= 1; dir += 2) {
        for (int i = 1; i <= 4; i++) {
          final nr = row + dr * i * dir, nc = col + dc * i * dir;
          if (nr < 0 || nr >= boardSize || nc < 0 || nc >= boardSize) {
            break;
          }
          if (testBoard[nr][nc] == player) {
            count++;
          } else if (testBoard[nr][nc] == 0) {
            empty++;
          } else {
            break;
          }
        }
      }
      if (count + empty >= 5) return true;
    }
    return false;
  }

  bool _isNearHumanPiece(List<List<int>> b, int row, int col) {
    for (int dr = -2; dr <= 2; dr++) {
      for (int dc = -2; dc <= 2; dc++) {
        if (dr == 0 && dc == 0) continue;
        final nr = row + dr, nc = col + dc;
        if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && b[nr][nc] == 1) return true;
      }
    }
    return false;
  }

  List<String> _getRulesForToday() {
    final rules = <String>[];
    if (config.totalSeconds > 0) {
      final min = config.totalSeconds ~/ 60;
      final sec = config.totalSeconds % 60;
      rules.add('• Total time: ${min > 0 ? "$min min " : ""}${sec > 0 ? "$sec sec" : ""}'.trim());
    }
    if (config.moveSeconds > 0) {
      rules.add('• You have ${config.moveSeconds} seconds per move.');
    }
    if (config.numObstacles > 0) {
      rules.add('• The board has ${config.numObstacles} blocked cells — plan around them!');
    }
    rules.addAll([
      '• You play as Yellow; the AI plays as Black.',
      '• Get 5 in a row (horizontal, vertical, or diagonal) to win.',
      '• One game per day — win for +3 XP!',
    ]);
    return rules;
  }

  @override
  Widget build(BuildContext context) {
    const double borderWidth = 2.0;
    final totalBorders = (boardSize + 1) * borderWidth;

    return Stack(
      children: [
        Scaffold(
          backgroundColor: const Color(0xFF808080),
          body: SafeArea(
            child: Column(
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 15),
                  decoration: const BoxDecoration(
                    color: Colors.black,
                    border: Border(bottom: BorderSide(color: primaryYellow, width: 2)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back, color: primaryYellow, size: 28),
                        onPressed: () => widget.onBackToMenu(),
                      ),
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            config.name,
                            style: const TextStyle(color: primaryYellow, fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            'Daily Challenge',
                            style: TextStyle(color: Colors.white70, fontSize: 12),
                          ),
                        ],
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Image.asset(
                            'assets/homeImagery/xp_gem.png',
                            width: 24,
                            height: 24,
                            fit: BoxFit.contain,
                            errorBuilder: (_, _, _) => Icon(Icons.star, color: primaryYellow, size: 24),
                          ),
                          const SizedBox(width: 4),
                          Text('$_headerXp', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: primaryYellow)),
                        ],
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                  color: primaryYellow.withValues(alpha: 0.9),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'Time: ${timeLeft ~/ 60}:${(timeLeft % 60).toString().padLeft(2, '0')}',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: timeLeft <= 30 ? Colors.red : Colors.black,
                        ),
                      ),
                      if (config.moveSeconds > 0 && currentPlayer == 1 && winner == 0) ...[
                        const SizedBox(width: 20),
                        Text(
                          'Move: ${moveTimeLeft}s',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: moveTimeLeft <= 5 ? Colors.red : Colors.black,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    currentPlayer == 1 ? '▶ Your turn (Yellow)' : '🤖 AI\'s turn (Black)',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black),
                  ),
                ),
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final boardSide = constraints.maxWidth;
                      final cellSize = (boardSide - totalBorders) / boardSize;
                      return Center(
                        child: Container(
                          width: boardSide,
                          height: boardSide,
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
                                  final cell = board[row][col];
                                  return GestureDetector(
                                    onTap: () => _handleCellClick(row, col),
                                    child: Container(
                                      width: cellSize,
                                      height: cellSize,
                                      decoration: BoxDecoration(
                                        color: cell == blockedCell ? const Color(0xFF555555) : const Color(0xFF87CEEB),
                                        border: Border.all(color: Colors.white, width: borderWidth),
                                      ),
                                      child: cell == 1 || cell == 2
                                          ? Center(
                                              child: Container(
                                                width: cellSize / 1.5,
                                                height: cellSize / 1.5,
                                                decoration: BoxDecoration(
                                                  color: cell == 1 ? primaryYellow : Colors.black,
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
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: const BoxDecoration(
                    color: Colors.black,
                    border: Border(top: BorderSide(color: primaryYellow, width: 2)),
                  ),
                  child: ElevatedButton(
                    onPressed: () => widget.onBackToMenu(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryYellow,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                        side: const BorderSide(color: Colors.black, width: 2),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Image.asset(
                          'assets/homeImagery/home.png',
                          width: 20,
                          height: 20,
                          fit: BoxFit.contain,
                          errorBuilder: (_, _, _) => const Icon(Icons.home, color: Colors.black, size: 20),
                        ),
                        const SizedBox(width: 8),
                        const Text('Home', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 16)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (showWinModal)
          Container(
            color: Colors.black.withValues(alpha: 0.8),
            child: Center(
              child: Container(
                margin: const EdgeInsets.all(20),
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: primaryYellow,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.black, width: 4),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      winMessage,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.black,
                        decoration: TextDecoration.none,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    if (_xpEarned > 0) ...[
                      const SizedBox(height: 8),
                      Text(
                        '+$_xpEarned XP',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.green),
                      ),
                    ],
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => widget.onBackToMenu(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.black,
                        foregroundColor: primaryYellow,
                        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text('Back to Home', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            ),
          ),
        if (_showRulesOverlay) _buildRulesOverlay(),
      ],
    );
  }

  Widget _buildRulesOverlay() {
    final rules = _getRulesForToday();
    return Material(
      color: Colors.black.withValues(alpha: 0.85),
      child: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 400),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: primaryYellow,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.black, width: 4),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.emoji_events, color: Colors.black87, size: 32),
                      const SizedBox(width: 10),
                      Text(
                        'Today\'s Challenge',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.black,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    config.name,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: Colors.black87,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    config.description,
                    style: TextStyle(fontSize: 15, color: Colors.black87, fontStyle: FontStyle.italic),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Rules',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...rules.map(
                    (r) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Text(
                        r,
                        style: const TextStyle(fontSize: 14, height: 1.4, color: Colors.black87),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _onRulesContinue,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black,
                      foregroundColor: primaryYellow,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: Colors.black87, width: 2),
                      ),
                      elevation: 2,
                    ),
                    child: const Text('Continue', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
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
