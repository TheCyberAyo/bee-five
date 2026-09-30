import { firebaseAnalytics } from './firebaseAnalytics';
import { gameAnalytics } from './gameAnalytics';

export const FIRST_PLAY_KEY = 'bee_five:first_play_handled:v1';
export const TUTORIAL_ID = 'first_practice_v1';

export function firstPlayHandled(): boolean {
  try { return localStorage.getItem(FIRST_PLAY_KEY) === 'true'; }
  catch { return false; }
}

export function rememberFirstPlay(): void {
  try { localStorage.setItem(FIRST_PLAY_KEY, 'true'); }
  catch { /* The current visit remains usable when storage is unavailable. */ }
}

/** Keep local diagnostics and independently deliver to both analytics services. */
export function trackOnboarding(name: string, parameters: Record<string, string | number> = {}): void {
  try {
    window.dispatchEvent(new CustomEvent('beefive:analytics', { detail: { name, parameters } }));
  } catch { /* Telemetry must never interrupt play. */ }
  void firebaseAnalytics.track(name, parameters);
  void gameAnalytics.track(name, parameters);
}
