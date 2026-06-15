'use client';

import React from 'react';
import { primaryBlackButtonStyle, yellowDialogStyle } from '../../constants/multiplayerTheme';

interface ChallengeDialogProps {
  fromUsername: string;
  fromElo: number;
  onAccept: () => void;
  onDecline: () => void;
  acceptBlockedReason?: string | null;
  isRematch?: boolean;
}

export default function ChallengeDialog({
  fromUsername,
  fromElo,
  onAccept,
  onDecline,
  acceptBlockedReason,
  isRematch = false,
}: ChallengeDialogProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem',
      }}
    >
      <div style={yellowDialogStyle}>
        <h3 style={{ margin: '0 0 0.75rem', fontWeight: 800, color: '#000' }}>
          {isRematch ? 'Rematch' : 'School lobby challenge'}
        </h3>
        <p style={{ textAlign: 'center', color: 'rgba(0,0,0,0.87)', margin: '0 0 0.5rem' }}>
          {isRematch
            ? `${fromUsername} wants a rematch.`
            : `${fromUsername} wants to play (from your school lobby).`}
        </p>
        <p style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.75rem' }}>
          {fromElo} ELO
        </p>
        {acceptBlockedReason && (
          <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(0,0,0,0.54)', marginBottom: '0.75rem' }}>
            {acceptBlockedReason}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" onClick={onDecline} style={{ background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={!!acceptBlockedReason}
            style={{ ...primaryBlackButtonStyle, opacity: acceptBlockedReason ? 0.5 : 1 }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
