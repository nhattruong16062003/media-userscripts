import {contextKey,nextRoute} from '../lib/sites.js';
import {createBridge} from '../lib/bridge.js';
import {customPlayerControls} from '../lib/custom-controls.js';

function startGestures(win,page) {
  let mounted=null,site=null,context=null,bridge=null;
  const unbind=()=>{mounted?.ui.dispose();mounted=null;};
  const next=async(action,request)=>{
    if(!site || !context)return 'unavailable';
    const selectedSite=site,selectedContext=context,expected=contextKey(context),frame=site.frame,src=frame?.src,href=win.location.href;
    try {
      const url=await nextRoute(selectedSite,selectedContext,win);
      if(!request?.isCurrent() || win.location.href!==href || expected!==contextKey(context) || site?.frame!==frame || frame?.src!==src || !frame?.isConnected)return 'unavailable';
      if(!url)return 'missing';
      if(selectedSite.kind==='legacy-panels'){
        win.document.cookie=`selectedServerRophim=${encodeURIComponent(selectedContext.server)}; path=/; SameSite=Lax`;
        win.document.cookie=`selectedVidTypeRophim=${selectedContext.lane}; path=/; SameSite=Lax`;
      }
      win.location.assign(url);return 'navigating';
    }catch{return 'error';}
  };
  bridge=createBridge(win,page,'gestures',{
    update(info){
      site=info.site;context=info.context;
      // The active frame owns UI; the parent only routes validated requests.
      if(win.parent===win)return;
      if(info.player!==mounted?.player){
        unbind();
        if(info.player)mounted={player:info.player,ui:customPlayerControls(win,info.player,{onNext:()=>bridge?.request('next') ?? false})};
      }
      mounted?.ui.setContext(context);
    },
    unbind,request:next,
  });
  win.addEventListener('pagehide',event=>{if(!event.persisted){bridge.dispose();unbind();}});
}
startGestures(window, typeof unsafeWindow==='undefined' ? window : unsafeWindow);
