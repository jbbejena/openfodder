/* Actual Wasm and browser lifecycle. Chromium/CDP is not physical iPhone Safari.
 * node scripts/smoke-web-lifecycle.cjs URL PACK_OR_upstream EVIDENCE [COMMIT]
 * Screenshots contain game art; keep all evidence local.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const assertWebFrame=require('./assert-web-frame.cjs');
(async()=>{
 const [url,pack,evidence,expected]=process.argv.slice(2);assert(url&&pack&&evidence);fs.mkdirSync(evidence,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,
  ignoreDefaultArgs:['--disable-back-forward-cache'],args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,hasTouch:true,isMobile:true}),page=await context.newPage();
 const errors=[],boundary=[];let upstream=0;page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 const results={url,browser:browser.version(),input:'Chromium emulated touch / actual focus and history / synthetic freeze',iphoneSafari:'NOT RUN',homeScreen:'NOT RUN',checks:{}};
 await page.route('**/*',r=>{const q=r.request();if(q.method()!=='GET'||Object.keys(q.headers()).some(k=>/^(authorization|oai-sites-authorization)$/i.test(k)))boundary.push(q.url());if(new URL(q.url()).hostname==='raw.githubusercontent.com')upstream++;return r.continue();});
 async function load(){
  await page.waitForFunction(()=>window.fodderLifecycle&&document.querySelector('#status').textContent.includes('Engine ready'));
  if(pack==='upstream'){await page.locator('#load-demo').tap();await page.waitForFunction(()=>document.querySelector('#file-progress').textContent.includes('20 of 20 demo files downloaded and verified'));}
  else await page.locator('#pack').setInputFiles(pack);
  await page.locator('#start').tap();await page.waitForFunction(()=>fodderInput.state().stage==='menu');
 }
 const state=()=>page.evaluate(()=>fodderInput.state());
 async function ready(){await page.waitForFunction(()=>fodderInput.state().ready&&!fodderInput.state().paused);}
 async function rendered(){
  return assertWebFrame(page);
 }
 async function resume(){await page.bringToFront();await page.waitForFunction(()=>fodderLifecycle.state().canReturn);await page.locator('#lifecycle-return').tap();await page.waitForFunction(()=>fodderInput.state().lifecycleReasons===0&&!document.querySelector('#lifecycle-dialog').open);}
 async function command(method,...args){const r=await page.evaluate(v=>fodderInput[v.method](...v.args),{method,args});assert(r.ok,JSON.stringify(r));await page.waitForFunction(id=>fodderInput.state().last.id>=id,r.id);}
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:false});let held=null;
 async function fire(){
  await page.locator('[data-touch-mode=fire]').tap();const p=await page.evaluate(()=>{const s=fodderInput.state(),l=s.squads[s.selectedSquad].leader;return fodderInput.worldToClient(l.x+24,l.y+64);});held={id:1,x:p.x,y:p.y,radiusX:2,radiusY:2,force:.5};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[held]});await page.waitForFunction(()=>fodderInput.state().fireHeld);
 }
 async function lift(){if(held){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});held=null;}}
 try{
  const response=await page.goto(url);assert.equal(response.status(),200);await load();
  const info=await page.evaluate(()=>fetch('build-info.json').then(r=>r.json()));if(expected){assert.equal(info.commit,expected);assert.equal(info.dirty,false);}results.commit=info.commit;results.dirty=info.dirty;
  assert((await page.locator('#identity').textContent()).includes(info.commit.slice(0,12)));if(pack==='upstream')assert.equal(upstream,20);
  const invalid=await page.evaluate(()=>[-1,1,8,23,2.5,2**32,NaN,Infinity].map(n=>Module._of_web_lifecycle(n)));assert(invalid.every(n=>n===-1));assert.equal((await state()).lifecycleReasons,0);
  await page.locator('[data-mission="1"]').tap();await page.waitForFunction(()=>fodderInput.state().stage==='briefing');
  // A transition already accepted before interruption is retained but cannot run
  // while suspended. New mission/combat commands must be refused immediately.
  const queued=await page.evaluate(()=>{const reply=fodderInput.deployMission();window.dispatchEvent(new Event('blur'));return{reply,state:fodderInput.state(),rejected:fodderInput.selectMission(2)};});
  assert(queued.reply.ok);assert.equal(queued.state.stage,'briefing');assert(queued.state.lifecycleReasons);assert.equal(queued.rejected.reason,'paused');
  await page.waitForTimeout(200);assert.equal((await state()).stage,'briefing');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await resume();await ready();
  results.checks.transition='Raw masks bounded; accepted Deploy survived interruption without advancing while away; new commands rejected until explicit return';
  results.checks.colorsBefore=await rendered();
  await page.screenshot({path:path.join(evidence,'battlefield-before.png')});
  await page.evaluate(()=>{window.lifecycleBoundaries=[];const apply=Module._of_web_lifecycle;Module._of_web_lifecycle=mask=>{const before=fodderInput.state(),result=apply(mask);lifecycleBoundaries.push({mask,before,after:fodderInput.state()});return result;};});
  await fire();const other=await context.newPage(),otherCdp=await context.newCDPSession(other);await otherCdp.send('Emulation.setFocusEmulationEnabled',{enabled:false});await other.goto('about:blank');await other.bringToFront();
  await page.waitForFunction(()=>!document.hasFocus(),null,{polling:50});
  const focus=await page.evaluate(()=>({hidden:document.hidden,focused:document.hasFocus(),policy:fodderLifecycle.state(),engine:fodderInput.state()}));
  assert(!focus.focused);assert(focus.policy.waiting);assert.equal(focus.engine.fireHeld,false);
  const stopped=focus.engine.engineTick;await page.waitForTimeout(800);assert.equal((await state()).engineTick,stopped);
  await page.bringToFront();await page.waitForFunction(()=>fodderLifecycle.state().canReturn);assert((await state()).lifecycleReasons&16);await lift();
  await page.screenshot({path:path.join(evidence,'return-paused.png')});await resume();await ready();await page.waitForFunction(t=>fodderInput.state().engineTick>t,stopped);
  assert.equal((await state()).fireHeld,false);await other.close();
  results.checks.colorsReturned=await rendered();
  await page.screenshot({path:path.join(evidence,'battlefield-returned.png')});
  assert(await page.evaluate(()=>lifecycleBoundaries.some(b=>b.before.fireHeld&&!b.after.fireHeld&&b.before.engineTick===b.after.engineTick)));
  results.checks.realFocus={result:'Real tab focus loss immediately released held touch fire and froze native ticks; focus return retained pause until tap, with no inherited firing',hidden:focus.hidden};
  // Manual and Guide pause survive independently of lifecycle.
  await command('setPaused',true);await page.locator('#field-guide').tap();await page.waitForFunction(()=>fodderInput.state().pauseReasons===9);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  assert.equal((await state()).pauseReasons,25);const manualTick=(await state()).engineTick;
  await page.keyboard.press('p');await page.keyboard.press('Escape');assert(await page.locator('#lifecycle-dialog').evaluate(e=>e.open));assert.equal((await state()).pauseReasons,25);
  await resume();assert.equal((await state()).pauseReasons,9);assert(await page.locator('#field-dialog').evaluate(e=>e.open));
  await page.locator('#close-guide').tap();await page.waitForFunction(()=>fodderInput.state().pauseReasons===1);await page.waitForTimeout(250);assert.equal((await state()).engineTick,manualTick);
  await command('setPaused',false);await ready();results.checks.composedPause='Manual + Guide + lifecycle (25) → return (9) → close Guide (1); native tick unchanged until explicit user unpause';
  // Chromium freezes hidden pages. Disable Playwright's focus emulation and
  // actually background this one before requesting freeze; observe the event.
  await page.evaluate(()=>{window.freezeSignals=0;document.addEventListener('freeze',()=>freezeSignals++);});
  await fire();const freezer=await context.newPage(),freezerCdp=await context.newCDPSession(freezer);await freezerCdp.send('Emulation.setFocusEmulationEnabled',{enabled:false});await freezer.goto('about:blank');await freezer.bringToFront();
  const wasHidden=await page.evaluate(()=>document.hidden);
  const beforeFreeze=(await state()).engineTick;
  await cdp.send('Page.setWebLifecycleState',{state:'frozen'});await new Promise(r=>setTimeout(r,1200));await cdp.send('Page.setWebLifecycleState',{state:'active'});
  await page.bringToFront();await page.waitForFunction(()=>fodderLifecycle.state().waiting&&fodderLifecycle.state().canReturn);assert.equal((await state()).fireHeld,false);
  const freezeSignals=await page.evaluate(()=>window.freezeSignals);assert.equal((await state()).engineTick,beforeFreeze);await freezer.close();
  const frozen=(await state()).engineTick;await page.waitForTimeout(300);assert.equal((await state()).engineTick,frozen);await lift();await resume();
  const ticks=await page.evaluate(async()=>{const ticks=[fodderInput.state().engineTick];for(let i=0;i<12;i++){await new Promise(requestAnimationFrame);ticks.push(fodderInput.state().engineTick);}return ticks;});
  assert(ticks.every((t,i)=>i===0||t-ticks[i-1]>=0&&t-ticks[i-1]<=1));assert(ticks.at(-1)>ticks[0]);
  results.checks.freezeAttempt={observed:freezeSignals>0,wasHidden,signals:freezeSignals,result:freezeSignals>0?'Actual Chromium freeze event observed':'CDP request did not establish a real freeze in this automation environment; real freeze NOT RUN',ticks};
  // Exercise the lifecycle handlers/native boundary even when automation keeps
  // document.visibilityState visible and prevents a genuine Chromium freeze.
  await fire();const synthetic=await page.evaluate(()=>{document.dispatchEvent(new Event('freeze'));return fodderInput.state();});
  assert.equal(synthetic.fireHeld,false);assert(synthetic.lifecycleReasons&16);await page.waitForTimeout(250);assert.equal((await state()).engineTick,synthetic.engineTick);
  await page.evaluate(()=>document.dispatchEvent(new Event('resume')));await lift();await resume();await ready();
  results.checks.syntheticFreeze='Synthetic document freeze/resume immediately released held fire, froze native ticks and required explicit return; distinct from a real browser/OS freeze';
  await fire();const hidden=await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));return fodderInput.state();});
  assert.equal(hidden.fireHeld,false);assert.equal(hidden.lifecycleReasons,18);
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.body.dataset.portraitBlocked==='true');assert.equal((await state()).engineTick,hidden.engineTick);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await lift();await resume();
  await page.waitForFunction(()=>fodderInput.state().pauseReasons===8);assert.equal((await state()).engineTick,hidden.engineTick);
  await page.screenshot({path:path.join(evidence,'portrait-after-return.png')});
  await page.setViewportSize({width:844,height:390});await ready();
  results.checks.visibilityRotation='Synthetic hidden signal immediately released fire; portrait rotation during interruption kept ticks frozen; Return retained portrait pause until landscape';
  // Persisted pagehide/pageshow signals exercise retained UI intervals. This is
  // explicitly separate from the real Back/Forward Cache attempt below.
  for(let i=0;i<3;i++){
   await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
   assert((await state()).lifecycleReasons&16);await resume();await ready();
  }
  await page.locator('#field-guide').tap();await page.waitForFunction(()=>fodderInput.state().pauseReasons===8);
  await page.locator('#mission-abort').tap();await page.locator('#confirm-abort').tap();await page.waitForFunction(()=>fodderInput.state().stage==='result');assert.equal((await state()).mission.result.outcome,'aborted');
  await page.locator('#mission-menu').tap();await page.waitForFunction(()=>fodderInput.state().stage==='menu');await page.locator('[data-mission="2"]').tap();await page.locator('#mission-deploy').tap();await ready();assert.equal((await state()).mission.map,'mapm2');
  results.checks.persistedSignals='Three synthetic persisted pagehide/pageshow cycles kept UI intervals alive; actual Guide/Abort/result/menu/mapm2 flow still updated afterward';
  await page.evaluate(()=>{window.navigationToken=String(Math.random());window.restoredFromCache=false;addEventListener('pageshow',e=>{if(e.persisted)restoredFromCache=true;});});const token=await page.evaluate(()=>navigationToken);
  const notUsed=[];cdp.on('Page.backForwardCacheNotUsed',e=>notUsed.push(e.notRestoredExplanations?.map(x=>x.reason)));
  await page.goto('about:blank');const history=await cdp.send('Page.getNavigationHistory');
  await cdp.send('Page.navigateToHistoryEntry',{entryId:history.entries[history.currentIndex-1].id});
  await page.waitForFunction(()=>window.fodderLifecycle);
  const cache=await page.evaluate(()=>({same:window.navigationToken===undefined?false:navigationToken,restored:window.restoredFromCache===true}));
  if(cache.same===token&&cache.restored){await page.waitForFunction(()=>fodderLifecycle.state().waiting);await resume();await ready();results.checks.colorsAfterCache=await rendered();results.checks.backForwardCache='Real persisted Back/Forward Cache restore passed; existing battlefield, pixels and UI resumed through explicit return';}
  else{
   results.checks.backForwardCache={result:'Browser reloaded instead of retaining this page; live restoration NOT RUN, supported checkpoint fallback remains the reload route',notUsed};
   await load();await page.locator('[data-mission="1"]').tap();await page.locator('#mission-deploy').tap();await ready();
  }
  // Error recovery must remain reachable above/after the lifecycle modal.
  await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});
  assert(await page.locator('#lifecycle-dialog').evaluate(e=>e.open));
  await page.evaluate(()=>document.querySelector('#canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  assert.equal(await page.locator('#lifecycle-dialog').evaluate(e=>e.open),false);assert(await page.locator('#reload').isVisible());
  assert.match(await page.locator('#status').textContent(),/graphics context was lost/);
  results.checks.contextLoss='Synthetic graphics-context loss during recovery closed the modal and exposed the existing Reload/error route';
  assert.deepEqual(errors,[]);assert.deepEqual(boundary,[]);results.upstreamRequests=upstream;
  fs.writeFileSync(path.join(evidence,'lifecycle.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
 }catch(error){try{fs.writeFileSync(path.join(evidence,'failure.json'),JSON.stringify({error:String(error),engine:await state(),policy:await page.evaluate(()=>window.fodderLifecycle?.state()),log:await page.locator('#log').textContent()},null,2));await page.screenshot({path:path.join(evidence,'failure.png')});}catch(_){}throw error;}
 finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
