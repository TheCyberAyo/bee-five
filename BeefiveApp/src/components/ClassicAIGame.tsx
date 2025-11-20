import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  SafeAreaView,
  Image,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOARD_SIZE = 10;
const BORDER_WIDTH = 2;
const BOARD_PADDING = 20;

// Calculate cell size to match web version
const calculateCellSize = () => {
  const isMobile = SCREEN_WIDTH <= 768;
  const availableSize = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) - (BOARD_PADDING * 2);
  const totalBorders = (BOARD_SIZE + 1) * BORDER_WIDTH;
  const availableForCells = availableSize - totalBorders - 20;
  const calculatedSize = Math.floor(availableForCells / BOARD_SIZE);
  
  if (isMobile) {
    return Math.min(calculatedSize, 40);
  } else {
    return Math.min(calculatedSize, 60);
  }
};

const CELL_SIZE = calculateCellSize();

interface ClassicAIGameProps {
  onBackToMenu: () => void;
  initialDifficulty?: 'easy' | 'medium' | 'hard';
  initialTimer?: number;
  backgroundColor?: 'yellow' | 'black';
}

type CellValue = 0 | 1 | 2; // 0 = empty, 1 = player (black), 2 = AI (yellow)

export default function ClassicAIGame({ 
  onBackToMenu, 
  initialDifficulty = 'medium', 
  initialTimer = 15,
  backgroundColor = 'yellow' 
}: ClassicAIGameProps) {
  const [board, setBoard] = useState<CellValue[][]>(
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0))
  );
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(2); // AI goes first in classic mode
  const [winner, setWinner] = useState<0 | 1 | 2>(0);
  const [timeLimit] = useState(initialTimer);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>(initialDifficulty);
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameActiveRef = useRef(true);

  const backgroundStyle = '#808080'; // Gray background like BattleGame

  // Timer logic
  useEffect(() => {
    if (timeLimit === 0 || winner !== 0 || !gameActiveRef.current) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timeLeft > 0 && winner === 0 && gameActiveRef.current) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time's up - current player loses
            const timeWinner = currentPlayer === 1 ? 2 : 1;
            setWinner(timeWinner);
            const winText = timeWinner === 1 ? 'You win due to time limit! 🐝' : 'You lost due to time limit! 🐝';
            setWinMessage(winText);
            gameActiveRef.current = false;
            setShowWinPopup(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeLeft, currentPlayer, winner, timeLimit]);

  // Reset timer when player changes
  useEffect(() => {
    if (winner === 0 && gameActiveRef.current) {
      setTimeLeft(timeLimit);
    }
  }, [currentPlayer, timeLimit, winner]);

  // Check for winner
  const checkWinner = (row: number, col: number, player: 1 | 2): boolean => {
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal /
      [1, -1]   // diagonal \
    ];

    for (const [dx, dy] of directions) {
      let count = 1;

      // Check in positive direction
      for (let i = 1; i < 5; i++) {
        const newRow = row + dx * i;
        const newCol = col + dy * i;
        if (
          newRow >= 0 &&
          newRow < BOARD_SIZE &&
          newCol >= 0 &&
          newCol < BOARD_SIZE &&
          board[newRow][newCol] === player
        ) {
          count++;
        } else {
          break;
        }
      }

      // Check in negative direction
      for (let i = 1; i < 5; i++) {
        const newRow = row - dx * i;
        const newCol = col - dy * i;
        if (
          newRow >= 0 &&
          newRow < BOARD_SIZE &&
          newCol >= 0 &&
          newCol < BOARD_SIZE &&
          board[newRow][newCol] === player
        ) {
          count++;
        } else {
          break;
        }
      }

      if (count >= 5) {
        return true;
      }
    }

    return false;
  };

  // AI helper functions
  const checkThreeInARow = useCallback((testBoard: CellValue[][], row: number, col: number, player: 1 | 2): boolean => {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dRow, dCol] of directions) {
      let count = 1;
      for (let i = 1; i < 4; i++) {
        const newRow = row + i * dRow;
        const newCol = col + i * dCol;
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE && testBoard[newRow][newCol] === player) {
          count++;
        } else break;
      }
      for (let i = 1; i < 4; i++) {
        const newRow = row - i * dRow;
        const newCol = col - i * dCol;
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE && testBoard[newRow][newCol] === player) {
          count++;
        } else break;
      }
      if (count >= 3) return true;
    }
    return false;
  }, []);

  const checkTwoInARow = useCallback((testBoard: CellValue[][], row: number, col: number, player: 1 | 2): boolean => {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dRow, dCol] of directions) {
      let count = 1;
      for (let i = 1; i < 3; i++) {
        const newRow = row + i * dRow;
        const newCol = col + i * dCol;
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE && testBoard[newRow][newCol] === player) {
          count++;
        } else break;
      }
      for (let i = 1; i < 3; i++) {
        const newRow = row - i * dRow;
        const newCol = col - i * dCol;
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE && testBoard[newRow][newCol] === player) {
          count++;
        } else break;
      }
      if (count >= 2) return true;
    }
    return false;
  }, []);

  const checkFourInARow = useCallback((testBoard: CellValue[][], row: number, col: number, player: 1 | 2): boolean => {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dRow, dCol] of directions) {
      let count = 1;
      for (let i = 1; i < 5; i++) {
        const newRow = row + i * dRow;
        const newCol = col + i * dCol;
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE && testBoard[newRow][newCol] === player) {
          count++;
        } else break;
      }
      for (let i = 1; i < 5; i++) {
        const newRow = row - i * dRow;
        const newCol = col - i * dCol;
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE && testBoard[newRow][newCol] === player) {
          count++;
        } else break;
      }
      if (count >= 4) return true;
    }
    return false;
  }, []);

  const isNearHumanPiece = useCallback((testBoard: CellValue[][], row: number, col: number): boolean => {
    for (let dRow = -2; dRow <= 2; dRow++) {
      for (let dCol = -2; dCol <= 2; dCol++) {
        if (dRow === 0 && dCol === 0) continue;
        const newRow = row + dRow;
        const newCol = col + dCol;
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE && testBoard[newRow][newCol] === 1) {
          return true;
        }
      }
    }
    return false;
  }, []);

  const canReachFive = useCallback((testBoard: CellValue[][], row: number, col: number, player: 1 | 2): boolean => {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of directions) {
      let count = 1;
      let emptySpaces = 0;
      for (let direction = -1; direction <= 1; direction += 2) {
        for (let i = 1; i <= 4; i++) {
          const newRow = row + (dr * i * direction);
          const newCol = col + (dc * i * direction);
          if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) break;
          if (testBoard[newRow][newCol] === player) {
            count++;
          } else if (testBoard[newRow][newCol] === 0) {
            emptySpaces++;
          } else {
            break;
          }
        }
      }
      if (count + emptySpaces >= 5) return true;
    }
    return false;
  }, []);

  const checkWinCondition = useCallback((testBoard: CellValue[][], row: number, col: number, player: 1 | 2): boolean => {
    // Check for winner on the test board
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal /
      [1, -1]   // diagonal \
    ];

    for (const [dx, dy] of directions) {
      let count = 1;

      // Check in positive direction
      for (let i = 1; i < 5; i++) {
        const newRow = row + dx * i;
        const newCol = col + dy * i;
        if (
          newRow >= 0 &&
          newRow < BOARD_SIZE &&
          newCol >= 0 &&
          newCol < BOARD_SIZE &&
          testBoard[newRow][newCol] === player
        ) {
          count++;
        } else {
          break;
        }
      }

      // Check in negative direction
      for (let i = 1; i < 5; i++) {
        const newRow = row - dx * i;
        const newCol = col - dy * i;
        if (
          newRow >= 0 &&
          newRow < BOARD_SIZE &&
          newCol >= 0 &&
          newCol < BOARD_SIZE &&
          testBoard[newRow][newCol] === player
        ) {
          count++;
        } else {
          break;
        }
      }

      if (count >= 5) {
        return true;
      }
    }

    return false;
  }, []);

  // AI Move Functions
  const getEasyAIMove = useCallback((availableCells: {row: number, col: number}[], currentBoard: CellValue[][]): {row: number, col: number} => {
    // Priority 1: Take winning move if available
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 2;
      if (checkWinCondition(testBoard, cell.row, cell.col, 2)) {
        return cell;
      }
    }

    // Priority 2: Block if human can win immediately (but only 50% of the time)
    if (Math.random() > 0.5) {
      for (let cell of availableCells) {
        const testBoard = currentBoard.map(r => [...r]);
        testBoard[cell.row][cell.col] = 1;
        if (checkWinCondition(testBoard, cell.row, cell.col, 1)) {
          return cell;
        }
      }
    }

    // Priority 3: Random move
    return availableCells[Math.floor(Math.random() * availableCells.length)];
  }, [checkWinCondition]);

  const getMediumAIMove = useCallback((availableCells: {row: number, col: number}[], currentBoard: CellValue[][]): {row: number, col: number} => {
    // Priority 1: Take winning move if available
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 2;
      if (checkWinCondition(testBoard, cell.row, cell.col, 2)) {
        return cell;
      }
    }

    // Priority 2: Block if human can win immediately
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 1;
      if (checkWinCondition(testBoard, cell.row, cell.col, 1)) {
        return cell;
      }
    }

    // Priority 3: Block 3-in-a-row threats
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 1;
      if (checkThreeInARow(testBoard, cell.row, cell.col, 1)) {
        return cell;
      }
    }

    // Priority 4: Create 3-in-a-row if it can lead to 5
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 2;
      if (checkThreeInARow(testBoard, cell.row, cell.col, 2) && canReachFive(testBoard, cell.row, cell.col, 2)) {
        return cell;
      }
    }

    // Priority 5: Block 2-in-a-row threats
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 1;
      if (checkTwoInARow(testBoard, cell.row, cell.col, 1)) {
        return cell;
      }
    }

    // Priority 6: Create 2-in-a-row if it can lead to 5
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 2;
      if (checkTwoInARow(testBoard, cell.row, cell.col, 2) && canReachFive(testBoard, cell.row, cell.col, 2)) {
        return cell;
      }
    }

    // Priority 7: Random move
    return availableCells[Math.floor(Math.random() * availableCells.length)];
  }, [checkWinCondition, checkThreeInARow, checkTwoInARow, canReachFive]);

  const getHardAIMove = useCallback((availableCells: {row: number, col: number}[], currentBoard: CellValue[][]): {row: number, col: number} => {
    // Priority 1: Take winning move if available
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 2;
      if (checkWinCondition(testBoard, cell.row, cell.col, 2)) {
        return cell;
      }
    }

    // Priority 2: Block if human can win immediately
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 1;
      if (checkWinCondition(testBoard, cell.row, cell.col, 1)) {
        return cell;
      }
    }

    // Priority 3: Block 4-in-a-row threats
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 1;
      if (checkFourInARow(testBoard, cell.row, cell.col, 1)) {
        return cell;
      }
    }

    // Priority 4: Create 4-in-a-row if possible
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 2;
      if (checkFourInARow(testBoard, cell.row, cell.col, 2)) {
        return cell;
      }
    }

    // Priority 5: Block 3-in-a-row threats
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 1;
      if (checkThreeInARow(testBoard, cell.row, cell.col, 1)) {
        return cell;
      }
    }

    // Priority 6: Create 3-in-a-row if it can lead to 5
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 2;
      if (checkThreeInARow(testBoard, cell.row, cell.col, 2) && canReachFive(testBoard, cell.row, cell.col, 2)) {
        return cell;
      }
    }

    // Priority 7: Block 2-in-a-row threats
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 1;
      if (checkTwoInARow(testBoard, cell.row, cell.col, 1)) {
        return cell;
      }
    }

    // Priority 8: Create 2-in-a-row if it can lead to 5
    for (let cell of availableCells) {
      const testBoard = currentBoard.map(r => [...r]);
      testBoard[cell.row][cell.col] = 2;
      if (checkTwoInARow(testBoard, cell.row, cell.col, 2) && canReachFive(testBoard, cell.row, cell.col, 2)) {
        return cell;
      }
    }

    // Priority 9: Strategic positioning near existing pieces
    for (let cell of availableCells) {
      if (isNearHumanPiece(currentBoard, cell.row, cell.col)) {
        return cell;
      }
    }

    // Priority 10: Try to control center area
    const centerCells = availableCells.filter(cell => {
      const centerRow = 4.5;
      const centerCol = 4.5;
      const distance = Math.sqrt(Math.pow(cell.row - centerRow, 2) + Math.pow(cell.col - centerCol, 2));
      return distance <= 2;
    });
    
    if (centerCells.length > 0) {
      return centerCells[Math.floor(Math.random() * centerCells.length)];
    }

    // Priority 11: Random move
    return availableCells[Math.floor(Math.random() * availableCells.length)];
  }, [checkWinCondition, checkFourInARow, checkThreeInARow, checkTwoInARow, canReachFive, isNearHumanPiece]);

  const getBestAIMove = useCallback((availableCells: {row: number, col: number}[], currentBoard: CellValue[][]): {row: number, col: number} => {
    if (aiDifficulty === 'easy') {
      return getEasyAIMove(availableCells, currentBoard);
    } else if (aiDifficulty === 'medium') {
      return getMediumAIMove(availableCells, currentBoard);
    } else {
      return getHardAIMove(availableCells, currentBoard);
    }
  }, [aiDifficulty, getEasyAIMove, getMediumAIMove, getHardAIMove]);

  const makeAIMove = useCallback(() => {
    if (winner !== 0 || !gameActiveRef.current) return;

    setBoard(currentBoard => {
      // Get available cells from current board state
      const availableCells: {row: number, col: number}[] = [];
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (currentBoard[row][col] === 0) {
            availableCells.push({ row, col });
          }
        }
      }

      if (availableCells.length === 0) return currentBoard;

      // Get AI move
      const selectedCell = getBestAIMove(availableCells, currentBoard);

      // Make the AI move
      const newBoard = currentBoard.map(r => [...r]);
      newBoard[selectedCell.row][selectedCell.col] = 2;

      // Check for winner using the new board
      if (checkWinCondition(newBoard, selectedCell.row, selectedCell.col, 2)) {
        setTimeout(() => {
          setWinner(2);
          setWinMessage('You lost! 🐝');
          gameActiveRef.current = false;
          setShowWinPopup(true);
        }, 0);
      } else {
        // Check for draw
        const isDraw = newBoard.every(row => row.every(cell => cell !== 0));
        if (isDraw) {
          setTimeout(() => {
            setWinner(0);
            setWinMessage('Game Over - Draw! 🐝');
            gameActiveRef.current = false;
            setShowWinPopup(true);
          }, 0);
        } else {
          // Switch to player
          setTimeout(() => setCurrentPlayer(1), 0);
        }
      }

      return newBoard;
    });
  }, [winner, getBestAIMove, checkWinCondition]);

  // AI move logic
  useEffect(() => {
    if (currentPlayer === 2 && winner === 0 && gameActiveRef.current) {
      // AI's turn - make a move after a short delay
      const timer = setTimeout(() => {
        makeAIMove();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, winner, makeAIMove]);

  // Handle cell click (player's turn only)
  const handleCellClick = (row: number, col: number) => {
    if (board[row][col] !== 0 || winner !== 0 || currentPlayer !== 1 || !gameActiveRef.current) {
      return;
    }

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = 1;
    setBoard(newBoard);

    // Check for winner
    if (checkWinner(row, col, 1)) {
      setWinner(1);
      setWinMessage('You win! 🎉');
      gameActiveRef.current = false;
      setShowWinPopup(true);
    } else {
      // Check for draw
      const isDraw = newBoard.every(row => row.every(cell => cell !== 0));
      if (isDraw) {
        setWinner(0);
        setWinMessage('Game Over - Draw! 🐝');
        gameActiveRef.current = false;
        setShowWinPopup(true);
      } else {
        // Switch to AI
        setCurrentPlayer(2);
      }
    }
  };

  // Reset game
  const resetGame = () => {
    setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0)));
    setCurrentPlayer(2); // AI goes first
    setWinner(0);
    setTimeLeft(timeLimit);
    setShowWinPopup(false);
    gameActiveRef.current = true;
  };

  // Get turn announcement
  const turnAnnouncement = winner !== 0 
    ? 'Game Over' 
    : currentPlayer === 1 
    ? 'Your Turn' 
    : "AI's Turn";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: backgroundStyle }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/BEE-FIVE.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Turn Indicator and Timer - All on one line */}
      <View style={styles.playerIndicator}>
        <View style={{ flex: 1 }} />
        <Text style={styles.playerText}>
          <Text style={styles.playSign}>▶</Text> {turnAnnouncement}
        </Text>
        {timeLimit > 0 && (
          <Text style={[styles.timerText, timeLeft < 5 && styles.timerTextWarning]}>
            ⏱️ {timeLeft}s
          </Text>
        )}
      </View>

      {/* Game Board */}
      <View style={styles.boardContainer}>
        <View style={styles.board}>
          {board.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((cell, colIndex) => (
                <TouchableOpacity
                  key={`${rowIndex}-${colIndex}`}
                  style={styles.cell}
                  onPress={() => handleCellClick(rowIndex, colIndex)}
                  disabled={cell !== 0 || winner !== 0 || currentPlayer !== 1}
                >
                  {cell === 1 && <View style={[styles.piece, styles.blackPiece]} />}
                  {cell === 2 && <View style={[styles.piece, styles.yellowPiece]} />}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Win Popup */}
      <Modal
        visible={showWinPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWinPopup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>🐝</Text>
            <Text style={styles.modalTitle}>{winMessage}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.greenButton]}
                onPress={() => {
                  resetGame();
                  setShowWinPopup(false);
                }}
              >
                <Text style={styles.modalButtonText}>Play Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.blueButton]}
                onPress={() => {
                  setShowWinPopup(false);
                  onBackToMenu();
                }}
              >
                <Text style={styles.modalButtonText}>Back to Menu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={onBackToMenu}
        >
          <Text style={styles.footerButtonText}>🏠 Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerButton}
          onPress={resetGame}
        >
          <Text style={styles.footerButtonText}>🔄 Restart</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 25,
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 150,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  playerIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  playerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  playSign: {
    color: '#4CAF50',
    fontSize: 28,
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  timerTextWarning: {
    color: '#F44336',
  },
  boardContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: BOARD_PADDING,
    paddingTop: BOARD_PADDING * 0.5,
  },
  board: {
    backgroundColor: '#87CEEB',
    borderRadius: 10,
    padding: BORDER_WIDTH,
    borderWidth: 3,
    borderColor: '#000',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: '#87CEEB',
    borderWidth: BORDER_WIDTH,
    borderColor: '#FFFFFF',
    margin: BORDER_WIDTH / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  piece: {
    width: CELL_SIZE * 2 / 3,
    height: CELL_SIZE * 2 / 3,
    borderRadius: (CELL_SIZE * 2 / 3) / 2,
  },
  blackPiece: {
    backgroundColor: '#000000',
  },
  yellowPiece: {
    backgroundColor: '#FFC30B',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    paddingBottom: 45,
    paddingHorizontal: 15,
    backgroundColor: '#000000',
  },
  footerButton: {
    backgroundColor: '#FFC30B',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    minWidth: 120,
    alignItems: 'center',
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFC30B',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#000',
    minWidth: 300,
    maxWidth: '90%',
  },
  modalEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
    minWidth: 120,
    alignItems: 'center',
  },
  greenButton: {
    backgroundColor: '#4CAF50',
  },
  blueButton: {
    backgroundColor: '#2196F3',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
});

