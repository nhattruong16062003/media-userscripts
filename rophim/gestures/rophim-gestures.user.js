// ==UserScript==
// @name         RoPhim — Thao tác trình phát
// @namespace    rophim-userscripts.local
// @version      0.4.9
// @author       zic
// @description  Thao tác trình phát cho trang xem RoPhim.
// @homepageURL  https://github.com/nhattruong16062003/media-userscripts/tree/main/rophim
// @supportURL   https://github.com/nhattruong16062003/media-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/refs/heads/main/rophim/gestures/rophim-gestures.user.js
// @updateURL    https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/refs/heads/main/rophim/gestures/rophim-gestures.user.js
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

/*
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

The following Lucide icons are derived from the Feather project:

airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/
(() => {
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
    const texts = [];
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
      texts.push(...cached.texts);
    }
    try {
      for (const item of (page.__next_f || []).slice(-100)) if (Array.isArray(item) && item[0] === 1 && typeof item[1] === "string") texts.push(item[1]);
    } catch {
    }
    const result = { episodes: [], movies: [] };
    for (const text of texts) for (const m of text.matchAll(/"(episode|movie)":\s*(?=\{)/g)) {
      const value = jsonFragment(text, m.index + m[0].length);
      if (value && value.id && value.slug && value.name) result[m[1] === "episode" ? "episodes" : "movies"].push(value);
    }
    return result;
  }

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
  function isFrameURL(value) {
    const url = safeURL(value);
    return !!url && FRAME_ORIGINS.has(url.origin) && (url.origin !== "https://api.rophim10.ink" || /^\/embed\/[1-9]\d*\/?$/.test(url.pathname));
  }
  function safeURL(value, base) {
    try {
      const u = new URL(value, base);
      return u.protocol === "https:" && !u.username && !u.password ? u : null;
    } catch {
      return null;
    }
  }
  function isSiteOrigin(value) {
    const url = safeURL(value);
    return !!url && !FRAME_ORIGINS.has(url.origin) && /(^|\.)[a-z\d-]*rophim[a-z\d-]*(?:\.[a-z\d-]+)+$/i.test(url.hostname);
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

  // rophim/lib/sites/legacy-panels.js
  function detectLegacySite(doc, url, transition) {
    const legacyFrame = doc.querySelector("iframe#player.player-iframe");
    const panels = [...doc.querySelectorAll(".server-picker[data-panel]")];
    if (legacyFrame && panels.some((p) => p.querySelector("[data-server][data-value]")) && doc.querySelector(".btn-episode.chaptervs,.btn-episode.chaptertm")) {
      return { kind: "legacy-panels", frame: legacyFrame, url, ...transition?.kind === "legacy-panels" && transition.frameSrc === legacyFrame.src ? { preferences: transition.preferences } : {} };
    }
    return null;
  }
  function legacyContext(site, doc) {
    const cookies = site.preferences || Object.fromEntries(doc.cookie.split(";").map((v) => v.trim().split("=")));
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
    return {
      source: site.kind,
      movie,
      movieID: movie,
      title: bounded(title.replace(/\s*-\s*Tập\s*\d+.*$/i, "")),
      episode: bounded(active.querySelector(".v-title,.info")?.textContent?.trim() || active.textContent?.trim()),
      episodeID: site.url.pathname,
      season: title.match(/phần\s*(\d+)/i)?.[1] || "1",
      lane,
      server,
      url: site.url.origin + site.url.pathname,
      originalTitle: bounded(original.replace(/\s+(?:season|phần)\s*\d+/ig, "").replace(/\s+(?:19|20)\d{2}\s*$/, "")),
      year: original.match(/\b((?:19|20)\d{2})\s*$/)?.[1] || "",
      mediaType: "tv",
      externalImdb: "",
      externalTmdb: "",
      poster: bounded(doc.querySelector('meta[property="og:image"]')?.content || "", 2048)
    };
  }
  function legacyNextRoute(site, context, win) {
    const nodes = [...win.document.querySelectorAll(context.lane === "tm" ? ".btn-episode.chaptertm" : ".btn-episode.chaptervs")];
    const index = nodes.findIndex((n) => n.classList.contains("on-air"));
    const url = safeURL(nodes[index + 1]?.href);
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
    return null;
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

  // rophim/lib/sites/next-common.js
  function nextContext(site) {
    const { episode: e, movie: m, url } = site;
    const season = e.season_number || m.latestEpisodes?.find((item) => item.id === e.id)?.season_number || m.partNumber || 1;
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
    const embedID = safeURL(frame.src)?.pathname.match(/^\/embed\/(\d+)$/)?.[1];
    const candidates = data.episodes.filter((e) => suffix ? String(e.id) === suffix : embedID ? String(e.id) === embedID : e.link === frame.src);
    const episode = candidates.at(-1);
    if (!episode || typeof episode.server !== "string" || !["embed", "m3u8"].includes(episode.type)) return null;
    if (episode.type === "embed" && episode.link !== frame.src || episode.type === "m3u8" && String(episode.id) !== embedID) return null;
    const movieSlug = url.pathname.slice("/xem-phim/".length).replace(/\.\d+$/, "");
    const movie = data.movies.findLast((m) => m.slug === movieSlug && typeof m.id === "number");
    if (!movie) return null;
    const candidate = { frame, url, episode, movie };
    return detectNextOrdered(candidate) || detectNextBasic(doc, candidate);
    return null;
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
    if (movie) movie.latestEpisodes = site.movie.latestEpisodes?.filter((e) => e.id === site.episode.id).map((e) => ({ id: e.id, season_number: e.season_number }));
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
        if (api?.getContainer?.() === jwRoot && typeof api.seek === "function" && typeof api.getPosition === "function") return { kind: "jw", video, root: jwRoot, api };
      } catch {
      }
      return null;
    }
    const artRoot = video.closest(".art-video-player");
    if (artRoot && video.classList.contains("art-video")) return { kind: "art-native", video, root: artRoot };
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
  function attachPlayer(candidate, { canRestoreAudio = () => true } = {}) {
    const { kind, video, root, api } = candidate;
    const initialSource = playerFingerprint(candidate);
    let audioGeneration = 0;
    const audio = () => {
      try {
        const muted = kind === "jw" && typeof api.getMute === "function" ? api.getMute() : video.muted, volume = kind === "jw" && typeof api.getVolume === "function" ? api.getVolume() / 100 : video.volume;
        return { muted: !!muted, volume: finite(volume) && volume >= 0 && volume <= 1 ? volume : 1 };
      } catch {
        return { muted: !!video.muted, volume: finite(video.volume) ? video.volume : 1 };
      }
    };
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
      const rollback = () => {
        if (generation !== audioGeneration || playerFingerprint(candidate) !== initialSource || !video.isConnected || !canRestoreAudio() || !state().ready) return;
        try {
          setVolume(previous.volume)?.catch?.(() => {
          });
        } catch {
        }
        try {
          setMute(previous.muted)?.catch?.(() => {
          });
        } catch {
        }
      };
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
      const handler = () => {
        adActive = value;
        for (const notify of subscribers) notify();
      };
      api.on?.(event, handler);
      handlers.push([event, handler]);
    }
    const isAd = () => adActive || !!video.closest(".jw-flag-ads,.jw-ad-media") || ["loading", "playing", "paused"].includes(api?.getAdState?.());
    const state = () => {
      try {
        const duration = kind === "jw" ? api.getDuration() : video.duration;
        const time = kind === "jw" ? api.getPosition() : video.currentTime;
        const ad = !!isAd();
        return { kind, failed: !!video.error, ready: video.isConnected && !video.error && playerFingerprint(candidate) === initialSource && mediaVisible(video, video.ownerDocument.defaultView) && video.readyState >= 1 && finite(duration) && duration > 0 && finite(time) && !ad, ad, time: finite(time) ? time : 0, duration: finite(duration) ? duration : 0, rate: video.playbackRate, paused: video.paused, ended: video.ended, played: video.played.length > 0 };
      } catch {
        return { kind, ready: false, ad: true, time: 0, duration: 0, rate: 1, paused: true, ended: false, played: false };
      }
    };
    const command = (action, value) => {
      const s = state();
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
          if (kind === "jw" && typeof api.play === "function") api.play(true)?.catch?.(() => {
          });
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
    return s && ["jw", "art-native", "native-cdn"].includes(s.kind) && typeof s.ready === "boolean" && (s.failed === void 0 || typeof s.failed === "boolean") && typeof s.ad === "boolean" && typeof s.played === "boolean" && typeof s.paused === "boolean" && typeof s.ended === "boolean" && finite(s.time) && s.time >= 0 && finite(s.duration) && s.duration >= 0 && s.time <= s.duration + 5 && finite(s.rate) && s.rate >= 0.25 && s.rate <= 4;
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
    if (top ? !isSiteOrigin(win.location.origin) : !isFrameURL(win.location.href)) return { dispose() {
    }, state: () => null, command: () => false };
    let session = null, site = null, context = null, local = null, media = "", lastSource = "", remote = null, generation = 0, sequence = 0, disposed = false;
    let boundFrame = null, frameFullscreen = false, controlsReady = false;
    let knownSource = false, snapshot = null, pending = "", retryAfter = 0;
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
    const emit = () => callbacks.update?.({ site, context, player: local, state: top ? remote : local?.state(), media, fullscreen: frameFullscreen, controlsReady: top ? controlsReady : false });
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
          session = { source: event.source, origin: event.origin, token: d.token, generation: d.generation, seq: -1 };
          sequence = 0;
        }
        if (d.seq <= session.seq) return;
        session.seq = d.seq;
        const nextContext2 = bridgeContext(d.context);
        if (contextKey(nextContext2) !== contextKey(context)) clearRequests();
        context = nextContext2;
        frameFullscreen = d.fullscreen === true;
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
          remote = { ...d.state };
          controlsReady = d.controlsReady === true;
          emit();
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
        if (nextSite) knownSource = true;
        const liveFrame = win.document.querySelector(".player-ratio iframe#embed-player");
        const currentHref = win.location.href;
        if (!nextSite && snapshot?.href === currentHref && snapshot.src === liveFrame?.src) {
          nextSite = { ...snapshot.site, frame: liveFrame };
        }
        if (!nextSite && knownSource && liveFrame && typeof win.fetch === "function" && currentHref !== pending && Date.now() > retryAfter && win.location.pathname.startsWith("/xem-phim/")) {
          pending = currentHref;
          retryAfter = Date.now() + 5e3;
          win.fetch(currentHref, { credentials: "same-origin" }).then((r) => r.ok ? r.text() : "").then((html) => {
            if (!html || html.length > 2e6 || disposed || win.location.href !== currentHref) return;
            const parsed = new win.DOMParser().parseFromString(html, "text/html");
            const found = detectSite(parsed, currentHref);
            if (found && found.frame.src === liveFrame.src) {
              snapshot = { href: currentHref, src: liveFrame.src, site: found };
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
        send({ type: "hello", context, fullscreen: frameFullscreen });
        if (session.seen && Date.now() - session.seen > 4e3) {
          remote = null;
          controlsReady = false;
          media = "";
          emit();
        }
        diagnostic(win.document, feature, site.kind + "/" + (remote?.ready ? remote.kind : "ch\u1EDD player n\u1ED9i dung"));
      } else {
        const candidate = playerCandidate(win, page);
        let source = "";
        try {
          source = candidate ? playerFingerprint(candidate) : "";
        } catch {
        }
        if (candidate?.video !== local?.video || candidate?.api !== local?.api || candidate?.kind !== local?.kind || source !== lastSource) {
          clearRequests();
          callbacks.unbind?.(local);
          local?.dispose();
          local = candidate ? attachPlayer(candidate) : null;
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
    win.addEventListener("message", onMessage);
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
        boundFrame?.removeEventListener("load", loaded);
        callbacks.unbind?.(local);
        local?.dispose();
      }
    };
    return bridge;
  }

  // shared/player/player-ui.js
  function playerIcon(name) {
    const paths = {
      play: '<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />',
      pause: '<rect x="14" y="3" width="5" height="18" rx="1" /><rect x="5" y="3" width="5" height="18" rx="1" />',
      forward: '<path d="m6 17 5-5-5-5" /><path d="m13 17 5-5-5-5" />',
      back: '<path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" />',
      close: '<path d="M18 6 6 18" /><path d="m6 6 12 12" />'
    };
    const filled = {
      next: '<path d="M18 4h3v16h-3zM3 4l13 8-13 8z"/>',
      volume: '<path d="M3 9h4l6-5v16l-6-5H3zM15 8v2a2.5 2.5 0 0 1 0 4v2a4.5 4.5 0 0 0 0-8zm0-4v2a6.5 6.5 0 0 1 0 12v2a8.5 8.5 0 0 0 0-16z"/>',
      muted: '<path d="M3 9h4l6-5v16l-6-5H3zm12-1 3 3 3-3 1 1-3 3 3 3-1 1-3-3-3 3-1-1 3-3-3-3z"/>',
      settings: '<path fill-rule="evenodd" d="m10 2-.7 3-1.5.9-3-.9-2 3.5L5 10.7v2.6l-2.2 2.2 2 3.5 3-.9 1.5.9.7 3h4l.7-3 1.5-.9 3 .9 2-3.5-2.2-2.2v-2.6l2.2-2.2-2-3.5-3 .9-1.5-.9L14 2zm2 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>',
      fullscreen: '<path d="M14 3h7v7l-2.5-2.5-4 4-2-2 4-4zM3 14l2.5 2.5 4-4 2 2-4 4L10 21H3z"/>',
      shrink: '<path d="m21 3-5.5 5.5L13 6v7h7l-2.5-2.5L23 5zM3 21l5.5-5.5L11 18v-7H4l2.5 2.5L1 19z"/>'
    };
    const simple = { lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>' };
    const solid = Object.hasOwn(filled, name);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="${solid ? "currentColor" : "none"}" stroke="${solid ? "none" : "currentColor"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${filled[name] || (simple[name] ? `<g transform="translate(0 -1.3)">${simple[name]}</g>` : paths[name]) || ""}</svg>`;
  }
  function playerUIStyle(doc) {
    if (doc.getElementById("rp-player-style")) return;
    const style = doc.createElement("style");
    style.id = "rp-player-style";
    style.textContent = `
  html[data-rp-controls-boot] .art-notice,html[data-rp-controls-boot] .art-info,html[data-rp-controls-boot] .art-loading,html[data-rp-controls-boot] .art-layer-auto-playback,html[data-rp-controls-boot] .jw-title,html[data-rp-controls-boot] .jw-logo,html[data-rp-controls-boot] .jw-error-msg,html[data-rp-controls-boot] .jw-nextup-container,html[data-rp-controls-boot] .art-bottom,html[data-rp-controls-boot] .art-mask,html[data-rp-controls-boot] .art-vtitle-bar,html[data-rp-controls-boot] .art-settings,html[data-rp-controls-boot] .art-contextmenus,html[data-rp-controls-boot] .art-layer-lock,html[data-rp-controls-boot] .art-layer-fastForward,html[data-rp-controls-boot] .art-layer-autoOrientation,html[data-rp-controls-boot] .jw-controls,html[data-rp-controls-boot] .jw-settings-menu,html[data-rp-controls-boot] .jw-rightclick,html[data-rp-controls-boot] .jw-display,html[data-rp-controls-boot] .guildline,html[data-rp-controls-boot] .loading-screen{display:none!important;pointer-events:none!important}
  html[data-rp-controls-boot] video::-webkit-media-controls{display:none!important}
  html[data-rp-frame-guard] .player-ratio iframe#embed-player:not([data-rp-display="custom"]),html[data-rp-frame-guard] iframe#player.player-iframe:not([data-rp-display="custom"]){opacity:0!important;pointer-events:none!important}
  [data-rp-frame-host]{position:relative}[data-rp-frame-host]:fullscreen{width:100%;height:100%;background:#000;overflow:hidden}[data-rp-frame-host]:fullscreen>iframe{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:0!important}
  .rp-watch-loading{position:absolute;inset:0;z-index:2147483645;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#000;color:#fff;font:14px/1.4 Arial,sans-serif;pointer-events:auto}.rp-watch-loading.rp-loading-fixed{position:fixed}.rp-watch-loading [hidden]{display:none!important}.rp-loading-retry{font:inherit;padding:8px 18px;border:1px solid #ffffff55;border-radius:6px;background:#ffffff18;color:#fff;cursor:pointer;min-height:42px}.rp-watch-spinner{width:28px;height:28px;border:2px solid #ffffff38;border-top-color:#fff;border-radius:50%;animation:rp-watch-spin .8s linear infinite}@keyframes rp-watch-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.rp-watch-spinner{animation:none}}
  [data-rp-custom-controls="1"] .art-bottom,[data-rp-custom-controls="1"] .art-mask,[data-rp-custom-controls="1"] .art-vtitle-bar,[data-rp-custom-controls="1"] .art-settings,[data-rp-custom-controls="1"] .art-contextmenus,[data-rp-custom-controls="1"] .art-layer-lock,[data-rp-custom-controls="1"] .art-layer-fastForward,[data-rp-custom-controls="1"] .jw-controls,[data-rp-custom-controls="1"] .jw-settings-menu,[data-rp-custom-controls="1"] .jw-rightclick,[data-rp-custom-controls="1"] .guildline{display:none!important;pointer-events:none!important}
  [data-rp-custom-controls="1"] .loading-screen{pointer-events:none!important}
  [data-rp-native-enhancement="1"] #skip-intro,[data-rp-native-enhancement="1"] #skip-outro,[data-rp-native-enhancement="1"] .item-next,[data-rp-native-enhancement="1"] #toggle-eps,[data-rp-native-enhancement="1"] #video_eps,[data-rp-native-enhancement="1"] .jw-audio-button,[data-rp-native-enhancement="1"] .jw-audio-menu{display:none!important;pointer-events:none!important}
  [data-rp-native-enhancement="1"][data-rp-native-chrome="true"][data-rp-native-locked="false"] .jw-controls{visibility:visible!important;opacity:1!important}
  [data-rp-native-enhancement="1"][data-rp-native-chrome="true"][data-rp-native-locked="false"] .jw-controlbar,[data-rp-native-enhancement="1"][data-rp-native-chrome="true"][data-rp-native-locked="false"] .custom-control,[data-rp-native-enhancement="1"][data-rp-native-chrome="true"][data-rp-native-locked="false"] #player_top{visibility:visible!important;opacity:1!important;pointer-events:auto!important;transform:none!important}
  [data-rp-native-chrome="false"] .custom-control,[data-rp-native-chrome="false"] .jw-controls,[data-rp-native-chrome="false"] #player_top,[data-rp-native-chrome="false"] .jw-display,[data-rp-native-locked="true"] .custom-control,[data-rp-native-locked="true"] .jw-controls,[data-rp-native-locked="true"] #player_top,[data-rp-native-locked="true"] .jw-display,[data-rp-native-locked="true"] .player-dm,[data-rp-native-locked="true"] #video_pop{visibility:hidden!important;pointer-events:none!important}
  [data-rp-ui="player"].rp-player-shell{position:absolute;inset:0;z-index:2147483642;pointer-events:none;font:14px/1.4 Arial,sans-serif;color:#fff;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
  .rp-player-shell *{box-sizing:border-box}.rp-player-shell[hidden],.rp-player-shell [hidden]{display:none!important}
  .rp-player-shell button{font:inherit;color:#fff;cursor:pointer;touch-action:manipulation}.rp-player-shell button:focus-visible,.rp-player-shell input:focus-visible{outline:2px solid #fff;outline-offset:2px}.rp-player-shell button:disabled{cursor:default}
  .rp-gesture-surface{position:absolute;inset:0;pointer-events:auto;touch-action:none}
  .rp-player-shell .rp-icon{display:inline-flex;align-items:center;justify-content:center;min-width:40px;min-height:40px;margin:0;padding:8px;border:0;border-radius:0;background:transparent;color:#eee;pointer-events:auto}.rp-player-shell .rp-icon svg{width:20px;height:20px}
  .rp-player-shell .rp-center-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:grid;place-items:center;width:60px;height:60px;padding:12px;border-radius:50%;background:rgba(0,0,0,.5);box-shadow:0 2px 14px rgba(0,0,0,.35);color:#fff}.rp-player-shell .rp-center-play svg{width:36px;height:36px;stroke-width:2.5;fill:currentColor;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}
  .rp-player-chrome{position:absolute;bottom:0;left:0;right:0;padding:12px 12px 2px;background:linear-gradient(transparent,rgba(0,0,0,.8));pointer-events:auto}
  .rp-player-timeline{display:flex;align-items:center;height:18px}.rp-player-shell input[type="range"]{appearance:none;-webkit-appearance:none;display:block;width:100%;height:4px;margin:0;padding:0;border:0;border-radius:1px;background:linear-gradient(to right,#fff 0%,#fff var(--rp-played,0%),#626262 var(--rp-played,0%),#626262 100%);touch-action:none;cursor:ew-resize}.rp-player-shell input[type="range"]::-webkit-slider-thumb{appearance:none;width:10px;height:10px;border:0;border-radius:50%;background:#fff}.rp-player-shell input[type="range"]::-moz-range-thumb{width:10px;height:10px;border:0;border-radius:50%;background:#fff}
  .rp-player-line{display:flex;align-items:center;gap:0;min-height:42px}.rp-player-time{font:12px/1 Arial,sans-serif;white-space:nowrap;font-variant-numeric:tabular-nums;color:#eee}.rp-player-spacer{flex:1}
  .rp-player-line .rp-icon[data-rp-status="true"]{max-width:160px;font-size:12px;line-height:1.2;white-space:normal}
  .rp-player-shell .rp-pill{color:#fff;font:500 14px sans-serif;border:.5px solid rgba(255,255,255,.28);border-radius:999px;background:rgba(255,255,255,.12);backdrop-filter:blur(10px) saturate(140%);-webkit-backdrop-filter:blur(10px) saturate(140%);padding:6px 14px;display:flex;align-items:center;gap:6px;white-space:nowrap}
  .rp-context-action{position:absolute;right:16px;bottom:68px;min-height:32px;pointer-events:auto}.rp-context-action svg{width:16px;height:16px}
  .rp-player-shell .rp-lock{position:absolute;left:48px;top:50%;transform:translateY(-50%);width:48px;height:48px;padding:0;border-radius:50%;background:rgba(0,0,0,.12);border:.5px solid rgba(255,255,255,.35);color:#fff}.rp-player-shell .rp-lock svg{width:24px;height:24px}
  .rp-feedback-seek{position:absolute;top:40%;left:78%;transform:translate(-50%,-50%);pointer-events:none}.rp-feedback-seek svg{width:16px;height:16px}.rp-feedback-seek[data-side="right"] svg{animation:rp-nudge-right .35s ease-out}.rp-feedback-seek[data-side="left"] svg{animation:rp-nudge-left .35s ease-out}
  .rp-feedback-hold{position:absolute;left:50%;top:12%;transform:translate(-50%,-50%);pointer-events:none}.rp-chevrons{display:flex}.rp-chevrons svg{width:9px;height:12px;fill:currentColor;stroke-width:0;margin-left:-1px;opacity:.3;animation:rp-run 1s ease-in-out infinite}.rp-chevrons svg:nth-child(2){animation-delay:.15s}.rp-chevrons svg:nth-child(3){animation-delay:.3s}
  .rp-player-settings{position:absolute;bottom:64px;right:16px;z-index:2;width:200px;max-height:70%;overflow-y:auto;padding:4px 12px 10px;border:0;border-radius:2px;background:#1a1a1a;color:#fff;pointer-events:auto}.rp-player-settings-header{display:flex;align-items:center;justify-content:space-between;font-size:13px}.rp-player-speed-options{display:flex;flex-wrap:wrap;gap:4px}.rp-player-shell .rp-speed{padding:6px 10px;min-height:38px;border:0;border-radius:2px;background:#303030;color:#eee;font-size:13px}.rp-player-shell .rp-speed[aria-pressed="true"]{background:#555}.rp-track-label{font-size:13px;margin:10px 0 4px}.rp-player-tracks .rp-speed{margin:2px}
  .rp-player-error{position:absolute;bottom:76px;left:12px;right:12px;padding:6px 10px;border-radius:4px;background:#151515ed;color:#fff;font-size:12px;pointer-events:none}
  .rp-player-shell[data-rp-chrome="false"] .rp-player-chrome,.rp-player-shell[data-rp-chrome="false"] .rp-center-play,.rp-player-shell[data-rp-chrome="false"][data-rp-locked="false"] .rp-lock,.rp-player-shell[data-rp-locked="true"] .rp-player-chrome,.rp-player-shell[data-rp-locked="true"] .rp-center-play{visibility:hidden;pointer-events:none}
  @keyframes rp-run{0%,100%{opacity:.3;transform:translateX(0)}35%{opacity:1;transform:translateX(2px)}}@keyframes rp-nudge-right{from{transform:translateX(-4px);opacity:.3}to{transform:none;opacity:1}}@keyframes rp-nudge-left{from{transform:translateX(4px);opacity:.3}to{transform:none;opacity:1}}
  @media(max-width:480px){.rp-player-shell .rp-lock{left:24px}.rp-player-chrome{padding:8px 8px 0}.rp-player-shell .rp-icon:not(.rp-center-play):not(.rp-lock){min-width:36px;padding:6px}.rp-player-time{font-size:11px}.rp-player-line[data-rp-next-status="true"] .rp-player-time{display:none}.rp-player-shell .rp-pill{font-size:13px}}
  @media(pointer:coarse){.rp-player-shell .rp-icon{min-width:44px;min-height:44px}.rp-player-timeline{height:24px}.rp-context-action{bottom:76px;min-height:38px}.rp-player-settings{bottom:74px}}
  @media(prefers-reduced-motion:reduce){.rp-chevrons svg,.rp-feedback-seek svg{animation:none;opacity:1}}
  `;
    (doc.head || doc.documentElement).append(style);
  }
  function playerStartupGuard(win) {
    const doc = win.document;
    playerUIStyle(doc);
    doc.documentElement.dataset.rpControlsBoot = "1";
    const suppress = () => {
      for (const video of doc.querySelectorAll("video[controls]")) video.removeAttribute("controls");
    };
    const observer = new win.MutationObserver(suppress);
    observer.observe(doc, { childList: true, subtree: true, attributes: true, attributeFilter: ["controls"] });
    suppress();
    return () => {
      observer.disconnect();
      delete doc.documentElement.dataset.rpControlsBoot;
    };
  }

  // shared/player/gestures.js
  function installGestures(win, player, notify = () => {
  }, options = {}) {
    const { video } = player, root = options.surface || player.root;
    const interactive = (target) => options.surface?.contains(target) ? false : options.isInteractive?.(target) || !!target?.closest?.('[data-rp-ui],a,button,input,select,textarea,[contenteditable="true"],[role="slider"],[role="button"],.jw-controlbar,.jw-settings-menu,.jw-rightclick,.art-controls,.art-settings,.art-contextmenus');
    let press = null, lastTap = null, holdTimer = 0, tapTimer = 0, suppressUntil = 0;
    const source = () => player.fingerprint?.() || video.currentSrc || video.src;
    const consume = (e) => {
      if (options.exclusive) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    function restore() {
      win.clearTimeout(holdTimer);
      holdTimer = 0;
      const previous = press;
      press = null;
      if (previous) try {
        if (root.hasPointerCapture?.(previous.id)) root.releasePointerCapture(previous.id);
      } catch {
      }
      if (previous?.held && video.playbackRate === 2) {
        let restored = false;
        try {
          if (previous.source === source()) restored = player.command("rate", previous.rate);
        } catch {
        }
        if (!restored && video.nodeType === 1) try {
          video.playbackRate = previous.rate;
        } catch {
        }
      }
      if (previous?.held) options.onHoldChange?.(false);
    }
    function cancel() {
      restore();
      lastTap = null;
      win.clearTimeout(tapTimer);
      tapTimer = 0;
    }
    const pointerCancel = (e) => {
      if (e.pointerId == null || press?.id === e.pointerId) cancel();
    };
    const lostCapture = (e) => {
      if (press && e.pointerId === press.id) cancel();
    };
    const point = (event) => {
      const box = player.bounds?.() || video.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0 || event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom - (options.surface ? 0 : 60)) return null;
      const ratio = (event.clientX - box.left) / box.width;
      return ratio < 0.4 ? -1 : ratio > 0.6 ? 1 : 0;
    };
    const down = (e) => {
      if (e.isPrimary === false) {
        cancel();
        return;
      }
      if (interactive(e.target) || e.button !== 0 || !player.state().ready) return;
      const side = point(e);
      if (side === null) return;
      consume(e);
      restore();
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, side, at: Date.now(), source: source(), rate: player.state().rate, held: false, moved: false, locked: !!options.isLocked?.() };
      try {
        root.setPointerCapture?.(e.pointerId);
      } catch {
      }
      if (press.locked && !options.allowLockedMediaGestures || player.state().paused) return;
      holdTimer = win.setTimeout(() => {
        if (!press || !player.state().ready || player.state().paused || options.isLocked?.() && !options.allowLockedMediaGestures || source() !== press.source) return cancel();
        if (player.command("rate", 2)) {
          press.held = true;
          lastTap = null;
          win.clearTimeout(tapTimer);
          options.onHoldChange?.(true);
          notify("Gi\u1EEF 2\xD7");
        }
      }, 450);
    };
    const move = (e) => {
      if (!press || e.pointerId !== press.id) return;
      consume(e);
      if (point(e) === null) return cancel();
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 30) press.moved = true;
    };
    const up = (e) => {
      if (!press || e.pointerId !== press.id) return;
      const p = press, now = Date.now();
      restore();
      consume(e);
      const locked = p.locked || !!options.isLocked?.();
      if (locked && !options.allowLockedMediaGestures) {
        lastTap = null;
        win.clearTimeout(tapTimer);
        if (p.locked && !p.moved && now - p.at <= 350 && source() === p.source) options.onLockedTap?.();
        return;
      }
      if (p.held) {
        suppressUntil = now + 400;
        notify("\u0110\xE3 kh\xF4i ph\u1EE5c t\u1ED1c \u0111\u1ED9");
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      if (p.moved || point(e) === null || Math.hypot(e.clientX - p.x, e.clientY - p.y) > 30) {
        lastTap = null;
        win.clearTimeout(tapTimer);
        tapTimer = 0;
        return;
      }
      if (now - p.at > 350 || source() !== p.source || !player.state().ready) return;
      const onTap = locked ? options.onLockedTap : options.onTap;
      if (!p.side) {
        win.clearTimeout(tapTimer);
        tapTimer = 0;
        lastTap = null;
        onTap?.();
        return;
      }
      if (lastTap && now - lastTap.at < 320 && p.side === lastTap.side && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 48) {
        win.clearTimeout(tapTimer);
        if (player.command("seek", player.state().time + p.side * 10)) {
          options.onSeek?.(p.side);
          notify(p.side > 0 ? "+10 gi\xE2y" : "\u221210 gi\xE2y");
        }
        lastTap = null;
        suppressUntil = now + 400;
        e.preventDefault();
        e.stopImmediatePropagation();
      } else {
        lastTap = { ...p, at: now };
        if (onTap) {
          win.clearTimeout(tapTimer);
          tapTimer = win.setTimeout(() => {
            lastTap = null;
            onTap();
          }, 320);
        }
      }
    };
    const click = (e) => {
      if (!interactive(e.target) && (options.exclusive || Date.now() < suppressUntil)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    const menu = (e) => {
      if (!interactive(e.target) && (options.exclusive || press?.held)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    const touch = (e) => {
      if (!interactive(e.target)) consume(e);
    };
    const visibility = () => {
      if (win.document.hidden) cancel();
    };
    for (const [name, fn] of [["pointerdown", down], ["pointermove", move], ["pointerup", up], ["pointercancel", pointerCancel], ["lostpointercapture", lostCapture], ["click", click], ["dblclick", click], ["contextmenu", menu]]) root.addEventListener(name, fn, true);
    if (options.exclusive) for (const name of ["touchstart", "touchmove", "touchend", "touchcancel"]) root.addEventListener(name, touch, { passive: false });
    win.addEventListener("blur", cancel);
    win.addEventListener("pointerup", up, true);
    win.addEventListener("pointermove", move, true);
    win.addEventListener("pointercancel", pointerCancel, true);
    win.document.addEventListener("visibilitychange", visibility);
    video.addEventListener("emptied", cancel);
    video.addEventListener("loadstart", cancel);
    return () => {
      cancel();
      for (const [name, fn] of [["pointerdown", down], ["pointermove", move], ["pointerup", up], ["pointercancel", pointerCancel], ["lostpointercapture", lostCapture], ["click", click], ["dblclick", click], ["contextmenu", menu]]) root.removeEventListener(name, fn, true);
      for (const name of ["touchstart", "touchmove", "touchend", "touchcancel"]) root.removeEventListener(name, touch);
      win.removeEventListener("blur", cancel);
      win.removeEventListener("pointerup", up, true);
      win.removeEventListener("pointermove", move, true);
      win.removeEventListener("pointercancel", pointerCancel, true);
      win.document.removeEventListener("visibilitychange", visibility);
      video.removeEventListener("emptied", cancel);
      video.removeEventListener("loadstart", cancel);
    };
  }

  // shared/player/audio-preferences.js
  function audioPreferenceStore(storage, key) {
    let saved = null;
    try {
      const value = JSON.parse(storage?.getItem(key) || "null");
      if (value?.version === 1) saved = audioPreference(value);
    } catch {
    }
    return {
      read: () => saved && { ...saved },
      write(value) {
        const next = audioPreference(value);
        if (!next) return false;
        if (saved && next.muted === saved.muted && next.volume === saved.volume) return true;
        saved = next;
        try {
          storage?.setItem(key, JSON.stringify({ version: 1, ...next }));
        } catch {
        }
        return true;
      }
    };
  }
  function audioPreferenceSession(win, player, store) {
    let attempted = false, learning = false;
    const source = player.fingerprint?.();
    const current = () => !source || source === player.fingerprint?.();
    const sound = () => player.audio?.() || { muted: player.video.muted, volume: player.video.volume };
    return {
      checkpoint(state, enabled) {
        if (!enabled || !current() || !state.ready || state.ad) return;
        const value = audioPreference(sound()), saved = store.read();
        if (value && (!saved && !value.muted && value.volume > 0 || saved && value.muted === saved.muted)) store.write(value);
      },
      intent(muted) {
        if (!current() || !player.state().ready || player.state().ad) return;
        attempted = true;
        learning = false;
        const value = sound(), volume = Number.isFinite(value.volume) ? value.volume : 1;
        store.write({ muted, volume: !muted && volume <= 0 ? 1 : volume });
      },
      update(state, enabled) {
        if (!enabled || !current() || !state.ready || state.ad || state.paused || !state.played || win.document.hidden) return;
        const saved = store.read();
        if (!attempted) {
          attempted = true;
          if (saved) try {
            player.command("restore-audio", saved);
          } catch {
          }
        }
        if (!saved || learning) {
          const value = audioPreference(sound());
          if (value && !value.muted && value.volume > 0) {
            learning = true;
            store.write(value);
          }
        }
      }
    };
  }

  // shared/player/custom-controls.js
  function customPlayerControls(win, player, options = {}) {
    const { video, root } = player, doc = win.document, nativeRoot = player.nativeRoot || root, element = video.nodeType === 1 ? video : null;
    playerUIStyle(doc);
    const nativeMode = options.nativeUI === true;
    const shell = doc.createElement("div");
    shell.dataset.rpUi = "player";
    shell.className = "rp-player-shell";
    shell.dataset.rpLocked = "false";
    shell.dataset.rpChrome = "true";
    if (nativeMode) shell.dataset.rpMode = "native-enhancement";
    const surface = doc.createElement("div");
    surface.className = "rp-gesture-surface";
    surface.dataset.rpGestureSurface = "1";
    surface.setAttribute("aria-label", "Ch\u1EA1m \u0111\u1EC3 hi\u1EC7n \u0111i\u1EC1u khi\u1EC3n; ch\u1EA1m \u0111\xF4i hai b\xEAn tua 10 gi\xE2y; gi\u1EEF \u0111\u1EC3 ph\xE1t 2 l\u1EA7n");
    shell.append(surface);
    function button(action, label, icon, host, className = "rp-icon") {
      const node = doc.createElement("button");
      node.type = "button";
      node.dataset.rpAction = action;
      node.className = className;
      node.setAttribute("aria-label", label);
      node.innerHTML = playerIcon(icon);
      node.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (disposed) return;
        if (!locked || action === "context") actionClick(action, node);
        else if (action === "lock") setLocked(false);
      });
      host.append(node);
      return node;
    }
    let disposed = false, locked = false, chromeVisible = true, lockVisible = true, scrubbing = false, nativeOwned = false, lastReady = false, lastPaused = null, context = null, autoPlayAttempted = false;
    let hideTimer = 0, lockTimer = 0, tipTimer = 0, errorTimer = 0, nextTimer = 0, scrubTimer = 0, nextPending = null, nextError = null;
    const audio = options.audioPreferences ? audioPreferenceSession(win, player, options.audioPreferences) : null;
    const savedAttributes = new Map(["controls", "playsinline", "webkit-playsinline"].map((name) => [name, element?.getAttribute(name) ?? null]));
    const originalPosition = root.style.position;
    let positioned = false;
    const center = button("play", "T\u1EA1m d\u1EEBng", "pause", shell, "rp-icon rp-center-play");
    const lock = button("lock", "Kh\xF3a m\xE0n h\xECnh", "unlock", shell, "rp-icon rp-lock");
    lock.hidden = true;
    const contextAction = button("context", "B\u1ECF qua gi\u1EDBi thi\u1EC7u", "forward", shell, "rp-context-action rp-pill");
    contextAction.hidden = true;
    contextAction.setAttribute("aria-live", "polite");
    const seekTip = doc.createElement("output");
    seekTip.className = "rp-feedback-seek rp-pill";
    seekTip.hidden = true;
    shell.append(seekTip);
    const holdTip = doc.createElement("output");
    holdTip.className = "rp-feedback-hold rp-pill";
    holdTip.hidden = true;
    holdTip.innerHTML = '2x <span class="rp-chevrons">' + Array(3).fill(playerIcon("play")).join("") + "</span>";
    shell.append(holdTip);
    const chrome = doc.createElement("div");
    chrome.className = "rp-player-chrome";
    shell.append(chrome);
    const timeline = doc.createElement("label");
    timeline.className = "rp-player-timeline";
    chrome.append(timeline);
    const seek = doc.createElement("input");
    seek.type = "range";
    seek.min = "0";
    seek.max = "1";
    seek.step = ".1";
    seek.value = "0";
    seek.setAttribute("aria-label", "Tua phim");
    timeline.append(seek);
    const line = doc.createElement("div");
    line.className = "rp-player-line";
    chrome.append(line);
    const play = button("play", "T\u1EA1m d\u1EEBng", "pause", line), mute = button("mute", "T\u1EAFt ti\u1EBFng", "volume", line);
    const time = doc.createElement("output");
    time.className = "rp-player-time";
    line.append(time);
    const spacer = doc.createElement("span");
    spacer.className = "rp-player-spacer";
    line.append(spacer);
    const next = button("next", "T\u1EADp ti\u1EBFp theo", "next", line);
    next.setAttribute("aria-live", "polite");
    const settingsButton = button("settings", "C\xE0i \u0111\u1EB7t", "settings", line), fullscreen = button("fullscreen", "To\xE0n m\xE0n h\xECnh", "fullscreen", line);
    const settings = doc.createElement("section");
    settings.className = "rp-player-settings";
    settings.setAttribute("aria-label", "C\xE0i \u0111\u1EB7t t\u1ED1c \u0111\u1ED9");
    settings.hidden = true;
    shell.append(settings);
    const heading = doc.createElement("div");
    heading.className = "rp-player-settings-header";
    heading.textContent = "T\u1ED1c \u0111\u1ED9";
    settings.append(heading);
    button("settings", "\u0110\xF3ng c\xE0i \u0111\u1EB7t", "close", heading);
    const rates = doc.createElement("div");
    rates.className = "rp-player-speed-options";
    settings.append(rates);
    for (const rate of [0.75, 1, 1.25, 1.5, 2]) {
      const node = doc.createElement("button");
      node.type = "button";
      node.className = "rp-speed";
      node.dataset.rpRate = String(rate);
      node.textContent = rate + "x";
      node.addEventListener("click", () => {
        if (!locked) {
          command("rate", rate);
          settings.hidden = true;
          show();
          update();
        }
      });
      rates.append(node);
    }
    const tracks = doc.createElement("div");
    tracks.className = "rp-player-tracks";
    settings.append(tracks);
    let trackSignature = "";
    function updateTracks() {
      const groups = player.tracks?.() || {}, signature = JSON.stringify(groups);
      if (signature === trackSignature) return;
      trackSignature = signature;
      tracks.replaceChildren();
      for (const [group, title] of Object.entries({ quality: "Ch\u1EA5t l\u01B0\u1EE3ng", audio: "\xC2m thanh", captions: "Ph\u1EE5 \u0111\u1EC1" })) {
        const items = groups[group];
        if (!Array.isArray(items) || !items.length || items.length > 100) continue;
        const label = doc.createElement("div");
        label.className = "rp-track-label";
        label.textContent = title;
        tracks.append(label);
        for (const item of items) {
          if (!Number.isInteger(item.id) || typeof item.label !== "string") continue;
          const node = doc.createElement("button");
          node.type = "button";
          node.className = "rp-speed";
          node.dataset.rpTrack = group;
          node.dataset.rpTrackId = String(item.id);
          node.textContent = item.label.slice(0, 100);
          node.setAttribute("aria-pressed", String(item.active === true));
          node.addEventListener("click", () => {
            if (!locked && player.state().ready) {
              if (player.selectTrack?.(group, item.id)) {
                settings.hidden = true;
                show();
                update();
              } else report("Ch\u01B0a \u0111\u1ED5i \u0111\u01B0\u1EE3c t\xF9y ch\u1ECDn ph\xE1t.");
            }
          });
          tracks.append(node);
        }
      }
    }
    const error = doc.createElement("output");
    error.className = "rp-player-error";
    error.setAttribute("role", "status");
    error.hidden = true;
    shell.append(error);
    function report(text) {
      error.textContent = text;
      error.hidden = false;
      win.clearTimeout(errorTimer);
      errorTimer = win.setTimeout(() => error.hidden = true, 5e3);
    }
    function command(action, value) {
      try {
        return !!player.command(action, value);
      } catch {
        report("Kh\xF4ng \u0111i\u1EC1u khi\u1EC3n \u0111\u01B0\u1EE3c video n\xE0y.");
        return false;
      }
    }
    function inFullscreen() {
      return options.isFullscreen?.() === true || !!doc.fullscreenElement && (doc.fullscreenElement === root || doc.fullscreenElement.contains(root));
    }
    function restoreNative() {
      if (!nativeOwned) return;
      nativeOwned = false;
      delete nativeRoot.dataset.rpCustomControls;
      delete nativeRoot.dataset.rpNativeChrome;
      delete nativeRoot.dataset.rpNativeLocked;
      if (element) for (const [name, value] of savedAttributes) {
        if (value === null) element.removeAttribute(name);
        else element.setAttribute(name, value);
      }
    }
    function applyChrome() {
      shell.dataset.rpChrome = String(chromeVisible);
      shell.dataset.rpLocked = String(locked);
      lock.hidden = !lastReady || !inFullscreen() || locked && !lockVisible;
      if (nativeMode) {
        const changed2 = nativeRoot.dataset.rpNativeChrome !== String(chromeVisible);
        nativeRoot.dataset.rpNativeChrome = String(chromeVisible);
        nativeRoot.dataset.rpNativeLocked = String(locked);
        if (changed2 && chromeVisible && !locked) {
          const engine = root.querySelector(".jwplayer");
          engine?.classList.remove("jw-flag-user-inactive");
          engine?.dispatchEvent(new win.MouseEvent("mousemove", { bubbles: true }));
        }
      }
    }
    function show() {
      chromeVisible = true;
      win.clearTimeout(hideTimer);
      if (!locked && !player.state().paused && settings.hidden) hideTimer = win.setTimeout(() => {
        if (!scrubbing && settings.hidden) {
          chromeVisible = false;
          applyChrome();
        }
      }, 3e3);
      applyChrome();
    }
    function revealLock() {
      lockVisible = true;
      win.clearTimeout(lockTimer);
      lockTimer = win.setTimeout(() => {
        lockVisible = false;
        applyChrome();
      }, 2500);
      applyChrome();
    }
    function setLocked(value) {
      if (value && !inFullscreen()) return;
      cancelGestures();
      locked = value;
      settings.hidden = true;
      win.clearTimeout(lockTimer);
      if (value) revealLock();
      else show();
      update();
    }
    function cancelGestures() {
      (nativeMode ? root : surface).dispatchEvent(new win.Event("pointercancel"));
      holdTip.hidden = true;
    }
    function actionClick(action, node) {
      if (!player.state().ready) return;
      switch (action) {
        case "play":
          autoPlayAttempted = true;
          if (player.state().paused) audio?.intent(false);
          command(player.state().paused ? "play-audible" : "pause");
          show();
          break;
        case "mute": {
          const muted = !(player.audio?.().muted ?? video.muted);
          audio?.intent(muted);
          command("mute", muted);
          show();
          break;
        }
        case "lock":
          setLocked(true);
          break;
        case "settings":
          settings.hidden = !settings.hidden;
          show();
          break;
        case "context":
          if (node.dataset.rpMode === "intro") {
            if (options.onIntro) options.onIntro();
            else command("seek", Math.min(introEnd(), player.state().duration));
          } else beginNext(node);
          break;
        case "next":
          beginNext(node);
          break;
        case "fullscreen":
          try {
            if (options.onFullscreen) {
              const pending = options.onFullscreen();
              if (!pending) report("Ch\u01B0a k\u1EBFt n\u1ED1i \u0111\u01B0\u1EE3c khung ph\xE1t.");
              else pending.then((status) => {
                if (!disposed && !["fullscreen", "windowed"].includes(status)) report("Kh\xF4ng b\u1EADt \u0111\u01B0\u1EE3c to\xE0n m\xE0n h\xECnh khung.");
              });
            } else {
              const result = inFullscreen() ? doc.exitFullscreen?.() : root.requestFullscreen?.();
              if (!result && !root.requestFullscreen) report("Tr\xECnh duy\u1EC7t ch\u01B0a h\u1ED7 tr\u1EE3 to\xE0n m\xE0n h\xECnh khung.");
              result?.catch(() => report("Kh\xF4ng b\u1EADt \u0111\u01B0\u1EE3c to\xE0n m\xE0n h\xECnh khung."));
            }
          } catch {
            report("Kh\xF4ng b\u1EADt \u0111\u01B0\u1EE3c to\xE0n m\xE0n h\xECnh khung.");
          }
          break;
      }
      update();
    }
    function finishNext(status) {
      if (!nextPending) return;
      win.clearTimeout(nextTimer);
      nextError = { node: nextPending.node, text: status === "missing" ? "Ch\u01B0a c\xF3 t\u1EADp c\xF9ng b\u1EA3n d\u1ECBch" : status === "timeout" ? "Ch\u01B0a nh\u1EADn \u0111\u01B0\u1EE3c ph\u1EA3n h\u1ED3i" : "Kh\xF4ng chuy\u1EC3n \u0111\u01B0\u1EE3c t\u1EADp" };
      nextPending = null;
      update();
      win.clearTimeout(errorTimer);
      errorTimer = win.setTimeout(() => {
        nextError = null;
        update();
      }, 5e3);
    }
    function beginNext(node) {
      if (nextPending) return;
      nextError = null;
      settings.hidden = true;
      chromeVisible = true;
      win.clearTimeout(hideTimer);
      cancelGestures();
      nextPending = { node, source: player.fingerprint?.(), key: context?.episodeID };
      update();
      nextTimer = win.setTimeout(() => finishNext("timeout"), nativeMode ? 45e3 : 15e3);
      const active = nextPending;
      try {
        const result = options.onNext?.();
        if (result === false || !options.onNext) finishNext("unavailable");
        else if (result?.then) result.then((status) => {
          if (disposed || nextPending !== active) return;
          if (status === "navigating") win.clearTimeout(nextTimer);
          else if (status) finishNext(status);
        }, () => {
          if (!disposed && nextPending === active) finishNext("error");
        });
      } catch {
        finishNext("error");
      }
    }
    const offGestures = installGestures(win, player, () => {
    }, {
      surface: nativeMode ? void 0 : surface,
      exclusive: true,
      isLocked: () => locked,
      allowLockedMediaGestures: true,
      isInteractive: nativeMode ? (target) => !!target?.closest?.(".custom-control,.player-control,.item-btn,.player-dm,#player_top,#video_pop,#video_eps") : void 0,
      onLockedTap: () => {
        if (lockVisible) {
          lockVisible = false;
          win.clearTimeout(lockTimer);
          applyChrome();
        } else revealLock();
      },
      onTap: () => {
        if (chromeVisible) {
          chromeVisible = false;
          settings.hidden = true;
          win.clearTimeout(hideTimer);
          applyChrome();
        } else show();
      },
      onHoldChange: (active) => {
        holdTip.hidden = !active;
        if (active) {
          chromeVisible = false;
          applyChrome();
        }
      },
      onSeek: (side) => {
        seekTip.style.left = side > 0 ? "78%" : "22%";
        seekTip.dataset.side = side > 0 ? "right" : "left";
        seekTip.innerHTML = side > 0 ? "10s " + playerIcon("forward") : playerIcon("back") + " 10s";
        seekTip.hidden = false;
        win.clearTimeout(tipTimer);
        tipTimer = win.setTimeout(() => seekTip.hidden = true, 700);
      }
    });
    const block = (event) => event.stopPropagation();
    const inputEvents = ["pointerdown", "pointermove", "pointerup", "touchstart", "touchmove", "touchend", "touchcancel", "mousedown", "mouseup", "click", "dblclick", "contextmenu", "keydown", "keyup"];
    for (const name of inputEvents) shell.addEventListener(name, block);
    seek.addEventListener("pointerdown", () => {
      scrubbing = true;
      win.clearTimeout(hideTimer);
    });
    seek.addEventListener("input", () => {
      scrubbing = true;
      paintTime(Number(seek.value), player.state().duration);
    });
    seek.addEventListener("change", () => {
      if (!locked) command("seek", Number(seek.value));
      scrubbing = false;
      show();
      update();
    });
    const cancelScrub = () => {
      scrubbing = false;
      update();
    };
    seek.addEventListener("pointercancel", cancelScrub);
    win.addEventListener("blur", cancelScrub);
    const releaseScrub = () => {
      if (scrubbing) {
        win.clearTimeout(scrubTimer);
        scrubTimer = win.setTimeout(() => {
          if (!disposed) {
            scrubbing = false;
            update();
          }
        }, 0);
      }
    };
    win.addEventListener("pointerup", releaseScrub);
    chrome.addEventListener("pointerdown", () => win.clearTimeout(hideTimer));
    const fsChanged = () => {
      if (!inFullscreen() && locked) setLocked(false);
      show();
      update();
    };
    doc.addEventListener("fullscreenchange", fsChanged);
    const changed = () => update();
    const mediaEvents = ["error", "loadedmetadata", "canplay", "timeupdate", "play", "pause", "ratechange", "volumechange", "durationchange", "emptied", "loadstart"];
    for (const name of mediaEvents) video.addEventListener(name, changed);
    const checkpointAudio = () => {
      try {
        audio?.checkpoint(player.state(), !!context && options.canRestoreAudio?.() !== false);
      } catch {
      }
    };
    win.addEventListener("pagehide", checkpointAudio);
    doc.addEventListener("visibilitychange", changed);
    const offPlayer = player.subscribe?.(changed);
    const lockedKey = (event) => {
      if (locked && inFullscreen() && !event.ctrlKey && !event.metaKey && !event.altKey && [" ", "k", "j", "l", "m", "f", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "<", ">", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(event.key)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    win.addEventListener("keydown", lockedKey, true);
    win.addEventListener("keyup", lockedKey, true);
    const nativeObserver = new win.MutationObserver(() => {
      if (nativeOwned && element?.controls) element.controls = false;
    });
    if (element) nativeObserver.observe(element, { attributes: true, attributeFilter: ["controls"] });
    const introEnd = () => {
      const value = options.introSeconds?.() ?? 90;
      return Number.isFinite(value) && value >= 0 && value <= 300 ? value : 90;
    };
    function format(value) {
      const seconds = Math.max(0, Math.floor(Number(value) || 0));
      return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
    }
    function paintTime(position, duration) {
      time.textContent = format(position) + " / " + format(duration);
      seek.style.setProperty("--rp-played", (duration > 0 ? 100 * position / duration : 0) + "%");
    }
    function update() {
      if (disposed) return;
      const state = player.state(), becameReady = state.ready && !lastReady;
      lastReady = state.ready;
      shell.hidden = !state.ready;
      updateTracks();
      for (const node of tracks.querySelectorAll("button")) node.disabled = !state.ready || locked;
      if (locked && !inFullscreen()) {
        cancelGestures();
        locked = false;
        settings.hidden = true;
        win.clearTimeout(lockTimer);
        show();
      }
      if (!state.ready) {
        cancelGestures();
        scrubbing = false;
        locked = false;
        settings.hidden = true;
        nextPending = null;
        nextError = null;
        win.clearTimeout(nextTimer);
      }
      nativeOwned = true;
      if (!nativeMode) nativeRoot.dataset.rpCustomControls = "1";
      if (element) {
        if (element.controls) element.controls = false;
        element.setAttribute("playsinline", "");
        element.setAttribute("webkit-playsinline", "");
      }
      if (becameReady || lastPaused !== null && state.paused !== lastPaused) show();
      lastPaused = state.paused;
      for (const node of [center, play, mute, fullscreen, settingsButton, seek, ...rates.children]) node.disabled = !state.ready || locked;
      for (const node of [center, play]) {
        const kind = state.paused ? "play" : "pause";
        if (node.dataset.rpIcon !== kind) {
          node.innerHTML = playerIcon(kind);
          node.dataset.rpIcon = kind;
        }
        node.setAttribute("aria-label", state.paused ? "Ph\xE1t" : "T\u1EA1m d\u1EEBng");
      }
      const muted = player.audio?.().muted ?? video.muted;
      mute.innerHTML = playerIcon(muted ? "muted" : "volume");
      mute.setAttribute("aria-label", muted ? "B\u1EADt ti\u1EBFng" : "T\u1EAFt ti\u1EBFng");
      if (nativeMode) for (const node of root.querySelectorAll(".btn-muted")) {
        node.classList.toggle("fa-volume-mute", muted);
        node.classList.toggle("fa-volume-high", !muted);
        node.setAttribute("aria-label", muted ? "B\u1EADt ti\u1EBFng" : "T\u1EAFt ti\u1EBFng");
      }
      fullscreen.innerHTML = playerIcon(inFullscreen() ? "shrink" : "fullscreen");
      fullscreen.setAttribute("aria-label", inFullscreen() ? "Thu nh\u1ECF" : "To\xE0n m\xE0n h\xECnh");
      lock.innerHTML = playerIcon(locked ? "lock" : "unlock");
      lock.setAttribute("aria-label", locked ? "M\u1EDF kh\xF3a m\xE0n h\xECnh" : "Kh\xF3a m\xE0n h\xECnh");
      if (!scrubbing) {
        seek.max = String(Math.max(1, state.duration));
        seek.value = String(state.time);
        paintTime(state.time, state.duration);
      }
      for (const node of rates.children) node.setAttribute("aria-pressed", String(Number(node.dataset.rpRate) === state.rate));
      const intro = state.time < introEnd() - 5 && state.duration >= 600, nearEnd = state.duration - state.time <= 180;
      contextAction.dataset.rpMode = nextPending?.node === contextAction || nextError?.node === contextAction ? "next" : intro ? "intro" : "next";
      contextAction.hidden = !intro && !context || !(intro || nearEnd || nextPending?.node === contextAction || nextError?.node === contextAction);
      line.dataset.rpNextStatus = String(nextPending?.node === next || nextError?.node === next);
      for (const node of [contextAction, next]) {
        node.dataset.rpStatus = String(nextPending?.node === node || nextError?.node === node);
        node.disabled = !state.ready || locked && node !== contextAction || !context && !(node === contextAction && intro) || !!nextPending;
        node.setAttribute("aria-busy", String(nextPending?.node === node));
        if (nextPending?.node === node) node.textContent = "\u0110ang chuy\u1EC3n t\u1EADp\u2026";
        else if (nextError?.node === node) node.textContent = nextError.text;
        else if (node === contextAction) node.innerHTML = (intro ? "B\u1ECF qua gi\u1EDBi thi\u1EC7u" : "T\u1EADp ti\u1EBFp theo") + " " + playerIcon(intro ? "forward" : "next");
        else node.innerHTML = playerIcon("next");
      }
      applyChrome();
      if (options.autoPlay && context && !autoPlayAttempted && state.ready && video.readyState >= 3 && !doc.hidden) {
        autoPlayAttempted = true;
        if (state.paused && !state.played && !state.ended) command("play");
      }
      audio?.update(state, !!context && options.canRestoreAudio?.() !== false);
    }
    if (win.getComputedStyle(root).position === "static") {
      root.style.position = "relative";
      positioned = true;
    }
    const nativeClick = (event) => {
      if (!nativeMode || !player.state().ready) return;
      const playButton = event.target.closest?.(".jw-btn-play,.jw-icon-playback,.jw-display-icon-display,.item-play,.item-pause");
      const muteButton = event.target.closest?.(".btn-muted,.jw-icon-volume");
      if (!playButton && !muteButton) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!locked) actionClick(playButton ? "play" : "mute", playButton ? play : mute);
    };
    const nativeVolume = (event) => {
      if (!nativeMode || locked || !event.target.closest?.("#volume,.jw-slider-volume")) return;
      win.queueMicrotask(() => {
        if (disposed || locked || !player.state().ready) return;
        const value = player.audio?.() || {};
        audio?.intent(value.muted === true || value.volume === 0);
        update();
      });
    };
    if (nativeMode) {
      center.remove();
      chrome.remove();
      settings.remove();
      surface.remove();
      root.addEventListener("click", nativeClick, true);
      root.addEventListener("click", nativeVolume, true);
      root.addEventListener("pointerup", nativeVolume, true);
    }
    root.append(shell);
    update();
    return {
      shell,
      surface,
      update,
      setContext(value) {
        const key = (c) => c ? [c.url, c.episodeID, c.lane, c.server].join("|") : "";
        const oldKey = key(context);
        context = value;
        if (oldKey && oldKey !== key(value)) {
          nextPending = null;
          nextError = null;
          win.clearTimeout(nextTimer);
          setLocked(false);
        }
        update();
      },
      requestResult(status) {
        if (status !== "navigating") finishNext(status);
      },
      dispose() {
        if (disposed) return;
        checkpointAudio();
        disposed = true;
        root.removeEventListener("click", nativeClick, true);
        root.removeEventListener("click", nativeVolume, true);
        root.removeEventListener("pointerup", nativeVolume, true);
        offGestures();
        offPlayer?.();
        nativeObserver.disconnect();
        for (const timer of [hideTimer, lockTimer, tipTimer, errorTimer, nextTimer, scrubTimer]) win.clearTimeout(timer);
        for (const name of mediaEvents) video.removeEventListener(name, changed);
        for (const name of inputEvents) shell.removeEventListener(name, block);
        doc.removeEventListener("fullscreenchange", fsChanged);
        doc.removeEventListener("visibilitychange", changed);
        win.removeEventListener("blur", cancelScrub);
        win.removeEventListener("pointerup", releaseScrub);
        win.removeEventListener("keydown", lockedKey, true);
        win.removeEventListener("keyup", lockedKey, true);
        win.removeEventListener("pagehide", checkpointAudio);
        restoreNative();
        if (positioned) root.style.position = originalPosition;
        shell.remove();
      }
    };
  }

  // shared/player/loading.js
  function loadingPanel(win, host, { fixed = false, onRetry = () => {
  } } = {}) {
    playerUIStyle(win.document);
    const node = win.document.createElement("div");
    node.dataset.rpUi = "player-loading";
    node.className = "rp-watch-loading" + (fixed ? " rp-loading-fixed" : "");
    node.setAttribute("role", "status");
    const spinner = win.document.createElement("span");
    spinner.className = "rp-watch-spinner";
    spinner.setAttribute("aria-hidden", "true");
    node.append(spinner);
    const message = win.document.createElement("span");
    message.className = "rp-loading-message";
    message.textContent = "\u0110ang t\u1EA3i phim";
    message.hidden = true;
    node.append(message);
    const retry = win.document.createElement("button");
    retry.type = "button";
    retry.className = "rp-loading-retry";
    retry.textContent = "Th\u1EED l\u1EA1i";
    retry.hidden = true;
    retry.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!disposed) {
        waiting();
        onRetry();
      }
    });
    node.append(retry);
    let timer = 0, disposed = false;
    function waiting() {
      win.clearTimeout(timer);
      spinner.hidden = false;
      message.hidden = true;
      retry.hidden = true;
      node.dataset.rpLoading = "waiting";
      node.setAttribute("aria-label", "\u0110ang t\u1EA3i phim");
      timer = win.setTimeout(() => {
        if (!disposed) {
          node.dataset.rpLoading = "slow";
          message.textContent = "\u0110ang ch\u1EDD tr\xECnh ph\xE1t";
          message.hidden = false;
          retry.hidden = false;
        }
      }, 2e4);
    }
    function fail(text = "Ch\u01B0a t\u1EA3i \u0111\u01B0\u1EE3c phim") {
      if (disposed) return;
      win.clearTimeout(timer);
      node.dataset.rpLoading = "error";
      node.setAttribute("aria-label", text);
      spinner.hidden = true;
      message.textContent = text;
      message.hidden = false;
      retry.hidden = false;
    }
    host.append(node);
    waiting();
    return { node, fail, dispose() {
      disposed = true;
      win.clearTimeout(timer);
      node.remove();
    } };
  }
  function childLoading(win) {
    const doc = win.document;
    let panel = null, disposed = false;
    const pending = () => {
      if (!disposed && !panel) panel = loadingPanel(win, doc.documentElement, { fixed: true, onRetry: () => win.location.reload() });
    };
    const error = (event) => {
      if (event.target?.tagName === "VIDEO") {
        pending();
        panel?.fail();
      }
    };
    const waiting = (event) => {
      if (event.target?.tagName === "VIDEO") pending();
    };
    doc.addEventListener("error", error, true);
    doc.addEventListener("loadstart", waiting, true);
    doc.addEventListener("emptied", waiting, true);
    pending();
    return { update(ready) {
      if (disposed) return;
      if (ready) {
        panel?.dispose();
        panel = null;
      } else pending();
    }, dispose() {
      disposed = true;
      panel?.dispose();
      panel = null;
      doc.removeEventListener("error", error, true);
      doc.removeEventListener("loadstart", waiting, true);
      doc.removeEventListener("emptied", waiting, true);
    } };
  }

  // rophim/lib/player-loading.js
  function frameLoading(win) {
    const doc = win.document, selector = ".player-ratio iframe#embed-player,iframe#player.player-iframe", records = /* @__PURE__ */ new Map();
    let disposed = false;
    playerUIStyle(doc);
    doc.documentElement.dataset.rpFrameGuard = "1";
    function prepare(frame, force = false) {
      if (disposed || !frame?.isConnected) return null;
      let record = records.get(frame);
      if (!record) {
        record = { src: null, panel: null, awaitingLoad: false, loaded: () => {
          prepare(frame, true);
          record.awaitingLoad = false;
        } };
        records.set(frame, record);
        frame.addEventListener("load", record.loaded);
      }
      if (force || record.src !== frame.src || record.host !== frame.parentElement) {
        if (record.src !== null && record.src !== frame.src) record.awaitingLoad = true;
        record.src = frame.src;
        frame.dataset.rpDisplay = "loading";
        record.panel?.dispose();
        const host = frame.parentElement;
        record.host = host;
        host.dataset.rpFrameHost = "1";
        record.panel = loadingPanel(win, host, { onRetry: () => {
          if (!frame.isConnected) return;
          record.awaitingLoad = true;
          prepare(frame, true);
          frame.src = record.src;
        } });
      }
      return record;
    }
    function scan() {
      for (const frame of doc.querySelectorAll(selector)) prepare(frame);
      for (const [frame, record] of records) if (!frame.isConnected) {
        record.panel?.dispose();
        frame.removeEventListener("load", record.loaded);
        records.delete(frame);
      }
    }
    const observer = new win.MutationObserver(scan);
    observer.observe(doc, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] });
    scan();
    return {
      begin(frame) {
        const record = prepare(frame, true);
        if (record) record.awaitingLoad = true;
      },
      update(info) {
        const frame = info.site?.frame, record = prepare(frame);
        if (!record) return;
        if (!record.awaitingLoad && info.controlsReady === true && info.state?.ready && !info.state.ad && info.context && info.media && record.src === frame.src) {
          frame.dataset.rpDisplay = "custom";
          record.panel?.dispose();
          record.panel = null;
        } else if (frame.dataset.rpDisplay === "custom") prepare(frame, true);
        if (info.state?.failed === true) record.panel?.fail();
      },
      dispose() {
        disposed = true;
        observer.disconnect();
        for (const [frame, record] of records) {
          record.panel?.dispose();
          frame.removeEventListener("load", record.loaded);
          delete frame.dataset.rpDisplay;
        }
        records.clear();
        delete doc.documentElement.dataset.rpFrameGuard;
      }
    };
  }

  // shared/player/fullscreen.js
  function fullscreenController(win, { onChange = () => {
  } } = {}) {
    const doc = win.document, orientation = win.screen?.orientation;
    let target = null, epoch = 0, attempt = -1, owned = false, inFlight = null, disposed = false, pending = null;
    let recoveryTimer = 0, recheck = false, recoveryAttempts = [];
    const mobile = () => win.matchMedia?.("(pointer: coarse)").matches === true || /Android|iPhone|iPad|iPod/i.test(win.navigator.userAgent);
    const active = () => !disposed && target?.isConnected && doc.fullscreenElement === target && !doc.hidden && mobile();
    const portrait = () => typeof orientation?.type === "string" ? orientation.type.startsWith("portrait") : win.innerHeight > win.innerWidth;
    function clearRecovery() {
      win.clearTimeout(recoveryTimer);
      recoveryTimer = 0;
      recheck = false;
      recoveryAttempts = [];
    }
    function verify() {
      win.clearTimeout(recoveryTimer);
      recoveryTimer = 0;
      if (!active()) return;
      if (!owned) {
        if (attempt !== epoch) lock();
        return;
      }
      if (!portrait()) return;
      if (inFlight) {
        recheck = true;
        return;
      }
      const now = win.Date.now();
      recoveryAttempts = recoveryAttempts.filter((at) => now - at < 5e3);
      if (recoveryAttempts.length >= 3) {
        doc.documentElement.dataset.rpOrientation = "blocked";
        return;
      }
      recoveryAttempts.push(now);
      lock(true);
    }
    function scheduleRecovery() {
      if (!active()) return;
      if (portrait()) verify();
      win.clearTimeout(recoveryTimer);
      recoveryTimer = win.setTimeout(verify, 120);
    }
    function unlock() {
      if (owned) {
        owned = false;
        try {
          orientation?.unlock?.();
        } catch {
        }
      }
    }
    function lock(recovery = false) {
      if (!active() || inFlight || !recovery && (owned || attempt === epoch)) return;
      if (typeof orientation?.lock !== "function") {
        doc.documentElement.dataset.rpOrientation = "unsupported";
        return;
      }
      const job = { epoch, node: target };
      attempt = epoch;
      inFlight = job;
      let request;
      try {
        request = orientation.lock("landscape");
      } catch {
        request = Promise.reject(new Error("orientation rejected"));
      }
      Promise.resolve(request).then(() => {
        if (!disposed && job.epoch === epoch && doc.fullscreenElement === job.node) {
          owned = true;
          doc.documentElement.dataset.rpOrientation = "landscape";
        } else try {
          orientation.unlock();
        } catch {
        }
      }, () => {
        if (!disposed && job.epoch === epoch) doc.documentElement.dataset.rpOrientation = "blocked";
      }).finally(() => {
        if (inFlight === job) inFlight = null;
        if (!disposed && job.epoch !== epoch) lock();
        else if (recheck) {
          recheck = false;
          scheduleRecovery();
        }
      });
    }
    const changed = () => {
      if (disposed) return;
      if (target && doc.fullscreenElement !== target) {
        epoch++;
        clearRecovery();
        unlock();
        target = null;
        delete doc.documentElement.dataset.rpOrientation;
      }
      lock();
      scheduleRecovery();
      onChange();
    };
    doc.addEventListener("fullscreenchange", changed);
    orientation?.addEventListener?.("change", scheduleRecovery);
    win.addEventListener("orientationchange", scheduleRecovery);
    win.addEventListener("resize", scheduleRecovery);
    doc.addEventListener("visibilitychange", scheduleRecovery);
    return {
      toggle(node) {
        if (disposed || !node?.isConnected) return Promise.resolve("unavailable");
        if (pending) return pending;
        const exiting = doc.fullscreenElement === node;
        if (!exiting) {
          epoch++;
          clearRecovery();
          unlock();
          target = node;
        }
        let request;
        try {
          request = exiting ? doc.exitFullscreen() : node.requestFullscreen();
        } catch {
          if (!exiting) {
            epoch++;
            target = null;
          }
          return Promise.resolve("error");
        }
        pending = Promise.resolve(request).then(() => {
          if (disposed) return "unavailable";
          changed();
          return doc.fullscreenElement === node ? "fullscreen" : "windowed";
        }, () => {
          if (doc.fullscreenElement !== node) {
            epoch++;
            unlock();
            target = null;
          }
          return "error";
        }).finally(() => pending = null);
        return pending;
      },
      dispose() {
        disposed = true;
        epoch++;
        clearRecovery();
        unlock();
        target = null;
        doc.removeEventListener("fullscreenchange", changed);
        orientation?.removeEventListener?.("change", scheduleRecovery);
        win.removeEventListener("orientationchange", scheduleRecovery);
        win.removeEventListener("resize", scheduleRecovery);
        doc.removeEventListener("visibilitychange", scheduleRecovery);
        delete doc.documentElement.dataset.rpOrientation;
      }
    };
  }

  // rophim/lib/watch-navigation.js
  function watchNavigation(win, { onChange = () => {
  }, ownsPlayer = () => false } = {}) {
    const doc = win.document;
    let serial = 0, controller = null, disposed = false;
    const loading = frameLoading(win), fullscreen = fullscreenController(win, { onChange });
    const href = () => win.location.origin + win.location.pathname;
    function host(site) {
      const node = site?.frame?.parentElement;
      if (node) node.dataset.rpFrameHost = "1";
      return node;
    }
    async function navigate(value, { site = detectSite(doc, win.location.href), keepLane = false, isCurrent = () => true, pop = false } = {}) {
      const target = safeURL(value, win.location.href), current = readContext(site, doc), frame = site?.frame;
      if (disposed || !current || !target || target.origin !== win.location.origin || !target.pathname.startsWith("/xem-phim/") || !frame?.isConnected) return "unavailable";
      if (!pop && target.origin + target.pathname === href()) return "navigating";
      const id = ++serial, oldHref = win.location.href, oldSrc = frame.src, key = contextKey(current);
      controller?.abort();
      const active = new win.AbortController();
      controller = active;
      const timer = win.setTimeout(() => active.abort(), 1e4);
      const live = () => !disposed && id === serial && !active.signal.aborted && isCurrent() && frame.isConnected && frame.src === oldSrc && (pop || win.location.href === oldHref) && contextKey(readContext(site, doc)) === key;
      try {
        const response = await win.fetch(target.href, { credentials: "same-origin", signal: active.signal });
        if (!response.ok || response.url && safeURL(response.url)?.origin !== target.origin) return "error";
        const html = await response.text();
        if (!live() || html.length > 2e6) return "unavailable";
        const parsed = new win.DOMParser().parseFromString(html, "text/html");
        const nextSite = detectSite(parsed, target.href);
        if (!nextSite || nextSite.kind !== site.kind) return "unavailable";
        if (nextSite.kind === "legacy-panels") {
          const active2 = [...parsed.querySelectorAll(".btn-episode.on-air")].some((n) => safeURL(n.getAttribute("href"), target.href)?.pathname === target.pathname);
          const episode = [...parsed.querySelectorAll(current.lane === "tm" ? ".chaptertm" : ".chaptervs")].some((n) => safeURL(n.getAttribute("href"), target.href)?.pathname === target.pathname);
          if (!active2) return "unavailable";
          if (!episode) return "missing";
          nextSite.preferences = { selectedVidTypeRophim: current.lane, selectedServerRophim: current.server };
          const panel = [...parsed.querySelectorAll(".server-picker[data-panel]")].find((n) => n.dataset.panel === (current.lane === "tm" ? "thuyetminh" : "vietsub"));
          const selected = [...panel?.querySelectorAll("[data-server][data-value]") || []].find((n) => n.dataset.server === current.server);
          if (!selected || !isFrameURL(selected.dataset.value)) return "unavailable";
          nextSite.frame.src = selected.dataset.value;
        }
        const next = readContext(nextSite, parsed), embed = safeURL(nextSite.frame.src);
        if (!next || !sameFilm(current, next) || !embed || !isFrameURL(embed.href)) return "unavailable";
        if (keepLane && (laneKey(next.lane) !== laneKey(current.lane) || next.season !== current.season)) return "missing";
        if (!live()) return "unavailable";
        loading.begin(frame);
        if (!pop) win.History.prototype.pushState.call(win.history, { ...win.history.state, rpWatch: true }, "", target.href);
        commitWatchSite(doc, nextSite);
        doc.title = parsed.title;
        for (const a of doc.querySelectorAll("a[href].on-air")) if (safeURL(a.href)?.pathname.startsWith("/xem-phim/")) a.classList.remove("on-air");
        for (const a of doc.querySelectorAll(".de-eps a[href],.playlist a[href],a.btn-episode[href]")) if (safeURL(a.href)?.origin === target.origin && safeURL(a.href)?.pathname === target.pathname) a.classList.add("on-air");
        frame.src = embed.href;
        onChange();
        return "navigating";
      } catch {
        return id === serial ? "error" : "unavailable";
      } finally {
        win.clearTimeout(timer);
        if (controller === active) controller = null;
      }
    }
    const click = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.("a[href]");
      if (!link || link.closest("[data-rp-ui]") || link.target && link.target !== "_self" || link.hasAttribute("download")) return;
      const site = detectSite(doc, win.location.href), context = readContext(site, doc), url = safeURL(link.href);
      if (!context || url?.origin !== win.location.origin || !url.pathname.startsWith("/xem-phim/")) return;
      const slug = url.pathname.slice("/xem-phim/".length).replace(/\.\d+$/, "").replace(/-tap-\d+$/, "");
      if (slug !== context.movie) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      navigate(url.href, { site }).then((status) => {
        if (status !== "navigating") link.setAttribute("title", "Ch\u01B0a t\u1EA3i \u0111\u01B0\u1EE3c t\u1EADp. B\u1EA5m \u0111\u1EC3 th\u1EED l\u1EA1i.");
      });
    };
    doc.addEventListener("click", click, true);
    const nativeNext = (event) => {
      if (event.data?.type !== "CHANGE_EPISODE" || !ownsPlayer()) return;
      const site = detectSite(doc, win.location.href), origin = safeURL(site?.frame?.src)?.origin;
      if (!site || !FRAME_ORIGINS.has(origin) || event.origin !== origin || event.source !== site.frame.contentWindow) return;
      event.stopImmediatePropagation();
    };
    win.addEventListener("message", nativeNext, true);
    const popstate = (event) => {
      const raw = doc.getElementById("rp-watch-descriptor")?.textContent;
      if (!raw) return;
      let previous;
      try {
        previous = JSON.parse(raw);
      } catch {
        return;
      }
      const previousURL = safeURL(previous.href), target = safeURL(win.location.href);
      if (!previousURL || !target || target.origin !== previousURL.origin || !target.pathname.startsWith("/xem-phim/")) return;
      const previousSite = detectSite(doc, previousURL.href), current = readContext(previousSite, doc);
      const slug = target.pathname.slice("/xem-phim/".length).replace(/\.\d+$/, "").replace(/-tap-\d+$/, "");
      if (!current || slug !== current.movie) return;
      event.stopImmediatePropagation();
      navigate(target.href, { site: previousSite, pop: true }).then((status) => {
        if (status !== "navigating" && win.location.href === target.href) {
          win.History.prototype.replaceState.call(win.history, win.history.state, "", previousURL.href);
          onChange();
        }
      });
    };
    win.addEventListener("popstate", popstate, true);
    return {
      navigate,
      fullscreen(site) {
        return fullscreen.toggle(host(site));
      },
      update(info) {
        loading.update(info);
      },
      dispose() {
        disposed = true;
        serial++;
        controller?.abort();
        loading.dispose();
        fullscreen.dispose();
        doc.removeEventListener("click", click, true);
        win.removeEventListener("message", nativeNext, true);
        win.removeEventListener("popstate", popstate, true);
      }
    };
  }

  // shared/bridge/ownership.js
  function runFamily(win, { family, feature, isSiteURL, isFrameURL: isFrameURL2, isFrameOrigin = () => false }, start) {
    const tag = "media-userscripts-owner-v1", doc = win.document;
    let active = false, disposed = false, timer = 0;
    const challenge = Array.from(win.crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(16).padStart(8, "0")).join("");
    const allowed = (value) => {
      try {
        return !!(isSiteURL(value) || isFrameURL2(value));
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
    else if (win.parent !== win && isFrameURL2(win.location.href)) {
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

  // rophim/gestures/entry.js
  function startGestures(win, page) {
    if (!win.document.documentElement) {
      const early = new win.MutationObserver(() => {
        if (win.document.documentElement) {
          early.disconnect();
          startGestures(win, page);
        }
      });
      early.observe(win.document, { childList: true });
      return;
    }
    let mounted = null, site = null, context = null, bridge = null, frameFullscreen = false, endedKey = "";
    const releaseStartup = win.parent !== win && FRAME_ORIGINS.has(win.location.origin) ? playerStartupGuard(win) : () => {
    };
    const childGate = win.parent !== win && FRAME_ORIGINS.has(win.location.origin) ? childLoading(win) : null;
    const controlsReady = () => !!context && !!mounted?.ui.shell.isConnected && !mounted.ui.shell.hidden && mounted.player.state().ready && !mounted.player.state().ad;
    const navigation = win.parent === win ? watchNavigation(win, { onChange: () => bridge?.refresh(), ownsPlayer: () => bridge?.state()?.ready && !bridge.state().ad }) : null;
    const unbind = () => {
      mounted?.ui.dispose();
      mounted = null;
    };
    const next = async (action, request) => {
      if (!site || !context) return "unavailable";
      if (action === "fullscreen") return navigation?.fullscreen(site) ?? "unavailable";
      const selectedSite = site, selectedContext = context, expected = contextKey(context), frame = site.frame, src = frame?.src, href = win.location.href;
      try {
        const url = await nextRoute(selectedSite, selectedContext, win);
        if (!request?.isCurrent() || win.location.href !== href || expected !== contextKey(context) || site?.frame !== frame || frame?.src !== src || !frame?.isConnected) return "unavailable";
        if (!url) return "missing";
        if (selectedSite.kind === "legacy-panels") {
          win.document.cookie = `selectedServerRophim=${encodeURIComponent(selectedContext.server)}; path=/; SameSite=Lax`;
          win.document.cookie = `selectedVidTypeRophim=${selectedContext.lane}; path=/; SameSite=Lax`;
        }
        return navigation.navigate(url, { site: selectedSite, keepLane: true, isCurrent: request.isCurrent });
      } catch {
        return "error";
      }
    };
    bridge = createBridge(win, page, "gestures", {
      update(info) {
        site = info.site;
        context = info.context;
        frameFullscreen = info.fullscreen;
        navigation?.update(info);
        if (win.parent === win) {
          const state = info.state, key = contextKey(context) + "|" + info.media;
          if (!state?.ended) endedKey = "";
          else if (state.ready && !state.ad && state.played && context && endedKey !== key) {
            endedKey = key;
            let enabled = false;
            try {
              enabled = win.localStorage.getItem("autoNextEpisode") === "true";
            } catch {
            }
            if (enabled) {
              const frame = site.frame, src = frame.src, expected = contextKey(context);
              const isCurrent = () => site?.frame === frame && frame.src === src && contextKey(context) === expected && bridge?.state()?.ready && bridge.state().ended && !bridge.state().ad;
              next("next", { isCurrent });
            }
          }
          return;
        }
        if (info.player !== mounted?.player) {
          unbind();
          if (info.player) mounted = { player: info.player, ui: customPlayerControls(win, info.player, { autoPlay: true, isFullscreen: () => frameFullscreen, onNext: () => bridge?.request("next") ?? false, onFullscreen: () => {
            const pending = bridge?.request("fullscreen");
            return pending && pending.then((status) => {
              if (status === "fullscreen" || status === "windowed") {
                frameFullscreen = status === "fullscreen";
                mounted?.ui.update();
              }
              return status;
            });
          } }) };
        }
        mounted?.ui.setContext(context);
        childGate?.update(controlsReady());
      },
      unbind,
      request: next,
      controlsReady
    });
    win.addEventListener("pagehide", (event) => {
      if (!event.persisted) {
        bridge.dispose();
        navigation?.dispose();
        unbind();
        childGate?.dispose();
        releaseStartup();
      }
    });
  }
  runFamily(window, { family: "rophim", feature: "gestures", isSiteURL: isSiteOrigin, isFrameURL, isFrameOrigin: (value) => FRAME_ORIGINS.has(safeURL(value)?.origin) }, () => startGestures(window, typeof unsafeWindow === "undefined" ? window : unsafeWindow));
})();
