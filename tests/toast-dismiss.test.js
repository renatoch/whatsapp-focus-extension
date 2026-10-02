const test = require('node:test');
const assert = require('node:assert/strict');
const { createToast } = require('../scripts/ui/toast.js');
function harness({body=true}={}) {
  const elements=[], timers=new Map(), all=new Map(), copied=[];let toast=null,next=0;
  const document={body:body?{appendChild:node=>{toast=node;}}:null,
    getElementById:()=>toast,
    createElement:tag=>{const node={tag,children:[],hidden:true,textContent:'',
      replaceChildren(...nodes){this.children=nodes;},appendChild(node){this.children.push(node);return node;},
      setAttribute(name,value){this[name]=value;},addEventListener(type,fn){this['on_'+type]=fn;}};
      elements.push(node);return node;}};
  const scheduler={setTimeout:(fn,ms)=>{const id=next++;timers.set(id,{fn,ms});all.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)};
  const controller=createToast({document,scheduler,id:'toast',copyDiagnostic:(...args)=>copied.push(args)});
  return {controller,elements,timers,all,copied,document,toast:()=>toast,buttons:()=>toast.children[1].children};
}

test('toast close dismisses immediately, cancels handle zero and preserves diagnostic copy action',()=>{
  const h=harness(), diagnostic={stage:'failed'};h.controller.show('Synthetic failure',diagnostic);
  assert.equal(h.toast().hidden,false);assert.equal(h.toast().role,'status');assert.equal(h.toast().children[0].textContent,'Synthetic failure');
  const [copy,close]=h.buttons();assert.equal(copy.textContent,'Copiar diagnóstico');assert.equal(close.textContent,'Fechar');
  copy.on_click();assert.equal(h.copied[0][0],diagnostic);assert.equal(h.copied[0][1],copy);
  close.on_click();assert.equal(h.toast().hidden,true);assert.equal(h.timers.size,0);
});
test('ordinary and diagnostic toasts retain exact five/ten-second timeouts',()=>{
  for(const diagnostic of [null,{stage:'failed'}]){
    const h=harness();h.controller.show('Synthetic',diagnostic);const timer=[...h.timers.values()][0];
    assert.equal(timer.ms,diagnostic?10000:5000);timer.fn();assert.equal(h.toast().hidden,true);
    assert.equal(h.buttons().length,diagnostic?2:1);
  }
});
test('new toast replaces children and cancels previous dismissal',()=>{
  const h=harness();h.controller.show('First');const toast=h.toast(),old=toast.children[0];
  h.controller.show('Second',{stage:'failed'});assert.equal(h.toast(),toast);assert.notEqual(toast.children[0],old);
  assert.equal(toast.children[0].textContent,'Second');assert.equal(h.timers.size,1);
});
test('old timers and detached buttons cannot affect replacement toast',()=>{
  const h=harness();h.controller.show('Old',{stage:'failed'});const [copy,close]=h.buttons(),old=[...h.all.values()][0];
  h.controller.show('New');old();close.on_click();copy.on_click();
  assert.equal(h.toast().hidden,false);assert.equal(h.toast().children[0].textContent,'New');assert.equal(h.copied.length,0);
});
test('dispose hides, rejects calls and invalidates callbacks across restart',()=>{
  const h=harness();h.controller.show('Old',{stage:'failed'});const buttons=h.buttons(),old=[...h.all.values()][0];
  h.controller.dispose();h.controller.dispose();assert.equal(h.toast().hidden,true);assert.equal(h.timers.size,0);
  h.controller.show('Rejected');buttons[0].on_click();assert.equal(h.copied.length,0);assert.equal(h.toast().children[0].textContent,'Old');
  h.controller.start();h.controller.start();assert.equal(h.timers.size,0);h.controller.show('Fresh');
  old();buttons[1].on_click();assert.equal(h.toast().hidden,false);assert.equal(h.timers.size,1);
});
test('pre-body toast requests have no DOM or timer effects',()=>{
  const h=harness({body:false});h.controller.show('Synthetic');h.controller.hide();
  assert.equal(h.elements.length,0);assert.equal(h.timers.size,0);
});
