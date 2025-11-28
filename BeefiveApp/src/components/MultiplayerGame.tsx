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
import { multiplayerService, type RoomInfo } from '../services/multiplayerService';
import { type GameMove } from '../lib/supabase';
import { GRID_SIZE, BORDER_WIDTH } from '../constants/gameConstants';
import { checkWinCondition, getWinningPieces } from '../utils/gameLogic';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOARD_PADDING = 20;

// Calculate cell size to match web version
const calculateCellSize = () => {
  const isMobile = SCREEN_WIDTH <= 768;
  const availableSize = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) - (BOARD_PADDING * 2);
  const totalBorders = (GRID_SIZE + 1) * BORDER_WIDTH;
  const availableForCells = availableSize - totalBorders - 20;
  const calculatedSize = Math.floor(availableForCells / GRID_SIZE);
  
  if (isMobile) {
    return Math.min(calculatedSize, 40);
  } else {
    return Math.min(calculatedSize, 60);
  }
};

const CELL_SIZE = calculateCellSize();

interface MultiplayerGameProps {
  roomInfo: RoomInfo;
  playerNumber: 1 | 2;
  onBackToLobby: () => void;
}

type CellValue = 0 | 1 | 2;

export default function MultiplayerGame({ roomInfo, playerNumber, onBackToLobby }: MultiplayerGameProps) {
  const [board, setBoard] = useState<CellValue[][]>(
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0))
  );
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<0 | 1 | 2>(0);
  const [winningPieces, setWinningPieces] = useState<{ row: number; col: number }[]>([]);
  const [gameActive, setGameActive] = useState(true);
  const [showWinModal, setShowWinModal] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [opponentName, setOpponentName] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [stopGameRequestedBy, setStopGameRequestedBy] = useState<1 | 2 | null>(null);
  const [showStopGameModal, setShowStopGameModal] = useState(false);

  // Use refs to track game state for callback checks
  const gameActiveRef = useRef(true);
  const winnerRef = useRef<0 | 1 | 2>(0);

  // Apply a move to the game board (must be defined before useEffect)
  const applyMove = useCallback((move: { row: number; col: number; player: 1 | 2; timestamp: number; roomId: string }) => {
    setBoard(prevBoard => {
      const newBoard = prevBoard.map(row => [...row]);
      
      // Don't apply move if cell is already occupied (safety check)
      if (newBoard[move.row][move.col] !== 0) {
        return prevBoard;
      }
      
      newBoard[move.row][move.col] = move.player;

      // Check for win condition using the updated board
      const winningPieces = getWinningPieces(newBoard, move.row, move.col, move.player);
      if (winningPieces.length >= 5) {
        // Immediately disable the game to prevent further moves
        gameActiveRef.current = false;
        winnerRef.current = move.player;
        setGameActive(false);
        
        setTimeout(() => {
          setWinner(move.player);
          setWinningPieces(winningPieces);
          
          setTimeout(() => {
            const isPlayerWin = move.player === playerNumber;
            // Get winner name from roomInfo for reliability
            const winnerPlayer = roomInfo.players.find(p => p.playerNumber === move.player);
            const winnerName = winnerPlayer?.name || (isPlayerWin ? playerName : opponentName);
            setWinMessage(`${winnerName} Wins! 🎉`);
            setShowWinModal(true);
          }, 500);
        }, 0);
      } else {
        // Switch turns only if game is still active
        if (gameActiveRef.current && winnerRef.current === 0) {
          setCurrentPlayer(move.player === 1 ? 2 : 1);
        }
      }

      return newBoard;
    });
  }, [playerNumber, roomInfo, playerName, opponentName]);

  // Initialize multiplayer event handlers
  useEffect(() => {
    // Find opponent name and player name
    const opponent = roomInfo.players.find(p => p.playerNumber !== playerNumber);
    const currentPlayerInfo = roomInfo.players.find(p => p.playerNumber === playerNumber);
    setOpponentName(opponent?.name || 'Opponent');
    setPlayerName(currentPlayerInfo?.name || 'You');

    // Set up move callback - use refs to check game state (avoids stale closure)
    multiplayerService.onMove = (move: GameMove) => {
      // Only apply moves if game is still active and no winner
      if (gameActiveRef.current && winnerRef.current === 0) {
        applyMove({
          row: move.row,
          col: move.col,
          player: move.player_number,
          timestamp: new Date(move.timestamp).getTime(),
          roomId: roomInfo.roomId
        });
      }
    };

    // Set up stop game request handlers
    multiplayerService.onStopGameRequested = (requestedBy: 1 | 2) => {
      setStopGameRequestedBy(requestedBy);
      setShowStopGameModal(true);
    };

    multiplayerService.onStopGameRequestCancelled = () => {
      setStopGameRequestedBy(null);
      setShowStopGameModal(false);
    };

    multiplayerService.onStopGameAccepted = () => {
      setGameActive(false);
      gameActiveRef.current = false;
      setStopGameRequestedBy(null);
      setShowStopGameModal(false);
    };

    // Set up game state update handler to sync stop game requests
    multiplayerService.onGameStateUpdate = (gameState) => {
      if (gameState.stop_game_requested_by !== stopGameRequestedBy) {
        setStopGameRequestedBy(gameState.stop_game_requested_by);
        if (gameState.stop_game_requested_by && gameState.stop_game_requested_by !== playerNumber) {
          setShowStopGameModal(true);
        }
      }
      // Update game active status if game was stopped
      if (!gameState.is_game_active && gameActive) {
        setGameActive(false);
        gameActiveRef.current = false;
      }
    };

    // Set up connection status handler
    multiplayerService.onConnectionStatusChange = (isConnected: boolean) => {
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
    };

    // If roomId is missing, recover it immediately
    const ensureRoomId = async () => {
      const currentRoomId = multiplayerService.getCurrentRoomId();
      if (!currentRoomId) {
        await multiplayerService.recoverRoomFromCode(roomInfo.roomId);
      }
    };
    ensureRoomId();

    // Fetch and apply existing moves when game starts (for players who join after moves have been made)
    const syncExistingMoves = async () => {
      // First ensure roomId is set
      let currentRoomId = multiplayerService.getCurrentRoomId();
      if (!currentRoomId) {
        await multiplayerService.recoverRoomFromCode(roomInfo.roomId);
        currentRoomId = multiplayerService.getCurrentRoomId();
      }
      
      if (!currentRoomId) return;

      // Fetch existing moves
      const existingMoves = await multiplayerService.fetchExistingMoves(currentRoomId);
      
      // Fetch game state first to get the full board state
      const gameState = await multiplayerService.fetchGameState(currentRoomId);
      if (gameState) {
        try {
          const boardState = JSON.parse(gameState.board_state) as (0 | 1 | 2)[][];
          // Update board state if it has moves
          if (boardState.some(row => row.some(cell => cell !== 0))) {
            setBoard(boardState);
            setCurrentPlayer(gameState.current_player);
            if (gameState.winner > 0) {
              // Update refs when loading game state
              gameActiveRef.current = false;
              winnerRef.current = gameState.winner;
              setWinner(gameState.winner);
              setGameActive(false);
              // Set winner message with actual name from roomInfo (more reliable than state)
              const winnerPlayer = roomInfo.players.find(p => p.playerNumber === gameState.winner);
              const winnerName = winnerPlayer?.name || (gameState.winner === playerNumber ? 'You' : 'Opponent');
              setWinMessage(`${winnerName} won! 🎉`);
              setShowWinModal(true);
            } else {
              // Reset refs if game is active
              gameActiveRef.current = gameState.is_game_active;
              winnerRef.current = 0;
            }
            // Sync stop game request
            setStopGameRequestedBy(gameState.stop_game_requested_by);
          }
        } catch (error) {
          console.error('Failed to parse persisted game state:', error);
          // If game state parsing fails, apply moves individually
          for (const move of existingMoves) {
            applyMove({
              row: move.row,
              col: move.col,
              player: move.player_number,
              timestamp: new Date(move.timestamp).getTime(),
              roomId: roomInfo.roomId
            });
          }
        }
      } else if (existingMoves.length > 0) {
        // If no game state, apply moves individually
        for (const move of existingMoves) {
          applyMove({
            row: move.row,
            col: move.col,
            player: move.player_number,
            timestamp: new Date(move.timestamp).getTime(),
            roomId: roomInfo.roomId
          });
        }
      }
    };

    syncExistingMoves();

    return () => {
      // Cleanup is handled by multiplayerService
    };
  }, [roomInfo, playerNumber, applyMove, gameActive, stopGameRequestedBy]);

  // Handle cell click
  const handleCellClick = async (row: number, col: number) => {
    // Disable moves if game is not active, someone has won, or it's not the player's turn
    if (!gameActive || winner > 0 || currentPlayer !== playerNumber || board[row][col] !== 0) {
      return;
    }

    // Ensure roomId is set before sending move
    const serviceRoomId = multiplayerService.getCurrentRoomId();
    if (!serviceRoomId) {
      await multiplayerService.recoverRoomFromCode(roomInfo.roomId);
      const recovered = multiplayerService.getCurrentRoomId();
      if (!recovered) {
        return;
      }
    }

    // Make the move locally
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = currentPlayer;
    setBoard(newBoard);

    // Check for win
    const winResult = checkWinCondition(newBoard, row, col, currentPlayer);
    let newWinner: 0 | 1 | 2 = 0;
    let newGameActive: boolean = gameActive;
    
    if (winResult) {
      const winningPieces = getWinningPieces(newBoard, row, col, currentPlayer);
      newWinner = currentPlayer;
      newGameActive = false;
      // Immediately disable the game to prevent further moves
      gameActiveRef.current = false;
      winnerRef.current = newWinner;
      setWinner(newWinner);
      setWinningPieces(winningPieces);
      setGameActive(false);
      // Get winner name from roomInfo for reliability
      const winnerPlayer = roomInfo.players.find(p => p.playerNumber === newWinner);
      const winnerName = winnerPlayer?.name || (newWinner === playerNumber ? playerName : opponentName);
      setWinMessage(`${winnerName} won! 🎉`);
      setShowWinModal(true);
    } else {
      // Switch turns only if game is still active
      if (gameActiveRef.current && winnerRef.current === 0) {
        setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
      }
    }

    // Send move to other players via Supabase
    await multiplayerService.sendMove(row, col);
    
    // Update game state in Supabase (preserve stop game request if exists)
    const currentState = await multiplayerService.fetchGameState(multiplayerService.getCurrentRoomId()!);
    await multiplayerService.updateGameState(
      newBoard,
      newGameActive ? (currentPlayer === 1 ? 2 : 1) : currentPlayer,
      newWinner,
      newGameActive,
      currentState?.stop_game_requested_by || null,
      currentState?.next_first_player || 1
    );
  };

  // Reset game state
  const resetGameState = () => {
    setBoard(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0)));
    setCurrentPlayer(1);
    setWinner(0);
    setWinningPieces([]);
    setGameActive(true);
    setShowWinModal(false);
    setWinMessage('');
    gameActiveRef.current = true;
    winnerRef.current = 0;
  };

  // Reset game
  const resetGame = async () => {
    // Clear old moves in database and reset game state with alternating first player
    await multiplayerService.resetGameState(true);
    
    // Reset local game state - will be synced from database
    resetGameState();
    setStopGameRequestedBy(null);
    setShowStopGameModal(false);
    
    // Fetch the new game state to get the correct first player
    const roomId = multiplayerService.getCurrentRoomId();
    if (roomId) {
      const newState = await multiplayerService.fetchGameState(roomId);
      if (newState) {
        setCurrentPlayer(newState.current_player);
        setBoard(JSON.parse(newState.board_state) as (0 | 1 | 2)[][]);
        gameActiveRef.current = newState.is_game_active;
        winnerRef.current = 0;
      }
    }
  };

  // Request to stop the game
  const handleRequestStopGame = async () => {
    await multiplayerService.requestStopGame();
    setStopGameRequestedBy(playerNumber);
  };

  // Cancel stop game request
  const handleCancelStopRequest = async () => {
    await multiplayerService.cancelStopGameRequest();
    setStopGameRequestedBy(null);
  };

  // Accept stop game request
  const handleAcceptStopGame = async () => {
    await multiplayerService.acceptStopGame();
    setStopGameRequestedBy(null);
    setShowStopGameModal(false);
  };

  // Reject stop game request
  const handleRejectStopGame = async () => {
    await multiplayerService.rejectStopGameRequest();
    setStopGameRequestedBy(null);
    setShowStopGameModal(false);
  };

  // Leave game
  const handleLeaveGame = async () => {
    await multiplayerService.leaveRoom();
    onBackToLobby();
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
        <View style={styles.roomInfo}>
          <Text style={styles.roomText}>Room: {roomInfo.roomId}</Text>
        </View>
      </View>

      {/* Player Info */}
      <View style={styles.playerIndicator}>
        <Text style={styles.playerText}>
          <Text style={styles.playSign}>▶</Text> {currentPlayer === 1 ? 'Black' : 'Yellow'}
        </Text>
        <Text style={styles.playerNames}>
          You ({playerNumber === 1 ? 'Black' : 'Yellow'}) vs {opponentName} ({playerNumber === 1 ? 'Yellow' : 'Black'})
        </Text>
      </View>

      {/* Connection Status Indicator */}
      {connectionStatus !== 'connected' && (
        <View style={[
          styles.connectionStatus,
          connectionStatus === 'disconnected' ? styles.connectionStatusError : styles.connectionStatusWarning
        ]}>
          <Text style={styles.connectionStatusText}>
            {connectionStatus === 'disconnected' ? '❌ Disconnected' : '🔄 Reconnecting...'}
          </Text>
        </View>
      )}

      {/* Game Board */}
      <View style={styles.boardContainer}>
        <View style={styles.board}>
          {board.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((cell, colIndex) => {
                const isWinningPiece = winningPieces.some(p => p.row === rowIndex && p.col === colIndex);
                return (
                  <TouchableOpacity
                    key={`${rowIndex}-${colIndex}`}
                    style={styles.cell}
                    onPress={() => handleCellClick(rowIndex, colIndex)}
                    disabled={cell !== 0 || winner !== 0 || !gameActive || currentPlayer !== playerNumber}
                  >
                    {cell !== 0 && (
                      <View style={[
                        styles.piece,
                        cell === 1 && styles.blackPiece,
                        cell === 2 && styles.yellowPiece,
                        isWinningPiece && styles.winningPiece,
                      ]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Stop Game Button */}
        {gameActive && !stopGameRequestedBy && (
          <TouchableOpacity 
            style={[styles.footerButton, styles.orangeButton]}
            onPress={handleRequestStopGame}
            disabled={connectionStatus !== 'connected' || winner > 0}
          >
            <Text style={styles.footerButtonText}>⏸️ Stop Game</Text>
          </TouchableOpacity>
        )}

        {/* Cancel Stop Request Button */}
        {stopGameRequestedBy === playerNumber && (
          <TouchableOpacity 
            style={[styles.footerButton, styles.orangeButton]}
            onPress={handleCancelStopRequest}
            disabled={connectionStatus !== 'connected'}
          >
            <Text style={styles.footerButtonText}>❌ Cancel Stop Request</Text>
          </TouchableOpacity>
        )}

        {/* Restart Game Button */}
        {(!gameActive || winner > 0) && (
          <TouchableOpacity 
            style={[styles.footerButton, styles.greenButton]}
            onPress={resetGame}
            disabled={connectionStatus !== 'connected'}
          >
            <Text style={styles.footerButtonText}>🔄 Restart Game</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.footerButton, styles.redButton]}
          onPress={handleLeaveGame}
        >
          <Text style={styles.footerButtonText}>🚪 Leave Game</Text>
        </TouchableOpacity>
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
            <Text style={styles.modalEmoji}>🐝</Text>
            <Text style={styles.modalTitle}>{winMessage}</Text>
            <Text style={styles.modalSubtitle}>
              {winMessage.includes(playerName) || winMessage.includes('You') 
                ? 'Sweet victory! 🍯' 
                : 'The hive strikes back! 🍯'}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.greenButton]}
                onPress={() => {
                  resetGame();
                  setShowWinModal(false);
                }}
              >
                <Text style={styles.modalButtonText}>Play Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.blueButton]}
                onPress={() => {
                  setShowWinModal(false);
                  handleLeaveGame();
                }}
              >
                <Text style={styles.modalButtonText}>Leave Game</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Stop Game Request Modal */}
      <Modal
        visible={showStopGameModal && stopGameRequestedBy !== null && stopGameRequestedBy !== playerNumber}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStopGameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Stop Game Request</Text>
            
            <Text style={styles.modalSubtitle}>
              {opponentName} wants to stop the game.
            </Text>
            
            <Text style={styles.modalText}>
              Do you accept?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.greenButton]}
                onPress={handleAcceptStopGame}
              >
                <Text style={styles.modalButtonText}>Accept</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.redButton]}
                onPress={handleRejectStopGame}
              >
                <Text style={styles.modalButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  roomInfo: {
    alignItems: 'flex-end',
  },
  roomText: {
    fontSize: 12,
    color: '#FFC30B',
    fontWeight: 'bold',
  },
  playerIndicator: {
    padding: 15,
    alignItems: 'center',
  },
  playerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  playSign: {
    color: '#4CAF50',
    fontSize: 28,
  },
  playerNames: {
    fontSize: 14,
    color: '#333',
  },
  connectionStatus: {
    padding: 10,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  connectionStatusError: {
    backgroundColor: '#f44336',
  },
  connectionStatusWarning: {
    backgroundColor: '#ff9800',
  },
  connectionStatusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
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
  winningPiece: {
    backgroundColor: '#C0C0C0',
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
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: '#666',
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
  redButton: {
    backgroundColor: '#f44336',
  },
  orangeButton: {
    backgroundColor: '#ff9800',
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
    flexWrap: 'wrap',
    gap: 10,
  },
  footerButton: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#FFC30B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

