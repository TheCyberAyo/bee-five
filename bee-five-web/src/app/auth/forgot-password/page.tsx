'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const validateEmail = (emailValue: string): string | null => {
    if (!emailValue.trim()) {
      return 'Please enter your email address';
    }
    if (!EMAIL_REGEX.test(emailValue.trim())) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  const emailError = emailTouched ? validateEmail(email) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setEmailTouched(true);

    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!supabase) {
      setError('Authentication service is not configured.');
      return;
    }

    setLoading(true);

    try {
      // Get the redirect URL for password reset
      const getRedirectUrl = () => {
        if (typeof window === 'undefined') return undefined;

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
        if (siteUrl && siteUrl.startsWith('http')) {
          return `${siteUrl}/auth/reset-password`;
        }

        return `${window.location.origin}/auth/reset-password`;
      };

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getRedirectUrl(),
      });

      if (resetError) {
        // Provide user-friendly error messages
        let errorMessage = resetError.message || 'Failed to send password reset email.';
        if (resetError.message.includes('rate limit')) {
          errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
        } else if (resetError.message.includes('email')) {
          errorMessage = 'Please check your email address and try again.';
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50 p-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-md w-full">
        {/* Main card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 md:p-10 transition-all duration-300">
          {success ? (
            <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Success icon with animation */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
                  <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Success message */}
              <div className="space-y-3">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Check your email!
                </h2>
                <div className="space-y-2">
                  <p className="text-gray-600 leading-relaxed">
                    We've sent a password reset link to
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-lg border border-amber-200">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-900 font-semibold break-all">{email}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 pt-2">
                  Please check your inbox and click the link to reset your password. The link will expire in 1 hour.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 pt-4">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Go to Home
                </Link>
                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                    setError(null);
                    setEmailTouched(false);
                  }}
                  className="text-amber-600 hover:text-amber-700 font-medium transition-colors inline-flex items-center justify-center gap-1 group"
                  type="button"
                >
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Send another email
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header section */}
              <div className="text-center mb-8 space-y-3">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 mb-4 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent tracking-tight">
                  Forgot Password?
                </h1>
                <p className="text-gray-600 leading-relaxed max-w-sm mx-auto">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div 
                  className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm"
                  role="alert"
                  aria-live="polite"
                >
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="flex-1 text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate className="space-y-6">
                <div className="space-y-2">
                  <label 
                    htmlFor="email" 
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      onBlur={() => setEmailTouched(true)}
                      placeholder="your@email.com"
                      required
                      aria-invalid={emailError ? 'true' : 'false'}
                      aria-describedby={emailError ? 'email-error' : undefined}
                      className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                        emailError 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/50' 
                          : 'border-gray-200 focus:border-amber-400 focus:ring-amber-200 bg-white hover:border-gray-300'
                      } disabled:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-200`}
                      disabled={loading}
                    />
                  </div>
                  {emailError && (
                    <p 
                      id="email-error" 
                      className="text-sm text-red-600 animate-in fade-in duration-200 flex items-center gap-1"
                      role="alert"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {emailError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !!emailError}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:from-amber-700 active:to-orange-700 text-white font-semibold py-3 px-5 rounded-xl transition-all duration-200 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:text-gray-500 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:shadow-none flex items-center justify-center gap-2"
                  aria-busy={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>Send Reset Link</span>
                    </>
                  )}
                </button>

                {/* Navigation links */}
                <div className="text-center pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <Link
                      href="/"
                      className="text-gray-600 hover:text-gray-900 font-medium transition-colors inline-flex items-center gap-1.5 group"
                    >
                      <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back to Home
                    </Link>
                    <span className="text-gray-300" aria-hidden="true">•</span>
                    <Link
                      href="/"
                      className="text-gray-600 hover:text-gray-900 font-medium transition-colors inline-flex items-center gap-1.5 group"
                    >
                      Sign In
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
