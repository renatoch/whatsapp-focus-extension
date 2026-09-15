(function exposeWhatsAppDom(globalScope) {
  "use strict";

  // No DOM access or listener installation until the injected factory is used.
  function createWhatsAppDom({ document, window, debugLog = () => {}, describeElement = () => null }) {
    const { InputEvent, KeyboardEvent, MouseEvent } = window;

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
        const title = Array.from(document.querySelectorAll(selector)).map(readTitle).find(Boolean);
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

    function focusedSearchCandidates() {
      const rows = Array.from(document.querySelectorAll(
        '#side [data-testid="cell-frame-container"], #side [data-testid="conversation-list-item"], #side [role="listitem"], #side [role="row"]'
      ));
      const outerRows = rows.filter((row) => !rows.some((other) => other !== row && other.contains(row)));
      return {
        rowCount: outerRows.length,
        candidates: outerRows.map((row) => ({
          row, clickTarget: focusedResultClickTarget(row), title: readConversationRowTitle(row),
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

    return Object.freeze({ readTitle, readActiveConversationTitle, conversationRow, readConversationRowTitle,
      focusedResultClickTarget, activateFocusedResult, focusedSearchCandidates, setNativeSearchText,
      clearNativeSearchText, getSearchText, findNativeSearchField, isVisibleElement });
  }

  const api = Object.freeze({ createWhatsAppDom });
  globalScope.MirrorWhatsAppDom = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
