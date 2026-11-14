import {rscObjects} from './sites/rsc.js';
export {jsonFragment,rscObjects} from './sites/rsc.js';
import {detectLegacySite,legacyContext,legacyNextRoute} from './sites/legacy-panels.js';
import {detectNextOrdered} from './sites/next-ordered.js';
import {detectNextBasic} from './sites/next-basic.js';
import {nextContext,nextSiteRoute} from './sites/next-common.js';
export {episodeNext} from './sites/next-common.js';
import {safeURL, normalize, bounded} from './core.js';
import {movieIdentity,laneKey} from './identity.js';

export function detectSite(doc, href, page = {}) {
  const url = safeURL(href);
  if (!url || !url.pathname.startsWith('/xem-phim/')) return null;
  let transition=null;
  try{const raw=doc.getElementById('rp-watch-descriptor')?.textContent;if(raw && raw.length<100000){const value=JSON.parse(raw);if(value.href===url.origin+url.pathname)transition=value;}}catch{/* incomplete local transition */}
  const legacy=detectLegacySite(doc,url,transition);if(legacy)return legacy;
  const frame = doc.querySelector('.player-ratio iframe#embed-player');
  if (!frame) return null;
  const data = transition?.frameSrc===frame.src && ['next-ordered','next-basic'].includes(transition.kind) && transition.episode && transition.movie?{episodes:[transition.episode],movies:[transition.movie]}:rscObjects(doc, page);
  const suffix = url.pathname.match(/\.(\d+)$/)?.[1];
  const embedID = safeURL(frame.src)?.pathname.match(/^\/embed\/(\d+)$/)?.[1];
  const candidates = data.episodes.filter(e => suffix ? String(e.id) === suffix : embedID ? String(e.id) === embedID : e.link === frame.src);
  const episode = candidates.at(-1);
  if (!episode || typeof episode.server !== 'string' || !['embed','m3u8'].includes(episode.type)) return null;
  if (episode.type==='embed' && episode.link!==frame.src || episode.type==='m3u8' && String(episode.id)!==embedID) return null;
  const movieSlug = url.pathname.slice('/xem-phim/'.length).replace(/\.\d+$/, '');
  const movie = data.movies.findLast(m => m.slug === movieSlug && typeof m.id === 'number');
  if (!movie) return null;
  const candidate={frame,url,episode,movie};
  return detectNextOrdered(candidate) || detectNextBasic(doc,candidate);
  return null;
}
export function commitWatchSite(doc,site){
  let node=doc.getElementById('rp-watch-descriptor');if(!node){node=doc.createElement('script');node.id='rp-watch-descriptor';node.type='application/json';node.dataset.rpUi='watch-data';(doc.head || doc.documentElement).append(node);}
  const pick=(value,keys)=>value?Object.fromEntries(keys.filter(key=>Object.hasOwn(value,key)).map(key=>[key,value[key]])):undefined;
  const episode=pick(site.episode,['id','slug','name','server','server_type','episode_order','season_number','type','link']);
  const movie=pick(site.movie,['id','slug','name','origin_name','originalTitle','publish_year','year','type','imdb_id','tmdb_id','thumbnail','poster','partNumber']);
  if(movie)movie.latestEpisodes=site.movie.latestEpisodes?.filter(e=>e.id===site.episode.id).map(e=>({id:e.id,season_number:e.season_number}));
  node.textContent=JSON.stringify({href:site.url.origin+site.url.pathname,kind:site.kind,frameSrc:site.frame.src,episode,movie,preferences:site.preferences});
}
export function readContext(site, doc) {
  if (!site) return null;
  switch (site.kind) {
    case 'next-ordered':
    case 'next-basic': {
      return nextContext(site);
    }
    case 'legacy-panels': {
      return legacyContext(site,doc);
    }
    default: return null;
  }
}
export function contextKey(c) { return c ? [c.source,c.movieID,c.movie,c.season,c.episodeID,c.lane].map(encodeURIComponent).join('|') : ''; }
export function introKey(c) { return [c.source,c.movieID,c.movie,c.season,c.lane].map(encodeURIComponent).join('|'); }
export async function nextRoute(site, context, win) {
  switch (site?.kind) {
    case 'legacy-panels': {
      return legacyNextRoute(site,context,win);
    }
    case 'next-ordered':
    case 'next-basic': {
      return nextSiteRoute(site,context,win);
    }
    default: return null;
  }
}
