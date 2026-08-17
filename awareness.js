(function exposeAwareness(globalScope) {
  "use strict";

  const VERSION = 1;
  const STORAGE_KEY = "mirror-whatsapp-focus-awareness-v1";
  const DAY_MS = 24 * 60 * 60 * 1000;
  const BASELINE_MS = 7 * DAY_MS;
  const RETENTION_MS = 14 * DAY_MS;
  const SHORT_REOPEN_MS = 10 * 60 * 1000;
  const FAST_SEQUENCE_MS = 2000;
  const MAX_EVENTS = 500;
  const MAX_REFLECTIONS = 30;

  const EVENT_RULES = Object.freeze({
    attempt_started: {},
    normal_opened: {
      durationMs: "duration",
      route: ["countdown", "immediate", "recent-explicit"],
    },
    attempt_cancelled: {
      durationMs: "duration",
    },
    continued_focused_conversation: {
      durationMs: "duration",
    },
    focus_returned: {
      reason: ["manual", "expiry"],
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
    return {
      version: VERSION,
      startedAt: now,
      enabled: true,
      events: [],
      reflections: [],
    };
  }

  function finiteTimestamp(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  function finiteDuration(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
  }

  function sanitizeEvent(type, details, at) {
    const rules = EVENT_RULES[type];
    if (!rules) return null;

    const event = { type, at };
    for (const [field, rule] of Object.entries(rules)) {
      const value = details?.[field];
      if (rule === "duration") {
        const duration = finiteDuration(value);
        if (duration !== null) event[field] = duration;
        continue;
      }
      if (Array.isArray(rule) && rule.includes(value)) event[field] = value;
    }

    if (type === "normal_opened" && !event.route) return null;
    if (type === "focus_returned" && !event.reason) return null;
    return event;
  }

  function normalizeState(candidate, now) {
    if (!candidate || candidate.version !== VERSION) return freshState(now);

    const startedAt = finiteTimestamp(candidate.startedAt) || now;
    const events = Array.isArray(candidate.events)
      ? candidate.events
          .map((event) => {
            const at = finiteTimestamp(event?.at);
            if (!at) return null;
            return sanitizeEvent(event.type, event, at);
          })
          .filter(Boolean)
      : [];
    const reflections = Array.isArray(candidate.reflections)
      ? candidate.reflections
          .map((reflection) => {
            const at = finiteTimestamp(reflection?.at);
            if (!at || !REFLECTION_CATEGORIES.includes(reflection?.category)) return null;
            return { at, category: reflection.category };
          })
          .filter(Boolean)
          .slice(-MAX_REFLECTIONS)
      : [];

    return pruneState(
      {
        version: VERSION,
        startedAt,
        enabled: candidate.enabled !== false,
        events,
        reflections,
      },
      now,
    );
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
        .filter((reflection) => reflection.at >= oldestAllowed && reflection.at <= now + DAY_MS)
        .sort((left, right) => left.at - right.at)
        .slice(-MAX_REFLECTIONS),
    };
  }

  function safeParse(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_error) {
      return null;
    }
  }

  function localDayStart(timestamp) {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  function summarize(state, now) {
    const openings = state.events.filter((event) => event.type === "normal_opened");
    const todayStart = localDayStart(now);
    let shortReopenings = 0;
    for (let index = 1; index < openings.length; index += 1) {
      if (openings[index].at - openings[index - 1].at <= SHORT_REOPEN_MS) shortReopenings += 1;
    }

    const count = (type, predicate = () => true) =>
      state.events.filter((event) => event.type === type && predicate(event)).length;

    return {
      enabled: state.enabled,
      startedAt: state.startedAt,
      observationDays: Math.max(1, Math.floor((now - state.startedAt) / DAY_MS) + 1),
      baselineComplete: now - state.startedAt >= BASELINE_MS,
      openings: openings.length,
      openingsToday: openings.filter((event) => event.at >= todayStart && event.at <= now).length,
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
      latestReflection: state.reflections.at(-1) || null,
    };
  }

  function createStore(storage, options = {}) {
    const now = typeof options.now === "function" ? options.now : () => Date.now();
    const key = options.key || STORAGE_KEY;
    let transientState = null;

    function read() {
      let raw = null;
      try {
        raw = storage?.getItem?.(key);
      } catch (_error) {
        // Fall back to in-memory state so focus behavior never breaks.
      }
      const state = normalizeState(safeParse(raw) || transientState, now());
      transientState = state;
      return state;
    }

    function write(state) {
      const normalized = normalizeState(state, now());
      transientState = normalized;
      try {
        storage?.setItem?.(key, JSON.stringify(normalized));
      } catch (_error) {
        // Keep an in-memory copy when persistent storage is unavailable.
      }
      return normalized;
    }

    return {
      getState() {
        return read();
      },

      record(type, details = {}) {
        const state = read();
        if (!state.enabled) return state;
        const event = sanitizeEvent(type, details, now());
        if (!event) return state;
        return write({ ...state, events: [...state.events, event] });
      },

      getSummary() {
        const currentTime = now();
        return summarize(normalizeState(read(), currentTime), currentTime);
      },

      setEnabled(enabled) {
        const state = read();
        return write({ ...state, enabled: Boolean(enabled) });
      },

      saveReflection(category) {
        const state = read();
        const currentTime = now();
        if (currentTime - state.startedAt < BASELINE_MS) return false;
        if (!REFLECTION_CATEGORIES.includes(category)) return false;
        write({
          ...state,
          reflections: [...state.reflections, { at: currentTime, category }],
        });
        return true;
      },

      clear() {
        try {
          storage?.removeItem?.(key);
        } catch (_error) {
          // Reset the in-memory state even if storage removal fails.
        }
        transientState = freshState(now());
        return transientState;
      },
    };
  }

  const api = Object.freeze({
    VERSION,
    STORAGE_KEY,
    DAY_MS,
    BASELINE_MS,
    RETENTION_MS,
    MAX_EVENTS,
    REFLECTION_CATEGORIES,
    createStore,
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (globalScope) globalScope.MirrorAwareness = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
