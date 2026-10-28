const {test} = require('node:test');
const assert = require('node:assert/strict');
const {create, clientToWorld, worldToClient} = require('./engine-bridge.js');
const view = {width:320, height:200, sidebar:48, cameraX:100, cameraY:50};
function canvas(rect, width=960, height=600) {
  return {width, height, getBoundingClientRect: () => rect};
}
test('CSS client coordinates include canvas position, camera and sidebar exactly once', () => {
  const c=canvas({left:137,top:83,width:960,height:600});
  assert.deepEqual(clientToWorld(c,view,749,317),{x:256,y:128});
  assert.deepEqual(worldToClient(c,view,256,128),{x:749,y:317});
});
test('contain letterboxing, sidebar and outer edges cannot become battlefield orders', () => {
  const c=canvas({left:100,top:100,width:800,height:800});
  assert.equal(clientToWorld(c,view,500,200),null); // upper letterbox
  assert.equal(clientToWorld(c,view,500,800),null); // lower letterbox
  assert.equal(clientToWorld(c,view,200,400),null); // engine sidebar
  assert.equal(clientToWorld(c,view,900,400),null); // right edge
  assert.deepEqual(clientToWorld(c,view,610,445),{x:256,y:128});
});
test('camera pan, intrinsic/DPR changes, CSS resize and scroll keep the same map target', () => {
  const fixtures=[
    [canvas({left:137,top:83,width:960,height:600}),view],
    [canvas({left:137,top:83,width:960,height:600},1920,1200),view],
    [canvas({left:12,top:-70,width:480,height:300}),{...view,cameraX:160,cameraY:80}],
    [canvas({left:10,top:15,width:390,height:844}),{...view,cameraX:200,cameraY:100}]
  ];
  for(const [c,v] of fixtures) {
    const target={x:256,y:128};
    const client=worldToClient(c,v,target.x,target.y);
    assert.deepEqual(clientToWorld(c,v,client.x,client.y),target);
  }
});
test('hidden/zero-sized canvas and nonfinite coordinates do not create a target', () => {
  const c=canvas({left:0,top:0,width:0,height:0});
  assert.equal(clientToWorld(c,view,0,0),null);
  assert.equal(worldToClient(c,view,1,1),null);
  assert.equal(clientToWorld(canvas({left:0,top:0,width:960,height:600}),view,NaN,100),null);
});
test('invalid JS inputs are rejected before crossing the Wasm boundary', () => {
  let calls=0;
  const bridge=create({_of_web_command:()=>{calls++;return 1;}},canvas({left:0,top:0,width:960,height:600}));
  for(const receipt of [bridge.moveTo({x:Infinity,y:5}),bridge.fireStart(null),bridge.pan(NaN,0),
    bridge.selectSquad(1.5),bridge.selectWeapon('laser'),bridge.setPaused('false'),bridge.setPaused(true,'other')])
    assert.equal(receipt.ok,false);
  assert.equal(calls,0);
});
test('a pre-runtime bridge reports uninitialized and cannot submit orders', () => {
  const bridge=create({},canvas({left:0,top:0,width:960,height:600}));
  assert.equal(bridge.state().stage,'uninitialized');
  assert.deepEqual(bridge.moveTo({x:5,y:5}),{ok:false,reason:'uninitialized'});
});
