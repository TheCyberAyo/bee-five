"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { isUsernameAvailable } from '../../services/usernameService';

interface AuthModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const { signUp, signIn, signInWithProvider, refreshProfile } = useAuth();

  // Check username availability when user types (debounced)
  useEffect(() => {
    if (!isSignUp || !username.trim() || username.trim().length < 3) {
      setUsernameError(null);
      return;
    }

    const checkTimer = setTimeout(async () => {
      setCheckingUsername(true);
      setUsernameError(null);
      
      const result = await isUsernameAvailable(username.trim());
      
      if (!result.available) {
        setUsernameError(result.error || 'Username is already taken');
      }
      
      setCheckingUsername(false);
    }, 500); // Debounce for 500ms

    return () => clearTimeout(checkTimer);
  }, [username, isSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        // Require username for signup
        if (!username.trim()) {
          setError('Please enter a username');
          setLoading(false);
          return;
        }

        // Check username availability before signup
        const usernameCheck = await isUsernameAvailable(username.trim());
        if (!usernameCheck.available) {
          setError(usernameCheck.error || 'Username is already taken. Please choose another.');
          setLoading(false);
          return;
        }

        // Sign up with username
        const { error } = await signUp(email, password, username.trim());
        if (error) {
          setError(error.message || 'Failed to sign up');
        } else {
          // Update profile with username (after trigger creates it)
          const supabaseClient = supabase;
          if (supabaseClient) {
            setTimeout(async () => {
              if (!supabaseClient) return;
              const { data: { user } } = await supabaseClient.auth.getUser();
              if (user) {
                // Try to update profile, retry if it doesn't exist yet
                let retries = 0;
                const updateProfile = async () => {
                  if (!supabaseClient) return;
                  const { error: updateError } = await supabaseClient
                    .from('user_profiles')
                    .update({ username: username.trim() })
                    .eq('id', user.id);
                  
                  if (updateError && retries < 3) {
                    retries++;
                    setTimeout(updateProfile, 500);
                  } else {
                    await refreshProfile();
                  }
                };
                await updateProfile();
              }
            }, 1000);
          }
          setError(null);
          // Check email confirmation message
          alert('Please check your email to confirm your account!');
          onSuccess?.();
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message || 'Failed to sign in');
        } else {
          setError(null);
          onSuccess?.();
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSignIn = async (provider: 'google' | 'github') => {
    setError(null);
    try {
      await signInWithProvider(provider);
      // Provider sign-in redirects, so we don't need to handle success here
    } catch (err: any) {
      setError(err.message || `Failed to sign in with ${provider}`);
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
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: `2px solid ${usernameError ? '#f44336' : (checkingUsername ? '#FFC30B' : '#ddd')}`,
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
                {checkingUsername && (
                  <div style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#FFC30B',
                    fontSize: '0.9rem'
                  }}>
                    Checking...
                  </div>
                )}
              </div>
              {usernameError ? (
                <div style={{ fontSize: '0.8rem', color: '#f44336', marginTop: '0.25rem' }}>
                  {usernameError}
                </div>
              ) : username.trim().length >= 3 && !checkingUsername ? (
                <div style={{ fontSize: '0.8rem', color: '#4CAF50', marginTop: '0.25rem' }}>
                  ✓ Username available
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                  This will be your display name (3+ characters, letters, numbers, _, -)
                </div>
              )}
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
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
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

          <div style={{ marginBottom: '1.5rem' }}>
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
              minLength={6}
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
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
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

