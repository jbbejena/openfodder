const {test}=require('node:test');
const assert=require('node:assert/strict');
const {presentation}=require('./mission-flow.js');
test('only an explicit engine win can offer continuation',()=>{
  for(const outcome of ['lost','aborted','ended',undefined,'unexpected']){
    const view=presentation({stage:'result',mission:{result:{outcome},canContinue:true}});
    assert(!view.actions.includes('next'));assert.notEqual(view.title,'Mission complete');
  }
  assert(presentation({stage:'result',mission:{result:{outcome:'won'},canContinue:true}}).actions.includes('next'));
  assert(!presentation({stage:'result',mission:{result:{outcome:'won'},canContinue:false}}).actions.includes('next'));
});
test('combat, startup and ending cannot display actionable results from a stale result object',()=>{
  for(const stage of ['uninitialized','battlefield','ending']){
    const view=presentation({stage,mission:{result:{outcome:'won'},canContinue:true}});
    assert.equal(view.actions.length,0);assert.notEqual(view.title,'Mission complete');
  }
});
test('aborted, lost and won remain distinct and unknown outcomes cannot offer a fabricated replay',()=>{
  const titles=new Set();
  for(const outcome of ['aborted','lost','won']){
    const view=presentation({stage:'result',mission:{result:{outcome}}});titles.add(view.title);
    assert(view.actions.includes('retry'));assert(view.actions.includes('menu'));
  }
  assert.equal(titles.size,3);
  assert.deepEqual(presentation({stage:'result',mission:{}}).actions,['menu']);
});
