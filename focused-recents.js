(function exposeFocusedRecents(globalScope) {
  "use strict";

  const MAX_RECENTS = 4;

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
    classifyExactTitleMatches,
  });

  globalScope.MirrorFocusedRecents = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
