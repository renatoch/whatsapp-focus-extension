(function exposeClipboardConversation(scope) {
  'use strict';
  function transformClipboard(text, {removeTimestamps = false} = {}) {
    const people = new Map(); let authors = 0;
    function person(label) {
      const key = label.trim().normalize('NFC');
      if (key === 'Renato C') return 'Eu';
      if (!people.has(key)) people.set(key, `Pessoa ${people.size + 1}`);
      return people.get(key);
    }
    const result = text.split(/(\r\n|\n|\r)/).map((line, index) => {
      if (index % 2) return line;
      line = line.replace(/^(\ufeff?)(\[\d{1,2}:\d{2}(?::\d{2})?,[ \t]*\d{1,2}\/\d{1,2}\/\d{2,4}\][ \t]+)([^:\r\n]+):/,
        (_match, bom, timestamp, name) => { authors++; return `${bom}${removeTimestamps ? '' : timestamp}${person(name)}:`; });
      return line.replace(/^([ \t]*>[ \t]*_?)([^:\r\n]+):/,
        (_match, prefix, name) => `${prefix}${person(name)}:`);
    }).join('');
    if (!authors) throw new Error('Não encontrei autores no formato [hora, data] Nome: . O clipboard não foi alterado.');
    return result;
  }
  const api = Object.freeze({transformClipboard});
  scope.MirrorClipboardConversation = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
