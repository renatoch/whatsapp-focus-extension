(() => {
  const ROOT_ACTIVE = "mwf-active";
  const ROOT_NORMAL = "mwf-normal";
  const ROOT_SEARCHING = "mwf-searching";
  const ROOT_SEARCH_FOCUSED = "mwf-search-focused";
  const ROOT_SEARCH_TOO_SHORT = "mwf-search-too-short";
  const ROOT_SEARCH_NAVIGATION = "mwf-search-navigation";
  const ROOT_SEARCH_WAITING = "mwf-search-waiting";
  const ROOT_SIDEBAR_OPEN = "mwf-sidebar-open";
  const ROOT_SIDEBAR_HIDDEN = "mwf-sidebar-hidden";
  const ROOT_OVERLAY_OPEN = "mwf-overlay-open";
  const ROOT_OPENING_RECENT = "mwf-opening-recent";
  const OVERLAY_ID = "mirror-whatsapp-focus-overlay";
  const RETURN_ID = "mirror-whatsapp-focus-return";
  const SIDEBAR_BUTTON_ID = "mirror-whatsapp-focus-sidebar";
  const SEARCH_AGAIN_BUTTON_ID = "mirror-whatsapp-focus-search-again";
  const SEARCH_GATE_ID = "mirror-whatsapp-focus-search-gate";
  const LOADING_PROGRESS_ID = "mirror-whatsapp-focus-loading-progress";
  const FOCUS_STREAK_ID = "mirror-whatsapp-focus-streak";
  const AWARENESS_PANEL_ID = "mirror-whatsapp-focus-awareness";
  const LAST_NORMAL_OPEN_KEY = "mirror-whatsapp-focus-last-normal-opened-at";
  const TOAST_ID = "mirror-whatsapp-focus-toast";
  const CONTROLS_ID = "mirror-whatsapp-focus-controls";
  const FOCUSED_RECENTS_ID = "mirror-whatsapp-focus-recents";
  const FIXED_COLLECTIONS_KEY = "mirror-whatsapp-focus-fixed-collections-v1";
  const ADD_COLLECTION_ID = "mirror-whatsapp-focus-add-collection";
  const COLLECTION_CHOOSER_ID = "mirror-whatsapp-focus-collection-chooser";
  const HOT_CSS_ID = "mirror-whatsapp-focus-hot-css";
  const HOT_CONFIG_CSS_ID = "mirror-whatsapp-focus-config-css";
  const BYPASS_MS = 5 * 60 * 1000;
  const DEV_REFRESH_MS = 1000;
  const MIN_SEARCH_CHARS = 3;
  const SEARCH_SETTLE_MS = 1000;
  const RECENT_SEARCH_INITIAL_MS = 100;
  const RECENT_SEARCH_RETRY_MS = 150;
  const RECENT_CONFIRM_RETRY_MS = 150;
  const RECENT_NAVIGATION_RETRIES = 10;
  const FOCUSED_CAPTURE_RETRIES = 5;
  const NORMAL_DELAY_MS = 8000;
  const RECENT_NORMAL_OPEN_MS = 10 * 60 * 1000;
  const DEBUG = false;
  const awarenessAdapter = globalThis.chrome?.storage?.local
    ? globalThis.MirrorAwareness?.createChromeStorageAdapter(globalThis.chrome.storage.local)
    : null;
  const awarenessStore = awarenessAdapter
    ? globalThis.MirrorAwareness?.createPersistentStore(awarenessAdapter)
    : null;
  const fixedCollectionsAdapter = globalThis.chrome?.storage?.local
    ? globalThis.MirrorAwareness?.createChromeStorageAdapter(globalThis.chrome.storage.local)
    : null;
  let bypassTimer = null;
  let normalDelayTimer = null;
  let normalDelayInterval = null;
  let searchSettleTimer = null;
  let pendingSearchText = "";
  let revealedSearchText = "";
  let lastHotCss = "";
  let lastConfigCss = "";
  let normalAttemptStartedAt = null;
  let normalAttemptRecent = false;
  let intentPromptStartedAt = null;
  let pendingIntent = null;
  let focusedRecents = [];
  let recentCaptureToken = 0;
  let recentNavigationToken = 0;
  let recentNavigationStartedAt = 0;
  let recentNavigationDiagnostic = null;
  let recentNavigationSource = "recent";
  let fixedCollectionsState = globalThis.MirrorFixedCollections?.createEmptyState() || { version: 1, collections: [] };
  let expandedFixedCollectionName = "";
  const fixedCollectionRenderCache = new WeakMap();
  let pendingCollectionTitle = "";

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
    recentCaptureToken += 1;
    closeFixedCollectionChooser();
    if (normalAttemptStartedAt) finishNormalAttempt("attempt_cancelled");
    intentPromptStartedAt = null;
    getOverlay()?.classList.remove("mwf-intent-pending");
    clearNormalDelay();
    updateFocusStreak();
    root().classList.add(ROOT_ACTIVE);
    root().classList.remove(ROOT_NORMAL, ROOT_SEARCHING, ROOT_SEARCH_FOCUSED, ROOT_SEARCH_TOO_SHORT, ROOT_SEARCH_WAITING, ROOT_SIDEBAR_OPEN, ROOT_SIDEBAR_HIDDEN, ROOT_OPENING_RECENT);
    root().classList.toggle(ROOT_OVERLAY_OPEN, Boolean(showOverlay));
    ensureOverlay();
    ensureReturnButton();
    ensureSidebarButton();
    ensureSearchAgainButton();
    ensureSearchGateMessage();
    ensureFocusedRecentsShelf();
    ensureAddCollectionButton();
    ensureFixedCollectionChooser();
    renderFocusedRecents();
    renderFixedCollections();
    getOverlay().hidden = !showOverlay;
  }

  function setNormal() {
    closeFixedCollectionChooser();
    clearNormalDelay();
    root().classList.remove(ROOT_ACTIVE, ROOT_SEARCHING, ROOT_SEARCH_FOCUSED, ROOT_SEARCH_TOO_SHORT, ROOT_SEARCH_WAITING, ROOT_SIDEBAR_OPEN, ROOT_SIDEBAR_HIDDEN, ROOT_OVERLAY_OPEN, ROOT_OPENING_RECENT);
    root().classList.add(ROOT_NORMAL);
    const overlay = getOverlay();
    if (overlay) overlay.hidden = true;
  }

  function setSearchMode() {
    recentCaptureToken += 1;
    closeFixedCollectionChooser();
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
    root().classList.remove(ROOT_ACTIVE, ROOT_NORMAL, ROOT_SIDEBAR_OPEN, ROOT_SIDEBAR_HIDDEN, ROOT_SEARCH_FOCUSED, ROOT_OVERLAY_OPEN, ROOT_OPENING_RECENT);
    root().classList.add(ROOT_SEARCHING, ROOT_SEARCH_TOO_SHORT);
    expandedFixedCollectionName = "";
    ensureFocusedRecentsShelf();
    renderFocusedRecents();
    renderFixedCollections();
    updateSearchNavigation("");
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
      hideSidebarFromCurrentView();
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

  function hideSidebarFromCurrentView() {
    goToMainChatsThen("sidebar", () => setSidebarHiddenManually());
  }

  function setSidebarHiddenManually() {
    const overlay = getOverlay();
    root().classList.remove(ROOT_ACTIVE, ROOT_NORMAL, ROOT_SEARCHING, ROOT_SEARCH_FOCUSED, ROOT_SEARCH_TOO_SHORT, ROOT_SEARCH_WAITING, ROOT_SIDEBAR_OPEN, ROOT_OVERLAY_OPEN);
    root().classList.add(ROOT_SIDEBAR_HIDDEN);
    if (overlay) overlay.hidden = true;
  }

  function enterFocusedConversationSoon(expectedTitle = "") {
    window.setTimeout(() => {
      setSearchFocusedConversation();
      window.setTimeout(() => captureFocusedConversation(expectedTitle, 0), 350);
    }, 250);
  }

  function setSearchFocusedConversation() {
    const overlay = getOverlay();
    window.clearTimeout(searchSettleTimer);
    searchSettleTimer = null;
    pendingSearchText = "";
    revealedSearchText = "";
    root().classList.add(ROOT_ACTIVE, ROOT_SEARCH_FOCUSED, ROOT_SIDEBAR_HIDDEN);
    root().classList.remove(ROOT_NORMAL, ROOT_SEARCHING, ROOT_SEARCH_TOO_SHORT, ROOT_SEARCH_WAITING, ROOT_SIDEBAR_OPEN, ROOT_OVERLAY_OPEN, ROOT_OPENING_RECENT);
    ensureOverlay();
    ensureReturnButton();
    ensureSidebarButton();
    ensureSearchAgainButton();
    ensureFocusedRecentsShelf();
    ensureAddCollectionButton();
    ensureFixedCollectionChooser();
    renderFocusedRecents();
    renderFixedCollections();
    if (overlay) overlay.hidden = true;
  }

  function readTitle(element) {
    if (!element) return "";
    return String(element.getAttribute?.("title") || element.textContent || "").trim().replace(/\s+/g, " ");
  }

  function readActiveConversationTitle() {
    const selectors = [
      '#main header [data-testid="conversation-info-header-chat-title"]',
      '#main header [data-testid="conversation-info-header"] [title]',
      '#main header span[dir="auto"][title]',
      '#main header span[title]',
      '#main header [dir="auto"]',
    ];
    for (const selector of selectors) {
      const title = Array.from(document.querySelectorAll(selector))
        .map(readTitle)
        .find(Boolean);
      if (title) return title;
    }
    return "";
  }

  function conversationRow(target) {
    return target?.closest?.(
      '[data-testid="cell-frame-container"], [data-testid="conversation-list-item"], [role="listitem"], [role="row"]'
    ) || null;
  }

  function readConversationRowTitle(row) {
    if (!row) return "";
    const selectors = [
      '[data-testid="cell-frame-title"] [title]',
      '[data-testid="cell-frame-title"]',
      'span[dir="auto"][title]',
      'span[title]',
    ];
    for (const selector of selectors) {
      const title = Array.from(row.querySelectorAll(selector)).map(readTitle).find(Boolean);
      if (title) return title;
    }
    return "";
  }

  function captureFocusedConversation(expectedTitle, attempt, route = "search", token = ++recentCaptureToken) {
    if (token !== recentCaptureToken) return;
    const activeTitle = readActiveConversationTitle();
    const normalize = globalThis.MirrorFocusedRecents?.normalizeTitle;
    const expectedMatches = !expectedTitle || (
      normalize && normalize(activeTitle) === normalize(expectedTitle)
    );
    if (activeTitle && expectedMatches) {
      addFocusedRecent(activeTitle);
      if (route === "search") recordAwareness("focused_conversation_opened", { route: "search" });
      return;
    }
    if (attempt < FOCUSED_CAPTURE_RETRIES) {
      window.setTimeout(() => captureFocusedConversation(expectedTitle, attempt + 1, route, token), 300);
    }
  }

  function addFocusedRecent(title) {
    focusedRecents = globalThis.MirrorFocusedRecents?.addRecent(focusedRecents, title) || focusedRecents;
    renderFocusedRecents();
  }

  function removeFocusedRecent(title) {
    focusedRecents = globalThis.MirrorFocusedRecents?.removeRecent(focusedRecents, title) || focusedRecents;
    recordAwareness("focused_recent_removed");
    renderFocusedRecents();
  }

  function clearFocusedRecents() {
    if (focusedRecents.length === 0) return;
    focusedRecents = globalThis.MirrorFocusedRecents?.clearRecents() || [];
    recordAwareness("focused_recents_cleared");
    renderFocusedRecents();
  }

  function createFocusedRecentsContents(container) {
    container.replaceChildren();
    container.hidden = focusedRecents.length === 0;
    if (focusedRecents.length === 0) return;

    const heading = document.createElement("div");
    heading.className = "mwf-focused-recents-heading";
    const label = document.createElement("strong");
    label.textContent = "Conversas em andamento";
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "mwf-focused-recents-clear";
    clear.textContent = "Limpar";
    clear.addEventListener("click", clearFocusedRecents);
    heading.append(label, clear);

    const list = document.createElement("div");
    list.className = "mwf-focused-recents-list";
    for (const title of focusedRecents) {
      const item = document.createElement("div");
      item.className = "mwf-focused-recent-item";
      const open = document.createElement("button");
      open.type = "button";
      open.className = "mwf-focused-recent-open";
      open.textContent = title;
      open.addEventListener("click", () => openFocusedRecent(title));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "mwf-focused-recent-remove";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Remover conversa da lista temporária");
      remove.addEventListener("click", () => removeFocusedRecent(title));
      item.append(open, remove);
      list.appendChild(item);
    }
    container.append(heading, list);
  }

  function ensureFocusedRecentsShelf() {
    if (!document.body || document.getElementById(FOCUSED_RECENTS_ID)) return;
    const shelf = document.createElement("aside");
    shelf.id = FOCUSED_RECENTS_ID;
    shelf.className = "mwf-focused-navigation-floating";
    shelf.setAttribute("aria-label", "Navegação entre conversas focadas");
    shelf.hidden = true;

    const recents = document.createElement("section");
    recents.className = "mwf-focused-recents";
    recents.setAttribute("data-mwf-focused-recents-focused", "");
    recents.setAttribute("aria-label", "Conversas em andamento");
    recents.hidden = true;

    const collections = document.createElement("section");
    collections.className = "mwf-fixed-collections";
    collections.setAttribute("data-mwf-fixed-collections-focused", "");
    collections.setAttribute("aria-label", "Coleções");
    collections.hidden = true;

    shelf.append(recents, collections);
    document.body.appendChild(shelf);
  }

  function updateFocusedNavigationShelfVisibility() {
    const shelf = document.getElementById(FOCUSED_RECENTS_ID);
    if (!shelf) return;
    const recents = shelf.querySelector("[data-mwf-focused-recents-focused]");
    const collections = shelf.querySelector("[data-mwf-fixed-collections-focused]");
    shelf.hidden = Boolean(recents?.hidden && collections?.hidden);
    if (isSearching()) updateSearchNavigation(getSearchText());
  }

  function renderFocusedRecents() {
    const shelf = document.getElementById(FOCUSED_RECENTS_ID);
    const scrollTop = shelf?.scrollTop || 0;
    const containers = [
      document.querySelector("[data-mwf-focused-recents-overlay]"),
      document.querySelector("[data-mwf-focused-recents-focused]"),
    ].filter(Boolean);
    containers.forEach(createFocusedRecentsContents);
    updateFocusedNavigationShelfVisibility();
    if (shelf) shelf.scrollTop = scrollTop;
  }

  async function loadFixedCollections() {
    if (!fixedCollectionsAdapter) return;
    try {
      const raw = await fixedCollectionsAdapter.getItem(FIXED_COLLECTIONS_KEY);
      const nextState = globalThis.MirrorFixedCollections?.sanitizeState(raw);
      if (!nextState) return;
      fixedCollectionsState = nextState;
      if (JSON.stringify(raw) !== JSON.stringify(nextState)) {
        await fixedCollectionsAdapter.setItem(FIXED_COLLECTIONS_KEY, nextState);
      }
    } catch (_error) {
      fixedCollectionsState = globalThis.MirrorFixedCollections?.createEmptyState() || fixedCollectionsState;
    }
  }

  async function persistFixedCollections(nextState) {
    if (!fixedCollectionsAdapter) {
      showToast("Não consegui acessar o armazenamento isolado da extensão.");
      return false;
    }
    try {
      await fixedCollectionsAdapter.setItem(FIXED_COLLECTIONS_KEY, nextState);
      fixedCollectionsState = nextState;
      renderFixedCollections();
      renderFixedCollectionChooser();
      return true;
    } catch (_error) {
      showToast("Não consegui salvar essa coleção neste navegador.");
      return false;
    }
  }

  function fixedCollectionStatusMessage(status) {
    const messages = {
      "invalid-name": "Dê um nome curto para a coleção.",
      "collection-limit": "O limite é de 5 coleções.",
      "invalid-title": "Não consegui identificar esta conversa com segurança.",
      "member-limit": "O limite é de 10 conversas por coleção.",
      "collection-not-found": "Essa coleção não está mais disponível.",
    };
    return messages[status] || "Essa conversa já está nessa coleção.";
  }

  async function addTitleToFixedCollection(collectionName, title) {
    const result = globalThis.MirrorFixedCollections?.addMember(
      fixedCollectionsState,
      collectionName,
      title
    );
    if (!result || result.status !== "added") {
      showToast(fixedCollectionStatusMessage(result?.status));
      return false;
    }
    const saved = await persistFixedCollections(result.state);
    if (saved) {
      closeFixedCollectionChooser();
      showToast("Conversa adicionada à coleção.");
    }
    return saved;
  }

  async function createFixedCollection(name, title) {
    const created = globalThis.MirrorFixedCollections?.createCollection(fixedCollectionsState, name);
    if (!created || created.status !== "created") {
      showToast(fixedCollectionStatusMessage(created?.status));
      return false;
    }
    const added = globalThis.MirrorFixedCollections?.addMember(created.state, name, title);
    if (!added || added.status !== "added") {
      showToast(fixedCollectionStatusMessage(added?.status));
      return false;
    }
    const saved = await persistFixedCollections(added.state);
    if (saved) {
      closeFixedCollectionChooser();
      showToast("Coleção criada.");
    }
    return saved;
  }

  async function removeFixedCollectionMember(collectionName, memberTitle) {
    const result = globalThis.MirrorFixedCollections?.removeMember(
      fixedCollectionsState,
      collectionName,
      memberTitle
    );
    if (result?.status === "removed") await persistFixedCollections(result.state);
  }

  async function deleteFixedCollection(collectionName) {
    if (!window.confirm("Apagar esta coleção?")) return;
    const result = globalThis.MirrorFixedCollections?.deleteCollection(
      fixedCollectionsState,
      collectionName
    );
    if (result?.status !== "deleted") return;
    if (expandedFixedCollectionName === collectionName) expandedFixedCollectionName = "";
    await persistFixedCollections(result.state);
  }

  function openFixedCollectionMember(memberTitle) {
    if (root().classList.contains(ROOT_OPENING_RECENT)) return;
    closeFixedCollectionChooser();
    beginFocusedRecentNavigation(memberTitle, "collection");
  }

  function renderFixedCollections() {
    const container = document.querySelector("[data-mwf-fixed-collections-focused]");
    if (!container) return;
    const previous = fixedCollectionRenderCache.get(container);
    if (previous?.state === fixedCollectionsState && previous.expanded === expandedFixedCollectionName) return;
    fixedCollectionRenderCache.set(container, { state: fixedCollectionsState, expanded: expandedFixedCollectionName });
    const shelf = document.getElementById(FOCUSED_RECENTS_ID);
    const scrollTop = shelf?.scrollTop || 0;
    container.replaceChildren();
    container.hidden = fixedCollectionsState.collections.length === 0;
    updateFocusedNavigationShelfVisibility();
    if (container.hidden) return;

    const label = document.createElement("strong");
    label.className = "mwf-fixed-collections-label";
    label.textContent = "Coleções";
    container.appendChild(label);

    for (const collection of fixedCollectionsState.collections) {
      const item = document.createElement("section");
      item.className = "mwf-fixed-collection";
      const row = document.createElement("div");
      row.className = "mwf-fixed-collection-row";
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "mwf-fixed-collection-toggle";
      const heading = document.createElement("span");
      heading.textContent = collection.name;
      const count = document.createElement("span");
      count.textContent = String(collection.members.length);
      toggle.append(heading, count);
      const expanded = expandedFixedCollectionName === collection.name;
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.addEventListener("click", () => {
        expandedFixedCollectionName = expanded ? "" : collection.name;
        renderFixedCollections();
      });
      const removeCollection = document.createElement("button");
      removeCollection.type = "button";
      removeCollection.className = "mwf-fixed-collection-delete";
      removeCollection.textContent = "×";
      removeCollection.setAttribute("aria-label", "Apagar coleção");
      removeCollection.addEventListener("click", () => deleteFixedCollection(collection.name));
      row.append(toggle, removeCollection);
      item.appendChild(row);

      if (expanded) {
        const members = document.createElement("div");
        members.className = "mwf-fixed-collection-members";
        for (const memberTitle of collection.members) {
          const member = document.createElement("div");
          member.className = "mwf-fixed-collection-member";
          const memberButton = document.createElement("button");
          memberButton.type = "button";
          memberButton.className = "mwf-fixed-collection-open";
          memberButton.textContent = memberTitle;
          memberButton.addEventListener("click", () => openFixedCollectionMember(memberTitle));
          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "mwf-fixed-collection-remove";
          remove.textContent = "×";
          remove.setAttribute("aria-label", "Remover conversa da coleção");
          remove.addEventListener("click", () => removeFixedCollectionMember(collection.name, memberTitle));
          member.append(memberButton, remove);
          members.appendChild(member);
        }
        item.appendChild(members);
      }
      container.appendChild(item);
    }
    if (shelf) shelf.scrollTop = scrollTop;
  }

  function closeFixedCollectionChooser() {
    pendingCollectionTitle = "";
    const chooser = document.getElementById(COLLECTION_CHOOSER_ID);
    if (chooser) chooser.hidden = true;
  }

  function renderFixedCollectionChooser() {
    const chooser = document.getElementById(COLLECTION_CHOOSER_ID);
    if (!chooser) return;
    const list = chooser.querySelector("[data-mwf-collection-options]");
    list.replaceChildren();
    for (const collection of fixedCollectionsState.collections) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mwf-collection-option";
      button.textContent = collection.name;
      button.addEventListener("click", () => addTitleToFixedCollection(collection.name, pendingCollectionTitle));
      list.appendChild(button);
    }
    chooser.querySelector("[data-mwf-new-collection]").hidden =
      fixedCollectionsState.collections.length >= (globalThis.MirrorFixedCollections?.MAX_COLLECTIONS || 5);
  }

  function openFixedCollectionChooser() {
    const title = readActiveConversationTitle();
    if (!title) {
      showToast("Não consegui identificar esta conversa com segurança.");
      return;
    }
    pendingCollectionTitle = title;
    ensureFixedCollectionChooser();
    renderFixedCollectionChooser();
    const chooser = document.getElementById(COLLECTION_CHOOSER_ID);
    chooser.hidden = false;
    chooser.querySelector("input")?.focus();
  }

  function ensureAddCollectionButton() {
    if (!document.body || document.getElementById(ADD_COLLECTION_ID)) return;
    const button = document.createElement("button");
    button.id = ADD_COLLECTION_ID;
    button.type = "button";
    button.textContent = "Adicionar à coleção";
    button.addEventListener("click", openFixedCollectionChooser);
    document.body.appendChild(button);
  }

  function ensureFixedCollectionChooser() {
    if (!document.body || document.getElementById(COLLECTION_CHOOSER_ID)) return;
    const chooser = document.createElement("section");
    chooser.id = COLLECTION_CHOOSER_ID;
    chooser.hidden = true;
    chooser.setAttribute("role", "dialog");
    chooser.setAttribute("aria-label", "Adicionar conversa à coleção");

    const title = document.createElement("strong");
    title.textContent = "Adicionar à coleção";
    const options = document.createElement("div");
    options.className = "mwf-collection-options";
    options.setAttribute("data-mwf-collection-options", "");
    const form = document.createElement("form");
    form.setAttribute("data-mwf-new-collection", "");
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 64;
    input.placeholder = "Nova coleção";
    input.setAttribute("aria-label", "Nome da nova coleção");
    const create = document.createElement("button");
    create.type = "submit";
    create.textContent = "Criar";
    form.append(input, create);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const created = await createFixedCollection(input.value, pendingCollectionTitle);
      if (created) input.value = "";
    });
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "mwf-collection-cancel";
    cancel.textContent = "Cancelar";
    cancel.addEventListener("click", closeFixedCollectionChooser);
    chooser.append(title, options, form, cancel);
    document.body.appendChild(chooser);
  }

  function updateRecentNavigationDiagnostic(patch) {
    const elapsedMs = recentNavigationStartedAt ? Date.now() - recentNavigationStartedAt : 0;
    recentNavigationDiagnostic = globalThis.MirrorFocusedRecents?.updateNavigationDiagnostic(
      recentNavigationDiagnostic,
      { ...patch, elapsedMs }
    ) || null;
  }

  function beginFocusedRecentNavigation(title, source = "recent") {
    recentCaptureToken += 1;
    recentNavigationToken += 1;
    recentNavigationSource = source;
    recentNavigationStartedAt = Date.now();
    recentNavigationDiagnostic = globalThis.MirrorFocusedRecents?.createNavigationDiagnostic() || null;
    updateRecentNavigationDiagnostic({ stage: "starting" });
    const token = recentNavigationToken;
    resetSearchGate();
    root().classList.remove(ROOT_ACTIVE, ROOT_NORMAL, ROOT_SEARCH_FOCUSED, ROOT_SEARCH_TOO_SHORT, ROOT_SEARCH_WAITING, ROOT_SIDEBAR_OPEN, ROOT_SIDEBAR_HIDDEN, ROOT_OVERLAY_OPEN);
    root().classList.add(ROOT_SEARCHING, ROOT_OPENING_RECENT);
    const overlay = getOverlay();
    if (overlay) overlay.hidden = true;
    renderFocusedRecents();
    goToMainChatsThen("focused-recent", () => {
      updateRecentNavigationDiagnostic({ stage: "chats-normalized" });
      startFocusedRecentSearch(title, token);
    });
  }

  function openFocusedRecent(title) {
    if (!title || root().classList.contains(ROOT_OPENING_RECENT)) return;
    if (!isWhatsAppReady()) {
      failFocusedRecentNavigation("title-unavailable", recentNavigationToken + 1);
      return;
    }
    beginFocusedRecentNavigation(title);
  }

  function setNativeSearchText(field, title) {
    field.focus();
    if ("value" in field) {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), "value")?.set;
      if (setter) setter.call(field, title);
      else field.value = title;
    } else {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(field);
      selection.removeAllRanges();
      selection.addRange(range);
      if (!document.execCommand?.("insertText", false, title)) field.textContent = title;
      selection.removeAllRanges();
    }
    field.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: title }));
    field.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: title.slice(-1) }));
  }

  function startFocusedRecentSearch(title, token) {
    if (token !== recentNavigationToken) return;
    const field = findNativeSearchField({ allowHidden: true });
    updateRecentNavigationDiagnostic({
      stage: "search-field-ready",
      searchFieldFound: Boolean(field),
    });
    if (!field) {
      failFocusedRecentNavigation("title-unavailable", token);
      return;
    }
    setNativeSearchText(field, title);
    const normalize = globalThis.MirrorFocusedRecents?.normalizeTitle;
    updateRecentNavigationDiagnostic({
      stage: "search-text-dispatched",
      searchTextAccepted: Boolean(normalize && normalize(getSearchText(field)) === normalize(title)),
    });
    window.setTimeout(() => resolveFocusedRecentSearch(title, token, 0), RECENT_SEARCH_INITIAL_MS);
  }

  function focusedResultClickTarget(row) {
    if (!row) return null;
    if (row.matches?.('[data-testid="cell-frame-container"], [data-testid="conversation-list-item"]')) {
      return row;
    }
    return row.querySelector?.(
      '[data-testid="cell-frame-container"], [data-testid="conversation-list-item"], [role="button"]'
    ) || row;
  }

  function activateFocusedResult(target) {
    target.dispatchEvent(new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      composed: true,
      button: 0,
      buttons: 1,
      view: window,
    }));
  }

  function focusedSearchCandidates() {
    const rows = Array.from(document.querySelectorAll(
      '#side [data-testid="cell-frame-container"], #side [data-testid="conversation-list-item"], #side [role="listitem"], #side [role="row"]'
    ));
    const outerRows = rows.filter((row) => !rows.some((other) => other !== row && other.contains(row)));
    return {
      rowCount: outerRows.length,
      candidates: outerRows
        .map((row) => ({
          row,
          clickTarget: focusedResultClickTarget(row),
          title: readConversationRowTitle(row),
        }))
        .filter((candidate) => candidate.title && candidate.clickTarget),
    };
  }

  function resolveFocusedRecentSearch(title, token, attempt) {
    if (token !== recentNavigationToken) return;
    const resultSet = focusedSearchCandidates();
    const candidates = resultSet.candidates;
    const classification = globalThis.MirrorFocusedRecents?.classifyExactTitleMatches(
      title,
      candidates.map((candidate) => candidate.title)
    ) || { status: "not-found", index: null };
    const normalize = globalThis.MirrorFocusedRecents?.normalizeTitle;
    const field = findNativeSearchField({ allowHidden: true });
    updateRecentNavigationDiagnostic({
      stage: "results-inspected",
      searchTextAccepted: Boolean(normalize && field && normalize(getSearchText(field)) === normalize(title)),
      candidateRows: resultSet.rowCount,
      candidateTitles: candidates.length,
      exactMatches: candidates.filter((candidate) => (
        normalize && normalize(candidate.title) === normalize(title)
      )).length,
    });
    if (classification.status === "not-found" && attempt < RECENT_NAVIGATION_RETRIES) {
      window.setTimeout(() => resolveFocusedRecentSearch(title, token, attempt + 1), RECENT_SEARCH_RETRY_MS);
      return;
    }
    if (classification.status !== "match") {
      failFocusedRecentNavigation(classification.status, token);
      return;
    }
    activateFocusedResult(candidates[classification.index].clickTarget);
    updateRecentNavigationDiagnostic({
      stage: "exact-result-clicked",
      clickDispatched: true,
    });
    window.setTimeout(() => confirmFocusedRecentOpened(title, token, 0), RECENT_CONFIRM_RETRY_MS);
  }

  function confirmFocusedRecentOpened(title, token, attempt) {
    if (token !== recentNavigationToken) return;
    const normalize = globalThis.MirrorFocusedRecents?.normalizeTitle;
    const activeTitle = readActiveConversationTitle();
    const headerMatched = Boolean(normalize && normalize(activeTitle) === normalize(title));
    updateRecentNavigationDiagnostic({
      stage: "confirming-header",
      headerMatched,
    });
    if (headerMatched) {
      updateRecentNavigationDiagnostic({ stage: "complete" });
      setSearchFocusedConversation();
      addFocusedRecent(activeTitle);
      if (recentNavigationSource === "recent") {
        recordAwareness("focused_conversation_opened", { route: "recent" });
      }
      return;
    }
    if (attempt < RECENT_NAVIGATION_RETRIES) {
      window.setTimeout(() => confirmFocusedRecentOpened(title, token, attempt + 1), RECENT_CONFIRM_RETRY_MS);
      return;
    }
    failFocusedRecentNavigation("not-found", token);
  }

  function failFocusedRecentNavigation(reason, token) {
    if (token !== recentNavigationToken && root().classList.contains(ROOT_OPENING_RECENT)) return;
    updateRecentNavigationDiagnostic({
      stage: "failed",
      failureReason: reason,
    });
    recentNavigationToken += 1;
    resetSearchGate();
    root().classList.remove(ROOT_OPENING_RECENT);
    setActive({ showOverlay: true });
    if (recentNavigationSource === "recent") {
      recordAwareness("focused_recent_navigation_failed", { reason });
    }
    showToast(
      reason === "ambiguous"
        ? "Há mais de uma conversa com esse nome. Use a busca para escolher com segurança."
        : "Não consegui reabrir essa conversa com segurança. Use a busca para encontrá-la novamente.",
      recentNavigationDiagnostic
    );
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
      setSearchFocusedConversation();
      captureFocusedConversation(readActiveConversationTitle(), 0, null);
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
      clearNativeSearchText(field);
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

  function clearNativeSearchText(field) {
    if (!field || !getSearchText(field)) return;
    setNativeSearchText(field, "");
  }

  function getSearchText(field = findNativeSearchField()) {
    if (!field) return "";
    if ("value" in field) return String(field.value || "").trim();
    return String(field.textContent || "").trim();
  }

  function isolateEmptySearchControls() {
    const side = document.querySelector("#side");
    const field = findNativeSearchField();
    if (!side || !field || !side.contains(field)) return;
    // Preserve the native search row (including clear/back controls), but hide
    // sibling branches rather than guessing translated labels or WhatsApp classes.
    document.querySelectorAll("#side [data-mwf-empty-search-hidden]").forEach((element) => {
      element.removeAttribute("data-mwf-empty-search-hidden");
    });
    let branch = field.closest('[role="search"]') || field.parentElement;
    if (!branch || branch === side || !side.contains(branch)) return;
    while (branch && branch !== side) {
      const parent = branch.parentElement;
      if (!parent) break;
      for (const sibling of parent.children) {
        if (sibling !== branch && !sibling.matches("header")) {
          sibling.setAttribute("data-mwf-empty-search-hidden", "");
        }
      }
      branch = parent;
    }
  }

  function updateSearchNavigation(searchText) {
    const hasChoices = focusedRecents.length > 0 || fixedCollectionsState.collections.length > 0;
    root().classList.toggle(ROOT_SEARCH_NAVIGATION,
      isSearching() && !root().classList.contains(ROOT_OPENING_RECENT) && !searchText && hasChoices);
    if (root().classList.contains(ROOT_SEARCH_NAVIGATION)) isolateEmptySearchControls();
  }

  function updateSearchGateState(field = findNativeSearchField()) {
    if (!isSearching()) {
      updateSearchNavigation("");
      resetSearchGate();
      root().classList.remove(ROOT_SEARCH_TOO_SHORT, ROOT_SEARCH_WAITING);
      return;
    }

    const searchText = getSearchText(field);
    updateSearchNavigation(searchText);
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

  function findNativeSearchField({ allowHidden = false } = {}) {
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
      const candidate = allowHidden ? elements[0] : elements.find(isVisibleElement);
      if (candidate) return candidate;
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
    return Boolean(element.closest?.("#mirror-whatsapp-focus-controls, #mirror-whatsapp-focus-overlay, #mirror-whatsapp-focus-toast, #mirror-whatsapp-focus-recents, #mirror-whatsapp-focus-add-collection, #mirror-whatsapp-focus-collection-chooser"));
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
    if (isSearching() && root().classList.contains(ROOT_SEARCH_NAVIGATION) &&
        !root().classList.contains(ROOT_OPENING_RECENT)) isolateEmptySearchControls();
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

  function readLastNormalOpenedAt() {
    const raw = window.localStorage?.getItem(LAST_NORMAL_OPEN_KEY);
    const timestamp = Number(raw);
    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
  }

  function recordNormalOpenedAt() {
    try {
      window.localStorage?.setItem(LAST_NORMAL_OPEN_KEY, String(Date.now()));
    } catch (_error) {
      // Keep focus behavior working even if storage is unavailable.
    }
  }

  function formatElapsedTime(ms) {
    const totalMinutes = Math.max(0, Math.floor(ms / 60000));
    if (totalMinutes < 1) return "0 min";
    if (totalMinutes < 60) return `${totalMinutes} min`;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours < 24) return minutes ? `${hours}h ${minutes}min` : `${hours}h`;

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  function updateFocusStreak() {
    const streak = document.getElementById(FOCUS_STREAK_ID);
    if (!streak) return;

    const lastOpenedAt = readLastNormalOpenedAt();
    if (!lastOpenedAt) {
      const text = "Você ainda não abriu o WhatsApp normal nesta instalação.";
      if (streak.textContent !== text) streak.textContent = text;
      return;
    }

    const text = `Sem abrir WhatsApp normal há ${formatElapsedTime(Date.now() - lastOpenedAt)}.`;
    if (streak.textContent !== text) streak.textContent = text;
  }

  function recordAwareness(type, details = {}) {
    try {
      awarenessStore?.record(type, details);
    } catch (_error) {
      // Awareness must never break the focus experience.
    }
  }

  function normalAttemptDuration() {
    return normalAttemptStartedAt ? Math.max(0, Date.now() - normalAttemptStartedAt) : 0;
  }

  function finishNormalAttempt(type, details = {}) {
    const durationMs = normalAttemptDuration();
    recordAwareness(type, { durationMs, ...details });
    if (pendingIntent) {
      const decision = {
        normal_opened: "opened",
        attempt_cancelled: "cancelled",
        continued_focused_conversation: "continued-focused",
      }[type];
      if (decision) {
        recordAwareness("intent_outcome", {
          ...pendingIntent,
          decision,
          durationMs,
          route: details.route,
        });
      }
    }
    pendingIntent = null;
    normalAttemptStartedAt = null;
    normalAttemptRecent = false;
  }

  function formatAwarenessReflection(category) {
    return {
      "specific-intent": "intenção específica",
      "waiting-for-reply": "espera por resposta",
      "anguish-boredom": "angústia ou tédio",
      automatism: "automatismo",
      "mixed-unclear": "misto ou ainda incerto",
    }[category] || "ainda não registrada";
  }

  function formatIntentCategory(category) {
    return {
      "specific-task": "fazer algo específico",
      "check-reply": "checar se alguém respondeu",
      "see-whats-new": "ver se apareceu algo",
      "pause-escape": "pausar ou escapar",
      "process-pending": "processar mensagens pendentes ou não lidas",
      "mixed-unclear": "outro ou ainda não sei",
    }[category] || category;
  }

  function createAttemptId() {
    return `attempt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function readIntentDeclaration(overlay = getOverlay()) {
    const intent = overlay?.querySelector('[name="mwf-intent"]:checked')?.value;
    const note = overlay?.querySelector("[data-mwf-intent-note]")?.value || "";
    const message = overlay?.querySelector("[data-mwf-intent-message]");
    if (!intent) {
      if (message) message.textContent = "Escolha a opção que mais se aproxima agora.";
      return null;
    }
    if (message) message.textContent = "";
    return {
      attemptId: createAttemptId(),
      intent,
      note,
      promptDurationMs: intentPromptStartedAt ? Math.max(0, Date.now() - intentPromptStartedAt) : 0,
    };
  }

  function startIntentDeclaration() {
    const overlay = getOverlay();
    if (!overlay) return;
    closeAwarenessSummary();
    clearNormalDelay();
    pendingIntent = null;
    intentPromptStartedAt = Date.now();
    overlay.querySelectorAll('[name="mwf-intent"]').forEach((input) => { input.checked = false; });
    const note = overlay.querySelector("[data-mwf-intent-note]");
    const message = overlay.querySelector("[data-mwf-intent-message]");
    if (note) note.value = "";
    if (message) message.textContent = "";
    overlay.classList.add("mwf-intent-pending");
  }

  function proceedFromIntent() {
    const declaration = readIntentDeclaration();
    if (!declaration) return;
    pendingIntent = declaration;
    intentPromptStartedAt = null;
    getOverlay()?.classList.remove("mwf-intent-pending");
    startNormalDelay();
  }

  function declineFromIntent() {
    const declaration = readIntentDeclaration();
    if (!declaration) return;
    recordAwareness("intent_outcome", { ...declaration, decision: "not-open" });
    pendingIntent = null;
    intentPromptStartedAt = null;
    getOverlay()?.classList.remove("mwf-intent-pending");
  }

  function returnToFocusBeforeIntent() {
    const durationMs = intentPromptStartedAt ? Math.max(0, Date.now() - intentPromptStartedAt) : 0;
    recordAwareness("intent_prompt_exited", { durationMs, destination: "focus-overlay" });
    pendingIntent = null;
    intentPromptStartedAt = null;
    getOverlay()?.classList.remove("mwf-intent-pending");
    setActive({ showOverlay: true });
  }

  function renderIntentNotes(panel, notes) {
    const list = panel.querySelector("[data-mwf-intent-notes]");
    if (!list) return;
    list.replaceChildren();
    for (const item of notes.slice().reverse()) {
      const entry = document.createElement("li");
      const label = document.createElement("strong");
      const text = document.createElement("span");
      label.textContent = formatIntentCategory(item.intent);
      text.textContent = item.note;
      entry.append(label, text);
      list.appendChild(entry);
    }
  }

  function awarenessInsight(summary) {
    const openingsLabel = summary.openings === 1 ? "abertura" : "aberturas";

    if (summary.primarySignal === "collecting") {
      return {
        headline: "A observação está começando.",
        context: "Ainda não há aberturas suficientes para destacar um padrão.",
      };
    }
    if (summary.primarySignal === "repeated-openings") {
      return {
        headline: `No período observado, houve ${summary.openings} ${openingsLabel}. ${summary.shortReopenings} aconteceram até 10 minutos depois de outra abertura.`,
        context: "A sequência pode estar virando um percurso conhecido. Isso é uma hipótese, não uma conclusão.",
      };
    }
    if (summary.primarySignal === "fast-sequence") {
      return {
        headline: `Em ${summary.fastSequences} de ${summary.openings} ${openingsLabel}, a sequência foi concluída em até 2 segundos.`,
        context: "A velocidade sugere que os cliques podem estar ficando automáticos. Só você pode reconhecer o que estava acontecendo.",
      };
    }
    if (summary.primarySignal === "direct-openings") {
      const direct = summary.openingRoutes.immediate + summary.openingRoutes.recentExplicit;
      return {
        headline: `Em ${direct} de ${summary.openings} ${openingsLabel}, você abriu antes do fim da pausa ou confirmou uma reabertura recente.`,
        context: "Talvez a barreira já seja um caminho conhecido. O número descreve a ação, não o motivo.",
      };
    }
    if (summary.primarySignal === "pause-created-choice") {
      const choices = summary.cancelledAttempts + summary.continuedFocusedConversation;
      return {
        headline: `Em ${choices} ocasiões, a pausa terminou em cancelar ou continuar na conversa focada.`,
        context: "Nesses momentos, a barreira parece ter criado espaço para outra escolha.",
      };
    }
    return {
      headline: `Ainda não apareceu um padrão forte ${summary.openings === 1 ? "na" : "nas"} ${summary.openings} ${openingsLabel} ${summary.openings === 1 ? "observada" : "observadas"}.`,
      context: "Continuarei observando sem interromper você. Os detalhes ficam disponíveis se quiser inspecioná-los.",
    };
  }

  function renderAwarenessSummary() {
    const panel = document.getElementById(AWARENESS_PANEL_ID);
    if (!panel || !awarenessStore) return;

    const summary = awarenessStore.getSummary();
    const hasPhase2Activity = summary.intent.total > 0 || summary.phases.phase2.preDeclarationFocusReturns > 0;
    const behavior = hasPhase2Activity ? summary.phases.phase2 : summary.phases.phase1;
    const setText = (selector, text) => {
      const element = panel.querySelector(selector);
      if (element) element.textContent = text;
    };

    const insight = awarenessInsight(behavior);
    setText(
      "[data-mwf-awareness-progress]",
      summary.baselineComplete
        ? `Baseline de 7 dias concluído · ${summary.observationDays} dias observados.`
        : `Dia ${Math.min(summary.observationDays, 7)} de 7 da observação inicial.`
    );
    setText("[data-mwf-awareness-phase]", hasPhase2Activity ? "Fase 2 · intenção no momento" : "Fase 1 · baseline passivo");
    setText("[data-mwf-awareness-insight]", insight.headline);
    setText("[data-mwf-awareness-insight-context]", insight.context);
    setText("[data-mwf-awareness-openings]", String(behavior.openings));
    setText("[data-mwf-awareness-today]", String(behavior.openingsToday));
    setText("[data-mwf-awareness-short]", String(behavior.shortReopenings));
    setText("[data-mwf-awareness-fast]", String(behavior.fastSequences));
    setText(
      "[data-mwf-awareness-routes]",
      `${behavior.openingRoutes.countdown} pelo countdown · ${behavior.openingRoutes.immediate} imediatas · ${behavior.openingRoutes.recentExplicit} confirmações recentes`
    );
    setText(
      "[data-mwf-awareness-outcomes]",
      `${behavior.cancelledAttempts} cancelamentos · ${behavior.continuedFocusedConversation} continuidades na conversa · ${behavior.manualFocusReturns} retornos manuais ao foco · ${behavior.expiryToFocusedConversation} expirações preservaram a conversa · ${behavior.expiryToBlindOverlay} voltaram ao modo foco`
    );
    const focusedFailures = Object.values(summary.focusedNavigation.failures).reduce(
      (total, count) => total + count,
      0
    );
    setText(
      "[data-mwf-focused-navigation]",
      `${summary.focusedNavigation.search} aberturas pela busca focada · ${summary.focusedNavigation.recent} pelas conversas em andamento · ${focusedFailures} falhas seguras`
    );
    setText(
      "[data-mwf-awareness-reflection-status]",
      summary.latestReflection
        ? `Última leitura registrada: ${formatAwarenessReflection(summary.latestReflection.category)}.`
        : "Nenhuma leitura pessoal registrada."
    );

    const intentPanel = panel.querySelector("[data-mwf-intent-summary]");
    intentPanel.hidden = !hasPhase2Activity;
    setText("[data-mwf-intent-declarations]", String(summary.intent.total));
    setText("[data-mwf-intent-opened]", String(summary.intent.decisions.opened));
    setText("[data-mwf-intent-not-open]", String(summary.intent.decisions.notOpen));
    setText(
      "[data-mwf-intent-changed]",
      String(summary.intent.decisions.cancelled + summary.intent.decisions.continuedFocused)
    );
    setText(
      "[data-mwf-intent-categories]",
      globalThis.MirrorAwareness.INTENT_CATEGORIES
        .filter((category) => summary.intent.categories[category] > 0)
        .map((category) => `${formatIntentCategory(category)}: ${summary.intent.categories[category]}`)
        .join(" · ")
    );
    setText(
      "[data-mwf-intent-speed]",
      summary.intent.averagePromptDurationMs === null
        ? "Ainda sem tempo médio de resposta."
        : `Tempo médio para declarar: ${Math.max(1, Math.round(summary.intent.averagePromptDurationMs / 1000))}s.`
    );
    setText(
      "[data-mwf-intent-focus-returns]",
      behavior.preDeclarationFocusReturns === 0
        ? "Nenhum retorno ao modo foco antes de declarar."
        : `${behavior.preDeclarationFocusReturns} retornos ao modo foco antes de declarar · tempo médio ${(
            behavior.averagePreDeclarationReturnMs / 1000
          ).toFixed(1)}s.`
    );
    renderIntentNotes(panel, summary.intent.notes);
    panel.querySelector("[data-mwf-intent-notes-details]").hidden = summary.intent.notes.length === 0;

    panel.querySelector("[data-mwf-awareness-reflection]").hidden = !summary.baselineComplete;
    panel.querySelector('[data-mwf-action="awareness-toggle"]').textContent = summary.enabled
      ? "Pausar coleta"
      : "Retomar coleta";
    panel.querySelector("[data-mwf-awareness-disabled]").hidden = summary.enabled;
  }

  function openAwarenessSummary() {
    const panel = document.getElementById(AWARENESS_PANEL_ID);
    if (!panel) return;
    renderAwarenessSummary();
    panel.hidden = false;
  }

  function closeAwarenessSummary() {
    const panel = document.getElementById(AWARENESS_PANEL_ID);
    if (panel) panel.hidden = true;
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
        <p id="mirror-whatsapp-focus-streak" class="mwf-focus-streak">Você ainda não abriu o WhatsApp normal nesta instalação.</p>
        <section class="mwf-focused-recents mwf-focused-recents-overlay" data-mwf-focused-recents-overlay aria-label="Conversas em andamento" hidden></section>
        <div class="mwf-loading" aria-label="Carregando WhatsApp Web">
          <progress id="mirror-whatsapp-focus-loading-progress" class="mwf-loading-progress" value="0" max="100"></progress>
        </div>
        <div class="mwf-actions">
          <button class="mwf-button mwf-button-primary" data-mwf-action="search">Buscar conversa</button>
          <button class="mwf-button mwf-button-secondary" data-mwf-action="continue">Continuar na conversa aberta</button>
          <button class="mwf-button mwf-button-secondary" data-mwf-action="normal">Ver WhatsApp normal por 5 min</button>
        </div>
        <button class="mwf-awareness-link" data-mwf-action="awareness">Ver padrão de uso</button>
        <section id="mirror-whatsapp-focus-awareness" class="mwf-awareness-panel" aria-label="Padrão de uso" hidden>
          <div class="mwf-awareness-header">
            <div>
              <p class="mwf-kicker">Espelho, não diagnóstico</p>
              <h2>Seu padrão de uso</h2>
            </div>
            <button class="mwf-awareness-close" data-mwf-action="awareness-close" aria-label="Fechar padrão de uso">×</button>
          </div>
          <p data-mwf-awareness-progress></p>
          <p class="mwf-awareness-disabled" data-mwf-awareness-disabled hidden>A coleta está pausada. O modo foco continua funcionando normalmente.</p>
          <p class="mwf-awareness-phase" data-mwf-awareness-phase></p>
          <div class="mwf-awareness-insight">
            <h3>Leitura provisória</h3>
            <p data-mwf-awareness-insight></p>
            <p class="mwf-awareness-insight-context" data-mwf-awareness-insight-context></p>
          </div>
          <section class="mwf-intent-summary" data-mwf-intent-summary hidden>
            <h3>O que aconteceu depois da declaração</h3>
            <div class="mwf-awareness-metrics mwf-intent-decision-metrics">
              <div><strong data-mwf-intent-declarations>0</strong><span>declarações feitas</span></div>
              <div><strong data-mwf-intent-opened>0</strong><span>abriram o WhatsApp</span></div>
              <div><strong data-mwf-intent-not-open>0</strong><span>não abriram agora</span></div>
              <div><strong data-mwf-intent-changed>0</strong><span>mudaram de caminho depois</span></div>
            </div>
            <p class="mwf-awareness-detail" data-mwf-intent-categories></p>
            <p class="mwf-awareness-detail" data-mwf-intent-speed></p>
            <p class="mwf-awareness-detail" data-mwf-intent-focus-returns></p>
            <details class="mwf-intent-notes-details" data-mwf-intent-notes-details>
              <summary>Ver minhas notas</summary>
              <ul class="mwf-intent-notes" data-mwf-intent-notes></ul>
            </details>
          </section>
          <details class="mwf-awareness-details">
            <summary>Coreografia dos cliques</summary>
            <div class="mwf-awareness-metrics">
              <div><strong data-mwf-awareness-openings>0</strong><span>aberturas observadas</span></div>
              <div><strong data-mwf-awareness-today>0</strong><span>aberturas hoje</span></div>
              <div><strong data-mwf-awareness-short>0</strong><span>reaberturas em até 10 min</span></div>
              <div><strong data-mwf-awareness-fast>0</strong><span>sequências em até 2s</span></div>
            </div>
            <p class="mwf-awareness-detail" data-mwf-awareness-routes></p>
            <p class="mwf-awareness-detail" data-mwf-awareness-outcomes></p>
            <p class="mwf-awareness-detail" data-mwf-focused-navigation></p>
          </details>
          <div class="mwf-awareness-reflection" data-mwf-awareness-reflection hidden>
            <h3>O que parece ter predominado?</h3>
            <p>Esta leitura é sua. Os cliques não revelam motivação sozinhos.</p>
            <div class="mwf-awareness-choices">
              <button data-mwf-reflection="specific-intent">Intenção específica</button>
              <button data-mwf-reflection="waiting-for-reply">Espera por resposta</button>
              <button data-mwf-reflection="anguish-boredom">Angústia ou tédio</button>
              <button data-mwf-reflection="automatism">Automatismo</button>
              <button data-mwf-reflection="mixed-unclear">Misto / incerto</button>
            </div>
            <p class="mwf-awareness-detail" data-mwf-awareness-reflection-status></p>
          </div>
          <div class="mwf-awareness-controls">
            <button class="mwf-button mwf-button-secondary" data-mwf-action="awareness-toggle">Pausar coleta</button>
            <button class="mwf-button mwf-button-quiet" data-mwf-action="awareness-clear">Apagar dados</button>
          </div>
          <p class="mwf-awareness-privacy">Somente horários e ações da extensão ficam neste navegador. Nenhuma mensagem, pessoa ou conversa é registrada.</p>
        </section>
        <section class="mwf-intent-declaration" aria-live="polite">
          <p class="mwf-kicker">Declaração no momento</p>
          <h2>Estou abrindo o WhatsApp normal para…</h2>
          <div class="mwf-intent-options">
            <label><input type="radio" name="mwf-intent" value="check-reply"> Checar se alguém respondeu</label>
            <label><input type="radio" name="mwf-intent" value="see-whats-new"> Ver se apareceu algo, sem objetivo específico</label>
            <label><input type="radio" name="mwf-intent" value="pause-escape"> Pausar/escapar do que estou fazendo ou sentindo</label>
            <label><input type="radio" name="mwf-intent" value="process-pending"> Processar mensagens pendentes/não lidas</label>
            <label><input type="radio" name="mwf-intent" value="mixed-unclear"> Outro / ainda não sei</label>
          </div>
          <label class="mwf-intent-note-label">
            Algo que queira lembrar depois? <span>Opcional</span>
            <textarea data-mwf-intent-note maxlength="280" rows="3" placeholder="Escreva com suas palavras…"></textarea>
          </label>
          <p class="mwf-intent-storage-note">Esta nota fica no armazenamento isolado da extensão e pode ser apagada em “Ver padrão de uso”.</p>
          <p class="mwf-intent-message" data-mwf-intent-message role="status"></p>
          <div class="mwf-actions">
            <button class="mwf-button mwf-button-primary" data-mwf-action="intent-open">Abrir WhatsApp</button>
            <button class="mwf-button mwf-button-secondary" data-mwf-action="intent-not-open">Não abrir agora</button>
          </div>
          <button class="mwf-intent-return-focus" data-mwf-action="intent-return-focus">← Voltar ao modo foco</button>
        </section>
        <div class="mwf-normal-confirm" aria-live="polite">
          <h2>Abrir WhatsApp normal?</h2>
          <p class="mwf-normal-has-conversation">Se você só quer seguir na conversa aberta, dá para continuar sem ver a lista.</p>
          <p class="mwf-normal-no-conversation">Isso vai abrir a lista completa de conversas. Use só se for essa a intenção.</p>
          <p class="mwf-normal-recent-warning" data-mwf-normal-recent-warning></p>
          <p class="mwf-normal-countdown">Liberando em <strong data-mwf-normal-countdown>8</strong>s…</p>
          <div class="mwf-actions">
            <button class="mwf-button mwf-button-primary" data-mwf-action="continue">Continuar na conversa</button>
            <button class="mwf-button mwf-button-secondary" data-mwf-action="normal-cancel">Cancelar</button>
            <button class="mwf-button mwf-button-quiet" data-mwf-action="normal-now">Abrir agora</button>
          </div>
        </div>
      </div>
    `;

    overlay.addEventListener("click", async (event) => {
      const reflectionButton = event.target.closest("[data-mwf-reflection]");
      if (reflectionButton) {
        awarenessStore?.saveReflection(reflectionButton.getAttribute("data-mwf-reflection"));
        renderAwarenessSummary();
        return;
      }

      const button = event.target.closest("[data-mwf-action]");
      if (!button) return;

      if (!isWhatsAppReady()) return;

      const action = button.getAttribute("data-mwf-action");
      if (action === "search") {
        setSearchMode();
      }
      if (action === "continue") {
        if (overlay.classList.contains("mwf-normal-pending")) {
          finishNormalAttempt("continued_focused_conversation");
        }
        clearNormalDelay();
        continueOpenConversation();
      }
      if (action === "normal") {
        startIntentDeclaration();
      }
      if (action === "intent-open") {
        proceedFromIntent();
      }
      if (action === "intent-not-open") {
        declineFromIntent();
      }
      if (action === "intent-return-focus") {
        returnToFocusBeforeIntent();
      }
      if (action === "normal-cancel") {
        finishNormalAttempt("attempt_cancelled");
        clearNormalDelay();
      }
      if (action === "normal-now") {
        setNormalTemporarily(normalAttemptRecent ? "recent-explicit" : "immediate");
      }
      if (action === "awareness") {
        openAwarenessSummary();
      }
      if (action === "awareness-close") {
        closeAwarenessSummary();
      }
      if (action === "awareness-toggle") {
        const enabled = awarenessStore?.getSummary().enabled;
        awarenessStore?.setEnabled(!enabled);
        renderAwarenessSummary();
      }
      if (action === "awareness-clear") {
        if (window.confirm("Apagar todo o histórico local deste experimento?")) {
          awarenessStore?.clear();
          renderAwarenessSummary();
        }
      }
    });

    document.body.appendChild(overlay);
    ensureFocusedRecentsShelf();
    ensureAddCollectionButton();
    ensureFixedCollectionChooser();
    renderFocusedRecents();
    renderFixedCollections();
    updateFocusStreak();
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
      if (root().classList.contains(ROOT_NORMAL)) recordAwareness("focus_returned", { reason: "manual" });
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

  async function copyDiagnostic(diagnostic, button) {
    const text = JSON.stringify(diagnostic, null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch (_error) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    button.textContent = "Diagnóstico copiado";
  }

  function showToast(message, diagnostic = null) {
    if (!document.body) return;
    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement("div");
      toast.id = TOAST_ID;
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }

    toast.replaceChildren();
    const text = document.createElement("span");
    text.textContent = message;
    toast.appendChild(text);
    if (diagnostic) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Copiar diagnóstico";
      button.addEventListener("click", () => copyDiagnostic(diagnostic, button));
      toast.appendChild(button);
    }
    toast.hidden = false;
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => {
      toast.hidden = true;
    }, diagnostic ? 30000 : 6500);
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
    ensureFocusedRecentsShelf();
    renderFocusedRecents();
    renderFixedCollections();
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
          if (root().classList.contains(ROOT_NORMAL)) recordAwareness("focus_returned", { reason: "manual" });
          if (bypassTimer) window.clearTimeout(bypassTimer);
          bypassTimer = null;
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
        if (root().classList.contains(ROOT_OPENING_RECENT)) return;
        if (!isConversationListClick(event.target)) return;
        const title = readConversationRowTitle(conversationRow(event.target));
        if (isSearching()) enterFocusedConversationSoon(title);
        else if (title && (root().classList.contains(ROOT_NORMAL) || root().classList.contains(ROOT_SIDEBAR_OPEN))) {
          captureFocusedConversation(title, 0, null);
        }
      },
      true
    );

    document.addEventListener("keydown", (event) => {
      if (isMirrorControl(event.target)) return;
      if (root().classList.contains(ROOT_OPENING_RECENT)) return;
      if (event.key !== "Enter") return;
      if (isSearching()) enterFocusedConversationSoon();
      else if (root().classList.contains(ROOT_NORMAL) || root().classList.contains(ROOT_SIDEBAR_OPEN)) {
        const title = readConversationRowTitle(conversationRow(event.target));
        if (title) captureFocusedConversation(title, 0, null);
      }
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

    const lastOpenedAt = readLastNormalOpenedAt();
    const recentlyOpened = Boolean(lastOpenedAt && Date.now() - lastOpenedAt < RECENT_NORMAL_OPEN_MS);
    normalAttemptStartedAt = Date.now();
    normalAttemptRecent = recentlyOpened;
    recordAwareness("attempt_started");
    updateRecentNormalWarning(overlay, lastOpenedAt);

    if (recentlyOpened) {
      overlay.classList.add("mwf-normal-recent");
      overlay.querySelectorAll('[data-mwf-action="normal-now"]').forEach((button) => {
        button.textContent = "Abrir mesmo assim";
      });
      return;
    }

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
    normalDelayTimer = window.setTimeout(() => setNormalTemporarily("countdown"), NORMAL_DELAY_MS);
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
      <p class="mwf-normal-recent-warning" data-mwf-normal-recent-warning></p>
      <p class="mwf-normal-countdown">Liberando em <strong data-mwf-normal-countdown>8</strong>s…</p>
      <div class="mwf-actions">
        <button class="mwf-button mwf-button-primary" data-mwf-action="continue">Continuar na conversa</button>
        <button class="mwf-button mwf-button-secondary" data-mwf-action="normal-cancel">Cancelar</button>
        <button class="mwf-button mwf-button-quiet" data-mwf-action="normal-now">Abrir agora</button>
      </div>
    `;
    card.appendChild(confirm);
  }

  function updateRecentNormalWarning(overlay, lastOpenedAt) {
    const warning = overlay.querySelector("[data-mwf-normal-recent-warning]");
    if (!warning || !lastOpenedAt) return;
    warning.textContent = `Você abriu o WhatsApp normal há ${formatElapsedTime(Date.now() - lastOpenedAt)}. É impulso ou tédio?`;
  }

  function clearNormalDelay() {
    if (normalDelayTimer) window.clearTimeout(normalDelayTimer);
    if (normalDelayInterval) window.clearInterval(normalDelayInterval);
    normalDelayTimer = null;
    normalDelayInterval = null;
    const overlay = getOverlay();
    if (overlay) {
      overlay.classList.remove("mwf-normal-pending", "mwf-normal-recent");
      overlay.querySelectorAll('[data-mwf-action="normal-now"]').forEach((button) => {
        button.textContent = "Abrir agora";
      });
    }
  }

  function chooseNormalExpiryDestination() {
    return globalThis.MirrorFocusState?.chooseExpiryDestination({
      visibilityState: document.visibilityState,
      documentHasFocus: document.hasFocus(),
      hasOpenConversation: hasOpenConversation(),
    }) || "blind-overlay";
  }

  function setNormalTemporarily(route = "immediate") {
    finishNormalAttempt("normal_opened", { route });
    clearNormalDelay();
    if (bypassTimer) window.clearTimeout(bypassTimer);
    recordNormalOpenedAt();
    setNormal();
    bypassTimer = window.setTimeout(() => {
      bypassTimer = null;
      const expiryDestination = chooseNormalExpiryDestination();
      recordAwareness("focus_returned", { reason: "expiry", expiryDestination });
      if (expiryDestination === "focused-conversation") {
        goToMainChatsThen("expiry", () => setSearchFocusedConversation());
      } else {
        setActive({ showOverlay: true });
      }
    }, BYPASS_MS);
  }

  function boot() {
    startDevRefresh();
    installKeyboardShortcuts();
    installSearchGateHandler();
    installSearchSelectionHandler();
    installConversationStateObserver();
    window.setInterval(updateFocusStreak, 10000);
    whenBodyExists(async () => {
      try {
        await awarenessStore?.initialize(window.localStorage);
      } catch (_error) {
        // Isolated awareness storage must not block the focus overlay.
      }
      await loadFixedCollections();
      ensureControls();
      setActive({ showOverlay: true });
    });
  }

  root().classList.remove(ROOT_SEARCHING, ROOT_SEARCH_FOCUSED, ROOT_SEARCH_TOO_SHORT, ROOT_SEARCH_WAITING, ROOT_SIDEBAR_OPEN, ROOT_SIDEBAR_HIDDEN, ROOT_NORMAL, ROOT_OPENING_RECENT);
  root().classList.add(ROOT_ACTIVE, ROOT_OVERLAY_OPEN);
  boot();
})();
