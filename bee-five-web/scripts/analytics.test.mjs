import assert from 'node:assert/strict';
import { createAnalyticsClient } from '../src/utils/analyticsClient.ts';
import { gameAnalyticsEvent } from '../src/utils/gameAnalyticsEvents.ts';

assert.equal(gameAnalyticsEvent('tutorial_step', { step: 'first_move' }).eventId, 'tutorial_step:first_move');
assert.equal(gameAnalyticsEvent('tutorial_step', { step: 'practice_started' }).eventId, 'tutorial_step:practice_started');
assert.deepEqual(gameAnalyticsEvent('tutorial_begin', { tutorial_id: 'first_practice_v1', email: 'private', attempt_id: 'private' }).fields,
  { tutorial_id: 'first_practice_v1' });
assert.equal(gameAnalyticsEvent('arbitrary-event', {}), null);

let resolveTransport;
let loads = 0;
const events = [];
const client = createAnalyticsClient(() => {
  loads++;
  return new Promise(resolve => { resolveTransport = resolve; });
});
const begin = client.track('tutorial_begin', { tutorial_id: 'first_practice_v1' });
const step = client.track('tutorial_step', { step: 'first_move' });
await Promise.resolve();
assert.equal(loads, 1);
assert.deepEqual(events, []);
resolveTransport((name, parameters) => events.push({ name, parameters }));
await Promise.all([begin, step, client.initialize(), client.initialize()]);
assert.deepEqual(events.map(event => event.name), ['tutorial_begin', 'tutorial_step']);
assert.equal(events[1].parameters.step, 'first_move');
assert.equal(loads, 1);
await client.track('tutorial_complete');
assert.equal(events.length, 3);

const unavailable = createAnalyticsClient(async () => { throw Error('blocked'); });
await assert.doesNotReject(unavailable.track('tutorial_begin'));
const unsupported = createAnalyticsClient(async () => null);
await assert.doesNotReject(unsupported.track('tutorial_begin'));
const broken = createAnalyticsClient(async () => () => { throw Error('network unavailable'); });
await assert.doesNotReject(broken.track('tutorial_complete'));
console.log('Analytics checks passed: early events, shared initialization, ordered delivery and safe failures.');
