// ==UserScript==
// @name         RoPhim — Chặn quảng cáo
// @namespace    rophim-userscripts.local
// @version      0.4.7
// @author       zic
// @description  Chặn quảng cáo cho trang xem RoPhim.
// @homepageURL  https://github.com/nhattruong16062003/media-userscripts/tree/main/rophim
// @supportURL   https://github.com/nhattruong16062003/media-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/refs/heads/main/rophim/noads/rophim-noads.user.js
// @updateURL    https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/refs/heads/main/rophim/noads/rophim-noads.user.js
// @include      /^https:\/\/(?:[a-z0-9-]+\.)*[a-z0-9-]*rophim[a-z0-9-]*(?:\.[a-z0-9-]+)+(?::\d+)?\//
// @match        https://player.phimapi.com/player/*
// @match        https://api.clubc.org/embed/*
// @match        https://api.rophim10.ink/embed/*
// @match        https://dora.nobitayeuxuka.xyz/temp*
// @run-at       document-start
// @grant        unsafeWindow
// ==/UserScript==

(() => {
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

  // rophim/lib/advertising-slots.js
  function sponsorDirectories(doc) {
    return [...doc.querySelectorAll(".topics-list.topics-grid")].filter((node) => {
      const headings = [...node.querySelectorAll(".heading-sm,.heading-md,h2,h3")];
      const named = headings.some((heading) => /nhà\s+(?:cái|tài\s+trợ)\s+uy\s+tín/i.test(heading.textContent || ""));
      return named && !!node.querySelector(".row-topic.adserver,.row-topic-ad,ins[data-revive-id]") && !node.querySelector("video,audio,iframe#embed-player,iframe#player,.server-picker,form,a.row-topic:not(.adserver):not(.row-topic-ad)");
    });
  }

  // rophim/lib/ads.js
  var AD_RULES = [
    { id: "revive-zone", selector: "ins[data-revive-id][data-z]", proof: () => true },
    { id: "revive-wrapper", selector: ".adserver,.catfish-bottom,.banner-bottom-double", proof: (n) => !!n.querySelector('ins[data-revive-id],a[rel~="sponsored"]') },
    { id: "component-banner", selector: ".sspp-area,.is-catfish,.top-middle-banner-offset,.ads-banner,.sspp-modal", proof: (n) => !!n.querySelector('a[rel~="sponsored"],img') },
    { id: "legacy-sponsored-overlay", selector: "#overlay.heroup1", proof: (n) => !!n.querySelector('a[rel~="sponsored"]') },
    { id: "legacy-footer", selector: "#footer_fixed_heroes,.hero-sticky-footer-wrapper", proof: (n) => !!n.querySelector('a[rel~="sponsored"]') },
    { id: "sponsor-card", selector: ".row-topic.adserver", proof: (n) => !!n.querySelector('ins[data-revive-id][data-z],a[rel~="sponsored"]') },
    { id: "sponsor-directory", selector: ".topics-list.topics-grid", proof: (n) => sponsorDirectories(n.ownerDocument).includes(n) }
  ];
  function filterAdCarousel(doc) {
    const changed = /* @__PURE__ */ new Set();
    for (const node of doc.querySelectorAll("#top_slider .top-slide-main .swiper-slide,#top_slider .top-slide-small .swiper-slide")) {
      if (!node.querySelector("ins[data-revive-id][data-z]") || node.querySelector("video,audio,iframe#embed-player,iframe#player,form")) continue;
      if (node.dataset.rpAdRule !== "sponsored-hero-slide") {
        node.style.setProperty("display", "none", "important");
        node.setAttribute("aria-hidden", "true");
        node.dataset.rpAdRule = "sponsored-hero-slide";
        changed.add(node.closest(".swiper"));
      }
    }
    for (const container of doc.querySelectorAll("#top_slider .top-slide-main,#top_slider .top-slide-small")) {
      const api = container.swiper;
      if (!api || api.destroyed) continue;
      try {
        if (changed.has(container)) api.update?.();
        const slides = [...container.querySelectorAll(".swiper-wrapper > .swiper-slide")], active = slides[api.activeIndex];
        if (active?.dataset.rpAdRule === "sponsored-hero-slide") {
          const index = slides.findIndex((n) => n.dataset.rpAdRule !== "sponsored-hero-slide");
          if (index >= 0) api.slideTo?.(index, 0, false);
        }
      } catch {
      }
    }
    return changed.size > 0;
  }
  function containsPlayback(node) {
    const selector = "video,audio,iframe#embed-player,iframe#player,.player-ratio,.art-video-player,.jwplayer,.server-picker,.btn-episode,form,input,textarea";
    if (node.matches(selector) || node.querySelector(selector)) return true;
    for (const frame of node.querySelectorAll("iframe[src]")) if (FRAME_ORIGINS.has(safeURL(frame.src)?.origin)) return true;
    return [...node.querySelectorAll("a[href]")].some((a) => safeURL(a.href)?.pathname.startsWith("/xem-phim/"));
  }
  function applyAdRules(doc) {
    const applied = /* @__PURE__ */ new Set();
    if (filterAdCarousel(doc)) applied.add("sponsored-hero-slide");
    for (const rule of AD_RULES) {
      for (const node of doc.querySelectorAll(rule.selector)) {
        if (!rule.proof(node) || containsPlayback(node)) continue;
        if (node.style.getPropertyValue("display") !== "none" || node.style.getPropertyPriority("display") !== "important") node.style.setProperty("display", "none", "important");
        if (node.getAttribute("aria-hidden") !== "true") node.setAttribute("aria-hidden", "true");
        if (node.dataset.rpAdRule !== rule.id) node.dataset.rpAdRule = rule.id;
        applied.add(rule.id);
      }
    }
    return [...applied];
  }
  function withoutAdvertising(config) {
    if (!config || typeof config !== "object" || !Object.hasOwn(config, "advertising")) return config;
    const next = { ...config };
    delete next.advertising;
    return next;
  }
  function installJWHook(page) {
    const hooked = /* @__PURE__ */ new WeakSet(), functions = /* @__PURE__ */ new WeakMap();
    const wrap = (fn) => {
      if (typeof fn !== "function") return fn;
      if (functions.has(fn)) return functions.get(fn);
      const proxy = new Proxy(fn, { apply(target, thisArg, args) {
        const instance = Reflect.apply(target, thisArg, args);
        if (instance && typeof instance.setup === "function" && !hooked.has(instance)) {
          const setup = instance.setup;
          try {
            instance.setup = function(config, ...rest) {
              return Reflect.apply(setup, this, [withoutAdvertising(config), ...rest]);
            };
            hooked.add(instance);
          } catch {
          }
        }
        return instance;
      } });
      functions.set(fn, proxy);
      functions.set(proxy, proxy);
      return proxy;
    };
    try {
      const descriptor = Object.getOwnPropertyDescriptor(page, "jwplayer");
      if (descriptor && (!descriptor.configurable || descriptor.get || descriptor.set)) return false;
      let current = wrap(page.jwplayer);
      Object.defineProperty(page, "jwplayer", { configurable: true, enumerable: descriptor?.enumerable ?? true, get: () => current, set: (value) => {
        current = wrap(value);
      } });
      return true;
    } catch {
      return false;
    }
  }
  function blockSyntheticSponsored(page) {
    const proto = page.HTMLAnchorElement?.prototype;
    if (!proto || typeof proto.click !== "function") return false;
    const original = proto.click;
    try {
      proto.click = function(...args) {
        const url = safeURL(this.href, page.location.href);
        if (this.relList?.contains("sponsored") && this.target === "_blank" && url && url.origin !== page.location.origin) return;
        return Reflect.apply(original, this, args);
      };
      return true;
    } catch {
      return false;
    }
  }
  function startAds(win, page) {
    const top = win.parent === win;
    if (top ? !isSiteOrigin(win.location.origin) : !FRAME_ORIGINS.has(win.location.origin)) return;
    const kill = () => {
      try {
        win.sessionStorage.setItem("rophim-hide-all-ads", "1");
        page.dispatchEvent(new page.Event("rophim-hide-all-ads"));
      } catch {
      }
    };
    if (top) {
      kill();
      blockSyntheticSponsored(page);
    }
    const jwHook = installJWHook(page);
    const scan = () => {
      if (top) kill();
      const rules = applyAdRules(win.document);
      diagnostic(win.document, "noads", [...rules, jwHook ? "jw-config-hook" : "jw-hook-unavailable"].join(",") || "unknown-preserved");
    };
    const off = watchDOM(win, scan);
    win.addEventListener("DOMContentLoaded", scan, { once: true });
    scan();
    win.addEventListener("pagehide", (event) => {
      if (!event.persisted) off();
    });
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

  // rophim/noads/entry.js
  runFamily(window, { family: "rophim", feature: "noads", isSiteURL: isSiteOrigin, isFrameURL, isFrameOrigin: (value) => FRAME_ORIGINS.has(safeURL(value)?.origin) }, () => startAds(window, typeof unsafeWindow === "undefined" ? window : unsafeWindow));
})();
