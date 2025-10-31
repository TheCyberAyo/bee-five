"use client";

import React, { useState, useEffect, useRef } from 'react';
import { soundManager } from '../utils/sounds';
import { useGameLogic } from '../hooks/useGameLogic';
import GameCanvas from './GameCanvas';

interface BattleGameProps {
  battleLength: 5 | 7;
  player1Name: string;
  player2Name: string;
  battleScores: { player1: number; player2: number };
  setBattleScores: (scores: { player1: number; player2: number }) => void;
  battleGamesPlayed: number;
  setBattleGamesPlayed: (games: number) => void;
  setBattleWinner: (winner: string) => void;
  showBattleWinnerModal: boolean;
  setShowBattleWinnerModal: (show: boolean) => void;
  onBackToMenu: () => void;
  timeLimit?: number;
}

export default function BattleGame({ 
  battleLength, 
  player1Name, 
  player2Name, 
  battleScores, 
  setBattleScores, 
  battleGamesPlayed, 
  setBattleGamesPlayed, 
  setBattleWinner,
  showBattleWinnerModal,
  setShowBattleWinnerModal, 
  onBackToMenu,
  timeLimit = 15 
}: BattleGameProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Initialize mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Determine starting player (alternate each game)
  // Game 1: Player 1 starts, Game 2: Player 2 starts, Game 3: Player 1 starts, etc.
  const startingPlayer = (battleGamesPlayed % 2) === 0 ? 1 : 2;

  const { gameState, handleCellClick, resetGame } = useGameLogic({
    timeLimit,
    startingPlayer,
    gameNumber: undefined, // Use standard empty board for battle
    pauseTimer: timeLimit === 0 // Pause timer if "No timer" is selected
  });

  // Track if component has mounted to avoid initial reset
  const hasMountedRef = useRef(false);

  // Update starting player when battleGamesPlayed changes
  useEffect(() => {
    if (hasMountedRef.current) {
      resetGame(startingPlayer);
    } else {
      hasMountedRef.current = true;
    }
  }, [battleGamesPlayed, resetGame, startingPlayer]);

  const [winMessage, setWinMessage] = useState('');
  const [showWinPopup, setShowWinPopup] = useState(false);
  const gameCompletedRef = useRef(false);
  const [battleComplete, setBattleComplete] = useState(false);
  const isResettingRef = useRef(false);

  // Wrapper for handleCellClick that prevents moves when battle is complete
  const handleCellClickWrapper = (row: number, col: number) => {
    if (battleComplete) {
      return; // Don't allow moves when battle is complete
    }
    handleCellClick(row, col);
  };

  // Handle game completion
  useEffect(() => {
    // Don't process any more games if battle is complete or winner modal is showing or if we're resetting
    if (battleComplete || showBattleWinnerModal || isResettingRef.current) return;

    if (gameState.winner > 0 && !gameCompletedRef.current) {
      gameCompletedRef.current = true;
      
      const winnerName = gameState.winner === 1 ? player1Name : player2Name;
      setWinMessage(`${winnerName} wins! 🎉`);
      setShowWinPopup(true);
      
      // Update battle scores
      const newScores = { ...battleScores };
      if (gameState.winner === 1) {
        newScores.player1 += 1;
      } else {
        newScores.player2 += 1;
      }
      setBattleScores(newScores);
      
      // Update games played
      const newGamesPlayed = battleGamesPlayed + 1;
      setBattleGamesPlayed(newGamesPlayed);
      
      // Check if battle is complete
      if (newGamesPlayed >= battleLength) {
        const battleWinner = newScores.player1 > newScores.player2 ? player1Name : player2Name;
        setBattleWinner(battleWinner);
        setBattleComplete(true);
        // Close win popup and show final winner modal after a short delay
        setTimeout(() => {
          setShowWinPopup(false);
          setShowBattleWinnerModal(true);
        }, 2000);
      }
      
      if (gameState.winner === 1) {
        soundManager.playVictorySound();
      } else {
        soundManager.playDefeatSound();
      }
    } else if (!gameState.isGameActive && gameState.winner === 0 && !battleComplete) {
      setWinMessage('Game Over - Draw! 🐝');
      setShowWinPopup(true);
    } else if (gameState.timeLeft === 0 && !battleComplete && timeLimit > 0) {
      const winner = gameState.currentPlayer === 1 ? player2Name : player1Name;
      setWinMessage(`${winner} wins due to time limit! 🐝`);
      setShowWinPopup(true);
    }
    
    // Reset the ref when a new game starts (but only if battle is not complete)
    if (gameState.isGameActive && gameState.winner === 0 && !battleComplete) {
      gameCompletedRef.current = false;
    }
  }, [gameState.winner, gameState.isGameActive, gameState.timeLeft, gameState.currentPlayer, player1Name, player2Name, battleLength, battleComplete, showBattleWinnerModal, battleScores, battleGamesPlayed, timeLimit]);

  const handleNextGame = () => {
    // Don't allow next game if battle is complete
    if (battleGamesPlayed >= battleLength) {
      return;
    }
    setShowWinPopup(false);
    // Calculate the starting player for the next game
    const nextStartingPlayer = ((battleGamesPlayed + 1) % 2) === 0 ? 1 : 2;
    resetGame(nextStartingPlayer);
  };

  const handlePlayAgain = () => {
    // Set resetting flag to prevent popups during reset
    isResettingRef.current = true;
    
    // Close all modals
    setShowWinPopup(false);
    setShowBattleWinnerModal(false);
    
    // Reset all states
    setBattleComplete(false);
    gameCompletedRef.current = false;
    setWinMessage('');
    
    // Reset scores and games played
    setBattleScores({ player1: 0, player2: 0 });
    setBattleGamesPlayed(0);
    
    // Reset game board after a short delay to ensure state updates complete
    setTimeout(() => {
      resetGame(1); // Start with player 1 when playing again
      // Clear the resetting flag after reset completes
      setTimeout(() => {
        isResettingRef.current = false;
      }, 200);
    }, 100);
  };

  const handleBackToMenu = () => {
    setShowBattleWinnerModal(false);
    onBackToMenu();
  };

  return (
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
      {/* Mobile-optimized header */}
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
        {/* Title and back button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => {
              onBackToMenu();
              soundManager.playClickSound();
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
            🐝 Bee-Five Battle
          </h1>
        </div>

        {/* Game info */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '0.5rem' : '1rem',
          flexWrap: 'wrap'
        }}>
          <span style={{
            color: '#FFC30B',
            fontSize: isMobile ? '0.8rem' : '1rem',
            fontWeight: 'bold'
          }}>
            Game {battleGamesPlayed + 1} of {battleLength}
          </span>
        </div>
      </div>

      {/* Main game area - fills remaining space */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isMobile ? '1rem' : '2rem',
        position: 'relative',
        overflow: 'auto',
        boxSizing: 'border-box'
      }}>

      {/* Main Content Container - Scoreboard + Game + Timer */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'center',
        alignItems: isMobile ? 'center' : 'center',
        gap: isMobile ? '1rem' : '2rem',
        width: '100%',
        maxWidth: isMobile ? '90vw' : '1200px'
      }}>
      {/* Left Panel - Scoreboard */}
      {!isMobile && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          padding: '0.75rem',
          border: '3px solid black',
          boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
          width: '200px',
          alignSelf: 'center'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{
              textAlign: 'center',
              background: battleScores.player1 > battleScores.player2 ? '#e8f5e9' : 'transparent',
              padding: '0.4rem',
              borderRadius: '8px',
              border: battleScores.player1 > battleScores.player2 ? '2px solid #4CAF50' : '1px solid #ddd'
            }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '0.2rem'
              }}>
                {player1Name}
              </div>
              <div style={{
                fontSize: '1.3rem',
                fontWeight: 'bold',
                color: '#FFC30B',
                textShadow: '2px 2px 0px black'
              }}>
                {battleScores.player1}
              </div>
            </div>
            
            <div style={{
              fontSize: '0.9rem',
              fontWeight: 'bold',
              color: '#333',
              textAlign: 'center'
            }}>
              VS
            </div>
            
            <div style={{
              textAlign: 'center',
              background: battleScores.player2 > battleScores.player1 ? '#e8f5e9' : 'transparent',
              padding: '0.4rem',
              borderRadius: '8px',
              border: battleScores.player2 > battleScores.player1 ? '2px solid #4CAF50' : '1px solid #ddd'
            }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '0.2rem'
              }}>
                {player2Name}
              </div>
              <div style={{
                fontSize: '1.3rem',
                fontWeight: 'bold',
                color: '#FFC30B',
                textShadow: '2px 2px 0px black'
              }}>
                {battleScores.player2}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Board Container */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: isMobile ? '20px' : 'clamp(15px, 3vw, 25px)',
        padding: isMobile ? '1.5rem 1rem' : 'clamp(1.5rem, 3vw, 2rem)',
        width: isMobile ? '90vw' : 'auto',
        minWidth: isMobile ? 'auto' : '400px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 0 0 3px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        alignSelf: 'center'
      }}>
        {/* Current Player */}
        <p style={{
          fontSize: isMobile ? '0.9rem' : 'clamp(0.9rem, 2.5vw, 1.1rem)',
          color: '#333',
          margin: '0 0 clamp(0.5rem, 1.5vw, 1rem) 0',
          fontWeight: 'bold'
        }}>
          Current Player: {gameState.currentPlayer === 1 ? player1Name : player2Name}
        </p>

        {/* Game Board using GameCanvas */}
        <div style={{
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

      {/* Right Panel - Timer */}
      {!isMobile && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          padding: '1rem',
          border: '3px solid black',
          boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
          width: '150px',
          textAlign: 'center',
          alignSelf: 'center'
        }}>
          <p style={{
            fontSize: '0.9rem',
            color: '#333',
            margin: '0 0 0.5rem 0',
            fontWeight: 'bold'
          }}>
            ⏱️ Time Left
          </p>
          <p style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: gameState.timeLeft < 5 ? '#F44336' : '#4CAF50',
            textShadow: '2px 2px 0px black'
          }}>
            {gameState.timeLeft}s
          </p>
        </div>
      )}

      {/* Close Main Content Container */}
      </div>
      </div>

      {/* Win Popup */}
      {showWinPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: isMobile ? '1rem' : '2rem'
        }}>
          <div style={{
            backgroundColor: '#FFC30B',
            padding: isMobile ? '1.5rem 1.25rem' : '40px',
            borderRadius: isMobile ? '16px' : '20px',
            border: '4px solid black',
            textAlign: 'center',
            width: isMobile ? '100%' : 'auto',
            minWidth: isMobile ? 'auto' : '300px',
            maxWidth: isMobile ? '100%' : '90vw',
            position: 'relative',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            boxSizing: 'border-box'
          }}>
            <h2 style={{
              fontSize: isMobile ? '1.5em' : '2em',
              color: 'black',
              marginBottom: isMobile ? '1rem' : '20px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}>
              {winMessage}
            </h2>
            
            {battleGamesPlayed < battleLength ? (
              <button
                onClick={handleNextGame}
                style={{
                  padding: isMobile ? '1rem 1.25rem' : '0.75rem 1.5rem',
                  fontSize: isMobile ? '1.05rem' : '1rem',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: '2px solid black',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  minHeight: isMobile ? '52px' : 'auto',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                Next Game
              </button>
            ) : (
              <>
                <p style={{
                  fontSize: isMobile ? '1rem' : '1.1em',
                  color: '#333',
                  marginBottom: isMobile ? '1rem' : '1.5rem',
                  fontWeight: 'bold'
                }}>
                  Battle Complete! 🏆
                </p>
                <div style={{
                  display: 'flex',
                  gap: isMobile ? '0.75rem' : '1rem',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'center'
                }}>
                  <button
                    onClick={handlePlayAgain}
                    style={{
                      padding: isMobile ? '1rem 1.25rem' : '0.75rem 1.5rem',
                      fontSize: isMobile ? '1.05rem' : '1rem',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: '2px solid black',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease',
                      minHeight: isMobile ? '52px' : 'auto',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                      width: isMobile ? '100%' : 'auto'
                    }}
                  >
                    Play Again
                  </button>
                  <button
                    onClick={handleBackToMenu}
                    style={{
                      padding: isMobile ? '1rem 1.25rem' : '0.75rem 1.5rem',
                      fontSize: isMobile ? '1.05rem' : '1rem',
                      backgroundColor: '#666',
                      color: 'white',
                      border: '2px solid black',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease',
                      minHeight: isMobile ? '52px' : 'auto',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                      width: isMobile ? '100%' : 'auto'
                    }}
                  >
                    Menu
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Final Winner Announcement Modal */}
      {showBattleWinnerModal && (() => {
        const finalWinner = battleScores.player1 > battleScores.player2 ? player1Name : player2Name;
        const finalWinnerScore = battleScores.player1 > battleScores.player2 ? battleScores.player1 : battleScores.player2;
        const finalLoserScore = battleScores.player1 > battleScores.player2 ? battleScores.player2 : battleScores.player1;
        const isTie = battleScores.player1 === battleScores.player2;
        
        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
            padding: isMobile ? '1rem' : '2rem'
          }}>
            <div style={{
              backgroundColor: '#FFC30B',
              padding: isMobile ? '1.5rem 1.25rem' : '3rem',
              borderRadius: isMobile ? '16px' : '25px',
              border: '5px solid black',
              textAlign: 'center',
              width: isMobile ? '100%' : 'auto',
              minWidth: isMobile ? 'auto' : '400px',
              maxWidth: isMobile ? '100%' : '90vw',
              position: 'relative',
              boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
              boxSizing: 'border-box',
              animation: 'victoryBounce 1s ease-out'
            }}>
              {/* Celebration Icon */}
              <div style={{
                fontSize: '5em',
                marginBottom: '20px',
                animation: 'victorySpin 2s ease-out infinite'
              }}>
                {isTie ? '🤝' : '🏆'}
              </div>
              
              {/* Title */}
              <h1 style={{
                fontSize: isMobile ? '2em' : '3em',
                color: isTie ? '#6c757d' : '#8B4513',
                marginBottom: '15px',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                fontWeight: 'bold'
              }}>
                {isTie ? 'It\'s a Tie! 🤝' : 'BATTLE COMPLETE! 🎉'}
              </h1>
              
              {/* Winner Announcement */}
              {!isTie && (
                <h2 style={{
                  fontSize: isMobile ? '1.8em' : '2.2em',
                  color: '#228B22',
                  marginBottom: '20px',
                  fontWeight: 'bold',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
                }}>
                  {finalWinner} WINS! 🎊
                </h2>
              )}
              
              {/* Final Score Display */}
              <div style={{
                fontSize: '1.3em',
                color: '#333',
                marginBottom: '25px',
                display: 'flex',
                justifyContent: 'center',
                gap: '2rem',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  backgroundColor: 'black',
                  color: 'white',
                  padding: isMobile ? '10px 18px' : '15px 25px',
                  borderRadius: '15px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ fontSize: isMobile ? '0.8em' : '0.9em', marginBottom: '5px' }}>{player1Name}</div>
                  <div style={{ fontSize: isMobile ? '1.5em' : '2em' }}>{battleScores.player1}</div>
                </div>
                <div style={{ 
                  fontSize: isMobile ? '1.2em' : '1.5em', 
                  fontWeight: 'bold',
                  color: '#666'
                }}>vs</div>
                <div style={{
                  backgroundColor: 'black',
                  color: 'white',
                  padding: isMobile ? '10px 18px' : '15px 25px',
                  borderRadius: '15px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ fontSize: isMobile ? '0.8em' : '0.9em', marginBottom: '5px' }}>{player2Name}</div>
                  <div style={{ fontSize: isMobile ? '1.5em' : '2em' }}>{battleScores.player2}</div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '20px',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={handlePlayAgain}
                  style={{
                    padding: '15px 30px',
                    fontSize: '1.2em',
                    fontWeight: 'bold',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: '3px solid black',
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
                  {isTie ? '🔄 Rematch' : '🏆 New Battle'}
                </button>
                
                <button
                  onClick={handleBackToMenu}
                  style={{
                    padding: '15px 30px',
                    fontSize: '1.2em',
                    fontWeight: 'bold',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: '3px solid black',
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
              
              <style>{`
                @keyframes victoryBounce {
                  0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
                  50% { transform: scale(1.1) rotate(5deg); opacity: 1; }
                  70% { transform: scale(0.9) rotate(-2deg); }
                  100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                @keyframes victorySpin {
                  0% { transform: rotate(0deg) scale(1); }
                  25% { transform: rotate(90deg) scale(1.1); }
                  50% { transform: rotate(180deg) scale(1.2); }
                  75% { transform: rotate(270deg) scale(1.1); }
                  100% { transform: rotate(360deg) scale(1); }
                }
              `}</style>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
