import {isSiteOrigin, FRAME_ORIGINS, isFrameURL, safeURL, diagnostic, watchDOM} from './core.js';
import {sponsorDirectories} from './advertising-slots.js';

// Advertising contracts are independent of site/player classification.
// Update these rules without changing source detection.
export const AD_RULES = [
  {id:'revive-zone',selector:'ins[data-revive-id][data-z]',proof:()=>true},
  {id:'revive-wrapper',selector:'.adserver,.catfish-bottom,.banner-bottom-double',proof:n=>!!n.querySelector('ins[data-revive-id],a[rel~="sponsored"]')},
  {id:'component-banner',selector:'.sspp-area,.is-catfish,.top-middle-banner-offset,.ads-banner,.sspp-modal',proof:n=>!!n.querySelector('a[rel~="sponsored"],img')},
  {id:'legacy-sponsored-overlay',selector:'#overlay.heroup1',proof:n=>!!n.querySelector('a[rel~="sponsored"]')},
  {id:'legacy-footer',selector:'#footer_fixed_heroes,.hero-sticky-footer-wrapper',proof:n=>!!n.querySelector('a[rel~="sponsored"]')},
  {id:'sponsor-card',selector:'.row-topic.adserver',proof:n=>!!n.querySelector('ins[data-revive-id][data-z],a[rel~="sponsored"]')},
  {id:'sponsor-directory',selector:'.topics-list.topics-grid',proof:n=>sponsorDirectories(n.ownerDocument).includes(n)},
];
const exposeTo=(fn,target)=>{try{return typeof exportFunction==='function'?exportFunction(fn,target):fn;}catch{return fn;}};
export function filterAdCarousel(doc) {
  const changed=new Set();
  // This source inserts a Revive slot in both the hero slide and its thumbnail.
  // An ordinary film can occupy index0 when that slot is disabled.
  for(const node of doc.querySelectorAll('#top_slider .top-slide-main .swiper-slide,#top_slider .top-slide-small .swiper-slide')){
    if(!node.querySelector('ins[data-revive-id][data-z]') || node.querySelector('video,audio,iframe#embed-player,iframe#player,form'))continue;
    if(node.dataset.rpAdRule!=='sponsored-hero-slide'){
      node.style.setProperty('display','none','important');node.setAttribute('aria-hidden','true');node.dataset.rpAdRule='sponsored-hero-slide';changed.add(node.closest('.swiper'));
    }
  }
  for(const container of doc.querySelectorAll('#top_slider .top-slide-main,#top_slider .top-slide-small')){
    const api=container.wrappedJSObject?.swiper || container.swiper;
    if(!api || api.destroyed)continue;
    try{
      if(changed.has(container))api.update?.();
      const slides=[...container.querySelectorAll('.swiper-wrapper > .swiper-slide')],active=slides[api.activeIndex];
      if(active?.dataset.rpAdRule==='sponsored-hero-slide'){
        const index=slides.findIndex(n=>n.dataset.rpAdRule!=='sponsored-hero-slide');
        if(index>=0)api.slideTo?.(index,0,false);
      }
    }catch{/* Unknown carousel revisions leave the film slides intact. */}
  }
  return changed.size>0;
}
export function containsPlayback(node) {
  const selector='video,audio,iframe#embed-player,iframe#player,.player-ratio,.art-video-player,.jwplayer,.server-picker,.btn-episode,form,input,textarea';
  if(node.matches(selector) || node.querySelector(selector))return true;
  for(const frame of node.querySelectorAll('iframe[src]'))if(FRAME_ORIGINS.has(safeURL(frame.src)?.origin))return true;
  return [...node.querySelectorAll('a[href]')].some(a=>safeURL(a.href)?.pathname.startsWith('/xem-phim/'));
}
export function applyAdRules(doc) {
  const applied=new Set();
  if(filterAdCarousel(doc))applied.add('sponsored-hero-slide');
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
export function withoutAdvertising(config,page) {
  // Preserve every media/token/playlist object reference and all unrelated fields.
  const raw=config?.wrappedJSObject || config,ObjectAPI=page?.Object || Object;
  if(!raw || typeof raw!=='object' || !ObjectAPI.hasOwn(raw,'advertising'))return config;
  const next=page?.Object?page.Object.assign(new page.Object(),raw):{...raw};delete next.advertising;return next;
}
export function installJWHook(page) {
  const hooked=new WeakSet(),functions=new WeakMap();
  const wrap=fn=>{
    const rawFn=fn?.wrappedJSObject || fn;
    if(typeof rawFn!=='function')return fn;
    if(functions.has(rawFn))return functions.get(rawFn);
    const handler=page?.Object?new page.Object():{};
    handler.apply=exposeTo((target,thisArg,args)=>{
      const instance=Reflect.apply(target,thisArg,args);
      const rawInstance=instance?.wrappedJSObject || instance;
      if(rawInstance && typeof rawInstance.setup==='function' && !hooked.has(rawInstance)){
        const setup=rawInstance.setup;
        try {rawInstance.setup=exposeTo(function(config,...rest){return Reflect.apply(setup,this?.wrappedJSObject || this,[withoutAdvertising(config,page),...rest]);},page);hooked.add(rawInstance);}catch{/* locked API: leave playback intact */}
      }
      return instance;
    },page);
    const P=page?.Proxy || Proxy;
    const proxy=new P(rawFn,handler);functions.set(rawFn,proxy);functions.set(proxy,proxy);return proxy;
  };
  try{
    const descriptor=Object.getOwnPropertyDescriptor(page,'jwplayer');
    if(descriptor && (!descriptor.configurable || descriptor.get || descriptor.set))return false;
    let current=wrap(page.jwplayer);
    Object.defineProperty(page,'jwplayer',{configurable:true,enumerable:descriptor?.enumerable??true,get:exposeTo(()=>current,page),set:exposeTo(value=>{current=wrap(value);},page)});
    return true;
  }catch{return false;}
}
export function blockSyntheticSponsored(page) {
  const proto=page.HTMLAnchorElement?.prototype;
  if(!proto || typeof proto.click!=='function')return false;
  const original=proto.click;
  try{proto.click=exposeTo(function(...args){
    const url=safeURL(this.href,page.location.href);
    if(this.relList?.contains('sponsored') && this.target==='_blank' && url && url.origin!==page.location.origin)return;
    return Reflect.apply(original,this,args);
  },page);return true;}catch{return false;}
}
export function startAds(win,page) {
  const top=win.parent===win;
  if(top ? !isSiteOrigin(win.location.origin) : !isFrameURL(win.location.href))return;
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
