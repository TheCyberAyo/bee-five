// Usage: node xp_ledger.test.cjs /path/to/node_modules/@electric-sql/pglite
// Isolated PostgreSQL; never connects to a Supabase project.
const { PGlite } = require(process.argv[2] || '@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const assert = require('node:assert/strict');
const db = new PGlite();
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const apply = async (events, user = owner) => (await db.query(
  'select public.apply_xp_events($1::uuid, $2::jsonb) as result', [user, JSON.stringify(events)]
)).rows[0].result;
(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    INSERT INTO auth.users VALUES ('${owner}'), ('${other}');`);
  const migration = name => readFileSync(resolve(__dirname, '../migrations', name), 'utf8');
  await db.exec(migration('20260615000000_adventure_progress_core.sql'));
  await db.exec('GRANT ALL ON public.adventure_progress TO authenticated, anon;');
  await db.exec(`INSERT INTO public.adventure_progress(user_id, user_xp) VALUES ('${owner}', 50);`);
  await db.exec(migration('20260930000000_atomic_xp_ledger.sql'));
  await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub = '${owner}';`);
  assert.equal((await apply([])).user_xp, 50, 'Migration preserves existing XP');
  const event = { id: id(1), reason: 'adventure_win' };
  assert.equal((await apply([event])).user_xp, 51);
  assert.equal((await apply([event])).user_xp, 51, 'Retries are idempotent');
  await assert.rejects(apply([{ ...event, reason: 'rewarded_ad' }]));
  await assert.rejects(apply([], other), /account mismatch/);
  await assert.rejects(apply([{ id: id(2), reason: 'invented' }]));
  await assert.rejects(apply([{ id: id(2), reason: 'adventure_win', delta: 1000 }]));
  await assert.rejects(db.query('update public.adventure_progress set user_xp = 9999 where user_id = $1', [owner]), /permission denied/);
  await assert.rejects(db.query('insert into public.adventure_progress(user_id, user_xp) values ($1,9999)', [other]), /permission denied/);
  await assert.rejects(db.query('delete from public.adventure_progress where user_id = $1', [owner]), /permission denied/);
  await assert.rejects(db.query('update public.adventure_progress set adventure_consecutive_losses = 99 where user_id = $1', [owner]), /permission denied/);
  // Normal metadata upserts continue to work with column-level grants.
  await db.query(`insert into public.adventure_progress(user_id, current_game, highest_unlocked_game)
    values ($1, 2, 2) on conflict(user_id) do update set current_game=excluded.current_game,
    highest_unlocked_game=excluded.highest_unlocked_game`, [owner]);
  assert.equal((await apply([])).user_xp, 51);
  await apply(Array.from({ length: 4 }, (_, i) => ({ id: id(i + 10), reason: 'adventure_failure' })));
  assert.equal((await apply([])).adventure_consecutive_losses, 4);
  assert.equal((await apply([{ id: id(15), reason: 'adventure_reset' }])).adventure_consecutive_losses, 0);
  assert.equal((await apply([{ id: id(10), reason: 'adventure_failure' }])).adventure_consecutive_losses, 0,
    'Retrying old failure cannot resurrect it after reset');
  await apply(Array.from({ length: 60 }, (_, i) => ({ id: id(i + 100), reason: 'adventure_loss' })));
  assert.equal((await apply([])).user_xp, 0);
  assert.equal((await apply([{ id: id(200), reason: 'adventure_win' }])).user_xp, 1);
  // A batch is all-or-nothing, including an invalid event after a valid one.
  await assert.rejects(apply([{ id: id(300), reason: 'rewarded_ad' }, { id: id(301), reason: 'bad' }]));
  assert.equal((await apply([])).user_xp, 1);
  await db.exec(`SET request.jwt.claim.sub = '${other}';`);
  assert.equal((await apply([], other)).user_xp, 10, 'A new account gets the default exactly once');
  await db.exec('RESET ROLE; SET ROLE anon;');
  await assert.rejects(apply([]), /permission denied/);
  console.log('PASS XP SQL: grants, ownership, fixed amounts, defaults, idempotency, rollback, deductions, resets');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.close());
