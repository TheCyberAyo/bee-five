"use client";

import React, { useState } from 'react';
import { soundManager } from '../utils/sounds';

type GameMode = 'menu' | 'about-us' | 'how-to-play' | 'news-updates' | 'privacy-policy' | 'settings' | 'profile' | 'contact-us' | 'local-multiplayer' | 'online-lobby' | 'online-game' | 'ai-game' | 'adventure-game' | 'show-take-turns-submenu' | 'show-ai-submenu' | 'competition';

interface MobileHeaderProps {
  onMenuItemClick: (mode: GameMode) => void;
  isMobile: boolean;
}

export default function MobileHeader({ onMenuItemClick, isMobile }: MobileHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const menuItems: { id: GameMode; icon: string; label: string }[] = [
    { id: 'about-us', icon: 'ℹ️', label: 'About Us' },
    { id: 'how-to-play', icon: '📖', label: 'How to Play' },
    { id: 'news-updates', icon: '📰', label: 'News/Updates' },
    { id: 'privacy-policy', icon: '🔒', label: 'Privacy Policy' },
    { id: 'profile', icon: '👤', label: 'Profile' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
    { id: 'contact-us', icon: '📧', label: 'Contact Us' },
  ];

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
        padding: '0.75rem 1rem',
        gap: '1rem'
      }}>
        {/* Logo */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start'
        }}>
          <img 
            src="/BEE-FIVE.png" 
            alt="BEE-FIVE" 
            style={{
              maxWidth: '120px',
              height: 'auto',
              maxHeight: '2rem',
              objectFit: 'contain'
            }}
          />
        </div>

        {/* Hamburger menu button */}
        <button
          onClick={toggleDropdown}
          style={{
            background: 'transparent',
            border: '2px solid #FFC30B',
            borderRadius: '6px',
            color: '#FFC30B',
            padding: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            minWidth: '40px',
            minHeight: '40px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 195, 11, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span style={{ fontSize: '1.5em' }}>
            {isDropdownOpen ? '✕' : '☰'}
          </span>
        </button>
      </div>

      {/* Dropdown menu */}
      {isDropdownOpen && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.98)',
          borderTop: '2px solid #FFC30B',
          maxHeight: 'calc(100vh - 60px)',
          overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          opacity: 1,
          transform: 'translateY(0)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          width: '50%',
          position: 'absolute',
          right: 0,
          top: '100%',
          zIndex: 1001
        }}>
          {menuItems.map((item, index) => (
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
                gap: '0.75rem',
                padding: '1rem 1.25rem',
                color: '#ffffff',
                textDecoration: 'none',
                borderBottom: index < menuItems.length - 1 ? '1px solid rgba(255, 195, 11, 0.2)' : 'none',
                transition: 'all 0.2s ease'
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 195, 11, 0.2)';
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '1.3em' }}>{item.icon}</span>
              <span style={{ 
                fontWeight: '500', 
                fontSize: '1rem',
                flex: 1
              }}>
                {item.label}
              </span>
              <span style={{ 
                fontSize: '0.9em',
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
            top: '60px',
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

