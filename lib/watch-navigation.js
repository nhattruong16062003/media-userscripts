import {safeURL,FRAME_ORIGINS} from './core.js';
import {detectSite,readContext,contextKey,commitWatchSite} from './sites.js';
import {sameFilm,laneKey} from './identity.js';

// The iframe element and its fullscreen ancestor survive an episode change.
// New HTML is read as data; no fetched scripts or React tree are executed.
export function watchNavigation(win,{onChange=()=>{},ownsPlayer=()=>false}={}){
  const doc=win.document;let serial=0,controller=null,cover=null,coverTimer=0,disposed=false;
  const covered=new WeakMap();
  const href=()=>win.location.origin+win.location.pathname;
  function style(){
    if(doc.getElementById('rp-watch-navigation-style'))return;
    const node=doc.createElement('style');node.id='rp-watch-navigation-style';
    node.textContent='[data-rp-frame-host]{position:relative}[data-rp-frame-host]:fullscreen{width:100%;height:100%;background:#000;overflow:hidden}[data-rp-frame-host]:fullscreen>iframe{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:0!important}.rp-watch-loading{position:absolute;inset:0;z-index:2147483645;display:grid;place-items:center;background:#000;color:#fff;pointer-events:auto}.rp-watch-spinner{width:28px;height:28px;border:2px solid #ffffff38;border-top-color:#fff;border-radius:50%;animation:rp-watch-spin .8s linear infinite}@keyframes rp-watch-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.rp-watch-spinner{animation:none}}';
    (doc.head || doc.documentElement).append(node);
  }
  function host(site){const node=site?.frame?.parentElement;if(node){style();node.dataset.rpFrameHost='1';}return node;}
  function clearCover(){win.clearTimeout(coverTimer);cover?.remove();cover=null;}
  function loading(site){clearCover();const parent=host(site);if(!parent)return;covered.set(site.frame,site.frame.src);cover=doc.createElement('div');cover.dataset.rpUi='watch-loading';cover.className='rp-watch-loading';cover.setAttribute('role','status');cover.setAttribute('aria-label','Đang tải tập phim');cover.innerHTML='<span class="rp-watch-spinner" aria-hidden="true"></span>';parent.append(cover);coverTimer=win.setTimeout(clearCover,8000);}
  async function navigate(value,{site=detectSite(doc,win.location.href),keepLane=false,isCurrent=()=>true,pop=false}={}){
    const target=safeURL(value,win.location.href),current=readContext(site,doc),frame=site?.frame;
    if(disposed || !current || !target || target.origin!==win.location.origin || !target.pathname.startsWith('/xem-phim/') || !frame?.isConnected)return 'unavailable';
    if(!pop && target.origin+target.pathname===href())return 'navigating';
    const id=++serial,oldHref=win.location.href,oldSrc=frame.src,key=contextKey(current);
    controller?.abort();const active=new win.AbortController();controller=active;
    const timer=win.setTimeout(()=>active.abort(),10000);
    const live=()=>!disposed && id===serial && !active.signal.aborted && isCurrent() && frame.isConnected && frame.src===oldSrc && (pop || win.location.href===oldHref) && contextKey(readContext(site,doc))===key;
    try{
      const response=await win.fetch(target.href,{credentials:'same-origin',signal:active.signal});
      if(!response.ok || response.url && safeURL(response.url)?.origin!==target.origin)return 'error';
      const html=await response.text();if(!live() || html.length>2_000_000)return 'unavailable';
      const parsed=new win.DOMParser().parseFromString(html,'text/html');
      const nextSite=detectSite(parsed,target.href);
      if(!nextSite || nextSite.kind!==site.kind)return 'unavailable';
      if(nextSite.kind==='legacy-panels'){
        const active=[...parsed.querySelectorAll('.btn-episode.on-air')].some(n=>safeURL(n.getAttribute('href'),target.href)?.pathname===target.pathname);
        const episode=[...parsed.querySelectorAll(current.lane==='tm'?'.chaptertm':'.chaptervs')].some(n=>safeURL(n.getAttribute('href'),target.href)?.pathname===target.pathname);
        if(!active)return 'unavailable';if(!episode)return 'missing';
        nextSite.preferences={selectedVidTypeRophim:current.lane,selectedServerRophim:current.server};
        const panel=[...parsed.querySelectorAll('.server-picker[data-panel]')].find(n=>n.dataset.panel===(current.lane==='tm'?'thuyetminh':'vietsub'));
        const selected=[...panel?.querySelectorAll('[data-server][data-value]') || []].find(n=>n.dataset.server===current.server);
        if(!selected || !FRAME_ORIGINS.has(safeURL(selected.dataset.value)?.origin))return 'unavailable';
        nextSite.frame.src=selected.dataset.value;
      }
      const next=readContext(nextSite,parsed),embed=safeURL(nextSite.frame.src);
      if(!next || !sameFilm(current,next) || !embed || !FRAME_ORIGINS.has(embed.origin))return 'unavailable';
      if(keepLane && (laneKey(next.lane)!==laneKey(current.lane) || next.season!==current.season))return 'missing';
      if(!live())return 'unavailable';
      loading(site);
      // Call the native History method: React's patched pushState would start a
      // second router navigation and replace the player subtree we preserve.
      if(!pop)win.History.prototype.pushState.call(win.history,{...win.history.state,rpWatch:true},'',target.href);
      commitWatchSite(doc,nextSite);doc.title=parsed.title;
      for(const a of doc.querySelectorAll('a[href].on-air'))if(safeURL(a.href)?.pathname.startsWith('/xem-phim/'))a.classList.remove('on-air');
      for(const a of doc.querySelectorAll('.de-eps a[href],.playlist a[href],a.btn-episode[href]'))if(safeURL(a.href)?.origin===target.origin && safeURL(a.href)?.pathname===target.pathname)a.classList.add('on-air');
      frame.src=embed.href;onChange();return 'navigating';
    }catch{return id===serial?'error':'unavailable';}finally{win.clearTimeout(timer);if(controller===active)controller=null;}
  }
  const click=event=>{
    if(event.defaultPrevented || event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
    const link=event.target.closest?.('a[href]');if(!link || link.closest('[data-rp-ui]') || link.target && link.target!=='_self' || link.hasAttribute('download'))return;
    const site=detectSite(doc,win.location.href),context=readContext(site,doc),url=safeURL(link.href);
    if(!context || url?.origin!==win.location.origin || !url.pathname.startsWith('/xem-phim/'))return;
    const slug=url.pathname.slice('/xem-phim/'.length).replace(/\.\d+$/,'').replace(/-tap-\d+$/,'');
    if(slug!==context.movie)return;
    event.preventDefault();event.stopImmediatePropagation();
    navigate(url.href,{site}).then(status=>{if(status!=='navigating')link.setAttribute('title','Chưa tải được tập. Bấm để thử lại.');});
  };
  doc.addEventListener('click',click,true);
  // The provider's unversioned CHANGE_EPISODE packet can make the original
  // React listener navigate using stale props or a different translation. Do
  // not turn this packet into a command: custom auto-next uses authenticated
  // ended state from our bridge instead. Leave native playback alone until
  // our bridge actually owns a ready content player.
  const nativeNext=event=>{
    if(event.data?.type!=='CHANGE_EPISODE' || !ownsPlayer())return;
    const site=detectSite(doc,win.location.href),origin=safeURL(site?.frame?.src)?.origin;
    if(!site || !FRAME_ORIGINS.has(origin) || event.origin!==origin || event.source!==site.frame.contentWindow)return;
    event.stopImmediatePropagation();
  };
  win.addEventListener('message',nativeNext,true);
  const popstate=event=>{
    const raw=doc.getElementById('rp-watch-descriptor')?.textContent;if(!raw)return;
    let previous;try{previous=JSON.parse(raw);}catch{return;}
    const previousURL=safeURL(previous.href),target=safeURL(win.location.href);
    if(!previousURL || !target || target.origin!==previousURL.origin || !target.pathname.startsWith('/xem-phim/'))return;
    // Use the last committed descriptor until the new entry has loaded.
    const previousSite=detectSite(doc,previousURL.href),current=readContext(previousSite,doc);
    const slug=target.pathname.slice('/xem-phim/'.length).replace(/\.\d+$/,'').replace(/-tap-\d+$/,'');
    if(!current || slug!==current.movie)return;
    event.stopImmediatePropagation();navigate(target.href,{site:previousSite,pop:true}).then(status=>{if(status!=='navigating' && win.location.href===target.href){win.History.prototype.replaceState.call(win.history,win.history.state,'',previousURL.href);onChange();}});
  };
  win.addEventListener('popstate',popstate,true);
  const fullscreenChanged=()=>onChange();doc.addEventListener('fullscreenchange',fullscreenChanged);
  return {
    navigate,
    fullscreen(site){const node=host(site);if(!node)return Promise.resolve('unavailable');try{return Promise.resolve(doc.fullscreenElement===node?doc.exitFullscreen():node.requestFullscreen()).then(()=>doc.fullscreenElement===node?'fullscreen':'windowed',()=> 'error');}catch{return Promise.resolve('error');}},
    update(info){if(info.site?.frame && info.context && !info.state && covered.get(info.site.frame)!==info.site.frame.src)loading(info.site);if(cover){if(info.site?.frame)covered.set(info.site.frame,info.site.frame.src);if(info.state?.ready || info.state?.ad)clearCover();}},
    dispose(){disposed=true;serial++;controller?.abort();clearCover();doc.removeEventListener('click',click,true);win.removeEventListener('message',nativeNext,true);win.removeEventListener('popstate',popstate,true);doc.removeEventListener('fullscreenchange',fullscreenChanged);},
  };
}
