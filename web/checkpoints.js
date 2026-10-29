/* Mission-boundary checkpoints. GPL-3.0-or-later; see COPYING. */
(function(root){
  'use strict';
  const directory='/Saves/browser-v1',candidate='/tmp/openfodder-checkpoint.json';
  const paths=[`${directory}/current.json`,`${directory}/previous.json`];
  const maxBytes=65536;
  function canonical(value,depth=0){
    if(depth>12)throw Error('Checkpoint nesting is too deep.');
    if(Array.isArray(value))return '['+value.map(v=>canonical(v,depth+1)).join(',')+']';
    if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k],depth+1)).join(',')+'}';
    if(typeof value==='number'&&!Number.isSafeInteger(value))throw Error('Checkpoint numbers must be safe integers.');
    return JSON.stringify(value);
  }
  async function digest(value){return [...new Uint8Array(await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(typeof value==='string'?value:canonical(value))))].map(x=>x.toString(16).padStart(2,'0')).join('');}
  function compatibility(info,manifest,manifestHash){return{abi:'openfodder-mission-start-1',data:info.data,scripts:info.scripts,content:manifest.id,manifest:manifestHash};}
  async function encode(native,compat,info){
    const body={schema:1,boundary:'mission-start',compat,build:{repository:info.repository,commit:info.commit},createdAt:new Date().toISOString(),native};
    return{...body,checksum:await digest(body)};
  }
  async function decode(raw,compat){
    if(typeof raw!=='string'||new TextEncoder().encode(raw).length>maxBytes)throw Error('Checkpoint file is too large.');
    const file=JSON.parse(raw);
    if(!file||typeof file!=='object'||Array.isArray(file))throw Error('Unsupported checkpoint format.');
    const {checksum,...body}=file;
    if(Object.keys(file).sort().join(',')!=='boundary,build,checksum,compat,createdAt,native,schema'||file.schema!==1||file.boundary!=='mission-start')throw Error('Unsupported checkpoint format.');
    if(canonical(file.compat)!==canonical(compat))throw Error('This checkpoint uses incompatible engine or game content.');
    if(!file.build||file.build.repository!=='https://github.com/jbbejena/openfodder'||!/^[a-f0-9]{40}$/.test(file.build.commit)||typeof file.createdAt!=='string'||file.createdAt.length>40||!Number.isFinite(Date.parse(file.createdAt)))throw Error('Invalid checkpoint metadata.');
    if(!file.native||typeof file.native!=='object'||Array.isArray(file.native)||checksum!==await digest(body))throw Error('Checkpoint checksum or payload is invalid.');
    return file;
  }
  function create(Module,info,manifest){
    const FS=Module.FS;
    let available=false,busy=false,initialized=false,nativeChecked=false,current=null,previous=null,slots=[],compat;
    let message='Checking browser storage…',revision=0;
    const announce=()=>{revision++;root.document?.dispatchEvent(new Event('fodder-storage-change'));};
    function sync(populate){return new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(Error('Browser storage timed out. Reload to retry.')),10000);
      try{FS.syncfs(populate,error=>{clearTimeout(timeout);error?reject(error):resolve();});}catch(error){clearTimeout(timeout);reject(error);}
    });}
    const read=path=>FS.analyzePath(path).exists?FS.readFile(path,{encoding:'utf8'}):null;
    function check(file){
      FS.mkdirTree('/tmp');FS.writeFile(candidate,JSON.stringify(file.native));
      return JSON.parse(Module.UTF8ToString(Module._of_web_checkpoint(1)));
    }
    async function initialize(){
      try{
        compat=compatibility(info,manifest,await digest(manifest));
        FS.mkdirTree('/Saves');FS.mount(Module.IDBFS,{},'/Saves');await sync(true);FS.mkdirTree(directory);
        slots=[];
        for(const path of paths){
          const raw=read(path);
          if(raw===null){slots.push(null);continue;}
          try{slots.push({file:await decode(raw,compat),summary:null});}catch(error){slots.push(null);message=`A stored checkpoint could not be used: ${error.message}`;}
        }
        available=true;
        if(slots.some(Boolean))message='Checkpoint found. Load the demo and Start game to validate it.';
        else if(!message.startsWith('A stored'))message='No saved checkpoint yet. Save at a mission briefing.';
      }catch(error){message=`Browser storage unavailable: ${error.message||error}. You can play and export a briefing checkpoint.`;}
      initialized=true;announce();
    }
    function validateStored(){
      if(nativeChecked||busy||!initialized)return;
      nativeChecked=true;
      const valid=[];
      for(const slot of slots){if(!slot)continue;const report=check(slot.file);if(report.ok){slot.summary=report.summary;valid.push(slot);}}
      current=valid[0]||null;previous=valid[1]||null;
      if(current)message=`${slots[0]===current?'Saved checkpoint':'Recovered previous checkpoint'}: ${current.summary.name}. Continue starts its mission briefing.`;
      else if(slots.some(Boolean))message='Stored checkpoint failed engine validation. It was left untouched; you can play a new mission or import a backup.';
      announce();
    }
    async function run(work){
      if(busy)throw Error('Another checkpoint operation is in progress.');
      busy=true;announce();
      try{return await work();}catch(error){message=`Checkpoint action failed: ${error.message||error}${current?' Existing saved checkpoint retained.':''}`;throw error;}
      finally{busy=false;announce();}
    }
    async function capture(){
      // Verify actual campaign bytes; a diagnostic fixture is not a supported
      // checkpoint for the pinned public content set.
      const entry=manifest.files.find(f=>f.path.startsWith('Campaigns/'));
      const bytes=FS.readFile('/'+entry.path);
      const hash=[...new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
      if(hash!==entry.sha256)throw Error('Campaign content changed. Saving this diagnostic content is unsupported.');
      const report=JSON.parse(Module.UTF8ToString(Module._of_web_checkpoint(0)));
      if(!report.ok)throw Error(report.reason);
      return{file:await encode(report.native,compat,info),summary:report.summary};
    }
    async function commit(next){
      if(!available)throw Error('Browser storage is unavailable. Export a briefing checkpoint instead.');
      const before=paths.map(read),old=current;
      message='Saving checkpoint… Keep this tab open until confirmation.';announce();
      try{
        if(old)FS.writeFile(paths[1],JSON.stringify(old.file));
        FS.writeFile(paths[0],JSON.stringify(next.file));
        await sync(false);
      }catch(error){
        try{for(let i=0;i<paths.length;i++){if(before[i]===null){if(FS.analyzePath(paths[i]).exists)FS.unlink(paths[i]);}else FS.writeFile(paths[i],before[i]);}}
        catch(_){available=false;}
        throw error;
      }
      previous=old;current=next;slots=[current,previous];nativeChecked=true;
      message=`Saved checkpoint: ${current.summary.name}. Reload will return to this mission briefing.`;
    }
    async function resume(bridge,usePrevious=false){return run(async()=>{
      const selected=usePrevious?previous:current;if(!selected)throw Error('No compatible checkpoint is available.');
      const report=check(selected.file);if(!report.ok)throw Error(report.reason);
      const reply=bridge.resumeCheckpoint();if(!reply.ok)throw Error(`Cannot continue (${reply.reason}).`);
      const started=Date.now();
      while(bridge.state().stage!=='briefing'){
        const state=bridge.state();if(state.last?.id>=reply.id&&state.last.code<0)throw Error('The engine rejected the checkpoint.');
        if(Date.now()-started>5000)throw Error('Checkpoint restore timed out. Reload to retry.');
        await new Promise(resolve=>setTimeout(resolve,20));
      }
      message=`Loaded ${usePrevious?'previous ':'saved '}checkpoint: ${selected.summary.name}. Deploy starts this mission from its beginning.`;
    });}
    return Object.freeze({
      initialize,validateStored,
      state:()=>({available,busy,initialized,current,previous,message,revision}),
      report:error=>{message=`Checkpoint action failed: ${error.message||error}${current?' Existing saved checkpoint retained.':''}`;announce();},
      save:()=>run(async()=>{await commit(await capture());}),
      resume,
      importFile:raw=>run(async()=>{const file=await decode(raw,compat),report=check(file);if(!report.ok)throw Error(report.reason);await commit({file,summary:report.summary});}),
      exportFile:atBriefing=>run(async()=>{const selected=atBriefing?await capture():current;if(!selected)throw Error('No valid checkpoint to export.');message='Export prepared. Your browser save is unchanged.';return JSON.stringify(selected.file,null,2);})
    });
  }
  function bind(store,bridge){
    const el=id=>document.getElementById(id),panel=el('checkpoint-panel');
    let stage='uninitialized';
    function refresh(state){
      stage=state.stage;
      if(stage==='menu')store.validateStored();
      const s=store.state();
      panel.hidden=!['menu','briefing'].includes(stage);
      el('checkpoint-status').textContent=s.message;el('storage-status').textContent=s.message;
      el('checkpoint-save').hidden=stage!=='briefing';el('checkpoint-continue').hidden=stage!=='menu'||!s.current;
      el('checkpoint-continue').textContent=s.current?`Continue: ${s.current.summary.name}`:'Continue checkpoint';
      el('checkpoint-previous').hidden=stage!=='menu'||!s.previous;
      el('checkpoint-import-label').hidden=stage!=='menu';
      el('checkpoint-save').disabled=s.busy||!s.available;
      el('checkpoint-continue').disabled=s.busy||!s.current;
      el('checkpoint-previous').disabled=s.busy||!s.previous;
      el('checkpoint-import').disabled=s.busy||!s.available;
      el('checkpoint-export').disabled=s.busy||(stage!=='briefing'&&!s.current);
    }
    function action(fn){Promise.resolve().then(fn).catch(error=>store.report(error));}
    el('checkpoint-save').addEventListener('click',()=>action(()=>store.save()));
    el('checkpoint-continue').addEventListener('click',()=>action(()=>store.resume(bridge)));
    el('checkpoint-previous').addEventListener('click',()=>action(()=>store.resume(bridge,true)));
    el('checkpoint-import').addEventListener('change',()=>action(async()=>{
      const file=el('checkpoint-import').files[0];el('checkpoint-import').value='';if(!file)return;
      if(file.size>maxBytes){await store.importFile(' '.repeat(maxBytes+1));return;}
      await store.importFile(await file.text());
    }));
    el('checkpoint-export').addEventListener('click',()=>action(async()=>{
      const raw=await store.exportFile(stage==='briefing'),url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download='openfodder-checkpoint.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }));
    return Object.freeze({refresh});
  }
  const api=Object.freeze({canonical,digest,encode,decode,compatibility,create,bind});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OpenFodderSaves=api;
})(globalThis);
