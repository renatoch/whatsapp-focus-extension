(function exposeFocusedNavigation(globalScope) {
  "use strict";
  const INITIAL_MS = 100;
  const RETRY_MS = 150;
  const MAX_RETRIES = 10;

  function createFocusedNavigation({ native, rules, scheduler, now = Date.now,
    normalizeChats, onBegin, onOpened, onFailure }) {
    let generation = 0, disposed = false, busy = false, startedAt = 0;
    let source = "recent", diagnostic = null;
    const timers = new Set();
    const valid = (token) => !disposed && token === generation;

    function cancel() {
      generation += 1;
      busy = false;
      for (const id of timers) scheduler.clearTimeout(id);
      timers.clear();
    }
    function later(callback, ms, token) {
      const id = scheduler.setTimeout(() => {
        timers.delete(id);
        if (valid(token)) callback();
      }, ms);
      timers.add(id);
    }
    function update(patch) {
      diagnostic = rules.updateNavigationDiagnostic(diagnostic, { ...patch, elapsedMs: now() - startedAt });
    }
    function fail(reason, token) {
      if (!valid(token)) return;
      update({ stage: "failed", failureReason: reason });
      cancel();
      onFailure(reason, source, diagnostic);
    }
    function confirm(title, token, attempt) {
      if (!valid(token)) return;
      const activeTitle = native.readActiveConversationTitle();
      const headerMatched = rules.normalizeTitle(activeTitle) === rules.normalizeTitle(title);
      update({ stage: "confirming-header", headerMatched });
      if (headerMatched) {
        update({ stage: "complete" });
        cancel();
        onOpened(activeTitle, source, diagnostic);
      } else if (attempt < MAX_RETRIES) {
        later(() => confirm(title, token, attempt + 1), RETRY_MS, token);
      } else fail("not-found", token);
    }
    function inspect(title, token, attempt, previousUniqueTarget = null) {
      if (!valid(token)) return;
      const resultSet = native.focusedSearchCandidates();
      const candidates = resultSet.candidates;
      const classification = rules.classifyExactTitleMatches(title, candidates.map((candidate) => candidate.title));
      const field = native.findNativeSearchField({ allowHidden: true });
      const searchTextAccepted = Boolean(field && rules.normalizeTitle(native.getSearchText(field)) === rules.normalizeTitle(title));
      const sample = {
        attempt, searchTextAccepted, candidateRows: resultSet.rowCount, candidateTitles: candidates.length,
        exactMatches: candidates.filter((candidate) => rules.normalizeTitle(candidate.title) === rules.normalizeTitle(title)).length,
      };
      update({ stage: "results-inspected", ...sample, resultSample: sample });
      const uniqueTarget = classification.status === "match" && searchTextAccepted ? candidates[classification.index].clickTarget : null;
      if (!uniqueTarget || uniqueTarget !== previousUniqueTarget) {
        if (attempt < MAX_RETRIES) later(() => inspect(title, token, attempt + 1, uniqueTarget), RETRY_MS, token);
        else fail(classification.status === "ambiguous" ? "ambiguous" : "not-found", token);
        return;
      }
      native.activateFocusedResult(uniqueTarget);
      update({ stage: "exact-result-clicked", clickDispatched: true });
      later(() => confirm(title, token, 0), RETRY_MS, token);
    }
    function search(title, token) {
      if (!valid(token)) return;
      update({ stage: "chats-normalized" });
      const field = native.findNativeSearchField({ allowHidden: true });
      update({ stage: "search-field-ready", searchFieldFound: Boolean(field) });
      if (!field) { fail("title-unavailable", token); return; }
      native.setNativeSearchText(field, title);
      update({ stage: "search-text-dispatched",
        searchTextAccepted: rules.normalizeTitle(native.getSearchText(field)) === rules.normalizeTitle(title) });
      later(() => inspect(title, token, 0), INITIAL_MS, token);
    }
    function open(title, route = "recent") {
      if (disposed || busy || !title) return false;
      cancel();
      const token = generation;
      source = route;
      startedAt = now();
      diagnostic = rules.createNavigationDiagnostic();
      busy = true;
      update({ stage: "starting" });
      onBegin();
      normalizeChats(() => search(title, token));
      return true;
    }
    function dispose() { cancel(); disposed = true; }
    function start() { disposed = false; }
    return Object.freeze({ open, cancel, dispose, start, isBusy: () => busy });
  }
  const api = Object.freeze({ createFocusedNavigation });
  globalScope.MirrorFocusedNavigation = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
