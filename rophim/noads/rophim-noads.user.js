// ==UserScript==
// @name         RoPhim — Chặn quảng cáo
// @namespace    rophim-userscripts.local
// @version      0.4.22
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
  var exposeTo = (fn, target) => {
    try {
      return typeof exportFunction === "function" ? exportFunction(fn, target) : fn;
    } catch {
      return fn;
    }
  };
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
      const api = container.wrappedJSObject?.swiper || container.swiper;
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
  function withoutAdvertising(config, page) {
    const raw = config?.wrappedJSObject || config, ObjectAPI = page?.Object || Object;
    if (!raw || typeof raw !== "object" || !ObjectAPI.hasOwn(raw, "advertising")) return config;
    const next = page?.Object ? page.Object.assign(new page.Object(), raw) : { ...raw };
    delete next.advertising;
    return next;
  }
  function installJWHook(page) {
    const hooked = /* @__PURE__ */ new WeakSet(), functions = /* @__PURE__ */ new WeakMap();
    const wrap = (fn) => {
      const rawFn = fn?.wrappedJSObject || fn;
      if (typeof rawFn !== "function") return fn;
      if (functions.has(rawFn)) return functions.get(rawFn);
      const handler = page?.Object ? new page.Object() : {};
      handler.apply = exposeTo((target, thisArg, args) => {
        const instance = Reflect.apply(target, thisArg, args);
        const rawInstance = instance?.wrappedJSObject || instance;
        if (rawInstance && typeof rawInstance.setup === "function" && !hooked.has(rawInstance)) {
          const setup = rawInstance.setup;
          try {
            rawInstance.setup = exposeTo(function(config, ...rest) {
              return Reflect.apply(setup, this?.wrappedJSObject || this, [withoutAdvertising(config, page), ...rest]);
            }, page);
            hooked.add(rawInstance);
          } catch {
          }
        }
        return instance;
      }, page);
      const P = page?.Proxy || Proxy;
      const proxy = new P(rawFn, handler);
      functions.set(rawFn, proxy);
      functions.set(proxy, proxy);
      return proxy;
    };
    try {
      const descriptor = Object.getOwnPropertyDescriptor(page, "jwplayer");
      if (descriptor && (!descriptor.configurable || descriptor.get || descriptor.set)) return false;
      let current = wrap(page.jwplayer);
      Object.defineProperty(page, "jwplayer", { configurable: true, enumerable: descriptor?.enumerable ?? true, get: exposeTo(() => current, page), set: exposeTo((value) => {
        current = wrap(value);
      }, page) });
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
      proto.click = exposeTo(function(...args) {
        const url = safeURL(this.href, page.location.href);
        if (this.relList?.contains("sponsored") && this.target === "_blank" && url && url.origin !== page.location.origin) return;
        return Reflect.apply(original, this, args);
      }, page);
      return true;
    } catch {
      return false;
    }
  }
  function startAds(win, page) {
    const top = win.parent === win;
    if (top ? !isSiteOrigin(win.location.origin) : !isFrameURL(win.location.href)) return;
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

  // shared/navigation/guard.js
  function navigationKind(value, base) {
    try {
      const url = new URL(value, base);
      if (["http:", "https:"].includes(url.protocol)) return url.origin === new URL(base).origin ? "internal" : "external";
      if (["mailto:", "tel:"].includes(url.protocol)) return "external";
    } catch {
    }
    return "blocked";
  }
  function confirmExternal(win, url, trusted, confirm = (message) => win.confirm(message)) {
    if (!trusted || win.parent !== win || navigationKind(url, win.location.href) !== "external") return false;
    try {
      return confirm("M\u1EDF li\xEAn k\u1EBFt b\xEAn ngo\xE0i?\n" + String(url).slice(0, 300)) === true;
    } catch {
      return false;
    }
  }
  function protectMediaFrame(frame) {
    const doc = frame?.ownerDocument, base = doc?.location?.href;
    if (!base || frame.tagName !== "IFRAME") return false;
    let url;
    try {
      url = new URL(frame.getAttribute("src"), base);
    } catch {
      return false;
    }
    if (!["http:", "https:"].includes(url.protocol) || url.origin === doc.location.origin) return false;
    const had = frame.hasAttribute("sandbox");
    const tokens = had ? (frame.getAttribute("sandbox") || "").split(/\s+/).filter(Boolean) : ["allow-scripts", "allow-same-origin", "allow-forms", "allow-presentation", "allow-orientation-lock"];
    const forbidden = /* @__PURE__ */ new Set(["allow-popups", "allow-popups-to-escape-sandbox", "allow-top-navigation", "allow-top-navigation-by-user-activation", "allow-top-navigation-to-custom-protocols"]);
    const sandbox = tokens.filter((t) => !forbidden.has(t.toLowerCase())).join(" ");
    if (frame.getAttribute("sandbox") !== sandbox) frame.setAttribute("sandbox", sandbox);
    return true;
  }
  function isNewWindowTarget(target) {
    const normalized = String(target || "").trim().toLowerCase();
    return !!normalized && !["_self", "_parent", "_top"].includes(normalized);
  }
  function isBlankFrame(frame) {
    if (!frame || frame.tagName !== "IFRAME") return false;
    if (frame.hasAttribute("srcdoc")) return true;
    if (!frame.hasAttribute("src")) return true;
    const raw = (frame.getAttribute("src") || "").trim();
    return !raw || /^about:blank(?:[?#]|$)/i.test(raw);
  }
  function installNavigationGuard(win, page = win, { isMediaFrame = () => false } = {}) {
    const doc = win.document;
    const originalOpen = page.open, originalConfirm = page.confirm;
    let disposed = false, approved = null;
    const restores = [];
    const exposeTo2 = (fn, target = page) => {
      try {
        return typeof exportFunction === "function" ? exportFunction(fn, target) : fn;
      } catch {
        return fn;
      }
    };
    const open = () => null;
    const exposedOpen = exposeTo2(open, page);
    let openDescriptor;
    try {
      openDescriptor = Object.getOwnPropertyDescriptor(page, "open");
      Object.defineProperty(page, "open", { configurable: true, enumerable: openDescriptor?.enumerable ?? true, get: exposeTo2(() => exposedOpen, page), set: exposeTo2(() => {
      }, page) });
    } catch {
    }
    const stop = (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const allowed = (url, trusted) => confirmExternal(win, url, trusted, (message) => Reflect.apply(originalConfirm, page, [message]));
    const resolveBase = (targetWin) => {
      try {
        const href = targetWin?.location?.href;
        if (href && /^https?:/i.test(href)) return href;
      } catch {
      }
      return win.location.href;
    };
    const baseTargetOf = (node) => {
      try {
        return node?.ownerDocument?.querySelector?.("base[target]")?.getAttribute?.("target") || "";
      } catch {
        return "";
      }
    };
    function shouldBlockProgrammaticAnchor(anchor, targetWin) {
      const target = anchor?.getAttribute?.("target") || anchor?.target || "" || baseTargetOf(anchor);
      if (isNewWindowTarget(target)) return true;
      const hasHref = anchor?.hasAttribute ? anchor.hasAttribute("href") : Boolean(anchor?.href);
      if (!hasHref) return false;
      const raw = anchor?.getAttribute ? anchor.getAttribute("href") || "" : anchor?.href || "";
      const trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith("#")) return false;
      if (/^\s*javascript:/i.test(raw)) return false;
      if (/^about:/i.test(trimmed)) return true;
      const baseHref = resolveBase(targetWin);
      const docBase = anchor?.baseURI && /^https?:/i.test(anchor.baseURI) ? anchor.baseURI : baseHref;
      let url;
      try {
        url = new URL(raw, docBase);
      } catch {
        return true;
      }
      return navigationKind(url.href, baseHref) !== "internal";
    }
    function shouldBlockForm(form, submitter, targetWin, trusted = false) {
      const baseHref = resolveBase(targetWin);
      const subTarget = submitter?.getAttribute?.("formtarget") || (typeof submitter?.formTarget === "string" ? submitter.formTarget : "");
      const formTarget = form?.getAttribute ? form.getAttribute("target") || "" : typeof form?.target === "string" ? form.target : "";
      const target = subTarget || formTarget || baseTargetOf(form);
      if (!trusted && isNewWindowTarget(target)) return true;
      const rawAction = submitter?.getAttribute?.("formaction") || (form?.getAttribute ? form.getAttribute("action") : form?.action) || "";
      const trimmed = rawAction.trim();
      if (!trimmed) {
        const ownHref = form?.ownerDocument?.location?.href || targetWin?.location?.href || "";
        return navigationKind(ownHref, baseHref) !== "internal";
      }
      if (/^about:/i.test(trimmed)) return true;
      const docBase = form?.baseURI && /^https?:/i.test(form.baseURI) ? form.baseURI : baseHref;
      let url;
      try {
        url = new URL(trimmed, docBase);
      } catch {
        return true;
      }
      return navigationKind(url.href, baseHref) !== "internal";
    }
    function handleClick(event, targetWin, allowConfirm) {
      if (disposed) return;
      if (event.type === "auxclick" && event.button !== 1) return;
      const anchor = event.composedPath?.().find((node) => node?.matches?.("a[href],area[href]")) || event.target?.closest?.("a[href],area[href]");
      if (!anchor) return;
      const raw = anchor.getAttribute("href") || "";
      const effectiveTarget = anchor.target || baseTargetOf(anchor);
      if (/^\s*javascript:/i.test(raw)) {
        if (!event.isTrusted && isNewWindowTarget(effectiveTarget)) {
          stop(event);
          return;
        }
        event.preventDefault();
        return;
      }
      const baseHref = resolveBase(targetWin);
      const docBase = anchor.baseURI && /^https?:/i.test(anchor.baseURI) ? anchor.baseURI : baseHref;
      let url;
      try {
        url = new URL(raw, docBase);
      } catch {
        stop(event);
        return;
      }
      if (navigationKind(url.href, baseHref) === "internal") {
        if (!event.isTrusted && isNewWindowTarget(effectiveTarget)) stop(event);
        return;
      }
      stop(event);
      if (!allowConfirm || !allowed(url.href, event.isTrusted)) return;
      approved = url.href;
      try {
        if (event.type === "auxclick" || effectiveTarget && effectiveTarget.toLowerCase() !== "_self") Reflect.apply(originalOpen, page, [url.href, "_blank", "noopener,noreferrer"]);
        else page.location.assign(url.href);
      } finally {
        approved = null;
      }
    }
    function patchMethod(targetWin, proto, key, makeWrapper, trackRestore) {
      if (!proto) return;
      let orig, ownDesc;
      try {
        orig = proto[key];
        ownDesc = Object.getOwnPropertyDescriptor(proto, key);
      } catch {
        return;
      }
      if (typeof orig !== "function") return;
      if (ownDesc && !ownDesc.configurable && !ownDesc.writable) return;
      const wrapped = exposeTo2(makeWrapper(orig), targetWin);
      try {
        if (!ownDesc || ownDesc.configurable) {
          Object.defineProperty(proto, key, { configurable: true, enumerable: ownDesc ? ownDesc.enumerable : false, writable: true, value: wrapped });
        } else {
          proto[key] = wrapped;
        }
        if (trackRestore) {
          restores.push(() => {
            try {
              if (proto[key] !== wrapped) return;
              if (ownDesc) Object.defineProperty(proto, key, ownDesc);
              else delete proto[key];
            } catch {
            }
          });
        }
      } catch {
      }
    }
    const guardedOpens = /* @__PURE__ */ new WeakSet();
    const guardedProtos = /* @__PURE__ */ new WeakSet();
    const guardedDocs = /* @__PURE__ */ new WeakSet();
    function installProtoGuards(targetWin, trackRestore) {
      const htmlElemProto = targetWin.HTMLElement?.prototype;
      const anchorProto = targetWin.HTMLAnchorElement?.prototype;
      const areaProto = targetWin.HTMLAreaElement?.prototype;
      const formProto = targetWin.HTMLFormElement?.prototype;
      const makeClick = (orig) => function(...args) {
        const anchor = !disposed && (this?.tagName === "A" || this?.tagName === "AREA" ? this : this?.closest?.("a,area"));
        if (anchor && shouldBlockProgrammaticAnchor(anchor, targetWin)) return;
        return Reflect.apply(orig, this, args);
      };
      if (htmlElemProto && typeof htmlElemProto.click === "function") {
        patchMethod(targetWin, htmlElemProto, "click", makeClick, trackRestore);
        if (anchorProto && Object.prototype.hasOwnProperty.call(anchorProto, "click")) {
          patchMethod(targetWin, anchorProto, "click", makeClick, trackRestore);
        }
      } else if (anchorProto) {
        patchMethod(targetWin, anchorProto, "click", makeClick, trackRestore);
      }
      const makeAnchorDispatch = (orig) => function(...args) {
        const event = args[0];
        if (!disposed && (event?.type === "click" || event?.type === "auxclick")) {
          const anchor = this?.tagName === "A" || this?.tagName === "AREA" ? this : this?.closest?.("a,area");
          if (anchor && shouldBlockProgrammaticAnchor(anchor, targetWin)) return false;
        }
        return Reflect.apply(orig, this, args);
      };
      patchMethod(targetWin, htmlElemProto, "dispatchEvent", makeAnchorDispatch, trackRestore);
      patchMethod(targetWin, anchorProto, "dispatchEvent", makeAnchorDispatch, trackRestore);
      patchMethod(targetWin, areaProto, "dispatchEvent", makeAnchorDispatch, trackRestore);
      patchMethod(targetWin, formProto, "submit", (orig) => function(...args) {
        if (!disposed && shouldBlockForm(this, null, targetWin, false)) return;
        return Reflect.apply(orig, this, args);
      }, trackRestore);
      patchMethod(targetWin, formProto, "requestSubmit", (orig) => function(...args) {
        if (!disposed && shouldBlockForm(this, args[0], targetWin, false)) return;
        return Reflect.apply(orig, this, args);
      }, trackRestore);
      patchMethod(targetWin, formProto, "dispatchEvent", (orig) => function(...args) {
        const event = args[0];
        if (!disposed && event?.type === "submit" && shouldBlockForm(this, event?.submitter, targetWin, false)) return false;
        return Reflect.apply(orig, this, args);
      }, trackRestore);
      const collectBlankFrames = (node, out) => {
        if (disposed || !node || node.nodeType !== 1 && node.nodeType !== 11) return;
        if (isBlankFrame(node)) {
          out.push(node);
          return;
        }
        if (node.tagName === "IFRAME" || !node.firstElementChild) return;
        if (typeof node.querySelectorAll === "function") {
          for (const frame of node.querySelectorAll("iframe")) if (isBlankFrame(frame)) out.push(frame);
        }
      };
      const guardFrames = (frames) => {
        for (const frame of frames) {
          if (frame.isConnected && isBlankFrame(frame)) try {
            const child = frame.contentWindow;
            if (child) guardChildWindow(child);
          } catch {
          }
        }
      };
      const nodeProto = targetWin.Node?.prototype, elemProto = targetWin.Element?.prototype;
      for (const key of ["appendChild", "insertBefore"]) {
        patchMethod(targetWin, nodeProto, key, (orig) => function(...args) {
          const frames = [];
          if (!disposed && args[0]) collectBlankFrames(args[0], frames);
          const res = Reflect.apply(orig, this, args);
          if (!disposed && frames.length) guardFrames(frames);
          return res;
        }, trackRestore);
      }
      for (const key of ["append", "prepend", "before", "after", "replaceWith", "replaceChildren"]) {
        patchMethod(targetWin, elemProto, key, (orig) => function(...args) {
          const frames = [];
          if (!disposed) {
            for (const arg of args) if (arg && typeof arg === "object") collectBlankFrames(arg, frames);
          }
          const res = Reflect.apply(orig, this, args);
          if (!disposed && frames.length) guardFrames(frames);
          return res;
        }, trackRestore);
      }
      patchMethod(targetWin, elemProto, "insertAdjacentElement", (orig) => function(...args) {
        const frames = [];
        if (!disposed && args[1]) collectBlankFrames(args[1], frames);
        const res = Reflect.apply(orig, this, args);
        if (!disposed && frames.length) guardFrames(frames);
        return res;
      }, trackRestore);
      const iframeProto = targetWin.HTMLIFrameElement?.prototype;
      if (iframeProto) {
        for (const prop of ["contentWindow", "contentDocument"]) {
          let desc;
          try {
            desc = Object.getOwnPropertyDescriptor(iframeProto, prop);
          } catch {
            continue;
          }
          if (!desc || typeof desc.get !== "function" || !desc.configurable) continue;
          const origGet = desc.get;
          const wrappedGet = exposeTo2(function() {
            const val = Reflect.apply(origGet, this, []);
            if (!disposed && val) {
              const child = prop === "contentDocument" ? val.defaultView : val;
              if (child) guardChildWindow(child);
            }
            return val;
          }, targetWin);
          try {
            Object.defineProperty(iframeProto, prop, { configurable: true, enumerable: desc.enumerable, get: wrappedGet, set: desc.set });
            if (trackRestore) {
              restores.push(() => {
                try {
                  if (Object.getOwnPropertyDescriptor(iframeProto, prop)?.get === wrappedGet) Object.defineProperty(iframeProto, prop, desc);
                } catch {
                }
              });
            }
          } catch {
          }
        }
      }
    }
    function guardChildWindow(candidate) {
      if (disposed || !candidate) return;
      let raw;
      try {
        raw = candidate.wrappedJSObject || candidate;
      } catch {
        raw = candidate;
      }
      if (!raw || raw === win || raw === page) return;
      let currentOpen, childDoc, protoKey;
      try {
        childDoc = raw.document;
        void raw.location.href;
        currentOpen = raw.open;
        protoKey = raw.HTMLElement?.prototype || raw.HTMLAnchorElement?.prototype || raw.Window;
      } catch {
        return;
      }
      if (!currentOpen || !guardedOpens.has(currentOpen)) {
        const origChildOpen = currentOpen;
        const childOpen = exposeTo2((...args) => {
          if (disposed && typeof origChildOpen === "function") return Reflect.apply(origChildOpen, raw, args);
          return null;
        }, raw);
        guardedOpens.add(childOpen);
        try {
          const desc = Object.getOwnPropertyDescriptor(raw, "open");
          Object.defineProperty(raw, "open", { configurable: true, enumerable: desc?.enumerable ?? true, get: exposeTo2(() => childOpen, raw), set: exposeTo2(() => {
          }, raw) });
        } catch {
        }
      }
      if (protoKey && !guardedProtos.has(protoKey)) {
        guardedProtos.add(protoKey);
        installProtoGuards(raw, false);
      }
      if (childDoc && !guardedDocs.has(childDoc)) {
        guardedDocs.add(childDoc);
        const childClick = exposeTo2((event) => handleClick(event, raw, false), raw);
        const childSubmit = exposeTo2((event) => {
          if (!disposed && shouldBlockForm(event.target, event.submitter, raw, false)) stop(event);
        }, raw);
        try {
          raw.addEventListener("click", childClick, true);
          raw.addEventListener("auxclick", childClick, true);
          raw.addEventListener("submit", childSubmit, true);
        } catch {
        }
      }
    }
    const click = (event) => handleClick(event, win, true);
    const submit = (event) => {
      if (!disposed && shouldBlockForm(event.target, event.submitter, win, event.isTrusted)) stop(event);
    };
    win.addEventListener("click", click, true);
    win.addEventListener("auxclick", click, true);
    win.addEventListener("submit", submit, true);
    installProtoGuards(page, true);
    const navigate = (event) => {
      if (event.navigationType === "traverse" || !event.cancelable || !event.destination?.url) return;
      const url = event.destination.url;
      if (url === approved || navigationKind(url, win.location.href) === "internal") return;
      event.preventDefault();
    };
    page.navigation?.addEventListener?.("navigate", navigate);
    const scan = () => {
      if (disposed) return;
      for (const frame of doc.querySelectorAll("iframe")) {
        if (isBlankFrame(frame)) {
          try {
            const child = frame.contentWindow;
            if (child) guardChildWindow(child);
          } catch {
          }
          continue;
        }
        if (frame.hasAttribute("src")) {
          try {
            if (isMediaFrame(frame)) protectMediaFrame(frame);
          } catch {
          }
        }
      }
    };
    const observer = new win.MutationObserver(scan);
    observer.observe(doc, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "srcdoc", "sandbox"] });
    scan();
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      win.removeEventListener("click", click, true);
      win.removeEventListener("auxclick", click, true);
      win.removeEventListener("submit", submit, true);
      page.navigation?.removeEventListener?.("navigate", navigate);
      try {
        if (page.open === exposedOpen) {
          if (openDescriptor) Object.defineProperty(page, "open", openDescriptor);
          else {
            delete page.open;
            page.open = originalOpen;
          }
        }
      } catch {
      }
      while (restores.length) restores.pop()();
    };
    win.addEventListener("pagehide", (event) => {
      if (!event.persisted) dispose();
    });
    return { dispose };
  }

  // rophim/noads/entry.js
  runFamily(window, { family: "rophim", feature: "noads", isSiteURL: isSiteOrigin, isFrameURL, isFrameOrigin }, () => {
    const page = typeof unsafeWindow === "undefined" ? window : unsafeWindow;
    installNavigationGuard(window, page, { isMediaFrame: (frame) => isFrameURL(frame.src) });
    startAds(window, page);
  });
})();
