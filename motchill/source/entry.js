// ==UserScript==
// @name         Motchill - mở bản trực tiếp
// @namespace    motchill-source
// @version      6.0.5
// @author       zic
// @homepageURL  https://github.com/nhattruong16062003/media-userscripts/tree/main/motchill
// @updateURL    https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/refs/heads/main/motchill/source/motchill-source.user.js
// @downloadURL  https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/refs/heads/main/motchill/source/motchill-source.user.js
// @description  Tìm trang Motchill gốc trong iframe và chỉ hiện nút mở khi nguồn tương thích đã được xác minh.
// @match        https://embed1.streamc.xyz/embed.php*
// @match        https://embed12.streamc.xyz/embed.php*
// @match        https://embed2.streamc.xyz/embed.php*
// @match        https://embed11.streamc.xyz/embed.php*
// @match        https://v8.streamvsmov.com/video/*
// @match        https://v9.streamvsmov.com/video/*
// @include      /^https?:\/\/[^\/?#]*motchill[^\/?#]*\//
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  // BEGIN MOTCHILL SITES (generated)
// END MOTCHILL SITES

  const sites = createMotchillSites();
  sites.runWhenAllowed(() => {
  const bridge = createMotchillVideoBridge(sites, 'motchill-source-video-v1');
  let button = null;
  function sourceAdapter() {
    switch (sites.detect()) {
      case sites.families.CLASSIC: // https://motchillsa.com/ — chỉ đề xuất nếu bản hiện tại cũng có iframe.
      case sites.families.OPHIM: // https://motchillcu.mx/, https://motchillt.si/
      case sites.families.NEXT: // https://motchille.com.mx/ — có iframe chưa có nghĩa là web cũ.
      case sites.families.NEXT_REVIVE: // https://motchill68.tv/ — player embed khác trang phim gốc.
      case sites.families.APIPHIM: // https://motchill.garden/
      case sites.families.DOO: // https://motchillkd.net/
      case sites.families.MYUI: // https://motchillv.fun/
      case sites.families.WRAPPER: return sites.adapter(); // Case tổng hợp cho wrapper Motchill, cần handshake.
      default: return null;
    }
  }
  function poll() {
    bridge.poll();
    if (window.top !== window) return; // Child chỉ trả lời handshake, không hiện nút lặp.
    const adapter = sourceAdapter();
    const remote = bridge.remote;
    const state = remote?.state;
    const frameTarget = remote?.frame ? sites.url(remote.frame.getAttribute('src'), location.href) : null;
    const candidate = sites.url(state?.page?.url);
    const current = adapter?.read();
    const matches = current ? sites.sameEpisode(current, state?.page) : sites.detect() === sites.families.WRAPPER;
    // Đòi chính frame đang hiện báo có video JW và route của adapter gốc, không
    // tin src trần, URL quảng cáo, .m3u8, player.phimapi hoặc fcloud.
    const valid = adapter && remote && !sites.isPrepared(remote.frame) && state?.direct && matches
      && frameTarget && sites.isMotchill(frameTarget.hostname) && !sites.embedHosts.has(frameTarget.hostname)
      && candidate && candidate.origin === frameTarget.origin && sites.isMotchill(candidate.hostname) && !sites.embedHosts.has(candidate.hostname)
      && [sites.families.CLASSIC, sites.families.OPHIM].includes(state?.page?.family) && sites.route(candidate.href, state.page.family)
      && candidate.href !== location.href && candidate.username === '' && candidate.password === ''
      && state.duration >= 120 && !state.ad;
    if (!valid) { button?.remove(); button = null; return; }
    if (!button || !button.isConnected) {
      button?.remove();
      button = document.createElement('a'); button.className = 'ms-open-source';
      button.style.cssText = 'display:inline-block;margin:10px;padding:10px 14px;background:#292929;color:white;border:1px solid #777;border-radius:6px;font:14px sans-serif;text-decoration:none';
      const frame = remote.frame;
      frame.parentElement?.insertBefore(button, frame);
    }
    button.href = candidate.href;
    button.textContent = 'Mở bản trực tiếp · ' + candidate.hostname;
    button.title = 'Đã nhận diện trang tập phim và video JW trong iframe';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poll, { once: true }); else poll();
  setInterval(poll, 1000);
  // END MOTCHILL ENTRY
  });
})();
