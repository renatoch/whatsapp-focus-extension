(function exposeFocusedRecents(globalScope) {
  "use strict";

  const MAX_RECENTS = 4;
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
    return cleanDisplayTitle(value).normalize("NFKC").toLocaleLowerCase();
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
    if (patch.failureReason === null || FAILURE_REASONS.includes(patch.failureReason)) {
      diagnostic.failureReason = patch.failureReason;
    }
    return diagnostic;
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

  const api = Object.freeze({
    MAX_RECENTS,
    normalizeTitle,
    addRecent,
    removeRecent,
    clearRecents,
    createNavigationDiagnostic,
    updateNavigationDiagnostic,
    classifyExactTitleMatches,
  });

  globalScope.MirrorFocusedRecents = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
