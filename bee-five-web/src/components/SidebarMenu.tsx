"use client";

import React from 'react';
import { soundManager } from '../utils/sounds';

type GameMode = 'menu' | 'about-us' | 'how-to-play' | 'news-updates' | 'privacy-policy' | 'settings' | 'profile' | 'contact-us' | 'local-multiplayer' | 'online-lobby' | 'online-game' | 'ai-game' | 'adventure-game' | 'show-take-turns-submenu' | 'show-ai-submenu' | 'competition';

interface SidebarMenuProps {
  onMenuItemClick: (mode: GameMode) => void;
  isMobile: boolean;
}

export default function SidebarMenu({ onMenuItemClick, isMobile }: SidebarMenuProps) {
  const menuItems: { id: GameMode; icon: string; label: string }[] = [
    { id: 'about-us', icon: 'ℹ️', label: 'About Us' },
    { id: 'how-to-play', icon: '📖', label: 'How to Play' },
    { id: 'news-updates', icon: '📰', label: 'News/Updates' },
    { id: 'privacy-policy', icon: '🔒', label: 'Privacy Policy' },
    { id: 'profile', icon: '👤', label: 'Profile' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
    { id: 'contact-us', icon: '📧', label: 'Contact Us' },
  ];

  if (isMobile) {
    return null;
  }

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.95)',
      borderRadius: 'clamp(15px, 3vw, 25px)',
      padding: 'clamp(1rem, 2vw, 1.5rem)',
      width: 'clamp(180px, 15vw, 220px)',
      flexShrink: 0,
      minHeight: '90vh',
      maxHeight: '90vh',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 0 0 3px #FFC30B',
      backdropFilter: 'blur(10px)',
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      gap: '0.4rem',
      overflowY: 'auto',
      boxSizing: 'border-box'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '0.75rem',
        paddingBottom: '0.5rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <img 
          src="/BEE-FIVE.png" 
          alt="BEE-FIVE" 
          style={{
            maxWidth: '100%',
            height: 'auto',
            maxHeight: 'clamp(2rem, 4vw, 3rem)',
            objectFit: 'contain'
          }}
        />
      </div>
      
      {menuItems.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          onClick={(e) => {
            e.preventDefault();
            onMenuItemClick(item.id);
            soundManager.playClickSound();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '8px',
            transition: 'all 0.3s ease',
            border: '2px solid transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 195, 11, 0.2)';
            e.currentTarget.style.borderColor = '#FFC30B';
            e.currentTarget.style.transform = 'translateX(5px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          <span style={{ fontSize: '1.1em' }}>{item.icon}</span>
          <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{item.label}</span>
        </a>
      ))}
    </div>
  );
}

