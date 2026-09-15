const test = require('node:test');
const assert = require('node:assert/strict');
const { createWhatsAppDom } = require('../scripts/whatsapp-dom.js');
function button(label, top = 80) {
  return { getAttribute: (key) => key === 'aria-label' ? label : '', textContent: '',
    getBoundingClientRect: () => ({ width: 32, height: 32, left: 60, top }),
    closest() { return this; }, click() { this.clicked = true; } };
}
function setup(selectors = {}, exclude = () => false) {
  const events = [];
  const document = { querySelectorAll: (selector) => selectors[selector] || [],
    querySelector: (selector) => selectors[selector]?.[0] || null,
    dispatchEvent: (event) => events.push(event) };
  const window = { getComputedStyle: () => ({ visibility: 'visible', display: 'block' }),
    KeyboardEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } },
    dispatchEvent: (event) => events.push(event) };
  return { adapter: createWhatsAppDom({ document, window, isMirrorControl: exclude }), events };
}

test('native Chats discovery excludes extension controls and favors labels over geometry', () => {
  const mirror = button('Conversas'), positional = button('', 50), native = button('Chats', 110);
  const { adapter } = setup({ 'button, [role="button"], [aria-label], [title]': [mirror, positional, native] }, (element) => element === mirror);
  assert.equal(adapter.findMainChatsButton(), native);
  adapter.exitNestedListView(); assert.equal(native.clicked, true); assert.equal(mirror.clicked, undefined);
});
test('native Chats positional fallback remains topmost qualifying control', () => {
  const upper = button('', 50), lower = button('', 100);
  const { adapter } = setup({ 'button, [role="button"], [aria-label], [title]': [lower, upper] });
  assert.equal(adapter.findMainChatsButton(), upper);
});
test('nested exit uses Back when global Chats is absent, then Escape as final fallback', () => {
  const back = button('Back');
  const { adapter } = setup({ '#side [aria-label="Back"]': [back] });
  assert.equal(adapter.isNestedListView(), true);
  adapter.exitNestedListView(); assert.equal(back.clicked, true);
  const fallback = setup(); fallback.adapter.exitNestedListView();
  assert.deepEqual(fallback.events.map((event) => event.type), ['keydown', 'keyup', 'keydown', 'keyup']);
  assert.ok(fallback.events.every((event) => event.key === 'Escape' && event.bubbles));
});
test('readiness and conversation presence remain independent', () => {
  const { adapter } = setup({ '#side': [{}] });
  assert.equal(adapter.isWhatsAppReady(), true); assert.equal(adapter.hasOpenConversation(), false);
});
