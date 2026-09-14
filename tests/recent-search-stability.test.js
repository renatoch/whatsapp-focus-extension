const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const api = require('../focused-recents.js');
const source = fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8');
const start = source.indexOf('  function resolveFocusedRecentSearch(');
const implementation = source.slice(start, source.indexOf('\n  function ', start + 1));

function run(counts, { accepted = true, cancel = false, changingTargets = false } = {}) {
  const timers = [], clicks = [], failures = [];
  const target = {};
  let sample = 0, confirmed = 0;
  let diagnostic = api.createNavigationDiagnostic();
  const context = vm.createContext({
    recentNavigationToken: 1, RECENT_NAVIGATION_RETRIES: 10,
    RECENT_SEARCH_RETRY_MS: 150, RECENT_CONFIRM_RETRY_MS: 150,
    MirrorFocusedRecents: api,
    focusedSearchCandidates: () => {
      const count = counts[Math.min(sample++, counts.length - 1)];
      return { rowCount: count, candidates: Array.from({ length: count }, (_, index) => ({ title: 'Example', clickTarget: index === 0 && !changingTargets ? target : {} })) };
    },
    findNativeSearchField: () => ({}), getSearchText: () => accepted ? 'Example' : 'Previous',
    updateRecentNavigationDiagnostic: (patch) => { diagnostic = api.updateNavigationDiagnostic(diagnostic, patch); },
    activateFocusedResult: (element) => clicks.push(element),
    failFocusedRecentNavigation: (reason) => failures.push(reason),
    confirmFocusedRecentOpened: () => confirmed++,
    window: { setTimeout: (callback) => timers.push(callback) },
  });
  vm.runInContext(implementation + '\nresolveFocusedRecentSearch("Example", 1, 0);', context);
  const initialClicks = clicks.length;
  if (cancel) context.recentNavigationToken = 2;
  let budget = 30;
  while (timers.length && budget--) timers.shift()();
  assert.ok(budget > 0, 'bounded polling');
  return { clicks, initialClicks, failures, sample, confirmed, diagnostic };
}

test('waits through transient ambiguity and clicks only after two unique observations', () => {
  const result = run([2, 1, 1]);
  assert.equal(result.initialClicks, 0);
  assert.equal(result.sample, 3);
  assert.equal(result.clicks.length, 1);
  assert.equal(result.confirmed, 1);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.diagnostic.resultSamples.map((item) => item.exactMatches), [2, 1, 1]);
});
test('persistent ambiguity fails closed after the bounded sample window', () => {
  const result = run([2]);
  assert.equal(result.sample, 11);
  assert.equal(result.clicks.length, 0);
  assert.deepEqual(result.failures, ['ambiguous']);
});
test('a first unique observation cannot trigger a click if ambiguity appears next', () => {
  const result = run([1, 2]);
  assert.equal(result.initialClicks, 0);
  assert.equal(result.clicks.length, 0);
});
test('absence resets stability and a unique result at the deadline is insufficient', () => {
  const result = run([1, 0, 1, 1]);
  assert.equal(result.sample, 4);
  assert.equal(result.clicks.length, 1);
  assert.equal(run([...Array(10).fill(0), 1]).clicks.length, 0);
});
test('unaccepted search text and superseded navigation never activate a candidate', () => {
  assert.equal(run([1], { accepted: false }).clicks.length, 0);
  assert.equal(run([1], { cancel: true }).clicks.length, 0);
});
test('replaced native targets do not count as a stable unique result', () => {
  assert.equal(run([1], { changingTargets: true }).clicks.length, 0);
});

test('result samples are bounded and strip all nonstructural fields', () => {
  let diagnostic = api.createNavigationDiagnostic();
  for (let attempt = 0; attempt < 50; attempt++) {
    diagnostic = api.updateNavigationDiagnostic(diagnostic, { resultSample: {
      attempt, candidateRows: 2, candidateTitles: 2, exactMatches: 2,
      searchTextAccepted: true, title: 'Private', dom: 'Private', query: 'Private',
    } });
  }
  assert.equal(diagnostic.resultSamples.length, 12);
  assert.equal(JSON.stringify(diagnostic).includes('Private'), false);
  assert.deepEqual(Object.keys(diagnostic.resultSamples[0]).sort(), ['attempt', 'candidateRows', 'candidateTitles', 'exactMatches', 'searchTextAccepted'].sort());
});
