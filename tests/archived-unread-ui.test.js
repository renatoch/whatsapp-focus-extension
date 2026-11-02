const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createUi}=require('../archived-unread-ui.js');
const BUTTON='mirror-whatsapp-focus-archive-unread',EMPTY='mirror-whatsapp-focus-archive-empty',ERROR='mirror-whatsapp-focus-archive-error';
function harness(){
 const nodes=new Map(),flags=new Set(['mwf-normal']),messages=[],listeners=new Map(),timers=new Map();let now=0,id=0,writes=0;
 const window={postMessage:m=>messages.push(m),addEventListener:(k,fn)=>listeners.set(k,fn),removeEventListener:k=>listeners.delete(k),setTimeout:(fn,ms)=>{const key=id++;timers.set(key,{fn,at:now+ms});return key;},clearTimeout:key=>timers.delete(key)};
 const advance=ms=>{const end=now+ms;let n=0;while(true){const next=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;if(++n>1000)throw Error('timer loop');now=next[1].at;timers.delete(next[0]);next[1].fn();}now=end;};
 function node(){return {attributes:{},events:new Map(),children:[],disabled:false,style:new Proxy({}, {set:(o,k,v)=>{writes++;o[k]=v;return true;}}),setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k]??null;},addEventListener(k,fn){this.events.set(k,fn);},append(...kids){this.children.push(...kids);},remove(){nodes.delete(this.id);}};}
 const rect={left:64,right:484,top:0,width:420,height:700};let hasList=true;
 const drawer={getBoundingClientRect:()=>rect,querySelector:()=>hasList?{}:null};let drawerPresent=true;
 const document={documentElement:{classList:{contains:k=>flags.has(k)}},querySelector:s=>s==='#side'?{}:drawerPresent?drawer:null,createElement:node,body:{appendChild:n=>nodes.set(n.id,n)}};
 const ui=createUi(window,document);
 const status=(extra={},epoch)=>{const probe=messages.filter(m=>m.command==='probe').at(-1);listeners.get('message')?.({source:window,origin:'https://web.whatsapp.com',data:{channel:'mwf-archived-unread-v1',direction:'status',epoch:epoch??probe?.epoch,available:true,active:false,empty:false,error:false,...extra}});advance(40);};
 ui.refresh();
 return {window,document,ui,nodes,flags,messages,listeners,rect,timers,advance,status,writes:()=>writes,hasList:v=>{hasList=v;},drawerPresent:v=>{drawerPresent=v;},click:(trusted=true)=>nodes.get(BUTTON)?.events.get('click')({isTrusted:trusted})};
}
test('a single contextual button appears after a metadata-only availability reply',()=>{
 const h=harness();assert.equal(h.nodes.has(BUTTON),false);h.status();assert.equal(h.nodes.get(BUTTON).textContent,'Não lidas');assert.equal(h.nodes.get(BUTTON).getAttribute('aria-pressed'),'false');assert.equal(h.nodes.get(BUTTON).style.left,'370px');assert.equal(JSON.stringify(h.messages).includes('chat'),false);
});
test('only trusted clicks toggle, immediately disable the button and wait for acknowledgment',()=>{
 const h=harness();h.status();h.click(false);assert.equal(h.messages.some(m=>m.command==='set'),false);h.click();assert.equal(h.nodes.get(BUTTON).disabled,true);assert.equal(h.messages.at(-1).active,true);h.status({active:true});assert.equal(h.nodes.get(BUTTON).disabled,false);assert.equal(h.nodes.get(BUTTON).getAttribute('aria-pressed'),'true');
});
test('button updates and placement are idempotent; resize changes only geometry',()=>{
 const h=harness();h.status();const w=h.writes();h.ui.refresh();h.ui.refresh();assert.equal(h.writes(),w);h.rect.right=600;h.ui.refresh();assert.equal(h.nodes.get(BUTTON).style.left,'486px');
});
test('empty active filter has an explanatory own status without losing the off toggle',()=>{
 const h=harness();h.status();h.hasList(false);h.status({active:true,empty:true});assert.ok(h.nodes.has(BUTTON));assert.match(h.nodes.get(EMPTY).textContent,/não lidas/);assert.equal(h.nodes.get(EMPTY).getAttribute('role'),'status');h.click();assert.equal(h.messages.at(-1).active,false);
});
test('turning off removes the no-match overlay and can reprobe after native list remount',()=>{
 const h=harness();h.status({active:true,empty:true});h.hasList(false);h.ui.refresh();h.status({active:false,empty:false});assert.equal(h.nodes.has(EMPTY),false);h.hasList(true);h.ui.refresh();assert.equal(h.messages.at(-1).command,'probe');
});
test('focus/expiry hides controls and invalidates queued replies from the previous drawer epoch',()=>{
 const h=harness();h.status({active:true,empty:true});const old=h.messages[0].epoch;h.flags.add('mwf-active');h.ui.refresh();assert.equal(h.nodes.has(BUTTON),false);assert.equal(h.nodes.has(EMPTY),false);assert.equal(h.messages.at(-1).command,'release');h.flags.delete('mwf-active');h.ui.refresh();h.status({active:true},old);assert.equal(h.nodes.has(BUTTON),false);h.status();assert.equal(h.nodes.get(BUTTON).getAttribute('aria-pressed'),'false');
});
test('archive exit releases bridge state and never starts a new normal deadline',()=>{
 const h=harness();h.status();h.drawerPresent(false);h.ui.refresh();assert.equal(h.messages.at(-1).command,'release');assert.equal(h.nodes.has(BUTTON),false);assert.equal(h.flags.has('mwf-normal'),true);
});
test('wrong origin/source and nonboolean status values are rejected',()=>{
 const h=harness(),fn=h.listeners.get('message'),data={channel:'mwf-archived-unread-v1',direction:'status',epoch:h.messages[0].epoch,available:true,active:false,empty:false,error:false};fn({source:{},origin:'https://web.whatsapp.com',data});fn({source:h.window,origin:'https://evil.invalid',data});fn({source:h.window,origin:'https://web.whatsapp.com',data:{...data,active:'yes'}});h.advance(40);assert.equal(h.nodes.has(BUTTON),false);
});
test('unanswered activation is bounded and releases state instead of leaving a disabled button',()=>{
 const h=harness();h.status();h.click();h.advance(1840);assert.equal(h.nodes.has(BUTTON),false);assert.ok(h.nodes.has(ERROR));assert.equal(h.messages.at(-1).command,'release');
});
test('unsupported/empty archive stops probing after a bounded number of attempts',()=>{
 const h=harness();h.advance(2000);assert.equal(h.messages.filter(m=>m.command==='probe').length,3);assert.equal(h.nodes.has(BUTTON),false);assert.equal(h.timers.size,0);
});
test('errors are dismissible, auto-close, and do not duplicate on identical updates',()=>{
 const h=harness();h.status({available:false,error:true});const first=h.nodes.get(ERROR);h.status({available:false,error:true});assert.equal(h.nodes.get(ERROR),first);first.children[1].events.get('click')();assert.equal(h.nodes.has(ERROR),false);h.status({error:false});h.status({available:false,error:true});h.advance(5000);assert.equal(h.nodes.has(ERROR),false);
});
test('dispose clears all timers, overlays and listener; delayed tasks cannot recreate UI',()=>{
 const h=harness();h.status();h.click();h.ui.dispose();h.advance(10000);assert.equal(h.nodes.size,0);assert.equal(h.timers.size,0);assert.equal(h.listeners.has('message'),false);h.ui.refresh();assert.equal(h.nodes.size,0);
});
test('narrow panels fail closed rather than overlap native header controls',()=>{
 const h=harness();h.rect.width=240;h.status();assert.equal(h.nodes.has(BUTTON),false);
});
test('CSS instantly hides body-owned UI under blind/auth/marking modes and uses native-theme variables',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../focus.css'),'utf8');assert.match(css,/html:not\(\.mwf-normal\):not\(\.mwf-sidebar-open\)/);assert.match(css,/\.mwf-overlay-open, \.mwf-auth-surface/);assert.match(css,/#mirror-whatsapp-focus-archive-empty[\s\S]*var\(--panel-background/);
});
