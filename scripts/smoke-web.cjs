/* Desktop mouse smoke test. Requires playwright-core 1.57.0 and Chromium.
 * node scripts/smoke-web.cjs URL LOCAL_PACK LOCAL_EVIDENCE_DIRECTORY
 * Screenshots contain game art: retain locally, never publish with the engine.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const assertWebFrame = require('./assert-web-frame.cjs');

(async () => {
  const [url, packFile, evidenceDir] = process.argv.slice(2);
  assert(url && packFile && evidenceDir, 'Supply URL, local pack and evidence directory');
  fs.mkdirSync(evidenceDir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  const result = { url, browser: browser.version(), viewport: '1100x900, DPR 1', input: 'desktop mouse', checks: {} };
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      assert.equal(request.method(), 'GET', 'Player files must not be uploaded');
      if (new URL(request.url()).hostname === 'raw.githubusercontent.com') {
        assert(!request.headers().authorization && !request.headers()['oai-sites-authorization'], 'Public demo downloads must not carry credentials');
      }
    });
    const boot = Date.now();
    await page.goto(url);
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Engine ready'), null, { timeout: 30000 });
    result.engineReadyMs = Date.now() - boot;
    result.identity = await page.locator('#identity').textContent();
    result.build = await page.evaluate(() => fetch('build-info.json').then(r => r.json()));
    assert(result.identity.includes(result.build.commit.slice(0, 12)), 'Visible identity must match build-info');
    assert(await page.locator('#start').isDisabled(), 'Missing pack must block startup');
    result.checks.missingPack = 'pass';
    const corrupt = JSON.parse(fs.readFileSync(packFile, 'utf8'));
    const first = Object.keys(corrupt.files)[0];
    corrupt.files[first] = 'AA==';
    await page.locator('#pack').setInputFiles({ name: 'corrupt.ofdata', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(corrupt)) });
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Content mismatch'));
    assert(await page.locator('#start').isDisabled());
    result.checks.corruptPack = 'pass';
    // The iPhone path selects extracted files in separate picker visits, with
    // no computer-generated pack. It is still desktop automation, not Safari QA.
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../web/content-manifest.json'), 'utf8'));
    const dataFiles = manifest.files.filter(item => item.path.startsWith('Data/'));
    await page.locator('#demo-files').setInputFiles(dataFiles.map(item => path.join(__dirname, '../Run', item.path)));
    await page.waitForFunction(() => document.querySelector('#file-progress').textContent.includes('19 of 20'));
    assert(await page.locator('#start').isDisabled(), 'Incomplete local files must block startup');
    assert((await page.locator('#file-progress').textContent()).includes('Campaigns/Amiga Format Christmas Special.ofc'));
    await page.locator('#demo-files').setInputFiles({ name: 'Settings.js', mimeType: 'text/javascript', buffer: Buffer.from('throw Error("must not execute")') });
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Not a Christmas Special file'));
    assert(await page.locator('#start').isDisabled());
    assert((await page.locator('#file-progress').textContent()).includes('19 of 20'), 'Rejected batch must retain verified files');
    const campaign = manifest.files.find(item => item.path.startsWith('Campaigns/'));
    await page.locator('#demo-files').setInputFiles(path.join(__dirname, '../Run', campaign.path));
    await page.waitForFunction(() => document.querySelector('#file-progress').textContent.includes('20 of 20'));
    result.checks.localFilesAcrossPickerVisits = 'pass; partial batch and unexpected script rejected';
    await page.locator('#start').click();
    await page.waitForFunction(() => document.body.dataset.gameState === 'menu');
    await page.waitForTimeout(1200); // wait for the canvas palette to settle
    assert.equal(await page.getAttribute('body', 'data-cheats'), 'off');
    await page.screenshot({ path: path.join(evidenceDir, 'menu.png') });
    result.checks.menu = 'pass';
    await page.locator('[data-mission="1"]').click();await page.locator('#mission-deploy').click();
    await page.waitForFunction(() => document.body.dataset.gameState === 'battlefield', null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    result.battlefieldColors = await assertWebFrame(page);
    await page.screenshot({ path: path.join(evidenceDir, 'battlefield.png') });
    result.checks.battlefield = 'pass (screenshot review also required)';
    result.renderer = await page.evaluate(() => {
      const c = document.querySelector('#canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return { sdl: Module.renderer, webgl: gl && gl.getParameter(gl.VERSION), device: ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) };
    });
    result.log = await page.locator('#log').textContent();
    assert.deepEqual(errors, [], 'No fatal browser errors in menu/map flow');
    // Explicit diagnostics opt-in is a separate launch, with the same local pack.
    await page.reload();
    await page.locator('#launch-diagnostics > summary').click();
    await page.locator('#cheats').check();
    await page.locator('#pack').setInputFiles(packFile);
    await page.locator('#start').click();
    await page.waitForFunction(() => document.body.dataset.gameState === 'menu');
    assert.equal(await page.getAttribute('body', 'data-cheats'), 'on');
    result.checks.optInCheats = 'pass';
    // Real cross-origin downloads from the pinned existing publisher. A network
    // failure must be retryable without allowing a partial data set to start.
    await page.reload();
    await page.route('https://raw.githubusercontent.com/**', route => route.abort());
    await page.locator('#load-demo').click();
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Could not load the demo'));
    assert(await page.locator('#start').isDisabled());
    assert(await page.locator('#load-demo').isEnabled());
    result.checks.upstreamFailure = 'pass; retry available and partial startup blocked';
    await page.unroute('https://raw.githubusercontent.com/**');
    const downloadStarted = Date.now();
    await page.locator('#load-demo').click();
    await page.waitForFunction(() => document.querySelector('#file-progress').textContent.includes('20 of 20 demo files downloaded and verified'), null, { timeout: 35000 });
    result.upstreamDownloadMs = Date.now() - downloadStarted;
    await page.locator('#start').click();
    await page.waitForFunction(() => document.body.dataset.gameState === 'menu');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(evidenceDir, 'upstream-menu.png') });
    await page.locator('[data-mission="1"]').click();await page.locator('#mission-deploy').click();
    await page.waitForFunction(() => document.body.dataset.gameState === 'battlefield');
    await page.waitForTimeout(1500);
    result.upstreamBattlefieldColors = await assertWebFrame(page);
    await page.screenshot({ path: path.join(evidenceDir, 'upstream-battlefield.png') });
    assert.equal(await page.getAttribute('body', 'data-cheats'), 'off');
    result.checks.upstreamMenuAndBattlefield = 'pass (screenshots require review)';
    assert.deepEqual(errors, [], 'No fatal errors after download retry and direct upstream startup');
    await page.close();
    const broken = await browser.newPage();
    await broken.route('**/index.wasm', route => route.abort());
    await broken.goto(url);
    await broken.waitForFunction(() => document.querySelector('#status').classList.contains('error'));
    result.checks.missingWasm = await broken.locator('#status').textContent();
    assert(await broken.locator('#start').isDisabled());
    result.iphoneSafari = 'NOT RUN: no real iPhone available';
    fs.writeFileSync(path.join(evidenceDir, 'desktop.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
