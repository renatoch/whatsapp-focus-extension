const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const rules=require('../focused-recents.js'),source=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8');
const context=vm.createContext({});
for(const name of ['readTitle','readConversationRowTitleDetails','readActiveConversationTitle']){
 const start=source.indexOf(`  function ${name}(`);assert.notEqual(start,-1);vm.runInContext(source.slice(start,source.indexOf('\n  function ',start+1)),context);
}
const text=value=>({nodeType:3,nodeValue:value,textContent:value});
function element(tag,attrs={},children=[]){return {tagName:tag.toUpperCase(),nodeType:1,childNodes:children,getAttribute:key=>attrs[key]??null,
 get textContent(){return children.map(n=>n.textContent||'').join('');},
 querySelector(selector){const stack=[...children];while(stack.length){const n=stack.shift();if(selector==='img'&&n.tagName==='IMG')return n;stack.push(...(n.childNodes||[]));}return null;}};}
const emoji=value=>element('img',{alt:value,title:value});
function row(container,descendants=[]){return {querySelector:()=>container,querySelectorAll:s=>s==='[data-testid="cell-frame-title"] [title]'?descendants:s==='[data-testid="cell-frame-title"]'?[container]:[]};}
test('native image emojis reconstruct the exact copied Unicode title without injecting spaces',()=>{
 const frame=element('span',{},[text('Equipe '),emoji('💎'),emoji('👐')]);
 assert.equal(frame.textContent,'Equipe ');assert.equal(context.readTitle(frame),'Equipe 💎👐');
 const evidence=context.readConversationRowTitleDetails(row(frame,[frame.childNodes[1],frame.childNodes[2]]));
 assert.equal(evidence.title,'Equipe 💎👐');assert.equal(evidence.titleSource,'frameTitle');
 assert.equal(rules.classifyExactTitleMatches('Equipe 💎👐',[evidence.title]).status,'match');
});
test('text-only versus rendered emoji titles agree between header and search result',()=>{
 const title='Equipe 💎👐',header=element('span',{title},[text('Equipe '),emoji('💎'),emoji('👐')]);
 context.document={querySelectorAll:s=>s==='#main header [data-testid="conversation-info-header-chat-title"]'?[header]:[]};
 assert.equal(context.readActiveConversationTitle(),title);
 const frame=element('span',{},[text('Equipe '),emoji('💎'),emoji('👐')]);
 assert.equal(context.readConversationRowTitleDetails(row(frame)).title,title);
 assert.equal(context.readTitle(element('span',{},[text(title)])),title);
});
test('whole frame title wins over an emoji tooltip or a truncated descendant title',()=>{
 const image=emoji('💎'),fragment=element('span',{title:'Equipe'},[text('Equipe ')]);
 const frame=element('span',{title:'Equipe 💎👐'},[fragment,image,emoji('👐')]);
 assert.equal(context.readConversationRowTitleDetails(row(frame,[image,fragment])).title,'Equipe 💎👐');
 assert.equal(context.readTitle(image),'');
});
test('emoji-only names, flags, modifiers, ZWJ, keycaps and variation selectors are preserved',()=>{
 for(const glyph of ['💎👐','🇧🇷','👐🏽','👨‍👩‍👧‍👦','1️⃣','☀️']){
  const frame=element('span',{},[emoji(glyph)]);assert.equal(context.readTitle(frame),glyph);
 }
 const frame=element('span',{},[element('img',{'data-plain-text':'👐🏽',alt:'localized tooltip'})]);assert.equal(context.readTitle(frame),'👐🏽');
});
test('similar-looking emojis, case and missing emojis never become equivalent',()=>{
 for(const other of ['Equipe 💎🙌','Equipe 💎','Equipe','equipe 💎👐','Equipe 💎👐🏽'])assert.equal(rules.classifyExactTitleMatches('Equipe 💎👐',[other]).status,'not-found');
 assert.equal(rules.classifyExactTitleMatches('Equipe 💎👐',['Equipe 💎👐','Equipe 💎👐']).status,'ambiguous');
});
test('unknown images fail closed instead of turning an emoji name into a plain-title match',()=>{
 const fragment=element('span',{title:'Equipe'},[text('Equipe')]),image=element('img',{alt:'unknown icon'}),frame=element('span',{},[fragment,image]);
 assert.equal(context.readConversationRowTitleDetails(row(frame,[fragment])).title,'');
});
test('only the title slot contributes: preview, avatar and unread badge are never inspected',()=>{
 const frame=element('span',{},[text('Equipe '),emoji('💎'),emoji('👐')]);let outsideReads=0;
 const nativeRow={querySelector:s=>{assert.equal(s,'[data-testid="cell-frame-title"]');return frame;},querySelectorAll:()=>{outsideReads++;throw Error('No need to inspect row descendants');}};
 assert.equal(context.readConversationRowTitleDetails(nativeRow).title,'Equipe 💎👐');assert.equal(outsideReads,0);
});
test('decorative SVG title is not appended and malformed title trees are bounded',()=>{
 const frame=element('span',{},[text('Equipe '),emoji('💎'),element('svg',{},[text('Verified')])]);assert.equal(context.readTitle(frame),'Equipe 💎');
 const cycle=element('span');cycle.childNodes.push(cycle);assert.equal(context.readTitle(cycle),'');
});
