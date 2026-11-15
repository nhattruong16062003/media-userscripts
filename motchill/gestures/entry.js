// ==UserScript==
// @name         Motchill - thao tác trình phát
// @namespace    motchill-gestures
// @version      6.0.6
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
// @run-at       document-start
// @inject-into  page
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  // BEGIN MOTCHILL SITES (generated)
// END MOTCHILL SITES

  const sites = createMotchillSites();
  sites.runWhenAllowed(() => {
  const controller = startMotchillPlayerController(sites);
  startMotchillTranslations(sites, controller);
  // END MOTCHILL ENTRY
  });
})();
