(function exposeFocusState(globalScope) {
  "use strict";

  function chooseExpiryDestination({ visibilityState, documentHasFocus, hasOpenConversation, surface }) {
    if (visibilityState !== "visible" || documentHasFocus !== true) return "blind-overlay";
    if (surface === "status-player") return "status-player";
    if (surface === "channel") return "focused-channel";
    if (surface && surface !== "conversation") return "blind-overlay";
    return hasOpenConversation === true ? "focused-conversation" : "blind-overlay";
  }

  const api = Object.freeze({ chooseExpiryDestination });
  globalScope.MirrorFocusState = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
