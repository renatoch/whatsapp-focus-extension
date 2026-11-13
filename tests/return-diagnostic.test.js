const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createReturnDiagnostic,chooseExpiryDestination}=require('../focus-state.js');
const {createSurfaceExpiry}=require('../surface-expiry.js');
const sample={surface:'conversation',mode:'normal',tabVisible:true,documentHasFocus:true,hasOpenContent:true,hasDeadline:false};
function harness(){let time=0;const d=createReturnDiagnostic({now:()=>time});return {d,time:v=>{time=v;}};}
test('records exact deadline/recheck observations and recent genuine input without changing expiry policy',()=>{
 const h=harness(),timers=[];let focused=true,normalize,blind=0;
 const read=()=>({...sample,documentHasFocus:focused});
 const expiry=createSurfaceExpiry({scheduler:{setTimeout:fn=>{timers.push(fn);return 1;},clearTimeout(){},cancelAnimationFrame(){}},durationMs:300000,inspect:()=> 'conversation',
  chooseDestination:(surface,phase)=>{const destination=chooseExpiryDestination({surface,visibilityState:'visible',documentHasFocus:focused,hasOpenConversation:true});h.d.decision({...read(),phase,destination});return destination;},
  normalizeConversation:fn=>{normalize=fn;},onConversation(){throw Error('must not preserve after focus loss');},onBlind:()=>blind++,onReturned:destination=>h.d.returned('expiry',destination,read()),clearContinuation(){}});
 h.d.start(300000);expiry.start();h.time(299950);h.d.activity({isTrusted:true,key:'PRIVATE'});h.time(300000);timers[0]();assert.equal(blind,0);
 focused=false;h.time(300260);normalize();const report=h.d.snapshot();
 assert.equal(blind,1);assert.equal(report.reason,'expiry');assert.equal(report.durationMs,300000);
 assert.equal(report.checks[0].phase,'deadline');assert.equal(report.checks[0].documentHasFocus,true);
 assert.equal(report.checks[1].phase,'after-normalization');assert.equal(report.checks[1].documentHasFocus,false);
 assert.equal(report.checks[0].lastInteractionAgoMs,50);assert.equal(report.lastInteractionAgoMs,310);
 assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
});
test('snapshot is fixed at return, independently copyable and never changes when user clicks copy',()=>{
 const h=harness();h.d.start(10000);h.time(9000);h.d.activity({isTrusted:true});h.time(10000);h.d.returned('shortcut','blind-overlay',sample);
 const report=h.d.snapshot();h.time(50000);h.d.activity({isTrusted:true});assert.equal(h.d.snapshot().lastInteractionAgoMs,1000);
 report.reason='PRIVATE';report.checks.push({title:'PRIVATE'});assert.equal(h.d.snapshot().reason,'shortcut');assert.equal(h.d.snapshot().checks.length,0);
});
test('synthetic events do not establish activity and diagnostics contain no arbitrary payload',()=>{
 const h=harness();h.d.activity({isTrusted:false});h.d.decision({...sample,surface:'PRIVATE',phase:'PRIVATE',destination:'PRIVATE',title:'PRIVATE',lid:'PRIVATE',messages:['PRIVATE']});h.d.returned('expiry','blind-overlay',sample);
 const report=h.d.snapshot();assert.equal(report.lastInteractionAgoMs,null);assert.equal(report.checks[0].surface,'unknown');assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
});
test('keeps only the latest return and bounded checks, with no cross-tab/reload history',()=>{
 const h=harness();assert.equal(h.d.snapshot(),null);h.d.start(10000);
 for(let i=0;i<20;i++)h.d.decision({...sample,phase:'deadline',destination:'blind-overlay'});
 h.d.returned('expiry','blind-overlay',sample);assert.equal(h.d.snapshot().checks.length,4);
 h.d.returned('button','blind-overlay',sample);assert.equal(h.d.snapshot().checks.length,0);assert.equal(h.d.snapshot().reason,'button');
 assert.equal(createReturnDiagnostic({now:()=>0}).snapshot(),null);
});
test('a new normal opening retains the previous report until another return occurs',()=>{
 const h=harness();h.d.returned('auth-transition','blind-overlay',sample);h.d.start(10000);assert.equal(h.d.snapshot().reason,'auth-transition');
 h.time(10000);h.d.returned('expiry','blind-overlay',sample);assert.equal(h.d.snapshot().durationMs,10000);assert.equal(h.d.snapshot().normalElapsedMs,10000);
});
test('copy control is voluntary, not an automatic diagnostic toast or extra storage',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8');
 assert.match(source,/data-mwf-action="return-diagnostic">Copiar diagnóstico do último retorno/);
 assert.match(source,/action === 'return-diagnostic' && event.isTrusted/);
 assert.match(source,/if \(diagnostic\) await copyDiagnostic\(diagnostic, button\)/);
 assert.match(source,/\['wheel','pointerdown','keydown','touchstart'\]/);
 assert.doesNotMatch(source,/Teste —|const knownSurface =/);
 const module=fs.readFileSync(path.join(__dirname,'../focus-state.js'),'utf8');assert.doesNotMatch(module,/localStorage|chrome\.storage|fetch\(/);
});
