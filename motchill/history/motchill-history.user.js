// ==UserScript==
// @name         Motchill - lịch sử xem
// @namespace    motchill-history
// @version      6.0.4
// @author       zic
// @homepageURL  https://github.com/nhattruong16062003/media-userscripts/tree/main/motchill
// @updateURL    https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/refs/heads/main/motchill/history/motchill-history.user.js
// @downloadURL  https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/refs/heads/main/motchill/history/motchill-history.user.js
// @description  Nhớ chỗ đang xem của từng phim trên Motchill (mọi tên miền): mở lại là tự tua về chỗ cũ, trang chủ có hàng "Đang xem dở".
// @match        https://motchillsa.com/*
// @match        https://motchilltu.com/*
// @match        https://fcloud.live/cinema/*
// @match        https://player.phimapi.com/player/*
// @match        https://maztoycdn.xyz/watch/*
// @match        https://player.cbplay.cc/embed/*
// @match        https://cdn.loadvid.com/videos/play/*
// @match        https://embed13.streamc.xyz/*
// @match        https://embed1.streamc.xyz/embed.php*
// @match        https://embed12.streamc.xyz/embed.php*
// @match        https://embed2.streamc.xyz/embed.php*
// @match        https://v8.streamvsmov.com/video/*
// @match        https://v9.streamvsmov.com/video/*
// @include      /^https?:\/\/[^\/?#]*motchill[^\/?#]*\//
// @run-at       document-start
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.listValues
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
  const embedHosts = new Set(['fcloud.live', 'player.phimapi.com', 'maztoycdn.xyz', 'player.cbplay.cc', 'cdn.loadvid.com', 'embed13.streamc.xyz', 'embed1.streamc.xyz', 'embed12.streamc.xyz', 'embed2.streamc.xyz', 'v8.streamvsmov.com', 'v9.streamvsmov.com']);
  const ROLE_ATTR = 'data-mc-role';
  const ROLES = Object.freeze({ CURRENT: 'current', PREPARED: 'prepared' });
  // Giới hạn website/iframe được trao đổi dữ liệu; không dùng để chọn family.
  const isMotchill = (host) => /(^|\.)[^.]*motchill[^.]*\./i.test(host);
  const text = (node) => node ? node.textContent.trim() : '';
  const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const translationKey = (value) => {
    const languages = [...new Set(normalize(value).match(/thuyet-minh|long-tieng|vietsub/g) || [])];
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
      'v8.streamvsmov.com': /^\/video\//, 'v9.streamvsmov.com': /^\/video\//,
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
    const pages = [];
    for (const script of scripts) {
      try {
        const arg = script.textContent.trim().slice('self.__next_f.push('.length).replace(/\);?\s*$/, '');
        const chunk = JSON.parse(arg)[1];
        if (typeof chunk !== 'string') continue;
        for (const line of chunk.split('\n')) {
          const index = line.indexOf(':');
          if (index < 0) continue;
          try {
            const value = JSON.parse(line.slice(index + 1));
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
      } catch (e) { /* script khác */ }
    }
    flightCache.set(doc, { key: cacheKey, pages });
    return pages;
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
        const matches = [...(data?.episodeVariants || []), ...(data?.movie?.episodes || [])].filter((ep) => episodeKey(ep.slug) === episodeKey(parsed?.episode)
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
    const selectedLanguage = currentServerLanguage(doc, family);
    const routeVariants = meta.rsc?.episodeVariants?.filter((v) => v.slug === currentRoute.episode) || [];
    const ambiguousLanguage = family === families.NEXT && !selectedLanguage
      && new Set(routeVariants.map((v) => translationKey(v.server)).filter(Boolean)).size > 1;
    // Several actual language variants share k-tap-01. The SSR server buttons
    // are all unselected until hydration; array order is not selection evidence.
    const variant = !ambiguousLanguage && routeVariants.find((v) => v.slug === currentRoute.episode
      && (!selectedLanguage || translationKey(v.server) === selectedLanguage));
    const rscNext = meta.rsc?.serverEpisodes?.find((v) => v.server === variant?.server && Number(episodeKey(v.slug).replace('ep:', '')) === number + 1);
    const label = variant?.name || (current ? text(current) : currentRoute.episode);
    const language = ambiguousLanguage ? '' : selectedLanguage || linkLanguage(current, doc, variant, meta.data, label);
    return { ...currentRoute, family, title: meta.title, originalTitle: meta.originalTitle,
      year: meta.year, season: meta.season, language, externalIds: meta.externalIds,
      film: meta.film, episodeKey: episodeKey(currentRoute.episode), poster: meta.poster,
      episode: label, url: page.href, next: rscNext ? {
        path: '/phim/' + currentRoute.slug + '/' + rscNext.slug, episode: rscNext.name, episodeKey: episodeKey(rscNext.slug),
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
      for (const ep of [...(meta.rsc.episodeVariants || []), ...(meta.rsc.serverEpisodes || [])]) {
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
        return visible(el) && !isPrepared(el) && target && (isMotchill(target.hostname) || embedHosts.has(target.hostname)) && !el.closest('.ads-banner,.apx-trailer-player');
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
    normalize, translationKey, translationServers, reviveData, reviveServerNodes, url, visible, findVideo, playerFrames, homeMount, homeAnchor, structured, nextData, nextEpisodeLink };
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
  const remotes = new Map();
  function frames() {
    const ordinary = sites.playerFrames();
    if (!options.includePrepared) return ordinary;
    const prepared = [...document.querySelectorAll('iframe[data-mc-managed="episode"]')].filter((frame) => {
      const target = sites.url(frame.src);
      return frame.isConnected && target && target.origin === location.origin;
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
    frame.contentWindow?.postMessage({ tag: channel, type: 'role', token: session.token, role: value, managed: true }, session.origin);
  }
  function hello(frame, session) {
    const currentRole = documentRole();
    frame.contentWindow?.postMessage({ tag: channel, type: 'hello', token: session.token,
      managed: frame.dataset.mcManaged === 'episode' || managed,
      role: frame.dataset.mcRole || currentRole }, session.origin);
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
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.tag !== channel || !trustedOrigin(event.origin)) return;
    if (event.source === window.parent && window.parent !== window && parentOrigin === event.origin) {
      if (data.type === 'hello' && typeof data.token === 'string' && data.token.length < 100) {
        upstream = { token: data.token, origin: event.origin };
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
    value = { ...value, mediaSource: mediaSource(value.mediaSource),customCapable:value.customCapable===true,played:value.played===true,tracks };
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
    }
    if (parentOrigin && window.parent !== window && trustedOrigin(parentOrigin) && !upstream) window.parent.postMessage({ tag: channel, type: 'ready' }, parentOrigin);
    const video = sites.findVideo();
    observeLocal(video);
    sendState();
    return video || (remote?.isConnected ? remote : null);
  }
  return { poll, state, setRole, requestFullscreen, getFrame: validRemote,
    setNativeGestures(value) { nativeGestures = value === true; },
    get role() { return documentRole(); }, get managed() { documentRole(); return managed; }, get remote() { return remote; } };
}

// END MOTCHILL SITES

  const sites = createMotchillSites();
  MediaSiteOwner.runFamily(window,{family:'motchill',feature:'history',isSiteURL:value=>{const parsed=sites.url(value);return !!parsed && sites.isMotchill(parsed.hostname);},isFrameURL:value=>sites.knownEmbedPage(value),isFrameOrigin:value=>{const parsed=sites.url(value);return !!parsed && sites.embedHosts.has(parsed.hostname);}},()=>{
  sites.runWhenAllowed(() => {
  const bridge = createMotchillVideoBridge(sites, 'motchill-history-video-v1');
  // Iframe chỉ báo trạng thái video. DB luôn do trang phim cha quản lý.
  if (window.top !== window) {
    setInterval(() => bridge.poll(), 1000);
    bridge.poll();
    return;
  }

  const DB_KEY = 'history-v2';
  // Mỗi document có journal riêng: hai domain ghi đồng thời không cùng ghi đè
  // một JSON lớn. Đọc DB = hợp nhất checkpoint + các journal, mới nhất theo tập.
  const journalKey = DB_KEY + '-journal:' + crypto.randomUUID();
  const journal = { version: 2, records: {}, removed: {} };
  const MAX_SHOWS = 20;
  const MIN_SECONDS = 10;
  const MIN_DURATION = 120;
  let db = { version: 2, shows: [] };
  let storageError = false;
  const readDB = async () => {
    const raw = await GM.getValue(DB_KEY, '');
    const keys = (await GM.listValues()).filter((key) => key.startsWith(DB_KEY + '-journal:'));
    if (!raw && !keys.length) return null;
    const value = raw ? JSON.parse(raw) : { version: 2, shows: [] };
    if (value.version !== 2 || !Array.isArray(value.shows)) throw new Error('Định dạng lịch sử chưa hỗ trợ');
    const records = [...value.shows];
    const removed = {};
    for (const rawPart of await Promise.all(keys.map((key) => GM.getValue(key, '{}')))) {
      const part = JSON.parse(rawPart);
      if (part.version !== 2) throw new Error('Journal không đọc được');
      records.push(...Object.values(part.records || {}));
      for (const [id, time] of Object.entries(part.removed || {})) removed[id] = Math.max(removed[id] || 0, time);
    }
    const merged = [];
    for (const row of records.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0))) {
      if (!row || typeof row.slug !== 'string' || (removed[row.id] || 0) >= (row.updatedAt || 1)) continue;
      const other = merged.find((s) => sites.sameFilm(s, row));
      if (!other) { merged.push({ ...row, ids: [...new Set([row.id, ...(row.ids || [])])] }); continue; }
      const sources = { ...other.sources };
      for (const [host, paths] of Object.entries(row.sources || {})) sources[host] = { ...sources[host], ...paths };
      const episodes = { ...other.episodes };
      for (const [slot, entry] of Object.entries(row.episodes || {})) {
        if (!episodes[slot] || (entry.updatedAt || row.updatedAt || 0) >= (episodes[slot].updatedAt || 0)) episodes[slot] = entry;
      }
      const metadata = { year: row.year || other.year || '', season: row.season || other.season || '',
        originalTitle: row.originalTitle || other.originalTitle || '', externalIds: { ...other.externalIds, ...row.externalIds } };
      Object.assign(other, row, { sources, episodes, ...metadata,
        aliases: [...new Set([...(other.aliases || []), ...(row.aliases || [])])],
        ids: [...new Set([other.id, row.id, ...(other.ids || []), ...(row.ids || [])])],
      });
    }
    // DB giữ cả phim đã hoàn tất; chỉ giao diện giới hạn 20 phim đang xem gần nhất.
    return { version: 2, shows: merged.sort((a, b) => b.updatedAt - a.updatedAt) };
  };
  const episodeSlot = (info) => info.episodeKey + '|' + (info.language || '');
  function migrate(raw) {
    const list = JSON.parse(raw || '[]');
    return { version: 2, shows: (Array.isArray(list) ? list : []).filter((s) => s && typeof s.slug === 'string').map((s) => {
      const key = sites.episodeKey(s.path?.split('/').filter(Boolean).pop() || s.episode);
      return { ...s, id: 'legacy:' + s.slug, film: sites.filmSlug(s.slug), episodeKey: key,
        aliases: [sites.filmSlug(s.slug)], sources: {}, language: '',
        episodes: { [key + '|']: { position: s.position || 0, duration: s.duration || 0 } },
      };
    }) };
  }
  const loaded = (async () => {
    try {
      const current = await readDB();
      if (current) { db = current; return; }
      const legacy = await GM.getValue('history', '[]');
      db = migrate(legacy);
      if (await GM.getValue('history-v1-backup', null) === null) await GM.setValue('history-v1-backup', legacy);
      await GM.setValue(DB_KEY, JSON.stringify(db));
    } catch (error) {
      storageError = true;
      console.warn('[Motchill history] Không ghi đè kho lịch sử không đọc được.', error);
    }
  })();
  let queue = loaded;
  function change(fn) {
    // Serialize trong tab; journal riêng giúp các tab/domain không ghi đè nhau.
    const operation = queue.then(async () => {
      if (storageError) return;
      db = await readDB() || db;
      const before = new Map(db.shows.map((s) => [s.id, JSON.stringify(s)]));
      fn(db.shows);
      for (const [id, value] of before) {
        if (!db.shows.some((s) => s.id === id)) {
          for (const alias of [id, ...(JSON.parse(value).ids || [])]) journal.removed[alias] = Date.now();
        }
      }
      for (const show of db.shows) {
        if (before.get(show.id) !== JSON.stringify(show)) journal.records[show.id] = show;
      }
      db.shows.sort((a, b) => b.updatedAt - a.updatedAt);
      await GM.setValue(journalKey, JSON.stringify(journal));
      renderHistory();
    });
    queue = operation.catch((error) => console.warn('[Motchill history] Không lưu được lịch sử.', error));
    return queue;
  }
  const find = (info) => db.shows.find((s) => sites.sameFilm(s, info));
  function savedEpisode(info) {
    const show = find(info);
    if (!show) return null;
    const exact = show.episodes?.[episodeSlot(info)];
    if (exact) return exact;
    // Dữ liệu v1 không có bản dịch: chỉ kế thừa đúng tập, kiểm tra thời lượng trước khi tua.
    return show.episodes?.[info.episodeKey + '|'] || null;
  }
  function upsert(info, position, duration) {
    return change((shows) => {
      const existing = shows.find((s) => sites.sameFilm(s, info));
      const next = { ...existing, ...info, id: existing?.id || crypto.randomUUID(), position, duration,
        year: info.year || existing?.year || '', season: info.season || existing?.season || '',
        originalTitle: info.originalTitle || existing?.originalTitle || '',
        externalIds: { ...existing?.externalIds, ...info.externalIds },
        updatedAt: Date.now(), aliases: [...new Set([...(existing?.aliases || []), sites.filmSlug(info.slug)])],
        episodes: { ...existing?.episodes, [episodeSlot(info)]: { position, duration, updatedAt: Date.now() } },
        sources: { ...existing?.sources },
      };
      const target = sites.url(info.url);
      if (target && sites.isMotchill(target.hostname)) {
        next.sources[target.hostname] = { ...existing?.sources?.[target.hostname], [episodeSlot(info)]: target.href };
      }
      if (existing) shows.splice(shows.indexOf(existing), 1, next);
      else shows.push(next);
    });
  }
  function remove(id) { return change((shows) => { const index = shows.findIndex((s) => s.id === id); if (index >= 0) shows.splice(index, 1); }); }

  // Cross-userscript bridge uses JSON strings, which are safe across Firefox's
  // userscript/page compartments. Return only one current episode's progress,
  // never expose the shared history database to the page.
  document.addEventListener('mc-history-resume-request', (event) => {
    let request;
    try { request = JSON.parse(event.detail); } catch (_) { return; }
    if (!request || typeof request.id !== 'string' || !/^[a-zA-Z0-9-]{8,100}$/.test(request.id)) return;
    // Claim before any asynchronous storage work, including a failed/slow DB.
    // Gestures can then distinguish an absent history script from a read error.
    event.preventDefault();
    loaded.then(async () => {
      if (storageError) return;
      poll();
      const active = currentInfo;
      const requestPageUrl = location.href;
      const target = request.info;
      if (!active || !target || !sites.sameFilm(active, target) || target.episodeKey !== active.episodeKey) return;
      const frame = attached?.frame;
      let doc = document;
      let pageUrl = location.href;
      try {
        if (frame?.dataset.mcManaged === 'episode' && frame.dataset.mcRole === 'current' && frame.contentDocument) {
          doc = frame.contentDocument; pageUrl = frame.src;
        }
      } catch (_) { /* Native page data remains the only allowed fallback. */ }
      const detail = sites.readDetail(doc, pageUrl);
      if (!detail || !sites.sameFilm(active, detail) || !detail.episodes.some((ep) =>
        ep.episodeKey === target.episodeKey && ep.language === target.language)) return;
      try { db = await readDB() || db; } catch (_) { return; }
      if (location.href !== requestPageUrl || !currentInfo || !sites.sameEpisode(currentInfo, active)) return;
      const saved = find(active)?.episodes?.[episodeSlot(target)];
      const value = saved && Number.isFinite(saved.position) && Number.isFinite(saved.duration)
        ? { position: saved.position, duration: saved.duration } : null;
      document.dispatchEvent(new CustomEvent('mc-history-resume-response', {
        detail: JSON.stringify({ id: request.id, value }),
      }));
    }).catch(() => {});
  });

  let attached = null;
  let activeKey = '';
  let currentInfo = null;
  let nativeBinding = null;
  const nativeEpochs = new WeakMap();
  function nativeEpoch(video) {
    if (!nativeEpochs.has(video)) {
      const record = { value: 0 };
      for (const event of ['loadstart', 'emptied', 'loadedmetadata']) video.addEventListener(event, () => { record.value++; });
      nativeEpochs.set(video, record);
    }
    return nativeEpochs.get(video).value;
  }
  let detach = () => {};
  function selectHistoryAdapter() {
    const family = sites.detect();
    switch (family) {
      case sites.families.CLASSIC: return sites.adapter(family); // https://motchillsa.com/ (source cũ)
      case sites.families.OPHIM: return sites.adapter(family); // https://motchillcu.mx/, https://motchillt.si/
      case sites.families.NEXT: return sites.adapter(family); // https://motchille.com.mx/
      case sites.families.NEXT_REVIVE: return sites.adapter(family); // https://motchill68.tv/xem-phim/thuong-cong-chua?tap=1
      case sites.families.APIPHIM: return sites.adapter(family); // https://motchill.garden/
      case sites.families.DOO: return sites.adapter(family); // https://motchillkd.net/
      case sites.families.MYUI: return sites.adapter(family); // https://motchillv.fun/
      case sites.families.WRAPPER: return sites.adapter(family); // Chờ iframe gửi metadata phim đã xác minh.
      default: return null; // Không tạo lịch sử từ iframe QC hoặc trang chưa biết.
    }
  }
  function poll() {
    const adapter = selectHistoryAdapter();
    const media = bridge.poll();
    if (pendingSelection && pendingSelection.pageUrl !== location.href) clearPendingResume();
    // A server can change its selected CSS before the old stream is replaced.
    // Do not resume or record target-language progress on that old stream.
    if (pendingSelection) return;
    if (sites.isPrepared(media)) {
      if (attached) { detach(); attached = null; activeKey = ''; currentInfo = null; }
      return;
    }
    let info = adapter?.read();
    // The top document retains its old framework data while a managed page owns
    // playback. Prefer the live bridge metadata only for the current exact route.
    const remoteInfo = media?.state?.page;
    const remoteUrl = sites.url(remoteInfo?.url);
    const remoteRoute = remoteUrl && remoteInfo && sites.route(remoteUrl.href, remoteInfo.family);
    const outerRoute = remoteInfo && sites.route(location.href, remoteInfo.family);
    if (media?.frame?.dataset.mcManaged === 'episode' && media.frame.dataset.mcRole === 'current'
      && remoteUrl?.origin === location.origin && remoteUrl.pathname === location.pathname
      && remoteRoute && outerRoute && remoteInfo.episodeKey === sites.episodeKey(remoteRoute.episode)
      && remoteInfo.episodeKey === sites.episodeKey(outerRoute.episode)) info = { ...remoteInfo, url: location.href };
    if (!info && sites.detect() === sites.families.WRAPPER && bridge.state()?.direct) info = bridge.state().page;
    if (info && media?.state?.page && !sites.sameEpisode(info, media.state.page)) info = null;
    if (!info || !media || !sites.url(info.url) || !sites.isMotchill(sites.url(info.url).hostname)) {
      if (attached) { detach(); attached = null; activeKey = ''; currentInfo = null; }
      return;
    }
    // Wrapper/frame chỉ có một chủ sở hữu lịch sử: top lưu, frame gửi về top.
    if (window.top !== window) return;
    if (media.tagName === 'VIDEO') {
      const source = mediaIdentity(media);
      const epoch = nativeEpoch(media);
      if (nativeBinding?.video === media && !sites.sameEpisode(nativeBinding.info, info)
        && (source === nativeBinding.source && epoch === nativeBinding.epoch || media.readyState < 1)) {
        // SPA hydration may change the route before replacing a reused video's
        // source. Preserve old provenance until that actual media changes.
        detach(); attached = null; activeKey = ''; currentInfo = null;
        return;
      }
      nativeBinding = { video: media, source, info, epoch };
    } else nativeBinding = null;
    const key = [location.href, info.film, info.episodeKey, info.language].join('|');
    if (media === attached && key === activeKey) return;
    detach(); attached = media; activeKey = key; currentInfo = info;
    const watchUrl = location.href;
    detach = watch(media, info, () => attached === media && activeKey === key && location.href === watchUrl && media.isConnected && !sites.isPrepared(media) && !bridge.state()?.ad);
  }
  function watch(video, info, isActive) {
    let ready = false;
    let lastSave = 0;
    let completed = false;
    let restored = false;
    let awaitingSeek = null;
    const events = [];
    const listen = (target, event, fn) => { target.addEventListener(event, fn); events.push(() => target.removeEventListener(event, fn)); };
    const isAd = () => !!video.closest?.('.jw-flag-ads,[data-ad]') || !!video.state?.ad;
    const isPrepared = () => sites.isPrepared(video);
    const startsFromZero = () => video.frame?.dataset.mcStartZero === '1'
      || video.closest?.('[data-mc-start-zero="1"]');
    function start() {
      if (ready || !isActive() || isAd() || isPrepared() || !Number.isFinite(video.duration) || video.duration < MIN_DURATION) return;
      ready = true;
      const saved = savedEpisode(info);
      const similarDuration = !saved?.duration || Math.abs(saved.duration - video.duration) <= Math.max(30, video.duration * .03);
      if (!startsFromZero() && saved && similarDuration && saved.position > MIN_SECONDS && saved.position < video.duration * .95) {
        restored = true;
        if (video.state) awaitingSeek = saved.position;
        video.currentTime = saved.position;
        video.play()?.catch(() => {});
      }
    }
    function save() {
      start();
      if (!ready || !isActive() || isAd() || isPrepared() || !Number.isFinite(video.duration) || video.duration < MIN_DURATION) return;
      const position = Math.floor(video.currentTime);
      if (!Number.isFinite(position)) return;
      // Chờ iframe xác nhận đã tua; bản tin cũ có thể vẫn mang vị trí trước seek.
      if (awaitingSeek !== null) {
        if (Math.abs(position - awaitingSeek) > 5) return;
        awaitingSeek = null;
      }
      // Remote iframe xác nhận seek ở bản tin sau; không ghi vị trí 0 đè dữ liệu trước đó.
      if (restored && position <= MIN_SECONDS) return;
      if (completed && position < video.duration * .95 - 30) completed = false;
      if (completed || position < MIN_SECONDS) return;
      lastSave = Date.now();
      if (position >= video.duration * .95) {
        completed = true;
        // Only actual playback creates an episode record. Preloading or reaching
        // the credits must never mark an unchosen next episode as watched.
        upsert({ ...info, finished: !info.next }, position, Math.floor(video.duration));
      } else upsert({ ...info, finished: false }, position, Math.floor(video.duration));
    }
    listen(video, 'loadedmetadata', start);
    listen(video, 'emptied', () => { ready = false; restored = false; awaitingSeek = null; completed = false; });
    listen(video, 'timeupdate', () => { if (Date.now() - lastSave >= 5000) save(); });
    listen(video, 'pause', save);
    listen(video, 'ended', save);
    listen(window, 'pagehide', save);
    listen(document, 'mc-before-server-change', save);
    listen(document, 'visibilitychange', () => { if (document.hidden) save(); });
    start();
    return () => { events.forEach((off) => off()); };
  }

  // Không xóa OPCMS-PlayerPosition trên toàn bộ website: chỉ vô hiệu hóa key của
  // trình phát đang dùng khi đã có tập hợp lệ và script đã sẵn sàng tiếp quản.
  function clearLegacyPosition() {
    if (!currentInfo) return;
    const selected = document.querySelector('.streaming-server.btn-success,.streaming-server.active,.streaming-server.current');
    const id = selected?.dataset.id;
    if (id && /^\d+$/.test(id)) { try { localStorage.removeItem('OPCMS-PlayerPosition-' + id); } catch (e) {} }
  }
  const PENDING_KEY = 'motchill-history-pending-v1';
  const FETCH_TIMEOUT = 10000;
  let pendingSelection = null;
  let pendingNotice = null;
  function clearPendingResume() {
    try { sessionStorage.removeItem(PENDING_KEY); } catch (_) {}
    if (pendingSelection?.node) delete pendingSelection.node.dataset.mcHistoryResume;
    pendingSelection = null;
    pendingNotice?.remove(); pendingNotice = null;
  }
  function pendingMessage(node, text, retry) {
    if (!node?.isConnected) node = sites.translationServers(document, sites.detect())[0]?.node;
    if (!pendingNotice?.isConnected) {
      pendingNotice = document.createElement('div'); pendingNotice.className = 'mh-resume-selection';
      pendingNotice.setAttribute('role', 'status');
      pendingNotice.style.cssText = 'padding:8px 12px;margin:8px 0;background:#242424;color:white;font:14px sans-serif';
      (node?.closest('.tip-change-server,#playeroptions,.apx-flat-subtabs,.player-controls') || node?.parentElement)?.after(pendingNotice);
    }
    pendingNotice.replaceChildren(document.createTextNode(text));
    if (retry) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Thử lại';
      button.addEventListener('click', retry); pendingNotice.append(' ', button);
    }
  }
  function mediaIdentity(video) { return video?.state?.mediaId || video?.currentSrc || video?.src || ''; }
  function verifiedMediaSource(video, target) {
    if (!target) return false;
    const lineage = Array.isArray(video?.state?.sourceFrames) ? video.state.sourceFrames : [];
    // Remote proof is authenticated by the bridge. For a local JW blob, read
    // that same selected video's bridge state, whose playlist API is bound to
    // its exact player root; a server button's data-link is never actual proof.
    const proof = video?.state || (video?.tagName === 'VIDEO' && sites.findVideo() === video ? bridge.state() : null);
    const source = proof?.mediaId === mediaIdentity(video) ? proof.mediaSource : '';
    return [source, mediaIdentity(video), ...lineage].some((value) => sites.mediaSourceMatches(value, target));
  }
  document.addEventListener('click', (event) => {
    if (!pendingSelection) return;
    const differentServer = sites.translationServers(document, sites.detect()).some((choice) =>
      choice.node !== pendingSelection.node && choice.node.contains(event.target));
    if (differentServer) clearPendingResume();
  }, true);
  function resumeUrl(show) {
    const local = show.sources?.[location.hostname]?.[episodeSlot(show)]
      || (!show.language && show.sources?.[location.hostname]?.[show.episodeKey]);
    if (local) {
      const localUrl = sites.url(local, location.href);
      if (localUrl?.origin === location.origin && sites.route(localUrl.href)) return localUrl.href;
    }
    const last = sites.url(show.url);
    if (last && last.origin === location.origin && sites.route(last.href)) return last.href;
    // A route alone does not prove its language or remake identity. Use only
    // actual catalog/watch entries with compatible metadata and translation.
    for (const entry of sites.readCatalog(document, location.href)) {
      if (entry.isWatch && sites.sameFilm(show, entry) && entry.episodeKey === show.episodeKey
        && (!show.language || entry.language === show.language)) return entry.url;
    }
    return null;
  }
  function hasFilmConflict(a, b) {
    if (!a || !b) return true;
    const sa = a.season || sites.normalize(a.title || a.originalTitle || a.slug).match(/(?:phan|season|part)-(\d+)/)?.[1] || '';
    const sb = b.season || sites.normalize(b.title || b.originalTitle || b.slug).match(/(?:phan|season|part)-(\d+)/)?.[1] || '';
    if (sa && sb && String(sa) !== String(sb)) return true;
    if (a.year && b.year && String(a.year) !== String(b.year)) return true;
    return ['imdb', 'tmdb'].some((k) => a.externalIds?.[k] && b.externalIds?.[k] && a.externalIds[k] !== b.externalIds[k]);
  }
  function candidateMatches(show, cand) {
    if (hasFilmConflict(show, cand)) return false;
    if (sites.sameFilm(show, cand)) return true;
    const st = sites.normalize(show.title);
    const ct = sites.normalize(cand.title);
    const so = sites.normalize(show.originalTitle);
    const co = sites.normalize(cand.originalTitle);
    return !!((st && ct && st === ct) || (so && co && so === co));
  }
  function verifiedSameFilm(show, detail) {
    if (!detail || hasFilmConflict(show, detail)) return false;
    if (sites.sameFilm(show, detail)) return true;
    // Nếu khác slug, chỉ nhận khi không mâu thuẫn tên gốc và khớp chặt tên + năm + mùa.
    const so = sites.normalize(show.originalTitle);
    const doTitle = sites.normalize(detail.originalTitle);
    if (so && doTitle && so !== doTitle) return false;
    const st = sites.normalize(show.title);
    const dt = sites.normalize(detail.title);
    return !!(show.year && detail.year && String(show.year) === String(detail.year)
      && String(show.season || '') === String(detail.season || '') && st && dt && st === dt);
  }
  function pickEpisode(episodes, show) {
    const list = Array.isArray(episodes) ? episodes : [];
    const exact = list.find((ep) => ep.episodeKey === show.episodeKey && (!show.language || ep.language === show.language));
    if (exact) return exact;
    return null;
  }
  async function fetchDoc(targetUrl, signal) {
    const target = sites.url(targetUrl, location.href);
    if (!target || target.origin !== location.origin) throw new Error('cross-origin-blocked');
    const controller = new AbortController();
    const makeErr = (msg, name) => {
      try { return new DOMException(msg, name); } catch (e) { const err = new Error(msg); err.name = name; return err; }
    };
    const timer = setTimeout(() => controller.abort(makeErr('Quá thời gian chờ', 'TimeoutError')), FETCH_TIMEOUT);
    const onAbort = () => controller.abort(signal.reason || makeErr('Đã hủy', 'AbortError'));
    if (signal) {
      if (signal.aborted) { clearTimeout(timer); throw signal.reason || makeErr('Đã hủy', 'AbortError'); }
      signal.addEventListener('abort', onAbort, { once: true });
    }
    try {
      const response = await fetch(target.href, { signal: controller.signal, credentials: 'same-origin' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      if (response.url && sites.url(response.url)?.origin !== location.origin) throw new Error('cross-origin-redirect-blocked');
      const html = await response.text();
      return new DOMParser().parseFromString(html, 'text/html');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
  function rankCandidates(show, list) {
    const unique = new Map();
    for (const item of list) {
      if (!item?.url || !candidateMatches(show, item)) continue;
      if (!unique.has(item.url)) unique.set(item.url, item);
    }
    return [...unique.values()].sort((a, b) => (sites.sameFilm(show, b) ? 1 : 0) - (sites.sameFilm(show, a) ? 1 : 0));
  }
  async function resolveShow(show, signal) {
    const immediate = resumeUrl(show);
    if (immediate) return { status: 'found', url: immediate };
    const candidates = [...rankCandidates(show, sites.readCatalog(document, location.href))];
    if (!candidates.length) {
      for (const query of [show.title, show.originalTitle].filter(Boolean)) {
        const queryUrl = sites.searchUrl(query, undefined, location.href, document);
        if (!queryUrl) continue;
        const searchDoc = await fetchDoc(queryUrl, signal);
        candidates.push(...rankCandidates(show, sites.readCatalog(searchDoc, queryUrl)));
        if (candidates.length) break;
      }
    }
    let matchedDetail = null;
    for (const cand of candidates.slice(0, 3)) {
      const detailDoc = await fetchDoc(cand.url, signal);
      let detail = sites.readDetail(detailDoc, cand.url);
      if (!verifiedSameFilm(show, detail)) continue;
      matchedDetail = detail;
      let episode = pickEpisode(detail.episodes, show);
      if (!episode && !detail.isWatch && detail.episodes.length > 0) {
        const watchDoc = await fetchDoc(detail.episodes[0].url, signal);
        const watchDetail = sites.readDetail(watchDoc, detail.episodes[0].url);
        if (verifiedSameFilm(show, watchDetail)) {
          episode = pickEpisode(watchDetail.episodes, show);
          if (episode) return { status: 'found', url: episode.url, detailUrl: detail.url, detail: watchDetail };
        }
      }
      if (episode) return { status: 'found', url: episode.url, detailUrl: detail.url, detail };
    }
    if (matchedDetail) {
      if (!matchedDetail.episodes.length) return { status: 'needs-hydration', detailUrl: matchedDetail.url, detail: matchedDetail };
      return { status: 'missing-episode', detailUrl: matchedDetail.url, detail: matchedDetail,
        searchUrl: sites.searchUrl(show.title || show.originalTitle || show.slug, null, location.href, document) };
    }
    return { status: 'not-found', searchUrl: sites.searchUrl(show.title || show.originalTitle || show.slug, null, location.href, document) };
  }
  function go(targetUrl) {
    const target = sites.url(targetUrl, location.href);
    if (target && target.origin === location.origin) location.assign(target.href);
  }
  function setPendingResume(show, detailUrl) {
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({
        origin: location.origin, detailUrl, expiresAt: Date.now() + 60000,
        show: { slug: show.slug, film: show.film, title: show.title, originalTitle: show.originalTitle,
          year: show.year, season: show.season, externalIds: show.externalIds, aliases: show.aliases,
          episodeKey: show.episodeKey, language: show.language },
      }));
    } catch (e) {}
  }
  function checkPendingResume() {
    if (window.top !== window || location.pathname === '/') return;
    let pending;
    try { pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null'); } catch (e) { pending = null; }
    if (!pending) return;
    if (pending.origin !== location.origin || (!pendingSelection && (pending.expiresAt || 0) <= Date.now())) {
      clearPendingResume();
      return;
    }
    const detail = sites.readDetail(document, location.href);
    if (!detail || !verifiedSameFilm(pending.show, detail)) return;
    const match = pickEpisode(detail.episodes, pending.show);
    if (match) {
      const target = sites.url(match.url);
      if (!target || target.origin !== location.origin) return;
      if (target.pathname !== location.pathname || target.search !== location.search) {
        if (!pending.show.language) clearPendingResume();
        go(target.href); return;
      }
      const current = sites.read();
      if (!current || current.episodeKey !== pending.show.episodeKey) return;
      const media = bridge.poll();
      if (pendingSelection) {
        const selected = pendingSelection;
        const changed = mediaIdentity(media) !== selected.previous
          || selected.epoch != null && media?.tagName === 'VIDEO' && nativeEpoch(media) !== selected.epoch;
        const confirmed = !selected.expectedSource || verifiedMediaSource(media, selected.expectedSource);
        if (current.language === pending.show.language && mediaIdentity(media) && changed && confirmed
          && media.readyState >= 1 && Number.isFinite(media.duration) && media.duration >= MIN_DURATION) {
          clearPendingResume(); return;
        }
        if (!selected.failed && Date.now() > selected.until) {
          selected.failed = true;
          pendingMessage(selected.node, 'Chưa tải được bản dịch đã lưu. Hãy thử lại hoặc chọn server khác.', () => {
            const nextChoice = sites.translationServers(document, sites.detect()).find((choice) => choice.language === pending.show.language);
            if (!nextChoice) { pendingMessage(selected.node, 'Trang hiện chưa có server của bản dịch đã lưu. Hãy chọn server khác.'); return; }
            delete selected.node.dataset.mcHistoryResume;
            selected.node = nextChoice.node; selected.node.dataset.mcHistoryResume = '1';
            selected.failed = false; selected.until = Date.now() + 20000;
            const currentMedia = bridge.poll();
            selected.previous = mediaIdentity(currentMedia);
            selected.epoch = currentMedia?.tagName === 'VIDEO' ? nativeEpoch(currentMedia) : null;
            selected.expectedSource = sites.url(nextChoice.source || nextChoice.node.dataset.link || nextChoice.node.dataset.src)?.href || '';
            selected.node.click();
            pendingMessage(selected.node, 'Đang mở bản dịch đã lưu…');
          });
        }
        return;
      }
      if (!pending.show.language || current.language === pending.show.language) { clearPendingResume(); return; }
      const choices = sites.translationServers(document, current.family).filter((choice) => choice.language === pending.show.language);
      const choice = choices.find((item) => item.selected) || choices[0];
      const targetSource = choice && sites.url(choice.source || choice.node.dataset.link || choice.node.dataset.src)?.href;
      if (!choice || !mediaIdentity(media) && !targetSource) return;
      pendingSelection = { previous: mediaIdentity(media), epoch: media?.tagName === 'VIDEO' ? nativeEpoch(media) : null,
        expectedSource: targetSource || '',
        until: Date.now() + 20000, node: choice.node, failed: false, pageUrl: location.href };
      choice.node.dataset.mcHistoryResume = '1';
      if (attached) { detach(); attached = null; activeKey = ''; currentInfo = null; }
      pendingMessage(choice.node, 'Đang mở bản dịch đã lưu…');
      choice.node.click();
    } else if (detail.episodes.length > 0) {
      clearPendingResume();
    }
  }

  let section = null;
  let statusBar = null;
  let rendered = '';
  let activeLookup = null;
  function showStatus(text, actions = []) {
    if (!section?.isConnected) return;
    if (!statusBar || !statusBar.isConnected) {
      statusBar = document.createElement('div');
      statusBar.className = 'mh-status';
      statusBar.setAttribute('role', 'status');
      const row = section.querySelector('.mh-row');
      if (row) section.insertBefore(statusBar, row); else section.append(statusBar);
    }
    statusBar.replaceChildren();
    const msg = document.createElement('span');
    msg.textContent = text;
    statusBar.append(msg);
    for (const act of actions) {
      if (act.href) {
        const a = document.createElement('a');
        a.className = act.className || 'mh-action';
        a.href = act.href;
        a.textContent = act.label;
        statusBar.append(a);
      } else if (act.onClick) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = act.className || 'mh-action';
        btn.textContent = act.label;
        btn.addEventListener('click', act.onClick);
        statusBar.append(btn);
      }
    }
  }
  function clearStatus() {
    statusBar?.remove();
    statusBar = null;
  }
  async function openCrossOriginResume(show) {
    activeLookup?.abort();
    const controller = new AbortController();
    activeLookup = controller;
    const label = show.title || show.slug;
    showStatus(`Đang tìm "${label}" trên ${location.hostname}...`, [
      { label: 'Hủy', className: 'mh-cancel', onClick: () => { controller.abort(); if (activeLookup === controller) activeLookup = null; showStatus('Đã hủy tìm phim.', [{ label: 'Đóng', className: 'mh-dismiss', onClick: clearStatus }]); } },
    ]);
    try {
      const result = await resolveShow(show, controller.signal);
      if (controller.signal.aborted || activeLookup !== controller) return;
      activeLookup = null;
      if (result.status === 'found') {
        if (show.language) setPendingResume(show, result.url);
        showStatus(`Đang mở trên ${location.hostname}...`, [{ label: 'Mở ngay', className: 'mh-target-link', href: result.url }]);
        go(result.url);
      } else if (result.status === 'needs-hydration') {
        setPendingResume(show, result.detailUrl);
        showStatus(`Đang mở trang phim trên ${location.hostname}...`, [{ label: 'Mở trang phim', className: 'mh-detail-link', href: result.detailUrl }]);
        go(result.detailUrl);
      } else if (result.status === 'missing-episode') {
        const actions = [{ label: 'Mở trang phim', className: 'mh-detail-link', href: result.detailUrl }];
        if (result.searchUrl) actions.push({ label: 'Tìm trên trang', className: 'mh-search-link', href: result.searchUrl });
        actions.push({ label: 'Đóng', className: 'mh-dismiss', onClick: clearStatus });
        showStatus(`Đã thấy "${label}" nhưng chưa có đúng tập/bản dịch trên ${location.hostname}.`, actions);
      } else {
        const actions = [];
        if (result.searchUrl) actions.push({ label: `Tìm "${label}" trên ${location.hostname}`, className: 'mh-search-link', href: result.searchUrl });
        actions.push({ label: 'Đóng', className: 'mh-dismiss', onClick: clearStatus });
        showStatus(`Không tìm thấy đúng phim khớp trên ${location.hostname}.`, actions);
      }
    } catch (err) {
      if (controller.signal.aborted || activeLookup !== controller) return;
      activeLookup = null;
      const searchFallback = sites.searchUrl(show.title || show.originalTitle || show.slug, null, location.href, document);
      const isTimeout = err?.name === 'TimeoutError';
      const actions = [{ label: 'Thử lại', className: 'mh-retry', onClick: () => openCrossOriginResume(show) }];
      if (searchFallback) actions.push({ label: 'Tìm trên trang', className: 'mh-search-link', href: searchFallback });
      actions.push({ label: 'Đóng', className: 'mh-dismiss', onClick: clearStatus });
      showStatus(`${isTimeout ? 'Hết thời gian chờ' : 'Không tải được dữ liệu'} khi tìm "${label}" trên ${location.hostname}.`, actions);
    }
  }
  function isMountedAt(el, mount) {
    if (!el?.isConnected || !mount?.anchor) return false;
    return mount.position === 'before'
      ? el.nextElementSibling === mount.anchor
      : el.parentElement === mount.anchor && mount.anchor.firstElementChild === el;
  }
  function clearFixedHeader(el) {
    if (!el?.isConnected || typeof el.getBoundingClientRect !== 'function') return;
    let headerBottom = 0;
    for (const h of document.querySelectorAll('header,.apx-site-header,.myui-header__top,.head-main-nav')) {
      const pos = getComputedStyle(h).position;
      if (pos !== 'fixed' && pos !== 'sticky') continue;
      const r = h.getBoundingClientRect();
      if (r.height > 0 && r.height < 220 && r.top <= 4) headerBottom = Math.max(headerBottom, r.bottom);
    }
    if (!headerBottom) { el.style.marginTop = ''; return; }
    const currentOffset = parseFloat(el.style.marginTop || '0') || 0;
    const baseTop = el.getBoundingClientRect().top + (window.scrollY || 0) - currentOffset;
    if (baseTop < headerBottom + 8) el.style.marginTop = Math.ceil(headerBottom + 8 - baseTop) + 'px';
    else el.style.marginTop = '';
  }
  function ensureStyle() {
    if (!style.isConnected) (document.head || document.documentElement).append(style);
  }
  function renderHistory() {
    ensureStyle();
    if (window.top !== window || location.pathname !== '/' || storageError) {
      activeLookup?.abort(); activeLookup = null; clearStatus();
      section?.remove(); section = null; rendered = ''; return;
    }
    const shows = db.shows.filter((s) => !s.finished).slice(0, MAX_SHOWS);
    const signature = location.hostname + JSON.stringify(shows);
    if (!shows.length) { section?.remove(); section = null; rendered = ''; return; }
    const mount = sites.homeMount();
    if (!mount) return;
    const mounted = isMountedAt(section, mount);
    if (mounted && signature === rendered) { clearFixedHeader(section); return; }
    if (!section) {
      section = document.createElement('section'); section.id = 'dang-xem-do'; section.className = 'mh-continue';
    }
    if (!mounted) {
      if (mount.position === 'before') mount.anchor.before(section); else mount.anchor.prepend(section);
    }
    clearFixedHeader(section);
    if (section.isConnected && signature === rendered && section.querySelector('.mh-row')) return;
    const preservedStatus = statusBar?.isConnected ? statusBar : null;
    section.replaceChildren();
    const heading = document.createElement('h2'); heading.textContent = 'Đang xem dở'; section.append(heading);
    if (preservedStatus) section.append(preservedStatus);
    const row = document.createElement('div'); row.className = 'mh-row'; section.append(row);
    for (const show of shows) {
      const card = document.createElement('article'); card.className = 'mh-card';
      const link = document.createElement('a'); const target = resumeUrl(show);
      if (target) {
        link.href = target;
        if (show.language) link.addEventListener('click', () => setPendingResume(show, target));
      } else {
        link.href = sites.searchUrl(show.title || show.originalTitle || show.slug, null, location.href, document) || '#dang-xem-do';
        link.addEventListener('click', (event) => {
          event.preventDefault();
          openCrossOriginResume(show);
        });
      }
      const poster = sites.url(show.poster);
      if (poster) { const img = document.createElement('img'); img.src = poster.href; img.alt = ''; img.loading = 'lazy'; link.append(img); }
      const title = document.createElement('strong'); title.textContent = show.title || show.slug; link.append(title);
      if (show.duration > 0) {
        const progress = document.createElement('progress'); progress.max = show.duration; progress.value = Math.min(show.position || 0, show.duration);
        progress.setAttribute('aria-label', 'Tiến độ xem'); progress.style.width = '100%'; link.append(progress);
      }
      const remaining = show.position > 0 ? `còn ${Math.max(0, Math.ceil(((show.duration || 0) - show.position) / 60))} phút` : 'chưa xem';
      const note = document.createElement('span'); note.textContent = `${show.episode || ''} · ${remaining}${target ? ' · ' + new URL(target).hostname : ' · tìm trên ' + location.hostname}`; link.append(note);
      const close = document.createElement('button'); close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', 'Xóa lịch sử ' + (show.title || show.slug)); close.addEventListener('click', () => remove(show.id));
      card.append(link, close); row.append(card);
    }
    rendered = signature;
  }
  function addMenu() {
    if (window.top !== window || document.querySelector('.mh-menu')) return;
    const nav = document.querySelector('.phoneContent .main-menu,.apx-primary-nav,.head-main-nav ul,.myui-header__menu,header nav,.main-menu');
    if (!nav) return;
    const link = document.createElement('a'); link.className = 'mh-menu'; link.href = '/?lich-su#dang-xem-do'; link.textContent = 'LỊCH SỬ XEM';
    if (/^(UL|OL)$/.test(nav.tagName)) { const li = document.createElement('li'); li.append(link); nav.append(li); } else nav.append(link);
  }
  const style = document.createElement('style');
  style.id = 'mh-style';
  style.textContent = `.mh-continue{box-sizing:border-box;width:100%;max-width:1200px;margin:12px auto 20px;padding:12px;border-radius:8px;color:#fff;background:#171717;position:relative;z-index:1;overflow:hidden}.mh-continue h2{font:600 18px/1.3 sans-serif;margin:0 0 10px}.mh-status{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 10px;padding:8px 10px;border-radius:6px;background:#242424;font:13px/1.4 sans-serif;color:#eee}.mh-status a,.mh-status button{padding:4px 10px;border-radius:4px;border:1px solid #555;background:#333;color:#fff;font:12px sans-serif;text-decoration:none;cursor:pointer}.mh-row{display:flex;gap:12px;overflow-x:auto;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity}.mh-card{position:relative;flex:0 0 132px;scroll-snap-align:start}.mh-card a{display:block;color:inherit;text-decoration:none}.mh-card img{display:block;width:100%;height:186px;object-fit:cover;border-radius:6px}.mh-card strong,.mh-card span{display:block;margin:6px 0;font:13px/1.35 sans-serif}.mh-card span{font-size:12px;color:#bbb}.mh-card button{position:absolute;top:4px;right:4px;min-width:28px;min-height:28px;line-height:1;border:0;border-radius:50%;background:#222d;color:#fff;font-size:20px;cursor:pointer}.mh-menu{color:inherit;white-space:nowrap;padding:8px}@media (min-width:640px){.mh-continue{margin:16px auto 24px;padding:16px}.mh-continue h2{font-size:21px;margin-bottom:12px}.mh-row{gap:14px}.mh-card{flex:0 0 150px}.mh-card img{height:210px}.mh-card strong{font-size:14px}}`;
  let recoverQueued = false;
  function scheduleRecover() {
    if (recoverQueued) return;
    recoverQueued = true;
    queueMicrotask(() => {
      recoverQueued = false;
      ensureStyle();
      checkPendingResume();
      renderHistory();
      addMenu();
      poll();
    });
  }
  function ready() {
    ensureStyle();
    loaded.then(() => {
      checkPendingResume(); poll(); clearLegacyPosition(); renderHistory(); addMenu();
      if (typeof MutationObserver === 'function' && document.documentElement) {
        new MutationObserver(() => {
          const needsMount = location.pathname === '/' && db.shows.some((s) => !s.finished)
            && (!section?.isConnected || !isMountedAt(section, sites.homeMount()));
          const needsMenu = !document.querySelector('.mh-menu');
          if (!style.isConnected || needsMount || needsMenu || sessionStorage.getItem(PENDING_KEY)) scheduleRecover();
        }).observe(document.documentElement, { childList: true, subtree: true });
      }
      window.addEventListener('popstate', scheduleRecover);
      window.addEventListener('resize', () => clearFixedHeader(section));
      setInterval(() => { checkPendingResume(); poll(); clearLegacyPosition(); renderHistory(); addMenu(); }, 1000);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true }); else ready();
  const refresh = () => loaded.then(async () => {
    if (!storageError) { try { db = await readDB() || db; renderHistory(); } catch (error) { console.warn('[Motchill history] Không đọc được cập nhật từ tab khác.', error); } }
  });
  window.addEventListener('pageshow', refresh);
  window.addEventListener('focus', refresh);
  setInterval(refresh, 15000);
  // END MOTCHILL ENTRY
  });
});
})();