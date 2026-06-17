/**
 * Adventure parity tests — run with: npm run test:adventure
 */

import assert from 'node:assert/strict';
import { getGameRules } from '../src/utils/adventureGameRules.ts';
import {
  applyHumanMoveObstacles,
  getEffectiveBlindPlay,
} from '../src/utils/adventureMoveEngine.ts';
import {
  applySimulatedMove,
  boardSignature,
  countPieces,
  createAdventureSimState,
} from '../src/utils/adventureMoveSimulator.ts';
import { initializePieceAges } from '../src/utils/gameLogic.ts';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${error instanceof Error ? error.message : error}`);
  }
}

console.log('Adventure parity tests\n');

test('persistent blind play is separate from temporary blind play', () => {
  assert.equal(getEffectiveBlindPlay(false, false), false);
  assert.equal(getEffectiveBlindPlay(true, false), true);
  assert.equal(getEffectiveBlindPlay(false, true), true);
  assert.equal(getEffectiveBlindPlay(true, true), true);
});

test('level 42 initializes with persistent blind play only', () => {
  const state = createAdventureSimState(42);
  assert.equal(state.isBlindPlay, true);
  assert.equal(state.temporaryBlindPlay, false);
});

test('level 210 match 1 triggers temporary blind on player move 15', () => {
  const rules = getGameRules(210, 1);
  let temporaryBlindPlay = false;
  let blindPlayTriggerMove = 0;
  let board = Array.from({ length: 10 }, () => Array(10).fill(0));
  let pieceAges = initializePieceAges();

  const result = applyHumanMoveObstacles({
    gameNumber: 210,
    currentMatch: 1,
    rules,
    board,
    pieceAges,
    humanMoveCount: 15,
    player1MoveCount: 15,
    totalMoveCount: 29,
    blockShiftMoveCount: 15,
    temporaryBlindPlay,
    blindPlayTriggerMove,
  });

  assert.equal(result.temporaryBlindPlay, true);
  assert.equal(result.blindPlayTriggerMove, 29);
  assert.equal(rules.hasBlindPlay, false);
});

test('temporary blind resets on subsequent human move (Dart state machine)', () => {
  const rules = getGameRules(210, 1);
  const afterTrigger = applyHumanMoveObstacles({
    gameNumber: 210,
    currentMatch: 1,
    rules,
    board: Array.from({ length: 10 }, () => Array(10).fill(0)),
    pieceAges: initializePieceAges(),
    humanMoveCount: 15,
    player1MoveCount: 15,
    totalMoveCount: 29,
    blockShiftMoveCount: 15,
    temporaryBlindPlay: true,
    blindPlayTriggerMove: 29,
  });
  assert.equal(afterTrigger.temporaryBlindPlay, true);

  const afterReset = applyHumanMoveObstacles({
    gameNumber: 210,
    currentMatch: 1,
    rules,
    board: afterTrigger.board,
    pieceAges: afterTrigger.pieceAges,
    humanMoveCount: 16,
    player1MoveCount: 16,
    totalMoveCount: 31,
    blockShiftMoveCount: 16,
    temporaryBlindPlay: afterTrigger.temporaryBlindPlay,
    blindPlayTriggerMove: afterTrigger.blindPlayTriggerMove,
  });
  assert.equal(afterReset.temporaryBlindPlay, false);
  assert.equal(afterReset.blindPlayTriggerMove, 0);
});

test('win is evaluated after obstacles (simulator ordering)', () => {
  // Level 1: straightforward five-in-a-row — win must register after obstacle phase
  let state = createAdventureSimState(1);
  const humanWins = [
    [0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2], [0, 3], [1, 3], [0, 4],
  ];
  for (const [row, col] of humanWins) {
    if (state.winner !== 0) break;
    state = applySimulatedMove(state, row, col);
  }
  assert.equal(state.winner, 1);
});

test('piece capacity keeps at most 35 pieces on level 17', () => {
  let state = createAdventureSimState(17);
  for (let i = 0; i < 40; i++) {
    if (state.winner !== 0) break;
    let moved = false;
    outer: for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (state.board[r][c] === 0) {
          state = applySimulatedMove(state, r, c);
          moved = true;
          break outer;
        }
      }
    }
    if (!moved) break;
  }
  const total = countPieces(state.board, 1) + countPieces(state.board, 2);
  assert.ok(total <= 35);
});

test('simulated move sequence is deterministic for level 53', () => {
  let state = createAdventureSimState(53);
  const coords = [
    [4, 4], [3, 3], [5, 5], [3, 4], [5, 3], [4, 3], [4, 5],
  ];
  const signatures = [];
  for (const [row, col] of coords) {
    state = applySimulatedMove(state, row, col);
    signatures.push(boardSignature(state.board));
  }
  // Re-run and compare
  let state2 = createAdventureSimState(53);
  const signatures2 = [];
  for (const [row, col] of coords) {
    state2 = applySimulatedMove(state2, row, col);
    signatures2.push(boardSignature(state2.board));
  }
  assert.deepEqual(signatures, signatures2);
});

test('disappearing pieces on level 511 removes opponent pieces on 4th human move', () => {
  let state = createAdventureSimState(511);
  const emptyAt = (row, col) => state.board[row][col] === 0;
  const p1Moves = [];
  const p2Moves = [];
  for (let c = 0; c < 10 && p1Moves.length < 4; c++) {
    if (emptyAt(0, c)) p1Moves.push([0, c]);
  }
  for (let c = 0; c < 10 && p2Moves.length < 3; c++) {
    if (emptyAt(2, c)) p2Moves.push([2, c]);
  }
  assert.ok(p1Moves.length >= 4 && p2Moves.length >= 3, 'need open cells on test board');
  state = applySimulatedMove(state, ...p1Moves[0]);
  state = applySimulatedMove(state, ...p2Moves[0]);
  state = applySimulatedMove(state, ...p1Moves[1]);
  state = applySimulatedMove(state, ...p2Moves[1]);
  state = applySimulatedMove(state, ...p1Moves[2]);
  state = applySimulatedMove(state, ...p2Moves[2]);
  const aiPiecesBefore = countPieces(state.board, 2);
  state = applySimulatedMove(state, ...p1Moves[3]);
  const aiPiecesAfter = countPieces(state.board, 2);
  assert.equal(aiPiecesBefore - aiPiecesAfter, 2);
});

test('AI rules metadata matches for all 2000 levels', () => {
  function dartAI(n) {
    const d = n % 10;
    if (n <= 200) {
      if (d === 4 || d === 7) return 'hard';
      if (d === 9 && n >= 10) return 'hard';
      if ([0, 3, 5, 6, 8].includes(d)) return 'medium';
      return 'easy';
    }
    if (n <= 600) {
      if ([0, 2, 5, 9].includes(d)) return 'hard';
      return 'medium';
    }
    if (n <= 2000) {
      if (d >= 1 && d <= 4) return 'medium';
      if (d === 9) return 'easy';
      return 'hard';
    }
    return 'hard';
  }
  for (let n = 1; n <= 2000; n++) {
    assert.equal(getGameRules(n).aiDifficulty, dartAI(n), `level ${n}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
