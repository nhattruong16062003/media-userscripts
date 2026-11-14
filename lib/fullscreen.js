// Orientation belongs to the stable parent fullscreen host, not the iframe
// document which is replaced on an episode change.
export function fullscreenController(win,{onChange=()=>{}}={}){
  const doc=win.document,orientation=win.screen?.orientation;let target=null,epoch=0,attempt=-1,owned=false,inFlight=null,disposed=false,pending=null;
  let recoveryTimer=0,recheck=false,recoveryAttempts=[];
  const mobile=()=>win.matchMedia?.('(pointer: coarse)').matches===true || /Android|iPhone|iPad|iPod/i.test(win.navigator.userAgent);
  const active=()=>!disposed && target?.isConnected && doc.fullscreenElement===target && !doc.hidden && mobile();
  const portrait=()=>typeof orientation?.type==='string'?orientation.type.startsWith('portrait'):win.innerHeight>win.innerWidth;
  function clearRecovery(){win.clearTimeout(recoveryTimer);recoveryTimer=0;recheck=false;recoveryAttempts=[];}
  // Firefox/Android may drop the effective orientation while the ancestor is
  // still fullscreen. A resolved lock promise is not proof that it stays locked.
  // Observe the real orientation/viewport; never re-enter fullscreen to repair it.
  function verify(){
    win.clearTimeout(recoveryTimer);recoveryTimer=0;
    if(!active())return;
    if(!owned){if(attempt!==epoch)lock();return;}
    if(!portrait())return;
    if(inFlight){recheck=true;return;}
    const now=win.Date.now();recoveryAttempts=recoveryAttempts.filter(at=>now-at<5000);
    if(recoveryAttempts.length>=3){doc.documentElement.dataset.rpOrientation='blocked';return;}
    recoveryAttempts.push(now);lock(true);
  }
  function scheduleRecovery(){
    if(!active())return;
    win.clearTimeout(recoveryTimer);recoveryTimer=win.setTimeout(verify,120);
  }
  function unlock(){if(owned){owned=false;try{orientation?.unlock?.();}catch{/* browser already released it */}}}
  function lock(recovery=false){
    if(!active() || inFlight || !recovery && (owned || attempt===epoch))return;
    if(typeof orientation?.lock!=='function'){doc.documentElement.dataset.rpOrientation='unsupported';return;}
    const job={epoch,node:target};attempt=epoch;inFlight=job;
    let request;try{request=orientation.lock('landscape');}catch{request=Promise.reject(new Error('orientation rejected'));}
    Promise.resolve(request).then(()=>{
      if(!disposed && job.epoch===epoch && doc.fullscreenElement===job.node){owned=true;doc.documentElement.dataset.rpOrientation='landscape';}
      else try{orientation.unlock();}catch{/* late success after exit */}
    },()=>{if(!disposed && job.epoch===epoch)doc.documentElement.dataset.rpOrientation='blocked';}).finally(()=>{if(inFlight===job)inFlight=null;if(!disposed && job.epoch!==epoch)lock();else if(recheck){recheck=false;scheduleRecovery();}});
  }
  const changed=()=>{
    if(disposed)return;
    if(target && doc.fullscreenElement!==target){epoch++;clearRecovery();unlock();target=null;delete doc.documentElement.dataset.rpOrientation;}
    lock();scheduleRecovery();onChange();
  };
  doc.addEventListener('fullscreenchange',changed);
  orientation?.addEventListener?.('change',scheduleRecovery);
  win.addEventListener('orientationchange',scheduleRecovery);win.addEventListener('resize',scheduleRecovery);doc.addEventListener('visibilitychange',scheduleRecovery);
  return {
    toggle(node){
      if(disposed || !node?.isConnected)return Promise.resolve('unavailable');
      if(pending)return pending;
      const exiting=doc.fullscreenElement===node;
      if(!exiting){epoch++;clearRecovery();unlock();target=node;}
      let request;try{request=exiting?doc.exitFullscreen():node.requestFullscreen();}catch{if(!exiting){epoch++;target=null;}return Promise.resolve('error');}
      pending=Promise.resolve(request).then(()=>{if(disposed)return 'unavailable';changed();return doc.fullscreenElement===node?'fullscreen':'windowed';},()=>{if(doc.fullscreenElement!==node){epoch++;unlock();target=null;}return 'error';}).finally(()=>pending=null);
      return pending;
    },
    dispose(){disposed=true;epoch++;clearRecovery();unlock();target=null;doc.removeEventListener('fullscreenchange',changed);orientation?.removeEventListener?.('change',scheduleRecovery);win.removeEventListener('orientationchange',scheduleRecovery);win.removeEventListener('resize',scheduleRecovery);doc.removeEventListener('visibilitychange',scheduleRecovery);delete doc.documentElement.dataset.rpOrientation;},
  };
}
