/* MAIN-world adapter: only local presentation state is writable, never chat models. */
(function(scope) {
  'use strict';
  const CHANNEL = 'mwf-archived-unread-v1', LIMIT = 20000;
  function same(a,b) { return a.length === b.length && a.every((v,i) => v === b[i]); }
  function walk(start, predicate) {
    const stack=[start], found=[]; let visited=0;
    while(stack.length) {
      if(++visited > LIMIT) throw Error('schema');
      const node=stack.pop(); if(!node) continue;
      if(predicate(node)) found.push(node);
      let child=node.child;
      while(child) { if(stack.length >= LIMIT) throw Error('schema'); stack.push(child); child=child.sibling; }
    }
    return found;
  }
  function allowed(document) {
    const c=document.documentElement?.classList;
    return !!c && (c.contains('mwf-normal') || c.contains('mwf-sidebar-open')) &&
      !['mwf-active','mwf-overlay-open','mwf-auth-surface','mwf-channel-surface','mwf-expired-status','mwf-mark-unread'].some(k=>c.contains(k)) &&
      !!document.querySelector('#side') && !!document.querySelector('[data-testid="archived-drawer"]');
  }
  function discover(document, requireNative) {
    const list=document.querySelector('[data-testid="archived-chatlist"]');
    if(!list) throw Error('schema');
    const key=Object.getOwnPropertyNames(list).find(k=>k.startsWith('__reactFiber$'));
    let fiber=key && list[key], candidate;
    for(let i=0;fiber && i<24;i++,fiber=fiber.return) {
      if(typeof fiber.type !== 'function') continue;
      const text=Function.prototype.toString.call(fiber.type);
      if(text.includes('WAWebChatCollection') && text.includes('WAWebDrawerHeader.react') && text.includes('WAWebFlatList.react')) { candidate=fiber; break; }
    }
    if(!candidate) throw Error('schema');
    let top=candidate, climbs=0; const parents=new Set();
    while(top.return) { if(++climbs>512 || parents.has(top)) throw Error('schema'); parents.add(top);top=top.return; }
    const root=top.stateNode, type=candidate.type, close=candidate.memoizedProps.onClose;
    let targetQueue=null;
    const drawer=document.querySelector('[data-testid="archived-drawer"]');
    function owner() {
      if(document.querySelector('[data-testid="archived-drawer"]') !== drawer) return null;
      const matches=walk(root?.current,n=>{
        if(n.type!==type) return false;
        if(!targetQueue) return n.memoizedProps?.onClose===close;
        let h=n.memoizedState;
        for(let i=0;h && i<60;i++,h=h.next) if(h.queue===targetQueue) return true;
        return false;
      });
      if(matches.length !== 1) return null;
      return matches[0];
    }
    function hooks() {
      const o=owner(); if(!o) throw Error('detached');
      const result=[]; let h=o.memoizedState;
      for(let i=0;h && i<60;i++,h=h.next) result.push(h);
      if(h) throw Error('schema');
      return result;
    }
    const o=owner(); if(!o) throw Error('schema');
    const renderers=walk(o,n=>n.memoizedProps?.testid==='archived-chatlist' && Array.isArray(n.memoizedProps.data) && typeof n.memoizedProps.renderItem==='function');
    if(renderers.length !== 1) throw Error('schema');
    const renderer=renderers[0], models=renderer.memoizedProps.data.map(e=>e?.chat);
    const valid=models=>Array.isArray(models) && models.length<=LIMIT && models.every(c=>c && c.archive===true && Number.isFinite(c.unreadCount));
    if(!models.length || !valid(models)) throw Error('schema');
    const states=hooks().filter(h=>Array.isArray(h.memoizedState) && typeof h.queue?.dispatch==='function' && same(h.memoizedState,models));
    const getters=hooks().filter(h=>{
      const s=h.memoizedState; if(!Array.isArray(s) || typeof s[0]!=='function') return false;
      const t=Function.prototype.toString.call(s[0]);
      return t.includes('ChatCollection.filter') && t.includes('getShouldAppearInList') && t.includes('.archive') && !/\.(?:setVal|set|unset|dispatch|send|markRead|openChat)\(/.test(t);
    });
    if(states.length!==1 || getters.length!==1) throw Error('schema');
    const queue=states[0].queue, get=getters[0].memoizedState[0]; targetQueue=queue;
    function source() { const a=get(); if(!valid(a)) throw Error('schema'); return a; }
    if(!same(source(),models)) throw Error('schema');
    const matcher=requireNative('WAWebChatMessageSearch').matchFilter;
    const kind=requireNative('WAWebChatSearchFilters').SearchFilters?.UNREAD;
    const collection=requireNative('WAWebChatCollection').ChatCollection;
    if(typeof matcher!=='function' || kind==null || typeof collection?.on!=='function' || typeof collection?.off!=='function') throw Error('schema');
    const element=renderer.memoizedProps.renderItem(renderer.memoizedProps.data[0],0);
    const selection=element?.props?.active;
    if(typeof selection?.getVal!=='function') throw Error('schema');
    function current() {
      const candidates=hooks().filter(h=>h.queue===queue && Array.isArray(h.memoizedState));
      if(candidates.length!==1 || !valid(candidates[0].memoizedState)) throw Error('schema');
      return candidates[0].memoizedState;
    }
    return {drawer, connected:()=>drawer.isConnected!==false && document.querySelector('[data-testid="archived-drawer"]')===drawer, attached:()=>!!owner(), source, current, set:rows=>queue.dispatch(rows),
      reset:()=>{ if(document.querySelector('[data-testid="archived-drawer"]')===drawer && typeof close==='function') close(); },
      unread:chat=>{const value=matcher(chat,{kind}); if(typeof value!=='boolean') throw Error('schema'); return value;},
      selected:()=>selection.getVal(),
      subscribe:fn=>{
        const events=['change:unreadCount','change:archive','sort','add','remove','reset','change:capiThreadControl','change:isAiHandoff','change:labels'];
        const registered=[];
        try { for(const event of events) { collection.on(event,fn); registered.push(event); } }
        catch(error) { for(const event of registered) { try { collection.off(event,fn); } catch (_) {} } throw error; }
        return ()=>{ let failed=false;for(const event of registered) { try { collection.off(event,fn); } catch (_) { failed=true; } }if(failed) throw Error('cleanup'); };
      }};
  }
  function createController({getAdapter, inScope, notify, now=Date.now}) {
    let adapter=null, active=false, stop=null, error=false, empty=false, previous=[], sticky=new Set(), writes=[];
    function status() { return {available:!!adapter,active,empty,error}; }
    function emit() { notify(status()); }
    function release(failed=false) {
      const old=adapter; adapter=null; active=false; empty=false; error=failed; previous=[]; sticky.clear(); writes=[];
      const off=stop; stop=null;
      try { off?.(); } catch (_) { error=true; }
      // Restore through the exact captured source/setter, never search for a new owner.
      try { if(old?.attached()) { const all=old.source(); if(!same(old.current(),all)) old.set(all); } }
      catch (_) { error=true; try { old?.reset?.(); } catch (_) {} }
      emit();
    }
    function reconcile() {
      if(!adapter) return;
      try {
        if(!inScope()) { release(); return; }
        if(!active) { if(!(adapter.connected ? adapter.connected() : adapter.attached())) release(); return; }
        if(!adapter.attached()) { release(); return; }
        const all=adapter.source(), selected=adapter.selected();
        if(selected && previous.includes(selected)) sticky.add(selected);
        const present=new Set(all); for(const chat of sticky) if(!present.has(chat)) sticky.delete(chat);
        const filtered=all.filter(chat=>adapter.unread(chat) || sticky.has(chat));
        if(!same(adapter.current(),filtered)) {
          const time=now(); writes=writes.filter(t=>time-t<1000);
          if(writes.length>=6) throw Error('unstable');
          writes.push(time); adapter.set(filtered);
        }
        previous=filtered; empty=filtered.length===0; emit();
      } catch (_) { release(true); }
    }
    function probe() {
      if(adapter) { reconcile(); if(adapter) { emit(); return; } }
      if(!inScope()) { emit(); return; }
      try { adapter=getAdapter(); error=false; emit(); } catch (_) { adapter=null; error=false; emit(); }
    }
    function toggle(value, onChange) {
      if(!value) { release(); probe(); return; }
      if(!adapter) probe();
      if(!adapter || !inScope()) return;
      if(active) { emit(); return; }
      active=true;
      try { stop=adapter.subscribe(onChange); reconcile(); } catch (_) { release(true); }
    }
    return {status,probe,toggle,reconcile,release};
  }
  function boot(window,document) {
    let timer=null, controller, last='', stopped=false, roots=null, epoch=0;
    const post=status=>{
      const text=JSON.stringify(status); if(text===last) return; last=text;
      window.postMessage({channel:CHANNEL,direction:'status',epoch,...status},'https://web.whatsapp.com');
    };
    const schedule=()=>{ if(timer===null && !stopped) timer=window.setTimeout(()=>{timer=null;controller.reconcile();},40); };
    controller=createController({getAdapter:()=>discover(document,name=>window.require(name)),inScope:()=>allowed(document),notify:post});
    window.addEventListener('message',event=>{
      const m=event.data;
      if(event.source!==window || event.origin!=='https://web.whatsapp.com' || !m || m.channel!==CHANNEL || m.direction!=='command') return;
      if(stopped || !Number.isSafeInteger(m.epoch) || m.epoch<1) return;
      if(m.command==='probe') { epoch=m.epoch; last=''; controller.probe(); }
      else if(m.epoch===epoch && m.command==='set' && typeof m.active==='boolean') { last=''; controller.toggle(m.active,schedule); }
      else if(m.epoch===epoch && m.command==='release') controller.release();
    });
    const observer=new MutationObserver(()=>{ if(controller.status().available) schedule(); });
    const attach=()=>{ if(stopped || !document.documentElement) return; observer.observe(document.documentElement,{subtree:true,childList:true});
      roots=new MutationObserver(schedule); roots.observe(document.documentElement,{attributes:true,attributeFilter:['class']}); };
    if(document.documentElement) attach(); else window.addEventListener('DOMContentLoaded',attach,{once:true});
    window.addEventListener('pagehide',()=>{stopped=true; if(timer!==null) window.clearTimeout(timer); observer.disconnect(); roots?.disconnect();controller.release();},{once:true});
  }
  if(typeof window==='undefined' && typeof module!=='undefined' && module.exports) module.exports={same,walk,allowed,discover,createController};
  if(scope.window===scope && scope.document) boot(scope,scope.document);
})(globalThis);
