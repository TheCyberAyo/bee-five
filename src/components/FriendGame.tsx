"use client";

import React, { useState, useEffect } from 'react';
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(0.3);
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [isMobile, setIsMobile] = useState(false);
  const [seriesComplete, setSeriesComplete] = useState(false);
  
  const [timeLimit] = useState(15);
  const { gameState, handleCellClick, resetGame } = useGameLogic({
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
    soundManager.setVolume(volume);
    soundManager.setMuted(!soundEnabled);
  }, [volume, soundEnabled]);

  // Show popup when individual game ends
  useEffect(() => {
    // Don't process if series is complete or modals are showing
    if (seriesComplete || showGameOverModal) return;

    if (gameState.winner > 0 && gameSeries) {
      const winnerName = gameState.winner === 1 ? gameSeries.player1Name : gameSeries.player2Name;
      setWinMessage(`${winnerName} wins Game ${gameSeries.currentGame}! 🐝`);
      setShowWinPopup(true);
      
      if (gameState.winner === 1) {
        soundManager.playVictorySound();
      } else {
        soundManager.playDefeatSound();
      }

      // Only start countdown if there are more games
      if (gameSeries.currentGame < gameSeries.totalGames) {
        // Auto-proceed to next game after 3 seconds with countdown
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
      } else {
        // Last game - no countdown, just show the popup
        setCountdown(0);
      }

    } else if (!gameState.isGameActive && gameState.winner === 0 && gameSeries) {
      setWinMessage(`Game ${gameSeries.currentGame} - Draw! 🐝`);
      setShowWinPopup(true);

      // Only start countdown if there are more games
      if (gameSeries.currentGame < gameSeries.totalGames) {
        // Auto-proceed to next game after 3 seconds for draws too
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
      } else {
        // Last game - no countdown, just show the popup
        setCountdown(0);
      }
    } else if (gameState.timeLeft === 0 && gameSeries) {
      const winner = gameState.currentPlayer === 1 ? 2 : 1;
      const winnerName = winner === 1 ? gameSeries.player1Name : gameSeries.player2Name;
      setWinMessage(`${winnerName} wins Game ${gameSeries.currentGame} due to time limit! 🐝`);
      setShowWinPopup(true);

      // Only start countdown if there are more games
      if (gameSeries.currentGame < gameSeries.totalGames) {
        // Auto-proceed to next game after 3 seconds for time limit wins too
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
      } else {
        // Last game - no countdown, just show the popup
        setCountdown(0);
      }
    }
  }, [gameState.winner, gameState.isGameActive, gameState.timeLeft, gameState.currentPlayer, gameSeries, seriesComplete, showGameOverModal]);

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

  const handleGameEnd = () => {
    if (!gameSeries) return;

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
  };

  const startNextGame = () => {
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
  };


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

  // Enhanced Game Over Modal
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
        {/* Celebration Effects for Winner */}
        {seriesWinner && (
          <div style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '4em',
            animation: 'confetti 3s ease-out infinite',
            zIndex: 1
          }}>
            🎊🎉🏆🎉🎊
          </div>
        )}
        
        <div style={{
          background: isTie 
            ? 'rgba(248, 249, 250, 0.95)'
            : 'rgba(255, 255, 255, 0.95)',
          borderRadius: '25px',
          padding: '3rem',
          width: '90%',
          maxWidth: '600px',
          boxShadow: isTie 
            ? '0 25px 50px rgba(108, 117, 125, 0.3)'
            : '0 25px 50px rgba(255, 215, 0, 0.4), 0 0 30px rgba(255, 195, 11, 0.6)',
          backdropFilter: 'blur(15px)',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2,
          animation: seriesWinner ? 'victoryBounce 1s ease-out' : 'popIn 0.6s ease-out',
          border: `5px solid ${isTie ? '#6c757d' : '#FFC30B'}`
        }}>
          <div style={{
            fontSize: isTie ? '4em' : '5em',
            marginBottom: '20px',
            animation: isTie ? 'bounce 1s ease-out infinite' : 'victorySpin 2s ease-out infinite'
          }}>
            {isTie ? '🤝' : '🏆'}
          </div>
          
          <h1 style={{
            fontSize: isTie ? '2.5em' : '3em',
            color: isTie ? '#495057' : '#B8860B',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            marginBottom: '15px',
            fontWeight: 'bold'
          }}>
            {isTie ? 'Series Complete!' : 'CONGRATULATIONS!'}
          </h1>
          
          <div style={{
            fontSize: '1.4em',
            color: isTie ? '#6c757d' : '#8B4513',
            marginBottom: '20px',
            fontWeight: 'bold'
          }}>
            Best of {gameSeries.totalGames} Series
          </div>
          
          {seriesWinner ? (
            <div>
              <h2 style={{
                fontSize: '2.2em',
                color: '#228B22',
                marginBottom: '15px',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
              }}>
                {seriesWinner.name} Wins! 🎉
              </h2>
              
              {/* Enhanced Score Display */}
              <div style={{
                fontSize: '1.3em',
                color: '#333',
                marginBottom: '25px',
                display: 'flex',
                justifyContent: 'center',
                gap: '3rem',
                alignItems: 'center'
              }}>
                <div style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  padding: '15px 25px',
                  borderRadius: '15px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ fontSize: '0.9em', marginBottom: '5px' }}>{gameSeries.player1Name}</div>
                  <div style={{ fontSize: '2em' }}>{gameSeries.player1Score}</div>
                </div>
                <div style={{ 
                  fontSize: '1.5em', 
                  fontWeight: 'bold',
                  color: '#666'
                }}>vs</div>
                <div style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  padding: '15px 25px',
                  borderRadius: '15px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ fontSize: '0.9em', marginBottom: '5px' }}>{gameSeries.player2Name}</div>
                  <div style={{ fontSize: '2em' }}>{gameSeries.player2Score}</div>
                </div>
              </div>
              
              {/* Congratulatory Message */}
              <div style={{
                fontSize: '1.2em',
                color: '#8B4513',
                marginBottom: '30px',
                fontStyle: 'italic',
                lineHeight: '1.4'
              }}>
                <div style={{ marginBottom: '10px' }}>
                  🐝 Outstanding performance, {seriesWinner.name}! 🐝
                </div>
                <div>
                  You've proven yourself as a true Bee Master in this {gameSeries.totalGames}-game series!
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 style={{
                fontSize: '2.2em',
                color: '#dc3545',
                marginBottom: '15px',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
              }}>
                It's a Tie! 🤝
              </h2>
              
              {/* Enhanced Score Display for Tie */}
              <div style={{
                fontSize: '1.3em',
                color: '#333',
                marginBottom: '25px',
                display: 'flex',
                justifyContent: 'center',
                gap: '3rem',
                alignItems: 'center'
              }}>
                <div style={{
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  padding: '15px 25px',
                  borderRadius: '15px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ fontSize: '0.9em', marginBottom: '5px' }}>{gameSeries.player1Name}</div>
                  <div style={{ fontSize: '2em' }}>{gameSeries.player1Score}</div>
                </div>
                <div style={{ 
                  fontSize: '1.5em', 
                  fontWeight: 'bold',
                  color: '#666'
                }}>vs</div>
                <div style={{
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  padding: '15px 25px',
                  borderRadius: '15px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ fontSize: '0.9em', marginBottom: '5px' }}>{gameSeries.player2Name}</div>
                  <div style={{ fontSize: '2em' }}>{gameSeries.player2Score}</div>
                </div>
              </div>
              
              {/* Tie Message */}
              <div style={{
                fontSize: '1.2em',
                color: '#6c757d',
                marginBottom: '30px',
                fontStyle: 'italic',
                lineHeight: '1.4'
              }}>
                <div style={{ marginBottom: '10px' }}>
                  🐝 What an epic battle! 🐝
                </div>
                <div>
                  Both players showed incredible skill - time for a rematch to settle the score!
                </div>
              </div>
            </div>
          )}

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
        background: 'linear-gradient(135deg, #FFC30B 0%, #FFD700 50%, #FFC30B 100%)',
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(10px)',
        padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
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

        {/* Controls */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '0.5rem' : '1rem',
          flexWrap: 'wrap'
        }}>
          {/* Sound control */}
          <button
            onClick={() => {
              const newSoundEnabled = !soundEnabled;
              setSoundEnabled(newSoundEnabled);
              soundManager.setMuted(!newSoundEnabled);
              if (newSoundEnabled) soundManager.playClickSound();
            }}
            style={{
              padding: isMobile ? '0.5rem' : '0.5rem 0.75rem',
              fontSize: '1em',
              backgroundColor: soundEnabled ? '#4CAF50' : '#f44336',
              color: 'white',
              border: '2px solid black',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          
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
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '0.5rem 1rem',
          textAlign: 'center',
          fontSize: '0.9em',
          fontWeight: 'bold',
          color: '#333',
          borderBottom: '1px solid rgba(0,0,0,0.1)'
        }}>
          Game {gameSeries.currentGame} of {gameSeries.totalGames} • 
          {gameSeries.player1GoesFirst ? `${gameSeries.player1Name} goes first` : `${gameSeries.player2Name} goes first`}
        </div>
      )}

      {/* Main game area */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isMobile ? '1rem' : '2rem',
        position: 'relative'
      }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <GameCanvas
            gameState={gameState}
            onCellClick={handleCellClickWrapper}
          />
        </div>
      </div>

      {/* Volume control */}
      {soundEnabled && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '0.5rem 1rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '0.85rem',
          borderTop: '1px solid rgba(0,0,0,0.1)'
        }}>
          <span style={{ color: '#333', fontWeight: 'bold' }}>🔊 Volume:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => {
              const newVolume = parseFloat(e.target.value);
              setVolume(newVolume);
              soundManager.setVolume(newVolume);
            }}
            style={{ 
              width: isMobile ? '120px' : '150px',
              accentColor: '#FFC30B'
            }}
          />
          <span style={{ color: '#666', fontSize: '0.8em' }}>
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}

      {/* Game Win Popup */}
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
            <div style={{
              fontSize: '4em',
              marginBottom: '20px'
            }}>
              🐝
            </div>
            
            <h1 style={{
              fontSize: '2.5em',
              color: 'black',
              marginBottom: '20px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}>
              {winMessage}
            </h1>
            
            <p style={{
              fontSize: '1.2em',
              color: '#333',
              marginBottom: '20px'
            }}>
              {gameSeries.currentGame < gameSeries.totalGames 
                ? `Next: ${gameSeries.player1GoesFirst ? gameSeries.player2Name : gameSeries.player1Name} goes first!`
                : 'Series complete!'
              }
            </p>
            
            <p style={{
              fontSize: '1em',
              color: '#666',
              marginBottom: '20px',
              fontStyle: 'italic'
            }}>
              {gameSeries.currentGame < gameSeries.totalGames 
                ? `Proceeding to next game in ${countdown} second${countdown !== 1 ? 's' : ''}...`
                : 'Tournament complete! Click to view results.'
              }
            </p>
            
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
