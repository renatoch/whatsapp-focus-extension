const test=require('node:test'),assert=require('node:assert/strict');
const {createCopyMenu}=require('../copy-menu.js');
const {transformClipboard}=require('../clipboard-conversation.js');
function harness({read,write}={}) {
  const notifications=[],writes=[],routes=[],listeners={},nodes=[];let reads=0,menu=null;
  const document={body:{appendChild:node=>{menu=node;}},createElement:tag=>{
    const node={tag,style:{},children:[],setAttribute(){},addEventListener(event,fn){this[event]=fn;},appendChild(child){this.children.push(child);},
      contains(target){return target===this||this.children.includes(target);},remove(){if(menu===this)menu=null;},focus(){}};
    Object.defineProperty(node,'firstElementChild',{get:()=>node.children[0]});nodes.push(node);return node;},
    addEventListener:(event,fn)=>listeners[event]=fn,removeEventListener:event=>delete listeners[event]};
  const clipboard={readText:async()=>{reads++;return read?await read():'[12:00, 1/2/2026] Renato C: Um\n[12:01, 1/2/2026] Amiga: Dois';},
    writeText:async text=>{if(write)await write(text);writes.push(text);}};
  const api=createCopyMenu({document,window:{innerWidth:1200,innerHeight:800},clipboard,transform:transformClipboard,
    notify:message=>notifications.push(message),openReview:()=>routes.push('review'),openZip:()=>routes.push('zip')});
  const anchor={getBoundingClientRect:()=>({right:56,top:300}),contains:target=>target===anchor};
  return {api,anchor,nodes,listeners,notifications,writes,routes,reads:()=>reads,menu:()=>menu};
}
test('menu shows four actions without clipboard access; quick names action writes without opening review',async()=>{
  const h=harness();h.api.toggle(h.anchor);assert.equal(h.reads(),0);
  assert.deepEqual(h.menu().children.map(b=>b.textContent),['Trocar nomes','Trocar nomes e tirar datas','Revisar texto…','ZIP → Markdown…']);
  await h.menu().children[0].click({isTrusted:true});assert.equal(h.menu(),null);
  assert.deepEqual(h.writes,['[12:00, 1/2/2026] Eu: Um\n[12:01, 1/2/2026] Pessoa 1: Dois']);
  assert.deepEqual(h.routes,[]);assert.match(h.notifications[0],/datas mantidas/);assert.deepEqual(Object.keys(h.listeners),[]);
});
test('remove dates quick action is separate and requires trusted click',async()=>{
  const h=harness();h.api.toggle(h.anchor);const action=h.menu().children[1];
  await action.click({isTrusted:false});assert.equal(h.reads(),0);
  await action.click({isTrusted:true});assert.deepEqual(h.writes,['Eu: Um\nPessoa 1: Dois']);
});
test('review and ZIP routes do not read or write clipboard',async()=>{
  const h=harness();for(const index of [2,3]){h.api.toggle(h.anchor);await h.menu().children[index].click({isTrusted:true});}
  assert.deepEqual(h.routes,['review','zip']);assert.equal(h.reads(),0);assert.deepEqual(h.writes,[]);
});
test('unsupported format and read failure leave clipboard untouched and reveal no content',async()=>{
  for(const read of [async()=> 'private plain text',async()=>{throw Error('private permission');}]){
    const h=harness({read});await h.api.adjust(false);assert.deepEqual(h.writes,[]);assert.doesNotMatch(h.notifications[0],/private/);
  }
});
test('failed writes do not announce success and duplicate submissions do not race',async()=>{
  let release;const h=harness({write:()=>new Promise((_,reject)=>release=()=>reject(Error('private')))});
  const first=h.api.adjust(false);await new Promise(resolve=>setImmediate(resolve));await h.api.adjust(true);
  assert.equal(h.reads(),1);release();await first;assert.deepEqual(h.writes,[]);assert.match(h.notifications[0],/Não foi possível atualizar/);
});
test('Escape, outside click and repeat toggle close menu and remove listeners',()=>{
  const h=harness();h.api.toggle(h.anchor);h.listeners.pointerdown({target:h.anchor});assert.ok(h.menu());
  h.api.toggle(h.anchor);assert.equal(h.menu(),null);h.api.toggle(h.anchor);
  h.listeners.keydown({key:'Escape',preventDefault(){}});assert.equal(h.menu(),null);
  h.api.toggle(h.anchor);h.listeners.pointerdown({target:{}});assert.equal(h.menu(),null);assert.deepEqual(Object.keys(h.listeners),[]);
});
test('dispose invalidates pending read before write',async()=>{
  let resolve;const h=harness({read:()=>new Promise(done=>resolve=done)});const pending=h.api.adjust(false);
  h.api.dispose();resolve('[12:00, 1/2/2026] Renato C: Private');await pending;assert.deepEqual(h.writes,[]);assert.deepEqual(h.notifications,[]);
});
test('already numbered labels do not drift on repeated adjustment while dates remain',()=>{
  const source='[12:00, 1/2/2026] Renato C: Um\n[12:01, 1/2/2026] Amiga: Dois';
  const once=transformClipboard(source);assert.equal(transformClipboard(once),once);
  assert.equal(transformClipboard(once,{removeTimestamps:true}),'Eu: Um\nPessoa 1: Dois');
});
