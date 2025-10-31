"use client";

import React from 'react';
import { soundManager } from '../utils/sounds';

interface AboutUsProps {
  onBackToMenu: () => void;
  isMobile: boolean;
}

export default function AboutUs({ onBackToMenu, isMobile }: AboutUsProps) {
  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #FFC30B 0%, #FFD700 50%, #FFC30B 100%)',
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100vw',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isMobile ? '1rem 0.75rem' : 'clamp(1rem, 2vw, 2rem)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'visible',
      boxSizing: 'border-box'
    }}>
      {/* Main content card */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.95)',
        borderRadius: isMobile ? '20px' : 'clamp(15px, 3vw, 25px)',
        padding: isMobile ? '1.5rem 1rem' : 'clamp(2rem, 4vw, 3rem)',
        width: isMobile ? '90vw' : 'auto',
        maxWidth: isMobile ? '90vw' : '800px',
        minHeight: isMobile ? 'auto' : '80vh',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 0 0 3px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)',
        textAlign: 'left',
        position: 'relative',
        zIndex: 1,
        margin: '0 auto',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        overflowY: 'auto',
        flex: isMobile ? 'none' : '0 1 auto'
      }}>
        {/* Title */}
        <h1 style={{ 
          fontSize: isMobile ? 'clamp(1.5rem, 8vw, 2rem)' : 'clamp(2rem, 4vw, 2.5rem)', 
          color: '#FFC30B',
          textShadow: '2px 2px 0px black',
          margin: '0 0 clamp(1.5rem, 3vw, 2rem) 0',
          lineHeight: '1.2',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          About Bee-Five
        </h1>

        {/* Content */}
        <div style={{
          color: '#ffffff',
          fontSize: isMobile ? 'clamp(0.9rem, 2.5vw, 1rem)' : 'clamp(1rem, 1.5vw, 1.1rem)',
          lineHeight: '1.8',
          marginBottom: '2rem'
        }}>
          <p style={{ marginBottom: '1.5rem' }}>
            Bee-Five is your favorite version of Connect-Five — a fun, fast, and colorful strategy game created by MindGrind. It's designed to bring people together through friendly competition, whether you're playing locally, against the AI, or online with friends.
          </p>
          
          <p style={{ marginBottom: '1.5rem' }}>
            Our mission is to make simple, addictive games that challenge the mind and bring joy to your screen. Bee-Five takes the classic "five-in-a-row" game and adds a clean, modern design inspired by the structure of a beehive.
          </p>
          
          <p style={{ marginBottom: '1.5rem' }}>
            Every feature of Bee-Five, from the AI Game to the upcoming Online Multiplayer, is designed to run smoothly on both mobile devices and desktops.
          </p>
          
          <p style={{ marginBottom: '2rem' }}>
            Bee-Five is proudly developed in South Africa by MindGrind, a creative studio focused on original, smart, and community-driven games.
          </p>
          
          <div style={{
            textAlign: 'center',
            marginTop: '2rem',
            paddingTop: '2rem',
            borderTop: '1px solid rgba(255, 195, 11, 0.3)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: isMobile ? '0.85rem' : '0.9rem'
          }}>
            © 2025 Bee-Five. Product of MindGrind.
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={() => {
            onBackToMenu();
            soundManager.playClickSound();
          }}
          style={{
            padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
            fontSize: isMobile ? '0.9rem' : '1rem',
            fontWeight: 'bold',
            backgroundColor: '#666',
            color: 'white',
            border: '2px solid black',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginTop: 'auto',
            alignSelf: 'center',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.backgroundColor = '#777';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.backgroundColor = '#666';
            }
          }}
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
}

