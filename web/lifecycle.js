/* Browser interruption policy. GPL-3.0-or-later; see COPYING. */
(function(root){
  'use strict';
  function create(bridge,release,changed=()=>{}){
    let hidden=false,focused=true,suspended=false,waiting=false,mask=0,error='';
    function update(){
      const next=(hidden?2:0)|(!focused?4:0)|((suspended||waiting)?16:0);
      if(next!==mask){
        release();const reply=bridge.setLifecycle(next);
        if(!reply.ok){error=`Could not safely resume (${reply.reason}). Reload and Continue your confirmed checkpoint.`;waiting=true;}
        else{mask=next;error='';}
      }
      changed(snapshot());
    }
    function snapshot(){return{hidden,focused,suspended,waiting,mask,error,canReturn:!hidden&&focused&&!suspended&&!error};}
    function interrupt(){if(bridge.state().stage!=='uninitialized')waiting=true;}
    return Object.freeze({
      visibility(value){hidden=Boolean(value);if(hidden)interrupt();update();},
      focus(value){focused=Boolean(value);if(!focused)interrupt();update();},
      suspend(){suspended=true;interrupt();update();},
      restore(isHidden,hasFocus){hidden=Boolean(isHidden);focused=Boolean(hasFocus);suspended=false;update();},
      returnToGame(){if(!snapshot().canReturn)return false;waiting=false;update();return !error;},
      state:snapshot
    });
  }
  function mount(bridge,physical,shell){
    const doc=root.document,dialog=doc.getElementById('lifecycle-dialog'),button=doc.getElementById('lifecycle-return');
    let previousFocus=null;
    function close(){if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');}
    function release(){physical.cancel('Game interrupted. Held input released.');doc.dispatchEvent(new Event('fodder-interrupt'));}
    const policy=create(bridge,release,state=>{
      if(doc.body.dataset.runtimeError==='true')return;
      const show=state.waiting||Boolean(state.error);
      // A pagehide/freeze document may no longer be fully active. Present the
      // recovery dialog only after it is visible/focused again; pause is already
      // synchronous in the engine.
      if(show&&!dialog.open&&!state.hidden&&state.focused&&!state.suspended){
        previousFocus=doc.activeElement;
        if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
      }else if(!show&&dialog.open){
        close();
        shell.refresh();
        if(previousFocus?.isConnected&&!previousFocus.closest?.('[inert]'))previousFocus.focus({preventScroll:true});
      }
      doc.getElementById('lifecycle-message').textContent=state.error||
        (state.canReturn?'Held input was released. Return when you are ready; your previous pause stays in effect.':'The game is paused while this page is away.');
      button.disabled=!state.canReturn;
      doc.body.dataset.lifecyclePaused=String(state.mask!==0);
    });
    root.addEventListener('blur',()=>policy.focus(false));
    root.addEventListener('focus',()=>policy.focus(true));
    doc.addEventListener('visibilitychange',()=>policy.visibility(doc.hidden));
    root.addEventListener('pagehide',()=>policy.suspend());
    doc.addEventListener('freeze',()=>policy.suspend());
    const restore=event=>{
      if(event?.persisted||event?.type==='resume')policy.suspend();
      policy.restore(doc.hidden,doc.hasFocus());shell.refresh();
    };
    root.addEventListener('pageshow',restore);doc.addEventListener('resume',restore);
    doc.addEventListener('fodder-runtime-error',()=>{if(dialog.open)close();});
    doc.addEventListener('fodder-game-stage',()=>{if(policy.state().mask)release();});
    button.addEventListener('click',()=>policy.returnToGame());
    dialog.addEventListener('cancel',event=>event.preventDefault());
    for(const type of ['keydown','keyup'])dialog.addEventListener(type,event=>{
      event.stopPropagation();
      if(type==='keydown'&&event.key==='Tab'){event.preventDefault();button.focus();}
    });
    policy.restore(doc.hidden,doc.hasFocus());
    return policy;
  }
  const api=Object.freeze({create,mount});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OpenFodderLifecycle=api;
})(globalThis);
