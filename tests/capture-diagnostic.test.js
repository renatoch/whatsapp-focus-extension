const test = require('node:test');
const assert = require('node:assert/strict');
const { createCaptureRecorder } = require('../focused-recents.js');
test('capture recorder keeps bounded structural evidence and last terminal result', () => {
  let now = 100;
  const recorder = createCaptureRecorder(() => now);
  recorder.record('checking', { attempt: 0, token: 1, title: 'Private', expectedTitleAvailable: true });
  now += 300;
  recorder.record('success', { token: 1, headerMatched: true, recentCount: 1, dom: 'Private' });
  for (let i = 0; i < 60; i++) recorder.record('input', { event: 'enter', zone: 'main', recognized: false });
  const snapshot = recorder.snapshot();
  assert.equal(snapshot.events.length, 32);
  assert.equal(snapshot.lastOutcome.stage, 'success');
  assert.equal(snapshot.lastOutcome.elapsedMs, 300);
  assert.equal(JSON.stringify(snapshot).includes('Private'), false);
  snapshot.events[0].zone = 'changed';
  assert.equal(recorder.snapshot().events[0].zone, 'main');
});
test('unknown fields and enums are rejected, counts bounded, timeout and cancellation retained', () => {
  const recorder = createCaptureRecorder(() => 0);
  recorder.record('private-stage', {});
  assert.equal(recorder.snapshot().events.length, 0);
  recorder.record('checking', { token: 2, attempt: 0 });
  recorder.record('timeout', { token: 2, attempt: 1e9, mode: 'private', zone: 'private', event: 'private' });
  assert.equal(recorder.snapshot().lastOutcome.attempt, 1000000);
  assert.equal('mode' in recorder.snapshot().lastOutcome, false);
  recorder.record('cancelled', { token: 1 });
  assert.equal(recorder.snapshot().lastOutcome.stage, 'cancelled');
});
