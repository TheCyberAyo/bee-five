import 'package:flutter/material.dart';
import 'adventure_game_logic.dart' as logic;

const Color primaryYellow = Color(0xFFFFC30B);
const int boardSize = 10;

class SimpleGame extends StatefulWidget {
  final VoidCallback onBackToMenu;
  final String? backgroundColor;

  const SimpleGame({
    super.key,
    required this.onBackToMenu,
    this.backgroundColor,
  });

  @override
  State<SimpleGame> createState() => _SimpleGameState();
}

class _SimpleGameState extends State<SimpleGame> {
  List<List<int>> board = [];
  int currentPlayer = 1; // 1 = black, 2 = yellow
  int winner = 0; // 0 = no winner/draw, 1 = black, 2 = yellow
  bool showWinModal = false;
  String winMessage = '';

  @override
  void initState() {
    super.initState();
    _resetGame();
  }

  void _resetGame() {
    setState(() {
      board = List.generate(boardSize, (_) => List.filled(boardSize, 0));
      currentPlayer = 1;
      winner = 0;
      showWinModal = false;
      winMessage = '';
    });
  }

  bool _checkWinner(int row, int col, int player) {
    return logic.checkWinCondition(board, row, col, player);
  }

  void _handleCellClick(int row, int col) {
    if (board[row][col] != 0 || winner != 0) {
      return; // Cell already occupied or game over
    }

    setState(() {
      board[row][col] = currentPlayer;
    });

    // Check for winner
    if (_checkWinner(row, col, currentPlayer)) {
      setState(() {
        winner = currentPlayer;
        winMessage = '${currentPlayer == 1 ? 'Black' : 'Yellow'} wins! 🐝';
        showWinModal = true;
      });
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
      } else {
        // Switch player
        setState(() {
          currentPlayer = currentPlayer == 1 ? 2 : 1;
        });
      }
    }
  }

  void _handleExit() {
    widget.onBackToMenu();
  }

  @override
  Widget build(BuildContext context) {
    const double borderWidth = 2.0;
    final totalBorders = (boardSize + 1) * borderWidth;

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

            // Current Player Indicator
            Container(
              padding: const EdgeInsets.all(15),
              child: Text(
                '▶ ${currentPlayer == 1 ? 'Black' : 'Yellow'}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.black,
                ),
              ),
            ),

            // Game Board - perfect square filling full width left to right
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
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Image.asset(
                              'assets/homeImagery/home.png',
                              width: 20,
                              height: 20,
                              fit: BoxFit.contain,
                              errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                            ),
                            const SizedBox(width: 6),
                            const Text(
                              'Home',
                              style: TextStyle(
                                color: Colors.black,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                          ],
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
                    winMessage.contains('Black')
                        ? 'Sweet victory! 🍯'
                        : winMessage.contains('Yellow')
                            ? 'The hive strikes back! 🍯'
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

