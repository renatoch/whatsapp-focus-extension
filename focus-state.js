(function exposeFocusState(globalScope) {
  "use strict";

  function chooseExpiryDestination({ visibilityState, documentHasFocus, hasOpenConversation, surface }) {
    if (visibilityState !== "visible" || documentHasFocus !== true) return "blind-overlay";
    if (surface === "status-player") return "status-player";
    if (surface === "channel") return "focused-channel";
    if (surface && surface !== "conversation") return "blind-overlay";
    return hasOpenConversation === true ? "focused-conversation" : "blind-overlay";
  }

  // One transient technical record, not usage history or persisted telemetry.
  function createReturnDiagnostic({now}) {
    const surfaces = ['conversation','channel','channel-list','status-player','status-list','unknown'];
    const destinations = ['focused-conversation','focused-channel','status-player','blind-overlay'];
    const reasons = ['expiry','button','shortcut','cancel-unread','unread-error','navigation-failed','auth-transition','intent-return','not-ready','other'];
    const modes = ['normal','focused','search','blind','other'];
    let started = null, duration = null, interaction = null, checks = [], last = null;
    const age = value => value === null ? null : Math.max(0, Math.round(now() - value));
    const pick = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
    function sample(value = {}) {
      return {surface:pick(value.surface,surfaces,'unknown'), mode:pick(value.mode,modes,'other'),
        tabVisible:value.tabVisible === true, documentHasFocus:value.documentHasFocus === true,
        hasOpenContent:value.hasOpenContent === true, hasDeadline:value.hasDeadline === true,
        lastInteractionAgoMs:age(interaction), normalElapsedMs:age(started)};
    }
    function start(durationMs) {
      started = now(); duration = [10000,300000].includes(durationMs) ? durationMs : null; checks = [];
    }
    function activity(event) { if (event?.isTrusted === true) interaction = now(); }
    function decision(value) {
      checks.push({...sample(value), phase:pick(value.phase,['deadline','after-normalization'],'deadline'),
        destination:pick(value.destination,destinations,'blind-overlay')});
      checks = checks.slice(-4);
    }
    function returned(reason, destination, value) {
      const origin = pick(reason,reasons,'other');
      last = {version:1,reason:origin,destination:pick(destination,destinations,'blind-overlay'),
        durationMs:duration,...sample(value),checks:origin === 'expiry' ? checks.slice() : []};
      checks = []; started = duration = null;
    }
    function snapshot() { return last ? JSON.parse(JSON.stringify(last)) : null; }
    return Object.freeze({start,activity,decision,returned,snapshot});
  }

  const api = Object.freeze({ chooseExpiryDestination, createReturnDiagnostic });
  globalScope.MirrorFocusState = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
