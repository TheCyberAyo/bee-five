"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { loadUserProfile, UserProfile } from '../services/profileService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, username?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signInWithProvider: (provider: 'google' | 'github') => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    // Get initial session
    supabase?.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase?.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }) || { data: { subscription: null } };

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const signUp = async (email: string, password: string, username?: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase is not configured' } };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0],
        },
      },
    });
    
    // If signup successful and username provided, update profile immediately
    if (!error && username && supabase) {
      // Wait a moment for the trigger to create the profile
      const supabaseClient = supabase;
      setTimeout(async () => {
        if (!supabaseClient) return;
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          await supabaseClient
            .from('user_profiles')
            .update({ username: username.trim() })
            .eq('id', user.id);
        }
      }, 500);
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase is not configured' } };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut();
  };

  const signInWithProvider = async (provider: 'google' | 'github') => {
    if (!supabase) {
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}`,
      },
    });
  };

  const value = {
    user,
    session,
    profile,
    loading,
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

