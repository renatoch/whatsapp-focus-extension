const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8');
const start = source.indexOf('  function focusNativeSearch(');
assert.notEqual(start, -1);
const implementation = source.slice(start, source.indexOf('\n  function ', start + 1));

for (const initialText of ['', 'Previous query']) {
  test(`search entry explicitly focuses the ${initialText ? 'previously filled' : 'empty'} native field`, () => {
    const events = [];
    let focused = false;
    const field = { value: initialText,
      click() { events.push('click'); }, // Synthetic click must not be assumed to focus.
      focus() { focused = true; events.push('focus'); },
    };
    const context = vm.createContext({
      isNestedListView: () => false, debugLog() {}, describeElement: () => null,
      root: () => ({ className: 'mwf-searching' }), findNativeSearchField: () => field,
      clearNativeSearchText(target) {
        events.push('clear');
        if (target.value) { target.focus(); target.value = ''; }
      },
      updateSearchGateState(target) {
        assert.equal(target, field);
        assert.equal(target.value, '');
        assert.equal(focused, true);
        events.push('gate');
      },
    });
    vm.runInContext(implementation + '\nfocusNativeSearch({ retriedFromNestedView: true });', context);
    assert.deepEqual(events.slice(-3), ['click', 'focus', 'gate']);
  });
}
