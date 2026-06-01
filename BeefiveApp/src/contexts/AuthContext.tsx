import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { internalEmailFromUsername, normalizeUsername } from '../utils/internalAuthEmail';

type SignUpResult = {
  data: { user: User | null; session: Session | null };
  error: AuthError | null;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (username: string, password: string, fullName: string) => Promise<SignUpResult>;
  /** Username or full email (for OAuth / legacy). */
  signIn: (identifier: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error getting session:', error);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email || 'no user');

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (
    username: string,
    password: string,
    fullName: string
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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: un,
          full_name: fn,
        },
      },
    });

    return { data, error };
  };

  const signIn = async (
    identifier: string,
    password: string
  ): Promise<{ error: AuthError | null }> => {
    if (!supabase) {
      return {
        error: {
          message: 'Supabase is not configured',
          name: 'AuthConfigurationError',
          status: 500,
        } as AuthError,
      };
    }
    const trimmed = identifier.trim();
    const email = trimmed.includes('@') ? trimmed : internalEmailFromUsername(trimmed);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    if (!supabase) {
      console.error('SignOut: Supabase is not configured');
      setSession(null);
      setUser(null);
      return;
    }

    setSession(null);
    setUser(null);

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('SignOut: Error during Supabase signOut:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
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
