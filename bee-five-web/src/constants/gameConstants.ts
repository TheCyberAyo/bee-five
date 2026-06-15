// Shared game constants to avoid duplication across components

export const GRID_SIZE = 10;
export const CELL_SIZE = 60; // Increased for better desktop visibility
export const BORDER_WIDTH = 2;
export const CANVAS_SIZE = GRID_SIZE * CELL_SIZE + (GRID_SIZE + 1) * BORDER_WIDTH;

// Multiplayer / local-style boards use smaller cells for a compact grid
export const MULTIPLAYER_CELL_SIZE = 40;
export const MULTIPLAYER_CANVAS_SIZE = GRID_SIZE * MULTIPLAYER_CELL_SIZE + (GRID_SIZE + 1) * BORDER_WIDTH;

/** Max display width for local-style boards (matches mobile local challenge footprint) */
export const LOCAL_BOARD_MAX_WIDTH = `min(90vw, ${MULTIPLAYER_CANVAS_SIZE}px)`;


