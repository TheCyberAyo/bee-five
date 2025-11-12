import React, { useState, useEffect, useRef } from 'react';
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
const calculateCellSize = () => {
  const availableWidth = SCREEN_WIDTH - 40;
  const availableHeight = SCREEN_HEIGHT - 300;
  const maxCellSize = Math.min(availableWidth / GRID_SIZE, availableHeight / GRID_SIZE);
  return Math.min(maxCellSize - 2, 35);
};
const CELL_SIZE = calculateCellSize();

export default function BattleGame({
  battleLength,
  player1Name,
  player2Name,
  battleScores,
  setBattleScores,
  battleGamesPlayed,
  setBattleGamesPlayed,
  setBattleWinner,
  showBattleWinnerModal,
  setShowBattleWinnerModal,
  onBackToMenu,
  timeLimit = 15,
}) {
  // Track the current starting player separately
  const [currentStartingPlayer, setCurrentStartingPlayer] = useState(1);
  
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState(currentStartingPlayer);
  const [isGameActive, setIsGameActive] = useState(true);
  const [winner, setWinner] = useState(0);
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const [winningPieces, setWinningPieces] = useState([]);
  const [battleComplete, setBattleComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const gameCompletedRef = useRef(false);
  const timerRef = useRef(null);
  const pendingWinnerRef = useRef(0); // Store winner until Next Game is clicked

  // Timer effect
  useEffect(() => {
    if (!isGameActive || winner > 0 || timeLimit === 0 || battleComplete) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up
          const timeoutWinner = currentPlayer === 1 ? 2 : 1;
          setWinner(timeoutWinner);
          setIsGameActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isGameActive, winner, timeLimit, currentPlayer, battleComplete]);

  // Handle cell press
  const handleCellPress = (row, col) => {
    if (!isGameActive || board[row][col] !== 0 || battleComplete) {
      return;
    }

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = currentPlayer;

    const hasWon = checkWinCondition(newBoard, row, col, currentPlayer);
    const boardFull = isBoardFull(newBoard);

    if (hasWon) {
      const pieces = getWinningPieces(newBoard, row, col, currentPlayer);
      setWinningPieces(pieces);
      setWinner(currentPlayer);
      setIsGameActive(false);
    } else if (boardFull) {
      setIsGameActive(false);
      setWinner(0);
    } else {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
      setTimeLeft(timeLimit);
    }

    setBoard(newBoard);
  };

  // Handle game completion - only show popup, don't update scores yet
  useEffect(() => {
    if (battleComplete || showBattleWinnerModal) return;

    // Check if this is the last game
    const isLastGame = (battleGamesPlayed + 1) >= battleLength;

    // Handle winner
    if (winner > 0 && !gameCompletedRef.current) {
      gameCompletedRef.current = true;
      pendingWinnerRef.current = winner;
      
      // If this is the last game, skip the popup and go directly to final winner modal
      if (isLastGame) {
        // Update scores immediately
        setBattleScores(prevScores => {
          const newScores = { ...prevScores };
          if (winner === 1) {
            newScores.player1 += 1;
          } else {
            newScores.player2 += 1;
          }
          
          // Update games played and show final winner modal
          setBattleGamesPlayed(battleGamesPlayed + 1);
          setTimeout(() => {
            const battleWinner = newScores.player1 > newScores.player2 ? player1Name : player2Name;
            setBattleWinner(battleWinner);
            setBattleComplete(true);
            setShowBattleWinnerModal(true);
          }, 100);
          
          return newScores;
        });
      } else {
        // Not the last game - show popup as usual
        const winnerName = winner === 1 ? player1Name : player2Name;
        setWinMessage(`${winnerName} wins! 🎉`);
        setShowWinPopup(true);
      }
    }
    // Handle draw
    else if (!isGameActive && winner === 0 && !gameCompletedRef.current && !battleComplete) {
      gameCompletedRef.current = true;
      pendingWinnerRef.current = 0; // 0 means draw
      
      // If this is the last game, skip the popup and go directly to final winner modal
      if (isLastGame) {
        // Update games played and show final winner modal (no score change for draw)
        setBattleGamesPlayed(battleGamesPlayed + 1);
        setTimeout(() => {
          setBattleScores(currentScores => {
            const battleWinner = currentScores.player1 > currentScores.player2 ? player1Name : 
                                currentScores.player2 > currentScores.player1 ? player2Name : null;
            setBattleWinner(battleWinner || 'Tie');
            setBattleComplete(true);
            setShowBattleWinnerModal(true);
            return currentScores;
          });
        }, 100);
      } else {
        // Not the last game - show popup as usual
        setWinMessage('Game Over - Draw! 🐝');
        setShowWinPopup(true);
      }
    }
    // Handle time limit wins
    else if (timeLeft === 0 && !battleComplete && timeLimit > 0 && !gameCompletedRef.current) {
      gameCompletedRef.current = true;
      const timeoutWinner = currentPlayer === 1 ? 2 : 1;
      pendingWinnerRef.current = timeoutWinner;
      
      // If this is the last game, skip the popup and go directly to final winner modal
      if (isLastGame) {
        // Update scores immediately
        setBattleScores(prevScores => {
          const newScores = { ...prevScores };
          if (timeoutWinner === 1) {
            newScores.player1 += 1;
          } else {
            newScores.player2 += 1;
          }
          
          // Update games played and show final winner modal
          setBattleGamesPlayed(battleGamesPlayed + 1);
          setTimeout(() => {
            const battleWinner = newScores.player1 > newScores.player2 ? player1Name : player2Name;
            setBattleWinner(battleWinner);
            setBattleComplete(true);
            setShowBattleWinnerModal(true);
          }, 100);
          
          return newScores;
        });
      } else {
        // Not the last game - show popup as usual
        const winnerName = timeoutWinner === 1 ? player1Name : player2Name;
        setWinMessage(`${winnerName} wins due to time limit! 🐝`);
        setShowWinPopup(true);
      }
    }
    
    // Reset the ref when a new game starts
    if (isGameActive && winner === 0 && !battleComplete && !showWinPopup) {
      gameCompletedRef.current = false;
      pendingWinnerRef.current = 0;
    }
  }, [winner, isGameActive, timeLeft, currentPlayer, battleComplete, showBattleWinnerModal, timeLimit, showWinPopup, player1Name, player2Name, battleGamesPlayed, battleLength]);

  const handleNextGame = () => {
    if (battleGamesPlayed >= battleLength) {
      return;
    }
    
    // Close the popup first
    setShowWinPopup(false);
    
    // Update scores based on the pending winner (stored when game ended)
    const winner = pendingWinnerRef.current;
    if (winner > 0) {
      // Update battle scores
      setBattleScores(prevScores => {
        const newScores = { ...prevScores };
        if (winner === 1) {
          newScores.player1 += 1;
        } else {
          newScores.player2 += 1;
        }
        return newScores;
      });
    }
    
    // Calculate the new games played count and next starting player
    const newGamesPlayed = battleGamesPlayed + 1;
    
    // Calculate next starting player (alternate)
    // Game 1 (0 games played): Player 1 starts
    // Game 2 (1 game played): Player 2 starts
    // Game 3 (2 games played): Player 1 starts
    const nextStartingPlayer = (newGamesPlayed % 2) === 0 ? 1 : 2;
    
    // Check if battle is complete
    if (newGamesPlayed >= battleLength) {
      // Battle is complete - update games played and show modal
      setBattleGamesPlayed(newGamesPlayed);
      setTimeout(() => {
        setBattleScores(currentScores => {
          const battleWinner = currentScores.player1 > currentScores.player2 ? player1Name : player2Name;
          setBattleWinner(battleWinner);
          setBattleComplete(true);
          setShowBattleWinnerModal(true);
          return currentScores;
        });
      }, 100);
      return;
    }
    
    // Update games played
    setBattleGamesPlayed(newGamesPlayed);
    
    // Reset for next game
    gameCompletedRef.current = false;
    pendingWinnerRef.current = 0;
    
    // Update starting player and reset the game
    setCurrentStartingPlayer(nextStartingPlayer);
    
    // Reset the game with the new starting player
    setBoard(createEmptyBoard());
    setCurrentPlayer(nextStartingPlayer);
    setIsGameActive(true);
    setWinner(0);
    setWinningPieces([]);
    setTimeLeft(timeLimit);
  };

  const handleRestart = () => {
    // Reset the current game only (not the whole battle)
    gameCompletedRef.current = false;
    pendingWinnerRef.current = 0;
    setBoard(createEmptyBoard());
    setCurrentPlayer(currentStartingPlayer);
    setIsGameActive(true);
    setWinner(0);
    setWinningPieces([]);
    setTimeLeft(timeLimit);
    setShowWinPopup(false);
  };

  const handlePlayAgain = () => {
    setShowWinPopup(false);
    setShowBattleWinnerModal(false);
    setBattleComplete(false);
    gameCompletedRef.current = false;
    pendingWinnerRef.current = 0;
    setWinMessage('');
    setBattleScores({ player1: 0, player2: 0 });
    setBattleGamesPlayed(0);
    setCurrentStartingPlayer(1); // Start with player 1
    setBoard(createEmptyBoard());
    setCurrentPlayer(1);
    setIsGameActive(true);
    setWinner(0);
    setWinningPieces([]);
    setTimeLeft(timeLimit);
  };

  // Render cell
  const renderCell = (row, col) => {
    const cellValue = board[row][col];
    const isWinningPiece = winningPieces.some(p => p.row === row && p.col === col);
    
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

  const finalWinner = battleScores.player1 > battleScores.player2 ? player1Name : player2Name;
  const isTie = battleScores.player1 === battleScores.player2;

  return (
    <View style={styles.container}>
      {/* Header - Logo only, centered */}
      <View style={styles.header}>
        <Image
          source={require('../assets/BEE-FIVE.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Scoreboard with game number */}
      <View style={styles.scoreboard}>
        <View style={[
          styles.scoreItem,
          battleScores.player1 > battleScores.player2 && styles.scoreItemLeading
        ]}>
          <Text style={styles.scoreName}>{player1Name}</Text>
          <Text style={styles.scoreValue}>{battleScores.player1}</Text>
        </View>
        
        <View style={styles.centerSection}>
          <Text style={styles.vsText}>VS</Text>
          {!showBattleWinnerModal && !battleComplete && (
            <View style={styles.gameNumberContainer}>
              <Text style={styles.gameNumberText}>
                Game {Math.min(battleGamesPlayed + 1, battleLength)} of {battleLength}
              </Text>
            </View>
          )}
        </View>
        
        <View style={[
          styles.scoreItem,
          battleScores.player2 > battleScores.player1 && styles.scoreItemLeading
        ]}>
          <Text style={styles.scoreName}>{player2Name}</Text>
          <Text style={styles.scoreValue}>{battleScores.player2}</Text>
        </View>
      </View>

      {/* Current Player Indicator */}
      <View style={styles.playerIndicator}>
        <Text style={styles.playerText}>
          Current Player: {currentPlayer === 1 ? player1Name : player2Name}
        </Text>
        {timeLimit > 0 && (
          <Text style={[styles.timerText, timeLeft < 5 && styles.timerTextWarning]}>
            ⏱️ {timeLeft}s
          </Text>
        )}
      </View>

      {/* Game Board */}
      <View style={styles.boardWrapper}>
        <ScrollView
          contentContainerStyle={styles.boardContainer}
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
          style={styles.footerButton}
          onPress={onBackToMenu}
          activeOpacity={0.8}
        >
          <Text style={styles.footerButtonText}>🏠 Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.footerButton,
            styles.restartButton,
            battleComplete && styles.newGameButton
          ]}
          onPress={battleComplete ? handlePlayAgain : handleRestart}
          activeOpacity={0.8}
        >
          <Text style={styles.footerButtonText}>
            {battleComplete ? '🆕 New Game' : '🔄 Restart'}
          </Text>
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
            <Text style={styles.modalEmoji}>🐝</Text>
            <Text style={styles.modalTitle}>{winMessage}</Text>
            
            {battleGamesPlayed < battleLength ? (
              <TouchableOpacity
                style={[styles.modalButton, styles.nextGameButton]}
                onPress={handleNextGame}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Next Game</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>Battle Complete! 🏆</Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.playAgainButton]}
                    onPress={handlePlayAgain}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalButtonText}>Play Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.backToMenuButton]}
                    onPress={onBackToMenu}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalButtonText}>Menu</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Final Winner Modal */}
      <Modal
        visible={showBattleWinnerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBattleWinnerModal(false)}
      >
        <View style={styles.finalModalOverlay}>
          <View style={styles.finalModalContent}>
            <View style={styles.finalModalTopContent}>
              {isTie && (
                <Text style={styles.finalModalTitle}>
                  It's a Tie! 🤝
                </Text>
              )}
              
              {!isTie && (
                <Text style={styles.finalWinnerText}>
                  {finalWinner} WINS! 🎊
                </Text>
              )}
              
              <View style={styles.finalScoreContainer}>
                <View style={styles.finalScoreItem}>
                  <Text style={styles.finalScoreName}>{player1Name}</Text>
                  <Text style={styles.finalScoreValue}>{battleScores.player1}</Text>
                </View>
                <Text style={styles.finalVsText}>vs</Text>
                <View style={styles.finalScoreItem}>
                  <Text style={styles.finalScoreName}>{player2Name}</Text>
                  <Text style={styles.finalScoreValue}>{battleScores.player2}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.finalModalButtons}>
              <TouchableOpacity
                style={[styles.finalModalButton, styles.backToMenuFinalButton]}
                onPress={onBackToMenu}
                activeOpacity={0.8}
              >
                <Text style={styles.finalModalButtonText}>🏠 Back to Menu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.finalModalButton, styles.newBattleButton]}
                onPress={handlePlayAgain}
                activeOpacity={0.8}
              >
                <Text style={styles.finalModalButtonText}>
                  {isTie ? '🔄 Rematch' : 'New Battle'}
                </Text>
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
    paddingTop: 40,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.PRIMARY,
  },
  logo: {
    height: DIMENSIONS.LOGO_HEIGHT,
    width: DIMENSIONS.LOGO_WIDTH,
    maxWidth: DIMENSIONS.LOGO_MAX_WIDTH,
  },
  scoreboard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginHorizontal: 20,
    marginTop: 5,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000',
    gap: 10,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  gameNumberContainer: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
  },
  gameNumberText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scoreItem: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 80,
  },
  scoreItemLeading: {
    backgroundColor: '#e8f5e9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  scoreName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  vsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  playerIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    gap: 15,
  },
  playerText: {
    color: '#FF0000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  timerText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  timerTextWarning: {
    color: '#F44336',
  },
  boardWrapper: {
    flex: 1,
  },
  boardContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    paddingTop: 5,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.PRIMARY,
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
    textAlign: 'center',
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
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
  nextGameButton: {
    backgroundColor: '#4CAF50',
  },
  playAgainButton: {
    backgroundColor: '#4CAF50',
  },
  backToMenuButton: {
    backgroundColor: '#666',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  finalModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  finalModalContent: {
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
  finalModalTopContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  finalModalEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  finalModalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B4513',
    textAlign: 'center',
    marginBottom: 15,
  },
  finalWinnerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#228B22',
    textAlign: 'center',
    marginBottom: 20,
  },
  finalScoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  finalScoreItem: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 80,
    marginHorizontal: 10,
  },
  finalScoreName: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  finalScoreValue: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  finalVsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginHorizontal: 10,
  },
  finalModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 20,
  },
  finalModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  newBattleButton: {
    backgroundColor: '#4CAF50',
  },
  backToMenuFinalButton: {
    backgroundColor: '#6c757d',
  },
  finalModalButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.HEADER_BG,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 30,
    borderTopWidth: 2,
    borderTopColor: COLORS.PRIMARY,
  },
  footerButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    minWidth: 100,
    alignItems: 'center',
  },
  footerButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  restartButton: {
    backgroundColor: '#FF9800',
  },
  newGameButton: {
    backgroundColor: '#4CAF50',
  },
  footerButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footerButtonTextDisabled: {
    color: '#666',
  },
});

