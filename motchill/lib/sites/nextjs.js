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
  // React Flight framing, data only (never evaluated): `<hexId>:<tag><payload>`.
  // Text (T) and binary tags carry `<hexByteLength>,` and exactly that many
  // UTF-8 BYTES with no trailing newline; every other row ends at '\n'. Live
  // motchill68.tv: `22:T789,<JSON-LD with Vietnamese>9:[...episodes]`. String
  // indices are UTF-16 units, so framing is done on bytes, never on split('\n').
  const FLIGHT_LENGTH_TAGS = new Set([84, 65, 79, 111, 85, 83, 115, 76, 108, 71, 103, 77, 109, 86]);
  function utf8Encode(value, out) {
    for (let i = 0; i < value.length; i++) {
      let c = value.charCodeAt(i);
      if (c >= 0xd800 && c < 0xdc00 && i + 1 < value.length) {
        const low = value.charCodeAt(i + 1);
        if (low >= 0xdc00 && low < 0xe000) { c = 0x10000 + ((c - 0xd800) << 10) + (low - 0xdc00); i++; }
      }
      if (c >= 0xd800 && c < 0xe000) c = 0xfffd; // lone surrogate, as TextEncoder
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | c >> 6, 0x80 | c & 63);
      else if (c < 0x10000) out.push(0xe0 | c >> 12, 0x80 | c >> 6 & 63, 0x80 | c & 63);
      else out.push(0xf0 | c >> 18, 0x80 | c >> 12 & 63, 0x80 | c >> 6 & 63, 0x80 | c & 63);
    }
  }
  function utf8Decode(bytes, start, end) {
    const cont = (i) => i < end && (bytes[i] & 0xc0) === 0x80;
    let out = '', codes = [];
    for (let i = start; i < end;) {
      const b = bytes[i];
      let c = 0xfffd, size = 1;
      if (b < 0x80) c = b;
      else if (b >= 0xc2 && b < 0xe0 && cont(i + 1)) { c = (b & 31) << 6 | bytes[i + 1] & 63; size = 2; }
      else if (b >= 0xe0 && b < 0xf0 && cont(i + 1) && cont(i + 2)) {
        c = (b & 15) << 12 | (bytes[i + 1] & 63) << 6 | bytes[i + 2] & 63; size = 3;
        if (c < 0x800 || c >= 0xd800 && c < 0xe000) c = 0xfffd;
      } else if (b >= 0xf0 && b < 0xf5 && cont(i + 1) && cont(i + 2) && cont(i + 3)) {
        c = (b & 7) << 18 | (bytes[i + 1] & 63) << 12 | (bytes[i + 2] & 63) << 6 | bytes[i + 3] & 63; size = 4;
        if (c < 0x10000 || c > 0x10ffff) c = 0xfffd;
      }
      codes.push(c); i += size;
      if (codes.length >= 4096) { out += String.fromCodePoint(...codes); codes = []; }
    }
    return out + String.fromCodePoint(...codes);
  }
  function flightRows(bytes) {
    const rows = new Map(), n = bytes.length;
    const hex = (b) => b >= 48 && b <= 57 || b >= 97 && b <= 102 || b >= 65 && b <= 70;
    const lineEnd = (from) => { let i = from; while (i < n && bytes[i] !== 10) i++; return i; };
    let pos = 0;
    while (pos < n) {
      let colon = pos;
      while (colon < n && colon - pos < 16 && hex(bytes[colon])) colon++;
      if (colon === pos || bytes[colon] !== 58) { pos = lineEnd(pos) + 1; continue; }
      const id = String.fromCharCode(...bytes.slice(pos, colon)), tag = bytes[colon + 1];
      if (FLIGHT_LENGTH_TAGS.has(tag)) {
        let cursor = colon + 2, length = 0;
        while (cursor < n && cursor - colon - 2 < 8 && hex(bytes[cursor])) length = length * 16 + parseInt(String.fromCharCode(bytes[cursor++]), 16);
        // Malformed header: resynchronise at the next newline like the old reader.
        if (cursor === colon + 2 || bytes[cursor] !== 44) { pos = lineEnd(colon) + 1; continue; }
        const start = cursor + 1, end = start + length;
        // Incomplete record: the remaining bytes are its payload, never new rows.
        if (end > n) break;
        if (tag === 84) rows.set(id, utf8Decode(bytes, start, end));
        pos = end; continue;
      }
      const end = lineEnd(colon + 1);
      try { rows.set(id, JSON.parse(utf8Decode(bytes, colon + 1, end))); } catch { /* tagged/non-JSON Flight record */ }
      pos = end + 1;
    }
    return rows;
  }
  function nextData(doc = document, pageUrl = location.href) {
    const scripts = [...doc.querySelectorAll('script')].filter((s) => s.textContent.trim().startsWith('self.__next_f.push('));
    const parsedPage = url(pageUrl);
    const path = parsedPage ? parsedPage.pathname + parsedPage.search : '';
    const cacheKey = path + ':' + scripts.length + ':' + (scripts.at(-1)?.textContent.length || 0);
    const cached = flightCache.get(doc);
    if (cached?.key === cacheKey) return cached.pages;
    const pages = [], bytes = [];
    for (const script of scripts) {
      try {
        const arg = script.textContent.trim().slice('self.__next_f.push('.length).replace(/\);?\s*$/, '');
        const entry = JSON.parse(arg);
        // Next.js inline RSC: [1,text] and [3,base64 bytes] are parts of ONE byte
        // stream; [0] bootstrap and [2] form state are not Flight rows.
        if (!Array.isArray(entry) || typeof entry[1] !== 'string') continue;
        if (entry[0] === 1) utf8Encode(entry[1], bytes);
        else if (entry[0] === 3) { const binary = atob(entry[1]); for (let i = 0; i < binary.length; i++) bytes.push(binary.charCodeAt(i)); }
      } catch (e) { /* script khác */ }
    }
    const rows = flightRows(bytes);
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
