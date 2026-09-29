(function exposeRecentCapture(globalScope) {
  "use strict";

  function createRecentCapture({ readTitle, normalizeTitle, onCaptured, scheduler, retries = 5 }) {
    let generation = 0;
    let timer = null;
    let active = true;

    function cancel() {
      generation += 1;
      scheduler.clearTimeout(timer);
      timer = null;
    }

    function capture(expectedTitle, route = "search") {
      if (!active) return;
      cancel();
      const token = generation;
      function inspect(attempt) {
        if (!active || token !== generation) return;
        timer = null;
        const title = readTitle();
        if (title && (!expectedTitle || normalizeTitle(title) === normalizeTitle(expectedTitle))) {
          onCaptured(title, route);
          return;
        }
        if (attempt < retries) timer = scheduler.setTimeout(() => inspect(attempt + 1), 300);
      }
      inspect(0);
    }

    function dispose() { cancel(); active = false; }
    function start() { active = true; }
    return { capture, cancel, dispose, start };
  }

  const api = { createRecentCapture };
  globalScope.MirrorRecentCapture = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
