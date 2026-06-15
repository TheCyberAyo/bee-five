"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MAX_USERNAME_LENGTH, MIN_USERNAME_LENGTH, normalizeUsername, validateUsername } from '../../lib/internalAuthEmail';
import { isUsernameAvailable } from '../../services/usernameService';
import { mgMultiplayerService } from '../../services/mgMultiplayerService';
import { SIGNUP_COUNTRIES, countryLabelWithFlag } from '../../utils/countryData';

interface AuthModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  /** Opens the modal in sign-up mode when true, sign-in when false. */
  initialSignUp?: boolean;
}

const PASSWORD_LETTER = /[A-Za-z]/;

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '8px',
  border: '2px solid #ddd',
  fontSize: '1rem',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.5rem',
  color: '#333',
  fontWeight: 'bold',
};

export default function AuthModal({ onClose, onSuccess, initialSignUp = false }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(initialSignUp);
  const [loginUsername, setLoginUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [countryCode, setCountryCode] = useState('ZA');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { signUp, signIn, user } = useAuth();

  const onCloseRef = useRef(onClose);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onCloseRef.current = onClose;
    onSuccessRef.current = onSuccess;
  }, [onClose, onSuccess]);

  useEffect(() => {
    setIsSignUp(initialSignUp);
    setSuccessMessage(null);
    setError(null);
  }, [initialSignUp]);

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
    if (!isSignUp || !username.trim()) {
      setUsernameError(null);
      setCheckingUsername(false);
      return;
    }

    const formatError = validateUsername(username);
    if (formatError) {
      setUsernameError(formatError);
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
      } catch (checkErr) {
        console.error('Error checking username:', checkErr);
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
    if (!pwd) return 'Please enter a password';
    if (pwd.length < 8) return 'Password must be at least 8 characters';
    if (!PASSWORD_LETTER.test(pwd)) return 'Password must include at least one letter';
    return null;
  };

  const resetSignUpFields = () => {
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setUsername('');
    setCountryCode('ZA');
    setUsernameError(null);
  };

  const switchMode = (signUp: boolean) => {
    setIsSignUp(signUp);
    setError(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
    if (!signUp) resetSignUpFields();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
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
        if (!countryCode.trim()) {
          setError('Please select your country');
          setLoading(false);
          return;
        }

        const usernameFormatError = validateUsername(username);
        if (usernameFormatError) {
          setError(usernameFormatError);
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

        if (!confirmPassword) {
          setError('Please confirm your password');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        const un = normalizeUsername(username);
        const { data, error: signErr } = await signUp(
          un,
          password,
          trimmedFullName,
          countryCode.trim().toUpperCase(),
        );

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

        if (data.user || data.session) {
          try {
            await mgMultiplayerService.createMgProfile(un, {
              fullName: trimmedFullName,
              countryCode: countryCode.trim().toUpperCase(),
            });
          } catch {
            setError(
              'Account created, but your online profile could not be saved. Sign in and try Live Matches again, or contact support if this persists.',
            );
            setLoading(false);
            return;
          }
        }

        if (data.session) {
          setLoading(false);
          return;
        }

        setLoading(false);
        resetSignUpFields();
        setSuccessMessage('Account created. You can sign in now with your username and password.');
        switchMode(false);
        return;
      }

      const loginFormatError = validateUsername(loginUsername);
      if (loginFormatError) {
        setError(loginFormatError);
        setLoading(false);
        return;
      }

      if (!password) {
        setError('Please enter your password');
        setLoading(false);
        return;
      }

      const { error: signInErr } = await signIn(loginUsername.trim(), password);
      if (signInErr) {
        const m = signInErr.message?.toLowerCase() ?? '';
        if (
          m.includes('invalid login') ||
          m.includes('invalid_credentials') ||
          m.includes('invalid grant')
        ) {
          setError('Invalid username or password. Please try again.');
        } else {
          setError(signInErr.message || 'Failed to sign in');
        }
        setLoading(false);
        return;
      }

      try {
        await mgMultiplayerService.syncMgProfileFromAuthMetadata();
      } catch {
        // non-blocking, same as Dart adventure sync
      }

      setError(null);
      setLoading(false);
      setIsClosing(true);
      onCloseRef.current();
      onSuccessRef.current?.();
    } catch (err: unknown) {
      console.error('Sign up/sign in error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
      setLoading(false);
      setIsClosing(false);
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
          maxWidth: '420px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: '3px solid #FFC30B',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, color: '#FFC30B', fontSize: '1.8rem', fontWeight: 'bold' }}>
            {isSignUp ? '🐝 Sign Up' : '🐝 Sign In'}
          </h2>
          <button
            type="button"
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

        <p style={{ margin: '0 0 1.25rem', fontSize: '15px', color: '#555', lineHeight: 1.45 }}>
          {isSignUp
            ? 'Full name, username, and password — no email address required.'
            : 'Welcome back! Sign in with your BeeFive username.'}
        </p>

        {successMessage && (
          <div
            style={{
              backgroundColor: '#e8f5e9',
              color: '#2e7d32',
              padding: '0.75rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              border: '1px solid #c8e6c9',
            }}
          >
            {successMessage}
          </div>
        )}

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
              <label style={labelStyle}>
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
                placeholder="e.g. Ayongezwa Dlamini"
                style={inputStyle}
              />
            </div>
          )}

          {isSignUp && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>
                Country <span style={{ color: '#f44336' }}>*</span>
              </label>
              <select
                value={countryCode}
                onChange={(e) => {
                  setCountryCode(e.target.value);
                  setError(null);
                }}
                required
                style={inputStyle}
              >
                {SIGNUP_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {countryLabelWithFlag(c.code)}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                Your flag appears next to your name online
              </div>
            </div>
          )}

          {isSignUp ? (
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>
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
                  minLength={MIN_USERNAME_LENGTH}
                  maxLength={MAX_USERNAME_LENGTH}
                  autoComplete="username"
                  style={{
                    ...inputStyle,
                    border: `2px solid ${usernameError ? '#f44336' : checkingUsername ? '#FFC30B' : '#ddd'}`,
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
              ) : username.trim().length >= MIN_USERNAME_LENGTH &&
                username.trim().length <= MAX_USERNAME_LENGTH &&
                !checkingUsername ? (
                <div style={{ fontSize: '0.8rem', color: '#4CAF50', marginTop: '0.25rem' }}>✓ Username available</div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                  {MIN_USERNAME_LENGTH}–{MAX_USERNAME_LENGTH} characters; letters, numbers, _, - · stored lowercase
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Username</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => {
                  setLoginUsername(e.target.value);
                  setError(null);
                }}
                required
                autoComplete="username"
                placeholder="your_username"
                style={inputStyle}
              />
              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                Same username you chose at sign up
              </div>
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={isSignUp ? 8 : undefined}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                style={{ ...inputStyle, paddingRight: '4.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#FFC30B',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {isSignUp && (
              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                At least 8 characters with one letter
              </div>
            )}
          </div>

          {isSignUp && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Confirm password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={8}
                  autoComplete="new-password"
                  style={{ ...inputStyle, paddingRight: '4.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#FFC30B',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

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

        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={() => switchMode(!isSignUp)}
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
