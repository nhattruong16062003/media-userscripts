// ==UserScript==
// @name         RoPhim — Thao tác trình phát
// @namespace    rophim-userscripts.local
// @version      0.4.25
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
        if (unwrap(provider?.video) === rawVideo && sameDoc(rawVideo) && unwrap(rawVideo.closest(".jwplayer")) === unwrap(root) && root?.contains(rawVideo)) return provider.hlsjs;
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
  var breakCache = /* @__PURE__ */ new WeakMap();
  function readPlayerAdBreaks(candidate) {
    if (!candidate || !candidate.video || candidate.video.nodeType !== 1) return [];
    let hls = null;
    try {
      hls = accessibleHls(candidate);
    } catch {
      return [];
    }
    const fragments = hls?.levels?.[hls.currentLevel]?.details?.fragments;
    if (!Array.isArray(fragments) || !fragments.length) return [];
    if (breakCache.has(fragments)) return breakCache.get(fragments);
    const found = detectHlsAdBreaks(fragments);
    breakCache.set(fragments, found);
    return found;
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
  [data-rp-frame-host]{position:relative}[data-rp-frame-host]:fullscreen{width:100vw!important;height:100vh!important;min-height:0!important;max-width:none!important;max-height:none!important;padding:0!important;margin:0!important;border:0!important;aspect-ratio:auto!important;box-sizing:border-box!important;background:#000!important;overflow:hidden!important}[data-rp-frame-host]:fullscreen::before,[data-rp-frame-host]:fullscreen::after{display:none!important;content:none!important;padding:0!important}[data-rp-frame-host]:fullscreen>iframe{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:0!important}
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
  .rp-load-readout{display:block;max-width:100%;font:11px/1.4 Arial,sans-serif;font-variant-numeric:tabular-nums;color:#ddd;text-shadow:0 1px 3px #000;pointer-events:none;white-space:nowrap;text-align:left}
  .rp-buffering{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:10px;max-width:calc(100% - 24px);pointer-events:none;text-align:center;text-shadow:0 1px 4px #000}
  .rp-buffering output{font:12px/1.4 Arial,sans-serif;color:#fff;white-space:nowrap;font-variant-numeric:tabular-nums;background:#0009;border-radius:4px;padding:3px 8px}
  .rp-loading-stats{font:12px/1.4 Arial,sans-serif;color:#eee;font-variant-numeric:tabular-nums}
  .rp-player-shell[data-rp-buffering="true"] .rp-center-play{visibility:hidden;pointer-events:none}
  .rp-load-detail{margin-top:12px;padding-top:8px;border-top:1px solid #ffffff24;font-size:11px;line-height:1.5;color:#ccc}
  .rp-player-timeline{display:flex;align-items:center;height:18px}.rp-player-shell input[type="range"]{appearance:none;-webkit-appearance:none;display:block;width:100%;height:4px;margin:0;padding:0;border:0;border-radius:1px;background:linear-gradient(to right,#fff 0%,#fff var(--rp-played,0%),#626262 var(--rp-played,0%),#626262 100%);touch-action:none;cursor:ew-resize}.rp-player-shell input[type="range"]::-webkit-slider-thumb{appearance:none;width:10px;height:10px;border:0;border-radius:50%;background:#fff}.rp-player-shell input[type="range"]::-moz-range-thumb{width:10px;height:10px;border:0;border-radius:50%;background:#fff}
  .rp-player-line{display:flex;align-items:center;gap:0;min-height:42px}.rp-player-time{font:12px/1 Arial,sans-serif;white-space:nowrap;font-variant-numeric:tabular-nums;color:#eee}.rp-player-spacer{flex:1}
  .rp-player-line .rp-icon[data-rp-status="true"]{max-width:160px;font-size:12px;line-height:1.2;white-space:normal}
  .rp-player-shell .rp-pill{color:#fff;font:500 14px sans-serif;border:.5px solid rgba(255,255,255,.28);border-radius:999px;background:rgba(255,255,255,.12);backdrop-filter:blur(10px) saturate(140%);-webkit-backdrop-filter:blur(10px) saturate(140%);padding:6px 14px;display:flex;align-items:center;gap:6px;white-space:nowrap}
  .rp-context-action{position:absolute;right:16px;bottom:88px;min-height:32px;pointer-events:auto}.rp-context-action svg{width:16px;height:16px}
  .rp-player-shell .rp-lock{position:absolute;left:48px;top:50%;transform:translateY(-50%);width:48px;height:48px;padding:0;border-radius:50%;background:rgba(0,0,0,.12);border:.5px solid rgba(255,255,255,.35);color:#fff}.rp-player-shell .rp-lock svg{width:24px;height:24px}
  .rp-feedback-seek{position:absolute;top:40%;left:78%;transform:translate(-50%,-50%);pointer-events:none}.rp-feedback-seek svg{width:16px;height:16px}.rp-feedback-seek[data-side="right"] svg{animation:rp-nudge-right .35s ease-out}.rp-feedback-seek[data-side="left"] svg{animation:rp-nudge-left .35s ease-out}
  .rp-feedback-hold{position:absolute;left:50%;top:12%;transform:translate(-50%,-50%);pointer-events:none}.rp-chevrons{display:flex}.rp-chevrons svg{width:9px;height:12px;fill:currentColor;stroke-width:0;margin-left:-1px;opacity:.3;animation:rp-run 1s ease-in-out infinite}.rp-chevrons svg:nth-child(2){animation-delay:.15s}.rp-chevrons svg:nth-child(3){animation-delay:.3s}
  .rp-feedback-notice{position:absolute;left:50%;top:12%;transform:translate(-50%,-50%);pointer-events:none;max-width:calc(100% - 32px);overflow:hidden;text-overflow:ellipsis;animation:rp-notice-in .2s ease-out}.rp-feedback-notice svg{width:15px;height:15px;flex:0 0 auto}
  .rp-player-settings{position:absolute;bottom:64px;right:16px;z-index:2;width:224px;max-height:70%;overflow-y:auto;padding:4px 12px 10px;border:0;border-radius:2px;background:#1a1a1a;color:#fff;pointer-events:auto}.rp-player-settings-header{display:flex;align-items:center;justify-content:space-between;font-size:13px}.rp-player-speed-options{display:flex;flex-wrap:wrap;gap:4px}.rp-player-shell .rp-speed{padding:6px 10px;min-height:38px;border:0;border-radius:2px;background:#303030;color:#eee;font-size:13px}.rp-player-shell .rp-speed[aria-pressed="true"]{background:#555}.rp-track-label{font-size:13px;margin:10px 0 4px}.rp-player-tracks .rp-speed{margin:2px}.rp-skip-section{margin-top:10px;padding-top:8px;border-top:1px solid #ffffff24;display:flex;flex-direction:column;gap:6px}.rp-skip-row{display:flex;gap:4px}.rp-player-shell .rp-skip-btn{width:100%;text-align:left;padding:7px 10px;min-height:36px;border:0;border-radius:2px;background:#303030;color:#eee;font-size:12px;display:flex;align-items:center;justify-content:space-between;gap:8px}.rp-player-shell .rp-skip-btn[aria-pressed="true"]{background:#2e6b40;color:#fff}.rp-player-shell .rp-skip-clear{flex:0 0 auto;width:auto;background:#552b2b}
  .rp-player-error{position:absolute;bottom:76px;left:12px;right:12px;padding:6px 10px;border-radius:4px;background:#151515ed;color:#fff;font-size:12px;pointer-events:none}
  .rp-player-shell[data-rp-chrome="false"] .rp-player-chrome,.rp-player-shell[data-rp-chrome="false"] .rp-center-play,.rp-player-shell[data-rp-chrome="false"][data-rp-locked="false"] .rp-lock,.rp-player-shell[data-rp-locked="true"] .rp-player-chrome,.rp-player-shell[data-rp-locked="true"] .rp-center-play{visibility:hidden;pointer-events:none}
  @keyframes rp-run{0%,100%{opacity:.3;transform:translateX(0)}35%{opacity:1;transform:translateX(2px)}}@keyframes rp-nudge-right{from{transform:translateX(-4px);opacity:.3}to{transform:none;opacity:1}}@keyframes rp-nudge-left{from{transform:translateX(4px);opacity:.3}to{transform:none;opacity:1}}@keyframes rp-notice-in{from{opacity:0;transform:translate(-50%,-62%)}to{opacity:1;transform:translate(-50%,-50%)}}
  @media(max-width:480px){.rp-player-shell .rp-lock{left:24px}.rp-player-chrome{padding:8px 8px 0}.rp-player-shell .rp-icon:not(.rp-center-play):not(.rp-lock){min-width:36px;padding:6px}.rp-player-time{font-size:11px}.rp-player-line[data-rp-next-status="true"] .rp-player-time{display:none}.rp-player-shell .rp-pill{font-size:13px}}
  @media(pointer:coarse){.rp-player-shell .rp-icon{min-width:44px;min-height:44px}.rp-player-timeline{height:24px}.rp-context-action{bottom:96px;min-height:38px}.rp-player-settings{bottom:74px}}
  @media(prefers-reduced-motion:reduce){.rp-chevrons svg,.rp-feedback-seek svg,.rp-feedback-notice{animation:none;opacity:1}}
  `;
    (doc.head || doc.documentElement).append(style);
  }
  function playerStartupGuard(win) {
    const doc = win.document;
    playerUIStyle(doc);
    doc.documentElement.dataset.rpControlsBoot = "1";
    const network = mediaNetworkProbe(win);
    const suppress = () => {
      for (const video of doc.querySelectorAll("video[controls]")) video.removeAttribute("controls");
    };
    const observer = new win.MutationObserver(suppress);
    observer.observe(doc, { childList: true, subtree: true, attributes: true, attributeFilter: ["controls"] });
    suppress();
    return () => {
      observer.disconnect();
      network.dispose();
      delete doc.documentElement.dataset.rpControlsBoot;
    };
  }

  // shared/player/gestures.js
  function installGestures(win, player, notify = () => {
  }, options = {}) {
    const { video } = player, root = options.surface || player.root, doc = win.document;
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
      const shouldRestoreRate = previous?.held && (video.nodeType === 1 ? video.playbackRate === 2 : video.playbackRate === 2 || video.playbackRate === previous.rate);
      if (shouldRestoreRate) {
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
      const st = player.state(), isLocked = !!options.isLocked?.();
      if (interactive(e.target) || e.button !== 0 || !st.ready && !(isLocked && st.initializable)) return;
      const side = point(e);
      if (side === null) return;
      consume(e);
      restore();
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, side, at: Date.now(), source: source(), rate: st.rate, held: false, moved: false, locked: isLocked };
      try {
        root.setPointerCapture?.(e.pointerId);
      } catch {
      }
      if (!st.ready || press.locked && !options.allowLockedMediaGestures || st.paused) return;
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
      if (now - p.at > 350 || source() !== p.source) return;
      const st = player.state();
      if (!st.ready) {
        if (locked && st.initializable) options.onLockedTap?.();
        return;
      }
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
      if (doc.hidden) cancel();
    };
    for (const [name, fn] of [["pointerdown", down], ["pointermove", move], ["pointerup", up], ["pointercancel", pointerCancel], ["lostpointercapture", lostCapture], ["click", click], ["dblclick", click], ["contextmenu", menu]]) root.addEventListener(name, fn, true);
    if (options.exclusive) for (const name of ["touchstart", "touchmove", "touchend", "touchcancel"]) root.addEventListener(name, touch, { passive: false });
    win.addEventListener("blur", cancel);
    win.addEventListener("pointerup", up, true);
    win.addEventListener("pointermove", move, true);
    win.addEventListener("pointercancel", pointerCancel, true);
    doc.addEventListener("visibilitychange", visibility);
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
      doc.removeEventListener("visibilitychange", visibility);
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
        const currentState = player.state();
        if (!current() || !currentState.ready && !currentState.initializable || currentState.ad) return;
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

  // shared/player/skip-preferences.js
  var KEY = "media.skip.prefs.v1";
  var MAX_MARKS = 200;
  function readRaw(win) {
    for (const gm of [typeof GM_getValue === "function" ? GM_getValue : null, win?.GM_getValue]) {
      try {
        if (typeof gm === "function") {
          const v = gm(KEY, null);
          if (v) return typeof v === "string" ? JSON.parse(v) : v;
        }
      } catch {
      }
    }
    try {
      const v = win?.localStorage?.getItem(KEY);
      if (v) return JSON.parse(v);
    } catch {
    }
    return null;
  }
  function writeRaw(win, data) {
    const json = JSON.stringify(data);
    let wroteGm = false;
    for (const gm of [typeof GM_setValue === "function" ? GM_setValue : null, win?.GM_setValue]) {
      try {
        if (typeof gm === "function") {
          gm(KEY, json);
          wroteGm = true;
          break;
        }
      } catch {
      }
    }
    try {
      win?.localStorage?.setItem(KEY, json);
    } catch {
    }
    return wroteGm;
  }
  function normalizeData(raw) {
    const out = { autoSkipIntro: false, autoSkipAd: false, adMarks: {} };
    if (!raw || typeof raw !== "object") return out;
    out.autoSkipIntro = raw.autoSkipIntro === true;
    out.autoSkipAd = raw.autoSkipAd === true;
    if (raw.adMarks && typeof raw.adMarks === "object" && !Array.isArray(raw.adMarks)) {
      for (const [k, v] of Object.entries(raw.adMarks)) {
        if (typeof k === "string" && k && v && Number.isFinite(v.start) && v.start >= 0 && Number.isFinite(v.duration) && v.duration >= 5 && v.duration <= 180) {
          out.adMarks[k] = { start: Math.round(v.start), duration: Math.round(v.duration), updated: Number.isFinite(v.updated) ? v.updated : 0 };
        }
      }
    }
    return out;
  }
  function filmKeyFromContext(context) {
    if (!context || typeof context !== "object") return "";
    if (typeof context.movie === "string" && context.movie.trim()) return context.movie.trim().toLowerCase();
    if (typeof context.film === "string" && context.film.trim()) return context.film.trim().toLowerCase();
    if (typeof context.url === "string") {
      try {
        const p = new URL(context.url).pathname.replace(/\/+$/, "");
        const m = p.match(/\/(?:xem-phim|phim-le|phim|tap-phim)\/([^/]+)/i);
        if (m) return m[1].replace(/\.\d+$/, "").replace(/-tap-\d+.*$/i, "").toLowerCase();
      } catch {
      }
    }
    return "";
  }
  function createSkipPreferences(win) {
    let data = normalizeData(readRaw(win));
    const save = () => {
      const entries = Object.entries(data.adMarks);
      if (entries.length > MAX_MARKS) {
        entries.sort((a, b) => (b[1].updated || 0) - (a[1].updated || 0));
        data.adMarks = Object.fromEntries(entries.slice(0, MAX_MARKS));
      }
      writeRaw(win, data);
    };
    return {
      get() {
        const fresh = readRaw(win);
        if (fresh) data = normalizeData(fresh);
        return { autoSkipIntro: data.autoSkipIntro, autoSkipAd: data.autoSkipAd };
      },
      set(patch) {
        if (typeof patch?.autoSkipIntro === "boolean") data.autoSkipIntro = patch.autoSkipIntro;
        if (typeof patch?.autoSkipAd === "boolean") data.autoSkipAd = patch.autoSkipAd;
        save();
        return { autoSkipIntro: data.autoSkipIntro, autoSkipAd: data.autoSkipAd };
      },
      getAdMark(filmKey) {
        if (!filmKey) return null;
        const fresh = readRaw(win);
        if (fresh) data = normalizeData(fresh);
        return data.adMarks[filmKey] || null;
      },
      setAdMark(filmKey, start, end) {
        if (!filmKey || !Number.isFinite(start) || !Number.isFinite(end)) return null;
        const duration = Math.round(end - start);
        if (start < 0 || duration < 5 || duration > 180) return null;
        const mark = { start: Math.round(start), duration, updated: Date.now() };
        data.adMarks[filmKey] = mark;
        save();
        return mark;
      },
      clearAdMark(filmKey) {
        if (!filmKey || !data.adMarks[filmKey]) return false;
        delete data.adMarks[filmKey];
        save();
        return true;
      }
    };
  }

  // shared/player/custom-controls.js
  var fullscreenLocks = /* @__PURE__ */ new WeakMap();
  function fullscreenLockRecord(doc) {
    let record = fullscreenLocks.get(doc);
    if (!record) {
      record = { scope: null, locked: false };
      fullscreenLocks.set(doc, record);
      doc.addEventListener("fullscreenchange", () => {
        if (record.scope !== doc.fullscreenElement) {
          record.scope = null;
          record.locked = false;
        }
      });
    }
    return record;
  }
  function customPlayerControls(win, player, options = {}) {
    const { video, root } = player, doc = win.document, nativeRoot = player.nativeRoot || root, element = video.nodeType === 1 ? video : null;
    playerUIStyle(doc);
    const nativeMode = options.nativeUI === true;
    const contents = /* @__PURE__ */ new WeakMap();
    const text = (node, value) => {
      if (node.textContent !== value) node.textContent = value;
    };
    const prop = (node, key, value) => {
      if (node[key] !== value) node[key] = value;
    };
    const attr = (node, key, value) => {
      value = String(value);
      if (node.getAttribute(key) !== value) node.setAttribute(key, value);
    };
    const data = (node, key, value) => {
      value = String(value);
      if (node.dataset[key] !== value) node.dataset[key] = value;
    };
    const content = (node, key, render) => {
      if (contents.get(node) !== key) {
        render();
        contents.set(node, key);
      }
    };
    const icon = (node, kind) => content(node, "icon:" + kind, () => {
      node.innerHTML = playerIcon(kind);
      node.dataset.rpIcon = kind;
    });
    const buttonText = (node, value) => content(node, "text:" + value, () => {
      node.textContent = value;
      delete node.dataset.rpIcon;
    });
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
    function button(action, label, icon2, host, className = "rp-icon") {
      const node = doc.createElement("button");
      node.type = "button";
      node.dataset.rpAction = action;
      node.className = className;
      node.setAttribute("aria-label", label);
      node.innerHTML = playerIcon(icon2);
      contents.set(node, "icon:" + icon2);
      node.dataset.rpIcon = icon2;
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
    let disposed = false, locked = false, chromeVisible = true, lockVisible = true, scrubbing = false, nativeOwned = false, lastReady = false, lastInteractive = false, lastPaused = null, context = null, autoPlayAttempted = false;
    const lockRecord = fullscreenLockRecord(doc);
    const fullscreenScope = () => inFullscreen() ? doc.fullscreenElement || root : null;
    locked = !!fullscreenScope() && (typeof options.initialLocked === "boolean" ? options.initialLocked : lockRecord.scope === fullscreenScope() && lockRecord.locked);
    let hideTimer = 0, lockTimer = 0, tipTimer = 0, noticeTimer = 0, errorTimer = 0, nextErrorTimer = 0, nextTimer = 0, scrubTimer = 0, nextPending = null, nextError = null;
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
    const notice = doc.createElement("output");
    notice.className = "rp-feedback-notice rp-pill";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    notice.hidden = true;
    notice.innerHTML = playerIcon("forward") + "<span></span>";
    const noticeSpan = notice.querySelector("span");
    shell.append(notice);
    const chrome = doc.createElement("div");
    chrome.className = "rp-player-chrome";
    shell.append(chrome);
    const loadReadout = doc.createElement("output");
    loadReadout.className = "rp-load-readout";
    chrome.append(loadReadout);
    const buffering = doc.createElement("div");
    buffering.className = "rp-buffering";
    buffering.hidden = true;
    buffering.setAttribute("role", "status");
    buffering.setAttribute("aria-label", "\u0110ang t\u1EA3i phim");
    shell.append(buffering);
    const spinner = doc.createElement("span");
    spinner.className = "rp-watch-spinner";
    spinner.setAttribute("aria-hidden", "true");
    buffering.append(spinner);
    const loadingStats = doc.createElement("output");
    buffering.append(loadingStats);
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
    const skipPrefs = createSkipPreferences(win);
    let pendingAdStart = null, autoIntroKey = "", lastAutoAdKey = "", activeAdTarget = null;
    const skipSection = doc.createElement("div");
    skipSection.className = "rp-skip-section";
    settings.append(skipSection);
    const skipLabel = doc.createElement("div");
    skipLabel.className = "rp-track-label";
    skipLabel.textContent = "B\u1ECF qua t\u1EF1 \u0111\u1ED9ng";
    skipSection.append(skipLabel);
    const autoIntroBtn = doc.createElement("button");
    autoIntroBtn.type = "button";
    autoIntroBtn.className = "rp-skip-btn";
    autoIntroBtn.dataset.rpSetting = "auto-intro";
    autoIntroBtn.textContent = "T\u1EF1 b\u1ECF qua gi\u1EDBi thi\u1EC7u";
    skipSection.append(autoIntroBtn);
    const autoAdBtn = doc.createElement("button");
    autoAdBtn.type = "button";
    autoAdBtn.className = "rp-skip-btn";
    autoAdBtn.dataset.rpSetting = "auto-ad";
    autoAdBtn.textContent = "T\u1EF1 b\u1ECF qua QC video";
    skipSection.append(autoAdBtn);
    const markRow = doc.createElement("div");
    markRow.className = "rp-skip-row";
    skipSection.append(markRow);
    const markAdBtn = doc.createElement("button");
    markAdBtn.type = "button";
    markAdBtn.className = "rp-skip-btn";
    markAdBtn.dataset.rpAction = "mark-ad";
    markAdBtn.textContent = "\u0110\xE1nh d\u1EA5u b\u1EAFt \u0111\u1EA7u QC";
    markRow.append(markAdBtn);
    const clearMarkBtn = doc.createElement("button");
    clearMarkBtn.type = "button";
    clearMarkBtn.className = "rp-skip-btn rp-skip-clear";
    clearMarkBtn.dataset.rpAction = "clear-ad-mark";
    clearMarkBtn.textContent = "X\xF3a";
    clearMarkBtn.hidden = true;
    markRow.append(clearMarkBtn);
    autoIntroBtn.addEventListener("click", () => {
      if (locked) return;
      const next2 = !skipPrefs.get().autoSkipIntro;
      skipPrefs.set({ autoSkipIntro: next2 });
      show();
      update();
    });
    autoAdBtn.addEventListener("click", () => {
      if (locked) return;
      const next2 = !skipPrefs.get().autoSkipAd;
      skipPrefs.set({ autoSkipAd: next2 });
      show();
      update();
    });
    markAdBtn.addEventListener("click", () => {
      if (locked || !player.state().ready) return;
      const fk = filmKeyFromContext(context);
      if (!fk) {
        report("Ch\u01B0a x\xE1c \u0111\u1ECBnh \u0111\u01B0\u1EE3c phim \u0111\u1EC3 l\u01B0u m\u1ED1c QC.");
        return;
      }
      const nowTime = player.state().time;
      if (pendingAdStart === null) {
        pendingAdStart = nowTime;
        notify("\u0110\xE3 \u0111\xE1nh d\u1EA5u b\u1EAFt \u0111\u1EA7u QC t\u1EA1i " + format(nowTime) + ". B\u1EA5m l\u1EA1i khi QC k\u1EBFt th\xFAc.");
      } else {
        const saved = skipPrefs.setAdMark(fk, pendingAdStart, nowTime);
        pendingAdStart = null;
        if (saved) notify("\u0110\xE3 l\u01B0u m\u1ED1c QC (+" + saved.duration + "s) cho c\xE1c t\u1EADp sau.");
        else report("Kho\u1EA3ng QC ph\u1EA3i t\u1EEB 5 gi\xE2y \u0111\u1EBFn 3 ph\xFAt.");
      }
      show();
      update();
    });
    clearMarkBtn.addEventListener("click", () => {
      if (locked) return;
      pendingAdStart = null;
      const fk = filmKeyFromContext(context);
      if (fk) skipPrefs.clearAdMark(fk);
      notify("\u0110\xE3 x\xF3a m\u1ED1c QC c\u1EE7a phim n\xE0y.");
      show();
      update();
    });
    const loadDetail = doc.createElement("div");
    loadDetail.className = "rp-load-detail";
    settings.append(loadDetail);
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
    function notify(msg) {
      text(noticeSpan, msg);
      prop(notice, "hidden", false);
      win.clearTimeout(noticeTimer);
      noticeTimer = win.setTimeout(() => prop(notice, "hidden", true), 2500);
    }
    function report(text2) {
      error.textContent = text2;
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
      lockRecord.scope = fullscreenScope();
      lockRecord.locked = !!lockRecord.scope && locked;
      data(shell, "rpChrome", chromeVisible);
      data(shell, "rpLocked", locked);
      prop(lock, "hidden", !lastInteractive || !inFullscreen() || locked && !lockVisible && lastReady);
      if (nativeMode) {
        const changed2 = nativeRoot.dataset.rpNativeChrome !== String(chromeVisible);
        data(nativeRoot, "rpNativeChrome", chromeVisible);
        data(nativeRoot, "rpNativeLocked", locked);
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
    function setLocked(value, notify2 = true) {
      if (value && !inFullscreen()) return;
      cancelGestures();
      const changed2 = locked !== value;
      locked = value;
      prop(settings, "hidden", true);
      win.clearTimeout(lockTimer);
      if (changed2 && notify2) options.onLockChange?.(locked);
      if (value) revealLock();
      else show();
      update();
    }
    function cancelGestures() {
      (nativeMode ? root : surface).dispatchEvent(new win.Event("pointercancel"));
      prop(holdTip, "hidden", true);
    }
    function actionClick(action, node) {
      if (action === "play" && !player.state().ready && player.state().initializable) {
        autoPlayAttempted = true;
        audio?.intent(false);
        command("initialize-play-audible");
        show();
        update();
        return;
      }
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
          if (node.dataset.rpMode === "ad-hls" && activeAdTarget?.source === "hls") {
            if (command("seek", Math.min(activeAdTarget.end + 2, player.state().duration - 0.5))) notify("\u0110\xE3 b\u1ECF qua qu\u1EA3ng c\xE1o (" + activeAdTarget.duration + "s)");
          } else if (node.dataset.rpMode === "ad-mark" && activeAdTarget?.source === "mark") {
            if (command("seek", Math.min(player.state().time + activeAdTarget.duration, player.state().duration - 0.5))) notify("\u0110\xE3 b\u1ECF qua qu\u1EA3ng c\xE1o (+" + activeAdTarget.duration + "s)");
          } else if (node.dataset.rpMode === "intro") {
            options.onIntro?.();
            if (player.state().time < introEnd() - 5) command("seek", Math.min(introEnd(), player.state().duration));
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
      win.clearTimeout(nextErrorTimer);
      nextErrorTimer = win.setTimeout(() => {
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
      const nextTimeout = Number.isFinite(options.nextTimeoutMs) && options.nextTimeoutMs >= 15e3 && options.nextTimeoutMs <= 6e4 ? options.nextTimeoutMs : nativeMode ? 45e3 : 15e3;
      nextTimer = win.setTimeout(() => finishNext("timeout"), nextTimeout);
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
        } else {
          show();
          update();
        }
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
    const mediaEvents = ["error", "loadedmetadata", "canplay", "timeupdate", "play", "pause", "ratechange", "volumechange", "durationchange", "emptied", "loadstart", "waiting", "stalled", "playing", "progress", "seeking", "seeked"];
    for (const name of mediaEvents) video.addEventListener(name, changed);
    const loadTimer = win.setInterval(() => {
      if (!doc.hidden) update();
    }, 1e3);
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
      text(time, format(position) + " / " + format(duration));
      const value = (duration > 0 ? 100 * position / duration : 0) + "%";
      if (seek.style.getPropertyValue("--rp-played") !== value) seek.style.setProperty("--rp-played", value);
    }
    function update() {
      if (disposed) return;
      const state = player.state(), becameReady = state.ready && !lastReady;
      lastReady = state.ready;
      lastInteractive = state.ready || state.initializable === true;
      prop(shell, "hidden", !lastInteractive);
      const metrics = validLoadMetrics(state.load) ? state.load : null, loading = !!metrics && state.ready && !state.ad && ["loading", "buffering"].includes(metrics.status) && !state.paused && !state.ended;
      const loadText = loadMetricsText(metrics);
      text(loadReadout, loadText);
      prop(loadReadout, "hidden", !metrics || loading);
      prop(buffering, "hidden", !loading);
      text(loadingStats, loadText);
      data(shell, "rpBuffering", loading);
      const hint = !metrics ? "Ngu\u1ED3n ch\u01B0a cung c\u1EA5p th\xF4ng s\u1ED1 t\u1EA3i." : !metrics.online ? "Thi\u1EBFt b\u1ECB \u0111ang ngo\u1EA1i tuy\u1EBFn." : metrics.status === "error" ? "Ngu\u1ED3n ph\xE1t ho\u1EB7c gi\u1EA3i m\xE3 g\u1EB7p l\u1ED7i." : metrics.status === "buffering" ? "\u0110ang ch\u1EDD d\u1EEF li\u1EC7u; ch\u01B0a \u0111\u1EE7 b\u1EB1ng ch\u1EE9ng k\u1EBFt lu\u1EADn do m\u1EA1ng hay m\xE1y ch\u1EE7." : metrics.bytesPerSecond === null ? "Kh\xF4ng \u0111o \u0111\u01B0\u1EE3c t\u1ED1c \u0111\u1ED9 t\u1EA3i c\u1EE7a ngu\u1ED3n n\xE0y; \u2014 kh\xF4ng c\xF3 ngh\u0129a l\xE0 m\u1EA1ng ng\u1EEBng." : "T\u1ED1c \u0111\u1ED9 nh\u1EADn d\u1EEF li\u1EC7u phim trong c\xE1c l\u01B0\u1EE3t t\u1EA3i g\u1EA7n \u0111\xE2y. Engine c\xF3 th\u1EC3 t\u1EA1m ngh\u1EC9 khi \u0111\xE3 \u0111\u1EE7 b\u1ED9 \u0111\u1EC7m.";
      text(loadDetail, hint + (metrics ? " " + (metrics.bufferPolicy === "expanded" ? "\u0110\xE3 m\u1EDF r\u1ED9ng t\u1EA3i tr\u01B0\u1EDBc c\xF3 gi\u1EDBi h\u1EA1n." : metrics.bufferPolicy === "limited" ? "Gi\u1EEF gi\u1EDBi h\u1EA1n t\u1EA3i \u0111\u1EC3 b\u1EA3o v\u1EC7 ph\xE1t phim." : "B\u1ED9 \u0111\u1EC7m do engine qu\u1EA3n l\xFD.") : ""));
      if (!trackSignature || !settings.hidden) updateTracks();
      for (const node of tracks.querySelectorAll("button")) prop(node, "disabled", !state.ready || locked);
      if (locked && !inFullscreen()) {
        cancelGestures();
        locked = false;
        options.onLockChange?.(false);
        prop(settings, "hidden", true);
        win.clearTimeout(lockTimer);
        show();
      }
      if (!state.ready) {
        cancelGestures();
        scrubbing = false;
        prop(settings, "hidden", true);
        nextError = null;
      }
      nativeOwned = true;
      if (!nativeMode) data(nativeRoot, "rpCustomControls", "1");
      if (element) {
        if (element.controls) element.controls = false;
        attr(element, "playsinline", "");
        attr(element, "webkit-playsinline", "");
      }
      if (becameReady || lastPaused !== null && state.paused !== lastPaused) show();
      lastPaused = state.paused;
      const playDisabled = !state.ready && !state.initializable || locked;
      for (const node of [center, play]) prop(node, "disabled", playDisabled);
      for (const node of [mute, fullscreen, settingsButton, seek, ...rates.children]) prop(node, "disabled", !state.ready || locked);
      for (const node of [center, play]) {
        icon(node, state.paused ? "play" : "pause");
        attr(node, "aria-label", state.paused ? "Ph\xE1t" : "T\u1EA1m d\u1EEBng");
      }
      const muted = player.audio?.().muted ?? video.muted;
      icon(mute, muted ? "muted" : "volume");
      attr(mute, "aria-label", muted ? "B\u1EADt ti\u1EBFng" : "T\u1EAFt ti\u1EBFng");
      if (nativeMode) for (const node of root.querySelectorAll(".btn-muted")) {
        node.classList.toggle("fa-volume-mute", muted);
        node.classList.toggle("fa-volume-high", !muted);
        attr(node, "aria-label", muted ? "B\u1EADt ti\u1EBFng" : "T\u1EAFt ti\u1EBFng");
      }
      const full = inFullscreen();
      icon(fullscreen, full ? "shrink" : "fullscreen");
      attr(fullscreen, "aria-label", full ? "Thu nh\u1ECF" : "To\xE0n m\xE0n h\xECnh");
      icon(lock, locked ? "lock" : "unlock");
      attr(lock, "aria-label", locked ? "M\u1EDF kh\xF3a m\xE0n h\xECnh" : "Kh\xF3a m\xE0n h\xECnh");
      if (!scrubbing && (chromeVisible && !locked || state.paused)) {
        prop(seek, "max", String(Math.max(1, state.duration)));
        prop(seek, "value", String(state.time));
        paintTime(state.time, state.duration);
      }
      for (const node of rates.children) attr(node, "aria-pressed", Number(node.dataset.rpRate) === state.rate);
      const sp = skipPrefs.get(), fk = filmKeyFromContext(context), userMark = fk ? skipPrefs.getAdMark(fk) : null;
      attr(autoIntroBtn, "aria-pressed", sp.autoSkipIntro);
      prop(autoIntroBtn, "disabled", locked);
      attr(autoAdBtn, "aria-pressed", sp.autoSkipAd);
      prop(autoAdBtn, "disabled", locked);
      prop(markAdBtn, "disabled", !state.ready || locked);
      text(markAdBtn, pendingAdStart !== null ? "K\u1EBFt th\xFAc QC (t\u1EEB " + format(pendingAdStart) + ")" : userMark ? "\u0110\xE1nh d\u1EA5u l\u1EA1i QC (+" + userMark.duration + "s)" : "\u0110\xE1nh d\u1EA5u b\u1EAFt \u0111\u1EA7u QC");
      prop(clearMarkBtn, "hidden", pendingAdStart === null && !userMark);
      prop(clearMarkBtn, "disabled", locked);
      const hlsBreaks = state.ready && !state.ad ? readPlayerAdBreaks(player) : [];
      const hlsAd = hlsBreaks.find((b) => state.time >= b.start - 15 && state.time < b.end - 1) || null;
      const autoHlsAd = sp.autoSkipAd ? hlsBreaks.find((b) => state.time >= b.start - 3 && state.time < b.end) || null : null;
      const markAd = !hlsAd && state.ready && !state.ad && userMark && state.time >= userMark.start - 30 && state.time <= userMark.start + Math.max(30, userMark.duration) ? { ...userMark, source: "mark" } : null;
      activeAdTarget = hlsAd || markAd;
      const epKey = (context ? [context.url, context.episodeID, context.lane].join("|") : "") || player.fingerprint?.() || "current";
      if (state.ready && !state.ad && !state.paused && sp.autoSkipAd && autoHlsAd) {
        const adKey = epKey + "|" + Math.round(autoHlsAd.start);
        if (adKey !== lastAutoAdKey && command("seek", Math.min(autoHlsAd.end + 2, state.duration - 0.5))) {
          lastAutoAdKey = adKey;
          notify("\u0110\xE3 b\u1ECF qua qu\u1EA3ng c\xE1o (" + autoHlsAd.duration + "s)");
        }
      }
      const intro = state.ready && !state.ad && state.time < introEnd() - 5 && state.duration >= 600, nearEnd = state.ready && state.duration - state.time <= 180;
      const videoReady = video?.nodeType === 1 ? video.readyState >= 2 : !(video?.readyState < 2);
      if (intro && !state.paused && sp.autoSkipIntro && videoReady && autoIntroKey !== epKey) {
        options.onIntro?.();
        const target = Math.min(introEnd(), state.duration);
        const jumped = player.state().time >= introEnd() - 5 || command("seek", target);
        if (jumped) {
          autoIntroKey = epKey;
          notify("\u0110\xE3 b\u1ECF qua gi\u1EDBi thi\u1EC7u");
        }
      }
      const ctxMode = nextPending?.node === contextAction || nextError?.node === contextAction ? "next" : hlsAd ? "ad-hls" : markAd ? "ad-mark" : intro ? "intro" : "next";
      data(contextAction, "rpMode", ctxMode);
      const showCtx = !!(hlsAd || markAd || intro || nearEnd && context || nextPending?.node === contextAction || nextError?.node === contextAction);
      prop(contextAction, "hidden", !showCtx);
      data(line, "rpNextStatus", nextPending?.node === next || nextError?.node === next);
      for (const node of [contextAction, next]) {
        data(node, "rpStatus", nextPending?.node === node || nextError?.node === node);
        prop(node, "disabled", !state.ready || locked && node !== contextAction || !context && !(node === contextAction && (intro || hlsAd)) || !!nextPending);
        attr(node, "aria-busy", nextPending?.node === node);
        if (nextPending?.node === node) buttonText(node, "\u0110ang chuy\u1EC3n t\u1EADp\u2026");
        else if (nextError?.node === node) buttonText(node, nextError.text);
        else if (node === contextAction) {
          if (ctxMode === "ad-hls") content(node, "context:ad-hls", () => {
            node.innerHTML = "B\u1ECF qua qu\u1EA3ng c\xE1o " + playerIcon("forward");
          });
          else if (ctxMode === "ad-mark") content(node, "context:ad-mark:" + markAd.duration, () => {
            node.innerHTML = "B\u1ECF qua qu\u1EA3ng c\xE1o (+" + markAd.duration + "s) " + playerIcon("forward");
          });
          else content(node, "context:" + intro, () => {
            node.innerHTML = (intro ? "B\u1ECF qua gi\u1EDBi thi\u1EC7u" : "T\u1EADp ti\u1EBFp theo") + " " + playerIcon(intro ? "forward" : "next");
          });
        } else icon(node, "next");
      }
      applyChrome();
      if (options.autoPlay && options.canAutoPlay?.() !== false && context && !autoPlayAttempted && state.ready && video.readyState >= 3 && !doc.hidden) {
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
    if (locked) revealLock();
    return {
      shell,
      surface,
      update,
      syncLocked(value) {
        setLocked(!!value, false);
      },
      setContext(value) {
        const key = (c) => c ? [c.url, c.episodeID, c.lane, c.server].join("|") : "";
        const oldKey = key(context);
        context = value;
        if (oldKey && oldKey !== key(value)) {
          nextPending = null;
          nextError = null;
          pendingAdStart = null;
          lastAutoAdKey = "";
          win.clearTimeout(nextTimer);
          cancelGestures();
          settings.hidden = true;
          if (!inFullscreen()) setLocked(false);
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
        win.clearInterval(loadTimer);
        root.removeEventListener("click", nativeClick, true);
        root.removeEventListener("click", nativeVolume, true);
        root.removeEventListener("pointerup", nativeVolume, true);
        offGestures();
        offPlayer?.();
        nativeObserver.disconnect();
        for (const timer of [hideTimer, lockTimer, tipTimer, noticeTimer, errorTimer, nextErrorTimer, nextTimer, scrubTimer]) win.clearTimeout(timer);
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
    const stats = win.document.createElement("output");
    stats.className = "rp-loading-stats";
    stats.hidden = true;
    node.append(stats);
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
    return { node, fail, update(metrics) {
      stats.hidden = !validLoadMetrics(metrics);
      stats.textContent = loadMetricsText(metrics);
    }, dispose() {
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
    return { update(ready, metrics) {
      if (disposed) return;
      if (ready) {
        panel?.dispose();
        panel = null;
      } else {
        pending();
        panel?.update(metrics);
      }
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
      if (!isFrameURL(frame.src)) {
        const existing = records.get(frame);
        if (existing) {
          existing.panel?.dispose();
          existing.panel = null;
          existing.src = frame.src;
          existing.awaitingLoad = false;
        }
        delete frame.dataset.rpDisplay;
        return null;
      }
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
        if (!record.awaitingLoad && info.controlsReady === true && (info.state?.ready || info.state?.initializable === true) && !info.state.ad && info.context && info.media && record.src === frame.src) {
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
  function watchNavigation(win, { page, onChange = () => {
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
    async function navigate(value, { site = detectSite(doc, win.location.href, page), keepLane = false, isCurrent = () => true, pop = false } = {}) {
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
        if (nextSite.kind === "legacy-panels") {
          const livePanels = [...doc.querySelectorAll(".server-picker[data-panel]")];
          for (const srcPanel of parsed.querySelectorAll(".server-picker[data-panel]")) {
            const dstPanel = livePanels.find((p) => p.dataset.panel === srcPanel.dataset.panel);
            if (!dstPanel) continue;
            const dstButtons = [...dstPanel.querySelectorAll("[data-server]")];
            for (const srcBtn of srcPanel.querySelectorAll("[data-server]")) {
              const dstBtn = dstButtons.find((n) => n.dataset.server === srcBtn.dataset.server);
              if (!dstBtn) continue;
              if (srcBtn.dataset.value && isFrameURL(srcBtn.dataset.value)) dstBtn.dataset.value = srcBtn.dataset.value;
              const srcHref = safeURL(srcBtn.getAttribute("href"), target.href);
              if (srcHref?.origin === target.origin && srcHref.pathname.startsWith("/xem-phim/")) dstBtn.setAttribute("href", srcHref.pathname + srcHref.search);
            }
          }
        }
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
      if (!link || link.closest("[data-rp-ui],.server-picker") || link.hasAttribute("data-server") || link.target && link.target !== "_self" || link.hasAttribute("download")) return;
      const site = detectSite(doc, win.location.href, page), context = readContext(site, doc), url = safeURL(link.href);
      if (!context || url?.origin !== win.location.origin || !url.pathname.startsWith("/xem-phim/")) return;
      if (site.kind === "legacy-panels" && (link.classList.contains("chaptertm") && context.lane !== "tm" || link.classList.contains("chaptervs") && context.lane !== "vs")) return;
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
      const site = detectSite(doc, win.location.href, page), origin = safeURL(site?.frame?.src)?.origin;
      if (!site || !isFrameURL(site?.frame?.src) || event.origin !== origin || event.source !== site.frame.contentWindow) return;
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
      const previousSite = detectSite(doc, previousURL.href, page), current = readContext(previousSite, doc);
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

  // rophim/gestures/entry.js
  if (window.parent !== window && isFrameURL(window.location.href)) observeHlsOwners(typeof unsafeWindow === "undefined" ? window : unsafeWindow);
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
    let mounted = null, site = null, context = null, bridge = null, frameFullscreen = false, lastSyncedLocked = false, endedKey = "";
    const releaseStartup = win.parent !== win && isFrameURL(win.location.href) ? playerStartupGuard(win) : () => {
    };
    const childGate = win.parent !== win && isFrameURL(win.location.href) ? childLoading(win) : null;
    const controlsReady = () => !!context && !!mounted?.ui.shell.isConnected && !mounted.ui.shell.hidden && (mounted.player.state().ready || mounted.player.state().initializable === true) && !mounted.player.state().ad;
    const navigation = win.parent === win ? watchNavigation(win, { page, onChange: () => bridge?.refresh(), ownsPlayer: () => bridge?.state()?.ready && !bridge.state().ad }) : null;
    const unbind = () => {
      mounted?.ui.dispose();
      mounted = null;
      lastSyncedLocked = false;
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
          for (const p of ["/", "/xem-phim"]) {
            win.document.cookie = `selectedServerRophim=${encodeURIComponent(selectedContext.server)}; path=${p}; SameSite=Lax`;
            win.document.cookie = `selectedVidTypeRophim=${selectedContext.lane}; path=${p}; SameSite=Lax`;
          }
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
          if (info.player) {
            lastSyncedLocked = info.locked === true;
            mounted = { player: info.player, ui: customPlayerControls(win, info.player, { autoPlay: true, initialLocked: lastSyncedLocked, onLockChange: (value) => {
              lastSyncedLocked = value;
              bridge?.setLocked?.(value);
            }, isFullscreen: () => frameFullscreen, onNext: () => bridge?.request("next") ?? false, onFullscreen: () => {
              const pending = bridge?.request("fullscreen");
              return pending && pending.then((status) => {
                if (status === "fullscreen" || status === "windowed") {
                  frameFullscreen = status === "fullscreen";
                  if (!frameFullscreen) lastSyncedLocked = false;
                  mounted?.ui.update();
                }
                return status;
              });
            } }) };
          }
        } else if (mounted && info.locked !== lastSyncedLocked) {
          lastSyncedLocked = info.locked === true;
          mounted.ui.syncLocked?.(lastSyncedLocked);
        }
        mounted?.ui.setContext(context);
        childGate?.update(controlsReady(), info.state?.load);
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
  runFamily(window, { family: "rophim", feature: "gestures", isSiteURL: isSiteOrigin, isFrameURL, isFrameOrigin }, () => startGestures(window, typeof unsafeWindow === "undefined" ? window : unsafeWindow));
})();
