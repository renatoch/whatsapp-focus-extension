const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../focus.css'), 'utf8');

// CSS contracts: browser layout still requires the short live pointer check.
test('focused recents reserve five fixed rows without expanding the overlay', () => {
  assert.match(css, /\[data-mwf-focused-recents-focused\]\s*\{[^}]*height: 232px;/s);
  assert.match(css, /\[data-mwf-focused-recents-focused\] \.mwf-focused-recents-heading\s*\{[^}]*height: 20px;/s);
  assert.match(css, /\[data-mwf-focused-recents-focused\] \.mwf-focused-recent-item\s*\{[^}]*height: 36px;[^}]*flex: 0 0 36px;/s);
  assert.match(css, /\[data-mwf-focused-recents-focused\]\[hidden\]\s*\{[^}]*display: block !important;[^}]*visibility: hidden;/s);
  assert.doesNotMatch(css, /\.mwf-focused-recents\[hidden\] \+ \.mwf-fixed-collections/);
  assert.equal(require('../focused-recents.js').MAX_RECENTS, 5);
  assert.equal(20 + 8 + 5 * 36 + 4 * 6, 232);
});

function extract(name) {
  const start = source.indexOf(`  function ${name}(`);
  return source.slice(start, source.indexOf('\n  function ', start + 1));
}

test('collection opening preserves expansion and ignores another opening while busy', () => {
  let busy = false;
  const opened = [];
  const context = vm.createContext({
    expandedFixedCollectionName: 'Example', ROOT_OPENING_RECENT: 'opening',
    root: () => ({ classList: { contains: () => busy } }),
    closeFixedCollectionChooser: () => {},
    beginFocusedRecentNavigation: (title) => { opened.push(title); busy = true; },
  });
  vm.runInContext(extract('openFixedCollectionMember') + '\nopenFixedCollectionMember("One"); openFixedCollectionMember("Two");', context);
  assert.equal(context.expandedFixedCollectionName, 'Example');
  assert.deepEqual(opened, ['One']);
});

test('unchanged collection renders preserve member nodes and shelf scroll position', () => {
  const shelf = { scrollTop: 120 };
  const node = () => ({
    children: [], hidden: false,
    append(...children) { this.children.push(...children); },
    appendChild(child) { this.children.push(child); },
    setAttribute() {}, addEventListener() {},
    replaceChildren() { this.children = []; shelf.scrollTop = 0; },
  });
  const container = node();
  const context = vm.createContext({
    fixedCollectionsState: { collections: [{ name: 'Example', members: ['One', 'Two'] }] },
    expandedFixedCollectionName: 'Example', fixedCollectionRenderCache: new WeakMap(),
    FOCUSED_RECENTS_ID: 'shelf',
    document: { querySelector: () => container, getElementById: () => shelf, createElement: node },
    updateFocusedNavigationShelfVisibility: () => {},
  });
  vm.runInContext(extract('renderFixedCollections') + '\nrenderFixedCollections();', context);
  const collectionNode = container.children[1];
  assert.equal(shelf.scrollTop, 120);
  vm.runInContext('renderFixedCollections();', context);
  assert.equal(container.children[1], collectionNode);
  assert.equal(shelf.scrollTop, 120);
});

test('updating recent contents restores the shared shelf scroll offset', () => {
  const shelf = { scrollTop: 120 };
  const context = vm.createContext({
    FOCUSED_RECENTS_ID: 'shelf',
    document: { querySelector: () => ({}), getElementById: () => shelf },
    createFocusedRecentsContents: () => { shelf.scrollTop = 0; },
    updateFocusedNavigationShelfVisibility: () => {},
  });
  vm.runInContext(extract('renderFocusedRecents') + '\nrenderFocusedRecents();', context);
  assert.equal(shelf.scrollTop, 120);
});
