(function exposeDevAssets(globalScope) {
  "use strict";

  function cssEscape(value) {
    return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  }

  function cssFromConfig(config, { returnId, sidebarId, searchingClass }) {
    const parts = [];
    if (config.returnButton) {
      const top = config.returnButton.top || "14px";
      const left = config.returnButton.left || "72px";
      parts.push(`#${returnId} { top: ${top} !important; left: ${left} !important; }`);
    }
    if (config.sidebarButton) {
      const top = config.sidebarButton.top || "560px";
      const left = config.sidebarButton.left || "6px";
      parts.push(`#${sidebarId} { top: ${top} !important; left: ${left} !important; }`);
    }
    if (Array.isArray(config.hideInSearch) && config.hideInSearch.length > 0) {
      const selectors = config.hideInSearch.map((selector) => `html.${searchingClass} ${selector}`).join(",\n");
      parts.push(`${selectors} { visibility: hidden !important; }`);
    }
    if (Array.isArray(config.dimInSearch) && config.dimInSearch.length > 0) {
      const selectors = config.dimInSearch.map((selector) => `html.${searchingClass} ${selector}`).join(",\n");
      parts.push(`${selectors} { opacity: 0.16 !important; }`);
    }
    if (Array.isArray(config.hideTextIncludes) && config.hideTextIncludes.length > 0) {
      for (const text of config.hideTextIncludes) {
        parts.push(`html.${searchingClass} #side [aria-label*="${cssEscape(text)}" i] { visibility: hidden !important; }`);
      }
    }
    return parts.join("\n\n");
  }

  function createDevAssets({ scheduler, intervalMs, fetchText, applyStyle, convertConfig, onError }) {
    let running = true, generation = 0, interval = null, flight = null;
    let lastCss = "", lastConfigCss = "";
    const valid = token => running && token === generation;

    function refresh() {
      if (!running) return Promise.resolve();
      if (flight) return flight.promise;
      const token = generation;
      const request = {};
      flight = request;
      request.promise = (async () => {
        try {
          const css = await fetchText("focus.css");
          if (!valid(token)) return;
          if (css && css !== lastCss) {
            applyStyle("css", css);
            if (!valid(token)) return;
            lastCss = css;
          }
          const configText = await fetchText("dev-config.json");
          if (!valid(token) || !configText) return;
          const configCss = convertConfig(JSON.parse(configText));
          if (!valid(token)) return;
          if (configCss !== lastConfigCss) {
            applyStyle("config", configCss);
            if (valid(token)) lastConfigCss = configCss;
          }
        } catch (error) {
          if (valid(token)) onError(error);
        }
      })().finally(() => { if (flight === request) flight = null; });
      return request.promise;
    }

    function start() {
      if (interval !== null) return;
      running = true;
      const token = generation;
      const initial = refresh();
      if (valid(token)) interval = scheduler.setInterval(() => {
        if (valid(token)) return refresh();
      }, intervalMs);
      return initial;
    }

    function dispose() {
      if (!running) return;
      running = false;
      generation += 1;
      if (interval !== null) scheduler.clearInterval(interval);
      interval = null;
      flight = null;
    }

    return Object.freeze({ refresh, start, dispose });
  }

  const api = Object.freeze({ cssFromConfig, createDevAssets });
  globalScope.MirrorDevAssets = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
