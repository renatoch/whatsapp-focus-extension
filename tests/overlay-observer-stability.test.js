const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8');
function extract(name){const start=source.indexOf(`  function ${name}(`);assert.notEqual(start,-1);return source.slice(start,source.indexOf('\n  function ',start+1));}
function harness(confirmation=false){
  let surface='channel',writes=0,queued=0,text='';
  const button={closest:()=>confirmation?{}:null,get textContent(){return text;},set textContent(value){text=value;writes++;queued++;}};
  const overlay={classList:{toggle(){}},querySelectorAll:()=>[button]};
  const context=vm.createContext({surfaceExpiry:{refresh(){}},updateFocusedNavigationShelfVisibility(){},isSearching:()=>false,
    getOverlay:()=>overlay,isWhatsAppReady:()=>true,hasOpenConversation:()=>true,nativeSurface:{inspect:()=>surface}});
  vm.runInContext(extract('updateOverlayState'),context);
  return {update:()=>context.updateOverlayState(),button,writes:()=>writes,setSurface:value=>{surface=value;},
    flush(){let turns=0;while(queued&&turns<8){queued=0;context.updateOverlayState();turns++;}return {turns,queued};}};
}
test('stable overlay updates do not replace owned text nodes repeatedly',()=>{
  const h=harness();h.update();assert.equal(h.writes(),1);h.update();h.update();assert.equal(h.writes(),1);
  h.setSurface('conversation');h.update();assert.equal(h.writes(),2);h.update();assert.equal(h.writes(),2);
});
test('short confirmation labels also settle without observer feedback',()=>{
  const h=harness(true);h.update();assert.equal(h.button.textContent,'Continuar no canal');assert.equal(h.flush().queued,0);
  h.setSurface('conversation');h.update();assert.equal(h.button.textContent,'Continuar na conversa');assert.equal(h.flush().queued,0);
});
test('child-list observer feedback settles instead of starving the event loop',()=>{
  const h=harness();h.update();const first=h.flush();assert.equal(first.queued,0);assert.ok(first.turns<=2);
  assert.equal(h.button.textContent,'Continuar no canal aberto');
  h.setSurface('conversation');h.update();const second=h.flush();assert.equal(second.queued,0);assert.ok(second.turns<=2);
});
