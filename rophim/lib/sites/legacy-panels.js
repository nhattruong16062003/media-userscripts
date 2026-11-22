import {safeURL,bounded} from '../core.js';
export function detectLegacySite(doc,url,transition){
  const legacyFrame = doc.querySelector('iframe#player.player-iframe');
  const panels = [...doc.querySelectorAll('.server-picker[data-panel]')];
  if (legacyFrame && panels.some(p => p.querySelector('[data-server][data-value]')) && doc.querySelector('.btn-episode.chaptervs,.btn-episode.chaptertm')) {
    return {kind:'legacy-panels', frame:legacyFrame, url,...(transition?.kind==='legacy-panels' && transition.frameSrc===legacyFrame.src?{preferences:transition.preferences}:{})};
  }
  return null;
}
function parseCookies(raw){
  const out={};
  for(const part of String(raw || '').split(';')){
    const eq=part.indexOf('=');
    if(eq<=0)continue;
    const key=part.slice(0,eq).trim();
    if(!key || Object.hasOwn(out,key))continue;
    out[key]=part.slice(eq+1).trim();
  }
  return out;
}
export function legacyContext(site,doc){
      const cookies = site.preferences || parseCookies(doc.cookie);
      const lane = cookies.selectedVidTypeRophim === 'tm' ? 'tm' : 'vs';
      const links=[...doc.querySelectorAll(lane==='tm'?'.chaptertm':'.chaptervs')];
      const active = links.find(n=>safeURL(n.getAttribute('href'),site.url)?.pathname===site.url.pathname) || links.find(n=>n.classList.contains('on-air'));
      const panel = doc.querySelector(`.server-picker[data-panel="${lane === 'tm' ? 'thuyetminh' : 'vietsub'}"]`);
      if (!active || !panel) return null;
      const server = site.preferences?.selectedServerRophim || panel.querySelector('[data-server].current')?.dataset.server || '';
      const title = (doc.querySelector('meta[property="og:title"]')?.content || doc.title).split('|')[0].trim();
      const movie = site.url.pathname.split('/').at(-1).replace(/-tap-\d+(?:\.[^/]*)?$/, '');
      const rawTitle=doc.querySelector('meta[property="og:title"]')?.content || doc.title;
      const original=rawTitle.split('|')[1]?.trim() || '';
      const episode=bounded(active.querySelector('.v-title,.info')?.textContent?.trim() || active.textContent?.trim());
      const mediaType=links.length===1 && /^(?:full|hd|sd|cam|fhd)$/i.test(episode) && !/-tap-\d+(?:\.[^/]*)?$/i.test(site.url.pathname)?'movie':'tv';
      return {source:site.kind, movie, movieID:movie, title:bounded(title.replace(/\s*-\s*Tập\s*\d+.*$/i,'')), episode, episodeID:site.url.pathname, season:title.match(/phần\s*(\d+)/i)?.[1] || '1', lane, server, url:site.url.origin+site.url.pathname,
        originalTitle:bounded(original.replace(/\s+(?:season|phần)\s*\d+/ig,'').replace(/\s+(?:19|20)\d{2}\s*$/,'')),year:original.match(/\b((?:19|20)\d{2})\s*$/)?.[1] || '',mediaType,externalImdb:'',externalTmdb:'',poster:bounded(doc.querySelector('meta[property="og:image"]')?.content || '',2048)};
}
export function legacyNextRoute(site,context,win){
      const nodes = [...win.document.querySelectorAll(context.lane === 'tm' ? '.btn-episode.chaptertm' : '.btn-episode.chaptervs')];
      let index = nodes.findIndex(n => safeURL(n.getAttribute('href'), site.url)?.pathname === site.url.pathname);
      if (index < 0) index = nodes.findIndex(n => n.classList.contains('on-air'));
      const url = safeURL(nodes[index + 1]?.getAttribute('href') || nodes[index + 1]?.href, site.url);
      return index >= 0 && url?.origin === site.url.origin ? url.href : null;
}
