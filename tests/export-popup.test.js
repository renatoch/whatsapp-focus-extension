const test=require('node:test'), assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function harness(extract=async()=>({bytes:new Uint8Array([65]),name:'Synthetic.md'})) {
  const nodes={archive:{},status:{},save:{hidden:true,removeAttribute(key){delete this[key];}}},listeners={},revoked=[],blobs=[];
  for(const [name,node]of Object.entries(nodes))node.addEventListener=(type,fn)=>listeners[name+':'+type]=fn;
  let next=0;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../export-popup.js'),'utf8'),{
    document:{getElementById:id=>nodes[id]},window:{addEventListener:(type,fn)=>listeners[type]=fn},Blob,TextDecoder,
    MirrorMarkdownPseudonyms:require('../markdown-pseudonyms.js'),
    URL:{createObjectURL:blob=>{blobs.push(blob);return `blob:synthetic-${++next}`;},revokeObjectURL:url=>revoked.push(url)},
    MirrorZipMarkdown:{MAX_ZIP:64*1024*1024,extractMarkdown:extract}});
  const select=async(name='Synthetic.zip')=>{nodes.archive.files=[{name,size:10,arrayBuffer:async()=>new ArrayBuffer(1)}];await listeners['archive:change']();};
  return {nodes,listeners,revoked,select,blobs};
}
test('offers download without claiming save completion, resets input and revokes URL on replacement/close',async()=>{
  const h=harness();await h.select();assert.equal(h.nodes.save.download,'chat.md');assert.equal(h.nodes.save.hidden,false);
  assert.equal(h.nodes.archive.value,'');h.listeners['save:click']();assert.match(h.nodes.status.textContent,/solicitado/);
  await h.select();assert.deepEqual(h.revoked,['blob:synthetic-1']);h.listeners.pagehide();assert.equal(h.nodes.save.hidden,true);
  assert.deepEqual(h.revoked,['blob:synthetic-1','blob:synthetic-2']);
});
test('obsolete extraction cannot overwrite a new selection',async()=>{
  let finish;const h=harness(async(_buffer,name)=> name==='Old.zip'?await new Promise(resolve=>finish=resolve):{bytes:new Uint8Array([66]),name:'New.md'});
  const old=h.select('Old.zip');await new Promise(resolve=>setImmediate(resolve));await h.select('New.zip');
  finish({bytes:new Uint8Array([65]),name:'Old.md'});await old;assert.equal(h.nodes.save.download,'chat.md');assert.equal(await h.blobs[0].text(),'B');
});
test('errors hide stale download and are rendered as plain text',async()=>{
  const h=harness(async()=>{throw new Error('ZIP inválido.');});await h.select();
  assert.equal(h.nodes.save.hidden,true);assert.equal(h.nodes.status.textContent,'ZIP inválido.');
});
test('download contains pseudonyms and no group name in its filename',async()=>{
  const h=harness(async()=>({bytes:new TextEncoder().encode('# Exportação de conversas do WhatsApp: Equipe Exemplo\n[10:09 AM] **Ana:** Olá\n> _Ana: citação'),name:'Equipe Exemplo.md'}));
  await h.select('Equipe Exemplo.zip');assert.equal(h.nodes.save.download,'chat.md');
  assert.equal(await h.blobs[0].text(),'# Exportação de conversas do WhatsApp: Chat\n[10:09 AM] Olá\n> _citação');
  assert.match(h.nodes.status.textContent,/Revise/);
});
test('direct chat uses neutral filename rather than ZIP phone and recognizes native self',async()=>{
  const h=harness(async()=>({bytes:new TextEncoder().encode('# Exportação de conversas do WhatsApp: +00 0000\n[7:05 AM] **Você:** Exemplo\n[7:06 AM] **Amiga:** Resposta'),name:'+00 0000.md'}));
  await h.select('+00 0000.zip');assert.equal(h.nodes.save.download,'chat.md');
  assert.equal(await h.blobs[0].text(),'# Exportação de conversas do WhatsApp: Chat\n[7:05 AM] **Eu:** Exemplo\n[7:06 AM] **Pessoa 1:** Resposta');
});
test('invalid UTF-8 is refused rather than silently corrupting text',async()=>{
  const h=harness(async()=>({bytes:new Uint8Array([0xff]),name:'Synthetic.md'}));await h.select();
  assert.equal(h.nodes.save.hidden,true);assert.match(h.nodes.status.textContent,/UTF-8/);assert.equal(h.blobs.length,0);
});
test('manifest exposes popup with clipboard but no downloads or filesystem permission',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../manifest.json'),'utf8'));
  assert.equal(manifest.action.default_popup,'export-popup.html');assert.deepEqual(manifest.permissions,['storage','clipboardRead','clipboardWrite']);
});
