import { Buffer } from 'node:buffer';
import { createPublicKey, verify } from 'node:crypto';

export type AdKeys = { keyId: number; pem: string }[];
export type VerifiedAd = { claim: string; user: string; transaction: string; unit: string; earnedAt: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Preserve query order. Verify the original bytes first; also accept the URI
// percent-decoded form used by Google's Tink verifier (never form/re-encode it).
// Google signs everything
// before &signature=, with signature and key_id at the end of the callback.
export function verifyAdMobCallback(url: string, keys: AdKeys, now = Date.now()): VerifiedAd | null {
  const raw = new URL(url).search.slice(1);
  const marker = raw.indexOf('&signature=');
  if (marker < 1) throw new Error('Missing signature');
  const signed = raw.slice(0, marker);
  const tail = raw.slice(marker + 1);
  if (!/^signature=[A-Za-z0-9_%=-]+&key_id=\d+$/.test(tail)) throw new Error('Invalid signature fields');
  const params = new URLSearchParams(raw);
  for (const name of params.keys()) if (params.getAll(name).length !== 1) throw new Error('Duplicate parameter');
  const key = keys.find(k => String(k.keyId) === params.get('key_id'));
  if (!key) throw new Error('Invalid signature');
  const publicKey = createPublicKey(key.pem);
  const signature = Buffer.from(params.get('signature')!, 'base64url');
  const decoded = decodeURIComponent(signed);
  if (!verify('sha256', Buffer.from(signed), publicKey, signature)
      && (decoded === signed || !verify('sha256', Buffer.from(decoded), publicKey, signature))) {
    throw new Error('Invalid signature');
  }
  const user = params.get('user_id') ?? '';
  const claim = params.get('custom_data') ?? '';
  const transaction = params.get('transaction_id') ?? '';
  const unit = (params.get('ad_unit') ?? '').split('/').pop()!;
  const timestamp = Number(params.get('timestamp'));
  if (!Number.isSafeInteger(timestamp) || timestamp > now + 300_000 || timestamp < now - 172_800_000) throw new Error('Expired receipt');
  // AdMob's console sends a signed test callback before saving the URL.
  // Acknowledge this explicit probe without creating a claim or awarding XP.
  if (user === 'beefive-ssv-verification' && claim === 'configuration-check') return null;
  if (!uuid.test(user) || !uuid.test(claim) || !/^[a-zA-Z0-9_-]{1,256}$/.test(transaction)) throw new Error('Invalid reward identity');
  if (!['2005976804', '8356435492'].includes(unit)) throw new Error('Unconfigured ad unit');
  if (!(Number(params.get('reward_amount')) > 0)) throw new Error('Invalid reward');
  return { claim, user, transaction, unit, earnedAt: new Date(timestamp).toISOString() };
}
