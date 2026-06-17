"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameLogic, getEffectiveBlindPlay } from '../hooks/useGameLogic';
import GameCanvas from './GameCanvas';
import { LOCAL_BOARD_MAX_WIDTH } from '../constants/gameConstants';
import { getBestAIMove } from '../utils/aiOpponent';
import { getGameRules } from '../utils/adventureGameRules';
import { isInMudZone } from '../utils/gameLogic';
import { soundManager } from '../utils/sounds';
import {
  onAdventureGameWon,
  onAdventureMatchLost,
  type AdventureXpContext,
} from '../services/xpService';

interface AdventureClassicAIGameProps {
  onBackToMenu: () => void;
  initialDifficulty?: 'easy' | 'medium' | 'hard';
  initialTimer?: number;
  backgroundColor?: 'yellow' | 'black';
  onNextGame?: () => void;
  showCountdown?: boolean;
  gameNumber?: number;
  onBackToMap?: () => void;
  onGameWin?: (won: boolean) => void;
  currentMatch?: number;
  playerWins?: number;
  aiWins?: number;
  requiredWins?: number;
  totalGames?: number;
  isMatchComplete?: boolean;
  isWaitingForNextGame?: boolean;
  countdownTimer?: number;
  showMatchWinnerAnnouncement?: boolean;
  matchWinnerMessage?: string;
  gameInitialized?: boolean;
  onGameInitialized?: () => void;
  showResultsPopup?: boolean;
  onResultsPopupNext?: () => void;
  onCloseResultsPopup?: () => void;
  onContinueToNextGame?: () => void;
  adventureXpContext?: AdventureXpContext;
  sessionUserId?: string | null;
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

const modalButtonStyle = (bg: string): React.CSSProperties => ({
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: 'bold',
  backgroundColor: bg,
  color: '#fff',
  border: '2px solid #000',
  borderRadius: '10px',
  cursor: 'pointer',
  minWidth: '120px',
});

export default function AdventureClassicAIGame({
  onBackToMenu,
  initialDifficulty: _initialDifficulty = 'medium',
  initialTimer: _initialTimer = 15,
  backgroundColor: _backgroundColor = 'yellow',
  onNextGame,
  showCountdown = false,
  gameNumber = 1,
  onBackToMap,
  onGameWin,
  currentMatch,
  playerWins,
  aiWins,
  requiredWins: _requiredWins,
  totalGames,
  isMatchComplete,
  isWaitingForNextGame,
  countdownTimer,
  showMatchWinnerAnnouncement,
  matchWinnerMessage,
  gameInitialized = false,
  onGameInitialized,
  showResultsPopup = false,
  onResultsPopupNext,
  onCloseResultsPopup,
  onContinueToNextGame,
  adventureXpContext,
  sessionUserId = null,
}: AdventureClassicAIGameProps) {
  const matchNumber = currentMatch || 1;
  const gameRules = getGameRules(gameNumber, matchNumber);
  const aiDifficulty = gameRules.aiDifficulty;

  const [isMobile, setIsMobile] = useState(false);
  const [showStartCountdown, setShowStartCountdown] = useState(showCountdown);
  const [startCountdown, setStartCountdown] = useState(3);
  const [gameStarted, setGameStarted] = useState(!showCountdown);
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [lastXpDelta, setLastXpDelta] = useState(0);
  const [winMessage, setWinMessage] = useState('');
  const [gameProcessed, setGameProcessed] = useState(false);

  const gameActiveRef = useRef(true);
  const popupScheduledRef = useRef(false);
  const countdownCompletedRef = useRef(false);
  const aiProcessingRef = useRef(false);
  const winPopupTimerRef = useRef<number | null>(null);
  const gameEndRef = useRef(false);

  const pauseTimer = showStartCountdown || !gameStarted;

  const { gameState, handleCellClick, resetGame } = useGameLogic({
    timeLimit: gameRules.timeLimit,
    startingPlayer: gameRules.startingPlayer,
    gameNumber,
    currentMatch: matchNumber,
    pauseTimer,
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleExit = useCallback(() => {
    if (window.confirm('Are you sure you want to exit?')) {
      onBackToMenu();
      soundManager.playClickSound();
    }
  }, [onBackToMenu]);

  const handleMapExit = useCallback(() => {
    if (onBackToMap) {
      onBackToMap();
    } else {
      handleExit();
    }
  }, [onBackToMap, handleExit]);

  // Sync countdown state with prop changes (especially when component remounts for new match)
  useEffect(() => {
    if (showCountdown && !showStartCountdown && !gameStarted && !countdownCompletedRef.current) {
      setShowStartCountdown(true);
      setStartCountdown(3);
      setGameStarted(false);
      countdownCompletedRef.current = false;
    } else if (!showCountdown && showStartCountdown) {
      setShowStartCountdown(false);
      setStartCountdown(0);
      setGameStarted(true);
      gameActiveRef.current = true;
      if (!gameInitialized && onGameInitialized) {
        onGameInitialized();
      }
    } else if (!showCountdown && !showStartCountdown) {
      if (!gameStarted) {
        setGameStarted(true);
        gameActiveRef.current = true;
      }
      if (!gameInitialized && onGameInitialized) {
        onGameInitialized();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCountdown, onGameInitialized, showStartCountdown, gameStarted]);

  // Start countdown (3, 2, 1, GO!)
  useEffect(() => {
    if (showStartCountdown && startCountdown > 0) {
      const timer = window.setTimeout(() => {
        setStartCountdown((prev) => prev - 1);
      }, 1000);
      return () => window.clearTimeout(timer);
    }
    if (showStartCountdown && startCountdown === 0) {
      setShowStartCountdown(false);
      setGameStarted(true);
      gameActiveRef.current = true;
      countdownCompletedRef.current = true;
      if (onGameInitialized) {
        onGameInitialized();
      }
    }
  }, [showStartCountdown, startCountdown, onGameInitialized]);

  const scheduleWinPopup = useCallback((alwaysShow = false) => {
    if (winPopupTimerRef.current) {
      window.clearTimeout(winPopupTimerRef.current);
    }
    winPopupTimerRef.current = window.setTimeout(() => {
      if (alwaysShow || currentMatch === undefined || isMatchComplete) {
        setShowWinPopup(true);
      }
      winPopupTimerRef.current = null;
    }, 1000);
  }, [currentMatch, isMatchComplete]);

  // Detect game end from useGameLogic state
  useEffect(() => {
    if (!gameStarted || !gameInitialized) return;
    if (gameEndRef.current || gameProcessed) return;
    if (gameState.isGameActive && gameState.winner === 0) return;

    gameEndRef.current = true;
    setGameProcessed(true);
    popupScheduledRef.current = true;
    gameActiveRef.current = false;
    setLastXpDelta(0);

    const xpOptions = {
      levelJustPlayed: gameNumber,
      adventureContext: adventureXpContext,
      userId: sessionUserId,
    };

    const isTimeout = gameState.timeLeft === 0;
    const isDraw = gameState.winner === 0 && !gameState.isGameActive;

    if (isDraw) {
      setWinMessage('Draw!');
      scheduleWinPopup(false);
      if (onGameWin) {
        window.setTimeout(() => onGameWin(false), 100);
      }
      return;
    }

    if (gameState.winner === 1) {
      const { delta } = onAdventureGameWon(xpOptions);
      setLastXpDelta(delta);
      setWinMessage(isTimeout ? "Time's Up - You Won!" : 'You Won!');
      soundManager.playVictorySound();
      scheduleWinPopup(isTimeout);
      if (onGameWin) {
        window.setTimeout(() => onGameWin(true), 100);
      }
      return;
    }

    if (gameState.winner === 2) {
      const { delta } = onAdventureMatchLost(xpOptions);
      setLastXpDelta(delta);
      setWinMessage(isTimeout ? "Time's Up - You Lost" : 'You Lost');
      soundManager.playDefeatSound();
      scheduleWinPopup(isTimeout);
      if (onGameWin) {
        window.setTimeout(() => onGameWin(false), 100);
      }
    }
  }, [
    gameState.winner,
    gameState.isGameActive,
    gameState.timeLeft,
    gameStarted,
    gameInitialized,
    gameProcessed,
    onGameWin,
    scheduleWinPopup,
    gameNumber,
    adventureXpContext,
    sessionUserId,
  ]);

  // AI move logic
  useEffect(() => {
    const canAIPlay = gameStarted && gameInitialized;
    if (
      !canAIPlay ||
      gameState.currentPlayer !== 2 ||
      gameState.winner !== 0 ||
      !gameState.isGameActive ||
      !gameActiveRef.current ||
      aiProcessingRef.current
    ) {
      return;
    }

    aiProcessingRef.current = true;
    const timer = window.setTimeout(() => {
      const availableCells: { row: number; col: number }[] = [];
      const effectiveBlindPlay = getEffectiveBlindPlay(gameState.isBlindPlay, gameState.temporaryBlindPlay);
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
          if (gameState.board[row][col] === 0) {
            if (effectiveBlindPlay && isInMudZone(row, col, gameState.mudZones)) {
              continue;
            }
            availableCells.push({ row, col });
          }
        }
      }

      if (availableCells.length > 0) {
        const selectedCell = effectiveBlindPlay
          ? availableCells[Math.floor(Math.random() * availableCells.length)]
          : getBestAIMove(availableCells, gameState.board, aiDifficulty);
        handleCellClick(selectedCell.row, selectedCell.col);
      }
      aiProcessingRef.current = false;
    }, 500);

    return () => {
      window.clearTimeout(timer);
      aiProcessingRef.current = false;
    };
  }, [
    gameStarted,
    gameInitialized,
    gameState.currentPlayer,
    gameState.winner,
    gameState.isGameActive,
    gameState.board,
    gameState.isBlindPlay,
    gameState.temporaryBlindPlay,
    gameState.mudZones,
    aiDifficulty,
    handleCellClick,
  ]);

  const onCellClick = (row: number, col: number) => {
    if (
      !gameStarted ||
      !gameInitialized ||
      gameState.winner !== 0 ||
      gameState.currentPlayer !== 1 ||
      !gameActiveRef.current ||
      aiProcessingRef.current
    ) {
      return;
    }
    handleCellClick(row, col);
  };

  const handlePlayAgain = () => {
    resetGame();
    setShowWinPopup(false);
    setWinMessage('');
    setLastXpDelta(0);
    setGameProcessed(false);
    gameEndRef.current = false;
    popupScheduledRef.current = false;
    gameActiveRef.current = true;
    countdownCompletedRef.current = false;
    setShowStartCountdown(showCountdown);
    setStartCountdown(showCountdown ? 3 : 0);
    setGameStarted(!showCountdown);
    if (winPopupTimerRef.current) {
      window.clearTimeout(winPopupTimerRef.current);
      winPopupTimerRef.current = null;
    }
  };

  const handleContinue = () => {
    setShowWinPopup(false);
    if (winPopupTimerRef.current) {
      window.clearTimeout(winPopupTimerRef.current);
      winPopupTimerRef.current = null;
    }
    if (onContinueToNextGame) {
      onContinueToNextGame();
    } else if (onNextGame) {
      onNextGame();
    }
  };

  const turnAnnouncement =
    gameState.winner !== 0
      ? 'Game Over'
      : gameState.currentPlayer === 1
        ? 'Your Turn'
        : "AI's Turn";

  const playerWonGame =
    gameState.winner === 1 || (gameState.timeLeft === 0 && gameState.currentPlayer === 2);
  const showContinueButton = playerWonGame;
  const showPlayAgainButton =
    gameState.winner === 2 ||
    (gameState.timeLeft === 0 && gameState.currentPlayer === 1) ||
    gameState.winner === 0;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  };

  return (
    <div
      style={{
        background: GRAY_BG,
        width: '100vw',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#000',
          padding: '15px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderBottom: `2px solid ${PRIMARY_YELLOW}`,
        }}
      >
        <img
          src="/BEE-FIVE.png"
          alt="Bee Five"
          style={{ height: '40px', objectFit: 'contain' }}
        />
      </div>

      {/* Match scoreboard */}
      {currentMatch !== undefined && playerWins !== undefined && aiWins !== undefined && (
        <div
          style={{
            padding: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderBottom: `2px solid ${PRIMARY_YELLOW}`,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
            You {playerWins} : {aiWins} AI
          </div>
          {isMatchComplete && (
            <div
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: playerWins > aiWins ? '#4CAF50' : '#F44336',
                marginTop: '4px',
              }}
            >
              {playerWins > aiWins ? 'Match Won! 🎉' : 'Match Lost'}
            </div>
          )}
          {isWaitingForNextGame && countdownTimer !== undefined && (
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333', marginTop: '4px' }}>
              Next game in {countdownTimer}...
            </div>
          )}
        </div>
      )}

      {/* Game info row: match number, turn, timer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 15px',
        }}
      >
        {currentMatch !== undefined && totalGames !== undefined ? (
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
            Game {currentMatch} of {totalGames}
          </span>
        ) : (
          <span style={{ flex: 1 }} />
        )}
        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#000', flex: 1, textAlign: 'center' }}>
          <span style={{ color: '#4CAF50', fontSize: '28px' }}>▶</span> {turnAnnouncement}
        </span>
        {gameRules.timeLimit > 0 && (
          <span
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: gameState.timeLeft < 5 ? '#F44336' : '#4CAF50',
            }}
          >
            ⏱️ {gameState.timeLeft}s
          </span>
        )}
      </div>

      {/* Board */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem',
          minHeight: 0,
          position: 'relative',
        }}
      >
        <div style={{ width: '100%', maxWidth: LOCAL_BOARD_MAX_WIDTH, margin: '0 auto' }}>
          <GameCanvas
            gameState={gameState}
            onCellClick={onCellClick}
            gameNumber={gameNumber}
            fillWidth
          />
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          background: '#000',
          padding: isMobile ? '15px 15px 45px' : '15px',
          display: 'flex',
          justifyContent: 'center',
          gap: '15px',
          borderTop: `2px solid ${PRIMARY_YELLOW}`,
        }}
      >
        <button type="button" onClick={handleExit} style={footerButtonStyle}>
          <img
            src="/homeImagery/home.png"
            alt=""
            style={{ width: 20, height: 20, objectFit: 'contain' }}
          />
          <span>Home</span>
        </button>
        <button type="button" onClick={handleMapExit} style={footerButtonStyle}>
          <span>🗺️ Map</span>
        </button>
      </div>

      {/* Match winner announcement */}
      {showMatchWinnerAnnouncement && matchWinnerMessage && (
        <div style={overlayStyle}>
          <div
            style={{
              backgroundColor: PRIMARY_YELLOW,
              padding: '30px 40px',
              borderRadius: '20px',
              border: '4px solid black',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#000', margin: 0 }}>
              {matchWinnerMessage}
            </p>
          </div>
        </div>
      )}

      {/* Start countdown overlay */}
      {showStartCountdown && !isWaitingForNextGame && (
        <div style={overlayStyle}>
          <span
            style={{
              fontSize: '120px',
              fontWeight: 'bold',
              color: PRIMARY_YELLOW,
              textShadow: '4px 4px 8px #000',
            }}
          >
            {startCountdown > 0 ? startCountdown : 'GO!'}
          </span>
        </div>
      )}

      {/* Between-match countdown overlay */}
      {isWaitingForNextGame &&
        countdownTimer !== undefined &&
        countdownTimer > 0 &&
        !showStartCountdown && (
          <div style={overlayStyle}>
            <span
              style={{
                fontSize: '120px',
                fontWeight: 'bold',
                color: PRIMARY_YELLOW,
                textShadow: '4px 4px 8px #000',
              }}
            >
              {countdownTimer}
            </span>
          </div>
        )}

      {/* Win / loss / draw popup */}
      {showWinPopup && (
        <div style={overlayStyle}>
          <div
            style={{
              backgroundColor: PRIMARY_YELLOW,
              padding: '30px',
              borderRadius: '20px',
              border: '4px solid black',
              textAlign: 'center',
              minWidth: '280px',
              maxWidth: '90vw',
            }}
          >
            <h1 style={{ fontSize: '24px', color: '#000', marginBottom: '20px' }}>{winMessage}</h1>

            {lastXpDelta !== 0 && (
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: lastXpDelta > 0 ? '#4CAF50' : '#F44336',
                  margin: '0 0 12px',
                }}
              >
                {lastXpDelta > 0 ? `+${lastXpDelta} XP` : `${lastXpDelta} XP`}
              </p>
            )}

            {currentMatch !== undefined && playerWins !== undefined && aiWins !== undefined && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', margin: '0 0 8px' }}>
                  Match: {playerWins} - {aiWins}
                </p>
                {isWaitingForNextGame && countdownTimer !== undefined && (
                  <p style={{ fontSize: '14px', color: '#333', margin: 0 }}>
                    Next game in {countdownTimer}...
                  </p>
                )}
                {!isMatchComplete && !isWaitingForNextGame && (
                  <p style={{ fontSize: '14px', color: '#333', margin: 0 }}>
                    Complete the match to proceed!
                  </p>
                )}
                {isMatchComplete && (
                  <p
                    style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: playerWins > aiWins ? '#4CAF50' : '#F44336',
                      margin: '8px 0 0',
                    }}
                  >
                    {playerWins > aiWins ? 'Match Won! 🎉' : 'Match Lost'}
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              {currentMatch !== undefined && !isMatchComplete && (
                <p style={{ fontSize: '16px', color: '#333', fontWeight: 'bold', margin: 0 }}>
                  Match continues... Next game starting soon
                </p>
              )}

              {((currentMatch === undefined) || isMatchComplete) && !isWaitingForNextGame && (
                <>
                  {showContinueButton && (
                    <button type="button" onClick={handleContinue} style={modalButtonStyle('#4CAF50')}>
                      ➡️ Continue
                    </button>
                  )}
                  {showPlayAgainButton && (
                    <button type="button" onClick={handlePlayAgain} style={modalButtonStyle('#4CAF50')}>
                      🔄 Play Again
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowWinPopup(false);
                      handleExit();
                    }}
                    style={modalButtonStyle('#2196F3')}
                  >
                    Back to Menu
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Match results popup */}
      {showResultsPopup && currentMatch !== undefined && isMatchComplete && (
        <div style={overlayStyle}>
          <div
            style={{
              backgroundColor: PRIMARY_YELLOW,
              padding: '30px',
              borderRadius: '20px',
              border: '4px solid black',
              textAlign: 'center',
              minWidth: '280px',
              maxWidth: '90vw',
            }}
          >
            <p style={{ fontSize: '60px', margin: '0 0 20px' }}>
              {playerWins !== undefined && aiWins !== undefined && playerWins > aiWins ? '🏆' : '😔'}
            </p>
            <h1 style={{ fontSize: '24px', color: '#000', marginBottom: '10px' }}>
              {playerWins !== undefined && aiWins !== undefined && playerWins > aiWins
                ? 'MATCH COMPLETE! 🎉'
                : 'MATCH COMPLETE'}
            </h1>
            {playerWins !== undefined && aiWins !== undefined && playerWins > aiWins && (
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '20px' }}>
                YOU WIN! 🎊
              </p>
            )}

            {playerWins !== undefined && aiWins !== undefined && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '20px',
                  marginBottom: '25px',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#000',
                    padding: '15px',
                    borderRadius: '15px',
                    minWidth: '80px',
                  }}
                >
                  <div style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>You</div>
                  <div style={{ fontSize: '32px', color: '#fff', fontWeight: 'bold' }}>{playerWins}</div>
                </div>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#666' }}>vs</span>
                <div
                  style={{
                    backgroundColor: '#000',
                    padding: '15px',
                    borderRadius: '15px',
                    minWidth: '80px',
                  }}
                >
                  <div style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>AI</div>
                  <div style={{ fontSize: '32px', color: '#fff', fontWeight: 'bold' }}>{aiWins}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  if (onCloseResultsPopup) onCloseResultsPopup();
                  if (onResultsPopupNext) onResultsPopupNext();
                }}
                style={modalButtonStyle('#4CAF50')}
              >
                {playerWins !== undefined && aiWins !== undefined && playerWins > aiWins
                  ? '🏆 Continue Adventure'
                  : '🔄 Play Again'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onCloseResultsPopup) onCloseResultsPopup();
                  handleExit();
                }}
                style={modalButtonStyle('#2196F3')}
              >
                🏠 Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
