// ==UserScript==
// @name         RoPhim — Chặn quảng cáo
// @namespace    rophim-userscripts.local
// @version      0.3.3
// @author       zic
// @description  Chặn quảng cáo cho trang xem RoPhim.
// @homepageURL  https://github.com/nhattruong16062003/rophim-userscripts
// @supportURL   https://github.com/nhattruong16062003/rophim-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/refs/heads/main/dist/rophim-noads.user.js
// @updateURL    https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/refs/heads/main/dist/rophim-noads.user.js
// @include      /^https:\/\/(?:[a-z0-9-]+\.)*[a-z0-9-]*rophim[a-z0-9-]*(?:\.[a-z0-9-]+)+(?::\d+)?\//
// @match        https://player.phimapi.com/player/*
// @match        https://api.clubc.org/embed/*
// @match        https://dora.nobitayeuxuka.xyz/temp*
// @run-at       document-start
// @grant        unsafeWindow
// ==/UserScript==

(function () {
'use strict';
// ---- lib/core.js ----
// Permission boundaries only. Website names may change; source contracts select adapters.
const FRAME_ORIGINS = new Set(['https://player.phimapi.com', 'https://api.clubc.org', 'https://dora.nobitayeuxuka.xyz']);
function safeURL(value, base) {
  try { const u = new URL(value, base); return u.protocol === 'https:' && !u.username && !u.password ? u : null; } catch { return null; }
}
function isSiteOrigin(value) {
  const url=safeURL(value);
  return !!url && /(^|\.)[a-z\d-]*rophim[a-z\d-]*(?:\.[a-z\d-]+)+$/i.test(url.hostname);
}
const normalize = value => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
const bounded = (value, max = 200) => String(value || '').slice(0, max);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const token = win => Array.from(win.crypto.getRandomValues(new Uint32Array(4)), x => x.toString(16).padStart(8, '0')).join('');
function diagnostic(doc, feature, state) {
  const node = doc.documentElement;
  if (node) node.dataset['rp' + feature[0].toUpperCase() + feature.slice(1)] = bounded(state, 160);
}
function watchDOM(win, callback) {
  let timer = 0;
  const schedule = () => { if (!timer) timer = win.setTimeout(() => { timer = 0; callback(); }, 100); };
  const observer = new win.MutationObserver(records => {
    if (records.some(r => !r.target.closest?.('[data-rp-ui]') && !(r.type === 'attributes' && r.attributeName?.startsWith('data-rp')))) schedule();
  });
  observer.observe(win.document, {subtree:true, childList:true, attributes:true, attributeFilter:['src','class','data-panel']});
  return () => { observer.disconnect(); win.clearTimeout(timer); };
}
function storageAPI(win) {
  // Deliberately no localStorage fallback: that would silently split cross-origin history.
  return {
    get: (k, d) => typeof GM_getValue === 'function' ? GM_getValue(k, d) : d,
    set: (k, v) => { if (typeof GM_setValue !== 'function') throw new Error('Thiếu quyền lưu userscript'); GM_setValue(k, v); },
    keys: () => typeof GM_listValues === 'function' ? GM_listValues() : [],
    remove: k => { if (typeof GM_deleteValue === 'function') GM_deleteValue(k); },
  };
}
function clampSeek(time, duration) { return Math.max(0, Math.min(Math.max(0, duration - 0.25), time)); }


// ---- lib/advertising-slots.js ----
// Shared advertising DOM evidence only; never used to select site/player adapters.
function sponsorDirectories(doc) {
  return [...doc.querySelectorAll('.topics-list.topics-grid')].filter(node=>{
    const headings=[...node.querySelectorAll('.heading-sm,.heading-md,h2,h3')];
    const named=headings.some(heading=>/nhà\s+(?:cái|tài\s+trợ)\s+uy\s+tín/i.test(heading.textContent || ''));
    // The named directory plus dedicated sponsor cards remains identifiable
    // before/after Revive fills a slot, without depending on the ad destination.
    return named && !!node.querySelector('.row-topic.adserver,.row-topic-ad,ins[data-revive-id]') && !node.querySelector('video,audio,iframe#embed-player,iframe#player,.server-picker,form,a.row-topic:not(.adserver):not(.row-topic-ad)');
  });
}


// ---- lib/ads.js ----

// Advertising contracts are independent of site/player classification.
// Update these rules without changing source detection.
const AD_RULES = [
  {id:'revive-zone',selector:'ins[data-revive-id][data-z]',proof:()=>true},
  {id:'revive-wrapper',selector:'.adserver,.catfish-bottom,.banner-bottom-double',proof:n=>!!n.querySelector('ins[data-revive-id],a[rel~="sponsored"]')},
  {id:'component-banner',selector:'.sspp-area,.is-catfish,.top-middle-banner-offset,.ads-banner,.sspp-modal',proof:n=>!!n.querySelector('a[rel~="sponsored"],img')},
  {id:'legacy-sponsored-overlay',selector:'#overlay.heroup1',proof:n=>!!n.querySelector('a[rel~="sponsored"]')},
  {id:'legacy-footer',selector:'#footer_fixed_heroes,.hero-sticky-footer-wrapper',proof:n=>!!n.querySelector('a[rel~="sponsored"]')},
  {id:'sponsor-card',selector:'.row-topic.adserver',proof:n=>!!n.querySelector('ins[data-revive-id][data-z],a[rel~="sponsored"]')},
  {id:'sponsor-directory',selector:'.topics-list.topics-grid',proof:n=>sponsorDirectories(n.ownerDocument).includes(n)},
];
function filterAdCarousel(doc) {
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
    const api=container.swiper;
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
function containsPlayback(node) {
  const selector='video,audio,iframe#embed-player,iframe#player,.player-ratio,.art-video-player,.jwplayer,.server-picker,.btn-episode,form,input,textarea';
  if(node.matches(selector) || node.querySelector(selector))return true;
  for(const frame of node.querySelectorAll('iframe[src]'))if(FRAME_ORIGINS.has(safeURL(frame.src)?.origin))return true;
  return [...node.querySelectorAll('a[href]')].some(a=>safeURL(a.href)?.pathname.startsWith('/xem-phim/'));
}
function applyAdRules(doc) {
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
function withoutAdvertising(config) {
  // Preserve every media/token/playlist object reference and all unrelated fields.
  if(!config || typeof config!=='object' || !Object.hasOwn(config,'advertising'))return config;
  const next={...config};delete next.advertising;return next;
}
function installJWHook(page) {
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
function blockSyntheticSponsored(page) {
  const proto=page.HTMLAnchorElement?.prototype;
  if(!proto || typeof proto.click!=='function')return false;
  const original=proto.click;
  try{proto.click=function(...args){
    const url=safeURL(this.href,page.location.href);
    if(this.relList?.contains('sponsored') && this.target==='_blank' && url && url.origin!==page.location.origin)return;
    return Reflect.apply(original,this,args);
  };return true;}catch{return false;}
}
function startAds(win,page) {
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


// ---- source/rophim-noads.js ----
startAds(window,typeof unsafeWindow==='undefined' ? window : unsafeWindow);

})();
