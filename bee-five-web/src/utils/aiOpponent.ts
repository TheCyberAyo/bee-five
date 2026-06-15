import { checkWinCondition } from './gameLogic';
import type { AIDifficulty } from './classicStreak';

type Board = (0 | 1 | 2 | 3)[][];
type Cell = { row: number; col: number };

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const;

function checkLine(
  board: Board,
  row: number,
  col: number,
  player: 1 | 2,
  target: number,
  maxSteps: number
): boolean {
  for (const [dRow, dCol] of DIRECTIONS) {
    let count = 1;
    for (let i = 1; i < maxSteps; i++) {
      const newRow = row + i * dRow;
      const newCol = col + i * dCol;
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
        count++;
      } else {
        break;
      }
    }
    for (let i = 1; i < maxSteps; i++) {
      const newRow = row - i * dRow;
      const newCol = col - i * dCol;
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
        count++;
      } else {
        break;
      }
    }
    if (count >= target) return true;
  }
  return false;
}

const checkThreeInARow = (board: Board, row: number, col: number, player: 1 | 2) =>
  checkLine(board, row, col, player, 3, 4);

const checkTwoInARow = (board: Board, row: number, col: number, player: 1 | 2) =>
  checkLine(board, row, col, player, 2, 3);

const checkFourInARow = (board: Board, row: number, col: number, player: 1 | 2) =>
  checkLine(board, row, col, player, 4, 5);

function isNearHumanPiece(board: Board, row: number, col: number): boolean {
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
}

function canReachFive(board: Board, row: number, col: number, player: 1 | 2): boolean {
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1;
    let emptySpaces = 0;
    for (let direction = -1; direction <= 1; direction += 2) {
      for (let i = 1; i <= 4; i++) {
        const newRow = row + dr * i * direction;
        const newCol = col + dc * i * direction;
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
    if (count + emptySpaces >= 5) return true;
  }
  return false;
}

function getEasyAIMove(availableCells: Cell[], board: Board): Cell {
  for (const cell of availableCells) {
    const testBoard = board.map((row) => [...row]);
    testBoard[cell.row][cell.col] = 2;
    if (checkWinCondition(testBoard, cell.row, cell.col, 2)) return cell;
  }
  for (const cell of availableCells) {
    const testBoard = board.map((row) => [...row]);
    testBoard[cell.row][cell.col] = 1;
    if (checkWinCondition(testBoard, cell.row, cell.col, 1)) return cell;
  }
  if (Math.random() > 0.5) {
    for (const cell of availableCells) {
      const testBoard = board.map((row) => [...row]);
      testBoard[cell.row][cell.col] = 1;
      if (checkThreeInARow(testBoard, cell.row, cell.col, 1)) return cell;
    }
  }
  return availableCells[Math.floor(Math.random() * availableCells.length)];
}

function getMediumAIMove(availableCells: Cell[], board: Board): Cell {
  for (const cell of availableCells) {
    const testBoard = board.map((row) => [...row]);
    testBoard[cell.row][cell.col] = 2;
    if (checkWinCondition(testBoard, cell.row, cell.col, 2)) return cell;
  }
  for (const cell of availableCells) {
    const testBoard = board.map((row) => [...row]);
    testBoard[cell.row][cell.col] = 1;
    if (checkWinCondition(testBoard, cell.row, cell.col, 1)) return cell;
  }
  for (const cell of availableCells) {
    const testBoard = board.map((row) => [...row]);
    testBoard[cell.row][cell.col] = 1;
    if (checkThreeInARow(testBoard, cell.row, cell.col, 1)) return cell;
  }
  for (const cell of availableCells) {
    const testBoard = board.map((row) => [...row]);
    testBoard[cell.row][cell.col] = 2;
    if (checkThreeInARow(testBoard, cell.row, cell.col, 2) && canReachFive(testBoard, cell.row, cell.col, 2)) {
      return cell;
    }
  }
  for (const cell of availableCells) {
    const testBoard = board.map((row) => [...row]);
    testBoard[cell.row][cell.col] = 1;
    if (checkTwoInARow(testBoard, cell.row, cell.col, 1)) return cell;
  }
  for (const cell of availableCells) {
    const testBoard = board.map((row) => [...row]);
    testBoard[cell.row][cell.col] = 2;
    if (checkTwoInARow(testBoard, cell.row, cell.col, 2) && canReachFive(testBoard, cell.row, cell.col, 2)) {
      return cell;
    }
  }
  return availableCells[Math.floor(Math.random() * availableCells.length)];
}

function getHardAIMove(availableCells: Cell[], board: Board): Cell {
  for (const cell of availableCells) {
    const testBoard = board.map((row) => [...row]);
    testBoard[cell.row][cell.col] = 2;
    if (checkWinCondition(testBoard, cell.row, cell.col, 2)) return cell;
  }
  for (const cell of availableCells) {
    const testBoard = board.map((row) => [...row]);
    testBoard[cell.row][cell.col] = 1;
    if (checkWinCondition(testBoard, cell.row, cell.col, 1)) return cell;
  }
  for (const cell of availableCells) {
    const testBoard = board.map((row) => [...row]);
    testBoard[cell.row][cell.col] = 1;
    if (checkFourInARow(testBoard, cell.row, cell.col, 1)) return cell;
  }
  for (const cell of availableCells) {
    const testBoard = board.map((row) => [...row]);
    testBoard[cell.row][cell.col] = 2;
    if (checkFourInARow(testBoard, cell.row, cell.col, 2)) return cell;
  }
  for (const cell of availableCells) {
    const testBoard = board.map((row) => [...row]);
    testBoard[cell.row][cell.col] = 1;
    if (checkThreeInARow(testBoard, cell.row, cell.col, 1)) return cell;
  }
  for (const cell of availableCells) {
    const testBoard = board.map((row) => [...row]);
    testBoard[cell.row][cell.col] = 2;
    if (checkThreeInARow(testBoard, cell.row, cell.col, 2) && canReachFive(testBoard, cell.row, cell.col, 2)) {
      return cell;
    }
  }
  for (const cell of availableCells) {
    const testBoard = board.map((row) => [...row]);
    testBoard[cell.row][cell.col] = 1;
    if (checkTwoInARow(testBoard, cell.row, cell.col, 1)) return cell;
  }
  for (const cell of availableCells) {
    const testBoard = board.map((row) => [...row]);
    testBoard[cell.row][cell.col] = 2;
    if (checkTwoInARow(testBoard, cell.row, cell.col, 2) && canReachFive(testBoard, cell.row, cell.col, 2)) {
      return cell;
    }
  }
  for (const cell of availableCells) {
    if (isNearHumanPiece(board, cell.row, cell.col)) return cell;
  }
  const centerCells = availableCells.filter((cell) => {
    const distance = Math.sqrt((cell.row - 4.5) ** 2 + (cell.col - 4.5) ** 2);
    return distance <= 2;
  });
  if (centerCells.length > 0) {
    return centerCells[Math.floor(Math.random() * centerCells.length)];
  }
  return availableCells[Math.floor(Math.random() * availableCells.length)];
}

export function getBestAIMove(
  availableCells: Cell[],
  board: Board,
  difficulty: AIDifficulty
): Cell {
  if (availableCells.length === 0) {
    return { row: 0, col: 0 };
  }
  if (difficulty === 'easy') return getEasyAIMove(availableCells, board);
  if (difficulty === 'medium') return getMediumAIMove(availableCells, board);
  return getHardAIMove(availableCells, board);
}
