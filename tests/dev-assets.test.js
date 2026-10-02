const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../content.js'), 'utf8');
function extract(name) {
  let start = source.indexOf(`  function ${name}(`);
  if (start < 0) start = source.indexOf(`  async function ${name}(`);
  assert.notEqual(start, -1);
  const rest = source.slice(start + 1);
  const next = rest.search(/\n  (?:async )?function /);
  return source.slice(start, start + 1 + next);
}
function harness() {
  const values = {'focus.css':'body { color: red; }','dev-config.json':'{"returnButton":{}}'};
  const calls = [], writes = [], errors = [], intervals = new Map(); let next = 0;
  const {createDevAssets,cssFromConfig} = require('../scripts/dev-assets.js');
  const convert = config => cssFromConfig(config,{returnId:'return',sidebarId:'sidebar',searchingClass:'searching'});
  const dependencies = { intervalMs:1000, scheduler:{setInterval:(fn,ms)=>{assert.equal(ms,1000);const id=next++;intervals.set(id,fn);return id;},clearInterval:id=>intervals.delete(id)},
    fetchText:async path=>{calls.push(path);const value=values[path];if(value instanceof Error)throw value;return value;},
    applyStyle:(kind,css)=>writes.push([kind==='css'?'hot':'config',css]), convertConfig:convert, onError:error=>errors.push(error) };
  const controller = createDevAssets(dependencies);
  return {values,calls,writes,errors,intervals,dependencies,controller,refresh:controller.refresh,convert};
}

function deferred() { let resolve, reject; const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject}; }

test('start owns one interval, refreshes immediately and cancels handle zero on dispose', async () => {
  const h=harness(); const initial=h.controller.start(); h.controller.start(); await initial;
  assert.equal(h.intervals.size,1); assert.equal([...h.intervals.keys()][0],0);
  assert.deepEqual(h.calls,['focus.css','dev-config.json']);
  const tick=[...h.intervals.values()][0]; await tick(); assert.equal(h.calls.length,4);
  h.controller.dispose(); h.controller.dispose(); await tick(); await h.refresh();
  assert.equal(h.intervals.size,0); assert.equal(h.calls.length,4);
  await h.controller.start(); assert.equal(h.intervals.size,1); assert.equal(h.writes.length,2);
});
test('slow refreshes do not overlap or allow older responses to roll styles back', async () => {
  const h=harness(), css=deferred(); h.values['focus.css']=css.promise;
  const first=h.refresh(), second=h.refresh(); assert.equal(first,second); assert.deepEqual(h.calls,['focus.css']);
  css.resolve('new'); await first; assert.deepEqual(h.calls,['focus.css','dev-config.json']);
  assert.equal(h.writes[0][1],'new');
});
test('dispose and restart reject stale success and error completions without losing the new flight', async () => {
  for(const rejects of [false,true]) {
    const h=harness(), old=deferred(); h.values['focus.css']=old.promise;
    const before=h.controller.start(); h.controller.dispose(); h.values['focus.css']='current';
    await h.controller.start(); if(rejects)old.reject(new Error('obsolete'));else old.resolve('obsolete');await before;
    assert.deepEqual(h.writes.map(w=>w[1]),['current','#return { top: 14px !important; left: 72px !important; }']);
    assert.equal(h.errors.length,0); assert.equal(h.intervals.size,1);
  }
});
test('disposed config completion cannot write or update its cache', async () => {
  const h=harness(), config=deferred(); h.values['dev-config.json']=config.promise;
  const task=h.refresh(); await Promise.resolve(); h.controller.dispose(); config.resolve('{"sidebarButton":{}}');await task;
  assert.equal(h.writes.length,1); h.values['dev-config.json']='{"sidebarButton":{}}'; await h.controller.start();
  assert.equal(h.writes.at(-1)[0],'config');
});
test('an interval callback queued before disposal stays inert after restart', async () => {
  const h=harness();await h.controller.start();const stale=[...h.intervals.values()][0];
  h.controller.dispose();await h.controller.start();const before=h.calls.length;await stale();
  assert.equal(h.calls.length,before);
});
test('style callback disposal stops config fetch and interval resurrection', async () => {
  const h=harness();let controller;
  controller=require('../scripts/dev-assets.js').createDevAssets({...h.dependencies,applyStyle:()=>controller.dispose()});
  await controller.start();assert.deepEqual(h.calls,['focus.css']);assert.equal(h.intervals.size,0);
});
test('extension fetch preserves runtime URL, cache busting, failure and unavailable-runtime behavior', async () => {
  const calls=[];let ok=true;
  const context=vm.createContext({Date:{now:()=>123},chrome:{runtime:{getURL:path=>'extension://'+path}},
    fetch:async(...args)=>{calls.push(JSON.parse(JSON.stringify(args)));return {ok,text:async()=> 'fixture'};}});
  vm.runInContext(extract('fetchExtensionText'),context);
  assert.equal(await context.fetchExtensionText('focus.css'),'fixture');
  assert.deepEqual(calls,[['extension://focus.css?t=123',{cache:'no-store'}]]);
  ok=false;assert.equal(await context.fetchExtensionText('dev-config.json'),null);
  delete context.chrome;assert.equal(await context.fetchExtensionText('focus.css'),null);assert.equal(calls.length,2);
});

test('config conversion preserves defaults, selectors, escaping and fragment order', () => {
  const h = harness();
  assert.equal(h.convert({returnButton:{},sidebarButton:{top:'12px'},hideInSearch:['#a','#b'],dimInSearch:['#c'],hideTextIncludes:['A"B\\C']}),
    '#return { top: 14px !important; left: 72px !important; }\n\n'+
    '#sidebar { top: 12px !important; left: 6px !important; }\n\n'+
    'html.searching #a,\nhtml.searching #b { visibility: hidden !important; }\n\n'+
    'html.searching #c { opacity: 0.16 !important; }\n\n'+
    'html.searching #side [aria-label*="A\\"B\\\\C" i] { visibility: hidden !important; }');
  assert.equal(h.convert({}), '');
});
test('refresh is CSS then config, and unchanged content is not written twice', async () => {
  const h = harness(); await h.refresh(); await h.refresh();
  assert.deepEqual(h.calls,['focus.css','dev-config.json','focus.css','dev-config.json']);
  assert.deepEqual(h.writes,[['hot','body { color: red; }'],['config','#return { top: 14px !important; left: 72px !important; }']]);
});
test('empty CSS retains stylesheet while empty converted config clears overrides', async () => {
  const h = harness(); await h.refresh(); h.values['focus.css']=''; h.values['dev-config.json']='{}'; await h.refresh();
  assert.deepEqual(h.writes.at(-1),['config','']); assert.equal(h.writes.length,3);
});
test('malformed config retains its previous override without undoing valid CSS update', async () => {
  const h = harness(); await h.refresh(); h.values['focus.css']='updated'; h.values['dev-config.json']='{'; await h.refresh();
  assert.deepEqual(h.writes.at(-1),['hot','updated']); assert.equal(h.writes.length,3); assert.equal(h.errors.length,1);
});
test('fetch errors retain current styles and stop that refresh pass', async () => {
  const h = harness(); h.values['focus.css']=new Error('synthetic failure'); await h.refresh();
  assert.deepEqual(h.calls,['focus.css']); assert.deepEqual(h.writes,[]); assert.equal(h.errors.length,1);
});
