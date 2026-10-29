const {test}=require('node:test'),assert=require('node:assert/strict');
globalThis.crypto=globalThis.crypto||require('node:crypto').webcrypto;
const {canonical,digest,compatibility,encode,decode,create}=require('./checkpoints.js');
const info={repository:'https://github.com/jbbejena/openfodder',commit:'a'.repeat(40),data:'data-pin',scripts:'script-pin'};
const manifest={id:'demo',files:[]};
test('checkpoint checksum detects changed progress and metadata; key ordering is stable',async()=>{
 const compat=compatibility(info,manifest,await digest(manifest));
 const file=await encode({mMissionNumber:2},compat,info);
 assert.equal((await decode(JSON.stringify(file),compat)).native.mMissionNumber,2);
 for(const mutate of [f=>f.native.mMissionNumber=1,f=>f.createdAt='2020-01-01T00:00:00Z']){
  const damaged=JSON.parse(JSON.stringify(file));mutate(damaged);await assert.rejects(decode(JSON.stringify(damaged),compat),/checksum/);
 }
 assert.equal(canonical({b:2,a:1}),canonical({a:1,b:2}));
});
test('compatible build updates retain checkpoints; schema/content changes are rejected',async()=>{
 const compat=compatibility(info,manifest,'hash'),file=await encode({x:1},compat,info);
 assert(await decode(JSON.stringify(file),compatibility({...info,commit:'b'.repeat(40)},manifest,'hash')));
 for(const changed of [{...compat,abi:'v2'},{...compat,scripts:'new'},{...compat,manifest:'new'}])
  await assert.rejects(decode(JSON.stringify(file),changed),/incompatible/);
 await assert.rejects(decode(JSON.stringify({...file,schema:99}),compat),/format/);
});
test('oversized, malformed, deeply nested and unsafe numeric imports are bounded',async()=>{
 const compat=compatibility(info,manifest,'hash');
 for(const raw of ['{','null','[]',' '.repeat(65537)])await assert.rejects(decode(raw,compat));
 assert.throws(()=>canonical({x:1e100}),/safe integers/);
 let deep={};for(let i=0;i<20;i++)deep={child:deep};assert.throws(()=>canonical(deep),/deep/);
});
function memoryModule(disk){
 const files=new Map(),campaign=new TextEncoder().encode('pinned campaign');
 let fail=false,mission=1;
 const FS={mkdirTree(){},mount(){},analyzePath:p=>({exists:files.has(p)}),
  readFile:(p,o)=>p==='/Campaigns/demo.ofc'?campaign:files.get(p),writeFile:(p,v)=>files.set(p,v),unlink:p=>files.delete(p),
  syncfs:(populate,callback)=>{
   if(populate){files.clear();for(const entry of disk)files.set(...entry);callback(null);}
   else if(fail)callback(Error('Quota exceeded'));
   else{disk.clear();for(const entry of files)if(entry[0].startsWith('/Saves/'))disk.set(...entry);callback(null);}
  }};
 return{FS,IDBFS:{},UTF8ToString:x=>x,_of_web_checkpoint:op=>{
  const native=op===0?{mMissionNumber:mission}:JSON.parse(files.get('/tmp/openfodder-checkpoint.json'));
  return JSON.stringify(native.bad?{ok:false,reason:'Invalid native checkpoint'}:{ok:true,native,summary:{number:native.mMissionNumber,name:`Mission ${native.mMissionNumber}`}});
 },fail:value=>{fail=value;},mission:value=>{mission=value;},campaign};
}
async function storeWith(disk){const module=memoryModule(disk);const content={...manifest,files:[{path:'Campaigns/demo.ofc',sha256:await digest('pinned campaign')}]};const store=create(module,info,content);await store.initialize();store.validateStored();return{module,store,content};}
test('durable acknowledgement survives reopening; previous confirmed save is retained',async()=>{
 const disk=new Map(),{module,store}=await storeWith(disk);
 await store.save();module.mission(2);await store.save();assert.match(store.state().message,/Saved checkpoint/);
 const reopened=await storeWith(disk);assert.equal(reopened.store.state().current.summary.number,2);assert.equal(reopened.store.state().previous.summary.number,1);
});
test('failed persistence rolls memory back and cannot become a saved checkpoint on reopen',async()=>{
 const disk=new Map(),{module,store}=await storeWith(disk);await store.save();const before=new Map(disk);
 module.fail(true);module.mission(2);await assert.rejects(store.save(),/Quota/);
 assert.deepEqual(disk,before);assert.equal(store.state().current.summary.number,1);
 const reopened=await storeWith(disk);assert.equal(reopened.store.state().current.summary.number,1);
});
test('invalid native import preserves a good save; corrupted primary recovers previous',async()=>{
 const disk=new Map(),{module,store,content}=await storeWith(disk);await store.save();module.mission(2);await store.save();
 const before=new Map(disk),compat=compatibility(info,content,await digest(content));
 const bad=await encode({mMissionNumber:1,bad:true},compat,info);
 await assert.rejects(store.importFile(JSON.stringify(bad)),/Invalid native/);assert.deepEqual(disk,before);
 disk.set('/Saves/browser-v1/current.json','broken');const recovered=await storeWith(disk);
 assert.equal(recovered.store.state().current.summary.number,1);assert.match(recovered.store.state().message,/Recovered previous/);
});
