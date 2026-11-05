const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8');
function extract(name){const start=source.indexOf(`  function ${name}(`);assert.notEqual(start,-1);return source.slice(start,source.indexOf('\n  function ',start+1));}
function harness({surface='conversation',recents=['Current','Other'],auth=false}={}){
 const flags=new Set(),events=[],pending=[],nodes=new Map();let main={};
 const classList={contains:k=>flags.has(k),add:(...ks)=>ks.forEach(k=>flags.add(k)),remove:(...ks)=>ks.forEach(k=>flags.delete(k)),toggle:(k,on)=>on?flags.add(k):flags.delete(k)};
 const overlay={hidden:true,classList:{remove(){},toggle(){}},querySelectorAll:()=>[],querySelector:()=>({prepend:n=>nodes.set(n.id,n)})};
 const context=vm.createContext({overlayCloseEpoch:0,overlayCloseAttempts:new WeakSet(),overlayCloseTransport:{cancel(){},run(){assert.equal(overlay.hidden,false);assert.ok(flags.has('ROOT_OVERLAY_OPEN'));events.push('close-request');return new Promise(resolve=>pending.push(resolve));}},
  document:{querySelector:()=>main,getElementById:id=>nodes.get(id),createElement:()=>({setAttribute(){},remove(){nodes.delete(this.id);}})},
  root:()=>({classList}),getOverlay:()=>overlay,authSurface:{isActive:()=>auth},nativeSurface:{inspect:()=>surface},readActiveConversationTitle:()=>{events.push('read-title');return 'Current';},focusedRecents:[...recents],
  surfaceExpiry:{cancel(){events.push('cancel-expiry');},refresh(){}},recentCaptureToken:0,normalAttemptStartedAt:null,intentPromptStartedAt:null,
  markUnread:{reconcile(){}},updateUnreadSidebarBlock(){},updateMarkUnreadButton(){},updateFocusedNavigationShelfVisibility(){},isSearching:()=>false,isWhatsAppReady:()=>true,hasOpenConversation:()=>!!main,
 });
 for(const name of [...source.matchAll(/\bROOT_[A-Z_]+\b/g)].map(m=>m[0]))context[name]=name;
 for(const name of ['closeFixedCollectionChooser','clearNormalDelay','updateFocusStreak','ensureOverlay','ensureReturnButton','ensureSidebarButton','ensureSearchAgainButton','ensureSearchGateMessage','ensureFocusedRecentsShelf','ensureAddCollectionButton','ensureFixedCollectionChooser','renderFocusedRecents','renderFixedCollections'])context[name]=()=>{};
 context.addFocusedRecent=title=>{events.push('add-recent');context.focusedRecents.unshift(title);};
 vm.runInContext(extract('closeConversationForOverlay')+'\n'+extract('setActive')+'\n'+extract('updateOverlayState'),context);
 return {context,events,overlay,flags,pending,nodes,enter:()=>context.setActive({showOverlay:true}),surface:v=>{surface=v;},main:v=>{main=v;},update:()=>context.updateOverlayState()};
}
test('blind entry masks first, requests close, and does not reorder existing recents',()=>{const h=harness();h.enter();assert.deepEqual([...h.context.focusedRecents],['Current','Other']);assert.deepEqual(h.events,['read-title','cancel-expiry','close-request']);assert.equal(h.overlay.hidden,false);});
test('just-opened chat with pending capture is retained once for reopening',()=>{const h=harness({recents:['Other']});h.enter();assert.deepEqual([...h.context.focusedRecents],['Current','Other']);h.enter();assert.equal(h.events.filter(x=>x==='add-recent').length,1);});
test('visible focus does not close a conversation',()=>{const h=harness();h.context.setActive({showOverlay:false});assert.equal(h.pending.length,0);assert.equal(h.overlay.hidden,true);});
test('channel, Status, unknown and authentication transitions never request conversation close',()=>{for(const surface of ['channel','status-player','unknown']){const h=harness({surface});h.enter();assert.equal(h.pending.length,0,surface);}const h=harness({auth:true});h.enter();assert.equal(h.pending.length,0);});
test('failed closure leaves persistent warning, not a claim of deselection',async()=>{const h=harness();h.enter();h.pending[0]({ok:false,error:'close'});await Promise.resolve();assert.equal(h.overlay.hidden,false);const warning=h.nodes.get('mirror-whatsapp-focus-overlay-close-warning');assert.match(warning.textContent,/pode continuar ativa/);});
test('late error cannot contaminate a newer overlay entry or a resumed view',async()=>{const h=harness();h.enter();h.surface('channel');h.enter();h.pending[0]({ok:false,error:'close'});await Promise.resolve();assert.equal(h.nodes.size,0);const next=harness();next.enter();next.overlay.hidden=true;next.pending[0]({ok:false,error:'close'});await Promise.resolve();assert.equal(next.nodes.size,0);});
test('restoration after blind boot closes once, without mutation-observer retries',()=>{const h=harness({surface:'unknown'});h.enter();h.surface('conversation');h.update();h.update();h.update();assert.equal(h.pending.length,1);});
test('all three Continue locations are now channel-only; no conversation fallback remains',()=>{assert.doesNotMatch(source,/data-mwf-action="continue">Continuar na conversa/);assert.equal((source.match(/data-mwf-action="continue">Continuar no canal/g)||[]).length,3);assert.doesNotMatch(extract('continueOpenConversation'),/setActive|setSearchFocusedConversation|captureFocusedConversation|goToMainChatsThen/);});
test('visible expiry destination is unchanged and does not call blind-close helper',()=>{assert.doesNotMatch(extract('setSearchFocusedConversation'),/closeConversationForOverlay/);assert.match(source,/onConversation: setSearchFocusedConversation/);assert.match(source,/onBlind: \(\) => setActive\(\{showOverlay:true\}\)/);});
