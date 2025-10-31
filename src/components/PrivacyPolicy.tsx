"use client";

import React from 'react';
import { soundManager } from '../utils/sounds';

interface PrivacyPolicyProps {
  onBackToMenu: () => void;
  isMobile: boolean;
}

export default function PrivacyPolicy({ onBackToMenu, isMobile }: PrivacyPolicyProps) {
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
          margin: '0 0 0.5rem 0',
          lineHeight: '1.2',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          Privacy Policy
        </h1>

        <p style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: isMobile ? '0.8rem' : '0.9rem',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          Last updated: October 2025
        </p>

        {/* Content */}
        <div style={{
          color: '#ffffff',
          fontSize: isMobile ? 'clamp(0.9rem, 2.5vw, 1rem)' : 'clamp(1rem, 1.5vw, 1.1rem)',
          lineHeight: '1.8'
        }}>
          <p style={{ marginBottom: '1.5rem' }}>
            Bee-Five ("we", "our", or "us") operates the Bee-Five game website (the "Service"), developed by MindGrind. This page informs you of our policies regarding the collection, use, and disclosure of personal information when you use our Service.
          </p>

          <h3 style={{
            fontSize: isMobile ? 'clamp(1.1rem, 3vw, 1.3rem)' : 'clamp(1.3rem, 2vw, 1.5rem)',
            color: '#FFC30B',
            marginTop: '2rem',
            marginBottom: '1rem',
            fontWeight: 'bold'
          }}>
            Information We Collect
          </h3>
          <p style={{ marginBottom: '1.5rem' }}>
            We may collect non-personal data such as browser type, device, and general usage statistics. If you sign up for multiplayer or an account, we may collect an email address for login purposes.
          </p>

          <h3 style={{
            fontSize: isMobile ? 'clamp(1.1rem, 3vw, 1.3rem)' : 'clamp(1.3rem, 2vw, 1.5rem)',
            color: '#FFC30B',
            marginTop: '2rem',
            marginBottom: '1rem',
            fontWeight: 'bold'
          }}>
            Cookies and Advertising
          </h3>
          <p style={{ marginBottom: '1rem' }}>
            Bee-Five uses cookies to improve gameplay and support advertising through third-party providers such as Google AdSense. Google may use cookies to serve personalized ads based on your prior visits to this or other websites.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            You can opt out of personalized advertising by visiting{' '}
            <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#FFC30B', textDecoration: 'underline' }}>
              adssettings.google.com
            </a>.
          </p>

          <h3 style={{
            fontSize: isMobile ? 'clamp(1.1rem, 3vw, 1.3rem)' : 'clamp(1.3rem, 2vw, 1.5rem)',
            color: '#FFC30B',
            marginTop: '2rem',
            marginBottom: '1rem',
            fontWeight: 'bold'
          }}>
            Third-Party Services
          </h3>
          <p style={{ marginBottom: '1.5rem' }}>
            We may use services like Google Analytics or AdSense to measure site usage and display ads. These services may collect and process data under their own privacy policies.
          </p>

          <h3 style={{
            fontSize: isMobile ? 'clamp(1.1rem, 3vw, 1.3rem)' : 'clamp(1.3rem, 2vw, 1.5rem)',
            color: '#FFC30B',
            marginTop: '2rem',
            marginBottom: '1rem',
            fontWeight: 'bold'
          }}>
            Your Rights
          </h3>
          <p style={{ marginBottom: '1.5rem' }}>
            You can request that we delete your data or remove your email by contacting us at <strong style={{ color: '#FFC30B' }}>contact@mindgrind.games</strong>.
          </p>

          <h3 style={{
            fontSize: isMobile ? 'clamp(1.1rem, 3vw, 1.3rem)' : 'clamp(1.3rem, 2vw, 1.5rem)',
            color: '#FFC30B',
            marginTop: '2rem',
            marginBottom: '1rem',
            fontWeight: 'bold'
          }}>
            Changes to This Policy
          </h3>
          <p style={{ marginBottom: '2rem' }}>
            We may update this policy from time to time. Changes will be reflected on this page with a new "Last Updated" date.
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

