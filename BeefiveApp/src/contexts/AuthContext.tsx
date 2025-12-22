import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type SignUpResult = {
  data: { user: User | null; session: Session | null };
  error: AuthError | null;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username?: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
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

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error('Error getting session:', error);
      setLoading(false);
    });

    // Listen for auth changes
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

  const signUp = async (email: string, password: string, username?: string): Promise<SignUpResult> => {
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
    
    // Get the redirect URL based on platform
    // For web (React Native Web), use web URL
    // For native mobile (iOS/Android), use deep link
    const getEmailRedirectUrl = (): string | undefined => {
      // Check if running on web (React Native Web)
      if (Platform.OS === 'web') {
        // For web platform, try to get the current origin
        // This will work if running React Native Web
        try {
          // @ts-ignore - window may not be defined in React Native types
          if (typeof window !== 'undefined' && window.location) {
            // @ts-ignore
            const origin = window.location.origin;
            if (origin) {
              return `${origin}/auth/callback`;
            }
          }
        } catch (e) {
          // If window is not available, return undefined
          console.warn('Could not determine web origin for email redirect');
        }
        return undefined;
      } else {
        // Use deep link for native mobile platforms (iOS/Android)
        return 'beefive://confirm-email';
      }
    };
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0],
        },
        emailRedirectTo: getEmailRedirectUrl(),
      },
    });
    
    return { data, error };
  };

  const signIn = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    if (!supabase) {
      return {
        error: {
          message: 'Supabase is not configured',
          name: 'AuthConfigurationError',
          status: 500,
        } as AuthError,
      };
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
      setSession(null);
      setUser(null);
      return;
    }
    
    console.log('SignOut: Starting sign out process...');
    
    // Clear local state immediately
    setSession(null);
    setUser(null);
    
    try {
      await supabase.auth.signOut();
      console.log('SignOut: Successfully signed out from Supabase');
    } catch (error) {
      console.warn('SignOut: Error during Supabase signOut:', error);
    }
  };

  const resetPasswordForEmail = async (email: string): Promise<{ error: AuthError | null }> => {
    if (!supabase) {
      return {
        error: {
          message: 'Supabase is not configured',
          name: 'AuthConfigurationError',
          status: 500,
        } as AuthError,
      };
    }

    // For React Native, we need to use a deep link URL
    // This should be configured in your Supabase dashboard
    // Format: yourapp://reset-password
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'beefive://reset-password',
    });

    return { error };
  };

  const updatePassword = async (password: string): Promise<{ error: AuthError | null }> => {
    if (!supabase) {
      return {
        error: {
          message: 'Supabase is not configured',
          name: 'AuthConfigurationError',
          status: 500,
        } as AuthError,
      };
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPasswordForEmail,
    updatePassword,
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










