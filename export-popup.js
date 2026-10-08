(() => {
  'use strict';
  const input = document.getElementById('archive');
  const status = document.getElementById('zip-status') || document.getElementById('status');
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
      let markdown;
      try { markdown = new TextDecoder('utf-8', {fatal:true, ignoreBOM:true}).decode(result.bytes); }
      catch (_) { throw new Error('Não foi possível ler o Markdown em UTF-8.'); }
      const pseudonymized = MirrorMarkdownPseudonyms.pseudonymizeMarkdown(markdown);
      url = URL.createObjectURL(new Blob([pseudonymized], {type:'text/markdown;charset=utf-8'}));
      save.href = url; save.download = 'chat.md';
      save.textContent = 'Salvar Markdown'; save.hidden = false;
      status.textContent = 'chat.md pronto: título, autores e citações pseudonimizados. Revise o corpo das mensagens antes de compartilhar. O ZIP original será mantido.';
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
