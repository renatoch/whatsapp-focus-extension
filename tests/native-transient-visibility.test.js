const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../focus.css'), 'utf8');
function extract(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.notEqual(start, -1);
  return source.slice(start, source.indexOf('\n  function ', start + 1));
}
const adapterPath = path.join(__dirname, '../scripts/whatsapp-dom.js');
function harness(nativeElements = []) {
  const recents = { hidden: false }, collections = { hidden: false };
  const shelf = { hidden: false, querySelector: (selector) => selector.includes('recents') ? recents : collections };
  const document = { getElementById: () => shelf, querySelectorAll: () => nativeElements };
  const classes = new Set();
  const base = { FOCUSED_RECENTS_ID: 'shelf', ROOT_NATIVE_TRANSIENT: 'mwf-native-transient-open', document,
    root: () => ({ classList: { toggle: (name, force) => force ? classes.add(name) : classes.delete(name) } }),
    isSearching: () => false };
  let context;
  if (fs.existsSync(adapterPath)) {
    for (const element of nativeElements) element.getBoundingClientRect = () => ({ width: element.visible === false ? 0 : 100, height: 100 });
    const adapter = require(adapterPath).createWhatsAppDom({ document,
      window: { getComputedStyle: (element) => ({ display: element.visible === false ? 'none' : 'block', visibility: 'visible' }) },
      isMirrorControl: (element) => element.mirror === true });
    context = vm.createContext({ ...base, hasNativeTransientSurface: adapter.hasNativeTransientSurface });
    vm.runInContext(extract('updateFocusedNavigationShelfVisibility'), context);
  } else {
    context = vm.createContext({ ...base, isVisibleElement: (element) => element.visible !== false,
      isMirrorControl: (element) => element.mirror === true });
    vm.runInContext(extract('hasNativeTransientSurface') + '\n' + extract('updateFocusedNavigationShelfVisibility'), context);
  }
  return { context, shelf, recents, collections, classes };
}
test('visible native dialogs and media viewers temporarily hide the focused shelf', () => {
  for (const kind of ['dialog', 'media']) {
    const h = harness([{ visible: true, kind }]);
    h.context.updateFocusedNavigationShelfVisibility();
    assert.equal(h.shelf.hidden, true);
    assert.equal(h.classes.has('mwf-native-transient-open'), true);
  }
});
test('closing the native surface restores shelf visibility without changing its contents', () => {
  const nativeElements = [{ visible: true }];
  const h = harness(nativeElements);
  h.context.updateFocusedNavigationShelfVisibility();
  nativeElements[0].visible = false;
  h.context.updateFocusedNavigationShelfVisibility();
  assert.equal(h.shelf.hidden, false);
  assert.equal(h.classes.has('mwf-native-transient-open'), false);
  assert.equal(h.recents.hidden, false);
  assert.equal(h.collections.hidden, false);
});
test('hidden or extension-owned modal-like elements do not suspend navigation', () => {
  for (const element of [{ visible: false }, { visible: true, mirror: true }]) {
    const h = harness([element]);
    h.context.updateFocusedNavigationShelfVisibility();
    assert.equal(h.shelf.hidden, false);
  }
});
test('the transient root state hides focused actions and an open collection chooser', () => {
  for (const id of ['mirror-whatsapp-focus-search-again', 'mirror-whatsapp-focus-add-collection', 'mirror-whatsapp-focus-collection-chooser']) {
    assert.match(css, new RegExp(`html\\.mwf-native-transient-open[^{}]*#${id}`));
  }
  assert.match(css, /html\.mwf-native-transient-open[^{}]*\.mwf-focused-navigation-floating/);
  assert.match(css, /html\.mwf-native-transient-open\.mwf-active:not\(\.mwf-overlay-open\) #mirror-whatsapp-focus-add-collection\s*\{[^}]*display:\s*none !important;/s);
});

test('the existing DOM observer refreshes transient visibility on native mutations', () => {
  assert.match(extract('updateOverlayState'), /updateFocusedNavigationShelfVisibility\(\)/);
  const owner = fs.existsSync(adapterPath) ? fs.readFileSync(adapterPath, 'utf8') : extract('hasNativeTransientSurface');
  assert.match(owner, /\[role="dialog"\]\[aria-modal="true"\]/);
  assert.match(owner, /\[data-testid="media-viewer-modal"\]/);
});
