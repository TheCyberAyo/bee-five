/**
 * Deterministic adventure move simulator for parity testing against Dart logic.
 */

import { getGameRules } from './adventureGameRules';
import {
  ageAllPieces,
  checkWinCondition,
  createBoardWithBlocks,
  generateMudZones,
  initializePieceAges,
  isBoardFull,
} from './gameLogic';
import {
  applyAIMoveObstacles,
  applyHumanMoveObstacles,
  type AdventureBoard,
} from './adventureMoveEngine';

export interface AdventureSimState {
  gameNumber: number;
  currentMatch: number;
  board: AdventureBoard;
  pieceAges: number[][];
  currentPlayer: 1 | 2;
  winner: 0 | 1 | 2;
  humanMoveCount: number;
  player1MoveCount: number;
  player2MoveCount: number;
  totalMoveCount: number;
  blockShiftMoveCount: number;
  isBlindPlay: boolean;
  temporaryBlindPlay: boolean;
  blindPlayTriggerMove: number;
  mudZones: { row: number; col: number }[];
}

export const createAdventureSimState = (
  gameNumber: number,
  currentMatch = 1,
  startingPlayer: 1 | 2 = 1
): AdventureSimState => {
  const rules = getGameRules(gameNumber, currentMatch);
  return {
    gameNumber,
    currentMatch,
    board: createBoardWithBlocks(gameNumber, rules.hasBlindPlay, currentMatch),
    pieceAges: initializePieceAges(),
    currentPlayer: startingPlayer,
    winner: 0,
    humanMoveCount: 0,
    player1MoveCount: 0,
    player2MoveCount: 0,
    totalMoveCount: 0,
    blockShiftMoveCount: 0,
    isBlindPlay: rules.hasBlindPlay,
    temporaryBlindPlay: false,
    blindPlayTriggerMove: 0,
    mudZones: rules.hasMudZones ? generateMudZones(gameNumber) : [],
  };
};

export const applySimulatedMove = (
  state: AdventureSimState,
  row: number,
  col: number
): AdventureSimState => {
  if (state.winner !== 0 || state.board[row][col] !== 0) {
    return state;
  }

  const rules = getGameRules(state.gameNumber, state.currentMatch);
  const player = state.currentPlayer;

  let pieceAges = ageAllPieces(state.board, state.pieceAges);
  const board = state.board.map((r) => [...r]);
  board[row][col] = player;
  pieceAges[row][col] = 0;

  const player1MoveCount = player === 1 ? state.player1MoveCount + 1 : state.player1MoveCount;
  const player2MoveCount = player === 2 ? state.player2MoveCount + 1 : state.player2MoveCount;
  const totalMoveCount = state.totalMoveCount + 1;
  let humanMoveCount = state.humanMoveCount;
  let blockShiftMoveCount = state.blockShiftMoveCount;
  let temporaryBlindPlay = state.temporaryBlindPlay;
  let blindPlayTriggerMove = state.blindPlayTriggerMove;
  let workingBoard = board;
  let workingPieceAges = pieceAges;

  if (player === 1) {
    humanMoveCount += 1;
    const obstacleResult = applyHumanMoveObstacles({
      gameNumber: state.gameNumber,
      currentMatch: state.currentMatch,
      rules,
      board: workingBoard,
      pieceAges: workingPieceAges,
      humanMoveCount,
      player1MoveCount,
      totalMoveCount,
      blockShiftMoveCount,
      temporaryBlindPlay,
      blindPlayTriggerMove,
    });
    workingBoard = obstacleResult.board;
    workingPieceAges = obstacleResult.pieceAges;
    blockShiftMoveCount = obstacleResult.blockShiftMoveCount;
    temporaryBlindPlay = obstacleResult.temporaryBlindPlay;
    blindPlayTriggerMove = obstacleResult.blindPlayTriggerMove;
  } else {
    const obstacleResult = applyAIMoveObstacles({
      gameNumber: state.gameNumber,
      currentMatch: state.currentMatch,
      rules,
      board: workingBoard,
      pieceAges: workingPieceAges,
      player2MoveCount,
      totalMoveCount,
    });
    workingBoard = obstacleResult.board;
    workingPieceAges = obstacleResult.pieceAges;
  }

  const winner = checkWinCondition(workingBoard, row, col, player) ? player : 0;
  const gameOver = winner !== 0 || isBoardFull(workingBoard);

  return {
    ...state,
    board: workingBoard,
    pieceAges: workingPieceAges,
    humanMoveCount,
    player1MoveCount,
    player2MoveCount,
    totalMoveCount,
    blockShiftMoveCount,
    temporaryBlindPlay,
    blindPlayTriggerMove,
    winner: gameOver ? winner : 0,
    currentPlayer: gameOver ? state.currentPlayer : player === 1 ? 2 : 1,
  };
};

export const boardSignature = (board: AdventureBoard): string =>
  board.map((row) => row.join('')).join('|');

export const countPieces = (board: AdventureBoard, player: 1 | 2): number => {
  let count = 0;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (board[row][col] === player) count++;
    }
  }
  return count;
};
