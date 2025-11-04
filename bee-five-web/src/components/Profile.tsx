"use client";

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './Auth/AuthModal';
import UserProfile from './Auth/UserProfile';
import { soundManager } from '../utils/sounds';

interface ProfileProps {
  onBackToMenu: () => void;
  isMobile: boolean;
}

export default function Profile({ onBackToMenu, isMobile }: ProfileProps) {
  const { user, profile } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

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
      {/* Decorative bee pattern background - hidden on mobile */}
      {!isMobile && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.05,
          fontSize: 'clamp(2rem, 8vw, 4rem)',
          pointerEvents: 'none',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: '2rem',
          padding: '2rem',
          zIndex: 0
        }}>
          {['🐝', '👤', '🐝', '👤', '🐝', '👤', '🐝', '👤', '🐝'].map((emoji, i) => (
            <div key={i} style={{ textAlign: 'center', transform: `rotate(${i * 15}deg)` }}>
              {emoji}
            </div>
          ))}
        </div>
      )}

      {/* Main content card */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.95)',
        borderRadius: isMobile ? '20px' : 'clamp(15px, 3vw, 25px)',
        padding: isMobile ? '1.5rem 1rem' : 'clamp(1.5rem, 3vw, 2rem)',
        width: '90vw',
        maxWidth: isMobile ? '90vw' : '600px',
        minHeight: isMobile ? 'auto' : '70vh',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 0 0 3px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        margin: '0 auto',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        overflowY: 'auto'
      }}>
        {/* Title */}
        <div style={{ marginBottom: isMobile ? '1.5rem' : 'clamp(1.5rem, 3vw, 2rem)' }}>
          <h1 style={{ 
            fontSize: isMobile ? 'clamp(1.5rem, 8vw, 2rem)' : 'clamp(2rem, 6vw, 3rem)', 
            color: '#FFC30B',
            textShadow: isMobile 
              ? '2px 2px 0px black, -1px -1px 0px black' 
              : '3px 3px 0px black, -1px -1px 0px black, 1px -1px 0px black, -1px 1px 0px black',
            margin: '0 0 0.5rem 0',
            lineHeight: '1.2',
            fontWeight: 'bold',
            WebkitTextStroke: isMobile ? '0.5px black' : 'initial'
          }}>
            👤 Profile
          </h1>
        </div>

        {/* Content */}
        {user ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            width: '100%'
          }}>
            <UserProfile onClose={() => {}} />
            
            {/* Back button */}
            <button
              onClick={() => {
                onBackToMenu();
                soundManager.playClickSound();
              }}
              style={{
                padding: isMobile ? '0.75rem 1.5rem' : '1rem 2rem',
                fontSize: isMobile ? '1rem' : '1.1rem',
                fontWeight: 'bold',
                backgroundColor: '#FFC30B',
                color: '#000',
                border: '3px solid #000',
                borderRadius: isMobile ? '12px' : '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                marginTop: '1rem',
                width: isMobile ? '100%' : 'auto',
                minWidth: isMobile ? 'auto' : '200px'
              }}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                }
              }}
            >
              🏠 Back to Menu
            </button>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            padding: '2rem 1rem'
          }}>
            <div style={{
              fontSize: isMobile ? '4rem' : '6rem',
              marginBottom: '1rem'
            }}>
              👤
            </div>
            
            <h2 style={{
              fontSize: isMobile ? '1.3rem' : '1.8rem',
              color: '#fff',
              marginBottom: '0.5rem',
              fontWeight: 'bold'
            }}>
              Sign In Required
            </h2>
            
            <p style={{
              fontSize: isMobile ? '0.9rem' : '1.1rem',
              color: 'rgba(255,255,255,0.8)',
              marginBottom: '1rem',
              lineHeight: '1.6'
            }}>
              Please sign in to view and manage your profile.
            </p>

            <button
              onClick={() => {
                setShowAuthModal(true);
                soundManager.playClickSound();
              }}
              style={{
                padding: isMobile ? '0.75rem 1.5rem' : '1rem 2rem',
                fontSize: isMobile ? '1rem' : '1.1rem',
                fontWeight: 'bold',
                backgroundColor: '#FFC30B',
                color: '#000',
                border: '3px solid #000',
                borderRadius: isMobile ? '12px' : '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                width: isMobile ? '100%' : 'auto',
                minWidth: isMobile ? 'auto' : '200px'
              }}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                }
              }}
            >
              🔐 Sign In / Sign Up
            </button>

            <button
              onClick={() => {
                onBackToMenu();
                soundManager.playClickSound();
              }}
              style={{
                padding: isMobile ? '0.75rem 1.5rem' : '1rem 2rem',
                fontSize: isMobile ? '0.9rem' : '1rem',
                fontWeight: 'bold',
                backgroundColor: 'transparent',
                color: '#fff',
                border: '2px solid #fff',
                borderRadius: isMobile ? '12px' : '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                width: isMobile ? '100%' : 'auto',
                minWidth: isMobile ? 'auto' : '200px'
              }}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              🏠 Back to Menu
            </button>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            // Navigate back to menu after successful sign in
            onBackToMenu();
          }}
        />
      )}
    </div>
  );
}

