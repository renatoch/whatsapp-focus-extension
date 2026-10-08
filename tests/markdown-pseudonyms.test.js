const test = require('node:test');
const assert = require('node:assert/strict');
const {pseudonymizeMarkdown} = require('../markdown-pseudonyms.js');
test('replaces group, authors and quotes with stable numbers and keeps dates and message text', () => {
  const input = '# Exportação de conversas do WhatsApp: Equipe Exemplo\r\nData de exportação: October 6, 2026 at 2:05 PM\r\n\r\n[10:09 AM] **Ana Exemplo:** Olá\r\n> _Bruno Exemplo: texto citado_\r\n[10:10 AM] **Bruno Exemplo:** Resposta\r\n> _Ana Exemplo:\r\n[10:11 AM] **Ana Exemplo:** Fim';
  const output = pseudonymizeMarkdown(input);
  assert.equal(output, '# Exportação de conversas do WhatsApp: Chat\r\nData de exportação: October 6, 2026 at 2:05 PM\r\n\r\n[10:09 AM] **Pessoa 1:** Olá\r\n> _Pessoa 2: texto citado_\r\n[10:10 AM] **Pessoa 2:** Resposta\r\n> _Pessoa 1:\r\n[10:11 AM] **Pessoa 1:** Fim');
});
test('quote preceding first message uses same identity and distinct names stay distinct', () => {
  assert.equal(pseudonymizeMarkdown('> _Ana: x_\n[08:00] **Ana:** a\n[08:01] **ana:** b\n[08:02] **Ana Maria:** c'),
    '> _Pessoa 1: x_\n[08:00] **Pessoa 1:** a\n[08:01] **Pessoa 2:** b\n[08:02] **Pessoa 3:** c');
});
test('identity map resets per export and handles literal symbols and unicode accents', () => {
  assert.equal(pseudonymizeMarkdown('[08:00] **A.(+):** x\n> _A.(+): y'), '[08:00] x\n> _y');
  assert.equal(pseudonymizeMarkdown('[08:00] **José:** x\n> _Jose\u0301: y'), '[08:00] x\n> _y');
  assert.equal(pseudonymizeMarkdown('[08:00] **Outra:** x'), '[08:00] x');
});
test('does not claim or perform general entity removal in message bodies, links or dates', () => {
  const text='[08:00] **Ana:** Ana falou com Bruno, telefone 123, https://example.test\nTexto **Ana:** literal\n> uma citação comum';
  assert.equal(pseudonymizeMarkdown(text),'[08:00] Ana falou com Bruno, telefone 123, https://example.test\nTexto **Ana:** literal\n> uma citação comum');
});
test('different quoted person preserves labels even with a single message author', () => {
  assert.equal(pseudonymizeMarkdown('[08:00] **Ana:** Texto\n> _Bruno: citado_'), '[08:00] **Pessoa 1:** Texto\n> _Pessoa 2: citado_');
});
test('repeated single-author messages omit the whole bold label without empty markup', () => {
  assert.equal(pseudonymizeMarkdown('[08:00] **Ana:** Uma\n[08:01] **Ana:** Duas'), '[08:00] Uma\n[08:01] Duas');
});
test('native Você author and quote become Eu without consuming a person number', () => {
  assert.equal(pseudonymizeMarkdown('[7:05 AM] **Você:** Texto\n[7:06 AM] **Amiga:** Resposta\n> _Você: citado_\n> _Amiga: outro_'),
    '[7:05 AM] **Eu:** Texto\n[7:06 AM] **Pessoa 1:** Resposta\n> _Eu: citado_\n> _Pessoa 1: outro_');
});
test('self-only direct excerpt still omits redundant labels', () => {
  assert.equal(pseudonymizeMarkdown('[7:05 AM] **Você:** Texto\n[7:06 AM] **Você:** Outro'), '[7:05 AM] Texto\n[7:06 AM] Outro');
});
test('retains BOM, final newline and CR/LF line endings', () => {
  assert.equal(pseudonymizeMarkdown('\ufeff# Exportação de conversas do WhatsApp: Exemplo\n[08:00] **Ana:** x\n'), '\ufeff# Exportação de conversas do WhatsApp: Chat\n[08:00] x\n');
});
