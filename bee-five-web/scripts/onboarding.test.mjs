import assert from 'node:assert/strict';
import { adventureRuleTips } from '../src/utils/adventureRuleTips.ts';
import { FIRST_PLAY_KEY, firstPlayHandled, rememberFirstPlay, trackOnboarding } from '../src/utils/onboarding.ts';

const ids = (level, round) => adventureRuleTips(level, round).map(tip => tip.id);
assert.deepEqual(ids(1, 1), ['timer_12', 'ai_starts']);
assert.ok(ids(5, 1).includes('blocked_cells'));
assert.ok(ids(17, 1).includes('piece_capacity'));
assert.ok(ids(42, 1).includes('blind_play'));
assert.ok(ids(50, 1).includes('strategic_blocks'));
assert.ok(!ids(50, 1).includes('rearrangement'));
assert.ok(ids(50, 2).includes('blind_play'));
assert.ok(!ids(50, 2).includes('blocked_cells'));
assert.ok(ids(50, 3).includes('rearrangement'));
assert.ok(ids(50, 4).includes('piece_swapping'));
assert.ok(ids(210, 1).includes('temporary_blind'));
assert.ok(!ids(210, 2).includes('temporary_blind'));
for (let level = 1; level <= 2000; level++) {
  for (let round = 1; round <= (level % 50 === 0 ? 5 : level % 10 === 0 ? 3 : 1); round++) {
    const tips = adventureRuleTips(level, round);
    assert.equal(new Set(tips.map(tip => tip.id)).size, tips.length);
    assert.ok(tips.every(tip => tip.title && tip.body));
  }
}

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};
assert.equal(firstPlayHandled(), false);
rememberFirstPlay();
assert.equal(values.get(FIRST_PLAY_KEY), 'true');
assert.equal(firstPlayHandled(), true);
globalThis.localStorage = { getItem() { throw Error('storage blocked'); }, setItem() { throw Error('storage blocked'); } };
assert.equal(firstPlayHandled(), false);
assert.doesNotThrow(rememberFirstPlay);
const events = [];
globalThis.window = { dispatchEvent: event => events.push(event.detail) };
trackOnboarding('tutorial_begin', { tutorial_id: 'first_practice_v1' });
assert.equal(events[0].name, 'tutorial_begin');
window.dispatchEvent = () => { throw Error('local observer unavailable'); };
assert.doesNotThrow(() => trackOnboarding('tutorial_complete'));
console.log('Onboarding checks passed: round-specific tips across 2,000 levels, persistence, blocked storage and telemetry failure.');
