const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {createSurfaceExpiry}=require('../surface-expiry.js');
const {chooseExpiryDestination}=require('../focus-state.js');
const source=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8');
function extract(name){const start=source.indexOf(`  function ${name}(`);assert.notEqual(start,-1);return source.slice(start,source.indexOf('\n  function ',start+1));}
function harness(surface){
  const flags=new Set(['normal']),overlay={hidden:false},events=[],listeners={};let timer,frame;
  const classList={add:(...values)=>values.forEach(v=>flags.add(v)),remove:(...values)=>values.forEach(v=>flags.delete(v)),contains:v=>flags.has(v)};
  const context=vm.createContext({root:()=>({classList}),getOverlay:()=>overlay,ROOT_NORMAL:'normal',ROOT_CHANNEL_FOCUSED:'channel-focused',ROOT_EXPIRED_STATUS:'expired-status',
    updateFocusedNavigationShelfVisibility:()=>events.push('visibility'),RETURN_ID:'return',
    document:{body:{},getElementById:()=>null,createElement:()=>({addEventListener:(_event,fn)=>listeners.button=fn}),addEventListener:(event,fn)=>listeners[event]=fn},
    getControlsContainer:()=>({appendChild(){}}),recordAwareness:(type,details)=>events.push([type,JSON.parse(JSON.stringify(details))]),
    setActive:()=>{expiry.cancel();overlay.hidden=false;events.push('active');},canToggleSidebar:()=>false});
  vm.runInContext(extract('continueNativeSurface'),context);
  const expiry=createSurfaceExpiry({scheduler:{setTimeout:fn=>{timer=fn;return 0;},clearTimeout(){},requestAnimationFrame:fn=>{frame=fn;return 1;},cancelAnimationFrame(){}},
    durationMs:300000,inspect:()=>surface,chooseDestination:surface=>chooseExpiryDestination({surface,visibilityState:'visible',documentHasFocus:true,hasOpenConversation:true}),
    normalizeConversation:()=>{throw Error('Native content must not normalize');},onConversation:()=>{throw Error('Not a conversation');},
    onChannel:()=>context.continueNativeSurface('channel'),onStatus:()=>context.continueNativeSurface('status'),onBlind:()=>context.setActive(),
    onReturned:destination=>events.push(['returned',destination]),clearContinuation:()=>classList.remove('channel-focused','expired-status')});
  context.surfaceExpiry=expiry;
  return {flags,overlay,events,listeners,context,expiry,start:()=>{expiry.start();timer();},change:value=>{surface=value;},frame:()=>frame()};
}
test('actual native-entry helper hides overlay and does not cancel its own continuation',()=>{
  for(const [surface,flag]of [['channel','channel-focused'],['status-player','expired-status']]){
    const h=harness(surface);h.start();assert.equal(h.flags.has('normal'),false);assert.equal(h.flags.has(flag),true);
    assert.equal(h.overlay.hidden,true);assert.equal(h.expiry.isContinuing(),true);assert.deepEqual(h.events,['visibility']);
  }
});
test('manual Foco button and shortcut record one manual return from expired native continuation',()=>{
  for(const method of ['ensureReturnButton','installKeyboardShortcuts']){
    const h=harness('channel');h.start();vm.runInContext(extract(method)+`\n${method}();`,h.context);
    const action=method==='ensureReturnButton'?h.listeners.button:()=>h.listeners.keydown({altKey:true,shiftKey:true,key:'f',preventDefault(){},stopImmediatePropagation(){}});
    action();assert.equal(h.expiry.isContinuing(),false);assert.equal(h.flags.has('channel-focused'),false);
    assert.deepEqual(h.events.slice(1),[['focus_returned',{reason:'manual'}],'active']);
  }
});
test('observer closure applies focus only after expired Status is gone and reveals a known list',()=>{
  const h=harness('status-player');h.start();h.change('status-list');h.expiry.refresh();h.frame();
  assert.equal(h.expiry.isContinuing(),false);assert.equal(h.flags.has('expired-status'),false);assert.equal(h.overlay.hidden,false);
  assert.deepEqual(h.events,['visibility',['returned','blind-overlay'],'active']);
});
test('composition cancels continuation for explicit transitions and refreshes it through existing observer',()=>{
  for(const method of ['setActive','setNormal','setSearchMode','setSidebarOpen','setSidebarHiddenManually','setSearchFocusedConversation'])assert.match(extract(method),/surfaceExpiry\.cancel(?:Continuation)?\(\)/,method);
  assert.match(extract('updateOverlayState'),/surfaceExpiry\.refresh\(\)/);
  assert.match(extract('updateOverlayState'),/nativeSurface\.inspect\(\) === "conversation"/);
});
