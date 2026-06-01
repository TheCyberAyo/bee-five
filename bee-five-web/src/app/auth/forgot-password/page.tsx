'use client';

import Link from 'next/link';

/** Username accounts use synthetic `@beefive.app` emails; email reset is not used. */
export default function ForgotPasswordPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: '#FFC30B',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Password reset unavailable</h1>
      <p style={{ maxWidth: 420, textAlign: 'center', marginBottom: '1.5rem', color: '#222' }}>
        BeeFive accounts sign in with a username and password. Forgot-password email flows are not used for
        username login.
      </p>
      <Link href="/" style={{ color: '#000', fontWeight: 'bold' }}>
        ← Back to game
      </Link>
    </div>
  );
}
