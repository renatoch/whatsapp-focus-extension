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
function target({ row = null, side = false, archived = false } = {}) {
  return { closest(selector) {
    if (selector === '[data-testid="conversation-list-item"], [role="listitem"], [role="row"]') return row;
    return null;
  } };
}
function row({ side = false, archived = false, title = true } = {}) {
  return { closest(selector) {
    if (selector === '#side') return side ? {} : null;
    if (selector === '[data-testid="archived-chatlist"]') return archived ? {} : null;
    return null;
  }, querySelector(selector) { return selector === '[data-testid="cell-frame-title"]' && title ? {} : null; } };
}
const adapterPath = path.join(__dirname, '../scripts/whatsapp-dom.js');
const context = fs.existsSync(adapterPath)
  ? (() => { const adapter = require(adapterPath).createWhatsAppDom({ document: {}, window: {} });
      return { conversationListRow: adapter.conversationListRow,
        isConversationListClick: (target) => Boolean(adapter.conversationListRow(target)) }; })()
  : (() => { const value = vm.createContext({});
      vm.runInContext(extract('conversationListRow') + '\n' + extract('isConversationListClick'), value);
      return value; })();

test('accepts titled native conversation rows in main and archived lists', () => {
  const main = row({ side: true });
  const archived = row({ archived: true });
  assert.equal(context.conversationListRow(target({ row: main })), main);
  assert.equal(context.isConversationListClick(target({ row: archived })), true);
});
test('rejects standalone cell frames such as the Archived navigation button', () => {
  assert.equal(context.isConversationListClick(target()), false);
});
test('fails closed for titled rows outside allowlisted lists and untitled rows inside them', () => {
  assert.equal(context.isConversationListClick(target({ row: row() })), false);
  assert.equal(context.isConversationListClick(target({ row: row({ archived: true, title: false }) })), false);
});
