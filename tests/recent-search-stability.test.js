const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../focused-recents.js');
const { createFocusedNavigation } = require('../scripts/focused-navigation.js');

function setup(counts, { accepted = true, changingTargets = false, headerMatches = true } = {}) {
  const timers = new Map(), clicks = [], failures = [], openings = [], samples = [];
  const target = {}; let inspection = 0, timerId = 0, lastDiagnostic;
  const scheduler = {
    setTimeout: (callback, ms) => { timers.set(++timerId, { callback, ms }); return timerId; },
    clearTimeout: (id) => timers.delete(id),
  };
  const native = {
    findNativeSearchField: () => ({}), setNativeSearchText() {}, getSearchText: () => accepted ? 'Example' : 'Previous',
    focusedSearchCandidates: () => {
      const count = counts[Math.min(inspection++, counts.length - 1)];
      samples.push(count);
      return { rowCount: count, candidates: Array.from({ length: count }, (_, index) => ({
        title: 'Example', clickTarget: index === 0 && !changingTargets ? target : {},
      })) };
    },
    activateFocusedResult: (element) => clicks.push(element),
    readActiveConversationTitle: () => headerMatches ? 'Example' : 'Previous',
  };
  const controller = createFocusedNavigation({ native, rules, scheduler, now: () => 1000,
    normalizeChats: (callback) => callback(), onBegin() {},
    onOpened: (title, source, diagnostic) => { openings.push({ title, source }); lastDiagnostic = diagnostic; },
    onFailure: (reason, source, diagnostic) => { failures.push(reason); lastDiagnostic = diagnostic; },
  });
  function tick() {
    const [id, timer] = timers.entries().next().value || [];
    if (!timer) return;
    timers.delete(id); timer.callback(); return timer.ms;
  }
  function flush() { let budget = 50; while (timers.size && budget--) tick(); assert.ok(budget > 0); }
  return { controller, native, clicks, failures, openings, samples, timers, tick, flush,
    get diagnostic() { return lastDiagnostic; } };
}
function run(counts, options) {
  const h = setup(counts, options); h.controller.open('Example'); h.flush(); return h;
}

test('waits through transient ambiguity and clicks only after two unique observations', () => {
  const h = setup([2, 1, 1]); h.controller.open('Example');
  assert.equal(h.tick(), 100); assert.equal(h.clicks.length, 0);
  assert.equal(h.tick(), 150); assert.equal(h.clicks.length, 0);
  h.flush();
  assert.equal(h.samples.length, 3); assert.equal(h.clicks.length, 1);
  assert.equal(h.openings.length, 1); assert.deepEqual(h.failures, []);
  assert.deepEqual(h.diagnostic.resultSamples.map((item) => item.exactMatches), [2, 1, 1]);
});
test('persistent ambiguity fails closed after the bounded sample window', () => {
  const h = run([2]);
  assert.equal(h.samples.length, 11); assert.equal(h.clicks.length, 0);
  assert.deepEqual(h.failures, ['ambiguous']);
});
test('a first unique observation cannot trigger a click if ambiguity appears next', () => {
  assert.equal(run([1, 2]).clicks.length, 0);
});
test('absence resets stability and a unique result at the deadline is insufficient', () => {
  const h = run([1, 0, 1, 1]);
  assert.equal(h.samples.length, 4); assert.equal(h.clicks.length, 1);
  assert.equal(run([...Array(10).fill(0), 1]).clicks.length, 0);
});
test('unaccepted search text and cancelled navigation never activate a candidate', () => {
  assert.equal(run([1], { accepted: false }).clicks.length, 0);
  const h = setup([1]); h.controller.open('Example'); h.tick(); h.controller.cancel(); h.flush();
  assert.equal(h.clicks.length, 0); assert.equal(h.timers.size, 0);
});
test('replaced native targets do not count as a stable unique result', () => {
  assert.equal(run([1], { changingTargets: true }).clicks.length, 0);
});
test('header mismatch after activation still fails closed', () => {
  const h = run([1], { headerMatches: false });
  assert.equal(h.clicks.length, 1); assert.equal(h.openings.length, 0);
  assert.deepEqual(h.failures, ['not-found']);
});
test('collection and recent routes have equivalent confirmation with distinct source callbacks', () => {
  for (const source of ['collection', 'recent']) {
    const h = setup([1]); h.controller.open('Example', source); h.flush();
    assert.deepEqual(h.openings, [{ title: 'Example', source }]);
  }
});
test('dispose invalidates even an already queued callback and start allows a fresh session', () => {
  const h = setup([1]); h.controller.open('Example');
  const pending = [...h.timers.values()][0].callback;
  h.controller.dispose(); pending();
  assert.equal(h.samples.length, 0); assert.equal(h.timers.size, 0);
  assert.equal(h.controller.open('Example'), false);
  h.controller.start(); h.controller.open('Example'); h.flush();
  assert.equal(h.openings.length, 1);
});
test('missing native field reports structural failure without activating anything', () => {
  const h = setup([1]); h.native.findNativeSearchField = () => undefined;
  h.controller.open('Example'); h.flush();
  assert.deepEqual(h.failures, ['title-unavailable']); assert.equal(h.clicks.length, 0);
});
test('result samples are bounded and strip all nonstructural fields', () => {
  let diagnostic = rules.createNavigationDiagnostic();
  for (let attempt = 0; attempt < 50; attempt++) {
    diagnostic = rules.updateNavigationDiagnostic(diagnostic, { resultSample: {
      attempt, candidateRows: 2, candidateTitles: 2, exactMatches: 2,
      searchTextAccepted: true, title: 'Private', dom: 'Private', query: 'Private',
    } });
  }
  assert.equal(diagnostic.resultSamples.length, 12);
  assert.equal(JSON.stringify(diagnostic).includes('Private'), false);
  assert.deepEqual(Object.keys(diagnostic.resultSamples[0]).sort(), ['attempt', 'candidateRows', 'candidateTitles', 'exactMatches', 'searchTextAccepted'].sort());
});
