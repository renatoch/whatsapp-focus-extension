const test=require('node:test'),assert=require('node:assert/strict');
const {createNativeSurface}=require('../native-surface.js');
function harness({player=false,status=false,drawer=false,selected=false,main=true}={}) {
  const classes=new Set(['unrelated']);
  classes.contains=classes.has.bind(classes);classes.remove=classes.delete.bind(classes);
  const channel={visible:drawer,nativeHiddenByUs:true,querySelectorAll:()=>[{getAttribute:()=>null,querySelector:()=>selected?{}:null}]};
  const nodes={ '[data-testid="status-player-contact-name"]':[{visible:player}], '[data-testid="status-drawer"]':[{visible:status}],
    '[data-testid="newsletter-drawer"]':[channel],'#main':[{visible:main}] };
  const doc={documentElement:{classList:classes},querySelectorAll:selector=>nodes[selector]||[]};
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
test('no main means channel list even when a selected marker remains',()=>{
  assert.equal(harness({drawer:true,selected:true,main:false}).adapter.inspect(),'channel-list');
});
