// Art modules and JW's public API hide their loading instances. Observe their
// existing registration contracts, rather than copying/replacing an engine.
// No prototype property, request, constructor or media operation is changed.
const registries=new WeakMap();
const registryKey=Symbol.for('media-userscripts.hls-owners.v1');
export function observeHlsOwners(win){
  if(registries.has(win))return registries.get(win);
  const existing=win[registryKey];
  if(existing?.version===1 && typeof existing.get==='function' && typeof existing.stop==='function'){registries.set(win,existing);return existing;}
  const owners=new WeakMap(),jwOwners=new Set(),doc=win.document,ObjectAPI=win.Object,original=ObjectAPI.defineProperty,originalAssign=ObjectAPI.assign;
  let observing=true,timer;
  function releaseGlobal(){try{if(ObjectAPI.defineProperty===observe)ObjectAPI.defineProperty=original;}catch{/* A later owner may have frozen its API. */}try{if(ObjectAPI.assign===observeAssign)ObjectAPI.assign=originalAssign;}catch{/* frozen by another owner */}}
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
        if(video?.ownerDocument===doc && video.matches('video.art-video') && root?.classList.contains('art-video-player') && root.contains(video) && typeof target.on==='function'){
          owners.set(video,target);releaseGlobal();win.clearTimeout(timer);
        }
      }catch{/* Unrelated objects must retain native property semantics. */}
    }
    return result;
  }
  function observeAssign(target,...sources){
    const result=Reflect.apply(originalAssign,this,[target,...sources]);
    if(observing && target && jwOwners.size<8)try{
      // JW 8's View registers {isSetup:false,api,model}. The view-model's
      // getVideo() delegates to the CURRENT provider, including after JW.load.
      // Examine own data descriptors only; never invoke source getters again.
      for(const value of sources){
        if(!value || ObjectAPI.getOwnPropertyDescriptor(value,'isSetup')?.value!==false)continue;
        const model=ObjectAPI.getOwnPropertyDescriptor(value,'model')?.value,api=ObjectAPI.getOwnPropertyDescriptor(value,'api')?.value;
        if(!model || !api || ObjectAPI.getOwnPropertyDescriptor(target,'model')?.value!==model || ObjectAPI.getOwnPropertyDescriptor(target,'api')?.value!==api)continue;
        if(typeof model.getVideo!=='function' || typeof model.get!=='function' || typeof api.getContainer!=='function' || api.getContainer()?.ownerDocument!==doc || model.get('id')!==api.id)continue;
        jwOwners.add({model,api});releaseGlobal();win.clearTimeout(timer);break;
      }
    }catch{/* A foreign Object.assign must retain native results/errors. */}
    return result;
  }
  const registry={version:1,get(video){
    const owner=owners.get(video);if(owner?.template?.$video===video && !owner.isDestroy)return owner.hls;
    for(const {model,api} of jwOwners){
      const provider=model.getVideo(),root=api.getContainer();
      if(provider?.video===video && video.ownerDocument===doc && video.closest('.jwplayer')===root && root.contains(video))return provider.hlsjs;
    }
    return null;
  },stop};
  registries.set(win,registry);
  // A loaded module can retain its native-method alias and create its player
  // later (background tab/resume dialog). Restore the global promptly, while
  // allowing that already-captured alias to report its eventual owner once.
  try{Reflect.apply(original,ObjectAPI,[win,registryKey,{value:registry,configurable:true}]);ObjectAPI.defineProperty=observe;ObjectAPI.assign=observeAssign;timer=win.setTimeout(releaseGlobal,90000);win.addEventListener('pagehide',stop);}catch{releaseGlobal();observing=false;}
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
