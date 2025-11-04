"use client";

import React, { useState, useEffect } from 'react';
import { soundManager } from '../utils/sounds';
import { useGameLogic } from '../hooks/useGameLogic';
import GameCanvas from './GameCanvas';

interface AIGameProps {
  onBackToMenu: () => void;
  initialDifficulty?: string;
  initialTimer?: number;
  backgroundColor?: 'yellow' | 'black';
}

export default function AIGame({ onBackToMenu, initialDifficulty = 'medium', initialTimer = 15, backgroundColor = 'yellow' }: AIGameProps) {
  const [timeLimit] = useState(initialTimer);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(0.3);
  const [aiDifficulty, setAiDifficulty] = useState(initialDifficulty);
  // const [playerSkillLevel, setPlayerSkillLevel] = useState(0); // Dynamic difficulty tracking (currently unused)
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const { gameState, handleCellClick, resetGame } = useGameLogic({
    timeLimit,
    startingPlayer: 2, // AI goes first in classic mode
    pauseTimer: timeLimit === 0 // Pause timer if "No timer" is selected
  });

  // Initialize mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize sound manager settings
  React.useEffect(() => {
    soundManager.setVolume(volume);
    soundManager.setMuted(!soundEnabled);
  }, [volume, soundEnabled]);

  // Show popup when game ends
  React.useEffect(() => {
    if (gameState.winner > 0) {
      const winText = gameState.winner === 1 ? 'You win!' : 'You lost!';
      setWinMessage(`${winText} 🐝`);
      setShowWinPopup(true);
      
      if (gameState.winner === 1) {
        soundManager.playVictorySound();
      } else {
        soundManager.playDefeatSound();
      }
    } else if (!gameState.isGameActive && gameState.winner === 0) {
      setWinMessage('Game Over - Draw! 🐝');
      setShowWinPopup(true);
    } else if (gameState.timeLeft === 0 && timeLimit > 0) {
      // Only check for timeout if timer is enabled
      const winText = gameState.currentPlayer === 1 ? 'You lost due to time limit!' : 'You win due to time limit!';
      setWinMessage(`${winText} 🐝`);
      setShowWinPopup(true);
    }
  }, [gameState.winner, gameState.isGameActive, gameState.timeLeft, gameState.currentPlayer, timeLimit]);

  // Handle difficulty change - end current game
  const handleDifficultyChange = (newDifficulty: string) => {
    setAiDifficulty(newDifficulty);
    // End the current game by resetting it
    resetGame();
    // Close settings dropdown
    setShowMobileSettings(false);
    if (soundEnabled) soundManager.playClickSound();
  };

  // Track game results for dynamic difficulty
  React.useEffect(() => {
    if (gameState.winner > 0) {
      if (gameState.winner === 1) {
        // updatePlayerSkillLevel('win'); // Human won (currently unused)
      } else if (gameState.winner === 2) {
        // updatePlayerSkillLevel('loss'); // AI won (currently unused)
      }
    }
  }, [gameState.winner]);

  // AI Move Functions - defined before getBestAIMove to avoid hoisting issues
  const getEasyAIMove = React.useCallback((availableCells: {row: number, col: number}[]) => {
    console.log('CLASSIC EASY AI: Called with', availableCells.length, 'available cells');
    // Easy AI: Very passive and random
    
    // Priority 1: Take winning move if available (only if obvious)
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = 2;
      if (checkWinCondition(testBoard, cell.row, cell.col, 2)) {
        console.log('CLASSIC EASY AI: Found winning move at', cell.row, cell.col);
        return cell;
      }
    }

    // Priority 2: Block if human can win immediately (but only 50% of the time)
    if (Math.random() > 0.5) {
      for (let cell of availableCells) {
        const testBoard = gameState.board.map(row => [...row]);
        testBoard[cell.row][cell.col] = 1;
        if (checkWinCondition(testBoard, cell.row, cell.col, 1)) {
          console.log('CLASSIC EASY AI: Blocking immediate win at', cell.row, cell.col);
          return cell;
        }
      }
    }

    // Priority 3: Random move (most of the time)
    console.log('CLASSIC EASY AI: Making random move');
    return availableCells[Math.floor(Math.random() * availableCells.length)];
  }, [gameState.board]);

  const getMediumAIMove = React.useCallback((availableCells: {row: number, col: number}[]) => {
    console.log('CLASSIC MEDIUM AI: Called with', availableCells.length, 'available cells');
    // Medium AI: Balanced strategy with good offense and defense
    
    // Priority 1: Take winning move if available
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = 2;
      if (checkWinCondition(testBoard, cell.row, cell.col, 2)) {
        console.log('CLASSIC MEDIUM AI: Found winning move at', cell.row, cell.col);
        return cell;
      }
    }

    // Priority 2: Block if human can win immediately
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = 1;
      if (checkWinCondition(testBoard, cell.row, cell.col, 1)) {
        console.log('CLASSIC MEDIUM AI: Blocking immediate win at', cell.row, cell.col);
        return cell;
      }
    }

    // Priority 3: Block 3-in-a-row threats
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = 1;
      if (checkThreeInARow(testBoard, cell.row, cell.col, 1)) {
        console.log('CLASSIC MEDIUM AI: Blocking 3-in-a-row at', cell.row, cell.col);
        return cell;
      }
    }

    // Priority 4: Create 3-in-a-row if it can lead to 5
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = 2;
      if (checkThreeInARow(testBoard, cell.row, cell.col, 2) && canReachFive(testBoard, cell.row, cell.col, 2)) {
        console.log('CLASSIC MEDIUM AI: Creating 3-in-a-row at', cell.row, cell.col);
        return cell;
      }
    }

    // Priority 5: Block 2-in-a-row threats
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = 1;
      if (checkTwoInARow(testBoard, cell.row, cell.col, 1)) {
        console.log('CLASSIC MEDIUM AI: Blocking 2-in-a-row at', cell.row, cell.col);
        return cell;
      }
    }

    // Priority 6: Create 2-in-a-row if it can lead to 5
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = 2;
      if (checkTwoInARow(testBoard, cell.row, cell.col, 2) && canReachFive(testBoard, cell.row, cell.col, 2)) {
        console.log('CLASSIC MEDIUM AI: Creating 2-in-a-row at', cell.row, cell.col);
        return cell;
      }
    }

    // Priority 7: Random move
    console.log('CLASSIC MEDIUM AI: Making random move');
    return availableCells[Math.floor(Math.random() * availableCells.length)];
  }, [gameState.board]);

  const getHardAIMove = React.useCallback((availableCells: {row: number, col: number}[]) => {
    console.log('CLASSIC HARD AI: Called with', availableCells.length, 'available cells');
    // Hard AI: Enhanced version with more aggressive strategies and better pattern recognition
    
    // Priority 1: Take winning move if available
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = 2;
      if (checkWinCondition(testBoard, cell.row, cell.col, 2)) {
        console.log('CLASSIC HARD AI: Found winning move at', cell.row, cell.col);
        return cell;
      }
    }

    // Priority 2: Block if human can win immediately
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = 1;
      if (checkWinCondition(testBoard, cell.row, cell.col, 1)) {
        console.log('CLASSIC HARD AI: Blocking immediate win at', cell.row, cell.col);
        return cell;
      }
    }

    // Priority 3: Block 4-in-a-row threats (critical!)
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = 1;
      if (checkFourInARow(testBoard, cell.row, cell.col, 1)) {
        console.log('CLASSIC HARD AI: Blocking 4-in-a-row at', cell.row, cell.col);
        return cell;
      }
    }

    // Priority 4: Create 4-in-a-row if possible
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = 2;
      if (checkFourInARow(testBoard, cell.row, cell.col, 2)) {
        console.log('CLASSIC HARD AI: Creating 4-in-a-row at', cell.row, cell.col);
        return cell;
      }
    }

    // Priority 5: Block 3-in-a-row threats
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = 1;
      if (checkThreeInARow(testBoard, cell.row, cell.col, 1)) {
        console.log('CLASSIC HARD AI: Blocking 3-in-a-row at', cell.row, cell.col);
        return cell;
      }
    }

    // Priority 6: Create 3-in-a-row if it can lead to 5
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = 2;
      if (checkThreeInARow(testBoard, cell.row, cell.col, 2) && canReachFive(testBoard, cell.row, cell.col, 2)) {
        console.log('CLASSIC HARD AI: Creating 3-in-a-row at', cell.row, cell.col);
        return cell;
      }
    }

    // Priority 7: Block 2-in-a-row threats
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = 1;
      if (checkTwoInARow(testBoard, cell.row, cell.col, 1)) {
        console.log('CLASSIC HARD AI: Blocking 2-in-a-row at', cell.row, cell.col);
        return cell;
      }
    }

    // Priority 8: Create 2-in-a-row if it can lead to 5
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = 2;
      if (checkTwoInARow(testBoard, cell.row, cell.col, 2) && canReachFive(testBoard, cell.row, cell.col, 2)) {
        console.log('CLASSIC HARD AI: Creating 2-in-a-row at', cell.row, cell.col);
        return cell;
      }
    }

    // Priority 9: Strategic positioning near existing pieces
    for (let cell of availableCells) {
      if (isNearHumanPiece(gameState.board, cell.row, cell.col)) {
        console.log('CLASSIC HARD AI: Strategic positioning at', cell.row, cell.col);
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
      console.log('CLASSIC HARD AI: Controlling center area');
      return centerCells[Math.floor(Math.random() * centerCells.length)];
    }

    // Priority 11: Random move
    console.log('CLASSIC HARD AI: Making random move');
    return availableCells[Math.floor(Math.random() * availableCells.length)];
  }, [gameState.board]);

  const getBestAIMove = React.useCallback((availableCells: {row: number, col: number}[]) => {
    console.log('CLASSIC AI: getBestAIMove called with difficulty:', aiDifficulty);
    if (aiDifficulty === 'easy') {
      console.log('CLASSIC AI: Using Easy AI');
      return getEasyAIMove(availableCells);
    } else if (aiDifficulty === 'medium') {
      console.log('CLASSIC AI: Using Medium AI');
      return getMediumAIMove(availableCells);
    } else {
      console.log('CLASSIC AI: Using Hard AI');
      return getHardAIMove(availableCells);
    }
  }, [aiDifficulty, getEasyAIMove, getMediumAIMove, getHardAIMove]);

  const makeAIMove = React.useCallback(() => {
    // Get available cells
    const availableCells = [];
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        if (gameState.board[row][col] === 0) {
          availableCells.push({ row, col });
        }
      }
    }

    if (availableCells.length === 0) return;

    // Always call getBestAIMove to get the proper AI strategy
    const selectedCell = getBestAIMove(availableCells);

    // Make the AI move
    handleCellClick(selectedCell.row, selectedCell.col);
  }, [gameState.board, handleCellClick, getBestAIMove]);

  // AI move logic
  React.useEffect(() => {
    if (gameState.currentPlayer === 2 && gameState.isGameActive && gameState.winner === 0) {
      // AI's turn - make a move after a short delay
      const timer = setTimeout(() => {
        makeAIMove();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentPlayer, gameState.isGameActive, gameState.winner, makeAIMove]);

  // Helper function to find gap blocking moves (block 3-in-a-row with gaps on either side)
  const findGapBlockingMoves = (availableCells: {row: number, col: number}[]): {row: number, col: number}[] => {
    const gapBlockingMoves: {row: number, col: number}[] = [];
    
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = 1; // Simulate human move
      
      const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
      
      for (let [dRow, dCol] of directions) {
        if (checkGapPattern(testBoard, cell.row, cell.col, dRow, dCol, 1)) {
          gapBlockingMoves.push(cell);
          break; // Found a gap pattern in this direction, no need to check others
        }
      }
    }
    
    return gapBlockingMoves;
  };

  // Helper function to check for gap patterns (like X _ X X or X X _ X)
  const checkGapPattern = (board: (0 | 1 | 2 | 3)[][], row: number, col: number, dRow: number, dCol: number, player: 1 | 2): boolean => {
    // Check patterns: _ X X X _, X _ X X, X X _ X, X _ _ X X, X X _ _ X, etc.
    const patterns = [
      // Pattern: _ X X X _ (gaps on both sides - very dangerous!)
      () => {
        const pos1 = {row: row + dRow, col: col + dCol};
        const pos2 = {row: row + 2 * dRow, col: col + 2 * dCol};
        const pos3 = {row: row + 3 * dRow, col: col + 3 * dCol};
        const neg1 = {row: row - dRow, col: col - dCol};
        const pos4 = {row: row + 4 * dRow, col: col + 4 * dCol};
        
        return (isValidPosition(pos1) && board[pos1.row][pos1.col] === player &&
                isValidPosition(pos2) && board[pos2.row][pos2.col] === player &&
                isValidPosition(pos3) && board[pos3.row][pos3.col] === player &&
                isValidPosition(neg1) && board[neg1.row][neg1.col] === 0 &&
                isValidPosition(pos4) && board[pos4.row][pos4.col] === 0);
      },
      
      // Pattern: X _ X X (gap at position -1)
      () => {
        const pos1 = {row: row + dRow, col: col + dCol};
        const pos2 = {row: row + 2 * dRow, col: col + 2 * dCol};
        const pos3 = {row: row + 3 * dRow, col: col + 3 * dCol};
        const neg1 = {row: row - dRow, col: col - dCol};
        
        return (isValidPosition(pos1) && board[pos1.row][pos1.col] === player &&
                isValidPosition(pos2) && board[pos2.row][pos2.col] === player &&
                isValidPosition(pos3) && board[pos3.row][pos3.col] === player &&
                isValidPosition(neg1) && board[neg1.row][neg1.col] === 0);
      },
      
      // Pattern: X X _ X (gap at position +1)
      () => {
        const neg1 = {row: row - dRow, col: col - dCol};
        const neg2 = {row: row - 2 * dRow, col: col - 2 * dCol};
        const pos1 = {row: row + dRow, col: col + dCol};
        
        return (isValidPosition(neg1) && board[neg1.row][neg1.col] === player &&
                isValidPosition(neg2) && board[neg2.row][neg2.col] === player &&
                isValidPosition(pos1) && board[pos1.row][pos1.col] === player &&
                isValidPosition({row: row + 2 * dRow, col: col + 2 * dCol}) && board[row + 2 * dRow][col + 2 * dCol] === 0);
      },
      
      // Pattern: X _ _ X X (gap at positions -1, -2)
      () => {
        const pos1 = {row: row + dRow, col: col + dCol};
        const pos2 = {row: row + 2 * dRow, col: col + 2 * dCol};
        const pos3 = {row: row + 3 * dRow, col: col + 3 * dCol};
        const neg1 = {row: row - dRow, col: col - dCol};
        const neg2 = {row: row - 2 * dRow, col: col - 2 * dCol};
        
        return (isValidPosition(pos1) && board[pos1.row][pos1.col] === player &&
                isValidPosition(pos2) && board[pos2.row][pos2.col] === player &&
                isValidPosition(pos3) && board[pos3.row][pos3.col] === player &&
                isValidPosition(neg1) && board[neg1.row][neg1.col] === 0 &&
                isValidPosition(neg2) && board[neg2.row][neg2.col] === 0);
      },
      
      // Pattern: X X _ _ X (gap at positions +1, +2)
      () => {
        const neg1 = {row: row - dRow, col: col - dCol};
        const neg2 = {row: row - 2 * dRow, col: col - 2 * dCol};
        const pos1 = {row: row + dRow, col: col + dCol};
        const pos2 = {row: row + 2 * dRow, col: col + 2 * dCol};
        
        return (isValidPosition(neg1) && board[neg1.row][neg1.col] === player &&
                isValidPosition(neg2) && board[neg2.row][neg2.col] === player &&
                isValidPosition(pos1) && board[pos1.row][pos1.col] === player &&
                isValidPosition(pos2) && board[pos2.row][pos2.col] === 0 &&
                isValidPosition({row: row + 3 * dRow, col: col + 3 * dCol}) && board[row + 3 * dRow][col + 3 * dCol] === 0);
      }
    ];
    
    // Check all patterns
    for (let patternCheck of patterns) {
      if (patternCheck()) {
        return true;
      }
    }
    
    return false;
  };

  // Helper function to check if position is valid
  const isValidPosition = (pos: {row: number, col: number}): boolean => {
    return pos.row >= 0 && pos.row < 10 && pos.col >= 0 && pos.col < 10;
  };

  // Helper function to find double threat moves (moves that create or block two winning chances)
  const findDoubleThreatMoves = (availableCells: {row: number, col: number}[], player: 1 | 2): {row: number, col: number}[] => {
    const doubleThreatMoves: {row: number, col: number}[] = [];
    
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = player;
      
      let threatCount = 0;
      const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
      
      for (let [dRow, dCol] of directions) {
        if (checkOpenLine(testBoard, cell.row, cell.col, dRow, dCol, player, 4)) {
          threatCount++;
        }
      }
      
      if (threatCount >= 2) {
        doubleThreatMoves.push(cell);
      }
    }
    
    return doubleThreatMoves;
  };

  // Helper function to find the strongest attack moves (extend 4s and 3s, especially open lines)
  const findStrongestAttackMoves = (availableCells: {row: number, col: number}[]): {row: number, col: number}[] => {
    const attackMoves: {row: number, col: number, score: number}[] = [];
    
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = 2;
      
      let score = 0;
      const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
      
      for (let [dRow, dCol] of directions) {
        // Check for open 4-in-a-row (highest priority)
        if (checkOpenLine(testBoard, cell.row, cell.col, dRow, dCol, 2, 4)) {
          score += 100;
        }
        // Check for open 3-in-a-row
        else if (checkOpenLine(testBoard, cell.row, cell.col, dRow, dCol, 2, 3)) {
          score += 50;
        }
        // Check for semi-open 3-in-a-row
        else if (checkSemiOpenLine(testBoard, cell.row, cell.col, dRow, dCol, 2, 3)) {
          score += 25;
        }
        // Check for open 2-in-a-row
        else if (checkOpenLine(testBoard, cell.row, cell.col, dRow, dCol, 2, 2)) {
          score += 10;
        }
      }
      
      if (score > 0) {
        attackMoves.push({...cell, score});
      }
    }
    
    // Sort by score (highest first) and return moves
    attackMoves.sort((a, b) => b.score - a.score);
    return attackMoves.map(move => ({row: move.row, col: move.col}));
  };

  // Helper function to find dangerous threat moves (block opponent's open 4s, then open 3s)
  const findDangerousThreatMoves = (availableCells: {row: number, col: number}[]): {row: number, col: number}[] => {
    const threatMoves: {row: number, col: number, priority: number}[] = [];
    
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = 1;
      
      let maxPriority = 0;
      const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
      
      for (let [dRow, dCol] of directions) {
        // Check for open 4-in-a-row (highest priority)
        if (checkOpenLine(testBoard, cell.row, cell.col, dRow, dCol, 1, 4)) {
          maxPriority = Math.max(maxPriority, 100);
        }
        // Check for open 3-in-a-row
        else if (checkOpenLine(testBoard, cell.row, cell.col, dRow, dCol, 1, 3)) {
          maxPriority = Math.max(maxPriority, 50);
        }
        // Check for semi-open 3-in-a-row
        else if (checkSemiOpenLine(testBoard, cell.row, cell.col, dRow, dCol, 1, 3)) {
          maxPriority = Math.max(maxPriority, 25);
        }
      }
      
      if (maxPriority > 0) {
        threatMoves.push({...cell, priority: maxPriority});
      }
    }
    
    // Sort by priority (highest first) and return moves
    threatMoves.sort((a, b) => b.priority - a.priority);
    return threatMoves.map(move => ({row: move.row, col: move.col}));
  };

  // Helper function to find best positional moves (near AI stones or board center)
  const findBestPositionalMoves = (availableCells: {row: number, col: number}[]): {row: number, col: number}[] => {
    const positionalMoves: {row: number, col: number, score: number}[] = [];
    
    for (let cell of availableCells) {
      let score = 0;
      
      // Distance from center (prefer moves closer to center)
      const centerDistance = Math.abs(cell.row - 4.5) + Math.abs(cell.col - 4.5);
      score += Math.max(0, 10 - centerDistance);
      
      // Proximity to AI stones (prefer moves near existing AI stones)
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
          if (gameState.board[row][col] === 2) {
            const distance = Math.abs(cell.row - row) + Math.abs(cell.col - col);
            if (distance <= 2) {
              score += 5 - distance;
            }
          }
        }
      }
      
      // Avoid moves that are too isolated
      let nearbyStones = 0;
      for (let row = Math.max(0, cell.row - 2); row <= Math.min(9, cell.row + 2); row++) {
        for (let col = Math.max(0, cell.col - 2); col <= Math.min(9, cell.col + 2); col++) {
          if (gameState.board[row][col] !== 0) {
            nearbyStones++;
          }
        }
      }
      
      if (nearbyStones === 0) {
        score -= 5; // Penalty for completely isolated moves
      }
      
      positionalMoves.push({...cell, score});
    }
    
    // Sort by score (highest first) and return moves
    positionalMoves.sort((a, b) => b.score - a.score);
    return positionalMoves.map(move => ({row: move.row, col: move.col}));
  };

  // Helper function to check if a line is open (can extend to 5)
  const checkOpenLine = (board: (0 | 1 | 2 | 3)[][], row: number, col: number, dRow: number, dCol: number, player: 1 | 2, targetCount: number): boolean => {
    let count = 1; // Count the current piece
    
    // Count in positive direction
    for (let i = 1; i < 5; i++) {
      const newRow = row + i * dRow;
      const newCol = col + i * dCol;
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
        count++;
      } else {
        break;
      }
    }
    
    // Count in negative direction
    for (let i = 1; i < 5; i++) {
      const newRow = row - i * dRow;
      const newCol = col - i * dCol;
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
        count++;
      } else {
        break;
      }
    }
    
    if (count < targetCount) return false;
    
    // Check if the line can extend to 5 (has open spaces on both ends)
    const posEndRow = row + count * dRow;
    const posEndCol = col + count * dCol;
    const negEndRow = row - count * dRow;
    const negEndCol = col - count * dCol;
    
    const posOpen = (posEndRow < 0 || posEndRow >= 10 || posEndCol < 0 || posEndCol >= 10 || board[posEndRow][posEndCol] === 0);
    const negOpen = (negEndRow < 0 || negEndRow >= 10 || negEndCol < 0 || negEndCol >= 10 || board[negEndRow][negEndCol] === 0);
    
    return posOpen && negOpen;
  };

  // Helper function to check if a line is semi-open (can extend to 5 in one direction)
  const checkSemiOpenLine = (board: (0 | 1 | 2 | 3)[][], row: number, col: number, dRow: number, dCol: number, player: 1 | 2, targetCount: number): boolean => {
    let count = 1; // Count the current piece
    
    // Count in positive direction
    for (let i = 1; i < 5; i++) {
      const newRow = row + i * dRow;
      const newCol = col + i * dCol;
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
        count++;
      } else {
        break;
      }
    }
    
    // Count in negative direction
    for (let i = 1; i < 5; i++) {
      const newRow = row - i * dRow;
      const newCol = col - i * dCol;
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
        count++;
      } else {
        break;
      }
    }
    
    if (count < targetCount) return false;
    
    // Check if the line can extend to 5 in at least one direction
    const posEndRow = row + count * dRow;
    const posEndCol = col + count * dCol;
    const negEndRow = row - count * dRow;
    const negEndCol = col - count * dCol;
    
    const posOpen = (posEndRow < 0 || posEndRow >= 10 || posEndCol < 0 || posEndCol >= 10 || board[posEndRow][posEndCol] === 0);
    const negOpen = (negEndRow < 0 || negEndRow >= 10 || negEndCol < 0 || negEndCol >= 10 || board[negEndRow][negEndCol] === 0);
    
    return posOpen || negOpen;
  };

  const findThreatCells = (availableCells: {row: number, col: number}[], player: 1 | 2) => {
    const threats = [];
    
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = player;
      
      if (checkThreeInARow(testBoard, cell.row, cell.col, player)) {
        threats.push(cell);
      }
    }
    
    return threats;
  };

  const findTwoInARowCells = (availableCells: {row: number, col: number}[], player: 1 | 2) => {
    const threats = [];
    
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = player;
      
      if (checkTwoInARow(testBoard, cell.row, cell.col, player)) {
        threats.push(cell);
      }
    }
    
    return threats;
  };

  // Enhanced pattern blocking for better defense
  const findPatternBlockingMoves = (availableCells: {row: number, col: number}[]) => {
    const blockingMoves = [];
    
    for (let cell of availableCells) {
      const testBoard = gameState.board.map(row => [...row]);
      testBoard[cell.row][cell.col] = 1; // Simulate human move
      
      // Check if this move would create a dangerous pattern for human
      if (checkThreeInARow(testBoard, cell.row, cell.col, 1) || 
          checkTwoInARow(testBoard, cell.row, cell.col, 1)) {
        blockingMoves.push(cell);
      }
    }
    
    return blockingMoves;
  };

  // Find existing threats on the board that need to be blocked
  const findExistingThreats = (availableCells: {row: number, col: number}[]) => {
    const threats = [];
    
    // Check all directions from each available cell for existing human threats
    for (let cell of availableCells) {
      const directions = [
        [0, 1],   // horizontal
        [1, 0],   // vertical
        [1, 1],   // diagonal /
        [1, -1]   // diagonal \
      ];

      for (const [dRow, dCol] of directions) {
        let humanCount = 0;
        let emptyCount = 0;
        let threatCells = [];

        // Check in both directions from this cell
        for (let i = -4; i <= 4; i++) {
          if (i === 0) continue; // Skip the center cell
          
          const newRow = cell.row + i * dRow;
          const newCol = cell.col + i * dCol;
          
          if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10) {
            if (gameState.board[newRow][newCol] === 1) {
              humanCount++;
            } else if (gameState.board[newRow][newCol] === 0) {
              emptyCount++;
              threatCells.push({row: newRow, col: newCol});
            }
          }
        }

        // If we have 3+ human pieces and at least 1 empty space, this is a threat
        if (humanCount >= 3 && emptyCount >= 1) {
          // Find which empty cells would complete the threat
          for (let threatCell of threatCells) {
            if (availableCells.some(ac => ac.row === threatCell.row && ac.col === threatCell.col)) {
              threats.push(threatCell);
            }
          }
        }
      }
    }
    
    return threats;
  };

  const checkThreeInARow = (board: (0 | 1 | 2 | 3)[][], row: number, col: number, player: 1 | 2) => {
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal /
      [1, -1]   // diagonal \
    ];

    for (const [dRow, dCol] of directions) {
      let count = 1;

      // Check in positive direction
      for (let i = 1; i < 4; i++) {
        const newRow = row + i * dRow;
        const newCol = col + i * dCol;
        if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
          count++;
        } else {
          break;
        }
      }

      // Check in negative direction
      for (let i = 1; i < 4; i++) {
        const newRow = row - i * dRow;
        const newCol = col - i * dCol;
        if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
          count++;
        } else {
          break;
        }
      }

      if (count >= 3) {
        console.log('checkThreeInARow: Found 3-in-a-row for player', player, 'at', row, col, 'direction', dRow, dCol, 'count', count);
        return true;
      }
    }

    return false;
  };

  const checkTwoInARow = (board: (0 | 1 | 2 | 3)[][], row: number, col: number, player: 1 | 2) => {
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal /
      [1, -1]   // diagonal \
    ];

    for (const [dRow, dCol] of directions) {
      let count = 1;

      // Check in positive direction
      for (let i = 1; i < 3; i++) {
        const newRow = row + i * dRow;
        const newCol = col + i * dCol;
        if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
          count++;
        } else {
          break;
        }
      }

      // Check in negative direction
      for (let i = 1; i < 3; i++) {
        const newRow = row - i * dRow;
        const newCol = col - i * dCol;
        if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
          count++;
        } else {
          break;
        }
      }

      if (count >= 2) {
        console.log('checkTwoInARow: Found 2-in-a-row for player', player, 'at', row, col, 'direction', dRow, dCol, 'count', count);
        return true;
      }
    }

    return false;
  };

  const checkFourInARow = (board: (0 | 1 | 2 | 3)[][], row: number, col: number, player: 1 | 2) => {
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal /
      [1, -1]   // diagonal \
    ];

    for (const [dRow, dCol] of directions) {
      let count = 1;

      // Check in positive direction
      for (let i = 1; i < 5; i++) {
        const newRow = row + i * dRow;
        const newCol = col + i * dCol;
        if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
          count++;
        } else {
          break;
        }
      }

      // Check in negative direction
      for (let i = 1; i < 5; i++) {
        const newRow = row - i * dRow;
        const newCol = col - i * dCol;
        if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
          count++;
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

  const isNearHumanPiece = (board: (0 | 1 | 2 | 3)[][], row: number, col: number) => {
    // Check if there's a human piece within 2 cells in any direction
    for (let dRow = -2; dRow <= 2; dRow++) {
      for (let dCol = -2; dCol <= 2; dCol++) {
        if (dRow === 0 && dCol === 0) continue;
        const newRow = row + dRow;
        const newCol = col + dCol;
        if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === 1) {
          return true;
        }
      }
    }
    return false;
  };

  const canReachFive = (board: (0 | 1 | 2 | 3)[][], row: number, col: number, player: 1 | 2): boolean => {
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1]
    ];

    for (let [dr, dc] of directions) {
      let count = 1;
      let emptySpaces = 0;
      
      for (let direction = -1; direction <= 1; direction += 2) {
        for (let i = 1; i <= 4; i++) {
          const newRow = row + (dr * i * direction);
          const newCol = col + (dc * i * direction);
          
          if (newRow < 0 || newRow >= 10 || newCol < 0 || newCol >= 10) break;
          
          if (board[newRow][newCol] === player) {
            count++;
          } else if (board[newRow][newCol] === 0) {
            emptySpaces++;
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

  const checkWinCondition = (board: (0 | 1 | 2 | 3)[][], row: number, col: number, player: 1 | 2) => {
    console.log('checkWinCondition: Called for player', player, 'at', row, col);
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal /
      [1, -1]   // diagonal \
    ];

    for (const [dRow, dCol] of directions) {
      let count = 1;

      // Check in positive direction
      for (let i = 1; i < 5; i++) {
        const newRow = row + i * dRow;
        const newCol = col + i * dCol;
        if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
          count++;
        } else {
          break;
        }
      }

      // Check in negative direction
      for (let i = 1; i < 5; i++) {
        const newRow = row - i * dRow;
        const newCol = col - i * dCol;
        if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
          count++;
        } else {
          break;
        }
      }

      if (count >= 5) {
        console.log('checkWinCondition: Found 5-in-a-row for player', player, 'at', row, col, 'direction', dRow, dCol, 'count', count);
        return true;
      }
    }

    console.log('checkWinCondition: No win found for player', player, 'at', row, col);
    return false;
  };

  const backgroundStyle = backgroundColor === 'yellow' 
    ? 'linear-gradient(135deg, #FFC30B 0%, #FFD700 50%, #FFC30B 100%)'
    : 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)';

  return (
    <div style={{ 
      background: backgroundStyle,
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Mobile-optimized header */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(10px)',
        padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        zIndex: 10
      }}>
        {/* Left side: Menu button and title */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem' 
        }}>
          <button 
            onClick={() => {
              onBackToMenu();
              if (soundEnabled) soundManager.playClickSound();
            }}
            style={{
              padding: isMobile ? '0.5rem' : '0.5rem 0.75rem',
              fontSize: isMobile ? '1.2em' : '1em',
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
            {isMobile ? '🏠' : '🏠 Menu'}
          </button>
          
          <h1 style={{ 
            color: '#FFC30B', 
            margin: 0,
            fontSize: isMobile ? 'clamp(1.2rem, 4vw, 1.5rem)' : 'clamp(1.5rem, 3vw, 2rem)',
            textShadow: '2px 2px 0px black',
            fontWeight: 'bold'
          }}>
            🤖 AI
          </h1>
        </div>

        {/* Controls - stack on mobile */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '0.5rem' : '1rem',
          flexWrap: 'wrap'
        }}>
          {/* Play button - only show when game is over */}
          {(!gameState.isGameActive || gameState.winner > 0) && (
            <button
              onClick={() => {
                resetGame();
                if (soundEnabled) soundManager.playClickSound();
              }}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '1em',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: '2px solid black',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                minWidth: '60px',
                height: '40px'
              }}
            >
              ▶️
            </button>
          )}

          {/* Difficulty selector - hidden on mobile */}
          {!isMobile && (
            <select
              value={aiDifficulty}
              onChange={(e) => handleDifficultyChange(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.9em',
                fontWeight: 'bold',
                backgroundColor: '#FFC30B',
                color: 'black',
                border: '2px solid black',
                borderRadius: '8px',
                cursor: 'pointer',
                minWidth: '120px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <option value="easy" style={{ backgroundColor: 'white', color: 'black' }}>
                🟢 Easy
              </option>
              <option value="medium" style={{ backgroundColor: 'white', color: 'black' }}>
                🟡 Medium
              </option>
              <option value="hard" style={{ backgroundColor: 'white', color: 'black' }}>
                🔴 Hard
              </option>
            </select>
          )}

          {/* Sound control - hidden on mobile */}
          {!isMobile && (
            <button
              onClick={() => {
                const newSoundEnabled = !soundEnabled;
                setSoundEnabled(newSoundEnabled);
                soundManager.setMuted(!newSoundEnabled);
                if (newSoundEnabled) soundManager.playClickSound();
              }}
              style={{
                padding: isMobile ? '0.5rem' : '0.5rem 0.75rem',
                fontSize: '1em',
                backgroundColor: soundEnabled ? '#4CAF50' : '#f44336',
                color: 'white',
                border: '2px solid black',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          )}

          {/* Mobile Settings Icon */}
          {isMobile && (
            <button
              onClick={() => {
                setShowMobileSettings(!showMobileSettings);
                if (soundEnabled) soundManager.playClickSound();
              }}
              style={{
                padding: '0.5rem',
                fontSize: '1em',
                backgroundColor: '#FFC30B',
                color: 'black',
                border: '2px solid black',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '40px',
                height: '40px'
              }}
            >
              ⚙️
            </button>
          )}
          
          {/* Timer display - only show if timer is enabled */}
          {timeLimit > 0 && (
            <div style={{
              padding: isMobile ? '0.5rem' : '0.5rem 0.75rem',
              fontSize: isMobile ? '1em' : '0.9em',
              backgroundColor: '#FFC30B',
              color: 'black',
              border: '2px solid black',
              borderRadius: '8px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              minWidth: '80px',
              justifyContent: 'center'
            }}>
              ⏱️ {gameState.timeLeft}s
            </div>
          )}
        </div>
      </div>

      {/* Main game area - fills remaining space */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isMobile ? '1rem' : '2rem',
        position: 'relative'
      }}>
        {/* Game board with responsive sizing */}
        <div style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
            <GameCanvas
              gameState={gameState}
              onCellClick={(row, col) => {
                // Only allow human moves when it's player 1's turn
                if (gameState.currentPlayer === 1) {
                  handleCellClick(row, col);
                }
              }}
            />
        </div>
      </div>

      {/* Volume control (only when sound is enabled) */}
      {soundEnabled && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '0.5rem 1rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '0.85rem',
          borderTop: '1px solid rgba(0,0,0,0.1)'
        }}>
          <span style={{ color: '#333', fontWeight: 'bold' }}>🔊 Volume:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => {
              const newVolume = parseFloat(e.target.value);
              setVolume(newVolume);
              soundManager.setVolume(newVolume);
            }}
            style={{ 
              width: isMobile ? '120px' : '150px',
              accentColor: '#FFC30B'
            }}
          />
          <span style={{ color: '#666', fontSize: '0.8em' }}>
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}

      {/* Mobile Settings Dropdown */}
      {isMobile && showMobileSettings && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '10px',
          border: '2px solid black',
          padding: '1rem',
          minWidth: '200px',
          maxWidth: '90vw',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          zIndex: 1000,
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ 
            margin: '0 0 1rem 0', 
            color: '#FFC30B', 
            textAlign: 'center',
            fontSize: '1.1em',
            fontWeight: 'bold'
          }}>
            Settings
          </h3>
          
          {/* Difficulty Selector */}
          <div style={{
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}>
            <span style={{ fontWeight: 'bold', color: '#333' }}>Difficulty:</span>
            <select
              value={aiDifficulty}
              onChange={(e) => handleDifficultyChange(e.target.value)}
              style={{
                padding: '0.4rem 0.6rem',
                fontSize: '0.9em',
                fontWeight: 'bold',
                backgroundColor: '#FFC30B',
                color: 'black',
                border: '2px solid black',
                borderRadius: '6px',
                cursor: 'pointer',
                minWidth: '80px'
              }}
            >
              <option value="easy" style={{ backgroundColor: 'white', color: 'black' }}>
                🟢 Easy
              </option>
              <option value="medium" style={{ backgroundColor: 'white', color: 'black' }}>
                🟡 Medium
              </option>
              <option value="hard" style={{ backgroundColor: 'white', color: 'black' }}>
                🔴 Hard
              </option>
            </select>
          </div>

          {/* Sound Control */}
          <div style={{
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}>
            <span style={{ fontWeight: 'bold', color: '#333' }}>Sound:</span>
            <button
              onClick={() => {
                const newSoundEnabled = !soundEnabled;
                setSoundEnabled(newSoundEnabled);
                soundManager.setMuted(!newSoundEnabled);
                if (newSoundEnabled) soundManager.playClickSound();
              }}
              style={{
                padding: '0.4rem 0.6rem',
                fontSize: '1em',
                backgroundColor: soundEnabled ? '#4CAF50' : '#f44336',
                color: 'white',
                border: '2px solid black',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {soundEnabled ? '🔊 On' : '🔇 Off'}
            </button>
          </div>

          {/* Volume Control */}
          {soundEnabled && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem'
            }}>
              <span style={{ fontWeight: 'bold', color: '#333' }}>Volume:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    setVolume(newVolume);
                    soundManager.setVolume(newVolume);
                  }}
                  style={{ 
                    width: '80px',
                    accentColor: '#FFC30B'
                  }}
                />
                <span style={{ color: '#666', fontSize: '0.8em', minWidth: '30px' }}>
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={() => setShowMobileSettings(false)}
            style={{
              position: 'absolute',
              top: '5px',
              right: '8px',
              background: 'none',
              border: 'none',
              fontSize: '1.2em',
              cursor: 'pointer',
              color: '#666',
              fontWeight: 'bold'
            }}
          >
            ×
          </button>
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
              {winMessage.includes('You win') ? 'Sweet victory! 🍯' : winMessage.includes('AI win') ? 'The AI strikes back! 🍯' : 'Great game! 🍯'}
            </p>
            
            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
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
                onClick={() => {
                  setShowWinPopup(false);
                  onBackToMenu();
                }}
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
                Back to Menu
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
