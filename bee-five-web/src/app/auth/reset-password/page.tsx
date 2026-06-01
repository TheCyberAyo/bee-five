'use client';

import Link from 'next/link';

export default function ResetPasswordPage() {
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
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Reset link not supported</h1>
      <p style={{ maxWidth: 420, textAlign: 'center', marginBottom: '1.5rem', color: '#222' }}>
        Username-based accounts do not use email reset links. Sign in from the game with your username.
      </p>
      <Link href="/" style={{ color: '#000', fontWeight: 'bold' }}>
        ← Back to game
      </Link>
    </div>
  );
}
