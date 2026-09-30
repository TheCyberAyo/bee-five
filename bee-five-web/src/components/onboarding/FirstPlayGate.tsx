'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import GuidedPractice from './GuidedPractice';
import { firstPlayHandled, rememberFirstPlay, trackOnboarding, TUTORIAL_ID } from '../../utils/onboarding';
import styles from './onboarding.module.css';

function WinningExample({ direction }: { direction: 'Horizontal' | 'Vertical' | 'Diagonal' }) {
  return <figure className={styles.example}>
    <svg viewBox="0 0 100 100" role="img" aria-label={`Five pieces in a ${direction.toLowerCase()} line win`}>
      {Array.from({ length: 6 }, (_, i) => <g key={i} stroke="#b8ac8a" strokeWidth=".6">
        <path d={`M ${i * 20} 0 V 100 M 0 ${i * 20} H 100`} />
      </g>)}
      {Array.from({ length: 5 }, (_, i) => <circle key={i}
        cx={direction === 'Vertical' ? 50 : i * 20 + 10}
        cy={direction === 'Horizontal' ? 50 : i * 20 + 10}
        r="7" fill="#ffc30b" stroke="#171717" strokeWidth="1.5" />)}
    </svg>
    <figcaption>{direction}</figcaption>
  </figure>;
}

export default function FirstPlayGate({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<'loading' | 'intro' | 'practice' | 'done'>('loading');
  const initialized = useRef(false);
  const completed = useRef(false);
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (firstPlayHandled()) setStage('done');
    else {
      setStage('intro');
      trackOnboarding('tutorial_begin', { tutorial_id: TUTORIAL_ID });
    }
  }, []);

  useEffect(() => { if (stage === 'intro') title.current?.focus(); }, [stage]);

  const complete = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    rememberFirstPlay();
    trackOnboarding('tutorial_complete', { tutorial_id: TUTORIAL_ID });
  }, []);

  function leave() {
    if (!completed.current) trackOnboarding('tutorial_skipped', {
      tutorial_id: TUTORIAL_ID, step: stage === 'practice' ? 'practice' : 'introduction',
    });
    rememberFirstPlay();
    setStage('done');
  }

  if (stage === 'done') return children;
  if (stage === 'loading') return <main className={styles.screen} aria-busy="true"><p>Loading Bee Five…</p></main>;
  if (stage === 'practice') return <GuidedPractice onComplete={complete} onLeave={leave} />;

  return <main className={styles.screen} aria-labelledby="first-play-title">
    <header className={styles.header}><span>Welcome to Bee Five</span><button className={styles.secondary} onClick={leave}>Skip</button></header>
    <section className={styles.content}>
      <h1 id="first-play-title" ref={title} tabIndex={-1} className={styles.title}>Connect five of your pieces in a row to win.</h1>
      <p className={styles.copy}>Take turns placing one piece on an empty square. Make a line in any of these directions:</p>
      <div className={styles.examples}><WinningExample direction="Horizontal" /><WinningExample direction="Vertical" /><WinningExample direction="Diagonal" /></div>
      <p className={styles.copy}>Diagonal lines can slope either way.</p>
      <button className={styles.primary} onClick={() => {
        trackOnboarding('tutorial_step', { tutorial_id: TUTORIAL_ID, step: 'practice_started' });
        setStage('practice');
      }}>Try an easy practice match</button>
      <p className={styles.note}>You go first. No timer. Take your time.</p>
    </section>
  </main>;
}
