(() => {
  'use strict';
  const button = document.getElementById('adjust-clipboard');
  const removeDates = document.getElementById('remove-timestamps');
  const status = document.getElementById('clipboard-status');
  button.addEventListener('click', async () => {
    if (button.disabled) return;
    const removeTimestamps = removeDates.checked;
    button.disabled = true;
    status.textContent = 'Lendo e ajustando localmente…';
    try {
      const text = await navigator.clipboard.readText();
      if (text.length > 4 * 1024 * 1024) throw new Error('Trecho muito grande. O clipboard não foi alterado.');
      const result = MirrorClipboardConversation.transformClipboard(text, {removeTimestamps});
      await navigator.clipboard.writeText(result);
      status.textContent = 'Clipboard atualizado. Revise antes de compartilhar: nomes no corpo e outros identificadores permanecem.';
    } catch (_) {
      status.textContent = 'Não foi possível ajustar o clipboard. Verifique a permissão e o formato [hora, data] Nome: . Nenhum texto foi enviado ou armazenado.';
    } finally { button.disabled = false; }
  });
})();
