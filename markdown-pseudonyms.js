(function exposeMarkdownPseudonyms(scope) {
  'use strict';
  function pseudonymizeMarkdown(markdown) {
    const people = new Map();
    function person(label) {
      // Unicode spelling normalization only; case-distinct labels remain distinct.
      const key = label.trim().normalize('NFC');
      if (!people.has(key)) people.set(key, `Pessoa ${people.size + 1}`);
      return people.get(key);
    }
    // Preserve original newline tokens and all content outside the supported labels.
    return markdown.split(/(\r\n|\n|\r)/).map((line, index) => {
      if (index % 2) return line;
      if (index === 0) line = line.replace(/^(\ufeff?# Exportação de conversas do WhatsApp:[ \t]*)[^\r\n]+$/, '$1Grupo');
      line = line.replace(/^(\[\d{1,2}:\d{2}(?::\d{2})?(?:[ \t]+[AP]M)?\][ \t]+\*\*)([^\r\n]+?):(\*\*)/,
        (_match, prefix, name, suffix) => `${prefix}${person(name)}:${suffix}`);
      return line.replace(/^([ \t]*>[ \t]*_)([^:\r\n]+):/,
        (_match, prefix, name) => `${prefix}${person(name)}:`);
    }).join('');
  }
  const api = Object.freeze({pseudonymizeMarkdown});
  scope.MirrorMarkdownPseudonyms = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
