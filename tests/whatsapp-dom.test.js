const test = require('node:test');
const assert = require('node:assert/strict');
const { createWhatsAppDom } = require('../scripts/whatsapp-dom.js');

class SyntheticEvent {
  constructor(type, options) { this.type = type; Object.assign(this, options); }
}
function setup(matches = {}) {
  const document = { querySelectorAll: (selector) => matches[selector] || [] };
  const window = { InputEvent: SyntheticEvent, KeyboardEvent: SyntheticEvent, MouseEvent: SyntheticEvent,
    getComputedStyle: (element) => element.style || { visibility: 'visible', display: 'block' } };
  return { document, window, adapter: createWhatsAppDom({ document, window }) };
}
const titleNode = (title) => ({ getAttribute: () => title, textContent: title });
const fieldNode = (visible = true) => ({
  value: '', focus() {}, dispatchEvent() {},
  getBoundingClientRect: () => ({ width: 100, height: 30 }),
  style: { visibility: visible ? 'visible' : 'hidden', display: 'block' },
});

test('native title selection preserves selector priority and collapses whitespace only', () => {
  const { adapter } = setup({
    '#main header [data-testid="conversation-info-header-chat-title"]': [titleNode('  Project   One  ')],
    '#main header span[title]': [titleNode('Fallback')],
  });
  assert.equal(adapter.readActiveConversationTitle(), 'Project One');
  assert.equal(adapter.readTitle(null), '');
  assert.equal(adapter.readTitle(titleNode('EXAMPLE')), 'EXAMPLE');
});

test('manual field lookup skips hidden candidates; internal navigation can use them', () => {
  const hidden = fieldNode(false), visible = fieldNode();
  const { adapter } = setup({ '#side [contenteditable="true"][role="textbox"]': [hidden, visible] });
  assert.equal(adapter.findNativeSearchField(), visible);
  assert.equal(adapter.findNativeSearchField({ allowHidden: true }), hidden);
  assert.equal(setup().adapter.findNativeSearchField(), undefined);
});

test('input setter and synthetic events preserve the native search contract', () => {
  const { adapter } = setup();
  const events = []; let set = '', focused = 0;
  class Input { set value(value) { set = value; } get value() { return set; } }
  const field = new Input(); field.focus = () => focused++;
  field.dispatchEvent = (event) => events.push(event);
  adapter.setNativeSearchText(field, 'Example');
  assert.equal(set, 'Example'); assert.equal(focused, 1);
  assert.deepEqual(events.map((event) => event.type), ['input', 'keyup']);
  assert.equal(events[0].data, 'Example'); assert.equal(events[0].bubbles, true);
  adapter.clearNativeSearchText(field);
  assert.equal(set, ''); assert.equal(events.length, 4);
  adapter.clearNativeSearchText(field); assert.equal(events.length, 4);
});

test('contenteditable fallback preserves selection clearing and text entry', () => {
  const { document, window } = setup();
  let cleared = 0;
  const selection = { removeAllRanges: () => cleared++, addRange() {} };
  window.getSelection = () => selection;
  document.createRange = () => ({ selectNodeContents() {} });
  document.execCommand = () => false;
  const adapter = createWhatsAppDom({ document, window });
  const field = { textContent: '', focus() {}, dispatchEvent() {} };
  adapter.setNativeSearchText(field, 'Example');
  assert.equal(field.textContent, 'Example'); assert.equal(cleared, 2);
});

test('candidate enumeration retains outer rows and stable native target identities', () => {
  const target = { matches: () => true, contains: () => false,
    querySelectorAll: () => [titleNode('Example')] };
  const grid = { matches: (selector) => selector === '[role="grid"]' };
  const header = { parentElement: grid, matches: (selector) => selector === '[role="row"]',
    contains: () => false, querySelectorAll: (selector) => selector === 'h2' ? [{ textContent: 'Conversas' }] : [] };
  const outer = { parentElement: grid, matches: (selector) => selector === '[role="row"]', contains: (other) => other === target,
    querySelector: () => target, querySelectorAll: (selector) => selector === 'h2' ? [] : [titleNode('Example')] };
  const { adapter } = setup({
    '#side [data-testid="cell-frame-container"], #side [data-testid="conversation-list-item"], #side [role="listitem"], #side [role="row"]': [header, outer, target],
  });
  const result = adapter.focusedSearchCandidates();
  assert.equal(result.rowCount, 2); assert.equal(result.candidates.length, 1);
  assert.equal(result.conversationSectionFound, true);
  assert.equal(result.candidates[0].title, 'Example');
  assert.equal(result.candidates[0].clickTarget, target);
  assert.equal(adapter.focusedSearchCandidates().candidates[0].clickTarget, target);
});

test('native activation uses one evidenced mousedown rather than click', () => {
  const { adapter, window } = setup();
  const events = [];
  adapter.activateFocusedResult({ dispatchEvent: (event) => events.push(event), click: () => assert.fail('not native click') });
  assert.equal(events.length, 1); assert.equal(events[0].type, 'mousedown');
  assert.equal(events[0].view, window); assert.equal(events[0].buttons, 1);
  assert.equal(events[0].bubbles, true); assert.equal(events[0].cancelable, true);
});
