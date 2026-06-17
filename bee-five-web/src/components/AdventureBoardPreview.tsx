"use client";

import React, { useMemo } from 'react';
import GameCanvas from './GameCanvas';
import {
  createBoardWithBlocks,
  gameEndsWith2SpecificPattern,
  generateMudZones,
  isMultipleOf50Match2,
} from '../utils/gameLogic';
import type { GameState } from '../hooks/useGameLogic';
import { getGameRules } from '../utils/adventureGameRules';

/** Home screen board preview size (between tagline and play button) */
export const HOME_BOARD_MAX_WIDTH = { mobile: 400, desktop: 470 } as const;

export function homeBoardMaxWidth(isMobile: boolean): number {
  return isMobile ? HOME_BOARD_MAX_WIDTH.mobile : HOME_BOARD_MAX_WIDTH.desktop;
}

interface AdventureBoardPreviewProps {
  gameNumber: number;
  isMobile: boolean;
  /** Full-bleed background for home screen overlay layout */
  variant?: 'inline' | 'background';
  /** Explicit square size in px (home screen fit) */
  size?: number;
}

export default function AdventureBoardPreview({
  gameNumber,
  isMobile,
  variant = 'inline',
  size,
}: AdventureBoardPreviewProps) {
  const rules = getGameRules(gameNumber, 1);
  const isBlindPlay =
    gameEndsWith2SpecificPattern(gameNumber) || isMultipleOf50Match2(gameNumber, 1);

  const board = useMemo(
    () => createBoardWithBlocks(gameNumber, isBlindPlay, 1),
    [gameNumber, isBlindPlay]
  );

  const mudZones = useMemo(() => generateMudZones(gameNumber), [gameNumber]);

  const previewState: GameState = useMemo(
    () => ({
      board,
      currentPlayer: rules.startingPlayer,
      isGameActive: false,
      winner: 0,
      timeLeft: rules.timeLimit,
      humanMoveCount: 0,
      pieceAges: Array.from({ length: 10 }, () => Array(10).fill(-1)),
      player1MoveCount: 0,
      player2MoveCount: 0,
      mudZones,
      stuckPieces: {},
      isBlindPlay,
      temporaryBlindPlay: false,
      totalMoveCount: 0,
      blockShiftMoveCount: 0,
      blindPlayTriggerMove: 0,
      winningPieces: [],
    }),
    [board, rules.startingPlayer, rules.timeLimit, mudZones, isBlindPlay]
  );

  const canvas = (
    <GameCanvas
      gameState={previewState}
      onCellClick={() => {}}
      gameNumber={gameNumber}
      fillWidth={variant === 'inline'}
    />
  );

  if (variant === 'background') {
    const boardMaxWidth = size ?? homeBoardMaxWidth(isMobile);

    return (
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          background: 'transparent',
        }}
      >
        <div
          style={{
            width: boardMaxWidth,
            height: boardMaxWidth,
            maxWidth: '100%',
            maxHeight: '100%',
            margin: '0 auto',
          }}
        >
          <GameCanvas
            gameState={previewState}
            onCellClick={() => {}}
            gameNumber={gameNumber}
            fillWidth
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: isMobile ? '1rem' : 'clamp(1rem, 2vw, 1.5rem)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: isMobile ? 240 : 300,
          margin: '0 auto',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {canvas}
      </div>
      <p
        style={{
          margin: '8px 0 0',
          fontSize: isMobile ? '0.9rem' : '1rem',
          fontWeight: 700,
          color: '#2E7D32',
        }}
      >
        Level {gameNumber}
      </p>
    </div>
  );
}

export const adventurePlayButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  padding: '12px 24px',
  background: 'linear-gradient(180deg, #4CAF50 0%, #2E7D32 100%)',
  border: 'none',
  borderRadius: '14px',
  color: '#fff',
  fontSize: '18px',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
  touchAction: 'manipulation',
};
