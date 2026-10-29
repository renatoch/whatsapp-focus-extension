// Characterized before implementation; now connects actual composition wrappers
// to the real surface-expiry controller, retaining VM only for still-composed wiring.
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
function harness({focused=true, visible=true, conversation=true,surface=conversation?'conversation':'unknown'}={}) {
  let time=1000000, deadline, expiry;
  const effects=[], normalized=[];
  const context = vm.createContext({
    globalThis: {MirrorFocusState:require('../focus-state.js')},
    document:{visibilityState:visible?'visible':'hidden',hasFocus:()=>focused},
    hasOpenConversation:()=>conversation, nativeSurface:{inspect:()=>surface}, BYPASS_MS:300000,
    finishNormalAttempt:(type,details)=>effects.push([type,JSON.parse(JSON.stringify(details))]),
    clearNormalDelay:()=>effects.push('clear-delay'),recordNormalOpenedAt:()=>effects.push('record-open'),
    setNormal:()=>effects.push('normal'),
    recordAwareness:(type,details)=>effects.push([type,JSON.parse(JSON.stringify(details))]),
    goToMainChatsThen:(route,callback)=>{effects.push(['normalize',route]);normalized.push(callback);},
    setSearchFocusedConversation:()=>effects.push('focused'),
    setActive:options=>effects.push(['active',options.showOverlay]),
    window:{clearTimeout(){expiry=null;},cancelAnimationFrame(){},requestAnimationFrame:()=>1,setTimeout:(callback,delay)=>{expiry=callback;deadline=time+delay;return 1;}},
  });
  vm.runInContext(extract('chooseNormalExpiryDestination')+'\n'+extract('setNormalTemporarily'),context);
  context.surfaceExpiry = require('../surface-expiry.js').createSurfaceExpiry({
    scheduler:context.window,durationMs:300000,inspect:()=>surface,
    chooseDestination:context.chooseNormalExpiryDestination,
    normalizeConversation:cb=>context.goToMainChatsThen('expiry',cb),
    onConversation:context.setSearchFocusedConversation,onStatus:()=>effects.push('status'),onChannel:()=>effects.push('channel'),
    onBlind:()=>context.setActive({showOverlay:true}),clearContinuation(){},
    onReturned:expiryDestination=>context.recordAwareness('focus_returned',{reason:'expiry',expiryDestination}),
  });
  return {context,effects,normalized,start:()=>context.setNormalTemporarily('immediate'),
    advance(ms){time+=ms;if(expiry&&time>=deadline){const callback=expiry;expiry=null;callback();}}};
}
test('bypass lasts exactly five minutes, normalizes before focused entry and records return on application',()=>{
  const h=harness();h.start();assert.deepEqual(h.effects,[['normal_opened',{route:'immediate'}],'clear-delay','record-open','normal']);
  h.advance(299999);assert.equal(h.effects.length,4);h.advance(1);
  assert.deepEqual(h.effects.slice(4),[['normalize','expiry']]);
  assert.equal(h.effects.includes('focused'),false);h.normalized[0]();
  assert.deepEqual(h.effects.slice(5),[['focus_returned',{reason:'expiry',expiryDestination:'focused-conversation'}],'focused']);
  h.advance(300000);assert.equal(h.effects.filter(e=>Array.isArray(e)&&e[0]==='focus_returned').length,1);
});
test('inactive or conversationless expiry retains current blind-overlay fallback',()=>{
  for(const options of [{focused:false},{visible:false},{conversation:false}]){
    const h=harness(options);h.start();h.advance(300000);
    assert.deepEqual(h.effects.slice(4),[['focus_returned',{reason:'expiry',expiryDestination:'blind-overlay'}],['active',true]]);
    assert.equal(h.normalized.length,0);
  }
});
test('native foreground now takes priority over a conversation behind it without false focus telemetry',()=>{
  for(const [surface,event]of [['status-player','status'],['channel','channel']]){
    const h=harness({surface});h.start();h.advance(300000);
    assert.equal(h.effects.at(-1),event);assert.equal(h.normalized.length,0);
    assert.equal(h.effects.some(e=>Array.isArray(e)&&e[0]==='focus_returned'),false);
  }
});
