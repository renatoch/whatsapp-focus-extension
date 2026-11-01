(function exposeMarkUnread(scope) {
  'use strict';
  function createUnreadDom({document, window, isVisible, readHeader}) {
    let trigger = null;
    const labels = {
      close: ['Fechar conversa', 'Close chat'],
      unread: ['Marcar como não lida', 'Marcar como não lido', 'Mark as unread'],
      read: ['Marcar como lida', 'Marcar como lido', 'Mark as read'],
    };
    const normalize = value => String(value || '').trim().replace(/\s+/g, ' ');
    function menus() {
      return [...document.querySelectorAll('[role="menu"]')]
        .filter(menu => !menu.closest('[id^="mirror-whatsapp-focus-"]') && isVisible(menu) && menu.querySelector('[role="menuitem"]'));
    }
    function action(kind) {
      const open = menus();
      if (open.length !== 1) return null;
      const matches = [...open[0].querySelectorAll('button[role="menuitem"]')].filter(isVisible)
        .filter(button => !button.disabled && button.getAttribute('aria-disabled') !== 'true')
        .filter(button => [button, ...button.querySelectorAll('span,div')]
          .some(node => labels[kind].includes(normalize(node.textContent))));
      return matches.length === 1 ? matches[0] : null;
    }
    function openHeader() {
      const buttons = [...document.querySelectorAll('#main [data-testid="conversation-header"] button[aria-haspopup="menu"]')].filter(isVisible);
      if (buttons.length !== 1) return false;
      trigger = buttons[0]; trigger.click(); return true;
    }
    function hover(row) {
      if (!row?.isConnected) return false;
      row.dispatchEvent(new window.MouseEvent('mouseover', {bubbles:true, cancelable:true, view:window, relatedTarget:null}));
      return true;
    }
    function rowButton(row) { return row?.isConnected ? row.querySelector('button[data-testid="context-btn"]') : null; }
    function openRow(row) {
      const button = rowButton(row);
      if (!button || button.disabled) return false;
      trigger = button; button.click(); return true;
    }
    function invoke(kind) {
      const button = action(kind);
      if (!button) return false;
      trigger = null; // Native commands dismiss their own popup.
      button.click(); return true;
    }
    function dismiss() {
      const button = trigger; trigger = null;
      if (button?.isConnected && button.getAttribute('aria-expanded') !== 'false') button.click();
    }
    return Object.freeze({readHeader, hasMain:()=>Boolean(document.querySelector('#main')),
      menus, action, openHeader, hover, rowButton, openRow, invoke, dismiss,
      unread:row=>Boolean(row?.isConnected && [...row.querySelectorAll('[data-testid="icon-unread-count"]')].some(isVisible))});
  }

  function createMarkUnreadAction({dom, scheduler, normalize, prepareLookup, lookup,
    canStart, stillAllowed, onBegin, onEnd, onResult, onBusy, prepareFinish = () => {}, finishReady = () => true}) {
    let current = null, running = true;
    const CANCELLED = Symbol('cancelled');
    function valid(op) {
      if (!running || current !== op || !stillAllowed()) return false;
      if (op.closed) return !dom.hasMain();
      if (op.closing && !dom.hasMain()) return true;
      return normalize(dom.readHeader()) === op.title;
    }
    function check(op) { if (!valid(op)) throw CANCELLED; }
    function sleep(op, ms) {
      return new Promise(resolve => {
        const id = scheduler.setTimeout(() => {op.waits.delete(id); resolve();}, ms);
        op.waits.set(id, () => {scheduler.clearTimeout(id); resolve();});
      });
    }
    function fail(code) { throw {code}; }
    async function until(op, predicate, code, attempts = 30) {
      for (let i = 0; i < attempts; i++) {
        check(op);
        const value = predicate();
        check(op);
        if (value) return value;
        await sleep(op, 100);
      }
      fail(code);
    }
    async function target(op) {
      let previous = null, ambiguous = false;
      return until(op, () => {
        const result = lookup(op.title);
        const matches = result.accepted ? result.candidates.filter(candidate => normalize(candidate.title) === op.title) : [];
        ambiguous = matches.length > 1;
        const row = matches.length === 1 ? matches[0].clickTarget : null;
        const stable = row?.isConnected && row === previous;
        previous = row;
        if (stable) return row;
        return false;
      }, 'lookup').catch(error => {if (error?.code === 'lookup' && ambiguous) fail('ambiguous');throw error;});
    }
    async function openRow(op, row) {
      check(op);
      if (!dom.hover(row)) fail('lookup');
      await until(op, () => dom.rowButton(row), 'menu', 10);
      check(op);
      // A hover/rerender can recycle a connected row: require a fresh exact lookup.
      const fresh = await target(op);
      if (fresh !== row) fail('lookup');
      if (!dom.openRow(row)) fail('menu');
      await until(op, () => dom.action('unread') || dom.action('read'), 'menu');
    }
    function cancel() {
      const op = current;
      if (!op) return;
      current = null;
      for (const abort of op.waits.values()) abort();
      op.waits.clear(); op.title = '';
      dom.dismiss(); onEnd({ok:false, cancelled:true, closed:op.closed}); onBusy(false);
    }
    function reconcile() { if (current && !valid(current)) cancel(); }
    async function run() {
      if (!running || current || !canStart()) return {ok:false, error:'unavailable', closed:false};
      const title = normalize(dom.readHeader());
      if (!title) return {ok:false, error:'unavailable', closed:false};
      const op = {title, closed:false, closing:false, waits:new Map()};
      current = op;
      let result = {ok:false, error:'unavailable', closed:false};
      try {
        onBegin(); onBusy(true); check(op);
        await until(op, () => dom.menus().length === 0, 'menu', 15);
        prepareLookup(op.title, () => valid(op));
        await target(op); check(op);
        if (!dom.openHeader()) fail('close');
        await until(op, () => dom.action('close'), 'close');
        check(op); op.closing = true;
        if (!dom.invoke('close')) fail('close');
        await until(op, () => !dom.hasMain(), 'close');
        op.closed = true;
        await until(op, () => dom.menus().length === 0, 'menu', 15);
        // Closing or normalizing can replace native search state and rows.
        prepareLookup(op.title, () => valid(op));
        const row = await target(op);
        if (!dom.unread(row)) {
          await openRow(op, row); check(op);
          if (dom.action('unread') && !dom.action('read')) {
            if (!dom.invoke('unread')) fail('mark');
          } else if (dom.action('read') && !dom.action('unread')) {
            // Changed to unread during the operation: never toggle it to read.
            dom.dismiss();
          } else fail('mark');
        }
        await until(op, () => dom.menus().length === 0, 'menu', 15);
        let confirmed = null;
        await until(op, () => {
          const result = lookup(op.title);
          const matches = result.accepted ? result.candidates.filter(c => normalize(c.title) === op.title) : [];
          const row = matches.length === 1 ? matches[0].clickTarget : null;
          const success = row?.isConnected && dom.unread(row) && row === confirmed;
          confirmed = row;
          return success;
        }, 'verify');
        check(op);
        try {
          prepareFinish(() => valid(op));
          await until(op, finishReady, 'restore');
        } catch (error) {
          if (error === CANCELLED) throw error;
          fail('restore');
        }
        check(op); result = {ok:true, closed:true};
      } catch (error) {
        result = error === CANCELLED ? {ok:false, cancelled:true, closed:op.closed}
          : {ok:false, error:['lookup','ambiguous','menu','close','mark','verify','restore'].includes(error?.code) ? error.code : 'unavailable', closed:op.closed};
      } finally {
        if (current === op) {
          current = null;
          for (const abort of op.waits.values()) abort();
          op.waits.clear(); op.title = '';
          dom.dismiss(); onEnd(result); onBusy(false);
          if (!result.cancelled) onResult(result);
        }
      }
      return result;
    }
    function dispose() { cancel(); running = false; }
    return Object.freeze({run, cancel, reconcile, dispose, isBusy:()=>current !== null});
  }
  const api = Object.freeze({createUnreadDom, createMarkUnreadAction});
  scope.MirrorMarkUnread = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
