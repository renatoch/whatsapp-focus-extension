// Pre-extraction characterization was executed against the VM bridge (153/153).
// These integration checks now connect the real factories to still-composed wiring.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../content.js'), 'utf8');
const { createNormalMode } = require('../scripts/normal-mode.js');
const { createModeController } = require('../scripts/mode-controller.js');
function extract(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.notEqual(start, -1);
  return source.slice(start, source.indexOf('\n  function ', start + 1));
}
function harness() {
  const events = [], pending = new Map(), flags = new Set(), listeners = {};
  let time = 1000000, id = 0;
  const scheduler = { setTimeout: (fn, delay) => { pending.set(++id,{fn,delay}); return id; }, clearTimeout: id => pending.delete(id),
    setInterval: (fn, delay) => { pending.set(++id,{fn,delay}); return id; }, clearInterval: id => pending.delete(id) };
  const classes = Object.fromEntries(['active','normal','searching','searchFocused','searchTooShort','searchWaiting','sidebarOpen','sidebarHidden','overlayOpen','openingRecent'].map(k => [k,k]));
  const root = { classList: { add: (...vs) => vs.forEach(v => flags.add(v)), remove: (...vs) => vs.forEach(v => flags.delete(v)),
    contains: v => flags.has(v), toggle: (v,on) => on ? flags.add(v) : flags.delete(v) } };
  const noop = () => {};
  const surfaces = Object.fromEntries(['ensureOverlay','ensureReturnButton','ensureSidebarButton','ensureSearchAgainButton','ensureSearchGateMessage','ensureFocusedRecentsShelf','ensureAddCollectionButton','ensureFixedCollectionChooser','renderFocusedRecents','renderFixedCollections'].map(k => [k,noop]));
  surfaces.getOverlay = () => ({hidden:false});
  const mode = createModeController({ classes, getRoot: () => root, scheduler, isReady: () => true,
    cancelFocusedNavigation: noop, cancelRecentCapture: noop, closeChooser: noop, cancelPendingNormalAttempt: noop,
    clearIntentPrompt: noop, clearNormalDelay: () => normal.clearConfirmation(), updateFocusStreak: noop, resetSearchGate: noop,
    collapseFixedCollection: noop, updateSearchNavigation: noop, normalizeChats: cb => cb(), focusNativeSearch: noop, captureFocusedConversation: noop, surfaces });
  const context = vm.createContext({ normalAttemptStartedAt: time, pendingIntent: { attemptId:'synthetic',intent:'check-reply',note:'authored' },
    Date: { now: () => time }, recordAwareness: (type, details) => events.push([type, JSON.parse(JSON.stringify(details))]) });
  vm.runInContext(extract('normalAttemptDuration')+'\n'+extract('finishNormalAttempt'), context);
  const normal = createNormalMode({ scheduler, now: () => time, delayMs:8000, tickMs:200, bypassMs:300000, recentWindowMs:600000,
    readLastNormalOpenedAt: () => null, recordNormalOpenedAt: () => events.push('record-open'),
    onAttemptStarted: () => { context.normalAttemptStartedAt = time; context.recordAwareness('attempt_started',{}); },
    finishNormalAttempt: context.finishNormalAttempt, recordAwareness: context.recordAwareness,
    setNormal: () => { events.push('normal'); mode.setNormal(); }, setActive: options => mode.setActive(options), setFocused: mode.setFocused,
    isNormalMode: () => flags.has('normal'), chooseExpiryDestination: () => 'blind-overlay', normalizeChats: cb => cb(),
    ui: { prepare: () => true, reset: noop, setPending: noop, setRecent: noop, updateWarning: noop, setCountdown: noop } });
  Object.assign(context, {normalMode:normal, root: () => root, ROOT_NORMAL:'normal', ROOT_ACTIVE:'active',
    setActive: mode.setActive, document: { body:{}, getElementById: () => null, createElement: () => ({addEventListener: (name,cb) => {listeners.button = cb;}}),
      addEventListener: (name,cb) => {listeners[name] = cb;} }, getControlsContainer: () => ({appendChild:noop}), RETURN_ID:'return',
    recordAwareness: context.recordAwareness, canToggleSidebar: () => false });
  return {normal,mode,context,pending,events,flags,listeners,setTime: value => {time=value;}};
}

test('real mode transition cleanup does not cancel its own newly scheduled bypass', () => {
  const h = harness(); h.normal.beginConfirmation(); h.setTime(1001000); h.normal.openNow();
  assert.equal(h.flags.has('normal'),true); assert.equal(h.pending.size,1);
  assert.equal([...h.pending.values()][0].delay,300000);
  assert.deepEqual(h.events.slice(1), [['normal_opened',{durationMs:1000,route:'immediate'}],
    ['intent_outcome',{attemptId:'synthetic',intent:'check-reply',note:'authored',decision:'opened',durationMs:1000,route:'immediate'}], 'record-open','normal']);
  assert.equal(h.context.pendingIntent,null);
});

test('real active mode cleanup cancels confirmation without cancelling an unrelated bypass', () => {
  const h = harness(); h.normal.openNow(); h.normal.beginConfirmation(); assert.equal(h.pending.size,3);
  h.mode.setActive({showOverlay:true}); assert.equal(h.pending.size,1); assert.equal(h.flags.has('active'),true);
});

for (const route of ['button','keydown']) test(`manual ${route} records once and cancels bypass before focus`, () => {
  const h = harness(); h.normal.openNow();
  vm.runInContext(route === 'button' ? extract('ensureReturnButton')+'\nensureReturnButton();' : extract('installKeyboardShortcuts')+'\ninstallKeyboardShortcuts();', h.context);
  const event = {altKey:true,shiftKey:true,key:'f',preventDefault(){},stopImmediatePropagation(){}};
  h.listeners[route](event); assert.equal(h.pending.size,0); assert.equal(h.flags.has('active'),true);
  h.listeners[route](event);
  assert.equal(h.events.filter(e => Array.isArray(e) && e[0] === 'focus_returned').length,1);
});

test('Continue retains intent outcome and normalization/focused/capture order with real normal factory', () => {
  const h = harness(); const sequence = [];
  h.normal.beginConfirmation(); h.setTime(1000500);
  h.context.finishNormalAttempt('continued_focused_conversation'); h.normal.clearConfirmation();
  Object.assign(h.context, {debugLog(){}, isWhatsAppReady:()=>true, hasOpenConversation:()=>true,
    findNativeSearchField:()=>null, describeElement:()=>null, isNestedListView:()=>false,
    readActiveConversationTitle:()=> 'Synthetic',
    goToMainChatsThen: (_route,cb)=>{sequence.push('normalize');cb();},
    setActive: options=>{sequence.push('active');h.mode.setActive(options);},
    setSearchFocusedConversation:()=>{sequence.push('focused');h.mode.setFocused();},
    captureFocusedConversation:(_title,_attempt,route)=>sequence.push(['capture',route])});
  vm.runInContext(extract('continueOpenConversation')+'\ncontinueOpenConversation();',h.context);
  assert.deepEqual(sequence,['normalize','active','focused',['capture',null]]);
  assert.equal(h.pending.size,0);
  assert.equal(h.events.some(e => Array.isArray(e) && e[0] === 'focused_conversation_opened'),false);
  assert.equal(h.events.find(e => Array.isArray(e) && e[0] === 'intent_outcome')[1].decision,'continued-focused');
});
