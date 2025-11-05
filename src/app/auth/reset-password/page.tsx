'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth <= 768);
    }
  }, []);

  useEffect(() => {
    const handlePasswordReset = async () => {
      // Ensure we're on the client side
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      if (!supabase) {
        setError('Authentication service is not configured.');
        setLoading(false);
        return;
      }

      try {
        // Check for errors in URL hash or query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);

        const error = hashParams.get('error') || queryParams.get('error');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');

        // Check for errors first
        if (error) {
          setError(errorDescription || 'Invalid or expired password reset link.');
          setLoading(false);
          return;
        }

        // Get tokens from hash (Supabase typically uses hash fragments)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        // Verify this is a password recovery link
        if (type !== 'recovery') {
          setError('Invalid password reset link. Please request a new one.');
          setLoading(false);
          return;
        }

        // If we have tokens in the hash, set the session
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setError('Failed to validate reset link. Please request a new password reset.');
            setLoading(false);
            return;
          }

          // Verify the session was set
          const { data: { session }, error: verifyError } = await supabase.auth.getSession();

          if (verifyError || !session) {
            setError('Failed to verify your session. Please request a new password reset.');
            setLoading(false);
            return;
          }

          // Valid token and session set
          setIsValidToken(true);
          setLoading(false);
        } else {
          // Check if session already exists (might have been set automatically)
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            setError('Failed to verify your session. Please request a new password reset.');
            setLoading(false);
            return;
          }

          if (session && session.user) {
            setIsValidToken(true);
            setLoading(false);
          } else {
            setError('Invalid or expired password reset link. Please request a new one.');
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Password reset validation error:', err);
        setError('An unexpected error occurred. Please try again.');
        setLoading(false);
      }
    };

    handlePasswordReset();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError('Please enter a new password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!supabase) {
      setError('Authentication service is not configured.');
      return;
    }

    setSubmitting(true);

    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (updateError) {
        setError(updateError.message || 'Failed to update password. Please try again.');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setSubmitting(false);

      // Redirect to home after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err) {
      console.error('Password update error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
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
            <div style={{
              display: 'inline-block',
              width: '60px',
              height: '60px',
              border: '4px solid #FFC30B',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}></div>
          </div>
          <h1 style={{
            fontSize: isMobile ? '1.5rem' : '2rem',
            color: '#FFC30B',
            textShadow: '2px 2px 0px black',
            marginBottom: '0.5rem',
            fontWeight: 'bold',
          }}>
            Validating reset link...
          </h1>
          <p style={{
            fontSize: isMobile ? '0.95rem' : '1.1rem',
            color: '#ffffff',
            fontWeight: 'bold',
          }}>
            Please wait while we verify your password reset link.
          </p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isValidToken) {
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
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'rgba(244, 67, 54, 0.2)',
              border: '3px solid #f44336',
              marginBottom: '1rem',
            }}>
              <svg style={{ width: '50px', height: '50px', color: '#f44336' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <h1 style={{
            fontSize: isMobile ? '1.5rem' : '2rem',
            color: '#FFC30B',
            textShadow: '2px 2px 0px black',
            marginBottom: '1rem',
            fontWeight: 'bold',
          }}>
            Invalid Link
          </h1>
          <p style={{
            fontSize: isMobile ? '0.95rem' : '1.1rem',
            color: '#ffffff',
            marginBottom: '1.5rem',
            fontWeight: 'bold',
          }}>
            {error || 'This password reset link is invalid or has expired.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link
              href="/auth/forgot-password"
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
              🐝 Request New Reset Link 🐝
            </Link>
            <Link
              href="/"
              style={{
                color: '#FFC30B',
                fontWeight: 'bold',
                textDecoration: 'underline',
                fontSize: isMobile ? '0.9rem' : '1rem',
              }}
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
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
          <h1 style={{
            fontSize: isMobile ? '1.8rem' : '2.5rem',
            color: '#FFC30B',
            textShadow: '3px 3px 0px black, -1px -1px 0px black, 1px -1px 0px black, -1px 1px 0px black',
            marginBottom: '1rem',
            fontWeight: 'bold',
          }}>
            🐝 Password Updated! 🐝
          </h1>
          <p style={{
            fontSize: isMobile ? '0.95rem' : '1.1rem',
            color: '#ffffff',
            marginBottom: '1rem',
            fontWeight: 'bold',
          }}>
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <p style={{
            fontSize: isMobile ? '0.85rem' : '0.9rem',
            color: '#999',
            marginBottom: '1.5rem',
          }}>
            Redirecting you to the home page...
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
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
        </div>
      </div>
    );
  }

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
            🐝 Reset Password 🐝
          </h1>
          <p style={{
            fontSize: isMobile ? '0.95rem' : '1.1rem',
            color: '#ffffff',
            margin: '0',
            fontWeight: 'bold',
          }}>
            Enter your new password below
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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
            <label htmlFor="password" style={{
              display: 'block',
              color: '#FFC30B',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              fontSize: isMobile ? '0.95rem' : '1rem',
            }}>
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              required
              minLength={6}
              disabled={submitting}
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
            <p style={{ marginTop: '0.5rem', fontSize: isMobile ? '0.85rem' : '0.9rem', color: '#999', fontWeight: 'bold' }}>
              Must be at least 6 characters
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <label htmlFor="confirmPassword" style={{
              display: 'block',
              color: '#FFC30B',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              fontSize: isMobile ? '0.95rem' : '1rem',
            }}>
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={6}
              disabled={submitting}
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
            disabled={submitting}
            style={{
              width: '100%',
              backgroundColor: submitting ? '#666' : '#FFC30B',
              color: '#000',
              fontWeight: 'bold',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: '3px solid #000',
              fontSize: isMobile ? '0.95rem' : '1rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              marginBottom: '1rem',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
            onMouseEnter={(e) => {
              if (!submitting) {
                e.currentTarget.style.backgroundColor = '#FFD700';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!submitting) {
                e.currentTarget.style.backgroundColor = '#FFC30B';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {submitting ? 'Updating Password...' : '🐝 Update Password 🐝'}
          </button>

          <div style={{ textAlign: 'center' }}>
            <Link
              href="/"
              style={{
                color: '#FFC30B',
                fontWeight: 'bold',
                textDecoration: 'underline',
                fontSize: isMobile ? '0.9rem' : '1rem',
              }}
            >
              Back to Home
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
