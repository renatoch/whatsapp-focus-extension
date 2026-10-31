const test=require('node:test'),assert=require('node:assert/strict');
const {createNativeSurface}=require('../native-surface.js');
const notificationSelector='#main [data-testid="conversation-header"] button[aria-label*="notifica" i]';
function harness({player=false,status=false,drawer=false,selected=false,main=true,notificationHeader=false,notificationVisible=true,footer=false,editable=false}={}) {
  const classes=new Set(['unrelated']);
  classes.contains=classes.has.bind(classes);classes.remove=classes.delete.bind(classes);
  const channel={visible:drawer,nativeHiddenByUs:true,querySelectorAll:()=>[{getAttribute:()=>null,querySelector:()=>selected?{}:null}]};
  const nodes={ '[data-testid="status-player-contact-name"]':[{visible:player}], '[data-testid="status-drawer"]':[{visible:status}],
    '[data-testid="newsletter-drawer"]':[channel],'#main':[{visible:main}],
    [notificationSelector]:notificationHeader?[{visible:notificationVisible}]:[] };
  const doc={documentElement:{classList:classes},querySelectorAll:selector=>nodes[selector]||[],
    querySelector:selector=>selector==='#main footer, #main [contenteditable="true"]'&&(footer||editable)?{}:null};
  const adapter=createNativeSurface({document:doc,channelFocusedClass:'channel-focused',
    isVisible:element=>element.visible&&!(element.nativeHiddenByUs&&classes.has('channel-focused'))});
  return {adapter,classes,nodes,channel};
}
test('native foreground takes precedence over a conversation behind it',()=>{
  for(const [options,expected]of [[{player:true,status:true,drawer:true,selected:true},'status-player'],[{status:true},'status-list'],
    [{drawer:true,selected:true},'channel'],[{drawer:true,selected:false},'channel-list'],[{},'conversation'],[{main:false},'unknown']]){
    const h=harness(options);assert.equal(h.adapter.inspect(),expected);
  }
});
test('self-hidden channel sidebar is measured without feedback flicker and root state is restored',()=>{
  const h=harness({drawer:true,selected:true});h.classes.add('channel-focused');
  assert.equal(h.adapter.inspect(),'channel');assert.equal(h.classes.has('channel-focused'),true);assert.equal(h.classes.has('unrelated'),true);
  h.channel.visible=false;assert.equal(h.adapter.inspect(),'conversation');assert.equal(h.classes.has('channel-focused'),true);
});
test('a visible native notification header recognizes an open channel without list selection',()=>{
  assert.equal(harness({drawer:true,notificationHeader:true}).adapter.inspect(),'channel');
});
test('ambiguous or hidden background content cannot become a channel through the header fallback',()=>{
  for(const options of [{},{notificationHeader:true,footer:true},{notificationHeader:true,editable:true},
    {notificationHeader:true,notificationVisible:false},{notificationHeader:true,main:false}]){
    assert.equal(harness({drawer:true,...options}).adapter.inspect(),'channel-list');
  }
  assert.equal(harness({notificationHeader:true}).adapter.inspect(),'conversation');
});
test('header fallback survives our own sidebar hiding and restores the root class',()=>{
  const h=harness({drawer:true,notificationHeader:true});h.classes.add('channel-focused');
  assert.equal(h.adapter.inspect(),'channel');assert.equal(h.classes.has('channel-focused'),true);
});
test('header recognition is rechecked rather than remembered after native navigation',()=>{
  const h=harness({drawer:true,notificationHeader:true});assert.equal(h.adapter.inspect(),'channel');
  h.nodes[notificationSelector]=[];assert.equal(h.adapter.inspect(),'channel-list');
});
test('Status retains precedence over a channel notification header',()=>{
  assert.equal(harness({player:true,drawer:true,notificationHeader:true}).adapter.inspect(),'status-player');
  assert.equal(harness({status:true,drawer:true,notificationHeader:true}).adapter.inspect(),'status-list');
});
test('no main means channel list even when a selected marker remains',()=>{
  assert.equal(harness({drawer:true,selected:true,main:false}).adapter.inspect(),'channel-list');
});
