const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {same,walk,allowed,discover,createController}=require('../archived-unread-main.js');
function harness(){
 const models=[{archive:true,unreadCount:0},{archive:true,unreadCount:2},{archive:true,unreadCount:-1}];let source=models.slice(),current=source.slice(),selected=null,attached=true,scope=true,time=0,callback=null;
 const writes=[],notices=[];let starts=0,stops=0,resets=0;
 const adapter={attached:()=>attached,source:()=>source.slice(),current:()=>current,set:rows=>{writes.push(rows);current=rows;},unread:c=>c.unreadCount!==0,selected:()=>selected,subscribe:fn=>{starts++;callback=fn;return()=>{stops++;callback=null;};},reset:()=>resets++};
 const controller=createController({getAdapter:()=>adapter,inScope:()=>scope,notify:s=>notices.push(s),now:()=>time});
 const run=()=>controller.reconcile();controller.probe();
 return {models,adapter,controller,writes,notices,run,on:()=>controller.toggle(true,run),off:()=>controller.toggle(false,run),rows:()=>current,
  selected:v=>{selected=v;},source:v=>{source=v;},scope:v=>{scope=v;},attached:v=>{attached=v;},time:v=>{time=v;},nativeRefresh:()=>{current=source.slice();},event:()=>callback?.(),starts:()=>starts,stops:()=>stops,resets:()=>resets};
}
test('native unread criterion filters original models in native order, including negative/manual unread',()=>{
 const h=harness();h.on();assert.deepEqual(h.rows(),h.models.slice(1));assert.equal(h.controller.status().active,true);assert.equal(h.starts(),1);assert.equal(h.models.length,3);assert.equal(h.models[0].unreadCount,0);
});
test('updates include offscreen newly unread models and remove read ones without scanning rows',()=>{
 const h=harness();h.on();h.models[0].unreadCount=1;h.models[1].unreadCount=0;h.event();assert.deepEqual(h.rows(),[h.models[0],h.models[2]]);
});
test('native source refresh cannot permanently replace the filter; equal reconciliation is idempotent',()=>{
 const h=harness();h.on();const n=h.writes.length;h.run();h.run();assert.equal(h.writes.length,n);h.nativeRefresh();h.run();assert.deepEqual(h.rows(),h.models.slice(1));
});
test('off restores latest eligible source, not a stale saved snapshot; listeners are removed',()=>{
 const h=harness();h.on();const added={archive:true,unreadCount:0};h.source([...h.models,added]);h.off();assert.deepEqual(h.rows(),[...h.models,added]);assert.equal(h.stops(),1);assert.equal(h.controller.status().active,false);
});
test('current conversation can remain like native unread sticky behavior; no IDs are collected',()=>{
 const h=harness();h.on();h.selected(h.models[1]);h.models[1].unreadCount=0;h.event();assert.ok(h.rows().includes(h.models[1]));h.selected(null);h.run();assert.ok(h.rows().includes(h.models[1]));h.off();h.on();assert.equal(h.rows().includes(h.models[1]),false);
});
test('removal/unarchive clears sticky membership and follows the native eligible source',()=>{
 const h=harness();h.on();h.selected(h.models[1]);h.models[1].unreadCount=0;h.run();h.source([h.models[0],h.models[2]]);h.run();assert.deepEqual(h.rows(),[h.models[2]]);
});
test('empty filtered state is valid and can return to the full native list',()=>{
 const h=harness();h.models.forEach(c=>c.unreadCount=0);h.on();assert.equal(h.controller.status().empty,true);assert.equal(h.rows().length,0);h.off();assert.equal(h.rows().length,3);
});
test('focus/auth/deadline scope loss restores native data and clears listeners and state',()=>{
 const h=harness();h.on();h.scope(false);h.run();assert.equal(h.rows().length,3);assert.equal(h.stops(),1);assert.equal(h.controller.status().available,false);assert.equal(h.controller.status().error,false);
});
test('an unmounted/replaced owner is never restored via a stale setter',()=>{
 const h=harness();h.on();const n=h.writes.length;h.attached(false);h.run();assert.equal(h.writes.length,n);assert.equal(h.stops(),1);
});
test('schema/predicate errors restore source and report only a boolean failure',()=>{
 const h=harness();h.on();h.adapter.unread=()=>{throw Error('private detail never exported');};h.run();assert.equal(h.rows().length,3);assert.equal(h.controller.status().error,true);assert.equal(JSON.stringify(h.notices).includes('private detail'),false);assert.equal(h.stops(),1);
});
test('failed restoration resets only the owned native archive view rather than strand a filtered list',()=>{
 const h=harness();h.on();h.adapter.current=()=>{throw Error('schema');};h.run();assert.equal(h.resets(),1);assert.equal(h.controller.status().error,true);
});
test('write feedback is bounded instead of creating a renderer/mutation observer loop',()=>{
 const h=harness();h.on();for(let i=0;i<10;i++){h.nativeRefresh();h.run();}assert.equal(h.controller.status().active,false);assert.equal(h.controller.status().error,true);assert.equal(h.rows().length,3);assert.ok(h.writes.length<=7);
});
test('write budget expires and supports ordinary later updates',()=>{
 const h=harness();h.on();for(let i=1;i<9;i++){h.time(i*1200);h.nativeRefresh();h.run();}assert.equal(h.controller.status().active,true);
});
test('probe discovery failure does not mutate data or spam an error on an unsupported/empty archive',()=>{
 let notices=[];const c=createController({getAdapter(){throw Error('schema');},inScope:()=>true,notify:s=>notices.push(s)});c.probe();assert.deepEqual(c.status(),{available:false,active:false,empty:false,error:false});
});
test('probe can discover a new owner after an old owner has detached',()=>{
 const h=harness();h.on();h.attached(false);h.controller.probe();assert.equal(h.stops(),1);assert.equal(h.controller.status().active,false);
});
function nativeFixture(){
 const models=[{archive:true,unreadCount:0},{archive:true,unreadCount:-1}];const events=new Map(),collection={filter:fn=>models.filter(fn),on:(e,fn)=>events.set(e,fn),off:(e,fn)=>{if(events.get(e)===fn)events.delete(e);}};
 const ChatCollection=collection,getShouldAppearInList=()=>true;
 function nativeSource(){return ChatCollection.filter(c=>c.archive&&getShouldAppearInList(c));}
 function NativeArchive(){return 'WAWebChatCollection WAWebDrawerHeader.react WAWebFlatList.react';}
 const drawer={},list={},rootHandle={},root={stateNode:rootHandle},owner={type:NativeArchive,return:root,memoizedProps:{onClose:()=>{closed++;}},child:null};root.child=owner;rootHandle.current=root;
 let closed=0,selection=null,writes=0;const queue={dispatch:rows=>{writes++;state.memoizedState=rows;renderer.memoizedProps.data=rows.map(chat=>({chat}));}};
 const state={memoizedState:models.slice(),queue,next:null},sourceHook={memoizedState:[nativeSource,[]],next:state};owner.memoizedState=sourceHook;
 const renderer={type:()=>{},return:owner,memoizedProps:{testid:'archived-chatlist',data:models.map(chat=>({chat})),renderItem:()=>({props:{active:{getVal:()=>selection}}})}};
 const host={return:renderer};renderer.child=host;owner.child=renderer;list.__reactFiber$test=host;
 const document={querySelector:s=>s.includes('archived-chatlist')?list:s.includes('archived-drawer')?drawer:null};
 const requireNative=name=>name==='WAWebChatCollection'?{ChatCollection:collection}:name==='WAWebChatMessageSearch'?{matchFilter:c=>c.unreadCount!==0}:{SearchFilters:{UNREAD:'unread'}};
 return {models,events,rootHandle,root,owner,host,renderer,list,document,requireNative,state,sourceHook,queue,writes:()=>writes,closed:()=>closed};
}
test('adapter discovers unique native source/setter by reference shape, not fixed hook index',()=>{
 const f=nativeFixture(),a=discover(f.document,f.requireNative);assert.deepEqual(a.source(),f.models);a.set([f.models[1]]);assert.deepEqual(a.current(),[f.models[1]]);assert.equal(a.unread(f.models[1]),true);const off=a.subscribe(()=>{});assert.ok(f.events.has('change:unreadCount'));off();assert.equal(f.events.size,0);
});
test('adapter resolves committed root rather than stale DOM-linked fiber',()=>{
 const f=nativeFixture(),old=f.root,committed={stateNode:f.rootHandle,child:f.owner};f.rootHandle.current=committed;f.owner.return=committed;const stale={...f.owner,return:old,memoizedState:null};f.host.return={return:stale};const a=discover(f.document,f.requireNative);a.set([]);assert.equal(f.writes(),1);
});
test('changing callback identity does not lose a mounted owner with the same exact state queue',()=>{
 const f=nativeFixture(),a=discover(f.document,f.requireNative);f.owner.memoizedProps.onClose=()=>{};assert.equal(a.attached(),true);a.set([]);assert.deepEqual(a.current(),[]);
});
test('ambiguous presentation state hooks fail closed before subscribing or writing',()=>{
 const f=nativeFixture();f.state.next={memoizedState:f.models.slice(),queue:{dispatch(){}},next:null};assert.throws(()=>discover(f.document,f.requireNative));assert.equal(f.writes(),0);assert.equal(f.events.size,0);
});
test('unsupported model types, source drift and partial snapshots are rejected',()=>{
 const f=nativeFixture();f.renderer.memoizedProps.data=[{chat:{archive:false,unreadCount:1}}];assert.throws(()=>discover(f.document,f.requireNative));assert.equal(f.writes(),0);
});
test('native parent cycles are rejected instead of hanging the renderer',()=>{
 const f=nativeFixture();f.owner.return=f.owner;assert.throws(()=>discover(f.document,f.requireNative));assert.equal(f.writes(),0);
});
test('partially registered subscriptions are rolled back on failure',()=>{
 const f=nativeFixture(),c=f.requireNative('WAWebChatCollection').ChatCollection,on=c.on;let calls=0;c.on=(event,fn)=>{if(++calls===3)throw Error('subscription');on(event,fn);};
 const a=discover(f.document,f.requireNative);assert.throws(()=>a.subscribe(()=>{}));assert.equal(f.events.size,0);
});
test('all unsubscribe paths are attempted even if one native off operation fails',()=>{
 const f=nativeFixture(),c=f.requireNative('WAWebChatCollection').ChatCollection,a=discover(f.document,f.requireNative),off=a.subscribe(()=>{});let calls=0;c.off=()=>{calls++;throw Error('cleanup');};assert.throws(off);assert.equal(calls,9);
});
test('out-of-scope probe never inspects native internals or writes presentation',()=>{
 let touched=false;const c=createController({inScope:()=>false,getAdapter:()=>{touched=true;},notify(){}});c.probe();assert.equal(touched,false);assert.equal(c.status().available,false);
});
test('array matching is reference/order strict and traversal rejects cycles',()=>{
 assert.equal(same([{}],[{}]),false);const a={};a.child=a;assert.throws(()=>walk(a,()=>false));
});
test('both worlds enforce identical mode/privacy scope including unread-operation exclusion',()=>{
 const ui=require('../archived-unread-ui.js');const flags=new Set(['mwf-normal']);const d={documentElement:{classList:{contains:k=>flags.has(k)}},querySelector:()=>({})};
 assert.equal(allowed(d),true);for(const key of ['mwf-active','mwf-overlay-open','mwf-auth-surface','mwf-channel-surface','mwf-expired-status','mwf-mark-unread']){flags.add(key);assert.equal(allowed(d),false);assert.equal(ui.allowed(d),false);flags.delete(key);}flags.delete('mwf-normal');assert.equal(allowed(d),false);flags.add('mwf-sidebar-open');assert.equal(allowed(d),true);
});
test('manifest separates MAIN/ISOLATED without permission, backend or data-message expansion',()=>{
 const r=path.join(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(r,'manifest.json')));assert.deepEqual(m.permissions,['storage','clipboardRead','clipboardWrite','offscreen']);
 assert.equal(m.content_scripts.find(s=>s.js.includes('archived-unread-main.js')).world,'MAIN');assert.equal(m.content_scripts.find(s=>s.js.includes('archived-unread-ui.js')).world,'ISOLATED');
 const src=fs.readFileSync(path.join(r,'archived-unread-main.js'),'utf8');assert.doesNotMatch(src,/fetch\(|XMLHttpRequest|localStorage|sessionStorage|chrome\.storage|\.unreadCount\s*=/);assert.match(src,/direction:'status',epoch,\.\.\.status/);
});
