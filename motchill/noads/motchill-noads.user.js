// ==UserScript==
// @name         Motchill - chặn quảng cáo + tối ưu mạng
// @namespace    motchill-noads
// @version      6.0.22
// @author       zic
// @homepageURL  https://github.com/nhattruong16062003/media-userscripts/tree/main/motchill
// @updateURL    https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/refs/heads/main/motchill/noads/motchill-noads.user.js
// @downloadURL  https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/refs/heads/main/motchill/noads/motchill-noads.user.js
// @description  Chặn quảng cáo trên Motchill (mọi tên miền, cả bản WordPress lẫn bản Next.js) và tắt chia sẻ P2P để phim chỉ tải từ máy chủ.
// @match        https://motchillsa.com/*
// @match        https://motchilltu.com/*
// @match        https://motchilln.fm/*
// @match        https://motchillt.app/*
// @match        https://fcloud.live/cinema/*
// @match        https://player.phimapi.com/player/*
// @match        https://maztoycdn.xyz/watch/*
// @match        https://player.cbplay.cc/embed/*
// @match        https://player.cloudbeta.win/embed/*
// @match        https://cdn.loadvid.com/videos/play/*
// @match        https://embed13.streamc.xyz/*
// @match        https://embed1.streamc.xyz/embed.php*
// @match        https://embed12.streamc.xyz/embed.php*
// @match        https://embed2.streamc.xyz/embed.php*
// @match        https://embed11.streamc.xyz/embed.php*
// @match        https://embed10.streamc.xyz/embed.php*
// @match        https://embed14.streamc.xyz/embed.php*
// @match        https://embed15.streamc.xyz/embed.php*
// @match        https://embed18.streamc.xyz/embed.php*
// @match        https://v2.streamvsmov.com/video/*
// @match        https://v3.streamvsmov.com/video/*
// @match        https://v4.streamvsmov.com/video/*
// @match        https://v6.streamvsmov.com/video/*
// @match        https://v8.streamvsmov.com/video/*
// @match        https://v9.streamvsmov.com/video/*
// @match        https://v10.streamvsmov.com/video/*
// @match        https://v11.streamvsmov.com/video/*
// @match        https://v12.streamvsmov.com/video/*
// @match        https://v14.streamvsmov.com/video/*
// @match        https://v15.streamvsmov.com/video/*
// @include      /^https?:\/\/[^\/?#]*motchill[^\/?#]*\//
// @match        https://api.clubc.live/embed/*
// @run-at       document-start
// @inject-into  page
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
    const tag = "media-userscripts-owner-v1";
    let active = false, disposed = false, timer = 0, blankTimer = 0, blankTicks = 0;
    const challenge = Array.from(win.crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(16).padStart(8, "0")).join("");
    const allowed = (value) => {
      try {
        return !!(isSiteURL(value) || isFrameURL(value));
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
      else if (win.parent !== win && isFrameURL(href) && !timer) {
        timer = win.setInterval(ask, 1e3);
        ask();
      }
    };
    const receive = (event) => {
      const data = event.data;
      if (disposed || data?.tag !== tag || data.family !== family || data.feature !== feature) return;
      const expectedParent = parentOrigin();
      const fromParent = win.parent !== win && event.source === win.parent && (isSiteURL(event.origin) || isFrameOrigin(event.origin)) && (!expectedParent || expectedParent === event.origin);
      const frameReady = isFrameURL(win.location.href);
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
    else if (win.parent !== win && isFrameURL(win.location.href)) {
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
  return __toCommonJS(ownership_exports);
})();
var MediaNavigation = (() => {
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

  // shared/navigation/guard.js
  var guard_exports = {};
  __export(guard_exports, {
    confirmExternal: () => confirmExternal,
    installNavigationGuard: () => installNavigationGuard,
    navigationKind: () => navigationKind,
    protectMediaFrame: () => protectMediaFrame
  });
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
    const exposeTo = (fn, target = page) => {
      try {
        return typeof exportFunction === "function" ? exportFunction(fn, target) : fn;
      } catch {
        return fn;
      }
    };
    const open = () => null;
    const exposedOpen = exposeTo(open, page);
    let openDescriptor;
    try {
      openDescriptor = Object.getOwnPropertyDescriptor(page, "open");
      Object.defineProperty(page, "open", { configurable: true, enumerable: openDescriptor?.enumerable ?? true, get: exposeTo(() => exposedOpen, page), set: exposeTo(() => {
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
      const wrapped = exposeTo(makeWrapper(orig), targetWin);
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
          const wrappedGet = exposeTo(function() {
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
        const childOpen = exposeTo((...args) => {
          if (disposed && typeof origChildOpen === "function") return Reflect.apply(origChildOpen, raw, args);
          return null;
        }, raw);
        guardedOpens.add(childOpen);
        try {
          const desc = Object.getOwnPropertyDescriptor(raw, "open");
          Object.defineProperty(raw, "open", { configurable: true, enumerable: desc?.enumerable ?? true, get: exposeTo(() => childOpen, raw), set: exposeTo(() => {
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
        const childClick = exposeTo((event) => handleClick(event, raw, false), raw);
        const childSubmit = exposeTo((event) => {
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
  return __toCommonJS(guard_exports);
})();
// BEGIN MOTCHILL SITES (generated)
// ---- lib/sites.js ----
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
  const replacementRequests=new Map();let localReplacement=null;
  const providerIdentity=value=>value && typeof value.id==='string' && /^[1-9]\d*$/.test(value.id) && typeof value.movieId==='string' && /^[1-9]\d*$/.test(value.movieId) && Number.isSafeInteger(value.season) && value.season>=1 && value.season<=1000 && typeof value.server==='string' && value.server.length<200 && sites.translationKey(value.server) ? {id:value.id,movieId:value.movieId,season:value.season,server:value.server}:null;
  function readParentContext(value,origin){
    const target=sites.url(value?.url),route=target && sites.route(target.href,value?.family);
    const originHost=sites.url(origin)?.hostname || '';
    const originMatches=!!target && (target.origin===origin || sites.embedHosts.has(originHost));
    const routeEp=route && sites.episodeKey(route.episode);
    const validEpisode=routeEp===value?.episodeKey || (value?.family===sites.families.NEXT_REVIVE && routeEp==='ep:1' && value?.episodeKey==='full');
    const validLanguage=value?.language==='' || !!sites.translationKey(value?.language);
    if(!target || !originMatches || !sites.isMotchill(target.hostname) || !route || route.slug!==value.slug || !validEpisode || !validLanguage)return null;
    const result=Object.fromEntries(['url','family','slug','film','episode','episodeKey','language','server'].map(key=>[key,String(value[key] || '').slice(0,2048)]));
    if(Number.isFinite(value.introSeconds) && value.introSeconds>=0 && value.introSeconds<=300)result.introSeconds=value.introSeconds;
    const next=sites.url(value.next?.url),nextRoute=next && sites.route(next.href,result.family);
    if(next?.origin===target.origin && nextRoute?.slug===route.slug && Number(sites.episodeKey(nextRoute.episode).replace('ep:',''))===Number(result.episodeKey.replace('ep:',''))+1)result.next={url:next.href};
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
    const ownContext = sites.adapter().read();
    const introSeconds = window.top === window ? options.introSeconds?.() : (parentContext?.introSeconds ?? options.introSeconds?.());
    const context = ownContext ? { ...ownContext, introSeconds } : parentContext;
    frame.contentWindow?.postMessage({ tag: channel, type: 'hello', token: session.token,
      managed: ['episode','provider'].includes(frame.dataset.mcManaged) || managed,
      role: session.assignedRole || frame.dataset.mcRole || currentRole,
      presented: parentPresented && !sites.isPrepared(frame), context,
      fullscreen: Boolean(document.fullscreenElement?.contains(frame) || parentFullscreen) }, session.origin);
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
    replaceMedia(value,signal){
      if(validRemote(this.frame)!==this || !this.state.localPresentation || !this.state.playlist || !value?.playlist || signal?.aborted)return Promise.reject(new Error('Nguồn không còn hiện hành'));
      const id=nonce(),mediaId=this.state.mediaId,token=this.session.token,frame=this.frame,origin=this.session.origin;
      return new Promise((resolve,reject)=>{
        const finish=(fn,result)=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);replacementRequests.delete(id);fn(result);};
        const cancel=()=>{frame.contentWindow?.postMessage({tag:channel,type:'cancel-replace',token,id},origin);};
        // Child readiness + seek may take 20s, and a failed load needs the
        // same budget to roll back. Do not abandon its result halfway through
        // recovery; the owner's commit deadline is deliberately longer.
        const timer=setTimeout(()=>{cancel();finish(reject,new Error('Chưa xác nhận đổi nguồn'));},43000);replacementRequests.set(id,{frame,token,resolve:result=>finish(resolve,result),reject:error=>finish(reject,signal?.aborted?Object.assign(error,{name:'AbortError'}):error)});
        signal?.addEventListener('abort',cancel,{once:true});frame.contentWindow.postMessage({tag:channel,type:'replace-media',token,id,mediaId,value},origin);
      });
    }
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
  function requestIntro(){
    const value=state();if(documentRole()!=='current' || !upstream || !value?.mediaId || value.ad)return false;
    window.parent.postMessage({tag:channel,type:'intro-episode',token:upstream.token,mediaId:value.mediaId},upstream.origin);return true;
  }
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.tag !== channel || !trustedOrigin(event.origin)) return;
    if (event.source === window.parent && window.parent !== window && parentOrigin === event.origin) {
      if(data.type==='cancel-replace' && upstream?.token===data.token && localReplacement?.id===data.id){localReplacement.controller.abort();return;}
      if(data.type==='replace-media' && upstream?.token===data.token){
        const video=sites.findVideo(),value=data.value,provider=providerIdentity(value?.provider),playlist=typeof SharedPlayer!=='undefined' && SharedPlayer.mediaPlaylist(value?.playlist);
        if(localReplacement || !options.replaceMedia || !video || video.closest('.jw-flag-ads,[data-ad]') || typeof data.mediaId!=='string' || !data.mediaId || data.mediaId!==(video.currentSrc || video.src || '') || typeof data.id!=='string' || !/^[a-f0-9-]{16,100}$/.test(data.id) || !playlist || !provider || !Number.isFinite(value.position) || value.position<0 || typeof value.paused!=='boolean' || typeof value.muted!=='boolean' || !Number.isFinite(value.volume) || value.volume<0 || value.volume>1)return;
        const job={id:data.id,token:data.token,controller:new AbortController()};localReplacement=job;
        Promise.resolve(options.replaceMedia(video,{playlist,provider,position:value.position,paused:value.paused,muted:value.muted,volume:value.volume},job.controller.signal)).then(()=>{
          if(localReplacement===job && upstream?.token===job.token && !job.controller.signal.aborted){sendState();window.parent.postMessage({tag:channel,type:'replace-result',token:job.token,id:job.id,ok:true},upstream.origin);}
        },()=>{if(localReplacement===job && upstream?.token===job.token){sendState();window.parent.postMessage({tag:channel,type:'replace-result',token:job.token,id:job.id,ok:false},upstream.origin);}}).finally(()=>{if(localReplacement===job)localReplacement=null;});return;
      }
      if(data.type==='next-result' && upstream?.token===data.token && typeof data.id==='string'){
        const request=nextRequests.get(data.id);
        if(request && request.token===data.token && data.mediaId===request.mediaId && (data.status==='navigating' || request.mediaId===state()?.mediaId) && ['navigating','missing','error'].includes(data.status)){
          clearTimeout(request.timer);nextRequests.delete(data.id);request.resolve(data.status);
        }return;
      }
      if (data.type === 'hello' && typeof data.token === 'string' && data.token.length < 100) {
        if(upstream?.token!==data.token)localReplacement?.controller.abort();
        upstream = { token: data.token, origin: event.origin };
        parentContext=readParentContext(data.context,event.origin);parentFullscreen=data.fullscreen===true;parentPresented=data.presented!==false;
        if (data.managed && ['prepared', 'current'].includes(data.role)) {
          managed = true; role = data.role; roleFromParent = true;
          for (const frame of frames()) setRole(frame, role);
          document.dispatchEvent(new CustomEvent('mc-player-role', { detail: { role, managed } }));
        }
        options.onHello?.();
        sendState();
      }
      if (data.type === 'role' && upstream?.token === data.token && data.managed && ['prepared', 'current'].includes(data.role)) {
        managed = true; role = data.role; roleFromParent = true;
        for (const frame of frames()) setRole(frame, role);
        document.dispatchEvent(new CustomEvent('mc-player-role', { detail: { role, managed } }));
      }
      if (data.type === 'command' && upstream?.token === data.token) {
        if(data.action==='play-audible' && (typeof data.mediaId!=='string' || !data.mediaId || documentRole()==='prepared'))return;
        if(data.action==='initialize-play-audible' && documentRole()==='prepared')return;
        if(data.action==='restore-audio' && (typeof data.mediaId!=='string' || !data.mediaId || documentRole()==='prepared' || typeof data.value?.muted!=='boolean' || !Number.isFinite(data.value?.volume) || data.value.volume<0 || data.value.volume>1))return;
        const video = sites.findVideo();
        observeLocal(video);
        if (!video) {const relay=relayRemote();if(data.mediaId && data.mediaId!==relay?.state?.mediaId)return;return relay?.command(data.action,data.value);}
        if(data.mediaId && data.mediaId!==(video.currentSrc || video.src || ''))return;
        if(data.action==='initialize-play-audible'){
          if(video.closest('.jw-flag-ads,[data-ad]') || video.error || video.readyState!==0)return;
          options.initializePlayAudible?.(video);return;
        }
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
        if (data.action === 'mute' && typeof data.value === 'boolean') { if (!options.setMute?.(video, data.value)) video.muted = data.value; }
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
    if(data.type==='intro-episode'){
      const receiver=validRemote(frame);
      if(!session || data.token!==session.token || session.src!==frame.src || session.origin!==event.origin || !receiver?.state.localPresentation || receiver.state.ad || receiver.state.changing || frame.dataset.mcRole==='prepared' || receiver.state.role==='prepared' || !data.mediaId || data.mediaId!==receiver.state.mediaId || Date.now()-(session.lastIntro || 0)<500)return;
      session.lastIntro=Date.now();if(upstream)requestIntro();else options.onIntro?.();return;
    }
    if(data.type==='replace-result'){
      const request=replacementRequests.get(data.id);
      if(!request || request.frame!==frame || request.token!==data.token || session?.token!==data.token || session.src!==frame.src || session.origin!==event.origin)return;
      if(data.ok===true)request.resolve(true);else request.reject(new Error('Không đổi được nguồn trong phiên'));return;
    }
    if(data.type==='next-episode'){
      const receiver=validRemote(frame);
      if(!session || data.token!==session.token || session.src!==frame.src || session.origin!==event.origin || !(receiver?.state?.nativeEnhanced || receiver?.state?.localPresentation) || !receiver.state.customCapable || receiver.state.ad || frame.dataset.mcRole==='prepared' || receiver.state.role==='prepared' || !data.mediaId || data.mediaId!==receiver.state.mediaId || typeof data.id!=='string' || !/^[a-f0-9-]{16,100}$/.test(data.id) || session.nextPending)return;
      const currentSession=session;session.nextPending=true;
      Promise.resolve(upstream?requestNext():options.onNext?.()).then(ok=>{
        if(validRemote(frame)!==receiver || sessions.get(frame)!==currentSession || receiver.state.mediaId!==data.mediaId && ok!==true && ok!=='navigating')return;
        const status=ok===true || ok==='navigating'?'navigating':ok==='error' || ok==='timeout'?'error':'missing';
        frame.contentWindow.postMessage({tag:channel,type:'next-result',token:session.token,id:data.id,mediaId:data.mediaId,status},session.origin);
      }).catch(()=>{
        if(validRemote(frame)===receiver && sessions.get(frame)===currentSession)frame.contentWindow.postMessage({tag:channel,type:'next-result',token:session.token,id:data.id,mediaId:data.mediaId,status:'error'},session.origin);
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
    // Diagnostics are optional and numeric only; never relay a media URL or
    // arbitrary message as display markup through this extension of the bridge.
    const load=typeof SharedPlayer!=='undefined' && SharedPlayer.validLoadMetrics(value.load)?Object.fromEntries(['ahead','status','bytesPerSecond','online','bufferPolicy'].map(key=>[key,value.load[key]])):null;
    value={...value,load};
    // This field comes through the same frame/window/origin/nonce checks as
    // mediaId. It conveys a media URL only, never original-page authority.
    const tracks={};
    for(const group of ['quality','audio','captions']){
      const items=value.tracks?.[group];
      if(Array.isArray(items) && items.length<=100 && items.every(item=>item && Number.isInteger(item.id) && item.id>=0 && item.id<100 && typeof item.label==='string' && item.label.length<=100 && typeof item.active==='boolean'))tracks[group]=items.map(({id,label,active})=>({id,label,active}));
    }
    value = { ...value, mediaSource: mediaSource(value.mediaSource),nativeEnhanced:value.nativeEnhanced===true,customCapable:value.customCapable===true,initializable:value.initializable===true,played:value.played===true,tracks,
      localPresentation:value.localPresentation===true,playlist:channel==='motchill-player-controls-v2' && typeof SharedPlayer!=='undefined'?SharedPlayer.mediaPlaylist(value.playlist):null,provider:providerIdentity(value.provider),changing:value.changing===true };
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
  return { poll, state, setRole, requestFullscreen,requestNext,requestIntro,get parentContext(){return parentContext;},get parentFullscreen(){return parentFullscreen;},get parentPresented(){return parentPresented;},getFrame: validRemote,
    setNativeGestures(value) { nativeGestures = value === true; },
    get role() { return documentRole(); }, get managed() { documentRole(); return managed; }, get remote() { return remote; } };
}

// END MOTCHILL SITES

  const sites = createMotchillSites();
  MediaSiteOwner.runFamily(window,{family:'motchill',feature:'noads',isSiteURL:value=>{const parsed=sites.url(value);return !!parsed && sites.isMotchill(parsed.hostname);},isFrameURL:value=>sites.knownEmbedPage(value),isFrameOrigin:value=>{const parsed=sites.url(value);return !!parsed && sites.embedHosts.has(parsed.hostname);}},()=>{
  sites.runWhenAllowed(() => {
  MediaNavigation.installNavigationGuard(window,window,{isMediaFrame:frame=>sites.knownEmbedPage(frame.src)});

  // ============================================================
  //  CÀI ĐẶT
  // ============================================================

  // true  = phim chỉ tải từ máy chủ, máy bạn không phải tải lên cho người xem khác.
  // false = để nguyên cơ chế P2P (chia sẻ qua lại giữa người xem) của trang.
  const DISABLE_P2P = true;

  // true  = bỏ quảng cáo video trước phim trong trình phát.
  // false = để trang phát quảng cáo video như bình thường (vẫn chặn banner, popup).
  const BLOCK_VIDEO_ADS = true;

  // Mốc thời gian ở tương lai xa: trang tưởng quảng cáo "vừa hiện xong" nên không hiện nữa.
  const FUTURE = '9999999999999';

  // ============================================================
  //  CHỌN VIỆC THEO TỪNG TRANG
  // ============================================================
  // document-start chưa có dấu hiệu DOM: đặt riêng các cờ quảng cáo đã biết
  // trước mọi script của trang. CSS/cách xử lý riêng được chọn sau khi nhận diện.
  primeAdState();
  try { blockKnownEmbedAds(); } catch (e) { /* Global bị khóa không ngăn các bộ chặn khác. */ }
  if (BLOCK_VIDEO_ADS) { try { disableVideoAds(); } catch (e) { /* Global bị trang khóa; CSS/cờ vẫn chạy. */ } }
  if (DISABLE_P2P) { try { disableP2P(); } catch (e) { /* Không làm dừng bộ chặn khác. */ } }
  const applied = new Set();
  function applyFamily() {
    const family = sites.detect();
    if (applied.has(family)) return;
    applied.add(family);
    switch (family) {
      case sites.families.CLASSIC: // https://motchillsa.com/ — source cũ, domain hiện lỗi DNS.
      case sites.families.OPHIM: // https://motchillcu.mx/, https://motchillt.si/ — live 2026-11-12.
        blockMotchilltu(); break;
      case sites.families.NEXT: // https://motchille.com.mx/ — Next.js + iframe.
        blockMotchillt(); break;
      case sites.families.NEXT_REVIVE: // https://motchill68.tv/ — Next.js, route ?tap=, Revive placements.
        blockNextRevive(); break;
      case sites.families.APIPHIM: // https://motchill.garden/ — plugin apiphim, theme xemphim.
        blockApiPhim(); break;
      case sites.families.DOO: // https://motchillkd.net/phim-le/allen/ — theme motchill2.
        blockDooPlay(); break;
      case sites.families.MYUI: // https://motchillv.fun/phim/thuong-cong-chua/tap-1 — Yii/MyUI.
        blockMyUI(); break;
      case sites.families.CHIBIFLIX: // https://motchillfv.help/ — popups/streamc handled by primeAdState & NavigationGuard.
      case sites.families.WRAPPER:
      default:
        // Wrapper/player/loại mới: chỉ dùng hook video/cờ đã biết; không ẩn DOM theo phỏng đoán.
        break;
    }
  }
  applyFamily();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyFamily, { once: true });
  const familyObserver = new MutationObserver(() => {
    if (sites.detect() !== sites.families.UNKNOWN) applyFamily();
  });
  familyObserver.observe(document, { childList: true, subtree: true });

  function primeAdState() {
    function set(area, key, value) { try { window[area].setItem(key, value); } catch (e) {} }
    // Captured Next config exports a shared ad gate: now - last < 1000.
    // Prime it before page JS installs capture listeners; stopping propagation
    // at a custom button is too late to stop a document capture popunder.
    for (const key of ['mobile_pageVisitedTime', 'desktop_pageVisitedTime', 'vast_ad_last_shown', 'popup-ads-last-shown-ts', 'click_last_ad', 'ad-per-click-lock']) set('sessionStorage', key, FUTURE);
    // Captured lazy PopupAd reads these before its 1500ms banner timer.
    for (const key of ['motchill-hide-all-ads', 'motchill-popup-ads-hidden']) set('sessionStorage', key, '1');
    for (const key of ['popup-ads-init-count']) set('sessionStorage', key, '999');
    set('localStorage', 'plp_day', new Date().toISOString().slice(0, 10));
    for (const key of ['plp_windowStart', 'lastPopupTime', 'shopeeLastShown']) set('localStorage', key, FUTURE);
    set('localStorage', 'plp_windowCount', '999');
    set('localStorage', 'popupShown', 'true');
    // Stream Panel R25 (/assets/ads.*.js on embed*.streamc.xyz) exits on line 1 when streamAdsLoaded is truthy.
    try { window.streamAdsLoaded = true; } catch (e) {}
    try { document.cookie = 'popup_last_shown=' + FUTURE + '; path=/'; } catch (e) {}
  }

  function blockKnownEmbedAds() {
    // DooPlay /tvc-embed.html wrapper (https://motchillkd.online/tvc-embed.html?embed=...):
    // plays #tvc-container > video#tvc-video[src*="/wp-content/ADS/"] before loading #movie-frame in closeTVC().
    if (BLOCK_VIDEO_ADS && /^\/tvc-embed\.html$/i.test(location.pathname)) {
      const skipTvc = () => {
        const embed = sites.url(new URLSearchParams(location.search).get('embed'));
        const tvc = document.querySelector('#tvc-container > video#tvc-video[src*="/wp-content/ADS/"]');
        const movieFrame = document.querySelector('#movie-container > iframe#movie-frame');
        if (!embed || !(sites.embedHosts.has(embed.hostname) || sites.isMotchill(embed.hostname)) || !tvc || !movieFrame) return;
        tvc.muted = true;
        tvc.pause();
        tvc.dispatchEvent(new Event('ended'));
        tvc.addEventListener('play', () => { tvc.muted = true; tvc.pause(); });
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', skipTvc, { once: true });
      else skipTvc();
    }
    // Player source đã đọc 2026-11-13: https://a.motchill68.tv/embed/4/274183.
    // Nhận diện bằng route + schema __EMBED_DATA__ + API pathname, không domain.
    // Player bỏ riêng ads IIFE nếu endpoint rỗng; video/token/availability vẫn nguyên.
    // Không đặt types=[]: source coi mảng rỗng là cho phép MỌI loại quảng cáo.
    const match = location.pathname.match(/^\/embed\/(\d+)\/(\d+)\/?$/);
    if (!match) return;
    const descriptor = Object.getOwnPropertyDescriptor(window, '__EMBED_DATA__');
    if (descriptor && (!descriptor.configurable || descriptor.get || descriptor.set)) return;
    function sanitize(value) {
      const endpoint = sites.url(value?.ads?.endpoint);
      if (!value || Number(value.siteId) !== Number(match[1]) || Number(value.videoSourceId) !== Number(match[2])
        || typeof value.embedToken !== 'string' || !value.embedToken || !value.availability
        || !Array.isArray(value.ads?.types) || endpoint?.pathname !== '/api/v1/public/normal-ads') return value;
      // Giữ cùng object để website và các script khác dùng đúng movie metadata.
      try {
        if (BLOCK_VIDEO_ADS || !value.ads.types.includes('tvc_mp4')) value.ads.endpoint = '';
        else value.ads.types = ['tvc_mp4']; // Tuỳ chọn cho phép video ad, vẫn bỏ poster/popup/click redirect.
      } catch (e) { return value; }
      // Chỉ các ID source đã xác minh. Không ẩn video chính, play/next overlay
      // hoặc TVC đang phát (ẩn riêng TVC có thể để phim mắc ở trạng thái pause).
      addStyle('#ad-poster,#ad-pause,#ad-overlay,#ad-watermark,#ad-textlink { display: none !important; }');
      return value;
    }
    let data = sanitize(descriptor?.value);
    Object.defineProperty(window, '__EMBED_DATA__', {
      configurable: true, enumerable: descriptor?.enumerable ?? true,
      get() { return data; }, set(value) { data = sanitize(value); },
    });
  }

  // Trang gán thư viện JW Player sau khi script chạy: bỏ VAST trước mỗi setup.
  function disableVideoAds() {
    const wrappedApis = new WeakSet();
    function wrap(fn) {
      if (typeof fn !== 'function') return fn;
      return new Proxy(fn, {
        apply(target, thisArg, args) {
          const api = Reflect.apply(target, thisArg, args);
          if (api && typeof api.setup === 'function' && !wrappedApis.has(api)) {
            const setup = api.setup;
            api.setup = function (config, ...rest) {
              if (config) delete config.advertising;
              return setup.call(this, config, ...rest);
            };
            wrappedApis.add(api);
          }
          return api;
        },
      });
    }

    let jw = wrap(window.jwplayer);
    Object.defineProperty(window, 'jwplayer', {
      configurable: true,
      get() { return jw; },
      set(value) { jw = wrap(value); },
    });
  }

  // ============================================================
  //  motchilltu.com: CHẶN QUẢNG CÁO
  //  (WordPress, quảng cáo đến từ plugin "ads-manager" và "popup-protect")
  // ============================================================
  function blockMotchilltu() {
    // Bộ mới (tracking-ubt-*.js, gặp trên motchillcu.mx): chỉ mở tab và
    // phủ lớp bắt click lên iframe sau 180s (mobile) / 300s (desktop).
    // Giữ mốc bắt đầu ở tương lai để cả hai nhánh không đủ điều kiện chạy.
    // Dùng đúng key của quảng cáo, không sửa window.open, click hay href;
    // không phụ thuộc tên miền để vẫn chạy khi Motchill đổi địa chỉ.
    // Các cờ được primeAdState() đặt từ document-start (kể cả khi storage bị khóa).

    // Ẩn banner trên/dưới, banner dưới trình phát, popup và nút "Ẩn QC".
    addStyle(`
      .cat-footer-wrapper,
      .cat-header-wrapper,
      .container-aam,
      .container-aam-player,
      #popup-overlay,
      .hide-qc {
        display: none !important;
      }
    `);

    // 5) Ẩn nút chia sẻ và menu chia sẻ của trình phát.
    addStyle(`
      .jwplayer .jw-settings-sharing,
      .jwplayer .jw-sharing-menu {
        display: none !important;
      }
    `);

    // Popup có thể đã mở (và khoá cuộn trang) trước khi bookmarklet chạy.
    if (document.body) document.body.style.overflow = '';
  }

  // ============================================================
  //  motchilltu.com: TẮT CHIA SẺ P2P
  //  Trang dùng thư viện p2p-media-loader: phần lớn đoạn phim được tải từ máy
  //  của người xem khác, và máy bạn cũng tải lên cho họ. Trang chỉ bật P2P khi
  //  p2pml.hlsjs.Engine.isSupported() trả về true; nếu là false, trang tự phát
  //  thẳng từ máy chủ (nhánh dự phòng có sẵn của trang).
  //  Script đặt một "getter" cho biến p2pml: mỗi lần trang đọc nó,
  //  isSupported() bị đổi thành luôn trả về false.
  //  Chỉ có tác dụng khi chạy trước trang (Tampermonkey / Userscripts),
  //  bookmarklet chạy sau khi trang đã tải nên không tắt được.
  // ============================================================
  function disableP2P() {
    let p2pml = window.p2pml;
    Object.defineProperty(window, 'p2pml', {
      configurable: true,
      get() {
        const engine = p2pml && p2pml.hlsjs && p2pml.hlsjs.Engine;
        if (engine) engine.isSupported = () => false;
        return p2pml;
      },
      set(value) {
        p2pml = value;
      },
    });
  }

  // ============================================================
  //  motchillt.app (Next.js): CHẶN QUẢNG CÁO
  // ============================================================
  function blockMotchillt() {
    // 1) Video quảng cáo trước phim, popup giữa màn hình, tab quảng cáo khi bấm:
    //    trang chỉ hiện khi các mốc thời gian này đã cũ.

    // 2) Trang chỉ gắn bộ bắt click mở tab quảng cáo khi cờ này chưa bật -> giữ nó luôn bật.
    try {
      Object.defineProperty(window, '__ads_listener__', { get: () => true, set: () => {} });
    } catch (e) {}

    // 3) Ẩn banner, nút "AD Blocker" giả, popup, nút quảng cáo nhấp nháy.
    addStyle(`
      .ads-banner,
      .popup-ads-banner,
      div:has(> button[aria-label="Button handle hide all ads"]),
      .fixed.inset-0:has(.no-ads-under),
      div:has(> a.promo-btn) {
        display: none !important;
      }
    `);
  }

  function blockNextRevive() {
    // Dẫn chứng 2026-11-13: https://motchill68.tv/, chunks 2083/5399/page.
    // Source này dùng CatfishBanner/AdSlot/Revive và balloon kéo nổi, khác
    // source motchille. Ẩn đúng component/vị trí quảng cáo cả trước/sau hydrate;
    // giữ nguyên site-root, main, card phim, link/search/server và iframe player.
    // ins được loader Revive clone nhưng giữ data-revive-id, CSS tiếp tục khớp.
    addStyle(`
      .catfish-banner,
      .home-rail-mini-banner,
      .site-rail-ad,
      .site-rail-promo,
      .site-header-promo,
      .site-footer-promo,
      .revive-popup-banner,
      .revive-popup-probe,
      .revive-frame,
      ins[data-revive-id],
      section[data-placement][data-placement-format],
      /* Detail/watch có danh sách tài trợ riêng: ảnh ad và text link là anh em.
         Ẩn cả section đã xác minh; giữ sidebar phim/trending/ranking/comment. */
      section[aria-labelledby~="sb-partners"]:has(section[data-placement="inline"][data-zone-id] .revive-frame),
      .movie-card-may-logo,
      img[alt="MAY88"][src*="may-logo"],
      .gift-modal:has(.revive-frame),
      .gift-modal:has(ins[data-revive-id]),
      .fixed.inset-0:has(.revive-popup-banner) {
        display: none !important;
      }
      /* Hai rail quảng cáo bị bỏ: center không được rơi vào cột 120px cũ. */
      .site-main-rails { grid-template-columns: minmax(0, 1fr) !important; }
      #site-root.site-with-catfish { padding-bottom: 0 !important; }
    `);
  }

  function blockApiPhim() {
    // https://motchill.garden/: data-apiphim-catfish-item + quảng cáo vietpub.
    // Không chặn iframe player; chỉ ẩn những vị trí/URL quảng cáo đã đọc từ source.
    addStyle(`
      [data-apiphim-catfish-item], .gx-header-links,
      iframe[src*="vietpub.com/statics/"],
      a[href^="https://getshort.link/giaitri.xyz"] { display: none !important; }
    `);
  }

  function blockDooPlay() {
    // https://motchillkd.net/phim-le/allen/, https://motchillkd.online/: banner #bottom-sticky-ad, .ads-728x90-container, ảnh /wp-content/ADS/.
    addStyle('#bottom-sticky-ad, .ads-728x90-container, a:has(img[src*="/wp-content/ADS/"]) { display: none !important; }');
  }

  function blockMyUI() {
    // https://motchillv.fun/: sureview.shop/popchill.js đọc shopeeLastShown (đã prime).
    // Không ẩn #player-click-layer: đây có thể là lớp bật Play, không xác định là quảng cáo.
    addStyle('.ads-banner, .catfish, a:has(img[src*="/ads/"]) { display: none !important; }');
  }

  // ============================================================
  //  TIỆN ÍCH CHUNG
  // ============================================================
  // Thêm CSS vào trang càng sớm càng tốt: chưa có <head> thì gắn vào <html>,
  // chưa có cả <html> (script chạy quá sớm) thì đợi trang dựng xong.
  function addStyle(css) {
    const add = () => {
      const style = document.createElement('style');
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
    };
    if (document.documentElement) add();
    else document.addEventListener('DOMContentLoaded', add);
  }
  // END MOTCHILL ENTRY
  });
});
})();