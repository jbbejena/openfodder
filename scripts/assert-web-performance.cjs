/* Check actual recording cadence, including intentional start/stop samples. */
const assert=require('node:assert/strict');
module.exports=function assertPerformanceSampling(report){
  assert.equal(report.recording,false,'Cycle report must be stopped');
  assert(Number.isFinite(report.wallMs)&&report.wallMs>=0);
  assert(report.samples.length>=2&&report.samples.length<=report.limits.samples,'Bounded start/stop samples');
  assert(report.samples.length<=Math.floor(report.wallMs/950)+2,'At most one scheduled sample per second, plus endpoints');
  for(let i=1;i<report.samples.length;i++){
    const gap=report.samples[i].atMs-report.samples[i-1].atMs;
    assert(gap>=0,'Sample timestamps are monotonic');
    // Stop explicitly samples again and may immediately follow a timer tick.
    if(i<report.samples.length-1)assert(gap>=950,'No duplicate one-second sampler chains');
  }
};
