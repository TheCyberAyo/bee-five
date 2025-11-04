"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { checkWinCondition, getWinningPieces, isBoardFull, createEmptyBoard, createBoardWithBlocks, removeTwoBlockedCells, gameEndsWith3, gameEndsWith7After250, gameEndsWith8After600, isMultipleOf7Between500And1000, isMultipleOf4From1000, getProgressiveBlockRules, addProgressiveBlocks, shiftAllBlocks, moveRandomBlockToStrategicPosition, removeOldestPiecesOfPlayer, ageAllPieces, initializePieceAges, generateMudZones, isInMudZone, processMudZoneEffects, gameEndsWith1InSpecifiedRanges, addStrategicBlock, gameEndsWith2SpecificPattern, isMultipleOf50Match2, isMultipleOf50Match3, isMultipleOf50Match4, isMultipleOf17, isMultipleOf10Match1From110, isMultipleOf10Match1From810, isMultipleOf10Match2From30, isMultipleOf10Match2From1200, enforcePieceCapacity, rearrangeBoard, swapOpponentPiecePairs, swapThreeOpponentPiecePairs } from '../utils/gameLogic';
import { soundManager } from '../utils/sounds';

export interface GameState {
  board: (0 | 1 | 2 | 3)[][];
  currentPlayer: 1 | 2;
  isGameActive: boolean;
  winner: 0 | 1 | 2;
  timeLeft: number;
  humanMoveCount: number; // Track human moves for disappearing blocks
  pieceAges: number[][]; // Track how long pieces have been on the board
  player1MoveCount: number; // Track moves made by player 1
  player2MoveCount: number; // Track moves made by player 2
  mudZones: { row: number; col: number }[]; // Track mud zone positions
  stuckPieces: { [key: string]: number }; // Track pieces stuck in mud (key: "row,col", value: turns remaining)
  isBlindPlay: boolean; // Track if game is in blind play mode
  totalMoveCount: number; // Track total moves made in the game
  blockShiftMoveCount: number; // Track moves for block shifting timing
  blindPlayTriggerMove: number; // Track the move number when blind play was triggered
  winningPieces: { row: number; col: number }[]; // Track the 5 pieces that won the game
}

export interface UseGameLogicOptions {
  timeLimit: number;
  startingPlayer?: 1 | 2;
  gameNumber?: number;
  currentMatch?: number;
  pauseTimer?: boolean;
}

export const useGameLogic = (options: UseGameLogicOptions) => {
  const { timeLimit, startingPlayer = 1, gameNumber = 1, currentMatch = 1, pauseTimer = false } = options;
  const timerRef = useRef<number | null>(null);

  const [gameState, setGameState] = useState<GameState>({
    board: gameNumber ? createBoardWithBlocks(gameNumber, gameEndsWith2SpecificPattern(gameNumber) || isMultipleOf50Match2(gameNumber, currentMatch), currentMatch) : createEmptyBoard(),
    currentPlayer: startingPlayer,
    isGameActive: true,
    winner: 0,
    timeLeft: timeLimit,
    humanMoveCount: 0,
    pieceAges: initializePieceAges(),
    player1MoveCount: 0,
    player2MoveCount: 0,
    mudZones: gameNumber ? generateMudZones(gameNumber) : [],
    stuckPieces: {},
    isBlindPlay: gameNumber ? (gameEndsWith2SpecificPattern(gameNumber) || isMultipleOf50Match2(gameNumber, currentMatch)) : false,
      totalMoveCount: 0,
      blockShiftMoveCount: 0,
      blindPlayTriggerMove: 0,
      winningPieces: []
    });

  // Update time limit when game number changes
  useEffect(() => {
    setGameState(prevState => ({
      ...prevState,
      timeLeft: timeLimit
    }));
  }, [timeLimit]);

  // Update board when game number changes
  useEffect(() => {
    setGameState(prevState => ({
      ...prevState,
      board: gameNumber ? createBoardWithBlocks(gameNumber, gameEndsWith2SpecificPattern(gameNumber) || isMultipleOf50Match2(gameNumber, currentMatch), currentMatch) : createEmptyBoard(),
      currentPlayer: startingPlayer,
      isGameActive: true,
      winner: 0,
      timeLeft: timeLimit,
      humanMoveCount: 0,
      pieceAges: initializePieceAges(),
      player1MoveCount: 0,
      player2MoveCount: 0,
      mudZones: gameNumber ? generateMudZones(gameNumber) : [],
      stuckPieces: {},
      isBlindPlay: gameNumber ? (gameEndsWith2SpecificPattern(gameNumber) || isMultipleOf50Match2(gameNumber, currentMatch)) : false,
      totalMoveCount: 0,
      blockShiftMoveCount: 0,
      blindPlayTriggerMove: 0,
      winningPieces: []
    }));
  }, [gameNumber, startingPlayer, timeLimit, currentMatch]);


  // Handle cell click
  const handleCellClick = useCallback((row: number, col: number) => {
    if (!gameState.isGameActive || gameState.board[row][col] !== 0) {
      return;
    }

    // In blind play mode, also check if the cell is not in a mud zone
    if (gameState.isBlindPlay && isInMudZone(row, col, gameState.mudZones)) {
      return;
    }

    // Play move sound
    soundManager.playBuzzSound();

    // Process mud zone effects - reduce stuck turns
    const updatedStuckPieces = processMudZoneEffects(gameState.stuckPieces);

    // Age all existing pieces (both player 1 and player 2) after each move
    let updatedPieceAges = ageAllPieces(gameState.board, gameState.pieceAges);
    
    // Place the new piece
    const newBoard = gameState.board.map(r => [...r]);
    newBoard[row][col] = gameState.currentPlayer;
    
    // Set age for the newly placed piece to 0
    updatedPieceAges[row][col] = 0;
    
    // Check if the piece was placed in a mud zone
    const pieceKey = `${row},${col}`;
    let finalStuckPieces = updatedStuckPieces;
    if (isInMudZone(row, col, gameState.mudZones)) {
      // Piece gets stuck for 1 turn
      finalStuckPieces = { ...updatedStuckPieces, [pieceKey]: 1 };
    }
    
    // Increment the current player's move count
    const newPlayer1MoveCount = gameState.currentPlayer === 1 ? gameState.player1MoveCount + 1 : gameState.player1MoveCount;
    const newPlayer2MoveCount = gameState.currentPlayer === 2 ? gameState.player2MoveCount + 1 : gameState.player2MoveCount;
    
    // Increment total move count
    const newTotalMoveCount = gameState.totalMoveCount + 1;
    
    // Handle piece capacity limitation for multiples of 17 levels (max 35 pieces)
    let finalBoard = newBoard;
    if (gameNumber && isMultipleOf17(gameNumber)) {
      // Enforce 35 piece capacity - remove oldest pieces when 36th piece is played
      let result = enforcePieceCapacity(newBoard, updatedPieceAges, 35);
      finalBoard = result.board;
      updatedPieceAges = result.pieceAges;
    }

    // Handle disappearing pieces based on individual player move counts (Adventure Game only, within specified ranges)
    if (gameNumber && (isMultipleOf7Between500And1000(gameNumber) || isMultipleOf4From1000(gameNumber))) {
      const currentPlayerMoveCount = gameState.currentPlayer === 1 ? newPlayer1MoveCount : newPlayer2MoveCount;
      
      if (currentPlayerMoveCount % 4 === 0) {
        // When a player makes their 4th move (or multiple of 4), remove 2 pieces of the opponent
        const opponent = gameState.currentPlayer === 1 ? 2 : 1;
        
        // Remove 2 oldest pieces of the opponent
        let result = removeOldestPiecesOfPlayer(finalBoard, updatedPieceAges, opponent, 2);
        
        finalBoard = result.board;
        updatedPieceAges = result.pieceAges;
      }
    }

    const winningPieces = getWinningPieces(finalBoard, row, col, gameState.currentPlayer);
    const winner = winningPieces.length >= 5 ? gameState.currentPlayer : 0;
    const boardFull = isBoardFull(finalBoard);
    const newGameActive = winner === 0 && !boardFull;

    // Track human moves and handle special blocking systems
    let updatedBoard = finalBoard;
    let newHumanMoveCount = gameState.humanMoveCount;
    
    if (gameState.currentPlayer === 1) {
      // Human made a move
      newHumanMoveCount = gameState.humanMoveCount + 1;
      
      if (gameNumber && gameNumber % 10 === 4) {
        // Games ending with 4: Every 3 human moves, remove 2 blocked cells
        if (newHumanMoveCount % 3 === 0) {
          updatedBoard = removeTwoBlockedCells(finalBoard);
        }
      } else if (gameEndsWith3(gameNumber)) {
        // Games ending with 3: Progressive blocking system
        const rules = getProgressiveBlockRules(gameNumber);
        if (rules.blocksToAdd > 0 && newHumanMoveCount % rules.movesInterval === 0) {
          updatedBoard = addProgressiveBlocks(finalBoard, rules.blocksToAdd);
        }
      } else if (gameNumber && gameNumber % 50 === 0 && currentMatch === 1) {
        // First match of best-of-5 levels only (200, 250, 300, etc.): Every 8 human moves, add 1 strategic block
        if (newHumanMoveCount % 8 === 0) {
          updatedBoard = addStrategicBlock(finalBoard);
        }
      } else if (gameNumber && gameEndsWith1InSpecifiedRanges(gameNumber)) {
        // Games ending with 1 in ranges 11-191 and 1001-1591: Every 8 human moves, add 1 strategic block
        if (newHumanMoveCount % 8 === 0) {
          updatedBoard = addStrategicBlock(finalBoard);
        }
      }
    }
    
    // Handle block shifting for games ending with 7 after game 250
    let newBlockShiftMoveCount = gameState.blockShiftMoveCount + 1;
    if (gameEndsWith7After250(gameNumber)) {
      // Shift all blocks one position every 2 moves
      if (newBlockShiftMoveCount % 2 === 0) {
        updatedBoard = shiftAllBlocks(updatedBoard);
      }
      // Note: Block shifting doesn't affect piece ages since it only moves blocks, not pieces
    }
    
    // Handle block shifting for games ending with 8 after game 600
    if (gameEndsWith8After600(gameNumber)) {
      // Shift all blocks one position every 5 moves
      if (newBlockShiftMoveCount % 5 === 0) {
        updatedBoard = shiftAllBlocks(updatedBoard);
      }
      // Note: Block shifting doesn't affect piece ages since it only moves blocks, not pieces
    }

    // Handle strategic block movement for games ending with 9 from game 400
    if (gameNumber && gameNumber >= 400 && gameNumber % 10 === 9 && newTotalMoveCount === 27) {
      // Move one random block to a strategic position after exactly 27 moves
      updatedBoard = moveRandomBlockToStrategicPosition(updatedBoard);
    }

    // Handle blind play logic
    let shouldBeBlindPlay = gameState.isBlindPlay;
    let newBlindPlayTriggerMove = gameState.blindPlayTriggerMove;
    
    // Check if this is a multiple of 50 in match 2/5 (persistent blind play for entire game)
    const isMultipleOf50Match2BlindPlay = isMultipleOf50Match2(gameNumber, currentMatch);
    
    // Check if this is a game ending with 42, 92, 142, 192, etc. (persistent blind play for entire game)
    const isGameEndsWith2BlindPlay = gameEndsWith2SpecificPattern(gameNumber);
    
    if (isMultipleOf50Match2BlindPlay || isGameEndsWith2BlindPlay) {
      // These games should have blind play for the entire game
      shouldBeBlindPlay = true;
      newBlindPlayTriggerMove = 0; // No trigger move needed for persistent blind play
    } else {
      // For all other games (temporary blind play only):
      
      // Handle temporary blind play for multiples of 10 from game 110 in match 1/3
      if (isMultipleOf10Match1From110(gameNumber, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 21 === 0) {
        // After multiples of 21 moves, the match becomes blind play for one move
        shouldBeBlindPlay = true;
      }

      // Handle temporary blind play for multiples of 10 from game 810 in match 1/3
      if (isMultipleOf10Match1From810(gameNumber, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 17 === 0) {
        // After multiples of 17 moves, the match becomes blind play for one move
        shouldBeBlindPlay = true;
      }

      // Reset temporary blind play after one move (only for temporary blind play, not persistent)
      if (gameState.isBlindPlay && !isMultipleOf50Match2(gameNumber, currentMatch) && !isGameEndsWith2BlindPlay && newTotalMoveCount > gameState.blindPlayTriggerMove) {
        shouldBeBlindPlay = false;
        newBlindPlayTriggerMove = 0;
      } else if (shouldBeBlindPlay && !gameState.isBlindPlay && !isMultipleOf50Match2BlindPlay && !isGameEndsWith2BlindPlay) {
        // Set the trigger move when temporary blind play starts
        newBlindPlayTriggerMove = newTotalMoveCount;
      }
    }

    // Handle board rearrangement for Game 50, Match 3/5 every 21 moves
    if (isMultipleOf50Match3(gameNumber, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 21 === 0) {
      // Rearrange board every 21 moves for Game 50, Match 3/5
      let result = rearrangeBoard(updatedBoard, updatedPieceAges);
      updatedBoard = result.board;
      updatedPieceAges = result.pieceAges;
    }

    // Handle piece swapping for Game 50, Match 4/5 every 15 moves
    if (isMultipleOf50Match4(gameNumber, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 15 === 0) {
      // Swap 2 random pairs of opponent pieces every 15 moves for Game 50, Match 4/5
      let result = swapOpponentPiecePairs(updatedBoard, updatedPieceAges);
      updatedBoard = result.board;
      updatedPieceAges = result.pieceAges;
    }

    // Handle piece swapping for multiples of 10 Match 2/3 from game 30 every 17 moves
    if (isMultipleOf10Match2From30(gameNumber, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 17 === 0) {
      // Swap 2 random pairs of AI and human pieces every 17 moves for multiples of 10 Match 2/3 from game 30
      let result = swapOpponentPiecePairs(updatedBoard, updatedPieceAges);
      updatedBoard = result.board;
      updatedPieceAges = result.pieceAges;
    }

    // Handle piece swapping for multiples of 10 Match 2/3 from game 1200 every 15 moves
    if (isMultipleOf10Match2From1200(gameNumber, currentMatch) && newTotalMoveCount > 0 && newTotalMoveCount % 15 === 0) {
      // Swap 3 random pairs of AI and human pieces every 15 moves for multiples of 10 Match 2/3 from game 1200
      let result = swapThreeOpponentPiecePairs(updatedBoard, updatedPieceAges);
      updatedBoard = result.board;
      updatedPieceAges = result.pieceAges;
    }

    setGameState(prevState => ({
      ...prevState,
      board: updatedBoard,
      currentPlayer: prevState.currentPlayer === 1 ? 2 : 1,
      winner,
      isGameActive: newGameActive,
      timeLeft: newGameActive ? timeLimit : prevState.timeLeft,
      humanMoveCount: newHumanMoveCount,
      pieceAges: updatedPieceAges,
      player1MoveCount: newPlayer1MoveCount,
      player2MoveCount: newPlayer2MoveCount,
      stuckPieces: finalStuckPieces,
      totalMoveCount: newTotalMoveCount,
      blockShiftMoveCount: newBlockShiftMoveCount,
      blindPlayTriggerMove: newBlindPlayTriggerMove,
      isBlindPlay: shouldBeBlindPlay,
      winningPieces: winner > 0 ? winningPieces : []
    }));
  }, [gameState.isGameActive, gameState.board, gameState.currentPlayer, gameState.humanMoveCount, gameState.player1MoveCount, gameState.player2MoveCount, gameState.mudZones, gameState.stuckPieces, gameNumber, checkWinCondition, isBoardFull, timeLimit]);

  // Reset game
  const resetGame = useCallback((newStartingPlayer?: 1 | 2) => {
    setGameState({
      board: gameNumber ? createBoardWithBlocks(gameNumber, gameEndsWith2SpecificPattern(gameNumber) || isMultipleOf50Match2(gameNumber, currentMatch), currentMatch) : createEmptyBoard(),
      currentPlayer: newStartingPlayer || startingPlayer,
      isGameActive: true,
      winner: 0,
      timeLeft: timeLimit,
      humanMoveCount: 0,
      pieceAges: initializePieceAges(),
      player1MoveCount: 0,
      player2MoveCount: 0,
      mudZones: gameNumber ? generateMudZones(gameNumber) : [],
      stuckPieces: {},
      isBlindPlay: gameNumber ? (gameEndsWith2SpecificPattern(gameNumber) || isMultipleOf50Match2(gameNumber, currentMatch)) : false,
      totalMoveCount: 0,
      blockShiftMoveCount: 0,
      blindPlayTriggerMove: 0,
      winningPieces: []
    });
  }, [timeLimit, startingPlayer, gameNumber, currentMatch]);

  // Update game state (for external updates)
  const updateGameState = useCallback((newState: Partial<GameState>) => {
    setGameState(prevState => ({
      ...prevState,
      ...newState
    }));
  }, []);

  // Timer effect
  useEffect(() => {
    if (!gameState.isGameActive || gameState.winner > 0 || pauseTimer) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      setGameState(prevState => {
        if (prevState.timeLeft <= 1) {
          // Time's up - current player loses
          return {
            ...prevState,
            timeLeft: 0,
            isGameActive: false,
            winner: prevState.currentPlayer === 1 ? 2 : 1,
            winningPieces: [] // No winning pieces for timeout
          };
        }
        return {
          ...prevState,
          timeLeft: prevState.timeLeft - 1
        };
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameState.isGameActive, gameState.winner, pauseTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    gameState,
    handleCellClick,
    resetGame,
    updateGameState
  };
};