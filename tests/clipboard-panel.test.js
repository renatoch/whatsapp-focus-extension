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
  assert.equal(h.reads(),1);assert.match(h.nodes.original.value,/Renato C/);assert.equal(h.nodes.result.value,'[12:00, 1/2/2026] Exemplo');assert.deepEqual(h.writes,[]);
  h.nodes['remove-timestamps'].checked=true;h.nodes['remove-timestamps'].change();assert.equal(h.nodes.result.value,'Exemplo');
  await h.nodes.replace.click();assert.deepEqual(h.writes,['Exemplo']);assert.match(h.nodes.status.textContent,/substituído/);
});
test('read again uses current clipboard and stale completion cannot replace it',async()=>{
  let finish,calls=0;const h=harness(()=>++calls===1?new Promise(resolve=>finish=resolve):Promise.resolve('[12:01, 1/2/2026] Amiga: Atual'));
  const first=h.nodes.read.click();await h.nodes.read.click();finish('[12:00, 1/2/2026] Renato C: Antigo');await first;
  assert.match(h.nodes.original.value,/Atual/);assert.equal(h.nodes.result.value,'[12:01, 1/2/2026] Atual');assert.deepEqual(h.writes,[]);
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
test('side Ajustar cópia control is idempotent, does not change mode and opens the same isolated panel',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8');
  function extract(name){const start=source.indexOf(`  function ${name}(`);return source.slice(start,source.indexOf('\n  function ',start+1));}
  const elements=new Map(),requests=[];
  const context=vm.createContext({CLIPBOARD_BUTTON_ID:'text',document:{body:{},getElementById:id=>elements.get(id),createElement:()=>({setAttribute(){},addEventListener(type,fn){this[type]=fn;}})},
    getControlsContainer:()=>({appendChild:node=>elements.set(node.id,node)}),showToast:()=>{throw Error('Unexpected failure');},
    chrome:{runtime:{sendMessage:(message,cb)=>{requests.push(message.type);cb({ok:true});}}}});
  vm.runInContext(extract('openClipboardPanel')+'\n'+extract('ensureClipboardButton')+'\nensureClipboardButton();ensureClipboardButton();',context);
  assert.equal(elements.size,1);assert.equal(elements.get('text').textContent,'Ajustar cópia');elements.get('text').click();
  assert.deepEqual(requests,['mwf-open-clipboard-panel']);
  const css=fs.readFileSync(path.join(__dirname,'../focus.css'),'utf8');assert.match(css,/html\.mwf-native-transient-open #mirror-whatsapp-focus-clipboard/);
  const controls=extract('ensureControls');assert.match(controls,/ensureClipboardButton\(\)/);
});
test('unified panel keeps ZIP and clipboard previews/status independent',async()=>{
  const ids=['original','result','remove-timestamps','read','replace','status','close','archive','save','zip-status'];
  const nodes=Object.fromEntries(ids.map(id=>[id,{value:'',checked:false,disabled:id==='replace',hidden:id==='save',
    addEventListener(type,fn){this[type]=fn;},removeAttribute(key){delete this[key];}}]));
  const context=vm.createContext({document:{getElementById:id=>nodes[id],hasFocus:()=>false},
    window:{addEventListener(){},close(){}},Blob,TextDecoder,URL:{createObjectURL:()=> 'blob:synthetic',revokeObjectURL(){}},
    navigator:{clipboard:{readText:async()=> '[12:00, 1/2/2026] Renato C: Trecho',writeText:async()=>{throw Error('Must not write while previewing');}}},
    MirrorClipboardConversation:require('../clipboard-conversation.js'),MirrorMarkdownPseudonyms:require('../markdown-pseudonyms.js'),
    MirrorZipMarkdown:{MAX_ZIP:64*1024*1024,extractMarkdown:async()=>({bytes:new TextEncoder().encode('# Exportação de conversas do WhatsApp: Exemplo\n[12:00] **Ana:** ZIP'),name:'Example.md'})}});
  const root=path.join(__dirname,'..');
  for(const file of ['export-popup.js','clipboard-panel.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
  await nodes.read.click();const before=nodes.status.textContent;
  nodes.archive.files=[{size:1,name:'Example.zip',arrayBuffer:async()=>new ArrayBuffer(1)}];await nodes.archive.change();
  assert.equal(nodes.result.value,'[12:00, 1/2/2026] Trecho');assert.equal(nodes.status.textContent,before);
  assert.equal(nodes.save.download,'Grupo.md');assert.match(nodes['zip-status'].textContent,/pronto/);
  const html=fs.readFileSync(path.join(root,'clipboard-panel.html'),'utf8');
  assert.match(html,/ZIP exportado/);assert.match(html,/src="zip-markdown.js"/);assert.match(html,/src="clipboard-panel.js"/);
});
test('panel is private, focus-overlay action is removed and side button sends only action metadata',()=>{
  const root=path.join(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
  assert.equal(manifest.background.service_worker,'background.js');assert.equal(manifest.web_accessible_resources.some(rule=>rule.resources.includes('clipboard-panel.html')),false);
  const source=fs.readFileSync(path.join(root,'content.js'),'utf8');assert.doesNotMatch(source,/data-mwf-action="clipboard-panel"/);assert.match(source,/sendMessage\(\{type:"mwf-open-clipboard-panel"\}/);
});
