/* MOB-007 real Wasm + viewport/touch emulation, not physical iPhone Safari.
 * node scripts/smoke-web-layout.cjs URL LOCAL_PACK_OR_upstream EVIDENCE [COMMIT]
 * Keep screenshots local: they contain game art.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
(async()=>{
  const [url,pack,evidence,expected]=process.argv.slice(2);assert(url&&pack&&evidence);
  fs.mkdirSync(evidence,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,
    args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const results={url,browser:browser.version(),iphoneSafari:'NOT RUN',input:'desktop Chromium / CDP emulated touch',checks:{},layouts:[]};
  try{
    async function boot(dpr,mobile=true){
      const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:dpr,hasTouch:mobile,isMobile:mobile});
      const page=await context.newPage(),errors=[],upstream=[],boundary=[];page.setDefaultTimeout(30000);
      page.on('pageerror',error=>errors.push(error.message));assert.deepEqual(await context.cookies(),[]);
      await page.route('**/*',route=>{
        const r=route.request();if(r.method()!=='GET'||Object.keys(r.headers()).some(k=>/^(authorization|oai-sites-authorization)$/i.test(k)))boundary.push(r.url());
        if(new URL(r.url()).hostname==='raw.githubusercontent.com')upstream.push(r.url());return route.continue();
      });
      const cdp=await context.newCDPSession(page),touches=new Map();
      async function touch(type,id,point){
        if(type==='touchStart'||type==='touchMove')touches.set(id,{id,x:point.x,y:point.y,radiusX:2,radiusY:2,force:.5});else touches.delete(id);
        await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:[...touches.values()]});
      }
      const state=()=>page.evaluate(()=>fodderInput.state());
      async function command(method,...args){
        const r=await page.evaluate(({method,args})=>fodderInput[method](...args),{method,args});assert(r.ok,`${method}: ${JSON.stringify(r)}`);
        await page.waitForFunction(id=>fodderInput.state().last.id>=id,r.id);return r;
      }
      async function stable(){await page.waitForFunction(()=>document.body.dataset.layoutReady==='true');await page.waitForTimeout(150);}
      const response=await page.goto(url);assert.equal(response.status(),200);
      await page.waitForFunction(()=>window.fodderInput&&document.querySelector('#status').textContent.includes('Engine ready'));
      const info=await page.evaluate(()=>fetch('build-info.json').then(r=>r.json()));
      if(expected){assert.equal(info.commit,expected);assert.equal(info.dirty,false);}results.commit=info.commit;results.dirty=info.dirty;
      assert((await page.locator('#identity').textContent()).includes(info.commit.slice(0,12)));
      if(pack==='upstream'){
        await page.locator('#load-demo').click();await page.waitForFunction(()=>document.querySelector('#file-progress').textContent.includes('20 of 20 demo files downloaded and verified'));
        assert.equal(upstream.length,20);
      }else await page.locator('#pack').setInputFiles(pack);
      await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.gameState==='menu');await stable();
      if(mobile){await page.locator('[data-mission="1"]').tap();await page.locator('#mission-deploy').tap();}
      else{await page.locator('[data-mission="1"]').click();await page.locator('#mission-deploy').click();}
      await page.waitForFunction(()=>fodderInput.state().ready);await stable();
      await page.evaluate(()=>{
        window.layoutCommands=[];const send=Module._of_web_command;
        Module._of_web_command=(...args)=>{const result=send(...args);layoutCommands.push({args,result});return result;};
      });
      const clear=()=>page.evaluate(()=>{layoutCommands.length=0;});
      const groundCount=()=>page.evaluate(()=>layoutCommands.filter(c=>[2,3,4,10].includes(c.args[0])).length);
      return{context,page,state,command,stable,touch,clear,groundCount,errors,upstream,boundary};
    }
    async function measure(page,label){
      const m=await page.evaluate(()=>{
        const rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
        const app=document.querySelector('#app'),style=getComputedStyle(app),a=rect(app),canvas=document.querySelector('#canvas');
        const inset={left:a.x+parseFloat(style.paddingLeft),right:a.right-parseFloat(style.paddingRight),top:a.y+parseFloat(style.paddingTop),bottom:a.bottom-parseFloat(style.paddingBottom)};
        const buttons=[...document.querySelectorAll('#topbar button,.rail button')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>({id:e.id||e.dataset.touchMode||`squad-${e.dataset.touchSquad}`, ...rect(e)}));
        return{app:a,inset,canvas:rect(canvas),intrinsic:{width:canvas.width,height:canvas.height},buttons,
          scrollY:scrollY,scrollWidth:document.documentElement.scrollWidth,viewportWidth:visualViewport.width,orientation:document.body.dataset.orientation};
      });
      for(const b of m.buttons){
        assert(b.width>=43.5&&b.height>=43.5,`${label}: small control ${b.id} ${b.width}x${b.height}`);
        assert(b.x>=m.inset.left-.6&&b.right<=m.inset.right+.6&&b.y>=m.inset.top-.6&&b.bottom<=m.inset.bottom+.6,`${label}: control outside safe frame ${b.id}`);
        const overlap=Math.min(b.right,m.canvas.right)-Math.max(b.x,m.canvas.x)>1&&Math.min(b.bottom,m.canvas.bottom)-Math.max(b.y,m.canvas.y)>1;
        assert(!overlap,`${label}: ${b.id} overlaps the canvas`);
      }
      assert(m.canvas.width>0&&m.canvas.height>0);assert(Math.abs(m.canvas.width/m.canvas.height-m.intrinsic.width/m.intrinsic.height)<.005);
      assert.equal(m.scrollY,0);assert(m.scrollWidth<=m.viewportWidth+1,`${label}: horizontal page overflow`);
      results.layouts.push({label,...m});return m;
    }
    const f=await boot(2),{page,state,command,stable,touch,clear,groundCount}=f;
    await command('setPaused',true);const frozen=(await state()).engineTick;
    for(const viewport of [{width:844,height:390},{width:812,height:375},{width:667,height:375},{width:568,height:320},{width:915,height:412}]){
      await page.setViewportSize(viewport);await stable();await measure(page,`${viewport.width}x${viewport.height}`);
    }
    await page.setViewportSize({width:844,height:390});
    await page.evaluate(()=>{const a=document.querySelector('#app');a.style.setProperty('--safe-left','44px');a.style.setProperty('--safe-right','44px');a.style.setProperty('--safe-bottom','21px');});
    await stable();const safe=await measure(page,'844x390 simulated safe areas');assert(safe.canvas.height>250);
    await page.screenshot({path:path.join(evidence,'landscape-safe.png')});
    assert.equal((await state()).engineTick,frozen,'Layout alone must not unpause the user');

    await clear();await page.locator('#field-guide').tap();await page.waitForFunction(()=>Boolean(fodderInput.state().pauseReasons&8));
    assert.equal((await state()).pauseReasons,9);await page.waitForTimeout(250);assert.equal((await state()).engineTick,frozen);
    await page.keyboard.press('p');assert.equal((await state()).pauseReasons,9,'Guide keyboard events must not reach SDL');
    for(let i=0;i<8;i++){await page.keyboard.press('Tab');assert(await page.evaluate(()=>Boolean(document.activeElement.closest('#field-dialog'))));}
    const scroll=await page.locator('.dialog-scroll').boundingBox();const start={x:scroll.x+scroll.width*.5,y:scroll.y+scroll.height-20};
    await touch('touchStart',3,start);await touch('touchMove',3,{x:start.x,y:start.y-130});await touch('touchEnd',3);await page.waitForTimeout(150);
    assert(await page.locator('.dialog-scroll').evaluate(e=>e.scrollTop)>0,'Guide must scroll while the page stays fixed');assert.equal(await groundCount(),0);
    await page.screenshot({path:path.join(evidence,'guide.png')});
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#field-dialog').open&&fodderInput.state().pauseReasons===1);
    assert.equal((await state()).engineTick,frozen);assert((await state()).ready,'Escape must not abort the native mission');
    await command('setPaused',false);await page.waitForFunction(t=>fodderInput.state().engineTick>t,frozen);
    results.checks.guide='Shell bit 8 composed with user bit 1; ticks frozen; scroll/focus trap/P/Escape safe; closing preserved user pause';
    await stable();await clear();await page.locator('#touch-weapons').tap();
    assert(await page.locator('#weapon-buttons').isVisible());assert(await page.locator('[data-touch-mode=grenade]').isDisabled());assert(await page.locator('[data-touch-mode=rocket]').isDisabled());
    await measure(page,'weapon picker');await page.locator('#touch-weapons').tap();assert.equal(await groundCount(),0);

    // Simulated visualViewport bars are distinct from a physical Safari result.
    await command('pan',0,0);let s=await state(),leader=s.squads[s.selectedSquad].leader;
    let target={x:leader.x+24,y:leader.y+64};let point=await page.evaluate(p=>fodderInput.worldToClient(p.x+.5,p.y+.5),target);
    await page.locator('[data-touch-mode=fire]').tap();await touch('touchStart',1,point);await page.waitForFunction(()=>fodderInput.state().fireHeld);
    await page.evaluate(()=>{
      Object.defineProperty(visualViewport,'height',{configurable:true,get:()=>315});Object.defineProperty(visualViewport,'offsetTop',{configurable:true,get:()=>24});
      visualViewport.dispatchEvent(new Event('resize'));
    });
    await page.waitForFunction(()=>!fodderInput.state().fireHeld);await touch('touchEnd',1);await stable();await measure(page,'simulated browser bars 315px + offset');
    await page.evaluate(()=>{delete visualViewport.height;delete visualViewport.offsetTop;visualViewport.dispatchEvent(new Event('resize'));});await stable();
    results.checks.visualViewport='Synthetic height/offset changes resized the safe frame and released held fire; no physical Safari bar test';

    await command('setPaused',true);const portraitFrozen=(await state()).engineTick;
    await page.evaluate(()=>{const a=document.querySelector('#app');a.style.setProperty('--safe-left','0px');a.style.setProperty('--safe-right','0px');a.style.setProperty('--safe-top','47px');a.style.setProperty('--safe-bottom','34px');});
    await page.setViewportSize({width:390,height:844});await stable();await page.waitForFunction(()=>Boolean(fodderInput.state().pauseReasons&8));
    assert(await page.locator('#portrait-guide').isVisible());assert.equal((await state()).pauseReasons,9);
    await page.screenshot({path:path.join(evidence,'portrait-guidance.png')});
    await page.locator('#field-guide').tap();await page.locator('#close-guide').tap();await page.waitForTimeout(150);
    assert.equal((await state()).pauseReasons,9,'Closing Guide cannot resume a portrait-blocked game');
    await page.locator('#keep-portrait').tap();await stable();await page.waitForFunction(()=>fodderInput.state().pauseReasons===1);
    assert.equal((await state()).engineTick,portraitFrozen);await measure(page,'390x844 portrait opt-in');
    await page.screenshot({path:path.join(evidence,'portrait-play.png')});
    await page.evaluate(()=>{const a=document.querySelector('#app');a.style.setProperty('--safe-top','0px');a.style.setProperty('--safe-bottom','21px');a.style.setProperty('--safe-left','44px');a.style.setProperty('--safe-right','44px');});
    await page.setViewportSize({width:844,height:390});await stable();assert(!await page.locator('#portrait-guide').isVisible());
    await command('setPaused',false);await command('pan',0,0);await stable();
    s=await state();leader=s.squads[s.selectedSquad].leader;target={x:leader.x+24,y:leader.y+64};
    await page.locator('[data-touch-mode=fire]').tap();await stable();point=await page.evaluate(p=>fodderInput.worldToClient(p.x+.5,p.y+.5),target);
    await touch('touchStart',1,point);await page.waitForFunction(p=>{const s=fodderInput.state(),l=s.squads[s.selectedSquad]?.leader;return s.fireHeld&&l?.aimX===p.x&&l?.aimY===p.y;},target);
    await touch('touchEnd',1);await page.waitForFunction(()=>!fodderInput.state().fireHeld);
    results.checks.portrait='Guidance/Guide compose on shell reason; portrait opt-in preserves user pause; return to landscape and actual map aiming passed';
    assert.deepEqual(f.errors,[]);assert.deepEqual(f.boundary,[]);results.checks.upstreamRequests=f.upstream.length;await f.context.close();

    const dense=await boot(3);await measure(dense.page,'DPR 3 landscape');await dense.command('pan',0,0);
    const aim=await dense.page.evaluate(()=>{const s=fodderInput.state(),l=s.squads[s.selectedSquad].leader;return{x:l.x+24,y:l.y+64};});
    await dense.page.locator('[data-touch-mode=fire]').tap();const client=await dense.page.evaluate(p=>fodderInput.worldToClient(p.x+.5,p.y+.5),aim);
    await dense.touch('touchStart',1,client);await dense.page.waitForFunction(p=>{const s=fodderInput.state(),l=s.squads[s.selectedSquad]?.leader;return s.fireHeld&&l?.aimX===p.x&&l?.aimY===p.y;},aim);
    await dense.touch('touchEnd',1);await dense.page.waitForFunction(()=>!fodderInput.state().fireHeld);
    assert.deepEqual(dense.errors,[]);assert.deepEqual(dense.boundary,[]);results.checks.upstreamRequests+=dense.upstream.length;await dense.context.close();
    results.checks.dpr3='Actual engine aim/hold/release reached the same map pixels at DPR 3';

    const desktop=await boot(1,false);await desktop.page.setViewportSize({width:640,height:480});await desktop.stable();
    await measure(desktop.page,'640x480 native desktop');assert.equal(await desktop.page.getAttribute('body','data-touch-controls'),'false');
    await desktop.page.locator('#canvas').focus();await desktop.page.keyboard.press('p');await desktop.page.waitForFunction(()=>fodderInput.state().paused);
    await desktop.page.keyboard.press('p');await desktop.page.waitForFunction(()=>!fodderInput.state().paused);
    assert.deepEqual(desktop.errors,[]);assert.deepEqual(desktop.boundary,[]);results.checks.upstreamRequests+=desktop.upstream.length;
    await desktop.page.screenshot({path:path.join(evidence,'narrow-desktop.png')});await desktop.context.close();
    results.checks.desktop='Narrow desktop/native controls retained; fitted canvas and native P passed';
    fs.writeFileSync(path.join(evidence,'layout.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
  }catch(error){
    for(const context of browser.contexts())for(const page of context.pages())try{
      fs.writeFileSync(path.join(evidence,'failure.json'),JSON.stringify({error:String(error),state:await page.evaluate(()=>window.fodderInput?.state()),body:await page.locator('body').evaluate(e=>({...e.dataset}))},null,2));
      await page.screenshot({path:path.join(evidence,'failure.png')});
    }catch(_){}throw error;
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
