"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { soundManager } from '../utils/sounds';
import { useGameLogic } from '../hooks/useGameLogic';
import GameCanvas from './GameCanvas';
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

export default function ClassicAIGame({ onBackToMenu }: ClassicAIGameProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [gameIndex, setGameIndex] = useState(1);
  const [boardGameIndex, setBoardGameIndex] = useState(1);
  const [difficulty, setDifficulty] = useState<AIDifficulty>(() => classicStreakDifficultyForGame(1));
  const [classicGamesWon, setClassicGamesWon] = useState(0);
  const [classicBestStreak, setClassicBestStreak] = useState(0);
  const [classicSessionTimeLeft, setClassicSessionTimeLeft] = useState(CLASSIC_SESSION_SECONDS);
  const [classicGameOver, setClassicGameOver] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const winHandledRef = useRef(false);
  const sessionEndedRef = useRef(false);
  const aiProcessingRef = useRef(false);
  const classicGamesWonRef = useRef(0);
  const classicBestStreakRef = useRef(0);

  const initialBoard = useMemo(
    () => createBoardWithRandomBlocks(blockedCellCountForGame(boardGameIndex)),
    [boardGameIndex]
  );

  const { gameState, handleCellClick, resetGame } = useGameLogic({
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
        if (gameState.winner !== 0) return prev;
        if (prev <= 1) {
          endSession(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [classicGameOver, gameState.winner, endSession]);

  useEffect(() => {
    if (classicGameOver || winHandledRef.current) return;

    if (gameState.winner === 1) {
      winHandledRef.current = true;
      soundManager.playVictorySound();

      const points = scoreForDifficulty(difficulty);
      const nextIndex = gameIndex + 1;

      setClassicGamesWon((prev) => {
        const newScore = prev + points;
        classicGamesWonRef.current = newScore;
        if (newScore > classicBestStreakRef.current) {
          setClassicBestStreak(newScore);
          classicBestStreakRef.current = newScore;
          saveClassicBestStreak(newScore);
        }
        return newScore;
      });
      setGameIndex(nextIndex);
      setDifficulty(classicStreakDifficultyForGame(nextIndex));

      const timeout = window.setTimeout(() => {
        winHandledRef.current = false;
        setBoardGameIndex(nextIndex);
        resetGame();
      }, 2000);
      return () => window.clearTimeout(timeout);
    }

    if (gameState.winner === 2) {
      winHandledRef.current = true;
      soundManager.playDefeatSound();
      const timeout = window.setTimeout(() => {
        endSession(false, false);
      }, 2000);
      return () => window.clearTimeout(timeout);
    }

    if (!gameState.isGameActive && gameState.winner === 0) {
      winHandledRef.current = true;
      const timeout = window.setTimeout(() => {
        endSession(false);
      }, 2000);
      return () => window.clearTimeout(timeout);
    }
  }, [
    gameState.winner,
    gameState.isGameActive,
    classicGameOver,
    difficulty,
    gameIndex,
    resetGame,
    endSession,
  ]);

  useEffect(() => {
    if (
      classicGameOver ||
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
    classicGameOver,
    difficulty,
    handleCellClick,
  ]);

  const onCellClick = (row: number, col: number) => {
    if (
      classicGameOver ||
      gameState.currentPlayer !== 1 ||
      gameState.winner !== 0 ||
      aiProcessingRef.current
    ) {
      return;
    }
    handleCellClick(row, col);
  };

  const handleHome = () => {
    if (window.confirm('Are you sure you want to exit?')) {
      onBackToMenu();
      soundManager.playClickSound();
    }
  };

  const handleTryAgain = () => {
    sessionEndedRef.current = false;
    winHandledRef.current = false;
    setClassicGameOver(false);
    setClassicSessionTimeLeft(CLASSIC_SESSION_SECONDS);
    setClassicGamesWon(0);
    setGameIndex(1);
    setBoardGameIndex(1);
    setDifficulty(classicStreakDifficultyForGame(1));
    setShowWinModal(false);
    setWinMessage('');
    resetGame();
    soundManager.playClickSound();
  };

  const turnLabel =
    gameState.currentPlayer === 1
      ? '▶ Your Turn (Yellow)'
      : "AI's Turn (Black)";

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

      <div style={{ padding: '15px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
          {turnLabel}
        </div>
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
        padding: isMobile ? '8px' : '16px',
        minHeight: 0,
      }}>
        <div style={{ width: '100%', maxWidth: isMobile ? '100vw' : '520px' }}>
          <GameCanvas
            gameState={gameState}
            onCellClick={onCellClick}
            fillWidth
            classicBoardStyle
          />
        </div>
      </div>

      <div style={{
        background: '#000',
        padding: '15px',
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
