import {safeURL,isSiteOrigin} from './core.js';
import {sameFilm,laneKey,episodeKey,identityText} from './identity.js';
import {detectSite,readContext} from './sites.js';

// Resolve a watch route on the destination website. Neither internal movie IDs
// nor episode IDs are carried from the source website to another backend.
export async function historyDestination(row,win) {
  if(!isSiteOrigin(win.location.origin))return null;
  const original=safeURL(row.url);
  if(original?.origin===win.location.origin && original.pathname.startsWith('/xem-phim/'))return {url:original.href,source:row.source,lane:row.lane};
  const candidates=[];
  for(const a of win.document.querySelectorAll('a[href]')){
    const url=safeURL(a.href,win.location.href);
    if(url?.origin===win.location.origin && /^\/(?:phim|xem-phim)\//.test(url.pathname) && (url.pathname.includes('/'+row.movie) || identityText(a.textContent)===identityText(row.title)))candidates.push(url.href);
  }
  if(/^[a-z0-9-]{1,200}$/i.test(row.movie))candidates.push(new URL('/xem-phim/'+row.movie,win.location.href).href);
  const load=async url=>{
    const response=await win.fetch(url,{credentials:'same-origin'});
    if(!response.ok || response.url && safeURL(response.url)?.origin!==win.location.origin)return null;
    const html=await response.text();
    return html.length<=2_000_000?new win.DOMParser().parseFromString(html,'text/html'):null;
  };
  for(const url of [...new Set(candidates)].slice(0,5)){
    const doc=await load(url);if(!doc)continue;
    const site=detectSite(doc,url),context=readContext(site,doc);
    if(!context || !sameFilm(row,context))continue;
    switch(site.kind){
      case 'next-ordered':
      case 'next-basic':{
        const prefix=site.kind==='next-basic'?'/api/baseapi':'/baseapi';
        const response=await win.fetch(prefix+'/api/v1/episodes/by-idMovie/'+encodeURIComponent(context.movieID),{credentials:'same-origin'});
        if(!response.ok)return null;
        const data=await response.json(),entries=Array.isArray(data)?data:data.result;
        if(!Array.isArray(entries) || entries.length>10000)return null;
        const found=entries.filter(e=>laneKey(e.server_type || e.server)===laneKey(row.lane) && String(e.season_number || 1)===row.season && episodeKey(e.name)===episodeKey(row.episode));
        if(found.length!==1 || !/^\d+$/.test(String(found[0].id)))return null;
        return {url:new URL('/xem-phim/'+encodeURIComponent(context.movie)+'.'+found[0].id,win.location.href).href,source:site.kind,lane:found[0].server_type || found[0].server};
      }
      case 'legacy-panels':{
        const lane=laneKey(row.lane);if(!['subtitle','voiceover'].includes(lane))return null;
        const nodes=[...doc.querySelectorAll(lane==='voiceover'?'.btn-episode.chaptertm':'.btn-episode.chaptervs')];
        const found=nodes.filter(n=>episodeKey(n.querySelector('.v-title,.info')?.textContent.trim() || n.textContent.trim())===episodeKey(row.episode));
        const target=found.length===1?safeURL(found[0].getAttribute('href'),url):null;
        return target?.origin===win.location.origin?{url:target.href,source:site.kind,lane}:null;
      }
      default:return null;
    }
  }
  return null;
}
