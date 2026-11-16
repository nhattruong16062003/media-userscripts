// Art's public module export deliberately hides its instance. Observe its
// property registration, rather than copying the module or replacing HLS.
// No prototype property, request, constructor or media operation is changed.
const registries=new WeakMap();
const registryKey=Symbol.for('media-userscripts.hls-owners.v1');
export function observeHlsOwners(win){
  if(registries.has(win))return registries.get(win);
  const existing=win[registryKey];
  if(existing?.version===1 && typeof existing.get==='function' && typeof existing.stop==='function'){registries.set(win,existing);return existing;}
  const owners=new WeakMap(),ObjectAPI=win.Object,original=ObjectAPI.defineProperty;
  let observing=true,timer;
  function releaseGlobal(){try{if(ObjectAPI.defineProperty===observe)ObjectAPI.defineProperty=original;}catch{/* A later owner may have frozen its API. */}}
  function stop(event){releaseGlobal();win.clearTimeout(timer);if(event?.persisted)return;observing=false;win.removeEventListener('pagehide',stop);try{if(win[registryKey]===registry)delete win[registryKey];}catch{/* frozen by another owner */}}
  function observe(target,key,descriptor){
    // Preserve native return value and exceptions before examining a result.
    const result=Reflect.apply(original,this,arguments);
    if(observing && key==='url'){
      try{
        // Do not invoke descriptor getters a second time after native conversion.
        if(typeof ObjectAPI.getOwnPropertyDescriptor(descriptor,'get')?.value!=='function' || typeof ObjectAPI.getOwnPropertyDescriptor(descriptor,'set')?.value!=='function')return result;
        const template=ObjectAPI.getOwnPropertyDescriptor(target,'template')?.value;
        if(!template || ObjectAPI.getOwnPropertyDescriptor(template,'art')?.value!==target)return result;
        const video=ObjectAPI.getOwnPropertyDescriptor(template,'$video')?.value,root=ObjectAPI.getOwnPropertyDescriptor(template,'$player')?.value;
        if(video?.ownerDocument===win.document && video.matches('video.art-video') && root?.classList.contains('art-video-player') && root.contains(video) && typeof target.on==='function'){
          owners.set(video,target);releaseGlobal();win.clearTimeout(timer);
        }
      }catch{/* Unrelated objects must retain native property semantics. */}
    }
    return result;
  }
  const registry={version:1,get(video){const owner=owners.get(video);return owner?.template?.$video===video && !owner.isDestroy?owner.hls:null;},stop};
  registries.set(win,registry);
  // A loaded module can retain its native-method alias and create its player
  // later (background tab/resume dialog). Restore the global promptly, while
  // allowing that already-captured alias to report its eventual owner once.
  try{Reflect.apply(original,ObjectAPI,[win,registryKey,{value:registry,configurable:true}]);ObjectAPI.defineProperty=observe;timer=win.setTimeout(releaseGlobal,90000);win.addEventListener('pagehide',stop);}catch{observing=false;}
  return registry;
}
export function accessibleHls(candidate){
  const {video,kind,api}=candidate,win=video.ownerDocument.defaultView;
  const provider=kind==='jw'?api?.getProvider?.():null;
  const registry=registries.get(win) || win[registryKey];
  const captured=registry?.version===1?registry.get(video):null;
  for(const h of [captured,provider?.hlsjs,provider?.hls,win.hls,win.art?.hls])
    if(h?.media===video && h.config && typeof h.on==='function' && typeof h.off==='function')return h;
  return null;
}
