// Shared game constants to avoid duplication across components

export const GRID_SIZE = 10;
export const CELL_SIZE = 60; // Increased for better desktop visibility
export const BORDER_WIDTH = 2;
export const CANVAS_SIZE = GRID_SIZE * CELL_SIZE + (GRID_SIZE + 1) * BORDER_WIDTH;

// Multiplayer canvas uses smaller cells for better mobile experience
export const MULTIPLAYER_CELL_SIZE = 40;
export const MULTIPLAYER_CANVAS_SIZE = GRID_SIZE * MULTIPLAYER_CELL_SIZE + (GRID_SIZE + 1) * BORDER_WIDTH;


