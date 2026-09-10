const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const content = fs.readFileSync(path.join(projectRoot, 'content.js'), 'utf8');
const css = fs.readFileSync(path.join(projectRoot, 'focus.css'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'manifest.json'), 'utf8'));

test('loads the pure focused-recents boundary before the content script', () => {
  assert.deepEqual(manifest.content_scripts[0].js, [
    'awareness.js',
    'focus-state.js',
    'focused-recents.js',
    'content.js',
  ]);
});

test('internal recent navigation hides native sidebar and search affordances', () => {
  assert.match(content, /const ROOT_OPENING_RECENT = "mwf-opening-recent";/);
  assert.match(css, /html\.mwf-opening-recent #side\s*{[^}]*visibility: visible !important;[^}]*opacity: 0 !important;/s);
  assert.doesNotMatch(css, /html\.mwf-opening-recent #side\s*{[^}]*visibility: hidden !important;/s);
  assert.match(css, /html\.mwf-opening-recent #mirror-whatsapp-focus-search-gate,[^}]*{[^}]*display: none !important;/s);
});

test('recent navigation clicks only one exact classified result', () => {
  assert.match(content, /classifyExactTitleMatches\(\s*title,\s*candidates\.map\(\(candidate\) => candidate\.title\)\s*\)/);
  assert.match(content, /if \(classification\.status !== "match"\)/);
  assert.match(content, /candidates\[classification\.index\]\.row\.click\(\)/);
});

test('focused navigation awareness never receives a title field', () => {
  assert.match(content, /recordAwareness\("focused_conversation_opened", \{ route: "search" \}\)/);
  assert.match(content, /recordAwareness\("focused_conversation_opened", \{ route: "recent" \}\)/);
  assert.doesNotMatch(content, /recordAwareness\("focused_conversation_opened", \{[^}]*title/s);
});
