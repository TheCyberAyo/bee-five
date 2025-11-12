// Simple game logic for Connect-Five game
const GRID_SIZE = 10;

// Create empty board
export const createEmptyBoard = () => {
  return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
};

// Check if board is full
export const isBoardFull = (board) => {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (board[row][col] === 0) {
        return false;
      }
    }
  }
  return true;
};

// Check for win condition (5 in a row)
export const checkWinCondition = (board, row, col, player) => {
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal \
    [1, -1]   // diagonal /
  ];

  for (let [dRow, dCol] of directions) {
    let count = 1; // Count the current piece

    // Check in positive direction
    for (let i = 1; i < 5; i++) {
      const newRow = row + i * dRow;
      const newCol = col + i * dCol;
      if (
        newRow >= 0 && newRow < GRID_SIZE &&
        newCol >= 0 && newCol < GRID_SIZE &&
        board[newRow][newCol] === player
      ) {
        count++;
      } else {
        break;
      }
    }

    // Check in negative direction
    for (let i = 1; i < 5; i++) {
      const newRow = row - i * dRow;
      const newCol = col - i * dCol;
      if (
        newRow >= 0 && newRow < GRID_SIZE &&
        newCol >= 0 && newCol < GRID_SIZE &&
        board[newRow][newCol] === player
      ) {
        count++;
      } else {
        break;
      }
    }

    if (count >= 5) {
      return true;
    }
  }

  return false;
};

// Get winning pieces
export const getWinningPieces = (board, row, col, player) => {
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal \
    [1, -1]   // diagonal /
  ];

  for (let [dRow, dCol] of directions) {
    const pieces = [{ row, col }];
    
    // Check in positive direction
    for (let i = 1; i < 5; i++) {
      const newRow = row + i * dRow;
      const newCol = col + i * dCol;
      if (
        newRow >= 0 && newRow < GRID_SIZE &&
        newCol >= 0 && newCol < GRID_SIZE &&
        board[newRow][newCol] === player
      ) {
        pieces.push({ row: newRow, col: newCol });
      } else {
        break;
      }
    }

    // Check in negative direction
    for (let i = 1; i < 5; i++) {
      const newRow = row - i * dRow;
      const newCol = col - i * dCol;
      if (
        newRow >= 0 && newRow < GRID_SIZE &&
        newCol >= 0 && newCol < GRID_SIZE &&
        board[newRow][newCol] === player
      ) {
        pieces.unshift({ row: newRow, col: newCol });
      } else {
        break;
      }
    }

    if (pieces.length >= 5) {
      return pieces.slice(0, 5); // Return first 5 winning pieces
    }
  }

  return [];
};


