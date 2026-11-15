// ==UserScript==
// @name         Motchill - thao tác trình phát
// @namespace    motchill-gestures
// @version      6.0.10
// @author       zic
// @homepageURL  https://github.com/nhattruong16062003/media-userscripts/tree/main/motchill
// @updateURL    https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/refs/heads/main/motchill/gestures/motchill-gestures.user.js
// @downloadURL  https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/refs/heads/main/motchill/gestures/motchill-gestures.user.js
// @description  Trình phát Motchill (mọi tên miền): chạm 2 lần tua 10 giây, giữ để xem x2, khóa màn hình khi xem toàn màn hình, nút bỏ qua giới thiệu và tập tiếp theo.
// @match        https://motchillsa.com/*
// @match        https://motchilltu.com/*
// @include      /^https?:\/\/[^\/?#]*motchill[^\/?#]*\//
// @match        https://fcloud.live/cinema/*
// @match        https://player.phimapi.com/player/*
// @match        https://maztoycdn.xyz/watch/*
// @match        https://player.cbplay.cc/embed/*
// @match        https://cdn.loadvid.com/videos/play/*
// @match        https://embed13.streamc.xyz/*
// @match        https://embed1.streamc.xyz/embed.php*
// @match        https://embed12.streamc.xyz/embed.php*
// @match        https://embed2.streamc.xyz/embed.php*
// @match        https://embed11.streamc.xyz/embed.php*
// @match        https://v8.streamvsmov.com/video/*
// @match        https://v9.streamvsmov.com/video/*
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
var SharedPlayer = (() => {
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

  // shared/player/index.js
  var index_exports = {};
  __export(index_exports, {
    attachPlayer: () => attachPlayer,
    audioPreferenceStore: () => audioPreferenceStore,
    childLoading: () => childLoading,
    customPlayerControls: () => customPlayerControls,
    fullscreenController: () => fullscreenController,
    installGestures: () => installGestures,
    loadingPanel: () => loadingPanel,
    playerCandidate: () => playerCandidate,
    playerFingerprint: () => playerFingerprint,
    playerStartupGuard: () => playerStartupGuard,
    playerTracks: () => playerTracks,
    playerUIStyle: () => playerUIStyle,
    selectPlayerTrack: () => selectPlayerTrack
  });

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

  // shared/media.js
  var finite = (value) => typeof value === "number" && Number.isFinite(value);
  function clampSeek(time, duration) {
    return Math.max(0, Math.min(Math.max(0, duration - 0.25), time));
  }
  function audioPreference(value) {
    return value && typeof value === "object" && typeof value.muted === "boolean" && finite(value.volume) && value.volume >= 0 && value.volume <= 1 ? { muted: value.muted, volume: value.volume } : null;
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
  return __toCommonJS(index_exports);
})();
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


// ---- lib/episode-machine.js ----
// Pipeline dùng chung cho bấm tay, mốc 90 giây và ended. Hook player chỉ được
// resolve activate sau khi đã xác nhận đúng tập, seek 0 và phát thực tế.
function createMotchillEpisodeMachine(hooks, options = {}) {
  const timeoutMs = options.timeoutMs ?? 20000;
  const noticeMs = options.noticeMs ?? 8000;
  const now = options.now || Date.now;
  let generation = 0;
  let context = '';
  let next = null;
  let prepared = null;
  let warming = null;
  let switching = null;
  let attemptedAuto = false;
  let attemptedEnd = false;
  let warmAttempted = false;
  let controller = new AbortController();
  let state = { phase: 'idle', message: '', reason: '' };
  const disposed = new WeakSet();
  const abortError = () => Object.assign(new Error('Tác vụ đã được thay thế'), { name: 'AbortError' });
  const report = (phase, message = '', reason = '') => {
    state = { phase, message, reason };
    hooks.onState?.(state);
  };
  function discard(candidate) {
    if (!candidate || typeof candidate !== 'object' || disposed.has(candidate)) return;
    disposed.add(candidate);
    try { hooks.discard?.(candidate); } catch (_) { /* cleanup không che lỗi nguồn */ }
  }
  async function limited(work, parentSignal, cleanup) {
    const operation = new AbortController();
    let deadline;
    let stop;
    let result;
    const interrupted = new Promise((_, reject) => {
      stop = () => { operation.abort(); reject(abortError()); };
      parentSignal.addEventListener('abort', stop, { once: true });
      deadline = setTimeout(() => {
        operation.abort();
        reject(Object.assign(new Error('Nguồn phát chưa sẵn sàng sau 20 giây'), { name: 'TimeoutError' }));
      }, timeoutMs);
      if (parentSignal.aborted) stop();
    });
    const task = Promise.resolve().then(() => {
      if (operation.signal.aborted) throw abortError();
      return work(operation.signal);
    }).then((value) => {
      if (operation.signal.aborted) { cleanup?.(value); throw abortError(); }
      result = value;
      return value;
    });
    try { return await Promise.race([task, interrupted]); }
    finally {
      clearTimeout(deadline);
      parentSignal.removeEventListener('abort', stop);
      // task có thể còn chạy nếu player bên thứ ba không hỗ trợ abort; result
      // muộn được cleanup ở nhánh then phía trên và không được phép commit.
      if (parentSignal.aborted && result) cleanup?.(result);
    }
  }
  function reset(key, target) {
    const targetKey = target?.url || '';
    if (context === key && (next?.url || '') === targetKey) return;
    generation++;
    controller.abort();
    controller = new AbortController();
    discard(prepared);
    context = key;
    next = target || null;
    prepared = null;
    warming = null;
    switching = null;
    attemptedAuto = false;
    attemptedEnd = false;
    warmAttempted = false;
    report('idle');
  }
  function usable(candidate) {
    return candidate && (!candidate.expiresAt || candidate.expiresAt > now() + 30000);
  }
  function warmup() {
    if (!next) return Promise.resolve(null);
    if (usable(prepared)) return Promise.resolve(prepared);
    if (warming) return warming;
    discard(prepared); prepared = null;
    const epoch = generation;
    const target = next;
    const signal = controller.signal;
    warmAttempted = true;
    if (!switching) report('preparing', 'Đang chuẩn bị tập tiếp theo…');
    const task = limited((s) => hooks.prepare(target, { signal: s, fresh: false }), signal, discard)
      .then((candidate) => {
        if (epoch !== generation || signal.aborted) { discard(candidate); return null; }
        prepared = candidate;
        if (!switching) report('ready', 'Tập tiếp theo đã được chuẩn bị');
        return candidate;
      }).catch((error) => {
        if (epoch === generation && error.name !== 'AbortError' && !switching) report('idle');
        return null; // lỗi nạp trước không được dừng tập đang xem
      }).finally(() => { if (epoch === generation) warming = null; });
    warming = task;
    return task;
  }
  function go(reason = 'manual') {
    if (!next) return Promise.resolve(false);
    if (switching) return switching;
    const epoch = generation;
    const target = next;
    const signal = controller.signal;
    if (prepared && !usable(prepared)) { discard(prepared); prepared = null; }
    // Phản hồi đồng bộ trước await/network, kể cả khi chưa có preload.
    report('switching', 'Đang chuyển tập…', reason);
    const notice = setTimeout(() => {
      if (epoch === generation && switching) report('switching', 'Đang tải tập mới, vui lòng chờ…', reason);
    }, noticeMs);
    const task = (async () => {
      let candidate = null;
      try {
        candidate = usable(prepared) ? prepared : warming ? await warming : null;
        for (let attempt = 0; attempt < 2; attempt++) {
          if (signal.aborted || epoch !== generation) throw abortError();
          let committing = false;
          try {
            if (!usable(candidate)) {
              discard(candidate);
              candidate = await limited((s) => hooks.prepare(target, { signal: s, fresh: attempt > 0 }), signal, discard);
            }
            const result = await limited((s) => hooks.activate(candidate, target, { signal: s }), signal);
            if (signal.aborted || epoch !== generation) throw abortError();
            if (!result?.playing || result?.startedAt !== 0) throw new Error('Tập mới chưa xác nhận phát từ đầu');
            committing = true;
            await limited((s) => hooks.commit?.(candidate, target, result, {
              signal: s, isCurrent: () => epoch === generation && !s.aborted,
            }), signal);
            if (signal.aborted || epoch !== generation) throw abortError();
            prepared = null; // quyền sở hữu được bàn giao cho player hiện tại
            report('playing', 'Đã chuyển tập', reason);
            return true;
          } catch (error) {
            if (signal.aborted || error.name === 'AbortError') throw error;
            discard(candidate); candidate = null; prepared = null;
            if (committing) throw error; // Không chạy commit hai lần khi đã bắt đầu bàn giao.
            if (attempt) throw error;
            report('refreshing', 'Đang lấy lại nguồn phát mới…', reason);
          }
        }
      } catch (error) {
        discard(candidate);
        if (epoch === generation && error.name !== 'AbortError') {
          hooks.rollback?.();
          report('error', 'Không chuyển được tập. Thử lại hoặc quay về tập hiện tại.', reason);
        }
        return false;
      } finally {
        clearTimeout(notice);
        if (epoch === generation) switching = null;
      }
    })();
    switching = task;
    return task;
  }
  function tick(media, key, target) {
    reset(key, target);
    if (!next || !media || media.ad || media.prepared || switching || state.phase === 'playing') return;
    const duration = Number(media.duration);
    const time = Number(media.currentTime);
    const remaining = duration - time;
    // Keep the original player's ten-minute episode guard. A short clip must
    // not lose most of its content to the fixed ninety-second credits skip.
    // Actual ended remains a separate fallback below.
    const valid = Number.isFinite(duration) && duration >= 600 && Number.isFinite(time) && time > 0 && remaining >= 0;
    if (valid && remaining <= 240 && !warmAttempted) warmup();
    // Ended là dự phòng, kể cả nguồn không báo duration hợp lệ. Tách guard để
    // một lần thất bại ở mốc 90s còn có thể thử lại khi thực sự ended.
    if (media.ended && !attemptedEnd) { attemptedEnd = true; go('ended'); }
    else if (valid && !media.paused && remaining <= 90 && time >= 30 && !attemptedAuto) {
      attemptedAuto = true;
      go('auto');
    }
  }
  return { reset, warmup, go, tick, cancel: () => reset('', null),
    get state() { return state; }, get busy() { return !!switching; }, get prepared() { return prepared; } };
}


// ---- lib/player-adapters.js ----
// Source adapter chỉ nhận các nút server thật; không suy ra server bằng tên miền.
function createMotchillPlayerAdapters(sites) {
  function selectors(family) {
    switch (family) {
      case sites.families.CLASSIC: // https://motchillsa.com/ (mẫu cũ)
      case sites.families.OPHIM: // https://motchillcu.mx/
        return { buttons: '.streaming-server', containers: '.tip-change-server,.control-items__servers' };
      case sites.families.NEXT: // https://motchille.com.mx/ (SSR + hydration)
        return { buttons: 'button[aria-pressed]', containers: '' };
      case sites.families.NEXT_REVIVE: // https://motchill68.tv/xem-phim/thuong-cong-chua (lazy WatchPlayerSection)
        return { buttons: '', containers: '' };
      case sites.families.APIPHIM: // https://motchill.garden/
        return { buttons: '[data-apx-server-button]', containers: '.apx-flat-subtabs,[role="tablist"]' };
      case sites.families.DOO: // https://motchillkd.net/
        return { buttons: '.dooplay_player_option', containers: '#playeroptions' };
      case sites.families.MYUI: // https://motchillv.fun/
        return { buttons: '.streaming-server', containers: '.tip-change-server,.myui-player__item .player-box,.player-controls' };
      default: return { buttons: ':not(*)', containers: '' };
    }
  }
  function reviveServerContainer(doc) {
    const mirrored = doc.querySelector('[data-mc-server-container="next-revive"]');
    if (mirrored) return mirrored;
    if (sites.reviveServerNodes) return sites.reviveServerNodes(doc)[0]?.parentElement?.parentElement || null;
    // Actual WatchPlayerSection has no data/ARIA flags on server buttons.
    // Locate its own heading within the verified player section, excluding
    // episode/season/advertising buttons elsewhere in the same application.
    const section = doc.querySelector('section[aria-label="Khung phát phim"]');
    if (!section) return null;
    for (const heading of section.querySelectorAll('p')) {
      if (sites.normalize(heading.textContent) !== 'chon-server') continue;
      const row = heading.parentElement;
      if (row?.querySelector(':scope > div > button')) return row;
    }
    return null;
  }
  function serverChoices(doc = document, family = sites.detect(doc), media) {
    const config = selectors(family);
    const native = family === sites.families.NEXT_REVIVE
      ? [...(reviveServerContainer(doc)?.querySelectorAll(':scope > div > button') || [])]
      : [...doc.querySelectorAll(config.buttons),...(family===sites.families.NEXT?sites.nextProviderButtons(doc):[])];
    const nodes = [...new Set([...native, ...doc.querySelectorAll('[data-mc-server-key]')])].filter((node) => !node.closest('.mc-translations'));
    return nodes.map((node) => {
      const label = node.dataset.mcNativeLabel || node.getAttribute('data-apx-server-label') || node.querySelector('.title')?.textContent || node.textContent;
      const title = String(label || '').replace(/\s+/g, ' ').trim();
      if (!title || family === sites.families.NEXT && !/^server\b/i.test(title) && !sites.nextProviderButtons(doc).includes(node)) return null;
      const kind = node.dataset.type || node.dataset.apxProvider || (family===sites.families.NEXT && sites.nextProviderState(doc)?'embed':'');
      // data-id/data-post chứa ID tập nên không được dùng để đối chiếu tập sau.
      const identity = node.dataset.mcServerKey || [sites.normalize(title), node.dataset.source || '', kind, node.dataset.srv || ''].join('|');
      const nativeChoice=family===sites.families.NEXT?sites.translationServers(doc,family).find(entry=>entry.node===node):null;
      const selected = nativeChoice?nativeChoice.selected:node.getAttribute('aria-pressed') === 'true' || node.getAttribute('aria-selected') === 'true'
        || node.classList.contains('active') || node.classList.contains('btn-active') || node.classList.contains('btn-success') || node.classList.contains('on') || node.classList.contains('is-active')
        || family === sites.families.NEXT_REVIVE && node.classList.contains('text-[#39FF89]') && [...node.classList].some((name) => name.startsWith('shadow-['));
      const weakSelected = node.classList.contains('current');
      const pageUrl = sites.url(doc.location?.href)?.href || location.href;
      let declaredSource = node.dataset.link || node.dataset.src || '';
      if (!declaredSource && [sites.families.NEXT, sites.families.NEXT_REVIVE].includes(family)) {
        // Share the RSC provider+language mapping with history. A server label
        // alone is not a playable source and must not validate another provider.
        declaredSource = sites.translationServers(doc, family).find((entry) => entry.node === node)?.source || '';
      }
      if (!declaredSource && family === sites.families.NEXT_REVIVE && sites.reviveData) {
        const data = sites.reviveData(doc, pageUrl);
        const episode = Number(sites.url(pageUrl)?.searchParams.get('tap') || data?.initialDigits || 1);
        const matching = (data?.episodes || []).filter((item) => {
          const full = sites.normalize(item.label) === 'full' || /^tap-full(?:-|$)/.test(sites.normalize(item.slug));
          return sites.normalize(item.server) === sites.normalize(title)
            && (full ? 1 : Number(String(item.label || item.slug || '').match(/\d+/)?.[0])) === episode;
        });
        if (matching.length === 1) declaredSource = matching[0].link;
      }
      const source = sites.url(declaredSource, pageUrl)?.href;
      const mediaSources = [media?.state?.mediaId, media?.currentSrc, media?.src, media?.frame?.src].filter(Boolean);
      return { key: identity, label: title, node, source, kind, selected, weakSelected,
        matchesMedia: !!source && mediaSources.includes(source) };
    }).filter(Boolean);
  }
  function chosenServer(doc = document, family, media) {
    const choices = serverChoices(doc, family || sites.detect(doc), media);
    const selected = choices.filter((choice) => choice.selected);
    if (selected.length === 1) return selected[0];
    const exact = choices.filter((choice) => choice.matchesMedia);
    if (exact.length === 1) return exact[0];
    const current = choices.filter((choice) => choice.weakSelected);
    if (current.length === 1) return current[0];
    return choices.length === 1 ? choices[0] : null;
  }
  function serverContainer(doc = document, family = sites.detect(doc)) {
    if (family === sites.families.NEXT_REVIVE) return reviveServerContainer(doc);
    const config = selectors(family);
    const choices = serverChoices(doc, family);
    if (config.containers) {
      for (const selector of config.containers.split(',')) {
        const candidate = doc.querySelector(selector);
        if (candidate && choices.some((choice) => candidate.contains(choice.node))) return candidate;
      }
    }
    if (!choices.length) return null;
    // Chỉ dùng tổ tiên nhỏ nhất chứa đúng các nút, không lấy cả main/body.
    let candidate = choices[0].node.parentElement;
    while (candidate && !choices.every((choice) => candidate.contains(choice.node))) candidate = candidate.parentElement;
    return candidate && !/^(BODY|HTML|MAIN)$/.test(candidate.tagName) ? candidate : null;
  }
  function selectServer(key, doc = document, family = sites.detect(doc), force = false) {
    const choice = serverChoices(doc, family).find((item) => item.key === key);
    if (!choice) return null;
    if (force || !choice.selected) choice.node.click();
    return choice;
  }
  function canLock(doc = document, family = sites.detect(doc)) {
    switch (family) {
      // Preserve the previous JW-only optional control, based on the real
      // player markup rather than which server name/domain happens to host it.
      case sites.families.CLASSIC: // https://motchillsa.com/ (source cũ)
      case sites.families.OPHIM: // https://motchillcu.mx/
        return !!doc.querySelector('.jwplayer video');
      default: return false;
    }
  }
  const warmups = new WeakMap();
  function sourceProven(choice, media) {
    if (!choice?.source || !media) return false;
    const frames = [media.frame?.src, ...(Array.isArray(media.state?.sourceFrames) ? media.state.sourceFrames : [])].filter(Boolean);
    // f.im TOP1 native JW and TOP2 Art iframe share the identical HLS asset.
    // An old embed wrapper proves that content, never the requested direct
    // provider. Wait until the real local-player state replaces that lineage.
    if (/^(?:m3u8|hls|mp4)$/i.test(choice.kind || '') && frames.some((value) => {
      const frame = sites.url(value);
      return frame && (sites.embedHosts.has(frame.hostname) || sites.isMotchill(frame.hostname) && /^\/embed\//.test(frame.pathname));
    })) return false;
    const actual = [media.state?.mediaSource, media.state?.mediaId, media.currentSrc, media.src, ...frames].filter(Boolean);
    return actual.some((value) => sites.mediaSourceMatches(value, choice.source));
  }
  function prepareMedia(video) {
    if (!video || video.closest('.jw-flag-ads,[data-ad]')) return;
    video.muted = true; video.defaultMuted = true; video.preload = 'auto';
    if (video.readyState >= 2 && Number.isFinite(video.duration) && video.duration > 0) {
      if (!video.paused) video.pause();
      return;
    }
    // Captured phimapi JW source: /player/assets/index-DS8v-7ZN.js sets a
    // playlist and provider preload; playing through JW initializes its media.
    // Pausing its first `play` synchronously prevents metadata/buffering.
    const root = video.closest('.jwplayer');
    let player, jwReady = false;
    try {
      if (root?.id && typeof window.jwplayer === 'function') player = window.jwplayer(root.id);
      jwReady = player && typeof player.getState === 'function' && player.getState()
        && typeof player.setMute === 'function' && typeof player.play === 'function';
    } catch (_) {}
    if (!jwReady && !(video.currentSrc || video.src || video.querySelector('source[src]'))) return;
    const identity = video.currentSrc || video.src || root?.id || '';
    const previous = warmups.get(video);
    if (previous?.identity === identity && (previous.attempts >= 3 || Date.now() - previous.at < 2000)) return;
    const attempts = previous?.identity === identity ? previous.attempts + 1 : 1;
    warmups.set(video, { identity, attempts, at: Date.now() });
    try {
      if (jwReady) { player.setMute(true); player.play(true)?.catch?.(() => {}); }
      else video.play()?.catch(() => {});
    } catch (_) { /* bounded preparation timeout reports unavailable media */ }
  }
  return { serverChoices, chosenServer, serverContainer, selectServer, canLock, prepareMedia, sourceProven };
}


// ---- lib/player-controller.js ----
// Keep the original per-origin mc-marks intro data and silent learning.
// Only the top document stores marks; children report genuine user seeks via
// the authenticated video bridge, never read/write a second marks database.
function createMotchillPlayerLearning(sites, getPage, options = {}) {
  const owner = window.top === window;
  let inputAt = -Infinity, ignoredSeek = null, userSeek = null, serial = 0;
  let context = '', media = null, source = '', intro = null, introTimer = null;
  const identity = (page = getPage()) => [page?.url, page?.film, page?.episodeKey, page?.language].join('|');
  const mediaSource = (value) => value?.state?.mediaId || value?.currentSrc || value?.src || '';
  function readMarks() {
    try {
      const marks = JSON.parse(localStorage.getItem('mc-marks') || '{}');
      return marks && typeof marks === 'object' && !Array.isArray(marks) ? marks : null;
    } catch (_) { return null; }
  }
  function filmMarks() {
    const page = getPage(), marks = owner && readMarks();
    if (!marks || !page) return {};
    for (const film of [page.film, page.slug]) {
      const value = film && Object.hasOwn(marks, film) && marks[film];
      if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    }
    return {};
  }
  function saveMark(key, value) {
    const film = getPage()?.film;
    if (!owner || !film) return;
    const marks = readMarks();
    if (!marks) return; // Never replace unreadable storage with an empty object.
    marks[film] = { ...filmMarks(), [key]: value };
    try { localStorage.setItem('mc-marks', JSON.stringify(marks)); } catch (_) {}
  }
  function introEnd() {
    const value = filmMarks().intro;
    return Number.isFinite(value) && value >= 10 && value <= 300 ? value : 90;
  }
  function cancelIntro() { clearTimeout(introTimer); introTimer = null; intro = null; }
  function poll(value, key) {
    const currentSource = mediaSource(value);
    if (context !== key || media !== value || source !== currentSource || value?.isConnected === false
      || value?.frame && !value.frame.isConnected || value?.state?.ad || value?.closest?.('.jw-flag-ads,[data-ad]') || sites.isPrepared(value)) cancelIntro();
    context = key; media = value; source = currentSource;
    if (!intro) return;
    const seek = value?.frame ? value.state?.userSeek : userSeek;
    if (!seek || !Number.isFinite(seek.at) || !Number.isFinite(seek.position) || !Number.isSafeInteger(seek.serial)
      || seek.at < intro.startedAt || seek.at > Date.now() || seek.at > intro.until
      || seek.mediaId !== currentSource
      || seek.position < 10 || seek.position > 300 || value?.state?.ad || sites.isPrepared(value)) return;
    const stamp = [seek.at, seek.serial, seek.mediaId].join('|');
    if (stamp === intro.seen) return;
    intro.seen = stamp; intro.corrected = Math.round(seek.position);
  }
  function skipIntro(value, key) {
    poll(value, key); cancelIntro();
    const target = Math.min(introEnd(), Math.max(0, value.duration - .1));
    const startedAt = Date.now();
    intro = { startedAt, until: startedAt + 15000, page: identity(), seen: '', corrected: null };
    // Ignore an earlier seek reported at the same millisecond as this click.
    const previous = value?.frame ? value.state?.userSeek : userSeek;
    if (previous) intro.seen = [previous.at, previous.serial, previous.mediaId].join('|');
    ignoredSeek = target; value.currentTime = target;
    introTimer = setTimeout(() => {
      poll(media, context);
      const result = intro;
      if (result && result.page === identity() && Number.isFinite(result.corrected)) saveMark('intro', result.corrected);
      cancelIntro();
    }, 15000);
  }
  for (const event of ['pointerdown', 'pointerup', 'keydown']) addEventListener(event, () => { inputAt = Date.now(); }, true);
  document.addEventListener('seeking', (event) => {
    const video = event.target;
    if (video?.tagName !== 'VIDEO' || video !== sites.findVideo() || options.isCurrent?.() === false) return;
    if (ignoredSeek !== null && Math.abs(video.currentTime - ignoredSeek) < .5) { ignoredSeek = null; return; }
    ignoredSeek = null;
    if (Date.now() - inputAt > 2000 || !Number.isFinite(video.duration) || video.duration < 600
      || video.closest('.jw-flag-ads,[data-ad]') || sites.isPrepared(video)) return;
    userSeek = { at: Date.now(), serial: ++serial, position: video.currentTime, mediaId: mediaSource(video) };
    if (owner) poll(video, context);
  }, true);
  for (const event of ['loadstart', 'emptied']) document.addEventListener(event, (e) => {
    if (e.target === media) cancelIntro();
    userSeek = null;
  }, true);
  for (const event of ['mc-before-server-change', 'mc-episode-changed']) document.addEventListener(event, cancelIntro);
  addEventListener('pagehide', cancelIntro);
  return { introEnd, skipIntro, poll, cancelIntro,
    ignoreSeek: (position) => { ignoredSeek = position; }, get userSeek() { return userSeek; } };
}

// Điều khiển chung; website adapter chọn tập, player bridge xử lý native/JW/iframe.
function startMotchillPlayerController(sites) {
  const channel = 'motchill-player-controls-v2';
  let learning,customUI=null,nativeNavigation=null;
  const bridge = createMotchillVideoBridge(sites, channel, { includePrepared: true,
    introSeconds:()=>learning?.introEnd(),userSeek: () => learning?.userSeek, beforeSeek: (position) => learning?.ignoreSeek(position),
    customState: video=>customUI?.localState(video),selectTrack:(video,group,id)=>customUI?.commandTrack(video,group,id),
    onNext:()=>nativeNavigation?.active?nativeNavigation.goNext():goNext('manual'),playAudible:video=>customUI?.playAudible(video),restoreAudio:(video,value)=>customUI?.restoreAudio(video,value) });
  const players = createMotchillPlayerAdapters(sites);
  const supported = () => {
    switch (sites.detect()) {
      case sites.families.CLASSIC: // https://motchillsa.com/ (mẫu cũ)
      case sites.families.OPHIM: // https://motchillcu.mx/, https://motchillt.si/
      case sites.families.NEXT: // https://motchille.com.mx/
      case sites.families.NEXT_REVIVE: // https://motchill68.tv/xem-phim/thuong-cong-chua
      case sites.families.APIPHIM: // https://motchill.garden/
      case sites.families.DOO: // https://motchillkd.net/
      case sites.families.MYUI: // https://motchillv.fun/
      case sites.families.WRAPPER: return true;
      default: {
        if (window.top === window) return false;
        if (sites.embedHosts.has(location.hostname)) return true;
        // Captured Revive source: a.motchill68.tv/embed/4/274183. Accept a
        // video-bearing Motchill embed only under a Motchill parent. Its
        // strict-origin-when-cross-origin policy can redact the watch path.
        const parent = sites.url(document.referrer);
        return sites.isMotchill(location.hostname) && /^\/embed\/[^/]+\/[^/]+/.test(location.pathname)
          && !!document.querySelector('video,.jwplayer') && parent && sites.isMotchill(parent.hostname)
          && (parent.pathname === '/' || /^\/(?:xem-phim|phim|play)\//.test(parent.pathname));
      }
    }
  };
  let shell = null, stage = null, baseHost = null, currentFrame = null, currentPage = null;
  let media = null, action = null, status = null, retry = null, back = null;
  let held = null, timer = null, down = null, lastTap = null, tipTimer = null, holdTip = null;
  let originalRate = 1, focusHost = null, lastActionAt = 0;
  let selectedServerKey = '', selectionVersion = 0, transitionTarget = null, lastPageIdentity = '';
  let retryAction = null;
  let lockButton = null, locked = false;
  let lockIconTimer = null, lockHintTimer = null;
  let fullscreenPlayer = null, restoreShell = null, restoreLocked = false, lastReturn = 0;
  let initialNodes = [];
  const svg = (paths, size = 16) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const icons = {
    back: svg('<path d="M11 7l-5 5 5 5"/><path d="M17 7l-5 5 5 5"/>'),
    forward: svg('<path d="M7 7l5 5-5 5"/><path d="M13 7l5 5-5 5"/>'),
    next: svg('<path d="M6 6l9 6-9 6z"/><path d="M18 6v12"/>'),
    triangle: '<svg viewBox="0 0 10 12" width="9" height="12" aria-hidden="true"><path d="M0 0L10 6L0 12z" fill="currentColor"/></svg>',
  };
  const getDocument = () => {
    try { return currentFrame?.contentDocument || document; } catch (_) { return document; }
  };
  const getPage = () => currentFrame ? bridge.getFrame(currentFrame)?.state?.page || currentPage : sites.adapter().read() || bridge.state()?.page || bridge.parentContext;
  learning = createMotchillPlayerLearning(sites, getPage, { isCurrent: () => bridge.role !== 'prepared' });
  customUI=typeof createMotchillCustomPlayer==='function'?createMotchillCustomPlayer(sites,bridge,{
    onNativeIntro:video=>learning.skipIntro(video,contextKey()),introSeconds:()=>learning.introEnd(),onIntro:()=>learning.skipIntro(media,contextKey()),
    onNext:()=>goNext('manual'),serverKey:()=>nativeNavigation?.active?activePage()?.server:selectedServerKey,
    isFullscreen:()=>document.fullscreenElement===(nativeNavigation?.active?nativeNavigation.shell:shell) && !!document.fullscreenElement,onFullscreen:()=>toggleFullscreen(),
  }):null;
  customUI?.guard();
  const fullscreenManager=typeof SharedPlayer!=='undefined'?SharedPlayer.fullscreenController(window,{onChange:()=>customUI?.refresh()}):null;
  const style = document.createElement('style');
  style.dataset.mcPlayerStyle = '2';
  style.textContent = `
    .mc-shell{position:relative!important;isolation:isolate;background:#000;min-height:180px;aspect-ratio:16/9;width:100%;overflow:hidden}
    .mc-shell:fullscreen{width:100vw!important;height:100vh!important;aspect-ratio:auto}
    .mc-shell:not(.mc-shell-page)>.mc-media-host,.mc-player-stage>iframe[data-mc-managed]{width:100%!important;height:100%!important;position:absolute!important;inset:0!important;border:0!important}
    .mc-shell video{max-width:100%;max-height:100%}
    .mc-shell,.jwplayer,#player-wrap,.plyr,.video-js,.art-video-player{touch-action:manipulation;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
    .jwplayer .jw-display-icon-rewind,.jwplayer .jw-display-icon-next{display:none!important}
    .mc-player-stage{position:absolute;inset:0;pointer-events:none}
    .mc-player-stage>iframe:not(.mc-prepared),.mc-player-stage>button,.mc-player-stage>.mc-gesture-surface{pointer-events:auto}
    .mc-player-stage>.mc-prepared{position:fixed!important;left:-10000px!important;top:0!important;width:640px!important;height:360px!important;opacity:0!important;pointer-events:none!important}
    .mc-shell.mc-shell-page{isolation:auto;background:transparent;min-height:0;aspect-ratio:auto;overflow:visible}
    .mc-shell-page>.mc-player-stage{inset:auto}
    .mc-shell-page:fullscreen{background:#000}
    .mc-shell-page:fullscreen>.mc-player-stage,.mc-shell-page:fullscreen>.mc-media-host{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;margin:0!important}
    .mc-shell-page:fullscreen>:not(.mc-player-stage):not(.mc-media-host):not(script):not(style){display:none!important}
    .mc-player-ui{position:absolute!important;z-index:2147483000!important;color:#fff!important;font:500 14px sans-serif!important}
    button.mc-player-ui{border:.5px solid rgba(255,255,255,.28)!important;border-radius:999px!important;background:rgba(255,255,255,.12)!important;backdrop-filter:blur(10px) saturate(140%);-webkit-backdrop-filter:blur(10px) saturate(140%);padding:6px 14px!important;cursor:pointer!important;touch-action:manipulation}
    .mc-next-action{right:16px;bottom:64px;display:flex;align-items:center;gap:6px;white-space:nowrap;animation:mc-pop-in .25s ease-out}
    button.mc-player-lock{left:48px;top:50%;width:48px;height:48px;padding:0!important;display:flex;align-items:center;justify-content:center;border-radius:50%!important;transform:translateY(-50%);opacity:0;pointer-events:none;transition:opacity .2s}
    .mc-player-lock svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    button.mc-player-lock{background:rgba(0,0,0,.3)!important;border:.5px solid rgba(255,255,255,.35)!important;backdrop-filter:none;-webkit-backdrop-filter:none}
    .mc-player-lock.mc-lock-visible{opacity:1;pointer-events:auto}
    .mc-locked .jw-controls,.mc-locked .jw-controlbar,.mc-locked .jw-settings-menu,.mc-locked .jw-icon-display{display:none!important}
    .mc-locked .mc-gesture-surface{inset:0!important}
    .mc-player-status{left:12px;right:12px;top:58px;padding:8px;background:#151515dd;border-radius:6px;pointer-events:none}
    .mc-player-retry{left:12px;top:112px}.mc-player-back{left:110px;top:112px}
    .mc-player-tip{transform:translate(-50%,-50%);display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.12);backdrop-filter:blur(10px) saturate(140%);-webkit-backdrop-filter:blur(10px) saturate(140%);border:.5px solid rgba(255,255,255,.28);white-space:nowrap;pointer-events:none;transition:opacity .2s}
    .mc-player-tip.mc-skip.mc-tip-on{animation:mc-pop .25s ease-out}
    .mc-player-tip.mc-forward.mc-tip-on svg{animation:mc-nudge-right .35s ease-out}
    .mc-player-tip.mc-back.mc-tip-on svg{animation:mc-nudge-left .35s ease-out}
    .mc-chevrons{display:flex}.mc-chevrons svg{margin-left:-1px;opacity:.3;animation:mc-run 1s ease-in-out infinite}
    .mc-chevrons svg:nth-child(2){animation-delay:.15s}.mc-chevrons svg:nth-child(3){animation-delay:.3s}
    @keyframes mc-pop-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    @keyframes mc-pop{from{transform:translate(-50%,-50%) scale(.85)}60%{transform:translate(-50%,-50%) scale(1.04)}to{transform:translate(-50%,-50%) scale(1)}}
    @keyframes mc-nudge-right{from{transform:translateX(-4px);opacity:.3}to{transform:none;opacity:1}}@keyframes mc-nudge-left{from{transform:translateX(4px);opacity:.3}to{transform:none;opacity:1}}
    @keyframes mc-run{0%,100%{opacity:.3;transform:translateX(0)}35%{opacity:1;transform:translateX(2px)}}
    .mc-gesture-surface{position:absolute;inset:48px 0 62px;z-index:2147482999;touch-action:manipulation;background:transparent}
    .mc-player-ui[hidden],.mc-gesture-surface[hidden]{display:none!important}
    .mc-player-stage[data-mc-custom="1"]>.mc-next-action,.mc-player-stage[data-mc-custom="1"]>.mc-player-lock,.mc-player-stage[data-mc-custom="1"]>.mc-gesture-surface{display:none!important}
    html.mc-managed-page,html.mc-managed-page body{margin:0!important;padding:0!important;width:100%!important;height:100%!important;overflow:hidden!important;background:#000!important}
    .mc-managed-path{display:block!important;position:static!important;padding:0!important;margin:0!important;width:100%!important;height:100%!important;min-height:0!important;max-width:none!important}
    .mc-managed-path>:not(.mc-managed-path):not(.mc-managed-target):not(script):not(style){display:none!important}
    .mc-managed-target{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;margin:0!important;z-index:100!important}
  `;
  function ensureStyle() { if (!style.isConnected) (document.head || document.documentElement).append(style); }
  const wait = (predicate, signal) => new Promise((resolve, reject) => {
    let id, settled = false;
    const finish = (fn, value) => { if (settled) return; settled = true; clearInterval(id); signal?.removeEventListener('abort', abort); fn(value); };
    const abort = () => finish(reject, Object.assign(new Error('Đã hủy tải tập'), { name: 'AbortError' }));
    const check = () => {
      if (settled) return;
      if (signal?.aborted) return abort();
      try { const value = predicate(); if (value) finish(resolve, value); } catch (e) { finish(reject, e); }
    };
    signal?.addEventListener('abort', abort, { once: true });
    id = setInterval(check, 100); check();
  });
  const activePage = getPage;
  function tell(text, keep = false, options = {}) {
    // Child gestures run on the real player, without a parent shell/stage.
    // Restore the same feedback inside that verified native container.
    const host = shell ? stage : sites.findVideo()?.closest('.jwplayer,#player-wrap,.plyr,.video-js,.art-video-player');
    if (!host) return;
    let tip = host.querySelector('.mc-player-tip');
    if (!tip) { tip = document.createElement('div'); tip.className = 'mc-player-ui mc-player-tip'; host.append(tip); }
    tip.className = 'mc-player-ui mc-player-tip ' + (options.kind || '');
    tip.style.left = options.left || '50%'; tip.style.top = options.top || '50%';
    tip.textContent = text;
    if (options.icon) tip.insertAdjacentHTML(options.before ? 'afterbegin' : 'beforeend', options.icon);
    tip.hidden = false; void tip.offsetWidth; tip.classList.add('mc-tip-on');
    clearTimeout(tipTimer); if (!keep) tipTimer = setTimeout(() => { tip.hidden = true; }, 700);
    return tip;
  }
  function stopHold() {
    clearTimeout(timer); timer = null;
    if (held) {
      held.playbackRate = originalRate; held = null;
      if (holdTip?.classList.contains('mc-fast')) holdTip.hidden = true;
      holdTip = null;
    }
  }
  function wireGestures(target, getMedia) {
    if (target.dataset.mcGesturesBound) return;
    target.dataset.mcGesturesBound = '1';
    let blockFollow = false, gestureTarget = null, pressedButton = null;
    const stop = (e) => { e.preventDefault(); e.stopImmediatePropagation(); };
    for (const event of ['touchstart', 'touchend', 'mousedown', 'mouseup', 'click', 'dblclick']) target.addEventListener(event, (e) => {
      const button = e.target.closest?.('.mc-player-ui');
      if (button && !blockFollow) {
        // A native tap may reveal the lock under the lifting finger. Only a
        // real press which started on that button may activate it.
        if (e.type === 'click' && e.detail > 0 && pressedButton !== button) stop(e);
        return;
      }
      if (locked || e.target.closest?.('.mc-gesture-surface') || blockFollow && (e.target === gestureTarget || gestureTarget?.contains?.(e.target))) stop(e);
    }, { capture: true, passive: false });
    const control = (e) => e.target.closest?.('[data-rp-ui],button,a,input,select,textarea,.jw-controlbar,.jw-settings-menu,.jw-plugin,.jw-rightclick,.jw-info-overlay,.jw-shortcuts-tooltip,#controls,[data-plyr],.vjs-control-bar,.art-bottom,.art-controls,.art-progress,.art-control,.art-settings,.art-contextmenus,.mc-player-ui');
    target.addEventListener('pointerdown', (e) => {
      const elapsed = lastTap ? Date.now() - lastTap.at : Infinity;
      const repeat = lastTap?.target === target && elapsed >= 0 && elapsed <= 300;
      if (e.button > 0 || e.isPrimary === false) return;
      pressedButton = e.target.closest?.('.mc-player-ui');
      if (pressedButton && !repeat) { blockFollow = false; return; }
      if (control(e) && !repeat && !locked) { blockFollow = false; return; }
      gestureTarget = e.target;
      stopHold();
      const video = getMedia(); if (!video) return;
      const restore = restoreShell === shell && !!shell;
      blockFollow = !!repeat || locked || restore;
      down = { pointer: e.pointerId, x: e.clientX, y: e.clientY, at: Date.now(), target, held: false, repeat, restore };
      if (blockFollow) stop(e);
      if (repeat || restore) return;
      timer = setTimeout(() => {
        if (!down || video.paused) return;
        down.held = true; held = video; originalRate = video.playbackRate || 1;
        blockFollow = true;
        video.playbackRate = 2; holdTip = tell('2x', true, { kind: 'mc-fast', left: '50%', top: '12%', icon: '<span class="mc-chevrons">' + icons.triangle.repeat(3) + '</span>' });
      }, 450);
    }, true);
    target.addEventListener('pointerup', (e) => {
      if (!down || down.pointer !== e.pointerId || down.target !== target) return;
      const press = down; down = null; stopHold();
      if (press.held) { stop(e); lastTap = null; return; }
      if (press.restore) { stop(e); lastTap = null; requestRestore(); return; }
      if (press.repeat) {
        clearTimeout(lockHintTimer);
        const bounds = (e.target.closest?.('.mc-gesture-surface') || target).getBoundingClientRect();
        const fraction = (e.clientX - bounds.left) / bounds.width;
        const side = fraction < .4 ? -1 : fraction > .6 ? 1 : 0;
        const video = getMedia();
        if (side && video && Number.isFinite(video.duration)) {
          video.currentTime = Math.max(0, Math.min(video.duration - .1, video.currentTime + side * 10));
          tell('10s', false, { kind: 'mc-skip ' + (side > 0 ? 'mc-forward' : 'mc-back'), left: side > 0 ? '78%' : '22%', top: '40%', icon: side > 0 ? icons.forward : icons.back, before: side < 0 });
        }
        stop(e);
      } else {
        if (locked) { stop(e); clearTimeout(lockHintTimer); lockHintTimer = setTimeout(toggleLockIcon, 300); }
        else if (e.target.closest?.('.mc-gesture-surface')) getMedia()?.command?.('reveal-controls');
      }
      lastTap = { target, at: Date.now() };
    }, true);
    target.addEventListener('pointercancel', () => { down = null; stopHold(); }, true);
    target.addEventListener('dblclick', (e) => { if (!control(e)) stop(e); }, true);
    target.addEventListener('contextmenu', (e) => { if (!control(e)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  }
  function playIfPaused() { if (media?.paused) media.play()?.catch(() => {}); }
  function clearRestore(restored) {
    if (restored === restoreShell && restoreLocked) { locked = true; shell?.classList.add('mc-locked'); showLockIcon(); }
    if (restoreShell) { const tip = stage?.querySelector('.mc-player-tip'); if (tip) tip.hidden = true; }
    restoreShell = null; restoreLocked = false;
  }
  function requestRestore() {
    if (!restoreShell?.isConnected) return clearRestore();
    playIfPaused(); const previous = restoreShell;
    previous.requestFullscreen?.().then(() => { if (document.fullscreenElement === previous) clearRestore(previous); }, () => {});
  }
  function tryRestore() {
    if (restoreShell && !document.hidden && document.hasFocus() && !document.fullscreenElement) requestRestore();
  }
  // Mouse pointers do not receive touch's implicit capture. Release outside
  // the player must still end a hold, while releases inside continue through
  // the normal gesture handler (including native first-tap pass-through).
  for (const event of ['pointerup', 'pointercancel']) addEventListener(event, (e) => {
    if (!down || e.pointerId !== down.pointer) return;
    if (event === 'pointerup' && down.target.contains(e.target)) return;
    down = null; lastTap = null; stopHold();
  }, true);
  addEventListener('blur', () => { lastReturn = 0; down = null; stopHold(); });
  addEventListener('focus', () => { lastReturn = Date.now(); tryRestore(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { lastReturn = 0; down = null; stopHold(); }
    else { lastReturn = Date.now(); tryRestore(); }
  });
  document.addEventListener('fullscreenchange', () => {
    if(customUI){customUI.refresh();locked=false;shell?.classList.remove('mc-locked');if(lockButton)lockButton.hidden=true;down=null;stopHold();return;}
    if (document.fullscreenElement === shell && shell) { clearRestore(shell); fullscreenPlayer = shell; playIfPaused(); updateLockUI(); return; }
    if (!document.fullscreenElement && fullscreenPlayer) {
      const previous = fullscreenPlayer; fullscreenPlayer = null;
      if (previous.isConnected && (document.hidden || !document.hasFocus() || Date.now() - lastReturn < 3000)) {
        restoreShell = previous; restoreLocked = locked; lastTap = null;
        tell('Chạm để xem toàn màn hình', true); tryRestore();
      }
    }
    locked = false; shell?.classList.remove('mc-locked');
    if (lockButton) lockButton.hidden = true;
    down = null; stopHold();
  });
  function updateLockUI() {
    if (!lockButton || !shell) return;
    const native = shell.matches('.jwplayer') ? shell : getDocument().querySelector('.jwplayer');
    const visible = locked ? shell.classList.contains('mc-show-lock') : native && (!native.classList.contains('jw-flag-user-inactive') || native.classList.contains('jw-state-paused'));
    lockButton.classList.toggle('mc-lock-visible', !!visible);
    lockButton.setAttribute('aria-label', locked ? 'Mở khóa màn hình' : 'Khóa màn hình');
    lockButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/>'
      + (locked ? '<path d="M8 11V7a4 4 0 0 1 8 0v4"/>' : '<path d="M8 11V7a4 4 0 0 1 7.5-2"/>') + '</svg>';
  }
  function showLockIcon() {
    shell?.classList.add('mc-show-lock'); updateLockUI(); clearTimeout(lockIconTimer);
    lockIconTimer = setTimeout(() => { shell?.classList.remove('mc-show-lock'); updateLockUI(); }, 2500);
  }
  function toggleLockIcon() {
    if (shell?.classList.contains('mc-show-lock')) { clearTimeout(lockIconTimer); shell.classList.remove('mc-show-lock'); updateLockUI(); }
    else showLockIcon();
  }
  function childMode() {
    customUI?.guard();
    const local = sites.findVideo();
    if(customUI?.nativeRoot){
      if(local && bridge.role==='prepared')players.prepareMedia(local);
      if(local)customUI.enhanceLocal(local);bridge.setNativeGestures?.(false);return;
    }
    const frame = bridge.remote?.frame || sites.playerFrames()[0];
    if (bridge.managed) {
      if (local && bridge.role === 'prepared') {
        // Allow muted provider initialization; stop after real first-frame
        // readiness. Pausing on its very first play can prevent buffering.
        players.prepareMedia(local);
      }
      // Revive's native video has its own sibling control bar in #player-wrap.
      // Keep that real player container visible when isolating a managed page.
      const nativeWrap = local?.matches('#video') && local.closest('#player-wrap')?.querySelector('#controls #fs-btn') ? local.closest('#player-wrap') : null;
      const host = local?.closest('.jwplayer,.art-video-player') || nativeWrap || local || frame;
      if (host && focusHost !== host) {
        document.querySelectorAll('.mc-managed-target,.mc-managed-path').forEach((el) => el.classList.remove('mc-managed-target', 'mc-managed-path'));
        focusHost = host; host.classList.add('mc-managed-target');
        for (let node = host.parentElement; node; node = node.parentElement) node.classList.add('mc-managed-path');
        document.documentElement.classList.add('mc-managed-page');
      }
    }
    // The child's real DOM owns its controls and coordinates. Parent overlays
    // cannot know where a letterboxed iframe puts its controls in fullscreen.
    // Delegate gestures here, including managed episodes, and tell the parent
    // to leave the real player pointer surface uncovered.
    if (local && bridge.role !== 'prepared') {
      wireGestures(local.closest('.jwplayer,#player-wrap,.plyr,.video-js,.art-video-player') || local, () => sites.findVideo());
      bridge.setNativeGestures?.(true);
    } else bridge.setNativeGestures?.(false);
  }
  function button(label, className, click) {
    const node = document.createElement('button'); node.type = 'button'; node.className = 'mc-player-ui ' + className;
    node.textContent = label; node.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); click(); });
    stage.append(node); return node;
  }
  function toggleFullscreen() {
    if(nativeNavigation?.active)return nativeNavigation.toggleFullscreen();
    if (!shell?.isConnected) return Promise.resolve('unavailable');
    if(fullscreenManager)return fullscreenManager.toggle(shell);
    if (document.fullscreenElement) document.exitFullscreen?.();
    else shell.requestFullscreen?.().catch(() => tell('Trình duyệt chưa cho phép toàn màn hình'));
  }
  function mount(video) {
    const host = video?.frame || video?.closest?.('.jwplayer,.art-video-player') || video;
    if (!host?.parentElement || host.closest('.mc-shell')) return;
    // Reparenting a loaded iframe recreates its browsing context. Adopt its
    // existing wrapper (or JW root) so current playback and bridge nonce survive.
    if (host.matches?.('.jwplayer,.art-video-player') || host.tagName === 'IFRAME' || host.querySelector?.('iframe')) {
      shell = host.matches?.('.jwplayer,.art-video-player') ? host : host.parentElement;
      shell.classList.add('mc-shell');
      baseHost = host === shell ? null : host;
      // A bare iframe can live beside episode links/servers in main/body. Keep
      // its browsing context in place, but do not give the whole page a video
      // aspect ratio, overflow clipping, or retire its unrelated content.
      const hasFlowContent = [...shell.children].some((node) => node !== host
        && !/^(SCRIPT|STYLE)$/.test(node.tagName) && !node.matches('.rp-watch-loading')
        && !['absolute', 'fixed'].includes(getComputedStyle(node).position));
      // Poster/spinner overlays (including our loading panel) are siblings of
      // the absolute iframe in a media-only ratio wrapper. Treating that wrapper
      // as a page removes its aspect ratio and collapses every child to 0px.
      if (baseHost && (/^(HTML|BODY|MAIN)$/.test(shell.tagName) || hasFlowContent)) shell.classList.add('mc-shell-page');
    } else {
      shell = document.createElement('div'); shell.className = 'mc-shell';
      host.before(shell); shell.append(host); baseHost = host;
    }
    initialNodes = shell.classList.contains('mc-shell-page') ? [host] : [...shell.children].filter((node) => !/^(SCRIPT|STYLE)$/.test(node.tagName));
    if (baseHost) baseHost.classList.add('mc-media-host');
    stage = document.createElement('div'); stage.className = 'mc-player-stage'; shell.append(stage);
    positionStage();
    action = button('Tập tiếp theo', 'mc-next-action', () => {
      if (Date.now() - lastActionAt < 600 || action.hidden || action.disabled) return;
      lastActionAt = Date.now();
      if (action.dataset.action === 'intro' && media) { learning.skipIntro(media, contextKey()); tell('Đã bỏ qua giới thiệu'); }
      else if (action.dataset.action === 'next' && !action.hidden) goNext('manual');
    });
    action.hidden = true;
    lockButton = button('', 'mc-player-lock', () => {
      down = null; stopHold();
      locked = !locked; shell.classList.toggle('mc-locked', locked);
      if (locked) showLockIcon(); else { clearTimeout(lockIconTimer); shell.classList.remove('mc-show-lock'); updateLockUI(); }
    });
    lockButton.hidden = true;
    status = document.createElement('div'); status.className = 'mc-player-ui mc-player-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.hidden = true; stage.append(status);
    retry = button('Thử lại', 'mc-player-retry', () => retryAction ? retryAction() : machine.go('manual'));
    back = button('Ở lại tập này', 'mc-player-back', () => {
      machine.cancel(); transitionTarget = null; selectionVersion++;
      restoringServer = null; retryAction = null;
      // Không tự thử ngay ở tick sau: người dùng đã chọn ở lại.
      autoSuppressed = true; showState({ phase: 'idle' });
    });
    retry.hidden = back.hidden = true;
    const surface = document.createElement('div'); surface.className = 'mc-gesture-surface'; stage.append(surface);
    wireGestures(shell, () => media);
    // Chặn riêng nút fullscreen để browser fullscreen thuộc shell ổn định.
    shell.addEventListener('click', (e) => {
      if (!e.target.closest?.('.jw-icon-fullscreen,.art-control-fullscreen')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      toggleFullscreen();
    }, true);
  }
  function positionStage() {
    if (!stage || !baseHost || !shell?.classList.contains('mc-shell-page') || document.fullscreenElement === shell) return;
    // Preserve the last visible player slot after commit, when the original
    // iframe is retired. Its hidden box must not collapse the replacement.
    if (baseHost.hidden) return;
    const mediaBox = baseHost.getBoundingClientRect(), shellBox = shell.getBoundingClientRect();
    stage.style.left = (mediaBox.left - shellBox.left + shell.scrollLeft - shell.clientLeft) + 'px';
    stage.style.top = (mediaBox.top - shellBox.top + shell.scrollTop - shell.clientTop) + 'px';
    stage.style.width = mediaBox.width + 'px'; stage.style.height = mediaBox.height + 'px';
  }
  function showState(value) {
    if (!status) return;
    const waiting = ['switching', 'refreshing'].includes(value.phase);
    status.textContent = value.message || ''; status.hidden = customUI?.active && waiting || !waiting && value.phase !== 'error';
    retry.hidden = back.hidden = value.phase !== 'error';
    if (waiting) { action.hidden = false; action.disabled = true; action.textContent = value.message; }
    else action.disabled = false;
  }
  let rollbackMedia = null, rollbackMuted = false, rollbackPaused = true;
  let autoSuppressed = false;
  function contextKey(info = activePage()) {
    return [info?.url, info?.language, selectedServerKey, selectionVersion].join('|');
  }
  function goNext(reason) {
    if(nativeNavigation?.active)return nativeNavigation.goNext(reason);
    if (!activePage()?.next) return Promise.resolve(false);
    learning.cancelIntro();
    retryAction = null;
    transitionTarget = null;
    machine.reset(contextKey(), activePage().next);
    return machine.go(reason);
  }
  function transitionTo(target, reason = 'manual') {
    if(nativeNavigation?.active)return nativeNavigation.transitionTo(target,reason);
    if (!target?.url || machine.busy) return Promise.resolve(false);
    learning.cancelIntro();
    retryAction = null;
    selectionVersion++;
    transitionTarget = target;
    machine.reset(contextKey(), target);
    return machine.go(reason);
  }
  function switchTarget(target, options = {}) {
    return transitionTo({ ...target, resume: options.resume || target.resume,
      serverKey: options.serverKey || target.serverKey || '', intent: options.reason || 'translation' }, options.reason || 'translation');
  }
  // Thay các link tập thật sau khi chuyển trang trong iframe, giữ nguyên route
  // lấy từ website. Không sao chép inline handlers vào DOM ngoài.
  function syncOuterControls(doc, page) {
    const childFamily = sites.detect(doc, page.url);
    const source = players.serverContainer(doc, childFamily);
    const outer = players.serverContainer(document);
    if (source && outer && source !== outer) {
      outer.dataset.mcServerContainer = childFamily;
      const originals = players.serverChoices(document, childFamily), used = new Set();
      let previous = null;
      for (const choice of players.serverChoices(doc, childFamily)) {
        const original = originals.find((item) => !used.has(item) && item.key === choice.key)
          || originals.find((item) => !used.has(item) && item.label === choice.label);
        // Preserve the website's button markup, icons and grouping. Clone only
        // the individual control to drop stale listeners from the old episode.
        const node = (original?.label === choice.label ? original.node : choice.node).cloneNode(true);
        for (const el of [node, ...node.querySelectorAll('*')]) {
          for (const attr of [...el.attributes]) if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
        }
        node.className = choice.node.className;
        for (const attr of [...choice.node.attributes]) if (attr.name.startsWith('data-')) node.setAttribute(attr.name, attr.value);
        node.dataset.mcServerKey = choice.key; node.setAttribute('aria-pressed', String(choice.selected));
        if (choice.node.hasAttribute('aria-selected')) node.setAttribute('aria-selected', String(choice.selected));
        if (original) { used.add(original); original.node.replaceWith(node); }
        else if (previous) previous.after(node);
        else outer.append(node);
        previous = node;
      }
      for (const item of originals) if (!used.has(item)) item.node.remove();
    }
    const selector = sites.adapter(childFamily, doc, page.url).episodes;
    if (selector) {
      const selectedRoute = sites.route(page.url, childFamily);
      const original = [...document.querySelectorAll(selector)].filter((a) => !a.closest('.mh-continue'));
      for (const link of original) {
        const parsed = sites.route(link.href, childFamily);
        if (parsed && sites.sameFilm(page, parsed)) link.classList.toggle('current', !!selectedRoute && parsed.episode === selectedRoute.episode);
      }
    }
    document.dispatchEvent(new CustomEvent('mc-player-controls-updated', { detail: page }));
  }
  function validateCandidate(candidate) {
    const current = candidate?.frame.isConnected && bridge.getFrame(candidate.frame);
    const state = current?.state;
    if (!current || current !== candidate.remote || !state?.managed || !state.page
      || !sites.sameEpisode(candidate.page, state.page)) throw new Error('Nguồn chuẩn bị đã đổi phim/tập hoặc kết nối');
    if (state.error || state.ad) throw new Error('Nguồn chuẩn bị đã lỗi hoặc đổi sang quảng cáo');
    if (candidate.serverExpectedSource && !players.sourceProven({ source: candidate.serverExpectedSource, kind: candidate.serverExpectedKind }, current)) {
      throw new Error('Nguồn chuẩn bị không còn đúng server đã chọn');
    }
    let childDoc;
    try { childDoc = candidate.frame.contentDocument; } catch (_) {}
    if (candidate.preferredServer && childDoc) {
      const selected = players.chosenServer(childDoc, sites.detect(childDoc, candidate.target.url), current);
      if (!selected || selected.key !== candidate.preferredServer) throw new Error('Server chuẩn bị đã thay đổi');
    }
    return state;
  }
  const machine = createMotchillEpisodeMachine({
    onState: showState,
    prepare: async (target, { signal, fresh }) => {
      const url = sites.url(target.url);
      if (!url || url.origin !== location.origin || !sites.route(url.href)) throw new Error('Không có đường dẫn tập hợp lệ trên web này');
      if (!shell?.isConnected) throw new Error('Khung phát đã thay đổi');
      // Cache-busting chỉ trang tập để lấy token nguồn mới; không sửa token stream.
      if (fresh) url.searchParams.set('_mc_refresh', String(Date.now()));
      const frame = document.createElement('iframe');
      frame.dataset.mcManaged = 'episode'; frame.dataset.mcRole = 'prepared'; frame.dataset.mcStartZero = '1';
      frame.className = 'mc-prepared'; frame.title = 'Chuẩn bị tập tiếp theo';
      frame.allow = 'autoplay; fullscreen; picture-in-picture'; frame.allowFullscreen = true;
      frame.src = url.href; stage.append(frame);
      const sourcePage = activePage();
      const requested = { ...sourcePage, ...target };
      const changingLanguage = target.language && sourcePage.language && target.language !== sourcePage.language;
      const preferredServer = target.serverKey || (changingLanguage ? '' : selectedServerKey
        || players.chosenServer(getDocument(), sites.detect(getDocument(), sourcePage.url), media)?.key) || '';
      const candidate = { frame, target, remote: null, page: null, activated: false, preferredServer, serverApplied: !preferredServer,
        serverFrom: null, serverExpectedSource: '', serverExpectedKind: '' };
      const abort = () => { if (!candidate.activated) frame.remove(); };
      signal.addEventListener('abort', abort, { once: true });
      try {
        await wait(() => {
          bridge.poll();
          const remote = bridge.getFrame(frame); const state = remote?.state;
          // Chọn cùng server thật trong trang kế sau hydration. Không tự rơi về
          // server mặc định khi server cũ không còn trên tập mới.
          let childDoc;
          try { childDoc = frame.contentDocument; } catch (_) { /* timeout sẽ báo nguồn chưa sẵn sàng */ }
          if (!candidate.serverApplied && childDoc && childDoc.readyState !== 'loading') {
            const family = sites.detect(childDoc, target.url);
            const choices = players.serverChoices(childDoc, family);
            if (choices.length) {
              const match = choices.find((choice) => choice.key === preferredServer);
              if (!match) throw new Error('Tập mới chưa có server đang chọn');
              candidate.serverExpectedSource = match.source || '';
              candidate.serverExpectedKind = match.kind || '';
              if (!match.selected) {
                // Observe the initial source before switching. A selected CSS
                // class can update while server 1 is still the ready media.
                if (!state?.mediaId && !match.source) return false;
                candidate.serverFrom = { remote, mediaId: state?.mediaId || '' };
                match.node.click();
              }
              candidate.serverApplied = true;
            }
          }
          if (!candidate.serverApplied) return false;
          if (candidate.serverExpectedSource && !players.sourceProven({ source: candidate.serverExpectedSource, kind: candidate.serverExpectedKind }, remote)) return false;
          // A broken default need not play before choosing a working server.
          // In that case validate the actual authenticated source lineage,
          // rather than trusting the newly selected button/iframe DOM alone.
          if (candidate.serverFrom) {
            if (!candidate.serverExpectedSource && (!candidate.serverFrom.mediaId || state?.mediaId === candidate.serverFrom.mediaId)) return false;
          }
          if (state?.error) throw new Error('Nguồn phát bị lỗi');
          if (!state?.managed || !state.page || !state.duration || state.readyState < 2 || state.ad) return false;
          if (!sites.sameEpisode(requested, state.page)) throw new Error('Nguồn chuẩn bị không khớp phim/tập/bản dịch');
          if (preferredServer && childDoc) {
            const chosen = players.chosenServer(childDoc, sites.detect(childDoc, target.url), remote);
            if (!chosen || chosen.key !== preferredServer) return false;
          }
          candidate.remote = remote; candidate.page = state.page; remote.muted = true; remote.pause();
          return true;
        }, signal);
        return candidate;
      } catch (e) { frame.remove(); throw e; }
      finally { signal.removeEventListener('abort', abort); }
    },
    activate: async (candidate, _target, { signal }) => {
      validateCandidate(candidate);
      rollbackMedia = media; rollbackMuted = !!media?.muted; rollbackPaused = media?.paused !== false;
      bridge.setRole(candidate.frame, 'current');
      candidate.remote.command('start-zero');
      await wait(() => {
        bridge.poll(); const state = validateCandidate(candidate);
        return state?.startedAtZero && !state.paused && state.readyState >= 2 && state.position < 3 && !state.ad;
      }, signal);
      let resumedTo = 0;
      const resume = candidate.target.resume;
      if (['translation', 'server'].includes(candidate.target.intent) && resume && Number.isFinite(resume.position) && resume.position > 0 && Number.isFinite(resume.duration)
        && Math.abs(candidate.remote.duration - resume.duration) <= Math.max(30, candidate.remote.duration * .03)) {
        resumedTo = Math.min(resume.position, Math.max(0, candidate.remote.duration - 1));
        candidate.remote.currentTime = resumedTo;
        await wait(() => {
          bridge.poll(); const state = validateCandidate(candidate);
          return state && Math.abs(state.position - resumedTo) < 3 && !state.paused;
        }, signal);
      }
      return { playing: true, startedAt: 0, resumedTo };
    },
    commit: (candidate, target, _result, operation) => {
      if (operation?.signal?.aborted || operation?.isCurrent && !operation.isCurrent()) throw Object.assign(new Error('Tác vụ đã thay đổi'), { name: 'AbortError' });
      validateCandidate(candidate);
      const previous = currentFrame;
      document.dispatchEvent(new Event('mc-before-server-change'));
      if (rollbackMedia) rollbackMedia.pause?.();
      for (const retired of previous ? [previous] : initialNodes) {
        retired.dataset.mcRole = 'prepared';
        if (retired === baseHost && shell.classList.contains('mc-shell-page')) {
          // Retain the original responsive slot in the document flow. Removing
          // it would pull episode/server content underneath the new player.
          retired.style.setProperty('visibility', 'hidden', 'important');
          retired.style.setProperty('pointer-events', 'none', 'important');
        } else {
          retired.hidden = true; retired.style.setProperty('display', 'none', 'important');
        }
      }
      candidate.frame.dataset.mcRole = 'current'; candidate.frame.dataset.mcPage = JSON.stringify(candidate.page);
      candidate.frame.classList.remove('mc-prepared'); candidate.activated = true;
      currentFrame = candidate.frame; currentPage = { ...candidate.page, url: target.url };
      selectedServerKey = candidate.preferredServer;
      media = candidate.remote; media.muted = rollbackMuted;
      // Đồng bộ trong lượt commit: cú click thứ hai ngay sau khi tải xong không
      // được dùng nút tập kế của tập cũ để bỏ qua thêm một tập nữa.
      action.hidden = true; action.dataset.action = ''; action.textContent = '';
      // Native history update avoids Next.js' patched pushState rerendering and
      // replacing the fullscreen shell. The live route remains inside the child.
      History.prototype.pushState.call(history, { ...history.state, mcEpisode: true }, '', target.url);
      document.title = currentPage.title + ' · ' + currentPage.episode;
      document.dispatchEvent(new CustomEvent('mc-episode-changed', { detail: currentPage }));
      syncOuterControls(getDocument(), currentPage);
      previous?.remove();
      rollbackMedia = null;
      transitionTarget = null; autoSuppressed = false;
    },
    rollback: () => {
      if (rollbackMedia) { rollbackMedia.muted = rollbackMuted; if (!rollbackPaused) rollbackMedia.play()?.catch(() => {}); }
      rollbackMedia = null;
    },
    discard: (candidate) => { if (!candidate.activated) candidate.frame?.remove(); },
  });
  function poll() {
    if (!supported()) return;
    ensureStyle();
    const found = bridge.poll();
    if (window.top !== window) { childMode(); return; }
    if(nativeNavigation?.poll())return;
    if (shell && (!shell.isConnected || !stage?.isConnected || !shell.contains(stage) || !shell.classList.contains('mc-shell'))) {
      // JW/server handlers may replace the player's innerHTML while retaining
      // its root element. A connected root alone does not mean our UI survived.
      machine.cancel(); stopHold(); locked = false;
      shell.classList.remove('mc-shell', 'mc-shell-page', 'mc-locked'); stage?.remove();
      shell = null; stage = null; baseHost = null; currentFrame = null; currentPage = null;
      selectedServerKey = ''; transitionTarget = null;
    }
    const selected = currentFrame ? bridge.getFrame(currentFrame) : found;
    if (!selected || !activePage()) {if(customUI){customUI.update(null,stage,null);if(stage)stage.dataset.mcCustom='0';}return;}
    if (media && media !== selected) stopHold();
    media = selected;
    if (!shell) mount(media);
    if (!shell) return;
    positionStage();
    if(customUI)stage.dataset.mcCustom=customUI.update(media,stage,activePage())?'1':'0';
    const lockSupported = players.canLock(getDocument(), sites.detect(getDocument(), activePage()?.url));
    if (locked && (document.fullscreenElement !== shell || !lockSupported)) {
      locked = false; shell.classList.remove('mc-locked'); stopHold();
    }
    lockButton.hidden = document.fullscreenElement !== shell || !lockSupported;
    updateLockUI();
    const info = activePage();
    const pageIdentity = [info.url, info.language].join('|');
    if (lastPageIdentity && lastPageIdentity !== pageIdentity) autoSuppressed = false;
    lastPageIdentity = pageIdentity;
    const chosen = players.chosenServer(getDocument(), sites.detect(getDocument(), info.url), media);
    if (!restoringServer && chosen && chosen.key !== selectedServerKey) { selectedServerKey = chosen.key; autoSuppressed = false; }
    // Một website có thể thay video/iframe khi đổi server. Bỏ player cũ, giữ shell
    // nếu browser đang fullscreen; không lồng thêm một shell cho mỗi lần đổi.
    if (!currentFrame && !(media.frame || media)?.closest?.('.mc-shell')) {
      const host = media.frame || media.closest?.('.jwplayer,.art-video-player') || media;
      if (host?.isConnected && host !== shell) {
        if (host.tagName === 'IFRAME' || host.querySelector?.('iframe')) {
          // Site replaced the whole wrapper; adopting the new wrapper is safer
          // than reloading its newly selected iframe merely to keep old markup.
          const oldShell = shell;
          stage?.remove();
          oldShell.classList.remove('mc-shell', 'mc-shell-page'); shell = null; stage = null; mount(media);
        } else {
          initialNodes.forEach((node) => { if (node.isConnected) node.remove(); });
          shell.prepend(host); baseHost = host; host.classList.add('mc-media-host'); initialNodes = [host];
        }
      }
    }
    const key = contextKey(info);
    learning.poll(media, key);
    const isAd = !!media.state?.ad || !!media.closest?.('.jw-flag-ads,[data-ad]');
    // JW and lazy iframe players can require their own first play click to
    // obtain a source. A transparent gesture layer must not consume that
    // initialization click and call play() on an empty video instead.
    const surface = stage?.querySelector('.mc-gesture-surface');
    const gestureReady = !isAd && Number.isFinite(media.duration) && media.duration > 0 && media.readyState >= 1;
    if (surface) surface.hidden = !gestureReady || !locked && (!media.frame || media.state?.nativeGestures === true);
    if (!gestureReady) { down = null; stopHold(); }
    if (restoringServer) return; // Không dùng thời gian/ended của server cũ để tự chuyển.
    machine.tick({ currentTime: media.currentTime, duration: media.duration, paused: media.paused || autoSuppressed, ended: media.ended && !autoSuppressed,
      ad: isAd }, key, transitionTarget || info.next);
    if (!machine.busy && machine.state.phase !== 'error') {
      const left = media.duration - media.currentTime;
      const nextVisible = !!info.next && Number.isFinite(media.duration) && media.duration > 0 && left <= 180 && left >= 0;
      const introVisible = media.currentTime < learning.introEnd() - 5 && media.duration >= 600;
      action.hidden = isAd || !nextVisible && !introVisible;
      action.dataset.action = nextVisible ? 'next' : 'intro';
      action.innerHTML = (nextVisible ? 'Tập tiếp theo ' + icons.next : 'Bỏ qua giới thiệu ' + icons.forward);
      const bar = media.closest?.('.jwplayer,.art-video-player')?.querySelector('.jw-controlbar,.art-bottom') || getDocument().querySelector('.jw-controlbar,.art-bottom');
      action.style.bottom = Math.max(64, bar ? bar.offsetHeight + 4 : 0) + 'px';
    }
  }
  // Server click được website thực hiện, controller chỉ giữ tiến độ sau khi
  // player mới sẵn sàng và thời lượng tương thích. Mirror sau chuyển tập được
  // chuyển tiếp vào nút thật trong iframe cùng origin.
  let restoringServer = null;
  const providerSignature = (value) => [value?.frame?.src || '', value?.state?.direct ? 'direct' : '', ...(value?.state?.sourceFrames || [])].join('|');
  document.addEventListener('click', (e) => {
    if(nativeNavigation?.active)return;
    const mirror = e.target.closest?.('[data-mc-server-key]');
    if (currentFrame && mirror) { e.preventDefault(); e.stopImmediatePropagation(); }
    const choice = mirror ? { key: mirror.dataset.mcServerKey } : players.serverChoices(document).find((item) => item.node === e.target || item.node.contains(e.target));
    if (!choice || !media || !activePage()) return;
    // History owns the saved target-language position for this explicit
    // restoration. Let the real site button run without a competing old-time
    // restore from the controller's independent polling interval.
    if (choice.node?.dataset.mcHistoryResume === '1' || e.target.closest?.('[data-mc-history-resume="1"]')) return;
    const current = players.chosenServer(getDocument(), sites.detect(getDocument(), activePage().url), media);
    if (!retryAction && current?.key === choice.key) return;
    document.dispatchEvent(new Event('mc-before-server-change'));
    const expected = mirror ? players.serverChoices(getDocument(), sites.detect(getDocument(), activePage().url)).find((item) => item.key === choice.key) : choice;
    restoringServer = { position: media.currentTime, duration: media.duration, until: Date.now() + 20000,
      key: choice.key, expected, provider: providerSignature(media), previous: media.state?.mediaId || media.currentSrc || media.src || media };
    machine.cancel(); selectionVersion++; transitionTarget = null; autoSuppressed = false;
    selectedServerKey = choice.key;
    const serverButton = mirror || choice.node;
    retryAction = () => serverButton?.isConnected && serverButton.click();
    showState({ phase: 'switching', message: 'Đang đổi server…' });
    if (currentFrame && mirror) {
      e.preventDefault(); e.stopImmediatePropagation();
      const selected = players.selectServer(choice.key, getDocument(), sites.detect(getDocument(), activePage().url), true);
      if (!selected) { restoringServer = null; showState({ phase: 'error', message: 'Không tìm thấy server này cho tập đang xem.' }); }
    }
  }, true);
  setInterval(() => {
    if (!restoringServer || !media) return;
    const pending = restoringServer;
    const identity = media.state?.mediaId || media.currentSrc || media.src || media;
    if (Date.now() > pending.until) { restoringServer = null; showState({ phase: 'error', message: 'Server chưa sẵn sàng. Hãy thử chọn lại server.' }); return; }
    if (identity === pending.previous && providerSignature(media) === pending.provider || media.readyState < 1 || !Number.isFinite(media.duration)) return;
    const actualMedia = media.frame ? media : { state: bridge.state(), currentSrc: media.currentSrc, src: media.src };
    if (pending.expected?.source && !players.sourceProven(pending.expected, actualMedia)) return;
    if (Math.abs(media.duration - pending.duration) <= Math.max(30, pending.duration * .03)) media.currentTime = Math.min(pending.position, Math.max(0, media.duration - 1));
    restoringServer = null; retryAction = null; showState({ phase: 'idle' });
    if (currentFrame) syncOuterControls(getDocument(), activePage());
  }, 250);
  addEventListener('popstate', () => { if (currentFrame) location.reload(); });
  addEventListener('pagehide', event => { machine.cancel(); stopHold();if(!event.persisted){customUI?.dispose();fullscreenManager?.dispose();} });
  const guardPreparedPlayback = (e) => {
    if (window.top === window || !bridge.managed || bridge.role !== 'prepared') return;
    const video = e?.target?.tagName === 'VIDEO' ? e.target : sites.findVideo();
    if (!video) return;
    if (!video.muted) video.muted = true;
    if (video.readyState >= 2 && Number.isFinite(video.duration) && video.duration > 0 && !video.paused) video.pause();
  };
  for (const event of ['play', 'playing', 'volumechange', 'loadedmetadata', 'loadeddata', 'canplay', 'timeupdate']) document.addEventListener(event, guardPreparedPlayback, true);
  document.addEventListener('mc-player-role', event=>{
    guardPreparedPlayback(event);
    if(customUI?.nativeRoot){const video=sites.findVideo();if(video)customUI.enhanceLocal(video);}
  });
  document.addEventListener('mc-reveal-controls', () => {
    const video = sites.findVideo();
    const host = video?.closest('.jwplayer,#player-wrap,.art-video-player') || video;
    if (!host) return;
    // Reveal existing controls through movement; never synthesize a play/pause
    // click on an iframe's native player as a substitute for a first tap.
    host.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    host.classList.remove('jw-flag-user-inactive', 'idle');
    if (host.matches('.art-video-player')) { host.classList.add('art-control-show'); host.classList.remove('art-hide-cursor'); }
  });
  document.addEventListener('mc-fullscreen-request', () => { if (window.top === window) toggleFullscreen(); });
  document.addEventListener('click', (e) => {
    if (window.top === window || !bridge.requestFullscreen || bridge.role === 'prepared') return;
    if (!e.target.closest?.('.jw-icon-fullscreen,[data-plyr="fullscreen"],.vjs-fullscreen-control,#player-wrap #controls #fs-btn,.art-control-fullscreen,#rp-player .item-max,#rp-player .item-min')) return;
    e.preventDefault(); e.stopImmediatePropagation(); bridge.requestFullscreen();
  }, true);
  if(typeof createMotchillNextProviderNavigation==='function' && window.top===window)nativeNavigation=createMotchillNextProviderNavigation(sites,bridge,players,fullscreenManager,{poll:(value,key)=>{media=value;learning.poll(value,key);customUI?.update(value,nativeNavigation.shell,activePage());}});
  setInterval(poll, 250);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poll, { once: true }); else poll();
  return { poll, machine,get activeMachine(){return nativeNavigation?.active?nativeNavigation.machine:machine;},bridge, players, transitionTo, switchTarget, goNext, getDocument,
    get page() { return activePage(); }, get media() { return nativeNavigation?.active?nativeNavigation.media:media; }, get shell() { return nativeNavigation?.active?nativeNavigation.shell:shell; } };
}


// ---- lib/next-provider-navigation.js ----
// Keep the observed Next episode contract and engine behind the shared custom
// UI. This controller owns navigation and the stable parent fullscreen host.
function createMotchillNextProviderNavigation(sites,bridge,players,fullscreen,hooks={}){
  let active=false,shell=null,currentMedia=null,identity='',override=null,disposed=false,lastURL='';
  let buttonClasses=null;
  let rollback=null,clicked=null;
  const state=()=>sites.nextProviderState();
  const page=()=>sites.read();
  const key=()=>[location.href,state()?.frame.src].join('|');
  const ready=remote=>remote?.state?.customCapable===true && remote.state.nativeEnhanced===true && remote.readyState>=2 && remote.duration>0 && !remote.state.ad && !remote.state.error;
  const current=candidate=>candidate.frame.isConnected && candidate.frame.src===candidate.src && bridge.getFrame(candidate.frame)===candidate.remote && ready(candidate.remote);
  const wait=(check,signal)=>new Promise((resolve,reject)=>{
    let timer;const finish=(fn,value)=>{clearInterval(timer);signal.removeEventListener('abort',abort);fn(value);};
    const abort=()=>finish(reject,Object.assign(new Error('Đã hủy chuyển nguồn'),{name:'AbortError'}));
    const tick=()=>{if(signal.aborted)return abort();try{bridge.poll();const value=check();if(value)finish(resolve,value);}catch(error){finish(reject,error);}};
    signal.addEventListener('abort',abort,{once:true});timer=setInterval(tick,100);tick();
  });
  function report(value){
    if(!clicked?.isConnected)return;
    if(['switching','refreshing'].includes(value.phase)){clicked.disabled=true;clicked.textContent='Đang chuyển…';}
    else if(value.phase==='error'){clicked.disabled=false;clicked.textContent='Chưa đổi được nguồn · Thử lại';}
    else {clicked.disabled=false;clicked.textContent=clicked.dataset.mcNativeLabel || '';}
  }
  const machine=createMotchillEpisodeMachine({onState:report,
    async prepare(target,{signal}){
      const original=state(),sourcePage=page(),route=sites.route(target.url,sites.families.NEXT),targetURL=sites.url(target.url);
      if(!original || !sourcePage || !shell?.isConnected || targetURL?.origin!==location.origin || route?.slug!==sourcePage.slug)throw new Error('Đường dẫn tập không hợp lệ');
      const choices=original.data.movie.episodes.filter(ep=>ep && ep.slug===route.episode && ep.type==='m3u8');
      let server=target.server || original.episode.server;
      if(target.serverKey){const choice=players.serverChoices().find(item=>item.key===target.serverKey);if(!choice)throw new Error('Không tìm thấy server');server=choice.label;}
      if(target.language && sites.translationKey(server)!==target.language){const matches=[...new Set(choices.filter(ep=>sites.translationKey(ep.server)===target.language).map(ep=>ep.server))];if(matches.length!==1)throw new Error('Hãy chọn đúng server cho bản dịch');server=matches[0];}
      const matches=choices.filter(ep=>ep.server===server);if(matches.length!==1)throw new Error('Chưa có tập trên server đang chọn');
      const episode=matches[0],src=new URL('/embed/'+episode.id,original.source).href;
      if(!sites.knownEmbedPage(src))throw new Error('Nguồn nhúng chưa cấp quyền');
      const frame=document.createElement('iframe');frame.className=original.frame.className+' mc-native-prepared';frame.title='Chuẩn bị nguồn phim';
      frame.dataset.mcManaged='provider';frame.dataset.mcRole='prepared';frame.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';frame.allowFullscreen=true;
      frame.referrerPolicy=original.frame.referrerPolicy || 'strict-origin-when-cross-origin';frame.src=src;shell.append(frame);
      const candidate={frame,src,episode,target,sourceKey:key(),remote:null,activated:false};
      const abort=()=>{if(!candidate.activated)frame.remove();};signal.addEventListener('abort',abort,{once:true});
      try{await wait(()=>{
        if(key()!==candidate.sourceKey)throw new Error('Trang đã đổi nguồn');
        const remote=bridge.getFrame(frame);if(remote?.state?.error)throw new Error('Nguồn tập bị lỗi');
        if(!ready(remote) || remote.state.role!=='prepared')return false;
        candidate.remote=remote;remote.muted=true;remote.pause();return true;
      },signal);return candidate;}catch(error){frame.remove();throw error;}finally{signal.removeEventListener('abort',abort);}
    },
    async activate(candidate,_target,{signal}){
      if(!current(candidate) || key()!==candidate.sourceKey)throw new Error('Nguồn chuẩn bị đã đổi');
      rollback={media:currentMedia,muted:!!currentMedia?.muted,paused:!!currentMedia && currentMedia.paused!==false};
      bridge.setRole(candidate.frame,'current');candidate.remote.command('start-zero');
      await wait(()=>{if(!current(candidate))throw new Error('Nguồn không còn sẵn sàng');return candidate.remote.state.startedAtZero && !candidate.remote.paused && candidate.remote.currentTime<3;},signal);
      const resume=candidate.target.resume;
      if(resume && ['server','translation'].includes(candidate.target.intent) && Number.isFinite(resume.position) && resume.position>=0 && Number.isFinite(resume.duration) && Math.abs(resume.duration-candidate.remote.duration)<=Math.max(30,candidate.remote.duration*.03)){
        const position=Math.min(resume.position,candidate.remote.duration-1);candidate.remote.currentTime=position;
        await wait(()=>{if(!current(candidate))throw new Error('Nguồn đã thay đổi');return Math.abs(candidate.remote.currentTime-position)<3;},signal);
      }
      return {playing:true,startedAt:0};
    },
    commit(candidate,target,_result,operation){
      if(operation.signal.aborted || !operation.isCurrent() || !current(candidate) || key()!==candidate.sourceKey)throw new Error('Tác vụ không còn hiện hành');
      const old=state()?.frame;if(!old)throw new Error('Khung cũ đã đổi');
      document.dispatchEvent(new Event('mc-before-server-change'));rollback?.media?.pause();
      bridge.setRole(old,'prepared');old.dataset.mcRole='prepared';old.hidden=true;old.style.display='none';
      candidate.frame.classList.remove('mc-native-prepared');candidate.frame.dataset.mcRole='current';candidate.frame.title='Trình phát phim';candidate.activated=true;
      currentMedia=candidate.remote;currentMedia.muted=rollback?.muted ?? false;
      // Keep Pause for an explicit server change; Next starts the new episode.
      if(target.intent==='server' && rollback?.paused)currentMedia.pause();
      History.prototype[target.pop?'replaceState':'pushState'].call(history,{...history.state,mcNativeEpisode:true},'',target.url);if(old.dataset.mcManaged==='provider')old.remove();else{old.dataset.mcManaged='provider';old.dataset.mcNativeRetired='1';}
      try{sessionStorage.setItem('active-server-'+state().data.movie.slug,candidate.episode.server);sessionStorage.setItem('active-server-type','m3u8');}catch{/* storage disabled */}
      const info=page();document.title=info.title+' · '+info.episode;document.dispatchEvent(new CustomEvent('mc-episode-changed',{detail:info}));
      syncButtons();
      rollback=null;override=null;identity=key();lastURL=location.href;
      // Publish the new visible frame and episode context immediately.
      bridge.poll();
      hooks.poll?.(currentMedia,identity);
    },
    rollback(){if(rollback?.media){rollback.media.muted=rollback.muted;if(!rollback.paused)rollback.media.play()?.catch(()=>{});}rollback=null;},
    discard(candidate){if(!candidate.activated)candidate.frame.remove();},
  });
  const style=document.createElement('style');style.dataset.mcNativeNavigation='1';style.textContent='.mc-native-prepared{position:fixed!important;left:-10000px!important;top:0!important;width:640px!important;height:360px!important;opacity:0!important;pointer-events:none!important}.player-frame-stable:fullscreen{width:100vw!important;height:100vh!important;padding:0!important;background:#000}';
  function syncButtons(){
    const current=state(),nodes=sites.nextProviderButtons();if(!current || !nodes.length)return;
    const label=node=>node.dataset.mcNativeLabel || node.textContent.trim();
    if(!buttonClasses){const selected=nodes.find(node=>label(node)===current.episode.server),other=nodes.filter(node=>label(node)!==current.episode.server);if(selected && other.length && other.every(node=>node.className===other[0].className) && selected.className!==other[0].className)buttonClasses={active:selected.className,idle:other[0].className};}
    for(const node of nodes){const selected=label(node)===current.episode.server;node.setAttribute('aria-pressed',String(selected));if(buttonClasses)node.className=selected?buttonClasses.active:buttonClasses.idle;}
  }
  function poll(){
    const source=state();if(!source){if(active){machine.cancel();identity='';active=false;}return false;}
    active=true;shell=source.frame.parentElement;if(!style.isConnected)(document.head || document.documentElement).append(style);
    const newKey=key();if(identity && identity!==newKey){machine.cancel();override=null;}identity=newKey;lastURL=location.href;syncButtons();
    currentMedia=bridge.getFrame(source.frame) || null;
    if(currentMedia)hooks.poll?.(currentMedia,newKey);
    if(!machine.busy){const info=page(),target=override || info?.next;machine.tick({currentTime:currentMedia?.currentTime,duration:currentMedia?.duration,paused:currentMedia?.paused!==false,ended:currentMedia?.ended,ad:currentMedia?.state.ad},newKey,target);}
    return true;
  }
  async function transitionTo(target,reason='manual'){
    if(!state() || machine.busy)return false;
    override={...target,intent:target.intent || reason};machine.reset(key(),override);
    const success=await machine.go(reason);override=null;return success;
  }
  function goNext(reason='manual'){const info=page();return info?.next?transitionTo(info.next,reason):Promise.resolve(false);}
  function toggleFullscreen(){return shell?fullscreen.toggle(shell):Promise.resolve('unavailable');}
  document.addEventListener('click',event=>{
    const source=state();if(!source || !active)return;
    const button=sites.nextProviderButtons().find(node=>node===event.target || node.contains(event.target));
    if(button){
      event.preventDefault();event.stopImmediatePropagation();const server=button.dataset.mcNativeLabel || button.textContent.trim();
      if(server===source.episode.server || machine.busy)return;
      clicked=button;button.dataset.mcNativeLabel=server;
      transitionTo({...page(),server,resume:{position:currentMedia?.currentTime,duration:currentMedia?.duration},language:sites.translationKey(server),intent:'server'},'server');return;
    }
    const link=event.target.closest?.('a[href]');if(!link || link.closest('.mh-continue') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button!==0 || link.target==='_blank')return;
    const target=sites.url(link.href),route=target && sites.route(target.href,sites.families.NEXT),info=page();
    if(target?.origin!==location.origin || route?.slug!==info.slug || route.episode===source.episode.slug)return;
    event.preventDefault();event.stopImmediatePropagation();transitionTo({url:target.href,server:source.episode.server,language:info.language},'manual');
  },true);
  addEventListener('message',event=>{if(active && ['NEXT_EPISODE','CHANGE_EPISODE'].includes(event.data?.type)){event.stopImmediatePropagation();}},true);
  addEventListener('popstate',event=>{
    if(!active || !lastURL)return;
    const destination=location.href,before=sites.route(lastURL,sites.families.NEXT),after=sites.route(destination,sites.families.NEXT);
    if(!before || !after || before.slug!==after.slug)return;
    event.stopImmediatePropagation();machine.cancel();override=null;
    History.prototype.replaceState.call(history,history.state,'',lastURL);
    const current=state();if(current)transitionTo({url:destination,server:current.episode.server,language:sites.translationKey(current.episode.server),pop:true},'pop');
  },true);
  addEventListener('pagehide',event=>{machine.cancel();if(!event.persisted){disposed=true;style.remove();}});
  return {poll,goNext,transitionTo,toggleFullscreen,machine,get active(){return active && !disposed;},get shell(){return shell;},get media(){return currentMedia;}};
}


// ---- lib/translations.js ----
// A single per-film translation component below server controls. Source parsing
// belongs to sites.js; transition/fullscreen/source refresh belongs to controller.
function startMotchillTranslations(sites, controller, options = {}) {
  if (window.top !== window) return null;
  const labels = Object.freeze({ vietsub: 'Vietsub', 'long-tieng': 'Lồng tiếng', 'thuyet-minh': 'Thuyết minh' });
  let component = null;
  let generation = 0;
  let busy = false;
  let signature = '';
  let destroyed = false;
  const pendingLookups = new Set();
  const style = document.createElement('style');
  style.dataset.mcTranslationStyle = '1';
  style.textContent = '.mc-translations{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:10px 0;padding:10px 12px;border:1px solid #444;border-radius:7px;background:#181818;color:#eee;font:14px/1.4 sans-serif}.mc-translations button{padding:8px 12px;min-height:38px;border:1px solid #777;border-radius:6px;background:#303030;color:#fff;font:inherit;cursor:pointer}.mc-translations button:disabled{opacity:.6;cursor:wait}.mc-translation-status{flex-basis:100%;font-size:13px}.mc-translations[hidden]{display:none!important}';
  // Provider identity comes from the actual server label after removing only
  // its translation and the generic Server prefix, never from DOM position.
  const provider = (label) => sites.normalize(label).replace(/(?:^|-)(?:vietsub|long-tieng|thuyet-minh)(?=-|$)/g, '-')
    .replace(/^server-/, '').replace(/^-+|-+$/g, '');
  function snapshot() {
    const doc = controller.getDocument?.() || document;
    const page = controller.page;
    if (!page?.episodeKey || !labels[page.language]) return null;
    const detail = sites.readDetail(doc, page.url);
    if (!detail || !sites.sameFilm(page, detail)) return null;
    const variants = new Map();
    for (const ep of detail.episodes || []) {
      if (!labels[ep.language] || ep.language === page.language) continue;
      const target = sites.url(ep.url, page.url);
      if (!target || target.origin !== location.origin || !sites.route(target.href, page.family)) continue;
      const list = variants.get(ep.language) || [];
      list.push({ ...ep, url: target.href }); variants.set(ep.language, list);
    }
    const choices = controller.players?.serverChoices(doc, page.family, controller.media) || [];
    const selected = choices.filter((choice) => choice.selected || choice.matchesMedia);
    const current = controller.players?.chosenServer?.(doc, page.family, controller.media)
      || (selected.length === 1 ? selected[0] : null);
    const serverVariants = new Map();
    for (const server of choices) {
      const language = sites.translationKey(server.label);
      if (!language || language === page.language) continue;
      const list = serverVariants.get(language) || [];
      // A language selected by an actual server button uses the same real route
      // plus its explicit server identity, not a fabricated alternate route.
      list.push({ url: page.url, path: page.path, episode: page.episode,
        episodeKey: page.episodeKey, language, serverKey: server.key, provider: provider(server.label) });
      serverVariants.set(language, list);
    }
    for (const [language, entries] of serverVariants) variants.set(language, [...entries, ...(variants.get(language) || [])]);
    return { page, doc, variants, currentProvider: current ? provider(current.label) : '' };
  }
  function lookupProgress(target) {
    if (destroyed) return Promise.resolve({ status: 'cancelled' });
    return new Promise((resolve) => {
      const id = crypto.randomUUID();
      let timer, settled = false, claimed = false;
      const cancel = () => finish({ status: 'cancelled' });
      const finish = (result) => {
        if (settled) return;
        settled = true; clearTimeout(timer); pendingLookups.delete(cancel);
        document.removeEventListener('mc-history-resume-response', response); resolve(result);
      };
      const received = (value) => {
        if (value === null) return finish({ status: 'missing' });
        if (value && Number.isFinite(value.position) && value.position >= 0 && Number.isFinite(value.duration)
          && value.duration > 0 && value.position < value.duration) {
          finish({ status: 'found', value: { position: value.position, duration: value.duration } });
        } else finish({ status: 'error' });
      };
      const response = (event) => {
        let result;
        try { result = JSON.parse(event.detail); } catch (_) { return; }
        if (result?.id !== id) return;
        if (result.error) finish({ status: 'error' });
        else received(result.value);
      };
      document.addEventListener('mc-history-resume-response', response);
      pendingLookups.add(cancel);
      timer = setTimeout(() => {
        // History acknowledges synchronously, before waiting for GM storage.
        // Older builds do not acknowledge; retain their response window and
        // fail closed if their stylesheet exists or the page is still loading.
        const historyPresent = claimed || document.getElementById('mh-style') || document.readyState === 'loading';
        finish({ status: options.lookupProgress || historyPresent ? 'timeout' : 'unavailable' });
      }, options.lookupTimeout ?? 800);
      if (options.lookupProgress) {
        try { Promise.resolve(options.lookupProgress(target)).then(received, () => finish({ status: 'error' })); }
        catch (_) { finish({ status: 'error' }); }
      } else claimed = !document.dispatchEvent(new CustomEvent('mc-history-resume-request', {
        cancelable: true, detail: JSON.stringify({ id, info: target }),
      }));
    });
  }
  function message(text) {
    if (!component) return;
    let status = component.querySelector('.mc-translation-status');
    if (!status) { status = document.createElement('div'); status.className = 'mc-translation-status'; status.setAttribute('role', 'status'); component.append(status); }
    status.textContent = text;
  }
  async function select(language) {
    if (destroyed || busy) return false;
    if ((controller.activeMachine || controller.machine)?.busy) { message('Đang chuyển tập, vui lòng đợi player sẵn sàng.'); return false; }
    const state = snapshot();
    if (!state || language === state.page.language || !state.variants.has(language)) return false;
    const entries = state.variants.get(language);
    const matching = entries.filter((ep) => ep.episodeKey === state.page.episodeKey);
    const episode = (state.currentProvider && matching.find((ep) => ep.serverKey && ep.provider === state.currentProvider))
      || matching.find((ep) => ep.serverKey) || matching[0];
    if (!episode) { message(`Bản ${labels[language]} chưa có ${state.page.episode || 'tập đang xem'}.`); return false; }
    const epoch = generation;
    const oldUrl = state.page.url;
    const fallback = { position: Number(controller.media?.currentTime) || 0, duration: Number(controller.media?.duration) || 0 };
    const target = { ...state.page, ...episode, language };
    busy = true;
    component?.querySelectorAll('button').forEach((button) => { button.disabled = true; });
    message(`Đang chuyển sang ${labels[language]}…`);
    document.dispatchEvent(new Event('mc-before-server-change'));
    try {
      const stored = await lookupProgress(target);
      if (epoch !== generation || controller.page?.url !== oldUrl || controller.page?.episodeKey !== state.page.episodeKey) return false;
      if ((controller.activeMachine || controller.machine)?.busy) { message('Đang chuyển tập, vui lòng đợi player sẵn sàng.'); return false; }
      if (!['found', 'missing', 'unavailable'].includes(stored.status)) {
        if (stored.status !== 'cancelled') message('Chưa đọc được lịch sử của bản dịch. Hãy bấm bản dịch để thử lại; vẫn giữ tập đang xem.');
        return false;
      }
      const resume = stored.status === 'found' ? stored.value : fallback;
      const changed = await controller.switchTarget(target, { reason: 'translation', resume, serverKey: episode.serverKey });
      if (epoch === generation) message(changed ? `Đã chuyển sang ${labels[language]}.` : `Không chuyển được sang ${labels[language]}. Bạn có thể thử lại.`);
      return !!changed;
    } catch (_) {
      if (epoch === generation) message(`Không chuyển được sang ${labels[language]}. Bạn có thể thử lại.`);
      return false;
    } finally {
      if (epoch === generation) { busy = false; signature = ''; render(); }
    }
  }
  function render() {
    if (destroyed) return;
    // Tampermonkey document-start can run before <html> exists. Keep the
    // controller alive; DOMContentLoaded/polling will mount after parsing.
    const styleHost=document.head || document.documentElement;
    if (!styleHost) return;
    if (!style.isConnected) styleHost.append(style);
    const state = snapshot();
    const anchor = controller.players?.serverContainer(document);
    const key = state ? [state.page.url, state.page.language, state.currentProvider,
      ...[...state.variants].map(([lang, eps]) => lang + ':' + eps.map((ep) => [ep.url, ep.serverKey || ''].join('@')).join(','))].join('|') : '';
    if (!state?.variants.size || !anchor?.isConnected) {
      if (component) { component.remove(); component = null; generation++; busy = false; }
      signature = ''; return;
    }
    if (signature && key !== signature) { generation++; busy = false; }
    if (!component) {
      component = document.createElement('section'); component.className = 'mc-translations'; component.setAttribute('aria-label', 'Chuyển bản dịch');
    }
    if (component.previousElementSibling !== anchor) anchor.after(component);
    if (key === signature) return;
    signature = key;
    const existingMessage = component.querySelector('.mc-translation-status')?.textContent || '';
    component.replaceChildren();
    const title = document.createElement('span'); title.textContent = 'Chuyển bản dịch:'; component.append(title);
    for (const language of Object.keys(labels)) {
      if (!state.variants.has(language)) continue;
      const button = document.createElement('button'); button.type = 'button'; button.textContent = labels[language]; button.disabled = busy;
      button.dataset.language = language; button.addEventListener('click', () => select(language)); component.append(button);
    }
    if (existingMessage) message(existingMessage);
  }
  const pageChanged = () => { generation++; busy = false; signature = ''; render(); };
  document.addEventListener('mc-episode-changed', pageChanged);
  document.addEventListener('mc-player-controls-updated', render);
  addEventListener('popstate', pageChanged);
  const interval = setInterval(render, 1000);
  if (document.documentElement) render();
  else document.addEventListener('DOMContentLoaded', render, { once: true });
  return { render, select, snapshot, lookupProgress, destroy() {
    destroyed = true; generation++; busy = false;
    clearInterval(interval);
    document.removeEventListener('DOMContentLoaded', render);
    document.removeEventListener('mc-episode-changed', pageChanged);
    document.removeEventListener('mc-player-controls-updated', render);
    removeEventListener('popstate', pageChanged);
    for (const cancel of [...pendingLookups]) cancel();
    component?.remove(); style.remove();
  } };
}


// ---- lib/custom-player.js ----
// Site orchestration stays in player-controller. SharedPlayer owns all custom
// controls; remote commands still cross the existing authenticated MC bridge.
function createMotchillCustomPlayer(sites,bridge,hooks){
  if(typeof SharedPlayer==='undefined')return null;
  const nativeContract=video=>video.matches('#video') && video.closest('#player-wrap')?.querySelector('#controls #fs-btn') ? video.closest('#player-wrap'):false;
  // #video_mask is a loading poster: the provider removes it on JW ready.
  // Only persistent layout nodes identify this native controls contract.
  const enhancementRoot=()=>document.querySelector('#rp-player:has(.main-player > #player):has(#video_eps):has(#player_top)');
  const candidate=()=>SharedPlayer.playerCandidate(window,window,{nativeContract});
  let mounted=null,probe=null,probeSource='',guardOff=null,disposed=false,observer=null,rootObserver=null;
  const waiting=new Map();
  let storage;try{storage=window.localStorage;}catch{/* storage disabled */}
  const audioPreferences=SharedPlayer.audioPreferenceStore(storage,'media-userscripts:motchill:audio:v1');
  function guardedFrames(){
    // These extra slots receive status UI only. They do not authorize a new
    // origin, open a bridge session or infer an engine from the server label.
    const slots=[...document.querySelectorAll('#player iframe,#videoFrame,#player-wrapper iframe,.mc-player-stage>iframe')]
      .filter(frame=>frame.tagName==='IFRAME' && sites.visible(frame) && !sites.isPrepared(frame) && sites.url(frame.getAttribute('src')));
    const providerFrame=sites.nextProviderState?.()?.frame;
    return [...new Set([...sites.playerFrames(),...slots,...(providerFrame?[providerFrame]:[])])];
  }
  function prepareFrames(){
    if(disposed || window.top!==window)return;
    const frames=guardedFrames();
    for(const frame of frames){
      if(waiting.has(frame))continue;
      const reset=()=>{
        frame.dataset.mcDisplay='loading';const record=waiting.get(frame);if(!record)return;
        record.panel?.dispose();const host=frame.parentElement;
        if(host){
          if(getComputedStyle(host).position==='static')host.style.position='relative';
          record.host=host;record.panel=SharedPlayer.loadingPanel(window,host,{onRetry:()=>{if(frame.isConnected){reset();frame.src=frame.src;}}});
          if(!sites.playerFrames().includes(frame))record.panel.fail('Nguồn phát này chưa được hỗ trợ. Hãy chọn server khác.');
        }
      };
      const error=()=>waiting.get(frame)?.panel?.fail('Chưa tải được nguồn phim. Hãy thử lại hoặc đổi server.');
      const record={panel:null,host:null,reset,error,src:frame.src};waiting.set(frame,record);frame.addEventListener('load',reset);frame.addEventListener('error',error);reset();
    }
    for(const [frame,record] of waiting){
      if(!frame.isConnected || sites.isPrepared(frame) || !frames.includes(frame)){record.panel?.dispose();frame.removeEventListener('load',record.reset);frame.removeEventListener('error',record.error);waiting.delete(frame);}
      else if(frame.src!==record.src || frame.parentElement!==record.host){record.src=frame.src;record.reset();}
    }
  }
  function guard(){
    if(disposed || !document.documentElement)return;
    if(guardOff)return;
    // Only known engine contracts are hidden. Ad/challenge UI is independent.
    guardOff=SharedPlayer.playerStartupGuard(window);
    const style=document.createElement('style');style.dataset.mcCustomGuard='1';
    style.textContent='iframe[data-mc-display="loading"],html[data-mc-custom-owner] #player iframe:not([data-mc-display="custom"]),html[data-mc-custom-owner] #videoFrame:not([data-mc-display="custom"]),html[data-mc-custom-owner] #player-wrapper iframe:not([data-mc-display="custom"]),html[data-mc-custom-owner] .mc-player-stage>iframe:not([data-mc-display="custom"]),html[data-mc-custom-owner] .player-frame-stable>iframe:not([data-mc-display="custom"]){opacity:0!important;pointer-events:none!important}html[data-rp-controls-boot] #player-wrap>#controls,html[data-rp-controls-boot] #rp-player .custom-control,html[data-rp-controls-boot] #rp-player #player_top,html[data-rp-controls-boot] #rp-player #video_eps,html[data-rp-controls-boot] #rp-player #video_pop,html[data-rp-controls-boot] #rp-player #video_mask{display:none!important;pointer-events:none!important}';
    (document.head || document.documentElement).append(style);
    if(window.top===window){document.documentElement.dataset.mcCustomOwner='1';observer=new MutationObserver(prepareFrames);observer.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['src','data-mc-role']});prepareFrames();}
  }
  if(!document.documentElement){rootObserver=new MutationObserver(()=>{if(document.documentElement){rootObserver.disconnect();guard();}});rootObserver.observe(document,{childList:true});}
  function detach(){mounted?.ui.dispose();mounted?.player.dispose?.();mounted=null;}
  function localState(video){
    const found=candidate();
    const fingerprint=found?SharedPlayer.playerFingerprint(found):'';
    if(probe && (!found || probe.video!==found.video || probe.api!==found.api || probeSource!==fingerprint)){probe.dispose();probe=null;}
    if(found && !probe){probe=SharedPlayer.attachPlayer(found,{canRestoreAudio:()=>bridge.role!=='prepared' && !sites.isPrepared(found.video)});probeSource=fingerprint;}
    const own=found?.video===video,state=own?probe.state():null;
    return {nativeEnhanced:!!own && !!enhancementRoot(),customCapable:!!own,tracks:own?SharedPlayer.playerTracks(found):{},...(state?{ad:state.ad,...probe.audio()}: {})};
  }
  function commandTrack(video,group,id){const found=candidate(),state=localState(video);return state.customCapable && !state.ad && !video.error && video.readyState>=1 && found?.video===video && SharedPlayer.selectPlayerTrack(found,group,id);}
  function playAudible(video){const state=localState(video);return state.customCapable && !state.ad && probe?.video===video && probe.command('play-audible');}
  function restoreAudio(video,value){const state=localState(video);return state.customCapable && !state.ad && bridge.role!=='prepared' && !sites.isPrepared(video) && probe?.video===video && probe.command('restore-audio',value);}
  function enhanceLocal(video){
    // The stable parent owns the full UI and fullscreen. The provider document
    // only loads media and accepts authenticated commands; no native click,
    // gesture or fullscreen handler is used by the overlay.
    guard();return !!enhancementRoot() && candidate()?.video===video;
  }
  function update(media,root,page){
    if(disposed)return false;
    guard();prepareFrames();
    const local=!media?.frame && candidate(),remote=media?.frame && media.state?.customCapable===true;
    if(!root?.isConnected || !media || !(remote || local?.video===media)) {detach();return false;}
    const signature=remote?[media.session?.token,media.frame.src,media.state.mediaId].join('|'):SharedPlayer.playerFingerprint(local);
    if(mounted && (mounted.media!==media || mounted.root!==root || mounted.signature!==signature || !mounted.ui.shell.isConnected || local && (mounted.player.api!==local.api || mounted.player.nativeRoot!==local.root)))detach();
    if(!mounted){
      let player;
      if(remote){
        const current=()=>media.isConnected && media.state?.customCapable===true && bridge.getFrame(media.frame)===media && signature===[media.session?.token,media.frame.src,media.state.mediaId].join('|');
        const state=()=>{const value=media.state || {},ad=value.ad===true,duration=media.duration,time=media.currentTime;
          return {kind:'remote',failed:!!value.error,ready:current() && !ad && !value.error && Number.isFinite(duration) && duration>0 && Number.isFinite(time) && media.readyState>=1,ad,time,duration,rate:media.playbackRate,paused:media.paused,ended:media.ended,played:value.played===true};};
        const command=(action,value)=>{
          if(!state().ready)return false;
          switch(action){
            case 'seek':if(!Number.isFinite(value))return false;media.currentTime=Math.max(0,Math.min(value,media.duration-.25));break;
            case 'rate':if(!Number.isFinite(value) || value<.25 || value>4)return false;media.playbackRate=value;break;
            case 'mute':if(typeof value!=='boolean')return false;media.muted=value;break;
            case 'play':media.play();break;
            case 'play-audible':return media.command('play-audible');
            case 'restore-audio':return media.command('restore-audio',value);
            case 'pause':media.pause();break;
            default:return false;
          }return true;
        };
        player={root,video:media,state,command,audio:()=>({muted:media.muted,volume:media.volume}),bounds:()=>root.getBoundingClientRect(),fingerprint:()=>[media.session?.token,media.frame.src,media.state.mediaId].join('|'),tracks:()=>media.state?.tracks || {},selectTrack(group,id){if(!state().ready || !['quality','audio','captions'].includes(group) || !Number.isInteger(id) || !media.state?.tracks?.[group]?.some(item=>item.id===id))return false;media.command('track-'+group,id);return true;}};
      }else{
        player=SharedPlayer.attachPlayer(local,{canRestoreAudio:()=>bridge.role!=='prepared' && !sites.isPrepared(local.video)});player.nativeRoot=local.root;player.root=root;
      }
      const ui=SharedPlayer.customPlayerControls(window,player,{autoPlay:true,nextTimeoutMs:remote && media.state.nativeEnhanced?45000:undefined,
        audioPreferences,canRestoreAudio:()=>bridge.role!=='prepared' && !sites.isPrepared(media) && media.state?.role!=='prepared',
        introSeconds:hooks.introSeconds,onIntro:hooks.onIntro,onNext:()=>Promise.resolve(hooks.onNext()).then(ok=>ok?'navigating':'missing'),
        isFullscreen:hooks.isFullscreen,onFullscreen:hooks.onFullscreen});
      mounted={media,root,signature,player,ui};
    }
    mounted.ui.setContext({url:page.url,episodeID:page.episodeKey,lane:page.language,server:hooks.serverKey(),next:page.next});
    if(remote){
      const record=waiting.get(media.frame),ready=mounted.player.state().ready && !mounted.ui.shell.hidden;
      if(ready){media.frame.dataset.mcDisplay='custom';record?.panel?.dispose();if(record)record.panel=null;}
      else{if(media.frame.dataset.mcDisplay==='custom')record?.reset();if(mounted.player.state().failed)record?.panel?.fail();}
    }
    return true;
  }
  return {guard,enhanceLocal,get nativeRoot(){return enhancementRoot();},localState,commandTrack,playAudible,restoreAudio,update,get active(){return !!mounted;},refresh(){mounted?.ui.update();},dispose(){disposed=true;detach();probe?.dispose();probe=null;observer?.disconnect();rootObserver?.disconnect();for(const [frame,record] of waiting){record.panel?.dispose();frame.removeEventListener('load',record.reset);frame.removeEventListener('error',record.error);}waiting.clear();guardOff?.();document.querySelector('[data-mc-custom-guard]')?.remove();delete document.documentElement.dataset.mcCustomOwner;}};
}

// END MOTCHILL SITES

  const sites = createMotchillSites();
  MediaSiteOwner.runFamily(window,{family:'motchill',feature:'gestures',isSiteURL:value=>{const parsed=sites.url(value);return !!parsed && sites.isMotchill(parsed.hostname);},isFrameURL:value=>sites.knownEmbedPage(value),isFrameOrigin:value=>{const parsed=sites.url(value);return !!parsed && sites.embedHosts.has(parsed.hostname);}},()=>{
  sites.runWhenAllowed(() => {
  const controller = startMotchillPlayerController(sites);
  startMotchillTranslations(sites, controller);
  // END MOTCHILL ENTRY
  });
});
})();