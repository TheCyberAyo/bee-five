"use client";

import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { soundManager } from '../utils/sounds';
import LiveMatchesFlow from './live-matches/LiveMatchesFlow';
import ChallengeDialog from './live-matches/ChallengeDialog';
import SimpleGame from './SimpleGame';
import ClassicAIGame from './ClassicAIGame';
import AboutUs from './AboutUs';
import HowToPlay from './HowToPlay';
import NewsUpdates from './NewsUpdates';
import PrivacyPolicy from './PrivacyPolicy';
import Settings from './Settings';
import ContactUs from './ContactUs';
import Dashboard from './Dashboard';
import SidebarMenu from './SidebarMenu';
import MobileHeader from './MobileHeader';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './Auth/AuthModal';
import { useGlobalLobbySession } from '../hooks/useGlobalLobbySession';
import AdventureGame from './AdventureGame';
import AdventureBoardPreview, { adventurePlayButtonStyle, homeBoardMaxWidth } from './AdventureBoardPreview';
import { loadSessionAdventureProgress, syncAdventureProgress } from '../services/progressService';
import { getXp, onAppOpen } from '../services/xpService';

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
  background: 'rgba(67, 160, 71, 0.3)',
  color: '#000000',
  border: '1px solid #FFC30B',
  borderRadius: '20px',
  padding: '1rem 1.25rem',
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
  whiteSpace: 'nowrap',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
};

/** Equal-width menu buttons sized to the longest label */
const homeMenuListStyle: React.CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  width: 'max-content',
  maxWidth: '100%',
};

export default function SimpleWelcome() {
  const [gameMode, setGameMode] = useState<'menu' | 'adventure-game' | 'local-multiplayer' | 'live-matches' | 'classic-game' | 'about-us' | 'how-to-play' | 'news-updates' | 'privacy-policy' | 'settings' | 'dashboard' | 'contact-us'>('menu');
  const [currentGame, setCurrentGame] = useState(1);
  const [highestUnlockedGame, setHighestUnlockedGame] = useState(1);
  const [gamesCompleted, setGamesCompleted] = useState<number[]>([]);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [showNoXpModal, setShowNoXpModal] = useState(false);
  const boardSlotRef = useRef<HTMLDivElement>(null);
  const [homeBoardSize, setHomeBoardSize] = useState(320);
  const [isMobile, setIsMobile] = useState(false);
  const [lobbyMatchLaunch, setLobbyMatchLaunch] = useState<{
    matchId: string;
    opponentId: string;
    opponentUsername: string;
  } | null>(null);
  const [globalToast, setGlobalToast] = useState<string | null>(null);
  
  // Auth state
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const routeGlobalChallenges = gameMode !== 'live-matches' && gameMode !== 'adventure-game';

  useEffect(() => {
    onAppOpen();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    void syncAdventureProgress(user.id).catch((error) => {
      console.warn('Failed to refresh synced progress on home', error);
    });
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    const loadProgress = async () => {
      try {
        const progress = await loadSessionAdventureProgress(user?.id ?? null);
        if (cancelled) return;
        if (progress) {
          const loadedCurrent = progress.current_game || 1;
          const loadedHighest = Math.max(1, progress.highest_unlocked_game || 1, loadedCurrent);
          setCurrentGame(loadedCurrent);
          setHighestUnlockedGame(loadedHighest);
          setGamesCompleted(progress.games_completed || []);
        }
      } catch (error) {
        console.error('Failed to load adventure progress:', error);
      } finally {
        if (!cancelled) setProgressLoaded(true);
      }
    };
    void loadProgress();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const tryStartAdventure = useCallback((start: () => void) => {
    if (getXp() <= 0) {
      setShowNoXpModal(true);
      return;
    }
    start();
  }, []);

  useLayoutEffect(() => {
    if (gameMode !== 'menu') return;
    const el = boardSlotRef.current;
    if (!el) return;

    const updateBoardSize = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const cap = homeBoardMaxWidth(isMobile);
      setHomeBoardSize(Math.floor(Math.min(width, height, cap)));
    };

    updateBoardSize();
    const ro = new ResizeObserver(updateBoardSize);
    ro.observe(el);
    window.addEventListener('resize', updateBoardSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateBoardSize);
    };
  }, [isMobile, progressLoaded, gameMode]);

  const handleGlobalOpenMatch = useCallback(
    (match: { matchId: string; opponentId: string; opponentUsername: string }) => {
      setLobbyMatchLaunch(match);
      setGameMode('live-matches');
    },
    [],
  );

  const {
    incomingChallenge,
    acceptIncomingChallenge,
    declineIncomingChallenge,
    acceptBlockedReason,
    restoreIdleAfterMatch,
    onLeftSchoolLobby,
  } = useGlobalLobbySession({
    user,
    routeChallenges: routeGlobalChallenges,
    manageLobbyPresence: gameMode !== 'live-matches' && gameMode !== 'adventure-game',
    onOpenMatch: handleGlobalOpenMatch,
    onToast: setGlobalToast,
  });

  useEffect(() => {
    if (!globalToast) return;
    const t = setTimeout(() => setGlobalToast(null), 3500);
    return () => clearTimeout(t);
  }, [globalToast]);

  // Initialize mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const globalLobbyOverlays = (
    <>
      {routeGlobalChallenges && incomingChallenge && (
        <ChallengeDialog
          fromUsername={incomingChallenge.from_username?.toString() ?? 'Player'}
          fromElo={parseInt(String(incomingChallenge.from_elo ?? 1200), 10) || 1200}
          acceptBlockedReason={acceptBlockedReason}
          onAccept={() => void acceptIncomingChallenge()}
          onDecline={() => void declineIncomingChallenge()}
        />
      )}
      {globalToast && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#000',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: '8px',
            zIndex: 900,
            maxWidth: '90vw',
          }}
        >
          {globalToast}
        </div>
      )}
    </>
  );

  if (gameMode === 'adventure-game') {
    return (
      <>
        <AdventureGame
          initialGame={currentGame}
          autoStart
          onBackToMenu={async () => {
            try {
              const progress = await loadSessionAdventureProgress(user?.id ?? null);
              if (progress) {
                const loadedCurrent = progress.current_game || 1;
                const loadedHighest = Math.max(1, progress.highest_unlocked_game || 1, loadedCurrent);
                setCurrentGame(loadedCurrent);
                setHighestUnlockedGame(loadedHighest);
                setGamesCompleted(progress.games_completed || []);
              }
            } catch (error) {
              console.error('Failed to reload adventure progress:', error);
            }
            setGameMode('menu');
          }}
          onGameChange={(gameNumber) => {
            setCurrentGame(gameNumber);
            setHighestUnlockedGame((prev) => Math.max(1, prev, gameNumber));
          }}
        />
        {globalLobbyOverlays}
      </>
    );
  }

  // Handle local multiplayer mode
  if (gameMode === 'local-multiplayer') {
    return (
      <>
        <SimpleGame onBackToMenu={() => setGameMode('menu')} />
        {globalLobbyOverlays}
      </>
    );
  }

  // Handle Classic Mode (streak session)
  if (gameMode === 'classic-game') {
    return (
      <>
        <ClassicAIGame onBackToMenu={() => setGameMode('menu')} />
        {globalLobbyOverlays}
      </>
    );
  }

  // Handle Live Matches (school lobby)
  if (gameMode === 'live-matches') {
    return (
      <>
        <LiveMatchesFlow
          onBackToMenu={() => setGameMode('menu')}
          initialActiveMatch={lobbyMatchLaunch}
          onInitialMatchConsumed={() => setLobbyMatchLaunch(null)}
          onRestoreGlobalLobby={() => void restoreIdleAfterMatch()}
        />
        {globalLobbyOverlays}
      </>
    );
  }

  // Handle About Us page
  if (gameMode === 'about-us') {
    return (
      <>
        <AboutUs onBackToMenu={() => setGameMode('menu')} isMobile={isMobile} />
        {globalLobbyOverlays}
      </>
    );
  }

  // Handle How to Play page
  if (gameMode === 'how-to-play') {
    return (
      <>
        <HowToPlay onBackToMenu={() => setGameMode('menu')} isMobile={isMobile} />
        {globalLobbyOverlays}
      </>
    );
  }

  // Handle News/Updates page
  if (gameMode === 'news-updates') {
    return (
      <>
        <NewsUpdates onBackToMenu={() => setGameMode('menu')} isMobile={isMobile} />
        {globalLobbyOverlays}
      </>
    );
  }

  // Handle Privacy Policy page
  if (gameMode === 'privacy-policy') {
    return (
      <>
        <PrivacyPolicy onBackToMenu={() => setGameMode('menu')} isMobile={isMobile} />
        {globalLobbyOverlays}
      </>
    );
  }

  // Handle Settings page
  if (gameMode === 'settings') {
    return (
      <>
        <Settings
          onBackToMenu={() => setGameMode('menu')}
          isMobile={isMobile}
          onLeftSchoolLobby={onLeftSchoolLobby}
        />
        {globalLobbyOverlays}
      </>
    );
  }

  // Handle Contact Us page
  if (gameMode === 'contact-us') {
    return (
      <>
        <ContactUs onBackToMenu={() => setGameMode('menu')} isMobile={isMobile} />
        {globalLobbyOverlays}
      </>
    );
  }

  // Handle Dashboard page (Dart DashboardPage parity)
  if (gameMode === 'dashboard') {
    return (
      <>
        <Dashboard onBackToMenu={() => setGameMode('menu')} isMobile={isMobile} />
        {globalLobbyOverlays}
      </>
    );
  }


  // Main menu — original yellow card with blurred board background + overlaid menu
  return (
    <div style={{
      background: '#000000',
      height: isMobile ? '100dvh' : '100vh',
      maxHeight: isMobile ? '100dvh' : '100vh',
      width: '100%',
      maxWidth: '100vw',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'center',
      alignItems: isMobile ? 'stretch' : 'center',
      padding: isMobile ? 'calc(49px + env(safe-area-inset-top, 0px)) 0 8px 0' : 'clamp(1rem, 2vw, 2rem)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box',
      gap: isMobile ? '0' : '1.5rem',
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
          zIndex: 0,
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
        padding: isMobile ? '0.75rem 1rem' : 'clamp(1rem, 2vw, 1.5rem)',
        width: isMobile ? '100%' : 'auto',
        maxWidth: isMobile ? '100%' : 'none',
        flex: isMobile ? '1 1 auto' : '1 1 auto',
        minHeight: 0,
        height: isMobile ? '100%' : '90vh',
        maxHeight: isMobile ? '100%' : '90vh',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3), 0 0 0 3px rgba(0,0,0,0.2)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        margin: isMobile ? '0 0.5rem' : '0 auto',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        gap: isMobile ? '0.35rem' : '0.5rem',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'relative', zIndex: 2, flexShrink: 0 }}>
          <h1 style={{
            fontSize: isMobile ? '1.85rem' : '2.5rem',
            color: '#000000',
            margin: '0 0 0.15rem 0',
            lineHeight: '1.15',
            fontWeight: 900,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            BEE FIVE
          </h1>
          <p style={{
            fontSize: isMobile ? '0.85rem' : '1.125rem',
            margin: 0,
            fontWeight: 600,
            lineHeight: 1.3,
          }}>
            <span style={{ color: '#C62828' }}>Outthink</span>
            <span style={{ color: 'rgba(0, 0, 0, 0.87)' }}> ● </span>
            <span style={{ color: '#C2410C' }}>Connect 5</span>
            <span style={{ color: 'rgba(0, 0, 0, 0.87)' }}> ● </span>
            <span style={{ color: '#4CAF50' }}>Win</span>
          </p>
        </div>

        {/* Board flexes to fill space between tagline and play button */}
        <div
          ref={boardSlotRef}
          style={{
            position: 'relative',
            flex: 1,
            minHeight: 0,
            width: '100%',
            background: 'transparent',
          }}
        >
          {progressLoaded ? (
            <AdventureBoardPreview
              gameNumber={currentGame}
              isMobile={isMobile}
              variant="background"
              size={homeBoardSize}
            />
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#000',
              fontWeight: 'bold',
            }}>
              🐝 Loading…
            </div>
          )}

          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? '0.5rem' : 'clamp(0.5rem, 1.5vw, 0.75rem)',
            padding: isMobile ? '0.35rem 0.5rem' : '0.75rem 1rem',
            zIndex: 2,
          }}>
            <div style={{
              ...homeMenuListStyle,
              gap: isMobile ? '0.5rem' : 'clamp(0.5rem, 1.5vw, 0.75rem)',
            }}>
            <button
              type="button"
              onClick={() => { setGameMode('live-matches'); soundManager.playClickSound(); }}
              onMouseEnter={(e) => { if (!isMobile) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'; } }}
              onMouseLeave={(e) => { if (!isMobile) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'; } }}
              style={{
                ...homeMenuButtonStyle,
                borderRadius: isMobile ? '14px' : '20px',
                padding: isMobile ? '0.65rem 1rem' : '1rem 1.25rem',
                fontSize: isMobile ? '0.95rem' : '1.2rem',
                minHeight: isMobile ? '44px' : '60px',
              }}
            >
              <span>Live Matches</span>
            </button>

            <button
              type="button"
              onClick={() => { soundManager.playClickSound(); setGameMode('local-multiplayer'); }}
              onMouseEnter={(e) => { if (!isMobile) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'; } }}
              onMouseLeave={(e) => { if (!isMobile) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'; } }}
              style={{
                ...homeMenuButtonStyle,
                borderRadius: isMobile ? '14px' : '20px',
                padding: isMobile ? '0.65rem 1rem' : '1rem 1.25rem',
                fontSize: isMobile ? '0.95rem' : '1.2rem',
                minHeight: isMobile ? '44px' : '60px',
              }}
            >
              <img src={HOME_ICONS.localChallenge} alt="" style={modeIconStyle} />
              <span>Local Challenge</span>
            </button>

            <button
              type="button"
              onClick={() => { setGameMode('classic-game'); soundManager.playClickSound(); }}
              onMouseEnter={(e) => { if (!isMobile) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'; } }}
              onMouseLeave={(e) => { if (!isMobile) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'; } }}
              style={{
                ...homeMenuButtonStyle,
                borderRadius: isMobile ? '14px' : '20px',
                padding: isMobile ? '0.65rem 1rem' : '1rem 1.25rem',
                fontSize: isMobile ? '0.95rem' : '1.2rem',
                minHeight: isMobile ? '44px' : '60px',
              }}
            >
              <img src={HOME_ICONS.classicMode} alt="" style={modeIconStyle} />
              <span>Classic Mode</span>
            </button>

            {!user && (
              <button
                type="button"
                onClick={() => { setShowAuthModal(true); soundManager.playClickSound(); }}
                style={{
                  background: 'rgba(75, 85, 99, 0.3)',
                  color: '#000000',
                  border: '1px solid #FFC30B',
                  borderRadius: isMobile ? '12px' : '16px',
                  padding: isMobile ? '0.65rem 1rem' : '0.75rem 1.25rem',
                  fontSize: isMobile ? '0.95rem' : '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  width: '100%',
                  minHeight: isMobile ? '44px' : '60px',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  touchAction: 'manipulation',
                }}
              >
                🔐 Sign In / Sign Up
              </button>
            )}
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          flexShrink: 0,
          paddingTop: isMobile ? '0.15rem' : '0.25rem',
        }}>
          <button
            type="button"
            disabled={currentGame > highestUnlockedGame && currentGame > 1}
            onClick={() => {
              soundManager.playClickSound();
              tryStartAdventure(() => setGameMode('adventure-game'));
            }}
            style={{
              ...adventurePlayButtonStyle,
              padding: isMobile ? '10px 20px' : '12px 24px',
              fontSize: isMobile ? '16px' : '18px',
              opacity: currentGame > highestUnlockedGame && currentGame > 1 ? 0.5 : 1,
              cursor: currentGame > highestUnlockedGame && currentGame > 1 ? 'not-allowed' : 'pointer',
            }}
          >
            <span style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 'bold' }}>▶</span>
            <span>Level {currentGame}</span>
          </button>
        </div>

        <footer style={{
          marginTop: 0,
          color: 'rgba(0,0,0,0.7)',
          fontSize: isMobile ? '0.7rem' : 'clamp(0.7rem, 2vw, 0.8rem)',
          textAlign: 'center',
          zIndex: 2,
          position: 'relative',
          padding: isMobile ? '0.25rem 0.5rem 0' : '0',
          flexShrink: 0,
        }}>
          <p style={{ margin: 0 }}>&copy; 2026 Bee Five. Product of MindGrind</p>
        </footer>
      </div>

      {showNoXpModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
        }}>
          <div style={{
            backgroundColor: '#FFC30B',
            padding: '30px',
            borderRadius: '20px',
            border: '4px solid black',
            textAlign: 'center',
            maxWidth: '90vw',
            minWidth: '280px',
          }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '24px', color: '#000' }}>No XP</h2>
            <p style={{ margin: '0 0 24px', fontSize: '16px', color: 'rgba(0,0,0,0.87)' }}>
              You have zero XPs. Win Practice hard game, or win 3 games in Classic mode to gain XPs.
            </p>
            <button
              type="button"
              onClick={() => setShowNoXpModal(false)}
              style={{
                padding: '10px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor: '#4CAF50',
                color: '#fff',
                border: '2px solid #000',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            setProgressLoaded(false);
          }}
        />
      )}

      {globalLobbyOverlays}
    </div>
  );
}