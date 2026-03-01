import 'package:flutter/material.dart';
import 'dart:math' as math;
import 'dart:async';
import 'adventure_game_logic.dart' as logic;

const Color primaryYellow = Color(0xFFFFC30B);
const int boardSize = 10;

class ClassicAIGame extends StatefulWidget {
  final VoidCallback onBackToMenu;
  final String initialDifficulty;
  final int initialTimer;
  final String? backgroundColor;

  const ClassicAIGame({
    super.key,
    required this.onBackToMenu,
    this.initialDifficulty = 'medium',
    this.initialTimer = 15,
    this.backgroundColor,
  });

  @override
  State<ClassicAIGame> createState() => _ClassicAIGameState();
}

class _ClassicAIGameState extends State<ClassicAIGame> {
  List<List<int>> board = [];
  int currentPlayer = 2; // 1 = human (yellow), 2 = AI (black)
  int winner = 0; // 0 = no winner/draw, 1 = human, 2 = AI
  bool showWinModal = false;
  String winMessage = '';
  String aiDifficulty = 'medium';
  int timeLeft = 15;
  Timer? timer;
  bool isAITurn = false;

  @override
  void initState() {
    super.initState();
    aiDifficulty = widget.initialDifficulty;
    timeLeft = widget.initialTimer;
    _resetGame();
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  void _resetGame() {
    setState(() {
      board = List.generate(boardSize, (_) => List.filled(boardSize, 0));
      currentPlayer = 2; // Human starts (yellow)
      winner = 0;
      showWinModal = false;
      winMessage = '';
      isAITurn = false;
      timeLeft = widget.initialTimer;
    });
    timer?.cancel();
    if (widget.initialTimer > 0) {
      _startTimer();
    }
  }

  void _startTimer() {
    timer?.cancel();
    timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() {
        if (timeLeft > 0 && currentPlayer == 1 && winner == 0) {
          timeLeft--;
        } else if (timeLeft <= 0) {
          // Time's up - AI wins
          _handleTimeUp();
          timer.cancel();
        }
      });
    });
  }

  void _handleTimeUp() {
    setState(() {
      winner = 2;
      winMessage = 'Time\'s up! AI wins! 🐝';
      showWinModal = true;
    });
  }

  bool _checkWinner(int row, int col, int player) {
    return logic.checkWinCondition(board, row, col, player);
  }

  void _handleCellClick(int row, int col) {
    if (board[row][col] != 0 || winner != 0 || currentPlayer != 1 || isAITurn) {
      return; // Cell already occupied, game over, or not human's turn
    }

    setState(() {
      board[row][col] = currentPlayer;
      timeLeft = widget.initialTimer; // Reset timer on move
    });

    // Check for winner
    if (_checkWinner(row, col, currentPlayer)) {
      setState(() {
        winner = currentPlayer;
        winMessage = 'You win! 🐝';
        showWinModal = true;
      });
      timer?.cancel();
    } else {
      // Check for draw
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
          winMessage = 'Game Over - Draw! 🐝';
          showWinModal = true;
        });
        timer?.cancel();
      } else {
        // Switch to AI turn
        setState(() {
          currentPlayer = 2;
          isAITurn = true;
        });
        _makeAIMove();
      }
    }
  }

  void _makeAIMove() {
    // Get available cells
    final availableCells = <Map<String, int>>[];
    for (int row = 0; row < boardSize; row++) {
      for (int col = 0; col < boardSize; col++) {
        if (board[row][col] == 0) {
          availableCells.add({'row': row, 'col': col});
        }
      }
    }

    if (availableCells.isEmpty) {
      setState(() {
        winner = 0;
        winMessage = 'Game Over - Draw! 🐝';
        showWinModal = true;
      });
      timer?.cancel();
      return;
    }

    // Delay AI move for better UX
    Future.delayed(const Duration(milliseconds: 500), () {
      if (!mounted || winner != 0) return;

      final aiMove = _getBestAIMove(availableCells, board);
      final row = aiMove['row']!;
      final col = aiMove['col']!;

      setState(() {
        board[row][col] = 2;
        isAITurn = false;
      });

      // Check for winner
      if (_checkWinner(row, col, 2)) {
        setState(() {
          winner = 2;
          winMessage = 'AI wins! 🐝';
          showWinModal = true;
        });
        timer?.cancel();
      } else {
        // Check for draw
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
            winMessage = 'Game Over - Draw! 🐝';
            showWinModal = true;
          });
          timer?.cancel();
        } else {
          // Switch back to human
          setState(() {
            currentPlayer = 1;
            timeLeft = widget.initialTimer; // Reset timer
          });
          if (widget.initialTimer > 0) {
            _startTimer();
          }
        }
      }
    });
  }

  Map<String, int> _getBestAIMove(List<Map<String, int>> availableCells, List<List<int>> currentBoard) {
    if (aiDifficulty == 'easy') {
      return _getEasyAIMove(availableCells, currentBoard);
    } else if (aiDifficulty == 'medium') {
      return _getMediumAIMove(availableCells, currentBoard);
    } else {
      return _getHardAIMove(availableCells, currentBoard);
    }
  }

  Map<String, int> _getEasyAIMove(List<Map<String, int>> availableCells, List<List<int>> currentBoard) {
    // Priority 1: Take winning move if available
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (logic.checkWinCondition(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    // Priority 2: Block if human can win immediately (but only 50% of the time)
    if (math.Random().nextDouble() > 0.5) {
      for (final cell in availableCells) {
        final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
        testBoard[cell['row']!][cell['col']!] = 1;
        if (logic.checkWinCondition(testBoard, cell['row']!, cell['col']!, 1)) {
          return cell;
        }
      }
    }

    // Priority 3: Random move
    final random = math.Random();
    return availableCells[random.nextInt(availableCells.length)];
  }

  Map<String, int> _getMediumAIMove(List<Map<String, int>> availableCells, List<List<int>> currentBoard) {
    // Priority 1: Take winning move if available
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (logic.checkWinCondition(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    // Priority 2: Block if human can win immediately
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (logic.checkWinCondition(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    // Priority 3: Block 3-in-a-row threats
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (_checkThreeInARow(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    // Priority 4: Create 3-in-a-row if it can lead to 5
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (_checkThreeInARow(testBoard, cell['row']!, cell['col']!, 2) && _canReachFive(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    // Priority 5: Random move
    final random = math.Random();
    return availableCells[random.nextInt(availableCells.length)];
  }

  Map<String, int> _getHardAIMove(List<Map<String, int>> availableCells, List<List<int>> currentBoard) {
    // Priority 1: Take winning move if available
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (logic.checkWinCondition(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    // Priority 2: Block if human can win immediately
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (logic.checkWinCondition(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    // Priority 3: Block 4-in-a-row threats
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (_checkFourInARow(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    // Priority 4: Create 4-in-a-row if possible
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (_checkFourInARow(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    // Priority 5: Block 3-in-a-row threats
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 1;
      if (_checkThreeInARow(testBoard, cell['row']!, cell['col']!, 1)) {
        return cell;
      }
    }

    // Priority 6: Create 3-in-a-row if it can lead to 5
    for (final cell in availableCells) {
      final testBoard = currentBoard.map((row) => List<int>.from(row)).toList();
      testBoard[cell['row']!][cell['col']!] = 2;
      if (_checkThreeInARow(testBoard, cell['row']!, cell['col']!, 2) && _canReachFive(testBoard, cell['row']!, cell['col']!, 2)) {
        return cell;
      }
    }

    // Priority 7: Strategic positioning near existing pieces
    for (final cell in availableCells) {
      if (_isNearHumanPiece(currentBoard, cell['row']!, cell['col']!)) {
        return cell;
      }
    }

    // Priority 8: Try to control center area
    final centerCells = availableCells.where((cell) {
      final centerRow = 4.5;
      final centerCol = 4.5;
      final distance = math.sqrt(math.pow(cell['row']! - centerRow, 2) + math.pow(cell['col']! - centerCol, 2));
      return distance <= 2;
    }).toList();
    
    if (centerCells.isNotEmpty) {
      final random = math.Random();
      return centerCells[random.nextInt(centerCells.length)];
    }

    // Priority 9: Random move
    final random = math.Random();
    return availableCells[random.nextInt(availableCells.length)];
  }

  bool _checkThreeInARow(List<List<int>> testBoard, int row, int col, int player) {
    final directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (final direction in directions) {
      int count = 1;
      final dRow = direction[0];
      final dCol = direction[1];
      for (int i = 1; i < 4; i++) {
        final newRow = row + i * dRow;
        final newCol = col + i * dCol;
        if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize && testBoard[newRow][newCol] == player) {
          count++;
        } else {
          break;
        }
      }
      for (int i = 1; i < 4; i++) {
        final newRow = row - i * dRow;
        final newCol = col - i * dCol;
        if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize && testBoard[newRow][newCol] == player) {
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
    final directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (final direction in directions) {
      int count = 1;
      final dRow = direction[0];
      final dCol = direction[1];
      for (int i = 1; i < 5; i++) {
        final newRow = row + i * dRow;
        final newCol = col + i * dCol;
        if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize && testBoard[newRow][newCol] == player) {
          count++;
        } else {
          break;
        }
      }
      for (int i = 1; i < 5; i++) {
        final newRow = row - i * dRow;
        final newCol = col - i * dCol;
        if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize && testBoard[newRow][newCol] == player) {
          count++;
        } else {
          break;
        }
      }
      if (count >= 4) return true;
    }
    return false;
  }

  bool _isNearHumanPiece(List<List<int>> testBoard, int row, int col) {
    for (int dRow = -2; dRow <= 2; dRow++) {
      for (int dCol = -2; dCol <= 2; dCol++) {
        if (dRow == 0 && dCol == 0) continue;
        final newRow = row + dRow;
        final newCol = col + dCol;
        if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize && testBoard[newRow][newCol] == 1) {
          return true;
        }
      }
    }
    return false;
  }

  bool _canReachFive(List<List<int>> testBoard, int row, int col, int player) {
    final directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (final direction in directions) {
      int count = 1;
      int emptySpaces = 0;
      final dr = direction[0];
      final dc = direction[1];
      for (int direction = -1; direction <= 1; direction += 2) {
        for (int i = 1; i <= 4; i++) {
          final newRow = row + (dr * i * direction);
          final newCol = col + (dc * i * direction);
          if (newRow < 0 || newRow >= boardSize || newCol < 0 || newCol >= boardSize) break;
          if (testBoard[newRow][newCol] == player) {
            count++;
          } else if (testBoard[newRow][newCol] == 0) {
            emptySpaces++;
          } else {
            break;
          }
        }
      }
      if (count + emptySpaces >= 5) return true;
    }
    return false;
  }

  void _handleExit() {
    timer?.cancel();
    widget.onBackToMenu();
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final boardPadding = 20.0;
    final borderWidth = 2.0;
    final availableSize = screenSize.width - (boardPadding * 2);
    final totalBorders = (boardSize + 1) * borderWidth;
    final availableForCells = availableSize - totalBorders;
    final cellSize = (availableForCells / boardSize).floorToDouble();

    return Stack(
      children: [
        Scaffold(
          backgroundColor: const Color(0xFF808080), // Gray background
          body: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 15),
              decoration: const BoxDecoration(
                color: Colors.black,
                border: Border(
                  bottom: BorderSide(color: primaryYellow, width: 2),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Image.asset(
                    'assets/BEE-FIVE.png',
                    height: 40,
                    fit: BoxFit.contain,
                  ),
                ],
              ),
            ),

            // Game Info
            Container(
              padding: const EdgeInsets.all(15),
              child: Column(
                children: [
                  Text(
                    currentPlayer == 1 ? '▶ Your Turn (Yellow)' : '🤖 AI\'s Turn (Black)',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                    ),
                  ),
                  if (widget.initialTimer > 0 && currentPlayer == 1 && winner == 0)
                    Text(
                      'Time: ${timeLeft}s',
                      style: TextStyle(
                        fontSize: 16,
                        color: timeLeft <= 5 ? Colors.red : Colors.black,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                ],
              ),
            ),

            // Game Board
            Expanded(
              child: Center(
                child: Padding(
                  padding: EdgeInsets.all(boardPadding),
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF87CEEB), // Sky blue
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
                            return GestureDetector(
                              onTap: () => _handleCellClick(row, col),
                              child: Container(
                                width: cellSize,
                                height: cellSize,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF87CEEB),
                                  border: Border.all(
                                    color: Colors.white,
                                    width: borderWidth,
                                  ),
                                ),
                                child: board[row][col] != 0
                                    ? Center(
                                        child: Container(
                                          width: cellSize / 1.5,
                                          height: cellSize / 1.5,
                                          decoration: BoxDecoration(
                                            color: board[row][col] == 1
                                                ? primaryYellow
                                                : Colors.black,
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
                ),
              ),
            ),

            // Footer
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 15),
              decoration: const BoxDecoration(
                color: Colors.black,
                border: Border(
                  top: BorderSide(color: primaryYellow, width: 2),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      child: ElevatedButton(
                        onPressed: _handleExit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primaryYellow,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                            side: const BorderSide(color: Colors.black, width: 2),
                          ),
                        ),
                        child: const Text(
                          '🏠 Home',
                          style: TextStyle(
                            color: Colors.black,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      child: ElevatedButton(
                        onPressed: _resetGame,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primaryYellow,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                            side: const BorderSide(color: Colors.black, width: 2),
                          ),
                        ),
                        child: const Text(
                          '🔄 Restart',
                          style: TextStyle(
                            color: Colors.black,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        ),
        ),

        // Win Modal
        if (showWinModal)
          Container(
            color: Colors.black.withValues(alpha: 0.8),
            child: Center(
              child: Container(
              margin: const EdgeInsets.all(20),
              padding: const EdgeInsets.all(30),
              decoration: BoxDecoration(
                color: primaryYellow,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.black, width: 4),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    '🐝',
                    style: TextStyle(fontSize: 60),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    winMessage,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    winMessage.contains('You win')
                        ? 'Sweet victory! 🍯'
                        : winMessage.contains('AI wins')
                            ? 'The AI strikes back! 🍯'
                            : 'Great game! 🍯',
                    style: const TextStyle(
                      fontSize: 16,
                      color: Color(0xFF333333),
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 30),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      ElevatedButton(
                        onPressed: () {
                          setState(() {
                            showWinModal = false;
                          });
                          _resetGame();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 24,
                            vertical: 12,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                            side: const BorderSide(color: Colors.black, width: 2),
                          ),
                        ),
                        child: const Text(
                          'Play Again',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ),
                      const SizedBox(width: 15),
                      ElevatedButton(
                        onPressed: () {
                          setState(() {
                            showWinModal = false;
                          });
                          _handleExit();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 24,
                            vertical: 12,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                            side: const BorderSide(color: Colors.black, width: 2),
                          ),
                        ),
                        child: const Text(
                          'Back to Menu',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            ),
          ),
      ],
    );
  }
}

