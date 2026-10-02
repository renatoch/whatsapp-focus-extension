const test = require('node:test');
const assert = require('node:assert/strict');
const { createNormalMode } = require('../scripts/normal-mode.js');
function clock() {
  let time = 1000000, next = 0;
  const pending = new Map(), all = new Map();
  const add = (fn, delay, interval) => { const id = next++; const task = { fn, at: time + delay, interval }; pending.set(id, task); all.set(id, task); return id; };
  return { now: () => time, pending, all,
    scheduler: { setTimeout: (fn, ms) => add(fn, ms, 0), clearTimeout: id => pending.delete(id),
      setInterval: (fn, ms) => add(fn, ms, ms), clearInterval: id => pending.delete(id) },
    force: id => all.get(id).fn(),
    advance(ms) { const end = time + ms; let budget = 10000;
      while (budget--) { const entry = [...pending].filter(([, t]) => t.at <= end).sort((a,b) => a[1].at-b[1].at)[0]; if (!entry) break;
        const [id,t] = entry; time = t.at; if (t.interval) t.at += t.interval; else pending.delete(id); t.fn(); }
      assert.ok(budget > 0); time = end;
    },
  };
}
function harness({ last = null, present = true, destination = 'blind-overlay' } = {}) {
  const c = clock(), events = [], classes = new Set(), button = {}, countdown = {}, callbacks = [];
  let normal = false;
  const overlay = { classList: { add: (...values) => values.forEach(v => classes.add(v)), remove: (...values) => values.forEach(v => classes.delete(v)) },
    querySelectorAll: selector => selector.includes('normal-now') ? [button] : [countdown] };
  const ui = {
    prepare: () => { if (!present) return false; events.push('prepare'); return true; },
    reset: () => { overlay.classList.remove('mwf-normal-pending','mwf-normal-recent'); button.textContent = 'Abrir agora'; },
    setPending: () => overlay.classList.add('mwf-normal-pending'),
    setRecent: () => { overlay.classList.add('mwf-normal-recent'); button.textContent = 'Abrir mesmo assim'; },
    updateWarning: value => events.push(['warning',value]),
    setCountdown: seconds => { countdown.textContent = String(seconds); },
  };
  const dependencies = { scheduler: c.scheduler, now: c.now, delayMs: 8000, tickMs: 200, bypassMs: 300000, recentWindowMs: 600000,
    readLastNormalOpenedAt: () => last, recordNormalOpenedAt: () => events.push('record-open'),
    onAttemptStarted: () => events.push(['attempt_started',undefined]),
    finishNormalAttempt: (type,details) => events.push([type,details]),
    recordAwareness: (type,details) => events.push([type,details]),
    setNormal: () => { normal = true; events.push('normal'); controller.clearConfirmation(); },
    setActive: () => { normal = false; events.push('blind'); }, setFocused: () => { normal = false; events.push('focused'); },
    isNormalMode: () => normal, chooseExpiryDestination: () => destination,
    normalizeChats: callback => { events.push('expiry'); callbacks.push(callback); }, ui };
  const controller = createNormalMode(dependencies);
  return { controller, dependencies, ui, c, events, classes, button, countdown, callbacks, setMode: value => { normal = value; } };
}

test('confirmation effect order retains prepare/reset/pending/attempt/warning/countdown', () => {
  const h = harness(), trace = [];
  for (const key of ['prepare','reset','setPending','updateWarning','setCountdown']) {
    const original = h.ui[key]; h.ui[key] = (...args) => {trace.push(key); return original(...args);};
  }
  const controller = createNormalMode({...h.dependencies,
    readLastNormalOpenedAt:()=>{trace.push('readLast');return null;},
    onAttemptStarted:()=>trace.push('attempt')});
  controller.beginConfirmation();
  assert.deepEqual(trace,['prepare','reset','setPending','readLast','attempt','updateWarning','setCountdown']);
});

test('confirmation absent overlay is inert', () => {
  const h = harness({ present: false }); h.controller.beginConfirmation(); assert.deepEqual(h.events, []); assert.equal(h.c.pending.size, 0);
});
test('fresh confirmation displays elapsed countdown and opens at exactly eight seconds', () => {
  const h = harness(); h.controller.beginConfirmation();
  assert.deepEqual(h.events, ['prepare', ['attempt_started', undefined], ['warning', null]]);
  assert.equal(h.countdown.textContent, '8'); h.c.advance(1000); assert.equal(h.countdown.textContent, '7');
  h.c.advance(6999); assert.equal(h.events.includes('normal'), false); h.c.advance(1);
  assert.deepEqual(h.events.slice(3), [['normal_opened', { route: 'countdown' }], 'record-open', 'normal']);
  assert.equal(h.c.pending.size, 1); assert.equal(h.classes.has('mwf-normal-pending'), false);
});
test('recent confirmation is explicit; strict boundary uses countdown', () => {
  for (const [last, recent] of [[999999,true], [400001,true], [400000,false], [null,false]]) {
    const h = harness({ last }); h.controller.beginConfirmation();
    assert.equal(h.classes.has('mwf-normal-recent'), recent);
    assert.equal(h.c.pending.size, recent ? 0 : 2);
    if (recent) assert.equal(h.button.textContent, 'Abrir mesmo assim');
    h.controller.openNow(); assert.deepEqual(h.events[3], ['normal_opened', { route: recent ? 'recent-explicit' : 'immediate' }]);
    assert.equal(h.c.pending.size, 1); assert.equal(h.button.textContent, 'Abrir agora');
  }
});
test('confirmation cleanup clears both countdown resources and restores controls', () => {
  const h = harness(); h.controller.beginConfirmation(); h.controller.clearConfirmation(); h.c.advance(9000);
  assert.equal(h.c.pending.size, 0); assert.equal(h.events.includes('normal'), false); assert.equal(h.button.textContent, 'Abrir agora');
});
test('normal expiry is five minutes and normalizes only for focused destination', () => {
  for (const destination of ['blind-overlay','focused-conversation']) {
    const h = harness({ destination }); h.controller.openTemporarily('immediate');
    assert.deepEqual(h.events, [['normal_opened',{route:'immediate'}], 'record-open','normal']);
    h.c.advance(299999); assert.equal(h.events.length,3); h.c.advance(1);
    assert.deepEqual(h.events[3], ['focus_returned',{reason:'expiry',expiryDestination:destination}]);
    if (destination === 'focused-conversation') { assert.equal(h.events[4],'expiry'); h.callbacks[0](); assert.equal(h.events[5],'focused'); }
    else assert.equal(h.events[4],'blind');
    assert.equal(h.c.pending.size,0);
  }
});
test('confirmation handle zero and forcibly invoked obsolete callbacks are cancelled', () => {
  const h = harness(); h.controller.beginConfirmation(); const stale = [...h.c.pending.keys()];
  assert.equal(stale[0],0); h.controller.clearConfirmation();
  h.countdown.textContent = 'sentinel'; stale.forEach(h.c.force);
  assert.equal(h.countdown.textContent,'sentinel'); assert.equal(h.c.pending.size,0);
  assert.equal(h.events.includes('normal'),false);
});
test('new confirmation supersedes its predecessor and early open cancels both resources', () => {
  const h = harness(); h.controller.beginConfirmation(); const old = [...h.c.pending.keys()];
  h.c.advance(1000); h.controller.beginConfirmation(); old.forEach(h.c.force);
  assert.equal(h.countdown.textContent,'8'); assert.equal(h.c.pending.size,2);
  h.controller.openNow(); old.forEach(h.c.force); h.c.advance(8000);
  assert.equal(h.events.filter(e=>Array.isArray(e)&&e[0]==='normal_opened').length,1);
  assert.equal(h.c.pending.size,1);
});
test('clear confirmation is independent of bypass; manual cancellation emits no outcome', () => {
  const h = harness(); h.controller.openNow(); h.controller.clearConfirmation(); assert.equal(h.c.pending.size,1);
  const stale = [...h.c.pending.keys()][0]; h.controller.cancelBypass(); h.c.force(stale);
  assert.equal(h.c.pending.size,0); assert.equal(h.events.length,3);
});
test('expiry callback is single-use even if forcibly invoked twice', () => {
  const h = harness(); h.controller.openNow(); const id = [...h.c.pending.keys()][0];
  h.c.advance(300000); h.c.force(id);
  assert.equal(h.events.filter(e=>Array.isArray(e)&&e[0]==='focus_returned').length,1);
});
test('late normalized expiry is invalidated by cancellation, restart, reopening or mode exit', () => {
  for (const action of ['cancel','restart','reopen','exit']) {
    const h = harness({destination:'focused-conversation'}); h.controller.openNow(); h.c.advance(300000);
    if (action==='cancel') h.controller.cancelBypass();
    if (action==='restart') { h.controller.dispose(); h.controller.start(); }
    if (action==='reopen') h.controller.openNow();
    if (action==='exit') h.setMode(false);
    h.callbacks[0](); assert.equal(h.events.includes('focused'),false,action);
  }
});
test('dispose rejects work and restart schedules only fresh work', () => {
  const h = harness(); h.controller.openNow(); h.controller.beginConfirmation(); const stale = [...h.c.pending.keys()];
  h.controller.dispose(); h.controller.dispose(); const count = h.events.length;
  h.controller.beginConfirmation(); h.controller.openNow(); h.controller.clearConfirmation(); stale.forEach(h.c.force);
  assert.equal(h.c.pending.size,0); assert.equal(h.events.length,count);
  h.controller.start(); h.controller.start(); assert.equal(h.c.pending.size,0);
  h.controller.beginConfirmation(); h.c.advance(8000); assert.equal(h.c.pending.size,1);
});
test('render reentry cannot resurrect cancelled or disposed confirmation', () => {
  for (const method of ['clearConfirmation','dispose']) {
    const h = harness(); h.ui.setCountdown = () => h.controller[method]();
    h.controller.beginConfirmation(); assert.equal(h.c.pending.size,0,method);
    h.c.advance(8000); assert.equal(h.events.includes('normal'),false);
  }
});
test('render replacement keeps only the latest confirmation chain', () => {
  const h = harness(); let once = true;
  h.ui.updateWarning = () => { if (once) { once=false; h.controller.beginConfirmation(); } };
  h.controller.beginConfirmation(); assert.equal(h.c.pending.size,2); h.c.advance(8000);
  assert.equal(h.events.filter(e=>Array.isArray(e)&&e[0]==='normal_opened').length,1);
});
test('event reentry cancelling bypass cannot revive opening after finish or record', () => {
  for (const callback of ['finishNormalAttempt','recordNormalOpenedAt','setNormal']) {
    const h = harness(); let controller;
    const deps = {...h.dependencies, [callback]:()=>controller.cancelBypass()};
    controller = createNormalMode(deps); controller.openNow(); assert.equal(h.c.pending.size,0,callback);
  }
});
test('expiry event reentry rejects its obsolete destination', () => {
  const h = harness(); let controller;
  controller = createNormalMode({...h.dependencies,recordAwareness:()=>controller.cancelBypass()});
  controller.openNow(); h.c.advance(300000); assert.equal(h.events.includes('blind'),false);
});

test('a confirmation requested during opening supersedes the unfinished opening', () => {
  for (const hook of ['finishNormalAttempt', 'reset', 'recordNormalOpenedAt', 'setNormal']) {
    const h = harness(); let controller, once = true;
    const reenter = () => { if (once) { once = false; controller.beginConfirmation(); } };
    const deps = { ...h.dependencies, ui: { ...h.ui } };
    if (hook === 'reset') deps.ui.reset = reenter;
    else deps[hook] = reenter;
    controller = createNormalMode(deps);
    controller.openNow();
    assert.equal(h.c.pending.size, 2, hook);
    assert.equal(h.countdown.textContent, '8', hook);
    assert.equal(h.classes.has('mwf-normal-pending'), true, hook);
  }
});

test('superseding an opening releases its old bypass without cancelling new confirmation', () => {
  const h = harness(); let controller, replace = false;
  controller = createNormalMode({ ...h.dependencies, finishNormalAttempt: () => {
    if (replace) { replace = false; controller.beginConfirmation(); }
  } });
  controller.openNow(); const old = [...h.c.pending.keys()][0];
  replace = true; controller.openNow();
  assert.equal(h.c.pending.size, 2); h.c.force(old);
  assert.equal(h.events.includes('blind'), false);
});

test('expiry chooses destination when firing, not when opening', () => {
  const h = harness(); let destination = 'blind-overlay', reads = 0;
  const controller = createNormalMode({ ...h.dependencies,
    chooseExpiryDestination: () => { reads++; return destination; } });
  controller.openNow(); assert.equal(reads, 0);
  destination = 'focused-conversation'; h.c.advance(300000);
  assert.equal(reads, 1); assert.equal(h.callbacks.length, 1);
  assert.equal(h.events.includes('blind'), false);
});

test('expiry normalization completion is single-use', () => {
  const h = harness({ destination: 'focused-conversation' });
  h.controller.openNow(); h.c.advance(300000); h.callbacks[0]();
  h.setMode(true); // A duplicate completion must not act on another normal surface.
  h.callbacks[0]();
  assert.equal(h.events.filter(e => e === 'focused').length, 1);
});

test('reopening normal cancels previous expiry and restarts its deadline', () => {
  const h = harness(); h.controller.openNow(); h.c.advance(1000); h.controller.openNow();
  h.c.advance(299999); assert.equal(h.events.filter(e => Array.isArray(e) && e[0] === 'focus_returned').length,0);
  h.c.advance(1); assert.equal(h.events.filter(e => Array.isArray(e) && e[0] === 'focus_returned').length,1);
});
