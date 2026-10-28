const {test} = require('node:test');
const assert = require('node:assert/strict');
const {create} = require('./touch-controls.js');

function fixture() {
  const state = {stage:'battlefield', ready:true, paused:false, selectedSquad:0,
    last:{id:0,code:0}, fireHeld:false,
    squads:[{id:0,count:4,grenades:3,rockets:2,weapon:1},{id:1,count:0},{id:2,count:0}]};
  const calls=[];
  const bridge={state:()=>state,clientToWorld:(x,y)=>x>=48&&x<320&&y>=0&&y<200?{x,y}:null};
  let id=0, ui;
  for(const method of ['cancel','selectSquad','selectWeapon','moveAt','fireStartAt','fireAimAt','fireStop','secondaryTo'])
    bridge[method]=(...args)=>{calls.push([method,...args]);if(method==='cancel'||method==='fireStop')state.fireHeld=false;return {ok:true,id:++id};};
  const control=create(bridge,value=>{ui=value;});
  control.setEnabled(true);control.tick();calls.length=0;
  const event=(pointerId=1,clientX=100,clientY=80)=>({pointerId,clientX,clientY,button:0});
  const apply=()=>{state.last={id,code:0};control.tick();};
  return {state,calls,bridge,control,event,apply,ui:()=>ui};
}
test('a Move tap issues exactly once on release; drags/sidebar/outside do not order troops',()=>{
  const f=fixture(),{control:c,event:e,calls}=f;
  c.down(e());assert.deepEqual(calls,[]);
  c.up(e());c.up(e());assert.deepEqual(calls,[['moveAt',100,80]]);
  calls.length=0;c.down(e());c.move(e(1,120,80));c.up(e(1,120,80));
  c.down(e(1,20,80));c.up(e(1,20,80));
  c.down(e());c.up(e(1,400,80));
  assert.equal(calls.filter(x=>x[0]==='moveAt').length,0);
});
test('only the aim owner may update fire; a second finger cancels and cannot inherit input',()=>{
  const {state,calls,control:c,event:e}=fixture();
  c.setMode('fire');calls.length=0;c.down(e());state.fireHeld=true;
  c.move(e(2,140,90));c.tick();assert.equal(calls.filter(x=>x[0]==='fireAimAt').length,0);
  c.down(e(2,140,90));assert.equal(state.fireHeld,false);assert.equal(c.snapshot().owner,null);
  c.up(e());c.move(e(2,160,100));c.up(e(2,160,100));
  assert.equal(calls.filter(x=>x[0]==='fireStartAt').length,1);
  assert.equal(calls.filter(x=>x[0]==='moveAt').length,0);
  c.setMode('fire');c.down(e(3,120,90));assert.equal(calls.filter(x=>x[0]==='fireStartAt').length,2);
});
test('aim coalesces until fire start has applied and releases on up or leaving the field',()=>{
  const {state,calls,control:c,event:e}=fixture();c.setMode('fire');calls.length=0;c.down(e());
  c.move(e(1,140,90));c.move(e(1,160,100));c.tick();
  assert.equal(calls.filter(x=>x[0]==='fireAimAt').length,0);
  state.fireHeld=true;c.tick();c.tick();assert.deepEqual(calls.filter(x=>x[0]==='fireAimAt'),[['fireAimAt',160,100]]);
  c.up(e(1,160,100));assert.equal(state.fireHeld,false);
  c.down(e());state.fireHeld=true;c.move(e(1,330,100));assert.equal(state.fireHeld,false);
  c.move(e());c.up(e());assert.equal(calls.filter(x=>x[0]==='fireStartAt').length,2);
});
test('a HUD/page touch cancels aim and remains owned there until lifted',()=>{
  const {state,calls,control:c,event:e}=fixture();c.setMode('fire');c.down(e());state.fireHeld=true;
  c.foreignDown(e(2));assert.equal(state.fireHeld,false);
  c.up(e());c.setMode('fire');c.down(e(3));c.up(e(3));
  assert.equal(calls.filter(x=>x[0]==='fireStartAt').length,1);
  c.lost(e(2));c.setMode('fire');c.down(e(4));
  assert.equal(calls.filter(x=>x[0]==='fireStartAt').length,2);
});
test('secondary targeting waits for weapon selection, consumes no shot until confirmation, and disarms once',()=>{
  const {state,calls,control:c,event:e,apply}=fixture();
  c.setMode('rocket');c.down(e());c.up(e());assert.equal(c.snapshot().target,null);
  state.squads[0].weapon=3;apply();
  c.down(e());c.up(e());assert.deepEqual(c.snapshot().target,{x:100,y:80});
  assert.equal(calls.filter(x=>x[0]==='secondaryTo').length,0);
  c.confirm();c.confirm();assert.deepEqual(calls.filter(x=>x[0]==='secondaryTo'),[['secondaryTo',{x:100,y:80}]]);
  assert.equal(c.snapshot().mode,'move');assert.equal(c.snapshot().target,null);
});
test('mode and squad changes cancel target/hold without transferring an existing finger',()=>{
  const {calls,control:c,event:e}=fixture();c.setMode('fire');c.down(e());
  c.setMode('move');c.up(e());assert.equal(calls.filter(x=>x[0]==='moveAt').length,0);
  c.down(e(2));c.selectSquad(0);c.up(e(2));assert.equal(calls.filter(x=>x[0]==='moveAt').length,0);
  assert.equal(calls.filter(x=>x[0]==='selectSquad').length,1);
});
test('lost capture, pause, selection, disabled input and stage changes release held commands',()=>{
  for(const change of ['capture','pause','squad','ready','disable','menu']) {
    const {state,control:c,event:e}=fixture();c.setMode('fire');c.down(e());state.fireHeld=true;
    if(change==='capture')c.lost(e());
    else if(change==='disable')c.setEnabled(false);
    else {
      if(change==='pause')state.paused=true;
      if(change==='squad')state.selectedSquad=1;
      if(change==='ready')state.ready=false;
      if(change==='menu')state.stage='menu';
      c.tick();
    }
    assert.equal(state.fireHeld,false,change);assert.equal(c.snapshot().owner,null,change);
  }
});
test('unavailable weapons do not arm and native weapon changes invalidate a marked target',()=>{
  const {state,control:c,event:e,apply}=fixture();
  state.squads[0].rockets=0;assert.equal(c.setMode('rocket'),false);
  c.setMode('grenade');apply();c.down(e());c.up(e());assert(c.snapshot().target);
  state.squads[0].weapon=3;c.tick();assert.equal(c.snapshot().target,null);assert.equal(c.snapshot().mode,'move');
});
test('a rejected fire start leaves no pointer owner and explains the engine rejection',()=>{
  const {bridge,control:c,event:e,ui}=fixture();bridge.fireStartAt=()=>({ok:false,reason:'unsupported'});
  c.setMode('fire');c.down(e());assert.equal(c.snapshot().owner,null);
  assert.match(ui().message,/unsupported/);
});
