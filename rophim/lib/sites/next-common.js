import {safeURL,bounded} from '../core.js';
import {movieIdentity,laneKey} from '../identity.js';
export function nextContext(site){
      const {episode:e, movie:m, url} = site;
      const latest = Array.isArray(m.latestEpisodes) ? m.latestEpisodes : [];
      const season = e.season_number || latest.find(item=>item.id===e.id)?.season_number || m.partNumber || 1;
      return {source:site.kind, movie:bounded(m.slug), movieID:String(m.id), title:bounded(m.name), episode:bounded(e.name), episodeID:String(e.id), season:String(season), lane:bounded(e.server_type || e.server), server:bounded(e.server), url:url.origin+url.pathname,...movieIdentity(m)};
}
export function episodeNext(entries, current) {
  const season = entries.filter(e => String(e.season_number || 1) === current.season);
  const lane = season.filter(e => laneKey(e.server_type || e.server) === laneKey(current.lane));
  const order=e=>Number.isFinite(e.episode_order)?e.episode_order:/^(?:tập\s*)?\d+(?:\.\d+)?$/i.test(e.name || '')?Number(e.name.match(/[\d.]+/)[0]):null;
  const active=lane.find(e=>String(e.id)===current.episodeID),position=active?order(active):null;
  if(position===null)return null;
  // Determine the next position before selecting its translation. A delayed dub
  // must not silently jump over an episode that exists only in another lane.
  const positions=season.map(order).filter(value=>value!==null && value>position);
  if(!positions.length)return null;
  const nextPosition=Math.min(...positions);
  const next=lane.filter(e=>order(e)===nextPosition);
  return next.length===1?next[0]:null;
}
export async function nextSiteRoute(site,context,win){
      const prefix = site.kind === 'next-basic' ? '/api/baseapi' : '/baseapi';
      const response = await win.fetch(`${prefix}/api/v1/episodes/by-idMovie/${encodeURIComponent(context.movieID)}`, {credentials:'same-origin'});
      if (!response.ok) throw new Error('Không đọc được danh sách tập');
      const raw = await response.json();
      const entries = Array.isArray(raw) ? raw : raw.result;
      if (!Array.isArray(entries) || entries.length > 10000) return null;
      const next = episodeNext(entries, context);
      return next && /^\d+$/.test(String(next.id)) ? new URL(`/xem-phim/${encodeURIComponent(context.movie)}.${next.id}`, site.url).href : null;
}
