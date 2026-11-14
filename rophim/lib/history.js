import {safeURL, isSiteOrigin, finite} from './core.js';
import {contextKey} from './sites.js';
import {sameEpisode,sameFilm,laneKey} from './identity.js';

export const HISTORY_PREFIX='rp.history.v1.';
export function validHistory(row) {
  const url=safeURL(row?.url);
  return row?.version===1 && !!contextKey(row) && ['next-ordered','next-basic','legacy-panels'].includes(row.source) && ['movieID','movie','title','episode','episodeID','season','lane','server','url'].every(k=>typeof row[k]==='string' && row[k].length<=2048) && url && isSiteOrigin(url.origin) && url.pathname.startsWith('/xem-phim/') && finite(row.time) && row.time>=0 && finite(row.duration) && row.duration>0 && row.time<=row.duration+5 && finite(row.updated);
}
export function historyRow(context,state,now=Date.now()) {
  if(!context || !state?.ready || state.ad || !state.played || !finite(state.time) || !finite(state.duration) || state.duration<=0)return null;
  const row={...context,version:1,time:Math.max(0,Math.min(state.time,state.duration)),duration:state.duration,completed:state.ended || state.duration-state.time<15,updated:now};
  return validHistory(row) ? row : null;
}
export function createHistoryStore(store) {
  const key=c=>HISTORY_PREFIX+contextKey(c);
  const all=()=>store.keys().filter(k=>k.startsWith(HISTORY_PREFIX)).map(k=>store.get(k,null)).filter(validHistory).sort((a,b)=>b.updated-a.updated);
  return {
    read(c){return c?all().find(row=>sameEpisode(c,row)):null;},
    save(row){if(!validHistory(row))return false;const old=store.get(key(row),null);if(old?.updated>row.updated)return false;store.set(key(row),row);return true;},
    list(){const rows=[];for(const row of all())if(!rows.some(other=>sameEpisode(row,other)))rows.push(row);return rows;},
    continuing(){const rows=[];for(const row of all())if(!rows.some(other=>sameFilm(row,other) && row.season===other.season && laneKey(row.lane)===laneKey(other.lane)))rows.push(row);return rows.filter(row=>!row.completed);},
    remove(c){for(const row of all())if(sameEpisode(c,row))store.remove(key(row));},
  };
}
