const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const content = fs.readFileSync(require('node:path').join(__dirname, '../content.js'), 'utf8');

// Exercise actual content-script functions with a controlled native DOM boundary.
function functionSource(name) {
  const start = content.indexOf(`  function ${name}(`);
  assert.notEqual(start, -1);
  const end = content.indexOf('\n  function ', start + 1);
  return content.slice(start, end);
}
function harness() {
  const listeners = {};
  const timers = [];
  const added = [];
  const events = [];
  const traces = [];
  const classes = new Set(['mwf-normal']);
  let activeTitle = 'Previous';
  const context = vm.createContext({
    traceRecentCapture: (stage, details) => traces.push({ stage, ...details }),
    document: { addEventListener: (event, callback) => { listeners[event] = callback; } },
    window: { setTimeout: (callback) => timers.push(callback) },
    MirrorFocusedRecents: require('../focused-recents.js'),
    ROOT_OPENING_RECENT: 'mwf-opening-recent', ROOT_NORMAL: 'mwf-normal',
    ROOT_SIDEBAR_OPEN: 'mwf-sidebar-open', ROOT_SIDEBAR_HIDDEN: 'mwf-sidebar-hidden',
    FOCUSED_CAPTURE_RETRIES: 5, recentCaptureToken: 0,
    root: () => ({ classList: { contains: (name) => classes.has(name) } }),
    isSearching: () => classes.has('mwf-searching'),
    isMirrorControl: () => false,
    isConversationListClick: (target) => Boolean(target?.rowTitle),
    conversationRow: (target) => target?.rowTitle ? target : null,
    readConversationRowTitle: (row) => row?.rowTitle || '',
    readConversationRowTitleDetails: (row) => ({ title: row?.rowTitle || '', titleSource: 'frameTitle', selectedTextDifferent: false, containerTextRelation: 'same' }),
    readActiveConversationTitleDetails: () => ({ title: activeTitle, headerSource: 'infoTitle', headerTextDifferent: false }),
    readActiveConversationTitle: () => activeTitle,
    addFocusedRecent: (title) => added.push(title),
    recordAwareness: (...args) => events.push(args),
    enterFocusedConversationSoon: () => { throw Error('Full mode must remain full'); },
  });
  vm.runInContext(functionSource('traceRecentCaptureInput') + '\n' + functionSource('captureFocusedConversation') + '\n' + functionSource('installSearchSelectionHandler') + '\ninstallSearchSelectionHandler();', context);
  return { context, listeners, timers, added, events, traces, classes, setTitle: (title) => { activeTitle = title; },
    flush: () => { let budget = 30; while (timers.length && budget--) timers.shift()(); assert.ok(budget > 0); } };
}

test('full-mode click records only a confirmed open title and does not emit search telemetry', () => {
  const h = harness();
  h.listeners.click({ target: { rowTitle: 'Selected' } });
  assert.deepEqual(h.added, []);
  h.setTitle('Selected'); h.flush();
  assert.deepEqual(h.added, ['Selected']);
  assert.deepEqual(h.events, []);
});

test('instrumentation distinguishes missing confirmation from cancellation', () => {
  const timeout = harness();
  timeout.listeners.click({ type: 'click', target: { rowTitle: 'Selected' } });
  timeout.flush();
  assert.equal(timeout.traces.at(-1).stage, 'timeout');
  assert.equal(timeout.traces.filter((entry) => entry.stage === 'checking').length, 6);
  const checks = timeout.traces.filter((entry) => entry.stage === 'checking');
  assert.equal(checks[1].headerChanged, false);
  assert.equal(checks[1].caseFoldedMatch, false);
  assert.equal(checks[1].headerSource, 'infoTitle');
  assert.equal(checks[1].rowSource, 'frameTitle');
  assert.deepEqual(timeout.added, []);
  const cancelled = harness();
  cancelled.listeners.click({ type: 'click', target: { rowTitle: 'Selected' } });
  cancelled.context.recentCaptureToken++;
  cancelled.flush();
  assert.equal(cancelled.traces.at(-1).stage, 'cancelled');
});

test('mousedown observation and composer Enter do not themselves add recents', () => {
  const h = harness();
  h.listeners.mousedown({ type: 'mousedown', target: { rowTitle: 'Selected', closest: (selector) => selector === '#side' } });
  h.listeners.keydown({ key: 'Enter', target: { closest: (selector) => selector === '#main' } });
  assert.deepEqual(h.added, []);
  assert.equal(h.traces[0].zone, 'side');
  assert.equal(h.traces[1].zone, 'main');
  assert.equal(h.traces[1].recognized, false);
});

test('full-mode keyboard activation also records a confirmed conversation', () => {
  const h = harness();
  h.listeners.keydown({ key: 'Enter', target: { rowTitle: 'Selected' } });
  h.setTitle('Selected'); h.flush();
  assert.deepEqual(h.added, ['Selected']);
});

test('passive header changes and unrelated clicks do not populate recent conversations', () => {
  const h = harness(); h.setTitle('Incoming');
  h.listeners.click({ target: {} }); h.flush();
  assert.deepEqual(h.added, []);
});

test('a failed or superseded full-mode opening does not record stale titles', () => {
  const h = harness();
  h.listeners.click({ target: { rowTitle: 'Missing' } }); h.flush();
  assert.deepEqual(h.added, []);
  h.listeners.click({ target: { rowTitle: 'First' } });
  h.listeners.click({ target: { rowTitle: 'Second' } });
  h.setTitle('First'); h.flush();
  assert.deepEqual(h.added, []);
});

test('internal hidden navigation is not captured as a native full-mode opening', () => {
  const h = harness(); h.classes.add('mwf-opening-recent');
  h.listeners.click({ target: { rowTitle: 'Selected' } });
  h.setTitle('Selected'); h.flush();
  assert.deepEqual(h.added, []);
});

test('continue normalizes and enters the shared focused surface before capturing without search telemetry', () => {
  const h = harness();
  const transitions = [];
  Object.assign(h.context, {
    debugLog: () => {}, isWhatsAppReady: () => true,
    hasOpenConversation: () => true, findNativeSearchField: () => null,
    describeElement: () => null, isNestedListView: () => false,
    goToMainChatsThen: (_source, callback) => { transitions.push('normalize'); callback(); },
    setActive: () => { transitions.push('clear-overlay-and-pending-confirmation'); },
    setSearchFocusedConversation: () => { transitions.push('focused-surface'); },
  });
  h.setTitle('Continued');
  vm.runInContext(functionSource('continueOpenConversation') + '\ncontinueOpenConversation();', h.context);
  assert.deepEqual(transitions, ['normalize', 'clear-overlay-and-pending-confirmation', 'focused-surface']);
  assert.deepEqual(h.added, ['Continued']);
  assert.deepEqual(h.events, []);
});

test('collection and recent navigation both update recency on header confirmation', () => {
  for (const source of ['collection', 'recent']) {
    const added = [];
    const context = vm.createContext({
      recentNavigationToken: 1, recentNavigationSource: source,
      MirrorFocusedRecents: require('../focused-recents.js'),
      readActiveConversationTitle: () => 'Selected',
      updateRecentNavigationDiagnostic: () => {}, setSearchFocusedConversation: () => {},
      addFocusedRecent: (title) => added.push(title), recordAwareness: () => {},
    });
    vm.runInContext(functionSource('confirmFocusedRecentOpened') + '\nconfirmFocusedRecentOpened("Selected", 1, 0);', context);
    assert.deepEqual(added, ['Selected']);
  }
});
