const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const recents=require('../focused-recents.js'),collections=require('../fixed-collections.js'),native=require('../selected-unread-main.js');
const a={title:'Same name',lid:'101010101010101@lid'},b={title:'Same name',lid:'202020202020202@lid'};
test('same-title LIDs remain separate and recency/removal are keyed by identity',()=>{
 let state=recents.addRecent([],a);state=recents.addRecent(state,b);assert.deepEqual(state,[b,a]);state=recents.addRecent(state,{...a,title:'Renamed'});assert.equal(state.length,2);assert.equal(state[0].title,'Renamed');assert.deepEqual(recents.removeRecent(state,a),[b]);
});
test('legacy titles are not silently bound to a newly selected same-name account',()=>{
 assert.deepEqual(recents.addRecent(['Same name'],a),[a,'Same name']);assert.deepEqual(recents.removeRecent([a,b,'Same name'],'Same name'),[a,b]);
});
test('only LID namespace can enter new saved identities; phone/JID and extra fields are rejected/stripped',()=>{
 for(const lid of ['5511999990000@c.us','5511999990000@s.whatsapp.net','123@g.us','opaque@lid','1:0@lid','123'])assert.equal(recents.sanitizeEntry({title:'Name',lid}),null);
 assert.deepEqual(recents.sanitizeEntry({...a,phone:'private',messages:['private']}),a);
 assert.equal(native.lidOf({id:{server:'c.us',get _serialized(){throw Error('Do not even read phone serialization');}}}),'');
 assert.equal(native.lidOf({id:{server:'lid',_serialized:a.lid}}),a.lid);
});
test('collections round-trip both identities, legacy strings and independent removal',()=>{
 let state=collections.createCollection(collections.createEmptyState(),'Work').state;
 for(const member of ['Legacy',a,b])state=collections.addMember(state,'Work',member).state;
 assert.deepEqual(collections.sanitizeState(JSON.parse(JSON.stringify(state))),state);
 assert.equal(state.collections[0].members.length,3);assert.equal(collections.addMember(state,'Work',a).status,'exists');
 assert.deepEqual(collections.removeMember(state,'Work',a).state.collections[0].members,['Legacy',b]);
});
test('invalid stored keys never downgrade into a name-only navigation fallback',()=>{
 const state=collections.sanitizeState({version:1,collections:[{name:'Work',members:[a,{title:'Same name',lid:'5511000000000@c.us'}]}]});
 assert.deepEqual(state.collections[0].members,[a]);
});
function eventTarget(){const handlers=new Map();return {addEventListener(k,f){const list=handlers.get(k)||[];list.push(f);handlers.set(k,list);},removeEventListener(k,f){handlers.set(k,(handlers.get(k)||[]).filter(x=>x!==f));},dispatchEvent(e){e.target=this;for(const f of [...(handlers.get(e.type)||[])])f(e);return true;}};}
test('synchronous identity transport validates results and leaves no response listeners behind',()=>{
 const document=eventTarget(),window={CustomEvent:class{constructor(type,o){this.type=type;this.detail=o.detail;}}};let responses=0;
 document.addEventListener('mwf-lid-request-v1',e=>{responses++;document.dispatchEvent(new window.CustomEvent('mwf-lid-response-v1',{detail:{id:e.detail.id,value:e.detail.command==='match'?true:a.lid}}));});
 const access=recents.createIdentityAccess({window,document});assert.equal(access.selected(),a.lid);assert.equal(access.chosen(document),a.lid);assert.equal(access.matches(document,a.lid),true);assert.equal(access.matches(document,'555@c.us'),false);assert.equal(responses,3);
});
const source=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8');
function extract(name){const start=source.indexOf('  function '+name+'(');return source.slice(start,source.indexOf('\n  function ',start+1));}
function navigation({ids=[b.lid,a.lid],accepted=true,wrongHeader=false}={}){
 const timers=[],clicks=[],failures=[],targets=ids.map(lid=>({lid}));let complete=false;
 const context=vm.createContext({MirrorFocusedRecents:recents,recentNavigationToken:1,RECENT_NAVIGATION_RETRIES:2,RECENT_SEARCH_RETRY_MS:1,RECENT_CONFIRM_RETRY_MS:1,
  focusedSearchCandidates:()=>({rowCount:targets.length,candidates:targets.map(clickTarget=>({title:'Same name',clickTarget}))}),
  identityAccess:{matches:(target,lid)=>target.lid===lid,selected:()=>wrongHeader?b.lid:a.lid},
  findNativeSearchField:()=>({}),getSearchText:()=>accepted?'Same name':'Other',updateRecentNavigationDiagnostic(){},
  activateFocusedResult:t=>clicks.push(t),failFocusedRecentNavigation:reason=>failures.push(reason),
  window:{setTimeout:fn=>timers.push(fn)},readActiveConversationTitle:()=> 'Same name',setSearchFocusedConversation:()=>{complete=true;},addFocusedRecent(){},recentNavigationSource:'collection'});
 vm.runInContext(extract('resolveFocusedRecentSearch')+'\n'+extract('confirmFocusedRecentOpened'),context);context.resolveFocusedRecentSearch(a,1,0);
 let budget=20;while(timers.length&&budget--)timers.shift()();assert.ok(budget>0);return {clicks,failures,complete};
}
test('hidden title search disambiguates same-name results by saved LID before clicking',()=>{const h=navigation();assert.equal(h.clicks.length,1);assert.equal(h.clicks[0].lid,a.lid);assert.equal(h.complete,true);});
test('even one title match cannot open the wrong account; no missing-key fallback',()=>{const h=navigation({ids:[b.lid]});assert.equal(h.clicks.length,0);assert.equal(h.complete,false);assert.deepEqual(h.failures,['not-found']);});
test('post-click confirmation requires the saved identity, not only a matching title',()=>{const h=navigation({wrongHeader:true});assert.equal(h.clicks.length,1);assert.equal(h.complete,false);assert.deepEqual(h.failures,['not-found']);});
test('unaccepted native search still prevents identity-based activation',()=>{assert.equal(navigation({accepted:false}).clicks.length,0);});

function nativeRow(){
 const flags=new Set(['mwf-opening-recent','mwf-searching']),model={unreadCount:0,id:{server:'lid',_serialized:a.lid}};
 let label='Conversas';const grid={matches:s=>s==='[role="grid"]',children:[]},row={matches:s=>s==='[role="row"]',parentElement:grid};
 const frame={matches:s=>s.includes('cell-frame-container'),closest:s=>s==='#side'?{}:null,parentElement:row};
 const heading={querySelectorAll:()=>[{textContent:label}]};grid.children=[heading,row];
 const root={memoizedProps:{chat:{archive:false,unreadCount:0,id:{server:'lid',_serialized:b.lid}}}},gridFiber={stateNode:grid,return:root},owner={memoizedProps:{chat:model},return:gridFiber},host={stateNode:frame,return:owner};
 root.child=gridFiber;gridFiber.child=owner;owner.child=host;root.stateNode={current:root};frame.__reactFiber$test=host;
 const document={documentElement:{classList:{contains:k=>flags.has(k)}},querySelector:s=>s==='#side'?{}:null,getElementById:()=>({hidden:true})};
 return {frame,model,owner,flags,document,section:s=>{label=s;},requireNative:()=>({unproxy:m=>m})};
}
test('candidate identity resolves committed row ownership and ignores selected-chat ancestors above the grid',()=>{
 const h=nativeRow();assert.equal(native.identityReply(h.document,h.requireNative,h.frame,{command:'match',lid:a.lid}),true);
 assert.equal(native.identityReply(h.document,h.requireNative,h.frame,{command:'match',lid:b.lid}),false);
 delete h.owner.memoizedProps.chat;
 assert.throws(()=>native.identityReply(h.document,h.requireNative,h.frame,{command:'match',lid:b.lid}));
});
test('Messages/Contacts sections and non-navigation scopes cannot satisfy a row-key match',()=>{
 const h=nativeRow();h.section('Mensagens');assert.equal(native.identityReply(h.document,h.requireNative,h.frame,{command:'match',lid:a.lid}),false);
 h.section('Contatos');assert.equal(native.identityReply(h.document,h.requireNative,h.frame,{command:'match',lid:a.lid}),false);
 h.section('Conversas');h.flags.delete('mwf-opening-recent');assert.equal(native.identityReply(h.document,h.requireNative,h.frame,{command:'match',lid:a.lid}),false);
});
test('chosen-key capture requires the exact short-lived trusted-choice target',()=>{
 const h=nativeRow(),request={command:'chosen'};assert.equal(native.identityReply(h.document,h.requireNative,h.frame,request),'');
 assert.equal(native.identityReply(h.document,h.requireNative,h.frame,request,{target:{},lid:a.lid}),'');
 assert.equal(native.identityReply(h.document,h.requireNative,h.frame,request,{target:h.frame,lid:a.lid}),a.lid);
 h.flags.add('mwf-auth-surface');assert.equal(native.identityReply(h.document,h.requireNative,h.frame,request,{target:h.frame,lid:a.lid}),'');
});
