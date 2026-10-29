/* Read composited pixels, not a cleared WebGL drawing buffer. Requires the
 * repository's QA pin playwright-core 1.57.0 (its bundled PNG decoder). */
const assert=require('node:assert/strict'),path=require('node:path');
const {PNG}=require(path.join(path.dirname(require.resolve(process.env.PLAYWRIGHT_MODULE||'playwright-core')),'lib/utilsBundle.js'));
module.exports=async function assertWebFrame(page){
 let count=0;
 for(let attempt=0;attempt<10;attempt++){
  const {data}=PNG.sync.read(await page.locator('#canvas').screenshot());const colors=new Set();
  for(let i=0;i<data.length;i+=32)colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);count=colors.size;
  if(count>=8)return count;
  await page.waitForTimeout(80);
 }
 assert.fail(`Native battlefield remained blank (${count} sampled composited colours)`);
};
