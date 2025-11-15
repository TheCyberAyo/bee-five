import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { DIMENSIONS } from '../constants/dimensions';
import {
  createEmptyBoard,
  checkWinCondition,
  isBoardFull,
  getWinningPieces,
} from '../utils/gameLogic';

const GRID_SIZE = 10;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const calculateCellSize = () => {
  const availableWidth = SCREEN_WIDTH - 40;
  const availableHeight = SCREEN_HEIGHT - 220;
  const maxCellSize = Math.min(
    availableWidth / GRID_SIZE,
    availableHeight / GRID_SIZE
  );
  return Math.min(maxCellSize - 2, 35);
};

const CELL_SIZE = calculateCellSize();

export default function ClassicAIGame({
  onBackToMenu,
  difficulty = 'medium',
  timeLimit = 15,
}) {
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState(2); // AI starts first
  const [isGameActive, setIsGameActive] = useState(true);
  const [winner, setWinner] = useState(0);
  const [winningPieces, setWinningPieces] = useState([]);
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  const humanIsTurn = currentPlayer === 1;

  const resetGame = useCallback(() => {
    setBoard(createEmptyBoard());
    setCurrentPlayer(2); // AI goes first like web version
    setIsGameActive(true);
    setWinner(0);
    setWinningPieces([]);
    setShowWinPopup(false);
    setWinMessage('');
    setTimeLeft(timeLimit);
  }, [timeLimit]);

  const finalizeGame = useCallback((result, message) => {
    setIsGameActive(false);
    setWinner(result);
    setWinMessage(message);
    setShowWinPopup(true);
  }, []);

  const announceResult = useCallback(
    (player) => {
      if (player === 1) {
        finalizeGame(1, 'You win! 🐝');
      } else if (player === 2) {
        finalizeGame(2, 'AI wins! 🐝');
      } else {
        finalizeGame(0, 'Game Over - Draw! 🐝');
      }
    },
    [finalizeGame]
  );

  const applyMove = useCallback(
    (player, row, col) => {
      if (!isGameActive || board[row][col] !== 0) {
        return false;
      }

      const newBoard = board.map((r) => [...r]);
      newBoard[row][col] = player;

      const hasWon = checkWinCondition(newBoard, row, col, player);
      const boardFull = isBoardFull(newBoard);

      if (hasWon) {
        const pieces = getWinningPieces(newBoard, row, col, player);
        setBoard(newBoard);
        setWinningPieces(pieces);
        announceResult(player);
        return true;
      }

      if (boardFull) {
        setBoard(newBoard);
        setWinningPieces([]);
        announceResult(0);
        return true;
      }

      setBoard(newBoard);
      setWinningPieces([]);
      setCurrentPlayer(player === 1 ? 2 : 1);
      return true;
    },
    [announceResult, board, isGameActive]
  );

  const handleHumanMove = (row, col) => {
    if (!humanIsTurn) {
      return;
    }
    const moved = applyMove(1, row, col);
    if (moved && timeLimit > 0) {
      setTimeLeft(timeLimit);
    }
  };

  const getAvailableCells = useCallback(() => {
    const cells = [];
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        if (board[row][col] === 0) {
          cells.push({ row, col });
        }
      }
    }
    return cells;
  }, [board]);

  const checkThreeInARow = (targetBoard, row, col, player) => {
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];

    for (const [dRow, dCol] of directions) {
      let count = 1;

      for (let i = 1; i < 4; i += 1) {
        const newRow = row + i * dRow;
        const newCol = col + i * dCol;
        if (
          newRow >= 0 &&
          newRow < GRID_SIZE &&
          newCol >= 0 &&
          newCol < GRID_SIZE &&
          targetBoard[newRow][newCol] === player
        ) {
          count += 1;
        } else {
          break;
        }
      }

      for (let i = 1; i < 4; i += 1) {
        const newRow = row - i * dRow;
        const newCol = col - i * dCol;
        if (
          newRow >= 0 &&
          newRow < GRID_SIZE &&
          newCol >= 0 &&
          newCol < GRID_SIZE &&
          targetBoard[newRow][newCol] === player
        ) {
          count += 1;
        } else {
          break;
        }
      }

      if (count >= 3) {
        return true;
      }
    }
    return false;
  };

  const checkTwoInARow = (targetBoard, row, col, player) => {
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];

    for (const [dRow, dCol] of directions) {
      let count = 1;

      for (let i = 1; i < 3; i += 1) {
        const newRow = row + i * dRow;
        const newCol = col + i * dCol;
        if (
          newRow >= 0 &&
          newRow < GRID_SIZE &&
          newCol >= 0 &&
          newCol < GRID_SIZE &&
          targetBoard[newRow][newCol] === player
        ) {
          count += 1;
        } else {
          break;
        }
      }

      for (let i = 1; i < 3; i += 1) {
        const newRow = row - i * dRow;
        const newCol = col - i * dCol;
        if (
          newRow >= 0 &&
          newRow < GRID_SIZE &&
          newCol >= 0 &&
          newCol < GRID_SIZE &&
          targetBoard[newRow][newCol] === player
        ) {
          count += 1;
        } else {
          break;
        }
      }

      if (count >= 2) {
        return true;
      }
    }
    return false;
  };

  const checkFourInARow = (targetBoard, row, col, player) => {
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];

    for (const [dRow, dCol] of directions) {
      let count = 1;

      for (let i = 1; i < 5; i += 1) {
        const newRow = row + i * dRow;
        const newCol = col + i * dCol;
        if (
          newRow >= 0 &&
          newRow < GRID_SIZE &&
          newCol >= 0 &&
          newCol < GRID_SIZE &&
          targetBoard[newRow][newCol] === player
        ) {
          count += 1;
        } else {
          break;
        }
      }

      for (let i = 1; i < 5; i += 1) {
        const newRow = row - i * dRow;
        const newCol = col - i * dCol;
        if (
          newRow >= 0 &&
          newRow < GRID_SIZE &&
          newCol >= 0 &&
          newCol < GRID_SIZE &&
          targetBoard[newRow][newCol] === player
        ) {
          count += 1;
        } else {
          break;
        }
      }

      if (count >= 4) {
        return true;
      }
    }
    return false;
  };

  const isNearHumanPiece = (targetBoard, row, col) => {
    for (let dRow = -2; dRow <= 2; dRow += 1) {
      for (let dCol = -2; dCol <= 2; dCol += 1) {
        if (dRow === 0 && dCol === 0) continue;
        const newRow = row + dRow;
        const newCol = col + dCol;
        if (
          newRow >= 0 &&
          newRow < GRID_SIZE &&
          newCol >= 0 &&
          newCol < GRID_SIZE &&
          targetBoard[newRow][newCol] === 1
        ) {
          return true;
        }
      }
    }
    return false;
  };

  const canReachFive = (targetBoard, row, col, player) => {
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];

    for (const [dr, dc] of directions) {
      let count = 1;
      let emptySpaces = 0;

      for (let direction = -1; direction <= 1; direction += 2) {
        for (let i = 1; i <= 4; i += 1) {
          const newRow = row + dr * i * direction;
          const newCol = col + dc * i * direction;
          if (
            newRow < 0 ||
            newRow >= GRID_SIZE ||
            newCol < 0 ||
            newCol >= GRID_SIZE
          ) {
            break;
          }

          if (targetBoard[newRow][newCol] === player) {
            count += 1;
          } else if (targetBoard[newRow][newCol] === 0) {
            emptySpaces += 1;
          } else {
            break;
          }
        }
      }

      if (count + emptySpaces >= 5) {
        return true;
      }
    }

    return false;
  };

  const getEasyAIMove = useCallback(
    (availableCells) => {
      // Winning move
      for (const cell of availableCells) {
        const testBoard = board.map((row) => [...row]);
        testBoard[cell.row][cell.col] = 2;
        if (checkWinCondition(testBoard, cell.row, cell.col, 2)) {
          return cell;
        }
      }

      // Block human win (50% chance)
      if (Math.random() > 0.5) {
        for (const cell of availableCells) {
          const testBoard = board.map((row) => [...row]);
          testBoard[cell.row][cell.col] = 1;
          if (checkWinCondition(testBoard, cell.row, cell.col, 1)) {
            return cell;
          }
        }
      }

      // Random fallback
      return availableCells[Math.floor(Math.random() * availableCells.length)];
    },
    [board]
  );

  const getMediumAIMove = useCallback(
    (availableCells) => {
      // Winning move
      for (const cell of availableCells) {
        const testBoard = board.map((row) => [...row]);
        testBoard[cell.row][cell.col] = 2;
        if (checkWinCondition(testBoard, cell.row, cell.col, 2)) {
          return cell;
        }
      }

      // Block immediate human win
      for (const cell of availableCells) {
        const testBoard = board.map((row) => [...row]);
        testBoard[cell.row][cell.col] = 1;
        if (checkWinCondition(testBoard, cell.row, cell.col, 1)) {
          return cell;
        }
      }

      // Block 3-in-a-row threats
      for (const cell of availableCells) {
        const testBoard = board.map((row) => [...row]);
        testBoard[cell.row][cell.col] = 1;
        if (checkThreeInARow(testBoard, cell.row, cell.col, 1)) {
          return cell;
        }
      }

      // Create potential 3-in-a-row
      for (const cell of availableCells) {
        const testBoard = board.map((row) => [...row]);
        testBoard[cell.row][cell.col] = 2;
        if (
          checkThreeInARow(testBoard, cell.row, cell.col, 2) &&
          canReachFive(testBoard, cell.row, cell.col, 2)
        ) {
          return cell;
        }
      }

      // Block 2-in-a-row
      for (const cell of availableCells) {
        const testBoard = board.map((row) => [...row]);
        testBoard[cell.row][cell.col] = 1;
        if (checkTwoInARow(testBoard, cell.row, cell.col, 1)) {
          return cell;
        }
      }

      // Create 2-in-a-row
      for (const cell of availableCells) {
        const testBoard = board.map((row) => [...row]);
        testBoard[cell.row][cell.col] = 2;
        if (
          checkTwoInARow(testBoard, cell.row, cell.col, 2) &&
          canReachFive(testBoard, cell.row, cell.col, 2)
        ) {
          return cell;
        }
      }

      return availableCells[Math.floor(Math.random() * availableCells.length)];
    },
    [board]
  );

  const getHardAIMove = useCallback(
    (availableCells) => {
      // Winning move
      for (const cell of availableCells) {
        const testBoard = board.map((row) => [...row]);
        testBoard[cell.row][cell.col] = 2;
        if (checkWinCondition(testBoard, cell.row, cell.col, 2)) {
          return cell;
        }
      }

      // Block human win
      for (const cell of availableCells) {
        const testBoard = board.map((row) => [...row]);
        testBoard[cell.row][cell.col] = 1;
        if (checkWinCondition(testBoard, cell.row, cell.col, 1)) {
          return cell;
        }
      }

      // Block 4-in-a-row
      for (const cell of availableCells) {
        const testBoard = board.map((row) => [...row]);
        testBoard[cell.row][cell.col] = 1;
        if (checkFourInARow(testBoard, cell.row, cell.col, 1)) {
          return cell;
        }
      }

      // Create 4-in-a-row
      for (const cell of availableCells) {
        const testBoard = board.map((row) => [...row]);
        testBoard[cell.row][cell.col] = 2;
        if (checkFourInARow(testBoard, cell.row, cell.col, 2)) {
          return cell;
        }
      }

      // Block 3-in-a-row
      for (const cell of availableCells) {
        const testBoard = board.map((row) => [...row]);
        testBoard[cell.row][cell.col] = 1;
        if (checkThreeInARow(testBoard, cell.row, cell.col, 1)) {
          return cell;
        }
      }

      // Create 3-in-a-row
      for (const cell of availableCells) {
        const testBoard = board.map((row) => [...row]);
        testBoard[cell.row][cell.col] = 2;
        if (
          checkThreeInARow(testBoard, cell.row, cell.col, 2) &&
          canReachFive(testBoard, cell.row, cell.col, 2)
        ) {
          return cell;
        }
      }

      // Strategic positioning near human pieces
      for (const cell of availableCells) {
        if (isNearHumanPiece(board, cell.row, cell.col)) {
          return cell;
        }
      }

      // Favor center control
      const centerCells = availableCells.filter((cell) => {
        const centerRow = (GRID_SIZE - 1) / 2;
        const centerCol = (GRID_SIZE - 1) / 2;
        const distance = Math.sqrt(
          (cell.row - centerRow) ** 2 + (cell.col - centerCol) ** 2
        );
        return distance <= 2;
      });

      if (centerCells.length > 0) {
        return centerCells[Math.floor(Math.random() * centerCells.length)];
      }

      return availableCells[Math.floor(Math.random() * availableCells.length)];
    },
    [board]
  );

  const getBestAIMove = useCallback(
    (availableCells) => {
      if (difficulty === 'easy') {
        return getEasyAIMove(availableCells);
      }
      if (difficulty === 'medium') {
        return getMediumAIMove(availableCells);
      }
      return getHardAIMove(availableCells);
    },
    [difficulty, getEasyAIMove, getMediumAIMove, getHardAIMove]
  );

  const makeAIMove = useCallback(() => {
    const availableCells = getAvailableCells();
    if (availableCells.length === 0) {
      return;
    }
    const selectedCell = getBestAIMove(availableCells);
    const moved = applyMove(2, selectedCell.row, selectedCell.col);
    if (moved && timeLimit > 0) {
      setTimeLeft(timeLimit);
    }
  }, [applyMove, getAvailableCells, getBestAIMove, timeLimit]);

  // Trigger AI move
  useEffect(() => {
    if (currentPlayer === 2 && isGameActive && winner === 0) {
      const timer = setTimeout(() => {
        makeAIMove();
      }, 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [currentPlayer, isGameActive, winner, makeAIMove]);

  // Timer management
  useEffect(() => {
    if (timeLimit === 0 || !isGameActive || winner !== 0) {
      return undefined;
    }

    setTimeLeft(timeLimit);
    return undefined;
  }, [currentPlayer, isGameActive, timeLimit, winner]);

  useEffect(() => {
    if (timeLimit === 0 || !isGameActive || winner !== 0) {
      return undefined;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          announceResult(currentPlayer === 1 ? 2 : 1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [announceResult, currentPlayer, isGameActive, timeLimit, winner]);

  const turnText = useMemo(() => {
    if (!isGameActive) {
      if (winner === 1) return 'Game Over';
      if (winner === 2) return 'Game Over';
      return 'Game Paused';
    }
    return humanIsTurn ? 'Your Turn' : "AI's Turn";
  }, [humanIsTurn, isGameActive, winner]);

  const renderCell = (row, col) => {
    const cellValue = board[row][col];
    const isWinningPiece = winningPieces.some(
      (piece) => piece.row === row && piece.col === col
    );

    let cellColor = '#87CEEB';
    let cellContent = null;

    if (cellValue === 1) {
      cellColor = isWinningPiece ? '#C0C0C0' : '#000000';
      cellContent = '●';
    } else if (cellValue === 2) {
      cellColor = isWinningPiece ? '#C0C0C0' : COLORS.PRIMARY;
      cellContent = '●';
    }

    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[
          styles.cell,
          {
            width: CELL_SIZE,
            height: CELL_SIZE,
            backgroundColor: cellColor,
          },
        ]}
        onPress={() => handleHumanMove(row, col)}
        activeOpacity={humanIsTurn && cellValue === 0 ? 0.7 : 1}
        disabled={!humanIsTurn || cellValue !== 0 || !isGameActive}
      >
        {cellContent && (
          <Text
            style={[
              styles.cellContent,
              { color: cellValue === 1 ? '#FFFFFF' : '#000000' },
            ]}
          >
            {cellContent}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../assets/BEE-FIVE.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.playerIndicator}>
        <Text style={styles.playerText}>{turnText}</Text>
        {timeLimit > 0 && (
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>{timeLeft}s</Text>
          </View>
        )}
      </View>

      <View style={styles.boardContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.board}>
            {Array(GRID_SIZE)
              .fill(null)
              .map((_, row) => (
                <View key={row} style={styles.row}>
                  {Array(GRID_SIZE)
                    .fill(null)
                    .map((__, col) => renderCell(row, col))}
                </View>
              ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, styles.homeButton]}
          onPress={onBackToMenu}
          activeOpacity={0.85}
        >
          <Text style={styles.footerButtonText}>🏠 Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.footerButton, styles.newButton]}
          onPress={resetGame}
          activeOpacity={0.85}
        >
          <Text style={[styles.footerButtonText, styles.newButtonText]}>
            🔄 Restart
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showWinPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWinPopup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTopContent}>
              <Text style={styles.modalTitle}>{winMessage}</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.playAgainButton]}
                onPress={() => {
                  resetGame();
                  setShowWinPopup(false);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.modalButtonText}>Play Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.backToMenuButton]}
                onPress={() => {
                  setShowWinPopup(false);
                  onBackToMenu();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.modalButtonText}>Back to Menu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.HEADER_BG,
    paddingHorizontal: 15,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.PRIMARY,
  },
  logo: {
    height: DIMENSIONS.LOGO_HEIGHT,
    width: DIMENSIONS.LOGO_WIDTH,
    maxWidth: DIMENSIONS.LOGO_MAX_WIDTH,
  },
  playerIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    gap: 12,
  },
  playerText: {
    color: '#FF0000',
    fontSize: 20,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  timerBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#000',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  timerText: {
    color: COLORS.PRIMARY,
    fontSize: 16,
    fontWeight: 'bold',
  },
  boardContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    paddingTop: 30,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
  },
  board: {
    backgroundColor: '#87CEEB',
    borderRadius: 8,
    padding: 2,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 1,
  },
  cellContent: {
    fontSize: CELL_SIZE * 0.6,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.HEADER_BG,
    paddingTop: 12,
    paddingBottom: 5,
    paddingHorizontal: 20,
    borderTopWidth: 2,
    borderTopColor: COLORS.PRIMARY,
    marginBottom: 25,
  },
  footerButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    minWidth: 100,
  },
  homeButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  newButton: {
    backgroundColor: '#4CAF50',
  },
  footerButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  newButtonText: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#000000',
    minWidth: 300,
    maxWidth: '90%',
    height: SCREEN_HEIGHT * 0.6,
    justifyContent: 'space-between',
  },
  modalTopContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 15,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 20,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
    flex: 1,
    marginHorizontal: 5,
  },
  playAgainButton: {
    backgroundColor: '#4CAF50',
  },
  backToMenuButton: {
    backgroundColor: '#2196F3',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});



