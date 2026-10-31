const test=require('node:test'),assert=require('node:assert/strict');
const {createAuthSurface}=require('../auth-surface.js');
function harness({qr=false,phone=false,visible=true,side=false,main=false}={}){
  const state={qr,phone,visible,side,main},classes=new Set(),transitions=[];let observer,writes=0;
  const root={classList:{toggle(name,force){writes++;force?classes.add(name):classes.delete(name);},remove(name){classes.delete(name);}}};
  class Observer{constructor(callback){this.callback=callback;observer=this;}observe(target,options){this.target=target;this.options=options;}disconnect(){this.disconnected=true;}}
  const document={documentElement:root,querySelector:()=>state.side||state.main?{}:null,
    querySelectorAll:()=>[{visible:state.visible&&state.qr},{visible:state.visible&&state.phone}]};
  const controller=createAuthSurface({document,Observer,isVisible:e=>e.visible,onTransition:active=>transitions.push(active)});
  return {state,controller,classes,transitions,observer:()=>observer,writes:()=>writes};
}
test('only evidenced visible QR/phone login surfaces suspend the extension',()=>{
  for(const options of [{qr:true},{phone:true}]){const h=harness(options);h.controller.start();assert.equal(h.controller.isActive(),true);assert.ok(h.classes.has('mwf-auth-surface'));assert.deepEqual(h.transitions,[true]);}
  for(const options of [{},{qr:true,visible:false},{phone:true,visible:false}]){const h=harness(options);h.controller.start();assert.equal(h.controller.isActive(),false);assert.deepEqual(h.transitions,[]);}
});
test('authenticated DOM presence wins even if our blind CSS hides it or old login nodes remain',()=>{
  for(const options of [{side:true},{main:true}]){const h=harness({qr:true,...options});h.controller.start();assert.equal(h.controller.isActive(),false);}
});
test('QR to phone entry remains suspended; unknown loading immediately returns blind',()=>{
  const h=harness({qr:true});h.controller.start();h.state.qr=false;h.state.phone=true;h.controller.refresh();assert.deepEqual(h.transitions,[true]);
  h.state.phone=false;h.controller.refresh();assert.equal(h.controller.isActive(),false);assert.deepEqual(h.transitions,[true,false]);
  h.state.side=true;h.controller.refresh();assert.deepEqual(h.transitions,[true,false]);
});
test('direct login to authenticated interface cancels suspension without restoring previous normal mode',()=>{
  const h=harness({phone:true});h.controller.start();h.state.side=true;h.controller.refresh();assert.equal(h.controller.isActive(),false);assert.deepEqual(h.transitions,[true,false]);
});
test('authentication loss during bypass cancels the old expiry instead of resuming it after login',()=>{
  const {createSurfaceExpiry}=require('../surface-expiry.js');let timer,returns=0;
  const expiry=createSurfaceExpiry({scheduler:{setTimeout:cb=>(timer=cb,1),clearTimeout(){timer=null;},cancelAnimationFrame(){}},durationMs:300000,
    inspect:()=> 'channel',chooseDestination:()=> 'focused-channel',clearContinuation(){},onChannel(){returns++;}});
  expiry.start();const obsolete=timer;
  const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
  const source=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8');
  const start=source.indexOf('  function resetForAuthTransition(');
  const callback=source.slice(start,source.indexOf('\n  function ',start+1));
  const context=vm.createContext({markUnread:{cancel(){}},setActive:options=>{assert.equal(options.showOverlay,true);expiry.cancel();}});
  vm.runInContext('let recentNavigationToken=4;\n'+callback,context);
  assert.match(source,/onTransition: resetForAuthTransition/);
  const document={documentElement:{classList:{toggle(){},remove(){}}},querySelector:()=>null,querySelectorAll:()=>[{visible:true}]};
  const controller=createAuthSurface({document,isVisible:e=>e.visible,Observer:class{observe(){}disconnect(){}},onTransition:context.resetForAuthTransition});
  controller.start();assert.equal(timer,null);obsolete();assert.equal(returns,0);
  assert.equal(vm.runInContext('recentNavigationToken',context),5);
});
test('observer watches visibility attributes without repeatedly mutating the root on stable callbacks',()=>{
  const h=harness({qr:true});h.controller.start();const observer=h.observer();
  assert.deepEqual(observer.options.attributeFilter,['class','style','hidden']);assert.equal(observer.options.subtree,true);
  const before=h.writes();for(let i=0;i<10;i++)observer.callback();assert.equal(h.writes(),before);assert.deepEqual(h.transitions,[true]);
  h.state.visible=false;observer.callback();assert.equal(h.controller.isActive(),false);
});
test('start is single-owner and disposal disconnects and fails closed',()=>{
  const h=harness({qr:true});h.controller.start();const observer=h.observer();h.controller.start();assert.equal(h.observer(),observer);
  h.controller.dispose();assert.equal(observer.disconnected,true);assert.equal(h.classes.has('mwf-auth-surface'),false);
  observer.callback();h.controller.start();assert.deepEqual(h.transitions,[true]);
});
test('reentrant disposal cannot reapply a stale login exemption',()=>{
  const document={documentElement:{classList:{toggle(){throw Error('Stale class write');},remove(){}}},querySelector:()=>null,querySelectorAll:()=>[{}]};
  let controller;controller=createAuthSurface({document,isVisible:()=>true,Observer:class{observe(){}disconnect(){}},onTransition:()=>controller.dispose()});
  controller.start();assert.equal(controller.isActive(),false);
});
test('manifest and composition start auth observation before asynchronous setup and retain blind CSS guards',()=>{
  const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..');
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
  const scripts=manifest.content_scripts[0].js;assert.ok(scripts.indexOf('auth-surface.js')<scripts.indexOf('content.js'));
  const source=fs.readFileSync(path.join(root,'content.js'),'utf8');assert.match(source,/function boot\(\) \{\s*authSurface.start\(\);/);
  const css=fs.readFileSync(path.join(root,'focus.css'),'utf8');
  assert.match(css,/:has\(\[data-testid="link-device-qr-code"\], \[data-testid="link-device-phone-number-entry-screen"\]\):not\(:has\(#side, #main\)\)/);
  assert.match(css,/\[id\^="mirror-whatsapp-focus-"\]:not\(style\)\s*\{\s*display: none !important/);
});
test('a fresh authenticated-loading instance does not inherit a previous login suspension',()=>{
  const before=harness({qr:true});before.controller.start();const after=harness();after.controller.start();assert.equal(after.controller.isActive(),false);
});
