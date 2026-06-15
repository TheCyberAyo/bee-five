'use client';

import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
  forwardRef,
} from 'react';
import GameCanvas from '../GameCanvas';
import { LOCAL_BOARD_MAX_WIDTH } from '../../constants/gameConstants';
import { type GameState } from '../../hooks/useGameLogic';
import { checkWinCondition, getWinningPieces, isBoardFull } from '../../utils/gameLogic';
import {
  onlineMatchPlayer1Id,
  onlineMatchPlayer2Id,
} from '../../utils/onlineMatch';
import { GRID_SIZE } from '../../constants/gameConstants';

function payloadInt(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Math.trunc(v);
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

function emptyBoard(): (0 | 1 | 2)[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0) as (0 | 1 | 2)[]);
}

function emptyGameStateExtras() {
  return {
    timeLeft: 0,
    humanMoveCount: 0,
    pieceAges: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0)),
    player1MoveCount: 0,
    player2MoveCount: 0,
    mudZones: [] as { row: number; col: number }[],
    stuckPieces: {} as Record<string, number>,
    isBlindPlay: false,
    totalMoveCount: 0,
    blockShiftMoveCount: 0,
    blindPlayTriggerMove: 0,
  };
}

export interface OnlineBeeFiveBoardHandle {
  applyRemoteMove: (payload: Record<string, unknown>) => void;
  hasPlacedPieces: boolean;
}

interface OnlineBeeFiveBoardProps {
  myUserId: string;
  opponentUserId: string;
  myUsername: string;
  opponentUsername: string;
  initialFirstSeat: 1 | 2;
  sendNetworkEvent: (event: Record<string, unknown>) => Promise<void>;
  onWin: (winnerUserId: string) => void;
  onDraw: () => void;
}

const OnlineBeeFiveBoard = forwardRef<OnlineBeeFiveBoardHandle, OnlineBeeFiveBoardProps>(
  function OnlineBeeFiveBoard(
    {
      myUserId,
      opponentUserId,
      myUsername,
      opponentUsername,
      initialFirstSeat,
      sendNetworkEvent,
      onWin,
      onDraw,
    },
    ref,
  ) {
    const p1Id = onlineMatchPlayer1Id(myUserId, opponentUserId);
    const p2Id = onlineMatchPlayer2Id(myUserId, opponentUserId);
    const mySeat = myUserId === p1Id ? 1 : 2;

    const p1Name = p1Id === myUserId ? myUsername : opponentUsername;
    const p2Name = p2Id === myUserId ? myUsername : opponentUsername;

    const [board, setBoard] = useState<(0 | 1 | 2)[][]>(() => emptyBoard());
    const [currentSeat, setCurrentSeat] = useState<1 | 2>(initialFirstSeat);
    const [winnerSeat, setWinnerSeat] = useState<0 | 1 | 2>(0);
    const [winningPieces, setWinningPieces] = useState<{ row: number; col: number }[]>([]);
    const [gameOver, setGameOver] = useState(false);

    const hasPlacedPieces = useMemo(
      () => board.some((row) => row.some((cell) => cell !== 0)),
      [board],
    );

    const seatName = (seat: 1 | 2) => (seat === 1 ? p1Name : p2Name);

    const turnText = useMemo(() => {
      if (gameOver) {
        if (winnerSeat > 0) return `${seatName(winnerSeat)} wins`;
        return 'Draw';
      }
      const mover = seatName(currentSeat);
      return currentSeat === mySeat ? `Your turn · ${mover}` : `${mover}'s turn`;
    }, [gameOver, winnerSeat, currentSeat, mySeat, p1Name, p2Name]);

    const applyMove = useCallback(
      (row: number, col: number, seat: 1 | 2, notifyParent: boolean) => {
        if (board[row][col] !== 0) return;

        const nextBoard = board.map((r) => [...r]) as (0 | 1 | 2)[][];
        nextBoard[row][col] = seat;

        setBoard(nextBoard);
        setCurrentSeat(seat === 1 ? 2 : 1);

        if (checkWinCondition(nextBoard as (0 | 1 | 2 | 3)[][], row, col, seat)) {
          setWinnerSeat(seat);
          setWinningPieces(
            getWinningPieces(nextBoard as (0 | 1 | 2 | 3)[][], row, col, seat),
          );
          setGameOver(true);
          if (notifyParent) onWin(seat === 1 ? p1Id : p2Id);
          return;
        }

        if (isBoardFull(nextBoard as (0 | 1 | 2 | 3)[][])) {
          setGameOver(true);
          onDraw();
        }
      },
      [board, onDraw, onWin, p1Id, p2Id],
    );

    const applyRemoteMove = useCallback(
      (payload: Record<string, unknown>) => {
        if (gameOver) return;
        if (payload.type !== 'move') return;
        const row = payloadInt(payload.row);
        const col = payloadInt(payload.col);
        const seat = payloadInt(payload.seat) as 1 | 2 | null;
        if (row == null || col == null || seat == null) return;
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
        if (seat !== 1 && seat !== 2) return;
        if (board[row][col] !== 0) return;
        applyMove(row, col, seat, false);
      },
      [applyMove, board, gameOver],
    );

    useImperativeHandle(ref, () => ({
      applyRemoteMove,
      hasPlacedPieces,
    }));

    const handleCellClick = async (row: number, col: number) => {
      if (gameOver || board[row][col] !== 0 || currentSeat !== mySeat) return;

      applyMove(row, col, mySeat, true);
      await sendNetworkEvent({ type: 'move', row, col, seat: mySeat });
    };

    const gameState: GameState = useMemo(
      () => ({
        board: board as (0 | 1 | 2 | 3)[][],
        currentPlayer: currentSeat === mySeat ? 1 : 2,
        isGameActive: !gameOver,
        winner: winnerSeat,
        winningPieces,
        ...emptyGameStateExtras(),
      }),
      [board, currentSeat, gameOver, mySeat, winnerSeat, winningPieces],
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div
          style={{
            margin: '8px 12px 6px',
            padding: '12px 14px',
            background: '#fff',
            border: '2px solid #000',
            borderRadius: '10px',
            textAlign: 'center',
            fontWeight: 800,
            fontSize: '16px',
          }}
        >
          {turnText}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px 12px' }}>
          <div style={{ width: '100%', maxWidth: LOCAL_BOARD_MAX_WIDTH, margin: '0 auto' }}>
            <GameCanvas
              gameState={gameState}
              onCellClick={(r, c) => void handleCellClick(r, c)}
              fillWidth
              classicBoardStyle
            />
          </div>
        </div>
      </div>
    );
  },
);

export default OnlineBeeFiveBoard;
