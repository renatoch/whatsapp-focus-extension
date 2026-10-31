const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'content.js'),'utf8');
function extract(name){const start=source.indexOf(`  function ${name}(`);assert.notEqual(start,-1);return source.slice(start,source.indexOf('\n  function ',start+1));}
function harness(authenticatedScreenSuspended=false){let keydown;const messages=[],button={};
  const context=vm.createContext({markUnread:{isBusy:()=>false},authSurface:{isActive:()=>authenticatedScreenSuspended},showToast:message=>messages.push(message),document:{addEventListener:(_event,fn)=>keydown=fn,querySelectorAll:()=>[button]}});
  vm.runInContext('let normalExpiryTestMode=false;\n'+extract('toggleExpiryTestMode')+'\n'+extract('installKeyboardShortcuts')+'\ninstallKeyboardShortcuts();',context);
  const press=(options={})=>keydown({altKey:true,shiftKey:true,ctrlKey:false,metaKey:false,key:'t',isTrusted:true,repeat:false,preventDefault(){},stopImmediatePropagation(){},...options});
  return {press,messages,button,enabled:()=>vm.runInContext('normalExpiryTestMode',context)};
}
test('trusted Alt+Shift+T toggles ten-second mode with feedback and updates existing full-mode label',()=>{
  const h=harness();assert.equal(h.enabled(),false);h.press();assert.equal(h.enabled(),true);assert.match(h.messages[0],/10s/);assert.match(h.button.textContent,/10s/);
  h.press();assert.equal(h.enabled(),false);assert.match(h.messages[1],/5 min/);assert.match(h.button.textContent,/5 min/);
});
test('untrusted, repeated and other modifier combinations do not toggle duration',()=>{
  const h=harness();for(const options of [{isTrusted:false},{repeat:true},{altKey:false},{shiftKey:false},{ctrlKey:true},{metaKey:true}])h.press(options);
  assert.equal(h.enabled(),false);assert.deepEqual(h.messages,[]);
});
test('duration mode is tab-local and a fresh script defaults back to five minutes',()=>{
  const first=harness();first.press();assert.equal(first.enabled(),true);assert.equal(harness().enabled(),false);
  assert.match(source,/let normalExpiryTestMode = false;/);
  assert.match(source,/durationMs: \(\) => normalExpiryTestMode \? TEST_BYPASS_MS : BYPASS_MS/);assert.doesNotMatch(source,/storage[^\n]*normalExpiryTestMode|localStorage[^\n]*normalExpiryTestMode/);
});
test('shortcuts cannot change modes while the native login screen is exposed',()=>{
  const h=harness(true);for(const key of ['t','f','l'])h.press({key});assert.equal(h.enabled(),false);assert.deepEqual(h.messages,[]);
});
test('toolbar popup documents shortcuts and has no legacy clipboard or ZIP action scripts',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'))),html=fs.readFileSync(path.join(root,manifest.action.default_popup),'utf8');
  for(const key of ['Alt+Shift+T','Alt+Shift+F','Alt+Shift+L'])assert.ok(html.includes(key));
  assert.match(html,/10 segundos/);assert.match(html,/próxima/);assert.doesNotMatch(html,/<script|id="adjust-clipboard"|type="file"|id="archive"/);
});
