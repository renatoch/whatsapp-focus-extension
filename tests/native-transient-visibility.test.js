const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8');
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
  const base = { FOCUSED_RECENTS_ID: 'shelf', document, isSearching: () => false };
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
  return { context, shelf, recents, collections };
}
test('visible native dialogs and media viewers temporarily hide the focused shelf', () => {
  for (const kind of ['dialog', 'media']) {
    const h = harness([{ visible: true, kind }]);
    h.context.updateFocusedNavigationShelfVisibility();
    assert.equal(h.shelf.hidden, true);
  }
});
test('closing the native surface restores shelf visibility without changing its contents', () => {
  const nativeElements = [{ visible: true }];
  const h = harness(nativeElements);
  h.context.updateFocusedNavigationShelfVisibility();
  nativeElements[0].visible = false;
  h.context.updateFocusedNavigationShelfVisibility();
  assert.equal(h.shelf.hidden, false);
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
test('the existing DOM observer refreshes transient visibility on native mutations', () => {
  assert.match(extract('updateOverlayState'), /updateFocusedNavigationShelfVisibility\(\)/);
  const owner = fs.existsSync(adapterPath) ? fs.readFileSync(adapterPath, 'utf8') : extract('hasNativeTransientSurface');
  assert.match(owner, /\[role="dialog"\]\[aria-modal="true"\]/);
  assert.match(owner, /\[data-testid="media-viewer-modal"\]/);
});
