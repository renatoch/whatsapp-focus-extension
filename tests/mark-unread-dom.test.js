const test=require('node:test'),assert=require('node:assert/strict');
const {createUnreadDom}=require('../mark-unread.js');
function button(label,{disabled=false,annotation=''}={}){return {isConnected:true,disabled,textContent:label+annotation,clicks:0,
 getAttribute:()=>null,querySelectorAll:()=>[{textContent:label}],click(){this.clicks++;}};}
function harness(items=[]){
 const menus=[{closest:()=>null,querySelector:()=>items[0]||null,querySelectorAll:()=>items}],header=button('menu');
 const document={querySelector:s=>s==='#main'?{}:null,querySelectorAll:s=>s==='[role="menu"]'?menus:s.includes('conversation-header')?[header]:[]};
 const dom=createUnreadDom({document,window:{MouseEvent:class{constructor(type,options){this.type=type;this.options=options;}}},isVisible:e=>!e.hidden,readHeader:()=> 'Private title'});
 return {dom,menus,header};
}
test('exact native menu label descendants support shortcut annotations without substring matching',()=>{
 const close=button('Fechar conversa',{annotation:' Ctrl+Alt+W'}),h=harness([close]);assert.equal(h.dom.action('close'),close);
 const misleading=button('Fechar conversa diferente');assert.equal(harness([misleading]).dom.action('close'),null);
});
test('duplicate commands, disabled entries and simultaneous popups are rejected',()=>{
 assert.equal(harness([button('Marcar como não lida'),button('Marcar como não lida')]).dom.action('unread'),null);
 assert.equal(harness([button('Marcar como não lida',{disabled:true})]).dom.action('unread'),null);
 const h=harness([button('Marcar como não lida')]);h.menus.push(h.menus[0]);assert.equal(h.dom.action('unread'),null);
});
test('extension-owned menus cannot be mistaken for native commands',()=>{
 const h=harness([button('Fechar conversa')]);h.menus[0].closest=()=>({});assert.equal(h.dom.action('close'),null);
});
test('native invocation clears its trigger so final cleanup cannot reopen the popup',()=>{
 const action=button('Fechar conversa'),h=harness([action]);h.dom.openHeader();assert.equal(h.header.clicks,1);
 assert.equal(h.dom.invoke('close'),true);assert.equal(action.clicks,1);h.dom.dismiss();assert.equal(h.header.clicks,1);
});
test('hidden or absent native unread badges cannot confirm success',()=>{
 const h=harness();assert.equal(h.dom.unread({isConnected:true,querySelectorAll:()=>[]}),false);
 assert.equal(h.dom.unread({isConnected:true,querySelectorAll:()=>[{hidden:true}]}),false);
 assert.equal(h.dom.unread({isConnected:true,querySelectorAll:()=>[{}]}),true);
});
test('row dropdown uses observed mouseover/button path, never contextmenu or chat activation',()=>{
 const h=harness(),control=button('row'),events=[];const row={isConnected:true,dispatchEvent:e=>events.push(e.type),querySelector:()=>control};
 assert.equal(h.dom.hover(row),true);assert.equal(h.dom.openRow(row),true);assert.deepEqual(events,['mouseover']);assert.equal(control.clicks,1);
 row.isConnected=false;assert.equal(h.dom.hover(row),false);assert.equal(h.dom.openRow(row),false);
});
