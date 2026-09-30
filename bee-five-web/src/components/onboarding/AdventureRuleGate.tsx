'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { adventureRuleTips } from '../../utils/adventureRuleTips';
import { trackOnboarding } from '../../utils/onboarding';
import styles from './onboarding.module.css';

export default function AdventureRuleGate({ level, round, seen, onContinue, onExit, children }: {
  level: number; round: number; seen: ReadonlySet<string>;
  onContinue: (ids: string[]) => void; onExit: () => void; children: ReactNode;
}) {
  const tips = adventureRuleTips(level, round).filter(tip => !seen.has(tip.id));
  const title = useRef<HTMLHeadingElement>(null);
  const reported = useRef(false);
  const hasTips = tips.length > 0;
  useEffect(() => {
    if (hasTips && !reported.current) {
      reported.current = true;
      title.current?.focus();
      trackOnboarding('adventure_rules_viewed', { level, round });
    }
  }, [hasTips, level, round]);

  if (!hasTips) return children;
  return <main className={styles.screen} aria-labelledby="adventure-rules-title">
    <header className={styles.header}><button className={styles.secondary} onClick={onExit}>Back to menu</button><span>Level {level} · Round {round}</span></header>
    <section className={styles.content}>
      <h1 id="adventure-rules-title" ref={title} tabIndex={-1} className={styles.title}>Before you play</h1>
      <p className={styles.copy}>Still connect five to win. Here’s what to watch for in this round.</p>
      <ul className={styles.rules}>{tips.map(tip => <li key={tip.id}><h2>{tip.title}</h2><p>{tip.body}</p></li>)}</ul>
      <button className={styles.primary} onClick={() => onContinue(tips.map(tip => tip.id))}>Got it — continue</button>
      <p className={styles.note}>The timer starts when the round begins.</p>
    </section>
  </main>;
}
