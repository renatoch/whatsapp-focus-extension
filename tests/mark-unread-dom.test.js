const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {capture,eligible}=require('../selected-unread-main.js');
function fixture(){
 const chat={archive:false,unreadCount:0},proxy={};Object.defineProperties(proxy,{archive:{get:()=>chat.archive},unreadCount:{get:()=>chat.unreadCount},target:{value:chat}});
 const flags=new Set(['mwf-normal']),button={disabled:false},overlay={hidden:true},header={querySelectorAll:()=>[{getAttribute:()=> 'Search'}],get textContent(){throw Error('No private title reads');}},state={main:true};button.closest=()=>button;
 const calls=[],utils={unproxy:c=>c?.target||c};const cmd={trigger(kind,model,flag){calls.push({kind,model,flag});if(kind==='mark_chat_unread')model.unreadCount=-1;else state.main=false;},markChatUnread(c,b){this.trigger('mark_chat_unread',utils.unproxy(c),b);},closeChat(c){this.trigger('close_chat',utils.unproxy(c));}};
 const root={stateNode:null},rootHandle={current:root};root.stateNode=rootHandle;const owner={memoizedProps:{chat:proxy},return:root};root.child=owner;const host={stateNode:header,return:owner};owner.child=host;header.__reactFiber$fixture=host;
 const document={documentElement:{classList:{contains:k=>flags.has(k)}},getElementById:id=>id==='mirror-whatsapp-focus-overlay'?overlay:id==='mirror-whatsapp-focus-mark-unread'?button:null,
  querySelectorAll:()=>state.main?[header]:[],querySelector:s=>s==='#main'?(state.main?{}:null):s==='#side'?{}:null};
 const requireNative=name=>name==='WAWebStateUtils'?utils:{Cmd:cmd};return {chat,proxy,flags,button,overlay,header,state,calls,cmd,root,owner,host,document,requireNative};
}
test('canonical model capture reads committed header ancestors, not title, sidebar row or IDs',()=>{
 const f=fixture(),a=capture(f.document,f.requireNative);assert.equal(a.chat,f.chat);a.mark();assert.equal(f.calls[0].model,f.chat);assert.equal(f.calls[0].flag,true);a.close();assert.equal(f.state.main,false);
});
test('stale DOM fiber is resolved through root.current',()=>{
 const f=fixture();const owner={memoizedProps:{chat:f.proxy},child:{stateNode:f.header}};f.root.stateNode.current={child:owner};assert.equal(capture(f.document,f.requireNative).chat,f.chat);
});
test('ambiguous header model references fail before a native action',()=>{
 const f=fixture();f.owner.memoizedProps.chatModel={archive:false,unreadCount:0};assert.throws(()=>capture(f.document,f.requireNative));assert.equal(f.calls.length,0);
});
test('channel-like headers without a unique conversation search control fail before action',()=>{
 const f=fixture();f.header.querySelectorAll=()=>[];assert.throws(()=>capture(f.document,f.requireNative));assert.equal(f.calls.length,0);
});
test('parent cycles and overdeep/cyclic child graphs are bounded',()=>{
 const f=fixture();f.owner.return=f.owner;assert.throws(()=>capture(f.document,f.requireNative));
});
test('deep valid native ancestry remains supported',()=>{
 const f=fixture();for(let i=0;i<140;i++){const child=f.root.child,wrapper={return:f.root,child};child.return=wrapper;f.root.child=wrapper;}assert.equal(capture(f.document,f.requireNative).chat,f.chat);
});
test('native schema/API drift and missing/nonfinite unread fields cannot become success',()=>{
 const f=fixture(),a=capture(f.document,f.requireNative);f.chat.unreadCount=NaN;assert.throws(a.unread);assert.throws(()=>capture(f.document,f.requireNative));f.chat.unreadCount=0;f.cmd.markChatUnread=()=>{};assert.throws(()=>capture(f.document,f.requireNative));
});
test('focus conversation with hidden sidebar is allowed, blind/search/auth/transients are not',()=>{
 const f=fixture();f.flags.delete('mwf-normal');f.flags.add('mwf-active');f.flags.add('mwf-search-focused');assert.equal(eligible(f.document),true);
 f.overlay.hidden=false;assert.equal(eligible(f.document),false);f.overlay.hidden=true;for(const flag of ['mwf-searching','mwf-auth-surface','mwf-native-transient-open','mwf-channel-surface']){f.flags.add(flag);assert.equal(eligible(f.document),false);f.flags.delete(flag);}
});
function clock(){let time=0,id=0;const tasks=new Map();return {setTimeout(fn,ms){const key=id++;tasks.set(key,{fn,at:time+ms});return key;},clearTimeout:id=>tasks.delete(id),advance(ms){const end=time+ms;let n=0;while(true){const next=[...tasks].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;if(++n>1000)throw Error('loop');time=next[1].at;tasks.delete(next[0]);next[1].fn();}time=end;}};}
function bootstrap(){const f=fixture(),c=clock(),listeners=new Map(),sent=[];const ctx=vm.createContext({document:f.document,require:f.requireNative,setTimeout:c.setTimeout,clearTimeout:c.clearTimeout,addEventListener:(k,fn)=>listeners.set(k,fn),postMessage:m=>sent.push(m)});vm.runInContext('window=globalThis',ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../selected-unread-main.js'),'utf8'),ctx);
 const click=trusted=>listeners.get('click')({isTrusted:trusted,target:f.button});const request=(id=1,source=ctx.window,origin='https://web.whatsapp.com',channel='mwf-selected-unread-v1')=>listeners.get('message')({source,origin,data:{channel,direction:'command',command:'run',id}});return {f,c,ctx,listeners,sent,click,request};}
test('MAIN bridge refuses message-only/untrusted actions without invoking native commands',()=>{
 const h=bootstrap();h.request();h.click(false);h.request(2);assert.equal(h.f.calls.length,0);assert.equal(h.sent.at(-1).error,'unavailable');
});
test('trusted exact-button grant authorizes only one selected-chat transaction',()=>{
 const h=bootstrap();h.click(true);h.request();assert.deepEqual(h.f.calls.map(c=>c.kind),['mark_chat_unread','close_chat']);h.request(2);assert.equal(h.f.calls.length,2);h.c.advance(400);assert.ok(h.sent.some(m=>m.id===1&&m.ok===true));
});
test('expired grants, changed modes, foreign origins and wrong window source cannot mutate account state',()=>{
 const h=bootstrap();h.click(true);h.c.advance(1500);h.request();assert.equal(h.f.calls.length,0);h.click(true);h.request(2,{},'https://web.whatsapp.com');h.request(2,h.ctx.window,'https://evil.invalid');assert.equal(h.f.calls.length,0);h.f.flags.add('mwf-sidebar-open');h.request(2);assert.equal(h.f.calls.length,0);
});
test('busy presentation flag does not invalidate a legitimate captured click',()=>{
 const h=bootstrap();h.click(true);h.f.flags.add('mwf-mark-unread');h.request();assert.equal(h.f.calls.length,2);
});

function blind(h){h.f.flags.delete('mwf-normal');h.f.flags.add('mwf-active');h.f.flags.add('mwf-overlay-open');h.f.overlay.hidden=false;}
test('automatic overlay bridge only closes, with no mark API or trusted unread grant',()=>{const h=bootstrap();blind(h);h.f.cmd.markChatUnread=undefined;h.request(1,h.ctx.window,'https://web.whatsapp.com','mwf-overlay-close-v1');h.c.advance(300);assert.deepEqual(h.f.calls.map(c=>c.kind),['close_chat']);assert.equal(h.f.chat.unreadCount,0);assert.ok(h.sent.some(m=>m.channel==='mwf-overlay-close-v1'&&m.ok));});
test('overlay close rejects normal, visible focused, auth and channel contexts',()=>{for(const scope of ['normal','focused','auth','channel']){const h=bootstrap();if(scope!=='normal')blind(h);if(scope==='focused')h.f.overlay.hidden=true;if(scope==='auth')h.f.flags.add('mwf-auth-surface');if(scope==='channel')h.f.flags.add('mwf-channel-surface');h.request(1,h.ctx.window,'https://web.whatsapp.com','mwf-overlay-close-v1');assert.equal(h.f.calls.length,0,scope);}});
test('overlay close rejects a channel-like header even without its classifier flag',()=>{const h=bootstrap();blind(h);h.f.header.querySelectorAll=()=>[];h.request(1,h.ctx.window,'https://web.whatsapp.com','mwf-overlay-close-v1');assert.equal(h.f.calls.length,0);assert.equal(h.sent.at(-1).error,'unavailable');});
test('empty overlay acknowledges closure without touching native commands',()=>{const h=bootstrap();blind(h);h.f.state.main=false;h.request(1,h.ctx.window,'https://web.whatsapp.com','mwf-overlay-close-v1');assert.equal(h.f.calls.length,0);assert.equal(h.sent.at(-1).ok,true);});
test('automatic close capability does not grant unread capability',()=>{const h=bootstrap();blind(h);h.request();assert.equal(h.f.calls.length,0);assert.equal(h.sent.at(-1).error,'unavailable');});
