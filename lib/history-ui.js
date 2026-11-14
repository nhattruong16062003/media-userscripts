import {safeURL} from './core.js';
import {identityText,laneKey,sameFilm} from './identity.js';
import {detectSite,readContext} from './sites.js';

export function historyIcon(name){
  const paths={play:'<path d="M8 5l11 7-11 7z"/>',arrow:'<path d="M5 12h14m-5-5l5 5-5 5"/>',external:'<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',close:'<path d="M6 6l12 12M18 6L6 18"/>',history:'<path d="M3 11a9 9 0 1 1 2.5 7M3 4v7h7m2-4v5l3 2"/>',trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>'};
  return `<svg viewBox="0 0 24 24" fill="${name==='play'?'currentColor':'none'}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
}
export function historyEpisode(row){
  const episode=/^(?:tập\s*)?full$/i.test(row.episode)?'Phim lẻ':/^tập\b/i.test(row.episode)?row.episode:'Tập '+row.episode.replace(/^0+(?=\d)/,'');
  const lane={subtitle:'Vietsub',dubbed:'Lồng tiếng',voiceover:'Thuyết minh'}[laneKey(row.lane)] || row.lane;
  return (Number(row.season)>1?'Phần '+row.season+' · ':'')+episode+' · '+lane;
}
export function historyArtwork(row,doc){
  const stored=safeURL(row.poster,row.url);if(stored && row.poster)return stored.href;
  for(const link of doc.querySelectorAll('a[href]')){
    if(link.closest('[data-rp-ui]'))continue;
    const url=safeURL(link.href,doc.location?.href),label=link.getAttribute('title') || link.textContent;
    const slug=url?.pathname.match(/^\/(?:phim|xem-phim)\/([^/]+)\/?$/)?.[1]?.replace(/\.\d+$/,'').replace(/-tap-\d+$/,'');
    if(url?.origin===doc.location?.origin && slug && (slug===row.movie || identityText(label) && identityText(label)===identityText(row.title))){
      const image=link.querySelector('img'),raw=image?.getAttribute('data-src') || image?.getAttribute('src');const imageURL=raw?safeURL(raw,url.href):null;if(imageURL)return imageURL.href;
    }
  }
  return '';
}
export async function loadHistoryArtwork(row,win){
  if(typeof win.fetch!=='function')return '';
  const original=safeURL(row.url);let target=original?.origin===win.location.origin?original:null;
  if(!target){for(const link of win.document.querySelectorAll('a[href]')){if(link.closest('[data-rp-ui]'))continue;const url=safeURL(link.href,win.location.href);if(url?.origin===win.location.origin && /^\/(?:phim|xem-phim)\//.test(url.pathname) && url.pathname.split('/').at(-1)===row.movie){target=url;break;}}}
  if(!target && /^[a-z0-9-]{1,200}$/i.test(row.movie))target=safeURL('/xem-phim/'+row.movie,win.location.href);
  if(!target || target.origin!==win.location.origin || !/^\/(?:phim|xem-phim)\//.test(target.pathname))return '';
  const controller=new win.AbortController(),timer=win.setTimeout(()=>controller.abort(),6000);
  try{
    const response=await win.fetch(target.href,{credentials:'same-origin',signal:controller.signal});
    if(!response.ok || response.url && safeURL(response.url)?.origin!==win.location.origin)return '';
    const html=await response.text();if(html.length>2_000_000)return '';
    const doc=new win.DOMParser().parseFromString(html,'text/html'),context=readContext(detectSite(doc,target.href),doc);
    const title=(doc.querySelector('meta[property="og:title"]')?.content || doc.title).split('|')[0].replace(/\s*-\s*Tập\s*\d+.*$/i,'').trim();
    // Structured identity takes precedence: an equal display title cannot
    // override a conflicting year, IMDb/TMDB identity or media type.
    if(context ? !sameFilm(row,context) : !identityText(row.title) || identityText(title)!==identityText(row.title))return '';
    const raw=context?.poster || doc.querySelector('meta[property="og:image"]')?.content;
    return raw?safeURL(raw,target.href)?.href || '':'';
  }catch{return '';}finally{win.clearTimeout(timer);}
}
export function historyCard(doc,row,{onContinue,onRemove}={}){
  const card=doc.createElement('article');card.className='rp-history-card';
  const cover=doc.createElement('div');cover.className='rp-history-cover';card.append(cover);
  const fallback=doc.createElement('span');fallback.className='rp-cover-fallback';fallback.textContent=row.title.slice(0,1);fallback.setAttribute('aria-hidden','true');cover.append(fallback);
  const src=historyArtwork(row,doc);
  if(src){const image=doc.createElement('img');image.className='rp-history-poster';image.src=src;image.alt='';image.loading='lazy';image.decoding='async';image.referrerPolicy='no-referrer';image.addEventListener('error',()=>image.remove(),{once:true});cover.append(image);}
  const action=doc.createElement('button');action.type='button';action.className='rp-cover-action';action.setAttribute('aria-label','Xem tiếp '+row.title);action.innerHTML='<span class="rp-play-badge">'+historyIcon('play')+'</span>';cover.append(action);
  const remaining=doc.createElement('span');remaining.className='rp-history-remaining';remaining.textContent=row.completed?'Đã xem':'Còn '+Math.max(1,Math.ceil((row.duration-row.time)/60))+' phút';cover.append(remaining);
  const progress=doc.createElement('div');progress.className='rp-history-progress';progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','Tiến độ '+row.title);progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100');const percent=Math.max(0,Math.min(100,Math.round(100*row.time/row.duration)));progress.setAttribute('aria-valuenow',String(percent));progress.style.setProperty('--rp-progress',percent+'%');cover.append(progress);
  const original=doc.createElement('a');original.className='rp-original-link';original.href=row.url;original.setAttribute('aria-label','Mở trang đã xem: '+row.title);original.title='Mở trang đã xem';original.innerHTML=historyIcon('external');cover.append(original);
  const title=doc.createElement('h3');title.className='rp-history-title';title.textContent=row.title;title.title=row.title;card.append(title);
  const meta=doc.createElement('p');meta.className='rp-history-meta';meta.textContent=historyEpisode(row);card.append(meta);
  const footer=doc.createElement('div');footer.className='rp-history-card-footer';card.append(footer);
  const resume=doc.createElement('button');resume.type='button';resume.className='rp-resume-link';resume.innerHTML=historyIcon('play')+'<span>Xem tiếp</span>';footer.append(resume);
  const position=doc.createElement('span');position.className='rp-history-position';const format=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');position.textContent=format(row.time)+' / '+format(row.duration);footer.append(position);
  for(const button of [action,resume])button.addEventListener('click',()=>onContinue?.(row,card,resume));
  if(onRemove){const remove=doc.createElement('button');remove.type='button';remove.className='rp-history-remove';remove.innerHTML=historyIcon('trash');remove.setAttribute('aria-label','Xóa '+row.title+' khỏi lịch sử');remove.title='Xóa khỏi lịch sử';remove.addEventListener('click',()=>onRemove(row,card));footer.append(remove);}
  return card;
}
export function historyUIStyle(doc){
  if(doc.getElementById('rp-history-style'))return;
  const style=doc.createElement('style');style.id='rp-history-style';style.textContent=`
  [data-rp-ui="continue"],[data-rp-ui="history"],[data-rp-ui="history-list"]{--rp-accent:#ffd875;--rp-muted:#a4a8b3;--rp-panel:#20232d;color:#f5f5f6;font:inherit;font-size:14px;line-height:1.5;box-sizing:border-box}
  .rp-history-section *,.rp-history-dialog *,.rp-history-toolbar *{box-sizing:border-box}.rp-history-section[hidden],.rp-history-toolbar[hidden],.rp-history-dialog[hidden],.rp-history-toolbar [hidden]{display:none!important}
  .rp-history-section{width:100%;min-width:0;margin:0 0 36px;padding:0;background:none;border:0;position:relative}
  .rp-history-section[data-rp-layout="landing"]{margin-top:36px}.rp-history-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 18px}.rp-history-section .rp-history-heading h2,.rp-history-dialog h2{font-size:clamp(20px,2vw,28px);font-weight:650;line-height:1.25;margin:0;color:inherit;letter-spacing:-.5px}
  .rp-history-section button,.rp-history-section a,.rp-history-dialog button,.rp-history-dialog a,.rp-history-toolbar button{font:inherit;text-decoration:none;cursor:pointer;letter-spacing:normal}
  .rp-history-section .rp-history-all,.rp-history-toolbar .rp-history-all,.rp-history-dialog .rp-dialog-close{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;border:0;border-radius:8px;padding:6px 0;background:transparent;color:var(--rp-muted);white-space:nowrap;font-size:13px}
  .rp-history-all svg,.rp-dialog-close svg,.rp-history-remove svg,.rp-resume-link svg,.rp-original-link svg{width:17px;height:17px;flex:none}.rp-history-all:hover,.rp-history-toolbar .rp-history-all:hover{color:var(--rp-accent)}
  .rp-history-cards{display:grid;grid-auto-flow:column;grid-auto-columns:clamp(220px,24vw,290px);justify-content:start;gap:20px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x proximity;scrollbar-width:thin;scrollbar-color:#454855 transparent;padding:0 0 12px}
  .rp-history-card{min-width:0;scroll-snap-align:start;background:none;border:0;padding:0;margin:0}.rp-history-cover{position:relative;isolation:isolate;aspect-ratio:16/9;overflow:hidden;border-radius:12px;background:linear-gradient(130deg,#383c50,#191c28);margin-bottom:12px}
  .rp-cover-fallback{position:absolute;inset:0;display:grid;place-items:center;font-size:46px;font-weight:600;color:#ffffff50}.rp-history-poster{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;transition:transform .2s ease}
  .rp-history-cover:after{content:"";position:absolute;inset:35% 0 0;background:linear-gradient(transparent,#000b);pointer-events:none;z-index:1}
  .rp-history-cover .rp-cover-action{position:absolute;inset:0;z-index:2;width:100%;height:100%;padding:0;border:0;border-radius:0;background:transparent;color:#fff;display:flex;align-items:flex-end;justify-content:flex-start}
  .rp-play-badge{display:grid;place-items:center;width:38px;height:38px;margin:0 0 17px 14px;border-radius:50%;background:#ffffffed;color:#171a23;box-shadow:0 2px 12px #0004}.rp-play-badge svg{width:19px;height:19px;margin-left:2px}
  .rp-history-remaining{position:absolute;right:12px;bottom:22px;color:#fff;font-size:12px;z-index:2;pointer-events:none}.rp-history-progress{position:absolute;bottom:0;left:0;right:0;height:3px;background:#ffffff45;z-index:4}.rp-history-progress:before{content:"";display:block;width:var(--rp-progress);height:100%;background:var(--rp-accent)}
  .rp-history-cover .rp-original-link{position:absolute;top:10px;right:10px;z-index:3;display:grid;place-items:center;width:30px;height:30px;padding:7px;border:0;border-radius:50%;background:#111621b8;color:#fff;opacity:0;transition:opacity .15s}
  .rp-history-card:hover .rp-original-link,.rp-original-link:focus-visible{opacity:1}.rp-history-card:hover .rp-history-poster{transform:scale(1.035)}
  .rp-history-card .rp-history-title{font-size:15px;font-weight:550;color:inherit;margin:0 0 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.5}.rp-history-meta{font-size:12px;color:var(--rp-muted);margin:0 0 8px;line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rp-history-card-footer{display:flex;align-items:center;gap:12px;min-width:0}.rp-history-card .rp-resume-link{display:inline-flex;align-items:center;gap:5px;border:0;border-radius:5px;background:none;color:var(--rp-accent);padding:3px 0;font-size:12px;font-weight:550;min-height:28px;white-space:nowrap}.rp-resume-link svg{width:13px;height:13px}.rp-history-position{font-size:11px;color:#858a98;font-variant-numeric:tabular-nums;white-space:nowrap}
  .rp-history-card .rp-history-remove{display:grid;place-items:center;margin-left:auto;border:0;border-radius:6px;padding:5px;background:transparent;color:#858a98}.rp-history-remove:hover{color:#ff9c9c;background:#ffffff0a}
  .rp-history-empty{display:flex;align-items:center;gap:14px;border:1px dashed #ffffff1c;border-radius:12px;padding:20px;color:var(--rp-muted);font-size:13px}.rp-history-empty svg{width:24px;height:24px;color:var(--rp-accent);flex:none}.rp-history-empty p{margin:0}
  .rp-history-toolbar{display:flex;justify-content:flex-end;align-items:center;gap:12px;margin:12px 0;padding:0 12px;min-height:40px}.rp-history-toolbar .rp-resume-prompt{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;background:var(--rp-accent);color:#171a23;border:0;border-radius:999px;font-size:13px;font-weight:600}
  .rp-history-toolbar .rp-toast{font-size:12px;color:var(--rp-muted);max-width:420px}.rp-history-toolbar{flex-wrap:wrap}
  .rp-history-dialog{position:fixed;inset:0;margin:auto;width:min(100% - 48px,1000px);height:fit-content;max-height:85dvh;padding:28px;border:1px solid #ffffff18;border-radius:18px;background:#191c25;color:#f5f5f6;box-shadow:0 20px 100px #0008;overflow:auto;z-index:2147483646}.rp-history-dialog::backdrop{background:#080a10bc;backdrop-filter:blur(5px)}.rp-history-dialog .rp-history-cards{grid-auto-flow:row;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));grid-auto-columns:auto;gap:26px 20px;overflow:visible}.rp-history-dialog .rp-dialog-close{width:36px;background:#ffffff0a;padding:8px}.rp-history-dialog .rp-history-heading{margin-bottom:24px}
  .rp-history-section :focus-visible,.rp-history-dialog :focus-visible,.rp-history-toolbar :focus-visible{outline:2px solid var(--rp-accent);outline-offset:3px}.rp-history-section button:disabled,.rp-history-dialog button:disabled{opacity:.6;cursor:wait}.rp-history-card .rp-card-status{font-size:12px;margin:6px 0 0;color:var(--rp-accent)}
  @media(max-width:600px){.rp-history-section{margin-bottom:24px}.rp-history-heading{margin-bottom:14px}.rp-history-cards{grid-auto-columns:72%;gap:14px;scrollbar-width:none}.rp-history-cover{border-radius:10px}.rp-history-card .rp-history-title{font-size:14px}.rp-history-cover .rp-original-link{opacity:1}.rp-history-dialog{width:calc(100% - 24px);padding:18px;max-height:90dvh;border-radius:14px}.rp-history-dialog .rp-history-cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 12px}.rp-history-dialog .rp-history-card-footer{gap:4px;flex-wrap:wrap}.rp-history-dialog .rp-history-position{font-size:10px}.rp-history-dialog .rp-play-badge{width:30px;height:30px;margin:0 0 12px 10px}.rp-history-dialog .rp-history-remaining{font-size:10px;bottom:16px}.rp-history-dialog .rp-history-meta{font-size:11px}}
  @media(prefers-reduced-motion:reduce){.rp-history-poster,.rp-original-link{transition:none}}
  `;(doc.head || doc.documentElement).append(style);
}
