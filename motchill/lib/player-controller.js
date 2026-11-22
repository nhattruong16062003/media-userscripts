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
    onIntro:()=>{if(media?.isConnected)learning.skipIntro(media,contextKey());},
    onHello:()=>{if(window.top!==window)childMode();},
    onNext:()=>nativeNavigation?.active?nativeNavigation.goNext():goNext('manual'),playAudible:video=>customUI?.playAudible(video),initializePlayAudible:video=>customUI?.initializePlayAudible(video),restoreAudio:(video,value)=>customUI?.restoreAudio(video,value),replaceMedia:(video,value,signal)=>customUI?.replaceMedia(video,value,signal) });
  const players = createMotchillPlayerAdapters(sites);
  const supported = () => {
    switch (sites.detect()) {
      case sites.families.CLASSIC: // https://motchillsa.com/ (mẫu cũ)
      case sites.families.OPHIM: // https://motchillcu.mx/, https://motchillt.si/
      case sites.families.NEXT: // https://motchille.com.mx/
      case sites.families.NEXT_REVIVE: // https://motchill68.tv/xem-phim/thuong-cong-chua
      case sites.families.APIPHIM: // https://motchill.garden/
      case sites.families.DOO: // https://motchillkd.net/, https://motchillsc.mom/
      case sites.families.MYUI: // https://motchillv.fun/
      case sites.families.CHIBIFLIX: // https://motchillfv.help/
      case sites.families.WRAPPER: return true;
      default: {
        if (window.top === window) return false;
        if (sites.embedHosts.has(location.hostname)) return true;
        // Captured Revive source: a.motchill68.tv/embed/4/274183.
        // Captured DooPlay same-origin embeds: motchillsc.mom/tp?source=... (JW)
        // and motchillkd.online/tvc-embed.html?embed=... (#movie-frame relay).
        // Accept a verified Motchill player/relay embed only under a Motchill parent.
        const parent = sites.url(document.referrer);
        const directPlayer = (/^\/embed\/[^/]+\/[^/]+/.test(location.pathname) || /^\/tp\/?$/.test(location.pathname))
          && !!document.querySelector('video,.jwplayer');
        const tvcRelay = /^\/tvc-embed\.html$/i.test(location.pathname)
          && !!document.querySelector('#movie-container > iframe#movie-frame');
        return sites.isMotchill(location.hostname) && (directPlayer || tvcRelay)
          && !!parent && sites.isMotchill(parent.hostname)
          && (parent.pathname === '/' || /^\/(?:xem-phim|tap-phim|phim-le|phim|play)\//.test(parent.pathname));
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
      if(local)customUI.enhanceLocal(local);else customUI.clearLocal?.();
      bridge.setNativeGestures?.(false);return;
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
    if(customUI?.localPresentation?.()){
      if(local && bridge.role==='prepared')players.prepareMedia(local);
      if(local)customUI.enhanceLocal(local);else customUI.clearLocal?.();
      bridge.setNativeGestures?.(false);return;
    }
    customUI?.clearLocal?.();
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
      bridge.poll();
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
    if(customUI?.nativeRoot || customUI?.localPresentation?.()){const video=sites.findVideo();if(video)customUI.enhanceLocal(video);else customUI.clearLocal?.();}
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
