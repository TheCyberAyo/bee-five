"use client";

import React, { useEffect, useState } from 'react';

function isCoarsePointerDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

function isLandscapeViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(orientation: landscape)').matches;
}

async function tryLockPortrait(): Promise<void> {
  if (typeof window === 'undefined') return;
  const orientation = window.screen.orientation as ScreenOrientation & {
    lock?: (orientation: 'portrait' | 'portrait-primary' | 'portrait-secondary') => Promise<void>;
  };
  if (!orientation.lock) return;
  try {
    await orientation.lock('portrait');
  } catch {
    // Browsers often require installed PWA or fullscreen before locking.
  }
}

export default function PortraitLock({ children }: { children: React.ReactNode }) {
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);

  useEffect(() => {
    const update = () => {
      setShowRotatePrompt(isCoarsePointerDevice() && isLandscapeViewport());
    };

    update();
    void tryLockPortrait();

    const onGesture = () => {
      void tryLockPortrait();
    };

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.addEventListener('pointerdown', onGesture, { once: true });
    window.addEventListener('touchstart', onGesture, { once: true });

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('touchstart', onGesture);
    };
  }, []);

  return (
    <>
      {children}
      {showRotatePrompt && (
        <div className="portrait-lock-overlay" role="dialog" aria-modal="true" aria-label="Rotate device">
          <div className="portrait-lock-card">
            <div className="portrait-lock-icon" aria-hidden="true">
              📱
            </div>
            <p className="portrait-lock-title">Please rotate your device</p>
            <p className="portrait-lock-text">Bee Five is portrait only.</p>
          </div>
        </div>
      )}
    </>
  );
}
