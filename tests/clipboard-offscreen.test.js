const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const sample='[12:00, 1/2/2026] Renato C: Synthetic private\n[12:01, 1/2/2026] Amiga: Reply';
function setup({text=sample,paste=true,copy=true,createError=false,initialDocument=false,foreignDocument=false}={}) {
  let stored=text,field=null,offscreenListener,workerListener,hasDocument=initialDocument,creates=0,closes=0;
  const messages=[],fields=[],clipboardOps=[];
  const runtimeBase={id:'local',getURL:file=>'chrome-extension://local/'+file};
  const doc={body:{appendChild:node=>{field=node;fields.push(node);}},createElement:()=>({value:'',style:{},setAttribute(){},focus(){},select(){},remove(){field=null;}}),
    execCommand:command=>{clipboardOps.push(command);if(command==='paste'){if(paste)field.value=stored;return paste;}if(copy)stored=field.value;return copy;}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'clipboard-offscreen.js'),'utf8'),{document:doc,
    chrome:{runtime:{...runtimeBase,onMessage:{addListener:fn=>offscreenListener=fn}}},
    MirrorClipboardConversation:require('../clipboard-conversation.js')});
  const chrome={runtime:{...runtimeBase,onMessage:{addListener:fn=>workerListener=fn},
    getContexts:async()=>foreignDocument?[]:[{documentUrl:runtimeBase.getURL('clipboard-offscreen.html')}],
    sendMessage:async message=>{messages.push(message);return await new Promise(resolve=>offscreenListener(message,{id:'local',url:runtimeBase.getURL('background.js')},resolve));}},
    offscreen:{hasDocument:async()=>hasDocument,createDocument:async options=>{creates++;if(createError)throw Error('internal private');assert.deepEqual(Array.from(options.reasons),['CLIPBOARD']);hasDocument=true;},
      closeDocument:async()=>{closes++;hasDocument=false;}},windows:{create(){throw Error('Quick path must not open window');}}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'background.js'),'utf8'),{chrome});
  const sender={id:'local',tab:{id:1},url:'https://web.whatsapp.com/'};
  const request=(removeTimestamps=false,removeNames=true)=>new Promise(resolve=>workerListener({type:'mwf-quick-copy',removeTimestamps,removeNames},sender,resolve));
  return {request,workerListener,offscreenListener,sender,chrome,messages,fields,clipboardOps,stored:()=>stored,
    creates:()=>creates,closes:()=>closes,hasField:()=>!!field};
}
test('background→offscreen transforms both modes without payload transfer or window, then wipes field and closes',async()=>{
  for(const remove of [false,true]){
    const h=setup();const response=await h.request(remove);assert.equal(response.ok,true);
    assert.equal(h.stored(),remove?'Eu: Synthetic private\nPessoa 1: Reply':'[12:00, 1/2/2026] Eu: Synthetic private\n[12:01, 1/2/2026] Pessoa 1: Reply');
    assert.equal(h.creates(),1);assert.equal(h.closes(),1);assert.equal(h.hasField(),false);assert.equal(h.fields[0].value,'');
    assert.deepEqual(h.clipboardOps,['paste','copy']);assert.doesNotMatch(JSON.stringify(h.messages),/Synthetic private|Renato|Reply/);
  }
});
test('dates-only travels as flags through worker and offscreen without pseudonymizing authors',async()=>{
  const h=setup();assert.equal((await h.request(true,false)).ok,true);
  assert.equal(h.stored(),'Renato C: Synthetic private\nAmiga: Reply');
  assert.equal(h.messages[0].removeNames,false);assert.equal(h.messages[0].removeTimestamps,true);
  assert.equal(h.fields[0].value,'');assert.equal(h.closes(),1);
});
test('read, format, size and write failures return bounded stages and wipe all temporary text',async()=>{
  for(const [options,stage]of [[{paste:false},'read'],[{text:'private non-chat'},'format'],[{text:'x'.repeat(4*1024*1024+1)},'large'],[{copy:false},'write']]){
    const h=setup(options),before=h.stored(),result=await h.request();assert.equal(result.ok,false);assert.equal(result.error,stage);
    assert.equal(h.stored(),before);assert.equal(h.fields[0].value,'');assert.equal(h.closes(),1);assert.equal(h.hasField(),false);
    if(stage!=='write')assert.deepEqual(h.clipboardOps,['paste']);
  }
});
test('only validated WhatsApp tab actions can dispatch; offscreen ignores tab senders and invalid parameter',()=>{
  const h=setup();let replies=0;
  for(const sender of [{},{id:'local',tab:{},url:'https://example.test/'},{id:'other',tab:{},url:'https://web.whatsapp.com/'}])
    h.workerListener({type:'mwf-quick-copy',removeTimestamps:false},sender,()=>replies++);
  assert.equal(replies,0);assert.equal(h.creates(),0);
  h.offscreenListener({type:'mwf-offscreen-adjust',removeTimestamps:false},h.sender,()=>replies++);
  assert.equal(replies,0);assert.deepEqual(h.clipboardOps,[]);
  h.workerListener({type:'mwf-quick-copy',removeTimestamps:'yes'},h.sender,result=>{assert.equal(result.error,'request');replies++;});assert.equal(replies,1);
});
test('creation failure releases lock; concurrent requests are rejected, not interleaved',async()=>{
  const bad=setup({createError:true});assert.equal((await bad.request()).error,'unavailable');assert.equal((await bad.request()).error,'unavailable');assert.equal(bad.creates(),2);
  const h=setup();let release;h.chrome.offscreen.createDocument=async()=>{await new Promise(resolve=>release=resolve);};
  const first=h.request();await new Promise(resolve=>setImmediate(resolve));const second=await h.request(true);assert.equal(second.error,'busy');release();assert.equal((await first).ok,true);
});
test('reuses own leftover offscreen document but never closes an unrelated one',async()=>{
  const own=setup({initialDocument:true});assert.equal((await own.request()).ok,true);assert.equal(own.creates(),0);assert.equal(own.closes(),1);
  const other=setup({initialDocument:true,foreignDocument:true});assert.equal((await other.request()).error,'unavailable');assert.equal(other.closes(),0);assert.deepEqual(other.clipboardOps,[]);
});
test('offscreen permission is explicit and internal HTML is not web-accessible',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));assert.ok(manifest.permissions.includes('offscreen'));
  assert.equal(manifest.web_accessible_resources.some(rule=>rule.resources.includes('clipboard-offscreen.html')),false);
  const source=fs.readFileSync(path.join(root,'content.js'),'utf8');assert.doesNotMatch(source,/navigator\.clipboard\.readText/);
  assert.match(source,/type:"mwf-quick-copy", removeTimestamps/);
});
