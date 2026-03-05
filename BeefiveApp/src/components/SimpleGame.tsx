import React, { useState, useEffect } from 'react';
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
import { showExitConfirmation, setupBackButtonHandler } from '../utils/exitConfirmation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_SIZE = 10; // Match bee-five-web (10x10 grid)
const BORDER_WIDTH = 2; // Match web version
const BOARD_PADDING = 20;

// Calculate cell size to fill full width of screen
// Height will increase proportionally since board is square
const calculateCellSize = () => {
  // Use full screen width, accounting for minimal padding
  const availableSize = SCREEN_WIDTH - (BOARD_PADDING * 2);
  // Account for borders: BOARD_SIZE cells + (BOARD_SIZE + 1) borders
  const totalBorders = (BOARD_SIZE + 1) * BORDER_WIDTH;
  const availableForCells = availableSize - totalBorders;
  const calculatedSize = Math.floor(availableForCells / BOARD_SIZE);
  
  return calculatedSize;
};

const CELL_SIZE = calculateCellSize();

interface SimpleGameProps {
  onBackToMenu: () => void;
  backgroundColor?: 'yellow' | 'black';
}

type CellValue = 0 | 1 | 2; // 0 = empty, 1 = player 1 (black), 2 = player 2 (yellow)

export default function SimpleGame({ onBackToMenu, backgroundColor: _backgroundColor = 'yellow' }: SimpleGameProps) {
  const [board, setBoard] = useState<CellValue[][]>(
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0))
  );
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<0 | 1 | 2>(0);
  const [showWinModal, setShowWinModal] = useState(false);
  const [winMessage, setWinMessage] = useState('');

  // Handle exit confirmation
  const handleExit = () => {
    showExitConfirmation(onBackToMenu);
  };

  // Setup Android back button handler
  useEffect(() => {
    const cleanup = setupBackButtonHandler(onBackToMenu);
    return cleanup;
  }, [onBackToMenu]);

  // Check for winner
  const checkWinner = (row: number, col: number, player: 1 | 2): boolean => {
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal \
      [1, -1],  // diagonal /
    ];

    for (const [dx, dy] of directions) {
      let count = 1; // Count the current cell

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

  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    if (board[row][col] !== 0 || winner !== 0) {
      return; // Cell already occupied or game over
    }

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = currentPlayer;
    setBoard(newBoard);

    // Check for winner
    if (checkWinner(row, col, currentPlayer)) {
      setWinner(currentPlayer);
      setWinMessage(`${currentPlayer === 1 ? 'Black' : 'Yellow'} wins!`);
      setShowWinModal(true);
    } else {
      // Check for draw
      const isDraw = newBoard.every(boardRow => boardRow.every(cell => cell !== 0));
      if (isDraw) {
        setWinner(0);
        setWinMessage('Game Over - Draw!');
        setShowWinModal(true);
      } else {
        // Switch player
        setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
      }
    }
  };

  // Reset game
  const resetGame = () => {
    setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0)));
    setCurrentPlayer(1);
    setWinner(0);
    setShowWinModal(false);
    setWinMessage('');
  };

  const backgroundStyle = '#808080'; // Gray background

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

      {/* Current Player Indicator */}
      <View style={styles.playerIndicator}>
        <Text style={styles.playerText}>
          <Text style={styles.playSign}>▶</Text> {currentPlayer === 1 ? 'Black' : 'Yellow'}
        </Text>
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
                  disabled={cell !== 0 || winner !== 0}
                >
                  {cell !== 0 && (
                    <View style={[
                      styles.piece,
                      cell === 1 && styles.blackPiece,
                      cell === 2 && styles.yellowPiece,
                    ]} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Win Modal */}
      <Modal
        visible={showWinModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{winMessage}</Text>
            <Text style={styles.modalSubtitle}>
              {winMessage.includes('Black') 
                ? 'Sweet victory! 🍯' 
                : winMessage.includes('Yellow') 
                ? 'The hive strikes back! 🍯' 
                : 'Great game! 🍯'}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.greenButton]}
                onPress={() => {
                  resetGame();
                }}
              >
                <Text style={styles.modalButtonText}>Play Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.blueButton]}
                onPress={() => {
                  setShowWinModal(false);
                  handleExit();
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
          onPress={handleExit}
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 25,
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#000000',
    borderBottomWidth: 2,
    borderBottomColor: '#FFC30B',
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
    padding: 15,
    alignItems: 'center',
  },
  playerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  playSign: {
    color: '#4CAF50',
    fontSize: 28,
  },
  boardContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: BOARD_PADDING,
    paddingTop: BOARD_PADDING * 0.5, // Shift board higher up
    width: '100%',
  },
  board: {
    backgroundColor: '#87CEEB',
    borderRadius: 10,
    padding: BORDER_WIDTH, // Match web version padding
    borderWidth: 3,
    borderColor: '#000',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: '#87CEEB', // Match web version - sky blue
    borderWidth: BORDER_WIDTH,
    borderColor: '#FFFFFF', // Match web version - white borders
    margin: BORDER_WIDTH / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  piece: {
    width: CELL_SIZE / 1.5, // Match web version - pieces are 2/3 of cell size
    height: CELL_SIZE / 1.5,
    borderRadius: (CELL_SIZE / 1.5) / 2, // Make it circular
  },
  blackPiece: {
    backgroundColor: '#000000',
  },
  yellowPiece: {
    backgroundColor: '#FFC30B',
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
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 2,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
    minWidth: 120,
  },
  greenButton: {
    backgroundColor: '#4CAF50',
  },
  blueButton: {
    backgroundColor: '#2196F3',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 15,
    paddingBottom: 45,
    paddingHorizontal: 15,
    backgroundColor: '#000000',
    borderTopWidth: 2,
    borderTopColor: '#FFC30B',
  },
  footerButton: {
    flex: 1,
    backgroundColor: '#FFC30B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    marginHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
