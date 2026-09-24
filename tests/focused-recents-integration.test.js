const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const content = fs.readFileSync(path.join(projectRoot, 'content.js'), 'utf8');
const nativeAdapter = fs.readFileSync(path.join(projectRoot, 'scripts/whatsapp-dom.js'), 'utf8');
const navigation = fs.readFileSync(path.join(projectRoot, 'scripts/focused-navigation.js'), 'utf8');
const css = fs.readFileSync(path.join(projectRoot, 'focus.css'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'manifest.json'), 'utf8'));

test('keeps recent expansion session-only and renders the bounded visible slice', () => {
  assert.match(content, /let focusedRecentsExpanded = false;/);
  assert.match(content, /MirrorFocusedRecents\?\.visibleRecents\(focusedRecents, focusedRecentsExpanded\)/);
  assert.match(content, /focusedRecentsExpanded = !focusedRecentsExpanded;/);
  assert.match(content, /toggle\.setAttribute\("aria-expanded", String\(focusedRecentsExpanded\)\)/);
  assert.equal((content.match(/focusedRecentsExpanded\s*=/g) || []).length, 2);
  assert.doesNotMatch(content, /focusedRecentsExpanded[^\n]*(localStorage|storage)/);
});

test('loads the pure focused-recents boundary before the content script', () => {
  assert.deepEqual(manifest.content_scripts[0].js, [
    'awareness.js',
    'focus-state.js',
    'focused-recents.js',
    'fixed-collections.js',
    'scripts/whatsapp-dom.js',
    'scripts/focused-navigation.js',
    'scripts/search-gate.js',
    'content.js',
  ]);
});

test('internal recent navigation hides native sidebar and search affordances', () => {
  assert.match(content, /const ROOT_OPENING_RECENT = "mwf-opening-recent";/);
  assert.match(css, /html\.mwf-opening-recent #side\s*{[^}]*visibility: visible !important;[^}]*opacity: 0 !important;/s);
  assert.doesNotMatch(css, /html\.mwf-opening-recent #side\s*{[^}]*visibility: hidden !important;/s);
  assert.match(css, /html\.mwf-opening-recent #mirror-whatsapp-focus-search-gate,[^}]*{[^}]*display: none !important;/s);
});

test('recent navigation polls promptly and activates only one exact classified result', () => {
  assert.match(navigation, /classifyExactTitleMatches\(\s*title,\s*candidates\.map\(\(candidate\) => candidate\.title\)\s*\)/);
  assert.match(navigation, /classification\.status === "match" && searchTextAccepted/);
  assert.match(navigation, /uniqueTarget !== previousUniqueTarget/);
  assert.match(nativeAdapter, /dispatchEvent\(new MouseEvent\("mousedown"/);
  assert.match(navigation, /activateFocusedResult\(uniqueTarget\)/);
  assert.doesNotMatch(content, /candidates\[classification\.index\]\.clickTarget\.click\(\)/);
  assert.match(navigation, /INITIAL_MS = 100/);
  assert.match(navigation, /RETRY_MS = 150/);
  assert.doesNotMatch(content, /RECENT_SEARCH_SETTLE_MS = 1400/);
});

test('internal navigation clears its native query before the next manual search', () => {
  assert.match(nativeAdapter, /function clearNativeSearchText\(/);
  assert.match(content, /clearNativeSearchText\(field\);\s*field\.click\(\)/);
});

test('an empty search hides WhatsApp recent-search suggestions', () => {
  assert.match(css, /mwf-search-too-short[^}]*\[data-testid="recent-search-item"\][^{]*\{[^}]*display: none !important;/s);
});

test('failed navigation exposes a copyable privacy-safe diagnostic', () => {
  assert.match(navigation, /update\(\{[^}]*stage: "results-inspected"/s);
  assert.match(content, /,\s*diagnostic\s*\);/);
  assert.match(content, /button\.textContent = "Copiar diagnóstico";/);
});

test('focused navigation awareness never receives a title field', () => {
  assert.match(content, /recordAwareness\("focused_conversation_opened", \{ route: "search" \}\)/);
  assert.match(content, /recordAwareness\("focused_conversation_opened", \{ route: "recent" \}\)/);
  assert.doesNotMatch(content, /recordAwareness\("focused_conversation_opened", \{[^}]*title/s);
});
