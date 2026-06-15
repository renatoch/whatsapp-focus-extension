(() => {
  const ROOT_ACTIVE = "mwf-active";
  const ROOT_NORMAL = "mwf-normal";
  const ROOT_SEARCHING = "mwf-searching";
  const ROOT_SEARCH_FOCUSED = "mwf-search-focused";
  const ROOT_SEARCH_TOO_SHORT = "mwf-search-too-short";
  const ROOT_SEARCH_WAITING = "mwf-search-waiting";
  const ROOT_SIDEBAR_OPEN = "mwf-sidebar-open";
  const ROOT_SIDEBAR_HIDDEN = "mwf-sidebar-hidden";
  const ROOT_OVERLAY_OPEN = "mwf-overlay-open";
  const OVERLAY_ID = "mirror-whatsapp-focus-overlay";
  const RETURN_ID = "mirror-whatsapp-focus-return";
  const SIDEBAR_BUTTON_ID = "mirror-whatsapp-focus-sidebar";
  const SEARCH_AGAIN_BUTTON_ID = "mirror-whatsapp-focus-search-again";
  const SEARCH_GATE_ID = "mirror-whatsapp-focus-search-gate";
  const LOADING_PROGRESS_ID = "mirror-whatsapp-focus-loading-progress";
  const TOAST_ID = "mirror-whatsapp-focus-toast";
  const CONTROLS_ID = "mirror-whatsapp-focus-controls";
  const HOT_CSS_ID = "mirror-whatsapp-focus-hot-css";
  const HOT_CONFIG_CSS_ID = "mirror-whatsapp-focus-config-css";
  const BYPASS_MS = 5 * 60 * 1000;
  const DEV_REFRESH_MS = 1000;
  const MIN_SEARCH_CHARS = 3;
  const SEARCH_SETTLE_MS = 2000;
  const NORMAL_DELAY_MS = 5000;
  const DEBUG = false;
  let bypassTimer = null;
  let normalDelayTimer = null;
  let normalDelayInterval = null;
  let searchSettleTimer = null;
  let pendingSearchText = "";
  let revealedSearchText = "";
  let lastHotCss = "";
  let lastConfigCss = "";

  function debugLog(message, details = undefined) {
    if (!DEBUG) return;
    if (details === undefined) {
      console.log(`[WhatsApp Focus] ${message}`);
      return;
    }
    console.log(`[WhatsApp Focus] ${message}`, details);
  }

  function describeElement(element) {
    if (!element) return null;
    return {
      tag: element.tagName,
      id: element.id || null,
      role: element.getAttribute("role"),
      ariaLabel: element.getAttribute("aria-label"),
      title: element.getAttribute("title"),
      text: (element.textContent || "").trim().slice(0, 120),
      className: String(element.className || "").slice(0, 160),
    };
  }

  function root() {
    return document.documentElement;
  }

  function setActive({ showOverlay }) {
    clearNormalDelay();
    root().classList.add(ROOT_ACTIVE);
    root().classList.remove(ROOT_NORMAL, ROOT_SEARCHING, ROOT_SEARCH_FOCUSED, ROOT_SEARCH_TOO_SHORT, ROOT_SEARCH_WAITING, ROOT_SIDEBAR_OPEN, ROOT_SIDEBAR_HIDDEN);
    root().classList.toggle(ROOT_OVERLAY_OPEN, Boolean(showOverlay));
    ensureOverlay();
    ensureReturnButton();
    ensureSidebarButton();
    ensureSearchAgainButton();
    ensureSearchGateMessage();
    getOverlay().hidden = !showOverlay;
  }

  function setNormal() {
    clearNormalDelay();
    root().classList.remove(ROOT_ACTIVE, ROOT_SEARCHING, ROOT_SEARCH_FOCUSED, ROOT_SEARCH_TOO_SHORT, ROOT_SEARCH_WAITING, ROOT_SIDEBAR_OPEN, ROOT_SIDEBAR_HIDDEN, ROOT_OVERLAY_OPEN);
    root().classList.add(ROOT_NORMAL);
    const overlay = getOverlay();
    if (overlay) overlay.hidden = true;
  }

  function setSearchMode() {
    debugLog("setSearchMode:start", {
      ready: isWhatsAppReady(),
      searching: isSearching(),
      rootClass: root().className,
    });

    if (!isWhatsAppReady()) {
      debugLog("setSearchMode:not-ready -> overlay");
      setActive({ showOverlay: true });
      return;
    }

    window.clearTimeout(searchSettleTimer);
    searchSettleTimer = null;
    pendingSearchText = "";
    revealedSearchText = "";
    root().classList.remove(ROOT_ACTIVE, ROOT_NORMAL, ROOT_SIDEBAR_OPEN, ROOT_SIDEBAR_HIDDEN, ROOT_SEARCH_FOCUSED, ROOT_OVERLAY_OPEN);
    root().classList.add(ROOT_SEARCHING, ROOT_SEARCH_TOO_SHORT);
    const overlay = getOverlay();
    if (overlay) overlay.hidden = true;
    window.setTimeout(() => {
      goToMainChatsThen("search", () =>
        focusNativeSearch({ retriedFromNestedView: true, source: "after-shared-main-chats" })
      );
    }, 100);
  }

  function isSearching() {
    return root().classList.contains(ROOT_SEARCHING);
  }

  function isSidebarOpen() {
    return root().classList.contains(ROOT_SIDEBAR_OPEN);
  }

  function isSidebarHiddenManually() {
    return root().classList.contains(ROOT_SIDEBAR_HIDDEN);
  }

  function canToggleSidebar() {
    const overlay = getOverlay();
    return !isSearching() && !(overlay && !overlay.hidden) && !root().classList.contains(ROOT_ACTIVE);
  }

  function toggleSidebar() {
    if (!canToggleSidebar()) return;

    if (isSidebarOpen() || root().classList.contains(ROOT_NORMAL)) {
      setSidebarHiddenManually();
      return;
    }

    if (isSidebarHiddenManually()) {
      setSidebarOpen();
    }
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
    root().classList.remove(ROOT_ACTIVE, ROOT_NORMAL, ROOT_SEARCHING, ROOT_SEARCH_FOCUSED, ROOT_SEARCH_TOO_SHORT, ROOT_SEARCH_WAITING, ROOT_SIDEBAR_HIDDEN, ROOT_OVERLAY_OPEN);
    root().classList.add(ROOT_SIDEBAR_OPEN);
    if (overlay) overlay.hidden = true;
  }

  function setSidebarHiddenManually() {
    const overlay = getOverlay();
    root().classList.remove(ROOT_ACTIVE, ROOT_NORMAL, ROOT_SEARCHING, ROOT_SEARCH_FOCUSED, ROOT_SEARCH_TOO_SHORT, ROOT_SEARCH_WAITING, ROOT_SIDEBAR_OPEN, ROOT_OVERLAY_OPEN);
    root().classList.add(ROOT_SIDEBAR_HIDDEN);
    if (overlay) overlay.hidden = true;
  }

  function enterFocusedConversationSoon() {
    window.setTimeout(() => setSearchFocusedConversation(), 250);
  }

  function setSearchFocusedConversation() {
    const overlay = getOverlay();
    window.clearTimeout(searchSettleTimer);
    searchSettleTimer = null;
    pendingSearchText = "";
    revealedSearchText = "";
    root().classList.add(ROOT_ACTIVE, ROOT_SEARCH_FOCUSED);
    root().classList.remove(ROOT_NORMAL, ROOT_SEARCHING, ROOT_SEARCH_TOO_SHORT, ROOT_SEARCH_WAITING, ROOT_SIDEBAR_OPEN, ROOT_SIDEBAR_HIDDEN, ROOT_OVERLAY_OPEN);
    ensureOverlay();
    ensureReturnButton();
    ensureSidebarButton();
    ensureSearchAgainButton();
    if (overlay) overlay.hidden = true;
  }

  function continueOpenConversation() {
    debugLog("continueOpenConversation:start", {
      ready: isWhatsAppReady(),
      rootClass: root().className,
      hasOpenConversation: hasOpenConversation(),
      nativeSearchField: describeElement(findNativeSearchField()),
      nested: isNestedListView(),
    });

    goToMainChatsThen("continue", () => {
      debugLog("continueOpenConversation:after-main-chats", {
        rootClass: root().className,
        nativeSearchField: describeElement(findNativeSearchField()),
        nested: isNestedListView(),
      });
      setActive({ showOverlay: false });
    });
  }

  function goToMainChatsThen(source, callback) {
    const chatsButton = findMainChatsButton();
    debugLog("goToMainChatsThen:mainChatsButton", {
      source,
      button: describeElement(chatsButton),
    });

    if (chatsButton) {
      chatsButton.click();
      debugLog("goToMainChatsThen:clicked-mainChatsButton", { source });
      window.setTimeout(callback, 260);
      return;
    }

    debugLog("goToMainChatsThen:no-mainChatsButton", { source });
    callback();
  }

  function focusNativeSearch({ retriedFromNestedView = false, source = "unknown" } = {}) {
    const nested = isNestedListView();
    debugLog("focusNativeSearch:start", {
      source,
      retriedFromNestedView,
      nested,
      rootClass: root().className,
    });

    if (nested && !retriedFromNestedView) {
      debugLog("focusNativeSearch:nested -> exitNestedListView");
      exitNestedListView();
      window.setTimeout(
        () => focusNativeSearch({ retriedFromNestedView: true, source: "after-exit-nested" }),
        360
      );
      return;
    }

    const field = findNativeSearchField();
    debugLog("focusNativeSearch:field-result", describeElement(field));
    if (field) {
      field.focus();
      field.click();
      updateSearchGateState(field);
      debugLog("focusNativeSearch:field-focused", describeElement(field));
      return;
    }

    // WhatsApp hides the normal search field in nested views such as Archived.
    // Try to return to the main Chats/Conversas tab before giving up.
    if (!retriedFromNestedView) {
      debugLog("focusNativeSearch:no-field -> exitNestedListView");
      exitNestedListView();
      window.setTimeout(
        () => focusNativeSearch({ retriedFromNestedView: true, source: "after-no-field-exit" }),
        360
      );
      return;
    }

    debugLog("focusNativeSearch:failed -> toast");
    showToast(
      "Por enquanto, o modo busca só funciona na lista principal de mensagens. Feche Arquivadas, Configurações ou outras telas internas e tente de novo."
    );
  }

  function getSearchText(field = findNativeSearchField()) {
    if (!field) return "";
    if ("value" in field) return String(field.value || "").trim();
    return String(field.textContent || "").trim();
  }

  function updateSearchGateState(field = findNativeSearchField()) {
    if (!isSearching()) {
      resetSearchGate();
      root().classList.remove(ROOT_SEARCH_TOO_SHORT, ROOT_SEARCH_WAITING);
      return;
    }

    const searchText = getSearchText(field);
    if (searchText.length < MIN_SEARCH_CHARS) {
      resetSearchGate();
      pendingSearchText = searchText;
      updateSearchGateMessage(searchText);
      root().classList.remove(ROOT_SEARCH_WAITING);
      root().classList.add(ROOT_SEARCH_TOO_SHORT);
      return;
    }

    // Once a specific-enough query is revealed, keep results visible while the
    // user keeps refining it. Re-hiding on every DOM mutation/keystroke creates
    // flicker and fights WhatsApp's native filtering.
    if (revealedSearchText) {
      root().classList.remove(ROOT_SEARCH_TOO_SHORT, ROOT_SEARCH_WAITING);
      return;
    }

    if (searchText === pendingSearchText && searchSettleTimer) return;

    window.clearTimeout(searchSettleTimer);
    pendingSearchText = searchText;
    updateSearchGateMessage(searchText);
    root().classList.add(ROOT_SEARCH_TOO_SHORT, ROOT_SEARCH_WAITING);
    searchSettleTimer = window.setTimeout(() => {
      if (!isSearching() || getSearchText().length < MIN_SEARCH_CHARS) {
        updateSearchGateState();
        return;
      }
      searchSettleTimer = null;
      revealedSearchText = getSearchText();
      root().classList.remove(ROOT_SEARCH_TOO_SHORT, ROOT_SEARCH_WAITING);
    }, SEARCH_SETTLE_MS);
  }

  function resetSearchGate() {
    window.clearTimeout(searchSettleTimer);
    searchSettleTimer = null;
    pendingSearchText = "";
    revealedSearchText = "";
  }

  function findNativeSearchField() {
    const selectors = [
      '#side [contenteditable="true"][role="textbox"]',
      '#side [contenteditable="true"]',
      '#side input[type="text"]',
      '#side [role="textbox"]',
    ];

    for (const selector of selectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      debugLog("findNativeSearchField:selector", {
        selector,
        count: elements.length,
        visibleCount: elements.filter(isVisibleElement).length,
        first: describeElement(elements[0]),
      });
      const visible = elements.find(isVisibleElement);
      if (visible) return visible;
    }

    return undefined;
  }

  function isVisibleElement(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }

  function isNestedListView() {
    const backControl = findBackControl();
    const title = findNestedViewTitle();
    const nested = Boolean(backControl) || Boolean(title);
    debugLog("isNestedListView", {
      nested,
      backControl: describeElement(backControl),
      title: describeElement(title),
    });
    return nested;
  }

  function findNestedViewTitle() {
    const titles = ["Arquivadas", "Archived", "Configurações", "Settings"];
    return Array.from(document.querySelectorAll("#side h1, #side h2, #side header span, #side [title]"))
      .find((element) => titles.some((title) => (element.textContent || element.getAttribute("title") || "").includes(title)));
  }

  function exitNestedListView() {
    debugLog("exitNestedListView:start");
    const chatsButton = findMainChatsButton();
    debugLog("exitNestedListView:chatsButton", describeElement(chatsButton));
    if (chatsButton) {
      chatsButton.click();
      debugLog("exitNestedListView:clicked-chatsButton");
      return;
    }

    const backControl = findBackControl();
    debugLog("exitNestedListView:backControl", describeElement(backControl));
    if (backControl) {
      backControl.click();
      debugLog("exitNestedListView:clicked-backControl");
      return;
    }

    debugLog("exitNestedListView:fallback-escape");
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

  function findBackControl() {
    const backSelectors = [
      '#side [aria-label="Back"]',
      '#side [aria-label="Voltar"]',
      '#side [title="Back"]',
      '#side [title="Voltar"]',
      '#side [data-icon="back"]',
      '#side [data-testid="back"]',
    ];

    for (const selector of backSelectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      debugLog("findBackControl:selector", {
        selector,
        count: elements.length,
        first: describeElement(elements[0]),
      });
      const found = elements
        .map((element) => element.closest("button") || element.closest('[role="button"]') || element)
        .find(isVisibleElement);
      if (found) return found;
    }

    return undefined;
  }

  function findMainChatsButton() {
    const labels = ["Conversas", "Chats"];
    const candidates = Array.from(document.querySelectorAll('button, [role="button"], [aria-label], [title]'));
    debugLog("findMainChatsButton:candidates", {
      count: candidates.length,
      sample: candidates.slice(0, 12).map(describeElement),
    });

    const byLabel = candidates.find((element) => {
      if (!isVisibleElement(element) || isMirrorControl(element)) return false;
      const text = [
        element.getAttribute("aria-label"),
        element.getAttribute("title"),
        element.textContent,
      ]
        .filter(Boolean)
        .join(" ");
      return labels.some((label) => text.toLowerCase().includes(label.toLowerCase()));
    });

    if (byLabel) {
      debugLog("findMainChatsButton:found-by-label", describeElement(byLabel));
      return byLabel;
    }

    const byPosition = candidates
      .filter((element) => {
        if (!isVisibleElement(element) || isMirrorControl(element)) return false;
        const rect = element.getBoundingClientRect();
        return rect.left >= 0 && rect.left < 120 && rect.top > 35 && rect.top < 135 && rect.width > 24 && rect.height > 24;
      })
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];

    debugLog("findMainChatsButton:found-by-position", describeElement(byPosition));
    return byPosition;
  }

  function isMirrorControl(element) {
    return Boolean(element.closest?.("#mirror-whatsapp-focus-controls, #mirror-whatsapp-focus-overlay, #mirror-whatsapp-focus-toast"));
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
    if (!ready) updateOverlayLoadingProgress();
    overlay.querySelectorAll("[data-mwf-action]").forEach((button) => {
      button.disabled = !ready;
    });
  }

  function updateOverlayLoadingProgress() {
    const mirrorProgress = document.getElementById(LOADING_PROGRESS_ID);
    if (!mirrorProgress) return;

    const nativeProgress = findNativeLoadingProgress();
    if (!nativeProgress) {
      mirrorProgress.setAttribute("data-mwf-indeterminate", "true");
      mirrorProgress.max = 100;
      mirrorProgress.value = 8;
      return;
    }

    const max = Number(nativeProgress.getAttribute("max") || nativeProgress.max || 100);
    const value = Number(nativeProgress.getAttribute("value") || nativeProgress.value || 0);
    const nextMax = Number.isFinite(max) && max > 0 ? max : 100;
    const nextValue = Number.isFinite(value) ? value : 0;
    if (mirrorProgress.max !== nextMax) mirrorProgress.max = nextMax;
    if (mirrorProgress.value !== nextValue) mirrorProgress.value = nextValue;
    mirrorProgress.removeAttribute("data-mwf-indeterminate");
  }

  function findNativeLoadingProgress() {
    return Array.from(document.querySelectorAll("progress")).find((progress) => {
      if (progress.closest(`#${OVERLAY_ID}`)) return false;
      return isVisibleElement(progress);
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
        <div class="mwf-loading" aria-label="Carregando WhatsApp Web">
          <progress id="mirror-whatsapp-focus-loading-progress" class="mwf-loading-progress" value="0" max="100"></progress>
        </div>
        <div class="mwf-actions">
          <button class="mwf-button mwf-button-primary" data-mwf-action="search">Buscar conversa</button>
          <button class="mwf-button mwf-button-secondary" data-mwf-action="continue">Continuar na conversa aberta</button>
          <button class="mwf-button mwf-button-secondary" data-mwf-action="normal">Ver WhatsApp normal por 5 min</button>
        </div>
        <div class="mwf-normal-confirm" aria-live="polite">
          <h2>Abrir WhatsApp normal?</h2>
          <p class="mwf-normal-has-conversation">Se você só quer seguir na conversa aberta, dá para continuar sem ver a lista.</p>
          <p class="mwf-normal-no-conversation">Isso vai abrir a lista completa de conversas. Use só se for essa a intenção.</p>
          <p class="mwf-normal-countdown">Liberando em <strong data-mwf-normal-countdown>5</strong>s…</p>
          <div class="mwf-actions">
            <button class="mwf-button mwf-button-primary" data-mwf-action="continue">Continuar na conversa</button>
            <button class="mwf-button mwf-button-secondary" data-mwf-action="normal-cancel">Cancelar</button>
            <button class="mwf-button mwf-button-quiet" data-mwf-action="normal-now">Abrir agora</button>
          </div>
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
        clearNormalDelay();
        continueOpenConversation();
      }
      if (action === "normal") {
        startNormalDelay();
      }
      if (action === "normal-cancel") {
        clearNormalDelay();
      }
      if (action === "normal-now") {
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

  function ensureSearchGateMessage() {
    if (!document.body || document.getElementById(SEARCH_GATE_ID)) return;

    const message = document.createElement("div");
    message.id = SEARCH_GATE_ID;
    message.setAttribute("role", "status");
    message.textContent = searchGateMessageText("");

    document.body.appendChild(message);
  }

  function searchGateMessageText(searchText) {
    if (searchText.length < MIN_SEARCH_CHARS) return `Digite pelo menos ${MIN_SEARCH_CHARS} letras.`;
    return "Filtrando conversas…";
  }

  function updateSearchGateMessage(searchText) {
    const message = document.getElementById(SEARCH_GATE_ID);
    if (!message) return;
    message.textContent = searchGateMessageText(searchText);
  }

  function ensureSearchAgainButton() {
    if (!document.body || document.getElementById(SEARCH_AGAIN_BUTTON_ID)) return;

    const button = document.createElement("button");
    button.id = SEARCH_AGAIN_BUTTON_ID;
    button.type = "button";
    button.textContent = "Buscar";
    button.title = "Buscar outra conversa";
    button.addEventListener("click", () => setSearchMode());

    document.body.appendChild(button);
  }

  function showToast(message) {
    if (!document.body) return;
    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement("div");
      toast.id = TOAST_ID;
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => {
      toast.hidden = true;
    }, 6500);
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
    ensureSidebarButton();
    ensureSearchAgainButton();
    ensureSearchGateMessage();
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

    if (config.sidebarButton) {
      const top = config.sidebarButton.top || "560px";
      const left = config.sidebarButton.left || "6px";
      parts.push(`#${SIDEBAR_BUTTON_ID} { top: ${top} !important; left: ${left} !important; }`);
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
    document.addEventListener(
      "keydown",
      (event) => {
        if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return;
        if (event.key.toLowerCase() === "f") {
          event.preventDefault();
          event.stopImmediatePropagation();
          setActive({ showOverlay: true });
        }
        if (event.key.toLowerCase() === "l") {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (!canToggleSidebar()) return;
          toggleSidebar();
        }
      },
      true
    );
  }

  function installConversationStateObserver() {
    const observer = new MutationObserver(updateOverlayState);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setInterval(() => {
      if (!isWhatsAppReady()) updateOverlayState();
    }, 500);
    updateOverlayState();
  }

  function installSearchGateHandler() {
    const refresh = (event) => {
      if (!isSearching()) return;
      const field = event?.target?.closest?.('#side [contenteditable="true"], #side input[type="text"], #side [role="textbox"]');
      updateSearchGateState(field || undefined);
    };

    document.addEventListener("input", refresh, true);
    document.addEventListener("keyup", refresh, true);
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

  function startNormalDelay() {
    const overlay = getOverlay();
    if (!overlay) return;

    ensureNormalConfirm(overlay);
    clearNormalDelay();
    overlay.classList.add("mwf-normal-pending");
    const startedAt = Date.now();

    const updateCountdown = () => {
      const remainingMs = Math.max(0, NORMAL_DELAY_MS - (Date.now() - startedAt));
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      overlay.querySelectorAll("[data-mwf-normal-countdown]").forEach((element) => {
        element.textContent = String(remainingSeconds);
      });
    };

    updateCountdown();
    normalDelayInterval = window.setInterval(updateCountdown, 200);
    normalDelayTimer = window.setTimeout(() => setNormalTemporarily(), NORMAL_DELAY_MS);
  }

  function ensureNormalConfirm(overlay = getOverlay()) {
    if (!overlay || overlay.querySelector(".mwf-normal-confirm")) return;
    const card = overlay.querySelector(".mwf-card");
    if (!card) return;

    const confirm = document.createElement("div");
    confirm.className = "mwf-normal-confirm";
    confirm.setAttribute("aria-live", "polite");
    confirm.innerHTML = `
      <h2>Abrir WhatsApp normal?</h2>
      <p class="mwf-normal-has-conversation">Se você só quer seguir na conversa aberta, dá para continuar sem ver a lista.</p>
      <p class="mwf-normal-no-conversation">Isso vai abrir a lista completa de conversas. Use só se for essa a intenção.</p>
      <p class="mwf-normal-countdown">Liberando em <strong data-mwf-normal-countdown>5</strong>s…</p>
      <div class="mwf-actions">
        <button class="mwf-button mwf-button-primary" data-mwf-action="continue">Continuar na conversa</button>
        <button class="mwf-button mwf-button-secondary" data-mwf-action="normal-cancel">Cancelar</button>
        <button class="mwf-button mwf-button-quiet" data-mwf-action="normal-now">Abrir agora</button>
      </div>
    `;
    card.appendChild(confirm);
  }

  function clearNormalDelay() {
    if (normalDelayTimer) window.clearTimeout(normalDelayTimer);
    if (normalDelayInterval) window.clearInterval(normalDelayInterval);
    normalDelayTimer = null;
    normalDelayInterval = null;
    const overlay = getOverlay();
    if (overlay) overlay.classList.remove("mwf-normal-pending");
  }

  function setNormalTemporarily() {
    clearNormalDelay();
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
    installSearchGateHandler();
    installSearchSelectionHandler();
    installConversationStateObserver();
    whenBodyExists(() => {
      ensureControls();
      setActive({ showOverlay: true });
    });
  }

  root().classList.remove(ROOT_SEARCHING, ROOT_SEARCH_FOCUSED, ROOT_SEARCH_TOO_SHORT, ROOT_SEARCH_WAITING, ROOT_SIDEBAR_OPEN, ROOT_SIDEBAR_HIDDEN, ROOT_NORMAL);
  root().classList.add(ROOT_ACTIVE, ROOT_OVERLAY_OPEN);
  boot();
})();
