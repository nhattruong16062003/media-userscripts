// Generated from lib/sites/index.js and family fragments; do not edit.
// Site permissions and source-contract dispatcher. Root scripts/build.mjs embeds this in four Motchill userscripts.
// Không sửa các bản sao giữa BEGIN/END MOTCHILL SITES trong file cài đặt.
function createMotchillSites() {
  const families = Object.freeze({
    CLASSIC: 'ophim-classic', OPHIM: 'ophim', NEXT: 'nextjs', NEXT_REVIVE: 'next-revive',
    APIPHIM: 'apiphim', DOO: 'dooplay', MYUI: 'myui', CHIBIFLIX: 'chibiflix', WRAPPER: 'iframe-wrapper', UNKNOWN: 'unknown',
  });
  // Phạm vi player iframe đã khảo sát, KHÔNG phải bảng domain -> version.
  // Website đổi domain vẫn được detect() bằng DOM/asset; host player mới cần xác minh.
  // VIP3 live evidence: motchillcu.mx → https://v8.streamvsmov.com/video/dab93816-bb48-4c62-891a-ad946b509ae5 (JWPlayer, 2026-11-13).
  // motchillf.im sv-1/sv-2 (2026-11-13) declares the exact NC embed.php hosts
  // below; NC currently returns a Cloudflare challenge. VSM v9 was HTTP200,
  // with the same JW player/origin.js schema as the verified v8 player.
  // Tập 35 sv-1 do người dùng cung cấp (2026-11-14) khai báo embed11.
  // motchillv.online sv-2 (2026-11-21): player.cloudbeta.win/embed/... (JW 8.38.8).
  // motchillfv.help (2026-11-21): embed10/15/18.streamc.xyz/embed.php (Stream Panel R25 JW 8.51.3).
  // motchillkd.online / motchillkd.net / motchillv.online / motchillfv.help (2026-11-22):
  // live HTTP 200 verified shards: embed14.streamc.xyz (Stream Panel R25 JW)
  // and v2/v3/v4/v6/v10/v11/v12/v14/v15.streamvsmov.com/video/* (JW + origin.js).
  // Quyền origin riêng; không coi hostname là bằng chứng về engine bên trong.
  const embedHosts = new Set(['api.clubc.live', 'fcloud.live', 'player.phimapi.com', 'maztoycdn.xyz', 'player.cbplay.cc', 'player.cloudbeta.win', 'cdn.loadvid.com', 'embed13.streamc.xyz', 'embed1.streamc.xyz', 'embed12.streamc.xyz', 'embed2.streamc.xyz', 'embed11.streamc.xyz', 'embed10.streamc.xyz', 'embed14.streamc.xyz', 'embed15.streamc.xyz', 'embed18.streamc.xyz', 'v2.streamvsmov.com', 'v3.streamvsmov.com', 'v4.streamvsmov.com', 'v6.streamvsmov.com', 'v8.streamvsmov.com', 'v9.streamvsmov.com', 'v10.streamvsmov.com', 'v11.streamvsmov.com', 'v12.streamvsmov.com', 'v14.streamvsmov.com', 'v15.streamvsmov.com']);
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
    return joined.match(/(?:^|-)(?:phan|season|part)-(\d{1,3})(?:-|$)/)?.[1] || '';
  };
  const safeDecode = (value) => { try { return decodeURIComponent(value); } catch (_) { return value; } };
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
      'maztoycdn.xyz': /^\/watch\//, 'player.cbplay.cc': /^\/embed\//, 'player.cloudbeta.win': /^\/embed\//,
      'cdn.loadvid.com': /^\/videos\/play\//, 'embed13.streamc.xyz': /^\/.+/,
      'embed1.streamc.xyz': /^\/embed\.php$/, 'embed12.streamc.xyz': /^\/embed\.php$/, 'embed2.streamc.xyz': /^\/embed\.php$/,
      'embed11.streamc.xyz': /^\/embed\.php$/, 'embed10.streamc.xyz': /^\/embed\.php$/, 'embed14.streamc.xyz': /^\/embed\.php$/, 'embed15.streamc.xyz': /^\/embed\.php$/, 'embed18.streamc.xyz': /^\/embed\.php$/,
      'v2.streamvsmov.com': /^\/video\//, 'v3.streamvsmov.com': /^\/video\//, 'v4.streamvsmov.com': /^\/video\//, 'v6.streamvsmov.com': /^\/video\//,
      'v8.streamvsmov.com': /^\/video\//, 'v9.streamvsmov.com': /^\/video\//, 'v10.streamvsmov.com': /^\/video\//, 'v11.streamvsmov.com': /^\/video\//,
      'v12.streamvsmov.com': /^\/video\//, 'v14.streamvsmov.com': /^\/video\//, 'v15.streamvsmov.com': /^\/video\//,
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
    // https://motchillsc.mom/ + /phim-bo/… + /tap-phim/…-tap-1 (2026-11-21): the same DooPlay 2.5
    // under a renamed theme folder. Theme folder names are deployment choices; the
    // contract is DooPlay's own enqueue handle on its own asset path (pathname only).
    const dooAsset = [...doc.querySelectorAll('link#dooplay-css[href],script#dt_main_ajax-js[src]')].some((el) => {
      const asset = url(el.getAttribute('href') || el.getAttribute('src'), pageUrl)?.pathname || '';
      return el.id === 'dooplay-css' ? /\/themes\/[^/]+\/assets\/css\/front\.style\.min\.css$/.test(asset)
        : /\/themes\/[^/]+\/assets\/js\/front\.ajax\.min\.js$/.test(asset);
    });
    if (/\/themes\/motchill2\//.test(sources) || dooAsset || doc.querySelector('.dooplay_player,#dooplay_player_response')) return families.DOO;
    // Dẫn chứng live: https://motchillv.fun/phim/thuong-cong-chua/tap-1 (Yii + MyUI).
    if (/\/themes\/motchill\/.*yii\.js/.test(sources) || doc.querySelector('.myui-header__top')) return families.MYUI;
    // Dẫn chứng live 2026-11-21: https://motchillfv.help/ + /phim/100-ngay-lua-doi/ + /xem-phim/100-ngay-lua-doi-tap-1/?sv=vietsub-1 (theme chibiflix).
    if (/\/themes\/chibiflix\//.test(sources) || doc.body?.classList.contains('wp-theme-chibiflix')) return families.CHIBIFLIX;
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
      case families.DOO: return dooAdapter(doc, pageUrl); // motchillkd.net, motchillsc.mom
      case families.MYUI: return myuiAdapter(doc, pageUrl); // motchillv.fun
      case families.CHIBIFLIX: return chibiflixAdapter(doc, pageUrl); // motchillfv.help
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
  // React Flight framing, data only (never evaluated): `<hexId>:<tag><payload>`.
  // Text (T) and binary tags carry `<hexByteLength>,` and exactly that many
  // UTF-8 BYTES with no trailing newline; every other row ends at '\n'. Live
  // motchill68.tv: `22:T789,<JSON-LD with Vietnamese>9:[...episodes]`. String
  // indices are UTF-16 units, so framing is done on bytes, never on split('\n').
  const FLIGHT_LENGTH_TAGS = new Set([84, 65, 79, 111, 85, 83, 115, 76, 108, 71, 103, 77, 109, 86]);
  function utf8Encode(value, out) {
    for (let i = 0; i < value.length; i++) {
      let c = value.charCodeAt(i);
      if (c >= 0xd800 && c < 0xdc00 && i + 1 < value.length) {
        const low = value.charCodeAt(i + 1);
        if (low >= 0xdc00 && low < 0xe000) { c = 0x10000 + ((c - 0xd800) << 10) + (low - 0xdc00); i++; }
      }
      if (c >= 0xd800 && c < 0xe000) c = 0xfffd; // lone surrogate, as TextEncoder
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | c >> 6, 0x80 | c & 63);
      else if (c < 0x10000) out.push(0xe0 | c >> 12, 0x80 | c >> 6 & 63, 0x80 | c & 63);
      else out.push(0xf0 | c >> 18, 0x80 | c >> 12 & 63, 0x80 | c >> 6 & 63, 0x80 | c & 63);
    }
  }
  function utf8Decode(bytes, start, end) {
    const cont = (i) => i < end && (bytes[i] & 0xc0) === 0x80;
    let out = '', codes = [];
    for (let i = start; i < end;) {
      const b = bytes[i];
      let c = 0xfffd, size = 1;
      if (b < 0x80) c = b;
      else if (b >= 0xc2 && b < 0xe0 && cont(i + 1)) { c = (b & 31) << 6 | bytes[i + 1] & 63; size = 2; }
      else if (b >= 0xe0 && b < 0xf0 && cont(i + 1) && cont(i + 2)) {
        c = (b & 15) << 12 | (bytes[i + 1] & 63) << 6 | bytes[i + 2] & 63; size = 3;
        if (c < 0x800 || c >= 0xd800 && c < 0xe000) c = 0xfffd;
      } else if (b >= 0xf0 && b < 0xf5 && cont(i + 1) && cont(i + 2) && cont(i + 3)) {
        c = (b & 7) << 18 | (bytes[i + 1] & 63) << 12 | (bytes[i + 2] & 63) << 6 | bytes[i + 3] & 63; size = 4;
        if (c < 0x10000 || c > 0x10ffff) c = 0xfffd;
      }
      codes.push(c); i += size;
      if (codes.length >= 4096) { out += String.fromCodePoint(...codes); codes = []; }
    }
    return out + String.fromCodePoint(...codes);
  }
  function flightRows(bytes) {
    const rows = new Map(), n = bytes.length;
    const hex = (b) => b >= 48 && b <= 57 || b >= 97 && b <= 102 || b >= 65 && b <= 70;
    const lineEnd = (from) => { let i = from; while (i < n && bytes[i] !== 10) i++; return i; };
    let pos = 0;
    while (pos < n) {
      let colon = pos;
      while (colon < n && colon - pos < 16 && hex(bytes[colon])) colon++;
      if (colon === pos || bytes[colon] !== 58) { pos = lineEnd(pos) + 1; continue; }
      const id = String.fromCharCode(...bytes.slice(pos, colon)), tag = bytes[colon + 1];
      if (FLIGHT_LENGTH_TAGS.has(tag)) {
        let cursor = colon + 2, length = 0;
        while (cursor < n && cursor - colon - 2 < 8 && hex(bytes[cursor])) length = length * 16 + parseInt(String.fromCharCode(bytes[cursor++]), 16);
        // Malformed header: resynchronise at the next newline like the old reader.
        if (cursor === colon + 2 || bytes[cursor] !== 44) { pos = lineEnd(colon) + 1; continue; }
        const start = cursor + 1, end = start + length;
        // Incomplete record: the remaining bytes are its payload, never new rows.
        if (end > n) break;
        if (tag === 84) rows.set(id, utf8Decode(bytes, start, end));
        pos = end; continue;
      }
      const end = lineEnd(colon + 1);
      try { rows.set(id, JSON.parse(utf8Decode(bytes, colon + 1, end))); } catch { /* tagged/non-JSON Flight record */ }
      pos = end + 1;
    }
    return rows;
  }
  function nextData(doc = document, pageUrl = location.href) {
    const scripts = [...doc.querySelectorAll('script')].filter((s) => s.textContent.trim().startsWith('self.__next_f.push('));
    const parsedPage = url(pageUrl);
    const path = parsedPage ? parsedPage.pathname + parsedPage.search : '';
    const cacheKey = path + ':' + scripts.length + ':' + (scripts.at(-1)?.textContent.length || 0);
    const cached = flightCache.get(doc);
    if (cached?.key === cacheKey) return cached.pages;
    const pages = [], bytes = [];
    for (const script of scripts) {
      try {
        const arg = script.textContent.trim().slice('self.__next_f.push('.length).replace(/\);?\s*$/, '');
        const entry = JSON.parse(arg);
        // Next.js inline RSC: [1,text] and [3,base64 bytes] are parts of ONE byte
        // stream; [0] bootstrap and [2] form state are not Flight rows.
        if (!Array.isArray(entry) || typeof entry[1] !== 'string') continue;
        if (entry[0] === 1) utf8Encode(entry[1], bytes);
        else if (entry[0] === 3) { const binary = atob(entry[1]); for (let i = 0; i < binary.length; i++) bytes.push(binary.charCodeAt(i)); }
      } catch (e) { /* script khác */ }
    }
    const rows = flightRows(bytes);
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
    const frame=frames[0],source=url(frame.getAttribute('src'),pageUrl);
    // A persistent engine can change resource without navigating its iframe.
    // The assignment is valid only for this exact document source AND route.
    const assignment=frame.dataset.mcProviderSource===source?.href && frame.dataset.mcProviderPath===parsed.path ? frame.dataset.mcProviderId:null;
    const id=assignment || source?.pathname.match(/^\/embed\/([1-9]\d*)\/?$/)?.[1];
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
    const slug = safeDecode(match[1]);
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
    ], '.episodiotitle a[href],.episodios a[href],a[href*="/xem-phim/"],a[href*="/tap-phim/"]', doc, pageUrl);
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


/* adapter:chibiflix.js */
  function chibiflixAdapter(doc, pageUrl) {
    // Live 2026-11-21: https://motchillfv.help/ + /phim/100-ngay-lua-doi/ + /xem-phim/100-ngay-lua-doi-tap-1/?sv=vietsub-1
    return baseAdapter(families.CHIBIFLIX, [
      { selector: '#wrapper .row-content', position: 'before' },
      { selector: '#wrapper .fluid-gap', position: 'prepend' },
      { selector: '#wrapper', position: 'prepend' },
      { selector: 'main', position: 'prepend' },
      { selector: 'body', position: 'prepend' },
    ], '#episodes-list .de-eps[data-server] a.item[href],#episodes-list .de-type a.item[href],.de-eps[data-server] a.item[href],.de-type a.item[href]', doc, pageUrl);
  }
  function chibiflixServers(doc = document, pageUrl = url(doc.URL)?.href || location.href) {
    const page = url(pageUrl, location.href);
    const currentRoute = page ? route(page.href, families.CHIBIFLIX, page.href) : null;
    const currentKey = currentRoute ? episodeKey(currentRoute.episode) : '';
    const activeSv = page?.searchParams.get('sv') || '';
    const boxes = [...doc.querySelectorAll('.de-eps[data-server]')];
    if (boxes.length) {
      const items = boxes.map((box) => {
        const serverId = box.getAttribute('data-server') || '';
        const tab = [...doc.querySelectorAll('.v-tabs-min .nav-link[data-server]')].find((el) => el.getAttribute('data-server') === serverId);
        const links = [...box.querySelectorAll('a.item[href]')];
        const epLink = (currentKey && links.find((a) => {
          const target = url(a.getAttribute('href'), page?.href);
          const parsed = target && route(target.href, families.CHIBIFLIX, page?.href);
          return parsed && parsed.slug === currentRoute.slug && episodeKey(parsed.episode) === currentKey;
        })) || links.find((a) => a.classList.contains('on-air') || a.classList.contains('active')) || null;
        const label = text(tab) || serverId;
        const language = translationKey(label) || translationKey(serverId);
        return { node: epLink || tab || box, serverId, tab, epLink, label, language, source: '' };
      }).filter((entry) => entry.language);
      const hasSvMatch = !!activeSv && items.some((entry) => entry.serverId === activeSv);
      const hasOnAir = items.some((entry) => entry.epLink?.classList.contains('on-air') || entry.epLink?.classList.contains('active'));
      return items.map(({ node, serverId, tab, epLink, label, language, source }) => ({
        node, label, language, source,
        selected: hasSvMatch ? serverId === activeSv
          : hasOnAir ? !!(epLink?.classList.contains('on-air') || epLink?.classList.contains('active'))
          : !!tab?.classList.contains('active'),
      }));
    }
    const movies = [...doc.querySelectorAll('#episodes-list .de-type a.item[href],.de-type a.item[href]')].map((a) => {
      const target = url(a.getAttribute('href'), page?.href);
      const sv = target?.searchParams.get('sv') || '';
      const label = text(a.querySelector('.ver')) || sv || text(a);
      const language = translationKey(label) || translationKey(sv);
      return { node: a, sv, label, language, source: '' };
    }).filter((entry) => entry.language);
    const hasSvMatch = !!activeSv && movies.some((entry) => entry.sv === activeSv);
    return movies.map(({ node, sv, label, language, source }) => ({
      node, label, language, source,
      selected: hasSvMatch ? sv === activeSv : node.classList.contains('active') || node.classList.contains('on-air'),
    }));
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
        return { slug: safeDecode(match[1]), episode: 'tap-' + Number(number), path: path + target.search };
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
        // Live: https://motchillsc.mom/tap-phim/hom-nay-troi-do-mua-bong-may-tap-1 (DooPlay episodes post type).
        match = path.match(/^\/(?:xem-phim|tap-phim)\/(.+)-tap-(\d+)\/?$/);
        if (match) return { slug: match[1], episode: 'tap-' + match[2], path };
        return null;
      case families.CHIBIFLIX:
        // Live: https://motchillfv.help/xem-phim/100-ngay-lua-doi-tap-1/?sv=vietsub-1
        match = path.match(/^\/xem-phim\/(.+)-tap-(\d+|full)\/?$/i);
        if (!match) return null;
        return { slug: match[1], episode: match[2].toLowerCase() === 'full' ? 'full' : 'tap-' + match[2], path: path + target.search };
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
      case families.OPHIM: case families.NEXT: case families.NEXT_REVIVE: case families.MYUI: case families.CHIBIFLIX:
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
      case families.CLASSIC: case families.OPHIM: case families.APIPHIM: case families.DOO: case families.CHIBIFLIX: {
        const out = new URL('/', base.origin);
        out.searchParams.set('s', q);
        return out.href;
      }
      default: return null;
    }
  }
  function episodeKey(value) {
    const normalized = normalize(value);
    if (/^(?:(?:[a-z]+-)?(?:tap|episode|ep)-|[a-z]-)?(?:full|full-hd|hoan-tat|movie)(?:-(?:sv|src)-.*)?$/.test(normalized)) return 'full';
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
    let rawTitle = data.name || movie.name || text(doc.querySelector('h1.movie-identity__title,h1.epih1,h1.title:not(:empty),.sheader .data h1,.movie-title,.title-1,.media-name')) || text(doc.querySelector('h1:not(.apiphim-ads-text):not(:empty)')) || doc.title;
    let rawOriginal = data.origin_name || movie.alternateName || text(doc.querySelector('.movie-identity__origin,h2.real-name,h2.origtitle,h2.title2,.sheader .extra .tagline,.alias-name')) || '';
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
    const chibiflixYear = family === families.CHIBIFLIX ? [...doc.querySelectorAll('.detail-more .hl-tags .tag-classic span,.hl-tags .tag-classic span')].map(text)
      .find((value) => /^(?:19|20)\d{2}$/.test(value)) : '';
    const yearText = data.publish_year || data.year || text(doc.querySelector('.origyear,.movie-year,.movie-identity__year,.apx-hero-fact--year,.publish-year,.sheader .date')) || nextProductionYear || chibiflixYear;
    const year = String(yearText || '').match(/\b(?:19|20)\d{2}\b/)?.[0] || extractTitleYear(rawTitle, rawOriginal, doc.title);
    const season = extractSeason(cleanedTitle, originalTitle, slug);
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
    const candidates = [linkEl?.closest?.('.control-box,.tab-pane,.de-eps')?.getAttribute('data-server'),
      text(linkEl?.querySelector?.('.ver')), url(linkEl?.getAttribute?.('href'), doc?.URL || location.href)?.searchParams.get('sv'),
      variant?.server, apxLabel, groupLabel, text(tabLabel), data?.lang, data?.language, fallbackLabel];
    return candidates.map(translationKey).find(Boolean) || '';
  }
  function translationServers(doc, family, pageUrl) {
    const resolvedUrl = pageUrl || url(doc.URL)?.href || url(doc.location?.href)?.href || location.href;
    if (family === families.CHIBIFLIX) return chibiflixServers(doc, resolvedUrl);
    if(family===families.NEXT){
      const state=nextProviderState(doc,resolvedUrl);
      if(state)return nextProviderButtons(doc,resolvedUrl).map(node=>{
        const label=node.dataset.mcNativeLabel || text(node),matches=state.data.movie.episodes.filter(ep=>ep && ep.slug===state.episode.slug && ep.server===label && ep.type==='m3u8');
        return {node,label,language:translationKey(label),selected:label===state.episode.server,
          source:matches.length===1?new URL('/embed/'+matches[0].id,state.source).href:''};
      }).filter((entry) => entry.language);
    }
    if (family === families.NEXT_REVIVE) {
      const page = url(resolvedUrl, location.href);
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
        const parsed = route(resolvedUrl, family);
        const data = parsed && nextData(doc, resolvedUrl).find((entry) => entry.movie?.slug === parsed.slug);
        const matches = [...(data?.episodeVariants || []), ...(data?.movie?.episodes || [])].filter((ep) => ep && episodeKey(ep.slug) === episodeKey(parsed?.episode)
          && normalize(ep.server) === normalize(label.replace(/^server\s+/i, '')));
        const candidates = [...new Set(matches.filter((ep) => (ep.type || 'm3u8') === 'm3u8').map((ep) => url(ep.link, resolvedUrl)?.href).filter(Boolean))];
        if (candidates.length === 1) source = candidates[0];
      }
      return { language, label, selected, node, source };
    }).filter((entry) => entry?.language);
  }
  function currentServerLanguage(doc, family, pageUrl) {
    const choices = translationServers(doc, family, pageUrl);
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
    const current = allSelectorLinks.find((a) => {
      const target = url(a.getAttribute('href'), page.href);
      return target && target.pathname.replace(/\/$/, '') === currentPath && target.search === page.search;
    }) || allSelectorLinks.find((a) => {
      const target = url(a.getAttribute('href'), page.href);
      return target && target.pathname.replace(/\/$/, '') === currentPath && (a.classList.contains('on-air') || a.classList.contains('active'));
    }) || allSelectorLinks.find((a) => url(a.getAttribute('href'), page.href)?.pathname.replace(/\/$/, '') === currentPath);
    const links = allSelectorLinks.filter((a) => {
      const target = url(a.getAttribute('href'), page.href);
      const other = target && target.origin === page.origin && route(target.href, family, page.href);
      return other && other.slug === currentRoute.slug;
    });
    const siblings = current?.closest('.list-episode,.tab-pane,.apx-episode-grid,ul,.episodios,.de-eps,.de-type') || current?.parentElement;
    const grouped = siblings ? links.filter((a) => siblings.contains(a)) : links;
    const number = Number(episodeKey(currentRoute.episode).replace('ep:', ''));
    const next = grouped.map((a) => {
      const target = url(a.getAttribute('href'), page.href);
      return { node: a, target, parsed: target ? route(target.href, family, page.href) : null };
    }).filter((x) => x.parsed && x.target && Number(episodeKey(x.parsed.episode).replace('ep:', '')) === number + 1)[0];
    const provider=family===families.NEXT?nextProviderState(doc,page.href):null;
    const selectedLanguage = provider?translationKey(provider.episode.server):currentServerLanguage(doc, family, page.href);
    const routeVariants = meta.rsc?.episodeVariants?.filter((v) => v?.slug === currentRoute.episode) || [];
    const ambiguousLanguage = family === families.NEXT && !selectedLanguage
      && new Set(routeVariants.map((v) => translationKey(v.server)).filter(Boolean)).size > 1;
    // Several actual language variants share k-tap-01. The SSR server buttons
    // are all unselected until hydration; array order is not selection evidence.
    const variant = provider?.episode || !ambiguousLanguage && routeVariants.find((v) => v.slug === currentRoute.episode
      && (!selectedLanguage || translationKey(v.server) === selectedLanguage));
    const rscNext = (provider?.data.movie.episodes || meta.rsc?.serverEpisodes)?.find((v) => v && v.server === variant?.server && Number(episodeKey(v.slug).replace('ep:', '')) === number + 1 && (!provider || v.type==='m3u8'));
    const epLabel = (node, fallback) => text(node?.querySelector?.('.ep-sort,.media-title')) || text(node) || fallback;
    const label = variant?.name || (current ? epLabel(current, currentRoute.episode) : currentRoute.episode);
    const language = ambiguousLanguage ? '' : selectedLanguage || linkLanguage(current, doc, variant, meta.data, label);
    return { ...currentRoute, family, title: meta.title, originalTitle: meta.originalTitle,
      year: meta.year, season: meta.season, language, server:variant?.server || '',externalIds: meta.externalIds,
      film: meta.film, episodeKey: episodeKey(currentRoute.episode), poster: meta.poster,
      episode: label, url: page.href, next: rscNext ? {
        path: '/phim/' + currentRoute.slug + '/' + rscNext.slug, episode: rscNext.name, episodeKey: episodeKey(rscNext.slug), server:rscNext.server,language,
        url: new URL('/phim/' + currentRoute.slug + '/' + rscNext.slug, page.origin).href,
      } : next ? { path: next.parsed.path, episode: epLabel(next.node, next.parsed.episode), episodeKey: episodeKey(next.parsed.episode), url: next.target.href } : null,
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
    const isSamePageHash = (raw, target) => raw.trim().startsWith('#')
      || (!!target.hash && target.origin === page.origin && target.pathname === page.pathname && target.search === page.search);
    const scanLinks = (sel) => [...doc.querySelectorAll(sel || ':not(*)')].filter((a) => {
      if (a.closest('.mh-continue')) return false;
      const raw = a.getAttribute('href') || '';
      const target = url(raw, page.href);
      if (!target || isSamePageHash(raw, target)) return false;
      const other = target.origin === page.origin && route(target.href, resolvedFamily, page.href);
      return other && other.slug === parsed.slug;
    });
    // Read all language tabs of this film, not just the currently active server.
    // MyUI example: https://motchillv.fun/phim/thuong-cong-chua/tap-1
    let domLinks = scanLinks(resolvedFamily === families.MYUI
      ? '#servers-container .tab-pane a[href],.myui-content__list a[href]' : selector);
    if (!domLinks.length) domLinks = scanLinks('a[href]');
    for (const a of domLinks) {
      const target = url(a.getAttribute('href'), page.href);
      target.hash = '';
      const other = route(target.href, resolvedFamily, page.href);
      const epText = text(a.querySelector?.('.ep-sort,.media-title')) || text(a) || other.episode;
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
    if (watch && resolvedFamily !== families.CHIBIFLIX) for (const entry of translationServers(doc, resolvedFamily, page.href)) {
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
      const rawHref = a.getAttribute('href') || '';
      if (rawHref.trim().startsWith('#')) continue;
      const target = url(rawHref, page.href);
      if (!target || target.origin !== page.origin) continue;
      if (target.hash && target.pathname === page.pathname && target.search === page.search) continue;
      target.hash = '';
      const watch = route(target.href, resolvedFamily, page.href);
      const detail = !watch && detailRoute(target.href, resolvedFamily, page.href);
      const parsed = watch || detail;
      if (!parsed) continue;
      const card = a.closest('article,li,.item,.film-item,.movie-card,.apx-card,.myui-vodlist__box,.sw-cover,.sw-item,.h-item,.swiper-slide');
      const rawTitle = (a.closest('.alias-title,.media-alias-title') ? '' : text(card?.querySelector('.item-title,.media-title')) || a.getAttribute('title') || text(a.querySelector('h2,h3,h4,.title,.name')) || text(a) || '').replace(/\s+/g, ' ').trim();
      const cleanedCardTitle = rawTitle.replace(/^(?:Xem\s+)?Phim\s+/i, '').replace(/\s*\(\s*(?:19|20)\d{2}\s*\)\s*$/, '').replace(/\s+(?:19|20)\d{2}$/, '').trim();
      const cardOrig = cleanOriginal(text(card?.querySelector('.origtitle,.original-name,.sub-title,.alias-title,.media-alias-title')));
      const cardTagYear = resolvedFamily === families.CHIBIFLIX ? [...(card?.querySelectorAll('.hl-tags .tag-classic span') || [])].map(text).find((value) => /^(?:19|20)\d{2}$/.test(value)) || '' : '';
      const year = extractTitleYear(rawTitle, text(card)) || cardTagYear;
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
      .find((v) => visible(v) && !isPrepared(v)
        && !v.closest('.jw-flag-ads,[data-ad],.ads-banner,.apx-trailer-player,#fake_jwplayer,[id*="trailer"],#tvc-container,#tvc-video')
        && !/\/wp-content\/ADS\//i.test(v.currentSrc || v.src || v.getAttribute('src') || '')) || null;
  }
  function playerFrames(doc = document, pageUrl = location.href) {
    return [...doc.querySelectorAll('#player iframe,#videoFrame,#player-wrapper iframe,#dooplay_player_response iframe,#embed-player,.player-ratio iframe,main iframe,iframe[allowfullscreen]')]
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
