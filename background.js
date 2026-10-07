// Only opens an extension-owned UI. Clipboard content never passes through messages.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'mwf-open-clipboard-panel' || !sender.tab ||
      sender.id !== chrome.runtime.id || !sender.url?.startsWith('https://web.whatsapp.com/')) return;
  chrome.windows.create({url:chrome.runtime.getURL('clipboard-panel.html'), type:'popup', width:1000, height:720, focused:true}, () => {
    sendResponse({ok:!chrome.runtime.lastError});
  });
  return true;
});
