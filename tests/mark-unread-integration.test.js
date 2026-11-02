const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'content.js'),'utf8'),css=fs.readFileSync(path.join(root,'focus.css'),'utf8');
function extract(name){const start=source.indexOf(`  function ${name}(`);assert.notEqual(start,-1);return source.slice(start,source.indexOf('\n  function ',start+1));}
test('button is available for a known conversation with hidden sidebar, never Channel/Status/login',()=>{
 let surface='conversation',auth=false,busy=false;const flags=new Set(['mwf-active','mwf-sidebar-hidden']);
 const context=vm.createContext({document:{querySelector:()=>({})},authSurface:{isActive:()=>auth},markUnread:{isBusy:()=>busy},isSearching:()=>false,
  ROOT_NORMAL:'normal',ROOT_OPENING_RECENT:'opening',root:()=>({classList:{contains:name=>flags.has(name)}}),getOverlay:()=>({hidden:true}),hasNativeTransientSurface:()=>false,
  nativeSurface:{inspect:()=>surface},readActiveConversationTitle:()=> 'Private title'});
 vm.runInContext(extract('canMarkUnread'),context);assert.equal(context.canMarkUnread(),true);
 for(const value of ['channel','channel-list','status-player','status-list','unknown']){surface=value;assert.equal(context.canMarkUnread(),false);}
 surface='conversation';auth=true;assert.equal(context.canMarkUnread(),false);auth=false;busy=true;assert.equal(context.canMarkUnread(),false);
 busy=false;flags.add('normal');context.surfaceExpiry={hasDeadline:()=>false};assert.equal(context.canMarkUnread(),false);
 context.surfaceExpiry.hasDeadline=()=>true;assert.equal(context.canMarkUnread(),true);
});
test('header refresh never replaces the envelope children and creates no lateral action',()=>{
 assert.doesNotMatch(extract('updateMarkUnreadButton'),/textContent|innerHTML/);
 assert.match(extract('ensureMarkUnreadButton'),/<svg aria-hidden="true"/);
 assert.match(extract('ensureMarkUnreadButton'),/document.body.appendChild\(button\)/);
 assert.doesNotMatch(extract('ensureMarkUnreadButton'),/getControlsContainer/);
});
test('actual result composition lands in empty focused search rather than the initial overlay',()=>{
 let options;const events=[];
 const context=vm.createContext({globalThis:{MirrorMarkUnread:{createTransport:()=>({}),createMarkUnreadAction:value=>(options=value,{})},MirrorFocusedRecents:{normalizeTitle:v=>v}},
  document:{},window:{},unreadOrigin:null,isVisibleElement(){},readActiveConversationTitle(){},canMarkUnread(){},updateMarkUnreadButton(){},
  setSearchMode:()=>events.push('search'),showToast:()=>events.push('toast'),setActive:()=>events.push('overlay'),hasOpenConversation:()=>false});
 const start=source.indexOf('  const unreadTransport ='),end=source.indexOf('  function unreadContextKey()',start);vm.runInContext(source.slice(start,end),context);
 options.onResult({ok:true,closed:true});assert.deepEqual(events,['search']);
});
test('direct composition never touches native search, title lookup or restore settling',()=>{
 const start=source.indexOf('  const unreadTransport ='),end=source.indexOf('  function unreadContextKey()',start),block=source.slice(start,end);
 assert.doesNotMatch(block,/prepareLookup|focusedSearchCandidates|findNativeSearchField|setNativeSearchText|readActiveConversationTitle|SEARCH_SETTLE_MS/);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
 assert.ok(manifest.content_scripts.some(c=>c.world==='MAIN'&&c.js.includes('selected-unread-main.js')));
});
test('busy transaction blocks native typing and can be cancelled with Escape without starting full mode',()=>{
 let listener,busy=true;const calls=[];
 const context=vm.createContext({document:{addEventListener:(_type,fn)=>{listener=fn;}},markUnread:{isBusy:()=>busy,cancel(){busy=false;calls.push('cancel');}},
  setActive:()=>calls.push('focus'),authSurface:{isActive:()=>false},toggleExpiryTestMode:()=>calls.push('toggle')});
 vm.runInContext(extract('installKeyboardShortcuts')+'\ninstallKeyboardShortcuts();',context);
 const event=key=>({key,preventDefault:()=>calls.push('prevent'),stopImmediatePropagation:()=>calls.push('stop')});
 listener({...event('t'),altKey:true,shiftKey:true});assert.equal(busy,true);assert.equal(calls.includes('toggle'),false);
 listener(event('Escape'));assert.equal(busy,false);assert.deepEqual(calls.slice(-2),['cancel','focus']);
});
test('new native action is trusted-click-only and masked list/popups do not grant full mode',()=>{
 assert.match(extract('ensureMarkUnreadButton'),/if \(event.isTrusted\) void markUnread.run\(\)/);
 assert.match(css,/html\.mwf-mark-unread #side\s*\{[^}]*display: flex !important;[^}]*opacity: 0 !important;[^}]*pointer-events: none !important/);
 assert.match(css,/html\.mwf-mark-unread \[role="menu"\]\s*\{[^}]*filter: opacity\(0\)/);
 assert.doesNotMatch(source.slice(source.indexOf('  const unreadTransport ='),source.indexOf('  function unreadContextKey()')),/setNormal\(|setNormalTemporarily\(/);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));assert.ok(manifest.content_scripts[0].js.indexOf('mark-unread.js')<manifest.content_scripts[0].js.indexOf('content.js'));
});
