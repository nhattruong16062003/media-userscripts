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

  // BEGIN MOTCHILL SITES (generated)
// END MOTCHILL SITES

  const sites = createMotchillSites();
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
})();
