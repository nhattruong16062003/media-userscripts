// ==UserScript==
// @name         Motchill - chặn quảng cáo + tối ưu mạng
// @namespace    motchill-noads
// @version      6.0.8
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
// @match        https://cdn.loadvid.com/videos/play/*
// @match        https://embed13.streamc.xyz/*
// @match        https://embed1.streamc.xyz/embed.php*
// @match        https://embed12.streamc.xyz/embed.php*
// @match        https://embed2.streamc.xyz/embed.php*
// @match        https://embed11.streamc.xyz/embed.php*
// @match        https://v8.streamvsmov.com/video/*
// @match        https://v9.streamvsmov.com/video/*
// @include      /^https?:\/\/[^\/?#]*motchill[^\/?#]*\//
// @match        https://api.clubc.live/embed/*
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
    for (const key of ['mobile_pageVisitedTime', 'desktop_pageVisitedTime', 'vast_ad_last_shown', 'popup-ads-last-shown-ts', 'click_last_ad']) set('sessionStorage', key, FUTURE);
    for (const key of ['popup-ads-init-count']) set('sessionStorage', key, '999');
    set('localStorage', 'plp_day', new Date().toISOString().slice(0, 10));
    for (const key of ['plp_windowStart', 'lastPopupTime', 'shopeeLastShown']) set('localStorage', key, FUTURE);
    set('localStorage', 'plp_windowCount', '999');
    set('localStorage', 'popupShown', 'true');
    try { document.cookie = 'popup_last_shown=' + FUTURE + '; path=/'; } catch (e) {}
  }

  function blockKnownEmbedAds() {
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
    // https://motchillkd.net/phim-le/allen/: banner #bottom-sticky-ad, ảnh /wp-content/ADS/.
    addStyle('#bottom-sticky-ad, a:has(img[src*="/wp-content/ADS/"]) { display: none !important; }');
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
})();
