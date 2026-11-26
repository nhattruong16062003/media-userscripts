// Art modules and JW's public API hide their loading instances. Observe their
// existing registration contracts, rather than copying/replacing an engine.
// No prototype property, request, constructor or media operation is changed.
const registries=new WeakMap();
const registryKey=Symbol.for('media-userscripts.hls-owners.v1');
export function observeHlsOwners(win){
  if(registries.has(win))return registries.get(win);
  const existing=win[registryKey];
  if(existing?.version===1 && typeof existing.get==='function' && typeof existing.stop==='function'){registries.set(win,existing);return existing;}
  const owners=new WeakMap(),jwOwners=new Set(),ObjectAPI=win.Object,original=ObjectAPI.defineProperty,originalAssign=ObjectAPI.assign;
  const exposeTo=(fn,target=win)=>{try{return typeof exportFunction==='function'?exportFunction(fn,target):fn;}catch{return fn;}};
  const hostWin=typeof window!=='undefined' && (window===win || window.wrappedJSObject===win)?window:win;
  const liveDoc=()=>win.document;
  const unwrap=v=>v?.wrappedJSObject || v;
  const sameDoc=node=>{const d=liveDoc();return !!node && (node.ownerDocument===d || unwrap(node.ownerDocument)===unwrap(d));};
  let observing=true,timer,exposedObserve=null,exposedAssign=null;
  function releaseGlobal(){try{const cur=ObjectAPI.defineProperty;if(cur===exposedObserve || cur===observe || exposedObserve && unwrap(cur)===unwrap(exposedObserve))ObjectAPI.defineProperty=original;}catch{/* A later owner may have frozen its API. */}try{const cur=ObjectAPI.assign;if(cur===exposedAssign || cur===observeAssign || exposedAssign && unwrap(cur)===unwrap(exposedAssign))ObjectAPI.assign=originalAssign;}catch{/* frozen by another owner */}}
  function stop(event){
    if(event?.persisted)return;
    if(event?.type==='pagehide' && win.location?.href==='about:blank')return;
    releaseGlobal();hostWin.clearTimeout(timer);observing=false;hostWin.removeEventListener('pagehide',stop);registries.delete(win);
    try{const cur=win[registryKey];if(cur===registry || unwrap(cur)===unwrap(registry))delete win[registryKey];}catch{/* frozen by another owner */}
  }
  function observe(target,key,descriptor){
    // Preserve native return value and exceptions before examining a result.
    const result=Reflect.apply(original,this,arguments);
    if(observing && key==='url'){
      try{
        const rawTarget=unwrap(target),rawDesc=unwrap(descriptor);
        // Do not invoke descriptor getters a second time after native conversion.
        if(typeof ObjectAPI.getOwnPropertyDescriptor(rawDesc,'get')?.value!=='function' || typeof ObjectAPI.getOwnPropertyDescriptor(rawDesc,'set')?.value!=='function')return result;
        const template=unwrap(ObjectAPI.getOwnPropertyDescriptor(rawTarget,'template')?.value);
        if(!template || unwrap(ObjectAPI.getOwnPropertyDescriptor(template,'art')?.value)!==rawTarget)return result;
        const video=ObjectAPI.getOwnPropertyDescriptor(template,'$video')?.value,root=ObjectAPI.getOwnPropertyDescriptor(template,'$player')?.value;
        if(sameDoc(video) && video.matches('video.art-video') && root?.classList.contains('art-video-player') && root.contains(video) && typeof rawTarget.on==='function'){
          owners.set(unwrap(video),rawTarget);releaseGlobal();hostWin.clearTimeout(timer);
        }
      }catch{/* Unrelated objects must retain native property semantics. */}
    }
    return result;
  }
  function observeAssign(target,...sources){
    const result=Reflect.apply(originalAssign,this,[target,...sources]);
    if(observing && target && jwOwners.size<8)try{
      const rawTarget=unwrap(target);
      // JW 8's View registers {isSetup:false,api,model}. The view-model's
      // getVideo() delegates to the CURRENT provider, including after JW.load.
      // Examine own data descriptors only; never invoke source getters again.
      for(const source of sources){
        const value=unwrap(source);
        if(!value || ObjectAPI.getOwnPropertyDescriptor(value,'isSetup')?.value!==false)continue;
        const model=unwrap(ObjectAPI.getOwnPropertyDescriptor(value,'model')?.value),api=unwrap(ObjectAPI.getOwnPropertyDescriptor(value,'api')?.value);
        if(!model || !api || unwrap(ObjectAPI.getOwnPropertyDescriptor(rawTarget,'model')?.value)!==model || unwrap(ObjectAPI.getOwnPropertyDescriptor(rawTarget,'api')?.value)!==api)continue;
        if(typeof model.getVideo!=='function' || typeof model.get!=='function' || typeof api.getContainer!=='function' || !sameDoc(api.getContainer()) || model.get('id')!==api.id)continue;
        jwOwners.add({model,api});releaseGlobal();hostWin.clearTimeout(timer);break;
      }
    }catch{/* A foreign Object.assign must retain native results/errors. */}
    return result;
  }
  const registry=new ObjectAPI();
  registry.version=1;
  registry.get=exposeTo(function(video){
    const rawVideo=unwrap(video);
    const owner=owners.get(rawVideo) || owners.get(video);
    if(owner && (unwrap(owner.template?.$video)===rawVideo) && !owner.isDestroy)return owner.hls;
    for(const {model,api} of jwOwners){
      const provider=model.getVideo(),root=api.getContainer();
      if(unwrap(provider?.video)===rawVideo && sameDoc(rawVideo) && unwrap(rawVideo.closest('.jwplayer'))===unwrap(root) && root?.contains(rawVideo))return provider.hlsjs || provider.hls || null;
    }
    return null;
  },win);
  registry.stop=exposeTo(stop,win);
  registries.set(win,registry);
  // A loaded module can retain its native-method alias and create its player
  // later (background tab/resume dialog). Restore the global promptly, while
  // allowing that already-captured alias to report its eventual owner once.
  try{
    exposedObserve=exposeTo(observe,win);exposedAssign=exposeTo(observeAssign,win);
    const desc=new ObjectAPI();desc.value=registry;desc.configurable=true;
    Reflect.apply(original,ObjectAPI,[win,registryKey,desc]);
    ObjectAPI.defineProperty=exposedObserve;ObjectAPI.assign=exposedAssign;
    timer=hostWin.setTimeout(releaseGlobal,90000);hostWin.addEventListener('pagehide',stop);
  }catch{releaseGlobal();observing=false;}
  return registry;
}
export function accessibleHls(candidate){
  const {video,kind,api}=candidate,win=video.ownerDocument.defaultView;
  const pageWin=win?.wrappedJSObject || null,rawVideo=video.wrappedJSObject || video;
  const provider=kind==='jw'?api?.getProvider?.():null;
  const views=[win,pageWin].filter((v,i,a)=>v && a.indexOf(v)===i);
  const captured=[];
  for(const view of views){
    const registry=registries.get(view) || view[registryKey];
    if(registry?.version===1){const item=registry.get(rawVideo) || registry.get(video);if(item)captured.push(item);}
  }
  for(const h of [...captured,provider?.hlsjs,provider?.hls,...views.flatMap(view=>[view.hls,view.art?.hls])])
    if(h && (h.media===video || h.media===rawVideo) && h.config && typeof h.on==='function' && typeof h.off==='function')return h;
  return null;
}
