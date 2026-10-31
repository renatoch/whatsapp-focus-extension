(function exposeAuthSurface(scope) {
  'use strict';
  // Observed in a fresh, unlinked profile. Never read QR payloads or input values.
  const LOGIN_SELECTOR = '[data-testid="link-device-qr-code"], [data-testid="link-device-phone-number-entry-screen"]';
  const ROOT_CLASS = 'mwf-auth-surface';
  function createAuthSurface({document, isVisible, Observer, onTransition}) {
    let active = false, observer = null, running = true, generation = 0;
    function refresh() {
      if (!running) return false;
      // Presence, not visibility: our own blind CSS can hide authenticated #side.
      const next = !document.querySelector('#side, #main') &&
        [...document.querySelectorAll(LOGIN_SELECTOR)].some(isVisible);
      if (next === active) return active;
      active = next;
      const token = ++generation;
      // Prepare blind state and cancel old work BEFORE granting login suspension.
      onTransition(active);
      if (running && token === generation) document.documentElement.classList.toggle(ROOT_CLASS, active);
      return active;
    }
    function start() {
      if (!running || observer) return;
      // This observer calls only refresh, not the general surface/UI refresh:
      // native-surface inspection temporarily toggles root classes of its own.
      observer = new Observer(refresh);
      observer.observe(document.documentElement, {
        childList: true, subtree: true, attributes: true,
        attributeFilter: ['class', 'style', 'hidden'],
      });
      refresh();
    }
    function dispose() {
      if (!running) return;
      running = false;
      generation += 1;
      observer?.disconnect();
      active = false;
      document.documentElement.classList.remove(ROOT_CLASS);
    }
    return Object.freeze({start, refresh, dispose, isActive: () => active});
  }
  const api = Object.freeze({createAuthSurface});
  scope.MirrorAuthSurface = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
