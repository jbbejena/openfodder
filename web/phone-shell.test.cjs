const {test} = require('node:test');
const assert = require('node:assert/strict');
const {fitSize} = require('./phone-shell.js');
const {clientToWorld,worldToClient} = require('./engine-bridge.js');
test('fitting keeps native canvas aspect ratio within landscape, portrait and short viewport hosts',()=>{
  for(const [width,height] of [[632,302],[355,232],[378,644],[1088,914]]) {
    const size=fitSize(960,675,width,height);
    assert(size.width<=width+1e-8&&size.height<=height+1e-8);
    assert(Math.abs(size.width/size.height-960/675)<1e-10);
    assert(Math.abs(size.width-width)<1e-8||Math.abs(size.height-height)<1e-8);
  }
});
test('intrinsic/DPR changes retain the same CSS image and map target without internal letterboxing',()=>{
  const view={width:320,height:225,sidebar:48,cameraX:300,cameraY:24},target={x:420,y:100};
  for(const intrinsic of [[960,675],[1920,1350]]) {
    const size=fitSize(...intrinsic,632,302);
    const c={width:intrinsic[0],height:intrinsic[1],getBoundingClientRect:()=>({left:90,top:54,...size})};
    const client=worldToClient(c,view,target.x+.5,target.y+.5);
    assert.deepEqual(clientToWorld(c,view,client.x,client.y),target);
    assert.equal(Math.floor((client.x-90)*view.width/size.width-view.sidebar+view.cameraX),target.x);
  }
});
test('missing, zero and invalid geometry cannot create a zero-size rendering surface',()=>{
  for(const args of [[0,675,632,302],[960,0,632,302],[960,675,0,302],[960,675,632,0],
    [960,675,-1,302],[NaN,675,632,302],[960,Infinity,632,302]]) assert.equal(fitSize(...args),null);
});
