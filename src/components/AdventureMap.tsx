"use client";

import React, { useState } from 'react';
import { soundManager } from '../utils/sounds';
import { useTheme, ADVENTURE_THEMES } from '../hooks/useTheme';
import BeeLifeStageEffects from './BeeLifeStageEffects';

interface AdventureMapProps {
  currentGame: number;
  gamesCompleted: number[];
  onGameSelect: (gameNumber: number) => void;
  onBackToMenu: () => void;
}

// Use the centralized adventure stages from the theme system

const AdventureMap: React.FC<AdventureMapProps> = ({ 
  currentGame, 
  gamesCompleted, 
  onGameSelect, 
  onBackToMenu 
}) => {
  const [selectedGame, setSelectedGame] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(0.3);
  
  // Use theme system
  const { currentTheme, getStageIndex } = useTheme({ gameNumber: currentGame });

  // Initialize sound manager settings
  React.useEffect(() => {
    soundManager.setVolume(volume);
    soundManager.setMuted(!soundEnabled);
  }, [volume, soundEnabled]);

  const getGameStatus = (gameNumber: number): 'completed' | 'current' | 'available' => {
    // Unlock all stages for development
    if (gamesCompleted.includes(gameNumber)) return 'completed';
    if (gameNumber === currentGame) return 'current';
    return 'available'; // All games are now accessible for development
  };

  const getGameColor = (gameNumber: number) => {
    const status = getGameStatus(gameNumber);
    
    switch (status) {
      case 'completed':
        return '#FFC30B'; // Yellow for completed
      case 'current':
        return '#000000'; // Black for current
      case 'available':
        return '#FFC30B'; // Yellow for available
      default:
        return '#FFC30B';
    }
  };

  // Get location emoji based on game number and stage
  const getLocationEmoji = (gameNumber: number) => {
    const stageIndex = getStageIndex(gameNumber);
    const positionInStage = ((gameNumber - 1) % 200) + 1;
    
    // Special emojis for milestone levels
    if (positionInStage === 1) return '🏁'; // Stage start
    if (positionInStage === 50) return '⛰️'; // Mid-stage checkpoint
    if (positionInStage === 100) return '🏔️'; // High checkpoint
    if (positionInStage === 150) return '🗻'; // Higher checkpoint
    if (positionInStage === 200) return '🏆'; // Stage end
    
    // Stage-specific location emojis
    switch (stageIndex) {
      case 0: // Egg stage
        return ['🥚', '🍳', '⚪', '🔴', '🟡'][positionInStage % 5];
      case 1: // Larva stage
        return ['🐛', '🪱', '🟢', '🟤', '🟫'][positionInStage % 5];
      case 2: // Nectar stage
        return ['🍯', '🍯', '🟨', '🟧', '🟠'][positionInStage % 5];
      case 3: // Cocoon stage
        return ['🕸️', '🕷️', '🟣', '🟪', '🟦'][positionInStage % 5];
      case 4: // Pupa stage
        return ['🦋', '💭', '☁️', '🌫️', '💙'][positionInStage % 5];
      case 5: // Emergence stage
        return ['🌅', '🌄', '🌞', '☀️', '🌤️'][positionInStage % 5];
      case 6: // Nurse stage
        return ['🏠', '🏡', '🏘️', '🌱', '🌿'][positionInStage % 5];
      case 7: // Forager stage
        return ['🌻', '🌸', '🌺', '🌼', '🌷'][positionInStage % 5];
      case 8: // Guard stage
        return ['🛡️', '⚔️', '🗡️', '🔰', '🛡️'][positionInStage % 5];
      case 9: // Queen stage
        return ['👑', '💎', '🔮', '✨', '🌟'][positionInStage % 5];
      default:
        return '📍';
    }
  };

  const handleGameClick = (gameNumber: number) => {
    setSelectedGame(gameNumber);
    if (soundEnabled) soundManager.playClickSound();
  };

  const handleStartGame = () => {
    if (selectedGame) {
      onGameSelect(selectedGame);
      if (soundEnabled) soundManager.playClickSound();
    }
  };

  const getStageForGame = (gameNumber: number) => {
    return ADVENTURE_THEMES[Math.floor((gameNumber - 1) / 200)];
  };

  const renderGameNode = (gameNumber: number) => {
    const status = getGameStatus(gameNumber);
    const stage = getStageForGame(gameNumber);
    const locationEmoji = getLocationEmoji(gameNumber);
    const stageIndex = Math.floor((gameNumber - 1) / 200);
    const positionInStage = ((gameNumber - 1) % 200) + 1;
    
    // Special styling for milestone levels
    const isMilestone = positionInStage === 1 || positionInStage === 50 || 
                       positionInStage === 100 || positionInStage === 150 || positionInStage === 200;
    
    // Only apply glittering animations to current and completed games, not latter available games
    const shouldAnimate = status === 'current' || status === 'completed';
    
    return (
      <div
        key={gameNumber}
        onClick={() => handleGameClick(gameNumber)}
        style={{
          width: isMilestone ? '24px' : '20px',
          height: isMilestone ? '24px' : '20px',
          borderRadius: isMilestone ? '30%' : '50%',
          backgroundColor: getGameColor(gameNumber),
          border: selectedGame === gameNumber ? '3px solid #000' : 
                 status === 'current' ? (isMilestone ? '2px solid #FFC30B' : '1px solid #FFC30B') :
                 isMilestone ? '2px solid #000' : '1px solid #000',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isMilestone ? '10px' : '8px',
          fontWeight: 'bold',
          color: status === 'current' ? '#FFC30B' : '#000',
          textShadow: status === 'current' ? '1px 1px 2px rgba(0,0,0,0.8)' : '1px 1px 2px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease',
          transform: status === 'current' ? 'scale(1.2) translateZ(0)' : selectedGame === gameNumber ? 'scale(1.1) translateZ(0)' : 'scale(1) translateZ(0)',
          zIndex: status === 'current' ? 10 : selectedGame === gameNumber ? 5 : 1,
          boxShadow: status === 'current' ? '0 0 12px rgba(0, 0, 0, 0.8)' : 
                    (isMilestone && shouldAnimate) ? '0 0 8px rgba(255, 195, 11, 0.6)' : 'none',
          position: 'relative',
          animation: shouldAnimate && isMilestone ? 'milestonePulse 3s ease-in-out infinite' : 
                    status === 'current' ? 'currentPulse 2s ease-in-out infinite' : 'none',
          animationDelay: `${(gameNumber % 10) * 0.1}s`,
          backfaceVisibility: 'hidden' // Improve animation performance
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.3)';
          e.currentTarget.style.zIndex = '10';
          e.currentTarget.style.boxShadow = status === 'current' ? '0 0 16px rgba(0, 0, 0, 0.8)' : '0 0 16px rgba(255, 195, 11, 0.8)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = status === 'current' ? 'scale(1.2)' : 'scale(1)';
          e.currentTarget.style.zIndex = status === 'current' ? '10' : '1';
          e.currentTarget.style.boxShadow = status === 'current' ? '0 0 12px rgba(0, 0, 0, 0.8)' : 
                                           isMilestone ? '0 0 8px rgba(255, 195, 11, 0.6)' : 'none';
        }}
        title={`${locationEmoji} Game ${gameNumber} - ${stage?.name || 'Unknown Stage'}\n${stage?.beeLifeStage || ''}`}
      >
        {locationEmoji}
        {/* Stage indicator for milestone levels */}
        {isMilestone && (
          <div style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: status === 'current' ? '#FFC30B' : '#000000',
            border: status === 'current' ? '1px solid #000' : '1px solid #FFC30B',
            fontSize: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: status === 'current' ? '#000' : '#FFC30B',
            fontWeight: 'bold'
          }}>
            {stageIndex + 1}
          </div>
        )}
      </div>
    );
  };

  // Render all stages as a map (for development)
  const renderAllStagesMap = () => {
    // Show all 2000 games for development
    const allGames = Array.from({ length: 2000 }, (_, i) => i + 1);
    
    return (
      <div style={{ 
        position: 'relative',
        background: `linear-gradient(135deg, ${currentTheme.backgroundColor}80, ${currentTheme.gridColor}60)`,
        borderRadius: '20px',
        padding: '2rem',
        border: `3px solid ${currentTheme.primaryColor}`,
        boxShadow: `0 0 20px ${currentTheme.shadowColor}`,
        minHeight: '400px',
        overflow: 'hidden'
      }}>
        {/* Animated Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: currentTheme.backgroundPattern,
          opacity: 0.3,
          zIndex: 0,
          animation: 'mapFloat 8s ease-in-out infinite',
        transform: 'translateZ(0)' // Force hardware acceleration
        }} />
        
        {/* Map Title - Removed */}

        {/* Stage Overview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
          position: 'relative',
          zIndex: 1
        }}>
          {ADVENTURE_THEMES.map((stage, index) => (
            <div key={index} style={{
              background: `linear-gradient(135deg, ${stage.cardBackground}, ${stage.backgroundColor}80)`,
              padding: '1rem',
              borderRadius: '10px',
              border: `2px solid ${stage.primaryColor}`,
              textAlign: 'center',
              boxShadow: `0 4px 8px ${stage.shadowColor}`,
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              animation: 'stageCardFloat 6s ease-in-out infinite',
              animationDelay: `${index * 0.5}s`,
              transform: 'translateZ(0)', // Force hardware acceleration
              backfaceVisibility: 'hidden' // Improve animation performance
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px) scale(1.05)';
              e.currentTarget.style.boxShadow = `0 8px 16px ${stage.shadowColor}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = `0 4px 8px ${stage.shadowColor}`;
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                {stage.stageEmoji}
              </div>
              <h4 style={{ 
                margin: '0 0 0.5rem 0', 
                color: stage.primaryColor,
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}>
                {stage.name}
              </h4>
              <p style={{ 
                margin: 0, 
                fontSize: '0.8rem', 
                color: stage.textColor,
                lineHeight: '1.2'
              }}>
                Games {index * 200 + 1}-{(index + 1) * 200}
              </p>
            </div>
          ))}
        </div>

        {/* Map Legend */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              borderRadius: '50%', 
              backgroundColor: '#FFC30B', 
              border: '2px solid white',
              animation: 'legendPulse 2s ease-in-out infinite'
            }}></div>
            <span>Completed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              borderRadius: '50%', 
              backgroundColor: '#000000', 
              border: '2px solid white', 
              boxShadow: '0 0 8px rgba(0, 0, 0, 0.8)',
              animation: 'currentGlow 1.5s ease-in-out infinite'
            }}></div>
            <span>Current</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              borderRadius: '50%', 
              backgroundColor: '#FFC30B', 
              border: '2px solid white',
              animation: 'availableShimmer 3s ease-in-out infinite'
            }}></div>
            <span>Available</span>
          </div>
        </div>

        {/* Map Container */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '400px',
          background: `radial-gradient(circle at center, ${currentTheme.backgroundColor}40, ${currentTheme.gridColor}20)`,
          borderRadius: '15px',
          border: `2px solid ${currentTheme.borderColor}`,
          overflow: 'auto',
          padding: '1rem',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(40, 1fr)',
            gap: '2px',
            width: 'fit-content',
            position: 'relative'
          }}>
            {allGames.map(gameNumber => renderGameNode(gameNumber))}
          </div>
        </div>

        {/* Progress Info */}
        <div style={{
          textAlign: 'center',
          marginTop: '1rem',
          color: currentTheme.textColor,
          position: 'relative',
          zIndex: 1
        }}>
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>
            Progress: {gamesCompleted.length} / 2000 levels completed
          </p>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: 'rgba(0,0,0,0.1)',
            borderRadius: '4px',
            marginTop: '0.5rem',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(gamesCompleted.length / 2000) * 100}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${currentTheme.primaryColor}, ${currentTheme.secondaryColor})`,
              borderRadius: '4px',
              transition: 'width 0.5s ease',
              animation: 'progressShimmer 2s ease-in-out infinite'
            }} />
          </div>
        </div>
      </div>
    );
  };


  return (
    <div style={{ 
        background: currentTheme.backgroundGradient,
        backgroundImage: currentTheme.backgroundPattern,
        minHeight: '100vh',
        padding: '1rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden'
    }}>
      {/* Map-specific animated background elements */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `radial-gradient(circle at 20% 20%, ${currentTheme.primaryColor}10 0%, transparent 50%), radial-gradient(circle at 80% 80%, ${currentTheme.secondaryColor}10 0%, transparent 50%)`,
        animation: 'mapFloat 12s ease-in-out infinite',
        zIndex: 0,
        pointerEvents: 'none',
        transform: 'translateZ(0)' // Force hardware acceleration
      }} />
      
      {/* Map-specific floating particles effect */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, ${currentTheme.primaryColor}05 2px, ${currentTheme.primaryColor}05 4px)`,
        animation: 'particleFloat 20s linear infinite',
        zIndex: 0,
        pointerEvents: 'none',
        transform: 'translateZ(0)' // Force hardware acceleration
      }} />
      {/* Header */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.8)',
        color: currentTheme.primaryColor,
        padding: '1rem',
        borderRadius: '10px',
        marginBottom: '1rem',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        backdropFilter: 'blur(10px)',
        border: `2px solid ${currentTheme.primaryColor}40`,
        boxShadow: `0 8px 32px ${currentTheme.shadowColor}`
      }}>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: 'bold' }}>
          Guide a life to greatness
        </p>
      </div>

      {/* All Stages Map */}
      <BeeLifeStageEffects theme={currentTheme}>
        <div style={{
          marginBottom: '1rem',
          position: 'relative',
          zIndex: 1
        }}>
          {renderAllStagesMap()}
        </div>
      </BeeLifeStageEffects>


      {/* Game Selection Panel */}
      {selectedGame && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '1.5rem',
          borderRadius: '10px',
          marginBottom: '1rem',
          border: '2px solid #FFC30B',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          animation: 'popIn 0.5s ease-out'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{getLocationEmoji(selectedGame)}</span>
            Selected: Game {selectedGame}
          </h3>
          <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '1.1rem', fontWeight: 'bold' }}>
            {getStageForGame(selectedGame)?.name}
          </p>
          <p style={{ margin: '0 0 1rem 0', color: currentTheme.primaryColor, fontSize: '0.9rem' }}>
            🐝 {getStageForGame(selectedGame)?.beeLifeStage}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={handleStartGame}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: '2px solid black',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Start Game
            </button>
            <button
              onClick={() => setSelectedGame(null)}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                backgroundColor: '#666',
                color: 'white',
                border: '2px solid black',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '1rem',
        borderRadius: '10px',
        flexWrap: 'wrap',
        gap: '1rem',
        position: 'relative',
        zIndex: 1,
        backdropFilter: 'blur(10px)',
        border: `2px solid ${currentTheme.primaryColor}30`,
        boxShadow: `0 4px 16px ${currentTheme.shadowColor}`
      }}>
        {/* Sound Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => {
              const newSoundEnabled = !soundEnabled;
              setSoundEnabled(newSoundEnabled);
              soundManager.setMuted(!newSoundEnabled);
              if (newSoundEnabled) soundManager.playClickSound();
            }}
            style={{
              padding: '0.5rem',
              fontSize: '1.2em',
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
          
          {soundEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Volume:</span>
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
                  width: '100px',
                  accentColor: '#FFC30B'
                }}
              />
              <span style={{ fontSize: '0.8rem', color: '#666' }}>
                {Math.round(volume * 100)}%
              </span>
            </div>
          )}
        </div>

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

      {/* Legend */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '1rem',
        borderRadius: '10px',
        marginTop: '1rem',
        position: 'relative',
        zIndex: 1,
        backdropFilter: 'blur(10px)',
        border: `2px solid ${currentTheme.primaryColor}30`,
        boxShadow: `0 4px 16px ${currentTheme.shadowColor}`
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Map Legend:</h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '0.5rem',
          fontSize: '0.9rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#FFC30B', border: '1px solid #000' }}></div>
            <span>Completed Games</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#000000', border: '1px solid #000' }}></div>
            <span>Current Game</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#FFC30B', border: '1px solid #000' }}></div>
            <span>Available Games</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#FFC30B', border: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>★</div>
            <span>Stage Start</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdventureMap;
