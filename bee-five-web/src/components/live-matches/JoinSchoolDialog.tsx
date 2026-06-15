'use client';

import React, { useState } from 'react';
import { mgMultiplayerService, type JoinSchoolOutcome } from '../../services/mgMultiplayerService';
import { primaryBlackButtonStyle, primaryYellowButtonStyle } from '../../constants/multiplayerTheme';

interface JoinSchoolDialogProps {
  allowSkip?: boolean;
  onJoined: (outcome: JoinSchoolOutcome) => void;
  onSkip?: () => void;
}

export default function JoinSchoolDialog({
  allowSkip = true,
  onJoined,
  onSkip,
}: JoinSchoolDialogProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Please enter your school’s join code');
      return;
    }
    setLoading(true);
    setError(null);
    const outcome = await mgMultiplayerService.joinSchool(trimmed);
    setLoading(false);
    if (outcome.isSuccess) onJoined(outcome);
    else setError(outcome.errorMessage ?? 'Could not join school.');
  };

  const handleDefaultLobby = async () => {
    setLoading(true);
    setError(null);
    const outcome = await mgMultiplayerService.joinDefaultLobby();
    setLoading(false);
    if (outcome.isSuccess) onJoined(outcome);
    else setError(outcome.errorMessage ?? 'Could not join default lobby.');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          border: '2px solid #000',
          padding: '1.5rem',
          maxWidth: '420px',
          width: '100%',
        }}
      >
        <h2 style={{ margin: '0 0 0.75rem', fontWeight: 800 }}>🏫 Join Your School</h2>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#FFC30B', marginBottom: '1rem' }}>
          Enter your school join code, or use the default lobby if you do not have one yet.
        </p>
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
          placeholder="e.g. 40ZAM26"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: `2px solid ${error ? '#c62828' : '#000'}`,
            borderRadius: '12px',
            fontSize: '1rem',
            boxSizing: 'border-box',
          }}
        />
        {error && (
          <p style={{ color: '#c62828', fontSize: '13px', marginTop: '0.5rem' }}>{error}</p>
        )}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            justifyContent: 'flex-end',
            marginTop: '1.25rem',
          }}
        >
          <button type="button" onClick={() => void handleDefaultLobby()} disabled={loading} style={primaryYellowButtonStyle}>
            Use default lobby
          </button>
          {allowSkip && onSkip && (
            <button type="button" onClick={onSkip} disabled={loading} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
              Skip for now
            </button>
          )}
          <button type="button" onClick={() => void submit()} disabled={loading} style={primaryBlackButtonStyle}>
            {loading ? '…' : 'Join school'}
          </button>
        </div>
      </div>
    </div>
  );
}
