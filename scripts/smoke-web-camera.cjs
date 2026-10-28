/* MOB-006 actual-engine camera checks with emulated touch, not iPhone Safari.
 * node scripts/smoke-web-camera.cjs URL LOCAL_PACK_OR_upstream EVIDENCE [COMMIT]
 * Screenshots contain game art and must remain local.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
(async () => {
  const [url, pack, evidence, expected] = process.argv.slice(2);
  assert(url && pack && evidence, 'Supply URL, local pack (or upstream), evidence and optional exact commit');
  fs.mkdirSync(evidence, {recursive:true});
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,
    args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const results = {url,browser:browser.version(),input:'CDP touch emulation on desktop Chromium',iphoneSafari:'NOT RUN',checks:{}};
  try {
    for (const dpr of [1, 2]) {
      const context = await browser.newContext({viewport:{width:915,height:600},deviceScaleFactor:dpr,hasTouch:true,isMobile:true});
      const page = await context.newPage(), errors=[], upstream=[], boundary=[];
      page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));
      assert.deepEqual(await context.cookies(),[]);
      await page.route('**/*',route=>{
        const r=route.request();
        if(r.method()!=='GET'||Object.keys(r.headers()).some(k=>/^(authorization|oai-sites-authorization)$/i.test(k)))boundary.push(r.url());
        if(new URL(r.url()).hostname==='raw.githubusercontent.com')upstream.push(r.url());
        return route.continue();
      });
      const cdp = await context.newCDPSession(page), touches = new Map();
      async function touch(type,id,point) {
        if(type==='touchStart'||type==='touchMove')touches.set(id,{id,x:point.x,y:point.y,radiusX:2,radiusY:2,force:.5});else touches.delete(id);
        await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:[...touches.values()]});
      }
      const state = ()=>page.evaluate(()=>fodderInput.state());
      const ready = ()=>page.waitForFunction(()=>fodderInput.state().ready&&!fodderInput.state().paused&&fodderInput.state().selectedSquad>=0);
      async function command(method,...args) {
        const r=await page.evaluate(({method,args})=>fodderInput[method](...args),{method,args});assert(r.ok,JSON.stringify(r));
        await page.waitForFunction(id=>fodderInput.state().last.id>=id,r.id);return r;
      }
      const clear = ()=>page.evaluate(()=>{cameraCommands.length=0;});
      const counts = ()=>page.evaluate(()=>({
        pan:cameraCommands.filter(c=>c.args[0]===7&&(c.args[1]||c.args[2])).length,
        ground:cameraCommands.filter(c=>[2,3,4,10].includes(c.args[0])).length
      }));
      const project = p=>page.evaluate(p=>fodderInput.worldToClient(p.x+.5,p.y+.5),p);
      const mode = async name=>{await page.locator(`[data-touch-mode=${name}]`).tap();await page.waitForTimeout(100);};
      const panEnded = ()=>page.waitForFunction(()=>document.querySelector('#canvas').dataset.panning==='false');
      const response=await page.goto(url);assert.equal(response.status(),200);
      await page.waitForFunction(()=>window.fodderInput&&document.querySelector('#status').textContent.includes('Engine ready'));
      const info=await page.evaluate(()=>fetch('build-info.json').then(r=>r.json()));
      if(expected){assert.equal(info.commit,expected);assert.equal(info.dirty,false);}
      results.commit=info.commit;results.dirty=info.dirty;
      if(pack==='upstream') {
        await page.locator('#load-demo').tap();
        await page.waitForFunction(()=>document.querySelector('#file-progress').textContent.includes('20 of 20 demo files downloaded and verified'));
        assert.equal(upstream.length,20);
      } else await page.locator('#pack').setInputFiles(pack);
      await page.locator('#start').tap();await page.waitForFunction(()=>document.body.dataset.gameState==='menu');
      await page.waitForTimeout(1000);
      const menu=await page.locator('#canvas').boundingBox();
      await touch('touchStart',1,{x:menu.x+menu.width*.5,y:menu.y+menu.height*.315});await page.waitForTimeout(200);await touch('touchEnd',1);
      await ready();await page.waitForFunction(()=>!document.querySelector('#touch-commands').hidden);await page.waitForTimeout(100);
      await page.evaluate(()=>{
        window.cameraCommands=[];const send=Module._of_web_command;
        Module._of_web_command=(...args)=>{const result=send(...args);cameraCommands.push({args,result});return result;};
      });
      await command('pan',0,0);
      let s=await state();const original={...s.view},leader={...s.squads[s.selectedSquad].leader};
      const groundOrder={x:leader.targetX,y:leader.targetY};
      let a=await project({x:s.view.cameraX+80,y:s.view.cameraY+100});
      let b=await project({x:s.view.cameraX+160,y:s.view.cameraY+100});
      const scale=(await project({x:s.view.cameraX+81,y:s.view.cameraY+101}));
      const sx=scale.x-a.x,sy=scale.y-a.y;
      await clear();await touch('touchStart',1,a);await touch('touchStart',2,b);
      await touch('touchMove',1,{x:a.x-4,y:a.y});await touch('touchMove',2,{x:b.x-4,y:b.y});
      await page.waitForTimeout(150);assert.equal((await counts()).pan,0,'Below-threshold jitter cannot pan');
      const shiftedA={x:a.x-32*sx,y:a.y-24*sy},shiftedB={x:b.x-32*sx,y:b.y-24*sy};
      await touch('touchMove',1,shiftedA);await touch('touchMove',2,shiftedB);await touch('touchEnd',1);
      await page.waitForFunction(v=>{const s=fodderInput.state();return s.view.cameraX===v.cameraX+32&&s.view.cameraY===v.cameraY+24;},original);
      await panEnded();const held={...(await state()).view};const afterPan=(await counts()).pan;
      await touch('touchMove',2,{x:shiftedB.x+10,y:shiftedB.y});await touch('touchEnd',2);await page.waitForTimeout(100);
      assert.deepEqual((await state()).view,held);assert.equal((await counts()).pan,afterPan);assert.equal((await counts()).ground,0);
      s=await state();assert.equal(s.manualCamera,true);assert.equal(s.fireHeld,false);
      assert.deepEqual({x:s.squads[s.selectedSquad].leader.targetX,y:s.squads[s.selectedSquad].leader.targetY},groundOrder);
      await page.screenshot({path:path.join(evidence,`panned-dpr${dpr}.png`),fullPage:true});

      // Switching combat modes keeps the inspected world view. Test the same
      // actual map aim before and after Follow, using a stationary comparison.
      const target={x:leader.x+24,y:leader.y+64};
      await mode('fire');assert.deepEqual((await state()).view,held);
      let point=await project(target);await clear();await touch('touchStart',1,point);
      await page.waitForFunction(p=>{const s=fodderInput.state(),l=s.squads[s.selectedSquad]?.leader;return s.fireHeld&&l?.aimX===p.x&&l?.aimY===p.y;},target);
      await touch('touchStart',2,{x:point.x+10,y:point.y+10});await page.waitForFunction(()=>!fodderInput.state().fireHeld);
      await touch('touchMove',2,{x:point.x-20,y:point.y+10});await touch('touchEnd',2);await touch('touchEnd',1);
      assert.equal((await counts()).pan,0,'Fire mode must not promote a second finger to camera intent');
      await page.locator('#touch-follow').tap();
      await page.waitForFunction(v=>{
        const s=fodderInput.state();
        return s.ready&&!s.manualCamera&&(s.view.cameraX!==v.cameraX||s.view.cameraY!==v.cameraY);
      },held);
      const followed={...(await state()).view};assert.notDeepEqual(followed,held);
      await command('pan',0,0);await mode('fire');point=await project(target);await touch('touchStart',1,point);
      await page.waitForFunction(p=>{const s=fodderInput.state(),l=s.squads[s.selectedSquad]?.leader;return s.fireHeld&&l?.aimX===p.x&&l?.aimY===p.y;},target);
      await touch('touchEnd',1);await page.waitForFunction(()=>!fodderInput.state().fireHeld);

      await mode('pan');s=await state();a=await project({x:s.view.cameraX+100,y:s.view.cameraY+100});
      const delta=await page.evaluate(()=>fodderInput.clientDeltaToMap(20,20));const beforeSingle={...s.view};await clear();
      await touch('touchStart',1,a);await touch('touchMove',1,{x:a.x-20,y:a.y-20});await touch('touchEnd',1);
      await page.waitForFunction(({v,delta})=>{const s=fodderInput.state();return s.view.cameraX===v.cameraX+Math.round(delta.x)&&s.view.cameraY===v.cameraY+Math.round(delta.y);},{v:beforeSingle,delta});
      assert.equal((await counts()).ground,0);assert((await counts()).pan>0);

      // A second pair exercises the opposite lifting order; a third touch and
      // a HUD-first sequence must never acquire a new camera/ground gesture.
      await mode('move');s=await state();a=await project({x:s.view.cameraX+80,y:s.view.cameraY+100});b=await project({x:s.view.cameraX+160,y:s.view.cameraY+100});
      await clear();await touch('touchStart',1,a);await touch('touchStart',2,b);
      await touch('touchMove',1,{x:a.x+20,y:a.y});await touch('touchMove',2,{x:b.x+20,y:b.y});await touch('touchEnd',2);await panEnded();
      await page.waitForTimeout(100);const countBefore=(await counts()).pan;
      await touch('touchMove',1,{x:a.x+40,y:a.y});await touch('touchEnd',1);await page.waitForTimeout(100);
      assert.equal((await counts()).pan,countBefore);assert.equal((await counts()).ground,0);
      await clear();await touch('touchStart',1,a);await touch('touchStart',2,b);await touch('touchStart',3,{x:b.x+10,y:b.y});
      await touch('touchMove',1,{x:a.x-20,y:a.y});await touch('touchEnd',3);await touch('touchEnd',2);await touch('touchEnd',1);
      assert.deepEqual(await counts(),{pan:0,ground:0});
      const hud=await page.locator('#touch-selection').boundingBox();
      await touch('touchStart',3,{x:hud.x+hud.width/2,y:hud.y+hud.height/2});await touch('touchStart',1,a);await touch('touchStart',2,b);
      await touch('touchMove',1,{x:a.x-20,y:a.y});await touch('touchEnd',1);await touch('touchEnd',2);await touch('touchEnd',3);
      assert.deepEqual(await counts(),{pan:0,ground:0});

      await mode('pan');await touch('touchStart',1,a);await touch('touchMove',1,{x:a.x-20,y:a.y});
      await touch('touchCancel',1);await panEnded();await page.waitForTimeout(100);await clear();
      await page.waitForTimeout(100);assert.deepEqual(await counts(),{pan:0,ground:0});
      await mode('pan');await touch('touchStart',1,a);await touch('touchMove',1,{x:a.x-20,y:a.y});
      await page.setViewportSize({width:844,height:390});await panEnded();await touch('touchEnd',1);await clear();
      await page.waitForTimeout(100);assert.deepEqual(await counts(),{pan:0,ground:0});
      await mode('pan');s=await state();a=await project({x:s.view.cameraX+100,y:s.view.cameraY+80});
      const resized=await page.evaluate(()=>fodderInput.clientDeltaToMap(12,12));const beforeResizePan={...s.view};
      await touch('touchStart',1,a);await touch('touchMove',1,{x:a.x-12,y:a.y-12});await touch('touchEnd',1);
      await page.waitForFunction(({v,d})=>{const s=fodderInput.state();return s.view.cameraX===v.cameraX+Math.round(d.x)&&s.view.cameraY===v.cameraY+Math.round(d.y);},{v:beforeResizePan,d:resized});
      await page.screenshot({path:path.join(evidence,`resized-dpr${dpr}.png`),fullPage:true});

      // Native map limits remain authoritative even when the drag requests more.
      await ready();await page.evaluate(()=>{for(let i=0;i<12;i++){const r=fodderInput.pan(128,128);if(!r.ok)throw Error(r.reason);}});
      await page.waitForFunction(()=>fodderInput.state().pending===0);await mode('pan');s=await state();const edge={...s.view};
      a=await project({x:s.view.cameraX+100,y:s.view.cameraY+80});await clear();
      await touch('touchStart',1,a);await touch('touchMove',1,{x:a.x-20,y:a.y-20});await touch('touchEnd',1);
      await page.waitForFunction(()=>fodderInput.state().pending===0);assert.deepEqual((await state()).view,edge);
      assert((await counts()).pan>0);assert.equal((await counts()).ground,0);
      assert.deepEqual(errors,[]);assert.deepEqual(boundary,[]);
      results.checks[`dpr${dpr}`]={threshold:'sub-8px centroid jitter ignored',twoFinger:'actual +32,+24 engine camera delta; no ground command',
        ownership:'both lift orders, third touch, HUD-first, Fire cancellation and no pointer inheritance passed',
        singlePan:'one-finger Pan changed actual engine view',follow:'engine squad-follow restored; same actual map aim after recenter',
        interruptions:'touchCancel and viewport resize ended gestures without later commands',resize:'actual pan delta correct after 844x390 resize/contain letterboxing',
        bounds:'native map clamp held view at edge',upstreamRequests:upstream.length,cheats:await page.getAttribute('body','data-cheats')};
      await context.close();
    }
    fs.writeFileSync(path.join(evidence,'camera.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
  } catch(error) {
    for(const context of browser.contexts())for(const page of context.pages())try {
      fs.writeFileSync(path.join(evidence,'failure.json'),JSON.stringify({error:String(error),state:await page.evaluate(()=>window.fodderInput?.state()),feedback:await page.locator('#touch-feedback').textContent()},null,2));
      await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true});
    } catch (_) { /* Preserve original failure. */ }
    throw error;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
