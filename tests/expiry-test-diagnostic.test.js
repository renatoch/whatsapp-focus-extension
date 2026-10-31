const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8');
const start=source.indexOf('  function chooseNormalExpiryDestination('),fn=source.slice(start,source.indexOf('\n  function ',start+1));
function run({testMode=true,focused=true,visible=true,surface='channel',hasMain=true}={}){
  const notices=[];let focusReads=0;
  const context=vm.createContext({globalThis:{MirrorFocusState:require('../focus-state.js')},normalExpiryTestMode:testMode,
    document:{visibilityState:visible?'visible':'hidden',hasFocus(){focusReads++;return focused;}},hasOpenConversation:()=>hasMain,
    nativeSurface:{inspect:()=>surface},showToast:(message,diagnostic)=>notices.push({message,diagnostic:JSON.parse(JSON.stringify(diagnostic))})});
  vm.runInContext(fn,context);const destination=context.chooseNormalExpiryDestination();
  return {destination,notices,focusReads};
}
test('test-mode blind fallback explains a recognized channel with document focus false',()=>{
  const h=run({focused:false});assert.equal(h.destination,'blind-overlay');assert.equal(h.focusReads,1);
  assert.equal(h.notices.length,1);assert.deepEqual(h.notices[0].diagnostic,{surface:'channel',tabVisible:true,documentHasFocus:false,hasOpenContent:true});
  assert.match(h.notices[0].message,/canal/);assert.match(h.notices[0].message,/foco: não/);
});
test('test-mode blind fallback distinguishes channel-list classification despite a focused visible tab',()=>{
  const h=run({surface:'channel-list'});assert.equal(h.destination,'blind-overlay');
  assert.deepEqual(h.notices[0].diagnostic,{surface:'channel-list',tabVisible:true,documentHasFocus:true,hasOpenContent:true});
});
test('ordinary mode stays silent and focused channel keeps its existing destination',()=>{
  assert.deepEqual(run({testMode:false,focused:false}).notices,[]);
  const h=run();assert.equal(h.destination,'focused-channel');assert.deepEqual(h.notices,[]);
});
test('diagnostic accepts only bounded surface labels, never arbitrary input text',()=>{
  const h=run({surface:'PRIVATE-UNEXPECTED-TEXT',visible:false});assert.equal(h.notices[0].diagnostic.surface,'unknown');
  assert.ok(!JSON.stringify(h.notices).includes('PRIVATE-UNEXPECTED-TEXT'));
});
