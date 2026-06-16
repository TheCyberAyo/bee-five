"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthResponse, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { hasUsableAuthSession, bindSupabaseSession, syncSupabaseAuth } from '../lib/syncSupabaseAuth';
import { internalEmailFromUsername, normalizeUsername } from '../lib/internalAuthEmail';
import { loadUserProfile, UserProfile } from '../services/profileService';
import { resolveLoginEmail } from '../services/authLoginService';

type SignUpResult = {
  data: AuthResponse['data'];
  error: AuthError | null;
};

type SignInResult = {
  error: AuthError | null;
  session: Session | null;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  /** Session has access_token — safe for RLS reads and Realtime lobby. */
  isAuthenticated: boolean;
  signUp: (
    username: string,
    password: string,
    fullName: string,
    countryCode: string,
  ) => Promise<SignUpResult>;
  /** Pass username, or a full email (e.g. re-auth with `user.email`). */
  signIn: (identifier: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  signInWithProvider: (provider: 'google' | 'github') => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function applySessionToState(
  session: Session | null,
  setSession: (s: Session | null) => void,
  setUser: (u: User | null) => void,
): User | null {
  setSession(session);
  const nextUser = session?.user ?? null;
  setUser(nextUser);
  syncSupabaseAuth(session);
  void bindSupabaseSession(session);
  return nextUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const userProfile = await loadUserProfile(userId);
    setProfile(userProfile);
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    void supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      const nextUser = applySessionToState(initialSession, setSession, setUser);
      if (nextUser) {
        void loadProfile(nextUser.id);
      }
      setLoading(false);
    }).catch((error) => {
      console.error('Error getting session:', error);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      console.log('Auth state change:', event, nextSession?.user?.email || 'no user');

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const nextUser = applySessionToState(nextSession, setSession, setUser);
      setLoading(false);

      if (nextUser) {
        // Defer — avoid Supabase auth deadlock from async work inside this callback.
        queueMicrotask(() => {
          void loadProfile(nextUser.id);
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const signUp = async (
    username: string,
    password: string,
    fullName: string,
    countryCode: string,
  ): Promise<SignUpResult> => {
    if (!supabase) {
      return {
        data: { user: null, session: null },
        error: {
          message: 'Supabase is not configured',
          name: 'AuthConfigurationError',
          status: 500,
        } as AuthError,
      };
    }

    const un = normalizeUsername(username);
    const email = internalEmailFromUsername(un);
    const fn = fullName.trim();
    const country = countryCode.trim().toUpperCase();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: un,
          full_name: fn,
          country_code: country,
        },
      },
    });

    if (!error && data.session) {
      const nextUser = applySessionToState(data.session, setSession, setUser);
      if (nextUser) {
        void loadProfile(nextUser.id);
      }
    }

    return { data, error };
  };

  const signIn = async (
    identifier: string,
    password: string,
  ): Promise<SignInResult> => {
    if (!supabase) {
      return {
        session: null,
        error: {
          message: 'Supabase is not configured',
          name: 'AuthConfigurationError',
          status: 500,
        } as AuthError,
      };
    }

    const trimmed = identifier.trim();
    const email = await resolveLoginEmail(trimmed);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.session) {
      const nextUser = applySessionToState(data.session, setSession, setUser);
      if (nextUser) {
        void loadProfile(nextUser.id);
      }
    } else if (!error && data.user && !data.session) {
      return {
        session: null,
        error: {
          message:
            'Account exists but no active session. Confirm your email in Supabase, or use the same username/password as the mobile app.',
          name: 'AuthSessionMissingError',
          status: 401,
        } as AuthError,
      };
    }

    return { session: data.session ?? null, error };
  };

  const signOut = async () => {
    if (!supabase) {
      setSession(null);
      setUser(null);
      setProfile(null);
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        for (const key of Object.keys(localStorage)) {
          if (key.includes('supabase') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        }
        for (const key of Object.keys(sessionStorage)) {
          if (key.includes('supabase') || key.includes('sb-')) {
            sessionStorage.removeItem(key);
          }
        }
      } catch (storageError) {
        console.warn('SignOut: Could not clear storage:', storageError);
      }
    }

    setSession(null);
    setUser(null);
    setProfile(null);

    try {
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Sign out timeout')), 2000),
      );
      await Promise.race([signOutPromise, timeoutPromise]);
    } catch (error) {
      console.warn('SignOut: Error or timeout during Supabase signOut:', error);
    }
  };

  const signInWithProvider = async (provider: 'google' | 'github') => {
    if (!supabase) return;

    const getRedirectUrl = () => {
      if (typeof window === 'undefined') return undefined;
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
      if (siteUrl && siteUrl.startsWith('http')) {
        return `${siteUrl}/auth/callback`;
      }
      return `${window.location.origin}/auth/callback`;
    };

    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getRedirectUrl(),
      },
    });
  };

  const value = {
    user,
    session,
    profile,
    loading,
    isAuthenticated: hasUsableAuthSession(session),
    signUp,
    signIn,
    signOut,
    signInWithProvider,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
