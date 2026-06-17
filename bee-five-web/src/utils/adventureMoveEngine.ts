/**
 * Pure adventure move obstacle logic — mirrors bee_five/lib/adventure_game.dart
 * _handleHumanMoveObstacles and _handleAIMoveObstacles.
 */

import type { GameRules } from './adventureGameRules';
import {
  addProgressiveBlocks,
  addStrategicBlock,
  gameEndsWith1InSpecifiedRanges,
  gameEndsWith7After250,
  gameEndsWith8After600,
  getProgressiveBlockRules,
  isMultipleOf10Match1From1210,
  isMultipleOf10Match1From210,
  isMultipleOf10Match1From60,
  isMultipleOf10Match1From810,
  isMultipleOf10Match2From30,
  isMultipleOf10Match2From330,
  isMultipleOf10Match2From730,
  isMultipleOf50Match3,
  isMultipleOf50Match4,
  moveRandomBlockToStrategicPosition,
  removeOldestPiecesOfPlayer,
  removeTwoBlockedCells,
  rearrangeBoard,
  shiftAllBlocks,
  swapAllPieces,
  swapOpponentPiecePairs,
  enforcePieceCapacity,
} from './gameLogic';

export type AdventureBoard = (0 | 1 | 2 | 3)[][];

export const getEffectiveBlindPlay = (
  isBlindPlay: boolean,
  temporaryBlindPlay: boolean
): boolean => isBlindPlay || temporaryBlindPlay;

/** Apply swap / rearrange rules shared by human and AI obstacle handlers. */
export const applySharedObstacleEffects = (
  gameNumber: number,
  currentMatch: number,
  board: AdventureBoard,
  pieceAges: number[][],
  totalMoveCount: number
): { board: AdventureBoard; pieceAges: number[][] } => {
  let workingBoard = board;
  let workingPieceAges = pieceAges;

  if (isMultipleOf50Match3(gameNumber, currentMatch) && totalMoveCount > 0 && totalMoveCount % 5 === 0) {
    const result = rearrangeBoard(workingBoard, workingPieceAges);
    workingBoard = result.board;
    workingPieceAges = result.pieceAges;
  }

  if (isMultipleOf50Match4(gameNumber, currentMatch) && totalMoveCount > 0 && totalMoveCount % 5 === 0) {
    const result = swapOpponentPiecePairs(workingBoard, workingPieceAges);
    workingBoard = result.board;
    workingPieceAges = result.pieceAges;
  }

  if (isMultipleOf10Match2From30(gameNumber, currentMatch) && totalMoveCount > 0 && totalMoveCount % 9 === 0) {
    const result = swapOpponentPiecePairs(workingBoard, workingPieceAges);
    workingBoard = result.board;
    workingPieceAges = result.pieceAges;
  }

  if (isMultipleOf10Match2From330(gameNumber, currentMatch) && totalMoveCount > 0 && totalMoveCount % 7 === 0) {
    const result = swapOpponentPiecePairs(workingBoard, workingPieceAges);
    workingBoard = result.board;
    workingPieceAges = result.pieceAges;
  }

  if (isMultipleOf10Match2From730(gameNumber, currentMatch) && totalMoveCount > 0 && totalMoveCount % 5 === 0) {
    const result = swapOpponentPiecePairs(workingBoard, workingPieceAges);
    workingBoard = result.board;
    workingPieceAges = result.pieceAges;
  }

  if (isMultipleOf10Match1From60(gameNumber, currentMatch) && totalMoveCount > 0 && totalMoveCount % 11 === 0) {
    const result = swapAllPieces(workingBoard, workingPieceAges);
    workingBoard = result.board;
    workingPieceAges = result.pieceAges;
  }

  if (
    gameNumber % 10 === 1 &&
    gameNumber >= 31 &&
    !gameEndsWith1InSpecifiedRanges(gameNumber) &&
    totalMoveCount > 0 &&
    totalMoveCount % 13 === 0
  ) {
    const result = swapAllPieces(workingBoard, workingPieceAges);
    workingBoard = result.board;
    workingPieceAges = result.pieceAges;
  }

  return { board: workingBoard, pieceAges: workingPieceAges };
};

export interface HumanObstacleInput {
  gameNumber: number;
  currentMatch: number;
  rules: GameRules;
  board: AdventureBoard;
  pieceAges: number[][];
  humanMoveCount: number;
  player1MoveCount: number;
  totalMoveCount: number;
  blockShiftMoveCount: number;
  temporaryBlindPlay: boolean;
  blindPlayTriggerMove: number;
}

export interface ObstacleOutput {
  board: AdventureBoard;
  pieceAges: number[][];
  blockShiftMoveCount: number;
  temporaryBlindPlay: boolean;
  blindPlayTriggerMove: number;
}

/** Mirrors Dart _handleHumanMoveObstacles (obstacle order preserved). */
export const applyHumanMoveObstacles = (input: HumanObstacleInput): ObstacleOutput => {
  const {
    gameNumber,
    currentMatch,
    rules,
    humanMoveCount,
    player1MoveCount,
    totalMoveCount,
  } = input;

  let workingBoard = input.board.map((row) => [...row]);
  let workingPieceAges = input.pieceAges.map((row) => [...row]);
  let blockShiftMoveCount = input.blockShiftMoveCount + 1;
  let temporaryBlindPlay = input.temporaryBlindPlay;
  let blindPlayTriggerMove = input.blindPlayTriggerMove;

  if (rules.hasProgressiveBlocks) {
    const progressiveRules = getProgressiveBlockRules(gameNumber);
    if (progressiveRules.blocksToAdd > 0 && humanMoveCount % progressiveRules.movesInterval === 0) {
      workingBoard = addProgressiveBlocks(workingBoard, progressiveRules.blocksToAdd);
    }
  }

  if (rules.hasDisappearingBlocks) {
    if (humanMoveCount % 3 === 0) {
      workingBoard = removeTwoBlockedCells(workingBoard);
    }
  }

  if (gameNumber % 50 === 0 && currentMatch === 1) {
    if (humanMoveCount % 8 === 0) {
      workingBoard = addStrategicBlock(workingBoard);
    }
  }

  if (gameEndsWith1InSpecifiedRanges(gameNumber)) {
    if (humanMoveCount % 8 === 0) {
      workingBoard = addStrategicBlock(workingBoard);
    }
  }

  if (rules.hasShiftingBlocks) {
    if (gameEndsWith7After250(gameNumber) && blockShiftMoveCount % 2 === 0) {
      workingBoard = shiftAllBlocks(workingBoard);
    } else if (gameEndsWith8After600(gameNumber) && blockShiftMoveCount % 5 === 0) {
      workingBoard = shiftAllBlocks(workingBoard);
    }
  }

  if (gameNumber >= 400 && gameNumber % 10 === 9 && totalMoveCount === 27) {
    workingBoard = moveRandomBlockToStrategicPosition(workingBoard);
  }

  if (rules.hasPieceCapacity) {
    const capacityResult = enforcePieceCapacity(workingBoard, workingPieceAges, 35);
    workingBoard = capacityResult.board;
    workingPieceAges = capacityResult.pieceAges;
  }

  if (rules.hasDisappearingPieces) {
    if (player1MoveCount % 4 === 0) {
      const disappearResult = removeOldestPiecesOfPlayer(workingBoard, workingPieceAges, 2, 2);
      workingBoard = disappearResult.board;
      workingPieceAges = disappearResult.pieceAges;
    }
  }

  const shared = applySharedObstacleEffects(gameNumber, currentMatch, workingBoard, workingPieceAges, totalMoveCount);
  workingBoard = shared.board;
  workingPieceAges = shared.pieceAges;

  if (isMultipleOf10Match1From210(gameNumber, currentMatch) && player1MoveCount === 15) {
    temporaryBlindPlay = true;
    blindPlayTriggerMove = totalMoveCount;
  }

  if (isMultipleOf10Match1From810(gameNumber, currentMatch) && player1MoveCount === 13) {
    temporaryBlindPlay = true;
    blindPlayTriggerMove = totalMoveCount;
  }

  if (isMultipleOf10Match1From1210(gameNumber, currentMatch) && player1MoveCount === 9) {
    temporaryBlindPlay = true;
    blindPlayTriggerMove = totalMoveCount;
  }

  if (
    temporaryBlindPlay &&
    !rules.hasBlindPlay &&
    totalMoveCount > blindPlayTriggerMove &&
    blindPlayTriggerMove > 0
  ) {
    temporaryBlindPlay = false;
    blindPlayTriggerMove = 0;
  }

  return {
    board: workingBoard,
    pieceAges: workingPieceAges,
    blockShiftMoveCount,
    temporaryBlindPlay,
    blindPlayTriggerMove,
  };
};

export interface AIMoveObstacleInput {
  gameNumber: number;
  currentMatch: number;
  rules: GameRules;
  board: AdventureBoard;
  pieceAges: number[][];
  player2MoveCount: number;
  totalMoveCount: number;
}

/** Mirrors Dart _handleAIMoveObstacles. */
export const applyAIMoveObstacles = (input: AIMoveObstacleInput): { board: AdventureBoard; pieceAges: number[][] } => {
  const { gameNumber, currentMatch, rules, player2MoveCount, totalMoveCount } = input;

  let workingBoard = input.board.map((row) => [...row]);
  let workingPieceAges = input.pieceAges.map((row) => [...row]);

  if (rules.hasPieceCapacity) {
    const capacityResult = enforcePieceCapacity(workingBoard, workingPieceAges, 35);
    workingBoard = capacityResult.board;
    workingPieceAges = capacityResult.pieceAges;
  }

  if (rules.hasDisappearingPieces) {
    if (player2MoveCount % 4 === 0) {
      const disappearResult = removeOldestPiecesOfPlayer(workingBoard, workingPieceAges, 1, 2);
      workingBoard = disappearResult.board;
      workingPieceAges = disappearResult.pieceAges;
    }
  }

  return applySharedObstacleEffects(gameNumber, currentMatch, workingBoard, workingPieceAges, totalMoveCount);
};
