"use client";

import { isSupabaseConfigured } from '../lib/supabase';

/**
 * Debug component to check Supabase configuration status
 * Shows helpful information if Supabase is not configured
 */
export function SupabaseStatus() {
  // Get environment variables (Next.js bundles NEXT_PUBLIC_* vars at build time)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Check if variables are present and valid
  const hasUrl = supabaseUrl && 
                 supabaseUrl.trim() !== '' && 
                 supabaseUrl.trim() !== 'YOUR_SUPABASE_URL' &&
                 supabaseUrl.trim().startsWith('https://');
  
  const hasKey = supabaseKey && 
                 supabaseKey.trim() !== '' && 
                 supabaseKey.trim() !== 'YOUR_SUPABASE_ANON_KEY' &&
                 supabaseKey.trim().startsWith('eyJ');
  
  // Check if Supabase is actually configured (server-side check)
  const isConfigured = isSupabaseConfigured();
  
  // Only show error if both checks fail (client-side vars missing AND server-side not configured)
  if (isConfigured || (hasUrl && hasKey)) {
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
          <li>NEXT_PUBLIC_SUPABASE_URL: {hasUrl ? '✅ Set' : '❌ Missing'}
            {supabaseUrl && !hasUrl && <span style={{ fontSize: '0.75em', display: 'block', marginTop: '2px' }}>
              (Invalid: {supabaseUrl.substring(0, 30)}...)
            </span>}
          </li>
          <li>NEXT_PUBLIC_SUPABASE_ANON_KEY: {hasKey ? '✅ Set' : '❌ Missing'}
            {supabaseKey && !hasKey && <span style={{ fontSize: '0.75em', display: 'block', marginTop: '2px' }}>
              (Invalid format)
            </span>}
          </li>
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

