import type { EventParameters } from './analyticsClient';

/** A bounded hierarchy: no player IDs, URLs or arbitrary parameter values. */
export function gameAnalyticsEvent(name: string, parameters: EventParameters) {
  const allowed = new Set([
    'tutorial_begin', 'tutorial_step', 'tutorial_complete', 'tutorial_skipped',
    'adventure_rules_viewed',
  ]);
  if (!allowed.has(name)) return null;
  const parts = [name];
  if (name === 'tutorial_step' && ['first_move', 'practice_started'].includes(String(parameters.step))) {
    parts.push(String(parameters.step));
  }
  const fields = Object.fromEntries(Object.entries(parameters).filter(([key]) =>
    ['tutorial_id', 'step', 'level', 'round'].includes(key)));
  return { eventId: parts.join(':'), fields };
}
