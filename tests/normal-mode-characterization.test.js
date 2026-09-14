const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8');
function extract(name) {
  const start = source.indexOf(`  function ${name}(`);
  return source.slice(start, source.indexOf('\n  function ', start + 1));
}

test('normal expiry preserves normalization before focused destination, otherwise returns blind', () => {
  for (const destination of ['focused-conversation', 'blind-overlay']) {
    const sequence = []; let expire;
    const context = vm.createContext({
      bypassTimer: 7, BYPASS_MS: 300000,
      finishNormalAttempt: (type, details) => sequence.push([type, details.route]),
      clearNormalDelay: () => sequence.push('clear-delay'),
      recordNormalOpenedAt: () => sequence.push('record-open'),
      setNormal: () => sequence.push('normal'),
      chooseNormalExpiryDestination: () => destination,
      recordAwareness: (type, details) => sequence.push([type, details.expiryDestination]),
      goToMainChatsThen: (route, callback) => { sequence.push(route); callback(); },
      setSearchFocusedConversation: () => sequence.push('focused'),
      setActive: ({ showOverlay }) => sequence.push(showOverlay ? 'blind' : 'continue'),
      window: { clearTimeout: (id) => sequence.push(['cancel', id]),
        setTimeout: (callback, ms) => { assert.equal(ms, 300000); expire = callback; return 8; } },
    });
    vm.runInContext(extract('setNormalTemporarily') + '\nsetNormalTemporarily("immediate");', context);
    assert.deepEqual(sequence, [['normal_opened', 'immediate'], 'clear-delay', ['cancel', 7], 'record-open', 'normal']);
    expire();
    assert.equal(context.bypassTimer, null);
    assert.deepEqual(sequence.slice(5), destination === 'focused-conversation'
      ? [['focus_returned', destination], 'expiry', 'focused'] : [['focus_returned', destination], 'blind']);
  }
});

test('recent normal use requires explicit confirmation rather than another countdown', () => {
  for (const recent of [false, true]) {
    const classes = new Set(); const nowButton = {}; const countdown = {};
    const timers = [];
    const context = vm.createContext({
      getOverlay: () => ({ classList: { add: (...names) => names.forEach((name) => classes.add(name)) },
        querySelectorAll: (selector) => selector.includes('normal-now') ? [nowButton] : [countdown] }),
      ensureNormalConfirm() {}, clearNormalDelay() {}, recordAwareness() {}, updateRecentNormalWarning() {},
      readLastNormalOpenedAt: () => recent ? 900000 : null,
      Date: { now: () => 1000000 }, RECENT_NORMAL_OPEN_MS: 600000, NORMAL_DELAY_MS: 8000,
      normalAttemptStartedAt: null, normalAttemptRecent: false, normalDelayInterval: null, normalDelayTimer: null,
      setNormalTemporarily: () => {},
      window: { setInterval: (_fn, ms) => timers.push(ms), setTimeout: (_fn, ms) => timers.push(ms) },
    });
    vm.runInContext(extract('startNormalDelay') + '\nstartNormalDelay();', context);
    assert.equal(context.normalAttemptRecent, recent);
    if (recent) {
      assert.deepEqual(timers, []); assert.equal(nowButton.textContent, 'Abrir mesmo assim');
    } else {
      assert.deepEqual(timers, [200, 8000]); assert.equal(countdown.textContent, '8');
    }
  }
});
