import { createClient } from 'jsr:@supabase/supabase-js@2';
import { verifyAdMobCallback, type AdKeys } from './verify.ts';

let cache: { keys: AdKeys; at: number } | null = null;
async function publicKeys(keyId: string | null): Promise<AdKeys> {
  if (cache && Date.now() - cache.at < 3_600_000 && cache.keys.some(key => String(key.keyId) === keyId)) return cache.keys;
  const response = await fetch('https://www.gstatic.com/admob/reward/verifier-keys.json');
  if (!response.ok) throw new Error('Key server unavailable');
  const data = await response.json();
  if (!Array.isArray(data.keys) || !data.keys.length) throw new Error('Invalid key response');
  cache = { keys: data.keys, at: Date.now() };
  return cache.keys;
}
Deno.serve(async req => {
  if (req.method !== 'GET') return new Response('GET required', { status: 405 });
  const params = new URL(req.url).searchParams;
  if (!params.has('signature') || !params.has('key_id')) return new Response('Missing verification', { status: 400 });
  let keys: AdKeys;
  try { keys = await publicKeys(new URL(req.url).searchParams.get('key_id')); } catch { return new Response('Retry later', { status: 503 }); }
  let receipt;
  try { receipt = verifyAdMobCallback(req.url, keys); }
  catch { return new Response('Invalid verification', { status: 400 }); }
  if (receipt === null) return new Response('Verification callback accepted; no reward issued');
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await admin.rpc('confirm_xp_ad', {
    p_claim: receipt.claim, p_user: receipt.user, p_transaction: receipt.transaction,
    p_ad_unit: receipt.unit, p_earned_at: receipt.earnedAt,
  });
  // Failed writes are retriable. A receipt and its XP credit commit atomically.
  if (error) return new Response('Reward not committed', { status: 503 });
  return new Response('ok');
});
