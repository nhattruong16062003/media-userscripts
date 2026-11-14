// ==UserScript==
// @name         RoPhim — Thao tác trình phát
// @namespace    rophim-userscripts.local
// @version      0.3.1
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
  const handlers = [],subscribers=new Set();
  if (kind === 'jw') for (const [event,value] of [['adRequest',true],['adPlay',true],['adComplete',false],['adSkipped',false],['adError',false]]) {
    const handler = () => { adActive = value;for(const notify of subscribers)notify(); };
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
      case 'mute': if(typeof value!=='boolean')return false; if(kind==='jw' && typeof api.setMute==='function')api.setMute(value);else video.muted=value;break;
      case 'play': if (kind === 'jw' && typeof api.play==='function') api.play(true); else video.play()?.catch(()=>{}); break;
      case 'pause': if (kind === 'jw' && typeof api.pause==='function') api.pause(true); else video.pause(); break;
      default:return false;
    }
    return true;
  };
  return {kind,video,root,api,state,command,fingerprint:()=>playerFingerprint(candidate),subscribe(notify){subscribers.add(notify);return ()=>subscribers.delete(notify);},dispose() { subscribers.clear();for (const [event,handler] of handlers) api.off?.(event,handler); }};
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
  const requests=new Map();
  const clearRequests=()=>{for(const request of requests.values()){win.clearTimeout(request.timer);request.resolve('unavailable');}requests.clear();};
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
      if(!Number.isSafeInteger(d.seq) || d.seq<0)return;
      if (session?.token !== d.token || session?.generation !== d.generation) {
        clearRequests();
        session = {source:event.source,origin:event.origin,token:d.token,generation:d.generation,seq:-1};sequence = 0;
      }
      if(d.seq<=session.seq)return;
      session.seq=d.seq;
      const nextContext=bridgeContext(d.context);if(contextKey(nextContext)!==contextKey(context))clearRequests();context=nextContext;emit();
      return;
    }
    if (!acceptsPacket(event,session,channel)) return;
    if (top) {
      if (!boundFrame?.isConnected || boundFrame.contentWindow !== event.source || boundFrame.src !== session.src || contextKey(context) !== session.key) return;
      if (d.type === 'state' && validState(d.state) && /^[a-f\d]{32}$/.test(d.media)) {
        session.seq = d.seq; session.seen = Date.now(); media = d.media;remote = {...d.state};emit();
      } else if (d.type === 'request' && d.action === 'next' && /^[a-f\d]{32}$/.test(d.id) && d.media===media && remote?.ready && !remote.ad && Date.now()-session.seen<=4000) {
        session.seq = d.seq;
        if(session.requesting && Date.now()<=session.requesting.until)return;
        const active=session,activeMedia=media,requestMarker={until:Date.now()+11000};active.requesting=requestMarker;
        const isCurrent=()=>!disposed && session===active && active.requesting===requestMarker && Date.now()<=requestMarker.until && media===activeMedia && boundFrame?.isConnected && boundFrame.contentWindow===active.source && boundFrame.src===active.src && contextKey(context)===active.key && remote?.ready && !remote.ad;
        Promise.resolve().then(()=>isCurrent()?callbacks.request?.('next',{isCurrent}):'unavailable').then(status=>{
          if(!isCurrent())return;
          send({type:'result',id:d.id,media:activeMedia,status:['missing','error','navigating','unavailable'].includes(status)?status:'error'});
        }).catch(()=>{if(isCurrent())send({type:'result',id:d.id,media:activeMedia,status:'error'});}).finally(()=>{if(active.requesting===requestMarker)active.requesting=null;});
      }
    } else if (d.type === 'command' && d.media === media) {
      session.seq = d.seq;
      try { local?.command(d.action,d.value); } catch { /* player changed while message was queued */ }
    } else if(!top && d.type==='result' && d.media===media && requests.has(d.id) && ['missing','error','navigating','unavailable'].includes(d.status)){
      session.seq=d.seq;const request=requests.get(d.id);requests.delete(d.id);win.clearTimeout(request.timer);request.resolve(d.status);
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
        clearRequests();callbacks.unbind?.(local); local?.dispose();local = candidate ? attachPlayer(candidate) : null;lastSource = source;media = local ? token(win) : '';emit();
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
    request(action) {
      if(top || action!=='next' || !local?.state().ready || !session || !context)return false;
      if(requests.size)return false;
      const id=token(win);
      return new Promise(resolve=>{
        const timer=win.setTimeout(()=>{requests.delete(id);resolve('timeout');},12000);
        requests.set(id,{resolve,timer});
        // Flush state so the parent validates the same active resource even
        // before the first heartbeat.
        send({type:'state',state:local.state(),media});send({type:'request',action,id,media});
      });
    },
    refresh:tick,
    dispose() { disposed = true;clearRequests();win.clearInterval(timer);offDOM();win.removeEventListener('message',onMessage);boundFrame?.removeEventListener('load',loaded);callbacks.unbind?.(local);local?.dispose(); },
  };
  return bridge;
}


// ---- lib/ui.js ----
function makeButton(doc, label, action, parent) {
  const b = doc.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();action(event);});parent?.append(b);return b;
}
function toast(host, text) {
  let node = host.querySelector('.rp-toast');
  if (!node) { node=host.ownerDocument.createElement('output');node.className='rp-toast';node.setAttribute('aria-live','polite');host.append(node); }
  node.textContent=text;
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
    const previous=press;press=null;
    if (previous?.held && video.playbackRate === 2) {
      // A source swap may reuse this video while the old adapter is already
      // unready. Release our temporary rate on that element as well, without
      // commanding a new playlist item or overwriting an independent change.
      let restored=false;
      try {if(previous.source===source())restored=player.command('rate',previous.rate);}catch{/* stale API */}
      if(!restored)try{video.playbackRate=previous.rate;}catch{/* disposed media */}
    }
    if(previous?.held)options.onHoldChange?.(false);
  }
  function cancel() {restore();lastTap=null;win.clearTimeout(tapTimer);tapTimer=0;}
  const point = event => {
    const box=video.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0 || event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom - (options.surface?0:60)) return null;
    const ratio=(event.clientX-box.left)/box.width;
    return ratio < .4 ? -1 : ratio > .6 ? 1 : 0;
  };
  const down = e => {
    if (e.isPrimary === false) {cancel();return;}
    if (interactive(e.target) || e.button !== 0 || !player.state().ready) return;
    const side=point(e);if (side === null) return;
    consume(e);
    restore();press={id:e.pointerId,x:e.clientX,y:e.clientY,side,at:Date.now(),source:source(),rate:player.state().rate,held:false,locked:!!options.isLocked?.()};
    if(press.locked || player.state().paused)return;
    holdTimer=win.setTimeout(()=>{
      if (!press || !player.state().ready || player.state().paused || options.isLocked?.() || source()!==press.source) return cancel();
      if(player.command('rate',2)){press.held=true;lastTap=null;win.clearTimeout(tapTimer);options.onHoldChange?.(true);notify('Giữ 2×');}
    },450);
  };
  const move = e => {if(press)consume(e);if(press && (e.pointerId!==press.id || Math.hypot(e.clientX-press.x,e.clientY-press.y)>14)) cancel();};
  const up = e => {
    if(options.exclusive && !root.contains(e.target) && !press)return;
    if(!press || e.pointerId!==press.id)return;
    const p=press, now=Date.now();restore();
    consume(e);
    if(p.locked || options.isLocked?.()){lastTap=null;win.clearTimeout(tapTimer);if(p.locked && now-p.at<=350 && source()===p.source)options.onLockedTap?.();return;}
    if(p.held){suppressUntil=now+400;notify('Đã khôi phục tốc độ');e.preventDefault();e.stopImmediatePropagation();return;}
    if(now-p.at>350 || source()!==p.source || !player.state().ready)return;
    if(!p.side){options.onTap?.();lastTap=null;return;}
    if(lastTap && now-lastTap.at<320 && p.side===lastTap.side && Math.hypot(p.x-lastTap.x,p.y-lastTap.y)<48){
      win.clearTimeout(tapTimer);if(player.command('seek',player.state().time+p.side*10)){options.onSeek?.(p.side);notify(p.side>0?'+10 giây':'−10 giây');}lastTap=null;suppressUntil=now+400;e.preventDefault();e.stopImmediatePropagation();
    } else {lastTap={...p,at:now};if(options.onTap){win.clearTimeout(tapTimer);tapTimer=win.setTimeout(()=>{lastTap=null;options.onTap();},320);}}
  };
  const click = e => {if(options.exclusive || Date.now()<suppressUntil && !interactive(e.target)){e.preventDefault();e.stopImmediatePropagation();}};
  const menu = e => {if(options.exclusive || press?.held){e.preventDefault();e.stopImmediatePropagation();}};
  const touch=e=>consume(e);
  const visibility = () => {if(win.document.hidden)cancel();};
  for(const [name,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['lostpointercapture',cancel],['click',click],['dblclick',click],['contextmenu',menu]]) root.addEventListener(name,fn,true);
  if(options.exclusive)for(const name of ['touchstart','touchmove','touchend','touchcancel'])root.addEventListener(name,touch,{passive:false});
  win.addEventListener('blur',cancel);win.addEventListener('pointerup',up,true);win.addEventListener('pointermove',move,true);win.addEventListener('pointercancel',cancel,true);win.document.addEventListener('visibilitychange',visibility);
  video.addEventListener('emptied',cancel);video.addEventListener('loadstart',cancel);
  return () => {cancel();for(const [name,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['lostpointercapture',cancel],['click',click],['dblclick',click],['contextmenu',menu]])root.removeEventListener(name,fn,true);for(const name of ['touchstart','touchmove','touchend','touchcancel'])root.removeEventListener(name,touch);win.removeEventListener('blur',cancel);win.removeEventListener('pointerup',up,true);win.removeEventListener('pointermove',move,true);win.removeEventListener('pointercancel',cancel,true);win.document.removeEventListener('visibilitychange',visibility);video.removeEventListener('emptied',cancel);video.removeEventListener('loadstart',cancel);};
}


// ---- lib/player-ui.js ----
// Approved player design. Local SVG assets; no icon CDN or runtime dependency.
function playerIcon(name) {
  const paths={
    play:'<path d="M6 4l15 8-15 8z"/>',pause:'<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>',
    next:'<path d="M5 5l12 7-12 7z"/><path d="M19 5v14"/>',
    volume:'<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    muted:'<path d="M11 5L6 9H3v6h3l5 4zM16 9l6 6m0-6l-6 6"/>',
    settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
    fullscreen:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    shrink:'<path d="M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5"/>',
    lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    forward:'<path d="M7 7l5 5-5 5m6-10l5 5-5 5"/>',back:'<path d="M11 7l-5 5 5 5m6-10l-5 5 5 5"/>',
    close:'<path d="M6 6l12 12M18 6L6 18"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="${['play','pause'].includes(name)?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ''}</svg>`;
}
function playerUIStyle(doc) {
  if(doc.getElementById('rp-player-style'))return;
  const style=doc.createElement('style');style.id='rp-player-style';
  style.textContent=`
  [data-rp-custom-controls="1"] .art-bottom,[data-rp-custom-controls="1"] .art-mask,[data-rp-custom-controls="1"] .art-settings,[data-rp-custom-controls="1"] .art-contextmenus,[data-rp-custom-controls="1"] .art-layer-lock,[data-rp-custom-controls="1"] .art-layer-fastForward,[data-rp-custom-controls="1"] .jw-controls,[data-rp-custom-controls="1"] .jw-settings-menu,[data-rp-custom-controls="1"] .jw-rightclick,[data-rp-custom-controls="1"] .guildline{display:none!important;pointer-events:none!important}
  [data-rp-custom-controls="1"] .loading-screen{pointer-events:none!important}
  [data-rp-ui="player"].rp-player-shell{position:absolute;inset:0;z-index:2147483642;pointer-events:none;font:14px/1.4 Arial,sans-serif;color:#fff;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
  .rp-player-shell *{box-sizing:border-box}.rp-player-shell[hidden],.rp-player-shell [hidden]{display:none!important}
  .rp-player-shell button{font:inherit;color:#fff;cursor:pointer;touch-action:manipulation}.rp-player-shell button:focus-visible,.rp-player-shell input:focus-visible{outline:2px solid #fff;outline-offset:2px}.rp-player-shell button:disabled{cursor:default}
  .rp-gesture-surface{position:absolute;inset:0;pointer-events:auto;touch-action:none}
  .rp-player-shell .rp-icon{display:inline-flex;align-items:center;justify-content:center;min-width:40px;min-height:40px;margin:0;padding:8px;border:0;border-radius:0;background:transparent;color:#eee;pointer-events:auto}.rp-player-shell .rp-icon svg{width:20px;height:20px}
  .rp-player-shell .rp-center-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:grid;place-items:center;width:60px;height:60px;padding:12px;border-radius:50%;background:rgba(0,0,0,.5);box-shadow:0 2px 14px rgba(0,0,0,.35);color:#fff}.rp-player-shell .rp-center-play svg{width:36px;height:36px;stroke-width:2.5;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}
  .rp-player-chrome{position:absolute;bottom:0;left:0;right:0;padding:12px 12px 2px;background:linear-gradient(transparent,rgba(0,0,0,.8));pointer-events:auto}
  .rp-player-timeline{display:flex;align-items:center;height:18px}.rp-player-shell input[type="range"]{appearance:none;-webkit-appearance:none;display:block;width:100%;height:4px;margin:0;padding:0;border:0;border-radius:1px;background:linear-gradient(to right,#fff 0%,#fff var(--rp-played,0%),#626262 var(--rp-played,0%),#626262 100%);touch-action:none;cursor:ew-resize}.rp-player-shell input[type="range"]::-webkit-slider-thumb{appearance:none;width:10px;height:10px;border:0;border-radius:50%;background:#fff}.rp-player-shell input[type="range"]::-moz-range-thumb{width:10px;height:10px;border:0;border-radius:50%;background:#fff}
  .rp-player-line{display:flex;align-items:center;gap:0;min-height:42px}.rp-player-time{font:12px/1 Arial,sans-serif;white-space:nowrap;font-variant-numeric:tabular-nums;color:#eee}.rp-player-spacer{flex:1}
  .rp-player-line .rp-icon[data-rp-status="true"]{max-width:160px;font-size:12px;line-height:1.2;white-space:normal}
  .rp-player-shell .rp-pill{color:#fff;font:500 14px sans-serif;border:.5px solid rgba(255,255,255,.28);border-radius:999px;background:rgba(255,255,255,.12);backdrop-filter:blur(10px) saturate(140%);-webkit-backdrop-filter:blur(10px) saturate(140%);padding:6px 14px;display:flex;align-items:center;gap:6px;white-space:nowrap}
  .rp-context-action{position:absolute;right:16px;bottom:68px;min-height:32px;pointer-events:auto}.rp-context-action svg{width:16px;height:16px}
  .rp-player-shell .rp-lock{position:absolute;left:48px;top:50%;transform:translateY(-50%);width:48px;height:48px;padding:0;border-radius:50%;background:rgba(0,0,0,.3);border:.5px solid rgba(255,255,255,.35);color:#fff}.rp-player-shell .rp-lock svg{width:24px;height:24px}
  .rp-feedback-seek{position:absolute;top:40%;left:78%;transform:translate(-50%,-50%);pointer-events:none}.rp-feedback-seek svg{width:16px;height:16px}.rp-feedback-seek[data-side="right"] svg{animation:rp-nudge-right .35s ease-out}.rp-feedback-seek[data-side="left"] svg{animation:rp-nudge-left .35s ease-out}
  .rp-feedback-hold{position:absolute;left:50%;top:12%;transform:translate(-50%,-50%);pointer-events:none}.rp-chevrons{display:flex}.rp-chevrons svg{width:9px;height:12px;margin-left:-1px;opacity:.3;animation:rp-run 1s ease-in-out infinite}.rp-chevrons svg:nth-child(2){animation-delay:.15s}.rp-chevrons svg:nth-child(3){animation-delay:.3s}
  .rp-player-settings{position:absolute;bottom:64px;right:16px;z-index:2;width:200px;padding:4px 12px 10px;border:0;border-radius:2px;background:#1a1a1a;color:#fff;pointer-events:auto}.rp-player-settings-header{display:flex;align-items:center;justify-content:space-between;font-size:13px}.rp-player-speed-options{display:flex;flex-wrap:wrap;gap:4px}.rp-player-shell .rp-speed{padding:6px 10px;min-height:38px;border:0;border-radius:2px;background:#303030;color:#eee;font-size:13px}.rp-player-shell .rp-speed[aria-pressed="true"]{background:#555}
  .rp-player-error{position:absolute;bottom:76px;left:12px;right:12px;padding:6px 10px;border-radius:4px;background:#151515ed;color:#fff;font-size:12px;pointer-events:none}
  .rp-player-shell[data-rp-chrome="false"] .rp-player-chrome,.rp-player-shell[data-rp-chrome="false"] .rp-center-play,.rp-player-shell[data-rp-chrome="false"][data-rp-locked="false"] .rp-lock,.rp-player-shell[data-rp-locked="true"] .rp-player-chrome,.rp-player-shell[data-rp-locked="true"] .rp-center-play,.rp-player-shell[data-rp-locked="true"] .rp-context-action{visibility:hidden;pointer-events:none}
  @keyframes rp-run{0%,100%{opacity:.3;transform:translateX(0)}35%{opacity:1;transform:translateX(2px)}}@keyframes rp-nudge-right{from{transform:translateX(-4px);opacity:.3}to{transform:none;opacity:1}}@keyframes rp-nudge-left{from{transform:translateX(4px);opacity:.3}to{transform:none;opacity:1}}
  @media(max-width:480px){.rp-player-shell .rp-lock{left:24px}.rp-player-chrome{padding:8px 8px 0}.rp-player-shell .rp-icon:not(.rp-center-play):not(.rp-lock){min-width:36px;padding:6px}.rp-player-time{font-size:11px}.rp-player-line[data-rp-next-status="true"] .rp-player-time{display:none}.rp-player-shell .rp-pill{font-size:13px}}
  @media(pointer:coarse){.rp-player-shell .rp-icon{min-width:44px;min-height:44px}.rp-player-timeline{height:24px}.rp-context-action{bottom:76px;min-height:38px}.rp-player-settings{bottom:74px}}
  @media(prefers-reduced-motion:reduce){.rp-chevrons svg,.rp-feedback-seek svg{animation:none;opacity:1}}
  `;
  (doc.head || doc.documentElement).append(style);
}


// ---- lib/custom-controls.js ----

// The same approved UI talks only to the attached player's command/state API.
function customPlayerControls(win,player,options={}) {
  const {video,root}=player,doc=win.document;playerUIStyle(doc);
  const shell=doc.createElement('div');shell.dataset.rpUi='player';shell.className='rp-player-shell';shell.dataset.rpLocked='false';shell.dataset.rpChrome='true';
  const surface=doc.createElement('div');surface.className='rp-gesture-surface';surface.dataset.rpGestureSurface='1';surface.setAttribute('aria-label','Chạm để hiện điều khiển; chạm đôi hai bên tua 10 giây; giữ để phát 2 lần');shell.append(surface);
  function button(action,label,icon,host,className='rp-icon'){
    const node=doc.createElement('button');node.type='button';node.dataset.rpAction=action;node.className=className;node.setAttribute('aria-label',label);node.innerHTML=playerIcon(icon);
    node.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(disposed)return;if(!locked)actionClick(action,node);else if(action==='lock')setLocked(false);});host.append(node);return node;
  }
  let disposed=false,locked=false,chromeVisible=true,lockVisible=true,scrubbing=false,nativeOwned=false,lastReady=false,lastPaused=null,context=null;
  let hideTimer=0,lockTimer=0,tipTimer=0,errorTimer=0,nextTimer=0,scrubTimer=0,nextPending=null,nextError=null;
  const savedAttributes=new Map(['controls','playsinline','webkit-playsinline'].map(name=>[name,video.getAttribute(name)]));
  const originalPosition=root.style.position;let positioned=false;
  const center=button('play','Tạm dừng','pause',shell,'rp-icon rp-center-play');
  const lock=button('lock','Khóa màn hình','unlock',shell,'rp-icon rp-lock');lock.hidden=true;
  const contextAction=button('context','Bỏ qua giới thiệu','forward',shell,'rp-context-action rp-pill');contextAction.hidden=true;contextAction.setAttribute('aria-live','polite');
  const seekTip=doc.createElement('output');seekTip.className='rp-feedback-seek rp-pill';seekTip.hidden=true;shell.append(seekTip);
  const holdTip=doc.createElement('output');holdTip.className='rp-feedback-hold rp-pill';holdTip.hidden=true;holdTip.innerHTML='2x <span class="rp-chevrons">'+Array(3).fill('<svg viewBox="0 0 10 12" aria-hidden="true"><path d="M0 0L10 6L0 12z" fill="currentColor"/></svg>').join('')+'</span>';shell.append(holdTip);
  const chrome=doc.createElement('div');chrome.className='rp-player-chrome';shell.append(chrome);
  const timeline=doc.createElement('label');timeline.className='rp-player-timeline';chrome.append(timeline);
  const seek=doc.createElement('input');seek.type='range';seek.min='0';seek.max='1';seek.step='.1';seek.value='0';seek.setAttribute('aria-label','Tua phim');timeline.append(seek);
  const line=doc.createElement('div');line.className='rp-player-line';chrome.append(line);
  const play=button('play','Tạm dừng','pause',line),mute=button('mute','Tắt tiếng','volume',line);
  const time=doc.createElement('output');time.className='rp-player-time';line.append(time);
  const spacer=doc.createElement('span');spacer.className='rp-player-spacer';line.append(spacer);
  const next=button('next','Tập tiếp theo','next',line);next.setAttribute('aria-live','polite');
  const settingsButton=button('settings','Cài đặt','settings',line),fullscreen=button('fullscreen','Toàn màn hình','fullscreen',line);
  const settings=doc.createElement('section');settings.className='rp-player-settings';settings.setAttribute('aria-label','Cài đặt tốc độ');settings.hidden=true;shell.append(settings);
  const heading=doc.createElement('div');heading.className='rp-player-settings-header';heading.textContent='Tốc độ';settings.append(heading);button('settings','Đóng cài đặt','close',heading);
  const rates=doc.createElement('div');rates.className='rp-player-speed-options';settings.append(rates);
  for(const rate of [.75,1,1.25,1.5,2]){const node=doc.createElement('button');node.type='button';node.className='rp-speed';node.dataset.rpRate=String(rate);node.textContent=rate+'x';node.addEventListener('click',()=>{if(!locked){command('rate',rate);settings.hidden=true;show();update();}});rates.append(node);}
  const error=doc.createElement('output');error.className='rp-player-error';error.setAttribute('role','status');error.hidden=true;shell.append(error);
  function report(text){error.textContent=text;error.hidden=false;win.clearTimeout(errorTimer);errorTimer=win.setTimeout(()=>error.hidden=true,5000);}
  function command(action,value){try{return !!player.command(action,value);}catch{report('Không điều khiển được video này.');return false;}}
  function inFullscreen(){return !!doc.fullscreenElement && (doc.fullscreenElement===root || doc.fullscreenElement.contains(root));}
  function restoreNative(){if(!nativeOwned)return;nativeOwned=false;delete root.dataset.rpCustomControls;for(const [name,value] of savedAttributes){if(value===null)video.removeAttribute(name);else video.setAttribute(name,value);}}
  function applyChrome(){shell.dataset.rpChrome=String(chromeVisible);shell.dataset.rpLocked=String(locked);lock.hidden=!lastReady || !inFullscreen() || locked&&!lockVisible;}
  function show(){chromeVisible=true;win.clearTimeout(hideTimer);if(!locked && !player.state().paused && settings.hidden)hideTimer=win.setTimeout(()=>{if(!scrubbing && settings.hidden){chromeVisible=false;applyChrome();}},3000);applyChrome();}
  function revealLock(){lockVisible=true;win.clearTimeout(lockTimer);lockTimer=win.setTimeout(()=>{lockVisible=false;applyChrome();},2500);applyChrome();}
  function setLocked(value){if(value && !inFullscreen())return;cancelGestures();locked=value;settings.hidden=true;win.clearTimeout(lockTimer);if(value)revealLock();else show();update();}
  function cancelGestures(){surface.dispatchEvent(new win.Event('pointercancel'));holdTip.hidden=true;}
  function actionClick(action,node){
    if(!player.state().ready)return;
    switch(action){
      case 'play':command(player.state().paused?'play':'pause');show();break;
      case 'mute':command('mute',!video.muted);show();break;
      case 'lock':setLocked(true);break;
      case 'settings':settings.hidden=!settings.hidden;show();break;
      case 'context':if(node.dataset.rpMode==='intro')command('seek',Math.min(90,player.state().duration));else beginNext(node);break;
      case 'next':beginNext(node);break;
      case 'fullscreen':try{const result=inFullscreen()?doc.exitFullscreen?.():root.requestFullscreen?.();if(!result && !root.requestFullscreen)report('Trình duyệt chưa hỗ trợ toàn màn hình khung.');result?.catch(()=>report('Không bật được toàn màn hình khung.'));}catch{report('Không bật được toàn màn hình khung.');}break;
    }
    update();
  }
  function finishNext(status){if(!nextPending)return;win.clearTimeout(nextTimer);nextError={node:nextPending.node,text:status==='missing'?'Chưa có tập cùng bản dịch':status==='timeout'?'Chưa nhận được phản hồi':'Không chuyển được tập'};nextPending=null;update();win.clearTimeout(errorTimer);errorTimer=win.setTimeout(()=>{nextError=null;update();},5000);}
  function beginNext(node){
    if(nextPending)return;nextError=null;settings.hidden=true;chromeVisible=true;win.clearTimeout(hideTimer);cancelGestures();
    nextPending={node,source:player.fingerprint?.(),key:context?.episodeID};update();
    nextTimer=win.setTimeout(()=>finishNext('timeout'),15000);
    const active=nextPending;
    try{const result=options.onNext?.();if(result===false || !options.onNext)finishNext('unavailable');else if(result?.then)result.then(status=>{if(disposed || nextPending!==active)return;if(status==='navigating')win.clearTimeout(nextTimer);else if(status)finishNext(status);},()=>{if(!disposed && nextPending===active)finishNext('error');});}catch{finishNext('error');}
  }
  const offGestures=installGestures(win,player,()=>{},{surface,exclusive:true,isLocked:()=>locked,
    onLockedTap:()=>{if(lockVisible){lockVisible=false;win.clearTimeout(lockTimer);applyChrome();}else revealLock();},
    onTap:()=>{if(chromeVisible){chromeVisible=false;settings.hidden=true;win.clearTimeout(hideTimer);applyChrome();}else show();},
    onHoldChange:active=>{holdTip.hidden=!active;if(active){chromeVisible=false;applyChrome();}},
    onSeek:side=>{seekTip.style.left=side>0?'78%':'22%';seekTip.dataset.side=side>0?'right':'left';seekTip.innerHTML=side>0?'10s '+playerIcon('forward'):playerIcon('back')+' 10s';seekTip.hidden=false;win.clearTimeout(tipTimer);tipTimer=win.setTimeout(()=>seekTip.hidden=true,700);},
  });
  const block=event=>event.stopPropagation();
  const inputEvents=['pointerdown','pointermove','pointerup','touchstart','touchmove','touchend','touchcancel','mousedown','mouseup','click','dblclick','contextmenu','keydown','keyup'];
  for(const name of inputEvents)shell.addEventListener(name,block);
  seek.addEventListener('pointerdown',()=>{scrubbing=true;win.clearTimeout(hideTimer);});
  seek.addEventListener('input',()=>{scrubbing=true;paintTime(Number(seek.value),player.state().duration);});
  seek.addEventListener('change',()=>{if(!locked)command('seek',Number(seek.value));scrubbing=false;show();update();});
  const cancelScrub=()=>{scrubbing=false;update();};seek.addEventListener('pointercancel',cancelScrub);win.addEventListener('blur',cancelScrub);
  const releaseScrub=()=>{if(scrubbing){win.clearTimeout(scrubTimer);scrubTimer=win.setTimeout(()=>{if(!disposed){scrubbing=false;update();}},0);}};win.addEventListener('pointerup',releaseScrub);
  chrome.addEventListener('pointerdown',()=>win.clearTimeout(hideTimer));
  const fsChanged=()=>{if(!inFullscreen() && locked)setLocked(false);show();update();};doc.addEventListener('fullscreenchange',fsChanged);
  const changed=()=>update();const mediaEvents=['loadedmetadata','timeupdate','play','pause','ratechange','volumechange','durationchange','emptied','loadstart'];for(const name of mediaEvents)video.addEventListener(name,changed);
  const offPlayer=player.subscribe?.(changed);
  const lockedKey=event=>{if(locked && inFullscreen() && !event.ctrlKey && !event.metaKey && !event.altKey && [' ','k','j','l','m','f','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','<','>','0','1','2','3','4','5','6','7','8','9'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();}};
  win.addEventListener('keydown',lockedKey,true);win.addEventListener('keyup',lockedKey,true);
  const nativeObserver=new win.MutationObserver(()=>{if(nativeOwned && video.controls)video.controls=false;});nativeObserver.observe(video,{attributes:true,attributeFilter:['controls']});
  function format(value){const seconds=Math.max(0,Math.floor(Number(value)||0));return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
  function paintTime(position,duration){time.textContent=format(position)+' / '+format(duration);seek.style.setProperty('--rp-played',(duration>0?100*position/duration:0)+'%');}
  function update(){
    if(disposed)return;const state=player.state(),becameReady=state.ready&&!lastReady;lastReady=state.ready;shell.hidden=!state.ready;
    if(!state.ready){cancelGestures();scrubbing=false;locked=false;settings.hidden=true;nextPending=null;nextError=null;win.clearTimeout(nextTimer);restoreNative();}
    else{nativeOwned=true;root.dataset.rpCustomControls='1';if(video.controls)video.controls=false;video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');}
    if(becameReady || lastPaused!==null && state.paused&&!lastPaused)show();lastPaused=state.paused;
    for(const node of [center,play,mute,fullscreen,settingsButton,seek,...rates.children])node.disabled=!state.ready||locked;
    for(const node of [center,play]){const kind=state.paused?'play':'pause';if(node.dataset.rpIcon!==kind){node.innerHTML=playerIcon(kind);node.dataset.rpIcon=kind;}node.setAttribute('aria-label',state.paused?'Phát':'Tạm dừng');}
    mute.innerHTML=playerIcon(video.muted?'muted':'volume');mute.setAttribute('aria-label',video.muted?'Bật tiếng':'Tắt tiếng');
    fullscreen.innerHTML=playerIcon(inFullscreen()?'shrink':'fullscreen');fullscreen.setAttribute('aria-label',inFullscreen()?'Thu nhỏ':'Toàn màn hình');
    lock.innerHTML=playerIcon(locked?'lock':'unlock');lock.setAttribute('aria-label',locked?'Mở khóa màn hình':'Khóa màn hình');
    if(!scrubbing){seek.max=String(Math.max(1,state.duration));seek.value=String(state.time);paintTime(state.time,state.duration);}
    for(const node of rates.children)node.setAttribute('aria-pressed',String(Number(node.dataset.rpRate)===state.rate));
    const intro=state.time<85 && state.duration>=600,nearEnd=state.duration-state.time<=180;
    contextAction.dataset.rpMode=(nextPending?.node===contextAction || nextError?.node===contextAction)?'next':intro?'intro':'next';
    contextAction.hidden=(!intro && !context) || !(intro || nearEnd || nextPending?.node===contextAction || nextError?.node===contextAction);
    line.dataset.rpNextStatus=String(nextPending?.node===next || nextError?.node===next);
    for(const node of [contextAction,next]){
      node.dataset.rpStatus=String(nextPending?.node===node || nextError?.node===node);
      node.disabled=!state.ready||locked||(!context && !(node===contextAction && intro))||!!nextPending;node.setAttribute('aria-busy',String(nextPending?.node===node));
      if(nextPending?.node===node)node.textContent='Đang chuyển tập…';else if(nextError?.node===node)node.textContent=nextError.text;
      else if(node===contextAction)node.innerHTML=(intro?'Bỏ qua giới thiệu':'Tập tiếp theo')+' '+playerIcon(intro?'forward':'next');else node.innerHTML=playerIcon('next');
    }
    applyChrome();
  }
  if(win.getComputedStyle(root).position==='static'){root.style.position='relative';positioned=true;}
  root.append(shell);update();
  return {shell,surface,update,setContext(value){const key=c=>c ? [c.url,c.episodeID,c.lane,c.server].join('|') : '';const oldKey=key(context);context=value;if(oldKey && oldKey!==key(value)){nextPending=null;nextError=null;win.clearTimeout(nextTimer);setLocked(false);}update();},
    requestResult(status){if(status!=='navigating')finishNext(status);},
    dispose(){if(disposed)return;disposed=true;offGestures();offPlayer?.();nativeObserver.disconnect();for(const timer of [hideTimer,lockTimer,tipTimer,errorTimer,nextTimer,scrubTimer])win.clearTimeout(timer);for(const name of mediaEvents)video.removeEventListener(name,changed);for(const name of inputEvents)shell.removeEventListener(name,block);doc.removeEventListener('fullscreenchange',fsChanged);win.removeEventListener('blur',cancelScrub);win.removeEventListener('pointerup',releaseScrub);win.removeEventListener('keydown',lockedKey,true);win.removeEventListener('keyup',lockedKey,true);restoreNative();if(positioned)root.style.position=originalPosition;shell.remove();},
  };
}


// ---- source/rophim-gestures.js ----

function startGestures(win,page) {
  let mounted=null,site=null,context=null,bridge=null;
  const unbind=()=>{mounted?.ui.dispose();mounted=null;};
  const next=async(action,request)=>{
    if(!site || !context)return 'unavailable';
    const selectedSite=site,selectedContext=context,expected=contextKey(context),frame=site.frame,src=frame?.src,href=win.location.href;
    try {
      const url=await nextRoute(selectedSite,selectedContext,win);
      if(!request?.isCurrent() || win.location.href!==href || expected!==contextKey(context) || site?.frame!==frame || frame?.src!==src || !frame?.isConnected)return 'unavailable';
      if(!url)return 'missing';
      if(selectedSite.kind==='legacy-panels'){
        win.document.cookie=`selectedServerRophim=${encodeURIComponent(selectedContext.server)}; path=/; SameSite=Lax`;
        win.document.cookie=`selectedVidTypeRophim=${selectedContext.lane}; path=/; SameSite=Lax`;
      }
      win.location.assign(url);return 'navigating';
    }catch{return 'error';}
  };
  bridge=createBridge(win,page,'gestures',{
    update(info){
      site=info.site;context=info.context;
      // The active frame owns UI; the parent only routes validated requests.
      if(win.parent===win)return;
      if(info.player!==mounted?.player){
        unbind();
        if(info.player)mounted={player:info.player,ui:customPlayerControls(win,info.player,{onNext:()=>bridge?.request('next') ?? false})};
      }
      mounted?.ui.setContext(context);
    },
    unbind,request:next,
  });
  win.addEventListener('pagehide',event=>{if(!event.persisted){bridge.dispose();unbind();}});
}
startGestures(window, typeof unsafeWindow==='undefined' ? window : unsafeWindow);

})();
