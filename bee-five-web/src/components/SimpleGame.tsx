"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { soundManager } from '../utils/sounds';
import { useGameLogic } from '../hooks/useGameLogic';
import GameCanvas from './GameCanvas';
import {
  createBoardWithRandomBlocks,
  blockagesForLocalSeriesGame,
  type LocalSeriesMode,
} from '../utils/gameLogic';

type LocalGameMode = 'single' | LocalSeriesMode;

interface SimpleGameProps {
  onBackToMenu: () => void;
  backgroundColor?: 'yellow' | 'black';
}

const PRIMARY_YELLOW = '#FFC30B';
const GRAY_BG = '#808080';

const modeButtonStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '360px',
  backgroundColor: PRIMARY_YELLOW,
  color: '#000',
  border: '2px solid #000',
  borderRadius: '12px',
  padding: '18px 20px',
  fontSize: '18px',
  fontWeight: 'bold',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
};

function LocalHeader({
  onBack,
  showBack = true,
}: {
  onBack?: () => void;
  showBack?: boolean;
}) {
  return (
    <div style={{
      background: '#000',
      padding: '15px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: `2px solid ${PRIMARY_YELLOW}`,
    }}>
      {showBack ? (
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: PRIMARY_YELLOW,
            fontSize: '24px',
            cursor: 'pointer',
            width: '48px',
            height: '48px',
          }}
          aria-label="Back"
        >
          ←
        </button>
      ) : (
        <div style={{ width: '48px' }} />
      )}
      <img
        src="/BEE-FIVE.png"
        alt="Bee Five"
        style={{ height: '40px', objectFit: 'contain' }}
      />
      <div style={{ width: '48px' }} />
    </div>
  );
}

function ModeSelectionScreen({
  onModeSelected,
  onBackToMenu,
}: {
  onModeSelected: (mode: LocalGameMode) => void;
  onBackToMenu: () => void;
}) {
  return (
    <div style={{
      background: GRAY_BG,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <LocalHeader onBack={onBackToMenu} />
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
          <h2 style={{
            fontSize: '26px',
            fontWeight: 'bold',
            color: '#000',
            marginBottom: '32px',
          }}>
            Select Game Mode
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button style={modeButtonStyle} onClick={() => onModeSelected('single')}>
              <span>🎮</span>
              <span>Single Match</span>
            </button>
            <button style={modeButtonStyle} onClick={() => onModeSelected('series5')}>
              <span>5️⃣</span>
              <span>5-Game Series</span>
            </button>
            <button style={modeButtonStyle} onClick={() => onModeSelected('series9')}>
              <span>9️⃣</span>
              <span>9-Game Series</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NameEntryScreen({
  mode,
  onConfirm,
  onBack,
}: {
  mode: LocalSeriesMode;
  onConfirm: (player1: string, player2: string) => void;
  onBack: () => void;
}) {
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    const p1 = player1.trim();
    const p2 = player2.trim();
    if (!p1 || !p2) {
      setError('Both names are required.');
      return;
    }
    if (p1.length > 7 || p2.length > 7) {
      setError('Names must be 7 characters or fewer.');
      return;
    }
    if (p1.toLowerCase() === p2.toLowerCase()) {
      setError('Names must be different.');
      return;
    }
    onConfirm(p1, p2);
  };

  return (
    <div style={{
      background: GRAY_BG,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <LocalHeader onBack={onBack} />
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '420px',
          background: '#000',
          borderRadius: '16px',
          border: `2px solid ${PRIMARY_YELLOW}`,
          padding: '24px',
        }}>
          <h2 style={{ color: PRIMARY_YELLOW, fontSize: '22px', margin: '0 0 8px', textAlign: 'center' }}>
            {mode === 'series5' ? '5-Game Series' : '9-Game Series'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', textAlign: 'center', margin: '0 0 24px' }}>
            Enter player names (max 7 chars)
          </p>
          <label style={{ display: 'block', color: '#fff', marginBottom: '8px', fontSize: '14px' }}>
            Player 1 (Black)
          </label>
          <input
            value={player1}
            onChange={(e) => { setPlayer1(e.target.value); setError(null); }}
            maxLength={7}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              marginBottom: '16px',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.4)',
              background: 'transparent',
              color: '#fff',
              fontWeight: 'bold',
            }}
          />
          <label style={{ display: 'block', color: PRIMARY_YELLOW, marginBottom: '8px', fontSize: '14px' }}>
            Player 2 (Yellow)
          </label>
          <input
            value={player2}
            onChange={(e) => { setPlayer2(e.target.value); setError(null); }}
            maxLength={7}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              marginBottom: '16px',
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${PRIMARY_YELLOW}`,
              background: 'transparent',
              color: PRIMARY_YELLOW,
              fontWeight: 'bold',
            }}
          />
          {error && (
            <p style={{ color: '#ff6b6b', fontSize: '13px', margin: '0 0 16px' }}>{error}</p>
          )}
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={onBack}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.4)',
                background: 'transparent',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '8px',
                border: 'none',
                background: PRIMARY_YELLOW,
                color: '#000',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Start
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScorePill({ name, score, isBlack }: { name: string; score: number; isBlack: boolean }) {
  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: '20px',
      border: `1.5px solid ${PRIMARY_YELLOW}`,
      background: isBlack ? '#000' : PRIMARY_YELLOW,
      color: isBlack ? PRIMARY_YELLOW : '#000',
      fontWeight: 'bold',
      fontSize: '13px',
    }}>
      {name}: {score}
    </span>
  );
}

function SeriesScoreboard({
  player1Name,
  player2Name,
  score1,
  score2,
  totalGames,
  onPlayAgain,
  onBackToModeSelect,
  onBackToMenu,
}: {
  player1Name: string;
  player2Name: string;
  score1: number;
  score2: number;
  totalGames: number;
  onPlayAgain: () => void;
  onBackToModeSelect: () => void;
  onBackToMenu: () => void;
}) {
  const overallWinner =
    score1 > score2 ? `${player1Name} wins the series!`
    : score2 > score1 ? `${player2Name} wins the series!`
    : "It's a tie series!";

  const actionButton = (label: string, color: string, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        maxWidth: '280px',
        padding: '14px 20px',
        marginBottom: '12px',
        borderRadius: '10px',
        border: '2px solid #000',
        background: color,
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '16px',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      background: GRAY_BG,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <LocalHeader showBack={false} />
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '480px',
          background: '#000',
          borderRadius: '20px',
          border: `3px solid ${PRIMARY_YELLOW}`,
          padding: '28px',
          textAlign: 'center',
        }}>
          <h2 style={{ color: PRIMARY_YELLOW, fontSize: '26px', margin: '0 0 6px' }}>Series Complete!</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '0 0 28px' }}>
            {totalGames}-Game Series
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '28px',
            flexWrap: 'wrap',
          }}>
            <ScorePill name={player1Name} score={score1} isBlack />
            <span style={{ color: '#fff', fontSize: '32px', fontWeight: 'bold' }}>
              {score1} – {score2}
            </span>
            <ScorePill name={player2Name} score={score2} isBlack={false} />
          </div>
          <div style={{
            background: PRIMARY_YELLOW,
            borderRadius: '12px',
            padding: '12px 20px',
            marginBottom: '32px',
            color: '#000',
            fontWeight: 'bold',
            fontSize: '18px',
          }}>
            {overallWinner}
          </div>
          {actionButton('Play Series Again', '#4CAF50', onPlayAgain)}
          {actionButton('Change Mode', '#FF9800', onBackToModeSelect)}
          {actionButton('Back to Menu', '#2196F3', onBackToMenu)}
        </div>
      </div>
    </div>
  );
}

function LocalGameBoard({
  player1Name,
  player2Name,
  isSeries,
  isSingleMatch,
  currentGame,
  totalGames,
  score1,
  score2,
  blockageCount,
  onGameFinished,
  onBackToMenu,
  onReturnToModeSelect,
}: {
  player1Name: string;
  player2Name: string;
  isSeries: boolean;
  isSingleMatch: boolean;
  currentGame: number;
  totalGames: number;
  score1: number;
  score2: number;
  blockageCount: number;
  onGameFinished: (winner: 0 | 1 | 2) => void;
  onBackToMenu: () => void;
  onReturnToModeSelect: () => void;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const [gameFinishedReported, setGameFinishedReported] = useState(false);

  const initialBoard = useMemo(
    () => createBoardWithRandomBlocks(blockageCount),
    [blockageCount, currentGame]
  );

  const { gameState, handleCellClick, resetGame } = useGameLogic({
    timeLimit: 0,
    pauseTimer: true,
    initialBoard,
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const currentPlayerName =
    gameState.currentPlayer === 1 ? player1Name : player2Name;

  useEffect(() => {
    if (gameState.winner > 0) {
      const winnerName = gameState.winner === 1 ? player1Name : player2Name;
      if (gameState.winner === 1) soundManager.playVictorySound();
      else soundManager.playDefeatSound();

      const timeout = window.setTimeout(() => {
        if (isSeries) {
          if (!gameFinishedReported) {
            setGameFinishedReported(true);
            onGameFinished(gameState.winner);
          }
        } else {
          setWinMessage(`${winnerName} wins!`);
          setShowWinPopup(true);
        }
      }, 2000);
      return () => window.clearTimeout(timeout);
    }

    if (!gameState.isGameActive && gameState.winner === 0) {
      const timeout = window.setTimeout(() => {
        if (isSeries) {
          if (!gameFinishedReported) {
            setGameFinishedReported(true);
            onGameFinished(0);
          }
        } else {
          setWinMessage('Draw!');
          setShowWinPopup(true);
        }
      }, 2000);
      return () => window.clearTimeout(timeout);
    }
  }, [
    gameState.winner,
    gameState.isGameActive,
    player1Name,
    player2Name,
    isSeries,
    gameFinishedReported,
    onGameFinished,
  ]);

  const handleHome = () => {
    if (window.confirm('Are you sure you want to exit?')) {
      onBackToMenu();
      soundManager.playClickSound();
    }
  };

  const handleRestart = () => {
    resetGame();
    setShowWinPopup(false);
    setGameFinishedReported(false);
    soundManager.playClickSound();
  };

  const handlePlayAgainSingle = () => {
    resetGame();
    setShowWinPopup(false);
    setGameFinishedReported(false);
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

      {isSeries && (
        <div style={{
          background: 'rgba(0,0,0,0.87)',
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
            Game {currentGame} of {totalGames}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ScorePill name={player1Name} score={score1} isBlack />
            <span style={{ color: '#fff', fontWeight: 'bold' }}>:</span>
            <ScorePill name={player2Name} score={score2} isBlack={false} />
          </div>
        </div>
      )}

      <div style={{ padding: '12px', textAlign: 'center' }}>
        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
          <span style={{ color: '#4CAF50', fontSize: '28px' }}>▶</span> {currentPlayerName}
        </span>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isMobile ? '1rem' : '1rem',
        minHeight: 0,
      }}>
        <GameCanvas gameState={gameState} onCellClick={handleCellClick} />
      </div>

      <div style={{
        display: 'flex',
        padding: isMobile ? '15px 15px 45px' : '15px',
        backgroundColor: '#000',
        borderTop: `2px solid ${PRIMARY_YELLOW}`,
        gap: '10px',
      }}>
        <button onClick={handleHome} style={footerButtonStyle}>
          <img src="/homeImagery/home.png" alt="" style={{ width: '20px', height: '20px' }} />
          <span>Home</span>
        </button>
        <button onClick={handleRestart} style={footerButtonStyle}>
          <img src="/homeImagery/restart_icon.png" alt="" style={{ width: '22px', height: '22px' }} />
          <span>Restart</span>
        </button>
      </div>

      {showWinPopup && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
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
            <h1 style={{ fontSize: '24px', color: '#000', marginBottom: '30px' }}>{winMessage}</h1>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {isSingleMatch && (
                <button onClick={handlePlayAgainSingle} style={modalButtonStyle('#4CAF50')}>
                  Play Again
                </button>
              )}
              <button
                onClick={() => { setShowWinPopup(false); onBackToMenu(); }}
                style={modalButtonStyle('#2196F3')}
              >
                Back to Menu
              </button>
              <button
                onClick={() => { setShowWinPopup(false); onReturnToModeSelect(); }}
                style={modalButtonStyle('#FF9800')}
              >
                Change Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const footerButtonStyle: React.CSSProperties = {
  flex: 1,
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

function modalButtonStyle(color: string): React.CSSProperties {
  return {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: color,
    color: '#fff',
    border: '2px solid #000',
    borderRadius: '10px',
    cursor: 'pointer',
    minWidth: '120px',
  };
}

function GameSession({
  mode,
  player1Name,
  player2Name,
  onBackToMenu,
  onReturnToModeSelect,
}: {
  mode: LocalGameMode;
  player1Name: string;
  player2Name: string;
  onBackToMenu: () => void;
  onReturnToModeSelect: () => void;
}) {
  const [currentGame, setCurrentGame] = useState(1);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [showSeriesEnd, setShowSeriesEnd] = useState(false);

  const isSeries = mode !== 'single';
  const totalGames = mode === 'series9' ? 9 : mode === 'series5' ? 5 : 1;

  const handleGameFinished = useCallback((winnerPlayer: 0 | 1 | 2) => {
    if (!isSeries) return;
    if (winnerPlayer === 1) setScore1((s) => s + 1);
    if (winnerPlayer === 2) setScore2((s) => s + 1);

    setCurrentGame((g) => {
      if (g >= totalGames) {
        setShowSeriesEnd(true);
        return g;
      }
      return g + 1;
    });
  }, [isSeries, totalGames]);

  if (showSeriesEnd) {
    return (
      <SeriesScoreboard
        player1Name={player1Name}
        player2Name={player2Name}
        score1={score1}
        score2={score2}
        totalGames={totalGames}
        onPlayAgain={() => {
          setCurrentGame(1);
          setScore1(0);
          setScore2(0);
          setShowSeriesEnd(false);
        }}
        onBackToModeSelect={onReturnToModeSelect}
        onBackToMenu={onBackToMenu}
      />
    );
  }

  const blockageCount = isSeries
    ? blockagesForLocalSeriesGame(mode, currentGame)
    : 0;

  return (
    <LocalGameBoard
      key={`local-game-${currentGame}`}
      player1Name={player1Name}
      player2Name={player2Name}
      isSeries={isSeries}
      isSingleMatch={!isSeries}
      currentGame={currentGame}
      totalGames={totalGames}
      score1={score1}
      score2={score2}
      blockageCount={blockageCount}
      onGameFinished={handleGameFinished}
      onBackToMenu={onBackToMenu}
      onReturnToModeSelect={onReturnToModeSelect}
    />
  );
}

export default function SimpleGame({ onBackToMenu }: SimpleGameProps) {
  const [selectedMode, setSelectedMode] = useState<LocalGameMode | null>(null);
  const [pendingMode, setPendingMode] = useState<LocalSeriesMode | null>(null);
  const [player1Name, setPlayer1Name] = useState('Black');
  const [player2Name, setPlayer2Name] = useState('Yellow');

  const handleModeSelected = (mode: LocalGameMode) => {
    if (mode === 'single') {
      setPlayer1Name('Black');
      setPlayer2Name('Yellow');
      setSelectedMode(mode);
    } else {
      setPendingMode(mode);
    }
  };

  const handleNamesConfirmed = (p1: string, p2: string) => {
    setPlayer1Name(p1);
    setPlayer2Name(p2);
    setSelectedMode(pendingMode);
    setPendingMode(null);
  };

  if (pendingMode) {
    return (
      <NameEntryScreen
        mode={pendingMode}
        onConfirm={handleNamesConfirmed}
        onBack={() => setPendingMode(null)}
      />
    );
  }

  if (!selectedMode) {
    return (
      <ModeSelectionScreen
        onModeSelected={handleModeSelected}
        onBackToMenu={onBackToMenu}
      />
    );
  }

  return (
    <GameSession
      mode={selectedMode}
      player1Name={player1Name}
      player2Name={player2Name}
      onBackToMenu={onBackToMenu}
      onReturnToModeSelect={() => {
        setSelectedMode(null);
        setPendingMode(null);
        setPlayer1Name('Black');
        setPlayer2Name('Yellow');
      }}
    />
  );
}
