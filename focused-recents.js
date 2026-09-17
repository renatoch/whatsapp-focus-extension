(function exposeFocusedRecents(globalScope) {
  "use strict";

  const MAX_RECENTS = 5;
  const DIAGNOSTIC_STAGES = Object.freeze([
    "starting",
    "chats-normalized",
    "search-field-ready",
    "search-text-dispatched",
    "results-inspected",
    "exact-result-clicked",
    "confirming-header",
    "complete",
    "failed",
  ]);
  const FAILURE_REASONS = Object.freeze(["not-found", "ambiguous", "title-unavailable"]);

  function cleanDisplayTitle(value) {
    return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  }

  function normalizeTitle(value) {
    return cleanDisplayTitle(value).normalize("NFKC");
  }

  function addRecent(recents, title, limit = MAX_RECENTS) {
    const displayTitle = cleanDisplayTitle(title);
    const key = normalizeTitle(displayTitle);
    if (!key) return Array.isArray(recents) ? recents.slice() : [];

    const remaining = (Array.isArray(recents) ? recents : [])
      .filter((item) => normalizeTitle(item) !== key);
    return [displayTitle, ...remaining].slice(0, Math.max(1, limit));
  }

  function removeRecent(recents, title) {
    const key = normalizeTitle(title);
    if (!key) return Array.isArray(recents) ? recents.slice() : [];
    return (Array.isArray(recents) ? recents : [])
      .filter((item) => normalizeTitle(item) !== key);
  }

  function clearRecents() {
    return [];
  }

  function createNavigationDiagnostic() {
    return {
      version: 1,
      stage: "starting",
      searchFieldFound: false,
      searchTextAccepted: false,
      candidateRows: 0,
      candidateTitles: 0,
      exactMatches: 0,
      clickDispatched: false,
      headerMatched: false,
      failureReason: null,
      elapsedMs: 0,
      resultSamples: [],
    };
  }

  function updateNavigationDiagnostic(current, patch = {}) {
    const diagnostic = { ...createNavigationDiagnostic(), ...(current || {}) };
    if (DIAGNOSTIC_STAGES.includes(patch.stage)) diagnostic.stage = patch.stage;
    for (const field of ["searchFieldFound", "searchTextAccepted", "clickDispatched", "headerMatched"]) {
      if (typeof patch[field] === "boolean") diagnostic[field] = patch[field];
    }
    for (const field of ["candidateRows", "candidateTitles", "exactMatches", "elapsedMs"]) {
      const value = Number(patch[field]);
      if (Number.isFinite(value) && value >= 0) diagnostic[field] = Math.round(value);
    }
    const samples = Array.isArray(diagnostic.resultSamples) ? diagnostic.resultSamples : [];
    diagnostic.resultSamples = [...samples, ...(patch.resultSample ? [patch.resultSample] : [])]
      .slice(-12)
      .filter((sample) => sample && typeof sample === "object")
      .map((sample) => {
        const clean = { searchTextAccepted: sample.searchTextAccepted === true };
        for (const field of ["attempt", "candidateRows", "candidateTitles", "exactMatches"]) {
          const value = Number(sample[field]);
          clean[field] = Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
        }
        return clean;
      });
    if (typeof patch.conversationSectionFound === "boolean") {
      diagnostic.conversationSectionFound = patch.conversationSectionFound;
    }
    if (patch.matchStructure) {
      diagnostic.matchStructure = {};
      for (const field of ["uniqueTargets", "frameChildTitle", "frameTitle", "autoSpanTitle", "spanTitle", "unknownSource", "selectedTextDifferent", "containerTextDifferent", "containerMissing"]) {
        const value = Number(patch.matchStructure[field]);
        diagnostic.matchStructure[field] = Number.isFinite(value) && value >= 0 ? Math.min(1000, Math.round(value)) : 0;
      }
    }
    if (patch.failureReason === null || FAILURE_REASONS.includes(patch.failureReason)) {
      diagnostic.failureReason = patch.failureReason;
    }
    return diagnostic;
  }

  // Aggregate only exact matches. DOM references and title evidence remain ephemeral.
  function describeExactMatches(targetTitle, candidates) {
    const matches = candidates.filter((candidate) => normalizeTitle(candidate.title) === normalizeTitle(targetTitle));
    const structure = { uniqueTargets: new Set(matches.map((candidate) => candidate.clickTarget).filter(Boolean)).size,
      frameChildTitle: 0, frameTitle: 0, autoSpanTitle: 0, spanTitle: 0, unknownSource: 0,
      selectedTextDifferent: 0, containerTextDifferent: 0, containerMissing: 0 };
    for (const candidate of matches) {
      const source = ["frameChildTitle", "frameTitle", "autoSpanTitle", "spanTitle"].includes(candidate.titleSource) ? candidate.titleSource : "unknownSource";
      structure[source] += 1;
      if (candidate.selectedTextDifferent === true) structure.selectedTextDifferent += 1;
      if (candidate.containerTextRelation === "different") structure.containerTextDifferent += 1;
      if (candidate.containerTextRelation === "missing") structure.containerMissing += 1;
    }
    return structure;
  }

  function classifyExactTitleMatches(targetTitle, candidateTitles) {
    const target = normalizeTitle(targetTitle);
    if (!target) return { status: "not-found", index: null };
    const indexes = (Array.isArray(candidateTitles) ? candidateTitles : [])
      .map((title, index) => normalizeTitle(title) === target ? index : null)
      .filter((index) => index !== null);
    if (indexes.length === 1) return { status: "match", index: indexes[0] };
    if (indexes.length > 1) return { status: "ambiguous", index: null };
    return { status: "not-found", index: null };
  }

  // Tab-only diagnostic recorder. Never retains titles, DOM references or absolute times.
  function createCaptureRecorder(now = () => Date.now()) {
    const events = [], starts = new Map();
    let lastOutcome = null;
    const enums = { event: ['mousedown', 'click', 'enter'], zone: ['side', 'main', 'other'],
      mode: ['search', 'normal', 'sidebar', 'focus'], route: ['search', 'other'] };
    function record(stage, details = {}) {
      if (!['input', 'selection', 'checking', 'success', 'timeout', 'cancelled', 'added'].includes(stage)) return;
      const entry = { stage };
      for (const [key, allowed] of Object.entries(enums)) if (allowed.includes(details[key])) entry[key] = details[key];
      for (const key of ['recognized', 'expectedTitleAvailable', 'headerAvailable', 'headerMatched']) {
        if (typeof details[key] === 'boolean') entry[key] = details[key];
      }
      for (const key of ['token', 'attempt', 'recentCount']) {
        if (Number.isFinite(details[key]) && details[key] >= 0) entry[key] = Math.min(1000000, Math.round(details[key]));
      }
      if (stage === 'checking' && entry.attempt === 0) {
        starts.set(entry.token, now());
        if (starts.size > 8) starts.delete(starts.keys().next().value);
      }
      if (starts.has(entry.token)) entry.elapsedMs = Math.min(1000000, Math.max(0, Math.round(now() - starts.get(entry.token))));
      if (['success', 'timeout', 'cancelled'].includes(stage)) {
        lastOutcome = entry;
        starts.delete(entry.token);
      }
      events.push(entry);
      if (events.length > 32) events.shift();
    }
    function snapshot() {
      return { version: 1, kind: 'recent-capture', lastOutcome: lastOutcome ? { ...lastOutcome } : null,
        events: events.map((entry) => ({ ...entry })) };
    }
    return Object.freeze({ record, snapshot });
  }

  const api = Object.freeze({
    MAX_RECENTS,
    createCaptureRecorder,
    normalizeTitle,
    addRecent,
    removeRecent,
    clearRecents,
    createNavigationDiagnostic,
    updateNavigationDiagnostic,
    classifyExactTitleMatches,
    describeExactMatches,
  });

  globalScope.MirrorFocusedRecents = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
