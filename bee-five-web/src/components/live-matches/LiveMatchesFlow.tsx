'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { mgMultiplayerService, type JoinSchoolOutcome } from '../../services/mgMultiplayerService';
import {
  canPlayLiveMatches,
  ensureXpInitialized,
  getXp,
  liveMatchesRequiresXpMessage,
} from '../../services/xpService';
import { multiplayerTheme, yellowDialogStyle } from '../../constants/multiplayerTheme';
import JoinSchoolDialog from './JoinSchoolDialog';
import SchoolLobby from './SchoolLobby';
import LiveMatchScreen from './LiveMatchScreen';
import ChallengeDialog from './ChallengeDialog';
import { useAuth } from '../../contexts/AuthContext';
import AuthModal from '../Auth/AuthModal';

interface LobbyProfile {
  schoolId: string;
  userId: string;
  username: string;
  elo: number;
}

interface ActiveMatch {
  matchId: string;
  opponentId: string;
  opponentUsername: string;
}

interface LiveMatchesFlowProps {
  onBackToMenu: () => void;
  initialActiveMatch?: ActiveMatch | null;
  onInitialMatchConsumed?: () => void;
  onRestoreGlobalLobby?: () => void;
}

export default function LiveMatchesFlow({
  onBackToMenu,
  initialActiveMatch = null,
  onInitialMatchConsumed,
  onRestoreGlobalLobby,
}: LiveMatchesFlowProps) {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<LobbyProfile | null>(null);
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(initialActiveMatch);
  const [lobbyXp, setLobbyXp] = useState(getXp());
  const [toast, setToast] = useState<string | null>(null);
  const [incomingChallenge, setIncomingChallenge] = useState<Record<string, unknown> | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalSignUp, setAuthModalSignUp] = useState(false);
  const [xpGate, setXpGate] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const openMatch = useCallback(
    (match: ActiveMatch) => {
      setActiveMatch(match);
      setIncomingChallenge(null);
    },
    [],
  );

  const loadProfile = useCallback(async (): Promise<LobbyProfile | null> => {
    if (!supabase || !user) return null;

    const { data: rows, error } = await supabase
      .from('mg_profiles')
      .select('school_id, username, elo')
      .eq('id', user.id)
      .limit(1);

    if (error || !rows?.length) return null;

    const row = rows[0] as Record<string, unknown>;
    const schoolId = row.school_id?.toString().trim();
    if (!schoolId) return null;

    const rawName = row.username?.toString().trim();
    let username = rawName && rawName.length > 0 ? rawName : 'Player';
    if (!rawName) {
      const meta = user.user_metadata?.username;
      if (meta && String(meta).trim()) username = String(meta).trim();
      else if (user.email?.includes('@')) username = user.email.split('@')[0];
    }

    const eloRaw = row.elo;
    const elo =
      typeof eloRaw === 'number' ? Math.trunc(eloRaw) : parseInt(String(eloRaw ?? '1200'), 10) || 1200;

    return { schoolId, userId: user.id, username, elo };
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    void (async () => {
      setLoading(true);
      setXpGate(false);
      setProfile(null);

      if (!user) {
        setLoading(false);
        return;
      }

      ensureXpInitialized();
      const xp = getXp();
      setLobbyXp(xp);

      if (!canPlayLiveMatches(xp)) {
        setXpGate(true);
        setLoading(false);
        return;
      }

      const p = await loadProfile();
      setProfile(p);
      setLoading(false);
    })();
  }, [user, authLoading, loadProfile]);

  useEffect(() => {
    if (!initialActiveMatch) return;
    setActiveMatch(initialActiveMatch);
    onInitialMatchConsumed?.();
  }, [initialActiveMatch, onInitialMatchConsumed]);

  useEffect(() => {
    if (!profile || activeMatch) return;

    const unsubs = [
      mgMultiplayerService.onChallenge((payload) => {
        if (!mgMultiplayerService.shouldRouteLobbyChallenges) return;
        if (payload.to_id?.toString() !== profile.userId) return;
        setIncomingChallenge(payload);
      }),
      mgMultiplayerService.onChallengeResponse((payload) => {
        if (!mgMultiplayerService.shouldRouteLobbyChallenges) return;
        if (payload.challenger_id?.toString() !== profile.userId) return;
        if (payload.accepted === true) {
          const responderId = payload.responder_id?.toString() ?? '';
          const responderName = payload.responder_username?.toString() ?? 'Player';
          openMatch({
            matchId: payload.match_id?.toString() ?? '',
            opponentId: responderId,
            opponentUsername: responderName,
          });
        } else {
          const name = payload.responder_username?.toString() ?? 'Player';
          setToast(`${name} declined your challenge`);
        }
      }),
      mgMultiplayerService.onMatchStart((payload) => {
        if (!mgMultiplayerService.shouldRouteLobbyChallenges) return;
        openMatch({
          matchId: payload.match_id?.toString() ?? '',
          opponentId: payload.opponent_id?.toString() ?? '',
          opponentUsername: payload.opponent_username?.toString() ?? 'Player',
        });
      }),
    ];

    return () => unsubs.forEach((u) => u());
  }, [profile, activeMatch, openMatch]);

  const onJoinedSchool = (outcome: JoinSchoolOutcome) => {
    if (!outcome.isSuccess || !outcome.schoolId || !outcome.userId || !outcome.username) return;
    setProfile({
      schoolId: outcome.schoolId,
      userId: outcome.userId,
      username: outcome.username,
      elo: outcome.elo ?? 1200,
    });
  };

  const openAuthModal = (signUp: boolean) => {
    setAuthModalSignUp(signUp);
    setShowAuthModal(true);
  };

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', background: multiplayerTheme.scaffoldBackground, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <GateDialog title="Live Matches" onClose={onBackToMenu}>
          <p style={{ margin: '0 0 1.25rem', fontSize: '16px', color: 'rgba(0,0,0,0.87)' }}>
            You need to sign in or sign up to play Live Matches.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <GateLinkButton onClick={() => openAuthModal(true)}>Sign Up</GateLinkButton>
            <GateLinkButton onClick={() => openAuthModal(false)}>Sign In</GateLinkButton>
            <GateLinkButton onClick={onBackToMenu}>Exit</GateLinkButton>
          </div>
        </GateDialog>
        {showAuthModal && (
          <AuthModal
            initialSignUp={authModalSignUp}
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => setShowAuthModal(false)}
          />
        )}
      </>
    );
  }

  if (xpGate) {
    return (
      <GateDialog title="Live Matches" onClose={onBackToMenu}>
        <p style={{ margin: '0 0 1.25rem', fontSize: '16px', color: 'rgba(0,0,0,0.87)' }}>
          {liveMatchesRequiresXpMessage}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <GateLinkButton onClick={onBackToMenu}>OK</GateLinkButton>
        </div>
      </GateDialog>
    );
  }

  if (activeMatch && profile) {
    return (
      <LiveMatchScreen
        key={activeMatch.matchId}
        matchId={activeMatch.matchId}
        myId={profile.userId}
        myUsername={profile.username}
        myElo={profile.elo}
        opponentId={activeMatch.opponentId}
        opponentUsername={activeMatch.opponentUsername}
        lobbyBeeFiveXp={lobbyXp}
        onBackToLobby={() => {
          setActiveMatch(null);
          ensureXpInitialized();
          setLobbyXp(getXp());
          onRestoreGlobalLobby?.();
        }}
        onRematch={(matchId, opponentId, opponentUsername) => {
          setActiveMatch({ matchId, opponentId, opponentUsername });
        }}
      />
    );
  }

  if (!profile) {
    return (
      <GateDialog title="Live Matches" onClose={onBackToMenu}>
        <p style={{ margin: '0 0 1rem', fontSize: '16px', color: 'rgba(0,0,0,0.87)' }}>
          Join a school or the default lobby to play with others online.
        </p>
        <JoinSchoolDialog variant="panel" allowSkip={false} onJoined={onJoinedSchool} />
      </GateDialog>
    );
  }

  return (
    <>
      <SchoolLobby
        schoolId={profile.schoolId}
        userId={profile.userId}
        username={profile.username}
        elo={profile.elo}
        onBack={onBackToMenu}
        onChallengeSent={setToast}
      />

      {incomingChallenge && (
        <ChallengeDialog
          fromUsername={incomingChallenge.from_username?.toString() ?? 'Player'}
          fromElo={parseInt(String(incomingChallenge.from_elo ?? profile.elo), 10) || profile.elo}
          acceptBlockedReason={
            canPlayLiveMatches(getXp()) ? null : liveMatchesRequiresXpMessage
          }
          onAccept={async () => {
            const challengerId = incomingChallenge.from_id?.toString() ?? '';
            const theirMatchId = incomingChallenge.match_id?.toString() ?? '';
            const matchId = mgMultiplayerService.matchIdForChallengeAccept(
              challengerId,
              theirMatchId,
            );
            await mgMultiplayerService.respondToChallenge({
              matchId,
              challengerId,
              accepted: true,
              responderId: profile.userId,
              responderUsername: profile.username,
            });
            setIncomingChallenge(null);
            openMatch({
              matchId,
              opponentId: challengerId,
              opponentUsername: incomingChallenge.from_username?.toString() ?? 'Player',
            });
          }}
          onDecline={async () => {
            await mgMultiplayerService.respondToChallenge({
              matchId: incomingChallenge.match_id?.toString() ?? '',
              challengerId: incomingChallenge.from_id?.toString() ?? '',
              accepted: false,
              responderId: profile.userId,
              responderUsername: profile.username,
            });
            setIncomingChallenge(null);
          }}
        />
      )}

      {toast && (
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
          {toast}
        </div>
      )}
    </>
  );
}

function GateLinkButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        fontWeight: 800,
        fontSize: '16px',
        color: '#000',
        cursor: 'pointer',
        textDecoration: 'underline',
      }}
    >
      {children}
    </button>
  );
}

function GateDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: multiplayerTheme.scaffoldBackground,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 1000,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        style={{ position: 'absolute', top: 16, left: 16, background: 'none', border: 'none', fontWeight: 800, cursor: 'pointer' }}
      >
        ← Back
      </button>
      <div style={yellowDialogStyle}>
        <h2 style={{ marginTop: 0, fontWeight: 800 }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
