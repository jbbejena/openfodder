/* MOB-004 behavior checks against the actual Wasm engine, not a mocked state.
 * node scripts/smoke-web-input.cjs URL LOCAL_PACK LOCAL_EVIDENCE_DIRECTORY
 * Retain screenshots locally: they contain game art. Real iPhone is separate.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
(async () => {
  const [url, pack, evidence] = process.argv.slice(2);
  assert(url && pack && evidence, 'Supply URL, local pack and evidence directory');
  fs.mkdirSync(evidence,{recursive:true});
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,
    args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const result={url,browser:browser.version(),input:'desktop mouse and direct command API',checks:{},iphoneSafari:'NOT RUN'};
  try {
    async function exercise(dpr) {
      const context = await browser.newContext({viewport:{width:1100,height:1000},deviceScaleFactor:dpr});
      const page = await context.newPage();
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      const state=()=>page.evaluate(()=>fodderInput.state());
      const ready=()=>page.waitForFunction(()=>fodderInput.state().ready && fodderInput.state().selectedSquad>=0);
      async function command(method,...args) {
        const receipt=await page.evaluate(({method,args})=>fodderInput[method](...args),{method,args});
        assert(receipt.ok,method+': '+JSON.stringify(receipt));
        if(receipt.id) {
          await page.waitForFunction(id=>fodderInput.state().last.id>=id,receipt.id);
          const s=await state(); assert.equal(s.last.id,receipt.id,method); assert.equal(s.last.code,0,method+': '+JSON.stringify(s));
        }
        return receipt;
      }
      await page.goto(url);
      await page.waitForFunction(()=>window.fodderInput && document.querySelector('#status').textContent.includes('Engine ready'));
      assert.equal((await state()).stage,'uninitialized');
      assert.deepEqual(await page.evaluate(()=>fodderInput.selectSquad(0)),{ok:false,reason:'uninitialized'});
      assert.deepEqual(await page.evaluate(()=>fodderInput.secondaryTo({x:100,y:100})),{ok:false,reason:'uninitialized'});
      assert.equal(await page.evaluate(()=>Module._of_web_command(2,NaN,20)),-1);
      assert.equal(await page.evaluate(()=>Module._of_web_command(99,0,0)),-1);
      assert.equal((await page.evaluate(()=>fodderInput.cancel())).ok,true);
      await page.locator('#launch-diagnostics > summary').click();
      await page.locator('#input-test').check();
      await page.locator('#pack').setInputFiles(pack);
      await page.locator('#start').click();
      await page.waitForFunction(()=>document.body.dataset.gameState==='menu');
      assert.equal((await state()).stage,'menu');
      assert.deepEqual(await page.evaluate(()=>fodderInput.moveTo({x:100,y:100})),{ok:false,reason:'not-battlefield'});
      assert.deepEqual(await page.evaluate(()=>fodderInput.secondaryTo({x:100,y:100})),{ok:false,reason:'not-battlefield'});
      await page.waitForTimeout(1000);
      const rect=await page.locator('#canvas').boundingBox();
      await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.315);
      await page.mouse.down();await page.waitForTimeout(200);await page.mouse.up();
      await page.waitForFunction(()=>document.body.dataset.gameState==='battlefield');
      await ready();
      result.build=await page.locator('#identity').textContent();
      let s=await state();
      result.initialState=s;
      const selected=s.selectedSquad;
      assert(s.squads[selected].count>0);
      const fullQueue=await page.evaluate(id=>{
        const receipts=Array.from({length:32},()=>fodderInput.selectSquad(id));
        const overflow=fodderInput.selectSquad(id);
        const cancel=fodderInput.cancel();
        return {receipts,overflow,cancel,pending:fodderInput.state().pending};
      },selected);
      assert(fullQueue.receipts.every(r=>r.ok));
      assert.deepEqual(fullQueue.overflow,{ok:false,reason:'busy'});
      assert.equal(fullQueue.cancel.ok,true);assert.equal(fullQueue.pending,1);
      await page.waitForFunction(id=>fodderInput.state().last.id===id,fullQueue.cancel.id);
      assert.deepEqual(await page.evaluate(()=>fodderInput.selectSquad(3)),{ok:false,reason:'invalid'});
      for(const squad of s.squads.filter(x=>!x.count))
        assert.deepEqual(await page.evaluate(id=>fodderInput.selectSquad(id),squad.id),{ok:false,reason:'unavailable'});
      await command('selectSquad',selected);await ready();
      s=await state();
      const leader=s.squads[selected].leader;
      // Keep the same map target through actual browser geometry/camera changes.
      const target={x:leader.x+24,y:leader.y+64};
      assert.deepEqual(await page.evaluate(()=>fodderInput.moveAt(-10,-10)),{ok:false,reason:'outside-playfield'});
      assert.deepEqual(await page.evaluate(()=>fodderInput.moveTo({x:-1,y:10})),{ok:false,reason:'invalid'});
      const projections=[];
      async function aimAtTarget(label) {
        const receipt=await page.evaluate(({target,label})=>{
          const client=fodderInput.worldToClient(target.x,target.y);
          const projected=fodderInput.clientToWorld(client.x,client.y);
          const receipt=fodderInput.fireStartAt(client.x,client.y);
          return {client,projected,receipt,label};
        },{target,label});
        assert.deepEqual(receipt.projected,target,label);
        assert(receipt.receipt.ok,label+': '+JSON.stringify(receipt));
        await page.waitForFunction(({x,y})=>{
          const s=fodderInput.state(),l=s.squads[s.selectedSquad]?.leader;
          return s.fireHeld && l?.aimX===x && l?.aimY===y;
        },target);
        projections.push(receipt);
      }
      await aimAtTarget('original');
      await command('fireAim',{x:target.x+4,y:target.y+4});
      await page.waitForFunction(({x,y})=>{const s=fodderInput.state(),l=s.squads[s.selectedSquad].leader;return l.aimX===x+4&&l.aimY===y+4;},target);
      await command('fireStop');assert.equal((await state()).fireHeld,false);
      await page.evaluate(()=>{const c=document.querySelector('#canvas');c.style.width='640px';c.style.height='640px';});
      await aimAtTarget('contain letterbox');
      const boxed=await page.locator('#canvas').boundingBox();
      assert.deepEqual(await page.evaluate(({x,y})=>fodderInput.moveAt(x,y),{x:boxed.x+boxed.width/2,y:boxed.y+5}),{ok:false,reason:'outside-playfield'});
      await command('cancel');
      assert.equal((await state()).fireHeld,false);
      await command('fireStop');await command('fireStop');
      assert.deepEqual(await page.evaluate(t=>fodderInput.fireAim(t),target),{ok:false,reason:'unavailable'});
      await page.evaluate(()=>{const c=document.querySelector('#canvas');c.style.width='';c.style.height='';});
      await command('pan',0,0);
      const beforeDesktopResize=(await state()).last.id;
      await page.setViewportSize({width:780,height:900});
      await page.waitForTimeout(150);
      assert.equal((await state()).last.id,beforeDesktopResize,'Disabled touch controls must not cancel desktop camera ownership on resize');
      assert.equal((await state()).manualCamera,true);
      await command('pan',0,0); // establish manual ownership before measuring a delta
      s=await state();const beforePan={...s.view};const beforeTarget={...s.squads[selected].leader};
      const maxX=s.map.left+s.map.width-(s.view.width-s.view.sidebar);
      const dx=s.view.cameraX+16<maxX?16:-16;
      await command('pan',dx,0);
      s=await state();assert.equal(s.view.cameraX,beforePan.cameraX+dx);assert.equal(s.manualCamera,true);
      assert.equal(s.squads[selected].leader.targetX,beforeTarget.targetX,'Pan must not issue a movement order');
      await aimAtTarget('camera pan and resized CSS viewport');
      await command('cancel');
      const beforeMove=(await state()).squads[selected].leader;
      const move={x:beforeMove.x+12,y:beforeMove.y};
      // Actual C++ movement order/position, not a JS receipt or overlay.
      await command('moveTo',move);
      await page.waitForFunction(({x,y})=>{
        const s=fodderInput.state(),l=s.squads[s.selectedSquad].leader;return l.targetX===x&&l.targetY===y;
      },move);
      await page.waitForFunction(({x,y})=>{const s=fodderInput.state(),l=s.squads[s.selectedSquad].leader;return l.x!==x||l.y!==y;},beforeMove);
      await command('setPaused',true);
      await command('setPaused',true);
      const frozen=(await state()).engineTick;
      await page.waitForTimeout(500);
      assert.equal((await state()).engineTick,frozen,'Paused simulation must not advance');
      assert.deepEqual(await page.evaluate(t=>fodderInput.fireStart(t),target),{ok:false,reason:'paused'});
      assert.deepEqual(await page.evaluate(t=>fodderInput.moveTo(t),target),{ok:false,reason:'paused'});
      assert.deepEqual(await page.evaluate(t=>fodderInput.secondaryTo(t),target),{ok:false,reason:'paused'});
      await command('setPaused',true,'visibility');
      await command('setPaused',false,'user');
      assert.equal((await state()).paused,true);
      await command('cancel');assert.equal((await state()).paused,true,'Cancel must preserve pause');
      await command('setPaused',false,'visibility');
      await page.waitForFunction(t=>fodderInput.state().engineTick>t,frozen);
      await ready();
      await page.locator('#canvas').focus();
      await command('fireStart',target);
      await page.keyboard.press('p');
      await page.waitForFunction(()=>fodderInput.state().paused);
      await page.waitForFunction(()=>!fodderInput.state().fireHeld);
      const nativeFrozen=(await state()).engineTick;
      await page.waitForTimeout(250);
      assert.equal((await state()).engineTick,nativeFrozen,'Native keyboard pause remains effective');
      await page.keyboard.press('p');await page.waitForFunction(()=>!fodderInput.state().paused);
      await command('follow');await ready();
      assert.equal((await state()).manualCamera,false);
      // Actual desktop SDL right-button input after bridge cancellation.
      // Hold the view still so the native cursor's camera-follow behavior cannot
      // change a screen-space aim while this test compares one map coordinate.
      await command('pan',0,0);
      const nativeAim=await page.evaluate(()=>{
        const s=fodderInput.state(),l=s.squads[s.selectedSquad].leader;
        const target={x:l.x+24,y:l.y+64};
        return {target,client:fodderInput.worldToClient(target.x+.5,target.y+.5)};
      });
      await page.mouse.move(nativeAim.client.x,nativeAim.client.y);
      await page.mouse.down({button:'right'});
      await page.waitForFunction(t=>{const s=fodderInput.state(),l=s.squads[s.selectedSquad]?.leader;return l?.aimX===t.x&&l?.aimY===t.y-4;},nativeAim.target);
      await page.mouse.up({button:'right'});
      await command('cancel');
      s=await state();
      for(const [weapon,count] of [['grenade',s.squads[selected].grenades],['rocket',s.squads[selected].rockets]]) {
        if(count) {
          await command('selectWeapon',weapon);
          assert.equal((await state()).squads[selected].weapon,weapon==='grenade'?1:3);
        } else assert.deepEqual(await page.evaluate(w=>fodderInput.selectWeapon(w),weapon),{ok:false,reason:'unavailable'});
      }
      await command('fireStart',target);
      await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
      await page.waitForFunction(()=>!fodderInput.state().fireHeld);
      await command('fireStart',target);
      await command('setPaused',true);
      assert.equal((await state()).fireHeld,false,'Pause cancels held fire');
      await command('setPaused',false);
      await ready();
      await page.locator('#input-harness > summary').click();
      await page.waitForFunction(()=>document.body.dataset.layoutReady==='true');
      await page.waitForTimeout(100);
      await page.locator('#input-x').fill(String(target.x));await page.locator('#input-y').fill(String(target.y));
      const fire=await page.locator('#input-fire').boundingBox();
      await page.mouse.move(fire.x+fire.width/2,fire.y+fire.height/2);await page.mouse.down();
      await page.waitForFunction(()=>fodderInput.state().fireHeld);
      await page.mouse.up();await page.waitForFunction(()=>!fodderInput.state().fireHeld);
      if(dpr===1) await page.screenshot({path:path.join(evidence,'harness.png'),fullPage:true});
      await page.locator('#input-harness > summary').click();
      await page.locator('#canvas').scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);await page.screenshot({path:path.join(evidence,`battlefield-dpr${dpr}.png`)});
      result.checks[`dpr${dpr}`]={uninitialized:'pass',invalid:'pass',squadAndWeapon:'pass',coordinates:projections,
        movement:'engine destination and position changed',heldFire:'engine aim changed; stop/cancel released intent',
        pause:'idempotent; ticks frozen; independent reasons; native P preserved',cancellation:'API cancel, pause, synthetic window blur, real harness pointer release',
        nativeMenu:'desktop SDL pointer passed',nativePrimaryFire:'real SDL right-button aiming passed',queueSafety:'32 accepted; overflow rejected; cancel preempted pending orders',harness:'real pointer down/up passed'};
      assert.deepEqual(errors,[]);
      await context.close();
    }
    await exercise(1);
    await exercise(2);
    // The pinned mission has zero secondary ammo. For the valid selection path,
    // amend only a local browser-memory campaign fixture after original file
    // verification, before mission load. Never change Run, pins or hosted data.
    const fixtureContext=await browser.newContext({viewport:{width:1100,height:1000}});
    const fixturePage=await fixtureContext.newPage();
    await fixturePage.goto(url);
    await fixturePage.waitForFunction(()=>window.fodderInput && document.querySelector('#status').textContent.includes('Engine ready'));
    await fixturePage.locator('#pack').setInputFiles(pack);await fixturePage.locator('#start').click();
    await fixturePage.waitForFunction(()=>document.body.dataset.gameState==='menu');
    await fixturePage.evaluate(()=>{
      const path='/Campaigns/Amiga Format Christmas Special.ofc';
      const campaign=JSON.parse(Module.FS.readFile(path,{encoding:'utf8'}));
      campaign.Missions[0].Phases[0].Grenades=3;
      campaign.Missions[0].Phases[0].Rockets=2;
      Module.FS.writeFile(path,JSON.stringify(campaign));
    });
    await fixturePage.waitForTimeout(1000);
    const fixtureRect=await fixturePage.locator('#canvas').boundingBox();
    await fixturePage.mouse.move(fixtureRect.x+fixtureRect.width*.5,fixtureRect.y+fixtureRect.height*.315);
    await fixturePage.mouse.down();await fixturePage.waitForTimeout(200);await fixturePage.mouse.up();
    await fixturePage.waitForFunction(()=>window.fodderInput.state().ready);
    const ammo=await fixturePage.evaluate(()=>{const s=fodderInput.state();return s.squads[s.selectedSquad];});
    assert.equal(ammo.grenades,3);assert.equal(ammo.rockets,2);
    for(const [weapon,value] of [['rocket',3],['grenade',1]]) {
      const receipt=await fixturePage.evaluate(w=>fodderInput.selectWeapon(w),weapon);assert(receipt.ok);
      await fixturePage.waitForFunction(({id,value})=>{const s=fodderInput.state();return s.last.id===id&&s.squads[s.selectedSquad].weapon===value;},{id:receipt.id,value});
      const after=await fixturePage.evaluate(()=>{const s=fodderInput.state();return s.squads[s.selectedSquad];});
      assert.equal(after.grenades,3);assert.equal(after.rockets,2);
    }
    result.syntheticAmmo={result:'valid grenade/rocket selection passed without consuming ammo',
      provenance:'Pinned local demo plus an in-memory campaign fixture: Grenades=3, Rockets=2; no asset/pin/host changes',iphoneSafari:'NOT RUN'};
    await fixtureContext.close();
    fs.writeFileSync(path.join(evidence,'input.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result,null,2));
  } catch(error) {
    for(const context of browser.contexts()) for(const page of context.pages()) {
      try {
        fs.writeFileSync(path.join(evidence,'failure.json'),JSON.stringify({error:String(error),state:await page.evaluate(()=>window.fodderInput?.state())},null,2));
        await page.screenshot({path:path.join(evidence,'failure.png')});
      } catch (_) { /* Preserve the original failure if its page has gone away. */ }
    }
    throw error;
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
