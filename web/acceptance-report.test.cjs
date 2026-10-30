const {test}=require('node:test'),assert=require('node:assert/strict');
const {suites,verifyBuild,verifyReport,summarize}=require('../scripts/web-acceptance-report.cjs');
const commit='a'.repeat(40),build={commit,dirty:false,data:'b'.repeat(40),scripts:'c'.repeat(40)};
const complete=()=>suites.map(s=>({id:s.id,status:'PASS'}));
test('Green desktop suites never pass phone, combat victory, performance or release gates',()=>{
 const r=summarize(build,complete(),true);assert(r.automatedChecksPassed);assert.equal(r.acceptance,'BLOCKED');
 assert(r.rows.every(row=>row.phone==='NOT RUN'));
 for(const id of ['G01','I04','P02','P03','P04','R01','R02'])assert.equal(r.rows.find(row=>row.id===id).desktop,'NOT RUN');
 assert.equal(r.rows.find(row=>row.id==='B08').desktop,'PASS');
});
test('A failed child prevents a full pass and identifies its coverage as failed',()=>{
 const runs=complete();runs.find(r=>r.id==='saves').status='FAIL';const r=summarize(build,runs,true);
 assert(!r.automatedChecksPassed);assert.equal(r.rows.find(row=>row.id==='S02').desktop,'FAIL');
});
test('Partial runs and changed deployments cannot reuse green status',()=>{
 assert(!summarize(build,complete().slice(0,2),true).automatedChecksPassed);
 const r=summarize(build,complete(),false);assert(!r.automatedChecksPassed);
 assert.equal(r.rows.find(row=>row.id==='B08').desktop,'BLOCKED');
});
test('Dirty, abbreviated or wrong build identities are rejected',()=>{
 verifyBuild(build,commit);assert.throws(()=>verifyBuild({...build,dirty:true},commit));
 assert.throws(()=>verifyBuild(build,'a'.repeat(12)));assert.throws(()=>verifyBuild(build,'d'.repeat(40)));
});
test('Exit success without a completed matching suite report is insufficient',()=>{
 assert.throws(()=>verifyReport('saves',null,commit));assert.throws(()=>verifyReport('saves',{commit,checks:{}},commit));
 assert.throws(()=>verifyReport('saves',{commit:'d'.repeat(40),checks:{reopen:'pass'}},commit));
 assert.throws(()=>verifyReport('rendering',{build,passed:false},commit));
 assert.throws(()=>verifyReport('rendering',{build:{...build,dirty:true},passed:true},commit));
 verifyReport('rendering',{build,passed:true},commit);
 verifyReport('touch',{build:'build '+commit.slice(0,12),checks:{primary:'pass'}},commit);
});
test('Every standalone playtest row has an explicit report disposition',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const text=fs.readFileSync(path.join(__dirname,'../docs/mobile/PLAYTEST.md'),'utf8');
 const documented=[...text.matchAll(/^\| ([BIUGSLPR]\d{2}) \|/gm)].map(match=>match[1]).sort();
 assert.deepEqual(Object.keys(require('../scripts/web-acceptance-report.cjs').coverage).sort(),documented);
});
