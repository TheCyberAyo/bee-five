"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { INFO_MENU_ITEMS, type InfoMenuMode } from '../constants/infoMenuItems';
import InfoMenuItemIcon from './InfoMenuItemIcon';
import { useAuth } from '../contexts/AuthContext';
import { ensureXpInitialized, getXp } from '../services/xpService';
import { soundManager } from '../utils/sounds';

type GameMode = 'menu' | InfoMenuMode | 'local-multiplayer' | 'live-matches' | 'classic-game';

interface MobileHeaderProps {
  onMenuItemClick: (mode: GameMode) => void;
  isMobile: boolean;
}

export default function MobileHeader({ onMenuItemClick, isMobile }: MobileHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [headerXp, setHeaderXp] = useState(0);
  const { user } = useAuth();
  /** Bar height below safe-area; keep in sync with SimpleWelcome mobile top padding. */
  const barHeightPx = 49; // 46px bar + 3px bottom border

  const refreshHeaderXp = useCallback(() => {
    ensureXpInitialized();
    setHeaderXp(getXp());
  }, []);

  useEffect(() => {
    refreshHeaderXp();
  }, [refreshHeaderXp, user?.id]);

  useEffect(() => {
    const onFocus = () => refreshHeaderXp();
    const onStorage = (event: StorageEvent) => {
      if (event.key?.includes('user_xp') || event.key?.includes('beeAdventureProgress')) {
        refreshHeaderXp();
      }
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refreshHeaderXp]);

  if (!isMobile) {
    return null;
  }

  const handleMenuItemClick = (itemId: GameMode) => {
    onMenuItemClick(itemId);
    setIsDropdownOpen(false);
    soundManager.playClickSound();
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
    soundManager.playClickSound();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      paddingTop: 'env(safe-area-inset-top, 0px)',
      background: 'rgba(0, 0, 0, 0.95)',
      borderBottom: '3px solid #FFC30B',
      backdropFilter: 'blur(10px)',
      zIndex: 1000,
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.35rem 0.75rem',
        gap: '0.75rem',
        minHeight: `${barHeightPx}px`,
        boxSizing: 'border-box',
      }}>
        {/* Logo */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start'
        }}>
          <div style={{ position: 'relative', width: '100px', height: '26px' }}>
            <Image 
              src="/BEE-FIVE.png" 
              alt="BEE FIVE logo" 
              fill
              style={{ objectFit: 'contain' }}
              sizes="100px"
              priority
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              paddingRight: '2px',
            }}
            aria-label={`${headerXp} XP`}
          >
            <img
              src="/homeImagery/xp_gem.png"
              alt=""
              width={28}
              height={28}
              style={{ objectFit: 'contain', display: 'block' }}
            />
            <span
              style={{
                fontSize: '1rem',
                fontWeight: 'bold',
                color: '#FFC30B',
                lineHeight: 1,
                minWidth: '1.25rem',
              }}
            >
              {headerXp}
            </span>
          </div>

        {/* Hamburger menu button */}
        <button
          onClick={toggleDropdown}
          aria-label={isDropdownOpen ? 'Close menu' : 'Open menu'}
          style={{
            background: 'transparent',
            border: '2px solid #FFC30B',
            borderRadius: '6px',
            color: '#FFC30B',
            padding: '0.25rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            width: '30px',
            height: '30px',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 195, 11, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>
            {isDropdownOpen ? '✕' : '☰'}
          </span>
        </button>
        </div>
      </div>

      {/* Dropdown menu */}
      {isDropdownOpen && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.98)',
          borderTop: '2px solid #FFC30B',
          maxHeight: `calc(100vh - ${barHeightPx}px - env(safe-area-inset-top, 0px))`,
          overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          opacity: 1,
          transform: 'translateY(0)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          width: 'min(42vw, 11.5rem)',
          minWidth: '9.5rem',
          position: 'absolute',
          right: 0,
          top: '100%',
          zIndex: 1001
        }}>
          {INFO_MENU_ITEMS.map((item, index) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                handleMenuItemClick(item.id);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 0.75rem',
                color: '#ffffff',
                textDecoration: 'none',
                borderBottom: index < INFO_MENU_ITEMS.length - 1 ? '1px solid rgba(255, 195, 11, 0.2)' : 'none',
                transition: 'all 0.2s ease'
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 195, 11, 0.2)';
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <InfoMenuItemIcon icon={item.icon} iconImagePath={item.iconImagePath} />
              <span style={{ 
                fontWeight: '500', 
                fontSize: '0.9rem',
                flex: 1
              }}>
                {item.label}
              </span>
              <span style={{ 
                fontSize: '0.8em',
                color: 'rgba(255,255,255,0.5)'
              }}>
                ›
              </span>
            </a>
          ))}
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {isDropdownOpen && (
        <div
          onClick={() => setIsDropdownOpen(false)}
          style={{
            position: 'fixed',
            top: `calc(${barHeightPx}px + env(safe-area-inset-top, 0px))`,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            zIndex: 999
          }}
        />
      )}
    </div>
  );
}

