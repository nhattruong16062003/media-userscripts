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
