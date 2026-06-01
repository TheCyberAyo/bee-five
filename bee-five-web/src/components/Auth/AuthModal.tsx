"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isUsernameAvailable } from '../../services/usernameService';

interface AuthModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const { signUp, signIn, signInWithProvider, user } = useAuth();

  const onCloseRef = useRef(onClose);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onCloseRef.current = onClose;
    onSuccessRef.current = onSuccess;
  }, [onClose, onSuccess]);

  useEffect(() => {
    if (user) {
      setIsClosing(true);
      setLoading(false);
      const timer = setTimeout(() => {
        onCloseRef.current();
        onSuccessRef.current?.();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    if (!isSignUp || !username.trim() || username.trim().length < 3) {
      setUsernameError(null);
      setCheckingUsername(false);
      return;
    }

    const checkTimer = setTimeout(async () => {
      setCheckingUsername(true);
      setUsernameError(null);

      try {
        const result = await isUsernameAvailable(username.trim());

        if (!result.available) {
          setUsernameError(result.error || 'Username is already taken');
        } else {
          setUsernameError(null);
        }
      } catch (error) {
        console.error('Error checking username:', error);
        setUsernameError(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => {
      clearTimeout(checkTimer);
      setCheckingUsername(false);
    };
  }, [username, isSignUp]);

  if (isClosing || user) {
    return null;
  }

  const validatePasswordStrength = (pwd: string): string | null => {
    if (pwd.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Za-z]/.test(pwd)) return 'Password must include at least one letter';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const trimmedFullName = fullName.trim();
        if (!trimmedFullName) {
          setError('Please enter your full name');
          setLoading(false);
          return;
        }
        if (trimmedFullName.length < 2) {
          setError('Full name must be at least 2 characters');
          setLoading(false);
          return;
        }

        if (!username.trim()) {
          setError('Please enter a username');
          setLoading(false);
          return;
        }

        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        if (!usernameRegex.test(username.trim())) {
          setError('Username can only contain letters, numbers, underscores, and hyphens');
          setLoading(false);
          return;
        }

        if (username.trim().length < 3) {
          setError('Username must be at least 3 characters');
          setLoading(false);
          return;
        }

        if (usernameError) {
          setError(usernameError);
          setLoading(false);
          return;
        }

        const pwdErr = validatePasswordStrength(password);
        if (pwdErr) {
          setError(pwdErr);
          setLoading(false);
          return;
        }

        const { error: signErr } = await signUp(username.trim(), password, trimmedFullName);

        if (signErr) {
          const m = signErr.message?.toLowerCase() ?? '';
          if (
            m.includes('already registered') ||
            m.includes('user already') ||
            m.includes('duplicate')
          ) {
            setError('That username is already taken. Please choose another.');
          } else if (m.includes('password')) {
            setError('Password is too weak. Use at least 8 characters and include a letter.');
          } else {
            setError(signErr.message || 'Failed to sign up. Please try again.');
          }
          setLoading(false);
          return;
        }

        setError(null);
        setLoading(false);
        setIsClosing(true);
        setTimeout(() => {
          onCloseRef.current();
          onSuccessRef.current?.();
        }, 100);
      } else {
        if (!loginUsername.trim()) {
          setError('Please enter your username');
          setLoading(false);
          return;
        }

        const { error } = await signIn(loginUsername.trim(), password);
        if (error) {
          const m = error.message?.toLowerCase() ?? '';
          if (
            m.includes('invalid login') ||
            m.includes('invalid_credentials') ||
            m.includes('invalid grant')
          ) {
            setError('Invalid username or password. Please try again.');
          } else {
            setError(error.message || 'Failed to sign in');
          }
          setLoading(false);
          setIsClosing(false);
        } else {
          setError(null);
          setIsClosing(true);
          setLoading(false);
          onCloseRef.current();
          onSuccessRef.current?.();
          setTimeout(() => {
            onCloseRef.current();
            onSuccessRef.current?.();
          }, 100);
        }
      }
    } catch (err: unknown) {
      console.error('Sign up/sign in error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
      setLoading(false);
      setIsClosing(false);
    }
  };

  const handleProviderSignIn = async (provider: 'google' | 'github') => {
    setError(null);
    try {
      await signInWithProvider(provider);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to sign in with ${provider}`);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '20px',
          padding: '2rem',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: '3px solid #FFC30B',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: '#FFC30B', fontSize: '1.8rem', fontWeight: 'bold' }}>
            {isSignUp ? '🐝 Sign Up' : '🐝 Sign In'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666',
              fontWeight: 'bold',
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#fee',
              color: '#c33',
              padding: '0.75rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              border: '1px solid #fcc',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#333',
                  fontWeight: 'bold',
                }}
              >
                Full name <span style={{ color: '#f44336' }}>*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setError(null);
                }}
                required
                minLength={2}
                autoComplete="name"
                placeholder="Your full name"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid #ddd',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {isSignUp && (
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#333',
                  fontWeight: 'bold',
                }}
              >
                Username <span style={{ color: '#f44336' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameError(null);
                  }}
                  placeholder="Choose a username"
                  required
                  minLength={3}
                  autoComplete="username"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: `2px solid ${usernameError ? '#f44336' : checkingUsername ? '#FFC30B' : '#ddd'}`,
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
                {checkingUsername && (
                  <div
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#FFC30B',
                      fontSize: '0.9rem',
                    }}
                  >
                    Checking...
                  </div>
                )}
              </div>
              {usernameError ? (
                <div style={{ fontSize: '0.8rem', color: '#f44336', marginTop: '0.25rem' }}>{usernameError}</div>
              ) : username.trim().length >= 3 && !checkingUsername ? (
                <div style={{ fontSize: '0.8rem', color: '#4CAF50', marginTop: '0.25rem' }}>✓ Username available</div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                  3+ characters; letters, numbers, _, - · stored lowercase
                </div>
              )}
            </div>
          )}

          {!isSignUp && (
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#333',
                  fontWeight: 'bold',
                }}
              >
                Username
              </label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => {
                  setLoginUsername(e.target.value);
                  setError(null);
                }}
                required
                autoComplete="username"
                placeholder="Your BeeFive username"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid #ddd',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: 'bold',
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={isSignUp ? 8 : 6}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '2px solid #ddd',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
            {isSignUp && (
              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                At least 8 characters with one letter
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? '#ccc' : '#FFC30B',
              color: '#000',
              border: '3px solid #000',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '1rem',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginBottom: '1rem', color: '#666' }}>or</div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={() => handleProviderSignIn('google')}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: '#fff',
              color: '#333',
              border: '2px solid #ddd',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <span>🔍</span> Google
          </button>
          <button
            type="button"
            onClick={() => handleProviderSignIn('github')}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: '#333',
              color: '#fff',
              border: '2px solid #000',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <span>💻</span> GitHub
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setPassword('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFC30B',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '0.9rem',
            }}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
