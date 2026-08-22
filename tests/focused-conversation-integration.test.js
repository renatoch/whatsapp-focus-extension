const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const content = fs.readFileSync(path.join(projectRoot, 'content.js'), 'utf8');
const css = fs.readFileSync(path.join(projectRoot, 'focus.css'), 'utf8');

test('focused conversation state explicitly enforces the hidden-sidebar invariant', () => {
  assert.match(
    content,
    /classList\.add\(ROOT_ACTIVE, ROOT_SEARCH_FOCUSED, ROOT_SIDEBAR_HIDDEN\)/
  );
  assert.match(css, /html\.mwf-sidebar-hidden #side\s*{\s*display: none !important;/);
});
