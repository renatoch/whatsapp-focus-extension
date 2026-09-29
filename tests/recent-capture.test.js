const test = require('node:test');
const assert = require('node:assert/strict');
const { createRecentCapture } = require('../scripts/recent-capture.js');
const { normalizeTitle } = require('../focused-recents.js');
function harness() {
  const pending = new Map(), queued = [], added = [];
  let title = '', reads = 0, id = 0;
  const controller = createRecentCapture({
    readTitle: () => { reads++; return title; }, normalizeTitle,
    onCaptured: (...args) => added.push(args),
    scheduler: { setTimeout(fn, delay) { assert.equal(delay, 300); pending.set(++id, fn); queued.push(fn); return id; }, clearTimeout(id) { pending.delete(id); } },
  });
  return { controller, pending, queued, added, setTitle: value => { title = value; }, reads: () => reads,
    flush() { let budget = 20; while (pending.size && budget--) { const [id, fn] = pending.entries().next().value; pending.delete(id); fn(); } assert.ok(budget > 0); } };
}
test('capture confirms the exact case-sensitive title and preserves route', () => {
  const h = harness(); h.setTitle('OTHER'); h.controller.capture('Other', null);
  assert.deepEqual(h.added, []); h.setTitle('Other'); h.flush();
  assert.deepEqual(h.added, [['Other', null]]);
  h.controller.capture('Other'); assert.deepEqual(h.added[1], ['Other', 'search']);
});
test('capture stops after the initial inspection plus five retries', () => {
  const h = harness(); h.controller.capture('Missing'); h.flush();
  assert.equal(h.reads(), 6); assert.deepEqual(h.added, []);
});
test('supersession and cancellation clear timers and invalidate queued callbacks', () => {
  const h = harness(); h.controller.capture('First'); const stale = h.queued[0];
  h.controller.capture('Second'); h.setTitle('First'); stale();
  assert.deepEqual(h.added, []); h.controller.cancel();
  assert.equal(h.pending.size, 0); h.setTitle('Second'); h.queued.forEach(fn => fn());
  assert.deepEqual(h.added, []);
});
test('dispose rejects capture until restart, including stale callbacks', () => {
  const h = harness(); h.controller.capture('One'); h.controller.dispose();
  h.setTitle('One'); h.queued.forEach(fn => fn()); h.controller.capture('One');
  assert.deepEqual(h.added, []); h.controller.start(); h.controller.capture('One');
  assert.deepEqual(h.added, [['One', 'search']]);
});
test('passive title changes do nothing; no expected title accepts a nonempty header', () => {
  const h = harness(); h.setTitle('One'); h.flush(); assert.deepEqual(h.added, []);
  h.controller.capture(); assert.deepEqual(h.added, [['One', 'search']]);
});
