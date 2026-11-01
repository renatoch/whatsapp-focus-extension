const test=require('node:test'),assert=require('node:assert/strict');
const {createMarkUnreadAction}=require('../mark-unread.js');
function harness(options={}){
 const events=[],results=[],endings=[],jobs=new Map();let id=0,main=true,title='Private chosen title',menu=null,unread=!!options.alreadyUnread,allowed=true;
 let row={isConnected:true};let candidates=[{title,clickTarget:row}];let controller;
 const scheduler={setTimeout(fn){const key=++id;jobs.set(key,fn);queueMicrotask(()=>{if(jobs.delete(key))fn();});return key;},clearTimeout:key=>jobs.delete(key)};
 const dom={readHeader:()=>main?title:'',hasMain:()=>main,menus:()=>menu?[{}]:[],
  action:kind=>menu==='header'&&kind==='close'||menu==='row'&&kind===(unread?'read':'unread')?{}:null,
  openHeader(){events.push('header');if(options.noHeader)return false;menu='header';return true;},
  hover(){events.push('hover');if(options.recycleOnHover){candidates=[{title,clickTarget:{isConnected:true}}];}return true;},
  rowButton:()=>options.noRowButton?null:{},openRow(){menu='row';events.push('row-menu');if(options.navigateOnMenu){main=true;title='Different';}return true;},
  invoke(kind){events.push(kind);if(kind==='close'){if(!options.closeFails)main=false;menu=null;if(options.afterClose)options.afterClose(controller);}
   if(kind==='unread'){assert.equal(main,false,'Never mark while still selected');unread=true;menu=null;if(options.replaceAfterMark){row.isConnected=false;row={isConnected:true};candidates=[{title,clickTarget:row}];}}return true;},
  dismiss(){menu=null;events.push('dismiss');},unread:()=>unread&&!options.noBadge};
 controller=createMarkUnreadAction({dom,scheduler,normalize:value=>String(value||'').trim(),
  prepareLookup(){events.push('lookup');},lookup:()=>({accepted:!options.rejectedSearch,candidates}),canStart:()=>!options.ineligible,stillAllowed:()=>allowed,
  onBegin:()=>events.push('mask'),onEnd:result=>{endings.push(result);events.push('unmask');},onBusy:value=>events.push(value?'busy':'idle'),onResult:result=>results.push(result),
  prepareFinish:options.prepareFinish?()=>options.prepareFinish(controller):undefined,finishReady:options.finishReady});
 return {controller,events,results,endings,setCandidates:value=>{candidates=value;},row:()=>row,setAllowed:value=>{allowed=value;},setTitle:value=>{title=value;},main:()=>main};
}
test('masked native route closes first, marks once and verifies a newly rendered row',async()=>{
 const h=harness({replaceAfterMark:true});const result=await h.controller.run();assert.deepEqual(result,{ok:true,closed:true});assert.equal(h.main(),false);
 assert.ok(h.events.indexOf('mask')<h.events.indexOf('header'));assert.ok(h.events.indexOf('close')<h.events.indexOf('unread'));
 assert.equal(h.events.filter(x=>x==='unread').length,1);assert.equal(h.events.at(-1),'idle');assert.equal(h.results.length,1);
 assert.ok(!JSON.stringify(result).includes('Private'));assert.equal(h.controller.isBusy(),false);
});
test('already-unread native state is idempotent and never invokes Mark as read',async()=>{
 const h=harness({alreadyUnread:true});assert.equal((await h.controller.run()).ok,true);assert.equal(h.events.includes('unread'),false);assert.equal(h.events.includes('read'),false);assert.equal(h.events.includes('row-menu'),false);
});
test('ineligible surfaces cannot start a mask or touch native state',async()=>{
 const h=harness({ineligible:true});assert.equal((await h.controller.run()).ok,false);assert.deepEqual(h.events,[]);
});
test('duplicate, case-mismatched, missing and search-rejected targets stop before closing',async()=>{
 for(const candidates of [[],[{title:'PRIVATE CHOSEN TITLE',clickTarget:{isConnected:true}}],[{title:'Private chosen title',clickTarget:{isConnected:true}},{title:'Private chosen title',clickTarget:{isConnected:true}}]]){
  const h=harness();h.setCandidates(candidates);assert.equal((await h.controller.run()).ok,false);assert.equal(h.events.includes('close'),false);assert.equal(h.events.includes('unread'),false);
 }
 const h=harness({rejectedSearch:true});assert.equal((await h.controller.run()).ok,false);assert.equal(h.events.includes('close'),false);
});
test('failed native close cannot mark an open conversation',async()=>{
 const h=harness({closeFails:true});const result=await h.controller.run();assert.equal(result.error,'close');assert.equal(h.events.includes('unread'),false);assert.equal(h.main(),true);
});
test('missing hover control fails after close without pretending marking succeeded',async()=>{
 const h=harness({noRowButton:true});const result=await h.controller.run();assert.equal(result.ok,false);assert.equal(result.closed,true);assert.equal(h.events.includes('unread'),false);
});
test('hover recycling a connected target stops before row action',async()=>{
 const h=harness({recycleOnHover:true});assert.equal((await h.controller.run()).ok,false);assert.equal(h.events.includes('unread'),false);
});
test('a native click without an unread badge is never reported as success',async()=>{
 const h=harness({noBadge:true});const result=await h.controller.run();assert.equal(result.error,'verify');assert.equal(result.closed,true);assert.equal(result.ok,false);
});
test('double clicks are single-flight and do not create a second mask/action',async()=>{
 const h=harness();const pending=h.controller.run();assert.equal((await h.controller.run()).ok,false);assert.equal((await pending).ok,true);assert.equal(h.events.filter(x=>x==='mask').length,1);
});
test('cancellation releases waits, clears the mask and prevents late native effects or landing',async()=>{
 const h=harness();const pending=h.controller.run();await Promise.resolve();h.controller.cancel();const result=await pending;
 assert.equal(result.cancelled,true);assert.equal(h.events.includes('close'),false);assert.deepEqual(h.results,[]);assert.equal(h.events.filter(x=>x==='unmask').length,1);
});
test('new navigation/auth state cancels without seizing the newer view',async()=>{
 const h=harness();const pending=h.controller.run();await Promise.resolve();h.setAllowed(false);h.controller.reconcile();await pending;
 assert.equal(h.events.includes('unread'),false);assert.deepEqual(h.results,[]);assert.equal(h.controller.isBusy(),false);
});
test('a conversation opened during a later stage cannot be marked or force-landed',async()=>{
 const h=harness({navigateOnMenu:true});const result=await h.controller.run();assert.equal(result.cancelled,true);assert.equal(h.events.includes('unread'),false);assert.deepEqual(h.results,[]);
});
test('a superseded run cannot clear a newer run mask or finish its navigation',async()=>{
 const h=harness();const old=h.controller.run();await Promise.resolve();h.controller.cancel();const fresh=h.controller.run();
 assert.equal((await old).cancelled,true);assert.equal((await fresh).ok,true);assert.equal(h.results.length,1);
 assert.equal(h.events.filter(x=>x==='unmask').length,2);assert.equal(h.events.filter(x=>x==='unread').length,1);
});
test('final context restoration finishes before unmasking or notifying the caller',async()=>{
 let checks=0,h;h=harness({prepareFinish:()=>h.events.push('restore-context'),finishReady:()=>{checks++;assert.equal(h.results.length,0);return checks>1;}});
 assert.equal((await h.controller.run()).ok,true);assert.ok(h.events.indexOf('restore-context')<h.events.indexOf('unmask'));assert.equal(h.results.length,1);
});
test('cancellation during final restoration cleans progress ownership and cannot announce success',async()=>{
 const h=harness({prepareFinish:controller=>controller.cancel()});const result=await h.controller.run();
 assert.equal(result.cancelled,true);assert.equal(h.endings[0].cancelled,true);assert.equal(h.events.filter(x=>x==='unmask').length,1);assert.deepEqual(h.results,[]);
});
test('failure to restore context is reported separately from native marking',async()=>{
 const h=harness({finishReady:()=>false});const result=await h.controller.run();assert.equal(result.error,'restore');assert.equal(result.closed,true);assert.equal(h.events.includes('unread'),true);assert.equal(result.ok,false);
});
test('a thrown restoration hook is bounded as restoration failure after marking, not success',async()=>{
 const h=harness({prepareFinish:()=>{throw Error('Unavailable field');}});const result=await h.controller.run();
 assert.equal(result.error,'restore');assert.equal(result.closed,true);assert.equal(h.controller.isBusy(),false);assert.equal(h.events.at(-1),'idle');
});
test('disposal forbids restart and leaves no native action in flight',async()=>{
 const h=harness();const pending=h.controller.run();h.controller.dispose();await pending;assert.equal((await h.controller.run()).ok,false);assert.equal(h.events.includes('unread'),false);
});
