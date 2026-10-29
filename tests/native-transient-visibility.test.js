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
  const base = { FOCUSED_RECENTS_ID: 'shelf', ROOT_NATIVE_TRANSIENT: 'mwf-native-transient-open',
    ROOT_CHANNEL_SURFACE:'mwf-channel-surface', nativeSurface:{inspect:()=> 'conversation'}, document,
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
test('observed Status player marker suspends navigation but thumbnail alone does not', () => {
  const player = { visible:true, testid:'status-player-contact-name' };
  const thumbnail = { visible:true, testid:'status-image-thumbnail' };
  const h = harness([]);
  h.context.document.querySelectorAll = selectors => [player, thumbnail].filter(element => selectors.includes(`[data-testid="${element.testid}"]`));
  h.context.updateFocusedNavigationShelfVisibility();
  assert.equal(h.classes.has('mwf-native-transient-open'), true);
  player.visible = false;
  h.context.updateFocusedNavigationShelfVisibility();
  assert.equal(h.classes.has('mwf-native-transient-open'), false);
  assert.equal(h.shelf.hidden, false);
});

test('visible observed Status drawer suspends actions and shelf, hidden drawer restores them', () => {
  const drawer = { visible:true, testid:'status-drawer' };
  const thumbnail = { visible:true, testid:'status-thumbnail' };
  const h = harness([]);
  h.context.document.querySelectorAll = selectors => [drawer, thumbnail].filter(element => selectors.includes(`[data-testid="${element.testid}"]`));
  h.context.updateFocusedNavigationShelfVisibility();
  assert.equal(h.classes.has('mwf-native-transient-open'), true);
  assert.equal(h.shelf.hidden, true);
  drawer.visible = false;
  h.context.updateFocusedNavigationShelfVisibility();
  assert.equal(h.classes.has('mwf-native-transient-open'), false);
  assert.equal(h.shelf.hidden, false);
  assert.equal(h.recents.hidden, false);
  assert.equal(h.collections.hidden, false);
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
test('channel surfaces suppress conversation shelf without masquerading as a native modal', () => {
  for (const surface of ['channel','channel-list']) {
    const h=harness([]);h.context.nativeSurface.inspect=()=>surface;
    h.context.updateFocusedNavigationShelfVisibility();
    assert.equal(h.shelf.hidden,true);assert.equal(h.classes.has('mwf-channel-surface'),true);
    assert.equal(h.classes.has('mwf-native-transient-open'),false);
    assert.equal(h.recents.hidden,false);assert.equal(h.collections.hidden,false);
    h.context.nativeSurface.inspect=()=> 'conversation';h.context.updateFocusedNavigationShelfVisibility();
    assert.equal(h.classes.has('mwf-channel-surface'),false);assert.equal(h.shelf.hidden,false);
  }
});

test('the transient root state hides focused actions and an open collection chooser', () => {
  for (const id of ['mirror-whatsapp-focus-controls', 'mirror-whatsapp-focus-search-again', 'mirror-whatsapp-focus-add-collection', 'mirror-whatsapp-focus-collection-chooser']) {
    assert.match(css, new RegExp(`html\\.mwf-native-transient-open[^{}]*#${id}`));
  }
  assert.match(css, /html\.mwf-native-transient-open[^{}]*\.mwf-focused-navigation-floating/);
  assert.match(css, /html\.mwf-native-transient-open\.mwf-active:not\(\.mwf-overlay-open\) #mirror-whatsapp-focus-add-collection\s*\{[^}]*display:\s*none !important;/s);
});

test('native control-bar suppression wins the later cascade over ordinary visible controls', () => {
  const hide = css.indexOf('html.mwf-native-transient-open #mirror-whatsapp-focus-controls');
  const show = css.indexOf('html:not(.mwf-overlay-open) #mirror-whatsapp-focus-controls');
  assert.ok(hide > show);
  const rule = css.slice(hide, css.indexOf('}', hide) + 1);
  assert.match(rule, /display:\s*none !important/);
});

test('channel CSS preserves sidebar geometry while hiding both native layers and their descendants', () => {
  const start=css.indexOf('html.mwf-channel-focused [data-testid="drawer-left"]');
  assert.ok(start>=0);
  const rule=css.slice(start,css.indexOf('}',start)+1);
  assert.match(rule,/visibility:\s*hidden !important/);
  assert.match(rule,/pointer-events:\s*none !important/);
  assert.doesNotMatch(rule,/display:\s*none/);
  assert.match(rule,/:has\(> #side\)\s+\*/);
  assert.match(rule,/\[data-testid="drawer-left"\]:has\(\[data-testid="newsletter-drawer"\]\)\s+\*/);
  assert.doesNotMatch(css,/html\.mwf-channel-focused #main\s*\{[^}]*display:\s*none/);
  assert.match(css,/html\.mwf-channel-surface\.mwf-active:not\(\.mwf-overlay-open\) #mirror-whatsapp-focus-add-collection\s*\{\s*display: none !important/);
});

test('the existing DOM observer refreshes transient visibility on native mutations', () => {
  assert.match(extract('updateOverlayState'), /updateFocusedNavigationShelfVisibility\(\)/);
  const owner = fs.existsSync(adapterPath) ? fs.readFileSync(adapterPath, 'utf8') : extract('hasNativeTransientSurface');
  assert.match(owner, /\[role="dialog"\]\[aria-modal="true"\]/);
  assert.match(owner, /\[data-testid="media-viewer-modal"\]/);
});
