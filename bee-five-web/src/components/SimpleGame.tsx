"use client";

import React, { useState, useEffect } from 'react';
import { soundManager } from '../utils/sounds';
import { useGameLogic } from '../hooks/useGameLogic';
import GameCanvas from './GameCanvas';

interface SimpleGameProps {
  onBackToMenu: () => void;
  backgroundColor?: 'yellow' | 'black';
}

export default function SimpleGame({ onBackToMenu, backgroundColor = 'yellow' }: SimpleGameProps) {
  const [timeLimit] = useState(15);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  
  const { gameState, handleCellClick, resetGame } = useGameLogic({
    timeLimit,
    pauseTimer: true
  });

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
  React.useEffect(() => {
    soundManager.setMuted(!soundEnabled);
  }, [soundEnabled]);

  // Show popup when game ends
  React.useEffect(() => {
    if (gameState.winner > 0) {
      const winnerName = gameState.winner === 1 ? 'Black' : 'Yellow';
      setWinMessage(`${winnerName} wins!`);
      setShowWinPopup(true);
      
      if (gameState.winner === 1) {
        soundManager.playVictorySound();
      } else {
        soundManager.playDefeatSound();
      }
    } else if (!gameState.isGameActive && gameState.winner === 0) {
      setWinMessage('Game Over - Draw! 🐝');
      setShowWinPopup(true);
    } else if (gameState.timeLeft === 0) {
      const winner = gameState.currentPlayer === 1 ? 'Yellow' : 'Black';
      setWinMessage(`${winner} wins due to time limit! 🐝`);
      setShowWinPopup(true);
    }
  }, [gameState.winner, gameState.isGameActive, gameState.timeLeft, gameState.currentPlayer]);


  // Match BeefiveApp: gray background
  const backgroundStyle = '#808080';

  return (
    <div style={{ 
      background: backgroundStyle,
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'auto'
    }}>
      {/* Header - Match BeefiveApp: black with yellow border */}
      <div style={{
        background: '#000000',
        paddingTop: isMobile ? '0.75rem' : '0',
        paddingBottom: isMobile ? '0.75rem' : '0',
        paddingLeft: isMobile ? '0.75rem' : '1rem',
        paddingRight: isMobile ? '0.75rem' : '1rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: '2px',
        borderBottomStyle: 'solid',
        borderBottomColor: '#FFC30B',
        position: 'relative'
      }}>
        {/* Logo container - centered */}
        <div style={{
          width: '150px',
          height: '40px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <img 
            src="/BEE-FIVE.png" 
            alt="Bee Five Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        </div>
      </div>

      {/* Current Player Indicator - Match BeefiveApp */}
      <div style={{
        padding: '15px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#000'
        }}>
          <span style={{ color: '#4CAF50', fontSize: '28px' }}>▶</span>{' '}
          {gameState.currentPlayer === 1 ? 'Black' : 'Yellow'}
        </div>
      </div>

      {/* Main game area - fills remaining space */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isMobile ? '1rem' : '1rem',
        position: 'relative',
        minHeight: 0,
        overflow: 'auto'
      }}>
        {/* Game board with responsive sizing */}
        <div style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
            <GameCanvas
              gameState={gameState}
              onCellClick={handleCellClick}
            />
        </div>
      </div>

      {/* Footer - Match BeefiveApp: black with yellow border, yellow buttons */}
      <div style={{
        display: 'flex',
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
            padding: '12px 20px',
            borderRadius: '8px',
            border: '2px solid #000',
            margin: '0 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '16px',
            color: '#000'
          }}
        >
          🏠 Home
        </button>
        
        <button 
          onClick={() => {
            resetGame();
            if (soundEnabled) soundManager.playClickSound();
          }}
          style={{
            flex: 1,
            backgroundColor: '#FFC30B',
            padding: '12px 20px',
            borderRadius: '8px',
            border: '2px solid #000',
            margin: '0 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '16px',
            color: '#000'
          }}
        >
          🔄 Restart
        </button>
      </div>

      {/* Winning Popup Modal */}
      {showWinPopup && (
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
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease-out'
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
            animation: 'popIn 0.5s ease-out',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            {/* Celebration Icons */}
            {/* Win Message */}
            <h1 style={{
              fontSize: '2.5em',
              color: 'black',
              marginBottom: '20px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}>
              {winMessage}
            </h1>
            
            {/* Subtitle */}
            <p style={{
              fontSize: '1.2em',
              color: '#333',
              marginBottom: '30px'
            }}>
              {winMessage.includes('Black') ? 'Sweet victory! 🍯' : winMessage.includes('Yellow') ? 'The hive strikes back! 🍯' : 'Great game! 🍯'}
            </p>
            
            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button 
                onClick={() => {
                  resetGame();
                  setShowWinPopup(false);
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
                  minWidth: '120px'
                }}
              >
                Play Again
              </button>
              
              <button 
                onClick={() => {
                  setShowWinPopup(false);
                  onBackToMenu();
                }}
                style={{
                  padding: '12px 24px',
                  fontSize: '1.1em',
                  fontWeight: 'bold',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: '2px solid black',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minWidth: '120px'
                }}
              >
                Back to Menu
              </button>
            </div>
            
            {/* Close button */}
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
  );
}
