const test = require('node:test');
const assert = require('node:assert/strict');
const Awareness = require('../awareness.js');

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

const DAY = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 6, 1, 12);

function setup({ now = START, initial } = {}) {
  let currentTime = now;
  const storage = new MemoryStorage(initial);
  const store = Awareness.createStore(storage, {
    now: () => currentTime,
  });
  return {
    store,
    storage,
    setNow(value) {
      currentTime = value;
    },
  };
}

test('creates a versioned empty state without sensitive fields', () => {
  const { store } = setup();
  const state = store.getState();

  assert.deepEqual(state, {
    version: 2,
    startedAt: START,
    enabled: true,
    events: [],
    reflections: [],
  });
});

test('records only allowlisted event fields and strips unknown data', () => {
  const { store } = setup();
  store.record('normal_opened', {
    durationMs: 1250,
    route: 'immediate',
    message: 'secret',
    jid: 'private@g.us',
    contactName: 'Someone',
  });

  assert.deepEqual(store.getState().events, [
    {
      type: 'normal_opened',
      at: START,
      phase: 2,
      durationMs: 1250,
      route: 'immediate',
    },
  ]);
});

test('rejects unsupported events and enum values', () => {
  const { store } = setup();

  store.record('message_read', { route: 'unknown' });
  store.record('normal_opened', { route: 'unknown' });

  assert.equal(store.getState().events.length, 0);
});

test('does not record while collection is disabled', () => {
  const { store } = setup();
  store.setEnabled(false);
  store.record('attempt_started');

  const state = store.getState();
  assert.equal(state.enabled, false);
  assert.equal(state.events.length, 0);
});

test('prunes events older than 14 days and enforces event cap', () => {
  const { store, setNow } = setup();
  store.record('attempt_started');

  setNow(START + 15 * DAY);
  for (let index = 0; index < Awareness.MAX_EVENTS + 20; index += 1) {
    store.record('attempt_started');
  }

  const state = store.getState();
  assert.equal(state.events.length, Awareness.MAX_EVENTS);
  assert.ok(state.events.every((event) => event.at === START + 15 * DAY));
});

test('summarizes opening routes, repeated openings, fast sequences, and outcomes', () => {
  const { store, setNow } = setup();

  store.record('normal_opened', { route: 'countdown', durationMs: 8000 });
  setNow(START + 5 * 60 * 1000);
  store.record('normal_opened', { route: 'recent-explicit', durationMs: 900 });
  setNow(START + 7 * 60 * 1000);
  store.record('attempt_cancelled', { durationMs: 1300 });
  store.record('focus_returned', { reason: 'manual' });
  store.record('focus_returned', { reason: 'expiry', expiryDestination: 'focused-conversation' });
  store.record('focus_returned', { reason: 'expiry', expiryDestination: 'blind-overlay' });
  store.record('focus_returned', { reason: 'expiry', expiryDestination: 'not-allowed', contactName: 'Someone' });
  store.record('continued_focused_conversation', { durationMs: 500 });

  const summary = store.getSummary();
  assert.equal(summary.openings, 2);
  assert.equal(summary.openingsToday, 2);
  assert.equal(summary.shortReopenings, 1);
  assert.equal(summary.fastSequences, 1);
  assert.deepEqual(summary.openingRoutes, {
    countdown: 1,
    immediate: 0,
    recentExplicit: 1,
  });
  assert.equal(summary.cancelledAttempts, 1);
  assert.equal(summary.continuedFocusedConversation, 1);
  assert.equal(summary.manualFocusReturns, 1);
  assert.equal(summary.expiredFocusReturns, 3);
  assert.equal(summary.expiryToFocusedConversation, 1);
  assert.equal(summary.expiryToBlindOverlay, 1);
  assert.deepEqual(
    store.getState().events.filter((event) => event.reason === 'expiry').at(-1),
    { type: 'focus_returned', at: START + 7 * 60 * 1000, phase: 2, reason: 'expiry' }
  );
});

test('prioritizes repeated openings as the strongest provisional signal', () => {
  const { store, setNow } = setup();
  store.record('normal_opened', { route: 'countdown', durationMs: 8000 });
  setNow(START + 2 * 60 * 1000);
  store.record('normal_opened', { route: 'immediate', durationMs: 700 });
  setNow(START + 4 * 60 * 1000);
  store.record('normal_opened', { route: 'recent-explicit', durationMs: 600 });

  assert.equal(store.getSummary().primarySignal, 'repeated-openings');
});

test('recognizes when the pause repeatedly leads to another choice', () => {
  const { store, setNow } = setup();
  store.record('attempt_cancelled', { durationMs: 1200 });
  setNow(START + 60 * 1000);
  store.record('continued_focused_conversation', { durationMs: 900 });

  assert.equal(store.getSummary().primarySignal, 'pause-created-choice');
});

test('does not manufacture an insight from sparse data', () => {
  const { store } = setup();
  store.record('normal_opened', { route: 'countdown', durationMs: 8000 });

  assert.equal(store.getSummary().primarySignal, 'no-strong-pattern');
});

test('reports baseline progress and enables reflection after seven days', () => {
  const { store, setNow } = setup();

  assert.equal(store.getSummary().baselineComplete, false);
  assert.equal(store.getSummary().observationDays, 1);

  setNow(START + 7 * DAY);
  const summary = store.getSummary();
  assert.equal(summary.baselineComplete, true);
  assert.equal(summary.observationDays, 8);
});

test('persists only allowlisted aggregate reflection categories after baseline', () => {
  const { store, setNow } = setup();
  store.getState();
  setNow(START + 7 * DAY);

  assert.equal(store.saveReflection('automatism'), true);
  assert.equal(store.saveReflection('diagnosis-from-model'), false);
  assert.deepEqual(store.getState().reflections, [
    { at: START + 7 * DAY, category: 'automatism', phase: 2 },
  ]);
});

test('recovers safely from malformed storage', () => {
  const initial = {
    [Awareness.STORAGE_KEY]: '{not-json',
  };
  const { store } = setup({ initial });

  assert.deepEqual(store.getState(), {
    version: 2,
    startedAt: START,
    enabled: true,
    events: [],
    reflections: [],
  });
});

test('clear removes all awareness data and starts a fresh experiment', () => {
  const { store, storage, setNow } = setup();
  store.record('normal_opened', { route: 'immediate', durationMs: 100 });
  setNow(START + DAY);
  const reset = store.clear();

  assert.equal(storage.getItem(Awareness.STORAGE_KEY), null);
  assert.deepEqual(reset, {
    version: 2,
    startedAt: START + DAY,
    enabled: true,
    events: [],
    reflections: [],
  });
});

test('migrates allowlisted v1 data once and removes only the legacy key', async () => {
  const legacyState = {
    version: 1,
    startedAt: START,
    enabled: true,
    events: [{ type: 'normal_opened', at: START, durationMs: 8000, route: 'countdown', secret: 'drop' }],
    reflections: [],
  };
  const legacy = new MemoryStorage({
    [Awareness.LEGACY_STORAGE_KEY]: JSON.stringify(legacyState),
    unrelated: 'keep',
  });
  const isolated = new MemoryStorage();
  const adapter = {
    getItem: async (key) => isolated.getItem(key),
    setItem: async (key, value) => isolated.setItem(key, value),
    removeItem: async (key) => isolated.removeItem(key),
  };
  const store = Awareness.createPersistentStore(adapter, { now: () => START + DAY });

  const result = await store.initialize(legacy);
  assert.equal(result.migrated, true);
  assert.equal(legacy.getItem(Awareness.LEGACY_STORAGE_KEY), null);
  assert.equal(legacy.getItem('unrelated'), 'keep');
  assert.deepEqual(store.getState().events, [{
    type: 'normal_opened', at: START, phase: 1, durationMs: 8000, route: 'countdown',
  }]);
});

test('failed migration keeps legacy data', async () => {
  const legacy = new MemoryStorage({
    [Awareness.LEGACY_STORAGE_KEY]: JSON.stringify({ version: 1, startedAt: START, events: [], reflections: [] }),
  });
  const adapter = {
    getItem: async () => null,
    setItem: async () => { throw new Error('quota'); },
    removeItem: async () => {},
  };
  const store = Awareness.createPersistentStore(adapter, { now: () => START });

  const result = await store.initialize(legacy);
  assert.ok(result.error);
  assert.notEqual(legacy.getItem(Awareness.LEGACY_STORAGE_KEY), null);
});

test('isolated state wins over legacy data during idempotent initialization', async () => {
  const isolatedState = { version: 2, startedAt: START, enabled: true, events: [], reflections: [] };
  const isolated = new MemoryStorage({ [Awareness.STORAGE_KEY]: JSON.stringify(isolatedState) });
  const legacy = new MemoryStorage({
    [Awareness.LEGACY_STORAGE_KEY]: JSON.stringify({ version: 1, startedAt: START - DAY, events: [], reflections: [] }),
  });
  const adapter = {
    getItem: async (key) => isolated.getItem(key),
    setItem: async (key, value) => isolated.setItem(key, value),
    removeItem: async (key) => isolated.removeItem(key),
  };
  const store = Awareness.createPersistentStore(adapter, { now: () => START });

  const result = await store.initialize(legacy);
  assert.equal(result.migrated, false);
  assert.equal(store.getState().startedAt, START);
});

test('records phase 2 intent, caps notes, and separates phase summaries', () => {
  const { store } = setup();
  store.record('intent_outcome', {
    attemptId: 'attempt-1',
    intent: 'check-reply',
    note: `  ${'x'.repeat(400)}  `,
    decision: 'not-open',
    promptDurationMs: 1500,
  });

  const event = store.getState().events[0];
  assert.equal(event.phase, 2);
  assert.equal(event.note.length, Awareness.MAX_NOTE_LENGTH);
  const summary = store.getSummary();
  assert.equal(summary.intent.categories['check-reply'], 1);
  assert.equal(summary.intent.decisions.notOpen, 1);
  assert.equal(summary.phases.phase1.openings, 0);
});

test('records timed pre-declaration focus returns without inventing intent', () => {
  const { store, setNow } = setup();
  store.record('intent_prompt_exited', { durationMs: 1200, destination: 'focus-overlay', note: 'not allowed' });
  setNow(START + 1000);
  store.record('intent_prompt_exited', { durationMs: 4800, destination: 'focus-overlay' });
  store.record('intent_prompt_exited', { durationMs: 500, destination: 'unknown' });
  store.record('intent_outcome', {
    attemptId: 'attempt-pending',
    intent: 'process-pending',
    decision: 'not-open',
    promptDurationMs: 2200,
  });

  const events = store.getState().events;
  assert.deepEqual(events[0], {
    type: 'intent_prompt_exited',
    at: START,
    phase: 2,
    durationMs: 1200,
    destination: 'focus-overlay',
  });
  assert.equal(events.filter((event) => event.type === 'intent_prompt_exited').length, 2);

  const summary = store.getSummary();
  assert.equal(summary.phases.phase2.preDeclarationFocusReturns, 2);
  assert.equal(summary.phases.phase2.averagePreDeclarationReturnMs, 3000);
  assert.equal(summary.intent.categories['process-pending'], 1);
});
