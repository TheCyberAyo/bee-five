"use client";

import React, { useState, useEffect } from 'react';
import { soundManager } from '../utils/sounds';

interface SettingsProps {
  onBackToMenu: () => void;
  isMobile: boolean;
  backgroundColor: 'yellow' | 'black';
  onBackgroundColorChange: (color: 'yellow' | 'black') => void;
}

export default function Settings({ 
  onBackToMenu, 
  isMobile, 
  backgroundColor,
  onBackgroundColorChange 
}: SettingsProps) {
  const [volume, setVolume] = useState(soundManager.getVolume());
  const [isMuted, setIsMuted] = useState(soundManager.isSoundMuted());

  // Sync volume changes with sound manager
  useEffect(() => {
    soundManager.setVolume(volume);
    soundManager.setMuted(isMuted);
  }, [volume, isMuted]);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(false); // Unmute when adjusting volume
    soundManager.playClickSound();
  };

  const handleMuteToggle = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    soundManager.playClickSound();
  };

  const handleTestSound = () => {
    soundManager.playBuzzSound();
  };
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
      {/* Main content card */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.95)',
        borderRadius: isMobile ? '20px' : 'clamp(15px, 3vw, 25px)',
        padding: isMobile ? '1.5rem 1rem' : 'clamp(2rem, 4vw, 3rem)',
        width: isMobile ? '90vw' : 'auto',
        maxWidth: isMobile ? '90vw' : '800px',
        minHeight: isMobile ? 'auto' : '80vh',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 0 0 3px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)',
        textAlign: 'left',
        position: 'relative',
        zIndex: 1,
        margin: '0 auto',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        overflowY: 'auto',
        flex: isMobile ? 'none' : '0 1 auto'
      }}>
        {/* Title */}
        <h1 style={{ 
          fontSize: isMobile ? 'clamp(1.5rem, 8vw, 2rem)' : 'clamp(2rem, 4vw, 2.5rem)', 
          color: '#FFC30B',
          textShadow: '2px 2px 0px black',
          margin: '0 0 clamp(1.5rem, 3vw, 2rem) 0',
          lineHeight: '1.2',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          ⚙️ Settings ⚙️
        </h1>

        {/* Content */}
        <div style={{
          color: '#ffffff',
          fontSize: isMobile ? 'clamp(0.9rem, 2.5vw, 1rem)' : 'clamp(1rem, 1.5vw, 1.1rem)',
          lineHeight: '1.8',
          marginBottom: '2rem'
        }}>
          {/* Background Color Setting */}
          <div style={{
            marginBottom: '2.5rem'
          }}>
            <h3 style={{
              fontSize: isMobile ? 'clamp(1.1rem, 3vw, 1.3rem)' : 'clamp(1.3rem, 2vw, 1.5rem)',
              color: '#FFC30B',
              marginBottom: '1.5rem',
              fontWeight: 'bold'
            }}>
              🎨 Background Color
            </h3>
            
            <p style={{ marginBottom: '1.5rem' }}>
              Choose your preferred background color for the game boards:
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {/* Yellow Option */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                border: backgroundColor === 'yellow' ? '3px solid #FFC30B' : '2px solid #666',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: backgroundColor === 'yellow' ? 'rgba(255, 195, 11, 0.1)' : 'transparent'
              }}>
                <input
                  type="radio"
                  name="backgroundColor"
                  value="yellow"
                  checked={backgroundColor === 'yellow'}
                  onChange={() => {
                    onBackgroundColorChange('yellow');
                    soundManager.playClickSound();
                  }}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    accentColor: '#FFC30B'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.25rem'
                  }}>
                    <span style={{ fontSize: '1.5em' }}>💛</span>
                    <span style={{
                      fontWeight: 'bold',
                      color: '#FFC30B',
                      fontSize: '1.1rem'
                    }}>
                      Yellow (Default)
                    </span>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '0.9rem',
                    color: 'rgba(255,255,255,0.7)'
                  }}>
                    Classic bee-themed yellow gradient background
                  </p>
                </div>
              </label>

              {/* Black Option */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                border: backgroundColor === 'black' ? '3px solid #FFC30B' : '2px solid #666',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: backgroundColor === 'black' ? 'rgba(255, 195, 11, 0.1)' : 'transparent'
              }}>
                <input
                  type="radio"
                  name="backgroundColor"
                  value="black"
                  checked={backgroundColor === 'black'}
                  onChange={() => {
                    onBackgroundColorChange('black');
                    soundManager.playClickSound();
                  }}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    accentColor: '#FFC30B'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.25rem'
                  }}>
                    <span style={{ fontSize: '1.5em' }}>⚫</span>
                    <span style={{
                      fontWeight: 'bold',
                      color: '#FFC30B',
                      fontSize: '1.1rem'
                    }}>
                      Black
                    </span>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '0.9rem',
                    color: 'rgba(255,255,255,0.7)'
                  }}>
                    Sleek black background for reduced eye strain
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Sound Settings */}
          <div style={{
            marginBottom: '2.5rem'
          }}>
            <h3 style={{
              fontSize: isMobile ? 'clamp(1.1rem, 3vw, 1.3rem)' : 'clamp(1.3rem, 2vw, 1.5rem)',
              color: '#FFC30B',
              marginBottom: '1.5rem',
              fontWeight: 'bold'
            }}>
              🔊 Sound Settings
            </h3>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              {/* Mute Toggle */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                border: '2px solid #666',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: isMuted ? 'rgba(255, 0, 0, 0.1)' : 'transparent'
              }}>
                <input
                  type="checkbox"
                  checked={isMuted}
                  onChange={handleMuteToggle}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    accentColor: '#FFC30B'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.25rem'
                  }}>
                    <span style={{ fontSize: '1.5em' }}>{isMuted ? '🔇' : '🔊'}</span>
                    <span style={{
                      fontWeight: 'bold',
                      color: '#FFC30B',
                      fontSize: '1.1rem'
                    }}>
                      {isMuted ? 'Muted' : 'Sound Enabled'}
                    </span>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '0.9rem',
                    color: 'rgba(255,255,255,0.7)'
                  }}>
                    {isMuted ? 'All game sounds are currently disabled' : 'Enable sound effects for moves, wins, and clicks'}
                  </p>
                </div>
              </label>

              {/* Volume Slider */}
              <div style={{
                padding: '1rem',
                border: '2px solid #666',
                borderRadius: '12px',
                opacity: isMuted ? 0.5 : 1
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.3em' }}>🔊</span>
                  <span style={{
                    fontWeight: 'bold',
                    color: '#FFC30B',
                    fontSize: '1rem'
                  }}>
                    Volume
                  </span>
                  <span style={{
                    marginLeft: 'auto',
                    color: '#FFC30B',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    minWidth: '50px'
                  }}>
                    {Math.round(volume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    background: `linear-gradient(to right, #FFC30B 0%, #FFC30B ${volume * 100}%, #666 ${volume * 100}%, #666 100%)`,
                    outline: 'none',
                    cursor: isMuted ? 'not-allowed' : 'pointer'
                  }}
                  disabled={isMuted}
                />
                <p style={{
                  margin: '0.5rem 0 0 0',
                  fontSize: '0.85rem',
                  color: 'rgba(255,255,255,0.6)',
                  fontStyle: 'italic'
                }}>
                  Move pieces, win games, and listen to the buzz!
                </p>
              </div>

              {/* Test Sound Button */}
              <button
                onClick={handleTestSound}
                disabled={isMuted}
                style={{
                  padding: '1rem',
                  backgroundColor: isMuted ? '#666' : '#FFC30B',
                  color: 'black',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: isMuted ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: isMuted ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isMuted && !isMobile) {
                    e.currentTarget.style.backgroundColor = '#ffd740';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMuted && !isMobile) {
                    e.currentTarget.style.backgroundColor = '#FFC30B';
                  }
                }}
              >
                <span>🐝</span>
                <span>Test Sound</span>
              </button>
            </div>
          </div>

          <div style={{
            textAlign: 'center',
            marginTop: '2rem',
            paddingTop: '2rem',
            borderTop: '1px solid rgba(255, 195, 11, 0.3)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: isMobile ? '0.85rem' : '0.9rem'
          }}>
            © 2025 Bee-Five. Product of MindGrind.
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={() => {
            onBackToMenu();
            soundManager.playClickSound();
          }}
          style={{
            padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
            fontSize: isMobile ? '0.9rem' : '1rem',
            fontWeight: 'bold',
            backgroundColor: '#666',
            color: 'white',
            border: '2px solid black',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginTop: 'auto',
            alignSelf: 'center',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.backgroundColor = '#777';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.backgroundColor = '#666';
            }
          }}
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
}

