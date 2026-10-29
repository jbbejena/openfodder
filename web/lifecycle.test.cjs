const {test}=require('node:test'),assert=require('node:assert/strict');
const {create}=require('./lifecycle.js'),{create:bridgeFor}=require('./engine-bridge.js');
function fixture(stage='battlefield'){
 const calls=[],state={stage},bridge={state:()=>state,setLifecycle:mask=>{calls.push(['apply',mask]);return{ok:true};}};
 const policy=create(bridge,()=>calls.push(['release']));return{calls,state,bridge,policy};
}
test('focus loss synchronously releases and pauses; focus gain still requires a deliberate return',()=>{
 const {calls,policy}=fixture();policy.focus(false);assert.deepEqual(calls,[['release'],['apply',20]]);
 policy.focus(true);assert.equal(policy.state().mask,16);assert.equal(policy.state().waiting,true);
 assert(policy.returnToGame());assert.equal(policy.state().mask,0);
});
test('hidden, unfocused and page suspension compose; returning cannot clear an outstanding blocker',()=>{
 const {policy}=fixture();policy.visibility(true);policy.focus(false);policy.suspend();
 assert.equal(policy.state().mask,22);assert.equal(policy.returnToGame(),false);
 policy.restore(false,false);assert.equal(policy.state().mask,20);assert.equal(policy.returnToGame(),false);
 policy.focus(true);assert.equal(policy.state().mask,16);assert(policy.returnToGame());
});
test('repeated lifecycle signals coalesce and never toggle user or presentation pause',()=>{
 const {calls,bridge,policy}=fixture();bridge.setPaused=()=>assert.fail('User/Guide pause is not owned by lifecycle');
 policy.visibility(true);policy.visibility(true);policy.suspend();policy.suspend();assert.deepEqual(calls,[['release'],['apply',18]]);
 policy.restore(false,true);policy.restore(false,true);assert.equal(policy.state().mask,16);
 policy.returnToGame();assert.equal(calls.filter(c=>c[0]==='apply').length,3);
});
test('pre-engine focus loss gates startup without inventing a paused battle; in-game menu interruption requires return',()=>{
 const {policy,state}=fixture('uninitialized');policy.focus(false);assert.equal(policy.state().waiting,false);
 policy.focus(true);assert.equal(policy.state().mask,0);state.stage='menu';policy.focus(false);assert(policy.state().waiting);
});
test('failed safety boundary does not offer an unsafe resume',()=>{
 const {policy,bridge}=fixture();bridge.setLifecycle=()=>({ok:false,reason:'uninitialized'});
 policy.focus(false);assert.match(policy.state().error,/Reload/);assert.equal(policy.returnToGame(),false);
});
test('lifecycle masks are bounded in JavaScript and copied synchronously, separate from queued commands',()=>{
 const calls=[],bridge=bridgeFor({_of_web_lifecycle:mask=>{calls.push(mask);return 0;}});
 for(const bad of [-1,1,8,23,2**32,2.5,NaN,Infinity])assert.equal(bridge.setLifecycle(bad).ok,false);
 for(const mask of [0,2,4,16,18,20,22])assert(bridge.setLifecycle(mask).ok);
 assert.deepEqual(calls,[0,2,4,16,18,20,22]);assert.equal(bridgeFor({}).setLifecycle(0).reason,'uninitialized');
});
