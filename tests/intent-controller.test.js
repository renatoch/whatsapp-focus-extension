const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../content.js'), 'utf8');
function extract(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.notEqual(start, -1);
  return source.slice(start, source.indexOf('\n  function ', start + 1));
}
function harness({ present = true } = {}) {
  let time = 1000000, selected = null;
  const events = [], effects = [], note = { value: 'old' }, message = { textContent: 'old' }, radio = { checked: true };
  const classes = new Set();
  const overlay = { classList: { add: v => classes.add(v), remove: v => classes.delete(v) },
    querySelectorAll: () => [radio], querySelector: selector => selector.includes(':checked') ? selected : selector.includes('note') ? note : message };
  const record = (type, details = {}) => events.push([type, JSON.parse(JSON.stringify(details))]);
  // Only still-composed field rendering/reading uses a VM bridge.
  const context = vm.createContext({ getOverlay: () => present ? overlay : null });
  vm.runInContext(['readIntentInput','showIntentPrompt'].map(extract).join('\n'), context);
  const dependencies = { now: () => time, createAttemptId: () => 'synthetic-id', recordAwareness: record,
    resetRecentAttempt: () => effects.push('reset-recent'),
    closeSummary: () => effects.push('close-summary'), clearConfirmation: () => effects.push('clear-delay'),
    beginConfirmation: () => { effects.push('begin-confirmation'); controller.beginAttempt(); },
    setActive: () => effects.push('active'),
    ui: { hasOverlay: () => present, showPrompt: context.showIntentPrompt, readInput: context.readIntentInput,
      hidePrompt: () => classes.delete('mwf-intent-pending') } };
  const controller = require('../scripts/intent-controller.js').createIntentController(dependencies);
  return { controller, dependencies, events, effects, classes, note, message, radio, advance: ms => {time += ms;},
    select: (intent = 'check-reply', text = 'authored note') => { selected = {value:intent}; note.value = text; } };
}

test('intent prompt requires overlay and resets fields only when opened', () => {
  const absent = harness({present:false}); absent.controller.begin(); assert.deepEqual(absent.effects, []);
  const h = harness(); h.controller.begin();
  assert.deepEqual(h.effects, ['close-summary','clear-delay']); assert.equal(h.radio.checked,false);
  assert.equal(h.note.value,''); assert.equal(h.message.textContent,''); assert.equal(h.classes.has('mwf-intent-pending'),true);
});
test('missing choice does not start confirmation, emit events or dismiss prompt', () => {
  const h = harness(); h.controller.begin(); h.controller.proceed(); h.controller.decline();
  assert.deepEqual(h.events,[]); assert.equal(h.classes.has('mwf-intent-pending'),true);
  assert.equal(h.message.textContent,'Escolha a opção que mais se aproxima agora.');
});
test('declaration is associated only when the attempt finishes, with separate durations', () => {
  for (const [type, decision] of [['normal_opened','opened'],['attempt_cancelled','cancelled'],['continued_focused_conversation','continued-focused']]) {
    const h = harness(); h.controller.begin(); h.select(); h.advance(300); h.controller.proceed();
    assert.deepEqual(h.events,[['attempt_started',{}]]); assert.equal(h.classes.has('mwf-intent-pending'),false);
    h.advance(800); h.controller.finishAttempt(type,{route:'immediate'});
    assert.deepEqual(h.events.slice(1),[[type,{durationMs:800,route:'immediate'}],['intent_outcome',{
      attemptId:'synthetic-id',intent:'check-reply',note:'authored note',promptDurationMs:300,
      decision,durationMs:800,route:'immediate'}]]);
    h.controller.cancelPendingAttempt(); assert.equal(h.events.length,3);
    assert.equal(h.effects.at(-1),'reset-recent');
  }
});
test('decline emits one authored outcome without opening normal', () => {
  const h = harness(); h.controller.begin(); h.select(); h.advance(200); h.controller.decline();
  assert.deepEqual(h.events,[['intent_outcome',{attemptId:'synthetic-id',intent:'check-reply',note:'authored note',promptDurationMs:200,decision:'not-open'}]]);
  assert.equal(h.effects.includes('begin-confirmation'),false); assert.equal(h.classes.has('mwf-intent-pending'),false);
});
test('pre-declaration return records duration without collecting selection or authored note', () => {
  const h = harness(); h.controller.begin(); h.select(); h.advance(400); h.controller.returnToFocus();
  assert.deepEqual(h.events,[['intent_prompt_exited',{durationMs:400,destination:'focus-overlay'}]]);
  assert.equal(h.effects.at(-1),'active'); assert.equal(h.classes.has('mwf-intent-pending'),false);
});
test('dispose clears private association and rejects operations until restarted', () => {
  const h = harness(); h.controller.begin(); h.select(); h.controller.proceed();
  h.controller.dispose(); h.controller.dispose(); const before = [h.events.length, h.effects.length];
  for (const method of ['begin','proceed','decline','returnToFocus','clearPrompt','beginAttempt','cancelPendingAttempt']) h.controller[method]();
  h.controller.finishAttempt('normal_opened'); assert.deepEqual([h.events.length,h.effects.length],before);
  h.controller.start(); h.controller.start(); h.controller.cancelPendingAttempt();
  assert.deepEqual([h.events.length,h.effects.length],before);
  h.controller.begin(); h.select(); h.controller.proceed(); h.controller.finishAttempt('normal_opened');
  assert.equal(h.events.filter(e=>e[0]==='intent_outcome').length,1);
});
test('mode prompt cleanup does not discard a pending attempt association', () => {
  const h = harness(); h.controller.begin(); h.select(); h.controller.proceed();
  h.controller.clearPrompt(); h.controller.cancelPendingAttempt();
  assert.equal(h.events.at(-1)[1].decision,'cancelled');
});
test('reentrant event sink cannot hide a newly opened prompt or reset its recent route', () => {
  for (const operation of ['decline','returnToFocus','finishAttempt']) {
    const h = harness(); let controller, armed = false;
    const deps = {...h.dependencies, beginConfirmation:()=>controller.beginAttempt(),
      recordAwareness:(...args)=>{h.dependencies.recordAwareness(...args); if(armed) {armed=false; controller.begin();}}};
    controller = require('../scripts/intent-controller.js').createIntentController(deps);
    controller.begin(); h.select(); if(operation==='finishAttempt') controller.proceed();
    armed=true; controller[operation]('normal_opened');
    assert.equal(h.classes.has('mwf-intent-pending'),true,operation);
    assert.equal(h.effects.includes('active'),false,operation);
    assert.equal(h.effects.includes('reset-recent'),false,operation);
  }
});
test('reentrant field callbacks invalidate the old decision', () => {
  const h = harness(); let controller;
  controller = require('../scripts/intent-controller.js').createIntentController({...h.dependencies,
    ui:{...h.dependencies.ui, readInput:()=>{controller.dispose();return {intent:'check-reply',note:'authored'};}}});
  controller.begin(); controller.proceed(); assert.deepEqual(h.events,[]);
  assert.equal(h.effects.includes('begin-confirmation'),false);
});
test('unknown attempt outcomes retain aggregate event but do not invent intent decisions', () => {
  const h = harness(); h.controller.begin(); h.select(); h.controller.proceed();
  h.controller.finishAttempt('synthetic-unknown'); h.controller.cancelPendingAttempt();
  assert.deepEqual(h.events,[['attempt_started',{}],['synthetic-unknown',{durationMs:0}]]);
});

test('a new prompt discards the previous declaration rather than associating it twice', () => {
  const h = harness(); h.controller.begin(); h.select(); h.controller.proceed(); h.controller.begin();
  h.controller.finishAttempt('attempt_cancelled');
  assert.equal(h.events.some(e => e[0] === 'intent_outcome'),false);
});
