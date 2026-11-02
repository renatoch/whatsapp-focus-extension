/* Isolated world: a contextual toggle; bridge messages never carry chat data. */
(function(scope) {
  'use strict';
  const CHANNEL='mwf-archived-unread-v1', BUTTON='mirror-whatsapp-focus-archive-unread', EMPTY='mirror-whatsapp-focus-archive-empty', ERROR='mirror-whatsapp-focus-archive-error';
  function allowed(document) {
    const c=document.documentElement?.classList;
    return !!c && (c.contains('mwf-normal') || c.contains('mwf-sidebar-open')) &&
      !['mwf-active','mwf-overlay-open','mwf-auth-surface','mwf-channel-surface','mwf-expired-status','mwf-mark-unread'].some(k=>c.contains(k)) &&
      !!document.querySelector('#side') && !!document.querySelector('[data-testid="archived-drawer"]');
  }
  function createUi(window,document) {
    let drawer=null, button=null, empty=null, errorNode=null, errorTimer=null, pending=null, attempts=0, received=false, hadList=false, lastError=false, busy=false, retry=null, acknowledgement=null, disposed=false, epoch=1;
    let state={available:false,active:false,empty:false,error:false};
    const send=(command,extra={})=>window.postMessage({channel:CHANNEL,direction:'command',command,epoch,...extra},'https://web.whatsapp.com');
    function schedule() { if(!disposed && pending===null) pending=window.setTimeout(()=>{pending=null;refresh();},40); }
    function setStyle(node,values) { for(const [k,v] of Object.entries(values)) if(node.style[k]!==v) node.style[k]=v; }
    function clearError() { errorNode?.remove(); errorNode=null; if(errorTimer!==null) window.clearTimeout(errorTimer); errorTimer=null; }
    function reportError() {
      clearError(); if(!document.body) return;
      errorNode=document.createElement('div'); errorNode.id=ERROR; errorNode.setAttribute('role','alert');
      const text=document.createElement('span'); text.textContent='Filtro de não lidas indisponível. Abra Arquivadas novamente.';
      const close=document.createElement('button'); close.type='button'; close.textContent='Fechar';close.addEventListener('click',clearError);
      errorNode.append(text,close);document.body.appendChild(errorNode);errorTimer=window.setTimeout(clearError,5000);
    }
    function removeControls() { button?.remove();empty?.remove();button=null;empty=null; }
    function clearPending() {
      if(retry!==null) window.clearTimeout(retry);retry=null;
      if(acknowledgement!==null) window.clearTimeout(acknowledgement);acknowledgement=null;
    }
    function refresh() {
      if(disposed) return;
      if(!allowed(document)) {
        removeControls();
        if(drawer) { drawer=null; send('release');epoch++; }
        clearPending();received=false;attempts=0;busy=false;hadList=false;
        return;
      }
      const next=document.querySelector('[data-testid="archived-drawer"]');
      const hasList=!!next.querySelector('[data-testid="archived-chatlist"]');
      if(next!==drawer) { if(drawer) send('release'); epoch++;clearPending();drawer=next;received=false;attempts=0;state={available:false,active:false,empty:false,error:false};lastError=false; }
      if(hasList&&!hadList&&!state.active) {received=false;attempts=0;}
      hadList=hasList;
      if(!received&&attempts<3) { attempts++; send('probe'); if(attempts<3&&retry===null) retry=window.setTimeout(()=>{retry=null;schedule();},250); }
      if(!state.available) { removeControls();return; }
      const rect=drawer.getBoundingClientRect();
      if(rect.width<280 || rect.height<100) { removeControls();return; }
      if(!button) {
        button=document.createElement('button');button.id=BUTTON;button.type='button';button.textContent='Não lidas';
        button.title='Filtrar conversas arquivadas não lidas';button.setAttribute('aria-label',button.title);
        button.addEventListener('click',event=>{
          if(!event.isTrusted||busy||!allowed(document)) return;
          busy=true;button.disabled=true;button.setAttribute('aria-busy','true');send('set',{active:!state.active});
          acknowledgement=window.setTimeout(()=>{
            acknowledgement=null;if(disposed||!busy) return;
            busy=false;state={available:false,active:false,empty:false,error:true};send('release');reportError();schedule();
          },1800);
        });document.body.appendChild(button);
      }
      const pressed=String(state.active);if(button.getAttribute('aria-pressed')!==pressed) button.setAttribute('aria-pressed',pressed);
      if(button.disabled!==busy) button.disabled=busy;
      if(button.getAttribute('aria-busy')!==String(busy)) button.setAttribute('aria-busy',String(busy));
      setStyle(button,{left:`${Math.round(rect.right-114)}px`,top:`${Math.round(rect.top+12)}px`});
      if(state.active&&state.empty) {
        if(!empty) { empty=document.createElement('div');empty.id=EMPTY;empty.setAttribute('role','status');empty.setAttribute('aria-live','polite');empty.textContent='Não há conversas arquivadas não lidas.';document.body.appendChild(empty); }
        setStyle(empty,{left:`${Math.round(rect.left)}px`,top:`${Math.round(rect.top+72)}px`,width:`${Math.round(rect.width)}px`,height:`${Math.max(0,Math.round(rect.height-72))}px`});
      } else {empty?.remove();empty=null;}
    }
    function message(event) {
      const m=event.data;
      if(disposed||event.source!==window||event.origin!=='https://web.whatsapp.com'||!m||m.channel!==CHANNEL||m.direction!=='status'||m.epoch!==epoch||!['available','active','empty','error'].every(k=>typeof m[k]==='boolean')) return;
      if(acknowledgement!==null) window.clearTimeout(acknowledgement);acknowledgement=null;
      if(retry!==null) window.clearTimeout(retry);retry=null;
      received=true;busy=false;state={available:m.available,active:m.active,empty:m.empty,error:m.error};
      if(state.error&&!lastError) reportError();lastError=state.error;schedule();
    }
    function dispose() {
      disposed=true;clearPending();if(pending!==null) window.clearTimeout(pending);pending=null;removeControls();clearError();send('release');window.removeEventListener('message',message);
    }
    window.addEventListener('message',message);
    return {refresh,schedule,dispose};
  }
  function boot(window,document) {
    const ui=createUi(window,document);let observer,rootObserver,stopped=false;
    const start=()=>{if(stopped) return;observer=new MutationObserver(ui.schedule);observer.observe(document.documentElement,{childList:true,subtree:true});rootObserver=new MutationObserver(ui.schedule);rootObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class']});ui.refresh();};
    if(document.documentElement) start();else window.addEventListener('DOMContentLoaded',start,{once:true});
    window.addEventListener('resize',ui.schedule);
    window.addEventListener('pagehide',()=>{stopped=true;observer?.disconnect();rootObserver?.disconnect();window.removeEventListener('resize',ui.schedule);ui.dispose();},{once:true});
  }
  if(typeof window==='undefined' && typeof module!=='undefined' && module.exports) module.exports={allowed,createUi};
  if(scope.window===scope && scope.document) boot(scope,scope.document);
})(globalThis);
