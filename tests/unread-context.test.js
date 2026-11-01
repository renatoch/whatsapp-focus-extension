const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {createSurfaceExpiry}=require('../surface-expiry.js');
const source=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8');
function clock(){let time=1000,next=0;const tasks=new Map();return {tasks,now:()=>time,scheduler:{setTimeout(fn,delay){const id=next++;tasks.set(id,{fn,at:time+delay});return id;},clearTimeout:id=>tasks.delete(id),cancelAnimationFrame(){}},advance(ms){time+=ms;for(const [id,task]of [...tasks])if(task.at<=time){tasks.delete(id);task.fn();}}};}
function harness({mode='normal',timer=mode==='normal',query='original filter'}={}){
 let options,context;const c=clock(),flags=new Set([mode]),events=[],nodes=new Map(),field={value:query};
 const root={classList:{contains:name=>flags.has(name),add:name=>flags.add(name),remove:(...names)=>names.forEach(name=>flags.delete(name)),toggle:(name,on)=>on?flags.add(name):flags.delete(name)}};
 function node(){return {children:[],attributes:{},style:{},addEventListener(){},setAttribute(name,value){this.attributes[name]=value;},append(...children){this.children.push(...children);},remove(){nodes.delete(this.id);}};}
 const document={getElementById:id=>nodes.get(id),createElement:node,querySelector:()=>({getBoundingClientRect:()=>({left:60,top:0,width:400,height:700})}),body:{appendChild:element=>nodes.set(element.id,element)}};
 const expiry=createSurfaceExpiry({scheduler:c.scheduler,durationMs:10000,inspect:()=> 'unknown',chooseDestination:()=> 'blind-overlay',clearContinuation(){},
  onReturned(){},onBlind(){flags.delete('normal');flags.add('focus');events.push('expired');}});
 if(timer)expiry.start();
 context=vm.createContext({globalThis:{MirrorMarkUnread:{createUnreadDom:()=>({}),createMarkUnreadAction:value=>(options=value,{})},MirrorFocusedRecents:{normalizeTitle:v=>v}},
  document,window:{},Date:{now:c.now},surfaceExpiry:expiry,authSurface:{isActive:()=>false},hasNativeTransientSurface:()=>false,
  root:()=>root,ROOT_NORMAL:'normal',ROOT_SIDEBAR_OPEN:'side-open',ROOT_MARK_UNREAD:'pending',ROOT_UNREAD_VISIBLE_SIDEBAR:'visible-side',UNREAD_SIDEBAR_BLOCK_ID:'sidebar-block',UNREAD_PROGRESS_ID:'progress',
  unreadOrigin:null,unreadContext:null,unreadLookupReadyAt:0,unreadRestoreReadyAt:0,recentCaptureToken:0,recentNavigationToken:0,SEARCH_SETTLE_MS:1000,
  unreadContextKey:()=>[context.recentNavigationToken,...[...flags].filter(name=>name!=='pending'&&name!=='visible-side')].join(':'),
  isVisibleElement(){},readActiveConversationTitle(){},canMarkUnread(){},updateMarkUnreadButton(){},
  clearNormalDelay(){},copyMenu:{close(){}},closeFixedCollectionChooser(){},
  findNativeSearchField:()=>field,getSearchText:element=>element.value,setNativeSearchText:(element,value)=>{element.value=value;events.push('restore');},
  setSearchMode:()=>{events.push('search');expiry.cancel();},setActive:()=>events.push('overlay'),showToast:()=>events.push('error'),hasOpenConversation:()=>false});
 const start=source.indexOf('  const unreadDom ='),end=source.indexOf('  function unreadContextKey()',start);vm.runInContext(source.slice(start,end),context);
 return {options,context,c,expiry,flags,events,field,nodes};
}
test('normal-mode action preserves sidebar, original query and original zero-valued deadline handle',()=>{
 const h=harness(),handle=[...h.c.tasks.keys()][0];assert.equal(handle,0);h.options.onBegin();assert.equal(h.expiry.hasDeadline(),true);
 assert.equal(h.nodes.get('progress').children[1].textContent,'Marcando como não lida…');
 assert.equal(h.flags.has('visible-side'),true);assert.ok(h.nodes.has('sidebar-block'));
 h.field.value='internal lookup';h.options.prepareFinish();assert.equal(h.field.value,'original filter');assert.equal(h.options.finishReady(),false);
 h.c.advance(1000);assert.equal(h.options.finishReady(),true);h.options.onEnd({ok:true,closed:true});h.options.onResult({ok:true,closed:true});
 assert.equal(h.flags.has('normal'),true);assert.equal(h.c.tasks.has(handle),true);assert.equal(h.context.unreadOrigin,null);assert.equal(h.nodes.has('progress'),false);assert.equal(h.nodes.has('sidebar-block'),false);assert.equal(h.flags.has('visible-side'),false);
 assert.equal(h.events.includes('search'),false);assert.equal(h.events.includes('overlay'),false);assert.equal(h.events.includes('error'),false);
 h.c.advance(8999);assert.equal(h.expiry.hasDeadline(),true);h.c.advance(1);assert.equal(h.expiry.hasDeadline(),false);assert.equal(h.events.at(-1),'expired');
});
test('focused action still lands in empty focused search, without an extension success toast',()=>{
 const h=harness({mode:'focused',timer:true});h.options.onBegin();assert.equal(h.expiry.hasDeadline(),false);assert.equal(h.nodes.has('sidebar-block'),false);assert.equal(h.flags.has('visible-side'),false);
 h.options.prepareFinish();assert.equal(h.options.finishReady(),true);h.options.onEnd({ok:true,closed:true});h.options.onResult({ok:true,closed:true});
 assert.deepEqual(h.events,['search']);assert.equal(h.nodes.has('progress'),false);
});
test('an explicitly visible manual sidebar without a timer stays visible and creates no bypass',()=>{
 const h=harness({mode:'side-open',timer:false});h.options.onBegin();h.field.value='lookup';h.options.prepareFinish();h.c.advance(1000);
 h.options.onEnd({ok:true});h.options.onResult({ok:true});assert.equal(h.flags.has('side-open'),true);assert.equal(h.expiry.hasDeadline(),false);assert.deepEqual(h.events,['restore']);
});
test('normal-mode errors restore query, keep sidebar and show only an error notice',()=>{
 const h=harness();h.options.onBegin();h.field.value='lookup';h.options.onEnd({ok:false,closed:true,error:'verify'});h.options.onResult({ok:false,closed:true,error:'verify'});
 assert.equal(h.field.value,'original filter');assert.equal(h.flags.has('normal'),true);assert.equal(h.expiry.hasDeadline(),true);assert.deepEqual(h.events,['restore','error']);
});
test('original expiry during a transaction invalidates it and cannot restore normal mode or old query',()=>{
 const h=harness();h.options.onBegin();h.field.value='lookup';h.c.advance(10000);assert.equal(h.options.stillAllowed(),false);
 h.options.prepareFinish();assert.equal(h.field.value,'lookup');assert.equal(h.options.finishReady(),false);
 h.options.onEnd({ok:false,cancelled:true,closed:true});assert.equal(h.context.unreadOrigin,null);assert.equal(h.flags.has('normal'),false);assert.equal(h.nodes.has('progress'),false);
});
test('cancellation does not overwrite the query of a newer navigation',()=>{
 const h=harness();h.options.onBegin();h.field.value='new navigation';h.options.onEnd({cancelled:true});
 assert.equal(h.field.value,'new navigation');assert.equal(h.context.unreadOrigin,null);assert.equal(h.nodes.has('progress'),false);assert.equal(h.nodes.has('sidebar-block'),false);assert.equal(h.flags.has('visible-side'),false);assert.deepEqual(h.events,[]);
});
test('a missing restoration field is an error, never a forced focused landing from normal mode',()=>{
 const h=harness();h.options.onBegin();h.context.findNativeSearchField=()=>undefined;h.options.prepareFinish();assert.equal(h.options.finishReady(),false);
 h.options.onEnd({ok:false,error:'restore',closed:true});h.options.onResult({ok:false,error:'restore',closed:true});
 assert.equal(h.flags.has('normal'),true);assert.equal(h.expiry.hasDeadline(),true);assert.deepEqual(h.events,['error']);assert.equal(h.nodes.has('progress'),false);
});
test('a throwing stale search field cannot strand progress, the mask or normal-mode state',()=>{
 const h=harness();h.options.onBegin();h.field.value='lookup';h.context.setNativeSearchText=()=>{throw Error('Replaced field');};
 h.options.onEnd({ok:false,error:'restore',closed:true});h.options.onResult({ok:false,error:'restore',closed:true});
 assert.equal(h.nodes.has('progress'),false);assert.equal(h.flags.has('pending'),false);assert.equal(h.flags.has('normal'),true);assert.deepEqual(h.events,['error']);
});
test('progress is stable, accessible and removes only its own UI, never another toast',()=>{
 const h=harness(),other={id:'other-toast'};h.nodes.set(other.id,other);h.options.onBegin();const progress=h.nodes.get('progress');
 assert.equal(progress.attributes.role,'status');assert.equal(progress.attributes['aria-live'],'polite');
 h.context.showMarkUnreadProgress(true);assert.equal(h.nodes.get('progress'),progress);assert.equal(progress.children.length,2);
 h.options.onEnd({cancelled:true});assert.equal(h.nodes.get(other.id),other);assert.equal(h.nodes.has('progress'),false);
});
