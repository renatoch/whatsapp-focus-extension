const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8');
const start=source.indexOf('  function chooseNormalExpiryDestination('),fn=source.slice(start,source.indexOf('\n  function ',start+1));
function run({testMode=true,focused=true,visible=true,surface='channel',hasMain=true}={}){
  const notices=[];let focusReads=0;
  const context=vm.createContext({globalThis:{MirrorFocusState:require('../focus-state.js')},normalExpiryTestMode:testMode,
    document:{visibilityState:visible?'visible':'hidden',hasFocus(){focusReads++;return focused;}},hasOpenConversation:()=>hasMain,
    nativeSurface:{inspect:()=>surface},showToast:(...args)=>notices.push(args)});
  vm.runInContext(fn,context);return {destination:context.chooseNormalExpiryDestination(),notices,focusReads:()=>focusReads};
}
test('10-second blind expiry stays silent and retains unfocused fallback',()=>{
  const h=run({focused:false});assert.equal(h.destination,'blind-overlay');assert.equal(h.focusReads(),1);assert.deepEqual(h.notices,[]);
});
test('channel-list fallback stays silent even when the visible tab is focused',()=>{
  const h=run({surface:'channel-list'});assert.equal(h.destination,'blind-overlay');assert.deepEqual(h.notices,[]);
});
test('both duration modes retain silent focused-channel preservation',()=>{
  for(const testMode of [false,true]){const h=run({testMode});assert.equal(h.destination,'focused-channel');assert.deepEqual(h.notices,[]);}
});
test('expiry does not expose unexpected surface text in a diagnostic notice',()=>{
  const h=run({surface:'PRIVATE-UNEXPECTED-TEXT',visible:false});assert.equal(h.destination,'blind-overlay');assert.deepEqual(h.notices,[]);
});
