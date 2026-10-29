const test=require('node:test'),assert=require('node:assert/strict');
const {createSurfaceExpiry}=require('../surface-expiry.js');
const {chooseExpiryDestination}=require('../focus-state.js');
function clock(){let time=0,next=0;const tasks=new Map(),all=new Map();
  const add=(fn,delay)=>{const id=next++;const task={fn,at:time+delay};tasks.set(id,task);all.set(id,fn);return id;};
  return {tasks,all,scheduler:{setTimeout:add,clearTimeout:id=>tasks.delete(id),requestAnimationFrame:fn=>add(fn,16),cancelAnimationFrame:id=>tasks.delete(id)},
    advance(ms){const end=time+ms;let budget=100;while(budget--){const item=[...tasks].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!item)break;const[id,t]=item;tasks.delete(id);time=t.at;t.fn();}assert.ok(budget>0);time=end;},force:id=>all.get(id)()};}
function harness({surface='conversation',active=true,immediate=false,hooks={}}={}){
  const c=clock(),events=[],callbacks=[];let current=surface,isActive=active;
  const effect=name=>()=>{events.push(name);hooks[name]?.();};
  const deps={scheduler:c.scheduler,durationMs:300000,inspect:()=>current,
    chooseDestination:surface=>chooseExpiryDestination({surface,visibilityState:isActive?'visible':'hidden',documentHasFocus:isActive,hasOpenConversation:true}),
    normalizeConversation:cb=>{events.push('normalize');callbacks.push(cb);if(immediate)cb();},
    onConversation:effect('conversation'),onChannel:effect('channel'),onStatus:effect('status'),onBlind:effect('blind'),
    onReturned:destination=>{events.push(['returned',destination]);hooks.returned?.();},clearContinuation:()=>{hooks.clear?.();}};
  const controller=createSurfaceExpiry(deps);
  return {controller,c,events,callbacks,deps,setSurface:value=>{current=value;},setActive:value=>{isActive=value;}};
}
test('exact five-minute deadline, one expiry, zero-valued timer handles and no automatic renewal',()=>{
  const h=harness({surface:'channel'});h.controller.start();const handle=[...h.c.tasks.keys()][0];assert.equal(handle,0);
  h.c.advance(299999);assert.deepEqual(h.events,[]);h.c.advance(1);assert.deepEqual(h.events,['channel']);h.c.force(handle);
  h.c.advance(600000);assert.deepEqual(h.events,['channel']);assert.equal(h.c.tasks.size,0);assert.equal(h.controller.isContinuing(),true);
});
test('conversation preserves normalization then focus; late or duplicate completion cannot redirect newer work',()=>{
  const h=harness();h.controller.start();h.c.advance(300000);assert.deepEqual(h.events,['normalize']);
  h.callbacks[0]();h.callbacks[0]();assert.deepEqual(h.events,['normalize',['returned','focused-conversation'],'conversation']);
  const late=harness();late.controller.start();late.c.advance(300000);late.controller.cancel();late.callbacks[0]();assert.deepEqual(late.events,['normalize']);
});
test('Status and channel foreground are preserved, with no false focus-return event or Chats normalization',()=>{
  for(const [surface,event]of [['status-player','status'],['channel','channel']]){
    const h=harness({surface});h.controller.start();h.c.advance(300000);assert.deepEqual(h.events,[event]);assert.equal(h.callbacks.length,0);
  }
});
test('status list, channel list, unknown and inactive foreground return blind, never normalize',()=>{
  for(const options of [{surface:'status-list'},{surface:'channel-list'},{surface:'unknown'},{surface:'status-player',active:false},{surface:'channel',active:false}]){
    const h=harness(options);h.controller.start();h.c.advance(300000);assert.deepEqual(h.events,[['returned','blind-overlay'],'blind']);
  }
});
test('closing Status before deadline does not shorten bypass; closing after deadline returns focus once',()=>{
  const before=harness({surface:'status-player'});before.controller.start();before.c.advance(1000);before.setSurface('status-list');before.controller.refresh();before.c.advance(16);assert.deepEqual(before.events,[]);
  before.c.advance(298984);assert.deepEqual(before.events,[['returned','blind-overlay'],'blind']);
  const h=harness({surface:'status-player'});h.controller.start();h.c.advance(300000);h.setSurface('status-list');h.controller.refresh();h.controller.refresh();assert.equal(h.c.tasks.size,1);
  h.c.advance(16);h.controller.refresh();h.c.advance(1000);assert.deepEqual(h.events,['status',['returned','blind-overlay'],'blind']);assert.equal(h.controller.isContinuing(),false);
});
test('Status person changes and unclassified loading gaps do not spuriously close the viewer',()=>{
  const h=harness({surface:'status-player'});h.controller.start();h.c.advance(300000);
  h.setSurface('status-list');h.controller.refresh();h.setSurface('status-player');h.c.advance(16);assert.deepEqual(h.events,['status']);
  h.setSurface('unknown');h.controller.refresh();h.c.advance(16);assert.deepEqual(h.events,['status']);
  h.setSurface('status-player');h.controller.refresh();h.c.advance(16);assert.deepEqual(h.events,['status']);
});
test('channel continuation does not renew bypass or infer closure from its hidden sidebar',()=>{
  const h=harness({surface:'channel'});h.controller.start();h.c.advance(300000);for(let i=0;i<3;i++){h.controller.refresh();h.c.advance(16);}assert.deepEqual(h.events,['channel']);
  h.setSurface('conversation');h.controller.refresh();h.c.advance(16);assert.deepEqual(h.events,['channel',['returned','blind-overlay'],'blind']);
});
test('new bypass, manual cancellation and disposal invalidate queued continuation callbacks',()=>{
  for(const method of ['cancel','start','dispose']){
    const h=harness({surface:'status-player'});h.controller.start();h.c.advance(300000);h.setSurface('status-list');h.controller.refresh();const id=[...h.c.tasks.keys()][0];
    h.controller[method]();h.c.force(id);assert.deepEqual(h.events,['status'],method);assert.equal(h.controller.isContinuing(),false);
  }
});
test('late normalization rechecks the foreground instead of applying focused-chat mode over Status',()=>{
  const h=harness();h.controller.start();h.c.advance(300000);h.setSurface('status-player');h.callbacks[0]();assert.deepEqual(h.events,['normalize','status']);
});
test('sidebar toggles preserve the original bypass deadline but cancel an expired continuation',()=>{
  const h=harness({surface:'channel'});h.controller.start();h.c.advance(1000);h.controller.cancelContinuation();
  assert.equal(h.c.tasks.size,1);h.c.advance(299000);assert.deepEqual(h.events,['channel']);
  h.controller.cancelContinuation();assert.equal(h.controller.isContinuing(),false);
});

test('explicit channel continuation does not normalize or grant another bypass',()=>{
  const h=harness({surface:'channel'});h.controller.start();assert.equal(h.c.tasks.size,1);
  assert.equal(h.controller.continueChannel(),true);assert.equal(h.c.tasks.size,0);
  assert.equal(h.controller.isContinuing(),true);assert.deepEqual(h.events,['channel']);
  h.controller.refresh();h.c.advance(16);assert.deepEqual(h.events,['channel']);
  const other=harness({surface:'conversation'});assert.equal(other.controller.continueChannel(),false);assert.deepEqual(other.events,[]);
});

test('reentrant cancellation at focus-return callback prevents the old mode action',()=>{
  let controller;const h=harness({surface:'status-list',hooks:{returned:()=>controller.cancel()}});controller=h.controller;
  controller.start();h.c.advance(300000);assert.deepEqual(h.events,[['returned','blind-overlay']]);
});
