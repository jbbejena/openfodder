/* One sequential pass of the existing browser harness. No phone-readiness claim.
 * node scripts/smoke-web-acceptance.cjs URL LOCAL_PACK NEW_EVIDENCE_DIR FULL_COMMIT [--fixtures] [--only=id,id]
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn,spawnSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const {suites,verifyBuild,verifyReport,summarize}=require('./web-acceptance-report.cjs');
async function main(){
  const [url,packArg,evidenceArg,expected,...flags]=process.argv.slice(2);
  assert(url&&packArg&&evidenceArg&&expected,'Supply URL, local pack, NEW evidence directory and full commit');
  const target=new URL(url);assert(['http:','https:'].includes(target.protocol));assert(!target.username&&!target.password,'Use an anonymous preview');
  for(const flag of flags)assert(flag==='--fixtures'||flag.startsWith('--only='),'Unknown option: '+flag);
  if(flags.includes('--fixtures'))assert(['localhost','127.0.0.1'].includes(target.hostname),'Goal fixtures are local-only');
  const selected=flags.find(f=>f.startsWith('--only='))?.slice(7).split(',') || suites.map(s=>s.id);
  assert(selected.length&&selected.every(id=>suites.some(s=>s.id===id)),'Unknown/empty suite selection');
  const pack=path.resolve(packArg),evidence=path.resolve(evidenceArg);assert(fs.statSync(pack).isFile(),'Local validated pack required');
  assert(!fs.existsSync(evidence),'Use a new evidence directory: never reuse stale reports/profiles');
  fs.mkdirSync(evidence,{recursive:true});
  const manifest=require('../web/content-manifest.json');
  const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const revision=spawnSync('git',['rev-parse','HEAD'],{cwd:path.join(__dirname,'..'),encoding:'utf8'});
  const runner={node:process.version,revision:revision.status===0?revision.stdout.trim():null,
    cliSha256:hash(__filename),reportModuleSha256:hash(path.join(__dirname,'web-acceptance-report.cjs'))};
  const runs=[],startedAt=new Date().toISOString();let build=null,stable=false,fatal=null,child=null,interrupted=false;
  const save=()=>{
    const report={...summarize(build,runs,stable),url,startedAt,finishedAt:new Date().toISOString(),
      runner,content:{id:manifest.id,dataRevision:manifest.data_revision,files:manifest.files.length,
        logicalBytes:manifest.files.reduce((sum,f)=>sum+f.size,0)},fatal};
    fs.writeFileSync(path.join(evidence,'acceptance.json'),JSON.stringify(report,null,2)+'\n');return report;
  };
  async function identity(){
    const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
    const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
    try{
      const context=await browser.newContext();assert.equal((await context.cookies()).length,0);
      const page=await context.newPage();assert.equal((await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000})).status(),200);
      const value=await page.evaluate(async()=>{
        const response=await fetch('build-info.json',{cache:'no-store'});if(!response.ok)throw Error('Build metadata HTTP '+response.status);
        return response.json();
      });verifyBuild(value,expected);assert.equal(value.data,manifest.data_revision,'Wrong demo revision');return value;
    }finally{await browser.close();}
  }
  function stopChild(){
    if(!child)return;
    try{if(process.platform==='win32')child.kill();else process.kill(-child.pid,'SIGTERM');}catch{}
  }
  function stop(){interrupted=true;stopChild();}
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
  try{
    build=await identity();save();
    for(const suite of suites){
      if(!selected.includes(suite.id)||interrupted){runs.push({id:suite.id,status:'NOT RUN'});continue;}
      const dir=path.join(evidence,suite.id);fs.mkdirSync(dir);
      const log=fs.openSync(path.join(dir,'run.log'),'w'),began=Date.now();
      console.log(`START ${suite.id}`);
      const args=[path.join(__dirname,suite.script),url,pack,dir,expected];
      if(flags.includes('--fixtures')&&['mission','saves'].includes(suite.id))args.push('--fixtures');
      const run={id:suite.id,scriptSha256:hash(path.join(__dirname,suite.script)),status:'FAIL',report:`${suite.id}/${suite.report}`,log:`${suite.id}/run.log`};
      try{
        const result=await new Promise((resolve,reject)=>{
          child=spawn(process.execPath,args,{stdio:['ignore',log,log],detached:process.platform!=='win32'});
          const timer=setTimeout(()=>{run.timeout=true;stopChild();},300000);
          child.once('error',error=>{clearTimeout(timer);reject(error);});
          child.once('exit',(code,signal)=>{clearTimeout(timer);resolve({code,signal});});
        });
        child=null;run.exitCode=result.code;run.signal=result.signal;
        assert.equal(result.code,0,`${suite.id} exited unsuccessfully`);
        verifyReport(suite.id,JSON.parse(fs.readFileSync(path.join(dir,suite.report),'utf8')),expected);
        run.status='PASS';
      }catch(error){run.error=error.message;}
      finally{fs.closeSync(log);run.durationMs=Date.now()-began;runs.push(run);save();}
      console.log(`${run.status} ${suite.id} (${run.durationMs}ms)`);
    }
    const after=await identity();assert.deepEqual(after,build,'Deployment changed during the acceptance run');stable=true;
  }catch(error){fatal=error.message;console.error(error);}
  finally{
    process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);
    const report=save();console.log(`Report: ${path.join(evidence,'acceptance.json')}`);
    console.log('Physical iPhone acceptance: BLOCKED / NOT RUN');
    if(fatal||interrupted||runs.some(r=>r.status==='FAIL'))process.exitCode=1;
    // A focused --only run is useful, but cannot claim the full automated pass.
    console.log('All automated suites passed: '+report.automatedChecksPassed);
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
