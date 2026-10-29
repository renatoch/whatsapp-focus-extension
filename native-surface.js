(function exposeNativeSurface(scope) {
  'use strict';
  function createNativeSurface({document, isVisible, channelFocusedClass}) {
    const visible = selector => [...document.querySelectorAll(selector)].filter(isVisible);
    function inspect() {
      // Channel focus hides native sidebar DOM with our own CSS. Measure the
      // native surface without that CSS, synchronously, then restore it before paint.
      const classes = document.documentElement.classList;
      const focused = classes.contains(channelFocusedClass);
      if (focused) classes.remove(channelFocusedClass);
      try {
        if (visible('[data-testid="status-player-contact-name"]').length) return 'status-player';
        if (visible('[data-testid="status-drawer"]').length) return 'status-list';
        const drawers = visible('[data-testid="newsletter-drawer"]');
        if (drawers.length) {
          const selected = drawers.some(drawer => [...drawer.querySelectorAll('[data-testid="newsletter-tab-newsletter-cell"]')]
            .some(cell => cell.getAttribute('aria-selected') === 'true' || cell.querySelector('[aria-selected="true"]')));
          return selected && visible('#main').length ? 'channel' : 'channel-list';
        }
        return visible('#main').length ? 'conversation' : 'unknown';
      } finally { if (focused) classes.add(channelFocusedClass); }
    }
    return Object.freeze({inspect});
  }
  const api = Object.freeze({createNativeSurface});
  scope.MirrorNativeSurface = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
