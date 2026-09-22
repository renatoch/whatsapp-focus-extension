const test = require('node:test');
const assert = require('node:assert/strict');
const { createCapturePointerProbe, createCaptureRecorder } = require('../focused-recents.js');
function setup() {
  let now = 0;
  const callbacks = [];
  const probe = createCapturePointerProbe({ now: () => now,
    scheduler: { setTimeout: (fn, delay) => { assert.equal(delay, 5000); callbacks.push(fn); return callbacks.length; }, clearTimeout() {} } });
  return { probe, callbacks, advance: (ms) => { now += ms; } };
}
test('compares pointer-down and click identity/title without exporting them', () => {
  const h = setup(), row = {};
  h.probe.down(row, 'Private title', 'frameChildTitle');
  h.advance(25);
  const evidence = h.probe.up(row, 'Different title');
  assert.equal(evidence.pointerSameRow, true);
  assert.equal(evidence.pointerTitleMatchesClick, false);
  assert.equal(evidence.pointerSource, 'frameChildTitle');
  assert.equal(evidence.pointerElapsedMs, 25);
  assert.equal(JSON.stringify(evidence).includes('title'), false);
  assert.equal(h.probe.up(row, 'Different title').pointerObserved, false);
});
test('replaced rows, missing titles and expired observations are distinct', () => {
  const h = setup();
  h.probe.down({}, 'Example', 'frameTitle');
  assert.equal(h.probe.up({}, 'Example').pointerSameRow, false);
  h.probe.down({}, '', 'unknownSource');
  assert.equal(h.probe.up({}, '').pointerTitleAvailable, false);
  h.probe.down({}, 'Example', 'frameTitle');
  h.advance(5001);
  assert.equal(h.probe.up({}, 'Example').pointerObserved, false);
  h.probe.down({}, 'Example', 'frameTitle');
  h.callbacks.at(-1)();
  assert.equal(h.probe.up({}, 'Example').pointerObserved, false);
});
test('late expiry cannot clear a newer observation; clear releases pending data', () => {
  const h = setup(), row = {};
  h.probe.down({}, 'Old', 'frameTitle'); const oldExpiry = h.callbacks.at(-1);
  h.probe.down(row, 'New', 'frameTitle'); oldExpiry();
  assert.equal(h.probe.up(row, 'New').pointerTitleMatchesClick, true);
  h.probe.down(row, 'New', 'frameTitle'); h.probe.clear();
  assert.equal(h.probe.up(row, 'New').pointerObserved, false);
});
test('recorder accepts only bounded structural pointer evidence', () => {
  const recorder = createCaptureRecorder(() => 0);
  recorder.record('checking', { attempt: 0, token: 1, pointerObserved: true, pointerSameRow: false,
    pointerSource: 'Private title', pointerElapsedMs: 999999999, title: 'Private title' });
  const entry = recorder.snapshot().lastCapture[0];
  assert.equal(entry.pointerObserved, true);
  assert.equal(entry.pointerSameRow, false);
  assert.equal(entry.pointerElapsedMs, 1000000);
  assert.equal('pointerSource' in entry, false);
  assert.equal(JSON.stringify(entry).includes('Private'), false);
});
