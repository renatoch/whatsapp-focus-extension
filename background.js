// Clipboard payloads never pass through this worker; only action metadata/results.
let quickBusy = false;
async function quickCopy(removeTimestamps, removeNames = true) {
  if (quickBusy) return {ok:false, error:'busy'};
  quickBusy = true;
  let owned = false;
  try {
    if (!chrome.offscreen) return {ok:false,error:'unavailable'};
    const url = chrome.runtime.getURL('clipboard-offscreen.html');
    if (await chrome.offscreen.hasDocument()) {
      const contexts = await chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT'], documentUrls:[url]});
      if (!contexts.length) return {ok:false,error:'unavailable'};
      owned = true;
    } else {
      await chrome.offscreen.createDocument({url:'clipboard-offscreen.html', reasons:['CLIPBOARD'],
        justification:'Transformar texto copiado somente por clique explícito, sem abrir janela ou guardar histórico.'});
      owned = true;
    }
    const result = await chrome.runtime.sendMessage({type:'mwf-offscreen-adjust', removeTimestamps, removeNames});
    // Do not forward arbitrary response fields or provider errors to page context.
    if (result?.ok === true) return {ok:true};
    const error = ['read','write','format','large','request'].includes(result?.error) ? result.error : 'unavailable';
    return {ok:false,error};
  } catch (_) { return {ok:false,error:'unavailable'}; }
  finally {
    if (owned) { try { await chrome.offscreen.closeDocument(); } catch (_) { /* Field was cleared by the document after processing. */ } }
    quickBusy = false;
  }
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!['mwf-open-clipboard-panel','mwf-quick-copy'].includes(message?.type) || !sender.tab ||
      sender.id !== chrome.runtime.id || !sender.url?.startsWith('https://web.whatsapp.com/')) return;
  if (message.type === 'mwf-quick-copy') {
    if (typeof message.removeTimestamps !== 'boolean' || (message.removeNames !== undefined && typeof message.removeNames !== 'boolean')) { sendResponse({ok:false,error:'request'}); return; }
    quickCopy(message.removeTimestamps, message.removeNames !== false).then(sendResponse);
    return true;
  }
  chrome.windows.create({url:chrome.runtime.getURL(message.tool === 'zip' ? 'zip-panel.html' : 'clipboard-panel.html'), type:'popup', width:1000, height:720, focused:true}, () => {
    sendResponse({ok:!chrome.runtime.lastError});
  });
  return true;
});
