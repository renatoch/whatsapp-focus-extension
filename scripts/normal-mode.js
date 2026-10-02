(function exposeNormalMode(globalScope) {
  "use strict";

  function createNormalMode({ scheduler, now, delayMs, tickMs, bypassMs, recentWindowMs,
    readLastNormalOpenedAt, recordNormalOpenedAt, onAttemptStarted, finishNormalAttempt,
    recordAwareness, setNormal, setActive, setFocused, isNormalMode,
    chooseExpiryDestination, normalizeChats, ui }) {
    let running = true;
    let confirmationGeneration = 0, bypassGeneration = 0;
    let requestGeneration = 0;
    let delayTimer = null, delayInterval = null, bypassTimer = null;
    let recentAttempt = false;
    const confirmationValid = token => running && token === confirmationGeneration;
    const bypassValid = token => running && token === bypassGeneration;

    function clearConfirmationTimers() {
      if (delayTimer !== null) scheduler.clearTimeout(delayTimer);
      if (delayInterval !== null) scheduler.clearInterval(delayInterval);
      delayTimer = delayInterval = null;
    }

    function clearConfirmation() {
      if (!running) return;
      confirmationGeneration += 1;
      clearConfirmationTimers();
      ui.reset();
    }

    function resetRecentAttempt() { recentAttempt = false; }

    function cancelBypass() {
      bypassGeneration += 1;
      if (bypassTimer !== null) scheduler.clearTimeout(bypassTimer);
      bypassTimer = null;
    }

    function beginConfirmation() {
      if (!running) return;
      const previousToken = confirmationGeneration;
      const available = ui.prepare();
      if (!confirmationValid(previousToken) || !available) return;
      const token = ++confirmationGeneration;
      requestGeneration += 1;
      clearConfirmationTimers();
      ui.reset();
      if (!confirmationValid(token)) return;
      ui.setPending();
      if (!confirmationValid(token)) return;
      const lastOpenedAt = readLastNormalOpenedAt();
      if (!confirmationValid(token)) return;
      recentAttempt = Boolean(lastOpenedAt && now() - lastOpenedAt < recentWindowMs);
      onAttemptStarted();
      if (!confirmationValid(token)) return;
      ui.updateWarning(lastOpenedAt);
      if (!confirmationValid(token)) return;
      if (recentAttempt) {
        ui.setRecent();
        return;
      }
      const startedAt = now();
      const updateCountdown = () => {
        if (!confirmationValid(token)) return;
        ui.setCountdown(Math.ceil(Math.max(0, delayMs - (now() - startedAt)) / 1000));
      };
      updateCountdown();
      if (!confirmationValid(token)) return;
      delayInterval = scheduler.setInterval(updateCountdown, tickMs);
      delayTimer = scheduler.setTimeout(() => {
        if (confirmationValid(token)) openTemporarily("countdown");
      }, delayMs);
    }

    function openTemporarily(route = "immediate") {
      if (!running) return;
      const token = ++bypassGeneration;
      const request = ++requestGeneration;
      const openingValid = () => {
        if (!bypassValid(token)) return false;
        if (request === requestGeneration) return true;
        // A newer confirmation superseded this in-flight opening, not a live bypass.
        cancelBypass();
        return false;
      };
      finishNormalAttempt("normal_opened", { route });
      if (!openingValid()) return;
      recentAttempt = false;
      clearConfirmation();
      if (!openingValid()) return;
      if (bypassTimer !== null) scheduler.clearTimeout(bypassTimer);
      bypassTimer = null;
      recordNormalOpenedAt();
      if (!openingValid()) return;
      setNormal(); // Its confirmation cleanup must not invalidate this bypass token.
      if (!openingValid()) return;
      let expiryPending = true;
      bypassTimer = scheduler.setTimeout(() => {
        if (!bypassValid(token) || !expiryPending) return;
        expiryPending = false;
        bypassTimer = null;
        const expiryDestination = chooseExpiryDestination();
        if (!bypassValid(token)) return;
        recordAwareness("focus_returned", { reason: "expiry", expiryDestination });
        if (!bypassValid(token)) return;
        if (expiryDestination === "focused-conversation") {
          let completionPending = true;
          normalizeChats(() => {
            if (!completionPending) return;
            completionPending = false;
            if (bypassValid(token) && isNormalMode()) setFocused();
          });
        } else {
          setActive({ showOverlay: true });
        }
      }, bypassMs);
    }

    function openNow() {
      openTemporarily(recentAttempt ? "recent-explicit" : "immediate");
    }

    function dispose() {
      if (!running) return;
      running = false;
      confirmationGeneration += 1;
      clearConfirmationTimers();
      cancelBypass();
      recentAttempt = false;
    }

    function start() { running = true; }

    return Object.freeze({ beginConfirmation, clearConfirmation, openNow,
      openTemporarily, cancelBypass, resetRecentAttempt, dispose, start });
  }

  const api = Object.freeze({ createNormalMode });
  globalScope.MirrorNormalMode = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
