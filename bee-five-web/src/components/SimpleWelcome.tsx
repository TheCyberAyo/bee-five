"use client";

import React, { useState, useEffect } from 'react';
import { soundManager } from '../utils/sounds';
import { type RoomInfo } from '../utils/p2pMultiplayer';
import { MultiplayerLobby } from './MultiplayerLobby';
import { MultiplayerGame } from './MultiplayerGame';
import SimpleGame from './SimpleGame';
import ClassicAIGame from './ClassicAIGame';
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
  const [gameMode, setGameMode] = useState<'menu' | 'local-multiplayer' | 'online-lobby' | 'online-game' | 'classic-game' | 'about-us' | 'how-to-play' | 'news-updates' | 'privacy-policy' | 'settings' | 'profile' | 'contact-us'>('menu');
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
  const [playerNumber, setPlayerNumber] = useState<1 | 2>(1);
  const [isMobile, setIsMobile] = useState(false);
  
  // Auth state
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

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
    return <SimpleGame onBackToMenu={() => setGameMode('menu')} />;
  }

  // Handle Classic Mode (streak session)
  if (gameMode === 'classic-game') {
    return <ClassicAIGame onBackToMenu={() => setGameMode('menu')} />;
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
    return <Settings onBackToMenu={() => setGameMode('menu')} isMobile={isMobile} />;
  }

  // Handle Contact Us page
  if (gameMode === 'contact-us') {
    return <ContactUs onBackToMenu={() => setGameMode('menu')} isMobile={isMobile} />;
  }

  // Handle Profile page
  if (gameMode === 'profile') {
    return <Profile onBackToMenu={() => setGameMode('menu')} isMobile={isMobile} />;
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
            onClick={() => { setGameMode('classic-game'); soundManager.playClickSound(); }}
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
    </div>
  );
}