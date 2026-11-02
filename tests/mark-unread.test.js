const test=require('node:test'),assert=require('node:assert/strict');
const {createTransport,createMarkUnreadAction}=require('../mark-unread.js');
function clock(){let time=0,id=0;const tasks=new Map();return {tasks,setTimeout(fn,ms){const n=id++;tasks.set(n,{fn,at:time+ms});return n;},clearTimeout:n=>tasks.delete(n),advance(ms){const end=time+ms;while(true){const next=[...tasks].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;tasks.delete(next[0]);time=next[1].at;next[1].fn();}time=end;}};}
function wire(){const scheduler=clock(),listeners=new Map(),sent=[];let main=true;const window={postMessage:m=>sent.push(m),addEventListener:(k,fn)=>listeners.set(k,fn),removeEventListener:k=>listeners.delete(k)};const transport=createTransport({window,scheduler,hasMain:()=>main});return {transport,scheduler,sent,listeners,window,main:v=>{main=v;},reply:(data,source=window,origin='https://web.whatsapp.com')=>listeners.get('message')?.({source,origin,data:{channel:'mwf-selected-unread-v1',direction:'result',id:sent[0]?.id,...data}})};}
test('transport sends fixed commands with numeric IDs only, and validates native completion',async()=>{
 const h=wire(),p=h.transport.run();assert.deepEqual(Object.keys(h.sent[0]).sort(),['channel','command','direction','id']);h.main(false);h.reply({ok:true,closed:true});assert.deepEqual(await p,{ok:true,closed:true});assert.equal(h.scheduler.tasks.size,0);
});
test('wrong source, origin, ID, result shape and impossible success are ignored',async()=>{
 const h=wire(),p=h.transport.run();h.reply({ok:true,closed:true},{},'https://web.whatsapp.com');h.reply({ok:true,closed:true},h.window,'https://evil.invalid');h.reply({ok:true,closed:true,id:999});h.reply({ok:true,closed:false});h.reply({ok:'yes',closed:true});assert.equal(h.scheduler.tasks.size,1);h.reply({ok:false,closed:false,error:'unavailable'});assert.equal((await p).error,'unavailable');
});
test('contradictory success/error payloads cannot carry arbitrary text across the bridge',async()=>{
 const h=wire(),p=h.transport.run();h.reply({ok:true,closed:true,error:'private payload'});h.reply({ok:true,closed:true,cancelled:true});assert.equal(h.scheduler.tasks.size,1);h.reply({ok:true,closed:true});assert.equal((await p).ok,true);
});
test('a lost message context fails boundedly without stranding a pending request',async()=>{
 const h=wire();h.window.postMessage=()=>{throw Error('context lost');};assert.equal((await h.transport.run()).error,'unavailable');assert.equal(h.scheduler.tasks.size,0);
});
test('single flight, timeout and cancellation never retry marking or search',async()=>{
 const h=wire(),p=h.transport.run();assert.equal((await h.transport.run()).error,'unavailable');h.main(false);h.scheduler.advance(6500);assert.deepEqual(await p,{ok:false,error:'verify',closed:true});assert.deepEqual(h.sent.map(m=>m.command),['run','cancel']);assert.equal(h.scheduler.tasks.size,0);
});
test('cancel resolves pending work and rejects late native replies',async()=>{
 const h=wire(),p=h.transport.run();h.transport.cancel();h.reply({ok:true,closed:true});assert.equal((await p).cancelled,true);assert.equal(h.scheduler.tasks.size,0);
});
test('pagehide/disposal clears listeners and stops future requests',async()=>{
 const h=wire(),p=h.transport.run();h.listeners.get('pagehide')();assert.equal((await p).cancelled,true);assert.equal(h.listeners.has('message'),false);assert.equal((await h.transport.run()).error,'unavailable');
});
function action(){let resolve,busy=false,allowed=true,starts=0,cancels=0;const events=[];const transport={run:()=>{starts++;return new Promise(r=>{resolve=r;});},cancel:()=>{cancels++;resolve?.({ok:false,cancelled:true});},dispose(){}};const c=createMarkUnreadAction({transport,canStart:()=>true,stillAllowed:()=>allowed,onBegin:()=>events.push('begin'),onEnd:r=>events.push(r.cancelled?'cancelled':'end'),onBusy:v=>{busy=v;events.push(v?'busy':'idle');},onResult:r=>events.push(r.ok?'success':'error')});return {c,events,resolve:r=>resolve(r),allowed:v=>{allowed=v;},busy:()=>busy,starts:()=>starts,cancels:()=>cancels};}
test('activity starts synchronously; native success is delivered only after completion',async()=>{
 const h=action(),p=h.c.run();assert.deepEqual(h.events,['begin','busy']);h.resolve({ok:true,closed:true});await p;assert.deepEqual(h.events,['begin','busy','end','idle','success']);
});
test('controller is single-flight and does not run another transport request',async()=>{
 const h=action(),p=h.c.run();assert.equal((await h.c.run()).error,'unavailable');assert.equal(h.starts(),1);h.resolve({ok:true,closed:true});await p;
});
test('scope loss cancels and never delivers a late success/landing',async()=>{
 const h=action(),p=h.c.run();h.allowed(false);h.c.reconcile();h.resolve({ok:true,closed:true});await p;assert.equal(h.cancels(),1);assert.equal(h.busy(),false);assert.equal(h.events.includes('success'),false);
});
test('scope change between native completion and continuation cannot seize a newer view',async()=>{
 const h=action(),p=h.c.run();h.resolve({ok:true,closed:true});h.allowed(false);await p;assert.equal(h.events.includes('success'),false);
});
test('backend failure is shown as failure and cleans busy state',async()=>{
 const h=action(),p=h.c.run();h.resolve({ok:false,error:'close',closed:false});await p;assert.equal(h.events.at(-1),'error');assert.equal(h.busy(),false);
});
test('disposal forbids a future action and clears a pending transaction',async()=>{
 const h=action(),p=h.c.run();h.c.dispose();await p;assert.equal((await h.c.run()).error,'unavailable');assert.equal(h.busy(),false);
});
