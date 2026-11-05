/* Fixed selected-chat unread action and blind-overlay close-only action in MAIN. */
(function(scope) {
  'use strict';
  const CHANNEL='mwf-selected-unread-v1', BUTTON='mirror-whatsapp-focus-mark-unread';
  const MODE=['mwf-active','mwf-normal','mwf-searching','mwf-search-focused','mwf-sidebar-open','mwf-sidebar-hidden','mwf-overlay-open','mwf-opening-recent'];
  function signature(document) { return MODE.map(k=>document.documentElement.classList.contains(k)).join(':'); }
  function eligible(document) {
    const root=document.documentElement,overlay=document.getElementById('mirror-whatsapp-focus-overlay');
    return !!root && overlay?.hidden===true && !!document.querySelector('#side') &&
      !['mwf-auth-surface','mwf-overlay-open','mwf-searching','mwf-opening-recent','mwf-native-transient-open','mwf-channel-surface','mwf-expired-status'].some(k=>root.classList.contains(k));
  }
  const OVERLAY_CHANNEL='mwf-overlay-close-v1';
  function overlayEligible(document) {
    const classes=document.documentElement?.classList;
    return !!classes && classes.contains('mwf-active') && classes.contains('mwf-overlay-open') &&
      document.getElementById('mirror-whatsapp-focus-overlay')?.hidden===false && !!document.querySelector('#side') &&
      !['mwf-normal','mwf-searching','mwf-opening-recent','mwf-auth-surface','mwf-channel-surface','mwf-expired-status'].some(k=>classes.contains(k));
  }
  function capture(document,requireNative,closeOnly=false) {
    const headers=[...document.querySelectorAll('#main [data-testid="conversation-header"]')];
    if(headers.length!==1) throw Error('unavailable');
    const header=headers[0];
    const search=[...header.querySelectorAll('button[aria-label]')].filter(b=>['Pesquisar','Buscar','Search'].includes(b.getAttribute('aria-label')));
    if(search.length!==1)throw Error('unavailable');
    const key=Object.getOwnPropertyNames(header).find(k=>k.startsWith('__reactFiber$'));
    let top=key&&header[key];if(!top) throw Error('unavailable');
    const seen=new Set();let climbs=0;
    while(top.return) { if(++climbs>512||seen.has(top)) throw Error('unavailable');seen.add(top);top=top.return; }
    const root=top.stateNode?.current;if(!root) throw Error('unavailable');
    const unproxy=requireNative('WAWebStateUtils').unproxy;
    const cmd=requireNative('WAWebCmd').Cmd;
    if(typeof unproxy!=='function'||typeof cmd?.closeChat!=='function') throw Error('unavailable');
    const closeSource=Function.prototype.toString.call(cmd.closeChat);
    if(!closeSource.includes('unproxy(')||!closeSource.includes('.trigger(')) throw Error('unavailable');
    if(!closeOnly) {
      if(typeof cmd.markChatUnread!=='function')throw Error('unavailable');
      const markSource=Function.prototype.toString.call(cmd.markChatUnread);
      if(!markSource.includes('mark_chat_unread')||!markSource.includes('unproxy('))throw Error('unavailable');
    }
    const stack=[[root,[]]];let visits=0,hits=0,models;
    while(stack.length) {
      if(++visits>20000) throw Error('unavailable');
      const [f,inherited]=stack.pop();let next=inherited;
      for(const key of ['chat','chatModel','model']) {
        const candidate=f.memoizedProps?.[key];
        if(candidate&&typeof candidate.archive==='boolean'&&Number.isFinite(candidate.unreadCount)) {
          const canonical=unproxy(candidate);
          if(!next.includes(canonical)) next=[...next,canonical];
        }
      }
      if(f.stateNode===header) { hits++;models=next; }
      for(let c=f.child;c;c=c.sibling) { if(stack.length>=20000) throw Error('unavailable');stack.push([c,next]); }
    }
    if(hits!==1||models?.length!==1) throw Error('unavailable');
    const chat=models[0];
    return {chat, archived:chat.archive, unread:()=>{if(!Number.isFinite(chat.unreadCount))throw Error('unavailable');return chat.unreadCount!==0;},
      mark:()=>cmd.markChatUnread(chat,true),close:()=>cmd.closeChat(chat)};
  }
  function createTransaction({captureCurrent,hasMain,allowed,mode,scheduler,notify,closeOnly=false}) {
    let current=null,running=true;
    function finish(op,result) {
      if(current!==op) return;
      current=null;if(op.timer!==null)scheduler.clearTimeout(op.timer);
      op.target=null;notify(op.id,result);
    }
    function cancel(id) { const op=current;if(!op||id&&op.id!==id)return;finish(op,{ok:false,cancelled:true,closed:!hasMain()}); }
    function valid(op) { return running&&current===op&&allowed()&&mode()===op.mode; }
    function verify(op) {
      if(!valid(op)) {cancel(op.id);return;}
      try {
        let closing=hasMain();
        if(closing) {
          let selected=null;try {selected=captureCurrent();}catch(_){}
          if(selected&&selected.chat!==op.target.chat){cancel(op.id);return;}
        }
        if(op.target.chat.archive!==op.target.archived) {cancel(op.id);return;}
        const unread=closeOnly||op.target.unread();op.stable=!closing&&unread?op.stable+1:0;
        if(op.stable>=2){finish(op,{ok:true,closed:true});return;}
        if(++op.attempts>=50){finish(op,{ok:false,error:closing?'close':'verify',closed:!closing});return;}
        op.timer=scheduler.setTimeout(()=>{op.timer=null;verify(op);},100);
      } catch (_) {finish(op,{ok:false,error:'verify',closed:!hasMain()});}
    }
    function run(id,target,expectedMode) {
      if(!running||current||!target||!allowed()||mode()!==expectedMode) {notify(id,{ok:false,error:'unavailable',closed:false});return;}
      const op={id,target,mode:expectedMode,timer:null,stable:0,attempts:0};current=op;
      let marked=false;
      try {
        if(captureCurrent().chat!==target.chat) {cancel(id);return;}
        if(!closeOnly&&!target.unread()) target.mark();
        marked=true;
        // No await between mark and targeted close: unread confirmation comes AFTER.
        if(hasMain()) {
          if(captureCurrent().chat!==target.chat) {cancel(id);return;}
          target.close();
        }
        op.timer=scheduler.setTimeout(()=>{op.timer=null;verify(op);},100);
      } catch (_) {finish(op,{ok:false,error:(closeOnly||marked)?'close':'mark',closed:!hasMain()});}
    }
    function dispose(){cancel();running=false;}
    return {run,cancel,dispose,isBusy:()=>!!current};
  }
  function boot(window,document) {
    let grant=null,grantTimer=null,stopped=false;
    const post=(id,result)=>window.postMessage({channel:CHANNEL,direction:'result',id,...result},'https://web.whatsapp.com');
    const transaction=createTransaction({captureCurrent:()=>capture(document,n=>window.require(n)),hasMain:()=>!!document.querySelector('#main'),allowed:()=>eligible(document),mode:()=>signature(document),scheduler:window,notify:post});
    // Automatic but close-only capability: available ONLY behind the blind overlay.
    // It cannot mark unread/read, select a target, open a chat or operate on channels.
    const overlayPost=(id,result)=>window.postMessage({channel:OVERLAY_CHANNEL,direction:'result',id,...result},'https://web.whatsapp.com');
    const overlayTransaction=createTransaction({captureCurrent:()=>capture(document,n=>window.require(n),true),hasMain:()=>!!document.querySelector('#main'),allowed:()=>overlayEligible(document),mode:()=>signature(document),scheduler:window,notify:overlayPost,closeOnly:true});
    const clearGrant=()=>{grant=null;if(grantTimer!==null)window.clearTimeout(grantTimer);grantTimer=null;};
    window.addEventListener('click',event=>{
      const button=event.target?.closest?.('#'+BUTTON);
      if(!event.isTrusted||!button||button!==document.getElementById(BUTTON)||button.disabled||transaction.isBusy()||!eligible(document))return;
      clearGrant();
      try {grant={target:capture(document,n=>window.require(n)),mode:signature(document)};}catch(_){grant=null;}
      grantTimer=window.setTimeout(clearGrant,1500);
    },true);
    window.addEventListener('message',event=>{
      const m=event.data;
      if(stopped||event.source!==window||event.origin!=='https://web.whatsapp.com'||!m||![CHANNEL,OVERLAY_CHANNEL].includes(m.channel)||m.direction!=='command'||!Number.isSafeInteger(m.id)||m.id<1)return;
      if(m.channel===OVERLAY_CHANNEL) {
        if(m.command==='cancel'){overlayTransaction.cancel(m.id);return;}
        if(m.command!=='run')return;
        if(!overlayEligible(document)){overlayPost(m.id,{ok:false,error:'unavailable',closed:false});return;}
        clearGrant();transaction.cancel();
        if(!document.querySelector('#main')){overlayPost(m.id,{ok:true,closed:true});return;}
        try {overlayTransaction.run(m.id,capture(document,n=>window.require(n),true),signature(document));}
        catch(_){overlayPost(m.id,{ok:false,error:'unavailable',closed:false});}
        return;
      }
      if(m.command==='cancel'){clearGrant();transaction.cancel(m.id);return;}
      if(m.command!=='run')return;
      const permit=grant;clearGrant();
      if(!permit){post(m.id,{ok:false,error:'unavailable',closed:false});return;}
      transaction.run(m.id,permit.target,permit.mode);
    });
    window.addEventListener('pagehide',()=>{stopped=true;clearGrant();transaction.dispose();overlayTransaction.dispose();},{once:true});
  }
  if(typeof window==='undefined'&&typeof module!=='undefined'&&module.exports)module.exports={capture,signature,eligible,overlayEligible,createTransaction};
  if(scope.window===scope&&scope.document)boot(scope,scope.document);
})(globalThis);
