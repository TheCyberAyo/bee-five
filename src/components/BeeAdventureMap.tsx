"use client";

import React, { useState } from 'react';
import { soundManager } from '../utils/sounds';
import { useTheme, ADVENTURE_THEMES } from '../hooks/useTheme';
import BeeLifeStageEffects from './BeeLifeStageEffects';

interface BeeAdventureMapProps {
  currentGame: number;
  gamesCompleted: number[];
  highestUnlockedGame: number;
  onGameSelect: (gameNumber: number) => void;
  onBackToMenu: () => void;
}

const BeeAdventureMap: React.FC<BeeAdventureMapProps> = ({ 
  currentGame, 
  gamesCompleted,
  highestUnlockedGame,
  onGameSelect, 
  onBackToMenu 
}) => {
  // CSS animations for the map
  const mapStyles = `
    @keyframes beeFlight {
      0%, 100% { transform: translateX(0px) translateY(0px) rotate(0deg); }
      25% { transform: translateX(20px) translateY(-10px) rotate(5deg); }
      50% { transform: translateX(10px) translateY(-20px) rotate(-3deg); }
      75% { transform: translateX(-15px) translateY(-5px) rotate(8deg); }
    }
    
    @keyframes beehiveGlow {
      0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.8; }
      50% { transform: scale(1.1) rotate(2deg); opacity: 1; }
    }
    
    @keyframes stageDecorationFloat {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      33% { transform: translateY(-10px) rotate(2deg); }
      66% { transform: translateY(5px) rotate(-1deg); }
    }
    
    @keyframes particleFloat {
      0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
      50% { transform: translateY(-15px) rotate(5deg); opacity: 0.6; }
    }
    
    @keyframes mapFloat {
      0%, 100% { transform: translateZ(0) translateY(0px); }
      50% { transform: translateZ(0) translateY(-5px); }
    }
    
    @keyframes titleGlow {
      0%, 100% { filter: drop-shadow(0 0 4px rgba(255, 195, 11, 0.4)); }
      50% { filter: drop-shadow(0 0 8px rgba(255, 195, 11, 0.8)); }
    }
    
    @keyframes mapIconSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    @keyframes stageCardFloat {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }
    
    @keyframes milestonePulse {
      0%, 100% { transform: scale(1); box-shadow: 0 8px 16px rgba(0,0,0,0.4); }
      50% { transform: scale(1.05); box-shadow: 0 12px 24px rgba(0,0,0,0.6); }
    }
    
    @keyframes currentPulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 12px rgba(255, 195, 11, 0.8); }
      50% { transform: scale(1.2); box-shadow: 0 0 20px rgba(255, 195, 11, 1); }
    }
    
    @keyframes stageNameFloat {
      0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.8; }
      25% { transform: translateY(-8px) rotate(1deg); opacity: 1; }
      50% { transform: translateY(-12px) rotate(-1deg); opacity: 0.9; }
      75% { transform: translateY(-4px) rotate(0.5deg); opacity: 0.95; }
    }
    
    @keyframes decorativeSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    @keyframes stageEmojiPulse {
      0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
      50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
    }
    
    @keyframes grassSway {
      0%, 100% { transform: rotate(-5deg) translateY(0px); }
      25% { transform: rotate(3deg) translateY(-2px); }
      50% { transform: rotate(-2deg) translateY(-4px); }
      75% { transform: rotate(4deg) translateY(-1px); }
    }
    
    @keyframes sugarShimmer {
      0%, 100% { transform: rotate(0deg) scale(1); opacity: 0.6; filter: brightness(1); }
      25% { transform: rotate(90deg) scale(1.1); opacity: 0.8; filter: brightness(1.2); }
      50% { transform: rotate(180deg) scale(0.9); opacity: 0.9; filter: brightness(1.4); }
      75% { transform: rotate(270deg) scale(1.05); opacity: 0.7; filter: brightness(1.1); }
    }
    
    @keyframes honeyDrip {
      0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
      10% { transform: translateY(-10px) rotate(5deg); opacity: 0.8; }
      50% { transform: translateY(10px) rotate(-3deg); opacity: 1; }
      90% { transform: translateY(30px) rotate(2deg); opacity: 0.6; }
      100% { transform: translateY(40px) rotate(0deg); opacity: 0; }
    }
    
    @keyframes flowerDance {
      0%, 100% { transform: rotate(0deg) scale(1); }
      25% { transform: rotate(2deg) scale(1.05); }
      50% { transform: rotate(-1deg) scale(1.1); }
      75% { transform: rotate(3deg) scale(1.02); }
    }
  `;
  const [soundEnabled] = useState(true);
  const [currentStageBasedOnScroll, setCurrentStageBasedOnScroll] = useState(0);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Use theme system
  const { currentTheme } = useTheme({ gameNumber: currentGame });

  // Auto-scroll to current game position when map opens
  React.useEffect(() => {
    if (scrollContainerRef.current) {
      const isMobile = window.innerWidth <= 768;
      const spacing = isMobile ? 140 : 160;
      const gameIndex = currentGame - 1;
      const totalHeight = isMobile ? 280000 : 320000;
      
      // Calculate the Y position of the current game
      const gameY = totalHeight - (gameIndex * spacing);
      
      // Scroll to position the current game in the center of the viewport
      const containerHeight = scrollContainerRef.current.clientHeight;
      const scrollToPosition = Math.max(0, gameY - containerHeight / 2);
      
      // Smooth scroll to the current game position
      scrollContainerRef.current.scrollTo({
        top: scrollToPosition,
        behavior: 'smooth'
      });
    }
  }, [currentGame]);

  // Scroll listener for dynamic color changes
  React.useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const scrollTop = scrollContainerRef.current.scrollTop;
        
        // Calculate current stage based on scroll position
        // Each stage represents 200 games, so we calculate based on scroll percentage
        const totalHeight = scrollContainerRef.current.scrollHeight - scrollContainerRef.current.clientHeight;
        const scrollPercentage = totalHeight > 0 ? scrollTop / totalHeight : 0;
        const stageIndex = Math.min(Math.floor(scrollPercentage * 10), 9);
        setCurrentStageBasedOnScroll(stageIndex);
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);



  // Get stage emoji based on bee life stage
  const getStageEmoji = (stageIndex: number) => {
    const stageEmojis = ['🥚', '🐛', '🍯', '🕸️', '🦋', '🌅', '🏠', '🌻', '🛡️', '👑'];
    return stageEmojis[stageIndex] || '🐝';
  };

  // Get stage-specific imagery and decorations
  const getStageImagery = (stageIndex: number) => {
    const stageImagery = {
      0: { // Egg Stage
        beehive: '🏠',
        decorations: ['🥚', '✨', '🌟'],
        environment: ['🌿', '🌱', '🍃']
      },
      1: { // Larva Stage
        beehive: '🏠',
        decorations: ['🐛', '💫', '⭐'],
        environment: ['🌿', '🌱', '🍃']
      },
      2: { // Feeding Stage
        beehive: '🏰',
        decorations: ['🍯', '👑', '💎'],
        environment: ['🌹', '🌺', '🌸']
      },
      3: { // Cocoon Stage
        beehive: '🕸️',
        decorations: ['🕸️', '✨', '🔮'],
        environment: ['🌙', '⭐', '🌌']
      },
      4: { // Pupa Stage
        beehive: '🦋',
        decorations: ['🦋', '💭', '☁️'],
        environment: ['🌊', '🌌', '✨']
      },
      5: { // Emergence Stage
        beehive: '🌅',
        decorations: ['🌅', '☀️', '🌤️'],
        environment: ['🌅', '☀️', '🌤️']
      },
      6: { // Nurse Bee Stage
        beehive: '🏠',
        decorations: ['🐝', '🏠', '💚'],
        environment: ['🌿', '🌱', '🍃']
      },
      7: { // Forager Stage
        beehive: '🌻',
        decorations: ['🌻', '🌼', '🌺'],
        environment: ['🌻', '🌼', '🌺', '🌸']
      },
      8: { // Guard Bee Stage
        beehive: '🛡️',
        decorations: ['🛡️', '⚔️', '🔒'],
        environment: ['🌿', '🌱', '🍃']
      },
      9: { // Queen Bee Stage
        beehive: '👑',
        decorations: ['👑', '💎', '✨'],
        environment: ['🌹', '🌺', '🌸']
      }
    };
    return stageImagery[stageIndex as keyof typeof stageImagery] || stageImagery[0];
  };

  // Get current theme based on scroll position
  const getCurrentScrollTheme = () => {
    return ADVENTURE_THEMES[currentStageBasedOnScroll] || ADVENTURE_THEMES[0];
  };

  const isGameLocked = (gameNumber: number): boolean => {
    return gameNumber > highestUnlockedGame;
  };

  const handleGameClick = (gameNumber: number) => {
    // Prevent clicking on locked games
    if (isGameLocked(gameNumber)) {
      return;
    }
    // Directly start the game when clicked
    onGameSelect(gameNumber);
    if (soundEnabled) soundManager.playClickSound();
  };


  // Render individual stage nodes


  // Get geographical location for each game (organic flowing S-curve)
  const getGamePosition = (gameNumber: number) => {
    const gameIndex = gameNumber - 1;
    const isMobile = window.innerWidth <= 768;
    
    // Organic flowing S-curve parameters
    const totalHeight = isMobile ? 280000 : 320000; // Much larger height to accommodate all 2000 games
    const spacing = isMobile ? 140 : 160; // Added 2 fingers of distance (60px more)
    
    // Calculate Y position (upward flow from bottom to top)
    const y = totalHeight - (gameIndex * spacing);
    
    // Calculate X position for high-frequency S-curve with inner positioning for 3rd/4th games
    // High-frequency alternating left-right pattern with inner positioning
    const gamesPerSide = isMobile ? 4 : 4; // 4 games per side to allow inner positioning
    const sideIndex = Math.floor(gameIndex / gamesPerSide);
    const positionInSide = gameIndex % gamesPerSide;
    
    let x;
    if (isMobile) {
      // Mobile: very conservative positioning to ensure ALL numbers are visible
      if (sideIndex % 2 === 0) {
        // Even sides: left side
        if (positionInSide === 0) {
          // 1st game: outer left (20%)
          x = 20;
        } else if (positionInSide === 1) {
          // 2nd game: outer left (30%)
          x = 30;
        } else if (positionInSide === 2) {
          // 3rd game: inner left (35%)
          x = 35;
        } else {
          // 4th game: inner left (45%)
          x = 45;
        }
      } else {
        // Odd sides: right side
        if (positionInSide === 0) {
          // 1st game: outer right (60%)
          x = 60;
        } else if (positionInSide === 1) {
          // 2nd game: outer right (70%)
          x = 70;
        } else if (positionInSide === 2) {
          // 3rd game: inner right (45%)
          x = 45;
        } else {
          // 4th game: inner right (55%)
          x = 55;
        }
      }
    } else {
      // Desktop: very folded curves with inner positioning for 3rd and 4th games
      if (sideIndex % 2 === 0) {
        // Even sides: left side
        if (positionInSide < 2) {
          // 1st and 2nd games: outer left (5% to 20%)
          x = 5 + (positionInSide / 1) * 15;
        } else {
          // 3rd and 4th games: inner left (25% to 40%) - closer to center
          x = 25 + ((positionInSide - 2) / 1) * 15;
        }
      } else {
        // Odd sides: right side
        if (positionInSide < 2) {
          // 1st and 2nd games: outer right (75% to 95%)
          x = 75 + (positionInSide / 1) * 20;
        } else {
          // 3rd and 4th games: inner right (60% to 75%) - closer to center
          x = 60 + ((positionInSide - 2) / 1) * 15;
        }
      }
    }
    
    return {
      left: `${Math.max(5, Math.min(95, x))}%`,
      top: `${Math.max(50, y)}px`
    };
  };

  // Get environmental elements for each game area
  const getGameEnvironment = (gameNumber: number) => {
    const stageIndex = Math.floor((gameNumber - 1) / 200);
    const positionInStage = ((gameNumber - 1) % 200) + 1;
    
    // Different hive environments based on stage and position
    const environments = {
      0: ['🍯', '🍯', '🍯', '🍯', '🥚'], // Egg stage - honey cells
      1: ['🍯', '🍯', '🍯', '🍯', '🐛'], // Larva stage - honey and larva
      2: ['🍯', '🍯', '🍯', '🍯', '🍯'], // Nectar stage - pure honey
      3: ['🍯', '🍯', '🍯', '🍯', '🍯'], // Cocoon stage - honey cells
      4: ['🍯', '🍯', '🍯', '🍯', '🦋'], // Pupa stage - honey and transformation
      5: ['🍯', '🍯', '🍯', '🍯', '🐝'], // Emergence stage - honey and bees
      6: ['🍯', '🍯', '🍯', '🍯', '🍯'], // Nurse stage - nursing honey
      7: ['🍯', '🍯', '🍯', '🍯', '🍯'], // Forager stage - foraged honey
      8: ['🍯', '🍯', '🍯', '🍯', '🍯'], // Guard stage - protected honey
      9: ['👑', '🍯', '🍯', '🍯', '🌟']  // Queen stage - royal honey
    };
    
    const stageEnvironments = environments[stageIndex as keyof typeof environments] || ['🌿'];
    return stageEnvironments[positionInStage % stageEnvironments.length];
  };

  // Render individual game location
  const renderGameLocation = (gameNumber: number) => {
    const position = getGamePosition(gameNumber);
    const stageIndex = Math.floor((gameNumber - 1) / 200);
    const stage = ADVENTURE_THEMES[stageIndex];
    const isCompleted = gamesCompleted.includes(gameNumber);
    const isCurrent = gameNumber === currentGame;
    const isLocked = gameNumber > highestUnlockedGame;
    const environment = getGameEnvironment(gameNumber);
    const isMobile = window.innerWidth <= 768;
    
    return (
      <div
        key={gameNumber}
        style={{
          position: 'absolute',
          left: position.left,
          top: position.top,
          zIndex: 2
        }}
      >
        {/* Environmental element */}
        <div style={{
          position: 'absolute',
          left: isMobile ? '-30px' : '-25px',
          top: isMobile ? '-30px' : '-25px',
          fontSize: isMobile ? '20px' : '16px',
          opacity: 0.6,
          pointerEvents: 'none',
          zIndex: 0
        }}>
          {environment}
        </div>
        
        {/* Google Maps style location icon */}
        <div
          onClick={() => handleGameClick(gameNumber)}
          style={{
            position: 'relative',
            cursor: isLocked ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            transform: isCurrent ? 'scale(1.3)' : 'scale(1)',
            zIndex: isCurrent ? '10' : '2',
            opacity: isLocked ? 0.4 : 1,
            filter: isLocked ? 'grayscale(80%)' : 'none'
          }}
          onMouseEnter={(e) => {
            if (!isMobile && !isLocked) {
              e.currentTarget.style.transform = 'scale(1.3)';
              e.currentTarget.style.zIndex = '10';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = isCurrent ? 'scale(1.3)' : 'scale(1)';
              e.currentTarget.style.zIndex = '2';
            }
          }}
          title={isLocked ? `🔒 Locked - Complete Game ${gameNumber - 1} to unlock` : `Game ${gameNumber} - ${stage?.name || 'Unknown Stage'}\n${stage?.beeLifeStage || ''}`}
        >
          {/* Pin head (circular part) */}
          <div style={{
            width: isMobile ? '24px' : '20px',
            height: isMobile ? '24px' : '20px',
            borderRadius: '50%',
            backgroundColor: isLocked ? '#666666' : isCompleted ? '#4CAF50' : isCurrent ? '#FFC30B' : stage?.primaryColor || '#FFC30B',
            border: isCompleted || isCurrent ? '3px solid #fff' : '2px solid #fff',
            boxShadow: isCurrent ? '0 0 12px rgba(255, 195, 11, 0.8)' : '0 2px 6px rgba(0,0,0,0.3)',
            position: 'relative',
            zIndex: 2,
            animation: isCurrent ? 'currentPulse 2s ease-in-out infinite' : 'none',
            transform: 'translateZ(0)' // Force hardware acceleration
          }}>
            {isLocked && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: isMobile ? '12px' : '10px',
                color: '#fff'
              }}>
                🔒
              </div>
            )}
            {isCurrent && !isLocked && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: isMobile ? '12px' : '10px',
                color: '#fff'
              }}>
                ★
              </div>
            )}
          </div>
          
          {/* Pin point (bottom part) */}
          <div style={{
            width: 0,
            height: 0,
            borderLeft: isMobile ? '12px solid transparent' : '10px solid transparent',
            borderRight: isMobile ? '12px solid transparent' : '10px solid transparent',
            borderTop: isMobile ? '18px solid' : '15px solid',
            borderTopColor: isCompleted ? '#4CAF50' : isCurrent ? '#FFC30B' : stage?.primaryColor || '#FFC30B',
            position: 'absolute',
            top: isMobile ? '18px' : '15px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1
          }} />
        </div>
        
        {/* Location icon label */}
        <div style={{
          position: 'absolute',
          left: isMobile ? '30px' : '25px',
          top: isMobile ? '2px' : '1px',
          fontSize: isMobile ? '14px' : '12px',
          fontWeight: 'bold',
          color: '#2E8B57',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: isMobile ? '3px 6px' : '2px 5px',
          borderRadius: isMobile ? '4px' : '3px',
          border: '1px solid rgba(0,0,0,0.2)',
          minWidth: isMobile ? '25px' : '20px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {gameNumber}
        </div>
      </div>
    );
  };

  // Main map render with organic flowing S-curve design
  const renderBeeAdventureMap = () => {
    const isMobile = window.innerWidth <= 768;
    const totalHeight = isMobile ? 280000 : 320000; // Much larger height to accommodate all 2000 games
    
    return (
      <div style={{ 
        position: 'relative',
        background: `linear-gradient(135deg, #90EE90, #98FB98, #F0FFF0)`,
        borderRadius: '20px',
        padding: '2rem',
        border: `4px solid ${currentTheme.primaryColor}`,
        boxShadow: `0 0 25px ${currentTheme.shadowColor}`,
        overflow: 'hidden'
      }}>

        {/* Map Title - Removed */}

        {/* Scrollable map area */}
        <div 
          ref={scrollContainerRef}
          style={{
            position: 'relative',
            width: '100%',
            height: '400px',
            background: `radial-gradient(circle at center, ${getCurrentScrollTheme().backgroundColor}40, ${getCurrentScrollTheme().secondaryColor}20)`,
            borderRadius: '15px',
            border: `3px solid ${getCurrentScrollTheme().primaryColor}`,
            padding: '1rem',
            overflow: 'auto',
            overflowX: 'hidden',
            transition: 'all 0.5s ease-in-out'
          }}>
          {/* Background landscape elements scattered throughout */}
          {Array.from({ length: 50 }, (_, i) => {
            const stageImagery = getStageImagery(currentStageBasedOnScroll);
            const randomDecoration = stageImagery.decorations[Math.floor(Math.random() * stageImagery.decorations.length)];
            const randomEnvironment = stageImagery.environment[Math.floor(Math.random() * stageImagery.environment.length)];
            const useDecoration = Math.random() > 0.5;
            
            return (
              <div
                key={`bg-${i}`}
                style={{
                  position: 'absolute',
                  left: `${Math.random() * 80 + 10}%`,
                  top: `${Math.random() * totalHeight + 50}px`,
                  fontSize: `${Math.random() * 30 + 20}px`,
                  opacity: 0.3 + Math.random() * 0.2,
                  transform: `rotate(${Math.random() * 60 - 30}deg)`,
                  pointerEvents: 'none',
                  animation: 'particleFloat 8s ease-in-out infinite',
                  animationDelay: `${i * 0.1}s`
                }}
              >
                {useDecoration ? randomDecoration : randomEnvironment}
              </div>
            );
          })}

          {/* Flying bees throughout the map */}
          {Array.from({ length: 30 }, (_, i) => (
            <div
              key={`flying-bee-${i}`}
              style={{
                position: 'absolute',
                left: `${Math.random() * 90 + 5}%`,
                top: `${Math.random() * totalHeight + 50}px`,
                fontSize: `${Math.random() * 15 + 12}px`,
                opacity: 0.6 + Math.random() * 0.3,
                pointerEvents: 'none',
                animation: 'beeFlight 12s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
                zIndex: 3
              }}
            >
              🐝
            </div>
          ))}

          {/* Grass along the pathway sides */}
          {Array.from({ length: 200 }, (_, i) => {
            const gameIndex = i * 10; // Every 10th game position
            const position = getGamePosition(gameIndex + 1);
            const isLeftSide = Math.random() > 0.5;
            const sideOffset = isLeftSide ? -80 : 80;
            const grassVariants = ['🌱', '🌿', '🌾', '🍀', '🌾', '🌱', '🌿'];
            const grassType = grassVariants[Math.floor(Math.random() * grassVariants.length)];
            
            return (
              <div
                key={`grass-${i}`}
                style={{
                  position: 'absolute',
                  left: `calc(${position.left} + ${sideOffset}px)`,
                  top: `calc(${position.top} - ${isMobile ? '20px' : '15px'})`,
                  fontSize: `${Math.random() * 20 + 16}px`,
                  opacity: 0.7 + Math.random() * 0.2,
                  pointerEvents: 'none',
                  animation: 'grassSway 6s ease-in-out infinite',
                  animationDelay: `${i * 0.1}s`,
                  zIndex: 1,
                  transform: `rotate(${Math.random() * 20 - 10}deg)`
                }}
              >
                {grassType}
              </div>
            );
          })}

          {/* Sugar granules scattered throughout */}
          {Array.from({ length: 150 }, (_, i) => (
            <div
              key={`sugar-${i}`}
              style={{
                position: 'absolute',
                left: `${Math.random() * 85 + 7.5}%`,
                top: `${Math.random() * totalHeight + 50}px`,
                fontSize: `${Math.random() * 12 + 8}px`,
                opacity: 0.6 + Math.random() * 0.3,
                pointerEvents: 'none',
                animation: 'sugarShimmer 8s ease-in-out infinite',
                animationDelay: `${i * 0.15}s`,
                zIndex: 2,
                transform: `rotate(${Math.random() * 360}deg)`
              }}
            >
              ⭐
            </div>
          ))}

          {/* Dripping honey animations */}
          {Array.from({ length: 50 }, (_, i) => {
            const gameIndex = i * 40; // Every 40th game position
            const position = getGamePosition(gameIndex + 1);
            const honeyVariants = ['🍯', '💧', '🍯', '💧', '🍯'];
            const honeyType = honeyVariants[Math.floor(Math.random() * honeyVariants.length)];
            
            return (
              <div
                key={`honey-${i}`}
                style={{
                  position: 'absolute',
                  left: `calc(${position.left} + ${Math.random() * 60 - 30}px)`,
                  top: `calc(${position.top} - ${Math.random() * 100 + 20}px)`,
                  fontSize: `${Math.random() * 18 + 14}px`,
                  opacity: 0.8 + Math.random() * 0.2,
                  pointerEvents: 'none',
                  animation: 'honeyDrip 10s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`,
                  zIndex: 3,
                  transform: `rotate(${Math.random() * 30 - 15}deg)`
                }}
              >
                {honeyType}
              </div>
            );
          })}

          {/* Happy flowers along the pathway */}
          {Array.from({ length: 120 }, (_, i) => {
            const gameIndex = i * 16; // Every 16th game position
            const position = getGamePosition(gameIndex + 1);
            const isLeftSide = Math.random() > 0.5;
            const sideOffset = isLeftSide ? -60 : 60;
            const flowerVariants = ['🌻', '🌺', '🌸', '🌼', '🌷', '🌹', '🌻', '🌺'];
            const flowerType = flowerVariants[Math.floor(Math.random() * flowerVariants.length)];
            
            return (
              <div
                key={`flower-${i}`}
                style={{
                  position: 'absolute',
                  left: `calc(${position.left} + ${sideOffset}px)`,
                  top: `calc(${position.top} - ${isMobile ? '25px' : '20px'})`,
                  fontSize: `${Math.random() * 22 + 18}px`,
                  opacity: 0.8 + Math.random() * 0.2,
                  pointerEvents: 'none',
                  animation: 'flowerDance 7s ease-in-out infinite',
                  animationDelay: `${i * 0.12}s`,
                  zIndex: 2,
                  transform: `rotate(${Math.random() * 15 - 7.5}deg)`
                }}
              >
                {flowerType}
              </div>
            );
          })}

          {/* Continuous flowing S-curve SVG */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${totalHeight}px`,
              zIndex: 1,
              pointerEvents: 'none',
              animation: 'mapFloat 8s ease-in-out infinite',
              transform: 'translateZ(0)' // Force hardware acceleration
            }}
            viewBox={`0 0 800 ${totalHeight}`}
            preserveAspectRatio="none"
          >
            {/* Create the main organic flowing S-curve path */}
            {(() => {
              const spacing = isMobile ? 140 : 160;
              
              // Generate path points for high-frequency S-curve with inner positioning
              const pathPoints = [];
              for (let i = 0; i < 2000; i++) {
                const y = totalHeight - (i * spacing);
                const gamesPerSide = 4; // 4 games per side to allow inner positioning
                const sideIndex = Math.floor(i / gamesPerSide);
                const positionInSide = i % gamesPerSide;
                
                let x;
                if (isMobile) {
                  // Mobile: very conservative positioning to ensure ALL numbers are visible
                  if (sideIndex % 2 === 0) {
                    // Even sides: left side
                    if (positionInSide === 0) {
                      // 1st game: outer left (20%)
                      x = 20;
                    } else if (positionInSide === 1) {
                      // 2nd game: outer left (30%)
                      x = 30;
                    } else if (positionInSide === 2) {
                      // 3rd game: inner left (35%)
                      x = 35;
                    } else {
                      // 4th game: inner left (45%)
                      x = 45;
                    }
                  } else {
                    // Odd sides: right side
                    if (positionInSide === 0) {
                      // 1st game: outer right (60%)
                      x = 60;
                    } else if (positionInSide === 1) {
                      // 2nd game: outer right (70%)
                      x = 70;
                    } else if (positionInSide === 2) {
                      // 3rd game: inner right (45%)
                      x = 45;
                    } else {
                      // 4th game: inner right (55%)
                      x = 55;
                    }
                  }
                } else {
                  // Desktop: very folded curves with inner positioning for 3rd and 4th games
                  if (sideIndex % 2 === 0) {
                    // Even sides: left side
                    if (positionInSide < 2) {
                      // 1st and 2nd games: outer left (5% to 20%)
                      x = 5 + (positionInSide / 1) * 15;
                    } else {
                      // 3rd and 4th games: inner left (25% to 40%) - closer to center
                      x = 25 + ((positionInSide - 2) / 1) * 15;
                    }
                  } else {
                    // Odd sides: right side
                    if (positionInSide < 2) {
                      // 1st and 2nd games: outer right (75% to 95%)
                      x = 75 + (positionInSide / 1) * 20;
                    } else {
                      // 3rd and 4th games: inner right (60% to 75%) - closer to center
                      x = 60 + ((positionInSide - 2) / 1) * 15;
                    }
                  }
                }
                
                pathPoints.push(`${x * 8},${y}`);
              }
              
              // Create smooth flowing path using all points
              const pathData = `M ${pathPoints[0]} L ${pathPoints.join(' L ')}`;
              
              return (
                <path
                  key="organic-flowing-s-curve"
                  d={pathData}
                  stroke={getCurrentScrollTheme().primaryColor}
                  strokeWidth={isMobile ? "6" : "4"}
                  fill="none"
                  opacity="0.7"
                  style={{
                    filter: `drop-shadow(0 0 4px ${getCurrentScrollTheme().primaryColor}40)`,
                    animation: 'titleGlow 3s ease-in-out infinite'
                  }}
                />
              );
            })()}
            
            {/* Add decorative elements along the organic S-curve */}
            {Array.from({ length: 100 }, (_, i) => {
              const spacing = isMobile ? 140 : 160;
              
              const gameIndex = i * 20; // Every 20th game
              const y = totalHeight - (gameIndex * spacing);
              const gamesPerSide = 4; // 4 games per side to allow inner positioning
              const sideIndex = Math.floor(gameIndex / gamesPerSide);
              const positionInSide = gameIndex % gamesPerSide;
              
              let x;
              if (isMobile) {
                // Mobile: very conservative positioning to ensure ALL numbers are visible
                if (sideIndex % 2 === 0) {
                  // Even sides: left side
                  if (positionInSide === 0) {
                    // 1st game: outer left (20%)
                    x = 20;
                  } else if (positionInSide === 1) {
                    // 2nd game: outer left (30%)
                    x = 30;
                  } else if (positionInSide === 2) {
                    // 3rd game: inner left (35%)
                    x = 35;
                  } else {
                    // 4th game: inner left (45%)
                    x = 45;
                  }
                } else {
                  // Odd sides: right side
                  if (positionInSide === 0) {
                    // 1st game: outer right (60%)
                    x = 60;
                  } else if (positionInSide === 1) {
                    // 2nd game: outer right (70%)
                    x = 70;
                  } else if (positionInSide === 2) {
                    // 3rd game: inner right (45%)
                    x = 45;
                  } else {
                    // 4th game: inner right (55%)
                    x = 55;
                  }
                }
              } else {
                // Desktop: very folded curves with inner positioning for 3rd and 4th games
                if (sideIndex % 2 === 0) {
                  // Even sides: left side
                  if (positionInSide < 2) {
                    // 1st and 2nd games: outer left (5% to 20%)
                    x = 5 + (positionInSide / 1) * 15;
                  } else {
                    // 3rd and 4th games: inner left (25% to 40%) - closer to center
                    x = 25 + ((positionInSide - 2) / 1) * 15;
                  }
                } else {
                  // Odd sides: right side
                  if (positionInSide < 2) {
                    // 1st and 2nd games: outer right (75% to 95%)
                    x = 75 + (positionInSide / 1) * 20;
                  } else {
                    // 3rd and 4th games: inner right (60% to 75%) - closer to center
                    x = 60 + ((positionInSide - 2) / 1) * 15;
                  }
                }
              }
              
              // Add decorative curve at this point
              const decorativeCurve = `M ${(x - 3) * 8},${y} 
                                     Q ${x * 8},${y - 15} ${(x + 3) * 8},${y}`;
              
              return (
                <path
                  key={`dec-${i}`}
                  d={decorativeCurve}
                  stroke={getCurrentScrollTheme().secondaryColor}
                  strokeWidth="2"
                  fill="none"
                  opacity="0.3"
                  style={{
                    filter: `drop-shadow(0 0 2px ${getCurrentScrollTheme().secondaryColor}60)`,
                    animation: 'stageCardFloat 6s ease-in-out infinite',
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              );
            })}
          </svg>

          {/* All 2000 games positioned in organic flowing S-curve */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: `${totalHeight}px`,
            zIndex: 2
          }}>
            {Array.from({ length: 2000 }, (_, i) => renderGameLocation(i + 1))}
          </div>

          {/* Stage milestone markers */}
          {ADVENTURE_THEMES.map((stage, index) => {
            const milestoneGame = (index * 200) + 1;
            const position = getGamePosition(milestoneGame);
            
            return (
              <div
                key={`milestone-${index}`}
                style={{
                  position: 'absolute',
                  left: `calc(${position.left} - ${isMobile ? '20px' : '15px'})`,
                  top: `calc(${position.top} - ${isMobile ? '20px' : '15px'})`,
                  width: isMobile ? '80px' : '60px',
                  height: isMobile ? '80px' : '60px',
                  borderRadius: '50%',
                  backgroundColor: stage.primaryColor,
                  border: isMobile ? '5px solid #fff' : '4px solid #fff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '24px' : '20px',
                  fontWeight: 'bold',
                  color: '#fff',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                  zIndex: 5,
                  animation: 'milestonePulse 3s ease-in-out infinite',
                  animationDelay: `${index * 0.5}s`,
                  transform: 'translateZ(0)' // Force hardware acceleration
                }}
                onClick={() => handleGameClick(milestoneGame)}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = 'scale(1.15)';
                    e.currentTarget.style.zIndex = '15';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.zIndex = '5';
                  }
                }}
                title={`Stage ${index + 1}: ${stage.name}\nStarting at Game ${milestoneGame}\n${stage.beeLifeStage}`}
              >
                <div style={{ fontSize: isMobile ? '32px' : '24px', marginBottom: '2px' }}>
                  {getStageEmoji(index)}
                </div>
                <div style={{ fontSize: isMobile ? '12px' : '10px', textAlign: 'center' }}>
                  S{index + 1}
                </div>
              </div>
            );
          })}

          {/* Beehives at strategic locations for each stage */}
          {ADVENTURE_THEMES.map((stage, index) => {
            const stageStartGame = (index * 200) + 1;
            const stageEndGame = (index + 1) * 200;
            const stageMidGame = Math.floor((stageStartGame + stageEndGame) / 2);
            const position = getGamePosition(stageMidGame);
            const stageImagery = getStageImagery(index);
            
            return (
              <div
                key={`beehive-${index}`}
                style={{
                  position: 'absolute',
                  left: `calc(${position.left} + ${isMobile ? '40px' : '30px'})`,
                  top: `calc(${position.top} - ${isMobile ? '30px' : '25px'})`,
                  fontSize: isMobile ? '60px' : '50px',
                  opacity: 0.8,
                  pointerEvents: 'none',
                  animation: 'beehiveGlow 6s ease-in-out infinite',
                  animationDelay: `${index * 0.3}s`,
                  zIndex: 4,
                  filter: `drop-shadow(0 0 10px ${stage.primaryColor}60)`
                }}
              >
                {stageImagery.beehive}
              </div>
            );
          })}

          {/* Stage-specific large decorations */}
          {ADVENTURE_THEMES.map((_, index) => {
            const stageStartGame = (index * 200) + 1;
            const stageMidGame = Math.floor((stageStartGame + (index + 1) * 200) / 2);
            const position = getGamePosition(stageMidGame);
            const stageImagery = getStageImagery(index);
            
            return (
              <div
                key={`stage-decoration-${index}`}
                style={{
                  position: 'absolute',
                  left: `calc(${position.left} - ${isMobile ? '50px' : '40px'})`,
                  top: `calc(${position.top} + ${isMobile ? '50px' : '40px'})`,
                  fontSize: isMobile ? '40px' : '35px',
                  opacity: 0.6,
                  pointerEvents: 'none',
                  animation: 'stageDecorationFloat 8s ease-in-out infinite',
                  animationDelay: `${index * 0.4}s`,
                  zIndex: 2,
                  transform: `rotate(${index * 36}deg)`
                }}
              >
                {stageImagery.decorations[0]}
              </div>
            );
          })}

          {/* Stage names scattered throughout each range */}
          {ADVENTURE_THEMES.map((stage, stageIndex) => {
            // Create multiple name instances throughout each stage range
            return Array.from({ length: 8 }, (_, nameIndex) => {
              const stageStartGame = (stageIndex * 200) + 1;
              const gamePosition = stageStartGame + Math.floor((nameIndex / 7) * 199);
              const position = getGamePosition(gamePosition);
              const stageImagery = getStageImagery(stageIndex);
              
              // Alternate between left and right side for variety
              const isLeftSide = nameIndex % 2 === 0;
              const sideOffset = isLeftSide ? -120 : 120;
              
              return (
                <div
                  key={`stage-name-${stageIndex}-${nameIndex}`}
                  style={{
                    position: 'absolute',
                    left: `calc(${position.left} + ${sideOffset}px)`,
                    top: `calc(${position.top} - ${isMobile ? '30px' : '25px'})`,
                    pointerEvents: 'none',
                    zIndex: 3,
                    animation: 'stageNameFloat 10s ease-in-out infinite',
                    animationDelay: `${(stageIndex * 0.8) + (nameIndex * 0.3)}s`
                  }}
                >
                  {/* Decorative background */}
                  <div style={{
                    background: `linear-gradient(135deg, ${stage.primaryColor}20, ${stage.secondaryColor}10)`,
                    border: `2px solid ${stage.primaryColor}40`,
                    borderRadius: '20px',
                    padding: `${isMobile ? '8px 12px' : '6px 10px'}`,
                    backdropFilter: 'blur(10px)',
                    boxShadow: `0 4px 15px ${stage.shadowColor}`,
                    position: 'relative',
                    transform: `rotate(${nameIndex * 5 - 10}deg)`,
                    transition: 'all 0.3s ease'
                  }}>
                    {/* Decorative elements around the text */}
                    <div style={{
                      position: 'absolute',
                      top: '-5px',
                      left: '-5px',
                      fontSize: isMobile ? '16px' : '14px',
                      opacity: 0.7,
                      animation: 'decorativeSpin 6s linear infinite'
                    }}>
                      {stageImagery.decorations[0]}
                    </div>
                    <div style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      fontSize: isMobile ? '16px' : '14px',
                      opacity: 0.7,
                      animation: 'decorativeSpin 6s linear infinite reverse'
                    }}>
                      {stageImagery.decorations[1] || stageImagery.decorations[0]}
                    </div>
                    <div style={{
                      position: 'absolute',
                      bottom: '-5px',
                      left: '-5px',
                      fontSize: isMobile ? '16px' : '14px',
                      opacity: 0.7,
                      animation: 'decorativeSpin 6s linear infinite'
                    }}>
                      {stageImagery.environment[0]}
                    </div>
                    <div style={{
                      position: 'absolute',
                      bottom: '-5px',
                      right: '-5px',
                      fontSize: isMobile ? '16px' : '14px',
                      opacity: 0.7,
                      animation: 'decorativeSpin 6s linear infinite reverse'
                    }}>
                      {stageImagery.environment[1] || stageImagery.environment[0]}
                    </div>
                    
                    {/* Stage name text */}
                    <div style={{
                      color: stage.primaryColor,
                      fontSize: isMobile ? '14px' : '12px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      textShadow: `1px 1px 2px ${stage.shadowColor}`,
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.5px'
                    }}>
                      {stage.name}
                    </div>
                    
                    {/* Stage emoji */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: isMobile ? '20px' : '18px',
                      opacity: 0.8,
                      animation: 'stageEmojiPulse 4s ease-in-out infinite'
                    }}>
                      {stage.stageEmoji}
                    </div>
                  </div>
                </div>
              );
            });
          })}

          {/* Continuous flowing S-curve SVG */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${totalHeight}px`,
              zIndex: 1,
              pointerEvents: 'none',
              animation: 'mapFloat 8s ease-in-out infinite',
              transform: 'translateZ(0)' // Force hardware acceleration
            }}
            viewBox={`0 0 800 ${totalHeight}`}
            preserveAspectRatio="none"
          >
            {/* Create the main organic flowing S-curve path */}
            {(() => {
              const spacing = isMobile ? 140 : 160;
              
              // Generate path points for high-frequency S-curve with inner positioning
              const pathPoints = [];
              for (let i = 0; i < 2000; i++) {
                const y = totalHeight - (i * spacing);
                const gamesPerSide = 4; // 4 games per side to allow inner positioning
                const sideIndex = Math.floor(i / gamesPerSide);
                const positionInSide = i % gamesPerSide;
                
                let x;
                if (isMobile) {
                  // Mobile: very conservative positioning to ensure ALL numbers are visible
                  if (sideIndex % 2 === 0) {
                    // Even sides: left side
                    if (positionInSide === 0) {
                      // 1st game: outer left (20%)
                      x = 20;
                    } else if (positionInSide === 1) {
                      // 2nd game: outer left (30%)
                      x = 30;
                    } else if (positionInSide === 2) {
                      // 3rd game: inner left (35%)
                      x = 35;
                    } else {
                      // 4th game: inner left (45%)
                      x = 45;
                    }
                  } else {
                    // Odd sides: right side
                    if (positionInSide === 0) {
                      // 1st game: outer right (60%)
                      x = 60;
                    } else if (positionInSide === 1) {
                      // 2nd game: outer right (70%)
                      x = 70;
                    } else if (positionInSide === 2) {
                      // 3rd game: inner right (45%)
                      x = 45;
                    } else {
                      // 4th game: inner right (55%)
                      x = 55;
                    }
                  }
                } else {
                  // Desktop: very folded curves with inner positioning for 3rd and 4th games
                  if (sideIndex % 2 === 0) {
                    // Even sides: left side
                    if (positionInSide < 2) {
                      // 1st and 2nd games: outer left (5% to 20%)
                      x = 5 + (positionInSide / 1) * 15;
                    } else {
                      // 3rd and 4th games: inner left (25% to 40%) - closer to center
                      x = 25 + ((positionInSide - 2) / 1) * 15;
                    }
                  } else {
                    // Odd sides: right side
                    if (positionInSide < 2) {
                      // 1st and 2nd games: outer right (75% to 95%)
                      x = 75 + (positionInSide / 1) * 20;
                    } else {
                      // 3rd and 4th games: inner right (60% to 75%) - closer to center
                      x = 60 + ((positionInSide - 2) / 1) * 15;
                    }
                  }
                }
                
                pathPoints.push(`${x * 8},${y}`);
              }
              
              // Create smooth flowing path using all points
              const pathData = `M ${pathPoints[0]} L ${pathPoints.join(' L ')}`;
              
              return (
                <path
                  key="organic-flowing-s-curve"
                  d={pathData}
                  stroke={getCurrentScrollTheme().primaryColor}
                  strokeWidth={isMobile ? "6" : "4"}
                  fill="none"
                  opacity="0.7"
                  style={{
                    filter: `drop-shadow(0 0 4px ${getCurrentScrollTheme().primaryColor}40)`,
                    animation: 'titleGlow 3s ease-in-out infinite'
                  }}
                />
              );
            })()}
            
            {/* Add decorative elements along the organic S-curve */}
            {Array.from({ length: 100 }, (_, i) => {
              const spacing = isMobile ? 140 : 160;
              
              const gameIndex = i * 20; // Every 20th game
              const y = totalHeight - (gameIndex * spacing);
              const gamesPerSide = 4; // 4 games per side to allow inner positioning
              const sideIndex = Math.floor(gameIndex / gamesPerSide);
              const positionInSide = gameIndex % gamesPerSide;
              
              let x;
              if (isMobile) {
                // Mobile: very conservative positioning to ensure ALL numbers are visible
                if (sideIndex % 2 === 0) {
                  // Even sides: left side
                  if (positionInSide === 0) {
                    // 1st game: outer left (20%)
                    x = 20;
                  } else if (positionInSide === 1) {
                    // 2nd game: outer left (30%)
                    x = 30;
                  } else if (positionInSide === 2) {
                    // 3rd game: inner left (35%)
                    x = 35;
                  } else {
                    // 4th game: inner left (45%)
                    x = 45;
                  }
                } else {
                  // Odd sides: right side
                  if (positionInSide === 0) {
                    // 1st game: outer right (60%)
                    x = 60;
                  } else if (positionInSide === 1) {
                    // 2nd game: outer right (70%)
                    x = 70;
                  } else if (positionInSide === 2) {
                    // 3rd game: inner right (45%)
                    x = 45;
                  } else {
                    // 4th game: inner right (55%)
                    x = 55;
                  }
                }
              } else {
                // Desktop: very folded curves with inner positioning for 3rd and 4th games
                if (sideIndex % 2 === 0) {
                  // Even sides: left side
                  if (positionInSide < 2) {
                    // 1st and 2nd games: outer left (5% to 20%)
                    x = 5 + (positionInSide / 1) * 15;
                  } else {
                    // 3rd and 4th games: inner left (25% to 40%) - closer to center
                    x = 25 + ((positionInSide - 2) / 1) * 15;
                  }
                } else {
                  // Odd sides: right side
                  if (positionInSide < 2) {
                    // 1st and 2nd games: outer right (75% to 95%)
                    x = 75 + (positionInSide / 1) * 20;
                  } else {
                    // 3rd and 4th games: inner right (60% to 75%) - closer to center
                    x = 60 + ((positionInSide - 2) / 1) * 15;
                  }
                }
              }
              
              // Add decorative curve at this point
              const decorativeCurve = `M ${(x - 3) * 8},${y} 
                                     Q ${x * 8},${y - 15} ${(x + 3) * 8},${y}`;
              
              return (
                <path
                  key={`dec-${i}`}
                  d={decorativeCurve}
                  stroke={getCurrentScrollTheme().secondaryColor}
                  strokeWidth="2"
                  fill="none"
                  opacity="0.3"
                  style={{
                    filter: `drop-shadow(0 0 2px ${getCurrentScrollTheme().secondaryColor}60)`,
                    animation: 'stageCardFloat 6s ease-in-out infinite',
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              );
            })}
          </svg>

          {/* All 2000 games positioned in organic flowing S-curve */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: `${totalHeight}px`,
            zIndex: 2
          }}>
            {Array.from({ length: 2000 }, (_, i) => renderGameLocation(i + 1))}
          </div>

          {/* Stage milestone markers */}
          {ADVENTURE_THEMES.map((stage, index) => {
            const milestoneGame = (index * 200) + 1;
            const position = getGamePosition(milestoneGame);
            
            return (
              <div
                key={`milestone-${index}`}
                style={{
                  position: 'absolute',
                  left: `calc(${position.left} - ${isMobile ? '20px' : '15px'})`,
                  top: `calc(${position.top} - ${isMobile ? '20px' : '15px'})`,
                  width: isMobile ? '80px' : '60px',
                  height: isMobile ? '80px' : '60px',
                  borderRadius: '50%',
                  backgroundColor: stage.primaryColor,
                  border: isMobile ? '5px solid #fff' : '4px solid #fff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '24px' : '20px',
                  fontWeight: 'bold',
                  color: '#fff',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                  zIndex: 5,
                  animation: 'milestonePulse 3s ease-in-out infinite',
                  animationDelay: `${index * 0.5}s`,
                  transform: 'translateZ(0)' // Force hardware acceleration
                }}
                onClick={() => handleGameClick(milestoneGame)}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = 'scale(1.15)';
                    e.currentTarget.style.zIndex = '15';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.zIndex = '5';
                  }
                }}
                title={`Stage ${index + 1}: ${stage.name}\nStarting at Game ${milestoneGame}\n${stage.beeLifeStage}`}
              >
                <div style={{ fontSize: isMobile ? '32px' : '24px', marginBottom: '2px' }}>
                  {getStageEmoji(index)}
                </div>
                <div style={{ fontSize: isMobile ? '12px' : '10px', textAlign: 'center' }}>
                  S{index + 1}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    );
  };

  return (
    <>
      <style>{mapStyles}</style>
      <div style={{ 
        background: currentTheme.backgroundGradient,
        minHeight: '100vh',
        padding: '1rem',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
      {/* Header */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.8)',
        color: currentTheme.primaryColor,
        padding: '1rem',
        borderRadius: '10px',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        <p style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem', fontWeight: '900', color: '#4CAF50', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          Bee Adventure
        </p>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: 'bold' }}>
          Guide a life to greatness
        </p>
      </div>

      {/* Bee Adventure Map */}
      <BeeLifeStageEffects theme={currentTheme}>
        <div style={{ marginBottom: '1rem' }}>
          {renderBeeAdventureMap()}
        </div>
      </BeeLifeStageEffects>

      {/* Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '1rem',
        borderRadius: '10px',
        marginTop: '1rem'
      }}>
        {/* Back Button */}
        <button
          onClick={() => {
            onBackToMenu();
            if (soundEnabled) soundManager.playClickSound();
          }}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 'bold',
            backgroundColor: currentTheme.buttonColor,
            color: 'black',
            border: '2px solid black',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          🏠 Back to Menu
        </button>
      </div>
    </div>
    </>
  );
};

export default BeeAdventureMap;
