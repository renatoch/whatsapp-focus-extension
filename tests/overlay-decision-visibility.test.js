const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../focus.css'), 'utf8');

// CSS contracts only; live Chrome remains the check for visual composition.
for (const state of ['mwf-intent-pending', 'mwf-normal-pending']) {
  test(`overlay recents are hidden only while ${state} is active`, () => {
    const selector = `#mirror-whatsapp-focus-overlay.${state} .mwf-card > .mwf-focused-recents-overlay`;
    const rule = css.split('}').find((block) => block.split('{')[0].split(',').map((part) => part.trim()).includes(selector));
    assert.ok(rule, 'decision state must hide its overlay recent shelf');
    assert.match(rule.split('{')[1], /display:\s*none\s*!important/);
  });
}

test('normal overlay recents keep their regular layout outside the decision states', () => {
  const rule = css.split('}').find((block) => block.split('{')[0].trim() === '.mwf-focused-recents-overlay');
  assert.ok(rule);
  assert.doesNotMatch(rule.split('{')[1], /display:\s*none|visibility:\s*hidden/);
});
