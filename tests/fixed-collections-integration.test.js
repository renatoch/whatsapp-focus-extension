const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'focus.css'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

test('loads fixed collections before the content integration', () => {
  assert.deepEqual(manifest.content_scripts[0].js, [
    'awareness.js',
    'focus-state.js',
    'focused-recents.js',
    'fixed-collections.js',
    'content.js',
  ]);
});

test('persists collections only through the isolated extension adapter', () => {
  assert.match(content, /mirror-whatsapp-focus-fixed-collections-v1/);
  assert.match(content, /fixedCollectionsAdapter\.getItem\(FIXED_COLLECTIONS_KEY\)/);
  assert.match(content, /fixedCollectionsAdapter\.setItem\(FIXED_COLLECTIONS_KEY, nextState\)/);
  assert.doesNotMatch(content, /localStorage[^\n]*FIXED_COLLECTIONS_KEY|FIXED_COLLECTIONS_KEY[^\n]*localStorage/);
});

test('offers add-to-collection only from a focused conversation', () => {
  assert.match(content, /button\.textContent = "Adicionar à coleção"/);
  assert.match(css, /html\.mwf-search-focused #mirror-whatsapp-focus-add-collection/);
  assert.match(content, /readActiveConversationTitle\(\)/);
  assert.match(content, /openFixedCollectionChooser/);
});

test('renders collapsed collections on the focused conversation shelf as plain text', () => {
  assert.match(content, /data-mwf-fixed-collections-focused/);
  assert.doesNotMatch(content, /data-mwf-fixed-collections-overlay/);
  assert.match(content, /mwf-focused-navigation-floating/);
  assert.match(css, /html\.mwf-search-focused \.mwf-focused-navigation-floating:not\(\[hidden\]\)/);
  assert.match(content, /expandedFixedCollectionName/);
  assert.match(content, /heading\.textContent = collection\.name/);
  assert.match(content, /memberButton\.textContent = memberTitle/);
  assert.doesNotMatch(content, /innerHTML\s*=\s*collection\.|innerHTML\s*=\s*memberTitle/);
});

test('collection opening reuses exact hidden navigation without recent telemetry', () => {
  assert.match(content, /openFixedCollectionMember\(memberTitle\)/);
  assert.match(content, /openFixedCollectionMember\(memberTitle\)[^{]*\{[^}]*expandedFixedCollectionName = "";[^}]*beginFocusedRecentNavigation\(memberTitle, "collection"\)/s);
  assert.match(content, /beginFocusedRecentNavigation\(memberTitle, "collection"\)/);
  assert.match(content, /recentNavigationSource === "recent"/);
  assert.doesNotMatch(content, /recordAwareness\([^\n]*collection\.name|recordAwareness\([^\n]*memberTitle/);
});

test('supports member removal and collection deletion', () => {
  assert.match(content, /MirrorFixedCollections\?\.removeMember/);
  assert.match(content, /MirrorFixedCollections\?\.deleteCollection/);
  assert.match(content, /window\.confirm\("Apagar esta coleção\?"\)/);
});
