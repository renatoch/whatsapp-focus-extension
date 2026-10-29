(function exposeSurfaceExpiry(scope) {
  'use strict';
  function createSurfaceExpiry({scheduler, durationMs, inspect, chooseDestination,
    normalizeConversation, onConversation, onChannel, onStatus, onBlind,
    onReturned, clearContinuation}) {
    let running = true, generation = 0, timer = null, frame = null, pending = null;
    const valid = token => running && token === generation;
    function cancel() {
      generation += 1;
      if (timer !== null) scheduler.clearTimeout(timer);
      if (frame !== null) scheduler.cancelAnimationFrame(frame);
      timer = frame = null;
      pending = null;
      clearContinuation();
    }
    function blind(token) {
      if (!valid(token)) return;
      pending = null;
      onReturned('blind-overlay');
      if (valid(token)) onBlind();
    }
    function expire(token) {
      if (!valid(token)) return;
      const surface = inspect();
      const destination = chooseDestination(surface);
      if (!valid(token)) return;
      if (destination === 'status-player') {
        pending = 'status-player'; onStatus();
      } else if (destination === 'focused-channel') {
        pending = 'channel'; onChannel();
      } else if (destination === 'focused-conversation') {
        let completionPending = true;
        normalizeConversation(() => {
          if (!valid(token) || !completionPending) return;
          completionPending = false;
          // A late native-normalization completion must not seize a newer surface.
          if (chooseDestination(inspect()) !== 'focused-conversation') { expire(token); return; }
          onReturned('focused-conversation');
          if (valid(token)) onConversation();
        });
      } else { blind(token); }
    }
    function start() {
      if (!running) return;
      cancel();
      const token = generation;
      timer = scheduler.setTimeout(() => {
        if (!valid(token) || timer === null) return;
        timer = null;
        expire(token);
      }, durationMs);
    }
    function refresh() {
      if (!running || pending === null || frame !== null) return;
      const token = generation;
      // Coalesce native DOM commits before treating disappearance as navigation.
      frame = scheduler.requestAnimationFrame(() => {
        if (!valid(token)) return;
        frame = null;
        if (!pending) return;
        const surface = inspect();
        if (!valid(token)) return;
        // An unclassified loading gap is not proof that a viewer was closed.
        if (surface === pending || surface === 'unknown') return;
        blind(token);
      });
    }
    function cancelContinuation() {
      // A manual sidebar toggle narrows/reveals normal mode; it must not grant a
      // fresh unlimited session before the original five-minute deadline.
      if (timer === null) cancel();
    }
    function dispose() { if (running) { cancel(); running = false; } }
    return Object.freeze({start, cancel, cancelContinuation, refresh, dispose, isContinuing:() => pending !== null});
  }
  const api = Object.freeze({createSurfaceExpiry});
  scope.MirrorSurfaceExpiry = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
