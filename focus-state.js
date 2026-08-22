(function exposeFocusState(globalScope) {
  "use strict";

  function chooseExpiryDestination({ visibilityState, documentHasFocus, hasOpenConversation }) {
    return visibilityState === "visible" && documentHasFocus === true && hasOpenConversation === true
      ? "focused-conversation"
      : "blind-overlay";
  }

  const api = Object.freeze({ chooseExpiryDestination });
  globalScope.MirrorFocusState = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
