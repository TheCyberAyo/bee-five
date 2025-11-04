"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { type GameState } from '../hooks/useGameLogic';
import { GRID_SIZE, CELL_SIZE, BORDER_WIDTH, CANVAS_SIZE, MULTIPLAYER_CELL_SIZE, MULTIPLAYER_CANVAS_SIZE } from '../constants/gameConstants';
import { useTheme } from '../hooks/useTheme';

export interface GameCanvasProps {
  gameState: GameState;
  onCellClick: (row: number, col: number) => void;
  gridColor?: string;
  gameNumber?: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  onCellClick,
  gridColor = '#87CEEB',
  gameNumber
}) => {
  // Use theme system
  const { currentTheme } = useTheme({ gameNumber });
  
  // Use theme colors if gameNumber is provided, otherwise fall back to gridColor prop
  const effectiveGridColor = gameNumber ? currentTheme.gridColor : gridColor;
  const effectivePlayer1Color = gameNumber ? currentTheme.player1Color : '#000000';
  const effectivePlayer2Color = gameNumber ? currentTheme.player2Color : '#FFC30B';
  const effectiveBorderColor = gameNumber ? currentTheme.borderColor : '#FFC30B';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [touchedCell, setTouchedCell] = useState<{ row: number; col: number } | null>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Clear hover effect when it becomes AI's turn
  useEffect(() => {
    if (gameState.currentPlayer === 2) {
      setHoveredCell(null);
    }
  }, [gameState.currentPlayer]);
  
  // Detect device type and calculate optimal sizing
  const isMobile = windowSize.width <= 768;
  const isTablet = windowSize.width <= 1024 && windowSize.width > 768;
  
  // Calculate optimal cell size based on screen size
  let currentCellSize: number;
  let currentCanvasSize: number;
  
  if (isMobile) {
    currentCellSize = MULTIPLAYER_CELL_SIZE;
    currentCanvasSize = MULTIPLAYER_CANVAS_SIZE;
  } else if (isTablet) {
    // Medium size for tablets
    currentCellSize = 50;
    currentCanvasSize = GRID_SIZE * currentCellSize + (GRID_SIZE + 1) * BORDER_WIDTH;
  } else {
    // Full size for desktop
    currentCellSize = CELL_SIZE;
    currentCanvasSize = CANVAS_SIZE;
  }

  // Optimized rendering function
  const drawGame = useCallback((ctx: CanvasRenderingContext2D) => {
    // Clear canvas
    ctx.clearRect(0, 0, currentCanvasSize, currentCanvasSize);

    // If in blind play mode, show a blank canvas with a message
    if (gameState.isBlindPlay) {
      // Draw a dark background
      ctx.fillStyle = '#2C2C2C';
      ctx.fillRect(0, 0, currentCanvasSize, currentCanvasSize);
      
      // Draw blind play message
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${Math.min(currentCellSize * 0.8, 24)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BLIND PLAY MODE', currentCanvasSize / 2, currentCanvasSize / 2 - 20);
      ctx.fillText('Click anywhere to place', currentCanvasSize / 2, currentCanvasSize / 2 + 20);
      ctx.fillText('your piece', currentCanvasSize / 2, currentCanvasSize / 2 + 50);
      return;
    }

    // Draw grid background
    ctx.fillStyle = effectiveGridColor;
    ctx.fillRect(0, 0, currentCanvasSize, currentCanvasSize);

    // Draw cells
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = col * (currentCellSize + BORDER_WIDTH) + BORDER_WIDTH;
        const y = row * (currentCellSize + BORDER_WIDTH) + BORDER_WIDTH;

        // Cell background
        ctx.fillStyle = effectiveGridColor;
        ctx.fillRect(x, y, currentCellSize, currentCellSize);

        // Cell content based on game state
        const cellValue = gameState.board[row][col];
        const isWinningPiece = gameState.winningPieces && gameState.winningPieces.some(piece => piece.row === row && piece.col === col);
        
        if (cellValue === 1) {
          ctx.fillStyle = isWinningPiece ? '#C0C0C0' : effectivePlayer1Color; // Silver for winning pieces
          ctx.beginPath();
          ctx.arc(x + currentCellSize / 2, y + currentCellSize / 2, currentCellSize / 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (cellValue === 2) {
          ctx.fillStyle = isWinningPiece ? '#C0C0C0' : effectivePlayer2Color; // Silver for winning pieces
          ctx.beginPath();
          ctx.arc(x + currentCellSize / 2, y + currentCellSize / 2, currentCellSize / 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (cellValue === 3) {
          // Blocked cell with bee picture - use theme accent color for background
          ctx.fillStyle = gameNumber ? currentTheme.accentColor : '#8B4513';
          ctx.fillRect(x, y, currentCellSize, currentCellSize);
          
          // Draw bee emoji
          ctx.font = `${currentCellSize * 0.6}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = effectivePlayer1Color;
          ctx.fillText('🐝', x + currentCellSize / 2, y + currentCellSize / 2);
        }

        // Draw mud zones (brown background with mud emoji)
        if (gameState.mudZones && gameState.mudZones.some(zone => zone.row === row && zone.col === col)) {
          ctx.fillStyle = '#8B4513'; // Brown color for mud
          ctx.fillRect(x, y, currentCellSize, currentCellSize);
          
          // Draw mud emoji
          ctx.font = `${currentCellSize * 0.6}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText('🟤', x + currentCellSize / 2, y + currentCellSize / 2);
        }

        // Touch feedback effect (stronger than hover) - only on empty cells (not mud zones)
        const isMudZone = gameState.mudZones && gameState.mudZones.some(zone => zone.row === row && zone.col === col);
        if (touchedCell && touchedCell.row === row && touchedCell.col === col && cellValue === 0 && !isMudZone) {
          const playerColor = gameState.currentPlayer === 1 ? effectivePlayer1Color : effectivePlayer2Color;
          ctx.fillStyle = playerColor.replace('rgb', 'rgba').replace(')', ', 0.5)');
          ctx.beginPath();
          ctx.arc(x + currentCellSize / 2, y + currentCellSize / 2, currentCellSize / 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Hover effect (only show if not touched and it's player's turn) - only on empty cells (not mud zones)
        else if (hoveredCell && hoveredCell.row === row && hoveredCell.col === col && cellValue === 0 && !isMudZone && gameState.currentPlayer === 1) {
          const playerColor = gameState.currentPlayer === 1 ? effectivePlayer1Color : effectivePlayer2Color;
          ctx.fillStyle = playerColor.replace('rgb', 'rgba').replace(')', ', 0.3)');
          ctx.beginPath();
          ctx.arc(x + currentCellSize / 2, y + currentCellSize / 2, currentCellSize / 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Cell borders
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = BORDER_WIDTH;
        ctx.strokeRect(x, y, currentCellSize, currentCellSize);
      }
    }

    // Draw winning line if game is over
    if (gameState.winner > 0) {
      drawWinningLine(ctx);
    }
  }, [gameState, hoveredCell, touchedCell, currentCellSize, currentCanvasSize, effectiveGridColor, effectivePlayer1Color, effectivePlayer2Color, gameNumber, currentTheme]);

  const drawWinningLine = (ctx: CanvasRenderingContext2D) => {
    // This would be enhanced to show the actual winning line
    // For now, just highlight the winner
    ctx.strokeStyle = gameState.winner === 1 ? effectivePlayer1Color : effectivePlayer2Color;
    ctx.lineWidth = 4;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(2, 2, currentCanvasSize - 4, currentCanvasSize - 4);
    ctx.setLineDash([]);
  };

  // Handle canvas click/touch
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameState.isGameActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    
    // Calculate scaling factor due to CSS maxWidth/maxHeight
    const scaleX = currentCanvasSize / rect.width;
    const scaleY = currentCanvasSize / rect.height;
    
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Convert canvas coordinates to grid coordinates
    const col = Math.floor((x - BORDER_WIDTH) / (currentCellSize + BORDER_WIDTH));
    const row = Math.floor((y - BORDER_WIDTH) / (currentCellSize + BORDER_WIDTH));

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      // In blind play mode, allow clicking anywhere (the game logic will handle valid moves)
      if (gameState.isBlindPlay) {
        onCellClick(row, col);
      } else {
        // Check if the cell is empty and not a mud zone
        const isMudZone = gameState.mudZones && gameState.mudZones.some(zone => zone.row === row && zone.col === col);
        if (gameState.board[row][col] === 0 && !isMudZone) {
          onCellClick(row, col);
        }
      }
    }
  };

  // Handle touch events for mobile devices
  const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    if (!gameState.isGameActive) return;

    // Prevent default touch behaviors like scrolling and zooming
    event.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    
    // Calculate scaling factor due to CSS maxWidth/maxHeight
    const scaleX = currentCanvasSize / rect.width;
    const scaleY = currentCanvasSize / rect.height;
    
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    // Convert canvas coordinates to grid coordinates
    const col = Math.floor((x - BORDER_WIDTH) / (currentCellSize + BORDER_WIDTH));
    const row = Math.floor((y - BORDER_WIDTH) / (currentCellSize + BORDER_WIDTH));

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      // Show touch feedback
      setTouchedCell({ row, col });
      
      // Clear touch feedback after a short delay
      setTimeout(() => {
        setTouchedCell(null);
      }, 150);
      
      // In blind play mode, allow clicking anywhere (the game logic will handle valid moves)
      if (gameState.isBlindPlay) {
        onCellClick(row, col);
      } else {
        // Check if the cell is empty and not a mud zone
        const isMudZone = gameState.mudZones && gameState.mudZones.some(zone => zone.row === row && zone.col === col);
        if (gameState.board[row][col] === 0 && !isMudZone) {
          onCellClick(row, col);
        }
      }
    }
  };

  // Prevent touch move from interfering with the game
  const handleTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
  };

  // Prevent touch end from causing issues
  const handleTouchEnd = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
  };

  // Handle mouse move for hover effect (only when it's player's turn)
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // Only show hover effect when it's the player's turn (currentPlayer === 1)
    if (gameState.currentPlayer !== 1) {
      setHoveredCell(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    
    // Calculate scaling factor due to CSS maxWidth/maxHeight
    const scaleX = currentCanvasSize / rect.width;
    const scaleY = currentCanvasSize / rect.height;
    
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const col = Math.floor((x - BORDER_WIDTH) / (currentCellSize + BORDER_WIDTH));
    const row = Math.floor((y - BORDER_WIDTH) / (currentCellSize + BORDER_WIDTH));

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      setHoveredCell({ row, col });
    } else {
      setHoveredCell(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  // Draw only when game state changes (no continuous animation loop)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw once when state changes
    drawGame(ctx);
  }, [drawGame, gameState, hoveredCell, touchedCell]);

  return (
    <canvas
      ref={canvasRef}
      width={currentCanvasSize}
      height={currentCanvasSize}
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        border: `2px solid ${effectiveBorderColor}`,
        borderRadius: '8px',
        cursor: gameState.isGameActive ? 'pointer' : 'default',
        maxWidth: isMobile ? '90vw' : 'min(80vw, 80vh, 700px)',
        maxHeight: isMobile ? '90vw' : 'min(80vw, 80vh, 700px)',
        width: 'auto',
        height: 'auto',
        objectFit: 'contain',
        touchAction: 'none', // Prevent default touch behaviors
        display: 'block',
        margin: '0 auto'
      }}
    />
  );
};

export default GameCanvas;