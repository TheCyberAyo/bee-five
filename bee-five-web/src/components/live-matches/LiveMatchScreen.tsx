'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { mgMultiplayerService, parseEloChange, userIdsEqual } from '../../services/mgMultiplayerService';
import {
  onlineMatchFirstSeat,
  onlineMatchPlayer1Id,
  onlineMatchPlayer2Id,
} from '../../utils/onlineMatch';
import {
  ensureXpInitialized,
  getXp,
  canPlayLiveMatches,
  liveMatchesRequiresXpMessage,
  recordSchoolLobbyMatchOutcome,
} from '../../services/xpService';
import { winsForSeries, type HeadToHeadSeriesScore } from '../../utils/headToHeadSeries';
import { multiplayerTheme, primaryBlackButtonStyle, yellowDialogStyle } from '../../constants/multiplayerTheme';
import OnlineBeeFiveBoard, { type OnlineBeeFiveBoardHandle } from './OnlineBeeFiveBoard';
import ChallengeDialog from './ChallengeDialog';
import { useAuth } from '../../contexts/AuthContext';

export interface LiveMatchScreenProps {
  matchId: string;
  myId: string;
  myUsername: string;
  myElo: number;
  opponentId: string;
  opponentUsername: string;
  lobbyBeeFiveXp: number;
  onBackToLobby: () => void;
  onRematch?: (matchId: string, opponentId: string, opponentUsername: string) => void;
  restoreSearchingWhenLeaving?: boolean;
}

type EndDialog =
  | { kind: 'result'; winnerId: string; eloResult?: Record<string, unknown> }
  | { kind: 'draw'; payload: Record<string, unknown> }
  | { kind: 'void' };

export default function LiveMatchScreen({
  matchId,
  myId,
  myUsername,
  myElo,
  opponentId,
  opponentUsername,
  lobbyBeeFiveXp,
  onBackToLobby,
  onRematch,
  restoreSearchingWhenLeaving = false,
}: LiveMatchScreenProps) {
  const { session } = useAuth();
  const boardRef = useRef<OnlineBeeFiveBoardHandle>(null);
  const p1Id = onlineMatchPlayer1Id(myId, opponentId);
  const p2Id = onlineMatchPlayer2Id(myId, opponentId);
  const p1Name = p1Id === myId ? myUsername : opponentUsername;
  const p2Name = p2Id === myId ? myUsername : opponentUsername;

  const [priorMatchCount, setPriorMatchCount] = useState<number | null>(null);
  const [seriesScore, setSeriesScore] = useState<HeadToHeadSeriesScore | null>(null);
  const [matchEnded, setMatchEnded] = useState(false);
  const [waitingDrawConfirm, setWaitingDrawConfirm] = useState(false);
  const [endDialog, setEndDialog] = useState<EndDialog | null>(null);
  const [rematchChallenge, setRematchChallenge] = useState<Record<string, unknown> | null>(null);
  const [rematchHandled, setRematchHandled] = useState(false);
  const [resultXpRecorded, setResultXpRecorded] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const openingSeat =
    priorMatchCount != null ? onlineMatchFirstSeat(priorMatchCount) : 1;

  const refreshSeries = useCallback(async () => {
    const score = await mgMultiplayerService.fetchHeadToHeadSeriesScore(myId, opponentId);
    setSeriesScore(score);
  }, [myId, opponentId]);

  const enrichEloResult = useCallback(
    async (partial: Record<string, unknown> | undefined): Promise<Record<string, unknown> | undefined> => {
      const hasWinChanges =
        parseEloChange(partial?.winnerChange) != null
        || parseEloChange(partial?.loserChange) != null;
      const hasDrawChanges =
        parseEloChange(partial?.player1Change) != null
        || parseEloChange(partial?.player2Change) != null;
      if (hasWinChanges || hasDrawChanges) return partial;

      const row = await mgMultiplayerService.fetchLatestHeadToHeadMatch(myId, opponentId);
      if (!row) return partial;
      return { ...partial, ...mgMultiplayerService.eloResultFromMatchRow(row, myId) };
    },
    [myId, opponentId],
  );

  useEffect(() => {
    void mgMultiplayerService.prepareAuthenticatedSession(session);
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    mgMultiplayerService.notifyMatchScreenOpened();

    const unsubs = [
      mgMultiplayerService.onGameEvent((payload) => {
        boardRef.current?.applyRemoteMove(payload);
      }),
      mgMultiplayerService.onMatchOver((payload) => {
        void handleMatchOverBroadcast(payload);
      }),
    ];

    void (async () => {
      await mgMultiplayerService.setInMatch(myId, myUsername, myElo, lobbyBeeFiveXp);
      await mgMultiplayerService.joinMatch(matchId, myId, opponentId);
      if (cancelled) {
        await mgMultiplayerService.leaveMatch(matchId);
        return;
      }

      const [count, series] = await Promise.all([
        mgMultiplayerService.countCompletedMatchesBetween(myId, opponentId),
        mgMultiplayerService.fetchHeadToHeadSeriesScore(myId, opponentId),
      ]);
      if (!cancelled) {
        setPriorMatchCount(count);
        setSeriesScore(series);
      }
    })();

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
      void (async () => {
        if (mgMultiplayerService.isActiveMatch(matchId)) {
          await mgMultiplayerService.leaveMatch(matchId);
          await restoreLobbyPresence();
        }
        mgMultiplayerService.notifyMatchScreenClosed();
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const restoreLobbyPresence = async () => {
    ensureXpInitialized();
    const xp = getXp();
    if (restoreSearchingWhenLeaving) {
      await mgMultiplayerService.setSearching(myId, myUsername, myElo, xp);
    } else {
      await mgMultiplayerService.setIdle(myId, myUsername, myElo, xp);
    }
  };

  const finishMatchEnd = async (winnerId: string, submitToServer: boolean) => {
    if (matchEnded) return;
    setMatchEnded(true);

    const hadMoves = boardRef.current?.hasPlacedPieces ?? false;
    let result: Record<string, unknown> | undefined;

    if (submitToServer) {
      try {
        if (!hadMoves) {
          await mgMultiplayerService.submitMatchResult({
            player1Id: p1Id,
            player2Id: p2Id,
            isDraw: true,
            voidNoMoves: true,
          });
          setEndDialog({ kind: 'void' });
          await mgMultiplayerService.leaveMatch(matchId);
          return;
        } else {
          result = await mgMultiplayerService.submitMatchResult({
            player1Id: p1Id,
            player2Id: p2Id,
            winnerId,
          });
          const resolvedWinner =
            result.duplicate === true
              ? (result.winner_id?.toString() ?? winnerId)
              : winnerId;
          await refreshSeries();
          const eloResult = await enrichEloResult(result);
          setEndDialog({ kind: 'result', winnerId: resolvedWinner, eloResult });
        }
      } catch {
        setMatchEnded(false);
        setStatusMessage('Could not submit match. Check connection.');
        return;
      }
    } else {
      await refreshSeries();
      setEndDialog({ kind: 'result', winnerId, eloResult: undefined });
    }

    await mgMultiplayerService.leaveMatch(matchId);
  };

  const finishMatchDrawSubmit = async () => {
    if (matchEnded) return;
    setMatchEnded(true);
    setWaitingDrawConfirm(false);

    try {
      const result = await mgMultiplayerService.submitMatchResult({
        player1Id: p1Id,
        player2Id: p2Id,
        isDraw: true,
      });
      await mgMultiplayerService.leaveMatch(matchId);
      await refreshSeries();
      const eloResult = await enrichEloResult(result);
      setEndDialog({ kind: 'draw', payload: eloResult ?? result });
    } catch {
      setMatchEnded(false);
      setStatusMessage('Could not record draw. Try again.');
    }
  };

  const handleMatchOverBroadcast = async (payload: Record<string, unknown>) => {
    if (matchEnded) return;

    if (payload.reason === 'opponent_disconnected') {
      const wid = payload.winner_id?.toString();
      if (wid) await finishMatchEnd(wid, wid === myId);
      return;
    }

    if (payload.is_draw === true) {
      setMatchEnded(true);
      setWaitingDrawConfirm(false);
      await mgMultiplayerService.leaveMatch(matchId);
      if (payload.void_no_moves === true) {
        setEndDialog({ kind: 'void' });
        return;
      }
      const eloResult = await enrichEloResult(payload);
      setEndDialog({ kind: 'draw', payload: eloResult ?? payload });
      return;
    }

    const wid = payload.winner_id?.toString();
    if (!wid) return;

    setMatchEnded(true);
    await mgMultiplayerService.leaveMatch(matchId);
    await refreshSeries();
    const eloResult = await enrichEloResult({
      winnerChange: payload.winnerChange,
      loserChange: payload.loserChange,
      player1Change: payload.player1Change,
      player2Change: payload.player2Change,
    });
    setEndDialog({
      kind: 'result',
      winnerId: wid,
      eloResult,
    });
  };

  const onLocalWin = (winnerUserId: string) => {
    void finishMatchEnd(winnerUserId, true);
  };

  const onLocalDraw = () => {
    if (matchEnded || waitingDrawConfirm) return;
    if (myId.localeCompare(opponentId) < 0) {
      void finishMatchDrawSubmit();
    } else {
      setWaitingDrawConfirm(true);
    }
  };

  const sendMove = (event: Record<string, unknown>) =>
    mgMultiplayerService.sendGameEvent(myId, event);

  useEffect(() => {
    if (!endDialog || rematchHandled || endDialog.kind === 'void') return;

    const unsubs = [
      mgMultiplayerService.onChallenge((payload) => {
        if (payload.from_id?.toString() !== opponentId) return;
        setRematchChallenge(payload);
      }),
      mgMultiplayerService.onChallengeResponse((payload) => {
        if (payload.responder_id?.toString() !== opponentId) return;
        if (payload.accepted === true) {
          openRematch(payload.match_id?.toString() ?? '');
        } else {
          setStatusMessage(`${opponentUsername} declined the rematch`);
        }
      }),
      mgMultiplayerService.onMatchStart((payload) => {
        if (payload.opponent_id?.toString() !== opponentId) return;
        openRematch(payload.match_id?.toString() ?? '');
      }),
    ];

    return () => unsubs.forEach((u) => u());
  }, [endDialog, rematchHandled, opponentId, opponentUsername]);

  const openRematch = (newMatchId: string) => {
    if (!newMatchId || rematchHandled) return;
    setRematchHandled(true);
    onRematch?.(newMatchId, opponentId, opponentUsername);
  };

  const onRematchPressed = async () => {
    if (!matchEnded || rematchHandled) return;
    setEndDialog(null);

    ensureXpInitialized();
    const xp = getXp();
    if (!canPlayLiveMatches(xp)) {
      setStatusMessage(liveMatchesRequiresXpMessage);
      return;
    }

    const newMatchId = crypto.randomUUID();
    mgMultiplayerService.stageOutgoingChallenge(opponentId, newMatchId);
    await mgMultiplayerService.setIdle(myId, myUsername, myElo, xp);
    await mgMultiplayerService.sendChallenge({
      fromId: myId,
      fromUsername: myUsername,
      fromElo: myElo,
      fromBeeFiveXp: xp,
      toId: opponentId,
      matchId: newMatchId,
    });
    setStatusMessage(`Rematch sent to ${opponentUsername}…`);
  };

  const seatSubtitle = (seat: 1 | 2, colorLabel: string, isYou: boolean) => {
    const who = isYou ? `You · ${colorLabel}` : colorLabel;
    if (priorMatchCount != null && seat === openingSeat) return `${who} · opens`;
    return who;
  };

  useEffect(() => {
    if (endDialog?.kind === 'result' && !resultXpRecorded) {
      recordSchoolLobbyMatchOutcome(userIdsEqual(endDialog.winnerId, myId));
      setResultXpRecorded(true);
    }
  }, [endDialog, resultXpRecorded, myId]);

  const renderEndDialog = () => {
    if (!endDialog) return null;

    if (endDialog.kind === 'void') {
      return (
        <DialogOverlay>
          <div style={yellowDialogStyle}>
            <h3 style={{ fontWeight: 800 }}>Match ended</h3>
            <p>No moves were played, so there is no winner or loser and your record is unchanged.</p>
            <button type="button" onClick={onBackToLobby} style={primaryBlackButtonStyle}>
              Back to School Lobby
            </button>
          </div>
        </DialogOverlay>
      );
    }

    if (endDialog.kind === 'draw') {
      const d1 = endDialog.payload.player1Change;
      const d2 = endDialog.payload.player2Change;
      const mine = userIdsEqual(myId, p1Id) ? d1 : d2;
      const mineNum = parseEloChange(mine);
      const mineStr =
        mineNum != null
          ? mineNum >= 0
            ? `+${mineNum}`
            : `${mineNum}`
          : null;

      return (
        <DialogOverlay>
          <div style={yellowDialogStyle}>
            <h3 style={{ fontWeight: 800 }}>Draw</h3>
            <p>{mineStr != null ? `Match drawn. Your ELO change: ${mineStr}` : 'Match drawn.'}</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => void onRematchPressed()} style={primaryBlackButtonStyle}>
                Rematch
              </button>
              <button type="button" onClick={onBackToLobby}>Back to School Lobby</button>
            </div>
          </div>
        </DialogOverlay>
      );
    }

    const iWon = userIdsEqual(endDialog.winnerId, myId);

    let eloChange: number | undefined;
    const eloResult = endDialog.eloResult;
    if (eloResult) {
      eloChange = iWon
        ? parseEloChange(eloResult.winnerChange)
        : parseEloChange(eloResult.loserChange);
    }

    return (
      <DialogOverlay>
        <div style={yellowDialogStyle}>
          <h3 style={{ fontWeight: 800 }}>{iWon ? 'You won!' : 'You lost'}</h3>
          <p style={{ textAlign: 'center' }}>
            {iWon ? `You beat ${opponentUsername}!` : `${opponentUsername} beat you.`}
          </p>
          <p style={{ textAlign: 'center', fontWeight: 800, color: iWon ? '#2E7D32' : '#C62828' }}>
            {iWon ? '+1 XP' : '-1 XP'}
          </p>
          {eloChange != null && (
            <p style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 800, color: iWon ? '#2E7D32' : '#C62828' }}>
              {iWon ? `+${eloChange}` : eloChange} ELO
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => void onRematchPressed()} style={primaryBlackButtonStyle}>
              Rematch
            </button>
            <button type="button" onClick={onBackToLobby}>Back to School Lobby</button>
          </div>
        </div>
      </DialogOverlay>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: multiplayerTheme.scaffoldBackground,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          background: multiplayerTheme.primaryYellow,
          borderBottom: '2px solid #000',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <strong>
          {myUsername} vs {opponentUsername}
        </strong>
        <button
          type="button"
          disabled={matchEnded}
          onClick={() => void finishMatchEnd(opponentId, true)}
          style={{ background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}
        >
          Forfeit
        </button>
      </header>

      <div
        style={{
          margin: '10px 12px 6px',
          padding: '14px 12px',
          background: '#fff',
          border: '2px solid #000',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-around',
          gap: '8px',
        }}
      >
        <SeatColumn
          name={p1Name}
          color="#000"
          wins={seriesScore ? winsForSeries(seriesScore, p1Id) : null}
          subtitle={seatSubtitle(1, 'Black', p1Id === myId)}
        />
        <span style={{ fontWeight: 900, color: 'rgba(0,0,0,0.45)', alignSelf: 'center' }}>VS</span>
        <SeatColumn
          name={p2Name}
          color={multiplayerTheme.primaryYellow}
          wins={seriesScore ? winsForSeries(seriesScore, p2Id) : null}
          subtitle={seatSubtitle(2, 'Yellow', p2Id === myId)}
        />
      </div>

      {waitingDrawConfirm && (
        <p style={{ textAlign: 'center', fontSize: '13px', fontWeight: 600, color: 'rgba(0,0,0,0.55)' }}>
          Recording draw…
        </p>
      )}

      {statusMessage && (
        <p style={{ textAlign: 'center', fontSize: '13px', padding: '0 12px' }}>{statusMessage}</p>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {priorMatchCount == null ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Loading…
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              pointerEvents: matchEnded || waitingDrawConfirm ? 'none' : 'auto',
              opacity: matchEnded || waitingDrawConfirm ? 0.85 : 1,
            }}
          >
            <OnlineBeeFiveBoard
              ref={boardRef}
              myUserId={myId}
              opponentUserId={opponentId}
              myUsername={myUsername}
              opponentUsername={opponentUsername}
              initialFirstSeat={openingSeat}
              sendNetworkEvent={sendMove}
              onWin={onLocalWin}
              onDraw={onLocalDraw}
            />
          </div>
        )}
      </div>

      {renderEndDialog()}

      {rematchChallenge && (
        <ChallengeDialog
          isRematch
          fromUsername={opponentUsername}
          fromElo={parseInt(String(rematchChallenge.from_elo ?? myElo), 10) || myElo}
          onAccept={async () => {
            const theirMatchId = rematchChallenge.match_id?.toString() ?? '';
            const resolved = mgMultiplayerService.matchIdForChallengeAccept(opponentId, theirMatchId);
            await mgMultiplayerService.respondToChallenge({
              matchId: resolved,
              challengerId: opponentId,
              accepted: true,
              responderId: myId,
              responderUsername: myUsername,
            });
            setRematchChallenge(null);
            openRematch(resolved);
          }}
          onDecline={async () => {
            await mgMultiplayerService.respondToChallenge({
              matchId: rematchChallenge.match_id?.toString() ?? '',
              challengerId: opponentId,
              accepted: false,
              responderId: myId,
              responderUsername: myUsername,
            });
            setRematchChallenge(null);
          }}
        />
      )}
    </div>
  );
}

function DialogOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '1rem',
      }}
    >
      {children}
    </div>
  );
}

function SeatColumn({
  name,
  color,
  wins,
  subtitle,
}: {
  name: string;
  color: string;
  wins: number | null;
  subtitle: string;
}) {
  return (
    <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
      </div>
      <div style={{ fontSize: '26px', fontWeight: 900, lineHeight: 1.1 }}>{wins == null ? '—' : wins}</div>
      <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.54)', fontWeight: 600 }}>series wins</div>
      <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.54)' }}>{subtitle}</div>
    </div>
  );
}
