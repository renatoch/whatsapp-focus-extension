const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../focus.css'),'utf8');
function extract(name){const start=source.indexOf(`  function ${name}(`);assert.notEqual(start,-1);return source.slice(start,source.indexOf('\n  function ',start+1));}
function harness(){
 let pending=true,busy=true,writes=0,appends=0;const nodes=new Map(),listeners=new Map();
 const rect={left:64,top:0,width:420,height:700};
 const side={style:{opacity:'1'},getBoundingClientRect:()=>rect,cloneNode(){throw Error('No DOM snapshots');},get textContent(){throw Error('No content reads');}};
 const document={getElementById:id=>nodes.get(id),querySelector:()=>side,body:{appendChild(node){appends++;nodes.set(node.id,node);}},createElement:()=>({
  attributes:{},events:new Map(),style:new Proxy({}, {set(target,key,value){writes++;target[key]=value;return true;}}),
  setAttribute(name,value){this.attributes[name]=value;},addEventListener(type,fn,options){this.events.set(type,{fn,options});},
  contains(target){return target===this;},remove(){nodes.delete(this.id);}})};
 const context=vm.createContext({document,UNREAD_SIDEBAR_BLOCK_ID:'block',ROOT_MARK_UNREAD:'pending',
  root:()=>({classList:{contains:()=>pending}}),unreadOrigin:{preserveSidebar:true},
  markUnread:{isBusy:()=>busy},window:{addEventListener:(type,fn,options)=>listeners.set(type,{fn,options})}});
 vm.runInContext(['guardUnreadSidebarInput','updateUnreadSidebarBlock','installUnreadSidebarPointerGuard'].map(extract).join('\n'),context);
 return {context,side,rect,nodes,listeners,refresh:()=>context.updateUnreadSidebarBlock(),writes:()=>writes,appends:()=>appends,
  pending:value=>{pending=value;},preserve:value=>{context.unreadOrigin={preserveSidebar:value};},busy:value=>{busy=value;}};
}
test('normal origin gets a decorative bounds-matched blocker without cloning or modifying the native panel',()=>{
 const h=harness();h.refresh();const block=h.nodes.get('block');assert.deepEqual({...block.style},{left:'64px',top:'0px',width:'420px',height:'700px'});
 assert.equal(block.attributes['aria-hidden'],'true');assert.deepEqual(h.side.style,{opacity:'1'});assert.equal(h.appends(),1);
});
test('repeated observer refresh is idempotent and resize follows native panel geometry',()=>{
 const h=harness();h.refresh();const before=h.writes();h.refresh();assert.equal(h.writes(),before);assert.equal(h.appends(),1);
 h.context.installUnreadSidebarPointerGuard();h.rect.width=500;h.listeners.get('resize').fn();assert.equal(h.nodes.get('block').style.width,'500px');
});
test('focused origin never creates a visible blocker, and cleanup removes only the owned layer',()=>{
 const h=harness();h.preserve(false);h.refresh();assert.equal(h.nodes.has('block'),false);h.preserve(true);h.refresh();
 h.nodes.set('other-ui',{});h.pending(false);h.refresh();assert.equal(h.nodes.has('block'),false);assert.equal(h.nodes.has('other-ui'),true);
});
test('trusted clicks on the busy layer are blocked, not synthetic native actions or unrelated UI',()=>{
 const h=harness();h.refresh();const block=h.nodes.get('block');let prevented=0,stopped=0;
 const event=(isTrusted,target)=>({isTrusted,target,preventDefault(){prevented++;},stopImmediatePropagation(){stopped++;}});
 h.context.guardUnreadSidebarInput(event(true,block));assert.equal(prevented,1);assert.equal(stopped,1);
 h.context.guardUnreadSidebarInput(event(false,block));h.context.guardUnreadSidebarInput(event(true,{}));h.busy(false);h.context.guardUnreadSidebarInput(event(true,block));
 assert.equal(prevented,1);assert.equal(stopped,1);
});
test('input capture is installed once at startup; nonpassive wheel blocking is scoped to the temporary layer',()=>{
 const h=harness();h.context.installUnreadSidebarPointerGuard();h.refresh();
 for(const type of ['pointerdown','pointerup','mousedown','mouseup','click','dblclick','contextmenu'])assert.equal(h.listeners.get(type).options,true);
 assert.equal(h.listeners.has('wheel'),false);assert.equal(h.nodes.get('block').events.get('wheel').options.passive,false);
});
test('CSS preserves normal sidebar opacity while retaining the focused mask and native menu concealment',()=>{
 assert.match(css,/html\.mwf-mark-unread #side\s*\{[^}]*opacity: 0 !important/);
 assert.match(css,/html\.mwf-mark-unread\.mwf-unread-visible-sidebar #side\s*\{\s*opacity: 1 !important/);
 assert.match(css,/#mirror-whatsapp-focus-unread-side-block\s*\{[^}]*background: rgba\(32, 44, 51, \.18\);[^}]*backdrop-filter: blur\(1px\)/s);
 assert.match(css,/html\.mwf-mark-unread \[role="menu"\]\s*\{[^}]*filter: opacity\(0\)/);
});
