import { supabase } from '../lib/supabase';

// The server assigns amounts; clients never upload a replacement balance.
export const XP_AMOUNTS = {
  adventure_win: 1, adventure_milestone: 3, adventure_loss: -1,
  classic_three_wins: 2, hard_practice_win: 1,
  adventure_failure: 0, adventure_reset: 0,
} as const;
export type XpReason = keyof typeof XP_AMOUNTS;
type Event = { id: string; reason: XpReason; order?: number };
type Ledger = { balance: number; losses: number; pending: Event[] };
const key = (userId: string | null) => `xp_ledger_v1:${userId ?? 'guest'}`;
const queues = new Map<string, Promise<void>>();
function storage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}
function notifyChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent?.(new Event('bee-xp-changed'));
}
let eventSequence = 0;
function read(userId: string | null): Ledger {
  const store = storage();
  const raw = store?.getItem(key(userId));
  const suffix = userId ? `:${userId}` : '';
  const saved = raw ? JSON.parse(raw) : {
    balance: Math.max(0, Number(store?.getItem(`user_xp${suffix}`) ?? 10)),
    losses: Math.max(0, Number(store?.getItem(`adventure_consecutive_losses${suffix}`) ?? 0)),
  };
  const pending: Event[] = [];
  const acknowledged = new Set<string>(saved.acknowledged ?? []);
  if (store) {
    for (let i = 0; i < store.length; i++) {
      const eventKey = store.key(i);
      if (!eventKey?.startsWith(`${key(userId)}:event:`)) continue;
      const event = JSON.parse(store.getItem(eventKey)!) as Event;
      if (!acknowledged.has(event.id) && Object.hasOwn(XP_AMOUNTS, event.reason)) pending.push(event);
    }
  }
  pending.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  return { balance: saved.balance, losses: saved.losses, pending };
}
function projected(ledger: Ledger): { xp: number; losses: number } {
  let xp = ledger.balance, losses = ledger.losses;
  for (const event of ledger.pending) {
    xp = Math.max(0, xp + XP_AMOUNTS[event.reason]);
    if (event.reason === 'adventure_reset') losses = 0;
    if (event.reason === 'adventure_failure') losses++;
  }
  return { xp, losses };
}
function write(userId: string | null, ledger: Ledger, acknowledged: string[] = []): void {
  const store = storage();
  if (!store) return;
  // Store acknowledgements with the base atomically. A crash before cleanup
  // cannot cause acknowledged events to be projected twice on restart.
  const previous = JSON.parse(store.getItem(key(userId)) ?? '{}');
  for (const id of previous.acknowledged ?? []) store.removeItem(`${key(userId)}:event:${id}`);
  store.setItem(key(userId), JSON.stringify({ balance: ledger.balance, losses: ledger.losses, acknowledged }));
  for (const id of acknowledged) store.removeItem(`${key(userId)}:event:${id}`);
  const suffix = userId ? `:${userId}` : '';
  const state = projected(ledger);
  store.setItem(`user_xp${suffix}`, String(state.xp));
  store.setItem(`adventure_consecutive_losses${suffix}`, String(state.losses));
  notifyChanged();
}
export function readXpLedger(userId: string | null): { xp: number; losses: number } {
  return projected(read(userId));
}
export function recordXpEvent(userId: string | null, reason: XpReason): number {
  if (!Object.hasOwn(XP_AMOUNTS, reason)) throw new Error('This XP source requires server confirmation');
  const ledger = read(userId);
  const event = { id: crypto.randomUUID(), reason, order: Date.now() * 1000 + eventSequence++ % 1000 };
  ledger.pending.push(event);
  if (userId) {
    // Separate keys prevent two browser tabs from overwriting each other's events.
    storage()?.setItem(`${key(userId)}:event:${event.id}`, JSON.stringify(event));
    notifyChanged();
  } else {
    const state = projected(ledger);
    write(userId, { balance: state.xp, losses: state.losses, pending: [] });
  }
  return projected(ledger).xp;
}

export async function syncXpLedger(userId: string): Promise<void> {
  const run = async () => {
    if (!supabase) return;
    // Batch bounds match the RPC. Acknowledged IDs are removed only after success.
    do {
      const batch = read(userId).pending.slice(0, 100);
      const { data, error } = await supabase.rpc('apply_xp_events', { owner_id: userId, events: batch.map(({ id, reason }) => ({ id, reason })) });
      if (error) throw error;
      if (!data || !Number.isInteger(data.user_xp) || !Number.isInteger(data.adventure_consecutive_losses)) {
        throw new Error('Invalid XP ledger response');
      }
      const acknowledged = new Set(batch.map(event => event.id));
      const current = read(userId); // Includes events earned while the request was running.
      write(userId, {
        balance: data.user_xp, losses: data.adventure_consecutive_losses,
        pending: current.pending.filter(event => !acknowledged.has(event.id)),
      }, [...acknowledged]);
    } while (read(userId).pending.length > 0);
  };
  // Web Locks serialize tabs too; event IDs also make concurrent retries harmless.
  const previous = queues.get(userId) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(async () => {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      await navigator.locks.request(`bee-xp-sync:${userId}`, run);
    } else await run();
  });
  queues.set(userId, next);
  try { await next; } finally { if (queues.get(userId) === next) queues.delete(userId); }
}
