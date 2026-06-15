'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { mgMultiplayerService } from '../../services/mgMultiplayerService';
import type { PlayerPresence } from '../../models/playerPresence';
import {
  canPlayLiveMatches,
  ensureXpInitialized,
  getXp,
  liveMatchesRequiresXpMessage,
} from '../../services/xpService';
import { eloRankTitle, formatPlayerRankTitle } from '../../utils/playerRank';
import { usernameWithFlag } from '../../utils/countryFlag';
import { multiplayerTheme } from '../../constants/multiplayerTheme';

const ROW_HEIGHT = 40;

interface SchoolLobbyProps {
  schoolId: string;
  schoolName?: string;
  userId: string;
  username: string;
  elo: number;
  onBack: () => void;
  onChallengeSent?: (message: string) => void;
}

export default function SchoolLobby({
  schoolId,
  schoolName,
  userId,
  username,
  elo,
  onBack,
  onChallengeSent,
}: SchoolLobbyProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerPresence[]>([]);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<Record<string, unknown>[]>([]);
  const [institutionalLeaderboard, setInstitutionalLeaderboard] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myLobbyXp, setMyLobbyXp] = useState(getXp());
  const [institutionName, setInstitutionName] = useState(schoolName?.trim() ?? '');
  const [myCountryCode, setMyCountryCode] = useState('');
  const [schoolIdToName, setSchoolIdToName] = useState<Record<string, string>>({});
  const [myGlobalRank, setMyGlobalRank] = useState<number | null>(null);
  const [myInstitutionalRank, setMyInstitutionalRank] = useState<number | null>(null);

  const [playerSearch, setPlayerSearch] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [institutionalSearch, setInstitutionalSearch] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<Record<string, unknown>[]>([]);
  const [institutionalSearchResults, setInstitutionalSearchResults] = useState<Record<string, unknown>[]>([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [institutionalSearchLoading, setInstitutionalSearchLoading] = useState(false);

  const profileElo = (p: Record<string, unknown>) => {
    const v = p.elo;
    if (typeof v === 'number') return Math.trunc(v);
    return parseInt(String(v ?? '1200'), 10) || 1200;
  };

  const institutionLabel = (row: Record<string, unknown>) => {
    const fromJoin = MgMultiplayerServiceInstitutionName(row);
    if (fromJoin) return fromJoin;
    const sid = row.school_id?.toString();
    if (sid && schoolIdToName[sid]) return schoolIdToName[sid];
    return '—';
  };

  const filteredOnlinePlayers = useMemo(() => {
    const q = playerSearch.trim().toLowerCase();
    if (!q) return onlinePlayers;
    return onlinePlayers.filter((p) => p.username.toLowerCase().includes(q));
  }, [onlinePlayers, playerSearch]);

  useEffect(() => {
    let cancelled = false;
    const unsubs: (() => void)[] = [];

    async function init() {
      unsubs.push(
        mgMultiplayerService.onOnlinePlayers(setOnlinePlayers),
        mgMultiplayerService.subscribeGlobalLeaderboard(setGlobalLeaderboard),
        mgMultiplayerService.subscribeLeaderboard(schoolId, setInstitutionalLeaderboard),
      );

      ensureXpInitialized();
      const xp = getXp();
      if (!cancelled) setMyLobbyXp(xp);

      let resolvedInstitution = schoolName?.trim() ?? '';
      let resolvedCountry = '';

      if (supabase) {
        if (!resolvedInstitution) {
          const { data } = await supabase.from('mg_schools').select('name').eq('id', schoolId).limit(1);
          resolvedInstitution = data?.[0]?.name?.toString().trim() ?? '';
        }

        const { data: profileRows } = await supabase
          .from('mg_profiles')
          .select('country_code')
          .eq('id', userId)
          .limit(1);
        const cc = profileRows?.[0]?.country_code?.toString().trim();
        if (cc) resolvedCountry = cc.toUpperCase();

        const { data: schools } = await supabase.from('mg_schools').select('id, name');
        const map: Record<string, string> = {};
        for (const row of schools ?? []) {
          const id = row.id?.toString();
          const name = row.name?.toString().trim();
          if (id && name) map[id] = name;
        }
        if (!cancelled) setSchoolIdToName(map);
      }

      if (!cancelled) {
        setInstitutionName(resolvedInstitution);
        setMyCountryCode(resolvedCountry);
      }

      const [globalRank, institutionalRank] = await Promise.all([
        mgMultiplayerService.getLeaderboardRank(elo),
        mgMultiplayerService.getLeaderboardRank(elo, schoolId),
      ]);

      if (!cancelled) {
        setMyGlobalRank(globalRank);
        setMyInstitutionalRank(institutionalRank);
      }

      await mgMultiplayerService.joinLobby({
        schoolId,
        userId,
        username,
        elo,
        beeFiveXp: xp,
        institutionName: resolvedInstitution || undefined,
        countryCode: resolvedCountry || undefined,
      });

      if (!cancelled) setIsLoading(false);
    }

    void init();

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [schoolId, schoolName, userId, username, elo]);

  useEffect(() => {
    const q = globalSearch.trim();
    if (!q) {
      setGlobalSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      setGlobalSearchLoading(true);
      void mgMultiplayerService.searchGlobalLeaderboard(q).then((rows) => {
        setGlobalSearchResults(rows);
        setGlobalSearchLoading(false);
      });
    }, 350);
    return () => clearTimeout(t);
  }, [globalSearch]);

  useEffect(() => {
    const q = institutionalSearch.trim();
    if (!q) {
      setInstitutionalSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      setInstitutionalSearchLoading(true);
      void mgMultiplayerService.searchInstitutionalLeaderboard(schoolId, q).then((rows) => {
        setInstitutionalSearchResults(rows);
        setInstitutionalSearchLoading(false);
      });
    }, 350);
    return () => clearTimeout(t);
  }, [institutionalSearch, schoolId]);

  const canChallenge = (player: PlayerPresence) =>
    canPlayLiveMatches(myLobbyXp) && player.hasLobbyChallengeXp && player.status !== 'in_match';

  const sendChallenge = async (player: PlayerPresence) => {
    ensureXpInitialized();
    const xp = getXp();
    setMyLobbyXp(xp);

    if (!canPlayLiveMatches(xp)) {
      onChallengeSent?.(liveMatchesRequiresXpMessage);
      return;
    }
    if (player.status === 'in_match') {
      onChallengeSent?.('That player is in a match and can’t be challenged right now.');
      return;
    }
    if (!player.hasLobbyChallengeXp) {
      onChallengeSent?.(`${player.username} needs at least 1 XP to play Live Matches.`);
      return;
    }

    const matchId = mgMultiplayerService.matchIdForOutgoingChallenge(
      player.userId,
      crypto.randomUUID(),
    );

    await mgMultiplayerService.sendChallenge({
      fromId: userId,
      fromUsername: username,
      fromElo: elo,
      fromBeeFiveXp: xp,
      toId: player.userId,
      matchId,
    });

    onChallengeSent?.(`Challenge sent to ${player.username}…`);
  };

  const tabs = ['Online Players', 'Global Rankings', 'Institutional Ranking'];

  return (
    <div style={{ minHeight: '100vh', background: multiplayerTheme.scaffoldBackground, display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: multiplayerTheme.lobbyHeaderBackground, borderBottom: '2px solid #000' }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', fontWeight: 800, cursor: 'pointer' }}>
            ←
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '17px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {usernameWithFlag(formatPlayerRankTitle(username, elo), myCountryCode)}
            </div>
            {institutionName && (
              <div style={{ fontSize: '13px', fontWeight: 600, opacity: 0.72 }}>{institutionName}</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', background: '#000' }}>
          {tabs.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setSelectedTab(index)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                borderBottom: selectedTab === index ? `3px solid ${multiplayerTheme.lobbyTabSelected}` : '3px solid transparent',
                color: selectedTab === index ? multiplayerTheme.lobbyTabSelected : 'rgba(255,255,255,0.7)',
                fontWeight: selectedTab === index ? 800 : 500,
                fontSize: '11px',
                padding: '10px 2px',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>
        ) : selectedTab === 0 ? (
          <OnlineTab
            playerSearch={playerSearch}
            setPlayerSearch={setPlayerSearch}
            filtered={filteredOnlinePlayers}
            allCount={onlinePlayers.length}
            institutionName={institutionName}
            canChallenge={canChallenge}
            onChallenge={(p) => void sendChallenge(p)}
          />
        ) : selectedTab === 1 ? (
          <LeaderboardTab
            search={globalSearch}
            setSearch={setGlobalSearch}
            searchLoading={globalSearchLoading}
            searching={globalSearch.trim().length > 0}
            players={globalSearch.trim() ? globalSearchResults : globalLeaderboard}
            myRank={myGlobalRank}
            elo={elo}
            rankLabel="global"
            userId={userId}
            columns={['Username', 'Institution', 'Rank', 'ELO']}
            renderCells={(p, isMe) => [
              usernameWithFlag(p.username?.toString() ?? 'Player', p.country_code?.toString()),
              institutionLabel(p),
              eloRankTitle(profileElo(p)),
              String(profileElo(p)),
            ]}
            isMe={(p) => p.id?.toString() === userId}
          />
        ) : (
          <LeaderboardTab
            search={institutionalSearch}
            setSearch={setInstitutionalSearch}
            searchLoading={institutionalSearchLoading}
            searching={institutionalSearch.trim().length > 0}
            players={institutionalSearch.trim() ? institutionalSearchResults : institutionalLeaderboard}
            myRank={myInstitutionalRank}
            elo={elo}
            rankLabel="institutional"
            userId={userId}
            columns={['Username', 'Rank', 'ELO', 'XPs']}
            renderCells={(p, isMe) => [
              usernameWithFlag(p.username?.toString() ?? 'Player', p.country_code?.toString()),
              eloRankTitle(profileElo(p)),
              String(profileElo(p)),
              isMe ? String(myLobbyXp) : '—',
            ]}
            isMe={(p) => p.id?.toString() === userId}
          />
        )}
      </main>
    </div>
  );
}

function MgMultiplayerServiceInstitutionName(row: Record<string, unknown>): string | null {
  const nested = row.mg_schools;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const n = (nested as Record<string, unknown>).name?.toString().trim();
    if (n) return n;
  }
  return null;
}

function SearchField({
  value,
  onChange,
  placeholder,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  loading?: boolean;
}) {
  return (
    <div style={{ padding: '8px 12px 0' }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '10px',
          border: '2px solid #000',
          borderRadius: '10px',
          fontWeight: 600,
        }}
      />
      {loading && <div style={{ fontSize: '12px', marginTop: '4px' }}>Searching…</div>}
    </div>
  );
}

function OnlineTab({
  playerSearch,
  setPlayerSearch,
  filtered,
  allCount,
  institutionName,
  canChallenge,
  onChallenge,
}: {
  playerSearch: string;
  setPlayerSearch: (v: string) => void;
  filtered: PlayerPresence[];
  allCount: number;
  institutionName: string;
  canChallenge: (p: PlayerPresence) => boolean;
  onChallenge: (p: PlayerPresence) => void;
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <SearchField value={playerSearch} onChange={setPlayerSearch} placeholder="Search player…" />
      <TableHeader labels={['Username', 'Institution', 'Rank', 'ELO', '']} />
      <div style={{ flex: 1, overflow: 'auto' }}>
        {allCount === 0 ? (
          <p style={{ textAlign: 'center', padding: '24px', fontWeight: 600, opacity: 0.65 }}>
            No other players are online right now
          </p>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '24px', fontWeight: 600, opacity: 0.65 }}>No players found</p>
        ) : (
          filtered.map((player) => (
            <div
              key={player.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                minHeight: ROW_HEIGHT,
                padding: '0 6px',
                background: '#fff',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                fontSize: '14px',
              }}
            >
              <Cell flex={3}>{usernameWithFlag(player.username, player.countryCode)}</Cell>
              <Cell flex={2}>{player.institution || '—'}</Cell>
              <Cell flex={2}>{player.rankTitle}</Cell>
              <Cell flex={1}>{player.elo}</Cell>
              <Cell flex={2} align="right">
                {canChallenge(player) ? (
                  <button type="button" onClick={() => onChallenge(player)} style={{ fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
                    Challenge
                  </button>
                ) : (
                  <span style={{ fontSize: '11px', color: 'rgba(0,0,0,0.54)', fontWeight: 600 }}>
                    {player.status === 'in_match' ? 'Busy' : !player.hasLobbyChallengeXp ? 'No XP' : ''}
                  </span>
                )}
              </Cell>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LeaderboardTab({
  search,
  setSearch,
  searchLoading,
  searching,
  players,
  myRank,
  elo,
  rankLabel,
  userId,
  columns,
  renderCells,
  isMe,
}: {
  search: string;
  setSearch: (v: string) => void;
  searchLoading: boolean;
  searching: boolean;
  players: Record<string, unknown>[];
  myRank: number | null;
  elo: number;
  rankLabel: string;
  userId: string;
  columns: string[];
  renderCells: (p: Record<string, unknown>, isMe: boolean) => string[];
  isMe: (p: Record<string, unknown>) => boolean;
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <SearchField value={search} onChange={setSearch} placeholder="Search player…" loading={searching && searchLoading} />
      {!searching && myRank != null && (
        <div style={{ margin: '4px 8px', padding: '4px 8px', background: '#fff', border: '2px solid #000', fontWeight: 700, fontSize: '12px' }}>
          Your {rankLabel} rank · #{myRank} · {elo} ELO
        </div>
      )}
      <TableHeader labels={columns} showRank />
      <div style={{ flex: 1, overflow: 'auto' }}>
        {players.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '24px', fontWeight: 600, opacity: 0.65 }}>
            {searching ? 'No players found' : 'No ranked players yet'}
          </p>
        ) : (
          players.map((p, index) => {
            const me = isMe(p);
            const cells = renderCells(p, me);
            return (
              <div
                key={p.id?.toString() ?? index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: ROW_HEIGHT - 4,
                  padding: '0 6px',
                  background: me ? multiplayerTheme.lobbySelfRowBackground : '#fff',
                  border: me ? '2px solid #000' : 'none',
                  borderBottom: me ? undefined : '1px solid rgba(0,0,0,0.06)',
                  fontSize: '13px',
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 22,
                    borderRadius: '50%',
                    background: '#000',
                    color: multiplayerTheme.primaryYellow,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 800,
                    marginRight: 4,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </span>
                {cells.map((text, i) => (
                  <Cell key={i} flex={i === 0 ? 3 : 2}>
                    {text}
                  </Cell>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function TableHeader({ labels, showRank }: { labels: string[]; showRank?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        padding: showRank ? '8px 8px 8px 38px' : '8px',
        background: '#fff',
        border: '2px solid #000',
        margin: '4px 4px 0',
        fontWeight: 800,
        fontSize: '11px',
      }}
    >
      {labels.map((label) => (
        <Cell key={label} flex={label === 'Username' || label === '' ? 3 : 2}>
          {label}
        </Cell>
      ))}
    </div>
  );
}

function Cell({
  children,
  flex = 1,
  align,
}: {
  children: React.ReactNode;
  flex?: number;
  align?: 'left' | 'right';
}) {
  return (
    <div
      style={{
        flex,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textAlign: align ?? 'left',
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}
