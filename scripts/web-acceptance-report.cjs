/* Acceptance aggregation is deliberately separate from browser/game evidence. */
const assert = require('node:assert/strict');
const suites = [
  ['launcher','smoke-web.cjs','desktop.json'],
  ['input','smoke-web-input.cjs','input.json'],
  ['touch','smoke-web-touch.cjs','touch.json'],
  ['camera','smoke-web-camera.cjs','camera.json'],
  ['mission','smoke-web-mission.cjs','mission.json'],
  ['saves','smoke-web-saves.cjs','saves.json'],
  ['layout','smoke-web-layout.cjs','layout.json'],
  ['lifecycle','smoke-web-lifecycle.cjs','lifecycle.json'],
  ['performance','smoke-web-performance.cjs','performance.json'],
  ['rendering','smoke-web-rendering.cjs','rendering.json']
].map(([id,script,report]) => ({id,script,report}));
const coverage = {
  B01:[],B02:[],B03:['launcher'],B04:['launcher','rendering'],B05:[],B06:['launcher','lifecycle'],B07:['launcher'],B08:['rendering'],
  I01:['input','touch'],I02:['touch'],I03:['touch'],I04:[],I05:['touch'],I06:['camera'],I07:['camera'],I08:['camera','layout'],I09:['mission','layout'],I10:['touch','camera','lifecycle'],
  U01:['layout'],U02:['layout'],U03:['layout'],U04:['layout'],
  G01:[],G02:['mission'],G03:['mission'],G04:['input','layout'],
  S01:['saves'],S02:['saves'],S03:['saves'],S04:['saves'],S05:['saves'],
  L01:['lifecycle'],L02:['lifecycle'],L03:['lifecycle'],L04:[],
  P01:[],P02:[],P03:[],P04:[],R01:[],R02:[]
};
const limits = {
  B01:'Compiler/build evidence is separate from browser automation.',
  B02:'Incremental build evidence is separate from browser automation.',
  B05:'Requires an actual iPhone Safari session.',
  I04:'Original demo has zero secondary ammo. The touch suite uses an explicitly separate in-memory ammo fixture; it cannot pass ordinary-content weapon acceptance.',
  G01:'Requires an unmodified combat victory through touch. Empty-goal fixtures cannot pass this row.',
  L04:'Web audio uses the null backend; audible recovery is unsupported.',
  P01:'Sizes/renderer/loading are observed; current harness interception disables cache. Verified cold/warm phone comparison is not established.',
  P02:'Short SDL/RAF diagnostics are not ten-minute on-device displayed-FPS measurements.',
  P03:'Zero/one tick per callback is not cross-refresh-rate phone weapon-timing evidence.',
  P04:'Short restart/capacity observations cannot prove no unbounded used-memory/handler growth.',
  R01:'An accepted release candidate requires the remaining phone gates.',
  R02:'Requires a separate source/notices/data-distribution review.'
};
function verifyBuild(build, expected) {
  assert.match(expected,/^[0-9a-f]{40}$/,'Supply a full source commit');
  assert.equal(build.commit,expected,'Served source commit changed');
  assert.equal(build.dirty,false,'Acceptance requires a committed runtime');
  assert.match(build.data,/^[0-9a-f]{40}$/);assert.match(build.scripts,/^[0-9a-f]{40}$/);
}
function verifyReport(id, report, expected) {
  assert(report && typeof report==='object','Missing suite report');
  const commit=report.commit || (typeof report.build==='object' && report.build?.commit);
  if(commit) assert.equal(commit,expected,`${id}: wrong report build`);
  else assert(typeof report.build==='string' && report.build.includes(expected.slice(0,12)),`${id}: missing visible build evidence`);
  assert.notEqual(report.dirty,true,`${id}: dirty runtime`);
  assert.notEqual(report.build?.dirty,true,`${id}: dirty nested build`);
  assert(report.checks && Object.keys(report.checks).length || id==='rendering' && report.passed===true,`${id}: incomplete report`);
  if(id==='rendering')assert.equal(report.passed,true,'Temporal rendering check did not complete');
}
function summarize(build, runs, identityStable) {
  const byId=new Map(runs.map(run=>[run.id,run]));
  const rows=Object.entries(coverage).map(([id,required])=>{
    let desktop='NOT RUN';
    if(required.length){
      const states=required.map(name=>byId.get(name)?.status);
      desktop=states.includes('FAIL')?'FAIL':states.every(s=>s==='PASS')?'PASS':'NOT RUN';
    }
    if(!identityStable && desktop==='PASS')desktop='BLOCKED';
    return {id,desktop,phone:'NOT RUN',evidence:required,limit:limits[id]||
      'Desktop Chromium emulation only; physical Safari acceptance remains separate.'};
  });
  return {format:'openfodder-acceptance',version:1,build,identityStable,
    automatedChecksPassed:identityStable && suites.every(s=>byId.get(s.id)?.status==='PASS'),
    acceptance:'BLOCKED',visualReview:'REQUIRED; inspect composited screenshots separately',
    blockers:['Physical iPhone Safari full mission/save/return session is not recorded.',
      'Unmodified touch combat victory, sustained phone performance and cross-refresh weapon timing are unverified.',
      'Source/data publication review remains separate; web audio is unsupported.'],
    suites:runs,rows};
}
module.exports={suites,coverage,verifyBuild,verifyReport,summarize};
