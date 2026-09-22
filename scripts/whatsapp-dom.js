(function exposeWhatsAppDom(globalScope) {
  "use strict";

  // No DOM access or listener installation until the injected factory is used.
  function createWhatsAppDom({ document, window, debugLog = () => {}, describeElement = () => null,
    isMirrorControl = () => false, overlayId = "mirror-whatsapp-focus-overlay" }) {
    const { InputEvent, KeyboardEvent, MouseEvent } = window;

    function readTitle(element) {
      if (!element) return "";
      return String(element.getAttribute?.("title") || element.textContent || "").trim().replace(/\s+/g, " ");
    }

    function readActiveConversationTitle() {
      return readActiveConversationTitleDetails().title;
    }

    function readActiveConversationTitleDetails() {
      const selectors = [
        ['#main header [data-testid="conversation-info-header-chat-title"]', 'infoTitle'],
        ['#main header [data-testid="conversation-info-header"] [title]', 'infoContainerTitle'],
        ['#main header span[dir="auto"][title]', 'autoSpanTitle'],
        ['#main header span[title]', 'spanTitle'],
        ['#main header [dir="auto"]', 'autoText'],
      ];
      for (const [selector, headerSource] of selectors) {
        const selected = Array.from(document.querySelectorAll(selector)).find((element) => readTitle(element));
        if (selected) return { title: readTitle(selected), headerSource,
          headerTextDifferent: String(selected.textContent || '').trim().replace(/\s+/g, ' ').normalize('NFKC') !== readTitle(selected).normalize('NFKC') };
      }
      return { title: '', headerSource: 'unavailable', headerTextDifferent: false };
    }

    function conversationRow(target) {
      return target?.closest?.(
        '[data-testid="cell-frame-container"], [data-testid="conversation-list-item"], [role="listitem"], [role="row"]'
      ) || null;
    }

    function conversationListRow(target) {
      if (!target?.closest) return null;
      const row = target.closest('[data-testid="conversation-list-item"], [role="listitem"], [role="row"]');
      if (!row?.querySelector?.('[data-testid="cell-frame-title"]')) return null;
      if (!row.closest("#side") && !row.closest('[data-testid="archived-chatlist"]')) return null;
      return row;
    }

    function readConversationRowTitle(row) {
      return readConversationRowTitleDetails(row).title;
    }

    function readConversationRowTitleDetails(row) {
      const empty = { title: "", titleSource: "unknownSource", selectedTextDifferent: false, containerTextRelation: "missing" };
      if (!row) return empty;
      const selectors = [
        ['[data-testid="cell-frame-title"] [title]', "frameChildTitle"],
        ['[data-testid="cell-frame-title"]', "frameTitle"],
        ['span[dir="auto"][title]', "autoSpanTitle"],
        ['span[title]', "spanTitle"],
      ];
      const normalize = (value) => String(value || "").trim().replace(/\s+/g, " ").normalize("NFKC");
      for (const [selector, titleSource] of selectors) {
        const selected = Array.from(row.querySelectorAll(selector)).find((element) => readTitle(element));
        if (!selected) continue;
        const title = readTitle(selected);
        const container = row.querySelector?.('[data-testid="cell-frame-title"]');
        return { title, titleSource,
          selectedTextDifferent: normalize(selected.textContent) !== normalize(title),
          containerTextRelation: !container ? "missing" : normalize(container.textContent) === normalize(title) ? "same" : "different" };
      }
      return empty;
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
        bubbles: true, cancelable: true, composed: true,
        button: 0, buttons: 1, view: window,
      }));
    }

    function focusedConversationRows(rows) {
      const eligible = [];
      let grid = null, inConversations = false, conversationSectionFound = false;
      for (const row of rows) {
        const parent = row.parentElement;
        if (!row.matches?.('[role="row"]') || !parent?.matches?.('[role="grid"]')) {
          grid = null;
          inConversations = false;
          continue;
        }
        if (parent !== grid) { grid = parent; inConversations = false; }
        const headings = Array.from(row.querySelectorAll('h2'));
        if (headings.length) {
          const label = headings.length === 1 ? String(headings[0].textContent || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase() : '';
          inConversations = label === 'conversas' || label === 'chats';
          conversationSectionFound ||= inConversations;
          continue;
        }
        if (inConversations) eligible.push(row);
      }
      return { rows: eligible, conversationSectionFound };
    }

    function focusedSearchCandidates() {
      const rows = Array.from(document.querySelectorAll(
        '#side [data-testid="cell-frame-container"], #side [data-testid="conversation-list-item"], #side [role="listitem"], #side [role="row"]'
      ));
      const outerRows = rows.filter((row) => !rows.some((other) => other !== row && other.contains(row)));
      const section = focusedConversationRows(outerRows);
      return {
        rowCount: outerRows.length,
        conversationSectionFound: section.conversationSectionFound,
        candidates: section.rows.map((row) => ({
          row, clickTarget: focusedResultClickTarget(row), ...readConversationRowTitleDetails(row),
        })).filter((candidate) => candidate.title && candidate.clickTarget),
      };
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

    function clearNativeSearchText(field) {
      if (!field || !getSearchText(field)) return;
      setNativeSearchText(field, "");
    }

    function getSearchText(field = findNativeSearchField()) {
      if (!field) return "";
      if ("value" in field) return String(field.value || "").trim();
      return String(field.textContent || "").trim();
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
          selector, count: elements.length,
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

    function isolateEmptySearchControls() {
      const side = document.querySelector("#side");
      const field = findNativeSearchField();
      if (!side || !field || !side.contains(field)) return;
      document.querySelectorAll("#side [data-mwf-empty-search-hidden]").forEach((element) => {
        element.removeAttribute("data-mwf-empty-search-hidden");
      });
      let branch = field.closest('[role="search"]') || field.parentElement;
      if (!branch || branch === side || !side.contains(branch)) return;
      while (branch && branch !== side) {
        const parent = branch.parentElement;
        if (!parent) break;
        for (const sibling of parent.children) {
          if (sibling !== branch && !sibling.matches("header")) sibling.setAttribute("data-mwf-empty-search-hidden", "");
        }
        branch = parent;
      }
    }

    function findBackControl() {
      const selectors = ['#side [aria-label="Back"]', '#side [aria-label="Voltar"]',
        '#side [title="Back"]', '#side [title="Voltar"]', '#side [data-icon="back"]', '#side [data-testid="back"]'];
      for (const selector of selectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        debugLog("findBackControl:selector", { selector, count: elements.length, first: describeElement(elements[0]) });
        const found = elements.map((element) => element.closest("button") || element.closest('[role="button"]') || element).find(isVisibleElement);
        if (found) return found;
      }
      return undefined;
    }

    function findMainChatsButton() {
      const labels = ["Conversas", "Chats"];
      const candidates = Array.from(document.querySelectorAll('button, [role="button"], [aria-label], [title]'));
      debugLog("findMainChatsButton:candidates", { count: candidates.length, sample: candidates.slice(0, 12).map(describeElement) });
      const byLabel = candidates.find((element) => {
        if (!isVisibleElement(element) || isMirrorControl(element)) return false;
        const text = [element.getAttribute("aria-label"), element.getAttribute("title"), element.textContent].filter(Boolean).join(" ");
        return labels.some((label) => text.toLowerCase().includes(label.toLowerCase()));
      });
      if (byLabel) { debugLog("findMainChatsButton:found-by-label", describeElement(byLabel)); return byLabel; }
      const byPosition = candidates.filter((element) => {
        if (!isVisibleElement(element) || isMirrorControl(element)) return false;
        const rect = element.getBoundingClientRect();
        return rect.left >= 0 && rect.left < 120 && rect.top > 35 && rect.top < 135 && rect.width > 24 && rect.height > 24;
      }).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
      debugLog("findMainChatsButton:found-by-position", describeElement(byPosition));
      return byPosition;
    }

    function findNestedViewTitle() {
      const titles = ["Arquivadas", "Archived", "Configurações", "Settings"];
      return Array.from(document.querySelectorAll("#side h1, #side h2, #side header span, #side [title]"))
        .find((element) => titles.some((title) => (element.textContent || element.getAttribute("title") || "").includes(title)));
    }

    function isNestedListView() {
      const backControl = findBackControl();
      const title = findNestedViewTitle();
      const nested = Boolean(backControl) || Boolean(title);
      debugLog("isNestedListView", { nested, backControl: describeElement(backControl), title: describeElement(title) });
      return nested;
    }

    function exitNestedListView() {
      debugLog("exitNestedListView:start");
      const chatsButton = findMainChatsButton();
      debugLog("exitNestedListView:chatsButton", describeElement(chatsButton));
      if (chatsButton) { chatsButton.click(); debugLog("exitNestedListView:clicked-chatsButton"); return; }
      const backControl = findBackControl();
      debugLog("exitNestedListView:backControl", describeElement(backControl));
      if (backControl) { backControl.click(); debugLog("exitNestedListView:clicked-backControl"); return; }
      debugLog("exitNestedListView:fallback-escape");
      for (const target of [document.activeElement, document.body, document, window]) {
        if (!target?.dispatchEvent) continue;
        for (const type of ["keydown", "keyup"]) {
          target.dispatchEvent(new KeyboardEvent(type, { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true, cancelable: true }));
        }
      }
    }

    function hasOpenConversation() { return Boolean(document.querySelector("#main")); }
    function isWhatsAppReady() { return Boolean(document.querySelector("#side")); }
    function findNativeLoadingProgress() {
      return Array.from(document.querySelectorAll("progress")).find((progress) => {
        if (progress.closest(`#${overlayId}`)) return false;
        return isVisibleElement(progress);
      });
    }

    return Object.freeze({ readTitle, readActiveConversationTitle, readActiveConversationTitleDetails, conversationRow, conversationListRow, readConversationRowTitle, readConversationRowTitleDetails,
      focusedResultClickTarget, activateFocusedResult, focusedConversationRows, focusedSearchCandidates, setNativeSearchText,
      clearNativeSearchText, getSearchText, findNativeSearchField, isVisibleElement,
      isolateEmptySearchControls, findBackControl, findMainChatsButton, findNestedViewTitle, isNestedListView,
      exitNestedListView, hasOpenConversation, isWhatsAppReady, findNativeLoadingProgress });
  }

  const api = Object.freeze({ createWhatsAppDom });
  globalScope.MirrorWhatsAppDom = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
