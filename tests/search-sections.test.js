const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const rules = require('../focused-recents.js');
function select(rows) {
  const adapter = path.join(__dirname, '../scripts/whatsapp-dom.js');
  if (fs.existsSync(adapter)) return require(adapter).createWhatsAppDom({ document: {}, window: {} }).focusedConversationRows(rows);
  const source = fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8');
  const start = source.indexOf('  function focusedConversationRows(');
  assert.notEqual(start, -1);
  const context = vm.createContext({ rows });
  vm.runInContext(source.slice(start, source.indexOf('\n  function ', start + 1)) + '\nresult = focusedConversationRows(rows);', context);
  return context.result;
}
function grid() { return { matches: (selector) => selector === '[role="grid"]' }; }
function row(parent, title, heading = null) {
  return { parentElement: parent, title, matches: (selector) => selector === '[role="row"]',
    querySelectorAll: () => heading === null ? [] : [{ textContent: heading }] };
}
test('only conversation-section rows contribute to exact-title selection', () => {
  const g = grid(), conversation = row(g, 'Example');
  const selected = select([row(g, '', 'CONVERSAS'), conversation,
    row(g, '', 'GRUPOS EM COMUM'), row(g, 'Example'), row(g, '', 'MENSAGENS'), row(g, 'Example')]);
  assert.equal(selected.conversationSectionFound, true);
  assert.deepEqual(Array.from(selected.rows), [conversation]);
  assert.equal(rules.classifyExactTitleMatches('Example', selected.rows.map((r) => r.title)).status, 'match');
});
test('true duplicates within conversations remain ambiguous', () => {
  const g = grid();
  const selected = select([row(g, '', 'Chats'), row(g, 'Example'), row(g, 'Example')]);
  assert.equal(rules.classifyExactTitleMatches('Example', selected.rows.map((r) => r.title)).status, 'ambiguous');
});
test('unknown headings and grid boundaries end the allowed section', () => {
  const g = grid(), other = grid(), allowed = row(g, 'Example');
  const selected = select([row(g, '', ' Conversas '), allowed, row(other, 'Example'),
    row(g, 'Example'), row(g, '', 'Conversas'), row(g, '', 'Unknown section'), row(g, 'Example')]);
  assert.deepEqual(Array.from(selected.rows), [allowed]);
});
test('missing headings, non-grid rows and conversation titles named Conversas fail closed', () => {
  const g = grid();
  for (const rows of [[row(g, 'Conversas'), row(g, 'Example')],
    [row({ matches: () => false }, '', 'Conversas'), row(g, 'Example')]]) {
    const selected = select(rows);
    assert.equal(selected.rows.length, 0);
    assert.equal(selected.conversationSectionFound, false);
  }
});
