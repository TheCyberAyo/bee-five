"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useGameLogic } from '../hooks/useGameLogic';
import GameCanvas from './GameCanvas';
import { soundManager } from '../utils/sounds';

interface FriendGameProps {
  onBackToMenu: () => void;
}

interface GameSeries {
  player1Name: string;
  player2Name: string;
  totalGames: number;
  currentGame: number;
  player1Score: number;
  player2Score: number;
  player1GoesFirst: boolean; // true if player1 goes first in current game
  games: Array<{
    gameNumber: number;
    winner: 1 | 2 | 0; // 0 = draw
    player1WentFirst: boolean;
  }>;
}

const FriendGame: React.FC<FriendGameProps> = ({ onBackToMenu }) => {
  const [gameSeries, setGameSeries] = useState<GameSeries | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(true);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [soundEnabled] = useState(true);
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const [, setCountdown] = useState(3);
  const [isMobile, setIsMobile] = useState(false);
  const [seriesComplete, setSeriesComplete] = useState(false);
  
  const [timeLimit] = useState(15);
  const { gameState, handleCellClick, resetGame, updateGameState } = useGameLogic({
    timeLimit
  });

  // Wrapper for handleCellClick that prevents moves when series is complete
  const handleCellClickWrapper = (row: number, col: number) => {
    if (seriesComplete || showGameOverModal) {
      return; // Don't allow moves when series is complete
    }
    handleCellClick(row, col);
  };

  // Initialize mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize sound manager settings
  useEffect(() => {
    soundManager.setMuted(!soundEnabled);
  }, [soundEnabled]);

  const startNewGameSeries = (player1Name: string, player2Name: string, totalGames: number) => {
    const newSeries: GameSeries = {
      player1Name,
      player2Name,
      totalGames,
      currentGame: 1,
      player1Score: 0,
      player2Score: 0,
      player1GoesFirst: true, // Player 1 goes first in game 1
      games: []
    };
    
    setGameSeries(newSeries);
    setShowSetupModal(false);
    setSeriesComplete(false); // Reset series complete status
    
    // Reset the game with the correct starting player (Player 1 goes first in Game 1)
    resetGame(1);
    if (soundEnabled) soundManager.playClickSound();
  };

  const handleGameEnd = useCallback(() => {
    if (!gameSeries) return undefined;

    const gameResult = {
      gameNumber: gameSeries.currentGame,
      winner: gameState.winner as 1 | 2 | 0,
      player1WentFirst: gameSeries.player1GoesFirst
    };

    const updatedSeries = {
      ...gameSeries,
      games: [...gameSeries.games, gameResult],
      player1Score: gameSeries.player1Score + (gameState.winner === 1 ? 1 : 0),
      player2Score: gameSeries.player2Score + (gameState.winner === 2 ? 1 : 0),
      currentGame: gameSeries.currentGame + 1,
      player1GoesFirst: !gameSeries.player1GoesFirst // Alternate who goes first
    };

    setGameSeries(updatedSeries);

    // Check if series is complete
    if (updatedSeries.currentGame > updatedSeries.totalGames) {
      setSeriesComplete(true);
      setShowGameOverModal(true);
    }

    return updatedSeries; // Return the updated series for immediate use
  }, [gameSeries, gameState.winner]);

  const startNextGame = useCallback(() => {
    if (!gameSeries) return;
    
    // Don't allow starting a new game if series is complete
    if (seriesComplete) return;
    
    // Handle the end of the current game and get the updated series
    const updatedSeries = handleGameEnd();
    if (!updatedSeries) return;
    
    // Determine who should start the next game using the updated series
    const nextStartingPlayer = updatedSeries.player1GoesFirst ? 1 : 2;
    
    console.log(`Game ${updatedSeries.currentGame}: ${updatedSeries.player1GoesFirst ? updatedSeries.player1Name : updatedSeries.player2Name} starts first`);
    
    // Reset the game for the next round with the correct starting player
    resetGame(nextStartingPlayer);
    setShowWinPopup(false);
    setCountdown(3);
    
    if (soundEnabled) soundManager.playClickSound();
  }, [gameSeries, seriesComplete, handleGameEnd, resetGame, soundEnabled]);

  // Clear winning pieces highlight after 3 seconds
  useEffect(() => {
    if (gameState.winner > 0 && gameState.winningPieces && gameState.winningPieces.length > 0) {
      const timer = setTimeout(() => {
        // Clear winning pieces highlight after 3 seconds
        updateGameState({ winningPieces: [] });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [gameState.winner, gameState.winningPieces, updateGameState]);

  // Show popup when individual game ends
  useEffect(() => {
    if (!gameSeries || seriesComplete || showGameOverModal) {
      return;
    }

    const scheduleNextGame = () => {
      setCountdown(3);
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            startNextGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(countdownInterval);
    };

    if (gameState.winner > 0) {
      const winnerName = gameState.winner === 1 ? gameSeries.player1Name : gameSeries.player2Name;
      setWinMessage(`${winnerName} wins Game ${gameSeries.currentGame}! 🐝`);
      setShowWinPopup(true);
      if (gameState.winner === 1) {
        soundManager.playVictorySound();
      } else {
        soundManager.playDefeatSound();
      }
      if (gameSeries.currentGame < gameSeries.totalGames) {
        return scheduleNextGame();
      }
      setCountdown(0);
    } else if (!gameState.isGameActive && gameState.winner === 0) {
      setWinMessage(`Game ${gameSeries.currentGame} - Draw! 🐝`);
      setShowWinPopup(true);
      if (gameSeries.currentGame < gameSeries.totalGames) {
        return scheduleNextGame();
      }
      setCountdown(0);
    } else if (gameState.timeLeft === 0) {
      const winner = gameState.currentPlayer === 1 ? 2 : 1;
      const winnerName = winner === 1 ? gameSeries.player1Name : gameSeries.player2Name;
      setWinMessage(`${winnerName} wins Game ${gameSeries.currentGame} due to time limit! 🐝`);
      setShowWinPopup(true);
      if (gameSeries.currentGame < gameSeries.totalGames) {
        return scheduleNextGame();
      }
      setCountdown(0);
    }

    return undefined;
  }, [
    gameSeries,
    gameState.currentPlayer,
    gameState.isGameActive,
    gameState.timeLeft,
    gameState.winner,
    seriesComplete,
    showGameOverModal,
    startNextGame,
  ]);


  const getSeriesWinner = () => {
    if (!gameSeries) return null;
    
    if (gameSeries.player1Score > gameSeries.player2Score) {
      return { name: gameSeries.player1Name, score: gameSeries.player1Score };
    } else if (gameSeries.player2Score > gameSeries.player1Score) {
      return { name: gameSeries.player2Name, score: gameSeries.player2Score };
    } else {
      return null; // Tie
    }
  };


  // Setup Modal
  if (showSetupModal) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #FFC30B 0%, #FFD700 50%, #FFC30B 100%)',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: isMobile ? '16px' : '20px',
          padding: isMobile ? '1.5rem 1rem' : '2rem',
          width: '90%',
          maxWidth: '500px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          textAlign: 'center',
          maxHeight: isMobile ? '90vh' : 'auto',
          overflowY: isMobile ? 'auto' : 'visible'
        }}>
          <h1 style={{
            fontSize: isMobile ? '2em' : '2.5em',
            color: '#FFC30B',
            textShadow: '2px 2px 0px black',
            marginBottom: isMobile ? '0.75rem' : '1rem'
          }}>
            🏆 Tournament 🏆
          </h1>
          
          <p style={{
            fontSize: isMobile ? '1rem' : '1.2em',
            color: '#333',
            marginBottom: isMobile ? '1.5rem' : '2rem'
          }}>
            Set up your match!
          </p>

          <FriendGameSetup onStart={startNewGameSeries} isMobile={isMobile} />
        </div>
      </div>
    );
  }

  // Game Over Modal - only announces winner, no extra message
  if (showGameOverModal && gameSeries) {
    const seriesWinner = getSeriesWinner();
    const isTie = !seriesWinner;
    
    return (
      <div style={{
        background: isTie 
          ? 'linear-gradient(135deg, #6c757d 0%, #495057 50%, #6c757d 100%)'
          : 'linear-gradient(135deg, #FFC30B 0%, #FFD700 50%, #FFC30B 100%)',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          background: isTie 
            ? 'rgba(248, 249, 250, 0.95)'
            : 'rgba(255, 255, 255, 0.95)',
          borderRadius: '25px',
          padding: '3rem',
          width: '90%',
          maxWidth: '500px',
          boxShadow: isTie 
            ? '0 25px 50px rgba(108, 117, 125, 0.3)'
            : '0 25px 50px rgba(255, 215, 0, 0.4)',
          backdropFilter: 'blur(15px)',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2,
          border: `5px solid ${isTie ? '#6c757d' : '#FFC30B'}`
        }}>
          <h1 style={{
            fontSize: '2.5em',
            color: isTie ? '#495057' : '#B8860B',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            marginBottom: '30px',
            fontWeight: 'bold'
          }}>
            {seriesWinner ? `${seriesWinner.name} Wins!` : "It's a Tie!"}
          </h1>

          <div style={{
            display: 'flex',
            gap: '20px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => {
                setShowGameOverModal(false);
                setSeriesComplete(false);
                setShowSetupModal(true);
                if (soundEnabled) soundManager.playClickSound();
              }}
              style={{
                padding: '15px 30px',
                fontSize: '1.2em',
                fontWeight: 'bold',
                backgroundColor: seriesWinner ? '#28a745' : '#17a2b8',
                color: 'white',
                border: '3px solid #000',
                borderRadius: '15px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                minWidth: '150px',
                boxShadow: '0 6px 12px rgba(0,0,0,0.2)',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.2)';
              }}
            >
              {seriesWinner ? '🏆 New Series' : '🔄 Rematch'}
            </button>
            
            <button
              onClick={() => {
                setShowGameOverModal(false);
                setSeriesComplete(false);
                onBackToMenu();
                if (soundEnabled) soundManager.playClickSound();
              }}
              style={{
                padding: '15px 30px',
                fontSize: '1.2em',
                fontWeight: 'bold',
                backgroundColor: '#6c757d',
                color: 'white',
                border: '3px solid #000',
                borderRadius: '15px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                minWidth: '150px',
                boxShadow: '0 6px 12px rgba(0,0,0,0.2)',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.2)';
              }}
            >
              🏠 Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Game Interface
  return (
    <>
      <style>
        {`
          @keyframes victoryBounce {
            0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
            50% { transform: scale(1.1) rotate(5deg); opacity: 1; }
            70% { transform: scale(0.9) rotate(-2deg); }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes confetti {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            25% { transform: translateY(-20px) rotate(90deg); opacity: 0.8; }
            50% { transform: translateY(-40px) rotate(180deg); opacity: 0.6; }
            75% { transform: translateY(-60px) rotate(270deg); opacity: 0.4; }
            100% { transform: translateY(-80px) rotate(360deg); opacity: 0; }
          }
          @keyframes victorySpin {
            0% { transform: rotate(0deg) scale(1); }
            25% { transform: rotate(90deg) scale(1.1); }
            50% { transform: rotate(180deg) scale(1.2); }
            75% { transform: rotate(270deg) scale(1.1); }
            100% { transform: rotate(360deg) scale(1); }
          }
          @keyframes popIn {
            0% { transform: scale(0.3); opacity: 0; }
            50% { transform: scale(1.05); opacity: 1; }
            70% { transform: scale(0.9); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}
      </style>
      <div style={{ 
        background: '#808080',
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{
        background: '#000000',
        paddingTop: isMobile ? '0.75rem' : '0',
        paddingBottom: isMobile ? '0.75rem' : '0',
        paddingLeft: isMobile ? '1rem' : '1.5rem',
        paddingRight: isMobile ? '1rem' : '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        borderBottomWidth: '2px',
        borderBottomStyle: 'solid',
        borderBottomColor: '#FFC30B',
        zIndex: 10
      }}>
        {/* Left side: Menu button and title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => {
              onBackToMenu();
              if (soundEnabled) soundManager.playClickSound();
            }}
            style={{
              padding: isMobile ? '0.5rem' : '0.5rem 0.75rem',
              fontSize: isMobile ? '1.2em' : '1em',
              backgroundColor: '#FFC30B',
              color: 'black',
              border: '2px solid black',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            {isMobile ? '🏠' : '🏠 Menu'}
          </button>
          
          <h1 style={{ 
            color: '#FFC30B', 
            margin: 0,
            fontSize: isMobile ? 'clamp(1.2rem, 4vw, 1.5rem)' : 'clamp(1.5rem, 3vw, 2rem)',
            textShadow: '2px 2px 0px black',
            fontWeight: 'bold'
          }}>
            🏆 Tournament
          </h1>
        </div>

        {/* Score Display */}
        {gameSeries && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '0.5rem 1rem',
            borderRadius: '10px',
            border: '2px solid black'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8em', color: '#666', fontWeight: 'bold' }}>
                {gameSeries.player1Name}
              </div>
              <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#333' }}>
                {gameSeries.player1Score}
              </div>
            </div>
            <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#333' }}>
              -
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8em', color: '#666', fontWeight: 'bold' }}>
                {gameSeries.player2Name}
              </div>
              <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#333' }}>
                {gameSeries.player2Score}
              </div>
            </div>
          </div>
        )}

        {/* Controls - removed volume button for non-multiplayer games */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '0.5rem' : '1rem',
          flexWrap: 'wrap'
        }}>
          {/* Timer display */}
          <div style={{
            padding: isMobile ? '0.5rem' : '0.5rem 0.75rem',
            fontSize: isMobile ? '1em' : '0.9em',
            backgroundColor: '#FFC30B',
            color: 'black',
            border: '2px solid black',
            borderRadius: '8px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            minWidth: '80px',
            justifyContent: 'center'
          }}>
            ⏱️ {gameState.timeLeft}s
          </div>
        </div>
      </div>


      {/* Game Progress */}
      {gameSeries && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '0.5rem 1rem',
          textAlign: 'center',
          fontSize: '0.9em',
          fontWeight: 'bold',
          color: '#333',
          borderBottomWidth: '2px',
          borderBottomStyle: 'solid',
          borderBottomColor: '#FFC30B'
        }}>
          Game {gameSeries.currentGame} of {gameSeries.totalGames} • 
          {gameSeries.player1GoesFirst ? `${gameSeries.player1Name} goes first` : `${gameSeries.player2Name} goes first`}
        </div>
      )}

      {/* Current Player Indicator */}
      <div style={{
        padding: '15px',
        alignItems: 'center',
        justifyContent: 'center',
        display: 'flex'
      }}>
        <div style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#000'
        }}>
          <span style={{ color: '#4CAF50', fontSize: '28px' }}>▶</span> {gameState.currentPlayer === 1 ? (gameSeries?.player1Name || 'Black') : (gameSeries?.player2Name || 'Yellow')}
        </div>
      </div>

      {/* Main game area - board fills full width of center */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isMobile ? '0.5rem' : '1rem',
        position: 'relative',
        minHeight: 0,
        overflow: 'auto',
        width: '100%'
      }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          maxWidth: '100%'
        }}>
          <GameCanvas
            gameState={gameState}
            onCellClick={handleCellClickWrapper}
            fillWidth
          />
        </div>
      </div>

      {/* Game Win Popup - only announces winner */}
      {showWinPopup && gameSeries && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#FFC30B',
            padding: '40px',
            borderRadius: '20px',
            border: '4px solid black',
            textAlign: 'center',
            minWidth: '300px',
            maxWidth: '90vw',
            position: 'relative',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <h1 style={{
              fontSize: '2.5em',
              color: 'black',
              marginBottom: '20px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}>
              {winMessage}
            </h1>
            
            {/* Show finish button only for the last game */}
            {gameSeries.currentGame >= gameSeries.totalGames && (
              <button 
                onClick={() => {
                  setShowWinPopup(false);
                  handleGameEnd();
                }}
                style={{
                  padding: '12px 24px',
                  fontSize: '1.1em',
                  fontWeight: 'bold',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: '2px solid black',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minWidth: '120px',
                  marginBottom: '20px'
                }}
              >
                View Results
              </button>
            )}
            
            <button
              onClick={() => setShowWinPopup(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '1.5em',
                cursor: 'pointer',
                color: 'black',
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: isMobile ? '15px' : '0',
        paddingBottom: isMobile ? '45px' : '0',
        paddingLeft: '15px',
        paddingRight: '15px',
        backgroundColor: '#000000',
        borderTopWidth: '2px',
        borderTopStyle: 'solid',
        borderTopColor: '#FFC30B'
      }}>
        <button 
          onClick={() => {
            onBackToMenu();
            if (soundEnabled) soundManager.playClickSound();
          }}
          style={{
            flex: 1,
            backgroundColor: '#FFC30B',
            paddingTop: '12px',
            paddingBottom: '12px',
            paddingLeft: '20px',
            paddingRight: '20px',
            borderRadius: '8px',
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: '#000',
            marginLeft: '10px',
            marginRight: '10px',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <span style={{ color: '#000', fontWeight: 'bold', fontSize: '16px' }}>🏠 Home</span>
        </button>
        
        <button 
          onClick={() => {
            resetGame();
            if (soundEnabled) soundManager.playClickSound();
          }}
          style={{
            flex: 1,
            backgroundColor: '#FFC30B',
            paddingTop: '12px',
            paddingBottom: '12px',
            paddingLeft: '20px',
            paddingRight: '20px',
            borderRadius: '8px',
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: '#000',
            marginLeft: '10px',
            marginRight: '10px',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <span style={{ color: '#000', fontWeight: 'bold', fontSize: '16px' }}>🔄 Restart</span>
        </button>
      </div>
    </div>
    </>
  );
};

// Setup Component
interface FriendGameSetupProps {
  onStart: (player1Name: string, player2Name: string, totalGames: number) => void;
  isMobile: boolean;
}

const FriendGameSetup: React.FC<FriendGameSetupProps> = ({ onStart, isMobile }) => {
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [totalGames, setTotalGames] = useState(5);

  const handleStart = () => {
    if (player1Name.trim() && player2Name.trim()) {
      onStart(player1Name.trim(), player2Name.trim(), totalGames);
    }
  };

  return (
    <div style={{ textAlign: 'left' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '0.5rem', 
          fontWeight: 'bold', 
          color: '#333',
          fontSize: isMobile ? '0.95rem' : '1rem'
        }}>
          Player 1 Name (Black pieces):
        </label>
        <input
          type="text"
          value={player1Name}
          onChange={(e) => setPlayer1Name(e.target.value)}
          placeholder="Enter Player 1 name"
          style={{
            width: '100%',
            padding: isMobile ? '1rem' : '0.75rem',
            fontSize: isMobile ? '1.1rem' : '1rem',
            border: '2px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9',
            minHeight: isMobile ? '48px' : 'auto',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '0.5rem', 
          fontWeight: 'bold', 
          color: '#333',
          fontSize: isMobile ? '0.95rem' : '1rem'
        }}>
          Player 2 Name (Yellow pieces):
        </label>
        <input
          type="text"
          value={player2Name}
          onChange={(e) => setPlayer2Name(e.target.value)}
          placeholder="Enter Player 2 name"
          style={{
            width: '100%',
            padding: isMobile ? '1rem' : '0.75rem',
            fontSize: isMobile ? '1.1rem' : '1rem',
            border: '2px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9',
            minHeight: isMobile ? '48px' : 'auto',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '0.5rem', 
          fontWeight: 'bold', 
          color: '#333',
          fontSize: isMobile ? '0.95rem' : '1rem'
        }}>
          Number of Games:
        </label>
        <div style={{ 
          display: 'flex', 
          gap: '1rem',
          flexDirection: isMobile ? 'column' : 'row'
        }}>
          <button
            onClick={() => setTotalGames(5)}
            style={{
              padding: isMobile ? '1rem 1.5rem' : '0.75rem 1.5rem',
              fontSize: isMobile ? '1.1rem' : '1rem',
              fontWeight: 'bold',
              backgroundColor: totalGames === 5 ? '#4CAF50' : '#f0f0f0',
              color: totalGames === 5 ? 'white' : '#333',
              border: '2px solid black',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              flex: isMobile ? 'none' : 1,
              width: isMobile ? '100%' : 'auto',
              minHeight: isMobile ? '56px' : 'auto',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            5 Games
          </button>
          <button
            onClick={() => setTotalGames(7)}
            style={{
              padding: isMobile ? '1rem 1.5rem' : '0.75rem 1.5rem',
              fontSize: isMobile ? '1.1rem' : '1rem',
              fontWeight: 'bold',
              backgroundColor: totalGames === 7 ? '#4CAF50' : '#f0f0f0',
              color: totalGames === 7 ? 'white' : '#333',
              border: '2px solid black',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              flex: isMobile ? 'none' : 1,
              width: isMobile ? '100%' : 'auto',
              minHeight: isMobile ? '56px' : 'auto',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            7 Games
          </button>
        </div>
      </div>

      <button
        onClick={handleStart}
        disabled={!player1Name.trim() || !player2Name.trim()}
        style={{
          width: '100%',
          padding: isMobile ? '1.25rem' : '1rem',
          fontSize: isMobile ? '1.3em' : '1.2em',
          fontWeight: 'bold',
          backgroundColor: (!player1Name.trim() || !player2Name.trim()) ? '#ccc' : '#4CAF50',
          color: 'white',
          border: '2px solid black',
          borderRadius: '10px',
          cursor: (!player1Name.trim() || !player2Name.trim()) ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          minHeight: isMobile ? '60px' : 'auto',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        Start Match!
      </button>
    </div>
  );
};

export default FriendGame;
