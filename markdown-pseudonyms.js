(function exposeMarkdownPseudonyms(scope) {
  'use strict';
  function pseudonymizeMarkdown(markdown) {
    const people = new Map();
    const header = /^(\[\d{1,2}:\d{2}(?::\d{2})?(?:[ \t]+[AP]M)?\][ \t]+)\*\*([^\r\n]+?):\*\*([ \t]*)/;
    const quote = /^([ \t]*>[ \t]*_)([^:\r\n]+):([ \t]*)/;
    const lines = markdown.split(/(\r\n|\n|\r)/);
    const participants = new Set();
    lines.forEach((line, index) => {
      if (index % 2) return;
      const author = line.match(header), cited = line.match(quote);
      if (author) participants.add(author[2].trim().normalize('NFC'));
      if (cited) participants.add(cited[2].trim().normalize('NFC'));
    });
    const single = participants.size === 1;
    function person(label) {
      // Unicode spelling normalization only; case-distinct labels remain distinct.
      const key = label.trim().normalize('NFC');
      if (key === 'Você') return 'Eu';
      if (!people.has(key)) people.set(key, `Pessoa ${people.size + 1}`);
      return people.get(key);
    }
    // Preserve original newline tokens and all content outside the supported labels.
    return lines.map((line, index) => {
      if (index % 2) return line;
      if (index === 0) line = line.replace(/^(\ufeff?# Exportação de conversas do WhatsApp:[ \t]*)[^\r\n]+$/, '$1Chat');
      line = line.replace(header,
        (_match, prefix, name, spacing) => `${prefix}${single ? '' : '**' + person(name) + ':**' + spacing}`);
      return line.replace(quote,
        (_match, prefix, name, spacing) => `${prefix}${single ? '' : person(name) + ':' + spacing}`);
    }).join('');
  }
  const api = Object.freeze({pseudonymizeMarkdown});
  scope.MirrorMarkdownPseudonyms = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
