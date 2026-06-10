(() => {
  const ROOT_ACTIVE = "mwf-active";
  const ROOT_NORMAL = "mwf-normal";
  const ROOT_SEARCHING = "mwf-searching";
  const ROOT_SIDEBAR_OPEN = "mwf-sidebar-open";
  const ROOT_SIDEBAR_COLLAPSED = "mwf-sidebar-collapsed";
  const ROOT_OVERLAY_OPEN = "mwf-overlay-open";
  const OVERLAY_ID = "mirror-whatsapp-focus-overlay";
  const RETURN_ID = "mirror-whatsapp-focus-return";
  const SEARCH_BUTTON_ID = "mirror-whatsapp-focus-search";
  const SIDEBAR_BUTTON_ID = "mirror-whatsapp-focus-sidebar";
  const MODE_BUTTON_ID = "mirror-whatsapp-focus-mode";
  const CONTROLS_ID = "mirror-whatsapp-focus-controls";
  const COLLAPSED_PANE_ATTR = "data-mwf-collapsed-pane";
  const HOT_CSS_ID = "mirror-whatsapp-focus-hot-css";
  const HOT_CONFIG_CSS_ID = "mirror-whatsapp-focus-config-css";
  const BYPASS_MS = 5 * 60 * 1000;
  const DEV_REFRESH_MS = 1000;
  const MODE_STORAGE_KEY = "mirrorWhatsAppFocusSidebarMode";
  const SIDEBAR_MODE_HIDDEN = "hidden";
  const SIDEBAR_MODE_COLLAPSED = "collapsed";
  let bypassTimer = null;
  let lastHotCss = "";
  let lastConfigCss = "";

  function root() {
    return document.documentElement;
  }

  function getSidebarMode() {
    return localStorage.getItem(MODE_STORAGE_KEY) === SIDEBAR_MODE_COLLAPSED
      ? SIDEBAR_MODE_COLLAPSED
      : SIDEBAR_MODE_HIDDEN;
  }

  function isCollapsedMode() {
    return getSidebarMode() === SIDEBAR_MODE_COLLAPSED;
  }

  function toggleSidebarMode() {
    const nextMode = isCollapsedMode() ? SIDEBAR_MODE_HIDDEN : SIDEBAR_MODE_COLLAPSED;
    localStorage.setItem(MODE_STORAGE_KEY, nextMode);
    updateModeButton();
  }

  function setActive({ showOverlay }) {
    clearCollapsedSidebarPane();
    root().classList.add(ROOT_ACTIVE);
    root().classList.remove(ROOT_NORMAL, ROOT_SEARCHING, ROOT_SIDEBAR_OPEN, ROOT_SIDEBAR_COLLAPSED);
    root().classList.toggle(ROOT_OVERLAY_OPEN, Boolean(showOverlay));
    ensureOverlay();
    ensureReturnButton();
    ensureSearchButton();
    ensureSidebarButton();
    ensureModeButton();
    getOverlay().hidden = !showOverlay;
  }

  function setNormal() {
    clearCollapsedSidebarPane();
    root().classList.remove(ROOT_ACTIVE, ROOT_SEARCHING, ROOT_SIDEBAR_OPEN, ROOT_SIDEBAR_COLLAPSED, ROOT_OVERLAY_OPEN);
    root().classList.add(ROOT_NORMAL);
    const overlay = getOverlay();
    if (overlay) overlay.hidden = true;
  }

  function setSearchMode() {
    if (!isWhatsAppReady()) {
      setActive({ showOverlay: true });
      return;
    }

    clearCollapsedSidebarPane();
    root().classList.remove(ROOT_ACTIVE, ROOT_NORMAL, ROOT_SIDEBAR_OPEN, ROOT_SIDEBAR_COLLAPSED, ROOT_OVERLAY_OPEN);
    root().classList.add(ROOT_SEARCHING);
    const overlay = getOverlay();
    if (overlay) overlay.hidden = true;
    window.setTimeout(focusNativeSearch, 100);
  }

  function isSearching() {
    return root().classList.contains(ROOT_SEARCHING);
  }

  function isSidebarOpen() {
    return root().classList.contains(ROOT_SIDEBAR_OPEN);
  }

  function isSidebarCollapsed() {
    return root().classList.contains(ROOT_SIDEBAR_COLLAPSED);
  }

  function toggleSidebar() {
    if (isSearching()) return;
    const overlay = getOverlay();
    if (overlay && !overlay.hidden) return;

    if (isSidebarOpen() || isSidebarCollapsed()) {
      setActive({ showOverlay: false });
      return;
    }

    setSidebarOpen();
  }

  function isConversationListClick(target) {
    if (!target?.closest) return false;
    const side = target.closest("#side");
    if (!side) return false;
    return Boolean(
      target.closest('[data-testid="cell-frame-container"]') ||
        target.closest('[role="listitem"]') ||
        target.closest('[role="row"]')
    );
  }

  function setSidebarOpen() {
    const overlay = getOverlay();
    clearCollapsedSidebarPane();
    root().classList.remove(ROOT_ACTIVE, ROOT_NORMAL, ROOT_SEARCHING, ROOT_SIDEBAR_COLLAPSED, ROOT_OVERLAY_OPEN);
    root().classList.add(ROOT_SIDEBAR_OPEN);
    if (overlay) overlay.hidden = true;
  }

  function setSidebarCollapsed() {
    const overlay = getOverlay();
    root().classList.remove(ROOT_ACTIVE, ROOT_NORMAL, ROOT_SEARCHING, ROOT_SIDEBAR_OPEN, ROOT_OVERLAY_OPEN);
    root().classList.add(ROOT_SIDEBAR_COLLAPSED);
    markCollapsedSidebarPane();
    if (overlay) overlay.hidden = true;
  }

  function clearCollapsedSidebarPane() {
    document.querySelectorAll(`[${COLLAPSED_PANE_ATTR}]`).forEach((element) => {
      element.removeAttribute(COLLAPSED_PANE_ATTR);
    });
  }

  function markCollapsedSidebarPane() {
    clearCollapsedSidebarPane();
    const side = document.querySelector("#side");
    if (!side) return;

    const sideRect = side.getBoundingClientRect();
    let pane = side;
    let current = side.parentElement;

    while (current && current !== document.body) {
      const rect = current.getBoundingClientRect();
      const isTooBroad = rect.width > 620 || rect.right > window.innerWidth * 0.72;
      const isLikelySidebarPane =
        !isTooBroad &&
        rect.width >= Math.max(240, sideRect.width) &&
        rect.left < Math.max(180, window.innerWidth * 0.22) &&
        rect.height > window.innerHeight * 0.5;

      if (isLikelySidebarPane) pane = current;
      current = current.parentElement;
    }

    pane.setAttribute(COLLAPSED_PANE_ATTR, "true");
  }

  function enterFocusedConversationSoon() {
    window.setTimeout(() => {
      if (isCollapsedMode()) {
        setSidebarCollapsed();
        return;
      }
      setActive({ showOverlay: false });
    }, 250);
  }

  function focusNativeSearch({ retriedFromNestedView = false } = {}) {
    const field = findNativeSearchField();
    if (field) {
      field.focus();
      field.click();
      return;
    }

    // WhatsApp hides the normal search field in nested views such as Archived.
    // First try the explicit Back/Voltar control; then fall back to Esc events.
    if (!retriedFromNestedView) {
      exitNestedListView();
      window.setTimeout(() => focusNativeSearch({ retriedFromNestedView: true }), 260);
    }
  }

  function findNativeSearchField() {
    const selectors = [
      '#side [contenteditable="true"][role="textbox"]',
      '#side [contenteditable="true"]',
      '#side input[type="text"]',
      '#side [role="textbox"]',
    ];

    return selectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .find(isVisibleElement);
  }

  function isVisibleElement(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }

  function exitNestedListView() {
    const backSelectors = [
      '#side [aria-label="Back"]',
      '#side [aria-label="Voltar"]',
      '#side [title="Back"]',
      '#side [title="Voltar"]',
      '#side [data-icon="back"]',
      '#side [data-testid="back"]',
    ];

    const backControl = backSelectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .map((element) => element.closest("button") || element.closest('[role="button"]') || element)
      .find(isVisibleElement);

    if (backControl) {
      backControl.click();
      return;
    }

    for (const target of [document.activeElement, document.body, document, window]) {
      if (!target?.dispatchEvent) continue;
      target.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          keyCode: 27,
          which: 27,
          bubbles: true,
          cancelable: true,
        })
      );
      target.dispatchEvent(
        new KeyboardEvent("keyup", {
          key: "Escape",
          code: "Escape",
          keyCode: 27,
          which: 27,
          bubbles: true,
          cancelable: true,
        })
      );
    }
  }

  function getOverlay() {
    return document.getElementById(OVERLAY_ID);
  }

  function hasOpenConversation() {
    return Boolean(document.querySelector("#main"));
  }

  function isWhatsAppReady() {
    return Boolean(document.querySelector("#side"));
  }

  function updateOverlayState() {
    const overlay = getOverlay();
    if (!overlay) return;
    const ready = isWhatsAppReady();
    overlay.classList.toggle("mwf-ready", ready);
    overlay.classList.toggle("mwf-has-conversation", hasOpenConversation());
    overlay.querySelectorAll("[data-mwf-action]").forEach((button) => {
      button.disabled = !ready;
    });
  }

  function ensureOverlay() {
    if (!document.body || getOverlay()) return;

    const overlay = document.createElement("section");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("aria-label", "Modo foco do WhatsApp");
    overlay.innerHTML = `
      <div class="mwf-card" role="dialog" aria-modal="true" aria-labelledby="mwf-title">
        <p class="mwf-kicker">WhatsApp Focus Mode</p>
        <h1 id="mwf-title">Modo foco</h1>
        <p>O WhatsApp está cego por padrão. Abra somente o que você veio buscar — sem lista de conversas, arquivadas, badges ou previews.</p>
        <p class="mwf-loading">Carregando WhatsApp Web… os comandos aparecem quando a interface estiver pronta.</p>
        <div class="mwf-actions">
          <button class="mwf-button mwf-button-primary" data-mwf-action="search">Buscar conversa</button>
          <button class="mwf-button mwf-button-secondary" data-mwf-action="continue">Continuar na conversa aberta</button>
          <button class="mwf-button mwf-button-secondary" data-mwf-action="normal">Ver WhatsApp normal por 5 min</button>
        </div>
      </div>
    `;

    overlay.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-mwf-action]");
      if (!button) return;

      if (!isWhatsAppReady()) return;

      const action = button.getAttribute("data-mwf-action");
      if (action === "search") {
        setSearchMode();
      }
      if (action === "continue") {
        setActive({ showOverlay: false });
      }
      if (action === "normal") {
        setNormalTemporarily();
      }
    });

    document.body.appendChild(overlay);
    updateOverlayState();
  }

  function ensureReturnButton() {
    if (!document.body || document.getElementById(RETURN_ID)) return;

    const button = document.createElement("button");
    button.id = RETURN_ID;
    button.type = "button";
    button.textContent = "Foco";
    button.title = "Voltar ao modo foco (Alt+Shift+F)";
    button.addEventListener("click", () => {
      if (bypassTimer) window.clearTimeout(bypassTimer);
      bypassTimer = null;
      setActive({ showOverlay: true });
    });

    getControlsContainer().appendChild(button);
  }

  function ensureSearchButton() {
    if (!document.body || document.getElementById(SEARCH_BUTTON_ID)) return;

    const button = document.createElement("button");
    button.id = SEARCH_BUTTON_ID;
    button.type = "button";
    button.textContent = "Buscar";
    button.title = "Buscar outra conversa (Alt+Shift+B)";
    button.addEventListener("click", () => setSearchMode());

    getControlsContainer().appendChild(button);
  }

  function ensureSidebarButton() {
    if (!document.body || document.getElementById(SIDEBAR_BUTTON_ID)) return;

    const button = document.createElement("button");
    button.id = SIDEBAR_BUTTON_ID;
    button.type = "button";
    button.textContent = "Lateral";
    button.title = "Mostrar/ocultar barra lateral (Alt+Shift+L)";
    button.addEventListener("click", () => toggleSidebar());

    getControlsContainer().appendChild(button);
  }

  function ensureModeButton() {
    if (!document.body || document.getElementById(MODE_BUTTON_ID)) return;

    const button = document.createElement("button");
    button.id = MODE_BUTTON_ID;
    button.type = "button";
    button.addEventListener("click", () => toggleSidebarMode());

    getControlsContainer().appendChild(button);
    updateModeButton();
  }

  function updateModeButton() {
    const button = document.getElementById(MODE_BUTTON_ID);
    if (!button) return;
    button.textContent = isCollapsedMode() ? "Colapso" : "Oculta";
    button.title = isCollapsedMode()
      ? "Modo colapso: ao escolher conversa, reduz a lateral. Clique para ocultar lateral."
      : "Modo oculta: ao escolher conversa, esconde a lateral. Clique para modo colapso.";
    button.setAttribute("aria-pressed", String(isCollapsedMode()));
  }

  function getControlsContainer() {
    let controls = document.getElementById(CONTROLS_ID);
    if (controls) return controls;
    controls = document.createElement("div");
    controls.id = CONTROLS_ID;
    document.body.appendChild(controls);
    return controls;
  }

  function ensureControls() {
    if (!document.body) return;
    getControlsContainer();
    ensureReturnButton();
    ensureSearchButton();
    ensureSidebarButton();
    ensureModeButton();
  }

  function ensureStyle(id) {
    let style = document.getElementById(id);
    if (style) return style;
    style = document.createElement("style");
    style.id = id;
    (document.head || document.documentElement).appendChild(style);
    return style;
  }

  async function fetchExtensionText(path) {
    if (!globalThis.chrome?.runtime?.getURL) return null;
    const url = chrome.runtime.getURL(path) + `?t=${Date.now()}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    return response.text();
  }

  function cssEscape(value) {
    return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  }

  function cssFromConfig(config) {
    const parts = [];

    if (config.returnButton) {
      const top = config.returnButton.top || "14px";
      const left = config.returnButton.left || "72px";
      parts.push(`#${RETURN_ID} { top: ${top} !important; left: ${left} !important; }`);
    }

    if (config.searchButton) {
      const top = config.searchButton.top || "14px";
      const left = config.searchButton.left || "430px";
      parts.push(`#${SEARCH_BUTTON_ID} { top: ${top} !important; left: ${left} !important; }`);
    }

    if (config.sidebarButton) {
      const top = config.sidebarButton.top || "560px";
      const left = config.sidebarButton.left || "6px";
      parts.push(`#${SIDEBAR_BUTTON_ID} { top: ${top} !important; left: ${left} !important; }`);
    }

    if (config.modeButton) {
      const top = config.modeButton.top || "640px";
      const left = config.modeButton.left || "6px";
      parts.push(`#${MODE_BUTTON_ID} { top: ${top} !important; left: ${left} !important; }`);
    }

    if (Array.isArray(config.hideInSearch) && config.hideInSearch.length > 0) {
      const selectors = config.hideInSearch.map((selector) => `html.${ROOT_SEARCHING} ${selector}`).join(",\n");
      parts.push(`${selectors} { visibility: hidden !important; }`);
    }

    if (Array.isArray(config.dimInSearch) && config.dimInSearch.length > 0) {
      const selectors = config.dimInSearch.map((selector) => `html.${ROOT_SEARCHING} ${selector}`).join(",\n");
      parts.push(`${selectors} { opacity: 0.16 !important; }`);
    }

    if (Array.isArray(config.hideTextIncludes) && config.hideTextIncludes.length > 0) {
      for (const text of config.hideTextIncludes) {
        parts.push(`html.${ROOT_SEARCHING} #side [aria-label*="${cssEscape(text)}" i] { visibility: hidden !important; }`);
      }
    }

    return parts.join("\n\n");
  }

  async function refreshDevAssets() {
    try {
      const css = await fetchExtensionText("focus.css");
      if (css && css !== lastHotCss) {
        ensureStyle(HOT_CSS_ID).textContent = css;
        lastHotCss = css;
      }

      const configText = await fetchExtensionText("dev-config.json");
      if (!configText) return;
      const configCss = cssFromConfig(JSON.parse(configText));
      if (configCss !== lastConfigCss) {
        ensureStyle(HOT_CONFIG_CSS_ID).textContent = configCss;
        lastConfigCss = configCss;
      }
    } catch (error) {
      // Keep the current prototype running even if a config edit is temporarily invalid.
      console.debug("WhatsApp Focus Mode dev refresh failed", error);
    }
  }

  function startDevRefresh() {
    refreshDevAssets();
    window.setInterval(refreshDevAssets, DEV_REFRESH_MS);
  }

  function installKeyboardShortcuts() {
    document.addEventListener("keydown", (event) => {
      if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return;
      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        setActive({ showOverlay: true });
      }
      if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        setSearchMode();
      }
      if (event.key.toLowerCase() === "l") {
        event.preventDefault();
        toggleSidebar();
      }
    });
  }

  function installConversationStateObserver() {
    const observer = new MutationObserver(() => {
      updateOverlayState();
      if (isSidebarCollapsed()) markCollapsedSidebarPane();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    updateOverlayState();
  }

  function installSearchSelectionHandler() {
    document.addEventListener(
      "click",
      (event) => {
        if (!isSearching()) return;
        if (!isConversationListClick(event.target)) return;
        enterFocusedConversationSoon();
      },
      true
    );

    document.addEventListener("keydown", (event) => {
      if (!isSearching()) return;
      if (event.key !== "Enter") return;
      enterFocusedConversationSoon();
    });
  }

  function whenBodyExists(callback) {
    if (document.body) {
      callback();
      return;
    }

    const observer = new MutationObserver(() => {
      if (!document.body) return;
      observer.disconnect();
      callback();
    });
    observer.observe(document.documentElement, { childList: true });
  }

  function setNormalTemporarily() {
    if (bypassTimer) window.clearTimeout(bypassTimer);
    setNormal();
    bypassTimer = window.setTimeout(() => {
      bypassTimer = null;
      setActive({ showOverlay: true });
    }, BYPASS_MS);
  }

  function boot() {
    startDevRefresh();
    installKeyboardShortcuts();
    installSearchSelectionHandler();
    installConversationStateObserver();
    whenBodyExists(() => {
      ensureControls();
      setActive({ showOverlay: true });
    });
  }

  root().classList.remove(ROOT_SEARCHING, ROOT_SIDEBAR_OPEN, ROOT_SIDEBAR_COLLAPSED, ROOT_NORMAL);
  root().classList.add(ROOT_ACTIVE, ROOT_OVERLAY_OPEN);
  boot();
})();
