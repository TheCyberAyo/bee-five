// Shared game logic utilities

export const checkWinCondition = (board: (0 | 1 | 2)[][], row: number, col: number, player: 1 | 2): boolean => {
  const winningPieces = getWinningPieces(board, row, col, player);
  return winningPieces.length >= 5;
};

export const getWinningPieces = (board: (0 | 1 | 2)[][], row: number, col: number, player: 1 | 2): { row: number; col: number }[] => {
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal \
    [1, -1]   // diagonal /
  ];

  for (const [dx, dy] of directions) {
    const winningPieces: { row: number; col: number }[] = [];
    
    // Start with the current piece
    winningPieces.push({ row, col });

    // Check in positive direction
    for (let i = 1; i < 5; i++) {
      const newRow = row + i * dx;
      const newCol = col + i * dy;
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
        winningPieces.push({ row: newRow, col: newCol });
      } else {
        break;
      }
    }

    // Check in negative direction
    for (let i = 1; i < 5; i++) {
      const newRow = row - i * dx;
      const newCol = col - i * dy;
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10 && board[newRow][newCol] === player) {
        winningPieces.unshift({ row: newRow, col: newCol });
      } else {
        break;
      }
    }

    if (winningPieces.length >= 5) {
      return winningPieces;
    }
  }

  return [];
};






