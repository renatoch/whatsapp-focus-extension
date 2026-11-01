const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8');
function extract(name){const start=source.indexOf(`  function ${name}(`);assert.notEqual(start,-1);return source.slice(start,source.indexOf('\n  function ',start+1));}
function harness(){
 const flags=new Set(),attributes=new Map();let busy=false,eligible=true,missing=false,styleWrites=0;
 const rect={left:900,right:940,top:10,height:40},header={left:300,right:1000,top:0,bottom:64};
 const nativeStyle={color:'rgb(10, 20, 30)',direction:'ltr'};
 const anchor={getBoundingClientRect:()=>rect,closest:()=>({getBoundingClientRect:()=>header})};
 const button={style:new Proxy({}, {set(target,key,value){styleWrites++;target[key]=value;return true;}}),
  getAttribute:name=>attributes.get(name),setAttribute:(name,value)=>attributes.set(name,value),
  set textContent(_value){throw Error('Must not replace envelope');}};
 const context=vm.createContext({document:{getElementById:()=>button},MARK_UNREAD_ID:'id',ROOT_UNREAD_HEADER_SLOT:'slot',
  root:()=>({classList:{toggle:(name,on)=>on?flags.add(name):flags.delete(name),remove:name=>flags.delete(name)}}),
  markUnread:{isBusy:()=>busy},canMarkUnread:()=>eligible,findUnreadHeaderAnchor:()=>missing?null:anchor,
  window:{getComputedStyle:()=>nativeStyle}});
 vm.runInContext(extract('updateMarkUnreadButton'),context);
 return {refresh:()=>context.updateMarkUnreadButton(),flags,button,rect,header,nativeStyle,writes:()=>styleWrites,
  busy:value=>{busy=value;},eligible:value=>{eligible=value;},missing:value=>{missing=value;}};
}
test('envelope occupies the reserved slot immediately left of Search with matching native color',()=>{
 const h=harness();h.refresh();assert.equal(h.button.hidden,false);assert.equal(h.flags.has('slot'),true);
 assert.deepEqual({...h.button.style},{left:'858px',top:'10px',color:'rgb(10, 20, 30)'});
});
test('repeated native observer refreshes are idempotent; busy state keeps the icon but disables it',()=>{
 const h=harness();h.refresh();const before=h.writes();h.refresh();h.refresh();assert.equal(h.writes(),before);
 h.busy(true);h.refresh();assert.equal(h.button.disabled,true);assert.equal(h.button.getAttribute('aria-busy'),'true');assert.equal(h.button.hidden,false);
});
test('missing/replaced headers and ineligible surfaces remove the reserved slot',()=>{
 const h=harness();h.refresh();h.missing(true);h.refresh();assert.equal(h.button.hidden,true);assert.equal(h.flags.has('slot'),false);
 h.missing(false);h.rect.left=800;h.rect.right=840;h.refresh();assert.equal(h.button.style.left,'758px');
 h.eligible(false);h.refresh();assert.equal(h.button.hidden,true);assert.equal(h.flags.has('slot'),false);
});
test('a narrow header never lets the icon cover the title or escape the header bounds',()=>{
 const h=harness();h.rect.left=330;h.rect.right=370;h.refresh();assert.equal(h.button.hidden,true);assert.equal(h.flags.has('slot'),false);
});
test('RTL uses the native inline-start margin rather than covering the opposite action',()=>{
 const h=harness();h.nativeStyle.direction='rtl';h.refresh();assert.equal(h.button.style.left,'942px');assert.equal(h.button.hidden,false);
});
test('header anchor recognition requires exactly one visible native Search control',()=>{
 let buttons=[];const context=vm.createContext({document:{querySelectorAll:()=>buttons},isVisibleElement:node=>!node.hidden});
 vm.runInContext(extract('findUnreadHeaderAnchor'),context);
 const search={getAttribute:()=> 'Pesquisar'},other={getAttribute:()=> 'Menu'};buttons=[other,search];assert.equal(context.findUnreadHeaderAnchor(),search);
 buttons=[search,{getAttribute:()=> 'Search'}];assert.equal(context.findUnreadHeaderAnchor(),null);
 buttons=[{getAttribute:()=> 'Pesquisar',hidden:true}];assert.equal(context.findUnreadHeaderAnchor(),null);
});
