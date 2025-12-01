"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { multiplayerService } from '../services/multiplayerService';
import { type GameMove } from '../lib/supabase';
import { soundManager } from '../utils/sounds';
import { GRID_SIZE, MULTIPLAYER_CELL_SIZE, BORDER_WIDTH, MULTIPLAYER_CANVAS_SIZE } from '../constants/gameConstants';
import { checkWinCondition, getWinningPieces } from '../utils/gameLogic';

interface RoomInfo {
  roomId: string;
  players: PlayerInfo[];
  isGameStarted: boolean;
  hostId: string;
}

interface PlayerInfo {
  id: string;
  name: string;
  playerNumber: 1 | 2;
  isHost: boolean;
}

interface MultiplayerGameProps {
  roomInfo: RoomInfo;
  playerNumber: 1 | 2;
  onBackToLobby: () => void;
}

export function MultiplayerGame({ roomInfo, playerNumber, onBackToLobby }: MultiplayerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [board, setBoard] = useState<(0 | 1 | 2)[][]>(() => 
    Array(10).fill(null).map(() => Array(10).fill(0))
  );
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<0 | 1 | 2>(0);
  const [winningPieces, setWinningPieces] = useState<{ row: number; col: number }[]>([]);
  const [gameActive, setGameActive] = useState(true);
  const [animatingPieces, setAnimatingPieces] = useState<Map<string, { 
    player: 1 | 2; 
    startTime: number; 
    row: number; 
    col: number; 
  }>>(new Map());
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const [connectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [opponentName, setOpponentName] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [stopGameRequestedBy, setStopGameRequestedBy] = useState<1 | 2 | null>(null);
  const [showStopGameModal, setShowStopGameModal] = useState(false);

  // Use refs to track game state for callback checks (avoid stale closure)
  const gameActiveRef = useRef(true);
  const winnerRef = useRef<0 | 1 | 2>(0);

  // Use shared constants
  const CELL_SIZE = MULTIPLAYER_CELL_SIZE;
  const CANVAS_SIZE = MULTIPLAYER_CANVAS_SIZE;
  const ANIMATION_DURATION = 400;
  const animationFrameRef = useRef<number | undefined>(undefined);

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
            setShowWinPopup(true);
            
            if (isPlayerWin) {
              soundManager.playVictorySound();
            } else {
              soundManager.playDefeatSound();
            }
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

    // Start animation for the move
    const pieceKey = `${move.row}-${move.col}`;
    setAnimatingPieces(prev => new Map(prev).set(pieceKey, {
      player: move.player,
      startTime: Date.now(),
      row: move.row,
      col: move.col
    }));

    // Play sound for opponent moves
    if (move.player !== playerNumber) {
      soundManager.playBuzzSound();
    }
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
              setShowWinPopup(true);
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
      // Don't clear onMove handler - let it persist during the game
    };
  }, [roomInfo, playerNumber, applyMove, gameActive, stopGameRequestedBy]);

  // Check for win condition

  // Draw the game board with animations
  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentTime = Date.now();
    let needsRedraw = false;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw background
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw cells and pieces
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = col * (CELL_SIZE + BORDER_WIDTH) + BORDER_WIDTH;
        const y = row * (CELL_SIZE + BORDER_WIDTH) + BORDER_WIDTH;

        // Cell background
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        // Draw static pieces (already placed)
        const cellValue = board[row][col];
        const pieceKey = `${row}-${col}`;
        const animatingPiece = animatingPieces.get(pieceKey);

        if (cellValue !== 0) {
          let scale = 1;
          let opacity = 1;

          // Check if this piece is animating
          if (animatingPiece) {
            const elapsed = currentTime - animatingPiece.startTime;
            const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
            
            const easeOut = 1 - Math.pow(1 - progress, 3);
            scale = 0.1 + (0.9 * easeOut);
            opacity = easeOut;

            if (progress < 1) {
              needsRedraw = true;
            } else {
              setAnimatingPieces(prev => {
                const newMap = new Map(prev);
                newMap.delete(pieceKey);
                return newMap;
              });
            }
          }

          // Draw piece with animation effects
          ctx.save();
          ctx.globalAlpha = opacity;
          
          const centerX = x + CELL_SIZE / 2;
          const centerY = y + CELL_SIZE / 2;
          const radius = (CELL_SIZE / 3) * scale;

          const isWinningPiece = winningPieces.some(piece => piece.row === row && piece.col === col);
          
          if (cellValue === 1) {
            ctx.fillStyle = isWinningPiece ? '#C0C0C0' : '#000000'; // Silver for winning pieces, black otherwise
          } else {
            ctx.fillStyle = isWinningPiece ? '#C0C0C0' : '#FFC30B'; // Silver for winning pieces, yellow otherwise
          }

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();

          // Add glow effect for new pieces
          if (animatingPiece && scale < 0.8) {
            ctx.shadowColor = cellValue === 1 ? '#333333' : '#FFD700';
            ctx.shadowBlur = 10 * (1 - scale);
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }

          ctx.restore();
        }

        // Draw hover effect (only for current player's turn)
        if (hoveredCell && hoveredCell.row === row && hoveredCell.col === col && 
            cellValue === 0 && gameActive && currentPlayer === playerNumber) {
          ctx.save();
          ctx.globalAlpha = 0.4;
          
          const centerX = x + CELL_SIZE / 2;
          const centerY = y + CELL_SIZE / 2;
          const radius = CELL_SIZE / 3;

          if (playerNumber === 1) {
            ctx.fillStyle = '#000000'; // black preview
          } else {
            ctx.fillStyle = '#FFC30B'; // yellow preview
          }

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
        }

        // Cell borders
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = BORDER_WIDTH;
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }

    // Continue animation if needed
    if (needsRedraw) {
      animationFrameRef.current = requestAnimationFrame(drawGame);
    }
  }, [board, animatingPieces, hoveredCell, gameActive, currentPlayer, playerNumber, winningPieces, CELL_SIZE, CANVAS_SIZE]);

  // Start animation loop
  useEffect(() => {
    drawGame();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawGame]);

  // Handle canvas click
  const handleCanvasClick = async (event: React.MouseEvent<HTMLCanvasElement>) => {
    // Disable moves if game is not active, someone has won, or it's not the player's turn
    if (!gameActive || winner > 0 || currentPlayer !== playerNumber) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Ensure roomId is set before sending move
    const serviceRoomId = multiplayerService.getCurrentRoomId();
    if (!serviceRoomId) {
      await multiplayerService.recoverRoomFromCode(roomInfo.roomId);
      const recovered = multiplayerService.getCurrentRoomId();
      if (!recovered) {
        alert('Connection lost. Please refresh and rejoin the room.');
        return;
      }
    }

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const col = Math.floor((x - BORDER_WIDTH) / (CELL_SIZE + BORDER_WIDTH));
    const row = Math.floor((y - BORDER_WIDTH) / (CELL_SIZE + BORDER_WIDTH));

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE && board[row][col] === 0) {
      // Make the move locally
      const newBoard = board.map(row => [...row]);
      newBoard[row][col] = currentPlayer;
      setBoard(newBoard);

      // Add animation
      const animationKey = `${row}-${col}`;
      setAnimatingPieces(prev => new Map(prev).set(animationKey, {
        player: currentPlayer,
        startTime: Date.now(),
        row,
        col
      }));

      // Check for win
      const winResult = checkWinCondition(newBoard, row, col, currentPlayer);
      let newWinner: 0 | 1 | 2 = 0;
      let newGameActive: boolean = gameActive;
      
      if (winResult) {
        newWinner = currentPlayer;
        newGameActive = false;
        // Immediately disable the game to prevent further moves
        gameActiveRef.current = false;
        winnerRef.current = newWinner;
        setWinner(newWinner);
        setGameActive(false);
        // Get winner name from roomInfo for reliability
        const winnerPlayer = roomInfo.players.find(p => p.playerNumber === newWinner);
        const winnerName = winnerPlayer?.name || (newWinner === playerNumber ? playerName : opponentName);
        setWinMessage(`${winnerName} won! 🎉`);
        setShowWinPopup(true);
        if (newWinner === playerNumber) {
          soundManager.playVictorySound();
        } else {
          soundManager.playDefeatSound();
        }
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
      
      // Play sound
      soundManager.playBuzzSound();
    }
  };

  // Handle mouse move for hover effect
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentPlayer !== playerNumber || !gameActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const col = Math.floor((x - BORDER_WIDTH) / (CELL_SIZE + BORDER_WIDTH));
    const row = Math.floor((y - BORDER_WIDTH) / (CELL_SIZE + BORDER_WIDTH));

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      const newCell = { row, col };
      const isNewHover = !hoveredCell || hoveredCell.row !== row || hoveredCell.col !== col;
      
      if (isNewHover && board[row][col] === 0) {
        soundManager.playHoverSound();
      }
      
      setHoveredCell(newCell);
    } else {
      setHoveredCell(null);
    }
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  // Reset game state
  const resetGameState = () => {
    setBoard(Array(10).fill(null).map(() => Array(10).fill(0)));
    setCurrentPlayer(1);
    setWinner(0);
    setWinningPieces([]);
    setGameActive(true);
    setAnimatingPieces(new Map());
    setShowWinPopup(false);
    setWinMessage('');
    // Reset refs
    gameActiveRef.current = true;
    winnerRef.current = 0;
  };

  // Reset game (both players can restart)
  const resetGame = async () => {
    soundManager.playClickSound();
    
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
    soundManager.playClickSound();
    await multiplayerService.requestStopGame();
    setStopGameRequestedBy(playerNumber);
  };

  // Cancel stop game request
  const handleCancelStopRequest = async () => {
    soundManager.playClickSound();
    await multiplayerService.cancelStopGameRequest();
    setStopGameRequestedBy(null);
  };

  // Accept stop game request
  const handleAcceptStopGame = async () => {
    soundManager.playClickSound();
    await multiplayerService.acceptStopGame();
    setStopGameRequestedBy(null);
    setShowStopGameModal(false);
  };

  // Reject stop game request
  const handleRejectStopGame = async () => {
    soundManager.playClickSound();
    await multiplayerService.rejectStopGameRequest();
    setStopGameRequestedBy(null);
    setShowStopGameModal(false);
  };

  // Leave game
  const handleLeaveGame = async () => {
    await multiplayerService.leaveRoom();
    soundManager.playClickSound();
    onBackToLobby();
  };
  return (
    <div style={{ 
      backgroundColor: '#808080', 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{
        background: '#000000',
        paddingTop: '0',
        paddingBottom: '0',
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        borderBottomWidth: '2px',
        borderBottomStyle: 'solid',
        borderBottomColor: '#FFC30B',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={handleLeaveGame}
            style={{
              padding: '0.5rem 0.75rem',
              fontSize: '1em',
              backgroundColor: '#FFC30B',
              color: 'black',
              border: '2px solid black',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            🏠 Menu
          </button>
          
          <h1 style={{ 
            color: '#FFC30B', 
            margin: 0,
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            textShadow: '2px 2px 0px black',
            fontWeight: 'bold'
          }}>
            🐝 Bee-Five
          </h1>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.9em', color: '#FFC30B', marginBottom: '5px', fontWeight: 'bold' }}>
            You: {playerNumber === 1 ? 'Black' : 'Yellow'}
          </div>
          <div style={{ fontSize: '0.9em', color: '#FFC30B', fontWeight: 'bold' }}>
            {opponentName}: {playerNumber === 1 ? 'Yellow' : 'Black'}
          </div>
          <div style={{ fontSize: '0.8em', color: '#FFC30B', marginTop: '5px' }}>
            Room: {roomInfo.roomId}
          </div>
        </div>
      </div>

      {/* Current Player Indicator */}
      <div style={{
        padding: '15px',
        alignItems: 'center',
        justifyContent: 'center',
        display: 'flex'
      }}>
        <div style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#000'
        }}>
          <span style={{ color: '#4CAF50', fontSize: '28px' }}>▶</span> {currentPlayer === playerNumber ? 'Your Turn' : `${opponentName}'s Turn`}
        </div>
      </div>
      
      {/* Main game area */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1rem',
        position: 'relative',
        minHeight: 0,
        overflow: 'auto'
      }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            border: '3px solid #000',
            borderRadius: '10px',
            cursor: (gameActive && currentPlayer === playerNumber) ? 'pointer' : 'default',
            maxWidth: 'min(80vw, 80vh, 700px)',
            maxHeight: 'min(80vw, 80vh, 700px)',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
            margin: '0 auto'
          }}
        />
      </div>
      {/* Footer */}
      <div style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: '0',
        paddingBottom: '0',
        paddingLeft: '15px',
        paddingRight: '15px',
        backgroundColor: '#000000',
        borderTopWidth: '2px',
        borderTopStyle: 'solid',
        borderTopColor: '#FFC30B',
        display: 'flex',
        gap: '15px',
        flexWrap: 'wrap'
      }}>
        {/* Stop Game Button - shown for both players when game is active and no stop request */}
        {gameActive && !stopGameRequestedBy && (
          <button 
            onClick={handleRequestStopGame}
            disabled={connectionStatus !== 'connected' || winner > 0}
            style={{
              flex: 1,
              padding: '12px 20px',
              fontSize: '1em',
              backgroundColor: '#FFC30B',
              color: 'black',
              border: '2px solid black',
              borderRadius: '8px',
              cursor: (connectionStatus !== 'connected' || winner > 0) ? 'not-allowed' : 'pointer',
              opacity: (connectionStatus !== 'connected' || winner > 0) ? 0.5 : 1,
              fontWeight: 'bold',
              minWidth: '120px'
            }}
          >
            ⏸️ Stop
          </button>
        )}

        {/* Cancel Stop Request Button - shown when current player requested stop */}
        {stopGameRequestedBy === playerNumber && (
          <button 
            onClick={handleCancelStopRequest}
            disabled={connectionStatus !== 'connected'}
            style={{
              flex: 1,
              padding: '12px 20px',
              fontSize: '1em',
              backgroundColor: '#FFC30B',
              color: 'black',
              border: '2px solid black',
              borderRadius: '8px',
              cursor: connectionStatus !== 'connected' ? 'not-allowed' : 'pointer',
              opacity: connectionStatus !== 'connected' ? 0.5 : 1,
              fontWeight: 'bold',
              minWidth: '120px'
            }}
          >
            ❌ Cancel
          </button>
        )}

        {/* Restart Game Button - shown for both players when game is not active, after win, or when game is stopped */}
        {(!gameActive || winner > 0) && (
          <button 
            onClick={resetGame}
            disabled={connectionStatus !== 'connected'}
            style={{
              flex: 1,
              padding: '12px 20px',
              fontSize: '1em',
              backgroundColor: '#FFC30B',
              color: 'black',
              border: '2px solid black',
              borderRadius: '8px',
              cursor: connectionStatus !== 'connected' ? 'not-allowed' : 'pointer',
              opacity: connectionStatus !== 'connected' ? 0.5 : 1,
              fontWeight: 'bold',
              minWidth: '120px'
            }}
          >
            🔄 Restart
          </button>
        )}
        
        <button 
          onClick={handleLeaveGame}
          style={{
            flex: 1,
            padding: '12px 20px',
            fontSize: '1em',
            backgroundColor: '#FFC30B',
            color: 'black',
            border: '2px solid black',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            minWidth: '120px'
          }}
        >
          🏠 Home
        </button>
      </div>

      {/* Connection Status Indicator */}
      {connectionStatus !== 'connected' && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '10px 15px',
          backgroundColor: connectionStatus === 'disconnected' ? '#f44336' : '#ff9800',
          color: 'white',
          borderRadius: '5px',
          border: '2px solid black',
          fontSize: '0.9em'
        }}>
          {connectionStatus === 'disconnected' ? '❌ Disconnected' : '🔄 Reconnecting...'}
        </div>
      )}

      {/* Winning Popup Modal */}
      {showWinPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            backgroundColor: '#FFC30B',
            padding: '40px',
            borderRadius: '20px',
            border: '4px solid black',
            textAlign: 'center',
            minWidth: '300px',
            maxWidth: '90vw',
            position: 'relative',
            animation: 'popIn 0.5s ease-out',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            {/* Celebration Icons */}
            <div style={{
              fontSize: '4em',
              marginBottom: '20px',
              animation: 'bounce 1s ease-out infinite'
            }}>
              🐝
            </div>
            
            {/* Win Message */}
            <h1 style={{
              fontSize: '2.5em',
              color: 'black',
              marginBottom: '20px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}>
              {winMessage}
            </h1>
            
            {/* Subtitle */}
            <p style={{
              fontSize: '1.2em',
              color: '#333',
              marginBottom: '30px'
            }}>
              {winMessage.includes('You Win') ? 'Sweet victory! 🍯' : 'The hive strikes back! 🍯'}
            </p>
            
            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              {/* Restart button available for both players */}
              <button 
                onClick={() => {
                  resetGame();
                  setShowWinPopup(false);
                }}
                style={{
                  padding: '12px 24px',
                  fontSize: '1.1em',
                  fontWeight: 'bold',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: '2px solid black',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minWidth: '120px'
                }}
              >
                Play Again
              </button>
              
              <button 
                onClick={handleLeaveGame}
                style={{
                  padding: '12px 24px',
                  fontSize: '1.1em',
                  fontWeight: 'bold',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: '2px solid black',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minWidth: '120px'
                }}
              >
                Leave Game
              </button>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setShowWinPopup(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '1.5em',
                cursor: 'pointer',
                color: 'black',
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Stop Game Request Modal */}
      {showStopGameModal && stopGameRequestedBy && stopGameRequestedBy !== playerNumber && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1001,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            backgroundColor: '#FFC30B',
            padding: '40px',
            borderRadius: '20px',
            border: '4px solid black',
            textAlign: 'center',
            minWidth: '300px',
            maxWidth: '90vw',
            position: 'relative',
            animation: 'popIn 0.5s ease-out',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{
              fontSize: '1.8em',
              color: 'black',
              marginBottom: '20px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}>
              Stop Game Request
            </h2>
            
            <p style={{
              fontSize: '1.2em',
              color: '#333',
              marginBottom: '30px'
            }}>
              {opponentName} wants to stop the game.
            </p>
            
            <p style={{
              fontSize: '1em',
              color: '#666',
              marginBottom: '30px'
            }}>
              Do you accept?
            </p>
            
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button 
                onClick={handleAcceptStopGame}
                style={{
                  padding: '12px 24px',
                  fontSize: '1.1em',
                  fontWeight: 'bold',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: '2px solid black',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minWidth: '120px'
                }}
              >
                Accept
              </button>
              
              <button 
                onClick={handleRejectStopGame}
                style={{
                  padding: '12px 24px',
                  fontSize: '1.1em',
                  fontWeight: 'bold',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: '2px solid black',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minWidth: '120px'
                }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
