// Site orchestration stays in player-controller. SharedPlayer owns all custom
// controls; remote commands still cross the existing authenticated MC bridge.
function createMotchillCustomPlayer(sites,bridge,hooks){
  if(typeof SharedPlayer==='undefined')return null;
  const nativeContract=video=>video.matches('#video') && video.closest('#player-wrap')?.querySelector('#controls #fs-btn') ? video.closest('#player-wrap'):false;
  // #video_mask is a loading poster: the provider removes it on JW ready.
  // Only persistent layout nodes identify this native controls contract.
  const enhancementRoot=()=>document.querySelector('#rp-player:has(.main-player > #player):has(#video_eps):has(#player_top)');
  const candidate=()=>SharedPlayer.playerCandidate(window,window,{nativeContract});
  let mounted=null,probe=null,probeSource='',guardOff=null,disposed=false,observer=null,rootObserver=null;
  let localFullscreen=null,localRoot=null,persistent=null,changing=false,providerIdentity=null,resumeAlias=null,statusPanel=null,preservePause=false;
  const mobile=()=>window.matchMedia?.('(pointer: coarse)').matches===true || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const persistentProvider=()=>window.top!==window && mobile() && !!enhancementRoot() && candidate()?.kind==='jw' && typeof candidate()?.api.load==='function';
  const presentationRoot=found=>found?SharedPlayer.mediaPresentationRoot(window,found.video,enhancementRoot() || found.root || document.body):null;
  const localPresentation=()=>{if(window.top===window || !mobile() || bridge.managed)return false;const found=candidate();return !!found && !!presentationRoot(found);};
  const waiting=new Map();
  let storage;try{storage=window.localStorage;}catch{/* storage disabled */}
  const audioPreferences=SharedPlayer.audioPreferenceStore(storage,'media-userscripts:motchill:audio:v1');
  function guardedFrames(){
    // These extra slots receive status UI only. They do not authorize a new
    // origin, open a bridge session or infer an engine from the server label.
    const slots=[...document.querySelectorAll('#player iframe,#videoFrame,#player-wrapper iframe,#embed-player,.player-ratio iframe,.mc-player-stage>iframe')]
      .filter(frame=>frame.tagName==='IFRAME' && sites.visible(frame) && !sites.isPrepared(frame) && sites.url(frame.getAttribute('src')));
    const providerFrame=sites.nextProviderState?.()?.frame;
    return [...new Set([...sites.playerFrames(),...slots,...(providerFrame?[providerFrame]:[])])];
  }
  function prepareFrames(){
    if(disposed || window.top!==window)return;
    const frames=guardedFrames();
    for(const frame of frames){
      if(waiting.has(frame))continue;
      const reset=()=>{
        frame.dataset.mcDisplay='loading';const record=waiting.get(frame);if(!record)return;
        record.panel?.dispose();const host=frame.parentElement;
        if(host){
          if(getComputedStyle(host).position==='static')host.style.position='relative';
          record.host=host;record.panel=SharedPlayer.loadingPanel(window,host,{onRetry:()=>{if(frame.isConnected){reset();frame.src=frame.src;}}});
          if(!sites.playerFrames().includes(frame))record.panel.fail('Nguồn phát này chưa được hỗ trợ. Hãy chọn server khác.');
        }
      };
      const error=()=>waiting.get(frame)?.panel?.fail('Chưa tải được nguồn phim. Hãy thử lại hoặc đổi server.');
      const record={panel:null,host:null,reset,error,src:frame.src};waiting.set(frame,record);frame.addEventListener('load',reset);frame.addEventListener('error',error);reset();
    }
    for(const [frame,record] of waiting){
      if(!frame.isConnected || sites.isPrepared(frame) || !frames.includes(frame)){record.panel?.dispose();frame.removeEventListener('load',record.reset);frame.removeEventListener('error',record.error);waiting.delete(frame);}
      else if(frame.src!==record.src || frame.parentElement!==record.host){record.src=frame.src;record.reset();}
    }
  }
  function guard(){
    if(disposed || !document.documentElement)return;
    if(guardOff)return;
    // Only known engine contracts are hidden. Ad/challenge UI is independent.
    guardOff=SharedPlayer.playerStartupGuard(window);
    const style=document.createElement('style');style.dataset.mcCustomGuard='1';
    style.textContent='iframe[data-mc-display="loading"],html[data-mc-custom-owner] #player iframe:not([data-mc-display="custom"]),html[data-mc-custom-owner] #videoFrame:not([data-mc-display="custom"]),html[data-mc-custom-owner] #player-wrapper iframe:not([data-mc-display="custom"]),html[data-mc-custom-owner] #embed-player:not([data-mc-display="custom"]),html[data-mc-custom-owner] .player-ratio iframe:not([data-mc-display="custom"]),html[data-mc-custom-owner] .mc-player-stage>iframe:not([data-mc-display="custom"]),html[data-mc-custom-owner] .player-frame-stable>iframe:not([data-mc-display="custom"]){opacity:0!important;pointer-events:none!important}html[data-rp-controls-boot] #player-wrap>#controls,html[data-rp-controls-boot] #rp-player .custom-control,html[data-rp-controls-boot] #rp-player #player_top,html[data-rp-controls-boot] #rp-player #video_eps,html[data-rp-controls-boot] #rp-player #video_pop,html[data-rp-controls-boot] #rp-player #video_mask{display:none!important;pointer-events:none!important}';
    (document.head || document.documentElement).append(style);
    if(window.top===window){document.documentElement.dataset.mcCustomOwner='1';observer=new MutationObserver(prepareFrames);observer.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['src','data-mc-role']});prepareFrames();}
  }
  if(!document.documentElement){rootObserver=new MutationObserver(()=>{if(document.documentElement){rootObserver.disconnect();guard();}});rootObserver.observe(document,{childList:true});}
  function detach(){mounted?.ui.dispose();mounted?.player.dispose?.();mounted=null;if(probe && !candidate()){probe.dispose();probe=null;probeSource='';}}
  function clearLocalPresentation(){detach();statusPanel?.dispose();statusPanel=null;if(localRoot){delete localRoot.dataset.mcLocalFsRoot;localRoot=null;}}
  function localState(video){
    const found=candidate();
    const fingerprint=found?SharedPlayer.playerFingerprint(found):'';
    if(probe && (!found || probe.video!==found.video || probe.api!==found.api || probeSource!==fingerprint)){probe.dispose();probe=null;}
    if(found && !probe){probe=SharedPlayer.attachPlayer(found,{canRestoreAudio:()=>!changing && bridge.role!=='prepared' && !sites.isPrepared(found.video)});probeSource=fingerprint;}
    const own=found?.video===video,state=own?probe.state():null;
    const transfer=own && !!enhancementRoot() && found.kind==='jw' && typeof found.api.load==='function';
    const localPres=own && localPresentation() && !!bridge.parentContext && bridge.parentPresented && bridge.role!=='prepared';
    const provider=providerIdentity || (transfer && window.episode && {id:String(window.episode.id),movieId:String(window.episode.movieId),server:window.episode.server,season:window.episode.season_number});
    return {nativeEnhanced:!!own && !!enhancementRoot(),customCapable:!!own,localPresentation:localPres,playlist:transfer && state?.ready?SharedPlayer.mediaPlaylist(found.api.getPlaylistItem?.()):null,provider,changing,tracks:own?SharedPlayer.playerTracks(found):{},...(state?{ad:state.ad,initializable:state.initializable===true,load:state.load,...probe.audio()}: {})};
  }
  function commandTrack(video,group,id){const found=candidate(),state=localState(video);return !changing && state.customCapable && !state.ad && !video.error && video.readyState>=1 && found?.video===video && SharedPlayer.selectPlayerTrack(found,group,id);}
  function playAudible(video){const state=localState(video);return !changing && state.customCapable && !state.ad && probe?.video===video && probe.command('play-audible');}
  function initializePlayAudible(video){const state=localState(video);return !changing && state.customCapable && !state.ad && bridge.role!=='prepared' && !sites.isPrepared(video) && probe?.video===video && probe.command('initialize-play-audible');}
  function setMute(video,value){const state=localState(video);return !changing && state.customCapable && !state.ad && probe?.video===video && probe.command('mute',value);}
  function restoreAudio(video,value){const state=localState(video);return !changing && state.customCapable && !state.ad && bridge.role!=='prepared' && !sites.isPrepared(video) && probe?.video===video && probe.command('restore-audio',value);}
  function enhanceLocal(video){
    guard();
    const found=candidate();
    if(localPresentation() && found?.video===video && bridge.parentContext && bridge.parentPresented && bridge.role!=='prepared'){
      const root=presentationRoot(found);
      if(root){
        if(localRoot && localRoot!==root)delete localRoot.dataset.mcLocalFsRoot;
        localRoot=root;
        if(root.dataset.mcLocalFsRoot!=='1')root.dataset.mcLocalFsRoot='1';
        if(!localFullscreen)localFullscreen=SharedPlayer.fullscreenController(window,{onChange:()=>mounted?.ui.update()});
        const style=document.querySelector('[data-mc-local-fullscreen]') || document.createElement('style');
        if(!style.isConnected){style.dataset.mcLocalFullscreen='1';style.textContent='#rp-player:fullscreen{width:100vw!important;height:100vh!important;margin:0!important;background:#000}#rp-player:fullscreen>.main-player,#rp-player:fullscreen>.main-player>#player{width:100%!important;height:100%!important;position:absolute!important;inset:0!important}[data-mc-local-fs-root="1"]:fullscreen{width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;background:#000!important}[data-mc-local-fs-root="1"]:fullscreen video{width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important}[data-mc-local-fs-root="1"].jwplayer:fullscreen .jw-wrapper,[data-mc-local-fs-root="1"].jwplayer:fullscreen .jw-media{width:100%!important;height:100%!important;position:absolute!important;inset:0!important}';document.documentElement.append(style);}
        update(video,root,bridge.parentContext);
        const state=mounted?.player.state();
        if(state && !state.ready && !state.initializable){
          if(!statusPanel)statusPanel=SharedPlayer.loadingPanel(window,root,{onRetry:()=>{const current=candidate();if(!current || current.video.closest('.jw-flag-ads,[data-ad]'))return;if(current.kind==='jw'){const item=SharedPlayer.mediaPlaylist(current.api.getPlaylistItem?.());if(item){current.api.setMute(false);current.api.load(item);current.api.play(true)?.catch?.(()=>{});}}else{current.video.load?.();current.video.play?.()?.catch?.(()=>{});}}});
          if(state.failed)statusPanel.fail();
          statusPanel.update(state.load);
        }else{statusPanel?.dispose();statusPanel=null;}
        return true;
      }
    }
    clearLocalPresentation();
    return !!enhancementRoot() && found?.video===video;
  }
  function replaceMedia(video,value,signal){
    const found=candidate(),provider=value?.provider,playlist=SharedPlayer.mediaPlaylist(value?.playlist);
    const original=providerIdentity || window.episode && {movieId:String(window.episode.movieId),season:window.episode.season_number};
    if(!persistentProvider() || found?.video!==video || !playlist || !provider || !/^[1-9]\d*$/.test(provider.id) || provider.movieId!==original?.movieId || provider.season!==original?.season || !sites.translationKey(provider.server))return Promise.reject(new Error('Không xác minh được tập mới'));
    // This provider captures resumeData once at ready. Reusing its engine must
    // not save episode 3 into episode 2's native key, including onunload's
    // bracket assignment. Only that captured key is redirected; other storage
    // and our separate GM history keep their original identity and contents.
    if(!resumeAlias){
      try{
        const descriptor=Object.getOwnPropertyDescriptor(window,'localStorage'),target=window.localStorage;
        if(!descriptor?.configurable || !/^[1-9]\d*$/.test(String(window.episode?.id)))throw new Error('Không thể giữ định danh tiến độ');
        const initial='PlayerPosition-'+window.episode.id,active=()=>providerIdentity?'PlayerPosition-'+providerIdentity.id:initial;
        const get=key=>String(key)===initial?changing?null:target.getItem(active()):target.getItem(key);
        const set=(key,text)=>{if(String(key)!==initial)target.setItem(key,text);else if(!changing)target.setItem(active(),text);};
        const remove=key=>{if(String(key)!==initial)target.removeItem(key);else if(!changing)target.removeItem(active());};
        const proxy=new Proxy(target,{get(object,key){if(key==='getItem')return get;if(key==='setItem')return set;if(key==='removeItem')return remove;if(key===initial)return get(key);const result=Reflect.get(object,key,object);return typeof result==='function'?result.bind(object):result;},set(object,key,text){if(key===initial){set(key,text);return true;}return Reflect.set(object,key,text,object);},deleteProperty(object,key){if(key===initial){remove(key);return true;}return Reflect.deleteProperty(object,key);}});
        const getter=()=>proxy;Object.defineProperty(window,'localStorage',{...descriptor,get:getter});resumeAlias={descriptor,getter};
      }catch(error){return Promise.reject(error);}
    }
    // A fresh source can have empty played ranges after its muted warmup.
    // Keep the caller's Pause across UI remounts instead of treating that as
    // permission for the new controls to autoplay. Explicit Play still works.
    const wasPaused=found.video.paused===true;
    preservePause=value.paused===true;
    if(!persistent)persistent=SharedPlayer.persistentMediaSession(window,{candidate,onPending:value=>{changing=value;},onIdentity:identity=>{providerIdentity=identity;}});
    const root=enhancementRoot(),panel=SharedPlayer.loadingPanel(window,root,{});
    return persistent.replace(playlist,{signal,identity:provider,position:value.position,paused:value.paused,muted:value.muted,volume:value.volume}).catch(error=>{preservePause=wasPaused || signal?.aborted===true;throw error;}).finally(()=>panel.dispose());
  }
  function update(media,root,page){
    if(disposed)return false;
    guard();prepareFrames();
    const local=!media?.frame && candidate(),remote=media?.frame && media.state?.customCapable===true;
    if(remote && media.state.localPresentation===true){
      detach();media.frame.dataset.mcDisplay='custom';const record=waiting.get(media.frame);record?.panel?.dispose();if(record)record.panel=null;return true;
    }
    if(!root?.isConnected || !media || !(remote || local?.video===media)) {detach();return false;}
    const signature=remote?[media.session?.token,media.frame.src,media.state.mediaId].join('|'):SharedPlayer.playerFingerprint(local);
    if(mounted && (mounted.media!==media || mounted.root!==root || mounted.signature!==signature || !mounted.ui.shell.isConnected || local && (mounted.player.api!==local.api || mounted.player.nativeRoot!==local.root)))detach();
    if(!mounted){
      let player;
      if(remote){
        const current=()=>media.isConnected && media.state?.customCapable===true && bridge.getFrame(media.frame)===media && signature===[media.session?.token,media.frame.src,media.state.mediaId].join('|');
        const state=()=>{const value=media.state || {},ad=value.ad===true,duration=media.duration,time=media.currentTime;
          const ready=current() && !ad && !value.error && Number.isFinite(duration) && duration>0 && Number.isFinite(time) && media.readyState>=1;
          const initializable=current() && !ad && !value.error && !ready && value.initializable===true;
          return {kind:'remote',failed:!!value.error,initializable,ready,ad,time,duration,rate:media.playbackRate,paused:media.paused,ended:media.ended,played:value.played===true,load:SharedPlayer.validLoadMetrics(value.load)?value.load:null};};
        const command=(action,value)=>{
          const currentState=state();
          if(action==='initialize-play-audible')return currentState.initializable ? media.command('initialize-play-audible') : false;
          if(!currentState.ready)return false;
          switch(action){
            case 'seek':if(!Number.isFinite(value))return false;media.currentTime=Math.max(0,Math.min(value,media.duration-.25));break;
            case 'rate':if(!Number.isFinite(value) || value<.25 || value>4)return false;media.playbackRate=value;break;
            case 'mute':if(typeof value!=='boolean')return false;media.muted=value;break;
            case 'play':media.play();break;
            case 'play-audible':return media.command('play-audible');
            case 'restore-audio':return media.command('restore-audio',value);
            case 'pause':media.pause();break;
            default:return false;
          }return true;
        };
        player={root,video:media,state,command,audio:()=>({muted:media.muted,volume:media.volume}),bounds:()=>root.getBoundingClientRect(),fingerprint:()=>[media.session?.token,media.frame.src,media.state.mediaId].join('|'),tracks:()=>media.state?.tracks || {},selectTrack(group,id){if(!state().ready || !['quality','audio','captions'].includes(group) || !Number.isInteger(id) || !media.state?.tracks?.[group]?.some(item=>item.id===id))return false;media.command('track-'+group,id);return true;}};
      }else{
        // The bridge probe owns loading telemetry/tuning for this media. A
        // second monitor on the presentation would capture an already-tuned
        // value as its "native" config and undo the other monitor's rollback.
        localState(local.video);
        player=SharedPlayer.attachPlayer(local,{monitorLoad:false,canRestoreAudio:()=>!changing && bridge.role!=='prepared' && !sites.isPrepared(local.video)});player.nativeRoot=local.root;player.root=root;
        const mediaState=player.state;
        player.state=()=>{const value={...mediaState(),load:probe?.video===local.video && probe.api===local.api?probe.state().load:null};return changing?{...value,ready:false,initializable:false}:value;};
      }
      const ui=SharedPlayer.customPlayerControls(window,player,{autoPlay:true,nextTimeoutMs:localPresentation() || remote && media.state.nativeEnhanced?45000:undefined,
        canAutoPlay:()=>!changing && !preservePause,
        audioPreferences,canRestoreAudio:()=>!changing && bridge.role!=='prepared' && !sites.isPrepared(media) && media.state?.role!=='prepared',
        introSeconds:()=>localPresentation()?bridge.parentContext?.introSeconds ?? 90:hooks.introSeconds(),onIntro:()=>localPresentation()?bridge.requestIntro():hooks.onIntro(),onNext:()=>localPresentation()?bridge.requestNext():Promise.resolve(hooks.onNext()).then(ok=>ok===true || ok==='navigating'?'navigating':ok==='error'?'error':'missing'),
        isFullscreen:()=>localPresentation()?document.fullscreenElement===root:hooks.isFullscreen(),onFullscreen:()=>localPresentation()?localFullscreen.toggle(root):hooks.onFullscreen()});
      mounted={media,root,signature,player,ui};
    }
    mounted.ui.setContext({url:page.url,episodeID:page.episodeKey,lane:page.language,server:localPresentation()?page.server:hooks.serverKey(),next:page.next});
    if(remote){
      const record=waiting.get(media.frame),currentState=mounted.player.state(),ready=(currentState.ready || currentState.initializable) && !mounted.ui.shell.hidden;
      if(ready){media.frame.dataset.mcDisplay='custom';record?.panel?.dispose();if(record)record.panel=null;}
      else{if(media.frame.dataset.mcDisplay==='custom')record?.reset();if(currentState.failed)record?.panel?.fail();record?.panel?.update(currentState.load);}
    }
    return true;
  }
  return {guard,enhanceLocal,clearLocal:clearLocalPresentation,localPresentation,replaceMedia,get nativeRoot(){return enhancementRoot();},localState,commandTrack,playAudible,initializePlayAudible,setMute,restoreAudio,update,get active(){return !!mounted;},refresh(){mounted?.ui.update();},dispose(){disposed=true;clearLocalPresentation();persistent?.dispose();localFullscreen?.dispose();probe?.dispose();probe=null;observer?.disconnect();rootObserver?.disconnect();for(const [frame,record] of waiting){record.panel?.dispose();frame.removeEventListener('load',record.reset);frame.removeEventListener('error',record.error);}waiting.clear();guardOff?.();document.querySelector('[data-mc-custom-guard]')?.remove();document.querySelector('[data-mc-local-fullscreen]')?.remove();delete document.documentElement.dataset.mcCustomOwner;}};
}
