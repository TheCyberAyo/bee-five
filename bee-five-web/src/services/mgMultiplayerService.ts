import type { RealtimeChannel, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  playerPresenceFromMap,
  statusRank,
  type PlayerPresence,
} from '../models/playerPresence';
import { canonicalMutualMatchId } from '../utils/onlineMatch';
import {
  computeHeadToHeadSeriesScore,
  type HeadToHeadSeriesScore,
} from '../utils/headToHeadSeries';
import { canPlayLiveMatches, ensureXpInitialized, getXp } from './xpService';

export const DEFAULT_LOBBY_JOIN_CODE = '00BEE00';
export const UNIVERSAL_LOBBY_CHANNEL_KEY = 'universal';

export interface LobbyIdentity {
  userId: string;
  username: string;
  elo: number;
  beeFiveXp: number;
  schoolId: string;
}

export interface JoinSchoolOutcome {
  errorMessage?: string;
  schoolId?: string;
  userId?: string;
  username?: string;
  elo?: number;
  isSuccess: boolean;
}

export interface LeaveSchoolLobbyOutcome {
  errorMessage?: string;
  unlinkedSchool?: boolean;
  isSuccess: boolean;
}

type Unsubscribe = () => void;

class SimpleEmitter<T> {
  private listeners = new Set<(data: T) => void>();

  subscribe(listener: (data: T) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(data: T): void {
    for (const fn of this.listeners) fn(data);
  }
}

function findMapInTree(
  node: unknown,
  pred: (m: Record<string, unknown>) => boolean,
  depth = 0,
): Record<string, unknown> | null {
  if (depth > 16) return null;
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    const m = node as Record<string, unknown>;
    if (pred(m)) return m;
    for (const v of Object.values(m)) {
      const hit = findMapInTree(v, pred, depth + 1);
      if (hit) return hit;
    }
  } else if (Array.isArray(node)) {
    for (const e of node) {
      const hit = findMapInTree(e, pred, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

function unwrapChallengePayload(raw: Record<string, unknown>): Record<string, unknown> {
  return (
    findMapInTree(raw, (m) => 'to_id' in m && 'from_id' in m) ?? raw
  );
}

function unwrapChallengeResponsePayload(raw: Record<string, unknown>): Record<string, unknown> {
  return (
    findMapInTree(
      raw,
      (m) =>
        'challenger_id' in m &&
        ('accepted' in m || 'responder_id' in m),
    ) ?? raw
  );
}

function unwrapGameEventPayload(raw: Record<string, unknown>): Record<string, unknown> {
  return (
    findMapInTree(raw, (m) => {
      const pid = m.player_id ?? m.playerId;
      if (pid == null) return false;
      if (m.type === 'move') return 'row' in m && 'col' in m;
      return true;
    }) ?? raw
  );
}

function unwrapMatchOverPayload(raw: Record<string, unknown>): Record<string, unknown> {
  return (
    findMapInTree(
      raw,
      (m) =>
        'winner_id' in m ||
        m.is_draw === true ||
        'winnerChange' in m ||
        'player1Change' in m,
    ) ?? raw
  );
}

function parseProfileInt(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return Math.trunc(v);
  const n = parseInt(String(v ?? ''), 10);
  return Number.isNaN(n) ? fallback : n;
}

function institutionNameFromProfileRow(row: Record<string, unknown>): string | null {
  const nested = row.mg_schools;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const n = (nested as Record<string, unknown>).name?.toString().trim();
    if (n) return n;
  }
  return null;
}

function usernameForNewMgProfile(user: User): string {
  const meta = user.user_metadata?.username;
  if (typeof meta === 'string') {
    const t = meta.trim();
    if (t.length >= 3 && /^[a-zA-Z0-9_-]+$/.test(t)) {
      return t.length > 32 ? t.slice(0, 32) : t;
    }
  }
  const email = user.email;
  if (email?.includes('@')) {
    let local = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_');
    if (!local) local = 'user';
    if (local.length < 3) local = `${local}_bee`;
    return local.length > 32 ? local.slice(0, 32) : local;
  }
  const hex = user.id.replace(/-/g, '');
  return `p_${hex.slice(0, Math.min(12, hex.length))}`;
}

function outcomeFromProfileRow(
  row: Record<string, unknown>,
  user: User,
  schoolId: string,
): JoinSchoolOutcome {
  const rawName = row.username;
  let displayName = '';
  if (typeof rawName === 'string' && rawName.trim()) {
    displayName = rawName.trim();
  } else {
    const meta = user.user_metadata?.username;
    if (meta != null && String(meta).trim()) {
      displayName = String(meta).trim();
    } else {
      const email = user.email;
      displayName =
        email && email.includes('@') ? email.split('@')[0] : 'Player';
    }
  }

  return {
    isSuccess: true,
    schoolId,
    userId: user.id,
    username: displayName,
    elo: parseProfileInt(row.elo, 1200),
  };
}

function joinSchoolRpcNotDeployed(message: string, code?: string): boolean {
  const m = message.toLowerCase();
  if (m.includes('could not find the function')) return true;
  if (m.includes('schema cache')) return true;
  if (code === '42883') return true;
  return false;
}

function headToHeadOrFilter(userA: string, userB: string): string {
  return `and(player1_id.eq.${userA},player2_id.eq.${userB}),and(player1_id.eq.${userB},player2_id.eq.${userA})`;
}

function usernameIlikePattern(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return '';
  const safe = trimmed.replace(/[%_\\]/g, '');
  if (!safe) return '';
  return `%${safe}%`;
}

class MgMultiplayerService {
  private lobbyChannel: RealtimeChannel | null = null;
  private matchChannel: RealtimeChannel | null = null;
  private opponentDisconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private matchOpponentId: string | null = null;
  private activeMatchId: string | null = null;
  private lobbyInstitutionName: string | null = null;
  private lobbyCountryCode: string | null = null;
  private lobbyIdentity: LobbyIdentity | null = null;
  private pendingOutgoingChallenges = new Map<string, string>();
  private matchScreenCount = 0;

  private onlinePlayersEmitter = new SimpleEmitter<PlayerPresence[]>();
  private challengeEmitter = new SimpleEmitter<Record<string, unknown>>();
  private challengeResponseEmitter = new SimpleEmitter<Record<string, unknown>>();
  private gameEventEmitter = new SimpleEmitter<Record<string, unknown>>();
  private matchOverEmitter = new SimpleEmitter<Record<string, unknown>>();
  private matchStartEmitter = new SimpleEmitter<Record<string, unknown>>();

  private static readonly opponentDisconnectGraceMs = 12_000;

  get lobbyIdentitySnapshot(): LobbyIdentity | null {
    return this.lobbyIdentity;
  }

  get shouldRouteLobbyChallenges(): boolean {
    return this.matchScreenCount === 0;
  }

  notifyMatchScreenOpened(): void {
    this.matchScreenCount++;
  }

  notifyMatchScreenClosed(): void {
    if (this.matchScreenCount > 0) this.matchScreenCount--;
  }

  isActiveMatch(matchId: string): boolean {
    return this.activeMatchId === matchId;
  }

  hasPendingChallengeTo(opponentId: string): boolean {
    return this.pendingOutgoingChallenges.has(opponentId);
  }

  matchIdForOutgoingChallenge(opponentId: string, proposedMatchId: string): string {
    return this.pendingOutgoingChallenges.get(opponentId) ?? proposedMatchId;
  }

  stageOutgoingChallenge(opponentId: string, proposedMatchId: string): void {
    const resolved = this.matchIdForOutgoingChallenge(opponentId, proposedMatchId);
    this.pendingOutgoingChallenges.set(opponentId, resolved);
  }

  matchIdForChallengeAccept(opponentId: string, theirMatchId: string): string {
    const mine = this.pendingOutgoingChallenges.get(opponentId);
    if (!mine) return theirMatchId;
    const userId = this.lobbyIdentity?.userId;
    if (!userId) return theirMatchId;
    return canonicalMutualMatchId({
      myId: userId,
      opponentId,
      myMatchId: mine,
      theirMatchId,
    });
  }

  onOnlinePlayers(listener: (players: PlayerPresence[]) => void): Unsubscribe {
    return this.onlinePlayersEmitter.subscribe(listener);
  }

  onChallenge(listener: (data: Record<string, unknown>) => void): Unsubscribe {
    return this.challengeEmitter.subscribe(listener);
  }

  onChallengeResponse(listener: (data: Record<string, unknown>) => void): Unsubscribe {
    return this.challengeResponseEmitter.subscribe(listener);
  }

  onGameEvent(listener: (data: Record<string, unknown>) => void): Unsubscribe {
    return this.gameEventEmitter.subscribe(listener);
  }

  onMatchOver(listener: (data: Record<string, unknown>) => void): Unsubscribe {
    return this.matchOverEmitter.subscribe(listener);
  }

  onMatchStart(listener: (data: Record<string, unknown>) => void): Unsubscribe {
    return this.matchStartEmitter.subscribe(listener);
  }

  private lobbyPresencePayload(
    userId: string,
    username: string,
    elo: number,
    beeFiveXp: number,
    status: string,
  ): Record<string, unknown> {
    return {
      user_id: userId,
      username,
      elo,
      xp: beeFiveXp,
      institution: this.lobbyInstitutionName ?? '',
      country_code: this.lobbyCountryCode ?? '',
      status,
    };
  }

  async joinLobby({
    schoolId,
    userId,
    username,
    elo,
    beeFiveXp,
    institutionName,
    countryCode,
  }: {
    schoolId: string;
    userId: string;
    username: string;
    elo: number;
    beeFiveXp: number;
    institutionName?: string | null;
    countryCode?: string | null;
  }): Promise<void> {
    if (!supabase) return;

    await this.leaveLobby();

    const inst = institutionName?.trim();
    this.lobbyInstitutionName = inst && inst.length > 0 ? inst : null;

    const cc = countryCode?.trim().toUpperCase();
    this.lobbyCountryCode = cc && cc.length > 0 ? cc : null;

    this.lobbyIdentity = { userId, username, elo, beeFiveXp, schoolId };

    void this.touchAccountActivity();

    const channel = supabase.channel(`lobby:${UNIVERSAL_LOBBY_CHANNEL_KEY}`);

    channel.on('broadcast', { event: 'challenge' }, ({ payload }) => {
      const data = unwrapChallengePayload((payload ?? {}) as Record<string, unknown>);
      if (data.to_id?.toString() !== userId) return;
      this.handleIncomingChallengeBroadcast(data, userId, username);
    });

    channel.on('broadcast', { event: 'challenge_response' }, ({ payload }) => {
      const data = unwrapChallengeResponsePayload((payload ?? {}) as Record<string, unknown>);
      if (data.challenger_id?.toString() !== userId) return;
      const responderId = data.responder_id?.toString();
      if (responderId) this.pendingOutgoingChallenges.delete(responderId);
      this.challengeResponseEmitter.emit(data);
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const raw: PlayerPresence[] = [];
      for (const presences of Object.values(state)) {
        for (const p of presences) {
          const presence = playerPresenceFromMap(p as Record<string, unknown>);
          if (presence.userId && presence.userId !== userId) {
            raw.push(presence);
          }
        }
      }

      const byId = new Map<string, PlayerPresence>();
      for (const p of raw) {
        const existing = byId.get(p.userId);
        if (!existing || statusRank(p.status) > statusRank(existing.status)) {
          byId.set(p.userId, p);
        }
      }

      const players = [...byId.values()].sort((a, b) => {
        const da = Math.abs(a.elo - elo);
        const db = Math.abs(b.elo - elo);
        if (da !== db) return da - db;
        if (b.elo !== a.elo) return b.elo - a.elo;
        return a.username.localeCompare(b.username);
      });

      this.onlinePlayersEmitter.emit(players);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track(
          this.lobbyPresencePayload(userId, username, elo, beeFiveXp, 'idle'),
        );
      }
    });

    this.lobbyChannel = channel;
  }

  private handleIncomingChallengeBroadcast(
    data: Record<string, unknown>,
    userId: string,
    username: string,
  ): void {
    const fromId = data.from_id?.toString() ?? '';
    if (!fromId) return;

    const theirMatchId = data.match_id?.toString() ?? '';
    const myPendingMatchId = this.pendingOutgoingChallenges.get(fromId);
    if (myPendingMatchId && theirMatchId) {
      const canonical = canonicalMutualMatchId({
        myId: userId,
        opponentId: fromId,
        myMatchId: myPendingMatchId,
        theirMatchId,
      });
      this.pendingOutgoingChallenges.delete(fromId);

      if (userId.localeCompare(fromId) < 0) {
        void (async () => {
          ensureXpInitialized();
          const xp = getXp();
          if (!canPlayLiveMatches(xp)) {
            this.challengeEmitter.emit(data);
            return;
          }
          await this.respondToChallenge({
            matchId: canonical,
            challengerId: fromId,
            accepted: true,
            responderId: userId,
            responderUsername: username,
          });
          this.matchStartEmitter.emit({
            match_id: canonical,
            opponent_id: fromId,
            opponent_username: data.from_username?.toString() ?? 'Player',
          });
        })();
      }
      return;
    }

    this.challengeEmitter.emit(data);
  }

  async leaveLobby(): Promise<void> {
    if (this.lobbyChannel && supabase) {
      await this.lobbyChannel.untrack();
      await supabase.removeChannel(this.lobbyChannel);
      this.lobbyChannel = null;
    }
    this.lobbyInstitutionName = null;
    this.lobbyCountryCode = null;
    this.lobbyIdentity = null;
    this.pendingOutgoingChallenges.clear();
  }

  /** Clears school link and drops lobby/match channels (Settings → leave school lobby). */
  async leaveSchoolLobby(): Promise<LeaveSchoolLobbyOutcome> {
    if (!supabase) {
      return { isSuccess: false, errorMessage: 'Connection unavailable.' };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { isSuccess: false, errorMessage: 'You must be signed in.' };
    }

    await this.leaveLobby();
    await this.leaveMatch();

    try {
      const { data: rows, error: selectError } = await supabase
        .from('mg_profiles')
        .select('school_id')
        .eq('id', user.id)
        .limit(1);

      if (selectError) {
        return { isSuccess: false, errorMessage: selectError.message };
      }

      if (!rows?.length) {
        return { isSuccess: true, unlinkedSchool: false };
      }

      const schoolId = rows[0].school_id?.toString().trim();
      if (!schoolId) {
        return { isSuccess: true, unlinkedSchool: false };
      }

      const { error: updateError } = await supabase
        .from('mg_profiles')
        .update({ school_id: null })
        .eq('id', user.id);

      if (updateError) {
        return { isSuccess: false, errorMessage: updateError.message };
      }

      return { isSuccess: true, unlinkedSchool: true };
    } catch {
      return {
        isSuccess: false,
        errorMessage: 'Something went wrong. Check your connection and try again.',
      };
    }
  }

  refreshLobbyPresence(): Promise<boolean> {
    return this.joinLobbyFromCurrentProfile();
  }

  async joinLobbyFromCurrentProfile(): Promise<boolean> {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    try {
      const { data: rows, error } = await supabase
        .from('mg_profiles')
        .select('school_id, username, elo, country_code, mg_schools(name)')
        .eq('id', user.id)
        .limit(1);

      if (error || !rows?.length) return false;

      const row = rows[0] as Record<string, unknown>;
      const schoolId = row.school_id?.toString().trim();
      if (!schoolId) return false;

      const rawName = row.username?.toString().trim();
      const username = rawName && rawName.length > 0 ? rawName : 'Player';
      const elo = parseProfileInt(row.elo, 1200);
      const institution = institutionNameFromProfileRow(row);
      const cc = row.country_code?.toString().trim();

      ensureXpInitialized();
      const beeFiveXp = getXp();

      await this.joinLobby({
        schoolId,
        userId: user.id,
        username,
        elo,
        beeFiveXp,
        institutionName: institution,
        countryCode: cc,
      });
      return true;
    } catch {
      return false;
    }
  }

  async setIdle(userId: string, username: string, elo: number, beeFiveXp: number): Promise<void> {
    await this.lobbyChannel?.track(
      this.lobbyPresencePayload(userId, username, elo, beeFiveXp, 'idle'),
    );
  }

  async setInMatch(userId: string, username: string, elo: number, beeFiveXp: number): Promise<void> {
    await this.lobbyChannel?.track(
      this.lobbyPresencePayload(userId, username, elo, beeFiveXp, 'in_match'),
    );
  }

  async sendChallenge({
    fromId,
    fromUsername,
    fromElo,
    fromBeeFiveXp,
    toId,
    matchId,
  }: {
    fromId: string;
    fromUsername: string;
    fromElo: number;
    fromBeeFiveXp: number;
    toId: string;
    matchId: string;
  }): Promise<void> {
    if (!canPlayLiveMatches(fromBeeFiveXp)) {
      this.pendingOutgoingChallenges.delete(toId);
      return;
    }

    const resolvedMatchId = this.matchIdForOutgoingChallenge(toId, matchId);
    this.pendingOutgoingChallenges.set(toId, resolvedMatchId);

    await this.lobbyChannel?.send({
      type: 'broadcast',
      event: 'challenge',
      payload: {
        from_id: fromId,
        from_username: fromUsername,
        from_elo: fromElo,
        from_xp: fromBeeFiveXp,
        to_id: toId,
        match_id: resolvedMatchId,
      },
    });
  }

  async respondToChallenge({
    matchId,
    challengerId,
    accepted,
    responderId,
    responderUsername,
  }: {
    matchId: string;
    challengerId: string;
    accepted: boolean;
    responderId: string;
    responderUsername: string;
  }): Promise<void> {
    const resolvedMatchId = accepted
      ? this.matchIdForChallengeAccept(challengerId, matchId)
      : matchId;

    this.pendingOutgoingChallenges.delete(challengerId);

    await this.lobbyChannel?.send({
      type: 'broadcast',
      event: 'challenge_response',
      payload: {
        match_id: resolvedMatchId,
        challenger_id: challengerId,
        accepted,
        responder_id: responderId,
        responder_username: responderUsername,
      },
    });
  }

  private isOpponentPresentOnMatchChannel(opponentId: string): boolean {
    const ch = this.matchChannel;
    if (!ch) return false;
    const state = ch.presenceState();
    for (const presences of Object.values(state)) {
      for (const p of presences) {
        const payload = p as Record<string, unknown>;
        if (payload.user_id?.toString() === opponentId) return true;
      }
    }
    return false;
  }

  private cancelOpponentDisconnectTimer(): void {
    if (this.opponentDisconnectTimer) {
      clearTimeout(this.opponentDisconnectTimer);
      this.opponentDisconnectTimer = null;
    }
  }

  private scheduleOpponentDisconnectWin(userId: string, opponentId: string): void {
    this.cancelOpponentDisconnectTimer();
    this.opponentDisconnectTimer = setTimeout(() => {
      if (!this.matchChannel || this.matchOpponentId !== opponentId) return;
      if (this.isOpponentPresentOnMatchChannel(opponentId)) return;
      this.matchOverEmitter.emit({
        winner_id: userId,
        reason: 'opponent_disconnected',
      });
    }, MgMultiplayerService.opponentDisconnectGraceMs);
  }

  async joinMatch(matchId: string, userId: string, opponentId: string): Promise<void> {
    if (!supabase) return;

    await this.leaveMatch();

    this.activeMatchId = matchId;
    this.matchOpponentId = opponentId;

    const channel = supabase.channel(`match:${matchId}`);

    channel.on('broadcast', { event: 'game_event' }, ({ payload }) => {
      const data = unwrapGameEventPayload((payload ?? {}) as Record<string, unknown>);
      const sender = (data.player_id ?? data.playerId)?.toString();
      if (sender && sender !== userId) {
        this.gameEventEmitter.emit(data);
      }
    });

    channel.on('broadcast', { event: 'match_over' }, ({ payload }) => {
      this.matchOverEmitter.emit(unwrapMatchOverPayload((payload ?? {}) as Record<string, unknown>));
    });

    const onOpponentPresenceMaybeReturned = () => {
      if (this.isOpponentPresentOnMatchChannel(opponentId)) {
        this.cancelOpponentDisconnectTimer();
      }
    };

    channel.on('presence', { event: 'sync' }, onOpponentPresenceMaybeReturned);
    channel.on('presence', { event: 'join' }, onOpponentPresenceMaybeReturned);
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      void key;
      const opponentLeft = (leftPresences ?? []).some((p) => {
        const raw = p as Record<string, unknown>;
        return raw.user_id?.toString() === opponentId;
      });
      if (opponentLeft) {
        this.scheduleOpponentDisconnectWin(userId, opponentId);
      }
    });

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 20_000);
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          await channel.track({ user_id: userId });
          resolve();
        }
      });
    });

    this.matchChannel = channel;
  }

  async leaveMatch(onlyIfMatchId?: string): Promise<void> {
    if (onlyIfMatchId && this.activeMatchId !== onlyIfMatchId) return;

    this.cancelOpponentDisconnectTimer();
    this.matchOpponentId = null;
    this.activeMatchId = null;

    if (this.matchChannel && supabase) {
      await this.matchChannel.untrack();
      await supabase.removeChannel(this.matchChannel);
      this.matchChannel = null;
    }
  }

  async sendGameEvent(playerId: string, eventData: Record<string, unknown>): Promise<void> {
    const ch = this.matchChannel;
    if (!ch) return;

    const payload = { player_id: playerId, ...eventData };

    try {
      await ch.httpSend('game_event', payload);
    } catch {
      await ch.send({ type: 'broadcast', event: 'game_event', payload });
    }
  }

  private async sendMatchBroadcast(
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const ch = this.matchChannel;
    if (!ch) return;
    try {
      await ch.httpSend(event, payload);
    } catch {
      await ch.send({ type: 'broadcast', event, payload });
    }
  }

  async submitMatchResult({
    player1Id,
    player2Id,
    winnerId,
    isDraw = false,
    voidNoMoves = false,
  }: {
    player1Id: string;
    player2Id: string;
    winnerId?: string;
    isDraw?: boolean;
    voidNoMoves?: boolean;
  }): Promise<Record<string, unknown>> {
    if (!supabase) throw new Error('Supabase not configured');

    const body: Record<string, unknown> = {
      player1_id: player1Id,
      player2_id: player2Id,
      is_draw: isDraw,
    };
    if (!isDraw && winnerId) body.winner_id = winnerId;
    if (voidNoMoves) body.void_no_moves = true;

    const { data, error } = await supabase.functions.invoke('submit-match', { body });
    if (error) throw error;

    const result = (data ?? {}) as Record<string, unknown>;

    if (isDraw) {
      await this.sendMatchBroadcast('match_over', {
        is_draw: true,
        ...(voidNoMoves ? { void_no_moves: true } : {}),
        player1Change: result.player1Change,
        player2Change: result.player2Change,
      });
    } else {
      await this.sendMatchBroadcast('match_over', {
        winner_id: winnerId,
        winnerChange: result.winnerChange,
        loserChange: result.loserChange,
      });
    }

    return result;
  }

  async countCompletedMatchesBetween(userA: string, userB: string): Promise<number> {
    if (!supabase || userA === userB) return 0;
    try {
      const { count, error } = await supabase
        .from('mg_matches')
        .select('id', { count: 'exact', head: true })
        .or(headToHeadOrFilter(userA, userB));
      if (error) return 0;
      return count ?? 0;
    } catch {
      return 0;
    }
  }

  async fetchHeadToHeadSeriesScore(userA: string, userB: string): Promise<HeadToHeadSeriesScore> {
    if (!supabase || userA === userB) {
      return {
        player1Id: userA.localeCompare(userB) < 0 ? userA : userB,
        player2Id: userA.localeCompare(userB) < 0 ? userB : userA,
        player1Wins: 0,
        player2Wins: 0,
      };
    }

    try {
      const { data, error } = await supabase
        .from('mg_matches')
        .select('winner_id, created_at')
        .or(headToHeadOrFilter(userA, userB))
        .order('created_at', { ascending: true });

      if (error) throw error;

      return computeHeadToHeadSeriesScore({
        userA,
        userB,
        matchesOldestFirst: (data ?? []) as { winner_id?: string | null }[],
      });
    } catch {
      return computeHeadToHeadSeriesScore({
        userA,
        userB,
        matchesOldestFirst: [],
      });
    }
  }

  async getLeaderboard(schoolId: string): Promise<Record<string, unknown>[]> {
    if (!supabase) return [];
    const { data } = await supabase
      .from('mg_profiles')
      .select('id, username, elo, wins, losses, country_code')
      .eq('school_id', schoolId)
      .order('elo', { ascending: false })
      .limit(100);
    return (data ?? []) as Record<string, unknown>[];
  }

  async getGlobalLeaderboard(): Promise<Record<string, unknown>[]> {
    if (!supabase) return [];
    const { data } = await supabase
      .from('mg_profiles')
      .select('id, username, elo, wins, losses, school_id, country_code, mg_schools(name)')
      .not('school_id', 'is', null)
      .order('elo', { ascending: false })
      .limit(100);
    return (data ?? []) as Record<string, unknown>[];
  }

  subscribeLeaderboard(
    schoolId: string,
    onUpdate: (rows: Record<string, unknown>[]) => void,
  ): Unsubscribe {
    const client = supabase;
    if (!client) return () => {};

    void this.getLeaderboard(schoolId).then(onUpdate);

    const channel = client
      .channel(`inst-lb:${schoolId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mg_profiles',
          filter: `school_id=eq.${schoolId}`,
        },
        () => {
          void this.getLeaderboard(schoolId).then(onUpdate);
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }

  subscribeGlobalLeaderboard(onUpdate: (rows: Record<string, unknown>[]) => void): Unsubscribe {
    const client = supabase;
    if (!client) return () => {};

    void this.getGlobalLeaderboard().then(onUpdate);

    const channel = client
      .channel('global-lb')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mg_profiles' },
        () => {
          void this.getGlobalLeaderboard().then(onUpdate);
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }

  async searchGlobalLeaderboard(query: string): Promise<Record<string, unknown>[]> {
    if (!supabase) return [];
    const pattern = usernameIlikePattern(query);
    if (!pattern) return [];

    const { data } = await supabase
      .from('mg_profiles')
      .select('id, username, elo, wins, losses, school_id, country_code, mg_schools(name)')
      .not('school_id', 'is', null)
      .ilike('username', pattern)
      .order('elo', { ascending: false })
      .limit(50);
    return (data ?? []) as Record<string, unknown>[];
  }

  async searchInstitutionalLeaderboard(
    schoolId: string,
    query: string,
  ): Promise<Record<string, unknown>[]> {
    if (!supabase) return [];
    const pattern = usernameIlikePattern(query);
    if (!pattern) return [];

    const { data } = await supabase
      .from('mg_profiles')
      .select('id, username, elo, wins, losses, country_code')
      .eq('school_id', schoolId)
      .ilike('username', pattern)
      .order('elo', { ascending: false })
      .limit(50);
    return (data ?? []) as Record<string, unknown>[];
  }

  async getLeaderboardRank(elo: number, schoolId?: string): Promise<number | null> {
    if (!supabase) return null;
    try {
      let query = supabase.from('mg_profiles').select('id', { count: 'exact', head: true }).gt('elo', elo);
      if (schoolId) {
        query = query.eq('school_id', schoolId);
      } else {
        query = query.not('school_id', 'is', null);
      }
      const { count, error } = await query;
      if (error) return null;
      return (count ?? 0) + 1;
    } catch {
      return null;
    }
  }

  async touchAccountActivity(): Promise<void> {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      await supabase.rpc('touch_account_activity');
    } catch {
      // best-effort
    }
  }

  async joinDefaultLobby(): Promise<JoinSchoolOutcome> {
    return this.joinSchool(DEFAULT_LOBBY_JOIN_CODE);
  }

  async joinSchool(joinCode: string): Promise<JoinSchoolOutcome> {
    if (!supabase) {
      return { isSuccess: false, errorMessage: 'Supabase is not configured.' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { isSuccess: false, errorMessage: 'You must be signed in to join a school.' };
    }

    const normalized = joinCode.toUpperCase().trim();
    if (!normalized) {
      return { isSuccess: false, errorMessage: 'Please enter your school’s join code.' };
    }

    try {
      let rpcRow: Record<string, unknown> | null = null;
      try {
        const { data: raw, error } = await supabase.rpc('mg_join_school_for_user', {
          p_join_code: normalized,
        });
        if (error) {
          if (!joinSchoolRpcNotDeployed(error.message, error.code)) {
            return { isSuccess: false, errorMessage: error.message };
          }
        } else if (raw) {
          rpcRow = Array.isArray(raw)
            ? (raw[0] as Record<string, unknown>)
            : (raw as Record<string, unknown>);
        }
      } catch {
        rpcRow = null;
      }

      if (rpcRow?.school_id) {
        const sid = rpcRow.school_id.toString();
        if (sid) return outcomeFromProfileRow(rpcRow, user, sid);
      }

      return await this.joinSchoolClientOnly(normalized, user);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Check your connection and try again.';
      return { isSuccess: false, errorMessage: msg };
    }
  }

  private async joinSchoolClientOnly(normalized: string, user: User): Promise<JoinSchoolOutcome> {
    if (!supabase) return { isSuccess: false, errorMessage: 'Supabase is not configured.' };

    const { data: schoolRows, error: schoolErr } = await supabase
      .from('mg_schools')
      .select('id')
      .eq('join_code', normalized)
      .limit(1);

    if (schoolErr || !schoolRows?.length) {
      return {
        isSuccess: false,
        errorMessage:
          'Invalid school join code, or your account cannot read schools yet.',
      };
    }

    const schoolId = schoolRows[0].id?.toString();
    if (!schoolId) {
      return { isSuccess: false, errorMessage: 'Invalid school join code.' };
    }

    const { data: existingProfile } = await supabase
      .from('mg_profiles')
      .select('id')
      .eq('id', user.id)
      .limit(1);

    let savedRows: Record<string, unknown>[] = [];

    if (!existingProfile?.length) {
      const { data: inserted, error: insertError } = await supabase
        .from('mg_profiles')
        .insert({
          id: user.id,
          username: usernameForNewMgProfile(user),
          school_id: schoolId,
          elo: 1200,
          wins: 0,
          losses: 0,
        })
        .select('id, username, elo')
        .limit(1);

      if (insertError) {
        savedRows = await this.mergeMgProfileSchoolJoin(user, schoolId);
      } else {
        savedRows = (inserted ?? []) as Record<string, unknown>[];
      }

      if (!savedRows.length) {
        return {
          isSuccess: false,
          errorMessage: 'Could not create or update your player profile.',
        };
      }
    } else {
      savedRows = await this.mergeMgProfileSchoolJoin(user, schoolId);
      if (!savedRows.length) {
        return {
          isSuccess: false,
          errorMessage: 'Your school could not be saved (update blocked or no row).',
        };
      }
    }

    return outcomeFromProfileRow(savedRows[0], user, schoolId);
  }

  private async mergeMgProfileSchoolJoin(
    user: User,
    schoolId: string,
  ): Promise<Record<string, unknown>[]> {
    if (!supabase) return [];
    const { data } = await supabase
      .from('mg_profiles')
      .update({ school_id: schoolId })
      .eq('id', user.id)
      .select('id, username, elo')
      .limit(1);
    return (data ?? []) as Record<string, unknown>[];
  }

  static institutionNameFromProfileRow(row: Record<string, unknown>): string | null {
    return institutionNameFromProfileRow(row);
  }
}

export const mgMultiplayerService = new MgMultiplayerService();
