// Orientation belongs to the stable parent fullscreen host, not the iframe
// document which is replaced on an episode change.
export function fullscreenController(win,{onChange=()=>{}}={}){
  const doc=win.document,orientation=win.screen?.orientation;let target=null,epoch=0,attempt=-1,owned=false,inFlight=null,disposed=false,pending=null;
  const mobile=()=>win.matchMedia?.('(pointer: coarse)').matches===true || /Android|iPhone|iPad|iPod/i.test(win.navigator.userAgent);
  function unlock(){if(owned){owned=false;try{orientation?.unlock?.();}catch{/* browser already released it */}}}
  function lock(){
    if(disposed || !target || doc.fullscreenElement!==target || !mobile() || owned || inFlight || attempt===epoch)return;
    if(typeof orientation?.lock!=='function'){doc.documentElement.dataset.rpOrientation='unsupported';return;}
    const job={epoch,node:target};attempt=epoch;inFlight=job;
    let request;try{request=orientation.lock('landscape');}catch{request=Promise.reject(new Error('orientation rejected'));}
    Promise.resolve(request).then(()=>{
      if(!disposed && job.epoch===epoch && doc.fullscreenElement===job.node){owned=true;doc.documentElement.dataset.rpOrientation='landscape';}
      else try{orientation.unlock();}catch{/* late success after exit */}
    },()=>{if(!disposed && job.epoch===epoch)doc.documentElement.dataset.rpOrientation='blocked';}).finally(()=>{if(inFlight===job)inFlight=null;if(!disposed && job.epoch!==epoch)lock();});
  }
  const changed=()=>{
    if(disposed)return;
    if(target && doc.fullscreenElement!==target){epoch++;unlock();target=null;delete doc.documentElement.dataset.rpOrientation;}
    lock();onChange();
  };
  doc.addEventListener('fullscreenchange',changed);
  return {
    toggle(node){
      if(disposed || !node?.isConnected)return Promise.resolve('unavailable');
      if(pending)return pending;
      const exiting=doc.fullscreenElement===node;
      if(!exiting){epoch++;unlock();target=node;}
      let request;try{request=exiting?doc.exitFullscreen():node.requestFullscreen();}catch{if(!exiting){epoch++;target=null;}return Promise.resolve('error');}
      pending=Promise.resolve(request).then(()=>{if(disposed)return 'unavailable';changed();return doc.fullscreenElement===node?'fullscreen':'windowed';},()=>{if(doc.fullscreenElement!==node){epoch++;unlock();target=null;}return 'error';}).finally(()=>pending=null);
      return pending;
    },
    dispose(){disposed=true;epoch++;unlock();target=null;doc.removeEventListener('fullscreenchange',changed);delete doc.documentElement.dataset.rpOrientation;},
  };
}
