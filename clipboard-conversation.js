(function exposeClipboardConversation(scope) {
  'use strict';
  function transformClipboard(text, {removeTimestamps = false} = {}) {
    const people = new Map(); let authors = 0;
    const header = /^(\ufeff?)(\[\d{1,2}:\d{2}(?::\d{2})?,[ \t]*\d{1,2}\/\d{1,2}\/\d{2,4}\][ \t]+)([^:\r\n]+):([ \t]*)/;
    const quote = /^([ \t]*>[ \t]*_?)([^:\r\n]+):([ \t]*)/;
    const lines = text.split(/(\r\n|\n|\r)/);
    const participants = new Set();
    lines.forEach((line, index) => {
      if (index % 2) return;
      const match = line.match(header);
      if (match) { authors++; participants.add(match[3].trim().normalize('NFC')); }
      const cited = line.match(quote);
      if (cited) participants.add(cited[2].trim().normalize('NFC'));
    });
    const single = participants.size === 1;
    function person(label) {
      const key = label.trim().normalize('NFC');
      if (key === 'Renato C') return 'Eu';
      if (!people.has(key)) people.set(key, `Pessoa ${people.size + 1}`);
      return people.get(key);
    }
    const result = lines.map((line, index) => {
      if (index % 2) return line;
      line = line.replace(header,
        (_match, bom, timestamp, name, spacing) => `${bom}${removeTimestamps ? '' : timestamp}${single ? '' : person(name) + ':' + spacing}`);
      return line.replace(quote,
        (_match, prefix, name, spacing) => `${prefix}${single ? '' : person(name) + ':' + spacing}`);
    }).join('');
    if (!authors) throw new Error('Não encontrei autores no formato [hora, data] Nome: . O clipboard não foi alterado.');
    return result;
  }
  const api = Object.freeze({transformClipboard});
  scope.MirrorClipboardConversation = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
