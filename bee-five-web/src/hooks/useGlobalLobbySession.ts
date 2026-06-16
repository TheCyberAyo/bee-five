'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { mgMultiplayerService, userIdsEqual, isChallengeAccepted } from '../services/mgMultiplayerService';
import {
  canPlayLiveMatches,
  ensureXpInitialized,
  getXp,
  liveMatchesRequiresXpMessage,
} from '../services/xpService';

export interface GlobalLobbyMatch {
  matchId: string;
  opponentId: string;
  opponentUsername: string;
}

interface UseGlobalLobbySessionOptions {
  user: User | null;
  /** When false, Live Matches flow handles challenges instead. */
  routeChallenges: boolean;
  /** When false, SchoolLobby owns joinLobby (avoids competing channel joins). */
  manageLobbyPresence?: boolean;
  onOpenMatch: (match: GlobalLobbyMatch) => void;
  onToast?: (message: string) => void;
}

export function useGlobalLobbySession({
  user,
  routeChallenges,
  manageLobbyPresence = true,
  onOpenMatch,
  onToast,
}: UseGlobalLobbySessionOptions) {
  const [incomingChallenge, setIncomingChallenge] = useState<Record<string, unknown> | null>(
    null,
  );
  const identityRef = useRef<{ userId: string; username: string; elo: number } | null>(null);
  const lastOpenedMatchRef = useRef<{ id: string; at: number } | null>(null);

  const openMatchIfNew = useCallback(
    (match: GlobalLobbyMatch) => {
      if (!match.matchId || !match.opponentId) return;
      const now = Date.now();
      const last = lastOpenedMatchRef.current;
      if (last && last.id === match.matchId && now - last.at < 8000) return;
      lastOpenedMatchRef.current = { id: match.matchId, at: now };
      onOpenMatch(match);
    },
    [onOpenMatch],
  );

  useEffect(() => {
    if (!user) {
      identityRef.current = null;
      return;
    }

    let cancelled = false;
    const unsubs: (() => void)[] = [];

    if (manageLobbyPresence) {
      void (async () => {
        const joined = await mgMultiplayerService.joinLobbyFromCurrentProfile();
        if (cancelled || !joined) return;
        const identity = mgMultiplayerService.lobbyIdentitySnapshot;
        if (identity) {
          identityRef.current = {
            userId: identity.userId,
            username: identity.username,
            elo: identity.elo,
          };
        }
      })();
    } else {
      const identity = mgMultiplayerService.lobbyIdentitySnapshot;
      if (identity) {
        identityRef.current = {
          userId: identity.userId,
          username: identity.username,
          elo: identity.elo,
        };
      }
    }

    unsubs.push(
      mgMultiplayerService.onChallenge((payload) => {
        if (!routeChallenges || !mgMultiplayerService.shouldRouteLobbyChallenges) return;
        const id = identityRef.current;
        if (!id || !userIdsEqual(payload.to_id, id.userId)) return;
        setIncomingChallenge(payload);
      }),
      mgMultiplayerService.onChallengeResponse((payload) => {
        if (!routeChallenges || !mgMultiplayerService.shouldRouteLobbyChallenges) return;
        const id = identityRef.current;
        if (!id || !userIdsEqual(payload.challenger_id, id.userId)) return;
        if (isChallengeAccepted(payload.accepted)) {
          openMatchIfNew({
            matchId: payload.match_id?.toString() ?? '',
            opponentId: payload.responder_id?.toString() ?? '',
            opponentUsername: payload.responder_username?.toString() ?? 'Player',
          });
          return;
        }
        const name = payload.responder_username?.toString() ?? 'Player';
        onToast?.(`${name} declined your challenge`);
      }),
      mgMultiplayerService.onMatchStart((payload) => {
        if (!routeChallenges || !mgMultiplayerService.shouldRouteLobbyChallenges) return;
        openMatchIfNew({
          matchId: payload.match_id?.toString() ?? '',
          opponentId: payload.opponent_id?.toString() ?? '',
          opponentUsername: payload.opponent_username?.toString() ?? 'Player',
        });
      }),
    );

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [user, routeChallenges, manageLobbyPresence, openMatchIfNew, onToast]);

  const clearIncomingChallenge = useCallback(() => setIncomingChallenge(null), []);

  const onLeftSchoolLobby = useCallback(() => {
    identityRef.current = null;
    setIncomingChallenge(null);
  }, []);

  const restoreIdleAfterMatch = useCallback(async () => {
    const identity = mgMultiplayerService.lobbyIdentitySnapshot ?? identityRef.current;
    if (!identity) return;
    identityRef.current = {
      userId: identity.userId,
      username: identity.username,
      elo: identity.elo,
    };
    ensureXpInitialized();
    const xp = getXp();
    await mgMultiplayerService.setIdle(identity.userId, identity.username, identity.elo, xp);
  }, []);

  const acceptIncomingChallenge = useCallback(async () => {
    const id = identityRef.current;
    if (!id || !incomingChallenge) return;

    const challengerId = incomingChallenge.from_id?.toString() ?? '';
    const theirMatchId = incomingChallenge.match_id?.toString() ?? '';
    const matchId = mgMultiplayerService.matchIdForChallengeAccept(challengerId, theirMatchId);

    await mgMultiplayerService.respondToChallenge({
      matchId,
      challengerId,
      accepted: true,
      responderId: id.userId,
      responderUsername: id.username,
    });

    setIncomingChallenge(null);
    openMatchIfNew({
      matchId,
      opponentId: challengerId,
      opponentUsername: incomingChallenge.from_username?.toString() ?? 'Player',
    });
  }, [incomingChallenge, openMatchIfNew]);

  const declineIncomingChallenge = useCallback(async () => {
    const id = identityRef.current;
    if (!id || !incomingChallenge) return;

    await mgMultiplayerService.respondToChallenge({
      matchId: incomingChallenge.match_id?.toString() ?? '',
      challengerId: incomingChallenge.from_id?.toString() ?? '',
      accepted: false,
      responderId: id.userId,
      responderUsername: id.username,
    });
    setIncomingChallenge(null);
  }, [incomingChallenge]);

  return {
    incomingChallenge,
    clearIncomingChallenge,
    acceptIncomingChallenge,
    declineIncomingChallenge,
    onLeftSchoolLobby,
    restoreIdleAfterMatch,
    identity: identityRef.current,
    acceptBlockedReason: canPlayLiveMatches(getXp()) ? null : liveMatchesRequiresXpMessage,
  };
}
