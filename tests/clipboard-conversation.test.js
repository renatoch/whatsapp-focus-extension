const test = require('node:test'), assert = require('node:assert/strict');
const {transformClipboard} = require('../clipboard-conversation.js');
const input = '[12:51, 06/10/2026] Renato C: Texto 1\n[12:52, 06/10/2026] Renato C: Texto 2\n\nContinuação Texto 2\n[12:52, 06/10/2026] Renato C: Texto 3\n[13:15, 06/10/2026] Nome amiga: Texto 4\n[13:17, 06/10/2026] Renato C: Texto 5';
test('self becomes Eu, other author Pessoa 1 and continuation stays intact',()=>{
  assert.equal(transformClipboard(input),input.replaceAll('Renato C:','Eu:').replace('Nome amiga:','Pessoa 1:'));
});
test('optional date removal changes only recognized message headers',()=>{
  assert.equal(transformClipboard(input,{removeTimestamps:true}), 'Eu: Texto 1\nEu: Texto 2\n\nContinuação Texto 2\nEu: Texto 3\nPessoa 1: Texto 4\nEu: Texto 5');
  assert.equal(transformClipboard('[12:00, 1/2/2026] Renato C: prazo [13:00, 1/2/2026]',{removeTimestamps:true}), 'Eu: prazo [13:00, 1/2/2026]');
});
test('quotes and authors share numbers; self quotes remain Eu, distinct labels stay distinct',()=>{
  assert.equal(transformClipboard('> _Amiga: x_\r\n[12:00, 1/2/2026] Renato C: x\r\n[12:01, 1/2/2026] Amiga: y\r\n> Renato C: z\r\n[12:02, 1/2/2026] Outra: w'),
    '> _Pessoa 1: x_\r\n[12:00, 1/2/2026] Eu: x\r\n[12:01, 1/2/2026] Pessoa 1: y\r\n> Eu: z\r\n[12:02, 1/2/2026] Pessoa 2: w');
});
test('mapping is transient per call and body names are not claimed to be removed',()=>{
  assert.equal(transformClipboard('[12:00, 1/2/2026] Amiga: Renato C ligou'), '[12:00, 1/2/2026] Pessoa 1: Renato C ligou');
  assert.equal(transformClipboard('[12:00, 1/2/2026] Outra: x'), '[12:00, 1/2/2026] Pessoa 1: x');
});
test('unrecognized or empty format is rejected without returning unchanged private text as a success',()=>{
  for(const text of ['', 'Texto solto', '> _Amiga: citação'])assert.throws(()=>transformClipboard(text),/não foi alterado/);
});
