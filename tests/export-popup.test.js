const test=require('node:test'), assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function harness(extract=async()=>({bytes:new Uint8Array([65]),name:'Synthetic.md'})) {
  const nodes={archive:{},status:{},save:{hidden:true,removeAttribute(key){delete this[key];}}},listeners={},revoked=[];
  for(const [name,node]of Object.entries(nodes))node.addEventListener=(type,fn)=>listeners[name+':'+type]=fn;
  let next=0;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../export-popup.js'),'utf8'),{
    document:{getElementById:id=>nodes[id]},window:{addEventListener:(type,fn)=>listeners[type]=fn},Blob,
    URL:{createObjectURL:()=>`blob:synthetic-${++next}`,revokeObjectURL:url=>revoked.push(url)},
    MirrorZipMarkdown:{MAX_ZIP:64*1024*1024,extractMarkdown:extract}});
  const select=async(name='Synthetic.zip')=>{nodes.archive.files=[{name,size:10,arrayBuffer:async()=>new ArrayBuffer(1)}];await listeners['archive:change']();};
  return {nodes,listeners,revoked,select};
}
test('offers download without claiming save completion, resets input and revokes URL on replacement/close',async()=>{
  const h=harness();await h.select();assert.equal(h.nodes.save.download,'Synthetic.md');assert.equal(h.nodes.save.hidden,false);
  assert.equal(h.nodes.archive.value,'');h.listeners['save:click']();assert.match(h.nodes.status.textContent,/solicitado/);
  await h.select();assert.deepEqual(h.revoked,['blob:synthetic-1']);h.listeners.pagehide();assert.equal(h.nodes.save.hidden,true);
  assert.deepEqual(h.revoked,['blob:synthetic-1','blob:synthetic-2']);
});
test('obsolete extraction cannot overwrite a new selection',async()=>{
  let finish;const h=harness(async(_buffer,name)=> name==='Old.zip'?await new Promise(resolve=>finish=resolve):{bytes:new Uint8Array([66]),name:'New.md'});
  const old=h.select('Old.zip');await new Promise(resolve=>setImmediate(resolve));await h.select('New.zip');
  finish({bytes:new Uint8Array([65]),name:'Old.md'});await old;assert.equal(h.nodes.save.download,'New.md');
});
test('errors hide stale download and are rendered as plain text',async()=>{
  const h=harness(async()=>{throw new Error('ZIP inválido.');});await h.select();
  assert.equal(h.nodes.save.hidden,true);assert.equal(h.nodes.status.textContent,'ZIP inválido.');
});
test('manifest exposes only popup, no downloads or filesystem permission',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../manifest.json'),'utf8'));
  assert.equal(manifest.action.default_popup,'export-popup.html');assert.deepEqual(manifest.permissions,['storage']);
});
