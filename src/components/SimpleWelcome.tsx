"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { soundManager } from '../utils/sounds';
import { type RoomInfo } from '../utils/p2pMultiplayer';
import { MultiplayerLobby } from './MultiplayerLobby';
import { MultiplayerGame } from './MultiplayerGame';
import SimpleGame from './SimpleGame';
import AIGame from './AIGame';
import AdventureGame from './AdventureGame';
import BattleGame from './TournamentGame';
import AboutUs from './AboutUs';
import HowToPlay from './HowToPlay';
import NewsUpdates from './NewsUpdates';
import PrivacyPolicy from './PrivacyPolicy';
import Settings from './Settings';
import SidebarMenu from './SidebarMenu';
import MobileHeader from './MobileHeader';

export default function SimpleWelcome() {
  const [gameMode, setGameMode] = useState<'menu' | 'local-multiplayer' | 'online-lobby' | 'online-game' | 'ai-game' | 'adventure-game' | 'show-take-turns-submenu' | 'show-ai-submenu' | 'competition' | 'about-us' | 'how-to-play' | 'news-updates' | 'privacy-policy' | 'settings' | 'profile' | 'contact-us'>('menu');
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
  const [playerNumber, setPlayerNumber] = useState<1 | 2>(1);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showClassicModal, setShowClassicModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [aiTimer, setAiTimer] = useState<number>(15);
  const [isMobile, setIsMobile] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState<'yellow' | 'black'>('yellow');
  
  // Competition system state (fresh tournament implementation)
  const [showCompetitionModal, setShowCompetitionModal] = useState(false);
  const [competitionLength, setCompetitionLength] = useState<5 | 7>(5);
  const [competitor1Name, setCompetitor1Name] = useState('A');
  const [competitor2Name, setCompetitor2Name] = useState('B');
  const [timerOption, setTimerOption] = useState<3 | 15 | 30 | 0>(15);
  const [competitionScores, setCompetitionScores] = useState({ player1: 0, player2: 0 });
  const [competitionGamesPlayed, setCompetitionGamesPlayed] = useState(0);
  const [competitionWinner, setCompetitionWinner] = useState('');
  const [showCompetitionWinnerModal, setShowCompetitionWinnerModal] = useState(false);

  // Initialize mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle local multiplayer mode
  if (gameMode === 'local-multiplayer') {
    return <SimpleGame onBackToMenu={() => setGameMode('menu')} backgroundColor={backgroundColor} />;
  }

  // Handle AI game mode
  if (gameMode === 'ai-game') {
    return <AIGame onBackToMenu={() => setGameMode('menu')} initialDifficulty={aiDifficulty} initialTimer={aiTimer} backgroundColor={backgroundColor} />;
  }

  // Handle Adventure game mode
  if (gameMode === 'adventure-game') {
    return <AdventureGame onBackToMenu={() => setGameMode('menu')} />;
  }

  // Handle Competition mode (fresh tournament implementation)
  if (gameMode === 'competition') {
    return (
      <BattleGame 
        key={`competition-${timerOption}`}
        battleLength={competitionLength}
        player1Name={competitor1Name}
        player2Name={competitor2Name}
        battleScores={competitionScores}
        setBattleScores={setCompetitionScores}
        battleGamesPlayed={competitionGamesPlayed}
        setBattleGamesPlayed={setCompetitionGamesPlayed}
        setBattleWinner={setCompetitionWinner}
        showBattleWinnerModal={showCompetitionWinnerModal}
        setShowBattleWinnerModal={setShowCompetitionWinnerModal}
        onBackToMenu={() => setGameMode('menu')}
        timeLimit={timerOption}
      />
    );
  }

  // Handle online multiplayer lobby
  if (gameMode === 'online-lobby') {
    return (
      <MultiplayerLobby 
        onGameStart={(roomInfo: RoomInfo, playerNum: 1 | 2) => {
          setCurrentRoom(roomInfo);
          setPlayerNumber(playerNum);
          setGameMode('online-game');
        }}
        onBackToMenu={() => setGameMode('menu')}
      />
    );
  }

  // Handle online multiplayer game
  if (gameMode === 'online-game' && currentRoom) {
    return (
      <MultiplayerGame 
        roomInfo={currentRoom}
        playerNumber={playerNumber}
        onBackToLobby={() => setGameMode('online-lobby')}
      />
    );
  }

  // Handle About Us page
  if (gameMode === 'about-us') {
    return <AboutUs onBackToMenu={() => setGameMode('menu')} isMobile={isMobile} />;
  }

  // Handle How to Play page
  if (gameMode === 'how-to-play') {
    return <HowToPlay onBackToMenu={() => setGameMode('menu')} isMobile={isMobile} />;
  }

  // Handle News/Updates page
  if (gameMode === 'news-updates') {
    return <NewsUpdates onBackToMenu={() => setGameMode('menu')} isMobile={isMobile} />;
  }

  // Handle Privacy Policy page
  if (gameMode === 'privacy-policy') {
    return <PrivacyPolicy onBackToMenu={() => setGameMode('menu')} isMobile={isMobile} />;
  }

  // Handle Settings page
  if (gameMode === 'settings') {
    return <Settings 
      onBackToMenu={() => setGameMode('menu')} 
      isMobile={isMobile}
      backgroundColor={backgroundColor}
      onBackgroundColorChange={setBackgroundColor}
    />;
  }

  // Handle Take Turns submenu
  if (gameMode === 'show-take-turns-submenu') {
    return (
      <div style={{ 
        background: 'linear-gradient(135deg, #FFC30B 0%, #FFD700 50%, #FFC30B 100%)',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100vw',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isMobile ? '1rem 0.75rem' : 'clamp(1rem, 2vw, 2rem)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'visible',
        boxSizing: 'border-box'
      }}>
        {/* Decorative bee pattern background - hidden on mobile */}
        {!isMobile && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.05,
            fontSize: 'clamp(2rem, 8vw, 4rem)',
            pointerEvents: 'none',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: '2rem',
            padding: '2rem',
            zIndex: 0
          }}>
            {['🐝', '🍯', '🐝', '🍯', '🐝', '🍯', '🐝', '🍯', '🐝'].map((emoji, i) => (
              <div key={i} style={{ textAlign: 'center', transform: `rotate(${i * 15}deg)` }}>
                {emoji}
              </div>
            ))}
          </div>
        )}

        {/* Main content card */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.95)',
          borderRadius: isMobile ? '20px' : 'clamp(15px, 3vw, 25px)',
          padding: isMobile ? '1.5rem 1rem' : 'clamp(1.5rem, 3vw, 2rem)',
          width: '90vw',
          maxWidth: '90vw',
          minHeight: '70vh',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 0 0 3px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
          margin: '0 auto',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflowY: 'auto'
        }}>
          {/* Take Turns submenu title */}
          <div style={{ marginBottom: isMobile ? '1.5rem' : 'clamp(1.5rem, 3vw, 2rem)' }}>
            <h1 style={{ 
              fontSize: isMobile ? 'clamp(1.5rem, 8vw, 2rem)' : 'clamp(2rem, 6vw, 3rem)', 
              color: '#FFC30B',
              textShadow: isMobile 
                ? '2px 2px 0px black, -1px -1px 0px black' 
                : '3px 3px 0px black, -1px -1px 0px black, 1px -1px 0px black, -1px 1px 0px black',
              margin: '0 0 0.5rem 0',
              lineHeight: '1.2',
              fontWeight: 'bold',
              WebkitTextStroke: isMobile ? '0.5px black' : 'initial'
            }}>
              👥 Take Turns 👥
            </h1>
            <p style={{
              fontSize: isMobile ? '1rem' : 'clamp(1rem, 3vw, 1.2rem)',
              color: '#ffffff',
              margin: '0 0 clamp(1rem, 3vw, 1.5rem) 0',
              fontWeight: 'bold'
            }}>
              Let's settle This!
            </p>
          </div>

          {/* Submenu buttons */}
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? '1rem' : 'clamp(0.75rem, 2vw, 1rem)',
            marginBottom: isMobile ? '1.5rem' : 'clamp(1.5rem, 4vw, 2rem)',
            width: '100%',
            maxWidth: '100%',
            alignItems: 'center'
          }}>
            <button 
              onClick={() => {
                soundManager.playClickSound();
                setGameMode('local-multiplayer');
              }}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                color: 'white',
                border: '3px solid #FFC30B',
                borderRadius: isMobile ? '16px' : '20px',
                padding: isMobile ? '1.25rem 1.5rem' : '1rem 2rem',
                fontSize: isMobile ? '1.1rem' : '1.2rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                minHeight: isMobile ? '56px' : '60px',
                width: '100%',
                maxWidth: isMobile ? '100%' : '300px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span style={{ fontSize: '1.3em' }}>🤝</span>
              <span>Single Game</span>
            </button>

            <button
              onClick={() => {
                setShowCompetitionModal(true);
                try {
                  soundManager.playClickSound();
                } catch (error) {
                  console.warn('Sound error:', error);
                }
              }}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #FF6B35 0%, #e55a2b 100%)',
                color: 'white',
                border: '3px solid #FFC30B',
                borderRadius: isMobile ? '16px' : '20px',
                padding: isMobile ? '1.25rem 1.5rem' : '1rem 2rem',
                fontSize: isMobile ? '1.1rem' : '1.2rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                minHeight: isMobile ? '56px' : '60px',
                width: '100%',
                maxWidth: isMobile ? '100%' : '300px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span style={{ fontSize: '1.3em' }}>⚔️</span>
              <span>Battle</span>
            </button>
          </div>

          {/* Back button */}
          <button
            onClick={() => setGameMode('menu')}
            style={{
              padding: isMobile ? '0.75rem 1rem' : '0.5rem 1rem',
              fontSize: isMobile ? '0.9rem' : '1rem',
              fontWeight: 'bold',
              backgroundColor: '#666',
              color: 'white',
              border: '2px solid black',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              margin: isMobile ? '1rem auto 0' : 'clamp(1rem, 2vw, 1.5rem) auto 0',
              maxWidth: '200px',
              display: 'block',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            Back to Menu
          </button>
        </div>

        {/* Footer */}
        <footer style={{ 
          marginTop: isMobile ? '1rem' : 'clamp(1rem, 3vw, 2rem)',
          color: 'rgba(255,255,255,0.7)',
          fontSize: isMobile ? '0.8rem' : 'clamp(0.7rem, 2vw, 0.8rem)',
          textAlign: 'center',
          zIndex: 1,
          padding: isMobile ? '0 1rem 0.5rem' : '0'
        }}>
          <p style={{ margin: 0 }}>
            🐝 &copy; 2025 Bee-Five. Product of MindGrind 🐝
          </p>
        </footer>

        {/* Competition Modal - rendered within Take Turns submenu */}
        {showCompetitionModal && createPortal(
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 20000,
            padding: isMobile ? '1rem' : '2rem'
          }}>
            <div style={{
              backgroundColor: '#FFC30B',
              padding: isMobile ? '1.5rem' : '2rem',
              borderRadius: isMobile ? '16px' : '20px',
              border: '4px solid black',
              textAlign: 'center',
              width: '100%',
              maxWidth: isMobile ? '100%' : '500px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              position: 'relative'
            }}>
              <h2 style={{
                fontSize: isMobile ? '1.5em' : '2em',
                color: 'black',
                marginBottom: isMobile ? '1.5rem' : '2rem',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
              }}>
                ⚔️ Battle Setup ⚔️
              </h2>
              
              <div style={{ marginBottom: isMobile ? '1.5rem' : '2rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  fontWeight: 'bold',
                  color: '#333',
                  marginBottom: isMobile ? '0.75rem' : '1rem'
                }}>
                  Battle Length:
                </label>
                <div style={{
                  display: 'flex',
                  gap: isMobile ? '0.75rem' : '1rem',
                  justifyContent: 'center'
                }}>
                  <button
                    onClick={() => setCompetitionLength(5)}
                    style={{
                      padding: isMobile ? '0.75rem 1rem' : '0.5rem 1rem',
                      fontSize: isMobile ? '1rem' : '1rem',
                      backgroundColor: competitionLength === 5 ? '#4CAF50' : '#f0f0f0',
                      color: competitionLength === 5 ? 'white' : '#333',
                      border: '2px solid #333',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    5 Games
                  </button>
                  <button
                    onClick={() => setCompetitionLength(7)}
                    style={{
                      padding: isMobile ? '0.75rem 1rem' : '0.5rem 1rem',
                      fontSize: isMobile ? '1rem' : '1rem',
                      backgroundColor: competitionLength === 7 ? '#4CAF50' : '#f0f0f0',
                      color: competitionLength === 7 ? 'white' : '#333',
                      border: '2px solid #333',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    7 Games
                  </button>
                </div>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: isMobile ? '0.5rem' : '1rem',
                marginBottom: isMobile ? '1rem' : '1.5rem'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: isMobile ? '0.8rem' : '0.9rem',
                    fontWeight: 'bold',
                    color: '#333',
                    marginBottom: '0.25rem',
                    textAlign: 'left'
                  }}>
                    Player 1:
                  </label>
                  <input
                    type="text"
                    value={competitor1Name}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 5);
                      // Prevent duplicate names (case-insensitive)
                      if (value.toLowerCase() !== competitor2Name.toLowerCase()) {
                        setCompetitor1Name(value);
                      }
                    }}
                    maxLength={5}
                    style={{
                      width: '100%',
                      padding: isMobile ? '0.5rem' : '0.6rem',
                      fontSize: isMobile ? '0.85rem' : '0.95rem',
                      border: '2px solid black',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      color: '#333',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: isMobile ? '0.8rem' : '0.9rem',
                    fontWeight: 'bold',
                    color: '#333',
                    marginBottom: '0.25rem',
                    textAlign: 'left'
                  }}>
                    Player 2:
                  </label>
                  <input
                    type="text"
                    value={competitor2Name}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 5);
                      // Prevent duplicate names (case-insensitive)
                      if (value.toLowerCase() !== competitor1Name.toLowerCase()) {
                        setCompetitor2Name(value);
                      }
                    }}
                    maxLength={5}
                    style={{
                      width: '100%',
                      padding: isMobile ? '0.5rem' : '0.6rem',
                      fontSize: isMobile ? '0.85rem' : '0.95rem',
                      border: '2px solid black',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      color: '#333',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Timer Options */}
              <div style={{ marginBottom: isMobile ? '1.5rem' : '2rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  fontWeight: 'bold',
                  color: '#333',
                  marginBottom: isMobile ? '0.5rem' : '0.75rem',
                  textAlign: 'left'
                }}>
                  Time for each move in seconds:
                </label>
                <div style={{
                  display: 'flex',
                  gap: isMobile ? '0.5rem' : '0.75rem',
                  width: '100%',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => setTimerOption(3)}
                    style={{
                      flex: '1 1 0',
                      minWidth: '60px',
                      padding: isMobile ? '0.6rem 0.5rem' : '0.5rem 0.75rem',
                      fontSize: isMobile ? '0.85rem' : '0.95rem',
                      backgroundColor: timerOption === 3 ? '#4CAF50' : '#f0f0f0',
                      color: timerOption === 3 ? 'white' : '#333',
                      border: '2px solid #333',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    3
                  </button>
                  <button
                    onClick={() => setTimerOption(15)}
                    style={{
                      flex: '1 1 0',
                      minWidth: '60px',
                      padding: isMobile ? '0.6rem 0.5rem' : '0.5rem 0.75rem',
                      fontSize: isMobile ? '0.85rem' : '0.95rem',
                      backgroundColor: timerOption === 15 ? '#4CAF50' : '#f0f0f0',
                      color: timerOption === 15 ? 'white' : '#333',
                      border: '2px solid #333',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    15
                  </button>
                  <button
                    onClick={() => setTimerOption(30)}
                    style={{
                      flex: '1 1 0',
                      minWidth: '60px',
                      padding: isMobile ? '0.6rem 0.5rem' : '0.5rem 0.75rem',
                      fontSize: isMobile ? '0.85rem' : '0.95rem',
                      backgroundColor: timerOption === 30 ? '#4CAF50' : '#f0f0f0',
                      color: timerOption === 30 ? 'white' : '#333',
                      border: '2px solid #333',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    30
                  </button>
                  <button
                    onClick={() => setTimerOption(0)}
                    style={{
                      flex: '1 1 0',
                      minWidth: '60px',
                      padding: isMobile ? '0.6rem 0.5rem' : '0.5rem 0.75rem',
                      fontSize: isMobile ? '0.85rem' : '0.95rem',
                      backgroundColor: timerOption === 0 ? '#4CAF50' : '#f0f0f0',
                      color: timerOption === 0 ? 'white' : '#333',
                      border: '2px solid #333',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    no timer
                  </button>
                </div>
              </div>

              <div style={{ 
                display: 'flex',
                gap: isMobile ? '0.75rem' : '1rem',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => {
                    setShowCompetitionModal(false);
                    setCompetitionGamesPlayed(0);
                    setCompetitionScores({ player1: 0, player2: 0 });
                    setGameMode('competition');
                    try {
                      soundManager.playClickSound();
                    } catch (error) {
                      console.warn('Sound error:', error);
                    }
                  }}
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
                  Start
                </button>
                
                <button
                  onClick={() => {
                    setShowCompetitionModal(false);
                    soundManager.playClickSound();
                  }}
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
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  // Handle AI submenu
  if (gameMode === 'show-ai-submenu') {
    return (
      <div style={{ 
        background: 'linear-gradient(135deg, #FFC30B 0%, #FFD700 50%, #FFC30B 100%)',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100vw',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isMobile ? '1rem 0.75rem' : 'clamp(1rem, 2vw, 2rem)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'visible',
        boxSizing: 'border-box'
      }}>
        {/* Decorative pattern background - hidden on mobile */}
        {!isMobile && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.05,
            fontSize: 'clamp(2rem, 8vw, 4rem)',
            pointerEvents: 'none',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: '2rem',
            padding: '2rem',
            zIndex: 0
          }}>
            {['🤖', '🎯', '🤖', '🎯', '🤖', '🎯', '🤖', '🎯', '🤖'].map((emoji, i) => (
              <div key={i} style={{ textAlign: 'center', transform: `rotate(${i * 15}deg)` }}>
                {emoji}
              </div>
            ))}
          </div>
        )}

        {/* Main content card */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.95)',
          borderRadius: isMobile ? '20px' : 'clamp(15px, 3vw, 25px)',
          padding: isMobile ? '1.5rem 1rem' : 'clamp(1.5rem, 3vw, 2rem)',
          width: '90vw',
          maxWidth: '90vw',
          minHeight: '70vh',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 0 0 3px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
          margin: '0 auto',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflowY: 'auto'
        }}>
          {/* AI submenu title */}
          <div style={{ marginBottom: isMobile ? '1.5rem' : 'clamp(1.5rem, 3vw, 2rem)' }}>
            <h1 style={{ 
              fontSize: isMobile ? 'clamp(1.5rem, 8vw, 2rem)' : 'clamp(2rem, 6vw, 3rem)', 
              color: '#FFC30B',
              textShadow: isMobile 
                ? '2px 2px 0px black, -1px -1px 0px black' 
                : '3px 3px 0px black, -1px -1px 0px black, 1px -1px 0px black, -1px 1px 0px black',
              margin: '0 0 0.5rem 0',
              lineHeight: '1.2',
              fontWeight: 'bold',
              WebkitTextStroke: isMobile ? '0.5px black' : 'initial'
            }}>
              🤖 AI Game Mode 🤖
            </h1>
            <p style={{
              fontSize: isMobile ? '1rem' : 'clamp(1rem, 3vw, 1.2rem)',
              color: '#ffffff',
              margin: '0 0 clamp(1rem, 3vw, 1.5rem) 0',
              fontWeight: 'bold'
            }}>
              Do it for the human Race
            </p>
          </div>

          {/* AI submenu buttons */}
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? '1rem' : 'clamp(0.75rem, 2vw, 1rem)',
            marginBottom: isMobile ? '1.5rem' : 'clamp(1.5rem, 4vw, 2rem)',
            width: '100%',
            maxWidth: '100%',
            alignItems: 'center'
          }}>
            <button 
              onClick={() => {
                setShowDifficultyModal(true);
                soundManager.playClickSound();
              }}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                color: 'white',
                border: '3px solid #FFC30B',
                borderRadius: isMobile ? '16px' : '20px',
                padding: isMobile ? '1.25rem 1.5rem' : '1rem 2rem',
                fontSize: isMobile ? '1.1rem' : '1.2rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                minHeight: isMobile ? '56px' : '60px',
                width: '100%',
                maxWidth: isMobile ? '100%' : '300px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span style={{ fontSize: '1.3em' }}>🤖</span>
              <span>Classic</span>
            </button>

            <button 
              onClick={() => {
                setGameMode('adventure-game');
                soundManager.playClickSound();
              }}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)',
                color: 'white',
                border: '3px solid #FFC30B',
                borderRadius: isMobile ? '16px' : '20px',
                padding: isMobile ? '1.25rem 1.5rem' : '1rem 2rem',
                fontSize: isMobile ? '1.1rem' : '1.2rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                minHeight: isMobile ? '56px' : '60px',
                width: '100%',
                maxWidth: isMobile ? '100%' : '300px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span style={{ fontSize: '1.3em' }}>🎯</span>
              <span>Adventure</span>
            </button>
          </div>

          {/* Back button */}
          <button
            onClick={() => setGameMode('menu')}
            style={{
              padding: isMobile ? '0.5rem 0.75rem' : '0.4rem 0.75rem',
              fontSize: isMobile ? '0.75rem' : '0.85rem',
              fontWeight: 'bold',
              backgroundColor: '#666',
              color: 'white',
              border: '2px solid black',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              marginTop: isMobile ? '1rem' : 'clamp(1rem, 2vw, 1.5rem)',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              alignSelf: 'center',
              width: 'auto'
            }}
          >
            Back to Menu
          </button>
        </div>

        {/* Footer */}
        <footer style={{ 
          marginTop: isMobile ? '1rem' : 'clamp(1rem, 3vw, 2rem)',
          color: 'rgba(255,255,255,0.7)',
          fontSize: isMobile ? '0.8rem' : 'clamp(0.7rem, 2vw, 0.8rem)',
          textAlign: 'center',
          zIndex: 1,
          padding: isMobile ? '0 1rem 0.5rem' : '0'
        }}>
          <p style={{ margin: 0 }}>
            🐝 &copy; 2025 Bee-Five. Product of MindGrind 🐝
          </p>
        </footer>

        {/* Difficulty Modal - rendered within AI submenu */}
        {showDifficultyModal && createPortal(
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 20000,
            padding: isMobile ? '1rem' : '2rem'
          }}>
            <div style={{
              backgroundColor: '#FFC30B',
              padding: isMobile ? '1.5rem' : '2rem',
              borderRadius: isMobile ? '16px' : '20px',
              border: '4px solid black',
              textAlign: 'center',
              width: '100%',
              maxWidth: isMobile ? '100%' : '500px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              position: 'relative'
            }}>
              <h2 style={{
                fontSize: isMobile ? '1.3em' : '1.5em',
                color: 'black',
                marginBottom: isMobile ? '0.5rem' : '0.75rem',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
              }}>
                🤖 Select Difficulty 🤖
              </h2>
              
              <p style={{
                fontSize: isMobile ? '0.9em' : '0.95em',
                color: '#333',
                marginBottom: isMobile ? '1rem' : '1.25rem'
              }}>
                Choose the AI difficulty level:
              </p>
              
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '0.5rem' : '0.6rem',
                marginBottom: isMobile ? '1rem' : '1.25rem'
              }}>
                <button
                  onClick={() => {
                    setSelectedDifficulty('easy');
                    setShowDifficultyModal(false);
                    setShowTimerModal(true);
                    soundManager.playClickSound();
                  }}
                  style={{
                    padding: isMobile ? '0.75rem 0.5rem' : '0.6rem 0.5rem',
                    fontSize: isMobile ? '0.95rem' : '0.9em',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: '2px solid black',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease',
                    minHeight: isMobile ? '48px' : 'auto',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    width: '100%',
                    maxWidth: '300px',
                    margin: '0 auto'
                  }}
                >
                  🟢 Easy
                </button>

                <button
                  onClick={() => {
                    setSelectedDifficulty('medium');
                    setShowDifficultyModal(false);
                    setShowTimerModal(true);
                    soundManager.playClickSound();
                  }}
                  style={{
                    padding: isMobile ? '0.75rem 0.5rem' : '0.6rem 0.5rem',
                    fontSize: isMobile ? '0.95rem' : '0.9em',
                    backgroundColor: '#FF9800',
                    color: 'white',
                    border: '2px solid black',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease',
                    minHeight: isMobile ? '48px' : 'auto',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    width: '100%',
                    maxWidth: '300px',
                    margin: '0 auto'
                  }}
                >
                  🟠 Medium
                </button>

                <button
                  onClick={() => {
                    setSelectedDifficulty('hard');
                    setShowDifficultyModal(false);
                    setShowTimerModal(true);
                    soundManager.playClickSound();
                  }}
                  style={{
                    padding: isMobile ? '0.75rem 0.5rem' : '0.6rem 0.5rem',
                    fontSize: isMobile ? '0.95rem' : '0.9em',
                    backgroundColor: '#F44336',
                    color: 'white',
                    border: '2px solid black',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease',
                    minHeight: isMobile ? '48px' : 'auto',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    width: '100%',
                    maxWidth: '300px',
                    margin: '0 auto'
                  }}
                >
                  🔴 Hard
                </button>
              </div>

              <button
                onClick={() => {
                  setShowDifficultyModal(false);
                  soundManager.playClickSound();
                }}
                style={{
                  padding: isMobile ? '1rem 0.25rem' : '0.75rem 0.25rem',
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
                  width: '100%',
                  maxWidth: '300px',
                  margin: '0 auto'
                }}
              >
                Cancel
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* Timer Selection Modal - appears after selecting difficulty */}
        {showTimerModal && createPortal(
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 20001,
            padding: isMobile ? '1rem' : '2rem'
          }}>
            <div style={{
              backgroundColor: '#FFC30B',
              padding: isMobile ? '1.5rem' : '2rem',
              borderRadius: isMobile ? '16px' : '20px',
              border: '4px solid black',
              textAlign: 'center',
              width: '100%',
              maxWidth: isMobile ? '100%' : '500px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              position: 'relative'
            }}>
              <h2 style={{
                fontSize: isMobile ? '1.3em' : '1.5em',
                color: 'black',
                marginBottom: isMobile ? '0.5rem' : '0.75rem',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
              }}>
                ⏱️ Select Timer ⏱️
              </h2>
              
              <p style={{
                fontSize: isMobile ? '0.9em' : '0.95em',
                color: '#333',
                marginBottom: isMobile ? '1rem' : '1.25rem'
              }}>
                Choose timer option:
              </p>
              
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '0.5rem' : '0.6rem',
                marginBottom: isMobile ? '1rem' : '1.25rem'
              }}>
                <button
                  onClick={() => {
                    setAiDifficulty(selectedDifficulty);
                    setAiTimer(15);
                    setShowTimerModal(false);
                    setGameMode('ai-game');
                    soundManager.playClickSound();
                  }}
                  style={{
                    padding: isMobile ? '0.75rem 0.5rem' : '0.6rem 0.5rem',
                    fontSize: isMobile ? '0.95rem' : '0.9em',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: '2px solid black',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease',
                    minHeight: isMobile ? '48px' : 'auto',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    width: '100%',
                    maxWidth: '300px',
                    margin: '0 auto'
                  }}
                >
                  ⏱️ With Timer (15s)
                </button>

                <button
                  onClick={() => {
                    setAiDifficulty(selectedDifficulty);
                    setAiTimer(0);
                    setShowTimerModal(false);
                    setGameMode('ai-game');
                    soundManager.playClickSound();
                  }}
                  style={{
                    padding: isMobile ? '0.75rem 0.5rem' : '0.6rem 0.5rem',
                    fontSize: isMobile ? '0.95rem' : '0.9em',
                    backgroundColor: '#9C27B0',
                    color: 'white',
                    border: '2px solid black',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease',
                    minHeight: isMobile ? '48px' : 'auto',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    width: '100%',
                    maxWidth: '300px',
                    margin: '0 auto'
                  }}
                >
                  ∞ No Timer
                </button>
              </div>

              <button
                onClick={() => {
                  setShowTimerModal(false);
                  setShowDifficultyModal(true);
                  soundManager.playClickSound();
                }}
                style={{
                  padding: isMobile ? '1rem 0.25rem' : '0.75rem 0.25rem',
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
                  width: '100%',
                  maxWidth: '300px',
                  margin: '0 auto'
                }}
              >
                Cancel
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  // Main menu component
  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #FFC30B 0%, #FFD700 50%, #FFC30B 100%)',
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100vw',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isMobile ? '60px 0 0 0' : 'clamp(1rem, 2vw, 2rem)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'visible',
      boxSizing: 'border-box',
      gap: isMobile ? '1rem' : '1.5rem'
    }}>
      {/* Mobile Header - Mobile only */}
      <MobileHeader onMenuItemClick={setGameMode} isMobile={isMobile} />
      
      {/* Vertical Sidebar Menu - Desktop only */}
      <SidebarMenu onMenuItemClick={setGameMode} isMobile={isMobile} />

      {/* Decorative bee pattern background - hidden on mobile */}
      {!isMobile && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.05,
          fontSize: 'clamp(2rem, 8vw, 4rem)',
          pointerEvents: 'none',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: '2rem',
          padding: '2rem',
          zIndex: 0
        }}>
          {['🐝', '🍯', '🐝', '🍯', '🐝', '🍯', '🐝', '🍯', '🐝'].map((emoji, i) => (
            <div key={i} style={{ textAlign: 'center', transform: `rotate(${i * 15}deg)` }}>
              {emoji}
            </div>
          ))}
        </div>
      )}

      {/* Main content card */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.95)',
        borderRadius: isMobile ? '20px' : 'clamp(15px, 3vw, 25px)',
        padding: isMobile ? '1.5rem 1rem' : 'clamp(1.5rem, 3vw, 2rem)',
        width: isMobile ? '90vw' : 'auto',
        maxWidth: isMobile ? '90vw' : 'none',
        flex: isMobile ? 'none' : '1 1 auto',
        minHeight: isMobile ? 'calc(100vh - 140px)' : '90vh',
        maxHeight: isMobile ? 'calc(100vh - 140px)' : '90vh',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 0 0 3px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        margin: '0 auto',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflowY: 'auto'
      }}>
        {/* Main menu title */}
        <div style={{ marginBottom: isMobile ? '1.5rem' : 'clamp(1.5rem, 3vw, 2rem)' }}>
          <h1 style={{ 
            fontSize: isMobile ? 'clamp(1.5rem, 8vw, 2rem)' : 'clamp(2rem, 6vw, 3rem)', 
            color: '#FFC30B',
            textShadow: isMobile 
              ? '2px 2px 0px black, -1px -1px 0px black' 
              : '3px 3px 0px black, -1px -1px 0px black, 1px -1px 0px black, -1px 1px 0px black',
            margin: '0 0 0.5rem 0',
            lineHeight: '1.2',
            fontWeight: 'bold',
            WebkitTextStroke: isMobile ? '0.5px black' : 'initial'
          }}>
            🐝 Bee-Five 🐝
          </h1>
          <p style={{
            fontSize: isMobile ? '1rem' : 'clamp(1rem, 3vw, 1.2rem)',
            color: '#ffffff',
            margin: '0 0 clamp(1rem, 3vw, 1.5rem) 0',
            fontWeight: 'bold'
          }}>
            Your favourite version of Connect-Five!
          </p>
        </div>

        {/* Main menu buttons */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '1rem' : 'clamp(0.75rem, 2vw, 1rem)',
          marginBottom: isMobile ? '1.5rem' : 'clamp(1.5rem, 4vw, 2rem)',
          width: '100%',
          maxWidth: '100%',
          alignItems: 'center'
        }}>
          <button 
            onClick={() => {
              soundManager.playClickSound();
              setGameMode('show-take-turns-submenu');
            }}
            onMouseEnter={(e) => {
              if (!isMobile) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobile) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
              }
            }}
            style={{
              background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
              color: 'white',
              border: '3px solid #FFC30B',
              borderRadius: isMobile ? '16px' : '20px',
              padding: isMobile ? '1.25rem 1.5rem' : '1rem 2rem',
              fontSize: isMobile ? '1.1rem' : '1.2rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              minHeight: isMobile ? '56px' : '60px',
              width: '100%',
              maxWidth: isMobile ? '100%' : '300px',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <span style={{ fontSize: '1.3em' }}>👥</span>
            <span>Take Turns</span>
          </button>

          <button 
            onClick={() => {
              setGameMode('show-ai-submenu');
              soundManager.playClickSound();
            }}
            onMouseEnter={(e) => {
              if (!isMobile) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobile) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
              }
            }}
            style={{
              background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
              color: 'white',
              border: '3px solid #FFC30B',
              borderRadius: isMobile ? '16px' : '20px',
              padding: isMobile ? '1.25rem 1.5rem' : '1rem 2rem',
              fontSize: isMobile ? '1.1rem' : '1.2rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              minHeight: isMobile ? '56px' : '60px',
              width: '100%',
              maxWidth: isMobile ? '100%' : '300px',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <span style={{ fontSize: '1.3em' }}>🤖</span>
            <span>AI Game</span>
          </button>

          <button 
            onClick={() => {
              setGameMode('online-lobby');
              soundManager.playClickSound();
            }}
            onMouseEnter={(e) => {
              if (!isMobile) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobile) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
              }
            }}
            style={{
              background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
              color: 'white',
              border: '3px solid #FFC30B',
              borderRadius: isMobile ? '16px' : '20px',
              padding: isMobile ? '1.25rem 1.5rem' : '1rem 2rem',
              fontSize: isMobile ? '1.1rem' : '1.2rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              minHeight: isMobile ? '56px' : '60px',
              width: '100%',
              maxWidth: isMobile ? '100%' : '300px',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <span style={{ fontSize: '1.3em' }}>🌐</span>
            <span>Online Multiplayer</span>
          </button>
        </div>

        {/* Footer */}
        <footer style={{ 
          marginTop: isMobile ? '1rem' : 'clamp(1rem, 3vw, 2rem)',
          color: 'rgba(255,255,255,0.7)',
          fontSize: isMobile ? '0.8rem' : 'clamp(0.7rem, 2vw, 0.8rem)',
          textAlign: 'center',
          zIndex: 1,
          padding: isMobile ? '0 1rem 0.5rem' : '0'
        }}>
          <p style={{ margin: 0 }}>
            🐝 &copy; 2025 Bee-Five. Product of MindGrind 🐝
          </p>
        </footer>
      </div>

      {/* Competition Modal - Fresh tournament implementation */}
      {showCompetitionModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          padding: isMobile ? '1rem' : '2rem'
        }}>
          <div style={{
            backgroundColor: '#FFC30B',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: isMobile ? '16px' : '20px',
            border: '4px solid black',
            textAlign: 'center',
            width: '100%',
            maxWidth: isMobile ? '100%' : '500px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            position: 'relative'
          }}>
            <h2 style={{
              fontSize: isMobile ? '1.5em' : '2em',
              color: 'black',
              marginBottom: isMobile ? '1.5rem' : '2rem',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}>
              ⚔️ Battle Setup ⚔️
            </h2>
            
            <div style={{ marginBottom: isMobile ? '1.5rem' : '2rem' }}>
              <label style={{
                display: 'block',
                fontSize: isMobile ? '0.9rem' : '1rem',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: isMobile ? '0.75rem' : '1rem'
              }}>
                Competition Length:
              </label>
              <div style={{
                display: 'flex',
                gap: isMobile ? '0.75rem' : '1rem',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => setCompetitionLength(5)}
                  style={{
                    padding: isMobile ? '0.75rem 1rem' : '0.5rem 1rem',
                    fontSize: isMobile ? '1rem' : '1rem',
                    backgroundColor: competitionLength === 5 ? '#4CAF50' : '#f0f0f0',
                    color: competitionLength === 5 ? 'white' : '#333',
                    border: '2px solid #333',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease'
                  }}
                >
                  5 Games
                </button>
                <button
                  onClick={() => setCompetitionLength(7)}
                  style={{
                    padding: isMobile ? '0.75rem 1rem' : '0.5rem 1rem',
                    fontSize: isMobile ? '1rem' : '1rem',
                    backgroundColor: competitionLength === 7 ? '#4CAF50' : '#f0f0f0',
                    color: competitionLength === 7 ? 'white' : '#333',
                    border: '2px solid #333',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease'
                  }}
                >
                  7 Games
                </button>
              </div>
            </div>
            
            <div style={{ marginBottom: isMobile ? '1rem' : '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: isMobile ? '0.9rem' : '1rem',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '0.5rem',
                textAlign: 'left'
              }}>
                Competitor 1 Name:
              </label>
              <input
                type="text"
                value={competitor1Name}
                onChange={(e) => setCompetitor1Name(e.target.value)}
                placeholder="Enter Competitor 1 name"
                style={{
                  width: '100%',
                  padding: isMobile ? '0.75rem' : '1rem',
                  fontSize: isMobile ? '1rem' : '1.1rem',
                  border: '2px solid black',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: '#333',
                  boxSizing: 'border-box',
                  marginBottom: isMobile ? '0.75rem' : '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: isMobile ? '1.5rem' : '2rem' }}>
              <label style={{
                display: 'block',
                fontSize: isMobile ? '0.9rem' : '1rem',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '0.5rem',
                textAlign: 'left'
              }}>
                Competitor 2 Name:
              </label>
              <input
                type="text"
                value={competitor2Name}
                onChange={(e) => setCompetitor2Name(e.target.value)}
                placeholder="Enter Competitor 2 name"
                style={{
                  width: '100%',
                  padding: isMobile ? '0.75rem' : '1rem',
                  fontSize: isMobile ? '1rem' : '1.1rem',
                  border: '2px solid black',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: '#333',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ 
              display: 'flex',
              gap: isMobile ? '0.75rem' : '1rem',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => {
                  setShowCompetitionModal(false);
                  setCompetitionGamesPlayed(0);
                  setCompetitionScores({ player1: 0, player2: 0 });
                  setGameMode('competition');
                  try {
                    soundManager.playClickSound();
                  } catch (error) {
                    console.warn('Sound error:', error);
                  }
                }}
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
                Start Competition
              </button>
              
              <button
                onClick={() => {
                  setShowCompetitionModal(false);
                  soundManager.playClickSound();
                }}
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
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Difficulty Modal */}
      {showDifficultyModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          padding: isMobile ? '1rem' : '2rem'
        }}>
          <div style={{
            backgroundColor: '#FFC30B',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: isMobile ? '16px' : '20px',
            border: '4px solid black',
            textAlign: 'center',
            width: '100%',
            maxWidth: isMobile ? '100%' : '500px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            position: 'relative'
          }}>
            <h2 style={{
              fontSize: isMobile ? '1.3em' : '1.5em',
              color: 'black',
              marginBottom: isMobile ? '0.5rem' : '0.75rem',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}>
              🤖 Select Difficulty 🤖
            </h2>
            
            <p style={{
              fontSize: isMobile ? '0.9em' : '0.95em',
              color: '#333',
              marginBottom: isMobile ? '1rem' : '1.25rem'
            }}>
              Choose the AI difficulty level:
            </p>
            
            <div style={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? '0.5rem' : '0.6rem',
              marginBottom: isMobile ? '1rem' : '1.25rem'
            }}>
              <button
                onClick={() => {
                  setAiDifficulty('easy');
                  setShowDifficultyModal(false);
                  setGameMode('ai-game');
                  soundManager.playClickSound();
                }}
                style={{
                  padding: isMobile ? '0.75rem 1rem' : '0.6rem 1.25rem',
                  fontSize: isMobile ? '0.95rem' : '0.9em',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: '2px solid black',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  minHeight: isMobile ? '48px' : 'auto',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  width: '100%'
                }}
              >
                🟢 Easy
              </button>

              <button
                onClick={() => {
                  setAiDifficulty('medium');
                  setShowDifficultyModal(false);
                  setGameMode('ai-game');
                  soundManager.playClickSound();
                }}
                style={{
                  padding: isMobile ? '0.75rem 1rem' : '0.6rem 1.25rem',
                  fontSize: isMobile ? '0.95rem' : '0.9em',
                  backgroundColor: '#FF9800',
                  color: 'white',
                  border: '2px solid black',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  minHeight: isMobile ? '48px' : 'auto',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  width: '100%'
                }}
              >
                🟠 Medium
              </button>

              <button
                onClick={() => {
                  setAiDifficulty('hard');
                  setShowDifficultyModal(false);
                  setGameMode('ai-game');
                  soundManager.playClickSound();
                }}
                style={{
                  padding: isMobile ? '0.75rem 1rem' : '0.6rem 1.25rem',
                  fontSize: isMobile ? '0.95rem' : '0.9em',
                  backgroundColor: '#F44336',
                  color: 'white',
                  border: '2px solid black',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  minHeight: isMobile ? '48px' : 'auto',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  width: '100%'
                }}
              >
                🔴 Hard
              </button>
            </div>

            <button
              onClick={() => {
                setShowDifficultyModal(false);
                soundManager.playClickSound();
              }}
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
                width: '100%'
              }}
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}