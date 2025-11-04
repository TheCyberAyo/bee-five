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
    } = supabase?.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email || 'no user');
      
      // If SIGNED_OUT event, ensure we clear everything
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      
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
    
    // Get the redirect URL - use environment variable if set, otherwise use window.location.origin
    // This ensures email confirmation links work on mobile devices
    const getRedirectUrl = () => {
      if (typeof window === 'undefined') return undefined;
      
      // Check for configured site URL (for production)
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
      if (siteUrl && siteUrl.startsWith('http')) {
        return `${siteUrl}/auth/callback`;
      }
      
      // Fall back to window.location.origin (for local development)
      return `${window.location.origin}/auth/callback`;
    };
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0],
        },
        emailRedirectTo: getRedirectUrl(),
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
      console.error('SignOut: Supabase is not configured');
      // Clear state anyway
      setSession(null);
      setUser(null);
      setProfile(null);
      return;
    }
    
    console.log('SignOut: Starting sign out process...');
    
    // Clear storage first to prevent auth state listener from restoring session
    if (typeof window !== 'undefined') {
      try {
        // Clear all Supabase auth-related keys
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('supabase') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
        
        // Also clear sessionStorage
        const sessionKeys = Object.keys(sessionStorage);
        sessionKeys.forEach(key => {
          if (key.includes('supabase') || key.includes('sb-')) {
            sessionStorage.removeItem(key);
          }
        });
        
        console.log('SignOut: Cleared localStorage and sessionStorage');
      } catch (storageError) {
        console.warn('SignOut: Could not clear storage:', storageError);
      }
    }
    
    // Clear local state immediately
    setSession(null);
    setUser(null);
    setProfile(null);
    
    // Try to sign out from Supabase with a timeout
    try {
      console.log('SignOut: Attempting to sign out from Supabase...');
      
      // Add a timeout to prevent hanging
      const signOutPromise = supabase.auth.signOut().then(({ error }) => {
        if (error) {
          throw error;
        }
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign out timeout')), 2000)
      );
      
      await Promise.race([signOutPromise, timeoutPromise]);
      console.log('SignOut: Successfully signed out from Supabase');
    } catch (error) {
      console.warn('SignOut: Error or timeout during Supabase signOut:', error);
      // State already cleared, so we continue anyway
    }
    
    // Double-check: ensure state is cleared
    setSession(null);
    setUser(null);
    setProfile(null);
    console.log('SignOut: Sign out process completed');
  };

  const signInWithProvider = async (provider: 'google' | 'github') => {
    if (!supabase) {
      return;
    }
    
    // Get the redirect URL - use environment variable if set, otherwise use window.location.origin
    const getRedirectUrl = () => {
      if (typeof window === 'undefined') return undefined;
      
      // Check for configured site URL (for production)
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
      if (siteUrl && siteUrl.startsWith('http')) {
        return siteUrl;
      }
      
      // Fall back to window.location.origin (for local development)
      return window.location.origin;
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

