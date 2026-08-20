(function exposeAwareness(globalScope) {
  "use strict";

  const VERSION = 2;
  const STORAGE_KEY = "mirror-whatsapp-focus-awareness-v2";
  const LEGACY_STORAGE_KEY = "mirror-whatsapp-focus-awareness-v1";
  const DAY_MS = 24 * 60 * 60 * 1000;
  const BASELINE_MS = 7 * DAY_MS;
  const RETENTION_MS = 14 * DAY_MS;
  const SHORT_REOPEN_MS = 10 * 60 * 1000;
  const FAST_SEQUENCE_MS = 2000;
  const MAX_EVENTS = 500;
  const MAX_REFLECTIONS = 30;
  const MAX_NOTE_LENGTH = 280;

  const INTENT_CATEGORIES = Object.freeze([
    "specific-task",
    "check-reply",
    "see-whats-new",
    "pause-escape",
    "mixed-unclear",
  ]);

  const EVENT_RULES = Object.freeze({
    attempt_started: {},
    normal_opened: { durationMs: "duration", route: ["countdown", "immediate", "recent-explicit"] },
    attempt_cancelled: { durationMs: "duration" },
    continued_focused_conversation: { durationMs: "duration" },
    focus_returned: { reason: ["manual", "expiry"] },
    intent_outcome: {
      attemptId: "identifier",
      intent: INTENT_CATEGORIES,
      note: "note",
      decision: ["opened", "not-open", "cancelled", "continued-focused"],
      promptDurationMs: "duration",
      durationMs: "duration",
      route: ["countdown", "immediate", "recent-explicit"],
    },
  });

  const REFLECTION_CATEGORIES = Object.freeze([
    "specific-intent",
    "waiting-for-reply",
    "anguish-boredom",
    "automatism",
    "mixed-unclear",
  ]);

  function freshState(now) {
    return { version: VERSION, startedAt: now, enabled: true, events: [], reflections: [] };
  }

  function finiteTimestamp(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  function finiteDuration(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
  }

  function sanitizeIdentifier(value) {
    const text = String(value || "");
    return /^[a-zA-Z0-9-]{1,80}$/.test(text) ? text : null;
  }

  function sanitizeNote(value) {
    if (typeof value !== "string") return null;
    const note = value.trim().slice(0, MAX_NOTE_LENGTH);
    return note || null;
  }

  function sanitizeEvent(type, details, at, defaultPhase = 2) {
    const rules = EVENT_RULES[type];
    if (!rules) return null;
    const phase = details?.phase === 1 || details?.phase === 2 ? details.phase : defaultPhase;
    const event = { type, at, phase };

    for (const [field, rule] of Object.entries(rules)) {
      const value = details?.[field];
      if (rule === "duration") {
        const duration = finiteDuration(value);
        if (duration !== null) event[field] = duration;
      } else if (rule === "identifier") {
        const identifier = sanitizeIdentifier(value);
        if (identifier) event[field] = identifier;
      } else if (rule === "note") {
        const note = sanitizeNote(value);
        if (note) event[field] = note;
      } else if (Array.isArray(rule) && rule.includes(value)) {
        event[field] = value;
      }
    }

    if (type === "normal_opened" && !event.route) return null;
    if (type === "focus_returned" && !event.reason) return null;
    if (type === "intent_outcome" && (!event.attemptId || !event.intent || !event.decision)) return null;
    return event;
  }

  function pruneState(state, now) {
    const oldestAllowed = now - RETENTION_MS;
    return {
      ...state,
      events: state.events
        .filter((event) => event.at >= oldestAllowed && event.at <= now + DAY_MS)
        .sort((left, right) => left.at - right.at)
        .slice(-MAX_EVENTS),
      reflections: state.reflections
        .filter((item) => item.at >= oldestAllowed && item.at <= now + DAY_MS)
        .sort((left, right) => left.at - right.at)
        .slice(-MAX_REFLECTIONS),
    };
  }

  function normalizeState(candidate, now) {
    if (!candidate || (candidate.version !== 1 && candidate.version !== VERSION)) return freshState(now);
    const legacy = candidate.version === 1;
    const events = Array.isArray(candidate.events)
      ? candidate.events
          .map((event) => {
            const at = finiteTimestamp(event?.at);
            return at ? sanitizeEvent(event.type, event, at, legacy ? 1 : 2) : null;
          })
          .filter(Boolean)
      : [];
    const reflections = Array.isArray(candidate.reflections)
      ? candidate.reflections
          .map((item) => {
            const at = finiteTimestamp(item?.at);
            if (!at || !REFLECTION_CATEGORIES.includes(item?.category)) return null;
            return { at, category: item.category, phase: item.phase === 2 ? 2 : 1 };
          })
          .filter(Boolean)
      : [];

    return pruneState({
      version: VERSION,
      startedAt: finiteTimestamp(candidate.startedAt) || now,
      enabled: candidate.enabled !== false,
      events,
      reflections,
    }, now);
  }

  function safeParse(raw) {
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    try { return JSON.parse(raw); } catch (_error) { return null; }
  }

  function localDayStart(timestamp) {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  function summarizeEvents(events, now) {
    const openings = events.filter((event) => event.type === "normal_opened");
    let shortReopenings = 0;
    for (let index = 1; index < openings.length; index += 1) {
      if (openings[index].at - openings[index - 1].at <= SHORT_REOPEN_MS) shortReopenings += 1;
    }
    const count = (type, predicate = () => true) => events.filter((e) => e.type === type && predicate(e)).length;
    return {
      openings: openings.length,
      openingsToday: openings.filter((event) => event.at >= localDayStart(now) && event.at <= now).length,
      shortReopenings,
      fastSequences: openings.filter((event) => event.durationMs <= FAST_SEQUENCE_MS).length,
      openingRoutes: {
        countdown: openings.filter((event) => event.route === "countdown").length,
        immediate: openings.filter((event) => event.route === "immediate").length,
        recentExplicit: openings.filter((event) => event.route === "recent-explicit").length,
      },
      cancelledAttempts: count("attempt_cancelled"),
      continuedFocusedConversation: count("continued_focused_conversation"),
      manualFocusReturns: count("focus_returned", (event) => event.reason === "manual"),
      expiredFocusReturns: count("focus_returned", (event) => event.reason === "expiry"),
    };
  }

  function selectPrimarySignal(summary) {
    if (summary.openings === 0) {
      return summary.cancelledAttempts + summary.continuedFocusedConversation >= 2
        ? "pause-created-choice" : "collecting";
    }
    if (summary.shortReopenings >= 2 && summary.shortReopenings / summary.openings >= 0.4) return "repeated-openings";
    if (summary.fastSequences >= 2 && summary.fastSequences / summary.openings >= 0.5) return "fast-sequence";
    const direct = summary.openingRoutes.immediate + summary.openingRoutes.recentExplicit;
    if (direct >= 2 && direct / summary.openings >= 0.5) return "direct-openings";
    if (summary.cancelledAttempts + summary.continuedFocusedConversation >= 2) return "pause-created-choice";
    return "no-strong-pattern";
  }

  function summarizeIntent(events) {
    const outcomes = events.filter((event) => event.type === "intent_outcome" && event.phase === 2);
    const categories = Object.fromEntries(INTENT_CATEGORIES.map((category) => [category, 0]));
    const decisions = { opened: 0, notOpen: 0, cancelled: 0, continuedFocused: 0 };
    let promptDurationTotal = 0;
    let promptDurationCount = 0;
    for (const event of outcomes) {
      categories[event.intent] += 1;
      if (event.decision === "opened") decisions.opened += 1;
      if (event.decision === "not-open") decisions.notOpen += 1;
      if (event.decision === "cancelled") decisions.cancelled += 1;
      if (event.decision === "continued-focused") decisions.continuedFocused += 1;
      if (Number.isFinite(event.promptDurationMs)) {
        promptDurationTotal += event.promptDurationMs;
        promptDurationCount += 1;
      }
    }
    return {
      total: outcomes.length,
      categories,
      decisions,
      averagePromptDurationMs: promptDurationCount ? Math.round(promptDurationTotal / promptDurationCount) : null,
      notes: outcomes.filter((event) => event.note).map((event) => ({
        at: event.at, intent: event.intent, decision: event.decision, note: event.note,
      })),
    };
  }

  function summarize(state, now) {
    const all = summarizeEvents(state.events, now);
    const phase1 = summarizeEvents(state.events.filter((event) => event.phase === 1), now);
    const phase2 = summarizeEvents(state.events.filter((event) => event.phase === 2), now);
    phase1.primarySignal = selectPrimarySignal(phase1);
    phase2.primarySignal = selectPrimarySignal(phase2);
    return {
      enabled: state.enabled,
      startedAt: state.startedAt,
      observationDays: Math.max(1, Math.floor((now - state.startedAt) / DAY_MS) + 1),
      baselineComplete: now - state.startedAt >= BASELINE_MS,
      ...all,
      primarySignal: selectPrimarySignal(all),
      phases: { phase1, phase2 },
      intent: summarizeIntent(state.events),
      latestReflection: state.reflections.at(-1) || null,
    };
  }

  function createStore(storage, options = {}) {
    const now = typeof options.now === "function" ? options.now : () => Date.now();
    const key = options.key || STORAGE_KEY;
    const defaultPhase = options.defaultPhase === 1 ? 1 : 2;
    let transientState = null;

    function read() {
      let raw = null;
      try { raw = storage?.getItem?.(key); } catch (_error) {}
      const state = normalizeState(safeParse(raw) || transientState, now());
      transientState = state;
      return state;
    }

    function write(state) {
      const normalized = normalizeState(state, now());
      transientState = normalized;
      try { storage?.setItem?.(key, JSON.stringify(normalized)); } catch (_error) {}
      return normalized;
    }

    return {
      getState: read,
      record(type, details = {}) {
        const state = read();
        if (!state.enabled) return state;
        const event = sanitizeEvent(type, details, now(), defaultPhase);
        return event ? write({ ...state, events: [...state.events, event] }) : state;
      },
      getSummary() { const time = now(); return summarize(normalizeState(read(), time), time); },
      setEnabled(enabled) { return write({ ...read(), enabled: Boolean(enabled) }); },
      saveReflection(category) {
        const state = read();
        const time = now();
        if (time - state.startedAt < BASELINE_MS || !REFLECTION_CATEGORIES.includes(category)) return false;
        write({ ...state, reflections: [...state.reflections, { at: time, category, phase: defaultPhase }] });
        return true;
      },
      clear() {
        try { storage?.removeItem?.(key); } catch (_error) {}
        transientState = freshState(now());
        return transientState;
      },
    };
  }

  function createChromeStorageAdapter(storageArea) {
    return {
      async getItem(key) { const result = await storageArea.get(key); return result?.[key] ?? null; },
      async setItem(key, value) { await storageArea.set({ [key]: value }); },
      async removeItem(key) { await storageArea.remove(key); },
    };
  }

  function createPersistentStore(adapter, options = {}) {
    const now = typeof options.now === "function" ? options.now : () => Date.now();
    const memory = new Map();
    const memoryStorage = {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, String(value)),
      removeItem: (key) => memory.delete(key),
    };
    const store = createStore(memoryStorage, { now, defaultPhase: 2 });
    let initialized = false;
    let persistChain = Promise.resolve();

    function persist() {
      const raw = memoryStorage.getItem(STORAGE_KEY);
      persistChain = persistChain.then(() => adapter.setItem(STORAGE_KEY, raw)).catch(() => {});
      return persistChain;
    }

    return {
      async initialize(legacyStorage) {
        if (initialized) return { migrated: false };
        let isolatedRaw = null;
        try { isolatedRaw = await adapter.getItem(STORAGE_KEY); } catch (_error) {}
        const isolated = safeParse(isolatedRaw);
        const isolatedValid = isolated && (isolated.version === 1 || isolated.version === VERSION);
        if (isolatedValid) {
          memoryStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(isolated, now())));
          initialized = true;
          try { legacyStorage?.removeItem?.(LEGACY_STORAGE_KEY); } catch (_error) {}
          return { migrated: false };
        }

        let legacyRaw = null;
        try { legacyRaw = legacyStorage?.getItem?.(LEGACY_STORAGE_KEY); } catch (_error) {}
        const legacy = safeParse(legacyRaw);
        const normalized = normalizeState(legacy, now());
        memoryStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        try {
          await adapter.setItem(STORAGE_KEY, JSON.stringify(normalized));
          const verified = safeParse(await adapter.getItem(STORAGE_KEY));
          if (!verified) throw new Error("Awareness migration verification failed");
          if (legacy) legacyStorage?.removeItem?.(LEGACY_STORAGE_KEY);
          initialized = true;
          return { migrated: Boolean(legacy) };
        } catch (error) {
          initialized = true;
          return { migrated: false, error };
        }
      },
      getState: store.getState,
      getSummary: store.getSummary,
      record(type, details) { const state = store.record(type, details); void persist(); return state; },
      setEnabled(enabled) { const state = store.setEnabled(enabled); void persist(); return state; },
      saveReflection(category) { const saved = store.saveReflection(category); if (saved) void persist(); return saved; },
      clear() {
        const state = store.clear();
        persistChain = persistChain.then(() => adapter.removeItem(STORAGE_KEY)).catch(() => {});
        return state;
      },
      flush() { return persistChain; },
    };
  }

  const api = Object.freeze({
    VERSION, STORAGE_KEY, LEGACY_STORAGE_KEY, DAY_MS, BASELINE_MS, RETENTION_MS,
    MAX_EVENTS, MAX_NOTE_LENGTH, REFLECTION_CATEGORIES, INTENT_CATEGORIES,
    createStore, createChromeStorageAdapter, createPersistentStore,
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (globalScope) globalScope.MirrorAwareness = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
