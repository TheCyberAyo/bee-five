"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile } from '../../services/profileService';

interface UserProfileProps {
  onClose?: () => void;
}

export default function UserProfile({ onClose }: UserProfileProps) {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [username, setUsername] = useState(profile?.username || '');
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.username) {
      setUsername(profile.username);
    } else if (user?.email) {
      setUsername(user.email.split('@')[0]);
    }
  }, [profile, user]);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      onClose?.();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!user || !username.trim()) return;
    
    setSaving(true);
    try {
      const result = await updateUserProfile(user.id, { username: username.trim() });
      if (result.success) {
        await refreshProfile();
        setEditingUsername(false);
        setUsernameError(null);
      } else {
        setUsernameError(result.error || 'Failed to update username');
      }
    } catch (error: any) {
      console.error('Error saving username:', error);
      setUsernameError(error.message || 'Failed to update username');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  // Use profile username first, then email prefix as fallback
  const displayName = profile?.username || user.email?.split('@')[0] || 'User';

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '1.5rem',
        border: '2px solid #FFC30B',
        minWidth: '280px',
        maxWidth: '320px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#FFC30B', fontSize: '1.3rem', fontWeight: 'bold' }}>
          🐝 Profile
        </h3>
        
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ color: '#333', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            Username:
          </div>
          {editingUsername ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameError(null);
                  }}
                  placeholder="Enter username"
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: `2px solid ${usernameError ? '#f44336' : '#FFC30B'}`,
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveUsername();
                    }
                  }}
                />
              <button
                onClick={handleSaveUsername}
                disabled={saving || !username.trim()}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: saving ? '#ccc' : '#4CAF50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? '...' : '✓'}
              </button>
              <button
                onClick={() => {
                  setEditingUsername(false);
                  setUsername(profile?.username || user.email?.split('@')[0] || '');
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#ccc',
                  color: '#333',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            {usernameError && (
              <div style={{ fontSize: '0.75rem', color: '#f44336', marginTop: '-0.25rem' }}>
                {usernameError}
              </div>
            )}
          </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ color: '#000', fontSize: '1rem', fontWeight: 'bold', flex: 1 }}>
                {displayName}
              </div>
              <button
                onClick={() => setEditingUsername(true)}
                style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: '#FFC30B',
                  color: '#000',
                  border: '1px solid #000',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
                title="Edit username"
              >
                ✏️
              </button>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #eee' }}>
          <div style={{ color: '#333', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            Email:
          </div>
          <div style={{ color: '#666', fontSize: '0.9rem' }}>
            {user.email}
          </div>
        </div>

        {profile?.created_at && (
          <div style={{ color: '#999', fontSize: '0.75rem', fontStyle: 'italic' }}>
            Member since {new Date(profile.created_at).toLocaleDateString()}
          </div>
        )}
      </div>

      <button
        onClick={handleSignOut}
        disabled={loading}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: loading ? '#ccc' : '#f44336',
          color: '#fff',
          border: '2px solid #000',
          borderRadius: '8px',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {loading ? 'Signing out...' : 'Sign Out'}
      </button>
    </div>
  );
}

