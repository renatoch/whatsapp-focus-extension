const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../focus.css'), 'utf8');
function extract(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.notEqual(start, -1, `Missing ${name}`);
  return source.slice(start, source.indexOf('\n  function ', start + 1));
}

function harness() {
  const classes = new Set(['searching']);
  let text = '';
  const context = vm.createContext({
    ROOT_SEARCH_NAVIGATION: 'navigation', ROOT_OPENING_RECENT: 'opening',
    ROOT_SEARCH_TOO_SHORT: 'short', ROOT_SEARCH_WAITING: 'waiting',
    focusedRecents: ['Example'], fixedCollectionsState: { collections: [] },
    isSearching: () => classes.has('searching'),
    isolateEmptySearchControls: () => {},
    root: () => ({ classList: {
      contains: (value) => classes.has(value),
      toggle: (value, on) => on ? classes.add(value) : classes.delete(value),
      add: (...values) => values.forEach((value) => classes.add(value)),
      remove: (...values) => values.forEach((value) => classes.delete(value)),
    } }),
    getSearchText: () => text, findNativeSearchField: () => ({}),
    MIN_SEARCH_CHARS: 3, SEARCH_SETTLE_MS: 1000,
    pendingSearchText: '', revealedSearchText: '', searchSettleTimer: null,
    resetSearchGate: () => {}, updateSearchGateMessage: () => {},
    window: { clearTimeout() {}, setTimeout: (_callback, delay) => {
      assert.equal(delay, 1000); return 1;
    } },
  });
  vm.runInContext(extract('updateSearchNavigation') + '\n' + extract('updateSearchGateState'), context);
  return { context, classes, update(value) { text = value; vm.runInContext('updateSearchGateState();', context); } };
}

test('empty search offers known conversations, typing hides them, clearing restores them', () => {
  const h = harness();
  h.update(''); assert.ok(h.classes.has('navigation')); assert.ok(h.classes.has('short'));
  h.update('a'); assert.ok(!h.classes.has('navigation')); assert.ok(h.classes.has('short'));
  h.update('abc'); assert.ok(!h.classes.has('navigation')); assert.ok(h.classes.has('waiting'));
  h.update(''); assert.ok(h.classes.has('navigation'));
});

test('collections work without recents or an open conversation; empty state keeps search guidance', () => {
  const h = harness(); h.context.focusedRecents = [];
  h.update(''); assert.ok(!h.classes.has('navigation'));
  h.context.fixedCollectionsState = { collections: [{ name: 'Example', members: [] }] };
  h.update(''); assert.ok(h.classes.has('navigation'));
});

test('internal navigation and non-search modes never activate the empty-search choice', () => {
  const h = harness(); h.classes.add('opening');
  h.update(''); assert.ok(!h.classes.has('navigation'));
  h.classes.delete('opening'); h.classes.delete('searching');
  h.update(''); assert.ok(!h.classes.has('navigation'));
});

test('empty-search CSS reveals the shelf instead of the overlapping gate message', () => {
  assert.match(css, /html\.mwf-searching\.mwf-search-navigation \.mwf-focused-navigation-floating:not\(\[hidden\]\)/);
  assert.match(css, /html\.mwf-searching\.mwf-search-navigation #mirror-whatsapp-focus-search-gate\s*\{[^}]*display: none !important;/s);
});

test('search entry collapses collections and Enter on extension controls cannot select native results', () => {
  assert.match(extract('setSearchMode'), /expandedFixedCollectionName = ""/);
  assert.match(extract('installSearchSelectionHandler'), /isMirrorControl\(event.target\)/);
});
