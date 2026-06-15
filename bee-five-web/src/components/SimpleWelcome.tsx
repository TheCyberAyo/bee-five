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
import AboutUs from './AboutUs';
import HowToPlay from './HowToPlay';
import NewsUpdates from './NewsUpdates';
import PrivacyPolicy from './PrivacyPolicy';
import Settings from './Settings';
import ContactUs from './ContactUs';
import Profile from './Profile';
import SidebarMenu from './SidebarMenu';
import MobileHeader from './MobileHeader';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './Auth/AuthModal';

const HOME_ICONS = {
  localChallenge: '/homeImagery/play-with-friend.png',
  classicMode: '/homeImagery/classic-mode.png',
} as const;

const modeIconStyle: React.CSSProperties = {
  width: '1.75rem',
  height: '1.75rem',
  objectFit: 'contain',
  flexShrink: 0,
};

const homeMenuButtonStyle: React.CSSProperties = {
  background: '#43A047',
  color: 'white',
  border: '3px solid #000000',
  borderRadius: '20px',
  padding: '1rem 2rem',
  fontSize: '1.2rem',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  minHeight: '60px',
  width: '100%',
  maxWidth: '300px',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
};

export default function SimpleWelcome() {
  const [gameMode, setGameMode] = useState<'menu' | 'local-multiplayer' | 'online-lobby' | 'online-game' | 'ai-game' | 'adventure-game' | 'show-ai-submenu' | 'about-us' | 'how-to-play' | 'news-updates' | 'privacy-policy' | 'settings' | 'profile' | 'contact-us'>('menu');
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
  const [playerNumber, setPlayerNumber] = useState<1 | 2>(1);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [aiTimer, setAiTimer] = useState<number>(15);
  const [isMobile, setIsMobile] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState<'yellow' | 'black'>('yellow');
  const [isMounted, setIsMounted] = useState(false);
  
  // Auth state
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Initialize mobile detection and mount state
  useEffect(() => {
    setIsMounted(true);
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

  // Handle Contact Us page
  if (gameMode === 'contact-us') {
    return <ContactUs onBackToMenu={() => setGameMode('menu')} isMobile={isMobile} />;
  }

  // Handle Profile page
  if (gameMode === 'profile') {
    return <Profile onBackToMenu={() => setGameMode('menu')} isMobile={isMobile} />;
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
              WebkitTextStroke: isMobile ? '0.5px black' : 'initial',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              <img src={HOME_ICONS.classicMode} alt="" style={{ ...modeIconStyle, width: '2rem', height: '2rem' }} />
              Classic Mode
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
                background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
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
              <img src={HOME_ICONS.classicMode} alt="" style={modeIconStyle} />
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
                background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
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
            &copy; 2025 Bee Five. Product of MindGrind
          </p>
        </footer>

        {/* Difficulty Modal - rendered within AI submenu */}
        {showDifficultyModal && isMounted && typeof document !== 'undefined' && createPortal(
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
                    backgroundColor: '#6b7280',
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
                    backgroundColor: '#6b7280',
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
                    backgroundColor: '#6b7280',
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
        {showTimerModal && isMounted && typeof document !== 'undefined' && createPortal(
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
                    backgroundColor: '#6b7280',
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
                    backgroundColor: '#6b7280',
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
      background: '#000000',
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
      <MobileHeader onMenuItemClick={setGameMode} isMobile={isMobile} />
      <SidebarMenu onMenuItemClick={setGameMode} isMobile={isMobile} />

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
          {['🍯', '🍯', '🍯', '🍯', '🍯', '🍯', '🍯', '🍯', '🍯'].map((emoji, i) => (
            <div key={i} style={{ textAlign: 'center', transform: `rotate(${i * 15}deg)` }}>
              {emoji}
            </div>
          ))}
        </div>
      )}

      <div style={{
        background: '#FFC30B',
        borderRadius: isMobile ? '20px' : 'clamp(15px, 3vw, 25px)',
        padding: isMobile ? '1.5rem 1rem' : 'clamp(1.5rem, 3vw, 2rem)',
        width: isMobile ? '90vw' : 'auto',
        maxWidth: isMobile ? '90vw' : 'none',
        flex: isMobile ? 'none' : '1 1 auto',
        minHeight: isMobile ? 'calc(100vh - 140px)' : '90vh',
        maxHeight: isMobile ? 'calc(100vh - 140px)' : '90vh',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3), 0 0 0 3px rgba(0,0,0,0.2)',
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
        <div style={{ marginBottom: isMobile ? '1.5rem' : 'clamp(1.5rem, 3vw, 2rem)' }}>
          <h1 style={{
            fontSize: isMobile ? '2.25rem' : '2.5rem',
            color: '#000000',
            margin: '0 0 0.25rem 0',
            lineHeight: '1.2',
            fontWeight: 900,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            BEE FIVE
          </h1>
          <p style={{
            fontSize: isMobile ? '0.95rem' : '1.125rem',
            margin: '0 0 clamp(1rem, 3vw, 1.5rem) 0',
            fontWeight: 600,
            lineHeight: 1.4
          }}>
            <span style={{ color: '#FF9800' }}>Outthink</span>
            <span style={{ color: 'rgba(0, 0, 0, 0.87)' }}> ● </span>
            <span style={{ color: '#E53935' }}>Connect 5</span>
            <span style={{ color: 'rgba(0, 0, 0, 0.87)' }}> ● </span>
            <span style={{ color: '#4CAF50' }}>Win</span>
          </p>
        </div>

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
            onClick={() => { setGameMode('online-lobby'); soundManager.playClickSound(); }}
            onMouseEnter={(e) => { if (!isMobile) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'; } }}
            onMouseLeave={(e) => { if (!isMobile) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'; } }}
            style={{
              ...homeMenuButtonStyle,
              borderRadius: isMobile ? '16px' : '20px',
              padding: isMobile ? '1.25rem 1.5rem' : '1rem 2rem',
              fontSize: isMobile ? '1.1rem' : '1.2rem',
              minHeight: isMobile ? '56px' : '60px',
              maxWidth: isMobile ? '100%' : '300px',
            }}
          >
            <span style={{ fontSize: '1.3em' }}>🌐</span>
            <span>Live Matches</span>
          </button>

          <button
            onClick={() => { soundManager.playClickSound(); setGameMode('local-multiplayer'); }}
            onMouseEnter={(e) => { if (!isMobile) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'; } }}
            onMouseLeave={(e) => { if (!isMobile) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'; } }}
            style={{
              ...homeMenuButtonStyle,
              borderRadius: isMobile ? '16px' : '20px',
              padding: isMobile ? '1.25rem 1.5rem' : '1rem 2rem',
              fontSize: isMobile ? '1.1rem' : '1.2rem',
              minHeight: isMobile ? '56px' : '60px',
              maxWidth: isMobile ? '100%' : '300px',
            }}
          >
            <img src={HOME_ICONS.localChallenge} alt="" style={modeIconStyle} />
            <span>Local Challenge</span>
          </button>

          <button
            onClick={() => { setGameMode('show-ai-submenu'); soundManager.playClickSound(); }}
            onMouseEnter={(e) => { if (!isMobile) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'; } }}
            onMouseLeave={(e) => { if (!isMobile) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'; } }}
            style={{
              ...homeMenuButtonStyle,
              borderRadius: isMobile ? '16px' : '20px',
              padding: isMobile ? '1.25rem 1.5rem' : '1rem 2rem',
              fontSize: isMobile ? '1.1rem' : '1.2rem',
              minHeight: isMobile ? '56px' : '60px',
              maxWidth: isMobile ? '100%' : '300px',
            }}
          >
            <img src={HOME_ICONS.classicMode} alt="" style={modeIconStyle} />
            <span>Classic Mode</span>
          </button>

          {!user && (
            <div style={{
              marginTop: isMobile ? '1rem' : '1.5rem',
              paddingTop: isMobile ? '1rem' : '1.5rem',
              borderTop: '2px solid rgba(255, 195, 11, 0.3)',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              alignItems: 'center'
            }}>
              <button
                onClick={() => { setShowAuthModal(true); soundManager.playClickSound(); }}
                style={{
                  background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                  color: '#fff',
                  border: '2px solid #000',
                  borderRadius: isMobile ? '12px' : '16px',
                  padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
                  fontSize: isMobile ? '0.95rem' : '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  width: '100%',
                  maxWidth: isMobile ? '100%' : '250px',
                  touchAction: 'manipulation'
                }}
              >
                🔐 Sign In / Sign Up
              </button>
            </div>
          )}
        </div>

        <footer style={{
          marginTop: isMobile ? '1rem' : 'clamp(1rem, 3vw, 2rem)',
          color: 'rgba(0,0,0,0.7)',
          fontSize: isMobile ? '0.8rem' : 'clamp(0.7rem, 2vw, 0.8rem)',
          textAlign: 'center',
          zIndex: 1,
          padding: isMobile ? '0 1rem 0.5rem' : '0'
        }}>
          <p style={{ margin: 0 }}>&copy; 2025 Bee Five. Product of MindGrind</p>
        </footer>
      </div>

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => { setShowAuthModal(false); setGameMode('menu'); }}
        />
      )}


      {/* Difficulty Modal */}
      {showDifficultyModal && isMounted && typeof document !== 'undefined' && createPortal(
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
                  backgroundColor: '#6b7280',
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
                  backgroundColor: '#6b7280',
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
                  backgroundColor: '#6b7280',
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