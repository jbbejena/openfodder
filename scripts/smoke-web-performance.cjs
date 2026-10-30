/* Actual Wasm diagnostics and composited pixels. This is desktop Chromium,
 * not a ten-minute physical iPhone measurement.
 * node scripts/smoke-web-performance.cjs URL PACK_OR_upstream EVIDENCE [COMMIT]
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const assertWebFrame=require('./assert-web-frame.cjs');
const assertPerformanceSampling=require('./assert-web-performance.cjs');
(async()=>{
  const [url,pack,evidence,expected]=process.argv.slice(2);assert(url&&pack&&evidence);fs.mkdirSync(evidence,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,
    args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,hasTouch:true,isMobile:true});
  const page=await context.newPage(),errors=[],boundary=[],requests=[];page.setDefaultTimeout(30000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>requests.push({method:r.method(),host:new URL(r.url()).hostname}));
  await page.route('**/*',async route=>{
    const r=route.request(),headers=await r.allHeaders(),upstream=new URL(r.url()).hostname==='raw.githubusercontent.com';
    if(r.method()!=='GET'||Object.keys(headers).some(k=>/^(authorization|oai-sites-authorization)$/i.test(k))||
      (upstream&&Object.keys(headers).some(k=>/^cookie$/i.test(k))))boundary.push(r.url());
    return route.continue();
  });
  const results={url,browser:browser.version(),input:'desktop Chromium emulated touch, SwiftShader',
    iphoneSafari:'NOT RUN',tenMinutePhoneSession:'NOT RUN',checks:{},cycles:[]};
  const tap=id=>page.locator(id).tap(),state=()=>page.evaluate(()=>fodderInput.state());
  const native=()=>page.evaluate(()=>JSON.parse(Module.UTF8ToString(Module._of_web_performance(0))));
  const ready=()=>page.waitForFunction(()=>fodderInput.state().ready&&!fodderInput.state().paused);
  async function load(){
    await page.waitForFunction(()=>window.fodderPerformance&&document.querySelector('#status').textContent.includes('Engine ready'));
    if(pack==='upstream'){await tap('#load-demo');await page.waitForFunction(()=>document.querySelector('#file-progress').textContent.includes('20 of 20 demo files downloaded and verified'));}
    else await page.locator('#pack').setInputFiles(pack);
    await tap('#start');await page.waitForFunction(()=>fodderInput.state().stage==='menu');
  }
  async function guide(){if(!await page.locator('#field-dialog').evaluate(e=>e.open))await tap('#field-guide');await page.locator('#performance-panel').evaluate(e=>e.open=true);}
  async function record(){await guide();await page.locator('#performance-device').fill('Desktop Chromium QA; viewport emulated, not an iPhone');await tap('#performance-start');await ready();assert(!await page.locator('#field-dialog').evaluate(e=>e.open));}
  async function deploy(){await tap('[data-mission="1"]');await tap('#mission-deploy');await ready();}
  async function abort(){await guide();await tap('#mission-abort');await tap('#confirm-abort');await page.waitForFunction(()=>fodderInput.state().stage==='result');assert.equal((await state()).mission.result.outcome,'aborted');}
  try{
    assert.equal((await context.cookies()).length,0,'Fresh anonymous browser context before navigation');
    assert.equal((await page.goto(url)).status(),200);await load();
    const info=await page.evaluate(()=>fetch('build-info.json').then(r=>r.json()));results.commit=info.commit;results.dirty=info.dirty;
    if(expected){assert.equal(info.commit,expected);assert.equal(info.dirty,false);}
    assert((await page.locator('#identity').textContent()).includes(info.commit.slice(0,12)));
    assert.equal((await native()).recording,false);assert(await page.locator('#performance-badge').isHidden());
    await page.evaluate(()=>{window.performanceOps=[];const original=Module._of_web_performance;Module._of_web_performance=op=>{performanceOps.push(op);return original(op);};});
    await deploy();results.checks.renderedColors=await assertWebFrame(page);
    await page.waitForTimeout(1200);assert.deepEqual(await page.evaluate(()=>performanceOps),[],'No idle native sampling');
    assert.equal(await page.getAttribute('body','data-cheats'),'off');
    await record();assert.equal((await native()).recording,true);await page.waitForTimeout(5500);
    const live=await native();assert(live.submittedFrames>20&&live.activeMs>4000);assert(live.submittedFps>0);assert(live.intervals<live.submittedFrames);
    const invalid=await page.evaluate(()=>[-1,3,.5,NaN,Infinity].map(op=>JSON.parse(Module.UTF8ToString(Module._of_web_performance(op)))));
    assert(invalid.every(r=>r.ok===false));assert((await native()).submittedFrames>=live.submittedFrames,'Invalid operations cannot reset a session');
    assert(live.p95MsUpperBound>0||live.over1000Ms>0);assert(live.wasmCapacityBytes>0);
    await page.screenshot({path:path.join(evidence,'recording-battlefield.png')});
    await guide();await page.waitForFunction(()=>fodderInput.state().pauseReasons===8);
    const paused=await native(),tick=(await state()).engineTick;await page.waitForTimeout(2100);const later=await native();
    assert.equal(later.activeMs,paused.activeMs);assert.equal(later.submittedFrames,paused.submittedFrames);assert.equal((await state()).engineTick,tick);
    await page.locator('#performance-notes').fill('Automated short desktop check. Physical touch, heat and ten-minute phone performance NOT RUN.');
    await page.screenshot({path:path.join(evidence,'performance-guide.png')});
    await tap('#close-guide');await ready();await page.waitForTimeout(1200);
    // Synthetic blur uses the production synchronous boundary. Real browser
    // focus/cache return has its own separate lifecycle regression script.
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const away=await native();await page.waitForTimeout(1200);
    assert.equal((await native()).activeMs,away.activeMs);
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await tap('#lifecycle-return');await ready();await page.waitForTimeout(1300);
    // Multiple engine callbacks can occur per RAF. Assert native cadence here,
    // without asserting a relationship to display callbacks or changing clocks.
    results.nativeCallbacks=await page.evaluate(()=>new Promise(resolve=>{
      const samples=[];let before;
      const pre=()=>{before=fodderInput.state().engineTick;};
      const post=()=>{samples.push(fodderInput.state().engineTick-before);if(samples.length===15){MainLoop.preMainLoop.splice(MainLoop.preMainLoop.indexOf(pre),1);MainLoop.postMainLoop.splice(MainLoop.postMainLoop.indexOf(post),1);resolve(samples);}};
      MainLoop.preMainLoop.push(pre);MainLoop.postMainLoop.push(post);
    }));
    assert(results.nativeCallbacks.every(n=>n>=0&&n<=1));assert(results.nativeCallbacks.some(n=>n===1));
    await guide();await tap('#performance-stop');const frozen=await native();await page.waitForTimeout(1200);
    assert.equal((await native()).submittedFrames,frozen.submittedFrames);assert.equal((await native()).activeMs,frozen.activeMs);
    const pending=page.waitForEvent('download');await tap('#performance-export');const download=await pending;
    assert.match(download.suggestedFilename(),/^openfodder-performance-/);const reportPath=path.join(evidence,'performance-report.json');await download.saveAs(reportPath);
    const report=JSON.parse(fs.readFileSync(reportPath));results.baseline=report;
    assert.equal(report.format,'openfodder-performance');assert.equal(report.metadata.build.commit,info.commit);
    assert.equal(report.recording,false);assert.equal(report.stopReason,'user');assert.equal(report.phoneAcceptance.tenMinutesActive,false);
    assert(report.native.submittedFrames>20);assert(report.animationCallbacks.intervals>10);assert(report.samples.length<100);
    assert(report.loading.runtimeReadyMs>0&&report.loading.startToMenuMs>0&&report.loading.deployments[0].durationMs>0);
    assert.equal(report.loading.contentAttempts.at(-1).verifiedLogicalBytes,223382);assert.equal(report.loading.cacheState,'unknown');
    assert(report.events.some(e=>e.type==='interruption'));assert.match(report.notes,/NOT RUN/);
    assert(!JSON.stringify(report).includes('checkpointCandidate'));assert(await page.locator('#performance-badge').isHidden());
    results.checks.pauseAndExport='Guide and synthetic-away gaps excluded; stop freezes counters; actual JSON download verified';
    // Recording controls also fit a narrow phone and the shortest landscape.
    for(const viewport of [{width:568,height:320},{width:390,height:844}]){
      await page.setViewportSize(viewport);await page.waitForTimeout(200);
      await page.locator('#performance-start').scrollIntoViewIfNeeded();const box=await page.locator('#performance-start').boundingBox();
      assert(box.height>=44&&box.width>=44&&box.x>=0&&box.x+box.width<=viewport.width);assert.equal(await page.evaluate(()=>scrollX+scrollY),0);
      await page.screenshot({path:path.join(evidence,`performance-${viewport.width}.png`)});
    }
    await page.setViewportSize({width:844,height:390});await tap('#close-guide');await ready();
    for(let i=0;i<5;i++){
      await record();await page.waitForTimeout(1200);await guide();await tap('#performance-stop');
      const r=await page.evaluate(()=>fodderPerformance.report());
      fs.writeFileSync(path.join(evidence,`cycle-${i}.json`),JSON.stringify(r,null,2)+'\n');
      assert(r.native.submittedFrames>0);assertPerformanceSampling(r);
      results.cycles.push({attempt:(await state()).mission.attempt,capacityBytes:r.memory.endCapacityBytes,
        samples:r.samples.length,wallMs:r.wallMs,events:r.events.length,activeMs:r.native.activeMs});
      await abort();
      if(i%2===0){await tap('#mission-menu');await page.waitForFunction(()=>fodderInput.state().stage==='menu');await deploy();}
      else{await tap('#mission-retry');await ready();}
    }
    assert.equal(await page.evaluate(()=>performanceOps.filter(n=>n===1).length),6,'One native start per button tap');
    assert.equal(await page.evaluate(()=>performanceOps.filter(n=>n===2).length),6,'One native stop per session');
    const calls=await page.evaluate(()=>performanceOps.length);await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>performanceOps.length),calls,'Stopped sampler stays off');
    results.checks.cycles='Five recording/abort/menu-or-retry cycles; one start/stop each; bounded samples; capacity observations only, no leak-proof claim';
    // Same-context repeat navigation records observed timings. Do not infer
    // warm-cache state from cross-origin transferSize or a faster duration.
    await page.reload();await load();await deploy();await record();await page.waitForTimeout(1600);await guide();await tap('#performance-stop');
    results.repeat=await page.evaluate(()=>fodderPerformance.report());
    assert.equal(results.repeat.loading.navigationType,'reload');assert.equal(results.repeat.loading.cacheState,'unknown');
    assert.deepEqual(errors,[]);assert.deepEqual(boundary,[]);
    // A public host can issue anonymous visitor/bot-management cookies. Their
    // presence does not imply login. Never print or export their values.
    assert.equal((await context.cookies('https://raw.githubusercontent.com')).length,0,'No upstream cookies');
    results.upstreamRequests=requests.filter(r=>r.host==='raw.githubusercontent.com').length;
    if(pack==='upstream')assert.equal(results.upstreamRequests,40);
    fs.writeFileSync(path.join(evidence,'performance.json'),JSON.stringify(results,null,2)+'\n');
    console.log(JSON.stringify({commit:info.commit,checks:results.checks,baseline:{activeMs:report.native.activeMs,
      submittedFps:report.native.submittedPerActiveSecond,p95Ms:report.native.p95MsUpperBound,
      animationOpportunities:report.animationCallbacks.opportunitiesPerSecond,memory:report.memory,loading:report.loading},
      cycles:results.cycles,repeatLoading:results.repeat.loading,iphoneSafari:'NOT RUN'},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
