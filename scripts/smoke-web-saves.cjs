/* Actual Wasm + IndexedDB reload/restore. No real iPhone Safari claim.
 * node scripts/smoke-web-saves.cjs URL PACK_OR_upstream EVIDENCE [COMMIT] [--fixtures]
 * Profiles, exported progress and screenshots stay local under EVIDENCE.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
(async()=>{
 const [url,pack,evidence,expected,...flags]=process.argv.slice(2);assert(url&&pack&&evidence);
 fs.mkdirSync(evidence,{recursive:true});const profile=path.resolve(evidence,'profile');fs.rmSync(profile,{recursive:true,force:true});
 const results={url,iphoneSafari:'NOT RUN',input:'Chromium touch emulation / actual IndexedDB',checks:{}};let active;
 const args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
 async function boot(folder=profile,denied=false){
  const context=await chromium.launchPersistentContext(folder,{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args,viewport:{width:844,height:390},deviceScaleFactor:2,hasTouch:true,isMobile:true});active=context;
  if(denied)await context.addInitScript(()=>Object.defineProperty(window,'indexedDB',{get:()=>({open(){throw new DOMException('Storage denied for test','SecurityError');}})}));
  const page=await context.newPage(),errors=[],network=[];let upstream=0;page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const q=r.request();if(q.method()!=='GET'||Object.keys(q.headers()).some(k=>/^(authorization|oai-sites-authorization)$/i.test(k)))network.push(q.url());if(new URL(q.url()).hostname==='raw.githubusercontent.com')upstream++;return r.continue();});
  const response=await page.goto(url);assert.equal(response.status(),200);
  await page.waitForFunction(()=>window.fodderInput&&document.querySelector('#status').textContent.includes('Engine ready'));
  const info=await page.evaluate(()=>fetch('build-info.json').then(r=>r.json()));if(expected){assert.equal(info.commit,expected);assert.equal(info.dirty,false);}results.commit=info.commit;results.browser=context.browser()?.version()||'persistent Chromium';
  if(pack==='upstream'){await page.locator('#load-demo').tap();await page.waitForFunction(()=>document.querySelector('#file-progress').textContent.includes('20 of 20 demo files downloaded and verified'));assert.equal(upstream,20);}
  else await page.locator('#pack').setInputFiles(pack);
  await page.locator('#start').tap();await page.waitForFunction(()=>fodderInput.state().stage==='menu');
  const state=()=>page.evaluate(()=>fodderInput.state());
  const raw=()=>page.evaluate(()=>Module.FS.readFile('/Saves/browser-v1/current.json',{encoding:'utf8'}));
  const native=()=>page.evaluate(()=>JSON.parse(Module.UTF8ToString(Module._of_web_checkpoint(0))).native);
  const tap=selector=>page.locator(selector).tap();
  async function choose(number){await tap(`[data-mission="${number}"]`);await page.waitForFunction(()=>fodderInput.state().stage==='briefing');}
  async function menu(){await tap('#mission-menu');await page.waitForFunction(()=>fodderInput.state().stage==='menu');}
  async function save(){const revision=await page.evaluate(()=>fodderSaves.state().revision);await tap('#checkpoint-save');await page.waitForFunction(previous=>fodderSaves.state().revision>previous&&!fodderSaves.state().busy&&fodderSaves.state().message.startsWith('Saved checkpoint'),revision);}
  async function resume(){await tap('#checkpoint-continue');await page.waitForFunction(()=>fodderInput.state().stage==='briefing');}
  async function finish(){assert.deepEqual(errors,[]);assert.deepEqual(network,[]);await context.close();active=null;}
  return{page,state,raw,native,tap,choose,menu,save,resume,finish,context};
 }
 const core=n=>{const c={...n};delete c.Timestamp;delete c.SaveName;return c;};
 try{
  let f=await boot();await f.choose(1);await f.save();await f.menu();await f.choose(2);await f.save();
  const saved=await f.raw(),savedNative=JSON.parse(saved).native;
  await f.menu();await f.tap('#checkpoint-previous');await f.page.waitForFunction(()=>fodderInput.state().stage==='briefing');
  assert.equal((await f.state()).mission.number,1);assert.equal(await f.raw(),saved);await f.menu();await f.resume();
  assert.equal((await f.state()).mission.number,2);
  results.checks.explicitPrevious='Use previous checkpoint restored mission 1 without overwriting current mission 2; Continue still restored mission 2';
  const downloadPromise=f.page.waitForEvent('download');await f.tap('#checkpoint-export');const download=await downloadPromise;
  const exported=path.resolve(evidence,'checkpoint-export.json');await download.saveAs(exported);
  assert.equal(JSON.parse(fs.readFileSync(exported)).native.mMissionNumber,2);
  await f.page.screenshot({path:path.join(evidence,'saved.png')});await f.finish();
  f=await boot();assert.equal(JSON.parse(await f.raw()).native.mMissionNumber,2);await f.resume();assert.equal((await f.state()).mission.map,'mapm2');
  assert.deepEqual(core(await f.native()),core(savedNative));await f.page.screenshot({path:path.join(evidence,'restored.png')});await f.menu();
  results.checks.reopen='Real persistent browser profile closed/reopened; IDBFS loaded before engine startup; saved mission 2 and native progress restored to its briefing';
  const before=await f.raw();
  const mutations=[file=>file.schema=99,file=>file.compat.scripts='wrong',file=>file.native.mMissionNumber=999,
   file=>file.native.mMission_Troops.push(file.native.mMission_Troops[0]),file=>file.native.mRecruits_Available_Count=999999,
   file=>file.native.DataVersion.mName='another game',file=>file.native.mMission_Troops[0].mRank=500,
   file=>file.native.SaveVersion=2,file=>file.native.mMission_Troops[0].mRecruitID=0];
  const imports=['{broken'];
  for(const mutate of mutations){const file=JSON.parse(before);mutate(file);delete file.checksum;file.checksum=await f.page.evaluate(v=>OpenFodderSaves.digest(v),file);imports.push(JSON.stringify(file));}
  for(let i=0;i<imports.length;i++){
   const revision=await f.page.evaluate(()=>fodderSaves.state().revision);
   await f.page.locator('#checkpoint-import').setInputFiles({name:`bad-${i}.json`,mimeType:'application/json',buffer:Buffer.from(imports[i])});
   await f.page.waitForFunction(previous=>fodderSaves.state().revision>previous&&!fodderSaves.state().busy&&fodderSaves.state().message.startsWith('Checkpoint action failed'),revision);
   assert.equal(await f.raw(),before);assert.equal((await f.state()).stage,'menu');
  }
  results.checks.invalidImport='Malformed/schema/content mismatch and correctly checksummed invalid native mission, roster length, counts, version and rank rejected; durable checkpoint and current scene unchanged';
  await f.choose(1);await f.save();await f.menu();
  assert.equal(JSON.parse(await f.raw()).native.mMissionNumber,1);
  const importRevision=await f.page.evaluate(()=>fodderSaves.state().revision);
  await f.page.locator('#checkpoint-import').setInputFiles(exported);await f.page.waitForFunction(previous=>fodderSaves.state().revision>previous&&!fodderSaves.state().busy&&fodderSaves.state().message.startsWith('Saved checkpoint'),importRevision);
  assert.equal(JSON.parse(await f.raw()).native.mMissionNumber,2);assert.equal(await f.page.evaluate(()=>fodderSaves.state().previous.summary.number),1);
  results.checks.backupImport='Downloaded mission-2 backup replaced a different mission-1 save and retained mission 1 as previous';
  await f.choose(1);
  await f.page.evaluate(()=>{window.originalSaveSync=Module.FS.syncfs;Module.FS.syncfs=(populate,callback)=>populate?originalSaveSync(populate,callback):callback(new Error('Quota failure for test'));});
  await f.tap('#checkpoint-save');await f.page.waitForFunction(()=>!fodderSaves.state().busy&&fodderSaves.state().message.includes('Quota failure'));
  assert.equal(JSON.parse(await f.raw()).native.mMissionNumber,2);
  await f.page.evaluate(()=>{Module.FS.syncfs=originalSaveSync;});await f.finish();
  f=await boot();assert.equal(JSON.parse(await f.raw()).native.mMissionNumber,2);
  results.checks.failedWrite='Failed sync never acknowledged a new save; in-memory rollback and real close/reopen retained mission 2';
  await f.choose(1);await f.save();await f.menu();await f.choose(2);await f.save();await f.menu();
  await f.page.evaluate(async()=>{Module.FS.writeFile('/Saves/browser-v1/current.json','corrupt fixture');await new Promise((resolve,reject)=>Module.FS.syncfs(false,e=>e?reject(e):resolve()));});await f.finish();
  f=await boot();assert.match(await f.page.locator('#checkpoint-status').textContent(),/Recovered previous/);await f.resume();assert.equal((await f.state()).mission.number,1);await f.finish();
  results.checks.recovery='Corrupted durable primary was left untouched; previous verified mission-1 checkpoint recovered and resumed';
  const deniedProfile=path.resolve(evidence,'denied-profile');fs.rmSync(deniedProfile,{recursive:true,force:true});
  f=await boot(deniedProfile,true);assert.match(await f.page.locator('#storage-status').textContent(),/unavailable/);await f.choose(1);
  assert(await f.page.locator('#checkpoint-save').isDisabled());assert(await f.page.locator('#checkpoint-export').isEnabled());
  await f.tap('#mission-deploy');await f.page.waitForFunction(()=>fodderInput.state().ready&&!fodderInput.state().paused);
  assert.equal(await f.page.evaluate(()=>JSON.parse(Module.UTF8ToString(Module._of_web_checkpoint(0))).ok),false);
  await f.finish();results.checks.denied='Denied IndexedDB gave visible nonfatal feedback; Save disabled, briefing export available, normal battlefield still playable; live-battle export rejected';
  if(flags.includes('--fixtures')){
   assert(['127.0.0.1','localhost'].includes(new URL(url).hostname));
   const fixtureProfile=path.resolve(evidence,'fixture-profile');fs.rmSync(fixtureProfile,{recursive:true,force:true});f=await boot(fixtureProfile);
   await f.page.evaluate(()=>{const p='/Campaigns/Amiga Format Christmas Special.ofc';window.originalCampaign=Module.FS.readFile(p);const c=JSON.parse(new TextDecoder().decode(originalCampaign));c.Missions[0].Phases[0].Objectives=[];Module.FS.writeFile(p,JSON.stringify(c));});
   await f.choose(1);await f.tap('#mission-deploy');await f.page.waitForFunction(()=>fodderInput.state().stage==='result');assert.equal((await f.state()).mission.result.outcome,'won');
   await f.page.evaluate(()=>Module.FS.writeFile('/Campaigns/Amiga Format Christmas Special.ofc',originalCampaign));
   await f.tap('#mission-next');await f.page.waitForFunction(()=>fodderInput.state().stage==='briefing');await f.save();
   const survivors=JSON.parse(await f.raw()).native;assert.equal(survivors.mMission_Troops.filter(t=>t.mRecruitID>=0).length,4);await f.finish();
   f=await boot(fixtureProfile);await f.resume();assert.deepEqual(core(await f.native()),core(survivors));
   await f.tap('#mission-deploy');await f.page.waitForFunction(()=>fodderInput.state().ready&&!fodderInput.state().paused);assert.equal((await f.state()).squads[0].count,4);assert.equal((await f.state()).mission.map,'mapm2');await f.finish();
   results.checks.survivors='Local goal fixture completed mission 1; original campaign bytes restored before saving. Four returning recruit IDs/ranks/kills and reserves round-tripped through real native JSON and browser reopen, then deployed on mapm2. Not an unmodified combat victory.';
  }
  fs.writeFileSync(path.join(evidence,'saves.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
 }catch(error){if(active)for(const page of active.pages())try{fs.writeFileSync(path.join(evidence,'failure.json'),JSON.stringify({error:String(error),engine:await page.evaluate(()=>window.fodderInput?.state()),storage:await page.locator('#storage-status').textContent(),log:await page.locator('#log').textContent()},null,2));await page.screenshot({path:path.join(evidence,'failure.png')});}catch(_){}throw error;}
 finally{if(active)await active.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
