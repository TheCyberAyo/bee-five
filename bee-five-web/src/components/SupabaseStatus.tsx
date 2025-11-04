"use client";

import { isSupabaseConfigured } from '../lib/supabase';

/**
 * Debug component to check Supabase configuration status
 * Shows helpful information if Supabase is not configured
 */
export function SupabaseStatus() {
  const isConfigured = isSupabaseConfigured();
  // Check if variables are available (may be undefined on client if not loaded at build time)
  const hasUrl = typeof process.env.NEXT_PUBLIC_SUPABASE_URL !== 'undefined' && 
                 process.env.NEXT_PUBLIC_SUPABASE_URL !== '';
  const hasKey = typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'undefined' && 
                 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== '';

  if (isConfigured) {
    return null; // Don't show anything if configured
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: '#fff3cd',
      padding: '15px',
      borderRadius: '8px',
      border: '2px solid #ffc107',
      maxWidth: '400px',
      fontSize: '0.85em',
      zIndex: 9999,
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#856404' }}>
        ⚠️ Supabase Not Configured
      </div>
      <div style={{ color: '#856404', marginBottom: '10px' }}>
        Environment variables status:
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          <li>NEXT_PUBLIC_SUPABASE_URL: {hasUrl ? '✅ Set' : '❌ Missing'}</li>
          <li>NEXT_PUBLIC_SUPABASE_ANON_KEY: {hasKey ? '✅ Set' : '❌ Missing'}</li>
        </ul>
      </div>
      <div style={{ fontSize: '0.8em', color: '#856404' }}>
        <strong>Solution:</strong> 
        <ul style={{ margin: '5px 0', paddingLeft: '20px', marginTop: '5px' }}>
          <li>Create <code>.env.local</code> file in <code>bee-five-web/</code> folder</li>
          <li>Add your Supabase credentials (see <strong>DEPLOYMENT_SETUP.md</strong>)</li>
          <li><strong>Restart your dev server</strong> (Ctrl+C then <code>npm run dev</code>)</li>
        </ul>
      </div>
    </div>
  );
}

