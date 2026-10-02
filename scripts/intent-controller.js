(function exposeIntentController(globalScope) {
  "use strict";

  function createIntentController({ now, createAttemptId, recordAwareness,
    closeSummary, clearConfirmation, beginConfirmation, resetRecentAttempt,
    setActive, ui }) {
    let running = true, generation = 0;
    let promptStartedAt = null, attemptStartedAt = null, pendingIntent = null;
    const valid = token => running && token === generation;
    const elapsed = timestamp => timestamp ? Math.max(0, now() - timestamp) : 0;

    function begin() {
      if (!running || !ui.hasOverlay()) return;
      const token = ++generation;
      closeSummary();
      if (!valid(token)) return;
      clearConfirmation();
      if (!valid(token)) return;
      pendingIntent = null;
      promptStartedAt = now();
      ui.showPrompt();
    }

    function declaration(token) {
      const input = ui.readInput();
      if (!valid(token) || !input) return null;
      return { attemptId: createAttemptId(), intent: input.intent, note: input.note,
        promptDurationMs: elapsed(promptStartedAt) };
    }

    function clearPrompt() {
      if (!running) return;
      generation += 1;
      promptStartedAt = null;
      ui.hidePrompt();
    }

    function proceed() {
      if (!running) return;
      const token = ++generation;
      const value = declaration(token);
      if (!valid(token) || !value) return;
      pendingIntent = value;
      promptStartedAt = null;
      ui.hidePrompt();
      if (valid(token)) beginConfirmation();
    }

    function decline() {
      if (!running) return;
      const token = ++generation;
      const value = declaration(token);
      if (!valid(token) || !value) return;
      pendingIntent = null;
      promptStartedAt = null;
      recordAwareness("intent_outcome", { ...value, decision: "not-open" });
      if (valid(token)) ui.hidePrompt();
    }

    function returnToFocus() {
      if (!running) return;
      const token = ++generation;
      const durationMs = elapsed(promptStartedAt);
      pendingIntent = null;
      promptStartedAt = null;
      recordAwareness("intent_prompt_exited", { durationMs, destination: "focus-overlay" });
      if (!valid(token)) return;
      ui.hidePrompt();
      if (valid(token)) setActive({ showOverlay: true });
    }

    function beginAttempt() {
      if (!running) return;
      generation += 1;
      attemptStartedAt = now();
      recordAwareness("attempt_started");
    }

    function finishAttempt(type, details = {}) {
      if (!running) return;
      const token = ++generation;
      const durationMs = elapsed(attemptStartedAt);
      const intent = pendingIntent;
      // Detach the completed association before invoking reentrant event sinks.
      pendingIntent = null;
      attemptStartedAt = null;
      recordAwareness(type, { durationMs, ...details });
      if (!valid(token)) return;
      const decision = { normal_opened: "opened", attempt_cancelled: "cancelled",
        continued_focused_conversation: "continued-focused" }[type];
      if (intent && decision) {
        recordAwareness("intent_outcome", { ...intent, decision, durationMs, route: details.route });
      }
      if (valid(token)) resetRecentAttempt();
    }

    function cancelPendingAttempt() {
      if (running && attemptStartedAt) finishAttempt("attempt_cancelled");
    }

    function dispose() {
      if (!running) return;
      running = false;
      generation += 1;
      promptStartedAt = attemptStartedAt = pendingIntent = null;
    }

    function start() { running = true; }

    return Object.freeze({ begin, proceed, decline, returnToFocus, clearPrompt,
      beginAttempt, finishAttempt, cancelPendingAttempt, dispose, start });
  }

  const api = Object.freeze({ createIntentController });
  globalScope.MirrorIntentController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
