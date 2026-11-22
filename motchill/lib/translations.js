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
  const provider = (label) => sites.normalize(label).replace(/(?:^|-)(?:vietsub|phu-de|long-tieng|thuyet-minh)(?=-|$)/g, '-')
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
    return lookupMotchillHistoryProgress(target, { ...options, pending: pendingLookups });
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
