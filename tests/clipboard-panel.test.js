const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function harness(read=async()=> '[12:00, 1/2/2026] Renato C: Exemplo',write=async()=>{}) {
  const ids=['original','result','remove-timestamps','read','replace','status','close'];
  const nodes=Object.fromEntries(ids.map(id=>[id,{value:'',checked:false,disabled:id==='replace',addEventListener(type,fn){this[type]=fn;}}]));
  const events={},writes=[];let reads=0,closed=false;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../clipboard-panel.js'),'utf8'),{
    document:{getElementById:id=>nodes[id],hasFocus:()=>false},window:{addEventListener:(event,fn)=>events[event]=fn,close:()=>{closed=true;}},
    navigator:{clipboard:{readText:()=>{reads++;return read();},writeText:async text=>{await write(text);writes.push(text);}}},
    MirrorClipboardConversation:require('../clipboard-conversation.js')});
  return {nodes,events,writes,reads:()=>reads,closed:()=>closed};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('opening focused panel reads once, previews without writing, checkbox updates result, explicit replace writes',async()=>{
  const h=harness();h.events.focus();await flush();h.events.focus();
  assert.equal(h.reads(),1);assert.match(h.nodes.original.value,/Renato C/);assert.equal(h.nodes.result.value,'[12:00, 1/2/2026] Eu: Exemplo');assert.deepEqual(h.writes,[]);
  h.nodes['remove-timestamps'].checked=true;h.nodes['remove-timestamps'].change();assert.equal(h.nodes.result.value,'Eu: Exemplo');
  await h.nodes.replace.click();assert.deepEqual(h.writes,['Eu: Exemplo']);assert.match(h.nodes.status.textContent,/substituído/);
});
test('read again uses current clipboard and stale completion cannot replace it',async()=>{
  let finish,calls=0;const h=harness(()=>++calls===1?new Promise(resolve=>finish=resolve):Promise.resolve('[12:01, 1/2/2026] Amiga: Atual'));
  const first=h.nodes.read.click();await h.nodes.read.click();finish('[12:00, 1/2/2026] Renato C: Antigo');await first;
  assert.match(h.nodes.original.value,/Atual/);assert.match(h.nodes.result.value,/Pessoa 1/);assert.deepEqual(h.writes,[]);
});
test('close clears previews and invalidates pending reads',async()=>{
  let finish;const h=harness(()=>new Promise(resolve=>finish=resolve));const task=h.nodes.read.click();h.nodes.close.click();
  finish('[12:00, 1/2/2026] Renato C: Old');await task;assert.equal(h.closed(),true);assert.equal(h.nodes.original.value,'');assert.equal(h.nodes.result.value,'');
});
test('unsupported text disables replacement and never writes; write failures permit retry',async()=>{
  const bad=harness(async()=> 'not a conversation');await bad.nodes.read.click();await bad.nodes.replace.click();assert.deepEqual(bad.writes,[]);assert.equal(bad.nodes.replace.disabled,true);
  const fail=harness(undefined,async()=>{throw Error('private');});await fail.nodes.read.click();await fail.nodes.replace.click();
  assert.equal(fail.nodes.replace.disabled,false);assert.doesNotMatch(fail.nodes.status.textContent,/private|substituído/);
});
test('background accepts only same-extension WhatsApp tab and sends no content to parent',()=>{
  let listener;const opened=[];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../background.js'),'utf8'),{chrome:{runtime:{id:'extension',getURL:file=>'chrome-extension://extension/'+file,onMessage:{addListener:fn=>listener=fn}},windows:{create:(options,fn)=>{opened.push(options);fn();}}}});
  for(const sender of [{},{tab:{},id:'other',url:'https://web.whatsapp.com/'},{tab:{},id:'extension',url:'https://example.test/'}])listener({type:'mwf-open-clipboard-panel'},sender,()=>{});
  assert.equal(opened.length,0);let response;
  listener({type:'mwf-open-clipboard-panel'},{tab:{},id:'extension',url:'https://web.whatsapp.com/'},value=>response=value);
  assert.equal(opened.length,1);assert.equal(response.ok,true);assert.equal(opened[0].url,'chrome-extension://extension/clipboard-panel.html');
});
test('panel is not web-accessible and mode-focus button dispatches only action metadata',()=>{
  const root=path.join(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
  assert.equal(manifest.background.service_worker,'background.js');assert.equal(manifest.web_accessible_resources.some(rule=>rule.resources.includes('clipboard-panel.html')),false);
  const source=fs.readFileSync(path.join(root,'content.js'),'utf8');assert.match(source,/data-mwf-action="clipboard-panel"/);assert.match(source,/sendMessage\(\{type:"mwf-open-clipboard-panel"\}/);
});
