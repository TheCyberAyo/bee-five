"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { simpleMultiplayerClient, type SimpleMove, type SimpleGameState } from '../utils/simpleMultiplayer';
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
  const [connectionStatus, _setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [opponentName, setOpponentName] = useState<string>('');

  // Use shared constants
  const CELL_SIZE = MULTIPLAYER_CELL_SIZE;
  const CANVAS_SIZE = MULTIPLAYER_CANVAS_SIZE;
  const ANIMATION_DURATION = 400;
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Initialize multiplayer event handlers
  useEffect(() => {
    // Find opponent name
    const opponent = roomInfo.players.find(p => p.playerNumber !== playerNumber);
    setOpponentName(opponent?.name || 'Opponent');

    // Set up simple multiplayer client
    simpleMultiplayerClient.createRoom(roomInfo.roomId, playerNumber);
    
    // Set up move callback
    simpleMultiplayerClient.onMove((move: SimpleMove) => {
      applyMove(move);
    });

    // Set up game state callback
    simpleMultiplayerClient.onGameState((gameState: SimpleGameState) => {
      setBoard(gameState.board);
      setCurrentPlayer(gameState.currentPlayer);
      setWinner(gameState.winner);
      setGameActive(gameState.gameActive);
    });

    return () => {
      // Clean up multiplayer client
      simpleMultiplayerClient.leaveRoom();
    };
  }, [roomInfo, playerNumber]);

  // Apply a move to the game board
  const applyMove = useCallback((move: SimpleMove) => {
    setBoard(prevBoard => {
      const newBoard = prevBoard.map(row => [...row]);
      newBoard[move.row][move.col] = move.player;
      return newBoard;
    });

    // Start animation for the move
    const pieceKey = `${move.row}-${move.col}`;
    setAnimatingPieces(prev => {
      const newMap = new Map(prev);
      newMap.set(pieceKey, {
        player: move.player,
        startTime: Date.now(),
        row: move.row,
        col: move.col
      });
      return newMap;
    });

    // Play sound for opponent moves
    if (move.player !== playerNumber) {
      soundManager.playBuzzSound();
    }

    // Check for win condition
    const newBoard = board.map(row => [...row]);
    newBoard[move.row][move.col] = move.player;
    
    const winningPieces = getWinningPieces(newBoard, move.row, move.col, move.player);
    if (winningPieces.length >= 5) {
      setTimeout(() => {
        setWinner(move.player);
        setWinningPieces(winningPieces);
        setGameActive(false);
        
        setTimeout(() => {
          const isPlayerWin = move.player === playerNumber;
          setWinMessage(isPlayerWin ? 'You Win!' : `${opponentName} Wins!`);
          setShowWinPopup(true);
          
          if (isPlayerWin) {
            soundManager.playVictorySound();
          } else {
            soundManager.playDefeatSound();
          }
        }, 500);
      }, 0);
    } else {
      // Switch turns
      setCurrentPlayer(move.player === 1 ? 2 : 1);
    }
  }, [board, playerNumber, opponentName]);

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
  }, [board, animatingPieces, hoveredCell, gameActive, currentPlayer, playerNumber]);

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
    if (!gameActive || winner > 0 || currentPlayer !== playerNumber) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

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
        setWinner(newWinner);
        setGameActive(false);
        setWinMessage(newWinner === playerNumber ? 'You won! 🐝' : 'Opponent won! 🐝');
        setShowWinPopup(true);
        soundManager.playVictorySound();
      } else {
        // Switch turns
        setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
      }

      // Send move to other players via simple multiplayer
      simpleMultiplayerClient.sendMove(row, col);
      
      // Send game state to other players
      const gameState: SimpleGameState = {
        board: newBoard,
        currentPlayer: currentPlayer === 1 ? 2 : 1,
        winner: newWinner,
        gameActive: newGameActive,
        lastMove: {
          row,
          col,
          player: currentPlayer,
          timestamp: Date.now(),
          roomId: roomInfo.roomId
        }
      };
      simpleMultiplayerClient.sendGameState(gameState);
      
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
  };

  // Reset game (host only)
  const resetGame = () => {
    resetGameState();
    soundManager.playClickSound();
  };

  // Leave game
  const handleLeaveGame = () => {
    simpleMultiplayerClient.leaveRoom();
    soundManager.playClickSound();
    onBackToLobby();
  };


  const isHost = roomInfo.players.find(p => p.playerNumber === playerNumber)?.isHost || false;

  return (
    <div style={{ 
      backgroundColor: '#FFC30B', 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center',
      padding: '20px'
    }}>
      {/* Header with game info */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        width: '100%', 
        maxWidth: '500px', 
        marginBottom: '20px' 
      }}>
        <div>
          <h1 style={{ color: 'black', margin: 0 }}>
            Bee-<span style={{ color: 'black' }}>Five</span>
          </h1>
          <div style={{ fontSize: '0.8em', color: 'black' }}>
            Room: {roomInfo.roomId}
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.9em', color: 'black', marginBottom: '5px' }}>
            You: {playerNumber === 1 ? 'Black' : 'Yellow'}
          </div>
          <div style={{ fontSize: '0.9em', color: 'black' }}>
            {opponentName}: {playerNumber === 1 ? 'Yellow' : 'Black'}
          </div>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          border: '2px solid black',
          borderRadius: '8px',
          cursor: (gameActive && currentPlayer === playerNumber) ? 'pointer' : 'default',
          marginBottom: '20px'
        }}
      />
      

      
      <div style={{ display: 'flex', gap: '15px' }}>
        {isHost && (
          <button 
            onClick={resetGame}
            disabled={connectionStatus !== 'connected'}
            style={{
              padding: '10px 20px',
              fontSize: '1em',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: '2px solid black',
              borderRadius: '8px',
              cursor: connectionStatus !== 'connected' ? 'not-allowed' : 'pointer',
              opacity: connectionStatus !== 'connected' ? 0.5 : 1
            }}
          >
            🔄 Restart Game
          </button>
        )}
        
        <button 
          onClick={handleLeaveGame}
          style={{
            padding: '10px 20px',
            fontSize: '1em',
            backgroundColor: '#f44336',
            color: 'white',
            border: '2px solid black',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          🚪 Leave Game
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
              {isHost && (
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
              )}
              
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
    </div>
  );
}
