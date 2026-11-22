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
