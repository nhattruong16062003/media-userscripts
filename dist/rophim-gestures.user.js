// ==UserScript==
// @name         RoPhim — Thao tác trình phát
// @namespace    rophim-userscripts.local
// @version      0.2.0
// @author       zic
// @description  Thao tác trình phát cho trang xem RoPhim.
// @homepageURL  https://github.com/nhattruong16062003/rophim-userscripts
// @supportURL   https://github.com/nhattruong16062003/rophim-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/refs/heads/main/dist/rophim-gestures.user.js
// @updateURL    https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/refs/heads/main/dist/rophim-gestures.user.js
// @include      /^https:\/\/(?:[a-z0-9-]+\.)*[a-z0-9-]*rophim[a-z0-9-]*(?:\.[a-z0-9-]+)+(?::\d+)?\//
// @match        https://player.phimapi.com/player/*
// @match        https://api.clubc.org/embed/*
// @match        https://dora.nobitayeuxuka.xyz/temp*
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
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


// ---- lib/identity.js ----

const identityText=value=>normalize(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();
function laneKey(value) {
  const text=identityText(value);
  if(['subtitle','vietsub','phu de','vs'].includes(text))return 'subtitle';
  if(['dubbed','long tieng'].includes(text))return 'dubbed';
  if(['voiceover','thuyet minh','tm'].includes(text))return 'voiceover';
  return text;
}
function episodeKey(value) {
  const text=identityText(value);
  if(/^(full|tap full|trailer)$/.test(text))return text==='trailer'?'trailer':'full';
  const number=text.match(/^(?:(?:tap|episode|ep) )?(\d+)(?: (\d+))?$/);
  return number?String(Number(number[1]))+(number[2]?'.'+Number(number[2]):''):text;
}
function movieIdentity(movie={}) {
  const type=movie.type==='movie'?'movie':movie.type==='series'?'tv':'';
  return {originalTitle:bounded(movie.origin_name || movie.originalTitle || ''),year:/^(19|20)\d{2}$/.test(String(movie.publish_year || movie.year))?String(movie.publish_year || movie.year):'',mediaType:type,
    externalImdb:/^tt\d+$/.test(movie.imdb_id || '')?movie.imdb_id:'',externalTmdb:type && /^\d+$/.test(String(movie.tmdb_id || ''))?type+':'+movie.tmdb_id:'',poster:bounded(movie.thumbnail || movie.poster || '',2048)};
}
function sameFilm(a,b) {
  if(!a || !b)return false;
  if(a.year && b.year && a.year!==b.year || a.mediaType && b.mediaType && a.mediaType!==b.mediaType)return false;
  const shared=['externalImdb','externalTmdb'].filter(key=>a[key]&&b[key]);
  if(shared.length)return shared.every(key=>a[key]===b[key]);
  const originalA=identityText(a.originalTitle),originalB=identityText(b.originalTitle);
  if(originalA && originalB && originalA!==originalB)return false;
  if(a.year && b.year && a.year===b.year && (originalA && originalA===originalB || identityText(a.title) && identityText(a.title)===identityText(b.title)))return true;
  // Older local records can still resume on their original source. Internal IDs
  // never establish identity between different source contracts.
  return a.source===b.source && a.movieID===b.movieID && a.movie===b.movie && !!safeURL(a.url) && safeURL(a.url).origin===safeURL(b.url)?.origin;
}
function sameEpisode(a,b) {
  return sameFilm(a,b) && String(a.season)===String(b.season) && laneKey(a.lane)===laneKey(b.lane) && !!episodeKey(a.episode) && episodeKey(a.episode)===episodeKey(b.episode);
}


// ---- lib/sites.js ----

// Literal JSON parsing only. RSC strings are data; no eval or site-code execution.
function jsonFragment(text, offset) {
  const start = text[offset];
  if (start !== '{' && start !== '[' && start !== '"') return null;
  let depth = 0, quoted = start === '"', escaped = false;
  for (let i = offset + (quoted ? 1 : 0); i < Math.min(text.length, offset + 1_500_000); i++) {
    const c = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') { quoted = false; if (start === '"') { try { return JSON.parse(text.slice(offset, i + 1)); } catch { return null; } } }
    } else if (c === '"') quoted = true;
    else if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') {
      if (--depth === 0) { try { return JSON.parse(text.slice(offset, i + 1)); } catch { return null; } }
    }
  }
  return null;
}
const rscCache = new WeakMap();
function rscObjects(doc, page = {}) {
  const texts = [];
  for (const script of doc.querySelectorAll('script:not([src])')) {
    const raw = script.textContent || '';
    if (!raw.includes('__next_f.push')) continue;
    let cached = rscCache.get(script);
    if (!cached || cached.raw !== raw) {
      cached = {raw, texts:[]};
      const re = /self\.__next_f\.push\(\[1,\s*/g;
      for (const match of raw.matchAll(re)) {
        const value = jsonFragment(raw, match.index + match[0].length);
        if (typeof value === 'string') cached.texts.push(value);
      }
      rscCache.set(script, cached);
    }
    texts.push(...cached.texts);
  }
  // App-router transitions can append RSC data without adding inline script nodes.
  try { for (const item of (page.__next_f || []).slice(-100)) if (Array.isArray(item) && item[0] === 1 && typeof item[1] === 'string') texts.push(item[1]); } catch { /* sandbox */ }
  const result = {episodes:[], movies:[]};
  for (const text of texts) for (const m of text.matchAll(/"(episode|movie)":\s*(?=\{)/g)) {
    const value = jsonFragment(text, m.index + m[0].length);
    if (value && value.id && value.slug && value.name) result[m[1] === 'episode' ? 'episodes' : 'movies'].push(value);
  }
  return result;
}
function detectSite(doc, href, page = {}) {
  const url = safeURL(href);
  if (!url || !url.pathname.startsWith('/xem-phim/')) return null;
  const legacyFrame = doc.querySelector('iframe#player.player-iframe');
  const panels = [...doc.querySelectorAll('.server-picker[data-panel]')];
  if (legacyFrame && panels.some(p => p.querySelector('[data-server][data-value]')) && doc.querySelector('.btn-episode.chaptervs,.btn-episode.chaptertm')) {
    return {kind:'legacy-panels', frame:legacyFrame, url};
  }
  const frame = doc.querySelector('.player-ratio iframe#embed-player');
  if (!frame) return null;
  const data = rscObjects(doc, page);
  const suffix = url.pathname.match(/\.(\d+)$/)?.[1];
  const embedID = safeURL(frame.src)?.pathname.match(/^\/embed\/(\d+)$/)?.[1];
  const candidates = data.episodes.filter(e => suffix ? String(e.id) === suffix : embedID ? String(e.id) === embedID : e.link === frame.src);
  const episode = candidates.at(-1);
  if (!episode || typeof episode.server !== 'string' || !['embed','m3u8'].includes(episode.type)) return null;
  if (episode.type==='embed' && episode.link!==frame.src || episode.type==='m3u8' && String(episode.id)!==embedID) return null;
  const movieSlug = url.pathname.slice('/xem-phim/'.length).replace(/\.\d+$/, '');
  const movie = data.movies.findLast(m => m.slug === movieSlug && typeof m.id === 'number');
  if (!movie) return null;
  if (typeof episode.server_type === 'string' && (Number.isFinite(episode.episode_order) || episode.episode_order===null && /^(?:tập\s*)?full$/i.test(episode.name)) && Number.isFinite(episode.season_number)) {
    return {kind:'next-ordered', frame, url, episode, movie};
  }
  if (doc.querySelector('.player-frame-stable') && frame.classList.contains('player-frame-content')) return {kind:'next-basic', frame, url, episode, movie};
  return null;
}
function readContext(site, doc) {
  if (!site) return null;
  switch (site.kind) {
    case 'next-ordered':
    case 'next-basic': {
      const {episode:e, movie:m, url} = site;
      const season = e.season_number || m.latestEpisodes?.find(item=>item.id===e.id)?.season_number || m.partNumber || 1;
      return {source:site.kind, movie:bounded(m.slug), movieID:String(m.id), title:bounded(m.name), episode:bounded(e.name), episodeID:String(e.id), season:String(season), lane:bounded(e.server_type || e.server), server:bounded(e.server), url:url.origin+url.pathname,...movieIdentity(m)};
    }
    case 'legacy-panels': {
      const cookies = Object.fromEntries(doc.cookie.split(';').map(v => v.trim().split('=')));
      const lane = cookies.selectedVidTypeRophim === 'tm' ? 'tm' : 'vs';
      const active = doc.querySelector(lane === 'tm' ? '.chaptertm.on-air' : '.chaptervs.on-air');
      const panel = doc.querySelector(`.server-picker[data-panel="${lane === 'tm' ? 'thuyetminh' : 'vietsub'}"]`);
      if (!active || !panel) return null;
      const server = panel.querySelector('[data-server].current')?.dataset.server || '';
      const title = (doc.querySelector('meta[property="og:title"]')?.content || doc.title).split('|')[0].trim();
      const movie = site.url.pathname.split('/').at(-1).replace(/-tap-\d+(?:\.[^/]*)?$/, '');
      const rawTitle=doc.querySelector('meta[property="og:title"]')?.content || doc.title;
      const original=rawTitle.split('|')[1]?.trim() || '';
      return {source:site.kind, movie, movieID:movie, title:bounded(title.replace(/\s*-\s*Tập\s*\d+.*$/i,'')), episode:bounded(active.querySelector('.v-title,.info')?.textContent?.trim() || active.textContent?.trim()), episodeID:site.url.pathname, season:title.match(/phần\s*(\d+)/i)?.[1] || '1', lane, server, url:site.url.origin+site.url.pathname,
        originalTitle:bounded(original.replace(/\s+(?:season|phần)\s*\d+/ig,'').replace(/\s+(?:19|20)\d{2}\s*$/,'')),year:original.match(/\b((?:19|20)\d{2})\s*$/)?.[1] || '',mediaType:'tv',externalImdb:'',externalTmdb:'',poster:bounded(doc.querySelector('meta[property="og:image"]')?.content || '',2048)};
    }
    default: return null;
  }
}
function contextKey(c) { return c ? [c.source,c.movieID,c.movie,c.season,c.episodeID,c.lane].map(encodeURIComponent).join('|') : ''; }
function introKey(c) { return [c.source,c.movieID,c.movie,c.season,c.lane].map(encodeURIComponent).join('|'); }
function episodeNext(entries, current) {
  const season = entries.filter(e => String(e.season_number || 1) === current.season);
  const lane = season.filter(e => laneKey(e.server_type || e.server) === laneKey(current.lane));
  const order=e=>Number.isFinite(e.episode_order)?e.episode_order:/^(?:tập\s*)?\d+(?:\.\d+)?$/i.test(e.name || '')?Number(e.name.match(/[\d.]+/)[0]):null;
  const active=lane.find(e=>String(e.id)===current.episodeID),position=active?order(active):null;
  if(position===null)return null;
  // Determine the next position before selecting its translation. A delayed dub
  // must not silently jump over an episode that exists only in another lane.
  const positions=season.map(order).filter(value=>value!==null && value>position);
  if(!positions.length)return null;
  const nextPosition=Math.min(...positions);
  const next=lane.filter(e=>order(e)===nextPosition);
  return next.length===1?next[0]:null;
}
async function nextRoute(site, context, win) {
  switch (site?.kind) {
    case 'legacy-panels': {
      const nodes = [...win.document.querySelectorAll(context.lane === 'tm' ? '.btn-episode.chaptertm' : '.btn-episode.chaptervs')];
      const index = nodes.findIndex(n => n.classList.contains('on-air'));
      const url = safeURL(nodes[index + 1]?.href);
      return index >= 0 && url?.origin === site.url.origin ? url.href : null;
    }
    case 'next-ordered':
    case 'next-basic': {
      const prefix = site.kind === 'next-basic' ? '/api/baseapi' : '/baseapi';
      const response = await win.fetch(`${prefix}/api/v1/episodes/by-idMovie/${encodeURIComponent(context.movieID)}`, {credentials:'same-origin'});
      if (!response.ok) throw new Error('Không đọc được danh sách tập');
      const raw = await response.json();
      const entries = Array.isArray(raw) ? raw : raw.result;
      if (!Array.isArray(entries) || entries.length > 10000) return null;
      const next = episodeNext(entries, context);
      return next && /^\d+$/.test(String(next.id)) ? new URL(`/xem-phim/${encodeURIComponent(context.movie)}.${next.id}`, site.url).href : null;
    }
    default: return null;
  }
}


// ---- lib/players.js ----

function mediaVisible(node, win) {
  if (!node?.isConnected) return false;
  for (let n = node; n && n.nodeType === 1; n = n.parentElement) {
    const style = win.getComputedStyle(n);
    if (n.hidden || style.display === 'none' || style.visibility === 'hidden') return false;
  }
  return true;
}
function playerCandidate(win, page = win) {
  const doc = win.document;
  const videos = [...doc.querySelectorAll('video')].filter(v => mediaVisible(v,win));
  if (videos.length !== 1) return null; // Do not guess between ads, preloads or concurrent players.
  const video = videos[0], jwRoot = video.closest('.jwplayer');
  if (jwRoot) {
    try {
      const api = typeof page.jwplayer === 'function' && page.jwplayer(jwRoot.id);
      if (api?.getContainer?.() === jwRoot && typeof api.seek === 'function' && typeof api.getPosition === 'function') return {kind:'jw', video, root:jwRoot, api};
    } catch { /* runtime not ready */ }
    return null;
  }
  const artRoot = video.closest('.art-video-player');
  if (artRoot && video.classList.contains('art-video')) return {kind:'art-native',video,root:artRoot};
  if (video.id === 'vid' && video.classList.contains('vid') && doc.querySelector('.guildline') && doc.querySelector('.loading-screen')) return {kind:'native-cdn',video,root:video.parentElement};
  return null;
}
function attachPlayer(candidate) {
  const {kind,video,root,api} = candidate;
  const initialSource=playerFingerprint(candidate);
  let adActive = false;
  const handlers = [];
  if (kind === 'jw') for (const [event,value] of [['adRequest',true],['adPlay',true],['adComplete',false],['adSkipped',false],['adError',false]]) {
    const handler = () => { adActive = value; };
    api.on?.(event,handler); handlers.push([event,handler]);
  }
  const isAd = () => adActive || !!video.closest('.jw-flag-ads,.jw-ad-media') || ['loading','playing','paused'].includes(api?.getAdState?.());
  const state = () => {
    try {
      const duration = kind === 'jw' ? api.getDuration() : video.duration;
      const time = kind === 'jw' ? api.getPosition() : video.currentTime;
      const ad = !!isAd();
      return {kind,ready:video.isConnected && playerFingerprint(candidate)===initialSource && mediaVisible(video,video.ownerDocument.defaultView) && video.readyState >= 1 && finite(duration) && duration > 0 && finite(time) && !ad, ad, time:finite(time) ? time : 0, duration:finite(duration) ? duration : 0, rate:video.playbackRate, paused:video.paused, ended:video.ended,played:video.played.length>0};
    } catch { return {kind,ready:false,ad:true,time:0,duration:0,rate:1,paused:true,ended:false,played:false}; }
  };
  const command = (action,value) => {
    const s = state();
    if (!s.ready || s.ad) return false;
    switch (action) {
      case 'seek': if (!finite(value)) return false; if (kind === 'jw') api.seek(clampSeek(value,s.duration)); else video.currentTime = clampSeek(value,s.duration); break;
      case 'rate': if (!finite(value) || value < 0.25 || value > 4) return false; if (kind === 'jw' && typeof api.setPlaybackRate === 'function') api.setPlaybackRate(value); else video.playbackRate = value; break;
      case 'play': if (kind === 'jw') api.play(true); else video.play().catch(()=>{}); break;
      case 'pause': if (kind === 'jw') api.pause(true); else video.pause(); break;
      default:return false;
    }
    return true;
  };
  return {kind,video,root,api,state,command,fingerprint:()=>playerFingerprint(candidate),dispose() { for (const [event,handler] of handlers) api.off?.(event,handler); }};
}
function playerFingerprint(candidate) {
  try {
    const item=candidate?.kind==='jw' ? candidate.api.getPlaylistItem?.() : null;
    return [candidate?.video.currentSrc || candidate?.video.src || '',item?.file || item?.sources?.[0]?.file || ''].join('\u0000');
  }catch{return '';}
}


// ---- lib/bridge.js ----

function validState(s) {
  return s && ['jw','art-native','native-cdn'].includes(s.kind) && typeof s.ready === 'boolean' && typeof s.ad === 'boolean' && typeof s.played === 'boolean' && typeof s.paused === 'boolean' && typeof s.ended === 'boolean' && finite(s.time) && s.time >= 0 && finite(s.duration) && s.duration >= 0 && s.time <= s.duration + 5 && finite(s.rate) && s.rate >= 0.25 && s.rate <= 4;
}
function acceptsPacket(event, session, channel) {
  const d = event.data;
  return !!session && event.source === session.source && event.origin === session.origin && d?.channel === channel && d.token === session.token && d.generation === session.generation && Number.isSafeInteger(d.seq) && d.seq > session.seq;
}
function bridgeContext(value) {
  const keys=['source','movie','movieID','title','episode','episodeID','season','lane','server','url'];
  if(!value || !['next-ordered','next-basic','legacy-panels'].includes(value.source) || keys.some(k=>typeof value[k]!=='string' || value[k].length>2048))return null;
  const url=safeURL(value.url);
  if(!url || !isSiteOrigin(url.origin) || !url.pathname.startsWith('/xem-phim/'))return null;
  const result=Object.fromEntries(keys.map(k=>[k,value[k]]));
  for(const key of ['originalTitle','year','mediaType','externalImdb','externalTmdb','poster'])if(typeof value[key]==='string' && value[key].length<=2048)result[key]=value[key];
  return result;
}
function createBridge(win, page, feature, callbacks = {}) {
  const channel = 'rophim.' + feature + '.v1';
  const top = win.parent === win;
  if (top ? !isSiteOrigin(win.location.origin) : !FRAME_ORIGINS.has(win.location.origin)) return {dispose(){},state:()=>null,command:()=>false};
  let session = null, site = null, context = null, local = null, media = '', lastSource = '', remote = null, generation = 0, sequence = 0, disposed = false;
  let boundFrame = null;
  let knownSource=false, snapshot=null, pending='', retryAfter=0;
  const referrer = safeURL(win.document.referrer)?.origin;
  const emit = () => callbacks.update?.({site,context,player:local,state:top ? remote : local?.state(),media});
  const resetRemote = () => { remote = null; media = ''; session = null; generation++; emit(); };
  const loaded = () => { resetRemote(); tick(); };
  const send = data => { if (session) session.source.postMessage({...data,channel,token:session.token,generation:session.generation,seq:++sequence},session.origin); };
  const onMessage = event => {
    const d = event.data;
    if (!d || d.channel !== channel) return;
    if (!top && d.type === 'hello') {
      if (event.source !== win.parent || !isSiteOrigin(event.origin) || (referrer && event.origin !== referrer) || !/^[a-f\d]{32}$/.test(d.token) || !Number.isSafeInteger(d.generation)) return;
      if (session?.token !== d.token || session?.generation !== d.generation) {
        session = {source:event.source,origin:event.origin,token:d.token,generation:d.generation,seq:-1};sequence = 0;
      }
      context=bridgeContext(d.context);emit();
      return;
    }
    if (!acceptsPacket(event,session,channel)) return;
    if (top) {
      if (!boundFrame?.isConnected || boundFrame.contentWindow !== event.source || boundFrame.src !== session.src || contextKey(context) !== session.key) return;
      if (d.type === 'state' && validState(d.state) && /^[a-f\d]{32}$/.test(d.media)) {
        session.seq = d.seq; session.seen = Date.now(); media = d.media;remote = {...d.state};emit();
      } else if (d.type === 'request' && d.action === 'next' && d.media===media && remote?.ready && !remote.ad && Date.now()-session.seen<=4000) { session.seq = d.seq;callbacks.request?.('next'); }
    } else if (d.type === 'command' && d.media === media) {
      session.seq = d.seq;
      try { local?.command(d.action,d.value); } catch { /* player changed while message was queued */ }
    }
  };
  const tick = () => {
    if (disposed) return;
    if (top) {
      let nextSite = detectSite(win.document,win.location.href,page);
      if(nextSite)knownSource=true;
      const liveFrame=win.document.querySelector('.player-ratio iframe#embed-player');
      const currentHref=win.location.href;
      if(!nextSite && snapshot?.href===currentHref && snapshot.src===liveFrame?.src){nextSite={...snapshot.site,frame:liveFrame};}
      // App-router fetches do not necessarily append to __next_f. Refresh a
      // known source from same-origin HTML, parsed inertly, after route changes.
      if(!nextSite && knownSource && liveFrame && typeof win.fetch==='function' && currentHref!==pending && Date.now()>retryAfter && win.location.pathname.startsWith('/xem-phim/')){
        pending=currentHref;retryAfter=Date.now()+5000;
        win.fetch(currentHref,{credentials:'same-origin'}).then(r=>r.ok ? r.text() : '').then(html=>{
          if(!html || html.length>2_000_000 || disposed || win.location.href!==currentHref)return;
          const parsed=new win.DOMParser().parseFromString(html,'text/html');
          const found=detectSite(parsed,currentHref);
          if(found && found.frame.src===liveFrame.src){snapshot={href:currentHref,src:liveFrame.src,site:found};tick();}
        }).catch(()=>{}).finally(()=>{pending='';});
      }
      const nextContext = readContext(nextSite,win.document);
      const frame = nextSite?.frame, url = safeURL(frame?.src);
      const changed = frame !== boundFrame || contextKey(nextContext) !== contextKey(context) || frame?.src !== session?.src;
      site = nextSite;context = nextContext;
      if (changed) {
        boundFrame?.removeEventListener('load',loaded);
        boundFrame = frame || null; resetRemote();
        boundFrame?.addEventListener('load',loaded);
      }
      if (!nextContext || !frame || !url || !FRAME_ORIGINS.has(url.origin) || !frame.contentWindow || frame.hasAttribute('sandbox') && !frame.sandbox.contains('allow-same-origin')) {
        diagnostic(win.document,feature, nextContext ? 'iframe chưa cấp quyền/không nhận diện' : 'chờ nguồn website');return;
      }
      if (!session) { session = {source:frame.contentWindow,origin:url.origin,src:frame.src,key:contextKey(context),token:token(win),generation,seq:-1,seen:0};sequence = 0; }
      send({type:'hello',context});
      if (session.seen && Date.now() - session.seen > 4000) {remote = null;media = '';emit();}
      diagnostic(win.document,feature,site.kind + '/' + (remote?.ready ? remote.kind : 'chờ player nội dung'));
    } else {
      const candidate = playerCandidate(win,page);
      let source = '';
      try { source = candidate ? playerFingerprint(candidate) : ''; } catch { /* not ready */ }
      if (candidate?.video !== local?.video || candidate?.api !== local?.api || candidate?.kind !== local?.kind || source !== lastSource) {
        callbacks.unbind?.(local); local?.dispose();local = candidate ? attachPlayer(candidate) : null;lastSource = source;media = local ? token(win) : '';emit();
      }
      if (local && session) send({type:'state',state:local.state(),media});
      if(local)emit();
      diagnostic(win.document,feature,local ? local.kind + '/' + (local.state().ready ? 'ready' : 'chờ metadata/nội dung') : 'player chưa nhận diện');
    }
  };
  win.addEventListener('message',onMessage);
  const offDOM = watchDOM(win,tick), timer = win.setInterval(tick,1000);
  tick();
  const bridge = {
    state:() => top ? remote : local?.state(),
    context:() => context,
    command(action,value) {
      if (!top) return local?.command(action,value) || false;
      if (!remote?.ready || remote.ad || !media || !session || Date.now() - session.seen > 4000) return false;
      send({type:'command',action,value,media});return true;
    },
    request(action) { if (!top && action === 'next' && local?.state().ready) send({type:'request',action,media}); },
    refresh:tick,
    dispose() { disposed = true;win.clearInterval(timer);offDOM();win.removeEventListener('message',onMessage);boundFrame?.removeEventListener('load',loaded);callbacks.unbind?.(local);local?.dispose(); },
  };
  return bridge;
}


// ---- lib/ui.js ----
function uiStyle(doc) {
  if (doc.getElementById('rp-ui-style')) return;
  const style = doc.createElement('style');style.id = 'rp-ui-style';
  style.textContent = `[data-rp-ui]{font:13px/1.5 system-ui,sans-serif;color:#fff;box-sizing:border-box}[data-rp-ui] button,[data-rp-ui] a{font:inherit;cursor:pointer;background:#202735;color:#fff;border:1px solid #68758a;border-radius:6px;padding:6px 9px;text-decoration:none}[data-rp-ui] button:disabled{opacity:.45;cursor:default}[data-rp-ui] button:focus-visible,[data-rp-ui] a:focus-visible{outline:2px solid #ffe08a;outline-offset:2px}[data-rp-ui] input{font:inherit;color:#fff;background:#202735;border:1px solid #68758a;border-radius:4px;width:65px;padding:4px}.rp-tools{position:absolute;top:8px;right:8px;z-index:2147483645;max-width:calc(100% - 16px)}.rp-row{display:flex;flex-wrap:wrap;gap:5px;align-items:center;padding:7px;background:#101722ed;border-radius:8px;max-width:600px}.rp-tools>summary{cursor:pointer;list-style:none;background:#101722c9;border:1px solid #68758a;border-radius:6px;width:32px;text-align:center;padding:3px}.rp-toast{display:block;max-width:320px;background:#101722e8;border-radius:6px;margin-top:4px;padding:3px 6px}.rp-page{position:fixed;bottom:14px;left:14px;z-index:2147483645}.rp-panel{position:fixed;inset:8vh max(12px,calc((100vw - 720px)/2));z-index:2147483646;overflow:auto;background:#101722;border:1px solid #68758a;border-radius:12px;padding:14px;box-shadow:0 12px 60px #0009;max-height:84vh}.rp-panel article{padding:10px 0;border-bottom:1px solid #394457}.rp-panel p{margin:4px 0}.rp-panel a{display:inline-block;margin:4px 5px 4px 0}`;
  style.textContent+='[data-rp-ui][hidden],[data-rp-ui] [hidden]{display:none!important}';
  style.textContent+='.rp-continue{position:relative;margin:90px 16px 20px;padding:16px;background:#101722;color:#fff;border:1px solid #394457;border-radius:12px;z-index:1}.rp-continue h2{font-size:21px;margin:0 0 12px}.rp-continue h3{font-size:16px;margin:0 0 6px}.rp-history-cards{display:flex;gap:12px;overflow-x:auto;padding:4px 0 10px}.rp-history-cards article{flex:0 0 250px;padding:12px;border:1px solid #394457;border-radius:8px}.rp-history-cards a{display:inline-block;margin:8px 0 0}.rp-history-cards p{margin:4px 0 10px}';
  style.textContent+='[data-rp-custom-controls="1"] .art-bottom,[data-rp-custom-controls="1"] .art-mask,[data-rp-custom-controls="1"] .art-settings,[data-rp-custom-controls="1"] .art-contextmenus,[data-rp-custom-controls="1"] .art-layer-lock,[data-rp-custom-controls="1"] .art-layer-fastForward,[data-rp-custom-controls="1"] .jw-controls,[data-rp-custom-controls="1"] .jw-settings-menu,[data-rp-custom-controls="1"] .jw-rightclick,[data-rp-custom-controls="1"] .guildline{display:none!important;pointer-events:none!important}[data-rp-custom-controls="1"] .loading-screen{pointer-events:none!important}.rp-player-shell{position:absolute;inset:0;z-index:2147483642;pointer-events:none}.rp-gesture-surface{position:absolute;inset:0;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}.rp-player-chrome{position:absolute;bottom:0;left:0;right:0;padding:9px;background:linear-gradient(transparent,#000d);pointer-events:auto}.rp-player-line{display:flex;gap:6px;align-items:center}.rp-player-line button,.rp-unlock{min-height:44px;min-width:44px}.rp-player-time{flex:1;text-align:center;font-size:12px}.rp-player-chrome input[type="range"]{display:block;width:100%;box-sizing:border-box;margin:7px 0 0;min-height:32px;padding:0;accent-color:#ffe08a;touch-action:none}.rp-unlock{position:absolute;left:10px;top:10px;pointer-events:auto;background:#101722ed!important}.rp-player-shell>.rp-toast{position:absolute;top:12px;left:50%;transform:translateX(-50%);pointer-events:none}.rp-player-shell [hidden],.rp-player-shell [hidden].rp-unlock{display:none!important}';
  (doc.head || doc.documentElement).append(style);
}
function makeButton(doc, label, action, parent) {
  const b = doc.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();action(event);});parent?.append(b);return b;
}
function toast(host, text) {
  let node = host.querySelector('.rp-toast');
  if (!node) { node=host.ownerDocument.createElement('output');node.className='rp-toast';node.setAttribute('aria-live','polite');host.append(node); }
  node.textContent=text;
}
function toolsHost(root) {
  const doc=root.ownerDocument;uiStyle(doc);
  const host=doc.createElement('details');host.dataset.rpUi='controls';host.className='rp-tools';
  const summary=doc.createElement('summary');summary.textContent='RP';summary.title='Thao tác RoPhim';host.append(summary);
  const row=doc.createElement('div');row.className='rp-row';host.append(row);
  if (doc.defaultView.getComputedStyle(root).position === 'static') { root.style.position='relative'; }
  root.append(host);return {host,row};
}


// ---- lib/gestures.js ----

function installGestures(win, player, notify = () => {}, options={}) {
  const {video}=player,root=options.surface || player.root;
  const interactive = target => options.surface?.contains(target)?false:!!target?.closest?.('[data-rp-ui],a,button,input,select,textarea,[contenteditable="true"],[role="slider"],[role="button"],.jw-controlbar,.jw-settings-menu,.jw-rightclick,.art-controls,.art-settings,.art-contextmenus');
  let press=null, lastTap=null, holdTimer=0, tapTimer=0, suppressUntil=0;
  const source=()=>player.fingerprint?.() || video.currentSrc || video.src;
  const consume=e=>{if(options.exclusive){e.preventDefault();e.stopImmediatePropagation();}};
  function restore() {
    win.clearTimeout(holdTimer);holdTimer=0;
    if (press?.held && video.isConnected && press.source === source() && video.playbackRate === 2) {
      // Restore the rate captured at press time, never assume it was 1×.
      try { if(!player.command('rate',press.rate))video.playbackRate=press.rate; } catch { /* replaced player */ }
    }
    press=null;
  }
  function cancel() {restore();lastTap=null;win.clearTimeout(tapTimer);tapTimer=0;}
  const point = event => {
    const box=video.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0 || event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom - (options.surface?0:60)) return null;
    const ratio=(event.clientX-box.left)/box.width;
    return ratio < .4 ? -1 : ratio > .6 ? 1 : 0;
  };
  const down = e => {
    if(options.isLocked?.()){cancel();consume(e);return;}
    if (e.isPrimary === false) {cancel();return;}
    if (interactive(e.target) || e.button !== 0 || !player.state().ready) return;
    const side=point(e);if (side === null) return;
    consume(e);
    restore();press={id:e.pointerId,x:e.clientX,y:e.clientY,side,at:Date.now(),source:source(),rate:player.state().rate,held:false};
    holdTimer=win.setTimeout(()=>{
      if (!press || !player.state().ready || source()!==press.source) return cancel();
      if(player.command('rate',2)){press.held=true;lastTap=null;win.clearTimeout(tapTimer);notify('Giữ 2×');}
    },450);
  };
  const move = e => {consume(e);if(press && (e.pointerId!==press.id || Math.hypot(e.clientX-press.x,e.clientY-press.y)>14)) cancel();};
  const up = e => {
    if(options.exclusive && !root.contains(e.target) && !press)return;
    if(options.isLocked?.()){cancel();consume(e);return;}
    if(!press || e.pointerId!==press.id)return;
    const p=press, now=Date.now();restore();
    consume(e);
    if(p.held){suppressUntil=now+400;notify('Đã khôi phục tốc độ');e.preventDefault();e.stopImmediatePropagation();return;}
    if(now-p.at>350 || source()!==p.source || !player.state().ready)return;
    if(!p.side){options.onTap?.();lastTap=null;return;}
    if(lastTap && now-lastTap.at<320 && p.side===lastTap.side && Math.hypot(p.x-lastTap.x,p.y-lastTap.y)<48){
      win.clearTimeout(tapTimer);player.command('seek',player.state().time+p.side*10);lastTap=null;suppressUntil=now+400;notify(p.side>0?'+10 giây':'−10 giây');e.preventDefault();e.stopImmediatePropagation();
    } else {lastTap={...p,at:now};if(options.onTap){win.clearTimeout(tapTimer);tapTimer=win.setTimeout(()=>{lastTap=null;options.onTap();},320);}}
  };
  const click = e => {if(options.exclusive || Date.now()<suppressUntil && !interactive(e.target)){e.preventDefault();e.stopImmediatePropagation();}};
  const menu = e => {if(options.exclusive || press?.held){e.preventDefault();e.stopImmediatePropagation();}};
  const touch=e=>consume(e);
  const visibility = () => {if(win.document.hidden)cancel();};
  for(const [name,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['lostpointercapture',cancel],['click',click],['dblclick',click],['contextmenu',menu]]) root.addEventListener(name,fn,true);
  if(options.exclusive)for(const name of ['touchstart','touchmove','touchend','touchcancel'])root.addEventListener(name,touch,{passive:false});
  win.addEventListener('blur',cancel);win.addEventListener('pointerup',up,true);win.document.addEventListener('visibilitychange',visibility);
  video.addEventListener('emptied',cancel);video.addEventListener('loadstart',cancel);
  return () => {cancel();for(const [name,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['lostpointercapture',cancel],['click',click],['dblclick',click],['contextmenu',menu]])root.removeEventListener(name,fn,true);for(const name of ['touchstart','touchmove','touchend','touchcancel'])root.removeEventListener(name,touch);win.removeEventListener('blur',cancel);win.removeEventListener('pointerup',up,true);win.document.removeEventListener('visibilitychange',visibility);video.removeEventListener('emptied',cancel);video.removeEventListener('loadstart',cancel);};
}


// ---- lib/custom-controls.js ----

function customPlayerControls(win,player,tools) {
  const {video,root}=player,doc=win.document;
  uiStyle(doc);
  const shell=doc.createElement('div');shell.dataset.rpUi='player';shell.className='rp-player-shell';
  const surface=doc.createElement('div');surface.dataset.rpGestureSurface='1';surface.className='rp-gesture-surface';surface.setAttribute('aria-label','Vùng thao tác trình phát RoPhim');shell.append(surface);
  const chrome=doc.createElement('div');chrome.className='rp-player-chrome';shell.append(chrome);
  const line=doc.createElement('div');line.className='rp-player-line';chrome.append(line);
  const play=makeButton(doc,'Phát',()=>player.command(player.state().paused?'play':'pause'),line);
  const time=doc.createElement('output');time.className='rp-player-time';line.append(time);
  const seek=doc.createElement('input');seek.type='range';seek.min='0';seek.max='1000';seek.step='1';seek.value='0';seek.setAttribute('aria-label','Tua phim');chrome.append(seek);
  let locked=false,hideTimer=0,scrubbing=false,disposed=false,nativeOwned=false,lastReady=false;
  const savedAttributes=new Map(['controls','playsinline','webkit-playsinline'].map(name=>[name,video.getAttribute(name)]));
  const restoreNative=()=>{
    if(!nativeOwned)return;nativeOwned=false;delete root.dataset.rpCustomControls;
    for(const [name,value] of savedAttributes){if(value===null)video.removeAttribute(name);else video.setAttribute(name,value);}
  };
  const lock=makeButton(doc,'Khóa',()=>setLocked(true),line);
  const fullscreen=makeButton(doc,'Toàn màn hình',async()=>{
    try{if(doc.fullscreenElement)await doc.exitFullscreen();else if(root.requestFullscreen)await root.requestFullscreen();else toast(shell,'Trình duyệt chưa hỗ trợ toàn màn hình khung');}
    catch{toast(shell,'Không bật được toàn màn hình khung');}
  },line);
  const unlock=makeButton(doc,'Mở khóa',()=>setLocked(false),shell);unlock.className='rp-unlock';unlock.hidden=true;
  const show=()=>{chrome.hidden=locked;tools.host.hidden=locked;win.clearTimeout(hideTimer);if(!locked && !player.state().paused && !tools.host.open)hideTimer=win.setTimeout(()=>{if(!scrubbing && !tools.host.open){chrome.hidden=true;tools.host.hidden=true;}},3500);};
  function setLocked(value){locked=value;shell.dataset.rpLocked=String(value);unlock.hidden=!value;offGesturesCancel();show();update();}
  let offGestures=()=>{},offGesturesCancel=()=>{};
  offGestures=installGestures(win,player,text=>toast(shell,text),{surface,exclusive:true,isLocked:()=>locked,onTap:()=>{if(chrome.hidden)show();else{chrome.hidden=true;tools.host.hidden=true;}}});
  // A lock action cancels an ongoing hold through the same cancellation path.
  offGesturesCancel=()=>surface.dispatchEvent(new win.Event('pointercancel',{bubbles:false}));
  const block=e=>e.stopPropagation();
  const inputEvents=['pointerdown','pointermove','pointerup','touchstart','touchmove','touchend','touchcancel','mousedown','mouseup','click','dblclick','contextmenu','keydown','keyup'];
  for(const node of [shell,tools.host])for(const name of inputEvents)node.addEventListener(name,block);
  seek.addEventListener('pointerdown',()=>{scrubbing=true;win.clearTimeout(hideTimer);});
  seek.addEventListener('input',()=>{scrubbing=true;time.textContent=format(Number(seek.value))+' / '+format(player.state().duration);});
  seek.addEventListener('change',()=>{if(!locked)player.command('seek',Number(seek.value));scrubbing=false;show();});
  seek.addEventListener('pointercancel',()=>{scrubbing=false;show();});
  chrome.addEventListener('pointerdown',()=>{win.clearTimeout(hideTimer);});
  const changed=()=>update();
  for(const name of ['loadedmetadata','timeupdate','play','pause','ratechange','durationchange','emptied','loadstart'])video.addEventListener(name,changed);
  const nativeObserver=new win.MutationObserver(()=>{if(nativeOwned && video.controls)video.controls=false;});nativeObserver.observe(video,{attributes:true,attributeFilter:['controls']});
  function format(value){const seconds=Math.max(0,Math.floor(Number(value)||0));return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
  function update(){
    if(disposed)return;const state=player.state();
    surface.hidden=!state.ready;
    if(!state.ready){chrome.hidden=true;tools.host.hidden=true;}
    else if(!lastReady)show();
    lastReady=state.ready;
    if(state.ready){nativeOwned=true;root.dataset.rpCustomControls='1';if(video.controls)video.controls=false;video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');}
    else restoreNative();
    for(const b of [play,lock,fullscreen,seek])b.disabled=!state.ready || locked;
    play.textContent=state.paused?'Phát':'Dừng';
    if(!scrubbing){seek.max=String(Math.max(1,state.duration));seek.value=String(state.time);time.textContent=format(state.time)+' / '+format(state.duration)+' · '+state.rate+'×';}
    if(state.ready && state.paused && !locked){chrome.hidden=false;tools.host.hidden=false;}
  }
  if(win.getComputedStyle(root).position==='static')root.style.position='relative';
  root.append(shell);update();show();
  return {shell,surface,update,dispose(){if(disposed)return;disposed=true;win.clearTimeout(hideTimer);offGestures();nativeObserver.disconnect();for(const name of ['loadedmetadata','timeupdate','play','pause','ratechange','durationchange','emptied','loadstart'])video.removeEventListener(name,changed);for(const node of [shell,tools.host])for(const name of inputEvents)node.removeEventListener(name,block);restoreNative();shell.remove();}};
}


// ---- source/rophim-gestures.js ----

function startGestures(win,page) {
  const store=storageAPI(win),doc=win.document;
  let mounted=null, offGestures=()=>{},site=null,context=null,pageHost=null,bridge=null;
  const next=async()=>{
    if(!site || !context)return;
    const expected=contextKey(context);
    try {
      const url=await nextRoute(site,context,win);
      if(expected!==contextKey(context))return;
      if(!url){if(pageHost)toast(pageHost,'Chưa tìm thấy tập kế tiếp cùng bản dịch');return;}
      // Native legacy links reset server in their click handler. Preserve only an
      // explicitly selected cookie and navigate through the site's own watch route.
      if(site.kind==='legacy-panels'){
        doc.cookie=`selectedServerRophim=${encodeURIComponent(context.server)}; path=/; SameSite=Lax`;
        doc.cookie=`selectedVidTypeRophim=${context.lane}; path=/; SameSite=Lax`;
      }
      win.location.assign(url);
    }catch{if(pageHost)toast(pageHost,'Không đọc được tập kế tiếp. Hãy dùng danh sách tập của trang.');}
  };
  function mountControls(root, player, parent=false) {
    const {host,row}=toolsHost(root);
    const state=()=>parent ? bridge?.state() : player.state();
    const command=(action,value)=>parent ? bridge?.command(action,value) : player.command(action,value);
    const controls=[];
    for(const [label,delta] of [['−10s',-10],['+10s',10]])controls.push(makeButton(doc,label,()=>{const s=state();if(s?.ready)command('seek',s.time+delta);},row));
    controls.push(makeButton(doc,'Phát/Dừng',()=>{const s=state();if(s?.ready)command(s.paused?'play':'pause');},row));
    for(const rate of [.75,1,1.25,1.5,2])controls.push(makeButton(doc,rate+'×',()=>command('rate',rate),row));
    const input=doc.createElement('input');input.type='number';input.min='0';input.max='600';input.step='1';input.value=context ? store.get('rp.gestures.intro.'+introKey(context),90) : 90;input.title='Số giây bỏ qua intro';input.setAttribute('aria-label','Số giây intro');row.append(input);
    input.addEventListener('change',()=>{const value=Number(input.value);if(Number.isFinite(value) && value>=0 && value<=600 && context)store.set('rp.gestures.intro.'+introKey(context),value);});
    controls.push(makeButton(doc,'Bỏ intro',()=>{const s=state(),seconds=Number(input.value);if(s?.ready && Number.isFinite(seconds) && seconds>=0 && seconds<=600)command('seek',s.time+seconds);},row));
    makeButton(doc,'Tập sau',()=>parent ? next() : bridge?.request('next'),row);
    makeButton(doc,'Toàn màn hình',()=>{
      const target=parent ? site?.frame.parentElement : root;
      try { const result=doc.fullscreenElement ? doc.exitFullscreen() : target?.requestFullscreen?.();result?.catch(()=>toast(host,'Trình duyệt chưa cho phép toàn màn hình khung')); }catch{toast(host,'Không bật được toàn màn hình');}
    },row);
    const update=()=>{for(const b of controls)b.disabled=!state()?.ready;};update();
    return {host,update,input};
  }
  const unbind=()=>{offGestures();offGestures=()=>{};mounted?.custom?.dispose();mounted?.host.remove();mounted=null;};
  bridge=createBridge(win,page,'gestures',{
    update(info){
      site=info.site;context=info.context;
      if(win.parent===win){
        if(context && !pageHost && doc.body){uiStyle(doc);pageHost=doc.createElement('div');pageHost.dataset.rpUi='page-controls';pageHost.className='rp-page';doc.body.append(pageHost);mounted=mountControls(pageHost,null,true);mounted.host.style.position='relative';mounted.host.style.top='0';mounted.host.style.right='0';}
        if(pageHost)pageHost.hidden=!context;
        if(mounted){mounted.update();if(context && doc.activeElement!==mounted.input)mounted.input.value=store.get('rp.gestures.intro.'+introKey(context),90);}
      }else if(info.player && mounted?.player!==info.player){
        unbind();mounted={...mountControls(info.player.root,info.player),player:info.player};mounted.custom=customPlayerControls(win,info.player,mounted);
      }
      if(mounted && context && doc.activeElement!==mounted.input)mounted.input.value=store.get('rp.gestures.intro.'+introKey(context),90);
      mounted?.custom?.update();
    },
    unbind,
    request:next,
  });
  // The first bridge callback can occur before assignment. Refresh UI on the
  // next task after bridge is available, and update readiness on every heartbeat.
  const timer=win.setInterval(()=>mounted?.update(),1000);
  win.addEventListener('pagehide',event=>{if(!event.persisted){win.clearInterval(timer);bridge.dispose();unbind();}});
}
startGestures(window, typeof unsafeWindow==='undefined' ? window : unsafeWindow);

})();
