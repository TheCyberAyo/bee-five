"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { soundManager } from '../utils/sounds';
import { onClassicStreakWin } from '../services/xpService';
import { useGameLogic } from '../hooks/useGameLogic';
import GameCanvas from './GameCanvas';
import { LOCAL_BOARD_MAX_WIDTH } from '../constants/gameConstants';
import { createBoardWithRandomBlocks, BLOCKED_CELL } from '../utils/gameLogic';
import { getBestAIMove } from '../utils/aiOpponent';
import {
  CLASSIC_SESSION_SECONDS,
  classicStreakDifficultyForGame,
  scoreForDifficulty,
  blockedCellCountForGame,
  loadClassicBestStreak,
  saveClassicBestStreak,
  formatSessionTime,
  type AIDifficulty,
} from '../utils/classicStreak';

interface ClassicAIGameProps {
  onBackToMenu: () => void;
}

const PRIMARY_YELLOW = '#FFC30B';
const GRAY_BG = '#808080';

const footerButtonStyle: React.CSSProperties = {
  flex: 1,
  maxWidth: '200px',
  backgroundColor: PRIMARY_YELLOW,
  padding: '12px 20px',
  borderRadius: '8px',
  border: '2px solid #000',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  fontWeight: 'bold',
  fontSize: '16px',
  color: '#000',
};

function ClassicRoundBoard({
  boardGameIndex,
  difficulty,
  onHumanWin,
  onAILoss,
  onDraw,
}: {
  boardGameIndex: number;
  difficulty: AIDifficulty;
  onHumanWin: () => void;
  onAILoss: () => void;
  onDraw: () => void;
}) {
  const aiProcessingRef = useRef(false);

  const initialBoard = useMemo(
    () => createBoardWithRandomBlocks(blockedCellCountForGame(boardGameIndex)),
    [boardGameIndex]
  );

  const { gameState, handleCellClick } = useGameLogic({
    timeLimit: 0,
    pauseTimer: true,
    startingPlayer: 1,
    initialBoard,
  });

  const blockedCellCount = useMemo(
    () => gameState.board.flat().filter((cell) => cell === BLOCKED_CELL).length,
    [gameState.board]
  );

  useEffect(() => {
    if (gameState.winner !== 1) return;
    soundManager.playVictorySound();
    const timeout = window.setTimeout(onHumanWin, 2000);
    return () => window.clearTimeout(timeout);
  }, [gameState.winner, onHumanWin]);

  useEffect(() => {
    if (gameState.winner !== 2) return;
    soundManager.playDefeatSound();
    const timeout = window.setTimeout(onAILoss, 2000);
    return () => window.clearTimeout(timeout);
  }, [gameState.winner, onAILoss]);

  useEffect(() => {
    if (gameState.isGameActive || gameState.winner !== 0) return;
    const timeout = window.setTimeout(onDraw, 2000);
    return () => window.clearTimeout(timeout);
  }, [gameState.winner, gameState.isGameActive, onDraw]);

  useEffect(() => {
    if (
      gameState.currentPlayer !== 2 ||
      !gameState.isGameActive ||
      gameState.winner !== 0 ||
      aiProcessingRef.current
    ) {
      return;
    }

    aiProcessingRef.current = true;
    const timer = window.setTimeout(() => {
      const availableCells: { row: number; col: number }[] = [];
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
          if (gameState.board[row][col] === 0) {
            availableCells.push({ row, col });
          }
        }
      }

      if (availableCells.length > 0) {
        const selectedCell = getBestAIMove(availableCells, gameState.board, difficulty);
        handleCellClick(selectedCell.row, selectedCell.col);
      }
      aiProcessingRef.current = false;
    }, 500);

    return () => {
      window.clearTimeout(timer);
      aiProcessingRef.current = false;
    };
  }, [
    gameState.currentPlayer,
    gameState.isGameActive,
    gameState.winner,
    gameState.board,
    difficulty,
    handleCellClick,
  ]);

  const onCellClick = (row: number, col: number) => {
    if (
      gameState.currentPlayer !== 1 ||
      gameState.winner !== 0 ||
      aiProcessingRef.current
    ) {
      return;
    }
    handleCellClick(row, col);
  };

  const turnLabel = gameState.currentPlayer === 1 ? 'Black' : 'Yellow';

  return (
    <>
      <div style={{ padding: '12px', textAlign: 'center' }}>
        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
          <span style={{ color: '#4CAF50', fontSize: '28px' }}>▶</span> {turnLabel}
        </span>
        {blockedCellCount > 0 && (
          <div style={{ fontSize: '13px', color: 'rgba(0,0,0,0.54)', fontWeight: 600, marginTop: '4px' }}>
            {blockedCellCount} blocked cell{blockedCellCount === 1 ? '' : 's'}
          </div>
        )}
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1rem',
        minHeight: 0,
      }}>
        <div style={{ width: '100%', maxWidth: LOCAL_BOARD_MAX_WIDTH, margin: '0 auto' }}>
          <GameCanvas gameState={gameState} onCellClick={onCellClick} fillWidth />
        </div>
      </div>
    </>
  );
}

export default function ClassicAIGame({ onBackToMenu }: ClassicAIGameProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [boardGameIndex, setBoardGameIndex] = useState(1);
  const [sessionKey, setSessionKey] = useState(0);
  const [classicGamesWon, setClassicGamesWon] = useState(0);
  const [classicBestStreak, setClassicBestStreak] = useState(0);
  const [classicSessionTimeLeft, setClassicSessionTimeLeft] = useState(CLASSIC_SESSION_SECONDS);
  const [classicGameOver, setClassicGameOver] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const sessionEndedRef = useRef(false);
  const classicGamesWonRef = useRef(0);
  const classicBestStreakRef = useRef(0);
  const boardGameIndexRef = useRef(1);

  const difficulty = classicStreakDifficultyForGame(boardGameIndex);

  useEffect(() => {
    const best = loadClassicBestStreak();
    setClassicBestStreak(best);
    classicBestStreakRef.current = best;
  }, []);

  useEffect(() => {
    classicGamesWonRef.current = classicGamesWon;
  }, [classicGamesWon]);

  useEffect(() => {
    classicBestStreakRef.current = classicBestStreak;
  }, [classicBestStreak]);

  useEffect(() => {
    boardGameIndexRef.current = boardGameIndex;
  }, [boardGameIndex]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const endSession = useCallback((timeUp: boolean, delayModal = true) => {
    if (sessionEndedRef.current || classicGameOver) return;
    sessionEndedRef.current = true;
    setClassicGameOver(true);

    const score = classicGamesWonRef.current;
    let best = classicBestStreakRef.current;
    if (score > best) {
      best = score;
      setClassicBestStreak(best);
      saveClassicBestStreak(best);
    }

    const showModal = () => {
      setWinMessage(
        timeUp
          ? `Time's up!\nScore: ${score}\nBest: ${best}`
          : `Game Over\nScore: ${score}\nBest: ${best}`
      );
      setShowWinModal(true);
    };

    if (delayModal) {
      window.setTimeout(showModal, 2000);
    } else {
      showModal();
    }
  }, [classicGameOver]);

  useEffect(() => {
    if (classicGameOver) return;

    const interval = window.setInterval(() => {
      setClassicSessionTimeLeft((prev) => {
        if (prev <= 1) {
          endSession(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [classicGameOver, endSession]);

  const handleHumanWin = useCallback(() => {
    const currentIndex = boardGameIndexRef.current;
    const points = scoreForDifficulty(classicStreakDifficultyForGame(currentIndex));

    setClassicGamesWon((prev) => {
      const newScore = prev + points;
      onClassicStreakWin(newScore);
      classicGamesWonRef.current = newScore;
      if (newScore > classicBestStreakRef.current) {
        setClassicBestStreak(newScore);
        classicBestStreakRef.current = newScore;
        saveClassicBestStreak(newScore);
      }
      return newScore;
    });

    setBoardGameIndex(currentIndex + 1);
  }, []);

  const handleAILoss = useCallback(() => {
    endSession(false, false);
  }, [endSession]);

  const handleDraw = useCallback(() => {
    endSession(false);
  }, [endSession]);

  const handleHome = () => {
    if (window.confirm('Are you sure you want to exit?')) {
      onBackToMenu();
      soundManager.playClickSound();
    }
  };

  const handleTryAgain = () => {
    sessionEndedRef.current = false;
    setClassicGameOver(false);
    setClassicSessionTimeLeft(CLASSIC_SESSION_SECONDS);
    setClassicGamesWon(0);
    classicGamesWonRef.current = 0;
    setBoardGameIndex(1);
    boardGameIndexRef.current = 1;
    setSessionKey((k) => k + 1);
    setShowWinModal(false);
    setWinMessage('');
    soundManager.playClickSound();
  };

  return (
    <div style={{
      background: GRAY_BG,
      width: '100vw',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: '#000',
        padding: '15px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderBottom: `2px solid ${PRIMARY_YELLOW}`,
      }}>
        <img src="/BEE-FIVE.png" alt="Bee Five" style={{ height: '40px', objectFit: 'contain' }} />
      </div>

      <div style={{
        background: 'rgba(255, 195, 11, 0.95)',
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '24px',
      }}>
        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
          Best: {classicBestStreak}
        </span>
        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
          Score: {classicGamesWon}
        </span>
        <span style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: classicSessionTimeLeft <= 60 ? '#c62828' : '#000',
        }}>
          Time: {formatSessionTime(classicSessionTimeLeft)}
        </span>
      </div>

      {!classicGameOver && (
        <ClassicRoundBoard
          key={`classic-${sessionKey}-${boardGameIndex}`}
          boardGameIndex={boardGameIndex}
          difficulty={difficulty}
          onHumanWin={handleHumanWin}
          onAILoss={handleAILoss}
          onDraw={handleDraw}
        />
      )}

      <div style={{
        background: '#000',
        padding: isMobile ? '15px 15px 45px' : '15px',
        display: 'flex',
        justifyContent: 'center',
        borderTop: `2px solid ${PRIMARY_YELLOW}`,
      }}>
        <button type="button" onClick={handleHome} style={footerButtonStyle}>
          <img src="/homeImagery/home.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
          <span>Home</span>
        </button>
      </div>

      {showWinModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: PRIMARY_YELLOW,
            padding: '30px',
            borderRadius: '20px',
            border: '4px solid black',
            textAlign: 'center',
            minWidth: '280px',
            maxWidth: '90vw',
          }}>
            <h1 style={{
              fontSize: '24px',
              color: '#000',
              marginBottom: '30px',
              whiteSpace: 'pre-line',
            }}>
              {winMessage}
            </h1>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {classicGameOver && (
                <button
                  type="button"
                  onClick={handleTryAgain}
                  style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    backgroundColor: '#4CAF50',
                    color: '#fff',
                    border: '2px solid #000',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    minWidth: '120px',
                  }}
                >
                  Try Again
                </button>
              )}
              <button
                type="button"
                onClick={() => { setShowWinModal(false); onBackToMenu(); }}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: '#2196F3',
                  color: '#fff',
                  border: '2px solid #000',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  minWidth: '120px',
                }}
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
