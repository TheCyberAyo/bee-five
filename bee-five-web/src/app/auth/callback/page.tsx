'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (!supabase) {
        setStatus('error');
        setMessage('Authentication service is not configured.');
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
          setStatus('error');
          setMessage(errorDescription || 'An error occurred during email confirmation.');
          return;
        }

        // Get tokens from hash (Supabase typically uses hash fragments)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        // If we have tokens in the hash, set the session
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setStatus('error');
            setMessage('Failed to confirm your email. Please try again.');
            return;
          }

          // Verify the session was set
          const { data: { session }, error: verifyError } = await supabase.auth.getSession();
          
          if (verifyError || !session) {
            setStatus('error');
            setMessage('Failed to verify your session. Please try again.');
            return;
          }

          // Success!
          setStatus('success');
          setMessage('Your email has been successfully confirmed!');
          
          // Redirect to home after 3 seconds
          setTimeout(() => {
            router.push('/');
          }, 3000);
        } else {
          // Check if session already exists (might have been set automatically)
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            setStatus('error');
            setMessage('Failed to verify your session. Please try again.');
            return;
          }

          if (session && session.user) {
            // Check if email is confirmed
            if (session.user.email_confirmed_at || session.user.confirmed_at) {
              setStatus('success');
              setMessage('Your email has been successfully confirmed!');
              
              // Redirect to home after 3 seconds
              setTimeout(() => {
                router.push('/');
              }, 3000);
            } else {
              setStatus('error');
              setMessage('Email confirmation is still pending. Please check your email.');
            }
          } else {
            setStatus('error');
            setMessage('Invalid confirmation link. Please request a new confirmation email.');
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="mb-4">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent"></div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Confirming your email...</h1>
            <p className="text-gray-600">Please wait while we verify your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Success!</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-sm text-gray-500 mb-4">Redirecting you to the home page...</p>
            <Link 
              href="/"
              className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
            >
              Go to Home
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Error</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link 
              href="/"
              className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
            >
              Go to Home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
