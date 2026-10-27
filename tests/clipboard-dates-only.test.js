const test=require('node:test'),assert=require('node:assert/strict');
const {transformClipboard}=require('../clipboard-conversation.js');
test('dates-only preserves original authors, quotes and continuation lines exactly',()=>{
  const input='[12:51, 06/10/2026] Renato C: Texto 1\r\n[13:15, 06/10/2026] Nome amiga: Texto 2\r\n\r\nContinuação\r\n> _Nome amiga: citado_';
  assert.equal(transformClipboard(input,{removeTimestamps:true,removeNames:false}), 'Renato C: Texto 1\r\nNome amiga: Texto 2\r\n\r\nContinuação\r\n> _Nome amiga: citado_');
});
test('single author retains name and spacing without pseudonymization',()=>{
  assert.equal(transformClipboard('[7:05, 6/10/2026]  Renato C:  Texto',{removeTimestamps:true,removeNames:false}), 'Renato C:  Texto');
});
test('dates-only also handles timestamped text whose single-author labels were previously removed',()=>{
  assert.equal(transformClipboard('[12:00, 1/2/2026] Texto sem autor\n[12:01, 1/2/2026] Outro',{removeTimestamps:true,removeNames:false}), 'Texto sem autor\nOutro');
});
test('timestamps inside message bodies and ordinary quoted dates remain unchanged',()=>{
  assert.equal(transformClipboard('[12:00, 1/2/2026] Ana: prazo [13:00, 2/2/2026]\n> data 1/2/2026',{removeTimestamps:true,removeNames:false}), 'Ana: prazo [13:00, 2/2/2026]\n> data 1/2/2026');
  assert.throws(()=>transformClipboard('Texto sem timestamp',{removeTimestamps:true,removeNames:false}));
});
