const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createWhatsAppDom } = require('../scripts/whatsapp-dom.js');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../focus.css'), 'utf8');
function extract(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.notEqual(start, -1);
  return source.slice(start, source.indexOf('\n  function ', start + 1));
}
function node(parent = null, header = false) {
  const item = { parentElement: parent, children: [], marked: false,
    setAttribute() { this.marked = true; }, removeAttribute() { this.marked = false; },
    matches: (selector) => selector === 'header' && header,
    contains(other) { return this === other || this.children.some((child) => child.contains(other)); },
  };
  parent?.children.push(item);
  return item;
}
test('isolates search controls from native suggestions and filters without changing layout', () => {
  const side = node(); const header = node(side, true); const wrapper = node(side);
  const row = node(wrapper); const field = node(row); const clearButton = node(row);
  const filters = node(wrapper); const results = node(side);
  field.closest = () => row;
  const all = [header, wrapper, row, field, clearButton, filters, results];
  field.getBoundingClientRect = () => ({ width: 100, height: 30 });
  const adapter = createWhatsAppDom({
    document: { querySelector: () => side, querySelectorAll: (selector) => selector.includes('empty-search-hidden') ? all.filter((item) => item.marked) : [field] },
    window: { getComputedStyle: () => ({ visibility: 'visible', display: 'block' }) },
  });
  adapter.isolateEmptySearchControls();
  assert.ok(filters.marked); assert.ok(results.marked);
  assert.ok(!row.marked); assert.ok(!field.marked); assert.ok(!clearButton.marked); assert.ok(!header.marked);
  // New native suggestions inserted on focus must be hidden too.
  const suggestions = node(wrapper);
  adapter.isolateEmptySearchControls();
  assert.ok(suggestions.marked);
});

test('isolation is scoped to empty navigation and the shared shelf is opaque', () => {
  assert.match(css, /html\.mwf-searching\.mwf-search-navigation:not\(\.mwf-opening-recent\) #side \[data-mwf-empty-search-hidden\][^{]*\{[^}]*visibility: hidden !important;[^}]*pointer-events: none !important;/s);
  const shelf = css.slice(css.indexOf('.mwf-focused-navigation-floating {'));
  assert.match(shelf.slice(0, shelf.indexOf('}')), /background: #111b21;/);
  assert.match(extract('updateOverlayState'), /isolateEmptySearchControls\(\)/);
});
