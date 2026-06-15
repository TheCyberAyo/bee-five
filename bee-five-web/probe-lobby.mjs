/**
 * Diagnose lobby isolation: school assignment, leaderboard RLS, presence channel.
 * Usage: node probe-lobby.mjs [username] [password]
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

function emailFromUsername(u) {
  return `${u.trim().toLowerCase()}@beefive.app`;
}

async function main() {
  if (!url || !key) {
    console.error('Missing .env.local Supabase vars');
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    realtime: { params: { eventsPerSecond: 10 } },
  });

  const [user, pass] = process.argv.slice(2);
  if (user && pass) {
    const { error } = await supabase.auth.signInWithPassword({
      email: emailFromUsername(user),
      password: pass,
    });
    if (error) {
      console.error('Sign-in failed:', error.message);
      process.exit(1);
    }
    console.log('Signed in OK\n');
  } else {
    console.log('Running as anon (pass username + password for full trace)\n');
  }

  const { data: { session } } = await supabase.auth.getSession();
  console.log('Session:', session ? `user ${session.user.id}` : 'none');
  if (session?.access_token) {
    supabase.realtime.setAuth(session.access_token);
  }

  // Schools / default lobby
  const { data: schools, error: schoolsErr } = await supabase
    .from('mg_schools')
    .select('id, name, join_code')
    .order('join_code');
  console.log('\n--- mg_schools (visible to this client) ---');
  if (schoolsErr) console.log('error:', schoolsErr.message);
  else console.log('count:', schools?.length ?? 0, schools?.map((s) => `${s.join_code}=${s.name} (${s.id})`).join('\n  ') || '');

  const defaultLobby = schools?.find((s) => s.join_code?.toUpperCase() === '00BEE00');
  console.log('\nDefault lobby (00BEE00):', defaultLobby ? `${defaultLobby.name} id=${defaultLobby.id}` : 'NOT VISIBLE');

  // Own profile
  if (session) {
    const { data: own, error: ownErr } = await supabase
      .from('mg_profiles')
      .select('id, username, elo, school_id, country_code')
      .eq('id', session.user.id)
      .limit(1);
    console.log('\n--- own mg_profiles row ---');
    if (ownErr) console.log('error:', ownErr.message);
    else console.log(own?.[0] ?? 'none');

    const { data: global, error: globalErr } = await supabase
      .from('mg_profiles')
      .select('id, username, elo, school_id')
      .not('school_id', 'is', null)
      .order('elo', { ascending: false })
      .limit(10);
    console.log('\n--- global leaderboard (top 10, school_id not null) ---');
    if (globalErr) console.log('error:', globalErr.message, globalErr.code);
    else {
      console.log('count:', global?.length ?? 0);
      for (const r of global ?? []) console.log(`  ${r.username} elo=${r.elo} school=${r.school_id}`);
    }

    const sid = own?.[0]?.school_id;
    if (sid) {
      const { data: inst, error: instErr } = await supabase
        .from('mg_profiles')
        .select('id, username, elo')
        .eq('school_id', sid)
        .order('elo', { ascending: false })
        .limit(10);
      console.log(`\n--- institutional leaderboard (school ${sid}) ---`);
      if (instErr) console.log('error:', instErr.message);
      else {
        console.log('count:', inst?.length ?? 0);
        for (const r of inst ?? []) console.log(`  ${r.username} elo=${r.elo}`);
      }
    }
  }

  // Presence probe
  console.log('\n--- presence on lobby:universal (8s) ---');
  const others = new Map();
  const channel = supabase.channel('lobby:universal');
  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    for (const key of Object.keys(state)) {
      const entries = state[key];
      if (!Array.isArray(entries)) continue;
      for (const e of entries) {
        const p = e.presence_ref ? e : e;
        const payload = p.payload ?? p;
        const uid = payload?.user_id?.toString() ?? '';
        const un = payload?.username?.toString() ?? '';
        const inst = payload?.institution?.toString() ?? '';
        if (uid && uid !== session?.user?.id) {
          others.set(uid, { username: un, institution: inst });
        }
      }
    }
  });

  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('subscribe timeout')), 15000);
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(t);
        if (session) {
          await channel.track({
            user_id: session.user.id,
            username: 'probe',
            elo: 1200,
            xp: 1,
            institution: 'probe',
            country_code: '',
            status: 'idle',
          });
        }
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(t);
        reject(new Error(status));
      }
    });
  });

  await new Promise((r) => setTimeout(r, 8000));
  console.log('others online:', others.size);
  for (const [id, v] of others) console.log(`  ${v.username} (${id.slice(0, 8)}…) inst=${v.institution || '—'}`);

  await channel.untrack();
  await supabase.removeChannel(channel);
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
