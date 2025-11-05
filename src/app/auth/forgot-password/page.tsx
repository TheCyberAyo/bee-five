'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth <= 768);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!supabase) {
      setError('Authentication service is not configured.');
      return;
    }

    setLoading(true);

    try {
      // Get the redirect URL for password reset
      const getRedirectUrl = () => {
        if (typeof window === 'undefined') return undefined;

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
        if (siteUrl && siteUrl.startsWith('http')) {
          return `${siteUrl}/auth/reset-password`;
        }

        return `${window.location.origin}/auth/reset-password`;
      };

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getRedirectUrl(),
      });

      if (resetError) {
        setError(resetError.message || 'Failed to send password reset email. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #FFC30B 0%, #FFD700 50%, #FFC30B 100%)',
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isMobile ? '1rem 0.75rem' : '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: 'rgba(0, 0, 0, 0.95)',
        borderRadius: isMobile ? '20px' : '25px',
        padding: isMobile ? '1.5rem 1rem' : '2rem',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3), 0 0 0 3px rgba(255, 195, 11, 0.3)',
        textAlign: 'center',
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{
            fontSize: isMobile ? '1.8rem' : '2.5rem',
            color: '#FFC30B',
            textShadow: '3px 3px 0px black, -1px -1px 0px black, 1px -1px 0px black, -1px 1px 0px black',
            margin: '0 0 0.5rem 0',
            fontWeight: 'bold',
          }}>
            🐝 Forgot Password? 🐝
          </h1>
          <p style={{
            fontSize: isMobile ? '0.95rem' : '1.1rem',
            color: '#ffffff',
            margin: '0',
            fontWeight: 'bold',
          }}>
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(244, 67, 54, 0.2)',
            border: '2px solid #f44336',
            color: '#ffcdd2',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: isMobile ? '0.9rem' : '1rem',
            fontWeight: 'bold',
          }}>
            {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                border: '3px solid #4CAF50',
                marginBottom: '1rem',
              }}>
                <svg style={{ width: '50px', height: '50px', color: '#4CAF50' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 style={{
              fontSize: isMobile ? '1.5rem' : '2rem',
              color: '#FFC30B',
              textShadow: '2px 2px 0px black',
              marginBottom: '1rem',
              fontWeight: 'bold',
            }}>
              Check your email!
            </h2>
            <p style={{
              fontSize: isMobile ? '0.95rem' : '1.1rem',
              color: '#ffffff',
              marginBottom: '1.5rem',
              fontWeight: 'bold',
            }}>
              We've sent a password reset link to <strong style={{ color: '#FFC30B' }}>{email}</strong>. Please check your inbox!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link
                href="/"
                style={{
                  display: 'block',
                  backgroundColor: '#FFC30B',
                  color: '#000',
                  fontWeight: 'bold',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: '3px solid #000',
                  textDecoration: 'none',
                  fontSize: isMobile ? '0.95rem' : '1rem',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFD700';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFC30B';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                🐝 Go to Home 🐝
              </Link>
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                  setError(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FFC30B',
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  cursor: 'pointer',
                  padding: '0.5rem',
                }}
              >
                Send another email
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <label htmlFor="email" style={{
                display: 'block',
                color: '#FFC30B',
                fontWeight: 'bold',
                marginBottom: '0.5rem',
                fontSize: isMobile ? '0.95rem' : '1rem',
              }}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid #FFC30B',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: isMobile ? '0.95rem' : '1rem',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#FFD700';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 195, 11, 0.3)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#FFC30B';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: loading ? '#666' : '#FFC30B',
                color: '#000',
                fontWeight: 'bold',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '3px solid #000',
                fontSize: isMobile ? '0.95rem' : '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginBottom: '1rem',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#FFD700';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#FFC30B';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {loading ? 'Sending...' : '🐝 Send Reset Link 🐝'}
            </button>

            <div style={{ textAlign: 'center', color: '#ffffff', fontSize: isMobile ? '0.85rem' : '0.9rem' }}>
              <Link
                href="/"
                style={{
                  color: '#FFC30B',
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                  marginRight: '0.5rem',
                }}
              >
                Back to Home
              </Link>
              <span style={{ color: '#666', margin: '0 0.5rem' }}>•</span>
              <Link
                href="/"
                style={{
                  color: '#FFC30B',
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                }}
              >
                Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
