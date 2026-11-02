(function(scope) {
  'use strict';
  const CHANNEL='mwf-selected-unread-v1', ERRORS=['unavailable','mark','close','verify'];
  function createTransport({window,scheduler,hasMain}) {
    let pending=null,sequence=0,running=true;
    const send=(command,id)=>{try {window.postMessage({channel:CHANNEL,direction:'command',command,id},'https://web.whatsapp.com');return true;}catch(_){return false;}};
    function finish(result) {
      const op=pending;if(!op)return;pending=null;scheduler.clearTimeout(op.timer);op.resolve(result);
    }
    function cancel() { if(!pending)return;send('cancel',pending.id);finish({ok:false,cancelled:true,closed:!hasMain()}); }
    function receive(event) {
      const m=event.data;
      if(event.source!==window||event.origin!=='https://web.whatsapp.com'||!pending||!m||m.channel!==CHANNEL||m.direction!=='result'||m.id!==pending.id||typeof m.ok!=='boolean'||typeof m.closed!=='boolean')return;
      if(m.ok&&(!m.closed||m.cancelled||m.error!==undefined))return;
      if(m.error!==undefined&&!ERRORS.includes(m.error))return;
      if(m.cancelled!==undefined&&typeof m.cancelled!=='boolean')return;
      if(!m.ok&&!m.cancelled&&!ERRORS.includes(m.error))return;
      finish({ok:m.ok,closed:m.closed,...(m.cancelled?{cancelled:true}:{}),...(m.error?{error:m.error}:{})});
    }
    function run() {
      if(!running||pending||sequence>=Number.MAX_SAFE_INTEGER)return Promise.resolve({ok:false,error:'unavailable',closed:false});
      return new Promise(resolve=>{
        const op={id:++sequence,resolve,timer:null};pending=op;
        op.timer=scheduler.setTimeout(()=>{if(pending!==op)return;send('cancel',op.id);finish({ok:false,error:'verify',closed:!hasMain()});},6500);
        if(!send('run',op.id))finish({ok:false,error:'unavailable',closed:false});
      });
    }
    function dispose(){if(!running)return;cancel();running=false;window.removeEventListener('message',receive);}
    window.addEventListener('message',receive);window.addEventListener('pagehide',dispose,{once:true});
    return {run,cancel,dispose};
  }
  function createMarkUnreadAction({transport,canStart,stillAllowed,onBegin,onEnd,onBusy,onResult}) {
    let current=null,running=true;
    function cancel() {
      const op=current;if(!op)return;current=null;transport.cancel();
      onEnd({ok:false,cancelled:true});onBusy(false);
    }
    function reconcile(){if(current&&!stillAllowed())cancel();}
    async function run() {
      if(!running||current||!canStart())return {ok:false,error:'unavailable',closed:false};
      const op={};current=op;let result;
      try {
        onBegin();onBusy(true);
        if(!stillAllowed()){cancel();return {ok:false,cancelled:true};}
        result=await transport.run();
      } catch (_) {result={ok:false,error:'unavailable',closed:false};}
      if(current!==op)return {ok:false,cancelled:true};
      if(!stillAllowed()){cancel();return {ok:false,cancelled:true};}
      current=null;onEnd(result);onBusy(false);
      if(!result.cancelled)onResult(result);
      return result;
    }
    function dispose(){cancel();running=false;transport.dispose();}
    return {run,cancel,reconcile,dispose,isBusy:()=>!!current};
  }
  const api={createTransport,createMarkUnreadAction};scope.MirrorMarkUnread=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
