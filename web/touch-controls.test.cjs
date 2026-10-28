const {test} = require('node:test');
const assert = require('node:assert/strict');
const {create} = require('./touch-controls.js');

function fixture() {
  const state = {stage:'battlefield', ready:true, paused:false, selectedSquad:0,
    last:{id:0,code:0}, fireHeld:false,
    squads:[{id:0,count:4,grenades:3,rockets:2,weapon:1},{id:1,count:0},{id:2,count:0}]};
  const calls=[];
  const bridge={state:()=>state,clientToWorld:(x,y)=>x>=48&&x<320&&y>=0&&y<200?{x,y}:null,
    clientDeltaToMap:(x,y)=>({x,y})};
  let id=0, ui;
  for(const method of ['cancel','selectSquad','selectWeapon','moveAt','fireStartAt','fireAimAt','fireStop','secondaryTo','pan','follow'])
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
const touch=(id,x=160,y=90)=>({pointerId:id,clientX:x,clientY:y,button:0,pointerType:'touch'});
const pans=calls=>calls.filter(c=>c[0]==='pan');
const ground=calls=>calls.filter(c=>['moveAt','fireStartAt','fireAimAt','secondaryTo'].includes(c[0]));
test('two Move fingers cross a centroid threshold before panning and never commit the original tap',()=>{
  const {calls,control:c}=fixture();
  c.down(touch(1,160,90));c.down(touch(2,200,90));assert(c.snapshot().panning);
  c.move(touch(1,156,90));c.move(touch(2,196,90));c.tick();assert.deepEqual(pans(calls),[]);
  c.move(touch(1,148,90));c.tick();assert.deepEqual(pans(calls),[['pan',8,0]]);
  c.move(touch(2,188,90));c.tick();assert.deepEqual(pans(calls),[['pan',8,0],['pan',4,0]]);
  c.up(touch(2,188,90));c.move(touch(1,140,90));c.up(touch(1,140,90));
  assert.deepEqual(ground(calls),[]);assert.equal(c.snapshot().panning,false);
  c.down(touch(3));c.up(touch(3));assert.equal(ground(calls).length,1);
});
test('lifting either pan finger ends the gesture without reassigning the remaining finger',()=>{
  for(const first of [1,2]) {
    const {calls,control:c}=fixture();c.down(touch(1,160));c.down(touch(2,200));
    c.move(touch(1,140));c.move(touch(2,180));c.tick();
    c.up(touch(first,first===1?140:180));calls.length=0;
    const remaining=first===1?2:1;c.move(touch(remaining,130));c.tick();c.up(touch(remaining,130));
    assert.deepEqual(calls,[]);assert.equal(c.snapshot().pointers,0);
  }
});
test('explicit Pan uses one pointer, coalesces movement and cannot turn its release into Move/Fire',()=>{
  const {calls,control:c}=fixture();c.setMode('pan');calls.length=0;c.down(touch(1,180,100));
  c.move(touch(1,170,95));c.move(touch(1,160,90));assert.deepEqual(pans(calls),[]);
  c.tick();assert.deepEqual(pans(calls),[['pan',20,10]]);
  c.move(touch(1,150,85));c.up(touch(1,150,85));assert.deepEqual(pans(calls),[['pan',20,10],['pan',10,5]]);
  c.tick();assert.deepEqual(ground(calls),[]);
});
test('Fire and secondary touches never promote into a two-finger pan',()=>{
  for(const mode of ['fire','grenade']) {
    const {state,calls,control:c,apply}=fixture();c.setMode(mode);apply();
    c.down(touch(1,160));if(mode==='fire')state.fireHeld=true;
    calls.length=0;c.down(touch(2,200));c.move(touch(1,140));c.move(touch(2,180));c.tick();
    c.up(touch(1,140));c.up(touch(2,180));
    assert.equal(state.fireHeld,false);assert.equal(c.snapshot().panning,false);
    assert.deepEqual(pans(calls),[]);assert.deepEqual(ground(calls),[]);
  }
});
test('HUD-first and third-finger input cannot become a pan or a new ground command',()=>{
  const {calls,control:c}=fixture();c.foreignDown(touch(2));c.down(touch(1));
  c.move(touch(1,130));c.up(touch(1,130));c.lost(touch(2));assert.deepEqual(pans(calls),[]);
  c.down(touch(1,160));c.down(touch(2,200));c.down(touch(3,240));
  c.move(touch(1,130));c.move(touch(2,170));c.tick();
  c.up(touch(3,240));c.up(touch(2,170));c.up(touch(1,130));assert.deepEqual(pans(calls),[]);assert.deepEqual(ground(calls),[]);
});
test('capture loss, pause, mode/squad/input changes and HUD input discard unsent pan movement',()=>{
  for(const change of ['capture','pause','mode','squad','ready','disable','menu','hud','outside']) {
    const {state,calls,control:c}=fixture();c.setMode('pan');c.down(touch(1,180));c.move(touch(1,160));calls.length=0;
    if(change==='capture')c.lost(touch(1));
    if(change==='mode')c.setMode('move');
    if(change==='disable')c.setEnabled(false);
    if(change==='hud')c.foreignDown(touch(2));
    if(change==='outside')c.move(touch(1,400));
    if(change==='pause')state.paused=true;
    if(change==='squad')state.selectedSquad=1;
    if(change==='ready')state.ready=false;
    if(change==='menu')state.stage='menu';
    c.tick();c.up(touch(1,160));c.tick();
    assert.equal(c.snapshot().panning,false,change);assert.deepEqual(pans(calls),[],change);assert.deepEqual(ground(calls),[],change);
  }
});
test('mode changes keep an already-panned view; explicit Follow and disabling restore native ownership',()=>{
  const {state,calls,control:c}=fixture();state.manualCamera=true;
  c.setMode('fire');assert.deepEqual(calls,[['cancel'],['pan',0,0]]);
  calls.length=0;c.followSquad();assert.deepEqual(calls,[['cancel'],['follow']]);assert.equal(c.snapshot().mode,'move');
  calls.length=0;c.setEnabled(false);assert.deepEqual(calls,[['cancel']]);
});
test('pan preserves fractional motion, bounds each command and stops on engine backpressure',()=>{
  const {bridge,calls,control:c,ui}=fixture();bridge.clientDeltaToMap=(x,y)=>({x:x*.05,y:y*.05});
  c.setMode('pan');c.down(touch(1,180));calls.length=0;
  c.move(touch(1,172));c.tick();assert.deepEqual(pans(calls),[]);
  c.move(touch(1,168));c.tick();assert.deepEqual(pans(calls),[['pan',1,0]]);
  c.up(touch(1,168));c.down(touch(2,180));calls.length=0;
  bridge.clientDeltaToMap=(x,y)=>({x:x*20,y:y*20});
  c.move(touch(2,170));c.tick();assert.deepEqual(pans(calls),[['pan',128,0],['pan',72,0]]);
  bridge.pan=()=>({ok:false,reason:'busy'});c.move(touch(2,160));c.tick();
  assert.equal(c.snapshot().panning,false);assert.match(ui().message,/busy/);assert.deepEqual(ground(calls),[]);
});
