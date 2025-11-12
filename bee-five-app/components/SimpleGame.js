import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { DIMENSIONS } from '../constants/dimensions';
import { createEmptyBoard, checkWinCondition, isBoardFull, getWinningPieces } from '../utils/gameLogic';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_SIZE = 10;
// Calculate cell size to fit screen nicely
const calculateCellSize = () => {
  const availableWidth = SCREEN_WIDTH - 40; // Account for padding
  const availableHeight = SCREEN_HEIGHT - 200; // Account for header and player indicator
  const maxCellSize = Math.min(availableWidth / GRID_SIZE, availableHeight / GRID_SIZE);
  return Math.min(maxCellSize - 2, 35); // Subtract border width, max 35
};
const CELL_SIZE = calculateCellSize();

export default function SimpleGame({ onBackToMenu }) {
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState(1); // 1 = Black, 2 = Yellow
  const [isGameActive, setIsGameActive] = useState(true);
  const [winner, setWinner] = useState(0);
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const [winningPieces, setWinningPieces] = useState([]);

  // Handle cell press
  const handleCellPress = (row, col) => {
    if (!isGameActive || board[row][col] !== 0) {
      return;
    }

    // Create new board with the move
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = currentPlayer;

    // Check for win
    const hasWon = checkWinCondition(newBoard, row, col, currentPlayer);
    const boardFull = isBoardFull(newBoard);

    if (hasWon) {
      const pieces = getWinningPieces(newBoard, row, col, currentPlayer);
      setWinningPieces(pieces);
      setWinner(currentPlayer);
      setIsGameActive(false);
      const winnerName = currentPlayer === 1 ? 'Black' : 'Yellow';
      setWinMessage(`${winnerName} wins! 🐝`);
      setShowWinPopup(true);
    } else if (boardFull) {
      setIsGameActive(false);
      setWinMessage('Game Over - Draw! 🐝');
      setShowWinPopup(true);
    } else {
      // Switch player
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }

    setBoard(newBoard);
  };

  // Reset game
  const resetGame = () => {
    setBoard(createEmptyBoard());
    setCurrentPlayer(1);
    setIsGameActive(true);
    setWinner(0);
    setShowWinPopup(false);
    setWinMessage('');
    setWinningPieces([]);
  };

  // Render cell
  const renderCell = (row, col) => {
    const cellValue = board[row][col];
    const isWinningPiece = winningPieces.some(p => p.row === row && p.col === col);
    
    let cellColor = '#87CEEB'; // Default grid color
    let cellContent = null;

    if (cellValue === 1) {
      cellColor = isWinningPiece ? '#C0C0C0' : '#000000'; // Black
      cellContent = '●';
    } else if (cellValue === 2) {
      cellColor = isWinningPiece ? '#C0C0C0' : COLORS.PRIMARY; // Yellow
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
        onPress={() => handleCellPress(row, col)}
        disabled={!isGameActive || cellValue !== 0}
        activeOpacity={0.7}
      >
        {cellContent && (
          <Text style={[
            styles.cellContent,
            { color: cellValue === 1 ? '#FFFFFF' : '#000000' }
          ]}>
            {cellContent}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../assets/BEE-FIVE.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Current Player Indicator */}
      <View style={styles.playerIndicator}>
        <Text style={styles.playerText}>
          Current Player: {currentPlayer === 1 ? 'Black' : 'Yellow'}
        </Text>
        <View style={[
          styles.playerDot,
          { backgroundColor: currentPlayer === 1 ? '#000000' : COLORS.PRIMARY }
        ]} />
      </View>

      {/* Game Board */}
      <View style={styles.boardContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.board}>
            {Array(GRID_SIZE).fill(null).map((_, row) => (
              <View key={row} style={styles.row}>
                {Array(GRID_SIZE).fill(null).map((_, col) => renderCell(row, col))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, styles.homeButton]}
          onPress={onBackToMenu}
          activeOpacity={0.8}
        >
          <Text style={styles.footerButtonText}>🏠 Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.footerButton, styles.newButton]}
          onPress={resetGame}
          activeOpacity={0.8}
        >
          <Text style={[styles.footerButtonText, styles.newButtonText]}>🔄 Restart</Text>
        </TouchableOpacity>
      </View>

      {/* Win Popup Modal */}
      <Modal
        visible={showWinPopup}
        transparent={true}
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
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Play Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.backToMenuButton]}
                onPress={() => {
                  setShowWinPopup(false);
                  onBackToMenu();
                }}
                activeOpacity={0.8}
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
  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
  },
  backButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  logo: {
    height: DIMENSIONS.LOGO_HEIGHT,
    width: DIMENSIONS.LOGO_WIDTH,
    maxWidth: DIMENSIONS.LOGO_MAX_WIDTH,
  },
  newGameButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
  },
  newGameButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  playerIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    gap: 10,
  },
  playerText: {
    color: '#FF0000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  playerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
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
  cellContent: {
    fontSize: CELL_SIZE * 0.6,
    fontWeight: 'bold',
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
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  modalEmoji: {
    fontSize: 60,
    marginBottom: 20,
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

