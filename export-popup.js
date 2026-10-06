(() => {
  'use strict';
  const input = document.getElementById('archive');
  const status = document.getElementById('status');
  const save = document.getElementById('save');
  let url = null, generation = 0;
  function clearResult() {
    save.hidden = true;
    save.removeAttribute('href'); save.removeAttribute('download');
    if (url) URL.revokeObjectURL(url);
    url = null;
  }
  input.addEventListener('change', async () => {
    const token = ++generation;
    clearResult();
    const file = input.files?.[0];
    if (!file) { status.textContent = 'Processamento local. O ZIP original será mantido.'; return; }
    status.textContent = 'Extraindo localmente…';
    try {
      if (file.size > MirrorZipMarkdown.MAX_ZIP) throw new Error('ZIP maior que 64 MB.');
      const buffer = await file.arrayBuffer();
      if (token !== generation) return;
      const result = await MirrorZipMarkdown.extractMarkdown(buffer, file.name);
      if (token !== generation) return;
      url = URL.createObjectURL(new Blob([result.bytes], {type:'text/markdown;charset=utf-8'}));
      save.href = url; save.download = result.name;
      save.textContent = 'Salvar Markdown'; save.hidden = false;
      status.textContent = 'Markdown pronto. Clique em Salvar Markdown. O ZIP original será mantido.';
    } catch (error) {
      if (token !== generation) return;
      status.textContent = error.message || 'Não foi possível processar o ZIP.';
    }
    finally { if (token === generation) input.value = ''; }
  });
  save.addEventListener('click', () => {
    status.textContent = 'Download solicitado. Confira a pasta de downloads; o ZIP original foi mantido.';
  });
  window.addEventListener('pagehide', () => { generation += 1; clearResult(); });
})();
