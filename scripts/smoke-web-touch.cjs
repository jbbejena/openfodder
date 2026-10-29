/* MOB-005 actual-engine touch emulation, not a real iPhone/Safari result.
 * node scripts/smoke-web-touch.cjs URL LOCAL_PACK LOCAL_EVIDENCE_DIRECTORY
 * Screenshots contain game art and must remain local.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
(async () => {
  const [url, pack, evidence] = process.argv.slice(2);
  assert(url && pack && evidence, 'Supply URL, local pack and evidence directory');
  fs.mkdirSync(evidence, {recursive:true});
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,
    args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const results = {url,browser:browser.version(),input:'CDP emulated touch / Pointer Events, desktop Chromium',
    viewport:{width:915,height:600},dpr:2,iphoneSafari:'NOT RUN',checks:{}};
  try {
    async function boot(ammoFixture) {
      const context = await browser.newContext({viewport:results.viewport,deviceScaleFactor:2,hasTouch:true,isMobile:true});
      const page = await context.newPage(), errors=[];
      page.on('pageerror', error=>errors.push(error.message));
      const cdp = await context.newCDPSession(page), touches = new Map();
      const state = ()=>page.evaluate(()=>fodderInput.state());
      async function touch(type,id,point) {
        if(type==='touchStart'||type==='touchMove') touches.set(id,{id,x:point.x,y:point.y,radiusX:2,radiusY:2,force:.5});
        else touches.delete(id);
        await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:[...touches.values()]});
      }
      await page.goto(url);
      await page.waitForFunction(()=>window.fodderInput && document.querySelector('#status').textContent.includes('Engine ready'));
      await page.locator('#pack').setInputFiles(pack);await page.locator('#start').tap();
      await page.waitForFunction(()=>document.body.dataset.gameState==='menu');
      if(ammoFixture) await page.evaluate(()=>{
        const name='/Campaigns/Amiga Format Christmas Special.ofc';
        const campaign=JSON.parse(Module.FS.readFile(name,{encoding:'utf8'}));
        campaign.Missions[0].Phases[0].Grenades=3;campaign.Missions[0].Phases[0].Rockets=2;
        Module.FS.writeFile(name,JSON.stringify(campaign));
      });
      await page.waitForTimeout(1000);
      await page.locator('[data-mission="1"]').tap();await page.locator('#mission-deploy').tap();
      await page.waitForFunction(()=>fodderInput.state().ready && !document.querySelector('#touch-commands').hidden);
      await page.waitForTimeout(100);
      await page.evaluate(()=>{
        window.touchCommandLog=[];
        const send=Module._of_web_command;
        Module._of_web_command=(...args)=>{const result=send(...args);touchCommandLog.push({args,result});return result;};
      });
      const clear=()=>page.evaluate(()=>{touchCommandLog.length=0;});
      const count=action=>page.evaluate(a=>touchCommandLog.filter(c=>c.args[0]===a).length,action);
      const project=point=>page.evaluate(p=>fodderInput.worldToClient(p.x+.5,p.y+.5),point);
      async function lockView() {
        await page.waitForFunction(()=>fodderInput.state().ready && !fodderInput.state().paused);
        const r=await page.evaluate(()=>fodderInput.pan(0,0));assert(r.ok);
        await page.waitForFunction(id=>fodderInput.state().last.id>=id,r.id);
      }
      async function mode(name) {
        const button=page.locator(`[data-touch-mode=${name}]`);
        if(!await button.isVisible())await page.locator('#touch-weapons').tap();
        await button.tap();await page.waitForTimeout(100);
      }
      return {context,page,errors,state,touch,clear,count,project,lockView,mode};
    }
    const normal=await boot(false);
    {
      const {page,state,errors}=normal;
      results.build=await page.locator('#identity').textContent();
      assert(await page.locator('#touch-enabled').isChecked());
      const s=await state();results.initialState=s;
      for(const squad of s.squads) {
        const button=page.locator(`[data-touch-squad="${squad.id}"]`);
        assert.equal(await button.isDisabled(),!squad.count);
        if(squad.count) {
          await button.tap();await page.waitForFunction(id=>fodderInput.state().selectedSquad===id&&fodderInput.state().ready,squad.id);
          await page.waitForFunction(id=>document.querySelector(`[data-touch-squad="${id}"]`).getAttribute('aria-pressed')==='true',squad.id);
        }
      }
      assert(await page.locator('[data-touch-mode=grenade]').isDisabled());
      assert(await page.locator('[data-touch-mode=rocket]').isDisabled());
      assert.deepEqual(await page.evaluate(()=>fodderInput.secondaryTo({x:100,y:100})),{ok:false,reason:'unavailable'});
      results.checks.baseline='Real pinned campaign: populated squad buttons reflect selection; empty squads and zero-ammo weapons disabled; secondary API rejects';
      assert.deepEqual(errors,[]);await normal.context.close();
    }
    const f=await boot(true),{page,state,touch,clear,count,project,lockView,mode}=f;
    await lockView();let s=await state(),leader=s.squads[s.selectedSquad].leader;
    const destination={x:leader.x+12,y:leader.y};let point=await project(destination);
    await clear();await touch('touchStart',1,point);await page.waitForTimeout(150);
    assert.equal(await count(2),0,'Move is committed on release, never touch-down or legacy SDL touch');
    assert.deepEqual((await state()).squads[s.selectedSquad].leader.targetX,leader.targetX);
    await touch('touchEnd',1);
    await page.waitForFunction(p=>{const s=fodderInput.state(),l=s.squads[s.selectedSquad].leader;return l.targetX===p.x&&l.targetY===p.y;},destination);
    await page.waitForFunction(p=>{const s=fodderInput.state(),l=s.squads[s.selectedSquad].leader;return l.x!==p.x||l.y!==p.y;},leader);
    assert.equal(await count(2),1);
    results.checks.move='One touch produced one actual engine destination and changed leader position; no down/legacy duplicate';

    await mode('fire');await lockView();s=await state();leader=s.squads[s.selectedSquad].leader;
    const aim={x:leader.x+60,y:leader.y+40};point=await project(aim);
    await clear();await touch('touchStart',1,point);
    await page.waitForFunction(p=>{const s=fodderInput.state(),l=s.squads[s.selectedSquad].leader;return s.fireHeld&&l.aimX===p.x&&l.aimY===p.y;},aim);
    const next={x:aim.x+8,y:aim.y+8};const nextPoint=await project(next);
    await touch('touchMove',1,nextPoint);
    await page.waitForFunction(p=>{const s=fodderInput.state(),l=s.squads[s.selectedSquad].leader;return l.aimX===p.x&&l.aimY===p.y;},next);
    await touch('touchEnd',1);await page.waitForFunction(()=>!fodderInput.state().fireHeld);
    assert.equal(await count(3),1);
    assert.equal((await state()).squads[0].grenades,3);assert.equal((await state()).squads[0].rockets,2);
    results.checks.primary='Touch hold/slide updated actual engine aim; lift stopped held input; no secondary ammo consumed';

    await mode('fire');await touch('touchStart',1,point);await page.waitForFunction(()=>fodderInput.state().fireHeld);
    await clear();await touch('touchStart',2,nextPoint);await page.waitForFunction(()=>!fodderInput.state().fireHeld);
    await touch('touchEnd',1);await touch('touchMove',2,{x:nextPoint.x+10,y:nextPoint.y});await touch('touchEnd',2);
    assert.equal(await count(2),0);assert.equal(await count(3),0);assert.equal(await count(4),0);
    results.checks.secondFinger='Adding a second canvas touch cancelled fire; neither finger inherited aim or issued movement';
    await mode('move');await clear();await touch('touchStart',1,point);await touch('touchStart',2,nextPoint);
    await touch('touchEnd',2);await touch('touchEnd',1);assert.equal(await count(2),0);
    results.checks.secondFingerMove='A second finger before Move release cancelled the pending tap; no movement command';

    await mode('fire');await touch('touchStart',1,point);await page.waitForFunction(()=>fodderInput.state().fireHeld);
    const outside=await page.locator('#canvas').boundingBox();
    await touch('touchMove',1,{x:outside.x+outside.width+5,y:point.y});await page.waitForFunction(()=>!fodderInput.state().fireHeld);
    await touch('touchMove',1,point);await touch('touchEnd',1);assert.equal((await state()).fireHeld,false);
    await mode('fire');await touch('touchStart',1,point);await page.waitForFunction(()=>fodderInput.state().fireHeld);
    await touch('touchCancel',1);await page.waitForFunction(()=>!fodderInput.state().fireHeld);
    results.checks.cancellation='Real emulated touch leaving the canvas and touchCancel released hold; re-entry did not resume it';

    await mode('fire');await touch('touchStart',1,point);await page.waitForFunction(()=>fodderInput.state().fireHeld);
    const moveButton=await page.locator('[data-touch-mode=move]').boundingBox();
    await clear();await touch('touchStart',2,{x:moveButton.x+moveButton.width/2,y:moveButton.y+moveButton.height/2});
    await page.waitForFunction(()=>!fodderInput.state().fireHeld);await touch('touchEnd',2);await touch('touchEnd',1);
    assert.equal(await count(2),0);assert.equal(await count(3),0);
    results.checks.hud='Second finger on HUD released aim; HUD taps and a mode switch issued no ground command';

    await mode('move');await lockView();await clear();
    await touch('touchStart',1,point);await touch('touchMove',1,{x:point.x+30,y:point.y});await touch('touchEnd',1);
    assert.equal(await count(2),0,'A drag cannot become a Move tap');
    results.checks.drag='Movement gesture exceeding 12 CSS pixels cancelled without an order';

    for(const [weapon,ammo,before,after] of [['grenade','grenades',3,2],['rocket','rockets',2,1]]) {
      await mode(weapon);await page.waitForFunction(w=>{const s=fodderInput.state();return s.squads[s.selectedSquad].weapon===(w==='grenade'?1:3);},weapon);
      await lockView();s=await state();leader=s.squads[s.selectedSquad].leader;
      const target={x:Math.min(leader.x+100,s.view.cameraX+s.view.width-s.view.sidebar-8),y:Math.min(leader.y+64,s.view.cameraY+s.view.height-8)};
      const client=await project(target);await clear();
      if(weapon==='grenade') {
        await touch('touchStart',1,client);await touch('touchEnd',1);
        await page.waitForFunction(()=>!document.querySelector('#touch-confirm').hidden);
        await page.locator('#touch-cancel').tap();
        await page.waitForFunction(()=>document.querySelector('#touch-confirm').hidden);
        assert.equal((await state()).squads[0][ammo],before);assert.equal(await count(10),0);
        await mode(weapon);
        results.checks.cancelTarget='Cancel on a marked grenade target cleared it without a shot or ammo change';
      }
      await touch('touchStart',1,client);await touch('touchEnd',1);
      await page.waitForFunction(()=>!document.querySelector('#touch-confirm').hidden);
      assert.equal((await state()).squads[0][ammo],before);assert.equal(await count(10),0);
      await page.screenshot({path:path.join(evidence,`${weapon}-target.png`)});
      await page.locator('#touch-confirm').tap();
      await page.evaluate(()=>document.querySelector('#touch-confirm').click()); // repeat click is already disarmed
      await page.waitForFunction(({ammo,after})=>fodderInput.state().squads[0][ammo]===after,{ammo,after});
      await page.waitForFunction(()=>!fodderInput.state().secondaryPending);
      await page.waitForTimeout(300);
      assert.equal((await state()).squads[0][ammo],after);assert.equal(await count(10),1);
      assert.equal(await page.locator('[data-touch-mode=move]').getAttribute('aria-pressed'),'true');
    }
    results.checks.secondary='Local in-memory Grenades=3/Rockets=2 fixture: marking consumed nothing; each explicit confirm consumed exactly one native grenade/rocket; repeated click did not repeat';
    results.fixture='Only browser-memory campaign ammo changed after pack verification. No Run, asset, manifest, host or pin changes.';

    await mode('fire');await lockView();point=await project(aim);await touch('touchStart',1,point);
    await page.waitForFunction(()=>fodderInput.state().fireHeld);
    await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>!fodderInput.state().fireHeld);
    await touch('touchEnd',1);await page.waitForTimeout(100);
    await page.screenshot({path:path.join(evidence,'landscape-844x390.png'),fullPage:true});
    results.checks.resize='915×600 → 844×390 resize released held input; responsive screenshot captured';
    await mode('fire');await lockView();s=await state();leader=s.squads[s.selectedSquad].leader;
    const resizedAim={x:leader.x+24,y:leader.y+32};point=await project(resizedAim);
    await touch('touchStart',1,point);
    await page.waitForFunction(p=>{const s=fodderInput.state(),l=s.squads[s.selectedSquad].leader;return s.fireHeld&&l.aimX===p.x&&l.aimY===p.y;},resizedAim);
    await touch('touchEnd',1);await page.waitForFunction(()=>!fodderInput.state().fireHeld);
    results.checks.resizedAim='After resize and contain letterboxing at DPR 2, touch still reached the intended actual engine map target';
    results.finalState=await state();assert.deepEqual(f.errors,[]);
    fs.writeFileSync(path.join(evidence,'touch.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
    await f.context.close();
  } catch(error) {
    for(const context of browser.contexts()) for(const page of context.pages()) try {
      fs.writeFileSync(path.join(evidence,'failure.json'),JSON.stringify({error:String(error),state:await page.evaluate(()=>window.fodderInput?.state())},null,2));
      await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true});
    } catch (_) { /* Retain the original error. */ }
    throw error;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
