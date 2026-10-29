/* Actual Wasm mission flow. Browser touch emulation is not an iPhone result.
 * node scripts/smoke-web-mission.cjs URL PACK_OR_upstream EVIDENCE [COMMIT] [--fixtures]
 * Screenshots contain game art: keep evidence local.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
(async()=>{
  const [url,pack,evidence,expected,...flags]=process.argv.slice(2);assert(url&&pack&&evidence);
  const fixtures=flags.includes('--fixtures');
  if(fixtures)assert(['localhost','127.0.0.1'].includes(new URL(url).hostname),'Fixtures are local-browser-only');
  fs.mkdirSync(evidence,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,
    args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const results={url,browser:browser.version(),input:'CDP/Chromium emulated touch',iphoneSafari:'NOT RUN',checks:{}};
  async function boot(){
    const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,hasTouch:true,isMobile:true});
    const page=await context.newPage(),errors=[],network=[],upstream=[];page.setDefaultTimeout(30000);
    page.on('pageerror',e=>errors.push(e.message));assert.deepEqual(await context.cookies(),[]);
    await page.route('**/*',route=>{
      const r=route.request();if(r.method()!=='GET'||Object.keys(r.headers()).some(k=>/^(authorization|oai-sites-authorization)$/i.test(k)))network.push(r.url());
      if(new URL(r.url()).hostname==='raw.githubusercontent.com')upstream.push(r.url());return route.continue();
    });
    const response=await page.goto(url);assert.equal(response.status(),200);
    await page.waitForFunction(()=>window.fodderInput&&document.querySelector('#status').textContent.includes('Engine ready'));
    const info=await page.evaluate(()=>fetch('build-info.json').then(r=>r.json()));
    if(expected){assert.equal(info.commit,expected);assert.equal(info.dirty,false);}results.commit=info.commit;results.dirty=info.dirty;
    assert((await page.locator('#identity').textContent()).includes(info.commit.slice(0,12)));
    if(pack==='upstream'){
      await page.locator('#load-demo').tap();await page.waitForFunction(()=>document.querySelector('#file-progress').textContent.includes('20 of 20 demo files downloaded and verified'));
      assert.equal(upstream.length,20);
    }else await page.locator('#pack').setInputFiles(pack);
    await page.locator('#start').tap();await page.waitForFunction(()=>fodderInput.state().stage==='menu');
    const state=()=>page.evaluate(()=>fodderInput.state());
    const ready=()=>page.waitForFunction(()=>fodderInput.state().ready&&!fodderInput.state().paused);
    const result=()=>page.waitForFunction(()=>fodderInput.state().stage==='result');
    const tap=id=>page.locator(id).tap();
    async function deploy(number){await tap(`[data-mission="${number}"]`);await tap('#mission-deploy');await ready();}
    async function abort(){
      await tap('#field-guide');await tap('#mission-abort');await tap('#confirm-abort');await result();
      assert.equal((await state()).mission.result.outcome,'aborted');
    }
    async function finish(){assert.deepEqual(errors,[]);assert.deepEqual(network,[]);await context.close();}
    return{context,page,state,ready,result,tap,deploy,abort,finish,upstream};
  }
  try{
    const f=await boot(),{page,state,ready,tap,deploy}=f;
    assert.equal((await state()).mission.missions.length,2);
    await page.screenshot({path:path.join(evidence,'menu.png')});
    // Contract probes are separate from the touch-only mission played below.
    const contract=await page.evaluate(()=>({
      invalid:[0,-1,3,1.5].map(n=>fodderInput.selectMission(n)),
      wrongState:[fodderInput.deployMission(),fodderInput.retryMission(),fodderInput.abortMission(),fodderInput.continueMission()],
      wrongArgument:Module._of_web_command(11,1,1)
    }));
    assert(contract.invalid.every(r=>!r.ok&&r.reason==='invalid'));
    assert(contract.wrongState.every(r=>!r.ok&&r.reason==='unavailable'));assert.equal(contract.wrongArgument,-1);
    const queue=await page.evaluate(()=>{
      const select=fodderInput.selectMission(1),cancel=fodderInput.cancel(),duplicate=fodderInput.selectMission(2);return{select,cancel,duplicate};
    });
    assert(queue.select.ok&&queue.cancel.ok);assert.deepEqual(queue.duplicate,{ok:false,reason:'busy'});
    await page.waitForFunction(()=>fodderInput.state().stage==='briefing');assert.equal((await state()).mission.number,1);
    await tap('#mission-menu');await page.waitForFunction(()=>fodderInput.state().stage==='menu');
    results.checks.validation='Invalid IDs/arguments and wrong-state actions rejected; duplicate transition busy; Cancel preserved queued selection';

    await tap('[data-mission="1"]');await page.waitForFunction(()=>fodderInput.state().stage==='briefing');
    assert.deepEqual((await state()).mission.objectives,['KILL ALL ENEMY']);
    assert.equal((await state()).mission.map,'mapm1');
    await page.screenshot({path:path.join(evidence,'briefing.png')});
    await tap('#mission-deploy');await ready();const initial=await state();assert.equal(initial.mission.result,null);
    assert.equal(await page.getAttribute('body','data-cheats'),'off');assert.equal(initial.squads[0].count,4);
    // Real touch orders on the unmodified mission. Walk into enemy territory
    // without firing; defeat must come from the engine losing its actual troops.
    const trail=[];
    for(let i=0;i<65;i++){
      const s=await state();trail.push({stage:s.stage,tick:s.engineTick,leader:s.squads?.[s.selectedSquad]?.leader});
      if(s.stage==='result')break;
      if(s.stage==='battlefield'&&s.ready&&!s.paused){
        const leader=s.squads[s.selectedSquad]?.leader;
        if(leader){
          const point={x:Math.max(s.view.cameraX+8,Math.min(s.view.cameraX+s.view.width-s.view.sidebar-8,leader.y>450?310:leader.x)),y:s.view.cameraY+s.view.height-32};
          const client=await page.evaluate(p=>fodderInput.worldToClient(p.x+.5,p.y+.5),point);
          await page.touchscreen.tap(client.x,client.y);
        }
      }
      await page.waitForTimeout(1000);
    }
    let s=await state();assert.equal(s.stage,'result','The unmodified mission must reach an actual defeat');
    assert.equal(s.mission.result.outcome,'lost');assert.equal(s.mission.result.cheats,false);assert.equal(s.mission.canContinue,false);
    const loss={...s.mission.result};await page.waitForTimeout(300);assert.deepEqual((await state()).mission.result,loss);
    assert(await page.locator('#mission-next').isHidden());
    assert.deepEqual(await page.evaluate(()=>fodderInput.fireStart({x:451,y:120})),{ok:false,reason:'not-battlefield'});
    await page.screenshot({path:path.join(evidence,'defeat.png')});
    results.loss=loss;results.trail=trail;results.checks.touchDefeat='Unmodified mapm1: menu → briefing → deploy → touch movement → actual troop loss → stable engine defeat';

    await tap('#mission-retry');await ready();s=await state();assert.equal(s.mission.number,1);assert.equal(s.mission.map,'mapm1');
    assert.equal(s.mission.attempt,loss.attempt+1);assert.equal(s.squads[0].count,4);assert.equal(s.mission.result,null);
    await tap('#field-guide');await page.waitForFunction(()=>fodderInput.state().pauseReasons===8);
    const frozen=(await state()).engineTick;await page.waitForTimeout(250);assert.equal((await state()).engineTick,frozen);
    await tap('#mission-abort');await tap('#cancel-abort');await tap('#close-guide');await ready();assert.equal((await state()).mission.result,null);
    await page.waitForFunction(t=>fodderInput.state().engineTick>t,frozen);
    // Manual pause is an API regression probe; the resume itself is touch UI.
    await page.evaluate(()=>fodderInput.setPaused(true));await page.waitForFunction(()=>fodderInput.state().pauseReasons===1);
    await tap('#field-guide');await tap('#mission-resume');await ready();assert.equal((await state()).pauseReasons,0);
    await f.abort();s=await state();assert.equal(s.mission.canContinue,false);
    assert(await page.locator('#mission-next').isHidden());await page.screenshot({path:path.join(evidence,'aborted.png')});
    await tap('#mission-menu');await page.waitForFunction(()=>fodderInput.state().stage==='menu');assert.equal((await state()).mission.result,null);
    await deploy(2);assert.equal((await state()).mission.map,'mapm2');await f.abort();
    await tap('#mission-retry');await ready();assert.equal((await state()).mission.number,2);assert.equal((await state()).mission.map,'mapm2');
    await f.abort();await tap('#mission-menu');await page.waitForFunction(()=>fodderInput.state().stage==='menu');
    results.checks.retryAbort='Touch Retry restored fresh troops/same mission; Guide paused/resumed; abort confirmation cancelled safely; explicit abort stayed distinct; return/menu and mission-2 replay passed';
    // Short landscape and portrait menus must scroll internally, never the page.
    for(const viewport of [{width:568,height:320},{width:390,height:844}]){
      await page.setViewportSize(viewport);await page.waitForTimeout(200);
      await page.locator('[data-mission="2"]').scrollIntoViewIfNeeded();
      const geometry=await page.locator('[data-mission="2"]').boundingBox();assert(geometry.width>=44&&geometry.height>=44);
      assert.equal(await page.evaluate(()=>scrollY),0);assert(await page.locator('[data-mission="2"]').isVisible());
      await page.screenshot({path:path.join(evidence,`menu-${viewport.width}.png`)});
    }
    results.checks.upstreamRequests=f.upstream.length;await f.finish();
    fs.writeFileSync(path.join(evidence,'mission.json'),JSON.stringify(results,null,2)+'\n');

    if(fixtures){
      const g=await boot();
      await g.page.evaluate(()=>{
        // Only this ephemeral browser's filesystem is modified. No fixture
        // assets are written to disk, source, artifacts or hosting.
        const campaignPath='/Campaigns/Amiga Format Christmas Special.ofc',campaign=JSON.parse(Module.FS.readFile(campaignPath,{encoding:'utf8'}));
        for(const mission of campaign.Missions)mission.Phases[0].Objectives=[];
        Module.FS.writeFile(campaignPath,JSON.stringify(campaign));
      });
      await g.tap('[data-mission="1"]');await g.tap('#mission-deploy');await g.result();
      let won=await g.state();assert.equal(won.mission.result.outcome,'won');assert.equal(won.mission.result.cheats,false);assert(won.mission.canContinue);
      assert.deepEqual(await g.page.evaluate(()=>fodderInput.abortMission()),{ok:false,reason:'unavailable'});
      await g.page.screenshot({path:path.join(evidence,'fixture-victory.png')});
      await g.tap('#mission-next');await g.page.waitForFunction(()=>fodderInput.state().stage==='briefing');
      assert.equal((await g.state()).mission.number,2);assert.equal((await g.state()).mission.map,'mapm2');
      await g.tap('#mission-deploy');await g.result();won=await g.state();assert.equal(won.mission.result.outcome,'won');assert.equal(won.mission.canContinue,false);
      assert(await g.page.locator('#mission-next').isHidden());assert.deepEqual(await g.page.evaluate(()=>fodderInput.continueMission()),{ok:false,reason:'unavailable'});
      await g.tap('#mission-menu');await g.page.waitForFunction(()=>fodderInput.state().stage==='menu');await g.finish();
      results.checks.localGoalFixtures='Actual native goal completion with both missions using empty-goal fixtures in browser memory; win/continue/final-demo branch passed. Not an unmodified combat victory.';
    }
    fs.writeFileSync(path.join(evidence,'mission.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
  }catch(error){
    for(const context of browser.contexts())for(const page of context.pages())try{
      fs.writeFileSync(path.join(evidence,'failure.json'),JSON.stringify({error:String(error),state:await page.evaluate(()=>window.fodderInput?.state()),log:await page.locator('#log').textContent()},null,2));
      await page.screenshot({path:path.join(evidence,'failure.png')});
    }catch(_){}throw error;
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
