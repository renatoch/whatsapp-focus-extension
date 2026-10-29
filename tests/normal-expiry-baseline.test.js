// Preparation characterization: actual current composition, before surface-aware changes.
// The foreground-gap case deliberately records the old behavior and must be migrated
// to the agreed surface-specific expectations when implementation begins.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8');
function extract(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.notEqual(start, -1);
  return source.slice(start, source.indexOf('\n  function ', start + 1));
}
function harness({focused=true, visible=true, conversation=true}={}) {
  let time=1000000, deadline, expiry;
  const effects=[], normalized=[];
  const context = vm.createContext({
    globalThis: {MirrorFocusState:require('../focus-state.js')},
    document:{visibilityState:visible?'visible':'hidden',hasFocus:()=>focused},
    hasOpenConversation:()=>conversation, bypassTimer:null, BYPASS_MS:300000,
    finishNormalAttempt:(type,details)=>effects.push([type,JSON.parse(JSON.stringify(details))]),
    clearNormalDelay:()=>effects.push('clear-delay'),recordNormalOpenedAt:()=>effects.push('record-open'),
    setNormal:()=>effects.push('normal'),
    recordAwareness:(type,details)=>effects.push([type,JSON.parse(JSON.stringify(details))]),
    goToMainChatsThen:(route,callback)=>{effects.push(['normalize',route]);normalized.push(callback);},
    setSearchFocusedConversation:()=>effects.push('focused'),
    setActive:options=>effects.push(['active',options.showOverlay]),
    window:{clearTimeout(){},setTimeout:(callback,delay)=>{expiry=callback;deadline=time+delay;return 1;}},
  });
  vm.runInContext(extract('chooseNormalExpiryDestination')+'\n'+extract('setNormalTemporarily'),context);
  return {context,effects,normalized,start:()=>context.setNormalTemporarily('immediate'),
    advance(ms){time+=ms;if(expiry&&time>=deadline){const callback=expiry;expiry=null;callback();}}};
}
test('current bypass lasts exactly five minutes, emits expiry once, then normalizes before focused entry',()=>{
  const h=harness();h.start();assert.deepEqual(h.effects,[['normal_opened',{route:'immediate'}],'clear-delay','record-open','normal']);
  h.advance(299999);assert.equal(h.effects.length,4);h.advance(1);
  assert.deepEqual(h.effects.slice(4),[['focus_returned',{reason:'expiry',expiryDestination:'focused-conversation'}],['normalize','expiry']]);
  assert.equal(h.effects.includes('focused'),false);h.normalized[0]();assert.equal(h.effects.at(-1),'focused');
  h.advance(300000);assert.equal(h.effects.filter(e=>Array.isArray(e)&&e[0]==='focus_returned').length,1);
});
test('inactive or conversationless expiry retains current blind-overlay fallback',()=>{
  for(const options of [{focused:false},{visible:false},{conversation:false}]){
    const h=harness(options);h.start();h.advance(300000);
    assert.deepEqual(h.effects.slice(4),[['focus_returned',{reason:'expiry',expiryDestination:'blind-overlay'}],['active',true]]);
    assert.equal(h.normalized.length,0);
  }
});
test('characterizes known gap: current expiry never consults native foreground and can use a conversation behind it',()=>{
  const h=harness();let consulted=false;
  h.context.hasNativeTransientSurface=()=>{consulted=true;return true;};
  h.start();h.advance(300000);assert.equal(consulted,false);
  assert.deepEqual(h.effects.at(-1),['normalize','expiry']);
});
