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
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'visible',
      boxSizing: 'border-box'
    }}>
      {/* Fixed Header */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(0, 0, 0, 0.95)',
        backdropFilter: 'blur(10px)',
        padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        zIndex: 1000
      }}>
        <h1 style={{ 
          fontSize: isMobile ? 'clamp(1.2rem, 4vw, 1.5rem)' : 'clamp(1.5rem, 3vw, 2rem)', 
          color: '#FFC30B',
          textShadow: '2px 2px 0px black',
          margin: 0,
          lineHeight: '1.2',
          fontWeight: 'bold'
        }}>
          Privacy Policy
        </h1>
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

      {/* Main content card with top padding for fixed header */}
      <div style={{
        marginTop: isMobile ? '80px' : '90px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isMobile ? '1rem 0.75rem' : 'clamp(1rem, 2vw, 2rem)',
        width: '100%'
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
        <p style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: isMobile ? '0.8rem' : '0.9rem',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          Last Updated: January 2026
        </p>

        {/* Content */}
        <div style={{
          color: '#ffffff',
          fontSize: isMobile ? 'clamp(0.9rem, 2.5vw, 1rem)' : 'clamp(1rem, 1.5vw, 1.1rem)',
          lineHeight: '1.8'
        }}>
          <p style={{ marginBottom: '1.5rem' }}>
            Bee Five ("we", "our", or "us") operates the Bee Five mobile application (the "Service"), developed by ayongezwa. This page informs you of our policies regarding the collection, use, and disclosure of personal information when you use our Service.
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
          <p style={{ marginBottom: '0.75rem' }}>
            We may collect the following types of information:
          </p>
          <p style={{ marginBottom: '0.75rem', marginLeft: '1rem' }}>
            • Non-personal data: Device information, operating system, app version, and general usage statistics
          </p>
          <p style={{ marginBottom: '0.75rem', marginLeft: '1rem' }}>
            • Account information: If you sign up for an account or multiplayer features, we may collect an email address for login and account management purposes
          </p>
          <p style={{ marginBottom: '0.75rem', marginLeft: '1rem' }}>
            • Game progress: Local game progress and statistics stored on your device
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            We do not collect sensitive personal information such as payment details, location data, or contact lists.
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
            Our app may use the following third-party services:
          </p>
          <p style={{ marginBottom: '0.75rem', marginLeft: '1rem' }}>
            • Google AdMob: For displaying advertisements. AdMob may collect device identifiers, IP address, and app interaction data to serve and measure ads. See Google&apos;s Privacy Policy for details.
          </p>
          <p style={{ marginBottom: '0.75rem', marginLeft: '1rem' }}>
            • Supabase: For backend services and data storage (if applicable). See Supabase&apos;s Privacy Policy for details.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            AdMob and other third-party providers process data under their own privacy terms.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            These services have their own privacy policies governing the collection and use of your information. We encourage you to review their privacy policies.
          </p>

          <h3 style={{
            fontSize: isMobile ? 'clamp(1.1rem, 3vw, 1.3rem)' : 'clamp(1.3rem, 2vw, 1.5rem)',
            color: '#FFC30B',
            marginTop: '2rem',
            marginBottom: '1rem',
            fontWeight: 'bold'
          }}>
            Your Rights (GDPR & CCPA)
          </h3>
          <p style={{ marginBottom: '0.75rem' }}>
            If you are located in the European Economic Area (EEA) or California, you have the following rights:
          </p>
          <p style={{ marginBottom: '0.75rem', marginLeft: '1rem' }}>
            • Right to Access: You can request a copy of the personal data we hold about you
          </p>
          <p style={{ marginBottom: '0.75rem', marginLeft: '1rem' }}>
            • Right to Rectification: You can request correction of inaccurate personal data
          </p>
          <p style={{ marginBottom: '0.75rem', marginLeft: '1rem' }}>
            • Right to Erasure: You can request deletion of your personal data
          </p>
          <p style={{ marginBottom: '0.75rem', marginLeft: '1rem' }}>
            • Right to Data Portability: You can request your data in a portable format
          </p>
          <p style={{ marginBottom: '0.75rem', marginLeft: '1rem' }}>
            • Right to Object: You can object to processing of your personal data
          </p>
          <p style={{ marginBottom: '0.75rem', marginLeft: '1rem' }}>
            • Right to Withdraw Consent: You can withdraw consent for data processing at any time
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            To exercise these rights, please contact us using the information in the &quot;Contact Us&quot; section below.
          </p>

          <h3 style={{
            fontSize: isMobile ? 'clamp(1.1rem, 3vw, 1.3rem)' : 'clamp(1.3rem, 2vw, 1.5rem)',
            color: '#FFC30B',
            marginTop: '2rem',
            marginBottom: '1rem',
            fontWeight: 'bold'
          }}>
            Children&apos;s Privacy
          </h3>
          <p style={{ marginBottom: '0.75rem' }}>
            Our Service is suitable for users ages 13 and above. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            If we discover that we have collected personal information from a child under 13, we will delete that information promptly.
          </p>

          <h3 style={{
            fontSize: isMobile ? 'clamp(1.1rem, 3vw, 1.3rem)' : 'clamp(1.3rem, 2vw, 1.5rem)',
            color: '#FFC30B',
            marginTop: '2rem',
            marginBottom: '1rem',
            fontWeight: 'bold'
          }}>
            Data Security
          </h3>
          <p style={{ marginBottom: '1.5rem' }}>
            We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your data, we cannot guarantee absolute security.
          </p>

          <h3 style={{
            fontSize: isMobile ? 'clamp(1.1rem, 3vw, 1.3rem)' : 'clamp(1.3rem, 2vw, 1.5rem)',
            color: '#FFC30B',
            marginTop: '2rem',
            marginBottom: '1rem',
            fontWeight: 'bold'
          }}>
            Data Retention
          </h3>
          <p style={{ marginBottom: '1.5rem' }}>
            We retain your personal information only for as long as necessary to provide our Service and fulfill the purposes outlined in this Privacy Policy. When you request deletion of your data, we will delete it within 30 days, except where we are required to retain it by law.
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
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
          </p>

          <h3 style={{
            fontSize: isMobile ? 'clamp(1.1rem, 3vw, 1.3rem)' : 'clamp(1.3rem, 2vw, 1.5rem)',
            color: '#FFC30B',
            marginTop: '2rem',
            marginBottom: '1rem',
            fontWeight: 'bold'
          }}>
            Contact Us
          </h3>
          <p style={{ marginBottom: '0.75rem' }}>
            If you have any questions about this Privacy Policy, wish to exercise your rights, or need to contact us regarding your personal data, please reach out to us:
          </p>
          <p style={{ marginBottom: '0.5rem', marginLeft: '1rem' }}>
            <strong style={{ color: '#FFC30B' }}>Email:</strong> admin@mindgrind.co.za
          </p>
          <p style={{ marginBottom: '0.5rem', marginLeft: '1rem' }}>
            <strong style={{ color: '#FFC30B' }}>Developer:</strong> ayongezwa
          </p>
          <p style={{ marginBottom: '0.5rem', marginLeft: '1rem' }}>
            <strong style={{ color: '#FFC30B' }}>App:</strong> Bee Five
          </p>
          <p style={{ marginBottom: '2rem' }}>
            We will respond to your inquiry within 30 days.
          </p>

          <div style={{
            textAlign: 'center',
            marginTop: '2rem',
            paddingTop: '2rem',
            borderTop: '1px solid rgba(255, 195, 11, 0.3)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: isMobile ? '0.85rem' : '0.9rem'
          }}>
            © 2026 Bee Five. Product of ayongezwa.
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

