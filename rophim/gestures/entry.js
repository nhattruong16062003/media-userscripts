import {contextKey,nextRoute} from '../lib/sites.js';
import {createBridge} from '../lib/bridge.js';
import {customPlayerControls} from '../lib/custom-controls.js';
import {watchNavigation} from '../lib/watch-navigation.js';
import {playerStartupGuard} from '../lib/player-ui.js';
import {FRAME_ORIGINS,isFrameURL,isSiteOrigin,safeURL} from '../lib/core.js';
import {runFamily} from '../../shared/bridge/ownership.js';
import {childLoading} from '../lib/player-loading.js';

function startGestures(win,page) {
  // document-start may run before <html> exists, especially in a new iframe.
  // Initialize at the first root insertion so the startup guard cannot throw
  // and prevent all controls from ever attaching.
  if(!win.document.documentElement){
    const early=new win.MutationObserver(()=>{if(win.document.documentElement){early.disconnect();startGestures(win,page);}});
    early.observe(win.document,{childList:true});return;
  }
  let mounted=null,site=null,context=null,bridge=null,frameFullscreen=false,endedKey='';
  const releaseStartup=win.parent!==win && FRAME_ORIGINS.has(win.location.origin)?playerStartupGuard(win):()=>{};
  const childGate=win.parent!==win && FRAME_ORIGINS.has(win.location.origin)?childLoading(win):null;
  const controlsReady=()=>!!context && !!mounted?.ui.shell.isConnected && !mounted.ui.shell.hidden && mounted.player.state().ready && !mounted.player.state().ad;
  const navigation=win.parent===win?watchNavigation(win,{onChange:()=>bridge?.refresh(),ownsPlayer:()=>bridge?.state()?.ready && !bridge.state().ad}):null;
  const unbind=()=>{mounted?.ui.dispose();mounted=null;};
  const next=async(action,request)=>{
    if(!site || !context)return 'unavailable';
    if(action==='fullscreen')return navigation?.fullscreen(site) ?? 'unavailable';
    const selectedSite=site,selectedContext=context,expected=contextKey(context),frame=site.frame,src=frame?.src,href=win.location.href;
    try {
      const url=await nextRoute(selectedSite,selectedContext,win);
      if(!request?.isCurrent() || win.location.href!==href || expected!==contextKey(context) || site?.frame!==frame || frame?.src!==src || !frame?.isConnected)return 'unavailable';
      if(!url)return 'missing';
      if(selectedSite.kind==='legacy-panels'){
        win.document.cookie=`selectedServerRophim=${encodeURIComponent(selectedContext.server)}; path=/; SameSite=Lax`;
        win.document.cookie=`selectedVidTypeRophim=${selectedContext.lane}; path=/; SameSite=Lax`;
      }
      return navigation.navigate(url,{site:selectedSite,keepLane:true,isCurrent:request.isCurrent});
    }catch{return 'error';}
  };
  bridge=createBridge(win,page,'gestures',{
    update(info){
      site=info.site;context=info.context;frameFullscreen=info.fullscreen;navigation?.update(info);
      // The active frame owns UI; the parent only routes validated requests.
      if(win.parent===win){
        // Preserve the website's auto-next preference, but choose the episode
        // from the current validated lane rather than a native packet's ID.
        const state=info.state,key=contextKey(context)+'|'+info.media;
        if(!state?.ended)endedKey='';
        else if(state.ready && !state.ad && state.played && context && endedKey!==key){
          endedKey=key;let enabled=false;try{enabled=win.localStorage.getItem('autoNextEpisode')==='true';}catch{/* unavailable preference */}
          if(enabled){
            const frame=site.frame,src=frame.src,expected=contextKey(context);
            const isCurrent=()=>site?.frame===frame && frame.src===src && contextKey(context)===expected && bridge?.state()?.ready && bridge.state().ended && !bridge.state().ad;
            next('next',{isCurrent});
          }
        }
        return;
      }
      if(info.player!==mounted?.player){
        unbind();
        if(info.player)mounted={player:info.player,ui:customPlayerControls(win,info.player,{autoPlay:true,isFullscreen:()=>frameFullscreen,onNext:()=>bridge?.request('next') ?? false,onFullscreen:()=>{const pending=bridge?.request('fullscreen');return pending && pending.then(status=>{if(status==='fullscreen' || status==='windowed'){frameFullscreen=status==='fullscreen';mounted?.ui.update();}return status;});}})};
      }
      mounted?.ui.setContext(context);childGate?.update(controlsReady());
    },
    unbind,request:next,controlsReady,
  });
  win.addEventListener('pagehide',event=>{if(!event.persisted){bridge.dispose();navigation?.dispose();unbind();childGate?.dispose();releaseStartup();}});
}
runFamily(window,{family:'rophim',feature:'gestures',isSiteURL:isSiteOrigin,isFrameURL,isFrameOrigin:value=>FRAME_ORIGINS.has(safeURL(value)?.origin)},()=>startGestures(window, typeof unsafeWindow==='undefined' ? window : unsafeWindow));
