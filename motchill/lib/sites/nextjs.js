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
