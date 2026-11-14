import {isSiteOrigin, FRAME_ORIGINS, safeURL, diagnostic, watchDOM} from './core.js';

// Advertising contracts are independent of site/player classification.
// Update these rules without changing source detection.
export const AD_RULES = [
  {id:'revive-zone',selector:'ins[data-revive-id][data-z]',proof:()=>true},
  {id:'revive-wrapper',selector:'.adserver,.catfish-bottom,.banner-bottom-double',proof:n=>!!n.querySelector('ins[data-revive-id],a[rel~="sponsored"]')},
  {id:'component-banner',selector:'.sspp-area,.is-catfish,.top-middle-banner-offset,.ads-banner,.sspp-modal',proof:n=>!!n.querySelector('a[rel~="sponsored"],img')},
  {id:'legacy-sponsored-overlay',selector:'#overlay.heroup1',proof:n=>!!n.querySelector('a[rel~="sponsored"]')},
  {id:'legacy-footer',selector:'#footer_fixed_heroes,.hero-sticky-footer-wrapper',proof:n=>!!n.querySelector('a[rel~="sponsored"]')},
];
export function containsPlayback(node) {
  const selector='video,audio,iframe#embed-player,iframe#player,.player-ratio,.art-video-player,.jwplayer,.server-picker,.btn-episode,form,input,textarea';
  if(node.matches(selector) || node.querySelector(selector))return true;
  for(const frame of node.querySelectorAll('iframe[src]'))if(FRAME_ORIGINS.has(safeURL(frame.src)?.origin))return true;
  return [...node.querySelectorAll('a[href]')].some(a=>safeURL(a.href)?.pathname.startsWith('/xem-phim/'));
}
export function applyAdRules(doc) {
  const applied=new Set();
  for(const rule of AD_RULES){
    for(const node of doc.querySelectorAll(rule.selector)){
      if(!rule.proof(node) || containsPlayback(node))continue;
      if(node.style.getPropertyValue('display')!=='none' || node.style.getPropertyPriority('display')!=='important')node.style.setProperty('display','none','important');
      if(node.getAttribute('aria-hidden')!=='true')node.setAttribute('aria-hidden','true');
      if(node.dataset.rpAdRule!==rule.id)node.dataset.rpAdRule=rule.id;applied.add(rule.id);
    }
  }
  return [...applied];
}
export function withoutAdvertising(config) {
  // Preserve every media/token/playlist object reference and all unrelated fields.
  if(!config || typeof config!=='object' || !Object.hasOwn(config,'advertising'))return config;
  const next={...config};delete next.advertising;return next;
}
export function installJWHook(page) {
  const hooked=new WeakSet(),functions=new WeakMap();
  const wrap=fn=>{
    if(typeof fn!=='function')return fn;
    if(functions.has(fn))return functions.get(fn);
    const proxy=new Proxy(fn,{apply(target,thisArg,args){
      const instance=Reflect.apply(target,thisArg,args);
      if(instance && typeof instance.setup==='function' && !hooked.has(instance)){
        const setup=instance.setup;
        try {instance.setup=function(config,...rest){return Reflect.apply(setup,this,[withoutAdvertising(config),...rest]);};hooked.add(instance);}catch{/* locked API: leave playback intact */}
      }
      return instance;
    }});functions.set(fn,proxy);functions.set(proxy,proxy);return proxy;
  };
  try{
    const descriptor=Object.getOwnPropertyDescriptor(page,'jwplayer');
    if(descriptor && (!descriptor.configurable || descriptor.get || descriptor.set))return false;
    let current=wrap(page.jwplayer);
    Object.defineProperty(page,'jwplayer',{configurable:true,enumerable:descriptor?.enumerable??true,get:()=>current,set:value=>{current=wrap(value);}});
    return true;
  }catch{return false;}
}
export function blockSyntheticSponsored(page) {
  const proto=page.HTMLAnchorElement?.prototype;
  if(!proto || typeof proto.click!=='function')return false;
  const original=proto.click;
  try{proto.click=function(...args){
    const url=safeURL(this.href,page.location.href);
    if(this.relList?.contains('sponsored') && this.target==='_blank' && url && url.origin!==page.location.origin)return;
    return Reflect.apply(original,this,args);
  };return true;}catch{return false;}
}
export function startAds(win,page) {
  const top=win.parent===win;
  if(top ? !isSiteOrigin(win.location.origin) : !FRAME_ORIGINS.has(win.location.origin))return;
  // This documented component-ad preference is harmless on source variants
  // without that contract, and takes effect before React mounts its listeners.
  const kill=()=>{
    try{win.sessionStorage.setItem('rophim-hide-all-ads','1');page.dispatchEvent(new page.Event('rophim-hide-all-ads'));}catch{/* restricted storage */}
  };
  if(top){kill();blockSyntheticSponsored(page);}
  const jwHook=installJWHook(page);
  const scan=()=>{if(top)kill();const rules=applyAdRules(win.document);diagnostic(win.document,'noads',[...rules,jwHook?'jw-config-hook':'jw-hook-unavailable'].join(',') || 'unknown-preserved');};
  const off=watchDOM(win,scan);
  win.addEventListener('DOMContentLoaded',scan,{once:true});scan();
  win.addEventListener('pagehide',event=>{if(!event.persisted)off();});
}
