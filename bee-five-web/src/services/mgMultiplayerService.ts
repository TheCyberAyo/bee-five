import type { RealtimeChannel, Session, User } from '@supabase/supabase-js';
import { INTERNAL_EMAIL_DOMAIN } from '../lib/internalAuthEmail';
import { supabase } from '../lib/supabase';
import { bindSupabaseSession, syncSupabaseAuth } from '../lib/syncSupabaseAuth';
import { callEdgeFunctionWithToken, callRpcWithToken } from '../lib/authenticatedRest';
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
import {
  DEFAULT_LOBBY_DISPLAY_NAME,
  DEFAULT_LOBBY_JOIN_CODE,
  displayInstitutionName,
} from '../utils/institutionDisplay';
import { canPlayLiveMatches, ensureXpInitialized, getXp } from './xpService';

export { DEFAULT_LOBBY_JOIN_CODE, DEFAULT_LOBBY_DISPLAY_NAME };
export const UNIVERSAL_LOBBY_CHANNEL_KEY = 'universal';

export interface LobbyDiagnostics {
  hasSession: boolean;
  userId: string | null;
  schoolId: string;
  schoolJoinCode: string | null;
  schoolName: string | null;
  profileSchoolId: string | null;
  lobbyChannelState: string | null;
  presenceTotal: number;
  presenceOthers: number;
  globalLeaderboardCount: number;
  institutionalLeaderboardCount: number;
  globalLeaderboardError: string | null;
  institutionalLeaderboardError: string | null;
  globalLeaderboardRows: Record<string, unknown>[];
  institutionalLeaderboardRows: Record<string, unknown>[];
  hint: string | null;
}

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

export function normalizeUserId(id: unknown): string {
  return id?.toString().trim().toLowerCase() ?? '';
}

export function userIdsEqual(a: unknown, b: unknown): boolean {
  const left = normalizeUserId(a);
  const right = normalizeUserId(b);
  return left.length > 0 && left === right;
}

export function isChallengeAccepted(value: unknown): boolean {
  if (value === true) return true;
  if (value === 1) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }
  return false;
}

export function parseEloChange(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (typeof value === 'number' && !Number.isNaN(value)) return Math.trunc(value);
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? undefined : n;
}

export function parseChallengeXp(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number' && !Number.isNaN(value)) return Math.max(0, Math.trunc(value));
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
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
    const m = nested as Record<string, unknown>;
    const name = m.name?.toString().trim();
    const joinCode = m.join_code?.toString();
    if (name || joinCode) {
      return displayInstitutionName(name, joinCode);
    }
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

/** Normalize Supabase presence rows from JS (flat) or Flutter (nested payload). */
function presenceEntryToMap(entry: unknown): Record<string, unknown> {
  if (!entry || typeof entry !== 'object') return {};
  const e = entry as Record<string, unknown>;

  const payload = e.payload;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  if (typeof payload === 'string' && payload.trim()) {
    try {
      const parsed = JSON.parse(payload) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // ignore malformed payload
    }
  }

  const metas = e.metas;
  if (Array.isArray(metas) && metas.length > 0) {
    const first = metas[0];
    if (first && typeof first === 'object') {
      const m = first as Record<string, unknown>;
      const { phx_ref: _phx, presence_ref: _pref, ...rest } = m;
      if (rest.user_id != null) return rest;
    }
  }

  const { presence_ref: _ref, phx_ref: _phxTop, ...rest } = e;
  return rest;
}

function iterPresenceEntries(state: Record<string, unknown>): unknown[] {
  const entries: unknown[] = [];

  const pushEntry = (entry: unknown) => {
    if (!entry || typeof entry !== 'object') return;
    const e = entry as Record<string, unknown>;
    const nested = e.presences;
    if (Array.isArray(nested)) {
      for (const child of nested) pushEntry(child);
      return;
    }
    entries.push(entry);
  };

  for (const value of Object.values(state)) {
    if (Array.isArray(value)) {
      for (const entry of value) pushEntry(entry);
    } else {
      pushEntry(value);
    }
  }
  return entries;
}

function countPresenceEntries(
  state: Record<string, unknown>,
  viewerUserId: string | null,
): { total: number; others: number } {
  let total = 0;
  let others = 0;
  for (const entry of iterPresenceEntries(state)) {
    const presence = playerPresenceFromMap(presenceEntryToMap(entry));
    if (!presence.userId) continue;
    total += 1;
    if (
      !viewerUserId
      || presence.userId.toLowerCase() !== viewerUserId.toLowerCase()
    ) {
      others += 1;
    }
  }
  return { total, others };
}

function mergeOnlinePlayers(
  state: Record<string, unknown>,
  viewerElo: number,
  viewerUserId: string,
): PlayerPresence[] {
  const raw: PlayerPresence[] = [];
  for (const entry of iterPresenceEntries(state)) {
    const presence = playerPresenceFromMap(presenceEntryToMap(entry));
    if (presence.userId && presence.userId.toLowerCase() !== viewerUserId.toLowerCase()) {
      raw.push(presence);
    }
  }

  const byId = new Map<string, PlayerPresence>();
  for (const p of raw) {
    const existing = byId.get(p.userId);
    if (!existing || statusRank(p.status) > statusRank(existing.status)) {
      byId.set(p.userId, p);
    }
  }

  return [...byId.values()].sort((a, b) => {
    const da = Math.abs(a.elo - viewerElo);
    const db = Math.abs(b.elo - viewerElo);
    if (da !== db) return da - db;
    if (b.elo !== a.elo) return b.elo - a.elo;
    return a.username.localeCompare(b.username);
  });
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
  private joinLobbyPromise: Promise<void> | null = null;
  private joinMatchPromise: Promise<void> | null = null;
  private matchJoinGeneration = 0;
  private lobbyJoinGeneration = 0;
  private lobbyCleanupPromise: Promise<void> = Promise.resolve();
  private lastOnlinePlayers: PlayerPresence[] = [];
  private lastGlobalLeaderboard: Record<string, unknown>[] = [];
  private lastInstitutionalLeaderboard = new Map<string, Record<string, unknown>[]>();
  private visibilityRefreshHandler: (() => void) | null = null;
  private presenceSyncTimer: ReturnType<typeof setInterval> | null = null;
  private boundAuthSession: Session | null = null;
  private rejoinLobbyTimer: ReturnType<typeof setTimeout> | null = null;
  private removingLobbyChannel = false;

  private static readonly opponentDisconnectGraceMs = 12_000;
  private static readonly presenceSyncIntervalMs = 8_000;

  private onlinePlayersEmitter = new SimpleEmitter<PlayerPresence[]>();
  private challengeEmitter = new SimpleEmitter<Record<string, unknown>>();
  private challengeResponseEmitter = new SimpleEmitter<Record<string, unknown>>();
  private gameEventEmitter = new SimpleEmitter<Record<string, unknown>>();
  private matchOverEmitter = new SimpleEmitter<Record<string, unknown>>();
  private matchStartEmitter = new SimpleEmitter<Record<string, unknown>>();

  private async ensureRealtimeAuth(): Promise<string | null> {
    if (!supabase) return null;
    if (this.boundAuthSession?.access_token) {
      syncSupabaseAuth(this.boundAuthSession);
      return this.boundAuthSession.access_token;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) {
      this.boundAuthSession = session;
      syncSupabaseAuth(session);
      return token;
    }
    return null;
  }

  /** Keep React AuthContext session available for REST + Realtime when client storage lags. */
  clearBoundSession(): void {
    this.boundAuthSession = null;
  }

  getBoundAccessToken(): string | null {
    return this.boundAuthSession?.access_token ?? null;
  }

  private isLobbyChannelReady(channel: RealtimeChannel | null): boolean {
    if (!channel) return false;
    const state = String(channel.state);
    return state === 'joined' || state === 'SUBSCRIBED';
  }

  /** Avoid recursive removeChannel stack overflow (never call from subscribe callbacks). */
  private enqueueChannelRemoval(channel: RealtimeChannel): Promise<void> {
    if (!supabase) return Promise.resolve();
    const removal = (async () => {
      try {
        await channel.untrack().catch(() => {});
        await supabase!.removeChannel(channel);
      } catch (err) {
        console.warn('enqueueChannelRemoval:', err);
      }
    })();
    this.lobbyCleanupPromise = this.lobbyCleanupPromise.then(() => removal);
    return removal;
  }

  private scheduleRemoveChannel(channel: RealtimeChannel): void {
    void this.enqueueChannelRemoval(channel);
  }

  private async detachLobbyChannel(): Promise<void> {
    const channel = this.lobbyChannel;
    this.lobbyChannel = null;
    if (!channel || !supabase || this.removingLobbyChannel) return;

    this.removingLobbyChannel = true;
    try {
      await this.enqueueChannelRemoval(channel);
    } finally {
      this.removingLobbyChannel = false;
    }
  }

  private lobbyIdentityMatches(
    userId: string,
    schoolId: string,
  ): boolean {
    const id = this.lobbyIdentity;
    return Boolean(
      id
      && id.userId === userId
      && id.schoolId === schoolId
      && this.isLobbyChannelReady(this.lobbyChannel),
    );
  }

  private attachLobbyChannelListeners(
    channel: RealtimeChannel,
    generation: number,
    userId: string,
    username: string,
    onPresenceChange: () => void,
  ): void {
    channel.on('broadcast', { event: 'challenge' }, (message) => {
      const data = unwrapChallengePayload((message ?? {}) as Record<string, unknown>);
      const myId = this.lobbyIdentity?.userId ?? userId;
      if (!userIdsEqual(data.to_id, myId)) return;
      this.handleIncomingChallengeBroadcast(data, myId, username);
    });

    channel.on('broadcast', { event: 'challenge_response' }, (message) => {
      const data = unwrapChallengeResponsePayload((message ?? {}) as Record<string, unknown>);
      const myId = this.lobbyIdentity?.userId ?? userId;
      if (!userIdsEqual(data.challenger_id, myId)) return;
      const responderId = data.responder_id?.toString();
      if (responderId) this.pendingOutgoingChallenges.delete(responderId);
      this.challengeResponseEmitter.emit(data);
      if (isChallengeAccepted(data.accepted)) {
        this.matchStartEmitter.emit({
          match_id: data.match_id,
          opponent_id: data.responder_id,
          opponent_username: data.responder_username,
        });
      }
    });

    channel.on('presence', { event: 'sync' }, onPresenceChange);
    channel.on('presence', { event: 'join' }, onPresenceChange);
    channel.on('presence', { event: 'leave' }, onPresenceChange);
  }

  private waitForChannelSubscribe(
    channel: RealtimeChannel,
    generation: number,
    userId: string,
    username: string,
    elo: number,
    beeFiveXp: number,
    onPresenceChange: () => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Lobby channel subscribe timeout'));
      }, 25_000);

      channel.subscribe((status) => {
        if (generation !== this.lobbyJoinGeneration) {
          clearTimeout(timeout);
          this.scheduleRemoveChannel(channel);
          reject(new Error('Lobby join superseded'));
          return;
        }

        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          void (async () => {
            try {
              await channel.track(
                this.lobbyPresencePayload(userId, username, elo, beeFiveXp, 'idle'),
              );
              onPresenceChange();
              resolve();
            } catch (err) {
              reject(err);
            }
          })();
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          clearTimeout(timeout);
          reject(new Error(`Lobby channel ${status}`));
        }
      });
    });
  }

  private isJoinSupersededError(err: unknown): boolean {
    return err instanceof Error && err.message === 'Lobby join superseded';
  }

  private async refreshLobbyTrack(): Promise<void> {
    const identity = this.lobbyIdentity;
    const channel = this.lobbyChannel;
    if (!identity || !channel || !this.isLobbyChannelReady(channel)) return;

    await channel.track(
      this.lobbyPresencePayload(
        identity.userId,
        identity.username,
        identity.elo,
        identity.beeFiveXp,
        'idle',
      ),
    );
    this.publishOnlinePlayersFromIdentity();
  }

  private publishOnlinePlayersFromIdentity(): void {
    const identity = this.lobbyIdentity;
    const channel = this.lobbyChannel;
    if (!identity || !channel) return;
    this.emitOnlinePlayersFromChannel(channel, identity.elo, identity.userId);
  }

  private bindPresenceSyncTimer(): void {
    this.unbindPresenceSyncTimer();
    this.presenceSyncTimer = setInterval(() => {
      this.publishOnlinePlayersFromIdentity();
    }, MgMultiplayerService.presenceSyncIntervalMs);
  }

  private unbindPresenceSyncTimer(): void {
    if (this.presenceSyncTimer) {
      clearInterval(this.presenceSyncTimer);
      this.presenceSyncTimer = null;
    }
  }

  private emitOnlinePlayersFromChannel(
    channel: RealtimeChannel,
    viewerElo: number,
    viewerUserId: string,
  ): void {
    const rawState = channel.presenceState();
    const players = mergeOnlinePlayers(rawState, viewerElo, viewerUserId);
    if (players.length === 0) {
      const { total, others } = countPresenceEntries(rawState, viewerUserId);
      if (others > 0) {
        console.warn('mgMultiplayerService: presence sync had entries but parse returned 0', {
          total,
          others,
          rawState,
        });
      }
    }
    this.lastOnlinePlayers = players;
    this.onlinePlayersEmitter.emit(players);
  }

  private bindLobbyVisibilityRefresh(
    userId: string,
    username: string,
    elo: number,
    beeFiveXp: number,
  ): void {
    if (typeof document === 'undefined') return;
    this.unbindLobbyVisibilityRefresh();
    this.visibilityRefreshHandler = () => {
      if (document.visibilityState !== 'visible' || !this.lobbyChannel || !this.lobbyIdentity) {
        return;
      }
      void this.refreshLobbyTrack();
    };
    document.addEventListener('visibilitychange', this.visibilityRefreshHandler);
  }

  private unbindLobbyVisibilityRefresh(): void {
    if (typeof document === 'undefined' || !this.visibilityRefreshHandler) return;
    document.removeEventListener('visibilitychange', this.visibilityRefreshHandler);
    this.visibilityRefreshHandler = null;
  }

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

  cancelOutgoingChallenge(opponentId: string): void {
    this.pendingOutgoingChallenges.delete(opponentId);
  }

  private emitMatchStart(
    matchId: string,
    opponentId: string,
    opponentUsername: string,
    mutual = false,
  ): void {
    this.matchStartEmitter.emit({
      match_id: matchId,
      opponent_id: opponentId,
      opponent_username: opponentUsername,
      ...(mutual ? { mutual: true } : {}),
    });
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
    const unsub = this.onlinePlayersEmitter.subscribe(listener);
    if (this.lobbyChannel && this.lobbyIdentity) {
      const { elo, userId } = this.lobbyIdentity;
      listener(
        mergeOnlinePlayers(this.lobbyChannel.presenceState(), elo, userId),
      );
    } else if (this.lastOnlinePlayers.length > 0) {
      listener(this.lastOnlinePlayers);
    }
    return unsub;
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
    if (this.joinLobbyPromise) {
      await this.joinLobbyPromise;
    }

    const run = async () => {
      if (!supabase) return;

      if (!canPlayLiveMatches(beeFiveXp)) {
        await this.leaveLobby();
        return;
      }

      const accessToken = await this.ensureRealtimeAuth();
      if (!accessToken) {
        console.error('joinLobby: no auth session — Realtime presence requires sign-in');
        throw new Error('Must be signed in to join the online lobby');
      }

      const inst = institutionName?.trim() ?? '';
      const cc = countryCode?.trim().toUpperCase();
      const nextIdentity: LobbyIdentity = { userId, username, elo, beeFiveXp, schoolId };

      if (this.lobbyIdentityMatches(userId, schoolId)) {
        this.lobbyIdentity = nextIdentity;
        this.lobbyInstitutionName = inst.length > 0 ? displayInstitutionName(inst) : this.lobbyInstitutionName;
        this.lobbyCountryCode = cc && cc.length > 0 ? cc : this.lobbyCountryCode;
        if (!this.activeMatchId) this.matchScreenCount = 0;
        if (!canPlayLiveMatches(beeFiveXp)) {
          await this.leaveLobby();
          return;
        }
        await this.refreshLobbyTrack();
        return;
      }

      const generation = ++this.lobbyJoinGeneration;

      await this.leaveLobby();
      await this.lobbyCleanupPromise;
      if (generation !== this.lobbyJoinGeneration) return;

      this.lobbyInstitutionName = inst.length > 0 ? displayInstitutionName(inst) : null;
      this.lobbyCountryCode = cc && cc.length > 0 ? cc : null;
      this.lobbyIdentity = nextIdentity;

      void this.touchAccountActivity();

      void supabase
        .from('mg_schools')
        .select('name, join_code')
        .eq('id', schoolId)
        .limit(1)
        .then(({ data: schoolRows }) => {
          const row = schoolRows?.[0];
          const dbName = row?.name?.toString().trim();
          const joinCode = row?.join_code?.toString();
          if ((!dbName && !joinCode) || !this.lobbyChannel || !this.lobbyIdentity) return;
          this.lobbyInstitutionName = displayInstitutionName(dbName, joinCode);
          void this.refreshLobbyTrack();
        });

      const onPresenceChange = () => {
        if (generation !== this.lobbyJoinGeneration) return;
        this.publishOnlinePlayersFromIdentity();
      };

      const createChannel = () => {
        const channel = supabase!.channel(`lobby:${UNIVERSAL_LOBBY_CHANNEL_KEY}`);
        this.attachLobbyChannelListeners(channel, generation, userId, username, onPresenceChange);
        return channel;
      };

      let channel = createChannel();

      const subscribe = async (target: RealtimeChannel) => {
        await this.waitForChannelSubscribe(
          target,
          generation,
          userId,
          username,
          elo,
          beeFiveXp,
          onPresenceChange,
        );
      };

      try {
        await subscribe(channel);
      } catch (firstErr) {
        if (this.isJoinSupersededError(firstErr) || generation !== this.lobbyJoinGeneration) {
          return;
        }
        console.warn('joinLobby: subscribe failed, retrying once:', firstErr);
        await this.enqueueChannelRemoval(channel);
        await this.lobbyCleanupPromise;
        if (generation !== this.lobbyJoinGeneration) return;
        channel = createChannel();
        try {
          await subscribe(channel);
        } catch (retryErr) {
          if (this.isJoinSupersededError(retryErr) || generation !== this.lobbyJoinGeneration) {
            return;
          }
          throw retryErr;
        }
      }

      if (generation !== this.lobbyJoinGeneration) {
        this.scheduleRemoveChannel(channel);
        return;
      }

      this.lobbyChannel = channel;
      if (!this.activeMatchId) this.matchScreenCount = 0;
      this.bindLobbyVisibilityRefresh(userId, username, elo, beeFiveXp);
      this.bindPresenceSyncTimer();
      this.publishOnlinePlayersFromIdentity();
    };

    this.joinLobbyPromise = run().finally(() => {
      this.joinLobbyPromise = null;
    });
    await this.joinLobbyPromise;
  }

  private handleIncomingChallengeBroadcast(
    data: Record<string, unknown>,
    userId: string,
    username: string,
  ): void {
    const fromId = data.from_id?.toString() ?? '';
    if (!fromId) return;

    const fromXp = parseChallengeXp(data.from_xp);
    if (!canPlayLiveMatches(fromXp)) return;

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
          this.emitMatchStart(
            canonical,
            fromId,
            data.from_username?.toString() ?? 'Player',
            true,
          );
        })();
      } else {
        this.emitMatchStart(
          canonical,
          fromId,
          data.from_username?.toString() ?? 'Player',
          true,
        );
      }
      return;
    }

    this.challengeEmitter.emit(data);
  }

  async leaveLobby(): Promise<void> {
    this.unbindLobbyVisibilityRefresh();
    this.unbindPresenceSyncTimer();
    await this.detachLobbyChannel();
    this.lobbyInstitutionName = null;
    this.lobbyCountryCode = null;
    this.lobbyIdentity = null;
    this.pendingOutgoingChallenges.clear();
    this.lastOnlinePlayers = [];
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

  /** Re-subscribe to lobby:universal after JWT is set (same pool as Dart app). */
  rejoinLobbyIfActive(): void {
    if (this.rejoinLobbyTimer) {
      clearTimeout(this.rejoinLobbyTimer);
    }
    this.rejoinLobbyTimer = setTimeout(() => {
      this.rejoinLobbyTimer = null;
      void this.rejoinLobbyIfActiveNow();
    }, 300);
  }

  private async rejoinLobbyIfActiveNow(): Promise<void> {
    const identity = this.lobbyIdentity;
    if (!identity) return;

    ensureXpInitialized();
    const xp = getXp();
    if (!canPlayLiveMatches(xp)) {
      await this.leaveLobby();
      return;
    }

    if (this.isLobbyChannelReady(this.lobbyChannel)) {
      await this.ensureRealtimeAuth();
      this.lobbyIdentity = { ...identity, beeFiveXp: xp };
      await this.refreshLobbyTrack();
      return;
    }

    try {
      await this.joinLobby({
        schoolId: identity.schoolId,
        userId: identity.userId,
        username: identity.username,
        elo: identity.elo,
        beeFiveXp: identity.beeFiveXp,
      });
    } catch (err) {
      console.warn('rejoinLobbyIfActive failed:', err);
    }
  }

  async joinLobbyFromCurrentProfile(): Promise<boolean> {
    if (!supabase) return false;
    const token = await this.ensureRealtimeAuth();
    if (!token) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    try {
      const { data: rows, error } = await supabase
        .from('mg_profiles')
        .select('school_id, username, elo, country_code, mg_schools(name, join_code)')
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
      if (!canPlayLiveMatches(beeFiveXp)) {
        await this.leaveLobby();
        return false;
      }

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

  async setSearching(userId: string, username: string, elo: number, beeFiveXp: number): Promise<void> {
    await this.lobbyChannel?.track(
      this.lobbyPresencePayload(userId, username, elo, beeFiveXp, 'searching'),
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
    let acceptedResolved = accepted;
    if (acceptedResolved) {
      ensureXpInitialized();
      if (!canPlayLiveMatches(getXp())) {
        acceptedResolved = false;
      }
    }

    const resolvedMatchId = acceptedResolved
      ? this.matchIdForChallengeAccept(challengerId, matchId)
      : matchId;

    this.pendingOutgoingChallenges.delete(challengerId);

    await this.lobbyChannel?.send({
      type: 'broadcast',
      event: 'challenge_response',
      payload: {
        match_id: resolvedMatchId,
        challenger_id: challengerId,
        accepted: acceptedResolved,
        responder_id: responderId,
        responder_username: responderUsername,
      },
    });
  }

  private isOpponentPresentOnMatchChannel(opponentId: string): boolean {
    const ch = this.matchChannel;
    if (!ch) return false;
    for (const entry of iterPresenceEntries(ch.presenceState())) {
      const payload = presenceEntryToMap(entry);
      if (payload.user_id?.toString() === opponentId) return true;
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

  private async removeStaleMatchChannels(matchId: string): Promise<void> {
    if (!supabase) return;
    const topic = `realtime:match:${matchId}`;
    const stale = supabase.getChannels().filter((ch) => ch.topic === topic);
    await Promise.all(
      stale.map((ch) => supabase!.removeChannel(ch).catch(() => undefined)),
    );
  }

  async joinMatch(matchId: string, userId: string, opponentId: string): Promise<void> {
    if (this.joinMatchPromise) {
      await this.joinMatchPromise;
    }

    const run = async () => {
      if (!supabase) return;

      await this.leaveMatch();

      const generation = ++this.matchJoinGeneration;

      await this.removeStaleMatchChannels(matchId);
      if (generation !== this.matchJoinGeneration) return;

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

      channel.on('broadcast', { event: 'match_over' }, (message) => {
        this.matchOverEmitter.emit(unwrapMatchOverPayload((message ?? {}) as Record<string, unknown>));
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
          if (generation !== this.matchJoinGeneration) {
            clearTimeout(timeout);
            resolve();
            return;
          }
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            await channel.track({ user_id: userId });
            resolve();
          }
        });
      });

      if (generation !== this.matchJoinGeneration) {
        await supabase.removeChannel(channel).catch(() => undefined);
        return;
      }

      this.matchChannel = channel;
    };

    this.joinMatchPromise = run().finally(() => {
      this.joinMatchPromise = null;
    });
    await this.joinMatchPromise;
  }

  async leaveMatch(onlyIfMatchId?: string): Promise<void> {
    if (onlyIfMatchId && this.activeMatchId !== onlyIfMatchId) return;

    this.matchJoinGeneration++;
    this.cancelOpponentDisconnectTimer();
    const endedMatchId = this.activeMatchId;
    this.matchOpponentId = null;
    this.activeMatchId = null;

    if (this.matchChannel && supabase) {
      const channel = this.matchChannel;
      this.matchChannel = null;
      try {
        await channel.untrack();
        await supabase.removeChannel(channel);
      } catch (err) {
        console.warn('leaveMatch:', err);
      }
    }

    if (endedMatchId) {
      await this.removeStaleMatchChannels(endedMatchId);
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

    if (!(await this.ensureAuthenticatedQuery())) {
      throw new Error('Must be signed in to submit match results');
    }

    const body: Record<string, unknown> = {
      player1_id: player1Id,
      player2_id: player2Id,
      is_draw: isDraw,
    };
    if (!isDraw && winnerId) body.winner_id = winnerId;
    if (voidNoMoves) body.void_no_moves = true;

    const token = this.boundAuthSession?.access_token;
    let result: Record<string, unknown>;

    if (token) {
      const direct = await callEdgeFunctionWithToken<Record<string, unknown>>(
        'submit-match',
        body,
        token,
      );
      if (direct.error || !direct.data) {
        throw new Error(direct.error ?? 'submit-match returned no data');
      }
      result = direct.data;
    } else {
      const { data, error } = await supabase.functions.invoke('submit-match', { body });
      if (error) throw error;
      result = (data ?? {}) as Record<string, unknown>;
    }

    if (result.error) {
      throw new Error(String(result.error));
    }

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
    if (!(await this.ensureAuthenticatedQuery())) return 0;
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

  async fetchLatestHeadToHeadMatch(userA: string, userB: string): Promise<Record<string, unknown> | null> {
    if (!supabase || userA === userB) return null;
    if (!(await this.ensureAuthenticatedQuery())) return null;
    try {
      const { data, error } = await supabase
        .from('mg_matches')
        .select(
          'winner_id, player1_id, player2_id, player1_elo_change, player2_elo_change, created_at',
        )
        .or(headToHeadOrFilter(userA, userB))
        .order('created_at', { ascending: false })
        .limit(1);
      if (error || !data?.length) return null;
      return data[0] as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  eloResultFromMatchRow(
    row: Record<string, unknown>,
    myId: string,
  ): { winnerChange?: number; loserChange?: number; player1Change?: number; player2Change?: number } {
    const winnerId = row.winner_id?.toString();
    const p1Id = row.player1_id?.toString() ?? '';
    const p2Id = row.player2_id?.toString() ?? '';
    const p1Change = parseEloChange(row.player1_elo_change);
    const p2Change = parseEloChange(row.player2_elo_change);

    if (!winnerId) {
      return { player1Change: p1Change, player2Change: p2Change };
    }

    const winnerIsP1 = userIdsEqual(winnerId, p1Id);
    return {
      winnerChange: winnerIsP1 ? p1Change : p2Change,
      loserChange: winnerIsP1 ? p2Change : p1Change,
    };
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

    if (!(await this.ensureAuthenticatedQuery())) {
      return computeHeadToHeadSeriesScore({
        userA,
        userB,
        matchesOldestFirst: [],
      });
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

  private async ensureAuthenticatedQuery(): Promise<boolean> {
    if (!supabase) return false;
    if (this.boundAuthSession?.access_token) {
      await bindSupabaseSession(this.boundAuthSession);
      syncSupabaseAuth(this.boundAuthSession);
      return true;
    }
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        this.boundAuthSession = session;
        syncSupabaseAuth(session);
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 75 * (attempt + 1)));
    }
    console.warn('mgMultiplayerService: leaderboard query skipped — no auth session');
    return false;
  }

  /** Call before leaderboard reads when the UI already has a session from AuthContext. */
  async prepareAuthenticatedSession(session: Session | null | undefined): Promise<boolean> {
    if (!supabase || !session?.access_token) {
      this.boundAuthSession = null;
      return false;
    }
    this.boundAuthSession = session;
    syncSupabaseAuth(session);
    await bindSupabaseSession(session);
    return true;
  }

  private async fetchLeaderboardsRpc(schoolId: string): Promise<{
    global: Record<string, unknown>[];
    institutional: Record<string, unknown>[];
  } | null> {
    if (!(await this.ensureAuthenticatedQuery())) return null;

    const token = this.boundAuthSession?.access_token;
    const args = { p_school_id: schoolId.trim() || null };

    if (token) {
      const direct = await callRpcWithToken<{
        global?: unknown;
        institutional?: unknown;
      }>('mg_fetch_leaderboards', args, token);
      if (!direct.error && direct.data) {
        const payload = direct.data;
        return {
          global: Array.isArray(payload.global)
            ? (payload.global as Record<string, unknown>[])
            : [],
          institutional: Array.isArray(payload.institutional)
            ? (payload.institutional as Record<string, unknown>[])
            : [],
        };
      }
      if (direct.error && !direct.error.includes('Could not find')) {
        console.warn('mg_fetch_leaderboards (direct JWT) failed:', direct.error);
      }
    }

    if (!supabase) return null;
    try {
      const { data, error } = await supabase.rpc('mg_fetch_leaderboards', args);
      if (error) {
        if (
          error.code !== '42883'
          && !error.message.includes('Could not find the function')
          && !error.message.includes('schema cache')
        ) {
          console.warn('mg_fetch_leaderboards failed:', error.message);
        }
        return null;
      }
      const payload = data as { global?: unknown; institutional?: unknown } | null;
      return {
        global: Array.isArray(payload?.global)
          ? (payload.global as Record<string, unknown>[])
          : [],
        institutional: Array.isArray(payload?.institutional)
          ? (payload.institutional as Record<string, unknown>[])
          : [],
      };
    } catch {
      return null;
    }
  }

  /** Prevent realtime subscription refresh from wiping a good first fetch. */
  seedLeaderboardCache(
    globalRows: Record<string, unknown>[],
    institutionalRows: Record<string, unknown>[],
    schoolId: string,
  ): void {
    if (globalRows.length > 0) this.lastGlobalLeaderboard = globalRows;
    if (institutionalRows.length > 0) {
      this.lastInstitutionalLeaderboard.set(schoolId, institutionalRows);
    }
  }

  private publishLeaderboardRows(
    kind: 'global' | 'institutional',
    schoolId: string | null,
    rows: Record<string, unknown>[],
    onUpdate: (rows: Record<string, unknown>[]) => void,
  ): void {
    if (rows.length > 0) {
      if (kind === 'global') this.lastGlobalLeaderboard = rows;
      else if (schoolId) this.lastInstitutionalLeaderboard.set(schoolId, rows);
      onUpdate(rows);
      return;
    }

    const cached =
      kind === 'global'
        ? this.lastGlobalLeaderboard
        : (schoolId ? this.lastInstitutionalLeaderboard.get(schoolId) : []) ?? [];

    if (cached.length > 0) {
      console.warn(`mgMultiplayerService: ignoring empty ${kind} leaderboard refresh; keeping cached rows`);
      onUpdate(cached);
      return;
    }

    onUpdate(rows);
  }

  async collectLobbyDiagnostics(schoolId: string, userId: string): Promise<LobbyDiagnostics> {
    const base: LobbyDiagnostics = {
      hasSession: false,
      userId: null,
      schoolId,
      schoolJoinCode: null,
      schoolName: null,
      profileSchoolId: null,
      lobbyChannelState: this.lobbyChannel?.state ?? null,
      presenceTotal: 0,
      presenceOthers: 0,
      globalLeaderboardCount: 0,
      institutionalLeaderboardCount: 0,
      globalLeaderboardError: null,
      institutionalLeaderboardError: null,
      globalLeaderboardRows: [],
      institutionalLeaderboardRows: [],
      hint: null,
    };

    if (!supabase) {
      base.hint = 'Supabase is not configured in this build.';
      return base;
    }

    const { data: { session } } = await supabase.auth.getSession();
    base.hasSession = Boolean(this.boundAuthSession?.access_token || session?.access_token);
    base.userId = this.boundAuthSession?.user?.id ?? session?.user?.id ?? null;

    if (this.lobbyChannel) {
      const counts = countPresenceEntries(this.lobbyChannel.presenceState(), userId);
      base.presenceTotal = counts.total;
      base.presenceOthers = counts.others;
    }

    if (base.hasSession) {
      const { data: schoolRows } = await supabase
        .from('mg_schools')
        .select('name, join_code')
        .eq('id', schoolId)
        .limit(1);
      if (schoolRows?.[0]) {
        base.schoolName = displayInstitutionName(
          schoolRows[0].name?.toString(),
          schoolRows[0].join_code?.toString(),
        );
        base.schoolJoinCode = schoolRows[0].join_code?.toString().trim().toUpperCase() || null;
      }

      const { data: ownRows } = await supabase
        .from('mg_profiles')
        .select('school_id')
        .eq('id', userId)
        .limit(1);
      base.profileSchoolId = ownRows?.[0]?.school_id?.toString().trim() ?? null;

      const { data: instData, error: instErr } = await supabase
        .from('mg_profiles')
        .select('id, username, elo, wins, losses, country_code')
        .eq('school_id', schoolId)
        .order('elo', { ascending: false })
        .limit(100);

      const rpcLeaderboards = await this.fetchLeaderboardsRpc(schoolId);
      if (rpcLeaderboards) {
        base.globalLeaderboardCount = rpcLeaderboards.global.length;
        base.globalLeaderboardRows = rpcLeaderboards.global;
        base.institutionalLeaderboardCount = rpcLeaderboards.institutional.length;
        base.institutionalLeaderboardRows = rpcLeaderboards.institutional;
      } else if (instErr) {
        base.institutionalLeaderboardError = instErr.message;
      } else {
        base.institutionalLeaderboardCount = instData?.length ?? 0;
        base.institutionalLeaderboardRows = (instData ?? []) as Record<string, unknown>[];
      }

      if (!rpcLeaderboards) {
        const { data: globalData, error: globalErr } = await supabase
          .from('mg_profiles')
          .select('id, username, elo, wins, losses, school_id, country_code')
          .not('school_id', 'is', null)
          .order('elo', { ascending: false })
          .limit(100);
        if (globalErr) base.globalLeaderboardError = globalErr.message;
        else {
          base.globalLeaderboardCount = globalData?.length ?? 0;
          base.globalLeaderboardRows = (globalData ?? []) as Record<string, unknown>[];
        }
        if (!instErr && !base.institutionalLeaderboardRows.length) {
          base.institutionalLeaderboardCount = instData?.length ?? 0;
          base.institutionalLeaderboardRows = (instData ?? []) as Record<string, unknown>[];
        }
      }
    }

    if (!base.hasSession) {
      base.hint = 'Sign in again — rankings and online players need an active session.';
    } else if (base.profileSchoolId && base.profileSchoolId !== schoolId) {
      base.hint = 'Your saved school does not match this lobby. Leave the lobby in Settings and re-join with your school code.';
    } else if (base.schoolJoinCode === DEFAULT_LOBBY_JOIN_CODE) {
      base.hint =
        'You are in the Unclassified lobby (00BEE00). Join your real school code from Settings → Leave lobby, then Live Matches, if you have one.';
    } else if (
      base.globalLeaderboardCount === 0
      && base.institutionalLeaderboardCount === 0
      && (base.globalLeaderboardError || base.institutionalLeaderboardError)
    ) {
      base.hint = `Leaderboard read failed (${base.globalLeaderboardError ?? base.institutionalLeaderboardError}). Database permissions may need updating (supabase db push).`;
    } else if (
      base.globalLeaderboardCount === 0
      && base.institutionalLeaderboardCount === 0
      && base.profileSchoolId
    ) {
      base.hint =
        'No ranked players are visible. If others play on mobile, run `supabase db push` from bee_five so leaderboard permissions are applied.';
    } else if (base.lobbyChannelState !== 'joined') {
      base.hint = 'Not connected to the live lobby channel. Refresh the page.';
    } else if (base.presenceOthers === 0 && base.globalLeaderboardCount > 1) {
      base.hint = `No one else is online right now (${base.globalLeaderboardCount} ranked players on Global Rankings). Open Live Matches on another device to test.`;
    } else if (base.globalLeaderboardCount > 0 && base.institutionalLeaderboardCount <= 1) {
      base.hint = `${base.globalLeaderboardCount} players on Global Rankings. Institutional shows only your school (${base.schoolJoinCode ?? 'code unknown'}).`;
    }

    console.info('Lobby diagnostics', base);
    return base;
  }

  async getLeaderboard(schoolId: string): Promise<Record<string, unknown>[]> {
    if (!supabase || !(await this.ensureAuthenticatedQuery())) return [];

    const rpc = await this.fetchLeaderboardsRpc(schoolId);
    if (rpc) {
      if (rpc.institutional.length > 0) {
        this.lastInstitutionalLeaderboard.set(schoolId, rpc.institutional);
      }
      return rpc.institutional;
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data, error } = await supabase
        .from('mg_profiles')
        .select('id, username, elo, wins, losses, country_code')
        .eq('school_id', schoolId)
        .order('elo', { ascending: false })
        .limit(100);
      if (error) {
        console.error('getLeaderboard failed:', error.message, { schoolId, attempt });
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
          continue;
        }
        return this.lastInstitutionalLeaderboard.get(schoolId) ?? [];
      }
      const rows = (data ?? []) as Record<string, unknown>[];
      if (rows.length > 0 || attempt === 2) {
        if (rows.length > 0) this.lastInstitutionalLeaderboard.set(schoolId, rows);
        return rows;
      }
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }
    return this.lastInstitutionalLeaderboard.get(schoolId) ?? [];
  }

  async getGlobalLeaderboard(schoolId?: string): Promise<Record<string, unknown>[]> {
    if (!supabase || !(await this.ensureAuthenticatedQuery())) return [];

    const rpcSchoolId = schoolId?.trim() || this.lobbyIdentity?.schoolId?.trim() || '';
    const rpc = await this.fetchLeaderboardsRpc(rpcSchoolId);
    if (rpc) {
      if (rpc.global.length > 0) this.lastGlobalLeaderboard = rpc.global;
      return rpc.global;
    }

    const client = supabase;

    const runQuery = async (withSchoolEmbed: boolean) => {
      if (withSchoolEmbed) {
        return client
          .from('mg_profiles')
          .select('id, username, elo, wins, losses, school_id, country_code, mg_schools(name, join_code)')
          .not('school_id', 'is', null)
          .order('elo', { ascending: false })
          .limit(100);
      }
      return client
        .from('mg_profiles')
        .select('id, username, elo, wins, losses, school_id, country_code')
        .not('school_id', 'is', null)
        .order('elo', { ascending: false })
        .limit(100);
    };

    for (let attempt = 0; attempt < 3; attempt += 1) {
      let { data, error } = await runQuery(false);
      if (error) {
        console.error('getGlobalLeaderboard failed:', error.message, { attempt });
        ({ data, error } = await runQuery(true));
      } else if ((data?.length ?? 0) === 0 && attempt === 0) {
        ({ data, error } = await runQuery(true));
      }

      if (error) {
        console.error('getGlobalLeaderboard retry failed:', error.message, { attempt });
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
          continue;
        }
        return this.lastGlobalLeaderboard;
      }

      const rows = (data ?? []) as Record<string, unknown>[];
      if (rows.length > 0 || attempt === 2) {
        if (rows.length > 0) this.lastGlobalLeaderboard = rows;
        return rows;
      }
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }

    return this.lastGlobalLeaderboard;
  }

  subscribeLeaderboard(
    schoolId: string,
    onUpdate: (rows: Record<string, unknown>[]) => void,
  ): Unsubscribe {
    const client = supabase;
    if (!client) return () => {};

    const refresh = () => {
      void (async () => {
        if (!(await this.ensureAuthenticatedQuery())) return;
        const rows = await this.getLeaderboard(schoolId);
        this.publishLeaderboardRows('institutional', schoolId, rows, onUpdate);
      })();
    };

    const { data: { subscription: authSub } } = client.auth.onAuthStateChange((event, session) => {
      if (
        session?.access_token
        && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')
      ) {
        refresh();
      }
    });

    void client.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) refresh();
    });

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
        refresh,
      )
      .subscribe();

    return () => {
      authSub.unsubscribe();
      void client.removeChannel(channel);
    };
  }

  subscribeGlobalLeaderboard(onUpdate: (rows: Record<string, unknown>[]) => void): Unsubscribe {
    const client = supabase;
    if (!client) return () => {};

    const refresh = () => {
      void (async () => {
        if (!(await this.ensureAuthenticatedQuery())) return;
        const rows = await this.getGlobalLeaderboard();
        this.publishLeaderboardRows('global', null, rows, onUpdate);
      })();
    };

    const { data: { subscription: authSub } } = client.auth.onAuthStateChange((event, session) => {
      if (
        session?.access_token
        && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')
      ) {
        refresh();
      }
    });

    void client.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) refresh();
    });

    const channel = client
      .channel('global-lb')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mg_profiles' },
        refresh,
      )
      .subscribe();

    return () => {
      authSub.unsubscribe();
      void client.removeChannel(channel);
    };
  }

  async searchGlobalLeaderboard(query: string): Promise<Record<string, unknown>[]> {
    if (!supabase || !(await this.ensureAuthenticatedQuery())) return [];
    const pattern = usernameIlikePattern(query);
    if (!pattern) return [];

    const { data, error } = await supabase
      .from('mg_profiles')
      .select('id, username, elo, wins, losses, school_id, country_code, mg_schools(name, join_code)')
      .not('school_id', 'is', null)
      .ilike('username', pattern)
      .order('elo', { ascending: false })
      .limit(50);
    if (error) {
      console.error('searchGlobalLeaderboard failed:', error.message);
      return [];
    }
    return (data ?? []) as Record<string, unknown>[];
  }

  async searchInstitutionalLeaderboard(
    schoolId: string,
    query: string,
  ): Promise<Record<string, unknown>[]> {
    if (!supabase || !(await this.ensureAuthenticatedQuery())) return [];
    const pattern = usernameIlikePattern(query);
    if (!pattern) return [];

    const { data, error } = await supabase
      .from('mg_profiles')
      .select('id, username, elo, wins, losses, country_code')
      .eq('school_id', schoolId)
      .ilike('username', pattern)
      .order('elo', { ascending: false })
      .limit(50);
    if (error) {
      console.error('searchInstitutionalLeaderboard failed:', error.message);
      return [];
    }
    return (data ?? []) as Record<string, unknown>[];
  }

  async getLeaderboardRank(elo: number, schoolId?: string): Promise<number | null> {
    if (!supabase || !(await this.ensureAuthenticatedQuery())) return null;
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

  async createMgProfile(
    username: string,
    options?: { fullName?: string; countryCode?: string },
    knownUser?: User,
  ): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    const user = knownUser ?? (await supabase.auth.getUser()).data.user;
    if (!user) {
      throw new Error('Must be signed in to create your online profile');
    }

    const cc = options?.countryCode?.trim().toUpperCase()
      ?? user.user_metadata?.country_code?.toString().trim().toUpperCase()
      ?? null;
    const fullName = options?.fullName?.trim()
      ?? user.user_metadata?.full_name?.toString().trim()
      ?? null;

    const payload: Record<string, unknown> = {
      id: user.id,
      username,
      elo: 1200,
      wins: 0,
      losses: 0,
    };
    if (fullName) payload.full_name = fullName;
    if (cc) payload.country_code = cc;

    const authEmail = user.email?.trim();
    if (
      authEmail &&
      !authEmail.toLowerCase().endsWith(`@${INTERNAL_EMAIL_DOMAIN}`)
    ) {
      payload.email = authEmail;
    }

    const { error } = await supabase.from('mg_profiles').insert(payload);
    if (error) {
      const dup = error.code === '23505' || error.message.toLowerCase().includes('duplicate');
      if (!dup) throw error;
      const updates: Record<string, unknown> = { username };
      if (fullName) updates.full_name = fullName;
      if (cc) updates.country_code = cc;
      if (payload.email) updates.email = payload.email;
      await supabase.from('mg_profiles').update(updates).eq('id', user.id);
    }

    await this.touchAccountActivity();
  }

  /**
   * Ensure mg_profiles exists after sign-in/sign-up (Dart createProfile parity).
   * Creates the row when missing; patches metadata when present.
   */
  async ensureMgProfileFromAuth(
    options?: {
      username?: string;
      fullName?: string;
      countryCode?: string;
    },
    session?: Session | null,
  ): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const activeSession = session?.access_token ? session : this.boundAuthSession;
    if (activeSession?.access_token) {
      this.boundAuthSession = activeSession;
      syncSupabaseAuth(activeSession);
      await bindSupabaseSession(activeSession);
    }

    let user: User | null = activeSession?.user ?? null;
    if (!user) {
      const { data: { session: stored } } = await supabase.auth.getSession();
      user = stored?.user ?? null;
    }
    if (!user) {
      const { data: { user: fetched }, error: userError } = await supabase.auth.getUser();
      if (userError || !fetched) {
        throw new Error('Must be signed in to load your online profile');
      }
      user = fetched;
    }

    await this.syncMgProfileFromAuthMetadata();

    const { data: existing, error: readError } = await supabase
      .from('mg_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (readError) {
      throw new Error(readError.message || 'Could not read your online profile');
    }

    if (existing?.id) return;

    const metaUsername = user.user_metadata?.username?.toString().trim();
    const username = options?.username?.trim()
      || (metaUsername && metaUsername.length > 0 ? metaUsername : '')
      || user.email?.split('@')[0]?.trim()
      || `p_${user.id.replace(/-/g, '').slice(0, 12)}`;

    await this.createMgProfile(username, {
      fullName: options?.fullName,
      countryCode: options?.countryCode,
    }, user);
  }

  async syncMgProfileFromAuthMetadata(): Promise<void> {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await this.touchAccountActivity();

    const fullName = user.user_metadata?.full_name?.toString().trim() || null;
    const countryCode = user.user_metadata?.country_code?.toString().trim().toUpperCase() || null;
    const authEmail = user.email?.trim();
    const hasContactEmail = Boolean(
      authEmail &&
        !authEmail.toLowerCase().endsWith(`@${INTERNAL_EMAIL_DOMAIN}`),
    );

    if (!fullName && !hasContactEmail && !countryCode) return;

    const { data: existing } = await supabase
      .from('mg_profiles')
      .select('full_name, email, country_code')
      .eq('id', user.id)
      .maybeSingle();

    if (!existing) {
      const metaUsername = user.user_metadata?.username?.toString().trim();
      const username = metaUsername && metaUsername.length > 0
        ? metaUsername
        : `p_${user.id.replace(/-/g, '').slice(0, 12)}`;
      await supabase.from('mg_profiles').insert({
        id: user.id,
        username,
        elo: 1200,
        wins: 0,
        losses: 0,
        ...(fullName ? { full_name: fullName } : {}),
        ...(countryCode ? { country_code: countryCode } : {}),
        ...(hasContactEmail ? { email: authEmail } : {}),
      });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (hasContactEmail) updates.email = authEmail;
    if (fullName) updates.full_name = fullName;
    if (countryCode) updates.country_code = countryCode;
    if (Object.keys(updates).length > 0) {
      await supabase.from('mg_profiles').update(updates).eq('id', user.id);
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
