import React, { useState, useEffect, useRef } from 'react';
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

interface BattleGameProps {
  battleLength: 5 | 7;
  player1Name: string;
  player2Name: string;
  onBackToMenu: () => void;
  timeLimit?: number;
}

type CellValue = 0 | 1 | 2;

export default function BattleGame({ 
  battleLength, 
  player1Name, 
  player2Name, 
  onBackToMenu,
  timeLimit = 15 
}: BattleGameProps) {
  const [board, setBoard] = useState<CellValue[][]>(
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0))
  );
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<0 | 1 | 2>(0);
  const [battleScores, setBattleScores] = useState({ player1: 0, player2: 0 });
  const [battleGamesPlayed, setBattleGamesPlayed] = useState(0);
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  const [showBattleWinnerModal, setShowBattleWinnerModal] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [battleComplete, setBattleComplete] = useState(false);
  const gameCompletedRef = useRef(false);
  const pendingWinnerRef = useRef<0 | 1 | 2>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isResettingRef = useRef(false);

  // Timer logic
  useEffect(() => {
    if (timeLimit === 0 || winner !== 0 || battleComplete || battleGamesPlayed >= battleLength) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timeLeft > 0 && winner === 0 && !battleComplete) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time's up - current player loses
            const timeWinner = currentPlayer === 1 ? 2 : 1;
            setWinner(timeWinner);
            const winnerName = timeWinner === 1 ? player1Name : player2Name;
            setWinMessage(`${winnerName} wins due to time limit! 🐝`);
            gameCompletedRef.current = true;
            pendingWinnerRef.current = timeWinner;
            
            const isLastGame = (battleGamesPlayed + 1) >= battleLength;
            if (isLastGame) {
              setBattleScores(prevScores => {
                const newScores = { ...prevScores };
                if (timeWinner === 1) {
                  newScores.player1 += 1;
                } else {
                  newScores.player2 += 1;
                }
                setBattleGamesPlayed(battleGamesPlayed + 1);
                setTimeout(() => {
                  setBattleComplete(true);
                  setShowBattleWinnerModal(true);
                }, 100);
                return newScores;
              });
            } else {
              // Not last game - show popup for 2 seconds, then countdown
              setShowWinPopup(true);
              setTimeout(() => {
                setShowWinPopup(false);
                setShowCountdown(true);
                setCountdownValue(3);
              }, 2000);
            }
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
  }, [timeLeft, winner, currentPlayer, timeLimit, battleComplete, battleGamesPlayed, battleLength, player1Name, player2Name]);

  // Reset timer when player changes
  useEffect(() => {
    if (timeLimit > 0 && winner === 0 && !battleComplete) {
      setTimeLeft(timeLimit);
    }
  }, [currentPlayer, timeLimit]);

  // Check for winner
  const checkWinner = (row: number, col: number, player: 1 | 2): boolean => {
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal \
      [1, -1],  // diagonal /
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

  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    if (board[row][col] !== 0 || winner !== 0 || battleComplete) {
      return;
    }

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = currentPlayer;
    setBoard(newBoard);

    // Check for winner
    if (checkWinner(row, col, currentPlayer)) {
      setWinner(currentPlayer);
      const winnerName = currentPlayer === 1 ? player1Name : player2Name;
      setWinMessage(`${winnerName} wins! 🎉`);
      gameCompletedRef.current = true;
      pendingWinnerRef.current = currentPlayer;
      
      const isLastGame = (battleGamesPlayed + 1) >= battleLength;
      if (isLastGame) {
        // Last game - update scores and show final modal immediately
        setBattleScores(prevScores => {
          const newScores = { ...prevScores };
          if (currentPlayer === 1) {
            newScores.player1 += 1;
          } else {
            newScores.player2 += 1;
          }
          setBattleGamesPlayed(battleGamesPlayed + 1);
          setTimeout(() => {
            setBattleComplete(true);
            setShowBattleWinnerModal(true);
          }, 100);
          return newScores;
        });
      } else {
        // Not last game - show popup for 2 seconds, then countdown
        setShowWinPopup(true);
        // Auto-hide popup after 2 seconds and show countdown
        setTimeout(() => {
          setShowWinPopup(false);
          setShowCountdown(true);
          setCountdownValue(3);
        }, 2000);
      }
    } else {
      // Check for draw
      const isDraw = newBoard.every(row => row.every(cell => cell !== 0));
      if (isDraw) {
        setWinner(0);
        setWinMessage('Game Over - Draw! 🐝');
        gameCompletedRef.current = true;
        pendingWinnerRef.current = 0;
        
        const isLastGame = (battleGamesPlayed + 1) >= battleLength;
        if (isLastGame) {
          setBattleGamesPlayed(battleGamesPlayed + 1);
          setTimeout(() => {
            setBattleComplete(true);
            setShowBattleWinnerModal(true);
          }, 100);
        } else {
          // Not last game - show popup for 2 seconds, then countdown
          setShowWinPopup(true);
          setTimeout(() => {
            setShowWinPopup(false);
            setShowCountdown(true);
            setCountdownValue(3);
          }, 2000);
        }
      } else {
        // Switch player
        setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
      }
    }
  };

  // Handle next game (called automatically after countdown)
  const handleNextGame = () => {
    if (battleGamesPlayed >= battleLength) {
      return;
    }

    setShowWinPopup(false);
    setShowCountdown(false);

    // Update scores
    const winner = pendingWinnerRef.current;
    if (winner > 0) {
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

    const newGamesPlayed = battleGamesPlayed + 1;
    
    // Check if battle is complete
    if (newGamesPlayed >= battleLength) {
      setBattleGamesPlayed(newGamesPlayed);
      setTimeout(() => {
        setBattleComplete(true);
        setShowBattleWinnerModal(true);
      }, 100);
      return;
    }

    setBattleGamesPlayed(newGamesPlayed);
    
    // Reset for next game
    gameCompletedRef.current = false;
    pendingWinnerRef.current = 0;
    setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0)));
    setCurrentPlayer((newGamesPlayed % 2) === 0 ? 1 : 2);
    setWinner(0);
    setTimeLeft(timeLimit);
  };

  // Countdown effect - automatically proceed to next game
  useEffect(() => {
    if (showCountdown && countdownValue > 0 && !battleComplete) {
      countdownTimerRef.current = setInterval(() => {
        setCountdownValue((prev) => {
          if (prev <= 1) {
            // Countdown finished - proceed to next game
            handleNextGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [showCountdown, countdownValue, battleComplete]);

  // Reset game
  const resetGame = () => {
    isResettingRef.current = true;
    setShowWinPopup(false);
    setShowBattleWinnerModal(false);
    setBattleComplete(false);
    gameCompletedRef.current = false;
    pendingWinnerRef.current = 0;
    setWinMessage('');
    setBattleScores({ player1: 0, player2: 0 });
    setBattleGamesPlayed(0);
    
    setTimeout(() => {
      setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0)));
      setCurrentPlayer(1);
      setWinner(0);
      setTimeLeft(timeLimit);
      setTimeout(() => {
        isResettingRef.current = false;
      }, 200);
    }, 100);
  };

  const backgroundStyle = '#808080'; // Gray background

  const finalWinner = battleScores.player1 > battleScores.player2 ? player1Name : 
                     battleScores.player2 > battleScores.player1 ? player2Name : null;
  const isTie = battleScores.player1 === battleScores.player2;

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

      {/* Scoreboard */}
      <View style={styles.gameInfoContainer}>
        <View style={styles.scoreboard}>
          <Text style={styles.scoreboardText}>
            {player1Name} {battleScores.player1} : {battleScores.player2} {player2Name}
          </Text>
        </View>
      </View>

      {/* Game Number, Current Player Indicator, and Timer - All on one line */}
      <View style={styles.playerIndicator}>
        <Text style={styles.gameNumberText}>
          Game {battleGamesPlayed + 1} of {battleLength}
        </Text>
        <Text style={styles.playerText}>
          <Text style={styles.playSign}>▶</Text> {currentPlayer === 1 ? player1Name : player2Name}
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
                  disabled={cell !== 0 || winner !== 0 || battleComplete}
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

      {/* Win Popup - Shows for 2 seconds automatically */}
      <Modal
        visible={showWinPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>🐝</Text>
            <Text style={styles.modalTitle}>{winMessage}</Text>
            <Text style={styles.modalSubtitle}>Next game starting...</Text>
          </View>
        </View>
      </Modal>

      {/* Countdown Modal - Shows for 3 seconds automatically */}
      <Modal
        visible={showCountdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.countdownText}>{countdownValue}</Text>
            <Text style={styles.modalTitle}>Next game starting...</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>{isTie ? '🤝' : '🏆'}</Text>
            <Text style={styles.modalTitle}>
              {isTie ? 'It\'s a Tie! 🤝' : 'BATTLE COMPLETE! 🎉'}
            </Text>
            {!isTie && (
              <Text style={styles.modalSubtitle}>
                {finalWinner} WINS! 🎊
              </Text>
            )}
            
            <View style={styles.finalScoreContainer}>
              <View style={styles.finalScoreItem}>
                <Text style={styles.finalScoreName}>{player1Name}</Text>
                <Text style={styles.finalScoreValue}>{battleScores.player1}</Text>
              </View>
              <Text style={styles.finalScoreVS}>vs</Text>
              <View style={styles.finalScoreItem}>
                <Text style={styles.finalScoreName}>{player2Name}</Text>
                <Text style={styles.finalScoreValue}>{battleScores.player2}</Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.greenButton]}
                onPress={resetGame}
              >
                <Text style={styles.modalButtonText}>{isTie ? '🔄 Rematch' : '🏆 New Battle'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.blueButton]}
                onPress={() => {
                  setShowBattleWinnerModal(false);
                  onBackToMenu();
                }}
              >
                <Text style={styles.modalButtonText}>🏠 Back to Menu</Text>
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
  gameInfoContainer: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 2,
    borderBottomColor: '#FFC30B',
  },
  scoreboard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreboardText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  playerIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  gameNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
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
    width: CELL_SIZE / 1.5,
    height: CELL_SIZE / 1.5,
    borderRadius: (CELL_SIZE / 1.5) / 2,
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
    marginBottom: 20,
    textAlign: 'center',
  },
  countdownText: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 20,
    textAlign: 'center',
  },
  finalScoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginBottom: 25,
  },
  finalScoreItem: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 80,
  },
  finalScoreName: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  finalScoreValue: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  finalScoreVS: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
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

