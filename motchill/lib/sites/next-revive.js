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
