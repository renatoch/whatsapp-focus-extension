(function exposeModeController(globalScope) {
  "use strict";

  function createModeController({
    classes, getRoot, scheduler, isReady,
    cancelFocusedNavigation, cancelRecentCapture, closeChooser,
    cancelPendingNormalAttempt, clearIntentPrompt, clearNormalDelay, updateFocusStreak,
    resetSearchGate, collapseFixedCollection, updateSearchNavigation,
    normalizeChats, focusNativeSearch, captureFocusedConversation, surfaces,
  }) {
    let running = true;
    let generation = 0;
    const timers = new Set();

    function valid(token) {
      return running && token === generation;
    }

    function clearTimers() {
      for (const id of timers) scheduler.clearTimeout(id);
      timers.clear();
    }

    function invalidate() {
      generation += 1;
      clearTimers();
      return generation;
    }

    function beginTransition() {
      if (!running) return null;
      return invalidate();
    }

    function later(callback, delay, token) {
      let id;
      id = scheduler.setTimeout(() => {
        timers.delete(id);
        if (valid(token)) callback();
      }, delay);
      timers.add(id);
      return id;
    }

    function invoke(token, callbacks) {
      for (const callback of callbacks) {
        if (!valid(token)) return false;
        callback();
      }
      return valid(token);
    }

    function overlayHidden(hidden) {
      const overlay = surfaces.getOverlay();
      if (overlay) overlay.hidden = hidden;
    }

    function ensureActiveSurfaces(token) {
      return invoke(token, [
        surfaces.ensureOverlay, surfaces.ensureReturnButton, surfaces.ensureSidebarButton,
        surfaces.ensureSearchAgainButton, surfaces.ensureSearchGateMessage,
        surfaces.ensureFocusedRecentsShelf, surfaces.ensureAddCollectionButton,
        surfaces.ensureFixedCollectionChooser, surfaces.renderFocusedRecents,
        surfaces.renderFixedCollections,
      ]);
    }

    function ensureFocusedSurfaces(token) {
      return invoke(token, [
        surfaces.ensureOverlay, surfaces.ensureReturnButton, surfaces.ensureSidebarButton,
        surfaces.ensureSearchAgainButton, surfaces.ensureFocusedRecentsShelf,
        surfaces.ensureAddCollectionButton, surfaces.ensureFixedCollectionChooser,
        surfaces.renderFocusedRecents, surfaces.renderFixedCollections,
      ]);
    }

    function applyActive(showOverlay, token) {
      if (!invoke(token, [cancelFocusedNavigation, cancelRecentCapture, closeChooser,
        cancelPendingNormalAttempt, clearIntentPrompt, clearNormalDelay, updateFocusStreak])) return;
      const root = getRoot();
      root.classList.add(classes.active);
      root.classList.remove(classes.normal, classes.searching, classes.searchFocused,
        classes.searchTooShort, classes.searchWaiting, classes.sidebarOpen,
        classes.sidebarHidden, classes.openingRecent);
      root.classList.toggle(classes.overlayOpen, Boolean(showOverlay));
      if (!ensureActiveSurfaces(token)) return;
      overlayHidden(!showOverlay);
    }

    function setActive({ showOverlay }) {
      const token = beginTransition();
      if (token === null) return;
      applyActive(showOverlay, token);
    }

    function setNormal() {
      const token = beginTransition();
      if (token === null) return;
      if (!invoke(token, [cancelFocusedNavigation, closeChooser, clearNormalDelay])) return;
      const root = getRoot();
      root.classList.remove(classes.active, classes.searching, classes.searchFocused,
        classes.searchTooShort, classes.searchWaiting, classes.sidebarOpen,
        classes.sidebarHidden, classes.overlayOpen, classes.openingRecent);
      root.classList.add(classes.normal);
      overlayHidden(true);
    }

    function setSearchMode() {
      const token = beginTransition();
      if (token === null) return;
      if (!invoke(token, [cancelFocusedNavigation, cancelRecentCapture, closeChooser])) return;
      if (!isReady()) {
        applyActive(true, token);
        return;
      }
      if (!invoke(token, [resetSearchGate])) return;
      const root = getRoot();
      root.classList.remove(classes.active, classes.normal, classes.sidebarOpen,
        classes.sidebarHidden, classes.searchFocused, classes.overlayOpen,
        classes.openingRecent);
      root.classList.add(classes.searching, classes.searchTooShort);
      if (!invoke(token, [collapseFixedCollection, surfaces.ensureFocusedRecentsShelf,
        surfaces.renderFocusedRecents, surfaces.renderFixedCollections,
        () => updateSearchNavigation("")])) return;
      overlayHidden(true);
      later(() => {
        normalizeChats(() => {
          if (!valid(token)) return;
          focusNativeSearch({ retriedFromNestedView: true, source: "after-shared-main-chats" });
        });
      }, 100, token);
    }

    function setSidebarOpen() {
      if (beginTransition() === null) return;
      const root = getRoot();
      root.classList.remove(classes.active, classes.normal, classes.searching,
        classes.searchFocused, classes.searchTooShort, classes.searchWaiting,
        classes.sidebarHidden, classes.overlayOpen);
      root.classList.add(classes.sidebarOpen);
      overlayHidden(true);
    }

    function setSidebarHidden() {
      if (beginTransition() === null) return;
      const root = getRoot();
      root.classList.remove(classes.active, classes.normal, classes.searching,
        classes.searchFocused, classes.searchTooShort, classes.searchWaiting,
        classes.sidebarOpen, classes.overlayOpen);
      root.classList.add(classes.sidebarHidden);
      overlayHidden(true);
    }

    function applyFocused(token) {
      if (!invoke(token, [resetSearchGate])) return false;
      const root = getRoot();
      root.classList.add(classes.active, classes.searchFocused, classes.sidebarHidden);
      root.classList.remove(classes.normal, classes.searching, classes.searchTooShort,
        classes.searchWaiting, classes.sidebarOpen, classes.overlayOpen,
        classes.openingRecent);
      if (!ensureFocusedSurfaces(token)) return false;
      overlayHidden(true);
      return valid(token);
    }

    function setFocused() {
      const token = beginTransition();
      if (token === null) return;
      applyFocused(token);
    }

    function beginHiddenNavigation() {
      const token = beginTransition();
      if (token === null) return;
      if (!invoke(token, [cancelRecentCapture, resetSearchGate])) return;
      const root = getRoot();
      root.classList.remove(classes.active, classes.normal, classes.searchFocused,
        classes.searchTooShort, classes.searchWaiting, classes.sidebarOpen,
        classes.sidebarHidden, classes.overlayOpen);
      root.classList.add(classes.searching, classes.openingRecent);
      overlayHidden(true);
      invoke(token, [surfaces.renderFocusedRecents]);
    }

    function enterFocusedSoon(expectedTitle = "") {
      const token = beginTransition();
      if (token === null) return;
      later(() => {
        if (!applyFocused(token)) return;
        later(() => captureFocusedConversation(expectedTitle, "search"), 350, token);
      }, 250, token);
    }

    function dispose() {
      if (!running) return;
      invalidate();
      running = false;
    }

    function start() {
      running = true;
    }

    return Object.freeze({
      setActive, setNormal, setSearchMode, setSidebarOpen, setSidebarHidden,
      setFocused, beginHiddenNavigation, enterFocusedSoon, dispose, start,
    });
  }

  const api = Object.freeze({ createModeController });
  globalScope.MirrorModeController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
