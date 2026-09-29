const test = require('node:test');
const assert = require('node:assert/strict');
const { createModeController } = require('../scripts/mode-controller.js');

const C = {
  active: 'active', normal: 'normal', searching: 'searching', searchFocused: 'focused',
  searchTooShort: 'short', searchWaiting: 'waiting', sidebarOpen: 'sidebar-open',
  sidebarHidden: 'sidebar-hidden', overlayOpen: 'overlay-open', openingRecent: 'opening-recent',
};

function schedulerHarness() {
  let now = 0, nextId = 0;
  const pending = new Map(), all = new Map();
  const scheduler = {
    setTimeout(fn, delay) { const task = { id: ++nextId, due: now + delay, fn }; pending.set(task.id, task); all.set(task.id, task); return task.id; },
    clearTimeout(id) { pending.delete(id); },
  };
  function advance(ms) {
    const target = now + ms;
    while (true) {
      const task = [...pending.values()].filter(t => t.due <= target).sort((a, b) => a.due - b.due || a.id - b.id)[0];
      if (!task) break;
      now = task.due; pending.delete(task.id); task.fn();
    }
    now = target;
  }
  return { scheduler, advance, pending, all, force: id => all.get(id)?.fn(), now: () => now };
}

function harness({ ready = true, normalizeImmediate = false, reenterOnReset = false } = {}) {
  const clock = schedulerHarness();
  const classes = new Set(['native-transient', 'recent-expanded']);
  const events = [];
  const overlay = { hidden: false };
  let isReady = ready;
  const normalizedCallbacks = [];
  const classList = {
    add: (...values) => values.forEach(v => classes.add(v)),
    remove: (...values) => values.forEach(v => classes.delete(v)),
    toggle: (value, force) => force ? classes.add(value) : classes.delete(value),
    contains: value => classes.has(value),
  };
  const mark = name => () => events.push(name);
  const surfaces = {
    getOverlay: () => overlay,
    ensureOverlay: mark('ensureOverlay'), ensureReturnButton: mark('ensureReturn'),
    ensureSidebarButton: mark('ensureSidebar'), ensureSearchAgainButton: mark('ensureSearchAgain'),
    ensureSearchGateMessage: mark('ensureSearchGate'), ensureFocusedRecentsShelf: mark('ensureShelf'),
    ensureAddCollectionButton: mark('ensureAddCollection'), ensureFixedCollectionChooser: mark('ensureChooser'),
    renderFocusedRecents: mark('renderRecents'), renderFixedCollections: mark('renderCollections'),
  };
  let controller;
  controller = createModeController({
    classes: C, getRoot: () => ({ classList }), scheduler: clock.scheduler,
    isReady: () => isReady,
    cancelFocusedNavigation: mark('cancelNavigation'), cancelRecentCapture: mark('cancelCapture'),
    closeChooser: mark('closeChooser'), cancelPendingNormalAttempt: mark('cancelAttempt'),
    clearIntentPrompt: mark('clearIntent'), clearNormalDelay: mark('clearDelay'),
    updateFocusStreak: mark('updateStreak'), resetSearchGate: () => {
      events.push('resetGate');
      if (reenterOnReset) controller.setNormal();
    },
    collapseFixedCollection: mark('collapseCollection'),
    updateSearchNavigation: value => events.push(`searchNavigation:${value}`),
    normalizeChats: callback => { events.push('normalizeChats'); normalizedCallbacks.push(callback); if (normalizeImmediate) callback(); },
    focusNativeSearch: options => events.push(['focusNativeSearch', options]),
    captureFocusedConversation: (title, route) => events.push(['capture', title, route]),
    surfaces,
  });
  return { controller, clock, classes, events, overlay, surfaces, normalizedCallbacks, setReady: value => { isReady = value; }, clear: () => { events.length = 0; } };
}

function assertPreserved(h) {
  assert.equal(h.classes.has('native-transient'), true);
  assert.equal(h.classes.has('recent-expanded'), true);
}

test('active transition preserves unrelated classes and exact operational ordering', () => {
  const h = harness(); [C.normal, C.searching, C.sidebarOpen].forEach(value => h.classes.add(value));
  h.controller.setActive({ showOverlay: true });
  assert.deepEqual(h.events, ['cancelNavigation', 'cancelCapture', 'closeChooser', 'cancelAttempt', 'clearIntent', 'clearDelay', 'updateStreak',
    'ensureOverlay', 'ensureReturn', 'ensureSidebar', 'ensureSearchAgain', 'ensureSearchGate', 'ensureShelf', 'ensureAddCollection', 'ensureChooser',
    'renderRecents', 'renderCollections']);
  assert.equal(h.classes.has(C.active), true); assert.equal(h.classes.has(C.normal), false);
  assert.equal(h.classes.has(C.overlayOpen), true); assert.equal(h.overlay.hidden, false); assertPreserved(h);
});

test('normal, sidebar, focused and hidden transitions preserve their distinct class contracts', () => {
  const h = harness();
  h.controller.setNormal();
  assert.deepEqual(h.events, ['cancelNavigation', 'closeChooser', 'clearDelay']);
  assert.equal(h.classes.has(C.normal), true); assert.equal(h.overlay.hidden, true); assertPreserved(h);

  h.clear(); h.controller.setSidebarOpen();
  assert.deepEqual(h.events, []); assert.equal(h.classes.has(C.sidebarOpen), true); assert.equal(h.classes.has(C.normal), false); assert.equal(h.overlay.hidden, true);

  h.controller.setSidebarHidden();
  assert.equal(h.classes.has(C.sidebarHidden), true); assert.equal(h.classes.has(C.sidebarOpen), false); assertPreserved(h);

  h.clear(); h.controller.setFocused();
  assert.deepEqual(h.events, ['resetGate', 'ensureOverlay', 'ensureReturn', 'ensureSidebar', 'ensureSearchAgain', 'ensureShelf', 'ensureAddCollection', 'ensureChooser', 'renderRecents', 'renderCollections']);
  assert.equal(h.classes.has(C.active), true); assert.equal(h.classes.has(C.searchFocused), true); assert.equal(h.classes.has(C.sidebarHidden), true); assert.equal(h.overlay.hidden, true);

  h.clear(); h.controller.beginHiddenNavigation();
  assert.deepEqual(h.events, ['cancelCapture', 'resetGate', 'renderRecents']);
  assert.equal(h.classes.has(C.searching), true); assert.equal(h.classes.has(C.openingRecent), true); assert.equal(h.classes.has(C.active), false); assertPreserved(h);
});

test('all immediate transitions preserve exact class sets from empty and fully populated roots', () => {
  const cases = [
    ['setActive', { showOverlay: true }, [C.active, C.overlayOpen]],
    ['setActive', { showOverlay: false }, [C.active]],
    ['setNormal', undefined, [C.normal]],
    // These retained flags are intentional legacy behavior, not a normalized mode enum.
    ['setSearchMode', undefined, [C.searching, C.searchTooShort], [C.searchWaiting]],
    ['setSidebarOpen', undefined, [C.sidebarOpen], [C.openingRecent]],
    ['setSidebarHidden', undefined, [C.sidebarHidden], [C.openingRecent]],
    ['setFocused', undefined, [C.active, C.searchFocused, C.sidebarHidden]],
    ['beginHiddenNavigation', undefined, [C.searching, C.openingRecent]],
  ];
  for (const populated of [false, true]) {
    for (const [method, argument, expected, retained = []] of cases) {
      const h = harness();
      if (populated) Object.values(C).forEach(value => h.classes.add(value));
      h.controller[method](argument);
      assert.deepEqual([...h.classes].sort(), ['native-transient', 'recent-expanded', ...expected,
        ...(populated ? retained : [])].sort(), `${method}: populated=${populated}`);
      assert.equal(h.overlay.hidden, !(method === 'setActive' && argument.showOverlay));
    }
  }
});

test('unready search falls back to active overlay and schedules no native entry', () => {
  const h = harness({ ready: false }); h.controller.setSearchMode();
  assert.equal(h.classes.has(C.active), true); assert.equal(h.classes.has(C.overlayOpen), true);
  assert.equal(h.overlay.hidden, false); assert.equal(h.clock.pending.size, 0);
  assert.equal(h.events.includes('normalizeChats'), false);
});

test('ready search waits 100ms and ignores a late normalized callback after mode exit', () => {
  const h = harness(); h.controller.setSearchMode();
  assert.deepEqual(h.events, ['cancelNavigation', 'cancelCapture', 'closeChooser', 'resetGate',
    'collapseCollection', 'ensureShelf', 'renderRecents', 'renderCollections', 'searchNavigation:']);
  assert.equal(h.classes.has(C.searching), true); assert.equal(h.classes.has(C.searchTooShort), true); assertPreserved(h);
  assert.equal(h.events.includes('normalizeChats'), false); h.clock.advance(99);
  assert.equal(h.events.includes('normalizeChats'), false); h.clock.advance(1);
  assert.equal(h.events.includes('normalizeChats'), true); assert.equal(h.events.some(Array.isArray), false);
  assert.equal(h.normalizedCallbacks.length, 1); h.controller.setActive({ showOverlay: true });
  h.normalizedCallbacks[0]();
  assert.equal(h.events.some(e => Array.isArray(e) && e[0] === 'focusNativeSearch'), false);
});

test('ready search focuses with the existing options after normalized handoff', () => {
  const h = harness({ normalizeImmediate: true }); h.controller.setSearchMode(); h.clock.advance(100);
  assert.deepEqual(h.events.find(Array.isArray), ['focusNativeSearch', { retriedFromNestedView: true, source: 'after-shared-main-chats' }]);
});

test('delayed focused entry transitions at 250ms and captures once 350ms later', () => {
  const h = harness(); h.controller.enterFocusedSoon('Selected'); h.clock.advance(249);
  assert.equal(h.events.length, 0); h.clock.advance(1);
  assert.equal(h.events[0], 'resetGate'); assert.equal(h.events.some(Array.isArray), false);
  h.clock.advance(349); assert.equal(h.events.some(Array.isArray), false); h.clock.advance(1);
  assert.deepEqual(h.events.filter(Array.isArray), [['capture', 'Selected', 'search']]);
});

test('latest focused selection wins before and after the first focused transition', () => {
  const early = harness(); early.controller.enterFocusedSoon('First'); early.clock.advance(100); early.controller.enterFocusedSoon('Second'); early.clock.advance(600);
  assert.deepEqual(early.events.filter(Array.isArray), [['capture', 'Second', 'search']]);

  const late = harness(); late.controller.enterFocusedSoon('First'); late.clock.advance(250); late.controller.enterFocusedSoon('Second'); late.clock.advance(600);
  assert.deepEqual(late.events.filter(Array.isArray), [['capture', 'Second', 'search']]);
});

test('mode changes invalidate focused entry before transition and before capture', () => {
  const before = harness(); before.controller.enterFocusedSoon('First'); before.clock.advance(249); before.controller.setNormal(); before.clock.advance(1000);
  assert.deepEqual(before.events.filter(Array.isArray), []); assert.equal(before.classes.has(C.normal), true);

  const between = harness(); between.controller.enterFocusedSoon('First'); between.clock.advance(250); between.controller.setActive({ showOverlay: true }); between.clock.advance(350);
  assert.deepEqual(between.events.filter(Array.isArray), []); assert.equal(between.classes.has(C.overlayOpen), true);
});

test('a callback that reenters another mode cannot revive the obsolete delayed transition', () => {
  const h = harness({ reenterOnReset: true }); h.controller.enterFocusedSoon('First'); h.clock.advance(1000);
  assert.equal(h.classes.has(C.normal), true);
  assert.equal(h.classes.has(C.searchFocused), false);
  assert.deepEqual(h.events.filter(Array.isArray), []);
});

test('even forcibly invoked cancelled callbacks remain inert', () => {
  const h = harness(); h.controller.enterFocusedSoon('First'); const firstId = [...h.clock.pending.keys()][0];
  h.controller.setNormal(); h.clock.force(firstId);
  assert.deepEqual(h.events.filter(Array.isArray), []); assert.equal(h.classes.has(C.normal), true);
});

test('surface reentry stops old rendering and does not schedule a stale capture', () => {
  const h = harness();
  h.surfaces.renderFocusedRecents = () => {
    h.events.push('reenterNormal'); h.controller.setNormal();
  };
  h.controller.enterFocusedSoon('Old'); h.clock.advance(600);
  assert.equal(h.classes.has(C.normal), true);
  assert.equal(h.events.includes('renderCollections'), false);
  assert.equal(h.clock.pending.size, 0);
  assert.deepEqual(h.events.filter(Array.isArray), []);
});

test('every explicit transition cancels a pending post-focus capture', () => {
  for (const method of ['setActive', 'setNormal', 'setSearchMode', 'setSidebarOpen',
    'setSidebarHidden', 'setFocused', 'beginHiddenNavigation']) {
    const h = harness(); h.controller.enterFocusedSoon('Old'); h.clock.advance(250);
    const stale = [...h.clock.pending.keys()][0];
    h.controller[method]({ showOverlay: true }); h.clock.force(stale); h.clock.advance(1000);
    assert.deepEqual(h.events.filter(e => Array.isArray(e) && e[0] === 'capture'), [], method);
  }
});

test('dispose/restart leaves normalized callbacks from the previous generation inert', () => {
  const h = harness(); h.controller.setSearchMode(); h.clock.advance(100);
  const old = h.normalizedCallbacks[0]; h.controller.dispose(); h.controller.start();
  h.controller.setSearchMode(); h.clock.advance(100); old();
  assert.equal(h.events.some(Array.isArray), false);
  h.normalizedCallbacks[1]();
  assert.equal(h.events.filter(Array.isArray).length, 1);
});

test('dispose invalidates pending work and restart permits fresh transitions', () => {
  const h = harness(); h.controller.enterFocusedSoon('Old'); const stale = [...h.clock.pending.keys()][0];
  h.controller.dispose(); h.controller.dispose(); h.clock.force(stale); h.controller.setActive({ showOverlay: true });
  assert.equal(h.events.length, 0); assert.equal(h.clock.pending.size, 0);
  h.controller.start(); h.controller.start(); assert.equal(h.clock.pending.size, 0);
  h.controller.enterFocusedSoon('Fresh'); h.clock.advance(600);
  assert.deepEqual(h.events.filter(Array.isArray), [['capture', 'Fresh', 'search']]);
});
