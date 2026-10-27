// Internal offscreen document; no content is returned through runtime messages.
(() => {
  'use strict';
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type !== 'mwf-offscreen-adjust' || sender.id !== chrome.runtime.id || sender.tab ||
        (sender.url && sender.url !== chrome.runtime.getURL('background.js'))) return;
    if (typeof message.removeTimestamps !== 'boolean' || (message.removeNames !== undefined && typeof message.removeNames !== 'boolean')) { respond({ok:false, error:'request'}); return; }
    const field = document.createElement('textarea');
    field.setAttribute('aria-hidden', 'true');
    field.style.position = 'fixed'; field.style.opacity = '0';
    let phase = 'read';
    document.body.appendChild(field);
    try {
      field.focus();
      // Clipboard permission + extension document context. Async clipboard APIs
      // require focus unavailable in an offscreen document; execCommand is used here.
      if (!document.execCommand('paste')) { respond({ok:false,error:'read'}); return; }
      if (field.value.length > 4 * 1024 * 1024) { respond({ok:false,error:'large'}); return; }
      let result;
      try { result = MirrorClipboardConversation.transformClipboard(field.value, {removeTimestamps:message.removeTimestamps, removeNames:message.removeNames !== false}); }
      catch (_) { respond({ok:false,error:'format'}); return; }
      phase = 'write';
      field.value = result;
      field.select();
      if (!document.execCommand('copy')) { respond({ok:false,error:'write'}); return; }
      respond({ok:true});
    } catch (_) { respond({ok:false,error:phase}); }
    finally { field.value = ''; field.remove(); }
  });
})();
