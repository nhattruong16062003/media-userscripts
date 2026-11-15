// ==UserScript==
// @name         Motchill - mở bản trực tiếp
// @namespace    motchill-source
// @version      6.0.9
// @author       zic
// @homepageURL  https://github.com/nhattruong16062003/media-userscripts/tree/main/motchill
// @updateURL    https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/refs/heads/main/motchill/source/motchill-source.user.js
// @downloadURL  https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/refs/heads/main/motchill/source/motchill-source.user.js
// @description  Tìm trang Motchill gốc trong iframe và chỉ hiện nút mở khi nguồn tương thích đã được xác minh.
// @match        https://embed1.streamc.xyz/embed.php*
// @match        https://embed12.streamc.xyz/embed.php*
// @match        https://embed2.streamc.xyz/embed.php*
// @match        https://embed11.streamc.xyz/embed.php*
// @match        https://v8.streamvsmov.com/video/*
// @match        https://v9.streamvsmov.com/video/*
// @include      /^https?:\/\/[^\/?#]*motchill[^\/?#]*\//
// @match        https://api.clubc.live/embed/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  var MediaSiteOwner = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // shared/bridge/ownership.js
  var ownership_exports = {};
  __export(ownership_exports, {
    runFamily: () => runFamily
  });
  function runFamily(win, { family, feature, isSiteURL, isFrameURL, isFrameOrigin = () => false }, start) {
    const tag = "media-userscripts-owner-v1", doc = win.document;
    let active = false, disposed = false, timer = 0;
    const challenge = Array.from(win.crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(16).padStart(8, "0")).join("");
    const allowed = (value) => {
      try {
        return !!(isSiteURL(value) || isFrameURL(value));
      } catch {
        return false;
      }
    };
    const parentOrigin = (() => {
      try {
        return doc.referrer ? new URL(doc.referrer).origin : null;
      } catch {
        return null;
      }
    })();
    const ask = () => {
      if (!active && !disposed) win.parent.postMessage({ tag, type: "ready", family, feature, challenge }, parentOrigin || "*");
    };
    const activate = () => {
      if (active || disposed) return;
      active = true;
      win.clearInterval(timer);
      for (const frame of doc.querySelectorAll("iframe[src]")) if (allowed(frame.src)) frame.contentWindow?.postMessage({ tag, type: "probe", family, feature }, new URL(frame.src).origin);
      start();
    };
    const receive = (event) => {
      const data = event.data;
      if (disposed || data?.tag !== tag || data.family !== family || data.feature !== feature) return;
      const fromParent = win.parent !== win && event.source === win.parent && (isSiteURL(event.origin) || isFrameOrigin(event.origin)) && (!parentOrigin || parentOrigin === event.origin);
      if (data.type === "probe" && !active && fromParent) {
        ask();
        return;
      }
      if (typeof data.challenge !== "string" || !/^[a-f0-9]{32}$/.test(data.challenge)) return;
      if (data.type === "ready" && active) {
        const frame = [...doc.querySelectorAll("iframe[src]")].find((node) => node.isConnected && node.contentWindow === event.source);
        if (!frame || !allowed(frame.src)) return;
        let origin;
        try {
          origin = new URL(frame.src).origin;
        } catch {
          return;
        }
        if (event.origin !== origin) return;
        frame.contentWindow.postMessage({ tag, type: "owner", family, feature, challenge: data.challenge }, origin);
        return;
      }
      if (data.type === "owner" && !active && data.challenge === challenge && fromParent) activate();
    };
    win.addEventListener("message", receive);
    if (isSiteURL(win.location.href)) activate();
    else if (win.parent !== win && isFrameURL(win.location.href)) {
      timer = win.setInterval(ask, 1e3);
      ask();
    }
    const dispose = () => {
      disposed = true;
      win.clearInterval(timer);
      win.removeEventListener("message", receive);
      win.removeEventListener("pagehide", hide);
    };
    const hide = (event) => {
      if (!event.persisted) dispose();
    };
    win.addEventListener("pagehide", hide);
    return { get active() {
      return active;
    }, dispose };
  }
  return __toCommonJS(ownership_exports);
})();
// BEGIN MOTCHILL SITES (generated)
// ---- lib/sites.js ----
// Site permissions and source-contract dispatcher. Root scripts/build.mjs embeds this in four Motchill userscripts.
// Không sửa các bản sao giữa BEGIN/END MOTCHILL SITES trong file cài đặt.
function createMotchillSites() {
  const families = Object.freeze({
    CLASSIC: 'ophim-classic', OPHIM: 'ophim', NEXT: 'nextjs', NEXT_REVIVE: 'next-revive',
    APIPHIM: 'apiphim', DOO: 'dooplay', MYUI: 'myui', WRAPPER: 'iframe-wrapper', UNKNOWN: 'unknown',
  });
  // Phạm vi player iframe đã khảo sát, KHÔNG phải bảng domain -> version.
  // Website đổi domain vẫn được detect() bằng DOM/asset; host player mới cần xác minh.
  // VIP3 live evidence: motchillcu.mx → https://v8.streamvsmov.com/video/dab93816-bb48-4c62-891a-ad946b509ae5 (JWPlayer, 2026-11-13).
  // motchillf.im sv-1/sv-2 (2026-11-13) declares the exact NC embed.php hosts
  // below; NC currently returns a Cloudflare challenge. VSM v9 was HTTP200,
  // with the same JW player/origin.js schema as the verified v8 player.
  // Tập 35 sv-1 do người dùng cung cấp (2026-11-14) khai báo embed11.
  // Quyền origin riêng; không coi hostname là bằng chứng về engine bên trong.
  const embedHosts = new Set(['api.clubc.live', 'fcloud.live', 'player.phimapi.com', 'maztoycdn.xyz', 'player.cbplay.cc', 'cdn.loadvid.com', 'embed13.streamc.xyz', 'embed1.streamc.xyz', 'embed12.streamc.xyz', 'embed2.streamc.xyz', 'embed11.streamc.xyz', 'v8.streamvsmov.com', 'v9.streamvsmov.com']);
  const ROLE_ATTR = 'data-mc-role';
  const ROLES = Object.freeze({ CURRENT: 'current', PREPARED: 'prepared' });
  // Giới hạn website/iframe được trao đổi dữ liệu; không dùng để chọn family.
  const isMotchill = (host) => /(^|\.)[^.]*motchill[^.]*\./i.test(host);
  const text = (node) => node ? node.textContent.trim() : '';
  const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const translationKey = (value) => {
    const languages = [...new Set((normalize(value).match(/thuyet-minh|long-tieng|vietsub|phu-de/g) || []).map(key=>key==='phu-de'?'vietsub':key))];
    return languages.length === 1 ? languages[0] : '';
  };
  const cleanOriginal = (value) => String(value || '').replace(/\s+/g, ' ').replace(/\s*\(\s*(?:19|20)\d{2}\s*\)\s*$/, '').trim();
  const extractTitleYear = (...values) => {
    for (const v of values) {
      const m = String(v || '').match(/\(\s*(19\d{2}|20\d{2})\s*\)/);
      if (m) return m[1];
    }
    return '';
  };
  const extractSeason = (...values) => {
    const joined = normalize(values.filter(Boolean).join(' '));
    return joined.match(/(?:phan|season|part)-(\d+)/)?.[1] || '';
  };
  function isPrepared(el) {
    if (!el) return false;
    if (el.state?.prepared || el.state?.role === ROLES.PREPARED) return true;
    const node = el.frame || el;
    return !!(typeof node.closest === 'function' && node.closest(`[${ROLE_ATTR}="${ROLES.PREPARED}"]`));
  }
  function url(value, base = location.href) {
    if (value == null || String(value).trim() === '') return null;
    try { const result = new URL(value, base); return /^https?:$/.test(result.protocol) ? result : null; }
    catch (e) { return null; }
  }
  let authorizedParentOrigin = '';
  const trustedParent = (value) => {
    const parsed = url(value);
    return parsed && !parsed.username && !parsed.password
      && (isMotchill(parsed.hostname) || embedHosts.has(parsed.hostname)) ? parsed.origin : '';
  };
  // Live NEXT chain: fcloud.live/cinema/... -> player.phimapi.com/player/...
  // sets referrerpolicy="no-referrer". Only these observed player routes may
  // wait for parent authorization; a top-level external player stays disabled.
  function knownEmbedPage(value = location.href) {
    const parsed = url(value);
    if (!parsed || parsed.username || parsed.password) return false;
    const paths = {
      'fcloud.live': /^\/cinema\//, 'player.phimapi.com': /^\/player\/?$/,
      'maztoycdn.xyz': /^\/watch\//, 'player.cbplay.cc': /^\/embed\//,
      'cdn.loadvid.com': /^\/videos\/play\//, 'embed13.streamc.xyz': /^\/.+/,
      'embed1.streamc.xyz': /^\/embed\.php$/, 'embed12.streamc.xyz': /^\/embed\.php$/, 'embed2.streamc.xyz': /^\/embed\.php$/,
      'embed11.streamc.xyz': /^\/embed\.php$/,
      'v8.streamvsmov.com': /^\/video\//, 'v9.streamvsmov.com': /^\/video\//,
      'api.clubc.live': /^\/embed\/[1-9]\d*\/?$/,
    };
    return !!paths[parsed.hostname]?.test(parsed.pathname);
  }
  function mediaSourceMatches(actual, expected) {
    const source = url(actual), target = url(expected);
    if (!source || !target || source.username || source.password || target.username || target.password) return false;
    if (source.href === target.href) return true;
    // Captured fcloud -> phimapi wrapper declares the exact m3u8 in one `url`
    // parameter while JW exposes a blob currentSrc. No generic query decoding,
    // substring checks, repeated params or unrelated player hosts are evidence.
    if (source.origin !== 'https://player.phimapi.com' || !/^\/player\/?$/.test(source.pathname)
      || source.searchParams.getAll('url').length !== 1) return false;
    const declared = url(source.searchParams.get('url'));
    return !!declared && !declared.username && !declared.password && declared.href === target.href;
  }
  function parentOrigin() { return authorizedParentOrigin || trustedParent(document.referrer); }
  function allowedContext() {
    if (isMotchill(location.hostname)) return true;
    return window.top !== window && embedHosts.has(location.hostname) && !!parentOrigin();
  }
  function runWhenAllowed(start) {
    const tag = 'motchill-context-v1';
    let started = false, pending = '', retry = null;
    const begin = () => {
      if (started) return;
      started = true; clearInterval(retry); pending = '';
      start();
    };
    // This responder is dormant until this very document has been authorized.
    // An arbitrary window or a changed/non-player iframe cannot authorize a child.
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || data.tag !== tag || typeof data.token !== 'string' || !/^[a-f0-9-]{16,100}$/.test(data.token)) return;
      if (data.type === 'ready' && allowedContext()) {
        const frame = [...document.querySelectorAll('iframe[src]')].find((node) => node.contentWindow === event.source);
        const target = frame && url(frame.getAttribute('src'));
        if (!frame?.isConnected || !target || !knownEmbedPage(target.href) || target.origin !== event.origin) return;
        frame.contentWindow.postMessage({ tag, type: 'hello', token: data.token }, target.origin);
      } else if (data.type === 'hello' && !started && pending && data.token === pending
        && window.top !== window && event.source === window.parent && !document.referrer
        && knownEmbedPage() && trustedParent(event.origin)) {
        authorizedParentOrigin = event.origin;
        begin();
      }
    });
    if (allowedContext()) { begin(); return; }
    if (window.top === window || document.referrer || !knownEmbedPage()) return;
    pending = Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) => n.toString(16)).join('-');
    const ask = () => window.parent.postMessage({ tag, type: 'ready', token: pending }, '*');
    retry = setInterval(ask, 1000); ask();
  }
  function detect(doc = document, pageUrl = location.href) {
    const path = url(pageUrl)?.pathname || '';
    // Chỉ đọc pathname của asset: host có thể đổi hoặc chuyển sang CDN.
    // Host/query chứa tên framework không phải bằng chứng source.
    const sources = [...doc.querySelectorAll('script[src],link[href]')]
      .map((el) => url(el.getAttribute('src') || el.getAttribute('href'), pageUrl)?.pathname || '').join('\n');
    const episodeLinks = [...doc.querySelectorAll('.list-episode a[href]')]
      .map((el) => url(el.getAttribute('href'), pageUrl)?.pathname || '');
    // Dẫn chứng live 2026-11-12: https://motchill.garden/intro/quan-an-dem-nhung-cau-chuyen-o-tokyo-phan-3/
    if (/\/plugins\/apiphim\/|\/themes\/xemphim\//.test(sources) || doc.querySelector('.apx-site-header')) return families.APIPHIM;
    // Dẫn chứng live: https://motchillkd.net/phim-le/allen/ (theme motchill2, DooPlay).
    if (/\/themes\/motchill2\//.test(sources) || doc.querySelector('.dooplay_player,#dooplay_player_response')) return families.DOO;
    // Dẫn chứng live: https://motchillv.fun/phim/thuong-cong-chua/tap-1 (Yii + MyUI).
    if (/\/themes\/motchill\/.*yii\.js/.test(sources) || doc.querySelector('.myui-header__top')) return families.MYUI;
    // Dẫn chứng live: https://motchille.com.mx/phim/thuong-cong-chua-1792794601/k-tap-01
    // Domain cũ trong README: https://motchilln.fm/, https://motchillt.app/ (hiện lỗi DNS).
    const nextRuntime = /\/_next\//.test(sources) || !!doc.querySelector('#__NEXT_DATA__');
    // https://motchill68.tv/ + /xem-phim/thuong-cong-chua?tap=1 (2026-11-13).
    // Durable application shell; the same framework has a different episode schema/route.
    if (nextRuntime && doc.querySelector('#site-root.site-with-catfish')) return families.NEXT_REVIVE;
    // Next.js dùng cho nhiều website. Kết hợp runtime với nhận dạng ứng dụng,
    // layout phim hoặc schema RSC mà adapter thực sự đọc; không dùng domain.
    const nextApp = [...doc.querySelectorAll('meta[name="application-name"],meta[property="og:site_name"]')]
      .some((el) => normalize(el.getAttribute('content')) === 'motchill');
    const nextLayout = doc.querySelector('main#main-content') && [...doc.querySelectorAll('a[href]')]
      .some((el) => /^\/phim\/[^/]+(?:\/[^/]+)?\/?$/.test(url(el.getAttribute('href'), pageUrl)?.pathname || ''));
    if (nextRuntime && (nextApp || nextLayout || nextData(doc, pageUrl)
      .some((data) => data.movie?.slug && (Array.isArray(data.episodeVariants) || Array.isArray(data.serverEpisodes))))) return families.NEXT;
    // Dẫn chứng lưu trong source/README: https://motchillsa.com/xem-phim/thuong-cong-chua/tap-01-sv-0/
    // Domain đã ngừng DNS khi khảo sát 2026-11-12; giữ adapter hồi quy, không ghi là test live.
    if (/^\/xem-phim\/[^/]+\/[^/]+\/?$/.test(path)
      && episodeLinks.some((entry) => /^\/xem-phim\/[^/]+\/[^/]+\/?$/.test(entry))) return families.CLASSIC;
    // Dẫn chứng live: https://motchillcu.mx/phim/thuong-cong-chua/tap-1-sv-0
    // Cùng source: https://motchillt.si/ (đã đọc HTML, không suy ra bằng tên miền).
    if (/\/themes\/ophim-theme-motchill[^/]*\//.test(sources)
      || (doc.querySelector('.tip-change-server,.server-episode-block,.phoneContent')
        && episodeLinks.some((entry) => /^\/phim\/[^/]+\/[^/]+\/?$/.test(entry)))) return families.OPHIM;
    // Wrapper là kiểu nhúng, không phải một framework. Chỉ nhận iframe trang Motchill,
    // không coi iframe quảng cáo/YouTube/trình phát m3u8 là bản web gốc.
    if ([...doc.querySelectorAll('iframe[src]')].some((el) => {
      const target = url(el.getAttribute('src'), pageUrl);
      return target && isMotchill(target.hostname) && /\/(?:xem-phim|phim|play)\//.test(target.pathname);
    })) return families.WRAPPER;
    return families.UNKNOWN;
  }
  function adapter(family, doc = document, pageUrl = location.href) {
    const resolved = family || detect(doc, pageUrl);
    switch (resolved) {
      // Mỗi case có URL dẫn chứng ở detector phía trên; thêm family mới tại đây.
      case families.CLASSIC: return ophimAdapter(resolved, doc, pageUrl); // motchillsa.com (source cũ)
      case families.OPHIM: return ophimAdapter(resolved, doc, pageUrl); // motchillcu.mx, motchillt.si
      case families.NEXT: return nextAdapter(doc, pageUrl); // motchille.com.mx
      case families.NEXT_REVIVE: return reviveAdapter(doc, pageUrl); // motchill68.tv; route/schema, never hostname
      case families.APIPHIM: return apiPhimAdapter(doc, pageUrl); // motchill.garden
      case families.DOO: return dooAdapter(doc, pageUrl); // motchillkd.net
      case families.MYUI: return myuiAdapter(doc, pageUrl); // motchillv.fun
      case families.WRAPPER: return baseAdapter(resolved, [{ selector: 'main', position: 'prepend' }, { selector: 'body', position: 'prepend' }], '', doc, pageUrl); // iframe Motchill được xác minh
      default: return baseAdapter(families.UNKNOWN, [{ selector: 'main', position: 'prepend' }, { selector: 'body', position: 'prepend' }], '', doc, pageUrl); // Không đoán source chưa biết
    }
  }
  function baseAdapter(id, homeSteps, episodes, doc = document, pageUrl = location.href) {
    const home = homeSteps.map((s) => s.selector).join(',');
    return { id, home, homeSteps, episodes, gestures: false, seamlessNext: false,
      read: (d = doc, u = pageUrl) => readPage(id, episodes, d, u),
      detail: (d = doc, u = pageUrl) => readDetail(id, episodes, d, u),
      catalog: (d = doc, u = pageUrl) => readCatalog(id, d, u),
      video: (d = doc) => findVideo(d),
      frames: (d = doc, u = pageUrl) => playerFrames(d, u),
    };
  }
/* adapter:ophim.js */
  function ophimAdapter(id, doc, pageUrl) {
    return { ...baseAdapter(id, [
      { selector: '.list-films', position: 'before' },
      { selector: '.film-moi', position: 'before' },
      { selector: '#content', position: 'prepend' },
      { selector: 'main', position: 'prepend' },
      { selector: 'body', position: 'prepend' },
    ], '.list-episode a[href]', doc, pageUrl),
      gestures: true, seamlessNext: id === families.CLASSIC,
    };
  }


/* adapter:nextjs.js */
  function nextAdapter(doc, pageUrl) {
    // Khảo sát next-home-current.html: header fixed top-0 z-50; nội dung nằm trong main#main-content > div.pt-11 > .container.
    return baseAdapter(families.NEXT, [
      { selector: 'main#main-content > div > .container', position: 'prepend' },
      { selector: 'main#main-content > div[class*="pt-"]', position: 'prepend' },
      { selector: 'main#main-content', position: 'prepend' },
      { selector: 'main', position: 'prepend' },
      { selector: 'body', position: 'prepend' },
    ], 'a[href*="/phim/"]', doc, pageUrl);
  }
  function nextData(doc = document, pageUrl = location.href) {
    const scripts = [...doc.querySelectorAll('script')].filter((s) => s.textContent.trim().startsWith('self.__next_f.push('));
    const parsedPage = url(pageUrl);
    const path = parsedPage ? parsedPage.pathname + parsedPage.search : '';
    const cacheKey = path + ':' + scripts.length + ':' + (scripts.at(-1)?.textContent.length || 0);
    const cached = flightCache.get(doc);
    if (cached?.key === cacheKey) return cached.pages;
    const pages = [], rows=new Map();
    let stream='';
    for (const script of scripts) {
      try {
        const arg = script.textContent.trim().slice('self.__next_f.push('.length).replace(/\);?\s*$/, '');
        const chunk = JSON.parse(arg)[1];
        if (typeof chunk !== 'string') continue;
        stream+=chunk;
      } catch (e) { /* script khác */ }
    }
    for (const line of stream.split('\n')) {
          const index = line.indexOf(':');
          if (index < 0) continue;
          const id=line.slice(0,index);
          if(!/^[a-f\d]+$/i.test(id))continue;
          try{rows.set(id,JSON.parse(line.slice(index+1)));}catch{/* non-JSON Flight record */}
    }
    // Flight references are data paths, never JavaScript. Resolve only existing
    // own properties, with cycle/depth and work bounds for malformed streams.
    let budget=100000;
    const resolve=(value,depth=0,chain=new Set())=>{
      if(depth>60 || --budget<0)return null;
      if(typeof value==='string' && /^\$[a-f\d]+(?::[^:]+)*$/i.test(value)){
        if(chain.has(value))return null;
        const [id,...path]=value.slice(1).split(':');let target=rows.get(id);
        for(const key of path){
          if(key==='props' && Array.isArray(target) && target[0]==='$' && target.length===4){target=target[3];continue;}
          if(['__proto__','prototype','constructor'].includes(key) || target==null || !Object.hasOwn(target,key))return null;target=target[key];
        }
        if(target===undefined)return value;
        return resolve(target,depth+1,new Set([...chain,value]));
      }
      if(Array.isArray(value))return value.map(item=>resolve(item,depth+1,chain));
      if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,resolve(item,depth+1,chain)]));
      return value;
    };
    for(const raw of rows.values()){
          try {
            const value = resolve(raw);
            const visit = (v, depth = 0) => {
              if (!v || typeof v !== 'object' || depth > 40) return;
              if (v.movie && typeof v.movie === 'object' && v.movie.slug
                || typeof v.movieSlug === 'string' && Array.isArray(v.episodes)
                || typeof v.slug === 'string' && (Array.isArray(v.episodes) || v.initialDigits != null && v.name)) pages.push(v);
              Object.values(v).forEach((x) => visit(x, depth + 1));
            };
            visit(value);
          } catch (e) { /* chunk text hoặc tham chiếu RSC */ }
    }
    flightCache.set(doc, { key: cacheKey, pages });
    return pages;
  }
  function nextProviderState(doc=document,pageUrl=doc.URL || location.href){
    const parsed=route(pageUrl,families.NEXT),data=parsed && nextData(doc,pageUrl).find(entry=>entry.movie?.slug===parsed.slug);
    if(!Array.isArray(data?.movie?.episodes) || !data.movie.episodes.length)return null;
    const frames=[...doc.querySelectorAll('.player-frame-stable iframe.player-frame-content')].filter(frame=>!isPrepared(frame));
    if(frames.length!==1)return null;
    const frame=frames[0],source=url(frame.getAttribute('src'),pageUrl),id=source?.pathname.match(/^\/embed\/([1-9]\d*)\/?$/)?.[1];
    if(!id || !knownEmbedPage(source.href))return null;
    const matches=data.movie.episodes.filter(ep=>ep && String(ep.id)===id && ep.slug===parsed.episode && ep.type==='m3u8');
    if(matches.length!==1 || !translationKey(matches[0].server))return null;
    return {frame,data,episode:matches[0],source};
  }
  function nextProviderButtons(doc=document,pageUrl=doc.URL || location.href){
    const state=nextProviderState(doc,pageUrl);if(!state)return [];
    const labels=new Set(state.data.movie.episodes.filter(ep=>ep && ep.slug===state.episode.slug && ep.type==='m3u8').map(ep=>ep.server));
    return [...doc.querySelectorAll('button')].filter(node=>!node.closest('.mc-translations,[data-rp-ui]') && labels.has(node.dataset.mcNativeLabel || text(node)));
  }


/* adapter:next-revive.js */
  function reviveAdapter(doc, pageUrl) {
    return { ...baseAdapter(families.NEXT_REVIVE, [
      { selector: 'main#main-content .site-main-rails__center', position: 'prepend' },
      { selector: 'main#main-content', position: 'prepend' },
      { selector: 'main', position: 'prepend' },
    ], 'a[href*="/xem-phim/"]', doc, pageUrl),
    read: (d = doc, u = pageUrl) => readRevivePage(d, u),
    detail: (d = doc, u = pageUrl) => readReviveDetail(d, u) };
  }
  function reviveServerNodes(doc = document) {
    const mirror = doc.querySelector('[data-mc-server-container="next-revive"]');
    if (mirror) return [...mirror.querySelectorAll('[data-mc-server-key]')];
    const heading = [...doc.querySelectorAll('p')].find((node) => normalize(text(node)) === 'chon-server');
    return heading ? [...heading.parentElement.querySelectorAll(':scope > div > button')] : [];
  }
  function reviveData(doc = document, pageUrl = location.href) {
    const target = url(pageUrl);
    const match = target?.pathname.match(/^\/(?:phim|xem-phim)\/([^/]+)\/?$/);
    if (!match) return null;
    const slug = decodeURIComponent(match[1]);
    const data = nextData(doc, pageUrl).filter((entry) => entry.slug === slug);
    const identity = data.find((entry) => entry.name && entry.initialDigits != null) || {};
    const episodes = data.find((entry) => Array.isArray(entry.episodes)) || {};
    return { ...identity, ...episodes, slug, episodes: (episodes.episodes || []).filter((ep) => ep && typeof ep.slug === 'string' && typeof ep.server === 'string' && url(ep.link, pageUrl)) };
  }
  function reviveNumber(ep) {
    // /xem-phim/su-thi-odyssey: initialDigits=1 and series=true even though
    // every actual entry is tap-full-* / label Full. Trust the entry schema.
    if (reviveFull(ep)) return 1;
    const label = normalize(ep?.label);
    return Number(label.match(/^(?:tap-)?0*(\d+)$/)?.[1] || normalize(ep?.slug).match(/^tap-0*(\d+)(?:-|$)/)?.[1]) || 0;
  }
  function reviveFull(ep) {
    return normalize(ep?.label) === 'full' || /^tap-full(?:-|$)/.test(normalize(ep?.slug));
  }
  function reviveSelected(node) {
    return node.getAttribute('aria-pressed') === 'true' || node.getAttribute('aria-selected') === 'true'
      || node.classList.contains('text-[#39FF89]') || node.classList.contains('shadow-[0_0_8px_0_rgba(108,254,0,1)]');
  }
  function reviveLanguage(doc, data, number, pageUrl) {
    const chosen = reviveServerNodes(doc).filter(reviveSelected);
    if (chosen.length === 1) return translationKey(text(chosen[0]));
    const frames = playerFrames(doc, pageUrl);
    const exact = data.episodes.filter((ep) => reviveNumber(ep) === number && frames.some((frame) => url(frame.getAttribute('src'), pageUrl)?.href === url(ep.link, pageUrl)?.href));
    const matched = [...new Set(exact.map((ep) => translationKey(ep.server)).filter(Boolean))];
    if (matched.length === 1) return matched[0];
    // initialLane conflates Lồng Tiếng and Thuyết Minh in the observed source.
    const initial = data.episodes.filter((ep) => reviveNumber(ep) === number && ep.lane === data.initialLane);
    const initialLanguages = [...new Set(initial.map((ep) => translationKey(ep.server)).filter(Boolean))];
    return initialLanguages.length === 1 ? initialLanguages[0] : '';
  }
  function reviveMeta(doc, pageUrl, data) {
    const parsed = route(pageUrl, families.NEXT_REVIVE) || detailRoute(pageUrl, families.NEXT_REVIVE);
    if (!parsed) return null;
    const meta = extractMeta(families.NEXT_REVIVE, parsed.slug, doc, pageUrl);
    return { ...meta, slug: parsed.slug, film: filmSlug(parsed.slug), family: families.NEXT_REVIVE,
      title: data.name || data.movieTitle || meta.title,
      originalTitle: cleanOriginal(data.origin || meta.originalTitle),
      year: String(data.year || meta.year || extractTitleYear(text(doc.querySelector('h1')), doc.title) || ''),
      poster: data.posterSrc || meta.poster,
    };
  }
  function reviveEpisodeUrl(pageUrl, slug, number) {
    const target = new URL('/xem-phim/' + encodeURIComponent(slug), url(pageUrl).origin);
    target.searchParams.set('tap', String(number));
    return target.href;
  }
  function readRevivePage(doc = document, pageUrl = location.href) {
    const parsed = route(pageUrl, families.NEXT_REVIVE);
    if (!parsed) return null;
    const data = reviveData(doc, pageUrl);
    const meta = reviveMeta(doc, pageUrl, data);
    const number = Number(parsed.episode.slice(4));
    const language = reviveLanguage(doc, data, number, pageUrl);
    const current = data.episodes.find((ep) => reviveNumber(ep) === number && (!language || translationKey(ep.server) === language));
    const full = reviveFull(current);
    const next = !full && language && data.episodes.find((ep) => !reviveFull(ep) && reviveNumber(ep) === number + 1 && translationKey(ep.server) === language);
    // A query may update before new RSC hydration. Do not assign old playback
    // metadata to a new query while the initial props still name another episode.
    const initial = Number(data.initialDigits);
    const selectedEpisode = [...doc.querySelectorAll('a[aria-current="page"],button[aria-current="page"]')].find((el) => /^\d+$/.test(text(el)));
    const visibleNumber = selectedEpisode ? Number(text(selectedEpisode)) : initial;
    if (visibleNumber && visibleNumber !== number && !playerFrames(doc, pageUrl).some((frame) => data.episodes.some((ep) => reviveNumber(ep) === number && url(ep.link, pageUrl)?.href === url(frame.getAttribute('src'), pageUrl)?.href))) return null;
    return { ...meta, ...parsed, episodeKey: full ? 'full' : 'ep:' + number, episode: current?.label || 'Tập ' + number, language,
      url: url(pageUrl).href, next: next ? { url: reviveEpisodeUrl(pageUrl, parsed.slug, number + 1),
        path: '/xem-phim/' + encodeURIComponent(parsed.slug) + '?tap=' + (number + 1), episode: next.label, episodeKey: 'ep:' + (number + 1), language } : null };
  }
  function readReviveDetail(doc = document, pageUrl = location.href) {
    const data = reviveData(doc, pageUrl);
    if (!data) return null;
    const meta = reviveMeta(doc, pageUrl, data);
    if (!meta) return null;
    const episodes = [];
    const seen = new Set();
    for (const entry of data.episodes) {
      const number = reviveNumber(entry), language = translationKey(entry.server), full = reviveFull(entry);
      const slot = number + '|' + language;
      if (!number || !language || seen.has(slot)) continue;
      seen.add(slot);
      const target = full ? new URL('/xem-phim/' + encodeURIComponent(data.slug), url(pageUrl).origin).href : reviveEpisodeUrl(pageUrl, data.slug, number);
      episodes.push({ url: target, path: new URL(target).pathname + new URL(target).search, episode: entry.label,
        episodeKey: full ? 'full' : 'ep:' + number, language });
    }
    if (!episodes.length) for (const link of doc.querySelectorAll('a[href*="/xem-phim/"]')) {
      const target = url(link.getAttribute('href'), pageUrl);
      const watch = target && route(target.href, families.NEXT_REVIVE);
      if (target?.origin !== url(pageUrl).origin || watch?.slug !== data.slug) continue;
      episodes.push({ url: target.href, path: watch.path, episode: watch.episode, episodeKey: episodeKey(watch.episode), language: '' });
      break;
    }
    return { ...meta, url: url(pageUrl).href, path: url(pageUrl).pathname, isWatch: !!route(pageUrl, families.NEXT_REVIVE), episodes };
  }


/* adapter:apiphim.js */
  function apiPhimAdapter(doc, pageUrl) {
    return baseAdapter(families.APIPHIM, [
      { selector: '.topmovie-wrapper', position: 'before' },
      { selector: '.apx-home-discovery', position: 'before' },
      { selector: '.home-sections-layout', position: 'before' },
      { selector: 'main', position: 'prepend' },
      { selector: '.apx-main', position: 'prepend' },
      { selector: 'body', position: 'prepend' },
    ], 'a[href*="/play/"]', doc, pageUrl);
  }


/* adapter:dooplay.js */
  function dooAdapter(doc, pageUrl) {
    return baseAdapter(families.DOO, [
      { selector: '#contenedor .module', position: 'before' },
      { selector: '#contenedor .content', position: 'prepend' },
      { selector: '#contenedor', position: 'prepend' },
      { selector: 'main', position: 'prepend' },
      { selector: 'body', position: 'prepend' },
    ], '.episodiotitle a[href],.episodios a[href],a[href*="/xem-phim/"]', doc, pageUrl);
  }


/* adapter:myui.js */
  function myuiAdapter(doc, pageUrl) {
    return baseAdapter(families.MYUI, [
      { selector: 'body > .container > .row', position: 'before' },
      { selector: 'body > .container', position: 'prepend' },
      { selector: '.myui-panel', position: 'before', exclude: 'header,.myui-sidebar' },
      { selector: 'main', position: 'prepend' },
      { selector: 'body', position: 'prepend' },
    ], '#servers-container .tab-pane.active a[href],.myui-content__list a[href]', doc, pageUrl);
  }


  function structured(doc = document) {
    const nodes = [];
    function collect(value) {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) return value.forEach(collect);
      nodes.push(value);
      if (value['@graph']) collect(value['@graph']);
    }
    for (const el of doc.querySelectorAll('script[type="application/ld+json"]')) {
      try { collect(JSON.parse(el.textContent)); } catch (e) { /* JSON-LD lỗi của trang */ }
    }
    return nodes;
  }
  // Đọc dữ liệu RSC đã có trong DOM, không eval mã của website và không tải API riêng.
  const flightCache = new WeakMap();

  function route(value, family, base = location.href) {
    const target = url(value, base);
    if (!target) return null;
    const resolved = family || detect();
    const path = target.pathname;
    let match;
    switch (resolved) {
      case families.NEXT_REVIVE: {
        match = path.match(/^\/xem-phim\/([^/]+)\/?$/);
        const number = target.searchParams.has('tap') ? target.searchParams.get('tap') : '1';
        if (!match || !/^\d{1,5}$/.test(number) || Number(number) < 1 || /\.trailer$/i.test(match[1])) return null;
        return { slug: decodeURIComponent(match[1]), episode: 'tap-' + Number(number), path: path + target.search };
      }
      case families.CLASSIC:
        match = path.match(/^\/xem-phim\/([^/]+)\/([^/]+)\/?$/); break;
      case families.OPHIM: case families.NEXT: case families.MYUI:
        match = path.match(/^\/phim\/([^/]+)\/([^/]+)\/?$/); break;
      case families.APIPHIM:
        match = path.match(/^\/play\/([^/]+)\/([^/]+)\/?$/); break;
      case families.DOO:
        match = path.match(/^\/(phim-le)\/([^/]+)\/?$/);
        if (match) return { slug: match[2], episode: 'full', path };
        // Live: https://motchillkd.net/xem-phim/tam-sinh-tam-the-thap-ly-dao-hoa-tap-1/
        match = path.match(/^\/xem-phim\/(.+)-tap-(\d+)\/?$/);
        if (match) return { slug: match[1], episode: 'tap-' + match[2], path };
        return null;
      default: return null;
    }
    return match ? { slug: match[1], episode: match[2], path } : null;
  }
  function detailRoute(value, family, base = location.href) {
    const target = url(value, base);
    if (!target) return null;
    const resolved = family || detect();
    const path = target.pathname;
    let match;
    switch (resolved) {
      case families.CLASSIC:
        match = path.match(/^\/(?:xem-phim|phim)\/([^/]+)\/?$/);
        return match ? { slug: match[1], path, isWatch: false } : null;
      case families.OPHIM: case families.NEXT: case families.NEXT_REVIVE: case families.MYUI:
        match = path.match(/^\/phim\/([^/]+)\/?$/);
        return match ? { slug: match[1], path, isWatch: false } : null;
      case families.APIPHIM:
        match = path.match(/^\/intro\/([^/]+)\/?$/);
        return match ? { slug: match[1], path, isWatch: false } : null;
      case families.DOO:
        match = path.match(/^\/phim-bo\/([^/]+)\/?$/);
        if (match) return { slug: match[1], path, isWatch: false };
        match = path.match(/^\/phim-le\/([^/]+)\/?$/);
        return match ? { slug: match[1], path, isWatch: true } : null;
      default: return null;
    }
  }
  function searchUrl(query, family, pageUrl = location.href, doc = document) {
    const q = String(query || '').trim();
    const base = url(pageUrl);
    if (!q || !base) return null;
    const d = doc || document;
    for (const form of d.querySelectorAll('form')) {
      const input = form.querySelector('input[name="s"],input[name="search"],input[name="q"],input[name="keyword"]');
      if (!input) continue;
      const action = url(form.getAttribute('action') || '/', base.href);
      if (action && action.origin === base.origin) {
        const out = new URL(action.href);
        out.searchParams.set(input.getAttribute('name'), q);
        return out.href;
      }
    }
    const resolved = family || detect(d, base.href);
    switch (resolved) {
      case families.NEXT_REVIVE: {
        const out = new URL('/tim-kiem', base.origin);
        out.searchParams.set('q', q);
        return out.href;
      }
      case families.NEXT: {
        const out = new URL('/search', base.origin);
        out.searchParams.set('q', q);
        return out.href;
      }
      case families.MYUI: {
        const out = new URL('/', base.origin);
        out.searchParams.set('search', q);
        return out.href;
      }
      case families.CLASSIC: case families.OPHIM: case families.APIPHIM: case families.DOO: {
        const out = new URL('/', base.origin);
        out.searchParams.set('s', q);
        return out.href;
      }
      default: return null;
    }
  }
  function episodeKey(value) {
    const normalized = normalize(value);
    if (/^(?:[a-z]-)?(?:full|full-hd|hoan-tat|movie)(?:-(?:sv|src)-.*)?$/.test(normalized)) return 'full';
    const match = normalized.match(/^(?:(?:[a-z]+-)?(?:tap|episode|ep)-|[a-z]-)?0*(\d+)(?:-(?:sv|src)-.*)?$/);
    return match ? 'ep:' + Number(match[1]) : 'special:' + normalized;
  }










  function filmSlug(value) {
    // Chỉ bỏ timestamp 10/13 chữ số của Next.js, không bỏ năm/số phần ở slug.
    return normalize(value).replace(/-(?:thuyet-minh|long-tieng|vietsub)$/, '').replace(/-\d{10}(?:\d{3})?$/, '');
  }
  function extractMeta(family, slug, doc = document, pageUrl = location.href) {
    const schema = structured(doc);
    const movie = schema.find((n) => ['Movie', 'TVSeries'].includes(n['@type'])) || {};
    const pages = family === families.NEXT ? nextData(doc, pageUrl) : [];
    const watchRsc = pages.find((p) => p.movie?.slug === slug);
    // Detail uses a different component: movieSlug binds its real server
    // entries to this film. Never collect recommended films' bare episodes.
    const detailRsc = pages.find((p) => p.movieSlug === slug && Array.isArray(p.episodes));
    const rsc = watchRsc || (detailRsc ? { movie: {}, serverEpisodes: detailRsc.episodes } : null);
    const data = rsc?.movie || {};
    let rawTitle = data.name || movie.name || text(doc.querySelector('h1.movie-identity__title,h1.epih1,h1.title:not(:empty),.sheader .data h1,.movie-title,.title-1,h1:not(.apiphim-ads-text):not(:empty)')) || doc.title;
    let rawOriginal = data.origin_name || movie.alternateName || text(doc.querySelector('.movie-identity__origin,h2.real-name,h2.origtitle,h2.title2,.sheader .extra .tagline')) || '';
    if (family === families.OPHIM || family === families.CLASSIC) {
      // Live motchillf.im: JSON-LD appends " Motchill" to both movie names,
      // while the actual film heading/original-name link supplies clean names.
      // Require that independent heading to corroborate the exact stripped name;
      // never remove a word merely because it appears inside a real movie title.
      const heading = doc.querySelector('h1[itemprop="name"] a[title],h1 [itemprop="name"]');
      const original = doc.querySelector('h2.real-name a[title],h2 .real-name');
      const corroborated = (value, node) => {
        const clean = String(value).replace(/\s+Motchill\s*$/i, '').trim();
        const native = node?.getAttribute('title') || text(node);
        return clean !== value && normalize(clean) === normalize(native) ? native.trim() : value;
      };
      rawTitle = corroborated(rawTitle, heading);
      rawOriginal = corroborated(rawOriginal, original);
    }
    const originalTitle = cleanOriginal(rawOriginal);
    let cleanedTitle = rawTitle.replace(/\s+/g, ' ').replace(/^(?:Xem\s+)?Phim\s+/i, '')
      .replace(/\s+(?:[-–]\s*)?(?:Tập\s+\d+|Vietsub|HD|[-|]\s*Motchill).*$/i, '')
      .replace(/\s*\(\s*(?:19|20)\d{2}\s*\)\s*$/, '').replace(/\s*[-–|]\s*$/, '').trim();
    if (originalTitle && cleanedTitle.toLowerCase().endsWith(' - ' + originalTitle.toLowerCase())) {
      cleanedTitle = cleanedTitle.slice(0, -(' - ' + originalTitle).length).trim();
    }
    // datePublished/dateCreated thường là ngày đăng bài, KHÔNG phải năm phim.
    const nextProductionYear = family === families.NEXT ? [...doc.querySelectorAll('span')].map(text)
      .find((value) => /^Năm sản xuất:\s*(?:19|20)\d{2}$/i.test(value)) : '';
    const yearText = data.publish_year || data.year || text(doc.querySelector('.origyear,.movie-year,.movie-identity__year,.apx-hero-fact--year,.publish-year,.sheader .date')) || nextProductionYear;
    const year = String(yearText || '').match(/\b(?:19|20)\d{2}\b/)?.[0] || extractTitleYear(rawTitle, rawOriginal);
    const season = extractSeason(cleanedTitle, rawOriginal, slug);
    const externalIds = {};
    const refs = [movie.sameAs, movie.identifier,
      data.tmdb?.id && `https://www.themoviedb.org/${data.tmdb.type || 'tv'}/${data.tmdb.id}`,
      data.imdb?.id && `https://www.imdb.com/title/${data.imdb.id}`,
      ...[...doc.querySelectorAll('a[href*="imdb.com/title/"],a[href*="themoviedb.org/"]')].map((a) => a.getAttribute('href')),
    ].flat();
    for (const ref of refs) {
      if (typeof ref !== 'string') continue;
      const imdb = ref.match(/imdb\.com\/title\/(tt\d+)/);
      const tmdb = ref.match(/themoviedb\.org\/(tv|movie)\/(\d+)/);
      if (imdb) externalIds.imdb = imdb[1];
      if (tmdb) externalIds.tmdb = tmdb[1] + ':' + tmdb[2];
    }
    return { rsc, data, title: cleanedTitle, originalTitle, year, season, externalIds,
      film: filmSlug(slug), poster: doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '' };
  }
  function linkLanguage(linkEl, doc, variant, data, fallbackLabel = '') {
    const tab = linkEl?.closest?.('.tab-pane');
    const tabLabel = tab?.id && [...doc.querySelectorAll('a[href]')].find((a) => a.getAttribute('href') === '#' + tab.id);
    const groupHeading = linkEl?.closest?.('.episodes')?.previousElementSibling;
    const groupLabel = groupHeading?.matches?.('.server-episode-block') ? text(groupHeading) : '';
    const apxPanel = linkEl?.closest?.('.apx-server-panel[data-apx-server-panel]');
    const apxId = apxPanel?.getAttribute('data-apx-server-panel');
    const apxBtn = apxId != null ? doc.querySelector(`[data-apx-server-button="${apxId}"]`) : null;
    const apxLabel = apxBtn?.getAttribute('data-apx-translation-kind') || apxBtn?.getAttribute('data-apx-server-label') || text(apxBtn);
    const candidates = [linkEl?.closest?.('.control-box,.tab-pane')?.getAttribute('data-server'),
      variant?.server, apxLabel, groupLabel, text(tabLabel), data?.lang, data?.language, fallbackLabel];
    return candidates.map(translationKey).find(Boolean) || '';
  }
  function translationServers(doc, family) {
    if(family===families.NEXT){
      const state=nextProviderState(doc,doc.URL);
      if(state)return nextProviderButtons(doc,doc.URL).map(node=>{
        const label=node.dataset.mcNativeLabel || text(node),matches=state.data.movie.episodes.filter(ep=>ep && ep.slug===state.episode.slug && ep.server===label && ep.type==='m3u8');
        return {node,label,language:translationKey(label),selected:label===state.episode.server,
          source:matches.length===1?new URL('/embed/'+matches[0].id,state.source).href:''};
      });
    }
    if (family === families.NEXT_REVIVE) {
      const page = url(doc.URL, location.href);
      const data = reviveData(doc, page?.href || location.href);
      const number = Number(page?.searchParams.get('tap') || data?.initialDigits || 1);
      return reviveServerNodes(doc).map((node) => {
        const label = text(node), language = translationKey(label);
        const ep = data?.episodes.find((entry) => reviveNumber(entry) === number && normalize(entry.server) === normalize(label));
        return { node, label, language, selected: reviveSelected(node), source: url(ep?.link, page?.href)?.href || '' };
      }).filter((entry) => entry.language);
    }
    let selector;
    switch (family) {
      case families.NEXT:
        selector = 'button[aria-pressed],[data-mc-server-key]'; break; // motchille.com.mx real Server K/V language row
      case families.CLASSIC: case families.OPHIM: case families.MYUI:
        selector = '.streaming-server'; break; // motchillcu.mx / motchillv.fun
      case families.APIPHIM:
        selector = '[data-apx-server-button]'; break; // motchill.garden
      case families.DOO:
        selector = '.dooplay_player_option'; break; // motchillkd.net
      default: return [];
    }
    return [...doc.querySelectorAll(selector)].filter((node) => !node.closest('.mc-translations')).map((node) => {
      const label = node.getAttribute('data-apx-translation-kind') || node.getAttribute('data-apx-server-label')
        || text(node.querySelector('.title')) || text(node);
      const language = translationKey(label);
      if (family === families.NEXT && !/^server\b/i.test(label)) return null;
      const selected = node.getAttribute('aria-selected') === 'true' || node.getAttribute('aria-pressed') === 'true'
        || ['btn-success', 'btn-active', 'active', 'is-active', 'on'].some((name) => node.classList.contains(name));
      let source = '';
      if (family === families.NEXT) {
        const pageUrl = url(doc.location?.href)?.href || location.href;
        const parsed = route(pageUrl, family);
        const data = parsed && nextData(doc, pageUrl).find((entry) => entry.movie?.slug === parsed.slug);
        const matches = [...(data?.episodeVariants || []), ...(data?.movie?.episodes || [])].filter((ep) => ep && episodeKey(ep.slug) === episodeKey(parsed?.episode)
          && normalize(ep.server) === normalize(label.replace(/^server\s+/i, '')));
        const candidates = [...new Set(matches.filter((ep) => (ep.type || 'm3u8') === 'm3u8').map((ep) => url(ep.link, pageUrl)?.href).filter(Boolean))];
        if (candidates.length === 1) source = candidates[0];
      }
      return { language, label, selected, node, source };
    }).filter((entry) => entry?.language);
  }
  function currentServerLanguage(doc, family) {
    const choices = translationServers(doc, family);
    const selected = choices.filter((entry) => entry.selected);
    return selected.length === 1 ? selected[0].language : choices.length === 1 ? choices[0].language : '';
  }
  function readPage(family, selector, doc = document, pageUrl = location.href) {
    const page = url(pageUrl);
    if (!page) return null;
    const currentRoute = route(page.href, family, page.href);
    if (!currentRoute) return null;
    const meta = extractMeta(family, currentRoute.slug, doc, page.href);
    const currentPath = page.pathname.replace(/\/$/, '');
    const allSelectorLinks = [...doc.querySelectorAll(selector || ':not(*)')];
    const current = allSelectorLinks.find((a) => url(a.getAttribute('href'), page.href)?.pathname.replace(/\/$/, '') === currentPath);
    const links = allSelectorLinks.filter((a) => {
      const target = url(a.getAttribute('href'), page.href);
      const other = target && target.origin === page.origin && route(target.href, family, page.href);
      return other && other.slug === currentRoute.slug;
    });
    const siblings = current?.closest('.list-episode,.tab-pane,.apx-episode-grid,ul,.episodios') || current?.parentElement;
    const grouped = siblings ? links.filter((a) => siblings.contains(a)) : links;
    const number = Number(episodeKey(currentRoute.episode).replace('ep:', ''));
    const next = grouped.map((a) => {
      const target = url(a.getAttribute('href'), page.href);
      return { node: a, target, parsed: target ? route(target.href, family, page.href) : null };
    }).filter((x) => x.parsed && x.target && Number(episodeKey(x.parsed.episode).replace('ep:', '')) === number + 1)[0];
    const provider=family===families.NEXT?nextProviderState(doc,page.href):null;
    const selectedLanguage = provider?translationKey(provider.episode.server):currentServerLanguage(doc, family);
    const routeVariants = meta.rsc?.episodeVariants?.filter((v) => v?.slug === currentRoute.episode) || [];
    const ambiguousLanguage = family === families.NEXT && !selectedLanguage
      && new Set(routeVariants.map((v) => translationKey(v.server)).filter(Boolean)).size > 1;
    // Several actual language variants share k-tap-01. The SSR server buttons
    // are all unselected until hydration; array order is not selection evidence.
    const variant = provider?.episode || !ambiguousLanguage && routeVariants.find((v) => v.slug === currentRoute.episode
      && (!selectedLanguage || translationKey(v.server) === selectedLanguage));
    const rscNext = (provider?.data.movie.episodes || meta.rsc?.serverEpisodes)?.find((v) => v && v.server === variant?.server && Number(episodeKey(v.slug).replace('ep:', '')) === number + 1 && (!provider || v.type==='m3u8'));
    const label = variant?.name || (current ? text(current) : currentRoute.episode);
    const language = ambiguousLanguage ? '' : selectedLanguage || linkLanguage(current, doc, variant, meta.data, label);
    return { ...currentRoute, family, title: meta.title, originalTitle: meta.originalTitle,
      year: meta.year, season: meta.season, language, server:variant?.server || '',externalIds: meta.externalIds,
      film: meta.film, episodeKey: episodeKey(currentRoute.episode), poster: meta.poster,
      episode: label, url: page.href, next: rscNext ? {
        path: '/phim/' + currentRoute.slug + '/' + rscNext.slug, episode: rscNext.name, episodeKey: episodeKey(rscNext.slug), server:rscNext.server,language,
        url: new URL('/phim/' + currentRoute.slug + '/' + rscNext.slug, page.origin).href,
      } : next ? { path: next.parsed.path, episode: text(next.node), episodeKey: episodeKey(next.parsed.episode), url: next.target.href } : null,
    };
  }
  function readDetail(family, selector, doc = document, pageUrl = location.href) {
    const page = url(pageUrl);
    if (!page) return null;
    const resolvedFamily = family || detect(doc, page.href);
    const watch = route(page.href, resolvedFamily, page.href);
    const detail = !watch && detailRoute(page.href, resolvedFamily, page.href);
    const parsed = watch || detail;
    if (!parsed) return null;
    const meta = extractMeta(resolvedFamily, parsed.slug, doc, page.href);
    const episodes = [];
    const seen = new Set();
    const pushEp = (entry) => {
      const key = `${entry.episodeKey}|${entry.language}|${entry.url}`;
      if (seen.has(key)) return;
      seen.add(key);
      episodes.push(entry);
    };
    const scanLinks = (sel) => [...doc.querySelectorAll(sel || ':not(*)')].filter((a) => {
      if (a.closest('.mh-continue')) return false;
      const target = url(a.getAttribute('href'), page.href);
      const other = target && target.origin === page.origin && route(target.href, resolvedFamily, page.href);
      return other && other.slug === parsed.slug;
    });
    // Read all language tabs of this film, not just the currently active server.
    // MyUI example: https://motchillv.fun/phim/thuong-cong-chua/tap-1
    let domLinks = scanLinks(resolvedFamily === families.MYUI
      ? '#servers-container .tab-pane a[href],.myui-content__list a[href]' : selector);
    if (!domLinks.length) domLinks = scanLinks('a[href]');
    for (const a of domLinks) {
      const target = url(a.getAttribute('href'), page.href);
      const other = route(target.href, resolvedFamily, page.href);
      const epText = text(a) || other.episode;
      pushEp({ url: target.href, path: other.path, episode: epText, episodeKey: episodeKey(other.episode),
        language: linkLanguage(a, doc, null, meta.data, epText) });
    }
    if (resolvedFamily === families.NEXT && meta.rsc) {
      for (const ep of [...(meta.rsc.episodeVariants || []), ...(meta.rsc.serverEpisodes || []),...(meta.rsc.movie?.episodes || [])]) {
        if (!ep?.slug) continue;
        const epPath = '/phim/' + parsed.slug + '/' + ep.slug;
        pushEp({ url: new URL(epPath, page.origin).href, path: epPath, episode: ep.name || ep.slug,
          episodeKey: episodeKey(ep.slug), language: linkLanguage(null, doc, ep, meta.data, ep.name || ep.slug) });
      }
    }
    if (watch) for (const entry of translationServers(doc, resolvedFamily)) {
      // Server options are bound to this loaded episode. Their labels are
      // evidence for a translation, unlike a generic film-level description.
      pushEp({ url: page.href, path: watch.path, episode: watch.episode,
        episodeKey: episodeKey(watch.episode), language: entry.language, serverLabel: entry.label });
    }
    if (watch && !episodes.length) {
      pushEp({ url: page.href, path: watch.path, episode: watch.episode, episodeKey: episodeKey(watch.episode),
        language: linkLanguage(null, doc, null, meta.data, watch.episode) });
    }
    return { slug: parsed.slug, film: meta.film, family: resolvedFamily, title: meta.title,
      originalTitle: meta.originalTitle, year: meta.year, season: meta.season, externalIds: meta.externalIds,
      poster: meta.poster, path: parsed.path, url: page.href, isWatch: !!watch, episodes };
  }
  function readCatalog(family, doc = document, pageUrl = location.href) {
    const page = url(pageUrl);
    if (!page) return [];
    const resolvedFamily = family || detect(doc, page.href);
    const items = new Map();
    for (const a of doc.querySelectorAll('a[href]')) {
      if (a.closest('.mh-continue')) continue;
      const target = url(a.getAttribute('href'), page.href);
      if (!target || target.origin !== page.origin) continue;
      const watch = route(target.href, resolvedFamily, page.href);
      const detail = !watch && detailRoute(target.href, resolvedFamily, page.href);
      const parsed = watch || detail;
      if (!parsed) continue;
      const card = a.closest('article,li,.item,.film-item,.movie-card,.apx-card,.myui-vodlist__box');
      const rawTitle = (a.getAttribute('title') || text(a.querySelector('h2,h3,h4,.title,.name')) || text(a) || '').replace(/\s+/g, ' ').trim();
      const cleanedCardTitle = rawTitle.replace(/^(?:Xem\s+)?Phim\s+/i, '').replace(/\s*\(\s*(?:19|20)\d{2}\s*\)\s*$/, '').replace(/\s+(?:19|20)\d{2}$/, '').trim();
      const cardOrig = cleanOriginal(text(card?.querySelector('.origtitle,.original-name,.sub-title')));
      const year = extractTitleYear(rawTitle, text(card)) || '';
      const season = extractSeason(cleanedCardTitle, cardOrig, parsed.slug);
      const prev = items.get(target.href) || { url: target.href, path: parsed.path, slug: parsed.slug, film: filmSlug(parsed.slug),
        title: '', originalTitle: '', year: '', season: '', isWatch: !!watch,
        episodeKey: watch ? episodeKey(watch.episode) : '', language: watch ? linkLanguage(a, doc, null, null, rawTitle) : '' };
      if (cleanedCardTitle.length > prev.title.length && !/^(?:xem phim|play|tap \d+)$/i.test(normalize(cleanedCardTitle).replace(/-/g, ' '))) prev.title = cleanedCardTitle;
      if (!prev.originalTitle && cardOrig) prev.originalTitle = cardOrig;
      if (!prev.year && year) prev.year = year;
      if (!prev.season && season) prev.season = season;
      items.set(target.href, prev);
    }
    return [...items.values()];
  }
  function sameFilm(a, b) {
    if (!a || !b) return false;
    const sa = a.season || extractSeason(a.title, a.originalTitle, a.slug);
    const sb = b.season || extractSeason(b.title, b.originalTitle, b.slug);
    if (sa && sb && String(sa) !== String(sb)) return false;
    const ya = a.year || extractTitleYear(a.title, a.originalTitle);
    const yb = b.year || extractTitleYear(b.title, b.originalTitle);
    if (ya && yb && String(ya) !== String(yb)) return false;
    const sharedIds = ['imdb', 'tmdb'].filter((key) => a.externalIds?.[key] && b.externalIds?.[key]);
    if (sharedIds.length) return sharedIds.every((key) => a.externalIds[key] === b.externalIds[key]);
    const aliases = new Set([a.film || filmSlug(a.slug), ...(a.aliases || [])].filter(Boolean));
    if ([b.film || filmSlug(b.slug), ...(b.aliases || [])].filter(Boolean).some((slug) => aliases.has(slug))) return true;
    // Tên phim đơn lẻ không đủ: chỉ gộp khác slug khi có cùng năm, mùa và tên gốc.
    const oa = cleanOriginal(a.originalTitle);
    const ob = cleanOriginal(b.originalTitle);
    return !!(ya && yb && oa && ob && normalize(oa) === normalize(ob) && String(sa || '') === String(sb || ''));
  }
  function sameEpisode(a, b) {
    return sameFilm(a, b) && (!a.language || !b.language || a.language === b.language)
      && (a.episodeKey || episodeKey(a.path?.split('/').filter(Boolean).pop())) === b.episodeKey;
  }
  function visible(el) {
    if (!el?.isConnected || el.closest('[hidden],[aria-hidden="true"]')) return false;
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    }
    return true;
  }
  function findVideo(doc = document) {
    return [...doc.querySelectorAll('#player video,#jwplayer video,.jwplayer video,#player-wrapper video,#dooplay_player_response video,video')]
      .find((v) => visible(v) && !isPrepared(v) && !v.closest('.jw-flag-ads,[data-ad],.ads-banner,.apx-trailer-player,#fake_jwplayer,[id*="trailer"]')) || null;
  }
  function playerFrames(doc = document, pageUrl = location.href) {
    return [...doc.querySelectorAll('#player iframe,#videoFrame,#player-wrapper iframe,#dooplay_player_response iframe,main iframe,iframe[allowfullscreen]')]
      .filter((el) => {
        const target = url(el.getAttribute('src'), pageUrl);
        return visible(el) && !isPrepared(el) && target && (isMotchill(target.hostname) || embedHosts.has(target.hostname) && (target.hostname!=='api.clubc.live' || knownEmbedPage(target.href))) && !el.closest('.ads-banner,.apx-trailer-player');
      });
  }
  function homeMount(family, doc = document, pageUrl = location.href) {
    const resolved = family || detect(doc, pageUrl);
    for (const step of adapter(resolved, doc, pageUrl).homeSteps || []) {
      const matches = [...doc.querySelectorAll(step.selector)];
      const found = step.exclude ? matches.find((el) => !el.closest(step.exclude)) : matches[0];
      if (found) return { anchor: found, position: step.position };
    }
    return null;
  }
  function homeAnchor(family, doc = document, pageUrl = location.href) {
    return homeMount(family, doc, pageUrl)?.anchor || null;
  }
  function nextEpisodeLink(doc = document, pageUrl = location.href) {
    const page = adapter(null, doc, pageUrl).read();
    return page?.next ? [...doc.querySelectorAll('a[href]')].find((a) => url(a.getAttribute('href'), pageUrl)?.href === page.next.url) || null : null;
  }
  return { families, embedHosts, ROLE_ATTR, ROLES, isPrepared, isMotchill, allowedContext, runWhenAllowed, parentOrigin, knownEmbedPage, mediaSourceMatches, detect, adapter, route, detailRoute, searchUrl,
    episodeKey, filmSlug, sameFilm, sameEpisode, read: (doc = document, pageUrl = location.href, family) => adapter(family, doc, pageUrl).read(),
    readDetail: (doc = document, pageUrl = location.href, family) => adapter(family, doc, pageUrl).detail(),
    readCatalog: (doc = document, pageUrl = location.href, family) => adapter(family, doc, pageUrl).catalog(),
    normalize, translationKey, translationServers, reviveData, reviveServerNodes, url, visible, findVideo, playerFrames, homeMount, homeAnchor, structured, nextData, nextProviderState,nextProviderButtons,nextEpisodeLink };
}


// ---- lib/video-bridge.js ----
// Liên lạc iframe chỉ trong chuỗi nguồn phát đã nhận diện. Trang cha là nơi
// ghi DB; iframe không tự tạo bản lịch sử thứ hai từ URL trình phát.
function createMotchillVideoBridge(sites, channel, options = {}) {
  const nonce = () => Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) => n.toString(16)).join('-');
  const parentOrigin = sites.parentOrigin();
  const trustedOrigin = (origin) => {
    const parsed = sites.url(origin);
    return parsed && (sites.isMotchill(parsed.hostname) || sites.embedHosts.has(parsed.hostname));
  };
  const sourceFrames = (values) => [...new Set((Array.isArray(values) ? values : []).slice(0, 8)
    .filter((value) => typeof value === 'string' && value.length <= 8192 && /^https?:\/\//i.test(value))
    .map((value) => sites.url(value))
    .filter((value) => value && !value.username && !value.password && trustedOrigin(value.origin))
    .map((value) => value.href))].slice(0, 8);
  const mediaSource = (value) => {
    if (typeof value !== 'string' || value.length > 8192 || !/^https?:\/\//i.test(value)) return '';
    const parsed = sites.url(value);
    return parsed && !parsed.username && !parsed.password ? parsed.href : '';
  };
  function localMediaSource(video) {
    const native = mediaSource(video.currentSrc || video.src);
    if (native) return native;
    // TOP1 at motchillf.im uses a JW-managed blob, so the native URL alone
    // cannot prove its HLS source. Only the API of this exact player root may
    // provide its current playlist file; server buttons/DOM attributes are not
    // proof that their source is the media currently being played.
    const root = video.closest('.jwplayer');
    if (!root?.id || !root.isConnected || typeof window.jwplayer !== 'function') return '';
    try {
      const player = window.jwplayer(root.id);
      if (player?.getContainer?.() !== root || typeof player.getPlaylistItem !== 'function') return '';
      const active = [...root.querySelectorAll('video')].filter((node) => sites.visible(node)
        && !sites.isPrepared(node) && !node.closest('.jw-flag-ads,[data-ad]'));
      if (active.length !== 1 || active[0] !== video) return '';
      return mediaSource(player.getPlaylistItem()?.file);
    } catch (_) { return ''; }
  }
  const sessions = new Map();
  let upstream = null;
  let remote = null;
  let activeFrame = null;
  let local = null;
  let localOff = () => {};
  let role = 'current';
  let managed = false;
  let roleFromParent = false;
  let nativeGestures = false;
  let lastStarted = false;
  let startGeneration = 0;
  let seekStartOff = () => {};
  let relayFrame = null;
  let parentContext=null,parentFullscreen=false,parentPresented=window.top===window;
  const nextRequests=new Map();
  function readParentContext(value,origin){
    const target=sites.url(value?.url),route=target && sites.route(target.href,value?.family);
    if(!target || target.origin!==origin || !sites.isMotchill(target.hostname) || !route || route.slug!==value.slug || sites.episodeKey(route.episode)!==value.episodeKey || !sites.translationKey(value.language))return null;
    const result=Object.fromEntries(['url','family','slug','film','episode','episodeKey','language','server'].map(key=>[key,String(value[key] || '').slice(0,2048)]));
    if(Number.isFinite(value.introSeconds) && value.introSeconds>=0 && value.introSeconds<=300)result.introSeconds=value.introSeconds;
    const next=sites.url(value.next?.url),nextRoute=next && sites.route(next.href,result.family);
    if(next?.origin===origin && nextRoute?.slug===route.slug && Number(sites.episodeKey(nextRoute.episode).replace('ep:',''))===Number(result.episodeKey.replace('ep:',''))+1)result.next={url:next.href};
    return result;
  }
  const remotes = new Map();
  function frames() {
    const ordinary = sites.playerFrames();
    if (!options.includePrepared) return ordinary;
    const prepared = [...document.querySelectorAll('iframe[data-mc-managed="episode"],iframe[data-mc-managed="provider"]')].filter((frame) => {
      const target = sites.url(frame.src);
      return frame.isConnected && target && (frame.dataset.mcManaged==='provider'?sites.knownEmbedPage(target.href):target.origin === location.origin);
    });
    return [...new Set([...ordinary, ...prepared])];
  }
  function documentRole() {
    if (roleFromParent) return role;
    try {
      if (window.frameElement?.dataset.mcManaged === 'episode') {
        managed = true;
        return window.frameElement.dataset.mcRole || role;
      }
    } catch (_) { /* iframe khác origin dùng handshake */ }
    return role;
  }
  function setRole(frame, value) {
    const session = sessions.get(frame);
    if (!session || !['prepared', 'current'].includes(value)) return;
    session.assignedRole=value;
    frame.contentWindow?.postMessage({ tag: channel, type: 'role', token: session.token, role: value, managed: true }, session.origin);
  }
  function hello(frame, session) {
    const currentRole = documentRole();
    frame.contentWindow?.postMessage({ tag: channel, type: 'hello', token: session.token,
      managed: ['episode','provider'].includes(frame.dataset.mcManaged) || managed,
      role: session.assignedRole || frame.dataset.mcRole || currentRole,presented:!sites.isPrepared(frame),context:{...sites.adapter().read(),introSeconds:options.introSeconds?.()},fullscreen:!!document.fullscreenElement?.contains(frame) }, session.origin);
  }
  function openSession(frame,origin){
    const previous=sessions.get(frame);if(previous?.loaded)frame.removeEventListener('load',previous.loaded);
    const session={token:nonce(),origin,src:frame.src};
    session.loaded=()=>{
      if(sessions.get(frame)!==session || !frame.isConnected || frame.src!==session.src)return;
      session.token=nonce();session.seenAt=0;remotes.delete(frame);
      if(activeFrame===frame){activeFrame=null;remote=null;}
      if(relayFrame===frame)relayFrame=null;hello(frame,session);
    };
    sessions.set(frame,session);frame.addEventListener('load',session.loaded);return session;
  }
  function validRemote(frame) {
    const receiver = remotes.get(frame);
    const session = sessions.get(frame);
    return receiver && receiver.session === session && frame.isConnected && frame.src === session.src
      && Date.now() - (session.seenAt || 0) <= 10000 ? receiver : undefined;
  }
  function relayRemote() {
    if (remote && validRemote(remote.frame)) return remote;
    if (!managed) return null;
    // Prepared media stays outside active/history selection, while the owner
    // still needs its readiness and a route for pause/mute/start commands.
    const wantedRole = documentRole();
    const selected = frames().map(validRemote).find((receiver) => receiver
      && (receiver.state.role === wantedRole || receiver.frame.dataset.mcRole === wantedRole));
    return selected || (relayFrame && validRemote(relayFrame)) || null;
  }
  class RemoteVideo extends EventTarget {
    constructor(frame, session) {
      super(); this.frame = frame; this.session = session; this.state = {};
    }
    get currentTime() { return this.state.position || 0; }
    set currentTime(value) { this.command('seek', value); }
    get duration() { return this.state.duration || 0; }
    get readyState() { return this.state.readyState ?? (this.duration > 0 ? 1 : 0); }
    get paused() { return this.state.paused !== false; }
    get ended() { return !!this.state.ended; }
    get playbackRate() { return this.state.playbackRate || 1; }
    set playbackRate(value) { this.command('rate', value); }
    get muted() { return !!this.state.muted; }
    get volume() { const value=this.state.volume;return Number.isFinite(value) && value>=0 && value<=1?value:undefined; }
    set muted(value) { this.command('mute', !!value); }
    get isConnected() { return this.frame.isConnected && sites.visible(this.frame) && this.frame.src === this.session.src; }
    closest() { return null; }
    play() { this.command('play'); return Promise.resolve(); }
    pause() { this.command('pause'); }
    command(action, value) {
      if(validRemote(this.frame)!==this)return false;
      if (action === 'start-zero') this.state = { ...this.state, startedAtZero: false, paused: true };
      this.frame.contentWindow?.postMessage({ tag: channel, type: 'command', token: this.session.token, mediaId:this.state.mediaId, action, value }, this.session.origin);
      return true;
    }
  }
  function state() {
    const currentRole = documentRole();
    const video = sites.findVideo();
    observeLocal(video);
    if (video) {
      const page = sites.adapter().read();
      return { position: Number.isFinite(video.currentTime) ? video.currentTime : 0,
        duration: Number.isFinite(video.duration) ? video.duration : 0, paused: video.paused,
        readyState: video.readyState, playbackRate: video.playbackRate, muted: video.muted,volume:video.volume,
        error: video.error ? { code: video.error.code } : null,
        buffered: video.buffered?.length ? video.buffered.end(0) : 0,
        startedAtZero: lastStarted, managed, role: currentRole, nativeGestures,
        ended: video.ended, played:video.played?.length>0, ad: !!video.closest('.jw-flag-ads,[data-ad]'),
        mediaId: video.currentSrc || video.src || '', mediaSource: localMediaSource(video), sourceFrames: [],
        page, direct: !!page && !!video.closest('.jwplayer') && sites.adapter().gestures,
        ...(options.userSeek ? { userSeek: options.userSeek() } : {}),
        ...(options.customState?.(video) || {}),
      };
    }
    if (local?.isConnected && local.closest('.jw-flag-ads,[data-ad]')) return { position: 0, duration: 0, paused: true, ad: true, direct: false, page: null };
    const selected = relayRemote();
    return selected?.state ? { ...selected.state, sourceFrames: sourceFrames([selected.frame.src, ...sourceFrames(selected.state.sourceFrames)]), page: sites.adapter().read() || selected.state.page,
      managed, role: currentRole } : null;
  }
  function sendState() {
    if (!upstream) return;
    const value = state();
    window.parent.postMessage({ tag: channel, type: 'state', token: upstream.token, value }, upstream.origin);
  }
  function requestFullscreen() {
    if (documentRole() !== 'current') return;
    if (upstream) window.parent.postMessage({ tag: channel, type: 'fullscreen-toggle', token: upstream.token }, upstream.origin);
    else document.dispatchEvent(new CustomEvent('mc-fullscreen-request'));
  }
  function requestNext(){
    if(documentRole()!=='current')return false;
    if(upstream){
      if(nextRequests.size)return false;
      const id=nonce(),mediaId=state()?.mediaId;if(!mediaId)return false;
      return new Promise(resolve=>{
        const timer=setTimeout(()=>{nextRequests.delete(id);resolve('timeout');},45000);
        nextRequests.set(id,{resolve,timer,mediaId,token:upstream.token});
        window.parent.postMessage({tag:channel,type:'next-episode',token:upstream.token,id,mediaId},upstream.origin);
      });
    }
    return options.onNext?.() || false;
  }
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.tag !== channel || !trustedOrigin(event.origin)) return;
    if (event.source === window.parent && window.parent !== window && parentOrigin === event.origin) {
      if(data.type==='next-result' && upstream?.token===data.token && typeof data.id==='string'){
        const request=nextRequests.get(data.id);
        if(request && request.token===data.token && request.mediaId===state()?.mediaId && ['navigating','missing','error'].includes(data.status)){
          clearTimeout(request.timer);nextRequests.delete(data.id);request.resolve(data.status);
        }return;
      }
      if (data.type === 'hello' && typeof data.token === 'string' && data.token.length < 100) {
        upstream = { token: data.token, origin: event.origin };
        parentContext=readParentContext(data.context,event.origin);parentFullscreen=data.fullscreen===true;parentPresented=data.presented!==false;
        if (data.managed && ['prepared', 'current'].includes(data.role)) {
          managed = true; role = data.role; roleFromParent = true;
          for (const frame of frames()) setRole(frame, role);
          document.dispatchEvent(new CustomEvent('mc-player-role', { detail: { role, managed } }));
        }
        sendState();
      }
      if (data.type === 'role' && upstream?.token === data.token && data.managed && ['prepared', 'current'].includes(data.role)) {
        managed = true; role = data.role; roleFromParent = true;
        for (const frame of frames()) setRole(frame, role);
        document.dispatchEvent(new CustomEvent('mc-player-role', { detail: { role, managed } }));
      }
      if (data.type === 'command' && upstream?.token === data.token) {
        if(data.action==='play-audible' && (typeof data.mediaId!=='string' || !data.mediaId || documentRole()==='prepared'))return;
        if(data.action==='restore-audio' && (typeof data.mediaId!=='string' || !data.mediaId || documentRole()==='prepared' || typeof data.value?.muted!=='boolean' || !Number.isFinite(data.value?.volume) || data.value.volume<0 || data.value.volume>1))return;
        const video = sites.findVideo();
        observeLocal(video);
        if (!video) {const relay=relayRemote();if(data.mediaId && data.mediaId!==relay?.state?.mediaId)return;return relay?.command(data.action,data.value);}
        if(data.mediaId && data.mediaId!==(video.currentSrc || video.src || ''))return;
        if(data.action==='play-audible'){
          if(video.closest('.jw-flag-ads,[data-ad]') || video.error || video.readyState<1)return;
          options.playAudible?.(video);return;
        }
        if(data.action==='restore-audio'){
          if(video.closest('.jw-flag-ads,[data-ad]') || video.error || video.readyState<1)return;
          options.restoreAudio?.(video,data.value);return;
        }
        if(typeof data.action==='string' && data.action.startsWith('track-')){
          if(typeof data.mediaId!=='string' || !data.mediaId || data.mediaId!==(video.currentSrc || video.src || '') || video.closest('.jw-flag-ads,[data-ad]') || video.error || video.readyState<1)return;
          options.selectTrack?.(video,data.action.slice(6),data.value);return;
        }
        if (data.action === 'seek' && Number.isFinite(data.value) && data.value >= 0 && data.value < video.duration) {
          options.beforeSeek?.(data.value); video.currentTime = data.value;
        }
        if (data.action === 'play') video.play()?.catch(() => {});
        if (data.action === 'pause') video.pause();
        if (data.action === 'reveal-controls') document.dispatchEvent(new CustomEvent('mc-reveal-controls'));
        if (data.action === 'mute' && typeof data.value === 'boolean') video.muted = data.value;
        if (data.action === 'rate' && Number.isFinite(data.value) && data.value >= .25 && data.value <= 4) video.playbackRate = data.value;
        if (data.action === 'start-zero') {
          const operation = ++startGeneration;
          lastStarted = false;
          seekStartOff();
          video.muted = true;
          options.beforeSeek?.(0);
          video.currentTime = 0;
          const source = video.currentSrc || video.src || '';
          // Phải quan sát seek thực tế, không coi command gửi đi là thành công.
          const start = () => {
            if (operation !== startGeneration) return;
            if (video.currentTime > .5 || video.seeking) return;
            video.removeEventListener('seeked', start);
            seekStartOff = () => {};
            Promise.resolve(video.play()).then(() => {
              if (operation !== startGeneration || video !== local || !video.isConnected || source !== (video.currentSrc || video.src || '') || video.currentTime > 3 || video.paused) return;
              lastStarted = true;
              sendState();
            }).catch(() => { if (operation === startGeneration) { lastStarted = false; sendState(); } });
          };
          video.addEventListener('seeked', start);
          seekStartOff = () => video.removeEventListener('seeked', start);
          start();
        }
      }
      return;
    }
    // event.source phải chính là frame đang hiện; không tin một message chỉ vì cùng domain.
    const frame = frames().find((el) => el.contentWindow === event.source);
    if (!frame || sites.url(frame.src)?.origin !== event.origin) return;
    let session = sessions.get(frame);
    if(data.type==='next-episode'){
      const receiver=validRemote(frame);
      if(!session || data.token!==session.token || session.src!==frame.src || session.origin!==event.origin || !receiver?.state?.nativeEnhanced || !receiver.state.customCapable || receiver.state.ad || frame.dataset.mcRole==='prepared' || receiver.state.role==='prepared' || !data.mediaId || data.mediaId!==receiver.state.mediaId || typeof data.id!=='string' || !/^[a-f0-9-]{16,100}$/.test(data.id) || session.nextPending)return;
      const currentSession=session;session.nextPending=true;
      Promise.resolve(upstream?requestNext():options.onNext?.()).then(ok=>{
        if(validRemote(frame)!==receiver || sessions.get(frame)!==currentSession || receiver.state.mediaId!==data.mediaId)return;
        frame.contentWindow.postMessage({tag:channel,type:'next-result',token:session.token,id:data.id,status:ok===true || ok==='navigating'?'navigating':'missing'},session.origin);
      }).catch(()=>{
        if(validRemote(frame)===receiver && sessions.get(frame)===currentSession)frame.contentWindow.postMessage({tag:channel,type:'next-result',token:session.token,id:data.id,status:'error'},session.origin);
      }).finally(()=>{currentSession.nextPending=false;});return;
    }
    if (data.type === 'fullscreen-toggle') {
      const receiver = validRemote(frame);
      if (!session || session.token !== data.token || session.origin !== event.origin || session.src !== frame.src
        || !receiver || frame.dataset.mcRole === 'prepared' || receiver.state.role === 'prepared') return;
      requestFullscreen();
      return;
    }
    if (data.type === 'ready') {
      remotes.delete(frame);
      if (relayFrame === frame) relayFrame = null;
      if (activeFrame === frame) { activeFrame = null; remote = null; }
      session = openSession(frame,event.origin);
      hello(frame, session);
      return;
    }
    if (data.type !== 'state' || !session || session.token !== data.token || session.origin !== event.origin || session.src !== frame.src) return;
    let value = data.value;
    if (value === null) { remotes.delete(frame); if (frame === activeFrame) { remote = null; activeFrame = null; } return; }
    if (!value || !Number.isFinite(value.position) || !Number.isFinite(value.duration) || value.position < 0 || value.duration < 0 || value.position > value.duration + 1) return;
    // This field comes through the same frame/window/origin/nonce checks as
    // mediaId. It conveys a media URL only, never original-page authority.
    const tracks={};
    for(const group of ['quality','audio','captions']){
      const items=value.tracks?.[group];
      if(Array.isArray(items) && items.length<=100 && items.every(item=>item && Number.isInteger(item.id) && item.id>=0 && item.id<100 && typeof item.label==='string' && item.label.length<=100 && typeof item.active==='boolean'))tracks[group]=items.map(({id,label,active})=>({id,label,active}));
    }
    value = { ...value, mediaSource: mediaSource(value.mediaSource),nativeEnhanced:value.nativeEnhanced===true,customCapable:value.customCapable===true,played:value.played===true,tracks };
    // Generic player chỉ có quyền báo video, không tự nhận là website gốc.
    if (sites.embedHosts.has(sites.url(frame.src).hostname)) value = { ...value, page: null, direct: false,
      sourceFrames: sourceFrames(value.sourceFrames).filter((value) => sites.knownEmbedPage(value)) };
    else value = { ...value, sourceFrames: sourceFrames(value.sourceFrames) };
    session.seenAt = Date.now();
    let receiver = remotes.get(frame);
    if (!receiver || receiver.session !== session) { receiver = new RemoteVideo(frame, session); remotes.set(frame, receiver); }
    const previous = receiver.state;
    const changedMedia = previous.mediaId && value.mediaId && previous.mediaId !== value.mediaId;
    if (changedMedia || previous.ad !== value.ad && (previous.ad || value.ad)) receiver.dispatchEvent(new Event('emptied'));
    receiver.state = value;
    relayFrame = frame;
    const prepared = frame.dataset.mcRole === 'prepared' || value.role === 'prepared';
    if (!prepared) { activeFrame = frame; remote = receiver; }
    else if (frame === activeFrame) { activeFrame = null; remote = null; }
    if ((!previous.duration || changedMedia || previous.ad && !value.ad) && value.duration) receiver.dispatchEvent(new Event('loadedmetadata'));
    receiver.dispatchEvent(new Event('timeupdate'));
    if (!previous.paused && value.paused) receiver.dispatchEvent(new Event('pause'));
    if (value.ended && !previous.ended) receiver.dispatchEvent(new Event('ended'));
    sendState();
  });
  function observeLocal(video) {
    if (!video || video === local) return;
    localOff();
    local = video;
    lastStarted = false;
    startGeneration++;
    seekStartOff(); seekStartOff = () => {};
    const invalidateStart = () => {
      if (video !== local) return;
      startGeneration++; lastStarted = false; seekStartOff(); seekStartOff = () => {};
      sendState();
    };
    const events = ['loadedmetadata', 'timeupdate', 'pause', 'ended', 'playing', 'error', 'ratechange'];
    video.addEventListener('loadstart', invalidateStart);
    video.addEventListener('emptied', invalidateStart);
    for (const type of events) video.addEventListener(type, sendState);
    localOff = () => {
      video.removeEventListener('loadstart', invalidateStart);
      video.removeEventListener('emptied', invalidateStart);
      for (const type of events) video.removeEventListener(type, sendState);
    };
  }
  function poll() {
    const currentFrames = frames();
    for (const [frame, session] of sessions) {
      if (!currentFrames.includes(frame) || frame.src !== session.src || Date.now() - (session.seenAt || Date.now()) > 10000) { frame.removeEventListener('load',session.loaded);sessions.delete(frame); remotes.delete(frame); }
    }
    if (remote && (!currentFrames.includes(activeFrame) || !validRemote(activeFrame))) { remote = null; activeFrame = null; }
    for (const frame of currentFrames) {
      if (!sessions.has(frame)) {
        const target = sites.url(frame.src);
        const session = openSession(frame,target.origin);
        hello(frame, session);
      }
      else if(channel==='motchill-player-controls-v2')hello(frame,sessions.get(frame));
    }
    if (parentOrigin && window.parent !== window && trustedOrigin(parentOrigin) && !upstream) window.parent.postMessage({ tag: channel, type: 'ready' }, parentOrigin);
    const video = sites.findVideo();
    observeLocal(video);
    sendState();
    return video || (remote?.isConnected ? remote : null);
  }
  return { poll, state, setRole, requestFullscreen,requestNext,get parentContext(){return parentContext;},get parentFullscreen(){return parentFullscreen;},get parentPresented(){return parentPresented;},getFrame: validRemote,
    setNativeGestures(value) { nativeGestures = value === true; },
    get role() { return documentRole(); }, get managed() { documentRole(); return managed; }, get remote() { return remote; } };
}

// END MOTCHILL SITES

  const sites = createMotchillSites();
  MediaSiteOwner.runFamily(window,{family:'motchill',feature:'source',isSiteURL:value=>{const parsed=sites.url(value);return !!parsed && sites.isMotchill(parsed.hostname);},isFrameURL:value=>sites.knownEmbedPage(value),isFrameOrigin:value=>{const parsed=sites.url(value);return !!parsed && sites.embedHosts.has(parsed.hostname);}},()=>{
  sites.runWhenAllowed(() => {
  const bridge = createMotchillVideoBridge(sites, 'motchill-source-video-v1');
  let button = null;
  function sourceAdapter() {
    switch (sites.detect()) {
      case sites.families.CLASSIC: // https://motchillsa.com/ — chỉ đề xuất nếu bản hiện tại cũng có iframe.
      case sites.families.OPHIM: // https://motchillcu.mx/, https://motchillt.si/
      case sites.families.NEXT: // https://motchille.com.mx/ — có iframe chưa có nghĩa là web cũ.
      case sites.families.NEXT_REVIVE: // https://motchill68.tv/ — player embed khác trang phim gốc.
      case sites.families.APIPHIM: // https://motchill.garden/
      case sites.families.DOO: // https://motchillkd.net/
      case sites.families.MYUI: // https://motchillv.fun/
      case sites.families.WRAPPER: return sites.adapter(); // Case tổng hợp cho wrapper Motchill, cần handshake.
      default: return null;
    }
  }
  function poll() {
    bridge.poll();
    if (window.top !== window) return; // Child chỉ trả lời handshake, không hiện nút lặp.
    const adapter = sourceAdapter();
    const remote = bridge.remote;
    const state = remote?.state;
    const frameTarget = remote?.frame ? sites.url(remote.frame.getAttribute('src'), location.href) : null;
    const candidate = sites.url(state?.page?.url);
    const current = adapter?.read();
    const matches = current ? sites.sameEpisode(current, state?.page) : sites.detect() === sites.families.WRAPPER;
    // Đòi chính frame đang hiện báo có video JW và route của adapter gốc, không
    // tin src trần, URL quảng cáo, .m3u8, player.phimapi hoặc fcloud.
    const valid = adapter && remote && !sites.isPrepared(remote.frame) && state?.direct && matches
      && frameTarget && sites.isMotchill(frameTarget.hostname) && !sites.embedHosts.has(frameTarget.hostname)
      && candidate && candidate.origin === frameTarget.origin && sites.isMotchill(candidate.hostname) && !sites.embedHosts.has(candidate.hostname)
      && [sites.families.CLASSIC, sites.families.OPHIM].includes(state?.page?.family) && sites.route(candidate.href, state.page.family)
      && candidate.href !== location.href && candidate.username === '' && candidate.password === ''
      && state.duration >= 120 && !state.ad;
    if (!valid) { button?.remove(); button = null; return; }
    if (!button || !button.isConnected) {
      button?.remove();
      button = document.createElement('a'); button.className = 'ms-open-source';
      button.style.cssText = 'display:inline-block;margin:10px;padding:10px 14px;background:#292929;color:white;border:1px solid #777;border-radius:6px;font:14px sans-serif;text-decoration:none';
      const frame = remote.frame;
      frame.parentElement?.insertBefore(button, frame);
    }
    button.href = candidate.href;
    button.textContent = 'Mở bản trực tiếp · ' + candidate.hostname;
    button.title = 'Đã nhận diện trang tập phim và video JW trong iframe';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poll, { once: true }); else poll();
  setInterval(poll, 1000);
  // END MOTCHILL ENTRY
  });
});
})();