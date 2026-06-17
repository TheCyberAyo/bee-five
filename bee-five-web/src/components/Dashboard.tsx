"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { displayUsernameFromUser } from '../lib/supabaseProject';
import { supabase } from '../lib/supabase';
import {
  loadSessionAdventureProgress,
  readLocalPlayerStats,
  syncAdventureProgress,
} from '../services/progressService';
import { fetchOnlineDashboardStats, guestOnlineDashboardStats, type OnlineDashboardStats } from '../services/onlineDashboardStats';
import { usernameWithFlag } from '../utils/countryFlag';
import { soundManager } from '../utils/sounds';

interface DashboardProps {
  onBackToMenu: () => void;
  isMobile: boolean;
}

type DashboardStats = {
  username: string;
  adventureLevel: number;
  classicBestScore: number;
  loginStreak: number;
  xp: number;
  countryCode: string;
  online: OnlineDashboardStats;
};

function resolveUsername(user: ReturnType<typeof useAuth>['user']): string {
  if (!user) return 'Guest';
  const fromMeta = displayUsernameFromUser(user);
  if (fromMeta?.trim()) return fromMeta.trim();
  const email = user.email?.trim();
  if (email?.includes('@')) return email.split('@')[0];
  return 'Guest';
}

export default function Dashboard({ onBackToMenu, isMobile }: DashboardProps) {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const username = resolveUsername(user);
      let adventureLevel = 1;
      let classicBestScore = 0;
      let loginStreak = 0;
      let xp = 0;
      let countryCode = '';
      let online = guestOnlineDashboardStats();

      const localStats = readLocalPlayerStats(user?.id ?? null);
      classicBestScore = localStats.classicBestStreak;
      loginStreak = localStats.loginStreak;
      xp = localStats.userXp;

      try {
        if (user?.id) {
          const synced = await syncAdventureProgress(user.id);
          if (synced) {
            adventureLevel = synced.highestUnlockedGame;
            classicBestScore = synced.classicBestStreak;
            loginStreak = synced.loginStreak;
            xp = synced.userXp;
          } else {
            const progress = await loadSessionAdventureProgress(user.id);
            if (progress) {
              adventureLevel = Math.max(
                1,
                progress.highest_unlocked_game || 1,
                progress.current_game || 1,
              );
            }
          }
          online = await fetchOnlineDashboardStats(user.id);

          if (supabase) {
            const { data: row } = await supabase
              .from('mg_profiles')
              .select('country_code')
              .eq('id', user.id)
              .maybeSingle();
            const cc = (row as { country_code?: string } | null)?.country_code?.trim();
            if (cc) countryCode = cc.toUpperCase();
          }
        } else {
          const progress = await loadSessionAdventureProgress(null);
          if (progress) {
            adventureLevel = Math.max(
              1,
              progress.highest_unlocked_game || 1,
              progress.current_game || 1,
            );
          }
        }
      } catch {
        const progress = await loadSessionAdventureProgress(user?.id ?? null);
        if (progress) {
          adventureLevel = Math.max(
            1,
            progress.highest_unlocked_game || 1,
            progress.current_game || 1,
          );
        }
      }

      if (cancelled) return;
      setStats({
        username,
        adventureLevel,
        classicBestScore,
        loginStreak,
        xp,
        countryCode,
        online,
      });
      setLoaded(true);
    };

    setLoaded(false);
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const avatarLetter =
    stats && stats.username !== 'Guest'
      ? stats.username.substring(0, 1).toUpperCase()
      : null;

  const tableRows: { label: string; value: string; valueIcon?: string; section?: boolean }[] =
    stats
      ? [
          { label: 'Adventure level', value: String(stats.adventureLevel) },
          { label: 'Classic best score', value: String(stats.classicBestScore) },
          { label: 'Login streak', value: `${stats.loginStreak} days` },
          { label: 'XP', value: String(stats.xp), valueIcon: '/homeImagery/xp_gem.png' },
          { label: 'Online', value: '', section: true },
          { label: 'Institution', value: stats.online.institution },
          { label: 'Rank', value: stats.online.rank },
          { label: 'Global ranking', value: stats.online.globalRanking },
          { label: 'Institutional ranking', value: stats.online.institutionalRanking },
          { label: 'Online Win Streak', value: String(stats.online.onlineWinStreak) },
        ]
      : [];

  return (
    <div
      style={{
        background: '#FFC30B',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100vw',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: '#FFC30B',
          padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={() => {
            onBackToMenu();
            soundManager.playClickSound();
          }}
          aria-label="Back to menu"
          style={{
            background: 'transparent',
            border: '2px solid #000',
            borderRadius: '8px',
            width: '40px',
            height: '40px',
            cursor: 'pointer',
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#000',
            flexShrink: 0,
          }}
        >
          ←
        </button>
        <h1
          style={{
            margin: 0,
            fontSize: isMobile ? '1.35rem' : '1.75rem',
            fontWeight: 'bold',
            color: '#000',
            flex: 1,
          }}
        >
          Dashboard
        </h1>
      </div>

      <div
        style={{
          flex: 1,
          padding: isMobile ? '1rem 1.25rem 2rem' : '1.5rem 2.5rem 2.5rem',
        }}
      >
        {!loaded || !stats ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                border: '3px solid rgba(0,0,0,0.2)',
                borderTopColor: '#000',
                borderRadius: '50%',
                animation: 'dashboard-spin 0.8s linear infinite',
              }}
            />
            <style>{`@keyframes dashboard-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1.25rem',
                marginTop: '0.5rem',
                marginBottom: '2.5rem',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: '#2c2c2c',
                  border: '3px solid #000',
                  boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {avatarLetter ? (
                  <span
                    style={{
                      fontSize: '28px',
                      fontWeight: 'bold',
                      color: '#FFC30B',
                    }}
                  >
                    {avatarLetter}
                  </span>
                ) : (
                  <span style={{ fontSize: '36px' }}>👤</span>
                )}
              </div>
              <span
                style={{
                  fontSize: isMobile ? '1.35rem' : '1.5rem',
                  fontWeight: 'bold',
                  color: '#000',
                  textAlign: 'center',
                }}
              >
                {usernameWithFlag(stats.username, stats.countryCode)}
              </span>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.5)',
                borderRadius: '16px',
                border: '2px solid #000',
                boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                overflow: 'hidden',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  tableLayout: 'fixed',
                }}
              >
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.08)' }}>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: isMobile ? '12px' : '16px 20px',
                        fontSize: isMobile ? '16px' : '18px',
                        fontWeight: 'bold',
                        color: '#000',
                        width: '55%',
                      }}
                    >
                      Stat
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: isMobile ? '12px' : '16px 20px',
                        fontSize: isMobile ? '16px' : '18px',
                        fontWeight: 'bold',
                        color: '#000',
                      }}
                    >
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) =>
                    row.section ? (
                      <tr key={row.label} style={{ background: 'rgba(0,0,0,0.06)' }}>
                        <td
                          colSpan={2}
                          style={{
                            padding: isMobile ? '8px 12px' : '10px 20px',
                            fontSize: isMobile ? '14px' : '15px',
                            fontWeight: 800,
                            color: 'rgba(0,0,0,0.87)',
                          }}
                        >
                          {row.label}
                        </td>
                      </tr>
                    ) : (
                      <tr key={row.label}>
                        <td
                          style={{
                            padding: isMobile ? '14px 12px' : '18px 20px',
                            fontSize: isMobile ? '15px' : '16px',
                            color: 'rgba(0,0,0,0.87)',
                            borderTop: '1px solid rgba(0,0,0,0.15)',
                          }}
                        >
                          {row.label}
                        </td>
                        <td
                          style={{
                            padding: isMobile ? '14px 12px' : '18px 20px',
                            fontSize: isMobile ? '15px' : '16px',
                            fontWeight: 600,
                            color: '#000',
                            borderTop: '1px solid rgba(0,0,0,0.15)',
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {row.valueIcon && (
                              <img
                                src={row.valueIcon}
                                alt=""
                                style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                              />
                            )}
                            {row.value}
                          </span>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
