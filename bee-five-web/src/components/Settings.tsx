"use client";

import React, { useState, useEffect } from 'react';
import { soundManager } from '../utils/sounds';
import { useAuth } from '../contexts/AuthContext';
import { resetAdventureProgress } from '../services/progressService';
import { supabase } from '../lib/supabase';
import { displayUsernameFromUser, supabaseProjectRef } from '../lib/supabaseProject';

const LOCAL_PROGRESS_KEY_PREFIX = 'beeAdventureProgress:';

import { mgMultiplayerService } from '../services/mgMultiplayerService';

interface SettingsProps {
  onBackToMenu: () => void;
  isMobile: boolean;
  onLeftSchoolLobby?: () => void;
}

export default function Settings({ 
  onBackToMenu, 
  isMobile,
  onLeftSchoolLobby,
}: SettingsProps) {
  const { user, signIn, signOut } = useAuth();
  const [volume, setVolume] = useState(soundManager.getVolume());
  const [isMuted, setIsMuted] = useState(soundManager.isSoundMuted());
  const [signingOut, setSigningOut] = useState(false);

  // Password confirmation modal for account/danger actions
  const [confirmModal, setConfirmModal] = useState<'reset' | 'delete' | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState('');
  const [leaveLobbyLoading, setLeaveLobbyLoading] = useState(false);
  const [leaveLobbyMessage, setLeaveLobbyMessage] = useState('');
  const [showLeaveLobbyConfirm, setShowLeaveLobbyConfirm] = useState(false);
  const [onlineProfile, setOnlineProfile] = useState<{
    username: string;
    schoolJoinCode: string | null;
    schoolName: string | null;
  } | null>(null);

  const projectRef = supabaseProjectRef();
  const authUsername = displayUsernameFromUser(user);

  useEffect(() => {
    if (!user || !supabase) {
      setOnlineProfile(null);
      return;
    }
    void (async () => {
      const { data: rows } = await supabase
        .from('mg_profiles')
        .select('username, school_id, mg_schools(name, join_code)')
        .eq('id', user.id)
        .limit(1);
      const row = rows?.[0] as Record<string, unknown> | undefined;
      if (!row) {
        setOnlineProfile(null);
        return;
      }
      const schools = row.mg_schools;
      let schoolName: string | null = null;
      let schoolJoinCode: string | null = null;
      if (schools && typeof schools === 'object' && !Array.isArray(schools)) {
        schoolName = (schools as Record<string, unknown>).name?.toString().trim() || null;
        schoolJoinCode = (schools as Record<string, unknown>).join_code?.toString().trim().toUpperCase() || null;
      }
      setOnlineProfile({
        username: row.username?.toString().trim() || authUsername || 'Player',
        schoolJoinCode,
        schoolName,
      });
    })();
  }, [user, authUsername]);

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

  const handleSignOut = () => {
    if (signingOut) return;
    setSigningOut(true);
    soundManager.playClickSound();
    signOut().catch(() => {});
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
  };

  const handleLeaveSchoolLobby = async () => {
    setLeaveLobbyLoading(true);
    setLeaveLobbyMessage('');
    const outcome = await mgMultiplayerService.leaveSchoolLobby();
    setLeaveLobbyLoading(false);
    setShowLeaveLobbyConfirm(false);
    if (!outcome.isSuccess) {
      setLeaveLobbyMessage(outcome.errorMessage ?? 'Could not leave lobby.');
      return;
    }
    onLeftSchoolLobby?.();
    setLeaveLobbyMessage(
      outcome.unlinkedSchool
        ? 'You left the school lobby. Join again anytime from Live Matches.'
        : 'You are not linked to a school lobby.',
    );
  };

  const openConfirmModal = (action: 'reset' | 'delete') => {
    setConfirmModal(action);
    setConfirmPassword('');
    setConfirmError('');
    setConfirmSuccess('');
  };

  const closeConfirmModal = () => {
    setConfirmModal(null);
    setConfirmPassword('');
    setConfirmError('');
    setConfirmSuccess('');
    setConfirmLoading(false);
  };

  const handleConfirmSubmit = async () => {
    if (!user?.email) {
      setConfirmError('You must be signed in.');
      return;
    }
    if (!confirmPassword.trim()) {
      setConfirmError('Please enter your password.');
      return;
    }
    setConfirmError('');
    setConfirmLoading(true);
    try {
      const { error } = await signIn(user.email, confirmPassword.trim());
      if (error) {
        setConfirmError(error.message || 'Incorrect password.');
        setConfirmLoading(false);
        return;
      }
      if (confirmModal === 'reset') {
        const ok = await resetAdventureProgress(user.id);
        if (ok) {
          if (typeof window !== 'undefined') {
            try {
              window.localStorage.removeItem(`${LOCAL_PROGRESS_KEY_PREFIX}${user.id}`);
            } catch (_) {}
          }
          setConfirmSuccess('Adventure progress has been reset. You will start from level 1.');
          soundManager.playClickSound();
        } else {
          setConfirmError('Failed to reset progress. Please try again.');
        }
      } else if (confirmModal === 'delete') {
        setConfirmSuccess('Account deletion must be requested via support. Please contact us to permanently delete your account.');
        soundManager.playClickSound();
      }
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Something went wrong.');
    }
    setConfirmLoading(false);
  };

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #FFC30B 0%, #FFD700 50%, #FFC30B 100%)',
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100vw',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'visible',
      boxSizing: 'border-box'
    }}>
      {/* Fixed Header */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(0, 0, 0, 0.95)',
        backdropFilter: 'blur(10px)',
        padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        zIndex: 1000
      }}>
        <h1 style={{ 
          fontSize: isMobile ? 'clamp(1.2rem, 4vw, 1.5rem)' : 'clamp(1.5rem, 3vw, 2rem)', 
          color: '#FFC30B',
          textShadow: '2px 2px 0px black',
          margin: 0,
          lineHeight: '1.2',
          fontWeight: 'bold'
        }}>
          ⚙️ Settings ⚙️
        </h1>
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

      {/* Main content card with top padding for fixed header */}
      <div style={{
        marginTop: isMobile ? '80px' : '90px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isMobile ? '1rem 0.75rem' : 'clamp(1rem, 2vw, 2rem)',
        width: '100%'
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
        {/* Content */}
        <div style={{
          color: '#ffffff',
          fontSize: isMobile ? 'clamp(0.9rem, 2.5vw, 1rem)' : 'clamp(1rem, 1.5vw, 1.1rem)',
          lineHeight: '1.8',
          marginBottom: '2rem'
        }}>
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
                <span>🔊</span>
                <span>Test Sound</span>
              </button>
            </div>
          </div>

          {/* Online connection — same Supabase project as mobile */}
          {user && (
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{
                fontSize: isMobile ? 'clamp(1.1rem, 3vw, 1.3rem)' : 'clamp(1.3rem, 2vw, 1.5rem)',
                color: '#FFC30B',
                marginBottom: '1rem',
                fontWeight: 'bold',
              }}>
                🌐 Online connection
              </h3>
              <div style={{
                padding: '1rem',
                borderRadius: '12px',
                border: '2px solid rgba(255,195,11,0.35)',
                backgroundColor: 'rgba(0,0,0,0.25)',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                color: 'rgba(255,255,255,0.9)',
              }}>
                <p style={{ margin: '0 0 0.5rem' }}>
                  <strong>Supabase project:</strong>{' '}
                  {projectRef ?? 'not configured'}
                </p>
                <p style={{ margin: '0 0 0.5rem' }}>
                  <strong>Signed in as:</strong> {authUsername ?? 'unknown'}
                </p>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', opacity: 0.75 }}>
                  User id: {user.id}
                </p>
                {onlineProfile ? (
                  <>
                    <p style={{ margin: '0 0 0.5rem' }}>
                      <strong>Lobby profile:</strong> {onlineProfile.username}
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>School:</strong>{' '}
                      {onlineProfile.schoolName ?? 'not joined'}
                      {onlineProfile.schoolJoinCode ? ` (${onlineProfile.schoolJoinCode})` : ''}
                    </p>
                  </>
                ) : (
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)' }}>
                    No online profile yet — open Live Matches after signing in.
                  </p>
                )}
                <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: 'rgba(255,195,11,0.9)' }}>
                  Mobile uses the same project ({projectRef}). If lists look empty, sign in with the
                  <strong> same username and password</strong> as on the phone — a separate web signup is a different player.
                </p>
              </div>
            </div>
          )}

          {/* Account & data — password required for reset / delete */}
          {user && (
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{
                fontSize: isMobile ? 'clamp(1.1rem, 3vw, 1.3rem)' : 'clamp(1.3rem, 2vw, 1.5rem)',
                color: '#FFC30B',
                marginBottom: '1rem',
                fontWeight: 'bold'
              }}>
                🔐 Account & data
              </h3>
              <p style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>
                School lobby — leave the school or default lobby you joined. You can link again later from Live Matches.
              </p>
              {leaveLobbyMessage && (
                <p style={{ marginBottom: '1rem', color: leaveLobbyMessage.includes('left') ? '#8f8' : '#f88', fontSize: '0.9rem' }}>
                  {leaveLobbyMessage}
                </p>
              )}
              <button
                type="button"
                disabled={leaveLobbyLoading}
                onClick={() => { soundManager.playClickSound(); setShowLeaveLobbyConfirm(true); }}
                style={{
                  padding: '1rem',
                  marginBottom: '1.25rem',
                  backgroundColor: 'transparent',
                  color: '#FFC30B',
                  border: '2px solid rgba(255, 195, 11, 0.5)',
                  borderRadius: '12px',
                  cursor: leaveLobbyLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textAlign: 'left',
                  opacity: leaveLobbyLoading ? 0.6 : 1,
                }}
              >
                Leave school lobby
              </button>
              <p style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>
                These actions require your password to confirm.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button
                  onClick={() => { soundManager.playClickSound(); openConfirmModal('reset'); }}
                  style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(255, 180, 0, 0.2)',
                    color: '#FFC30B',
                    border: '2px solid #FFC30B',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    textAlign: 'left',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 195, 11, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 180, 0, 0.2)';
                  }}
                >
                  🔄 Reset adventure progress — start from level 1
                </button>
                <button
                  onClick={() => { soundManager.playClickSound(); openConfirmModal('delete'); }}
                  style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(200, 60, 60, 0.15)',
                    color: '#f88',
                    border: '2px solid #c44',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    textAlign: 'left',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile) {
                      e.currentTarget.style.backgroundColor = 'rgba(200, 60, 60, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(200, 60, 60, 0.15)';
                  }}
                >
                  🗑️ Delete account
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  style={{
                    padding: '1rem',
                    backgroundColor: signingOut ? '#666' : '#f44336',
                    color: '#fff',
                    border: '2px solid #000',
                    borderRadius: '12px',
                    cursor: signingOut ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile && !signingOut) {
                      e.currentTarget.style.backgroundColor = '#e53935';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!signingOut) {
                      e.currentTarget.style.backgroundColor = '#f44336';
                    }
                  }}
                >
                  {signingOut ? 'Signing out…' : 'Sign Out'}
                </button>
              </div>
            </div>
          )}

          <div style={{
            textAlign: 'center',
            marginTop: '2rem',
            paddingTop: '2rem',
            borderTop: '1px solid rgba(255, 195, 11, 0.3)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: isMobile ? '0.85rem' : '0.9rem'
          }}>
            © 2025 Bee Five. Product of MindGrind.
          </div>
        </div>
      </div>
      </div>

      {/* Password confirmation modal for reset / delete */}
      {confirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem'
          }}
          onClick={closeConfirmModal}
        >
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.98)',
              borderRadius: '16px',
              padding: isMobile ? '1.5rem' : '2rem',
              maxWidth: '400px',
              width: '100%',
              border: '2px solid #FFC30B',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: '#FFC30B', margin: '0 0 1rem 0', fontSize: '1.25rem' }}>
              {confirmModal === 'reset' ? 'Reset adventure progress' : 'Delete account'}
            </h3>
            {confirmSuccess ? (
              <>
                <p style={{ color: '#8f8', marginBottom: '1rem' }}>{confirmSuccess}</p>
                <button
                  onClick={() => { soundManager.playClickSound(); closeConfirmModal(); }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#FFC30B',
                    color: '#000',
                    border: '2px solid #000',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  OK
                </button>
              </>
            ) : (
              <>
                <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '1rem', fontSize: '0.95rem' }}>
                  {confirmModal === 'reset'
                    ? 'Enter your password to reset your adventure progress and start from level 1. This cannot be undone.'
                    : 'Enter your password to confirm account deletion. Account deletion must be completed via support.'}
                </p>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(''); }}
                  placeholder="Password"
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    marginBottom: '0.75rem',
                    borderRadius: '8px',
                    border: '2px solid #666',
                    background: '#222',
                    color: '#fff',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                />
                {confirmError && (
                  <p style={{ color: '#f66', marginBottom: '0.75rem', fontSize: '0.9rem' }}>{confirmError}</p>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { soundManager.playClickSound(); closeConfirmModal(); }}
                    disabled={confirmLoading}
                    style={{
                      padding: '0.75rem 1.25rem',
                      backgroundColor: '#555',
                      color: '#fff',
                      border: '2px solid #666',
                      borderRadius: '8px',
                      cursor: confirmLoading ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmSubmit}
                    disabled={confirmLoading || !confirmPassword.trim()}
                    style={{
                      padding: '0.75rem 1.25rem',
                      backgroundColor: confirmModal === 'delete' ? '#a44' : '#FFC30B',
                      color: confirmModal === 'delete' ? '#fff' : '#000',
                      border: '2px solid #000',
                      borderRadius: '8px',
                      cursor: confirmLoading || !confirmPassword.trim() ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    {confirmLoading ? 'Checking…' : 'Confirm'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showLeaveLobbyConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem',
          }}
          onClick={() => !leaveLobbyLoading && setShowLeaveLobbyConfirm(false)}
        >
          <div
            style={{
              background: '#FFC30B',
              borderRadius: '20px',
              border: '4px solid #000',
              padding: '1.5rem',
              maxWidth: '420px',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 0.75rem', fontWeight: 800, color: '#000' }}>Leave school lobby?</h3>
            <p style={{ margin: '0 0 1.25rem', color: 'rgba(0,0,0,0.87)', fontSize: '15px' }}>
              You will be removed from your current school or default lobby. Use Live Matches to enter a join code again when you want.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                disabled={leaveLobbyLoading}
                onClick={() => setShowLeaveLobbyConfirm(false)}
                style={{ background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={leaveLobbyLoading}
                onClick={() => void handleLeaveSchoolLobby()}
                style={{
                  background: '#000',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  fontWeight: 800,
                  cursor: leaveLobbyLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {leaveLobbyLoading ? 'Leaving…' : 'Leave lobby'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

