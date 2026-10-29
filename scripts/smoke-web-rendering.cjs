/* Consecutive composited canvas images, pinned Playwright Core 1.57.0.
 * node scripts/smoke-web-rendering.cjs URL PACK_OR_upstream EVIDENCE [COMMIT] [--diagnostic-only]
 * Screenshots contain game art: keep evidence local, outside source/hosting.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const playwright = process.env.PLAYWRIGHT_MODULE || 'playwright-core';
const { chromium } = require(playwright);
const { PNG } = require(path.join(path.dirname(require.resolve(playwright)), 'lib/utilsBundle.js'));
const patches = [[.35,.32],[.55,.32],[.75,.32],[.35,.62],[.55,.62],[.75,.62]];
const median = values => values.sort((a,b) => a-b)[Math.floor(values.length/2)];
function pixels(buffer) {
  const png = PNG.sync.read(buffer), colors = new Set();
  for (let i=0;i<png.data.length;i+=32) colors.add(png.data.subarray(i,i+3).join(','));
  return { width: png.width, height: png.height, colors: colors.size,
    luminance: patches.map(([x,y]) => {
      const samples=[];
      for(let dy=-6;dy<6;dy++) for(let dx=-6;dx<6;dx++) {
        const i=((Math.floor(y*png.height)+dy)*png.width+Math.floor(x*png.width)+dx)*4;
        samples.push(.2126*png.data[i]+.7152*png.data[i+1]+.0722*png.data[i+2]);
      }
      return median(samples);
    }) };
}
function analyze(frames) {
  const jumps=[];
  for(let i=1;i<frames.length;i++) {
    const previous=frames[i-1].luminance, current=frames[i].luminance;
    const changes=current.map((v,j) => v-previous[j]);
    for(const sign of [-1,1]) {
      const agreeing=changes.filter((d,j) => sign*d>12 && Math.abs(d)/Math.max(8,previous[j])>.2).length;
      if(agreeing>=4) jumps.push({from:i-1,to:i,sign,agreeing,changes});
    }
  }
  return { frames:frames.length, durationMs:frames.at(-1).ms-frames[0].ms,
    min:frames[0].luminance.map((_,j)=>Math.min(...frames.map(f=>f.luminance[j]))),
    max:frames[0].luminance.map((_,j)=>Math.max(...frames.map(f=>f.luminance[j]))),
    blackFrames:frames.filter(f=>f.colors<8).map(f=>f.file), jumps };
}
(async()=>{
  const [url,pack,evidence,expected,...options]=process.argv.slice(2);
  assert(url&&pack&&evidence,'URL, pack/upstream and local evidence directory required');
  fs.mkdirSync(evidence,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,
    args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const results={url,browser:browser.version(),viewport:{width:844,height:390},dpr:2,
    input:'desktop Chromium emulated touch / SwiftShader',iphoneSafari:'NOT RUN',patches,
    tolerance:'4/6 patch medians change in the same direction by >12/255 luminance and >20%',
    requestedGapMs:90,entryFadeExcludedMs:3000,segments:{},excludedTransitions:[],restarts:[],errors:[]};
  const context=await browser.newContext({viewport:results.viewport,deviceScaleFactor:2,hasTouch:true,isMobile:true});
  const page=await context.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror',e=>results.errors.push(e.message));
  const state=()=>page.evaluate(()=>fodderInput.state());
  const tap=selector=>page.locator(selector).tap();
  const ready=()=>page.waitForFunction(()=>fodderInput.state().ready&&!fodderInput.state().paused);
  async function command(method,...args) {
    const receipt=await page.evaluate(({method,args})=>fodderInput[method](...args),{method,args});
    assert(receipt.ok,`${method}: ${JSON.stringify(receipt)}`);
    await page.waitForFunction(id=>fodderInput.state().last.id>=id,receipt.id);
  }
  async function pitch() {
    await ready();
    for(let i=0;i<4;i++){
      const y=(await state()).view.cameraY;
      await command('pan',0,Math.max(-128,Math.min(128,208-y)));
      if((await state()).view.cameraY===208)break;
    }
    await page.waitForTimeout(300);
  }
  async function fresh(reason) {
    let current=await state();
    if(current.stage==='battlefield')await command('abortMission');
    await page.waitForFunction(()=>fodderInput.state().stage==='result');
    current=await state();results.restarts.push({reason,result:current.mission.result});
    await tap('#mission-retry');await ready();await page.waitForTimeout(3000);await pitch();
  }
  async function capture(name,count,step) {
    const frames=[],start=Date.now();
    for(let i=0;i<count;i++) {
      if((await state()).stage!=='battlefield')break;
      if(step) await step(i);
      const file=`${name}-${String(i).padStart(3,'0')}.png`;
      const clip=await page.locator('#canvas').boundingBox();
      const buffer=await page.screenshot({path:path.join(evidence,file),clip});
      const current=await state();
      if(current.stage!=='battlefield'){results.excludedTransitions.push({file,stage:current.stage});break;}
      frames.push({file,ms:Date.now()-start,...pixels(buffer),state:current});
      await page.waitForTimeout(90);
    }
    assert(frames.length>=3,`${name}: fewer than three battlefield frames before a mission transition`);
    results.segments[name]={...analyze(frames),samples:frames};
    console.log(`${name}: ${count} composited images, ${results.segments[name].jumps.length} global jumps`);
  }
  try {
    assert.equal((await context.cookies()).length,0);
    assert.equal((await page.goto(url)).status(),200);
    await page.waitForFunction(()=>window.fodderInput&&document.querySelector('#status').textContent.includes('Engine ready'));
    results.build=await page.evaluate(()=>fetch('build-info.json').then(r=>r.json()));
    if(expected&&expected!=='-'){assert.equal(results.build.commit,expected);assert.equal(results.build.dirty,false);}
    assert((await page.locator('#identity').textContent()).includes(results.build.commit.slice(0,12)));
    if(pack==='upstream') {
      await tap('#load-demo');
      await page.waitForFunction(()=>document.querySelector('#file-progress').textContent.includes('20 of 20 demo files downloaded and verified'));
    } else await page.locator('#pack').setInputFiles(pack);
    await tap('#start');await page.waitForFunction(()=>fodderInput.state().stage==='menu');
    await tap('[data-mission="1"]');await tap('#mission-deploy');await ready();await page.waitForTimeout(3000);
    results.renderer=await page.evaluate(()=>{
      const gl=GL.currentContext.GLctx, extension=gl.getExtension('WEBGL_debug_renderer_info');
      window.renderProbe={draws:0,clears:0,uploads:0,sourcePixels:[],blends:[],raf:0,rafDrawHistogram:{},lastDraw:0};
      for(const name of ['drawArrays','drawElements','clear','texSubImage2D']) {
        const original=gl[name].bind(gl);
        gl[name]=(...args)=>{
          if(name.startsWith('draw')) {
            renderProbe.draws++;
            if(renderProbe.blends.length<12)renderProbe.blends.push({enabled:gl.isEnabled(gl.BLEND),src:gl.getParameter(gl.BLEND_SRC_RGB),dst:gl.getParameter(gl.BLEND_DST_RGB)});
          } else if(name==='clear')renderProbe.clears++;
          else {
            renderProbe.uploads++;
            // Stable grass texel of the complete CPU image, before GL blending.
            if(renderProbe.sourcePixels.length<24&&args[4]>200&&args[5]>200) {
              const offset=(200*args[4]+200)*4;
              renderProbe.sourcePixels.push(Array.from(args.at(-1).subarray(offset,offset+4)));
            }
          }
          return original(...args);
        };
      }
      const raf=()=>{
        if(!window.renderProbe)return;
        const n=renderProbe.draws-renderProbe.lastDraw;renderProbe.lastDraw=renderProbe.draws;
        renderProbe.raf++;renderProbe.rafDrawHistogram[n]=(renderProbe.rafDrawHistogram[n]||0)+1;
        renderProbe.rafId=requestAnimationFrame(raf);
      };renderProbe.rafId=requestAnimationFrame(raf);
      return {sdl:Module.renderer,webgl:gl.getParameter(gl.VERSION),renderer:gl.getParameter(gl.RENDERER),
        unmasked:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):null,attributes:gl.getContextAttributes()};
    });
    await pitch();results.content=(await state()).mission;
    await page.evaluate(()=>{renderProbe.sourcePixels=[];Module._of_web_performance(1);});
    await capture('ordinary-idle',6);
    results.ordinaryPresentations=await page.evaluate(()=>JSON.parse(Module.UTF8ToString(Module._of_web_performance(2))));
    // QA-only deterministic stationary scene: pause simulation, stop the automatic
    // scheduler, and complete 1/3/2 native render callbacks in one RAF opportunity.
    // This exposes dependence on previous drawing-buffer contents without changing
    // production scheduling, palette, data, blend mode or GL context attributes.
    await command('setPaused',true);const frozenTick=(await state()).engineTick;
    await page.evaluate(()=>{window.qaRender=MainLoop.func;MainLoop.pause();});
    try {
      results.diagnosticCallbacks=[];
      await capture('stationary-batched',12,async i=>{
        const count=[1,3,2,1][i%4];
        const delta=await page.evaluate(count=>new Promise(resolve=>requestAnimationFrame(()=>{
          const before={draws:renderProbe.draws,clears:renderProbe.clears,uploads:renderProbe.uploads};
          for(let j=0;j<count;j++)MainLoop.runIter(qaRender);
          resolve({callbacks:count,draws:renderProbe.draws-before.draws,clears:renderProbe.clears-before.clears,uploads:renderProbe.uploads-before.uploads});
        })),count);
        results.diagnosticCallbacks.push(delta);
      });
      assert.equal((await state()).engineTick,frozenTick,'Stationary diagnostic cannot advance simulation');
    } finally { await page.evaluate(()=>{delete window.qaRender;MainLoop.resume();}); }
    await command('setPaused',false);await pitch();
    if(!options.includes('--diagnostic-only')) {
      await fresh('Movement/fire block; native demo remains unmodified');
      // Real touch movement and held fire; fixed camera keeps the grass patches
      // away from the troops/cursor at the top edge of this starting-area view.
      await tap('[data-touch-mode="move"]');const canvas=await page.locator('#canvas').boundingBox();
      const p={x:canvas.x+canvas.width*.6,y:canvas.y+canvas.height*.4};
      const beforeMove=(await state()).squads[0].leader;
      await page.touchscreen.tap(p.x,p.y);await page.waitForTimeout(100);await pitch();await capture('move',5);
      const afterMove=(await state()).squads[0].leader;
      assert(beforeMove.x!==afterMove.x||beforeMove.y!==afterMove.y,'Real movement order moves the squad');
      await tap('[data-touch-mode="fire"]');await pitch();const cdp=await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:p.x,y:p.y,radiusX:2,radiusY:2,force:.5}]});
      await page.waitForFunction(()=>fodderInput.state().fireHeld);await capture('held-fire',5);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await page.waitForFunction(()=>!fodderInput.state().fireHeld);
      await fresh('Pan/Follow block before ordinary enemies can end the attempt');
      await tap('[data-touch-mode="pan"]');await pitch();await capture('pan',5,()=>command('pan',2,0));
      await tap('#touch-follow');await ready();await page.waitForTimeout(400);
      // Camera movement is an intentional image transition. Reposition over the
      // pitch before resuming fixed-background comparisons.
      await pitch();await capture('after-follow',5);
      await fresh('Guide/interruption block');
      await tap('#field-guide');await page.waitForFunction(()=>fodderInput.state().pauseReasons===8);
      await page.screenshot({path:path.join(evidence,'guide.png')});
      await tap('#close-guide');await pitch();await capture('after-guide',5);
      await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
      const away=(await state()).engineTick;await page.waitForTimeout(350);assert.equal((await state()).engineTick,away);
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await tap('#lifecycle-return');await pitch();
      await capture('after-interruption',5);
      await tap('#field-guide');await tap('#mission-abort');await tap('#confirm-abort');
      await page.waitForFunction(()=>fodderInput.state().stage==='result');
      await tap('#mission-retry');await ready();await page.waitForTimeout(3000);await pitch();await capture('retry',5);
    }
    results.trace=await page.evaluate(()=>{
      cancelAnimationFrame(renderProbe.rafId);const copy={...renderProbe};delete copy.rafId;return copy;
    });
    assert.deepEqual(results.errors,[]);
    for(const [name,segment]of Object.entries(results.segments)) {
      assert.deepEqual(segment.blackFrames,[],`${name}: blank composited battlefield`);
      assert.deepEqual(segment.jumps,[],`${name}: unexplained global brightness jumps`);
    }
    assert(results.ordinaryPresentations.submittedFrames>0,'Actual successful SDL presents observed');
    for(const sample of results.diagnosticCallbacks) {
      assert.equal(sample.draws,sample.callbacks,'One complete image draw per native callback');
      assert.equal(sample.clears,sample.callbacks,'One pre-draw clear per completed image');
      assert.equal(sample.uploads,sample.callbacks,'One complete image upload per native callback');
    }
    results.passed=true;
  } finally {
    fs.writeFileSync(path.join(evidence,'rendering.json'),JSON.stringify(results,null,2)+'\n');
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
