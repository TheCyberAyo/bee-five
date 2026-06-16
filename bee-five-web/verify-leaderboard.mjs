/**
 * Quick check: mg_profiles leaderboard visibility as anon vs signed-in.
 * Usage: node verify-leaderboard.mjs [username] [password]
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

function internalEmailFromUsername(username) {
  return `${username.trim().toLowerCase()}@beefive.app`;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

async function fetchRankedRpc(label, schoolId) {
  const { data, error } = await supabase.rpc('mg_fetch_leaderboards', {
    p_school_id: schoolId ?? null,
  });
  console.log(`\n[${label}] mg_fetch_leaderboards RPC:`);
  if (error) {
    console.log('  error:', error.message, error.code ?? '');
    return;
  }
  const global = data?.global ?? [];
  const institutional = data?.institutional ?? [];
  console.log('  global count:', global.length);
  console.log('  institutional count:', institutional.length);
  for (const row of global.slice(0, 5)) {
    console.log(`  - ${row.username} elo=${row.elo}`);
  }
}

async function fetchRanked(label) {
  const { data, error } = await supabase
    .from('mg_profiles')
    .select('id, username, elo, school_id')
    .not('school_id', 'is', null)
    .order('elo', { ascending: false })
    .limit(5);
  console.log(`\n[${label}] ranked profiles (school_id not null), top 5:`);
  if (error) {
    console.log('  error:', error.message, error.code ?? '');
    return;
  }
  console.log('  count:', data?.length ?? 0);
  for (const row of data ?? []) {
    console.log(`  - ${row.username} elo=${row.elo} school=${row.school_id}`);
  }
}

async function main() {
  const [username, password] = process.argv.slice(2);

  await fetchRanked('anon');

  if (!username || !password) {
    console.log('\nPass username + password to test authenticated leaderboard reads.');
    return;
  }

  const email = internalEmailFromUsername(username);
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error('\nSign-in failed:', signInError.message);
    process.exit(1);
  }

  const { data: { session } } = await supabase.auth.getSession();
  console.log('\nSigned in as:', session?.user?.id);

  const { data: own } = await supabase
    .from('mg_profiles')
    .select('id, username, elo, school_id')
    .eq('id', session.user.id)
    .limit(1);
  console.log('Own profile:', own?.[0] ?? 'none');

  await fetchRanked('authenticated');

  if (own?.[0]?.school_id) {
    const sid = own[0].school_id;
    await fetchRankedRpc('authenticated RPC', sid);
    const { data: inst, error: instErr } = await supabase
      .from('mg_profiles')
      .select('id, username, elo')
      .eq('school_id', sid)
      .order('elo', { ascending: false })
      .limit(5);
    console.log(`\n[authenticated] institutional (${sid}), top 5:`);
    if (instErr) console.log('  error:', instErr.message);
    else console.log('  count:', inst?.length ?? 0, inst?.map((r) => r.username).join(', ') || '');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
