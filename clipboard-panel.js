(() => {
  'use strict';
  const original = document.getElementById('original');
  const result = document.getElementById('result');
  const removeDates = document.getElementById('remove-timestamps');
  const readButton = document.getElementById('read');
  const replaceButton = document.getElementById('replace');
  const status = document.getElementById('status');
  let generation = 0, running = true, writing = false, initialRead = false;
  function preview() {
    replaceButton.disabled = true;
    result.value = '';
    try {
      result.value = MirrorClipboardConversation.transformClipboard(original.value, {removeTimestamps:removeDates.checked});
      replaceButton.disabled = writing;
      status.textContent = 'Prévia pronta. Confira o resultado; o clipboard ainda não foi alterado.';
    } catch (_) {
      status.textContent = 'Formato não reconhecido. Esperado: [hora, data] Nome: . O clipboard não foi alterado.';
    }
  }
  async function read() {
    if (!running || writing) return;
    initialRead = true;
    const token = ++generation;
    original.value = result.value = '';
    replaceButton.disabled = true;
    status.textContent = 'Lendo clipboard localmente…';
    try {
      const text = await navigator.clipboard.readText();
      if (!running || token !== generation) return;
      if (text.length > 4 * 1024 * 1024) throw new Error('too-large');
      original.value = text;
      preview();
    } catch (_) {
      if (running && token === generation) status.textContent = 'Não foi possível ler. Foque esta janela e clique em Ler clipboard novamente. Limite: 4 Mi caracteres.';
    }
  }
  readButton.addEventListener('click', read);
  removeDates.addEventListener('change', () => { if (running && !writing && original.value) preview(); });
  replaceButton.addEventListener('click', async () => {
    if (!running || writing || replaceButton.disabled) return;
    writing = true;
    replaceButton.disabled = readButton.disabled = removeDates.disabled = true;
    const text = result.value;
    const token = generation;
    try {
      await navigator.clipboard.writeText(text);
      if (running && token === generation) status.textContent = 'Clipboard substituído pelo resultado revisado.';
    } catch (_) {
      if (running && token === generation) status.textContent = 'Não foi possível substituir o clipboard. Você pode tentar novamente.';
    } finally {
      writing = false;
      if (running) { readButton.disabled = removeDates.disabled = false; replaceButton.disabled = !result.value; }
    }
  });
  document.getElementById('close').addEventListener('click', () => { dispose(); window.close(); });
  function dispose() {
    running = false; generation += 1;
    original.value = result.value = '';
    replaceButton.disabled = true;
  }
  window.addEventListener('pagehide', dispose);
  window.addEventListener('focus', () => { if (!initialRead && running) read(); });
  if (document.hasFocus()) read();
})();
