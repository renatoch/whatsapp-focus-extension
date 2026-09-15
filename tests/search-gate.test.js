const test = require('node:test');
const assert = require('node:assert/strict');
const { createSearchGate } = require('../scripts/search-gate.js');
function setup() {
  let text = '', active = true, tick;
  const states = [], scheduled = [];
  const gate = createSearchGate({ minimum: 3, delayMs: 1000,
    readText: () => text, isSearching: () => active,
    onState: (state) => states.push(state),
    scheduler: { setTimeout: (callback, ms) => { scheduled.push(ms); tick = callback; return 1; }, clearTimeout() {} },
  });
  return { gate, states, scheduled, set: (value) => { text = value; gate.update(); },
    tick: () => tick(), deactivate: () => { active = false; }, latest: () => states.at(-1) };
}
test('short queries are hidden and initial reveal waits one second', () => {
  const h = setup();
  h.set('ab'); assert.equal(h.latest().tooShort, true); assert.equal(h.latest().waiting, false);
  h.set('abc'); assert.equal(h.latest().waiting, true); assert.deepEqual(h.scheduled, [1000]);
  h.tick(); assert.equal(h.latest().tooShort, false); assert.equal(h.latest().waiting, false);
});
test('unchanged queries do not restart settling and refinements remain visible once revealed', () => {
  const h = setup(); h.set('abc'); h.set('abc'); assert.equal(h.scheduled.length, 1);
  h.tick(); h.set('abcd'); assert.equal(h.scheduled.length, 1); assert.equal(h.latest().tooShort, false);
  h.set(''); assert.equal(h.latest().tooShort, true);
  h.set('abc'); assert.equal(h.scheduled.length, 2);
});
test('leaving search and disposal prevent queued callbacks from revealing results', () => {
  const h = setup(); h.set('abc'); h.deactivate(); h.tick();
  assert.equal(h.latest().searching, false);
  const disposed = setup(); disposed.set('abc'); const count = disposed.states.length;
  disposed.gate.dispose(); disposed.tick(); assert.equal(disposed.states.length, count);
  disposed.gate.start(); disposed.set('abc'); assert.equal(disposed.latest().waiting, true);
});
test('a reset invalidates pending settlement even when the scheduler cannot cancel it', () => {
  const h = setup(); h.set('abc'); const count = h.states.length;
  h.gate.reset(); h.tick(); assert.equal(h.states.length, count);
});
