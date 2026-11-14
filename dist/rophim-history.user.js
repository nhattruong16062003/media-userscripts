// ==UserScript==
// @name         RoPhim — Lịch sử xem
// @namespace    rophim-userscripts.local
// @version      0.2.0
// @author       zic
// @description  Lịch sử xem cho trang xem RoPhim.
// @homepageURL  https://github.com/nhattruong16062003/rophim-userscripts
// @supportURL   https://github.com/nhattruong16062003/rophim-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/refs/heads/main/dist/rophim-history.user.js
// @updateURL    https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/refs/heads/main/dist/rophim-history.user.js
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


// ---- lib/history.js ----

const HISTORY_PREFIX='rp.history.v1.';
function validHistory(row) {
  const url=safeURL(row?.url);
  return row?.version===1 && !!contextKey(row) && ['next-ordered','next-basic','legacy-panels'].includes(row.source) && ['movieID','movie','title','episode','episodeID','season','lane','server','url'].every(k=>typeof row[k]==='string' && row[k].length<=2048) && url && isSiteOrigin(url.origin) && url.pathname.startsWith('/xem-phim/') && finite(row.time) && row.time>=0 && finite(row.duration) && row.duration>0 && row.time<=row.duration+5 && finite(row.updated);
}
function historyRow(context,state,now=Date.now()) {
  if(!context || !state?.ready || state.ad || !state.played || !finite(state.time) || !finite(state.duration) || state.duration<=0)return null;
  const row={...context,version:1,time:Math.max(0,Math.min(state.time,state.duration)),duration:state.duration,completed:state.ended || state.duration-state.time<15,updated:now};
  return validHistory(row) ? row : null;
}
function createHistoryStore(store) {
  const key=c=>HISTORY_PREFIX+contextKey(c);
  const all=()=>store.keys().filter(k=>k.startsWith(HISTORY_PREFIX)).map(k=>store.get(k,null)).filter(validHistory).sort((a,b)=>b.updated-a.updated);
  return {
    read(c){return c?all().find(row=>sameEpisode(c,row)):null;},
    save(row){if(!validHistory(row))return false;const old=store.get(key(row),null);if(old?.updated>row.updated)return false;store.set(key(row),row);return true;},
    list(){const rows=[];for(const row of all())if(!rows.some(other=>sameEpisode(row,other)))rows.push(row);return rows;},
    continuing(){const rows=[];for(const row of all())if(!rows.some(other=>sameFilm(row,other) && row.season===other.season && laneKey(row.lane)===laneKey(other.lane)))rows.push(row);return rows.filter(row=>!row.completed);},
    remove(c){for(const row of all())if(sameEpisode(c,row))store.remove(key(row));},
  };
}


// ---- lib/history-navigation.js ----

// Resolve a watch route on the destination website. Neither internal movie IDs
// nor episode IDs are carried from the source website to another backend.
async function historyDestination(row,win) {
  if(!isSiteOrigin(win.location.origin))return null;
  const original=safeURL(row.url);
  if(original?.origin===win.location.origin && original.pathname.startsWith('/xem-phim/'))return {url:original.href,source:row.source,lane:row.lane};
  const candidates=[];
  for(const a of win.document.querySelectorAll('a[href]')){
    const url=safeURL(a.href,win.location.href);
    if(url?.origin===win.location.origin && /^\/(?:phim|xem-phim)\//.test(url.pathname) && (url.pathname.includes('/'+row.movie) || identityText(a.textContent)===identityText(row.title)))candidates.push(url.href);
  }
  if(/^[a-z0-9-]{1,200}$/i.test(row.movie))candidates.push(new URL('/xem-phim/'+row.movie,win.location.href).href);
  const load=async url=>{
    const response=await win.fetch(url,{credentials:'same-origin'});
    if(!response.ok || response.url && safeURL(response.url)?.origin!==win.location.origin)return null;
    const html=await response.text();
    return html.length<=2_000_000?new win.DOMParser().parseFromString(html,'text/html'):null;
  };
  for(const url of [...new Set(candidates)].slice(0,5)){
    const doc=await load(url);if(!doc)continue;
    const site=detectSite(doc,url),context=readContext(site,doc);
    if(!context || !sameFilm(row,context))continue;
    switch(site.kind){
      case 'next-ordered':
      case 'next-basic':{
        const prefix=site.kind==='next-basic'?'/api/baseapi':'/baseapi';
        const response=await win.fetch(prefix+'/api/v1/episodes/by-idMovie/'+encodeURIComponent(context.movieID),{credentials:'same-origin'});
        if(!response.ok)return null;
        const data=await response.json(),entries=Array.isArray(data)?data:data.result;
        if(!Array.isArray(entries) || entries.length>10000)return null;
        const found=entries.filter(e=>laneKey(e.server_type || e.server)===laneKey(row.lane) && String(e.season_number || 1)===row.season && episodeKey(e.name)===episodeKey(row.episode));
        if(found.length!==1 || !/^\d+$/.test(String(found[0].id)))return null;
        return {url:new URL('/xem-phim/'+encodeURIComponent(context.movie)+'.'+found[0].id,win.location.href).href,source:site.kind,lane:found[0].server_type || found[0].server};
      }
      case 'legacy-panels':{
        const lane=laneKey(row.lane);if(!['subtitle','voiceover'].includes(lane))return null;
        const nodes=[...doc.querySelectorAll(lane==='voiceover'?'.btn-episode.chaptertm':'.btn-episode.chaptervs')];
        const found=nodes.filter(n=>episodeKey(n.querySelector('.v-title,.info')?.textContent.trim() || n.textContent.trim())===episodeKey(row.episode));
        const target=found.length===1?safeURL(found[0].getAttribute('href'),url):null;
        return target?.origin===win.location.origin?{url:target.href,source:site.kind,lane}:null;
      }
      default:return null;
    }
  }
  return null;
}


// ---- source/rophim-history.js ----

function startHistory(win,page) {
  const doc=win.document,top=win.parent===win,db=createHistoryStore(storageAPI(win));
  let active=null,progress=null,media='',savedAt=0,lastKey='',bar=null,resume=null,panel=null,bridge=null,snapshot=null,continuing=null,cardSignature='',savedSignature='';
  const format=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  function showList(){
    if(panel){panel.remove();panel=null;return;}
    panel=doc.createElement('section');panel.dataset.rpUi='history-list';panel.className='rp-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Lịch sử xem RoPhim');
    const header=doc.createElement('h2');header.textContent='Lịch sử xem';panel.append(header);
    makeButton(doc,'Đóng',()=>{panel.remove();panel=null;},panel);
    const rows=db.list().slice(0,300);
    if(!rows.length){const p=doc.createElement('p');p.textContent='Chưa có tiến độ video nội dung được ghi nhận.';panel.append(p);}
    for(const row of rows){
      const article=doc.createElement('article'),title=doc.createElement('strong'),text=doc.createElement('p'),link=doc.createElement('a');
      title.textContent=row.title;text.textContent=`${row.episode} · ${row.lane} · ${row.server} · ${format(row.time)} / ${format(row.duration)}${row.completed?' · Đã xem':''}`;
      link.href=row.url;link.textContent='Trang đã xem';article.append(title,text,link);
      makeButton(doc,'Xem tiếp tại đây',()=>navigate(row,article),article);
      makeButton(doc,'Xóa mục này',()=>{db.remove(row);if(contextKey(active)===contextKey(row)){snapshot=null;resume.hidden=true;}article.remove();},article);panel.append(article);
    }
    const note=doc.createElement('p');note.textContent='Lưu riêng trong trình quản lý userscript; danh sách hiển thị tối đa 300 mục gần nhất.';panel.append(note);doc.body.append(panel);
  }
  function ensureUI(){
    if(!doc.body || bar)return;
    uiStyle(doc);bar=doc.createElement('div');bar.dataset.rpUi='history';bar.className='rp-page rp-row';bar.style.left='auto';bar.style.right='14px';doc.body.append(bar);
    makeButton(doc,'Lịch sử RP',showList,bar);
    resume=makeButton(doc,'Tiếp tục',()=>{if(snapshot && bridge?.state()?.ready && snapshot.time<bridge.state().duration-5){if(bridge.command('seek',snapshot.time)){snapshot=null;resume.hidden=true;toast(bar,'Đã chuyển tới mốc đã lưu');}}},bar);resume.hidden=true;
  }
  function persist(){
    if(!top || !active || !progress || !media)return;
    const row=historyRow(active,progress);
    const signature=row?[contextKey(row),Math.floor(row.time),row.completed].join('|'):'';
    if(row && signature!==savedSignature){try{db.save(row);savedSignature=signature;}catch{if(bar)toast(bar,'Không lưu được lịch sử: kiểm tra quyền userscript');}}
    savedAt=Date.now();
  }
  async function navigate(row,host){
    if(host.dataset.rpNavigating)return;
    host.dataset.rpNavigating='1';toast(host,'Đang tìm đúng phim, tập và bản dịch trên trang này…');
    try{
      const destination=await historyDestination(row,win);
      if(!destination){toast(host,'Chưa tìm được đúng phim/tập/bản dịch trên trang này. Bạn có thể mở phim rồi bấm Tiếp tục.');return;}
      if(destination.source==='legacy-panels')doc.cookie=`selectedVidTypeRophim=${laneKey(destination.lane)==='voiceover'?'tm':'vs'}; path=/; SameSite=Lax`;
      win.location.assign(destination.url);
    }catch{toast(host,'Không đọc được dữ liệu phim của trang này. Hãy thử lại.');}finally{delete host.dataset.rpNavigating;}
  }
  function home(){
    if(!top || !isSiteOrigin(win.location.origin) || !doc.body)return;
    ensureUI();bar.hidden=false;
    if(win.location.pathname.startsWith('/xem-phim/')){if(continuing)continuing.hidden=true;return;}
    if(!continuing?.isConnected){continuing=doc.createElement('section');continuing.dataset.rpUi='continue';continuing.className='rp-continue';doc.body.prepend(continuing);cardSignature='';}
    continuing.hidden=false;
    const rows=db.continuing().slice(0,24),signature=JSON.stringify(rows.map(r=>[contextKey(r),r.time,r.updated]));
    if(signature===cardSignature)return;cardSignature=signature;continuing.replaceChildren();
    const heading=doc.createElement('h2');heading.textContent='Đang xem';continuing.append(heading);
    if(!rows.length){const text=doc.createElement('p');text.textContent='Phim bạn đang xem sẽ xuất hiện tại đây, dùng chung trong Tampermonkey này.';continuing.append(text);}
    const cards=doc.createElement('div');cards.className='rp-history-cards';continuing.append(cards);
    for(const row of rows){
      const card=doc.createElement('article');
      const title=doc.createElement('h3'),description=doc.createElement('p');title.textContent=row.title;description.textContent=`${row.episode} · ${row.lane} · ${format(row.time)} / ${format(row.duration)}`;
      card.append(title,description);makeButton(doc,'Xem tiếp tại đây',()=>navigate(row,card),card);
      const source=doc.createElement('a');source.href=row.url;source.textContent='Trang đã xem';card.append(source);cards.append(card);
    }
  }
  bridge=createBridge(win,page,'history',{
    update(info){
      if(!top)return;
      const nextKey=contextKey(info.context);
      // Flush the immutable old context/progress pair before accepting a new one.
      if(nextKey!==lastKey){persist();lastKey=nextKey;snapshot=info.context ? db.read(info.context) : null;active=info.context;progress=null;media='';savedAt=0;savedSignature='';}
      else active=info.context;
      progress=info.state;media=info.media;
      if(active){ensureUI();bar.hidden=false;}else if(bar)bar.hidden=win.location.pathname.startsWith('/xem-phim/');
      const compatible=snapshot && info.state?.ready && Math.abs(snapshot.duration-info.state.duration)<=Math.max(5,snapshot.duration*.02);
      if(resume){resume.hidden=!(compatible && snapshot.time>=5 && !snapshot.completed && snapshot.time<info.state.duration-5);resume.textContent=snapshot?`Tiếp tục ${format(snapshot.time)}`:'Tiếp tục';}
      if(snapshot && info.state?.ready && !compatible && bar)toast(bar,'Có lịch sử đã lưu, nhưng bản phim này khác thời lượng nên chưa thể tua đúng mốc.');
      if(Date.now()-savedAt>=5000)persist();
    },
  });
  let offHome=()=>{},homeTimer=0;
  if(top && isSiteOrigin(win.location.origin)){doc.addEventListener('visibilitychange',()=>{if(doc.hidden)persist();else home();});win.addEventListener('pagehide',persist);offHome=watchDOM(win,home);homeTimer=win.setInterval(home,3000);home();}
  win.addEventListener('pagehide',event=>{if(!event.persisted){bridge.dispose();offHome();win.clearInterval(homeTimer);}});
}
startHistory(window,typeof unsafeWindow==='undefined' ? window : unsafeWindow);

})();
