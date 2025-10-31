"use client";

import React from 'react';
import { soundManager } from '../utils/sounds';

interface NewsUpdatesProps {
  onBackToMenu: () => void;
  isMobile: boolean;
}

export default function NewsUpdates({ onBackToMenu, isMobile }: NewsUpdatesProps) {
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
        maxWidth: isMobile ? '90vw' : '900px',
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
          margin: '0 0 clamp(1rem, 2vw, 1.5rem) 0',
          lineHeight: '1.2',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          News/Updates
        </h1>

        {/* News Articles in adjacent cards */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '1rem' : '1.5rem',
          marginBottom: '2rem'
        }}>
          {/* Article 1 */}
          <div style={{
            flex: '1 1 0',
            background: 'rgba(255, 195, 11, 0.1)',
            border: '2px solid #FFC30B',
            borderRadius: '12px',
            padding: '1rem',
            minHeight: isMobile ? 'auto' : '450px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              color: '#FFC30B',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              textTransform: 'uppercase'
            }}>
              September 28, 2025
            </div>
            <h2 style={{
              fontSize: '1rem',
              color: '#FFC30B',
              marginBottom: '0.75rem',
              fontWeight: 'bold',
              lineHeight: '1.3'
            }}>
              🎉 Launch Day Oct 31!
            </h2>
            <div style={{
              color: '#ffffff',
              fontSize: '0.85rem',
              lineHeight: '1.6',
              flex: '1 1 auto'
            }}>
              <p style={{ marginBottom: '0.75rem' }}>
                We're thrilled to announce that Bee-Five officially launches on <strong style={{ color: '#FFC30B' }}>October 31, 2025</strong>!
              </p>
              <p style={{ marginBottom: '0.75rem' }}>
                On launch day, enjoy:
              </p>
              <ul style={{
                marginBottom: '0.75rem',
                paddingLeft: '1.2rem',
                fontSize: '0.8rem'
              }}>
                <li>Take Turns mode</li>
                <li>AI Game challenges</li>
                <li>Online Multiplayer (soon)</li>
                <li>Responsive design</li>
              </ul>
              <p style={{ marginBottom: '0', fontSize: '0.8rem', fontStyle: 'italic' }}>
                Get ready to experience the buzz of Bee-Five!
              </p>
            </div>
          </div>

          {/* Article 2 */}
          <div style={{
            flex: '1 1 0',
            background: 'rgba(255, 195, 11, 0.1)',
            border: '2px solid #FFC30B',
            borderRadius: '12px',
            padding: '1rem',
            minHeight: isMobile ? 'auto' : '450px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              color: '#FFC30B',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              textTransform: 'uppercase'
            }}>
              September 28, 2025
            </div>
            <h2 style={{
              fontSize: '1rem',
              color: '#FFC30B',
              marginBottom: '0.75rem',
              fontWeight: 'bold',
              lineHeight: '1.3'
            }}>
              📱 Mobile App Sep 14!
            </h2>
            <div style={{
              color: '#ffffff',
              fontSize: '0.85rem',
              lineHeight: '1.6',
              flex: '1 1 auto'
            }}>
              <p style={{ marginBottom: '0.75rem' }}>
                The Bee-Five mobile app launches on <strong style={{ color: '#FFC30B' }}>September 14, 2025</strong> - take the game with you!
              </p>
              <p style={{ marginBottom: '0.75rem' }}>
                Features include:
              </p>
              <ul style={{
                marginBottom: '0.75rem',
                paddingLeft: '1.2rem',
                fontSize: '0.8rem'
              }}>
                <li>Full offline play</li>
                <li>Cloud sync</li>
                <li>Mobile optimized</li>
                <li>Push notifications</li>
              </ul>
              <p style={{ marginBottom: '0', fontSize: '0.8rem', fontStyle: 'italic' }}>
                Available on iOS and Android!
              </p>
            </div>
          </div>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255, 195, 11, 0.3)',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '0.85rem'
        }}>
          © 2025 Bee-Five. Product of MindGrind.
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

