// ==UserScript==
// @name         RoPhim — Lịch sử xem
// @namespace    rophim-userscripts.local
// @version      0.4.26
// @author       zic
// @description  Lịch sử xem cho trang xem RoPhim.
// @homepageURL  https://github.com/nhattruong16062003/media-userscripts/tree/main/rophim
// @supportURL   https://github.com/nhattruong16062003/media-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/refs/heads/main/rophim/history/rophim-history.user.js
// @updateURL    https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/refs/heads/main/rophim/history/rophim-history.user.js
// @include      /^https:\/\/(?:[a-z0-9-]+\.)*[a-z0-9-]*rophim[a-z0-9-]*(?:\.[a-z0-9-]+)+(?::\d+)?\//
// @match        https://player.phimapi.com/player/*
// @match        https://api.clubc.org/embed/*
// @match        https://api.rophim10.ink/embed/*
// @match        https://dora.nobitayeuxuka.xyz/temp*
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// ==/UserScript==

(() => {
  // shared/media.js
  var finite = (value) => typeof value === "number" && Number.isFinite(value);
  function clampSeek(time, duration) {
    return Math.max(0, Math.min(Math.max(0, duration - 0.25), time));
  }
  function audioPreference(value) {
    return value && typeof value === "object" && typeof value.muted === "boolean" && finite(value.volume) && value.volume >= 0 && value.volume <= 1 ? { muted: value.muted, volume: value.volume } : null;
  }

  // rophim/lib/core.js
  var FRAME_ORIGINS = /* @__PURE__ */ new Set(["https://player.phimapi.com", "https://api.clubc.org", "https://dora.nobitayeuxuka.xyz", "https://api.rophim10.ink"]);
  var ROPHIM_HOST = /(^|\.)[a-z\d-]*rophim[a-z\d-]*(?:\.[a-z\d-]+)+$/i;
  function isFrameURL(value) {
    const url = safeURL(value);
    if (!url) return false;
    if (FRAME_ORIGINS.has(url.origin)) return url.origin !== "https://api.rophim10.ink" || /^\/embed\/[1-9]\d*\/?$/.test(url.pathname);
    return ROPHIM_HOST.test(url.hostname) && /^\/embed\/\d+\/[1-9]\d*\/?$/.test(url.pathname);
  }
  function isFrameOrigin(value) {
    const url = safeURL(value);
    return !!url && (FRAME_ORIGINS.has(url.origin) || isFrameURL(value));
  }
  function safeURL(value, base) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const u = new URL(value, base);
      return u.protocol === "https:" && !u.username && !u.password ? u : null;
    } catch {
      return null;
    }
  }
  function isSiteOrigin(value) {
    const url = safeURL(value);
    return !!url && !FRAME_ORIGINS.has(url.origin) && !isFrameURL(value) && ROPHIM_HOST.test(url.hostname);
  }
  var normalize = (value) => String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  var bounded = (value, max = 200) => String(value || "").slice(0, max);
  var token = (win) => Array.from(win.crypto.getRandomValues(new Uint32Array(4)), (x) => x.toString(16).padStart(8, "0")).join("");
  function diagnostic(doc, feature, state) {
    const node = doc.documentElement;
    if (node) node.dataset["rp" + feature[0].toUpperCase() + feature.slice(1)] = bounded(state, 160);
  }
  function watchDOM(win, callback) {
    let timer = 0;
    const schedule = () => {
      if (!timer) timer = win.setTimeout(() => {
        timer = 0;
        callback();
      }, 100);
    };
    const observer = new win.MutationObserver((records) => {
      if (records.some((r) => !r.target.closest?.("[data-rp-ui]") && !(r.type === "attributes" && r.attributeName?.startsWith("data-rp")))) schedule();
    });
    observer.observe(win.document, { subtree: true, childList: true, attributes: true, attributeFilter: ["src", "class", "data-panel"] });
    return () => {
      observer.disconnect();
      win.clearTimeout(timer);
    };
  }
  function storageAPI(win) {
    return {
      get: (k, d) => typeof GM_getValue === "function" ? GM_getValue(k, d) : d,
      set: (k, v) => {
        if (typeof GM_setValue !== "function") throw new Error("Thi\u1EBFu quy\u1EC1n l\u01B0u userscript");
        GM_setValue(k, v);
      },
      keys: () => typeof GM_listValues === "function" ? GM_listValues() : [],
      remove: (k) => {
        if (typeof GM_deleteValue === "function") GM_deleteValue(k);
      }
    };
  }

  // shared/bridge/ownership.js
  function runFamily(win, { family, feature, isSiteURL, isFrameURL: isFrameURL2, isFrameOrigin: isFrameOrigin2 = () => false }, start) {
    const tag = "media-userscripts-owner-v1";
    let active = false, disposed = false, timer = 0, blankTimer = 0, blankTicks = 0;
    const challenge = Array.from(win.crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(16).padStart(8, "0")).join("");
    const allowed = (value) => {
      try {
        return !!(isSiteURL(value) || isFrameURL2(value));
      } catch {
        return false;
      }
    };
    const parentOrigin = () => {
      try {
        return win.document.referrer ? new URL(win.document.referrer).origin : null;
      } catch {
        return null;
      }
    };
    const ask = () => {
      if (!active && !disposed) win.parent.postMessage({ tag, type: "ready", family, feature, challenge }, parentOrigin() || "*");
    };
    const stopBlank = () => {
      if (blankTimer) {
        win.clearInterval(blankTimer);
        blankTimer = 0;
      }
      win.removeEventListener("DOMContentLoaded", checkLocation);
      win.removeEventListener("load", checkLocation);
    };
    const activate = () => {
      if (active || disposed) return;
      active = true;
      stopBlank();
      win.clearInterval(timer);
      for (const frame of win.document.querySelectorAll("iframe[src]")) if (allowed(frame.src)) frame.contentWindow?.postMessage({ tag, type: "probe", family, feature }, new URL(frame.src).origin);
      start();
    };
    const checkLocation = () => {
      if (active || disposed) return stopBlank();
      let detached = false;
      try {
        detached = !!(win.closed || win.frameElement && !win.frameElement.isConnected);
      } catch {
      }
      if (detached) return dispose();
      const href = win.location.href;
      if (href === "about:blank") {
        if (++blankTicks >= 200) dispose();
        return;
      }
      stopBlank();
      if (isSiteURL(href)) activate();
      else if (win.parent !== win && isFrameURL2(href) && !timer) {
        timer = win.setInterval(ask, 1e3);
        ask();
      }
    };
    const receive = (event) => {
      const data = event.data;
      if (disposed || data?.tag !== tag || data.family !== family || data.feature !== feature) return;
      const expectedParent = parentOrigin();
      const fromParent = win.parent !== win && event.source === win.parent && (isSiteURL(event.origin) || isFrameOrigin2(event.origin)) && (!expectedParent || expectedParent === event.origin);
      const frameReady = isFrameURL2(win.location.href);
      if (data.type === "probe" && !active && fromParent && frameReady) {
        ask();
        return;
      }
      if (typeof data.challenge !== "string" || !/^[a-f0-9]{32}$/.test(data.challenge)) return;
      if (data.type === "ready" && active) {
        const frame = [...win.document.querySelectorAll("iframe[src]")].find((node) => node.isConnected && node.contentWindow === event.source);
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
      if (data.type === "owner" && !active && data.challenge === challenge && fromParent && frameReady) activate();
    };
    win.addEventListener("message", receive);
    if (isSiteURL(win.location.href)) activate();
    else if (win.parent !== win && isFrameURL2(win.location.href)) {
      timer = win.setInterval(ask, 1e3);
      ask();
    } else if (win.parent !== win && win.location.href === "about:blank") {
      win.addEventListener("DOMContentLoaded", checkLocation);
      win.addEventListener("load", checkLocation);
      blankTimer = win.setInterval(checkLocation, 50);
    }
    const dispose = () => {
      disposed = true;
      stopBlank();
      win.clearInterval(timer);
      win.removeEventListener("message", receive);
      win.removeEventListener("pagehide", hide);
    };
    const hide = (event) => {
      if (event.persisted) return;
      if (!active && blankTimer && win.location.href === "about:blank") {
        queueMicrotask(checkLocation);
        return;
      }
      dispose();
    };
    win.addEventListener("pagehide", hide);
    return { get active() {
      return active;
    }, dispose };
  }

  // rophim/lib/identity.js
  var identityText = (value) => normalize(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, " ").trim();
  function laneKey(value) {
    const text = identityText(value);
    if (["subtitle", "vietsub", "phu de", "vs"].includes(text)) return "subtitle";
    if (["dubbed", "long tieng"].includes(text)) return "dubbed";
    if (["voiceover", "thuyet minh", "tm"].includes(text)) return "voiceover";
    return text;
  }
  function episodeKey(value) {
    const text = identityText(value);
    if (/^(full|tap full|trailer)$/.test(text)) return text === "trailer" ? "trailer" : "full";
    const number = text.match(/^(?:(?:tap|episode|ep) )?(\d+)(?: (\d+))?$/);
    return number ? String(Number(number[1])) + (number[2] ? "." + Number(number[2]) : "") : text;
  }
  function movieIdentity(movie = {}) {
    const type = movie.type === "movie" ? "movie" : movie.type === "series" ? "tv" : "";
    return {
      originalTitle: bounded(movie.origin_name || movie.originalTitle || ""),
      year: /^(19|20)\d{2}$/.test(String(movie.publish_year || movie.year)) ? String(movie.publish_year || movie.year) : "",
      mediaType: type,
      externalImdb: /^tt\d+$/.test(movie.imdb_id || "") ? movie.imdb_id : "",
      externalTmdb: type && /^\d+$/.test(String(movie.tmdb_id || "")) ? type + ":" + movie.tmdb_id : "",
      poster: bounded(movie.thumbnail || movie.poster || "", 2048)
    };
  }
  function sameFilm(a, b) {
    if (!a || !b) return false;
    if (a.year && b.year && a.year !== b.year || a.mediaType && b.mediaType && a.mediaType !== b.mediaType) return false;
    const shared = ["externalImdb", "externalTmdb"].filter((key) => a[key] && b[key]);
    if (shared.length) return shared.every((key) => a[key] === b[key]);
    const originalA = identityText(a.originalTitle), originalB = identityText(b.originalTitle);
    if (originalA && originalB && originalA !== originalB) return false;
    if (a.year && b.year && a.year === b.year && (originalA && originalA === originalB || identityText(a.title) && identityText(a.title) === identityText(b.title))) return true;
    return a.source === b.source && a.movieID === b.movieID && a.movie === b.movie && !!safeURL(a.url) && safeURL(a.url).origin === safeURL(b.url)?.origin;
  }
  function sameEpisode(a, b) {
    return sameFilm(a, b) && String(a.season) === String(b.season) && laneKey(a.lane) === laneKey(b.lane) && !!episodeKey(a.episode) && episodeKey(a.episode) === episodeKey(b.episode);
  }

  // rophim/lib/sites/rsc.js
  function jsonFragment(text, offset) {
    const start = text[offset];
    if (start !== "{" && start !== "[" && start !== '"') return null;
    let depth = 0, quoted = start === '"', escaped = false;
    for (let i = offset + (quoted ? 1 : 0); i < Math.min(text.length, offset + 15e5); i++) {
      const c = text[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (c === "\\") escaped = true;
        else if (c === '"') {
          quoted = false;
          if (start === '"') {
            try {
              return JSON.parse(text.slice(offset, i + 1));
            } catch {
              return null;
            }
          }
        }
      } else if (c === '"') quoted = true;
      else if (c === "{" || c === "[") depth++;
      else if (c === "}" || c === "]") {
        if (--depth === 0) {
          try {
            return JSON.parse(text.slice(offset, i + 1));
          } catch {
            return null;
          }
        }
      }
    }
    return null;
  }
  var rscCache = /* @__PURE__ */ new WeakMap();
  function rscObjects(doc, page = {}) {
    const scriptTexts = [], pageTexts = [];
    for (const script of doc.querySelectorAll("script:not([src])")) {
      const raw = script.textContent || "";
      if (!raw.includes("__next_f.push")) continue;
      let cached = rscCache.get(script);
      if (!cached || cached.raw !== raw) {
        cached = { raw, texts: [] };
        const re = /self\.__next_f\.push\(\[1,\s*/g;
        for (const match of raw.matchAll(re)) {
          const value = jsonFragment(raw, match.index + match[0].length);
          if (typeof value === "string") cached.texts.push(value);
        }
        rscCache.set(script, cached);
      }
      scriptTexts.push(...cached.texts);
    }
    try {
      for (const item of (page.__next_f || []).slice(-100)) if (Array.isArray(item) && item[0] === 1 && typeof item[1] === "string") pageTexts.push(item[1]);
    } catch {
    }
    const result = { episodes: [], movies: [] };
    for (const text of [scriptTexts.join(""), pageTexts.join("")]) {
      if (!text) continue;
      for (const m of text.matchAll(/"(episode|movie)":\s*(?=\{)/g)) {
        const value = jsonFragment(text, m.index + m[0].length);
        if (value && value.id && value.slug && value.name) result[m[1] === "episode" ? "episodes" : "movies"].push(value);
      }
    }
    return result;
  }

  // rophim/lib/sites/legacy-panels.js
  function detectLegacySite(doc, url, transition) {
    const legacyFrame = doc.querySelector("iframe#player.player-iframe");
    const panels = [...doc.querySelectorAll(".server-picker[data-panel]")];
    if (legacyFrame && panels.some((p) => p.querySelector("[data-server][data-value]")) && doc.querySelector(".btn-episode.chaptervs,.btn-episode.chaptertm")) {
      return { kind: "legacy-panels", frame: legacyFrame, url, ...transition?.kind === "legacy-panels" && transition.frameSrc === legacyFrame.src ? { preferences: transition.preferences } : {} };
    }
    return null;
  }
  function parseCookies(raw) {
    const out = {};
    for (const part of String(raw || "").split(";")) {
      const eq = part.indexOf("=");
      if (eq <= 0) continue;
      const key = part.slice(0, eq).trim();
      if (!key || Object.hasOwn(out, key)) continue;
      out[key] = part.slice(eq + 1).trim();
    }
    return out;
  }
  function legacyContext(site, doc) {
    const cookies = site.preferences || parseCookies(doc.cookie);
    const lane = cookies.selectedVidTypeRophim === "tm" ? "tm" : "vs";
    const links = [...doc.querySelectorAll(lane === "tm" ? ".chaptertm" : ".chaptervs")];
    const active = links.find((n) => safeURL(n.getAttribute("href"), site.url)?.pathname === site.url.pathname) || links.find((n) => n.classList.contains("on-air"));
    const panel = doc.querySelector(`.server-picker[data-panel="${lane === "tm" ? "thuyetminh" : "vietsub"}"]`);
    if (!active || !panel) return null;
    const server = site.preferences?.selectedServerRophim || panel.querySelector("[data-server].current")?.dataset.server || "";
    const title = (doc.querySelector('meta[property="og:title"]')?.content || doc.title).split("|")[0].trim();
    const movie = site.url.pathname.split("/").at(-1).replace(/-tap-\d+(?:\.[^/]*)?$/, "");
    const rawTitle = doc.querySelector('meta[property="og:title"]')?.content || doc.title;
    const original = rawTitle.split("|")[1]?.trim() || "";
    const episode = bounded(active.querySelector(".v-title,.info")?.textContent?.trim() || active.textContent?.trim());
    const mediaType = links.length === 1 && /^(?:full|hd|sd|cam|fhd)$/i.test(episode) && !/-tap-\d+(?:\.[^/]*)?$/i.test(site.url.pathname) ? "movie" : "tv";
    return {
      source: site.kind,
      movie,
      movieID: movie,
      title: bounded(title.replace(/\s*-\s*Tập\s*\d+.*$/i, "")),
      episode,
      episodeID: site.url.pathname,
      season: title.match(/phần\s*(\d+)/i)?.[1] || "1",
      lane,
      server,
      url: site.url.origin + site.url.pathname,
      originalTitle: bounded(original.replace(/\s+(?:season|phần)\s*\d+/ig, "").replace(/\s+(?:19|20)\d{2}\s*$/, "")),
      year: original.match(/\b((?:19|20)\d{2})\s*$/)?.[1] || "",
      mediaType,
      externalImdb: "",
      externalTmdb: "",
      poster: bounded(doc.querySelector('meta[property="og:image"]')?.content || "", 2048)
    };
  }
  function legacyNextRoute(site, context, win) {
    const nodes = [...win.document.querySelectorAll(context.lane === "tm" ? ".btn-episode.chaptertm" : ".btn-episode.chaptervs")];
    let index = nodes.findIndex((n) => safeURL(n.getAttribute("href"), site.url)?.pathname === site.url.pathname);
    if (index < 0) index = nodes.findIndex((n) => n.classList.contains("on-air"));
    const url = safeURL(nodes[index + 1]?.getAttribute("href") || nodes[index + 1]?.href, site.url);
    return index >= 0 && url?.origin === site.url.origin ? url.href : null;
  }

  // rophim/lib/sites/next-ordered.js
  function detectNextOrdered(candidate) {
    const { episode } = candidate;
    if (typeof episode.server_type === "string" && (Number.isFinite(episode.episode_order) || episode.episode_order === null && /^(?:tập\s*)?full$/i.test(episode.name)) && Number.isFinite(episode.season_number)) return { kind: "next-ordered", ...candidate };
    return null;
  }

  // rophim/lib/sites/next-basic.js
  function detectNextBasic(doc, candidate) {
    if (doc.querySelector(".player-frame-stable") && candidate.frame.classList.contains("player-frame-content")) return { kind: "next-basic", ...candidate };
    if (Number.isFinite(candidate.episode?.order_index) && candidate.frame?.id === "embed-player") return { kind: "next-basic", ...candidate };
    return null;
  }

  // rophim/lib/sites/next-common.js
  function nextContext(site) {
    const { episode: e, movie: m, url } = site;
    const latest = Array.isArray(m.latestEpisodes) ? m.latestEpisodes : [];
    const season = e.season_number || latest.find((item) => item.id === e.id)?.season_number || m.partNumber || 1;
    return { source: site.kind, movie: bounded(m.slug), movieID: String(m.id), title: bounded(m.name), episode: bounded(e.name), episodeID: String(e.id), season: String(season), lane: bounded(e.server_type || e.server), server: bounded(e.server), url: url.origin + url.pathname, ...movieIdentity(m) };
  }
  function episodeNext(entries, current) {
    const season = entries.filter((e) => String(e.season_number || 1) === current.season);
    const lane = season.filter((e) => laneKey(e.server_type || e.server) === laneKey(current.lane));
    const order = (e) => Number.isFinite(e.episode_order) ? e.episode_order : /^(?:tập\s*)?\d+(?:\.\d+)?$/i.test(e.name || "") ? Number(e.name.match(/[\d.]+/)[0]) : null;
    const active = lane.find((e) => String(e.id) === current.episodeID), position = active ? order(active) : null;
    if (position === null) return null;
    const positions = season.map(order).filter((value) => value !== null && value > position);
    if (!positions.length) return null;
    const nextPosition = Math.min(...positions);
    const next = lane.filter((e) => order(e) === nextPosition);
    return next.length === 1 ? next[0] : null;
  }
  async function nextSiteRoute(site, context, win) {
    const prefix = site.kind === "next-basic" ? "/api/baseapi" : "/baseapi";
    const response = await win.fetch(`${prefix}/api/v1/episodes/by-idMovie/${encodeURIComponent(context.movieID)}`, { credentials: "same-origin" });
    if (!response.ok) throw new Error("Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c danh s\xE1ch t\u1EADp");
    const raw = await response.json();
    const entries = Array.isArray(raw) ? raw : raw.result;
    if (!Array.isArray(entries) || entries.length > 1e4) return null;
    const next = episodeNext(entries, context);
    return next && /^\d+$/.test(String(next.id)) ? new URL(`/xem-phim/${encodeURIComponent(context.movie)}.${next.id}`, site.url).href : null;
  }

  // rophim/lib/sites.js
  function detectSite(doc, href, page = {}) {
    const url = safeURL(href);
    if (!url || !url.pathname.startsWith("/xem-phim/")) return null;
    let transition = null;
    try {
      const raw = doc.getElementById("rp-watch-descriptor")?.textContent;
      if (raw && raw.length < 1e5) {
        const value = JSON.parse(raw);
        if (value.href === url.origin + url.pathname) transition = value;
      }
    } catch {
    }
    const legacy = detectLegacySite(doc, url, transition);
    if (legacy) return legacy;
    const frame = doc.querySelector(".player-ratio iframe#embed-player");
    if (!frame) return null;
    const data = transition?.frameSrc === frame.src && ["next-ordered", "next-basic"].includes(transition.kind) && transition.episode && transition.movie ? { episodes: [transition.episode], movies: [transition.movie] } : rscObjects(doc, page);
    const suffix = url.pathname.match(/\.(\d+)$/)?.[1];
    const embedID = safeURL(frame.src)?.pathname.match(/^\/embed\/(\d+)\/?$/)?.[1];
    const candidates = data.episodes.filter((e) => suffix ? String(e.id) === suffix : embedID ? String(e.id) === embedID : e.link === frame.src);
    const episode = candidates.at(-1);
    if (!episode || typeof episode.server !== "string" || !["embed", "m3u8"].includes(episode.type)) return null;
    if (episode.type === "embed" && episode.link !== frame.src || episode.type === "m3u8" && String(episode.id) !== embedID) return null;
    const movieSlug = url.pathname.slice("/xem-phim/".length).replace(/\.\d+$/, "");
    const movie = data.movies.findLast((m) => m.slug === movieSlug && typeof m.id === "number");
    if (!movie) return null;
    const candidate = { frame, url, episode, movie };
    return detectNextOrdered(candidate) || detectNextBasic(doc, candidate);
  }
  function commitWatchSite(doc, site) {
    let node = doc.getElementById("rp-watch-descriptor");
    if (!node) {
      node = doc.createElement("script");
      node.id = "rp-watch-descriptor";
      node.type = "application/json";
      node.dataset.rpUi = "watch-data";
      (doc.head || doc.documentElement).append(node);
    }
    const pick = (value, keys) => value ? Object.fromEntries(keys.filter((key) => Object.hasOwn(value, key)).map((key) => [key, value[key]])) : void 0;
    const episode = pick(site.episode, ["id", "slug", "name", "server", "server_type", "episode_order", "season_number", "type", "link"]);
    const movie = pick(site.movie, ["id", "slug", "name", "origin_name", "originalTitle", "publish_year", "year", "type", "imdb_id", "tmdb_id", "thumbnail", "poster", "partNumber"]);
    if (movie && Array.isArray(site.movie.latestEpisodes)) movie.latestEpisodes = site.movie.latestEpisodes.filter((e) => e.id === site.episode.id).map((e) => ({ id: e.id, season_number: e.season_number }));
    node.textContent = JSON.stringify({ href: site.url.origin + site.url.pathname, kind: site.kind, frameSrc: site.frame.src, episode, movie, preferences: site.preferences });
  }
  function readContext(site, doc) {
    if (!site) return null;
    switch (site.kind) {
      case "next-ordered":
      case "next-basic": {
        return nextContext(site);
      }
      case "legacy-panels": {
        return legacyContext(site, doc);
      }
      default:
        return null;
    }
  }
  function contextKey(c) {
    return c ? [c.source, c.movieID, c.movie, c.season, c.episodeID, c.lane].map(encodeURIComponent).join("|") : "";
  }
  function introKey(c) {
    return [c.source, c.movieID, c.movie, c.season, c.lane].map(encodeURIComponent).join("|");
  }
  async function nextRoute(site, context, win) {
    switch (site?.kind) {
      case "legacy-panels": {
        return legacyNextRoute(site, context, win);
      }
      case "next-ordered":
      case "next-basic": {
        return nextSiteRoute(site, context, win);
      }
      default:
        return null;
    }
  }

  // shared/player/media-network.js
  var probes = /* @__PURE__ */ new WeakMap();
  var http = (value, base) => {
    if (typeof value !== "string" || !value || value.length > 8192) return "";
    try {
      const u = new URL(value, base);
      return /^https?:$/.test(u.protocol) ? u.href : "";
    } catch {
      return "";
    }
  };
  function manifestLinks(text, base) {
    if (typeof text !== "string" || text.length > 5e5 || !text.trimStart().startsWith("#EXTM3U")) return null;
    const manifests = [], segments = [];
    let variant = false;
    for (const line of text.split(/\r?\n/)) {
      const s = line.trim();
      if (!s) continue;
      if (s.startsWith("#EXT-X-STREAM-INF:")) {
        variant = true;
        continue;
      }
      if (s.startsWith("#EXT-X-MEDIA:") || s.startsWith("#EXT-X-I-FRAME-STREAM-INF:")) {
        const u = http(s.match(/URI="([^"]+)"/)?.[1], base);
        if (u) manifests.push(u);
      } else if (s.startsWith("#EXT-X-MAP:") || s.startsWith("#EXT-X-PART:")) {
        const u = http(s.match(/URI="([^"]+)"/)?.[1], base);
        if (u) segments.push(u);
      } else if (!s.startsWith("#")) {
        const u = http(s, base);
        if (u) (variant ? manifests : segments).push(u);
        variant = false;
      }
      if (manifests.length + segments.length > 6e3) return null;
    }
    return { manifests, segments };
  }
  function mediaNetworkProbe(win) {
    if (probes.has(win)) return probes.get(win).acquire();
    const manifests = /* @__PURE__ */ new Map(), samples = [], pending = /* @__PURE__ */ new Set();
    let disposed = false, observer = null, refs = 0, revision = 0, lastRevision = -1, lastSource = "", lastFiles = /* @__PURE__ */ new Set(), knownSegments = /* @__PURE__ */ new Set();
    const clock = () => win.performance?.now?.() ?? 0;
    const later = (fn) => typeof win.requestIdleCallback === "function" ? win.requestIdleCallback(() => {
      if (!disposed) fn();
    }, { timeout: 2e3 }) : win.setTimeout(() => {
      if (!disposed) fn();
    }, 0);
    const wanted = (url) => /\.m3u8(?:$|[?#])/i.test(url) || pending.has(url);
    function accept(url, text, alias = "") {
      if (disposed) return;
      const links = manifestLinks(text, url);
      if (!links) return;
      manifests.set(url, links);
      if (alias && alias !== url) manifests.set(alias, links);
      revision++;
      for (const child of links.manifests) pending.add(child);
      while (manifests.size > 24) manifests.delete(manifests.keys().next().value);
      knownSegments = new Set([...manifests.values()].flatMap((v) => v.segments));
      while (knownSegments.size > 12e3 && manifests.size > 1) {
        manifests.delete(manifests.keys().next().value);
        knownSegments = new Set([...manifests.values()].flatMap((v) => v.segments));
      }
      if (pending.size > 96) pending.clear();
    }
    const originalFetch = win.fetch;
    const fetch = typeof originalFetch === "function" ? function(...args) {
      const result = Reflect.apply(originalFetch, this, args), url = http(typeof args[0] === "string" ? args[0] : args[0]?.url || String(args[0] || ""), win.location.href);
      if (wanted(url)) result.then((response) => {
        if (disposed || !response.ok || Number(response.headers?.get("content-length")) > 5e5) return;
        const copy = response.clone(), reader = copy.body?.getReader?.();
        if (!reader) return;
        later(() => (async () => {
          let bytes = 0, text = "", decoder = new (win.TextDecoder || globalThis.TextDecoder)();
          try {
            for (; ; ) {
              const part = await reader.read();
              if (part.done) break;
              bytes += part.value.byteLength;
              if (disposed || bytes > 5e5) {
                await reader.cancel();
                return;
              }
              text += decoder.decode(part.value, { stream: true });
            }
            text += decoder.decode();
            later(() => accept(http(response.url, win.location.href) || url, text, url));
          } catch {
          } finally {
            reader.releaseLock();
          }
        })().catch(() => {
        }));
      }).catch(() => {
      });
      return result;
    } : null;
    if (fetch) try {
      win.fetch = fetch;
    } catch {
    }
    const proto = win.XMLHttpRequest?.prototype, originalOpen = proto?.open, requests = /* @__PURE__ */ new WeakMap();
    const open = originalOpen ? function(method, url, ...rest) {
      const absolute = http(url, win.location.href);
      const previous = requests.get(this);
      if (previous) for (const [type, fn] of previous) this.removeEventListener(type, fn);
      const listeners = [];
      requests.set(this, listeners);
      const listen = (type, fn) => {
        listeners.push([type, fn]);
        this.addEventListener(type, fn, { once: true });
      };
      if (knownSegments.has(absolute)) {
        let start = clock();
        listen("loadstart", () => {
          start = clock();
        });
        listen("load", (event) => {
          const end = clock();
          if (this.status >= 200 && this.status < 300 && event.loaded > 0 && end > start) collect({ entryType: "resource", name: absolute, responseStart: start, responseEnd: end, transferSize: event.loaded, actual: true });
        });
      }
      if (wanted(absolute)) {
        const loaded = () => {
          try {
            if (this.status >= 200 && this.status < 300 && (!this.responseType || this.responseType === "text")) {
              const url2 = this.responseURL || absolute, text = this.responseText;
              if (text.length <= 5e5) later(() => accept(url2, text, absolute));
            }
          } catch {
          }
        };
        listen("load", loaded);
      }
      return Reflect.apply(originalOpen, this, [method, url, ...rest]);
    } : null;
    if (open) try {
      proto.open = open;
    } catch {
    }
    const collect = (entry) => {
      if (disposed || entry.entryType !== "resource" || !Number.isFinite(entry.responseEnd) || entry.responseEnd <= 0) return;
      samples.push({ url: entry.name, start: entry.responseStart, end: entry.responseEnd, bytes: entry.transferSize, actual: entry.actual === true });
      const cutoff = clock() - 6e3;
      while (samples.length && (samples[0].end < cutoff || samples.length > 160)) samples.shift();
    };
    try {
      if (win.PerformanceObserver) {
        observer = new win.PerformanceObserver((list) => {
          for (const entry of list.getEntries()) collect(entry);
        });
        observer.observe({ type: "resource", buffered: false });
      }
    } catch {
    }
    function urls(source) {
      if (source === lastSource && revision === lastRevision) return lastFiles;
      const files = /* @__PURE__ */ new Set(), seen = /* @__PURE__ */ new Set();
      const visit = (url, depth) => {
        if (depth > 3 || seen.has(url)) return;
        seen.add(url);
        const item = manifests.get(url);
        if (!item) return;
        for (const file of item.segments) files.add(file);
        for (const child of item.manifests) visit(child, depth + 1);
      };
      visit(source, 0);
      if (!manifests.has(source) && source && !/\.m3u8(?:$|[?#])/i.test(source)) files.add(source);
      lastSource = source;
      lastRevision = revision;
      lastFiles = files;
      return files;
    }
    const probe = {
      speed(source, since = 0) {
        const files = urls(source), now = clock(), active = samples.filter((s) => s.end >= Math.max(since, now - 5e3) && files.has(s.url));
        const actual = active.filter((s) => s.actual), measured = (actual.length ? actual : active).filter((s) => s.bytes > 0 && Number.isFinite(s.start) && s.end > s.start);
        if (!measured.length) return null;
        const intervals = measured.map((s) => [s.start, s.end]).sort((a, b) => a[0] - b[0]);
        let ms = 0, end = -Infinity;
        for (const [start, stop] of intervals) {
          ms += Math.max(0, stop - Math.max(start, end));
          end = Math.max(end, stop);
        }
        return ms > 0 ? measured.reduce((sum, s) => sum + s.bytes, 0) * 1e3 / ms : null;
      },
      source(declared) {
        return manifests.has(declared) ? declared : "";
      },
      acquire() {
        refs++;
        let released = false;
        return { speed: probe.speed, source: probe.source, dispose() {
          if (released) return;
          released = true;
          if (--refs > 0) return;
          disposed = true;
          observer?.disconnect();
          if (win.fetch === fetch) win.fetch = originalFetch;
          if (proto?.open === open) proto.open = originalOpen;
          manifests.clear();
          samples.length = 0;
          pending.clear();
          knownSegments.clear();
          probes.delete(win);
        } };
      }
    };
    probes.set(win, probe);
    return probe.acquire();
  }

  // shared/engines/hls-access.js
  var registries = /* @__PURE__ */ new WeakMap();
  var registryKey = Symbol.for("media-userscripts.hls-owners.v1");
  function observeHlsOwners(win) {
    if (registries.has(win)) return registries.get(win);
    const existing = win[registryKey];
    if (existing?.version === 1 && typeof existing.get === "function" && typeof existing.stop === "function") {
      registries.set(win, existing);
      return existing;
    }
    const owners = /* @__PURE__ */ new WeakMap(), jwOwners = /* @__PURE__ */ new Set(), ObjectAPI = win.Object, original = ObjectAPI.defineProperty, originalAssign = ObjectAPI.assign;
    const exposeTo = (fn, target = win) => {
      try {
        return typeof exportFunction === "function" ? exportFunction(fn, target) : fn;
      } catch {
        return fn;
      }
    };
    const hostWin = typeof window !== "undefined" && (window === win || window.wrappedJSObject === win) ? window : win;
    const liveDoc = () => win.document;
    const unwrap = (v) => v?.wrappedJSObject || v;
    const sameDoc = (node) => {
      const d = liveDoc();
      return !!node && (node.ownerDocument === d || unwrap(node.ownerDocument) === unwrap(d));
    };
    let observing = true, timer, exposedObserve = null, exposedAssign = null;
    function releaseGlobal() {
      try {
        const cur = ObjectAPI.defineProperty;
        if (cur === exposedObserve || cur === observe || exposedObserve && unwrap(cur) === unwrap(exposedObserve)) ObjectAPI.defineProperty = original;
      } catch {
      }
      try {
        const cur = ObjectAPI.assign;
        if (cur === exposedAssign || cur === observeAssign || exposedAssign && unwrap(cur) === unwrap(exposedAssign)) ObjectAPI.assign = originalAssign;
      } catch {
      }
    }
    function stop(event) {
      if (event?.persisted) return;
      if (event?.type === "pagehide" && win.location?.href === "about:blank") return;
      releaseGlobal();
      hostWin.clearTimeout(timer);
      observing = false;
      hostWin.removeEventListener("pagehide", stop);
      registries.delete(win);
      try {
        const cur = win[registryKey];
        if (cur === registry || unwrap(cur) === unwrap(registry)) delete win[registryKey];
      } catch {
      }
    }
    function observe(target, key, descriptor) {
      const result = Reflect.apply(original, this, arguments);
      if (observing && key === "url") {
        try {
          const rawTarget = unwrap(target), rawDesc = unwrap(descriptor);
          if (typeof ObjectAPI.getOwnPropertyDescriptor(rawDesc, "get")?.value !== "function" || typeof ObjectAPI.getOwnPropertyDescriptor(rawDesc, "set")?.value !== "function") return result;
          const template = unwrap(ObjectAPI.getOwnPropertyDescriptor(rawTarget, "template")?.value);
          if (!template || unwrap(ObjectAPI.getOwnPropertyDescriptor(template, "art")?.value) !== rawTarget) return result;
          const video = ObjectAPI.getOwnPropertyDescriptor(template, "$video")?.value, root = ObjectAPI.getOwnPropertyDescriptor(template, "$player")?.value;
          if (sameDoc(video) && video.matches("video.art-video") && root?.classList.contains("art-video-player") && root.contains(video) && typeof rawTarget.on === "function") {
            owners.set(unwrap(video), rawTarget);
            releaseGlobal();
            hostWin.clearTimeout(timer);
          }
        } catch {
        }
      }
      return result;
    }
    function observeAssign(target, ...sources) {
      const result = Reflect.apply(originalAssign, this, [target, ...sources]);
      if (observing && target && jwOwners.size < 8) try {
        const rawTarget = unwrap(target);
        for (const source of sources) {
          const value = unwrap(source);
          if (!value || ObjectAPI.getOwnPropertyDescriptor(value, "isSetup")?.value !== false) continue;
          const model = unwrap(ObjectAPI.getOwnPropertyDescriptor(value, "model")?.value), api = unwrap(ObjectAPI.getOwnPropertyDescriptor(value, "api")?.value);
          if (!model || !api || unwrap(ObjectAPI.getOwnPropertyDescriptor(rawTarget, "model")?.value) !== model || unwrap(ObjectAPI.getOwnPropertyDescriptor(rawTarget, "api")?.value) !== api) continue;
          if (typeof model.getVideo !== "function" || typeof model.get !== "function" || typeof api.getContainer !== "function" || !sameDoc(api.getContainer()) || model.get("id") !== api.id) continue;
          jwOwners.add({ model, api });
          releaseGlobal();
          hostWin.clearTimeout(timer);
          break;
        }
      } catch {
      }
      return result;
    }
    const registry = new ObjectAPI();
    registry.version = 1;
    registry.get = exposeTo(function(video) {
      const rawVideo = unwrap(video);
      const owner = owners.get(rawVideo) || owners.get(video);
      if (owner && unwrap(owner.template?.$video) === rawVideo && !owner.isDestroy) return owner.hls;
      for (const { model, api } of jwOwners) {
        const provider = model.getVideo(), root = api.getContainer();
        if (unwrap(provider?.video) === rawVideo && sameDoc(rawVideo) && unwrap(rawVideo.closest(".jwplayer")) === unwrap(root) && root?.contains(rawVideo)) return provider.hlsjs || provider.hls || null;
      }
      return null;
    }, win);
    registry.stop = exposeTo(stop, win);
    registries.set(win, registry);
    try {
      exposedObserve = exposeTo(observe, win);
      exposedAssign = exposeTo(observeAssign, win);
      const desc = new ObjectAPI();
      desc.value = registry;
      desc.configurable = true;
      Reflect.apply(original, ObjectAPI, [win, registryKey, desc]);
      ObjectAPI.defineProperty = exposedObserve;
      ObjectAPI.assign = exposedAssign;
      timer = hostWin.setTimeout(releaseGlobal, 9e4);
      hostWin.addEventListener("pagehide", stop);
    } catch {
      releaseGlobal();
      observing = false;
    }
    return registry;
  }
  function accessibleHls(candidate) {
    const { video, kind, api } = candidate, win = video.ownerDocument.defaultView;
    const pageWin = win?.wrappedJSObject || null, rawVideo = video.wrappedJSObject || video;
    const provider = kind === "jw" ? api?.getProvider?.() : null;
    const views = [win, pageWin].filter((v, i, a) => v && a.indexOf(v) === i);
    const captured = [];
    for (const view of views) {
      const registry = registries.get(view) || view[registryKey];
      if (registry?.version === 1) {
        const item = registry.get(rawVideo) || registry.get(video);
        if (item) captured.push(item);
      }
    }
    for (const h of [...captured, provider?.hlsjs, provider?.hls, ...views.flatMap((view) => [view.hls, view.art?.hls])])
      if (h && (h.media === video || h.media === rawVideo) && h.config && typeof h.on === "function" && typeof h.off === "function") return h;
    return null;
  }

  // shared/player/buffer-policy.js
  function hlsBufferTarget(config, bitrate) {
    if (!Number.isFinite(bitrate) || bitrate < 0 || !Number.isFinite(config.maxBufferSize) || config.maxBufferSize <= 0 || !Number.isFinite(config.maxBufferLength) || config.maxBufferLength <= 0 || !Number.isFinite(config.maxMaxBufferLength) || config.maxMaxBufferLength <= 0) return null;
    return Math.min(bitrate ? Math.max(config.maxBufferLength, 8 * config.maxBufferSize / bitrate) : config.maxBufferLength, config.maxMaxBufferLength);
  }
  function bufferExpansionPlan(config, bitrate, otherBufferedSeconds = 0, loadingBitrate = bitrate) {
    if (!Number.isFinite(bitrate) || bitrate <= 0) return null;
    const native = hlsBufferTarget(config, loadingBitrate);
    if (native === null) return null;
    if (!Number.isFinite(otherBufferedSeconds) || otherBufferedSeconds < 0) return null;
    const bytesPerSecond = bitrate * 1.15 / 8;
    const target = Math.floor(Math.min(240, native * 4, native + 16 * 1024 * 1024 / bytesPerSecond, 96 * 1024 * 1024 / bytesPerSecond - otherBufferedSeconds));
    if (target < native + 10) return null;
    return { before: { maxBufferLength: config.maxBufferLength, maxMaxBufferLength: config.maxMaxBufferLength }, after: { maxBufferLength: Math.max(config.maxBufferLength, target), maxMaxBufferLength: Math.max(config.maxMaxBufferLength, target) } };
  }
  function bufferExpansionStep(original, current, bitrate, otherBufferedSeconds = 0, loadingBitrate = bitrate) {
    const plan = bufferExpansionPlan(original, bitrate, otherBufferedSeconds, loadingBitrate), now = hlsBufferTarget(current, loadingBitrate);
    if (!plan || now === null) return null;
    const maximum = hlsBufferTarget({ ...original, ...plan.after }, loadingBitrate), target = Math.min(maximum, Math.floor(now + 10));
    if (target <= now) return null;
    return { ...plan, after: { maxBufferLength: Math.max(original.maxBufferLength, target), maxMaxBufferLength: Math.max(original.maxMaxBufferLength, target) } };
  }
  function observedMediaBitrate(fragments) {
    const samples = fragments.filter((s) => Number.isFinite(s.duration) && s.duration >= 0.1 && s.duration <= 60 && Number.isFinite(s.bytes) && s.bytes > 0);
    if (samples.length < 5 || samples.reduce((n, s) => n + s.duration, 0) < 10) return null;
    return Math.max(...samples.map((s) => s.bytes * 8 / s.duration));
  }

  // shared/player/ssai-breaks.js
  var AD_SEGMENT_RE = /\/v\d+\/[0-9a-f]{32}\/segment_\d{3,5}\.ts(?:[?#]|$)/i;
  function fragUrl(frag) {
    const raw = frag?.url || frag?.relurl || "";
    return typeof raw === "string" ? raw : "";
  }
  function fragDir(url) {
    if (!url) return "";
    const clean = url.split(/[?#]/)[0];
    const idx = clean.lastIndexOf("/");
    return idx >= 0 ? clean.slice(0, idx + 1) : "";
  }
  function isUnencrypted(frag) {
    const d = frag?.decryptdata;
    if (!d) return true;
    if (d.method && d.method !== "NONE") return false;
    return !d.uri;
  }
  function detectHlsAdBreaks(fragments) {
    if (!Array.isArray(fragments) || fragments.length < 5) return [];
    const runs = [];
    let current = null;
    for (const frag of fragments) {
      if (!frag || !Number.isFinite(frag.start) || !Number.isFinite(frag.duration) || frag.duration <= 0) continue;
      const cc = Number.isFinite(frag.cc) ? frag.cc : 0;
      if (!current || current.cc !== cc) {
        current = { cc, start: frag.start, end: frag.start + frag.duration, duration: frag.duration, frags: [frag] };
        runs.push(current);
      } else {
        current.end = frag.start + frag.duration;
        current.duration += frag.duration;
        current.frags.push(frag);
      }
    }
    if (runs.length < 3) return [];
    const breaks = [];
    for (let i = 1; i < runs.length - 1; i++) {
      const prev = runs[i - 1], run = runs[i], next = runs[i + 1];
      if (run.duration < 15 || run.duration > 60 || run.frags.length < 2) continue;
      const prevDir = fragDir(fragUrl(prev.frags.at(-1))), nextDir = fragDir(fragUrl(next.frags[0]));
      if (prevDir !== nextDir) continue;
      const allAd = run.frags.every((f) => {
        const u = fragUrl(f);
        return AD_SEGMENT_RE.test(u) && fragDir(u) !== prevDir && isUnencrypted(f);
      });
      if (allAd) breaks.push({ start: run.start, end: run.end, duration: Math.round(run.duration), source: "hls" });
    }
    return breaks;
  }
  function parseM3u8Fragments(text, baseUrl) {
    if (typeof text !== "string" || !text.includes("#EXTINF:")) return [];
    const lines = text.split(/\r?\n/), fragments = [];
    let cc = 0, t = 0, dur = 0, decryptdata = { method: "NONE", uri: null };
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith("#EXT-X-DISCONTINUITY")) {
        cc++;
        continue;
      }
      if (line.startsWith("#EXT-X-KEY:")) {
        const method = line.match(/METHOD=([^,\s]+)/i)?.[1] || "NONE";
        const uri = line.match(/URI="([^"]+)"/i)?.[1] || null;
        decryptdata = { method: method.toUpperCase(), uri };
        continue;
      }
      if (line.startsWith("#EXTINF:")) {
        dur = parseFloat(line.slice(8)) || 0;
        continue;
      }
      if (!line.startsWith("#")) {
        let url = line;
        if (baseUrl) try {
          url = new URL(line, baseUrl).href;
        } catch {
        }
        if (dur > 0) {
          fragments.push({ cc, start: t, duration: dur, url, decryptdata });
          t += dur;
        }
        dur = 0;
      }
    }
    return fragments;
  }
  var breakCache = /* @__PURE__ */ new WeakMap();
  var manifestCache = /* @__PURE__ */ new Map();
  function fetchManifestBreaks(win, playlistUrl) {
    if (!playlistUrl || typeof win?.fetch !== "function") return [];
    const entry = manifestCache.get(playlistUrl);
    if (entry) return entry.breaks;
    const record = { breaks: [] };
    manifestCache.set(playlistUrl, record);
    if (manifestCache.size > 32) {
      const first = manifestCache.keys().next().value;
      manifestCache.delete(first);
    }
    const load = async (url, depth = 0) => {
      const res = await win.fetch(url, { credentials: "omit" });
      if (!res.ok) return [];
      const text = await res.text();
      if (text.length > 2e6) return [];
      if (text.includes("#EXT-X-STREAM-INF") && depth < 2) {
        const sub = text.split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith("#"));
        if (sub) return load(new URL(sub, res.url || url).href, depth + 1);
        return [];
      }
      return detectHlsAdBreaks(parseM3u8Fragments(text, res.url || url));
    };
    load(playlistUrl).then((found) => {
      if (Array.isArray(found)) record.breaks = found;
    }).catch(() => {
    });
    return record.breaks;
  }
  function readPlayerAdBreaks(candidate) {
    if (!candidate || !candidate.video || candidate.video.nodeType !== 1) return [];
    let hls = null;
    try {
      hls = accessibleHls(candidate);
    } catch {
      hls = null;
    }
    const fragments = hls?.levels?.[hls.currentLevel]?.details?.fragments;
    if (Array.isArray(fragments) && fragments.length) {
      if (breakCache.has(fragments)) return breakCache.get(fragments);
      const found = detectHlsAdBreaks(fragments);
      breakCache.set(fragments, found);
      return found;
    }
    let playlistUrl = "";
    try {
      const item = candidate.kind === "jw" ? candidate.api?.getPlaylistItem?.() : null;
      const raw = item?.file || item?.sources?.[0]?.file || "";
      if (/^https:\/\/[^"'\s]+\.m3u8(?:[?#]|$)/i.test(raw)) playlistUrl = raw;
    } catch {
    }
    if (playlistUrl) return fetchManifestBreaks(candidate.video.ownerDocument?.defaultView, playlistUrl);
    return [];
  }

  // shared/player/buffering.js
  function bufferedAhead(video, time = video.currentTime) {
    if (!Number.isFinite(time) || time < 0) return 0;
    try {
      for (let i = 0; i < video.buffered.length; i++) if (video.buffered.start(i) <= time && time <= video.buffered.end(i)) return Math.max(0, video.buffered.end(i) - time);
    } catch {
    }
    return 0;
  }
  var nonnegative = (n) => Number.isFinite(n) && n >= 0 && n <= 1e12;
  function validLoadMetrics(value) {
    return !!value && nonnegative(value.ahead) && ["loading", "buffering", "playing", "paused", "ready", "ended", "error"].includes(value.status) && (value.bytesPerSecond === null || nonnegative(value.bytesPerSecond)) && typeof value.online === "boolean" && ["native", "observed", "expanded", "limited"].includes(value.bufferPolicy);
  }
  function loadMetricsText(value) {
    if (!validLoadMetrics(value)) return "\u2193 \u2014 \xB7 T\u1EA3i tr\u01B0\u1EDBc \u2014";
    const speed = value.bytesPerSecond;
    const rate = speed === null ? "\u2014" : speed >= 1e6 ? (speed / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " MB/s" : Math.round(speed / 1e3).toLocaleString("vi-VN") + " kB/s";
    return "\u2193 " + rate + " \xB7 T\u1EA3i tr\u01B0\u1EDBc " + Math.floor(value.ahead) + " gi\xE2y";
  }
  function mediaLoadMonitor(candidate, { active = () => true, allowExpansion = false } = {}) {
    const { video, kind, api } = candidate, doc = video.ownerDocument, win = doc.defaultView, clock = () => win.performance.now();
    const network = mediaNetworkProbe(win);
    let source = "", since = clock(), waiting = false, disposed = false;
    let stableSince = null, lastTime = null, lastAdvance = clock(), engine = null, engineOff = null, fragments = [], policy = "native", tuning = null, limited = false;
    let levelIndex = null, qualityBaseline = null, lastPolicyCheck = -Infinity, stableTime = null, cooldownUntil = 0, healthyFrames = false;
    const events = ["waiting", "stalled", "playing", "canplay", "pause", "ended", "error", "emptied", "loadstart", "seeking", "seeked", "ratechange"];
    const onEvent = (event) => {
      if (["emptied", "loadstart"].includes(event.type)) {
        reset();
        waiting = false;
      } else if (["waiting", "stalled", "seeking"].includes(event.type)) {
        waiting = true;
        stableSince = null;
        if (tuning && event.type !== "seeking") limited = true;
        restore();
        qualityBaseline = null;
        healthyFrames = false;
      } else if (event.type === "ratechange") {
        restore();
        stableSince = null;
        qualityBaseline = null;
        healthyFrames = false;
      } else if (["playing", "canplay", "seeked", "pause", "ended"].includes(event.type)) {
        waiting = false;
        if (["pause", "ended"].includes(event.type)) {
          restore();
          stableSince = null;
          qualityBaseline = null;
          healthyFrames = false;
        }
      }
    };
    for (const type of events) video.addEventListener(type, onEvent);
    const onHidden = () => {
      if (doc.hidden) {
        restore();
        stableSince = null;
        qualityBaseline = null;
        healthyFrames = false;
      }
    };
    doc.addEventListener("visibilitychange", onHidden);
    function restore() {
      if (tuning) {
        for (const [key, value] of Object.entries(tuning.before)) if (tuning.engine.config[key] === tuning.after[key]) tuning.engine.config[key] = value;
        tuning = null;
      }
      policy = limited || clock() < cooldownUntil ? "limited" : engine ? "observed" : "native";
    }
    function reset() {
      restore();
      source = "";
      since = clock();
      fragments = [];
      stableSince = null;
      lastTime = null;
      lastAdvance = clock();
      limited = false;
      cooldownUntil = 0;
      qualityBaseline = null;
      healthyFrames = false;
      levelIndex = null;
    }
    function bindEngine() {
      let next = null;
      try {
        next = accessibleHls(candidate);
      } catch {
      }
      if (next === engine) return;
      restore();
      engineOff?.();
      engine = next;
      engineOff = null;
      fragments = [];
      stableSince = null;
      qualityBaseline = null;
      healthyFrames = false;
      levelIndex = null;
      limited = false;
      cooldownUntil = 0;
      since = clock();
      lastPolicyCheck = -Infinity;
      policy = engine ? "observed" : "native";
      if (engine) {
        const pageWin = win?.wrappedJSObject || win;
        const exposeTo = (fn) => {
          try {
            return typeof exportFunction === "function" ? exportFunction(fn, pageWin) : fn;
          } catch {
            return fn;
          }
        };
        const fragment = exposeTo((_event, raw) => {
          const data = raw?.wrappedJSObject || raw, stats = data?.stats || data?.frag?.stats, s = stats?.loading;
          if (!active() || data?.frag?.type && data.frag.type !== "main" || !s || !nonnegative(stats.loaded) || !(s.end > s.start) || s.start < since) return;
          fragments.push({ bytes: stats.loaded, start: s.start, end: s.end, duration: data.part ? null : data.frag?.duration });
          if (fragments.length > 32) fragments.shift();
        });
        const error = exposeTo((_event, raw) => {
          const data = raw?.wrappedJSObject || raw;
          if (data?.fatal || data?.details === "bufferFullError" || data?.error?.name === "QuotaExceededError") {
            limited = true;
            restore();
          }
        });
        const bound = engine;
        bound.on("hlsFragLoaded", fragment);
        bound.on("hlsError", error);
        engineOff = () => {
          bound.off("hlsFragLoaded", fragment);
          bound.off("hlsError", error);
        };
      }
    }
    function bitrates() {
      const level = engine?.levels?.[engine.currentLevel], loading = level?.maxBitrate || level?.bitrate;
      return { loading, budget: loading > 0 ? loading : loading === 0 ? observedMediaBitrate(fragments) : null };
    }
    function snapshot(state) {
      const now = clock(), time = state.time;
      const current = (kind === "jw" ? api?.getPlaylistItem?.()?.file || api?.getPlaylistItem?.()?.sources?.[0]?.file : video.currentSrc || video.src) || "";
      if (current !== source) {
        reset();
        source = current;
        waiting = false;
      }
      bindEngine();
      const ahead = bufferedAhead(video, time), enabled = active() && !state.ad;
      if (lastTime === null || Math.abs(time - lastTime) > 0.02) {
        lastTime = time;
        lastAdvance = now;
      }
      const stalled = !video.paused && !video.ended && (video.readyState < 3 && (waiting || now - lastAdvance > 900) || now - lastAdvance > 1500 && ahead < 0.25);
      const status = state.failed ? "error" : video.ended ? "ended" : video.paused ? "paused" : stalled ? "buffering" : video.readyState < 2 ? "loading" : state.ready ? "playing" : "ready";
      if (engine?.currentLevel !== levelIndex) {
        restore();
        levelIndex = engine?.currentLevel;
        stableSince = null;
        qualityBaseline = null;
        healthyFrames = false;
      }
      if (!enabled || status !== "playing" || video.seeking || ahead < 15 || video.playbackRate !== 1 || doc.hidden || now < cooldownUntil || tuning && engine.levels?.[engine.currentLevel]?.details?.live !== false) {
        stableSince = null;
        qualityBaseline = null;
        healthyFrames = false;
        if (tuning && stalled) limited = true;
        restore();
      } else if (stableSince === null) {
        stableSince = now;
        stableTime = time;
        qualityBaseline = null;
        healthyFrames = false;
      }
      if (!tuning && !limited && now >= cooldownUntil && policy === "limited") policy = engine ? "observed" : "native";
      if (now - lastPolicyCheck >= 1e3) {
        const delayed = now - lastPolicyCheck > 2500 && lastPolicyCheck !== -Infinity;
        lastPolicyCheck = now;
        let quality = null;
        try {
          quality = video.getVideoPlaybackQuality?.();
        } catch {
        }
        if (stableSince !== null && quality && Number.isFinite(quality.totalVideoFrames) && Number.isFinite(quality.droppedVideoFrames)) {
          if (!qualityBaseline) qualityBaseline = { total: quality.totalVideoFrames, dropped: quality.droppedVideoFrames, at: now };
          const total = quality.totalVideoFrames - qualityBaseline.total, dropped = quality.droppedVideoFrames - qualityBaseline.dropped;
          if (total < 0 || dropped < 0 || total >= 100 && dropped / total > 0.01 || total < 100 && dropped >= 3 && (total < 30 || dropped / total > 0.02) || tuning && delayed) {
            if (tuning) limited = true;
            cooldownUntil = now + 15e3;
            stableSince = null;
            qualityBaseline = null;
            healthyFrames = false;
            restore();
          } else if (now - qualityBaseline.at >= 5e3) {
            healthyFrames = total >= 100 && dropped / total <= 0.01;
            qualityBaseline = { total: quality.totalVideoFrames, dropped: quality.droppedVideoFrames, at: now };
          }
        } else {
          qualityBaseline = null;
          healthyFrames = false;
        }
      }
      const supportedHls = enabled && ["1.6.5", "1.6.8", "1.7.3"].includes(engine?.constructor?.version) && engine.levels?.[engine.currentLevel]?.details?.live === false && !limited && Number.isFinite(video.duration) && video.duration > 0;
      const adBreaks = supportedHls && status === "playing" && !video.seeking && video.playbackRate === 1 && !doc.hidden && now >= cooldownUntil ? readPlayerAdBreaks(candidate) : [];
      const upcomingAd = adBreaks.find((b) => b.start > time && b.start - time <= 45) || null;
      if (tuning?.ssai && !adBreaks.some((b) => b.end > time && b.start - time <= 45)) restore();
      if (upcomingAd) {
        const { loading: loadingBitrate, budget: bitrate } = bitrates();
        let cachedSeconds = 0;
        try {
          for (let i = 0; i < video.buffered.length; i++) cachedSeconds += video.buffered.end(i) - video.buffered.start(i);
        } catch {
          cachedSeconds = Infinity;
        }
        const original = tuning ? { ...engine.config, ...tuning.before } : engine.config;
        const plan = bufferExpansionPlan(original, bitrate, Math.max(0, cachedSeconds - ahead), loadingBitrate);
        const native = hlsBufferTarget(engine.config, loadingBitrate), actual = engine.streamController?.getMaxBufferLength?.(loadingBitrate);
        const owned = !tuning || Object.entries(tuning.after).every(([key, value]) => engine.config[key] === value);
        if (!owned) {
          limited = true;
          restore();
        } else if (plan && Number.isFinite(actual) && Math.abs(actual - native) < 0.01) {
          const maximum = hlsBufferTarget({ ...original, ...plan.after }, loadingBitrate);
          const desired = Math.ceil(upcomingAd.end + 10 - time);
          const target = Math.min(maximum, desired);
          if (target > native && engine.config.maxBufferLength < upcomingAd.end + 10 - time) {
            const after = { maxBufferLength: Math.max(original.maxBufferLength, target), maxMaxBufferLength: Math.max(original.maxMaxBufferLength, target) };
            Object.assign(engine.config, after);
            tuning = { engine, before: plan.before, after, since: tuning?.since ?? now, lastStep: tuning?.lastStep ?? now, ssai: !tuning || !!tuning.ssai };
            policy = "expanded";
          }
        }
      } else if (allowExpansion && supportedHls && (!tuning || now - tuning.lastStep >= 15e3) && healthyFrames && qualityBaseline && stableSince !== null && now - stableSince >= 15e3 && time - stableTime >= 12) {
        const { loading: loadingBitrate, budget: bitrate } = bitrates();
        let cachedSeconds = 0;
        try {
          for (let i = 0; i < video.buffered.length; i++) cachedSeconds += video.buffered.end(i) - video.buffered.start(i);
        } catch {
          cachedSeconds = Infinity;
        }
        const original = tuning ? { ...engine.config, ...tuning.before } : engine.config;
        const plan = bufferExpansionStep(original, engine.config, bitrate, Math.max(0, cachedSeconds - ahead), loadingBitrate);
        const measured = fragments.filter((s) => s.end >= now - 3e4), seconds = measured.reduce((n, s) => n + (s.end - s.start) / 1e3, 0), bytes = measured.reduce((n, s) => n + s.bytes, 0);
        const native = hlsBufferTarget(engine.config, loadingBitrate), actual = engine.streamController?.getMaxBufferLength?.(loadingBitrate);
        const owned = !tuning || Object.entries(tuning.after).every(([key, value]) => engine.config[key] === value);
        if (!owned) {
          limited = true;
          restore();
        } else if (plan && measured.length >= 3 && seconds > 0 && bytes * 8 / seconds > bitrate * 2 && Number.isFinite(actual) && Math.abs(actual - native) < 0.01) {
          Object.assign(engine.config, plan.after);
          tuning = { engine, ...plan, since: tuning?.since ?? now, lastStep: now };
          policy = "expanded";
        }
      }
      if (tuning) {
        let cached = 0;
        try {
          for (let i = 0; i < video.buffered.length; i++) cached += video.buffered.end(i) - video.buffered.start(i);
        } catch {
          cached = Infinity;
        }
        const { budget: bitrate } = bitrates();
        const recent2 = fragments.filter((s) => s.start >= tuning.since && s.end >= now - 3e4).slice(-3);
        const loadingSeconds = recent2.reduce((n, s) => n + (s.end - s.start) / 1e3, 0), loadedBytes = recent2.reduce((n, s) => n + s.bytes, 0);
        const slow = recent2.length === 3 && loadingSeconds >= 3 && loadedBytes * 8 / loadingSeconds < bitrate * 1.25;
        if (!(bitrate > 0) || cached * bitrate * 1.15 / 8 > 96 * 1024 * 1024 || slow) {
          limited = true;
          restore();
        }
      }
      const diagnosticSource = /^https?:\/\//.test(source) ? source : network.source(candidate.declaredSource);
      let speed = enabled ? network.speed(diagnosticSource, since) : null;
      const recent = fragments.filter((s) => s.end >= Math.max(since, now - 5e3));
      if (enabled && recent.length) {
        const bytes = recent.reduce((n, s) => n + s.bytes, 0);
        let duration = 0, end = -Infinity;
        for (const s of [...recent].sort((a, b) => a.start - b.start)) {
          duration += Math.max(0, s.end - Math.max(end, s.start));
          end = Math.max(end, s.end);
        }
        if (duration > 0) speed = bytes * 1e3 / duration;
      }
      return { ahead: enabled ? ahead : 0, status, bytesPerSecond: nonnegative(speed) ? speed : null, online: win.navigator.onLine !== false, bufferPolicy: policy };
    }
    return { snapshot(state) {
      if (disposed) return null;
      try {
        return snapshot(state);
      } catch {
        restore();
        return { ahead: 0, status: "ready", bytesPerSecond: null, online: win.navigator.onLine !== false, bufferPolicy: "native" };
      }
    }, dispose() {
      disposed = true;
      restore();
      engineOff?.();
      network.dispose();
      doc.removeEventListener("visibilitychange", onHidden);
      for (const type of events) video.removeEventListener(type, onEvent);
    } };
  }

  // shared/engines/players.js
  function mediaVisible(node, win) {
    if (!node?.isConnected) return false;
    for (let n = node; n && n.nodeType === 1; n = n.parentElement) {
      const style = win.getComputedStyle(n);
      if (n.hidden || style.display === "none" || style.visibility === "hidden") return false;
    }
    return true;
  }
  function playerCandidate(win, page = win, { nativeContract = () => false } = {}) {
    const doc = win.document;
    const videos = [...doc.querySelectorAll("video")].filter((v) => mediaVisible(v, win));
    if (videos.length !== 1) return null;
    const video = videos[0], jwRoot = video.closest(".jwplayer");
    if (jwRoot) {
      try {
        const api = typeof page.jwplayer === "function" && page.jwplayer(jwRoot.id);
        const container = api?.getContainer?.();
        if ((container?.wrappedJSObject || container) === (jwRoot.wrappedJSObject || jwRoot) && typeof api.seek === "function" && typeof api.getPosition === "function") return { kind: "jw", video, root: jwRoot, api };
      } catch {
      }
      return null;
    }
    const artRoot = video.closest(".art-video-player");
    if (artRoot && video.classList.contains("art-video")) {
      let declaredSource = "";
      try {
        const url = new URL(win.location.href).searchParams.get("url");
        if (artRoot.parentElement?.id === "player" && /^https?:\/\//.test(url || "")) declaredSource = new URL(url).href;
      } catch {
      }
      return { kind: "art-native", video, root: artRoot, declaredSource };
    }
    if (video.id === "vid" && video.classList.contains("vid") && doc.querySelector(".guildline") && doc.querySelector(".loading-screen")) return { kind: "native-cdn", video, root: video.parentElement };
    const nativeRoot = nativeContract(video);
    if (nativeRoot?.nodeType === 1 && nativeRoot.contains(video)) return { kind: "html5", video, root: nativeRoot };
    return null;
  }
  function playerTracks(candidate) {
    if (candidate?.kind !== "jw") return {};
    const api = candidate.api, groups = { quality: ["getQualityLevels", "getCurrentQuality", "setCurrentQuality"], audio: ["getAudioTracks", "getCurrentAudioTrack", "setCurrentAudioTrack"], captions: ["getCaptionsList", "getCurrentCaptions", "setCurrentCaptions"] }, result = {};
    for (const [kind, [list, current, set]] of Object.entries(groups)) try {
      if (typeof api[list] !== "function" || typeof api[current] !== "function" || typeof api[set] !== "function") continue;
      const items = api[list]();
      if (!Array.isArray(items) || items.length > 100) continue;
      const selected = api[current]();
      result[kind] = items.map((item, id) => ({ id, label: String(item.label || item.name || (kind === "captions" && id === 0 ? "T\u1EAFt" : id + 1)).slice(0, 100), active: id === selected }));
    } catch {
    }
    return result;
  }
  function selectPlayerTrack(candidate, kind, id) {
    const names = { quality: "setCurrentQuality", audio: "setCurrentAudioTrack", captions: "setCurrentCaptions" };
    if (candidate?.kind !== "jw" || !Object.hasOwn(names, kind) || !Number.isInteger(id) || !playerTracks(candidate)[kind]?.some((item) => item.id === id)) return false;
    try {
      candidate.api[names[kind]](id);
      return true;
    } catch {
      return false;
    }
  }
  function attachPlayer(candidate, { canRestoreAudio = () => true, monitorLoad = true, allowExpansion = true } = {}) {
    const { kind, video, root, api } = candidate;
    const initialSource = playerFingerprint(candidate);
    let audioGeneration = 0;
    const loadMonitor = monitorLoad ? mediaLoadMonitor(candidate, { active: canRestoreAudio, allowExpansion }) : null;
    const audio = () => {
      try {
        const muted = kind === "jw" && typeof api.getMute === "function" ? api.getMute() : video.muted, volume = kind === "jw" && typeof api.getVolume === "function" ? api.getVolume() / 100 : video.volume;
        return { muted: !!muted, volume: finite(volume) && volume >= 0 && volume <= 1 ? volume : 1 };
      } catch {
        return { muted: !!video.muted, volume: finite(video.volume) ? video.volume : 1 };
      }
    };
    const pageWin = video.ownerDocument.defaultView?.wrappedJSObject || video.ownerDocument.defaultView;
    const exposeTo = (fn) => {
      try {
        return typeof exportFunction === "function" ? exportFunction(fn, pageWin) : fn;
      } catch {
        return fn;
      }
    };
    const noop = exposeTo(() => {
    });
    const setMute = (value) => kind === "jw" && typeof api.setMute === "function" ? api.setMute(value) : video.muted = value;
    const setVolume = (value) => kind === "jw" && typeof api.setVolume === "function" ? api.setVolume(value * 100) : video.volume = value;
    function restoreAudio(value) {
      const wanted = audioPreference(value);
      if (!wanted || !canRestoreAudio()) return false;
      const navigator = video.ownerDocument.defaultView.navigator;
      if (!wanted.muted && wanted.volume > 0 && typeof navigator.getAutoplayPolicy === "function") {
        try {
          if (navigator.getAutoplayPolicy(video) !== "allowed") return false;
        } catch {
        }
      }
      const previous = audio(), generation = ++audioGeneration;
      const rollback = exposeTo(() => {
        if (generation !== audioGeneration || playerFingerprint(candidate) !== initialSource || !video.isConnected || !canRestoreAudio() || !state().ready) return;
        try {
          setVolume(previous.volume)?.catch?.(noop);
        } catch {
        }
        try {
          setMute(previous.muted)?.catch?.(noop);
        } catch {
        }
      });
      try {
        setVolume(wanted.volume)?.catch?.(rollback);
        setMute(wanted.muted)?.catch?.(rollback);
        return true;
      } catch {
        rollback();
        return false;
      }
    }
    let adActive = false;
    const handlers = [], subscribers = /* @__PURE__ */ new Set();
    if (kind === "jw") for (const [event, value] of [["adRequest", true], ["adPlay", true], ["adComplete", false], ["adSkipped", false], ["adError", false]]) {
      const handler = exposeTo(() => {
        adActive = value;
        for (const notify of subscribers) notify();
      });
      api.on?.(event, handler);
      handlers.push([event, handler]);
    }
    const isAd = () => adActive || !!video.closest(".jw-flag-ads,.jw-ad-media") || ["loading", "playing", "paused"].includes(api?.getAdState?.());
    const state = () => {
      try {
        const duration = kind === "jw" ? api.getDuration() : video.duration;
        const time = kind === "jw" ? api.getPosition() : video.currentTime;
        const ad = !!isAd();
        const connected = video.isConnected && playerFingerprint(candidate) === initialSource && mediaVisible(video, video.ownerDocument.defaultView), engineState = kind === "jw" ? api.getState?.() : null, failed = !!video.error || engineState === "error";
        const item = kind === "jw" ? api.getPlaylistItem?.() : null, file = item?.file || item?.sources?.[0]?.file;
        const initializable = connected && !failed && !ad && video.readyState === 0 && kind === "jw" && ["idle", "paused"].includes(engineState) && typeof file === "string" && /^(?:https?:\/\/|data:application\/vnd\.apple\.mpegurl;base64,)/i.test(file);
        const value = { kind, failed, initializable, ready: connected && !failed && video.readyState >= 1 && finite(duration) && duration > 0 && finite(time) && !ad, ad, time: finite(time) ? time : 0, duration: finite(duration) ? duration : 0, rate: video.playbackRate, paused: video.paused, ended: video.ended, played: video.played.length > 0 };
        return loadMonitor ? { ...value, load: loadMonitor.snapshot(value) } : value;
      } catch {
        return { kind, ready: false, ad: true, time: 0, duration: 0, rate: 1, paused: true, ended: false, played: false };
      }
    };
    const command = (action, value) => {
      const s = state();
      if (action === "initialize-play-audible") {
        if (!s.initializable) return false;
        api.setMute(false);
        const volume = api.getVolume?.();
        if (!finite(volume) || volume <= 0) api.setVolume?.(100);
        api.play(true)?.catch?.(noop);
        return true;
      }
      if (!s.ready || s.ad) return false;
      switch (action) {
        case "seek":
          if (!finite(value)) return false;
          if (kind === "jw") api.seek(clampSeek(value, s.duration));
          else video.currentTime = clampSeek(value, s.duration);
          break;
        case "rate":
          if (!finite(value) || value < 0.25 || value > 4) return false;
          if (kind === "jw" && typeof api.setPlaybackRate === "function") api.setPlaybackRate(value);
          else video.playbackRate = value;
          break;
        case "restore-audio":
          return restoreAudio(value);
        case "mute":
          if (typeof value !== "boolean") return false;
          audioGeneration++;
          setMute(value);
          break;
        case "play-audible": {
          audioGeneration++;
          if (kind === "jw" && typeof api.setMute === "function") api.setMute(false);
          else video.muted = false;
          const volume = kind === "jw" && typeof api.getVolume === "function" ? api.getVolume() / 100 : video.volume;
          if (!finite(volume) || volume <= 0) {
            if (kind === "jw" && typeof api.setVolume === "function") api.setVolume(100);
            else video.volume = 1;
          }
        }
        // Fall through so sound and playback are changed in the same handler.
        case "play":
          if (kind === "jw" && typeof api.play === "function") api.play(true)?.catch?.(noop);
          else video.play()?.catch(() => {
          });
          break;
        case "pause":
          if (kind === "jw" && typeof api.pause === "function") api.pause(true);
          else video.pause();
          break;
        default:
          return false;
      }
      return true;
    };
    return { kind, video, root, api, state, command, audio, tracks: () => playerTracks(candidate), selectTrack: (group, id) => state().ready && selectPlayerTrack(candidate, group, id), fingerprint: () => playerFingerprint(candidate), subscribe(notify) {
      subscribers.add(notify);
      return () => subscribers.delete(notify);
    }, dispose() {
      audioGeneration++;
      loadMonitor?.dispose();
      subscribers.clear();
      for (const [event, handler] of handlers) api.off?.(event, handler);
    } };
  }
  function playerFingerprint(candidate) {
    try {
      const item = candidate?.kind === "jw" ? candidate.api.getPlaylistItem?.() : null;
      return [candidate?.video.currentSrc || candidate?.video.src || "", item?.file || item?.sources?.[0]?.file || ""].join("\0");
    } catch {
      return "";
    }
  }

  // rophim/lib/bridge.js
  function validState(s) {
    return s && ["jw", "art-native", "native-cdn", "html5"].includes(s.kind) && typeof s.ready === "boolean" && (s.initializable === void 0 || typeof s.initializable === "boolean") && (s.failed === void 0 || typeof s.failed === "boolean") && typeof s.ad === "boolean" && typeof s.played === "boolean" && typeof s.paused === "boolean" && typeof s.ended === "boolean" && finite(s.time) && s.time >= 0 && finite(s.duration) && s.duration >= 0 && s.time <= s.duration + 5 && finite(s.rate) && s.rate >= 0.25 && s.rate <= 4;
  }
  function acceptsPacket(event, session, channel) {
    const d = event.data;
    return !!session && event.source === session.source && event.origin === session.origin && d?.channel === channel && d.token === session.token && d.generation === session.generation && Number.isSafeInteger(d.seq) && d.seq > session.seq;
  }
  function bridgeContext(value) {
    const keys = ["source", "movie", "movieID", "title", "episode", "episodeID", "season", "lane", "server", "url"];
    if (!value || !["next-ordered", "next-basic", "legacy-panels"].includes(value.source) || keys.some((k) => typeof value[k] !== "string" || value[k].length > 2048)) return null;
    const url = safeURL(value.url);
    if (!url || !isSiteOrigin(url.origin) || !url.pathname.startsWith("/xem-phim/")) return null;
    const result = Object.fromEntries(keys.map((k) => [k, value[k]]));
    for (const key of ["originalTitle", "year", "mediaType", "externalImdb", "externalTmdb", "poster"]) if (typeof value[key] === "string" && value[key].length <= 2048) result[key] = value[key];
    return result;
  }
  function createBridge(win, page, feature, callbacks = {}) {
    const channel = "rophim." + feature + ".v1";
    const top = win.parent === win;
    const doc = win.document;
    if (top ? !isSiteOrigin(win.location.origin) : !isFrameURL(win.location.href)) return { dispose() {
    }, state: () => null, command: () => false };
    let session = null, site = null, context = null, local = null, media = "", lastSource = "", remote = null, generation = 0, sequence = 0, disposed = false;
    let boundFrame = null, frameFullscreen = false, frameLocked = false, controlsReady = false;
    let snapshot = null, pending = "", retryAfter = 0, fetchKey = "", fetchAttempts = 0;
    const requests = /* @__PURE__ */ new Map();
    const resultStatuses = (action) => action === "fullscreen" ? ["fullscreen", "windowed", "error", "unavailable"] : ["missing", "error", "navigating", "unavailable"];
    const clearRequests = () => {
      for (const request of requests.values()) {
        win.clearTimeout(request.timer);
        request.resolve("unavailable");
      }
      requests.clear();
    };
    const referrer = safeURL(win.document.referrer)?.origin;
    const emit = () => callbacks.update?.({ site, context, player: local, state: top ? remote : local?.state(), media, fullscreen: frameFullscreen, locked: frameLocked, controlsReady: top ? controlsReady : false });
    const resetRemote = () => {
      remote = null;
      controlsReady = false;
      media = "";
      session = null;
      generation++;
      emit();
    };
    const loaded = () => {
      resetRemote();
      tick();
    };
    const send = (data) => {
      if (session) session.source.postMessage({ ...data, channel, token: session.token, generation: session.generation, seq: ++sequence }, session.origin);
    };
    const report = () => {
      if (local && session) send({ type: "state", state: local.state(), media, controlsReady: callbacks.controlsReady?.() === true });
    };
    const onMessage = (event) => {
      const d = event.data;
      if (!d || d.channel !== channel) return;
      if (!top && d.type === "hello") {
        if (event.source !== win.parent || !isSiteOrigin(event.origin) || referrer && event.origin !== referrer || !/^[a-f\d]{32}$/.test(d.token) || !Number.isSafeInteger(d.generation)) return;
        if (!Number.isSafeInteger(d.seq) || d.seq < 0) return;
        if (session?.token !== d.token || session?.generation !== d.generation) {
          clearRequests();
          session = { source: event.source, origin: event.origin, token: d.token, generation: d.generation, seq: -1, lockSynced: false };
          sequence = 0;
        }
        if (d.seq <= session.seq) return;
        session.seq = d.seq;
        const nextContext2 = bridgeContext(d.context);
        if (contextKey(nextContext2) !== contextKey(context)) clearRequests();
        context = nextContext2;
        frameFullscreen = d.fullscreen === true;
        if (!frameFullscreen) frameLocked = false;
        else if (!session.lockSynced) {
          session.lockSynced = true;
          frameLocked = d.locked === true;
        }
        emit();
        report();
        return;
      }
      if (!acceptsPacket(event, session, channel)) return;
      if (top) {
        if (!boundFrame?.isConnected || boundFrame.contentWindow !== event.source || boundFrame.src !== session.src || contextKey(context) !== session.key) return;
        if (d.type === "state" && validState(d.state) && /^[a-f\d]{32}$/.test(d.media)) {
          session.seq = d.seq;
          session.seen = Date.now();
          media = d.media;
          remote = { ...d.state, load: validLoadMetrics(d.state.load) ? Object.fromEntries(["ahead", "status", "bytesPerSecond", "online", "bufferPolicy"].map((key) => [key, d.state.load[key]])) : null };
          controlsReady = d.controlsReady === true;
          emit();
        } else if (d.type === "lock" && typeof d.locked === "boolean" && (!media || d.media === media)) {
          session.seq = d.seq;
          frameFullscreen = !!win.document.fullscreenElement?.contains(boundFrame);
          frameLocked = frameFullscreen && d.locked;
        } else if (d.type === "request" && ["next", "fullscreen"].includes(d.action) && /^[a-f\d]{32}$/.test(d.id) && d.media === media && remote?.ready && !remote.ad && Date.now() - session.seen <= 4e3) {
          session.seq = d.seq;
          if (session.requesting && Date.now() <= session.requesting.until) return;
          const active = session, activeMedia = media, requestMarker = { until: Date.now() + 11e3 };
          active.requesting = requestMarker;
          const isCurrent = () => !disposed && session === active && active.requesting === requestMarker && Date.now() <= requestMarker.until && media === activeMedia && boundFrame?.isConnected && boundFrame.contentWindow === active.source && boundFrame.src === active.src && contextKey(context) === active.key && remote?.ready && !remote.ad;
          Promise.resolve().then(() => isCurrent() ? callbacks.request?.(d.action, { isCurrent }) : "unavailable").then((status) => {
            if (!isCurrent()) return;
            send({ type: "result", id: d.id, media: activeMedia, status: resultStatuses(d.action).includes(status) ? status : "error" });
          }).catch(() => {
            if (isCurrent()) send({ type: "result", id: d.id, media: activeMedia, status: "error" });
          }).finally(() => {
            if (active.requesting === requestMarker) active.requesting = null;
          });
        }
      } else if (d.type === "command" && d.media === media) {
        session.seq = d.seq;
        try {
          local?.command(d.action, d.value);
        } catch {
        }
      } else if (!top && d.type === "result" && d.media === media && requests.has(d.id) && resultStatuses(requests.get(d.id).action).includes(d.status)) {
        session.seq = d.seq;
        const request = requests.get(d.id);
        requests.delete(d.id);
        win.clearTimeout(request.timer);
        request.resolve(d.status);
      }
    };
    const tick = () => {
      if (disposed) return;
      if (top) {
        let nextSite = detectSite(win.document, win.location.href, page);
        const liveFrame = win.document.querySelector(".player-ratio iframe#embed-player");
        const currentHref = win.location.href;
        if (!nextSite && snapshot?.href === currentHref && snapshot.src === liveFrame?.src) {
          nextSite = { ...snapshot.site, frame: liveFrame };
        }
        const nextFetchKey = liveFrame ? currentHref + "|" + liveFrame.src : "";
        if (nextFetchKey !== fetchKey) {
          fetchKey = nextFetchKey;
          fetchAttempts = 0;
          retryAfter = 0;
        }
        if (!nextSite && liveFrame && typeof win.fetch === "function" && currentHref !== pending && fetchAttempts < 3 && Date.now() > retryAfter && win.location.pathname.startsWith("/xem-phim/")) {
          pending = currentHref;
          fetchAttempts++;
          retryAfter = Date.now() + 5e3 * fetchAttempts;
          win.fetch(currentHref, { credentials: "same-origin" }).then((r) => r.ok ? r.text() : "").then((html) => {
            if (!html || html.length > 2e6 || disposed || win.location.href !== currentHref || !liveFrame.isConnected) return;
            const parsed = new win.DOMParser().parseFromString(html, "text/html");
            const found = detectSite(parsed, currentHref);
            if (found && found.frame.src === liveFrame.src) {
              snapshot = { href: currentHref, src: liveFrame.src, site: found };
              commitWatchSite(win.document, found);
              tick();
            }
          }).catch(() => {
          }).finally(() => {
            pending = "";
          });
        }
        const nextContext2 = readContext(nextSite, win.document);
        const frame = nextSite?.frame, url = safeURL(frame?.src);
        const changed = frame !== boundFrame || contextKey(nextContext2) !== contextKey(context) || frame?.src !== session?.src;
        site = nextSite;
        context = nextContext2;
        if (changed) {
          boundFrame?.removeEventListener("load", loaded);
          boundFrame = frame || null;
          resetRemote();
          boundFrame?.addEventListener("load", loaded);
        }
        if (!nextContext2 || !frame || !url || !isFrameURL(url.href) || !frame.contentWindow || frame.hasAttribute("sandbox") && !frame.sandbox.contains("allow-same-origin")) {
          diagnostic(win.document, feature, nextContext2 ? "iframe ch\u01B0a c\u1EA5p quy\u1EC1n/kh\xF4ng nh\u1EADn di\u1EC7n" : "ch\u1EDD ngu\u1ED3n website");
          return;
        }
        if (!session) {
          session = { source: frame.contentWindow, origin: url.origin, src: frame.src, key: contextKey(context), token: token(win), generation, seq: -1, seen: 0 };
          sequence = 0;
        }
        frameFullscreen = !!win.document.fullscreenElement?.contains(frame);
        if (!frameFullscreen) frameLocked = false;
        send({ type: "hello", context, fullscreen: frameFullscreen, locked: frameLocked });
        if (session.seen && Date.now() - session.seen > 4e3) {
          remote = null;
          controlsReady = false;
          media = "";
          emit();
        }
        diagnostic(win.document, feature, site.kind + "/" + (remote?.ready ? remote.kind : "ch\u1EDD player n\u1ED9i dung"));
      } else {
        const nativeContract = (video) => video.id === "video" && video.closest("#player-wrap")?.querySelector("#controls") ? video.closest("#player-wrap") : null;
        const candidate = playerCandidate(win, page, { nativeContract });
        let source = "";
        try {
          source = candidate ? playerFingerprint(candidate) : "";
        } catch {
        }
        if (candidate?.video !== local?.video || candidate?.api !== local?.api || candidate?.kind !== local?.kind || source !== lastSource) {
          clearRequests();
          callbacks.unbind?.(local);
          local?.dispose();
          local = candidate ? attachPlayer(candidate, { monitorLoad: feature === "gestures" }) : null;
          lastSource = source;
          media = local ? token(win) : "";
          emit();
        }
        if (local) {
          emit();
          report();
        }
        diagnostic(win.document, feature, local ? local.kind + "/" + (local.state().ready ? "ready" : "ch\u1EDD metadata/n\u1ED9i dung") : "player ch\u01B0a nh\u1EADn di\u1EC7n");
      }
    };
    const onFullscreenChange = () => {
      if (!top || disposed) return;
      frameFullscreen = !!boundFrame && !!doc.fullscreenElement?.contains(boundFrame);
      if (!frameFullscreen) frameLocked = false;
      if (session) send({ type: "hello", context, fullscreen: frameFullscreen, locked: frameLocked });
    };
    win.addEventListener("message", onMessage);
    if (top) doc.addEventListener("fullscreenchange", onFullscreenChange);
    const offDOM = watchDOM(win, tick), timer = win.setInterval(tick, 1e3);
    tick();
    const bridge = {
      state: () => top ? remote : local?.state(),
      context: () => context,
      command(action, value) {
        if (!top) return local?.command(action, value) || false;
        if (!remote?.ready || remote.ad || !media || !session || Date.now() - session.seen > 4e3) return false;
        send({ type: "command", action, value, media });
        return true;
      },
      setLocked(value) {
        if (top || !session || !media) return false;
        frameLocked = frameFullscreen && !!value;
        if (session) session.lockSynced = true;
        send({ type: "lock", locked: frameLocked, media });
        return true;
      },
      request(action) {
        if (top || !["next", "fullscreen"].includes(action) || !local?.state().ready || !session || !context) return false;
        if (requests.size) return false;
        const id = token(win);
        return new Promise((resolve) => {
          const timer2 = win.setTimeout(() => {
            requests.delete(id);
            resolve("timeout");
          }, 12e3);
          requests.set(id, { resolve, timer: timer2, action });
          report();
          send({ type: "request", action, id, media });
        });
      },
      refresh: tick,
      dispose() {
        disposed = true;
        clearRequests();
        win.clearInterval(timer);
        offDOM();
        win.removeEventListener("message", onMessage);
        if (top) doc.removeEventListener("fullscreenchange", onFullscreenChange);
        boundFrame?.removeEventListener("load", loaded);
        callbacks.unbind?.(local);
        local?.dispose();
      }
    };
    return bridge;
  }

  // rophim/lib/history.js
  var HISTORY_PREFIX = "rp.history.v1.";
  function validHistory(row) {
    const url = safeURL(row?.url);
    return row?.version === 1 && !!contextKey(row) && ["next-ordered", "next-basic", "legacy-panels"].includes(row.source) && ["movieID", "movie", "title", "episode", "episodeID", "season", "lane", "server", "url"].every((k) => typeof row[k] === "string" && row[k].length <= 2048) && url && isSiteOrigin(url.origin) && url.pathname.startsWith("/xem-phim/") && finite(row.time) && row.time >= 0 && finite(row.duration) && row.duration > 0 && row.time <= row.duration + 5 && finite(row.updated);
  }
  function historyRow(context, state, now = Date.now()) {
    if (!context || !state?.ready || state.ad || !state.played || !finite(state.time) || !finite(state.duration) || state.duration <= 0) return null;
    const row = { ...context, version: 1, time: Math.max(0, Math.min(state.time, state.duration)), duration: state.duration, completed: state.ended || state.duration - state.time < 15, updated: now };
    return validHistory(row) ? row : null;
  }
  function createHistoryStore(store) {
    const key = (c) => HISTORY_PREFIX + contextKey(c);
    const all = () => store.keys().filter((k) => k.startsWith(HISTORY_PREFIX)).map((k) => store.get(k, null)).filter(validHistory).sort((a, b) => b.updated - a.updated);
    return {
      read(c) {
        return c ? all().find((row) => sameEpisode(c, row)) : null;
      },
      save(row) {
        if (!validHistory(row)) return false;
        const old = store.get(key(row), null);
        if (old?.updated > row.updated) return false;
        store.set(key(row), row);
        return true;
      },
      list() {
        const rows = [];
        for (const row of all()) if (!rows.some((other) => sameEpisode(row, other))) rows.push(row);
        return rows;
      },
      continuing() {
        const rows = [];
        for (const row of all()) if (!rows.some((other) => sameFilm(row, other) && row.season === other.season && laneKey(row.lane) === laneKey(other.lane))) rows.push(row);
        return rows.filter((row) => !row.completed);
      },
      remove(c) {
        for (const row of all()) if (sameEpisode(c, row)) store.remove(key(row));
      }
    };
  }

  // rophim/lib/history-navigation.js
  async function historyDestination(row, win) {
    if (!isSiteOrigin(win.location.origin)) return null;
    const original = safeURL(row.url);
    if (original?.origin === win.location.origin && original.pathname.startsWith("/xem-phim/")) return { url: original.href, source: row.source, lane: row.lane };
    const watchCandidates = [], detailCandidates = [];
    for (const a of win.document.querySelectorAll("a[href]")) {
      const url = safeURL(a.href, win.location.href);
      if (url?.origin === win.location.origin && /^\/(?:phim|xem-phim)\//.test(url.pathname) && (url.pathname.includes("/" + row.movie) || identityText(a.textContent) === identityText(row.title))) {
        (url.pathname.startsWith("/xem-phim/") ? watchCandidates : detailCandidates).push(url.href);
      }
    }
    const candidates = [...watchCandidates, ...detailCandidates];
    if (/^[a-z0-9-]{1,200}$/i.test(row.movie)) candidates.push(new URL("/xem-phim/" + row.movie, win.location.href).href);
    const load = async (url) => {
      const response = await win.fetch(url, { credentials: "same-origin" });
      if (!response.ok || response.url && safeURL(response.url)?.origin !== win.location.origin) return null;
      const html = await response.text();
      return html.length <= 2e6 ? { doc: new win.DOMParser().parseFromString(html, "text/html"), url: response.url || url } : null;
    };
    for (const rawUrl of [...new Set(candidates)].slice(0, 5)) {
      let loaded = await load(rawUrl);
      if (!loaded) continue;
      let { doc, url } = loaded;
      let site = detectSite(doc, url);
      if (!site && safeURL(url)?.pathname.startsWith("/phim/")) {
        const slug = safeURL(url).pathname.slice("/phim/".length).replace(/\/.*$/, "");
        const watchLinks = [...doc.querySelectorAll("a[href]")].map((a) => safeURL(a.getAttribute("href"), url)).filter((u) => u?.origin === win.location.origin && u.pathname.startsWith("/xem-phim/"));
        const watchLink = watchLinks.find((u) => slug && u.pathname.includes("/" + slug) || u.pathname.includes("/" + row.movie)) || watchLinks[0];
        if (watchLink) {
          loaded = await load(watchLink.href);
          if (!loaded) continue;
          ({ doc, url } = loaded);
          site = detectSite(doc, url);
        }
      }
      const context = readContext(site, doc);
      if (!context || !sameFilm(row, context)) continue;
      switch (site.kind) {
        case "next-ordered":
        case "next-basic": {
          const prefix = site.kind === "next-basic" ? "/api/baseapi" : "/baseapi";
          const response = await win.fetch(prefix + "/api/v1/episodes/by-idMovie/" + encodeURIComponent(context.movieID), { credentials: "same-origin" });
          if (!response.ok) return null;
          const data = await response.json(), entries = Array.isArray(data) ? data : data.result;
          if (!Array.isArray(entries) || entries.length > 1e4) return null;
          const found = entries.filter((e) => laneKey(e.server_type || e.server) === laneKey(row.lane) && String(e.season_number || 1) === row.season && episodeKey(e.name) === episodeKey(row.episode));
          if (found.length !== 1 || !/^\d+$/.test(String(found[0].id))) return null;
          return { url: new URL("/xem-phim/" + encodeURIComponent(context.movie) + "." + found[0].id, win.location.href).href, source: site.kind, lane: found[0].server_type || found[0].server };
        }
        case "legacy-panels": {
          if (String(context.season || "1") !== String(row.season || "1")) continue;
          const lane = laneKey(row.lane);
          if (!["subtitle", "voiceover"].includes(lane)) return null;
          const nodes = [...doc.querySelectorAll(lane === "voiceover" ? ".btn-episode.chaptertm" : ".btn-episode.chaptervs")];
          const found = nodes.filter((n) => episodeKey(n.querySelector(".v-title,.info")?.textContent.trim() || n.textContent.trim()) === episodeKey(row.episode));
          const target = found.length === 1 ? safeURL(found[0].getAttribute("href"), url) : null;
          return target?.origin === win.location.origin ? { url: target.href, source: site.kind, lane } : null;
        }
        default:
          return null;
      }
    }
    return null;
  }

  // rophim/lib/ui.js
  function makeButton(doc, label, action, parent) {
    const b = doc.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      action(event);
    });
    parent?.append(b);
    return b;
  }
  function toast(host, text) {
    let node = host.querySelector(".rp-toast");
    if (!node) {
      node = host.ownerDocument.createElement("output");
      node.className = "rp-toast";
      node.setAttribute("aria-live", "polite");
      host.append(node);
    }
    node.textContent = text;
  }

  // rophim/lib/history-layout.js
  function historyPlacement(doc, watch = false) {
    if (watch) {
      const player = doc.querySelector("#wrapper .watch-player,.watch-player");
      if (player) return { kind: "watch", parent: player.parentElement, after: player };
      const frame = doc.querySelector(".player-ratio iframe#embed-player,iframe#player.player-iframe");
      const ratio = frame?.closest(".player-ratio");
      return ratio ? { kind: "watch", parent: ratio.parentElement, after: ratio } : null;
    }
    const hero = doc.querySelector("#top_slider .top-slide-wrap");
    const content = doc.querySelector("#wrapper.wrapper-w-slide > .fluid-gap");
    if (hero && content) return { kind: "cinema", parent: content, before: content.firstElementChild };
    const board = doc.querySelector("#section-first.home-section .container .home-board");
    if (board) return { kind: "landing", parent: board.parentElement, after: board };
    const main = doc.querySelector("main");
    if (main && main.querySelector('a[href^="/phim/"],a[href^="/xem-phim/"]')) {
      const banner = main.querySelector(".hero,.slideshow,[data-hero]");
      return banner && banner.parentElement === main ? { kind: "content", parent: main, after: banner } : { kind: "content", parent: main, before: main.firstElementChild };
    }
    return null;
  }
  function placeHistory(node, placement) {
    if (!placement) return false;
    node.dataset.rpLayout = placement.kind;
    if (placement.after) {
      if (node.parentElement !== placement.parent || placement.after.nextElementSibling !== node) placement.after.after(node);
    } else if (node.parentElement !== placement.parent || placement.before && placement.before !== node && node.nextElementSibling !== placement.before) {
      placement.parent.insertBefore(node, placement.before === node ? node.nextSibling : placement.before || null);
    }
    return true;
  }

  // rophim/lib/history-ui.js
  function historyIcon(name) {
    const paths = { play: '<path d="M8 5l11 7-11 7z"/>', arrow: '<path d="M5 12h14m-5-5l5 5-5 5"/>', external: '<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>', history: '<path d="M3 11a9 9 0 1 1 2.5 7M3 4v7h7m2-4v5l3 2"/>', trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>' };
    return `<svg viewBox="0 0 24 24" fill="${name === "play" ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
  }
  function historyEpisode(row) {
    const episode = /^(?:tập\s*)?full$/i.test(row.episode) ? "Phim l\u1EBB" : /^tập\b/i.test(row.episode) ? row.episode : "T\u1EADp " + row.episode.replace(/^0+(?=\d)/, "");
    const lane = { subtitle: "Vietsub", dubbed: "L\u1ED3ng ti\u1EBFng", voiceover: "Thuy\u1EBFt minh" }[laneKey(row.lane)] || row.lane;
    return (Number(row.season) > 1 ? "Ph\u1EA7n " + row.season + " \xB7 " : "") + episode + " \xB7 " + lane;
  }
  function historyArtwork(row, doc) {
    const stored = safeURL(row.poster, row.url);
    if (stored && row.poster) return stored.href;
    for (const link of doc.querySelectorAll("a[href]")) {
      if (link.closest("[data-rp-ui]")) continue;
      const url = safeURL(link.href, doc.location?.href), label = link.getAttribute("title") || link.textContent;
      const slug = url?.pathname.match(/^\/(?:phim|xem-phim)\/([^/]+)\/?$/)?.[1]?.replace(/\.\d+$/, "").replace(/-tap-\d+$/, "");
      if (url?.origin === doc.location?.origin && slug && (slug === row.movie || identityText(label) && identityText(label) === identityText(row.title))) {
        const image = link.querySelector("img"), raw = image?.getAttribute("data-src") || image?.getAttribute("src");
        const imageURL = raw ? safeURL(raw, url.href) : null;
        if (imageURL) return imageURL.href;
      }
    }
    return "";
  }
  async function loadHistoryArtwork(row, win) {
    if (typeof win.fetch !== "function") return "";
    const original = safeURL(row.url);
    let target = original?.origin === win.location.origin ? original : null;
    if (!target) {
      for (const link of win.document.querySelectorAll("a[href]")) {
        if (link.closest("[data-rp-ui]")) continue;
        const url = safeURL(link.href, win.location.href);
        if (url?.origin === win.location.origin && /^\/(?:phim|xem-phim)\//.test(url.pathname) && url.pathname.split("/").at(-1) === row.movie) {
          target = url;
          break;
        }
      }
    }
    if (!target && /^[a-z0-9-]{1,200}$/i.test(row.movie)) target = safeURL("/xem-phim/" + row.movie, win.location.href);
    if (!target || target.origin !== win.location.origin || !/^\/(?:phim|xem-phim)\//.test(target.pathname)) return "";
    const controller = new win.AbortController(), timer = win.setTimeout(() => controller.abort(), 6e3);
    try {
      const response = await win.fetch(target.href, { credentials: "same-origin", signal: controller.signal });
      if (!response.ok || response.url && safeURL(response.url)?.origin !== win.location.origin) return "";
      const html = await response.text();
      if (html.length > 2e6) return "";
      const doc = new win.DOMParser().parseFromString(html, "text/html"), context = readContext(detectSite(doc, target.href), doc);
      const title = (doc.querySelector('meta[property="og:title"]')?.content || doc.title).split("|")[0].replace(/\s*-\s*Tập\s*\d+.*$/i, "").trim();
      if (context ? !sameFilm(row, context) : !identityText(row.title) || identityText(title) !== identityText(row.title)) return "";
      const raw = context?.poster || doc.querySelector('meta[property="og:image"]')?.content;
      return raw ? safeURL(raw, target.href)?.href || "" : "";
    } catch {
      return "";
    } finally {
      win.clearTimeout(timer);
    }
  }
  function historyCard(doc, row, { onContinue, onRemove } = {}) {
    const card = doc.createElement("article");
    card.className = "rp-history-card";
    const cover = doc.createElement("div");
    cover.className = "rp-history-cover";
    card.append(cover);
    const fallback = doc.createElement("span");
    fallback.className = "rp-cover-fallback";
    fallback.textContent = row.title.slice(0, 1);
    fallback.setAttribute("aria-hidden", "true");
    cover.append(fallback);
    const src = historyArtwork(row, doc);
    if (src) {
      const image = doc.createElement("img");
      image.className = "rp-history-poster";
      image.src = src;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("error", () => image.remove(), { once: true });
      cover.append(image);
    }
    const action = doc.createElement("button");
    action.type = "button";
    action.className = "rp-cover-action";
    action.setAttribute("aria-label", "Xem ti\u1EBFp " + row.title);
    action.innerHTML = '<span class="rp-play-badge">' + historyIcon("play") + "</span>";
    cover.append(action);
    const remaining = doc.createElement("span");
    remaining.className = "rp-history-remaining";
    remaining.textContent = row.completed ? "\u0110\xE3 xem" : "C\xF2n " + Math.max(1, Math.ceil((row.duration - row.time) / 60)) + " ph\xFAt";
    cover.append(remaining);
    const progress = doc.createElement("div");
    progress.className = "rp-history-progress";
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", "Ti\u1EBFn \u0111\u1ED9 " + row.title);
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    const percent = Math.max(0, Math.min(100, Math.round(100 * row.time / row.duration)));
    progress.setAttribute("aria-valuenow", String(percent));
    progress.style.setProperty("--rp-progress", percent + "%");
    cover.append(progress);
    const original = doc.createElement("a");
    original.className = "rp-original-link";
    original.href = row.url;
    original.setAttribute("aria-label", "M\u1EDF trang \u0111\xE3 xem: " + row.title);
    original.title = "M\u1EDF trang \u0111\xE3 xem";
    original.innerHTML = historyIcon("external");
    cover.append(original);
    const title = doc.createElement("h3");
    title.className = "rp-history-title";
    title.textContent = row.title;
    title.title = row.title;
    card.append(title);
    const meta = doc.createElement("p");
    meta.className = "rp-history-meta";
    meta.textContent = historyEpisode(row);
    card.append(meta);
    const footer = doc.createElement("div");
    footer.className = "rp-history-card-footer";
    card.append(footer);
    const resume = doc.createElement("button");
    resume.type = "button";
    resume.className = "rp-resume-link";
    resume.innerHTML = historyIcon("play") + "<span>Xem ti\u1EBFp</span>";
    footer.append(resume);
    const position = doc.createElement("span");
    position.className = "rp-history-position";
    const format = (t) => Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0");
    position.textContent = format(row.time) + " / " + format(row.duration);
    footer.append(position);
    for (const button of [action, resume]) button.addEventListener("click", () => onContinue?.(row, card, resume));
    if (onRemove) {
      const remove = doc.createElement("button");
      remove.type = "button";
      remove.className = "rp-history-remove";
      remove.innerHTML = historyIcon("trash");
      remove.setAttribute("aria-label", "X\xF3a " + row.title + " kh\u1ECFi l\u1ECBch s\u1EED");
      remove.title = "X\xF3a kh\u1ECFi l\u1ECBch s\u1EED";
      remove.addEventListener("click", () => onRemove(row, card));
      footer.append(remove);
    }
    return card;
  }
  function historyUIStyle(doc) {
    if (doc.getElementById("rp-history-style")) return;
    const style = doc.createElement("style");
    style.id = "rp-history-style";
    style.textContent = `
  [data-rp-ui="continue"],[data-rp-ui="history"],[data-rp-ui="history-list"]{--rp-accent:#ffd875;--rp-muted:#a4a8b3;--rp-panel:#20232d;color:#f5f5f6;font:inherit;font-size:14px;line-height:1.5;box-sizing:border-box}
  .rp-history-section *,.rp-history-dialog *,.rp-history-toolbar *{box-sizing:border-box}.rp-history-section[hidden],.rp-history-toolbar[hidden],.rp-history-dialog[hidden],.rp-history-toolbar [hidden]{display:none!important}
  .rp-history-section{width:100%;min-width:0;margin:0 0 36px;padding:0;background:none;border:0;position:relative}
  .rp-history-section[data-rp-layout="landing"]{margin-top:36px}.rp-history-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 18px}.rp-history-section .rp-history-heading h2,.rp-history-dialog h2{font-size:clamp(20px,2vw,28px);font-weight:650;line-height:1.25;margin:0;color:inherit;letter-spacing:-.5px}
  .rp-history-section button,.rp-history-section a,.rp-history-dialog button,.rp-history-dialog a,.rp-history-toolbar button{font:inherit;text-decoration:none;cursor:pointer;letter-spacing:normal}
  .rp-history-section .rp-history-all,.rp-history-toolbar .rp-history-all,.rp-history-dialog .rp-dialog-close{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;border:0;border-radius:8px;padding:6px 0;background:transparent;color:var(--rp-muted);white-space:nowrap;font-size:13px}
  .rp-history-all svg,.rp-dialog-close svg,.rp-history-remove svg,.rp-resume-link svg,.rp-original-link svg{width:17px;height:17px;flex:none}.rp-history-all:hover,.rp-history-toolbar .rp-history-all:hover{color:var(--rp-accent)}
  .rp-history-cards{display:grid;grid-auto-flow:column;grid-auto-columns:clamp(220px,24vw,290px);justify-content:start;gap:20px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x proximity;scrollbar-width:thin;scrollbar-color:#454855 transparent;padding:0 0 12px}
  .rp-history-card{min-width:0;scroll-snap-align:start;background:none;border:0;padding:0;margin:0}.rp-history-cover{position:relative;isolation:isolate;aspect-ratio:16/9;overflow:hidden;border-radius:12px;background:linear-gradient(130deg,#383c50,#191c28);margin-bottom:12px}
  .rp-cover-fallback{position:absolute;inset:0;display:grid;place-items:center;font-size:46px;font-weight:600;color:#ffffff50}.rp-history-poster{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;transition:transform .2s ease}
  .rp-history-cover:after{content:"";position:absolute;inset:35% 0 0;background:linear-gradient(transparent,#000b);pointer-events:none;z-index:1}
  .rp-history-cover .rp-cover-action{position:absolute;inset:0;z-index:2;width:100%;height:100%;padding:0;border:0;border-radius:0;background:transparent;color:#fff;display:flex;align-items:flex-end;justify-content:flex-start}
  .rp-play-badge{display:grid;place-items:center;width:38px;height:38px;margin:0 0 17px 14px;border-radius:50%;background:#ffffffed;color:#171a23;box-shadow:0 2px 12px #0004}.rp-play-badge svg{width:19px;height:19px;margin-left:2px}
  .rp-history-remaining{position:absolute;right:12px;bottom:22px;color:#fff;font-size:12px;z-index:2;pointer-events:none}.rp-history-progress{position:absolute;bottom:0;left:0;right:0;height:3px;background:#ffffff45;z-index:4}.rp-history-progress:before{content:"";display:block;width:var(--rp-progress);height:100%;background:var(--rp-accent)}
  .rp-history-cover .rp-original-link{position:absolute;top:10px;right:10px;z-index:3;display:grid;place-items:center;width:30px;height:30px;padding:7px;border:0;border-radius:50%;background:#111621b8;color:#fff;opacity:0;transition:opacity .15s}
  .rp-history-card:hover .rp-original-link,.rp-original-link:focus-visible{opacity:1}.rp-history-card:hover .rp-history-poster{transform:scale(1.035)}
  .rp-history-card .rp-history-title{font-size:15px;font-weight:550;color:inherit;margin:0 0 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.5}.rp-history-meta{font-size:12px;color:var(--rp-muted);margin:0 0 8px;line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rp-history-card-footer{display:flex;align-items:center;gap:12px;min-width:0}.rp-history-card .rp-resume-link{display:inline-flex;align-items:center;gap:5px;border:0;border-radius:5px;background:none;color:var(--rp-accent);padding:3px 0;font-size:12px;font-weight:550;min-height:28px;white-space:nowrap}.rp-resume-link svg{width:13px;height:13px}.rp-history-position{font-size:11px;color:#858a98;font-variant-numeric:tabular-nums;white-space:nowrap}
  .rp-history-card .rp-history-remove{display:grid;place-items:center;margin-left:auto;border:0;border-radius:6px;padding:5px;background:transparent;color:#858a98}.rp-history-remove:hover{color:#ff9c9c;background:#ffffff0a}
  .rp-history-empty{display:flex;align-items:center;gap:14px;border:1px dashed #ffffff1c;border-radius:12px;padding:20px;color:var(--rp-muted);font-size:13px}.rp-history-empty svg{width:24px;height:24px;color:var(--rp-accent);flex:none}.rp-history-empty p{margin:0}
  .rp-history-toolbar{display:flex;justify-content:flex-end;align-items:center;gap:12px;margin:12px 0;padding:0 12px;min-height:40px}.rp-history-toolbar .rp-resume-prompt{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;background:var(--rp-accent);color:#171a23;border:0;border-radius:999px;font-size:13px;font-weight:600}
  .rp-history-toolbar .rp-toast{font-size:12px;color:var(--rp-muted);max-width:420px}.rp-history-toolbar{flex-wrap:wrap}
  .rp-history-dialog{position:fixed;inset:0;margin:auto;width:min(100% - 48px,1000px);height:fit-content;max-height:85dvh;padding:28px;border:1px solid #ffffff18;border-radius:18px;background:#191c25;color:#f5f5f6;box-shadow:0 20px 100px #0008;overflow:auto;z-index:2147483646}.rp-history-dialog::backdrop{background:#080a10bc;backdrop-filter:blur(5px)}.rp-history-dialog .rp-history-cards{grid-auto-flow:row;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));grid-auto-columns:auto;gap:26px 20px;overflow:visible}.rp-history-dialog .rp-dialog-close{width:36px;background:#ffffff0a;padding:8px}.rp-history-dialog .rp-history-heading{margin-bottom:24px}
  .rp-history-section :focus-visible,.rp-history-dialog :focus-visible,.rp-history-toolbar :focus-visible{outline:2px solid var(--rp-accent);outline-offset:3px}.rp-history-section button:disabled,.rp-history-dialog button:disabled{opacity:.6;cursor:wait}.rp-history-card .rp-card-status{font-size:12px;margin:6px 0 0;color:var(--rp-accent)}
  @media(max-width:600px){.rp-history-section{margin-bottom:24px}.rp-history-heading{margin-bottom:14px}.rp-history-cards{grid-auto-columns:72%;gap:14px;scrollbar-width:none}.rp-history-cover{border-radius:10px}.rp-history-card .rp-history-title{font-size:14px}.rp-history-cover .rp-original-link{opacity:1}.rp-history-dialog{width:calc(100% - 24px);padding:18px;max-height:90dvh;border-radius:14px}.rp-history-dialog .rp-history-cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 12px}.rp-history-dialog .rp-history-card-footer{gap:4px;flex-wrap:wrap}.rp-history-dialog .rp-history-position{font-size:10px}.rp-history-dialog .rp-play-badge{width:30px;height:30px;margin:0 0 12px 10px}.rp-history-dialog .rp-history-remaining{font-size:10px;bottom:16px}.rp-history-dialog .rp-history-meta{font-size:11px}}
  @media(prefers-reduced-motion:reduce){.rp-history-poster,.rp-original-link{transition:none}}
  `;
    (doc.head || doc.documentElement).append(style);
  }

  // rophim/history/entry.js
  function startHistory(win, page) {
    const doc = win.document, top = win.parent === win, db = createHistoryStore(storageAPI(win));
    let active = null, progress = null, media = "", savedAt = 0, lastKey = "", bar = null, resume = null, panel = null, bridge = null, snapshot = null, awaitingSeek = null, continuing = null, cardSignature = "", savedSignature = "";
    const artworkRequests = /* @__PURE__ */ new Set();
    let stopped = false;
    const format = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
    function showList() {
      if (panel) {
        const opened = panel;
        panel = null;
        opened.close?.();
        opened.remove();
        return;
      }
      historyUIStyle(doc);
      const dialog = doc.createElement("dialog");
      panel = dialog;
      dialog.dataset.rpUi = "history-list";
      dialog.className = "rp-history-dialog";
      dialog.setAttribute("aria-label", "L\u1ECBch s\u1EED xem");
      const heading = doc.createElement("div");
      heading.className = "rp-history-heading";
      const title = doc.createElement("h2");
      title.textContent = "L\u1ECBch s\u1EED xem";
      heading.append(title);
      dialog.append(heading);
      const close = makeButton(doc, "", () => {
        dialog.close?.();
        dialog.remove();
        if (panel === dialog) panel = null;
      }, heading);
      close.className = "rp-dialog-close";
      close.innerHTML = historyIcon("close");
      close.setAttribute("aria-label", "\u0110\xF3ng l\u1ECBch s\u1EED");
      const cards = doc.createElement("div");
      cards.className = "rp-history-cards";
      dialog.append(cards);
      const rows = db.list().slice(0, 300);
      if (!rows.length) emptyHistory(dialog, "L\u1ECBch s\u1EED xem c\u1EE7a b\u1EA1n s\u1EBD xu\u1EA5t hi\u1EC7n \u1EDF \u0111\xE2y.");
      for (const row of rows) cards.append(historyCard(doc, row, { onContinue: navigate, onRemove: (value, card) => {
        db.remove(value);
        if (active && sameEpisode(active, value)) {
          snapshot = null;
          if (resume) resume.hidden = true;
        }
        card.remove();
        cardSignature = "";
        home();
        if (!cards.children.length) emptyHistory(dialog, "B\u1EA1n ch\u01B0a c\xF3 phim trong l\u1ECBch s\u1EED.");
      } }));
      dialog.addEventListener("close", () => {
        dialog.remove();
        if (panel === dialog) panel = null;
      });
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
          const box = dialog.getBoundingClientRect();
          if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close.click();
        }
      });
      doc.body.append(dialog);
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    function emptyHistory(host, text) {
      const empty = doc.createElement("div");
      empty.className = "rp-history-empty";
      empty.innerHTML = historyIcon("history");
      const label = doc.createElement("p");
      label.textContent = text;
      empty.append(label);
      host.append(empty);
    }
    function ensureUI() {
      if (!doc.body || bar) return;
      historyUIStyle(doc);
      bar = doc.createElement("div");
      bar.dataset.rpUi = "history";
      bar.className = "rp-history-toolbar";
      resume = makeButton(doc, "Ti\u1EBFp t\u1EE5c", () => {
        if (snapshot && bridge?.state()?.ready && snapshot.time < bridge.state().duration - 5) {
          const target = snapshot.time;
          if (bridge.command("seek", target)) {
            awaitingSeek = { target, until: Date.now() + 8e3 };
            snapshot = null;
            resume.hidden = true;
          }
        }
      }, bar);
      resume.className = "rp-resume-prompt";
      resume.hidden = true;
      const all = makeButton(doc, "", showList, bar);
      all.className = "rp-history-all";
      all.innerHTML = historyIcon("history") + "<span>L\u1ECBch s\u1EED</span>";
    }
    function persist() {
      if (!top || !active || !progress || !media) return;
      if (awaitingSeek && Date.now() < awaitingSeek.until) return;
      if (snapshot && !snapshot.completed && snapshot.time >= 5 && progress.ready && progress.time < 10 && Math.abs(snapshot.duration - progress.duration) <= Math.max(5, snapshot.duration * 0.02)) return;
      const row = historyRow(active, progress);
      const signature = row ? [contextKey(row), Math.floor(row.time), row.completed].join("|") : "";
      if (row && signature !== savedSignature) {
        try {
          db.save(row);
          savedSignature = signature;
          if (snapshot) {
            snapshot = null;
            if (resume) resume.hidden = true;
          }
        } catch {
          if (bar) toast(bar, "Kh\xF4ng l\u01B0u \u0111\u01B0\u1EE3c l\u1ECBch s\u1EED: ki\u1EC3m tra quy\u1EC1n userscript");
        }
      }
      savedAt = Date.now();
    }
    async function navigate(row, host, trigger) {
      if (host.dataset.rpNavigating) return;
      host.dataset.rpNavigating = "1";
      const buttons = [...host.querySelectorAll("button")];
      for (const button of buttons) button.disabled = true;
      const original = trigger?.innerHTML;
      if (trigger) {
        trigger.textContent = "\u0110ang m\u1EDF\u2026";
        trigger.setAttribute("aria-busy", "true");
      }
      const status = (text) => {
        let node = host.querySelector(".rp-card-status");
        if (!node) {
          node = doc.createElement("p");
          node.className = "rp-card-status";
          node.setAttribute("role", "status");
          host.append(node);
        }
        node.textContent = text;
      };
      const href = win.location.href;
      try {
        const destination = await historyDestination(row, win);
        if (win.location.href !== href) return;
        if (!destination) {
          status("Ch\u01B0a t\xECm th\u1EA5y b\u1EA3n phim n\xE0y tr\xEAn trang hi\u1EC7n t\u1EA1i. D\xF9ng bi\u1EC3u t\u01B0\u1EE3ng m\u1EDF trang \u0111\xE3 xem tr\xEAn \u1EA3nh b\xECa.");
          return;
        }
        if (destination.source === "legacy-panels") {
          const val = laneKey(destination.lane) === "voiceover" ? "tm" : "vs";
          for (const p of ["/", "/xem-phim"]) doc.cookie = `selectedVidTypeRophim=${val}; path=${p}; SameSite=Lax`;
        }
        win.location.assign(destination.url);
      } catch {
        status("Ch\u01B0a m\u1EDF \u0111\u01B0\u1EE3c phim. B\u1EA1n c\xF3 th\u1EC3 th\u1EED l\u1EA1i.");
      } finally {
        delete host.dataset.rpNavigating;
        for (const button of buttons) button.disabled = false;
        if (trigger) {
          trigger.innerHTML = original;
          trigger.removeAttribute("aria-busy");
        }
      }
    }
    function home() {
      if (!top || !isSiteOrigin(win.location.origin) || !doc.body) return;
      ensureUI();
      const watch = win.location.pathname.startsWith("/xem-phim/"), placement = historyPlacement(doc, watch);
      if (watch) {
        if (continuing) continuing.remove();
        if (placement) placeHistory(bar, placement);
        else bar.remove();
        return;
      }
      bar.remove();
      if (!placement) {
        continuing?.remove();
        return;
      }
      if (!continuing) {
        continuing = doc.createElement("section");
        continuing.dataset.rpUi = "continue";
        continuing.className = "rp-history-section";
        continuing.setAttribute("aria-label", "\u0110ang xem");
      }
      if (!continuing.isConnected) cardSignature = "";
      placeHistory(continuing, placement);
      const rows = db.continuing().slice(0, 24), signature = JSON.stringify(rows.map((r) => [contextKey(r), r.time, r.updated, r.poster]));
      if (signature === cardSignature) return;
      cardSignature = signature;
      continuing.replaceChildren();
      const heading = doc.createElement("div");
      heading.className = "rp-history-heading";
      const title = doc.createElement("h2");
      title.textContent = "\u0110ang xem";
      heading.append(title);
      continuing.append(heading);
      const all = makeButton(doc, "", showList, heading);
      all.className = "rp-history-all";
      all.innerHTML = "<span>L\u1ECBch s\u1EED</span>" + historyIcon("arrow");
      all.setAttribute("aria-label", "M\u1EDF l\u1ECBch s\u1EED xem");
      if (!rows.length) {
        emptyHistory(continuing, "Phim \u0111ang xem s\u1EBD xu\u1EA5t hi\u1EC7n \u1EDF \u0111\xE2y.");
        return;
      }
      const cards = doc.createElement("div");
      cards.className = "rp-history-cards";
      continuing.append(cards);
      for (const row of rows) {
        cards.append(historyCard(doc, row, { onContinue: navigate }));
        const key = contextKey(row);
        if (!historyArtwork(row, doc) && !artworkRequests.has(key) && artworkRequests.size < 4 && typeof win.fetch === "function") {
          artworkRequests.add(key);
          loadHistoryArtwork(row, win).then((poster) => {
            if (stopped || !poster) return;
            const current = db.read(row);
            if (current && current.updated === row.updated) {
              try {
                db.save({ ...current, poster });
                cardSignature = "";
                home();
              } catch {
              }
            }
          });
        }
      }
    }
    bridge = createBridge(win, page, "history", {
      update(info) {
        if (!top) return;
        const nextKey = contextKey(info.context);
        if (nextKey !== lastKey) {
          persist();
          lastKey = nextKey;
          snapshot = info.context ? db.read(info.context) : null;
          awaitingSeek = null;
          active = info.context;
          progress = null;
          media = "";
          savedAt = 0;
          savedSignature = "";
          bar?.querySelector(".rp-toast")?.remove();
        } else active = info.context;
        progress = info.state;
        media = info.media;
        if (awaitingSeek && progress?.ready && (Math.abs(progress.time - awaitingSeek.target) <= 12 || Date.now() >= awaitingSeek.until)) awaitingSeek = null;
        if (active) {
          ensureUI();
          bar.hidden = false;
          placeHistory(bar, historyPlacement(doc, true));
        } else if (bar) bar.hidden = win.location.pathname.startsWith("/xem-phim/");
        const compatible = snapshot && info.state?.ready && Math.abs(snapshot.duration - info.state.duration) <= Math.max(5, snapshot.duration * 0.02);
        if (resume) {
          resume.hidden = !(compatible && snapshot.time >= 5 && !snapshot.completed && snapshot.time < info.state.duration - 5);
          resume.textContent = snapshot ? `Ti\u1EBFp t\u1EE5c ${format(snapshot.time)}` : "Ti\u1EBFp t\u1EE5c";
        }
        if (snapshot && info.state?.ready && !compatible && bar) toast(bar, "C\xF3 l\u1ECBch s\u1EED \u0111\xE3 l\u01B0u, nh\u01B0ng b\u1EA3n phim n\xE0y kh\xE1c th\u1EDDi l\u01B0\u1EE3ng n\xEAn ch\u01B0a th\u1EC3 tua \u0111\xFAng m\u1ED1c.");
        if (Date.now() - savedAt >= 5e3) persist();
      }
    });
    let offHome = () => {
    }, homeTimer = 0;
    if (top && isSiteOrigin(win.location.origin)) {
      doc.addEventListener("visibilitychange", () => {
        if (doc.hidden) persist();
        else home();
      });
      win.addEventListener("pagehide", persist);
      offHome = watchDOM(win, home);
      homeTimer = win.setInterval(home, 3e3);
      home();
    }
    win.addEventListener("pagehide", (event) => {
      if (!event.persisted) {
        stopped = true;
        bridge.dispose();
        offHome();
        win.clearInterval(homeTimer);
      }
    });
  }
  runFamily(window, { family: "rophim", feature: "history", isSiteURL: isSiteOrigin, isFrameURL, isFrameOrigin }, () => startHistory(window, typeof unsafeWindow === "undefined" ? window : unsafeWindow));
})();
