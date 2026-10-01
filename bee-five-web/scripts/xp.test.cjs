// Runs real application modules with local storage and the network isolated.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'node_modules/typescript'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bee-xp-test-'));
for (const file of ['services/progressService', 'services/xpService', 'services/xpLedger', 'utils/classicStreak']) {
  const out = path.join(dir, file + '.js'); fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, ts.transpileModule(fs.readFileSync(path.join(root, 'src', file + '.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText);
}
fs.mkdirSync(path.join(dir, 'lib'));
fs.writeFileSync(path.join(dir, 'lib/supabase.js'), 'exports.supabase = global.__xpBackend;');
let values = new Map();
global.window = { localStorage: {
  getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)),
  removeItem: k => values.delete(k), key: i => [...values.keys()][i] ?? null,
  get length() { return values.size; },
}};
let remote, readError, pauseRpc, pauseUpload, failAfterCommit, rpcCalls, uploads;
let processed = new Set();
const amounts = { adventure_win: 1, adventure_milestone: 3, adventure_loss: -1,
  classic_three_wins: 2, hard_practice_win: 1, rewarded_ad: 2, live_win: 1,
  live_loss: -1, adventure_failure: 0, adventure_reset: 0 };
global.__xpBackend = {
  from() { return {
    select() { return this; }, eq() { return this; },
    async maybeSingle() { return readError ? { data: null, error: new Error('read failed') } : { data: structuredClone(remote), error: null }; },
    async upsert(payload, options) {
      assert.ok(!('user_xp' in payload), 'No balance replacement allowed');
      assert.ok(!('adventure_consecutive_losses' in payload), 'No stale failure counter writes');
      if (remote?.user_id === payload.user_id && options?.onConflict !== 'user_id') {
        return { error: new Error('duplicate key value violates unique constraint adventure_progress_user_id_key') };
      }
      if (pauseUpload) await pauseUpload;
      uploads++; remote = { ...remote, ...payload }; return { error: null };
    },
  }; },
  async rpc(name, args) {
    assert.equal(name, 'apply_xp_events'); assert.equal(args.owner_id, 'test'); rpcCalls++;
    if (pauseRpc) await pauseRpc;
    for (const event of args.events) {
      if (processed.has(event.id)) continue;
      processed.add(event.id);
      remote.user_xp = Math.max(0, remote.user_xp + amounts[event.reason]);
      if (event.reason === 'adventure_failure') remote.adventure_consecutive_losses++;
      if (event.reason === 'adventure_reset') remote.adventure_consecutive_losses = 0;
    }
    if (failAfterCommit) { failAfterCommit = false; return { error: new Error('reply lost') }; }
    return { data: { user_xp: remote.user_xp, adventure_consecutive_losses: remote.adventure_consecutive_losses }, error: null };
  },
};
const p = require(path.join(dir, 'services/progressService.js'));
const xp = require(path.join(dir, 'services/xpService.js'));
const ledger = require(path.join(dir, 'services/xpLedger.js'));
function reset(cloudXp = 10, localXp) {
  values = new Map(); processed = new Set(); readError = false; pauseRpc = null; pauseUpload = null;
  failAfterCommit = false; rpcCalls = 0; uploads = 0; p.setProgressSyncUserId(null);
  remote = { user_id: 'test', current_game: 1, highest_unlocked_game: 1, games_completed: [], games_won: 0,
    user_xp: cloudXp, adventure_consecutive_losses: 0 };
  if (localXp !== undefined) p.writeLocalPlayerStats('test', { userXp: localXp });
}
const test = async (name, action) => { await action(); console.log('PASS', name); };
(async () => {
  await test('clients cannot enqueue ad or competitive rewards', async () => {
    reset();
    for (const reason of ['rewarded_ad', 'live_win', 'live_loss']) {
      assert.throws(() => ledger.recordXpEvent('test', reason), /server confirmation/);
    }
  });
  await test('fresh device preserves zero XP', async () => {
    reset(0); await p.syncAdventureProgress('test'); assert.equal(p.readLocalPlayerStats('test').userXp, 0);
  });
  await test('existing account updates progress without inserting a duplicate', async () => {
    reset(193);
    remote.current_game = 25; remote.highest_unlocked_game = 25;
    const synced = await p.syncAdventureProgress('test');
    assert.equal(synced.currentGame, 25);
    assert.equal(remote.user_xp, 193);
    assert.ok(uploads > 0);
  });
  await test('stale device cannot undo a deduction', async () => {
    reset(9, 10); await p.syncAdventureProgress('test'); assert.equal(remote.user_xp, 9);
  });
  await test('failed read never uploads a stale balance', async () => {
    reset(50, 20); readError = true; await p.syncAdventureProgress('test');
    assert.equal(remote.user_xp, 50); assert.equal(uploads, 0); assert.equal(rpcCalls, 0);
  });
  await test('rewards earned during a request survive', async () => {
    reset(); let release; pauseRpc = new Promise(r => release = r);
    const flight = p.syncAdventureProgress('test'); await new Promise(r => setImmediate(r));
    ledger.recordXpEvent('test', 'adventure_win'); release(); await flight;
    assert.equal(remote.user_xp, 11); assert.equal(p.readLocalPlayerStats('test').userXp, 11);
  });
  await test('a late metadata response cannot regress displayed XP or reset a new failure', async () => {
    reset(); let release; pauseUpload = new Promise(r => release = r);
    const flight = p.syncAdventureProgress('test'); await new Promise(r => setImmediate(r));
    ledger.recordXpEvent('test', 'adventure_win');
    ledger.recordXpEvent('test', 'adventure_failure');
    release(); const result = await flight;
    assert.equal(result.userXp, 11); assert.equal(result.xpAux.adventureConsecutiveLosses, 1);
    assert.equal(ledger.readXpLedger('test').losses, 1);
  });
  await test('lost server reply and retry cannot duplicate a reward', async () => {
    reset(); ledger.recordXpEvent('test', 'classic_three_wins'); failAfterCommit = true;
    await assert.rejects(ledger.syncXpLedger('test')); await ledger.syncXpLedger('test');
    assert.equal(remote.user_xp, 12); assert.equal(ledger.readXpLedger('test').xp, 12);
  });
  await test('two offline devices contribute deltas instead of replacing balances', async () => {
    reset(); ledger.recordXpEvent('test', 'adventure_win'); const deviceA = values;
    values = new Map(); ledger.recordXpEvent('test', 'hard_practice_win'); const deviceB = values;
    await ledger.syncXpLedger('test'); values = deviceA; await ledger.syncXpLedger('test');
    values = deviceB; await ledger.syncXpLedger('test'); assert.equal(ledger.readXpLedger('test').xp, 12);
  });
  await test('failure reset remains zero across repeated syncs', async () => {
    reset(); remote.adventure_consecutive_losses = 4; await ledger.syncXpLedger('test');
    p.writeLocalXpAuxState('test', { adventureConsecutiveLosses: 0 });
    await p.syncAdventureProgress('test'); await p.syncAdventureProgress('test');
    assert.equal(p.readLocalXpAuxState('test').adventureConsecutiveLosses, 0);
    assert.equal(remote.adventure_consecutive_losses, 0);
  });
  await test('guest sign-in cannot replenish an existing account', async () => {
    reset(0, 0); p.writeLocalPlayerStats(null, { userXp: 100 });
    await p.promoteGuestProgressToUser('test'); await p.promoteGuestProgressToUser('test');
    assert.equal(p.readLocalPlayerStats('test').userXp, 0);
    assert.equal(p.readLocalPlayerStats('another').userXp, 10);
  });
  await test('losses clamp at zero and retain event ordering', async () => {
    reset(0, 0); ledger.recordXpEvent('test', 'adventure_loss'); ledger.recordXpEvent('test', 'adventure_win');
    await ledger.syncXpLedger('test'); assert.equal(remote.user_xp, 1);
  });
  await test('Classic awards wins 3 and 6; weighted score remains independent', async () => {
    reset(); const awarded = [];
    for (let win = 1; win <= 6; win++) if (xp.onClassicStreakWin(win).delta) awarded.push(win);
    assert.deepEqual(awarded, [3, 6]); assert.equal(xp.getXp(), 14);
    const source = fs.readFileSync(path.join(root, 'src/components/ClassicAIGame.tsx'), 'utf8');
    assert.match(source, /onClassicStreakWin\(currentIndex\)/);
    assert.doesNotMatch(source, /onClassicStreakWin\(newScore\)/);
  });
})().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => fs.rmSync(dir, { recursive: true, force: true }));
