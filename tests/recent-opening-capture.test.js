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
  const classes = new Set(['mwf-normal']);
  let activeTitle = 'Previous';
  const context = vm.createContext({
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
    readActiveConversationTitle: () => activeTitle,
    addFocusedRecent: (title) => added.push(title),
    recordAwareness: (...args) => events.push(args),
    enterFocusedConversationSoon: () => { throw Error('Full mode must remain full'); },
  });
  vm.runInContext(functionSource('captureFocusedConversation') + '\n' + functionSource('installSearchSelectionHandler') + '\ninstallSearchSelectionHandler();', context);
  return { context, listeners, timers, added, events, classes, setTitle: (title) => { activeTitle = title; },
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
    vm.runInContext(functionSource('focusedConversationOpened') + `\nfocusedConversationOpened("Selected", "${source}");`, context);
    assert.deepEqual(added, ['Selected']);
  }
});
