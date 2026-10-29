const {test}=require('node:test'), assert=require('node:assert/strict');
const {intervals,create}=require('./performance.js');

function fixture() {
  let time=0,id=0,isActive=true,recording=false,count=0,activeMs=0,capacity=16777216,tick=0,broken=false,loadMs=100;
  const timers=new Map(),frames=new Map(),calls=[];
  const session=create({
    native(op) {
      calls.push(op);
      if(broken)throw Error('Runtime unavailable');
      if(op===1){recording=true;count=activeMs=0;}
      if(op===2)recording=false;
      return {ok:true,recording,active:recording&&isActive,activeMs,submittedFrames:count,intervalMs:activeMs,
        intervals:Math.max(0,count-1),failedSubmissions:0,wasmCapacityBytes:capacity};
    },
    active:()=>isActive, context:()=>({stage:'battlefield',pauseReasons:isActive?0:8,engineTick:tick,attempt:1,map:'mapm1'}),
    now:()=>time,isoNow:()=>new Date(time).toISOString(),
    schedule:fn=>{timers.set(++id,fn);return id;},cancel:key=>timers.delete(key),
    requestFrame:fn=>{frames.set(++id,fn);return id;},cancelFrame:key=>frames.delete(key),
    metadata:()=>({build:{commit:'abc'}}),loading:()=>({runtimeReadyMs:loadMs,cacheState:'unknown'})
  });
  function advance(ms){time+=ms;if(recording&&isActive){activeMs+=ms;count++;tick++;}}
  return {session,timers,frames,calls,advance,
    active(value){isActive=value;},grow(){capacity*=2;},crash(){broken=true;},changeLoading(){loadMs=200;},
    timer(){const [key,fn]=timers.entries().next().value;timers.delete(key);fn();},
    frame(){const [key,fn]=frames.entries().next().value;frames.delete(key);fn(time);}
  };
}
test('frame histogram distinguishes empty, upper bounds, overflow and invalid samples',()=>{
  const h=intervals(); assert.equal(h.snapshot().p95MsUpperBound,null);
  for(const n of [NaN,-1,Infinity])h.add(n);
  for(let i=0;i<99;i++)h.add(16.3);h.add(1500);
  const s=h.snapshot();assert.equal(s.intervals,100);assert.equal(s.p95MsUpperBound,17);
  assert.equal(s.p99MsUpperBound,17);assert.equal(s.maxMs,1500);assert.equal(s.over1000Ms,1);
  const overflow=intervals();overflow.add(1000);overflow.add(1000.1);
  assert.equal(overflow.snapshot().p50MsUpperBound,1000);assert.equal(overflow.snapshot().p95MsUpperBound,null);
});
test('recording is opt-in; duplicate starts do not duplicate samplers and stopping clears both',()=>{
  const f=fixture();assert.equal(f.calls.length,0);assert.equal(f.session.report(),null);
  assert(f.session.start());assert.equal(f.session.start(),false);assert.equal(f.timers.size,1);assert.equal(f.frames.size,1);
  f.advance(1000);f.timer();assert(f.session.stop());assert.equal(f.session.stop(),false);
  assert.equal(f.timers.size,0);assert.equal(f.frames.size,0);assert.equal(f.session.status().recording,false);
  const report=f.session.report();f.advance(10000);f.changeLoading();assert.deepEqual(f.session.report(),report);
  assert.equal(report.phoneAcceptance.tenMinutesActive,false);assert.match(report.phoneAcceptance.status,/NOT ESTABLISHED/);
});
test('animation opportunities exclude pauses and explicit interruption gaps, separately from native submissions',()=>{
  const f=fixture();f.session.start();f.frame();f.advance(16);f.frame();
  f.active(false);f.advance(5000);f.frame();f.active(true);f.advance(500);f.frame();f.advance(20);f.frame();
  f.session.break('away');f.advance(10000);f.frame();f.advance(10);f.frame();f.session.stop();
  const report=f.session.report();assert.equal(report.animationCallbacks.intervals,3);
  assert.equal(report.animationCallbacks.intervalMs,46);assert(report.native.submittedFrames>3);
  assert.equal(report.animationCallbacks.p95MsUpperBound,20);
});
test('samples include engine ticks; context events change only for mission/pause/viewport changes',()=>{
  const f=fixture();f.session.start();for(let i=0;i<5;i++){f.advance(1000);f.timer();}
  assert.equal(f.session.report().events.length,1);
  f.active(false);f.advance(2000);f.timer();assert.equal(f.session.report().events.length,2);
  assert(f.session.report().samples.some(s=>s.engineTick>0));
  assert.equal(f.session.report().events[0].detail.engineTick,undefined);
});
test('memory report describes allocated capacity, retains a peak and detaches snapshots',()=>{
  const f=fixture();f.session.start('iPhone label','repeat requested');f.grow();f.advance(1000);f.timer();f.session.stop();
  const report=f.session.report();assert.equal(report.memory.startCapacityBytes,16777216);
  f.session.notes('x'.repeat(700));assert.equal(f.session.report().notes.length,600);
  assert.equal(report.memory.peakCapacityBytes,33554432);assert.match(report.interpretation.memory,/not used heap/);
  assert.equal(report.deviceLabel,'iPhone label');assert.equal(report.loading.cacheState,'unknown');
  report.samples.length=0;assert(f.session.report().samples.length>0);
});
test('events and samples are bounded; long recordings stop without rescheduling',()=>{
  const f=fixture();f.session.start();for(let i=0;i<110;i++)f.session.break('rotation');
  assert.equal(f.session.report().events.length,100);assert(f.session.report().droppedEvents>0);
  for(let i=0;i<1800&&f.timers.size;i++){f.advance(1000);f.timer();}
  const r=f.session.report();assert.equal(r.recording,false);assert.equal(r.stopReason,'recording-limit');
  assert(r.samples.length<=1800);assert.equal(f.timers.size,0);assert.equal(f.frames.size,0);
});
test('multiple sessions replace old samples and labels; a suspended timer respects the wall-time limit',()=>{
  const f=fixture();for(let i=0;i<5;i++){f.session.start('x'.repeat(150));f.advance(1000);f.timer();f.session.stop();}
  f.session.start('new');assert.equal(f.session.report().samples.length,1);assert.equal(f.session.report().deviceLabel,'new');
  f.advance(1900000);f.timer();assert.equal(f.session.status().recording,false);
  assert.equal(f.session.report().phoneAcceptance.tenMinutesActive,true);
  assert.match(f.session.report().phoneAcceptance.status,/NOT ESTABLISHED/);
});
test('a failed runtime stops both samplers and preserves the last good snapshot with an explicit limit',()=>{
  const f=fixture();f.session.start();f.advance(1000);f.timer();f.crash();f.advance(1000);f.timer();
  const r=f.session.report();assert.equal(r.recording,false);assert.equal(r.stopReason,'measurement-error');
  assert.equal(r.nativeStopUnconfirmed,true);assert.equal(r.native.activeMs,1000);
  assert.equal(f.timers.size,0);assert.equal(f.frames.size,0);assert(r.events.some(e=>e.type==='measurement-error'));
});
