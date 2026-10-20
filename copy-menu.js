(function exposeCopyMenu(scope) {
  'use strict';
  function createCopyMenu({document, window, clipboard, transform, notify, openReview, openZip}) {
    let menu = null, trigger = null, busy = false, running = true;
    function close() {
      if (!menu) return;
      menu.remove(); menu = null;
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', keydown, true);
    }
    function outside(event) { if (menu && !menu.contains(event.target) && !trigger?.contains(event.target)) close(); }
    function keydown(event) { if (event.key === 'Escape') { event.preventDefault(); close(); } }
    async function adjust(removeTimestamps) {
      if (!running || busy) return;
      busy = true; close();
      let writing = false;
      try {
        const text = await clipboard.readText();
        if (!running) return;
        if (text.length > 4 * 1024 * 1024) throw Error('limit');
        let result;
        try { result = transform(text, {removeTimestamps}); }
        catch (_) { notify('Formato não reconhecido; clipboard mantido.'); return; }
        if (!running) return;
        writing = true;
        await clipboard.writeText(result);
        if (running) notify(removeTimestamps ? 'Clipboard ajustado — sem datas.' : 'Clipboard ajustado — datas mantidas.');
      } catch (_) {
        if (running) notify(writing ? 'Não foi possível atualizar o clipboard. Use Revisar texto.' : 'Não foi possível ler o clipboard (permissão ou tamanho). Use Revisar texto.');
      } finally { busy = false; }
    }
    function toggle(anchor) {
      if (!running) return;
      if (menu) { close(); return; }
      if (busy) { notify('Ajustando clipboard…'); return; }
      trigger = anchor;
      menu = document.createElement('div');
      menu.id = 'mirror-whatsapp-focus-copy-menu';
      menu.setAttribute('role', 'group'); menu.setAttribute('aria-label', 'Ajustar cópia');
      const actions = [
        ['Trocar nomes', () => adjust(false)],
        ['Trocar nomes e tirar datas', () => adjust(true)],
        ['Revisar texto…', () => { close(); openReview(); }],
        ['ZIP → Markdown…', () => { close(); openZip(); }],
      ];
      for (const [label, action] of actions) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
        button.addEventListener('click', event => { if (event.isTrusted) return action(); }); menu.appendChild(button);
      }
      const rect = anchor.getBoundingClientRect();
      menu.style.left = Math.max(8, Math.min(rect.right + 8, window.innerWidth - 280)) + 'px';
      menu.style.top = Math.max(8, Math.min(rect.top, window.innerHeight - 210)) + 'px';
      document.body.appendChild(menu);
      menu.firstElementChild?.focus();
      document.addEventListener('pointerdown', outside, true);
      document.addEventListener('keydown', keydown, true);
    }
    function dispose() { running = false; close(); }
    return Object.freeze({toggle, close, adjust, dispose});
  }
  const api = Object.freeze({createCopyMenu});
  scope.MirrorCopyMenu = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
