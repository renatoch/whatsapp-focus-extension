const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function harness({text='[12:00, 1/2/2026] Renato C: Exemplo',readError=false,writeError=false}={}) {
  let reads=0;const writes=[],nodes={'adjust-clipboard':{},'remove-timestamps':{checked:false},'clipboard-status':{}};
  nodes['adjust-clipboard'].addEventListener=(_type,fn)=>nodes['adjust-clipboard'].click=fn;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../clipboard-popup.js'),'utf8'),{
    document:{getElementById:id=>nodes[id]},MirrorClipboardConversation:require('../clipboard-conversation.js'),
    navigator:{clipboard:{readText:async()=>{reads++;if(readError)throw Error('private');return text;},
      writeText:async value=>{if(writeError)throw Error('private');writes.push(value);}}}});
  return {nodes,writes,reads:()=>reads,click:()=>nodes['adjust-clipboard'].click()};
}
test('no clipboard access until clicked; success writes transformed text and confirms only after writing',async()=>{
  const h=harness();assert.equal(h.reads(),0);assert.deepEqual(h.writes,[]);await h.click();
  assert.deepEqual(h.writes,['[12:00, 1/2/2026] Eu: Exemplo']);assert.match(h.nodes['clipboard-status'].textContent,/atualizado/);
  assert.equal(h.nodes['adjust-clipboard'].disabled,false);
});
test('checkbox removes timestamps and rapid duplicate clicks do not run twice',async()=>{
  const h=harness();h.nodes['remove-timestamps'].checked=true;const first=h.click();await h.click();await first;
  assert.equal(h.reads(),1);assert.deepEqual(h.writes,['Eu: Exemplo']);
});
test('read errors and unsupported text never write clipboard; failures never claim success or display content',async()=>{
  for(const options of [{readError:true},{text:'private secret'},{writeError:true}]){
    const h=harness(options);await h.click();assert.deepEqual(h.writes,[]);
    assert.doesNotMatch(h.nodes['clipboard-status'].textContent,/private|atualizado/);assert.equal(h.nodes['adjust-clipboard'].disabled,false);
  }
});
