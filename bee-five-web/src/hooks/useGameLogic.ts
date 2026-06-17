"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { getWinningPieces, isBoardFull, createEmptyBoard, createBoardWithBlocks, ageAllPieces, initializePieceAges, generateMudZones, isInMudZone, processMudZoneEffects } from '../utils/gameLogic';
import { getGameRules } from '../utils/adventureGameRules';
import {
  applyAIMoveObstacles,
  applyHumanMoveObstacles,
  getEffectiveBlindPlay,
} from '../utils/adventureMoveEngine';
import { soundManager } from '../utils/sounds';

export interface GameState {
  board: (0 | 1 | 2 | 3)[][];
  currentPlayer: 1 | 2;
  isGameActive: boolean;
  winner: 0 | 1 | 2;
  timeLeft: number;
  humanMoveCount: number;
  pieceAges: number[][];
  player1MoveCount: number;
  player2MoveCount: number;
  mudZones: { row: number; col: number }[];
  stuckPieces: { [key: string]: number };
  /** Persistent blind play (42-pattern levels, ×50 match 2) */
  isBlindPlay: boolean;
  /** Temporary blind play (×10 match 1 triggers at 15/13/9 player moves) */
  temporaryBlindPlay: boolean;
  totalMoveCount: number;
  blockShiftMoveCount: number;
  blindPlayTriggerMove: number;
  winningPieces: { row: number; col: number }[];
}

export { getEffectiveBlindPlay };

export interface UseGameLogicOptions {
  timeLimit: number;
  startingPlayer?: 1 | 2;
  gameNumber?: number;
  currentMatch?: number;
  pauseTimer?: boolean;
  initialBoard?: (0 | 1 | 2 | 3)[][];
}

const initialBlindFlags = (gameNumber?: number, currentMatch = 1) => {
  if (!gameNumber) return { isBlindPlay: false, temporaryBlindPlay: false };
  const rules = getGameRules(gameNumber, currentMatch);
  return { isBlindPlay: rules.hasBlindPlay, temporaryBlindPlay: false };
};

export const useGameLogic = (options: UseGameLogicOptions) => {
  const { timeLimit, startingPlayer = 1, gameNumber, currentMatch = 1, pauseTimer = false, initialBoard } = options;
  const timerRef = useRef<number | null>(null);

  const buildBoard = useCallback(() => {
    if (initialBoard) return initialBoard.map(row => [...row]);
    if (gameNumber) {
      const rules = getGameRules(gameNumber, currentMatch);
      return createBoardWithBlocks(gameNumber, rules.hasBlindPlay, currentMatch);
    }
    return createEmptyBoard();
  }, [initialBoard, gameNumber, currentMatch]);

  const [gameState, setGameState] = useState<GameState>(() => {
    const blind = initialBlindFlags(gameNumber, currentMatch);
    const rules = gameNumber ? getGameRules(gameNumber, currentMatch) : null;
    return {
      board: buildBoard(),
      currentPlayer: startingPlayer,
      isGameActive: true,
      winner: 0,
      timeLeft: timeLimit,
      humanMoveCount: 0,
      pieceAges: initializePieceAges(),
      player1MoveCount: 0,
      player2MoveCount: 0,
      mudZones: rules?.hasMudZones ? generateMudZones(gameNumber!) : [],
      stuckPieces: {},
      isBlindPlay: blind.isBlindPlay,
      temporaryBlindPlay: blind.temporaryBlindPlay,
      totalMoveCount: 0,
      blockShiftMoveCount: 0,
      blindPlayTriggerMove: 0,
      winningPieces: [],
    };
  });

  useEffect(() => {
    setGameState(prevState => ({
      ...prevState,
      timeLeft: timeLimit,
    }));
  }, [timeLimit]);

  useEffect(() => {
    const blind = initialBlindFlags(gameNumber, currentMatch);
    const rules = gameNumber ? getGameRules(gameNumber, currentMatch) : null;
    setGameState({
      board: buildBoard(),
      currentPlayer: startingPlayer,
      isGameActive: true,
      winner: 0,
      timeLeft: timeLimit,
      humanMoveCount: 0,
      pieceAges: initializePieceAges(),
      player1MoveCount: 0,
      player2MoveCount: 0,
      mudZones: rules?.hasMudZones ? generateMudZones(gameNumber!) : [],
      stuckPieces: {},
      isBlindPlay: blind.isBlindPlay,
      temporaryBlindPlay: blind.temporaryBlindPlay,
      totalMoveCount: 0,
      blockShiftMoveCount: 0,
      blindPlayTriggerMove: 0,
      winningPieces: [],
    });
  }, [buildBoard, startingPlayer, timeLimit, currentMatch, gameNumber]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (!gameState.isGameActive || gameState.board[row][col] !== 0) {
      return;
    }

    const effectiveBlindPlay = getEffectiveBlindPlay(gameState.isBlindPlay, gameState.temporaryBlindPlay);
    if (effectiveBlindPlay && isInMudZone(row, col, gameState.mudZones)) {
      return;
    }

    soundManager.playBuzzSound();

    const updatedStuckPieces = processMudZoneEffects(gameState.stuckPieces);
    let updatedPieceAges = ageAllPieces(gameState.board, gameState.pieceAges);

    const newBoard = gameState.board.map(r => [...r]);
    newBoard[row][col] = gameState.currentPlayer;
    updatedPieceAges[row][col] = 0;

    const pieceKey = `${row},${col}`;
    let finalStuckPieces = updatedStuckPieces;
    if (isInMudZone(row, col, gameState.mudZones)) {
      finalStuckPieces = { ...updatedStuckPieces, [pieceKey]: 1 };
    }

    const newPlayer1MoveCount = gameState.currentPlayer === 1 ? gameState.player1MoveCount + 1 : gameState.player1MoveCount;
    const newPlayer2MoveCount = gameState.currentPlayer === 2 ? gameState.player2MoveCount + 1 : gameState.player2MoveCount;
    const newTotalMoveCount = gameState.totalMoveCount + 1;

    if (!gameNumber) {
      const winningPieces = getWinningPieces(newBoard, row, col, gameState.currentPlayer);
      const winner = winningPieces.length >= 5 ? gameState.currentPlayer : 0;
      const boardFull = isBoardFull(newBoard);
      setGameState(prev => ({
        ...prev,
        board: newBoard,
        currentPlayer: prev.currentPlayer === 1 ? 2 : 1,
        winner,
        isGameActive: winner === 0 && !boardFull,
        timeLeft: winner === 0 && !boardFull ? timeLimit : prev.timeLeft,
        pieceAges: updatedPieceAges,
        player1MoveCount: newPlayer1MoveCount,
        player2MoveCount: newPlayer2MoveCount,
        stuckPieces: finalStuckPieces,
        totalMoveCount: newTotalMoveCount,
        winningPieces: winner > 0 ? winningPieces : [],
      }));
      return;
    }

    const rules = getGameRules(gameNumber, currentMatch);
    let updatedBoard = newBoard;
    let newHumanMoveCount = gameState.humanMoveCount;
    let newBlockShiftMoveCount = gameState.blockShiftMoveCount;
    let temporaryBlindPlay = gameState.temporaryBlindPlay;
    let blindPlayTriggerMove = gameState.blindPlayTriggerMove;

    if (gameState.currentPlayer === 1) {
      newHumanMoveCount = gameState.humanMoveCount + 1;
      const obstacleResult = applyHumanMoveObstacles({
        gameNumber,
        currentMatch,
        rules,
        board: updatedBoard,
        pieceAges: updatedPieceAges,
        humanMoveCount: newHumanMoveCount,
        player1MoveCount: newPlayer1MoveCount,
        totalMoveCount: newTotalMoveCount,
        blockShiftMoveCount: gameState.blockShiftMoveCount,
        temporaryBlindPlay,
        blindPlayTriggerMove,
      });
      updatedBoard = obstacleResult.board;
      updatedPieceAges = obstacleResult.pieceAges;
      newBlockShiftMoveCount = obstacleResult.blockShiftMoveCount;
      temporaryBlindPlay = obstacleResult.temporaryBlindPlay;
      blindPlayTriggerMove = obstacleResult.blindPlayTriggerMove;
    } else {
      const obstacleResult = applyAIMoveObstacles({
        gameNumber,
        currentMatch,
        rules,
        board: updatedBoard,
        pieceAges: updatedPieceAges,
        player2MoveCount: newPlayer2MoveCount,
        totalMoveCount: newTotalMoveCount,
      });
      updatedBoard = obstacleResult.board;
      updatedPieceAges = obstacleResult.pieceAges;
    }

    const winningPieces = getWinningPieces(updatedBoard, row, col, gameState.currentPlayer);
    const winner = winningPieces.length >= 5 ? gameState.currentPlayer : 0;
    const boardFull = isBoardFull(updatedBoard);
    const newGameActive = winner === 0 && !boardFull;

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
      blindPlayTriggerMove,
      temporaryBlindPlay,
      winningPieces: winner > 0 ? winningPieces : [],
    }));
  }, [gameState, gameNumber, currentMatch, timeLimit]);

  const resetGame = useCallback((newStartingPlayer?: 1 | 2) => {
    const blind = initialBlindFlags(gameNumber, currentMatch);
    const rules = gameNumber ? getGameRules(gameNumber, currentMatch) : null;
    setGameState({
      board: buildBoard(),
      currentPlayer: newStartingPlayer || startingPlayer,
      isGameActive: true,
      winner: 0,
      timeLeft: timeLimit,
      humanMoveCount: 0,
      pieceAges: initializePieceAges(),
      player1MoveCount: 0,
      player2MoveCount: 0,
      mudZones: rules?.hasMudZones ? generateMudZones(gameNumber!) : [],
      stuckPieces: {},
      isBlindPlay: blind.isBlindPlay,
      temporaryBlindPlay: blind.temporaryBlindPlay,
      totalMoveCount: 0,
      blockShiftMoveCount: 0,
      blindPlayTriggerMove: 0,
      winningPieces: [],
    });
  }, [buildBoard, timeLimit, startingPlayer, gameNumber, currentMatch]);

  const updateGameState = useCallback((newState: Partial<GameState>) => {
    setGameState(prevState => ({
      ...prevState,
      ...newState,
    }));
  }, []);

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
          return {
            ...prevState,
            timeLeft: 0,
            isGameActive: false,
            winner: prevState.currentPlayer === 1 ? 2 : 1,
            winningPieces: [],
          };
        }
        return {
          ...prevState,
          timeLeft: prevState.timeLeft - 1,
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
    updateGameState,
  };
};
