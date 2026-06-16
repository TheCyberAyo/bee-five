/**
 * Diagnose username → auth email resolution (no password needed).
 * Usage: node diagnose-auth.mjs <username>
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const username = process.argv[2];

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_* in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

function syntheticEmail(u) {
  return `${u.trim().toLowerCase()}@beefive.app`;
}

async function main() {
  console.log('Project:', url);
  if (!username) {
    console.log('Usage: node diagnose-auth.mjs <username>');
    process.exit(1);
  }

  const normalized = username.trim().toLowerCase();
  console.log('\nUsername:', username, '→ normalized:', normalized);
  console.log('Synthetic email:', syntheticEmail(username));

  const { data: resolved, error: rpcErr } = await supabase.rpc('resolve_auth_email_for_username', {
    p_username: username,
  });
  console.log('\nRPC resolve_auth_email_for_username:');
  if (rpcErr) console.log('  ERROR:', rpcErr.message, rpcErr.code);
  else console.log('  result:', resolved ?? '(null)');

  // Try sign-in with bogus password to see auth error shape
  const emailsToTry = [...new Set([resolved, syntheticEmail(username)].filter(Boolean))];
  for (const email of emailsToTry) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: '__diagnose_wrong_password__',
    });
    console.log(`\nSign-in probe (${email}):`, error?.message ?? 'no error', '| code:', error?.code);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
