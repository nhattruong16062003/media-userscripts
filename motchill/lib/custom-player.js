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
  const waiting=new Map();
  let storage;try{storage=window.localStorage;}catch{/* storage disabled */}
  const audioPreferences=SharedPlayer.audioPreferenceStore(storage,'media-userscripts:motchill:audio:v1');
  function guardedFrames(){
    // These extra slots receive status UI only. They do not authorize a new
    // origin, open a bridge session or infer an engine from the server label.
    const slots=[...document.querySelectorAll('#player iframe,#videoFrame,#player-wrapper iframe,.mc-player-stage>iframe')]
      .filter(frame=>frame.tagName==='IFRAME' && sites.visible(frame) && !sites.isPrepared(frame) && sites.url(frame.getAttribute('src')));
    const nativeFrame=sites.nextProviderState?.()?.frame;
    return [...new Set([...sites.playerFrames(),...slots])].filter(frame=>frame!==nativeFrame);
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
    const native=enhancementRoot();
    if(native){native.dataset.rpNativeEnhancement='1';guardOff?.();guardOff=null;return;}
    if(guardOff)return;
    // Only known engine contracts are hidden. Ad/challenge UI is independent.
    guardOff=SharedPlayer.playerStartupGuard(window);
    const style=document.createElement('style');style.dataset.mcCustomGuard='1';
    style.textContent='iframe[data-mc-display="loading"],html[data-mc-custom-owner] #player iframe:not([data-mc-display="custom"]),html[data-mc-custom-owner] #videoFrame:not([data-mc-display="custom"]),html[data-mc-custom-owner] #player-wrapper iframe:not([data-mc-display="custom"]),html[data-mc-custom-owner] .mc-player-stage>iframe:not([data-mc-display="custom"]){opacity:0!important;pointer-events:none!important}html[data-rp-controls-boot] #player-wrap>#controls{display:none!important;pointer-events:none!important}';
    (document.head || document.documentElement).append(style);
    if(window.top===window){document.documentElement.dataset.mcCustomOwner='1';observer=new MutationObserver(prepareFrames);observer.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['src','data-mc-role']});prepareFrames();}
  }
  if(!document.documentElement){rootObserver=new MutationObserver(()=>{if(document.documentElement){rootObserver.disconnect();guard();}});rootObserver.observe(document,{childList:true});}
  function detach(){mounted?.ui.dispose();mounted?.player.dispose?.();mounted=null;}
  function localState(video){
    const found=candidate();
    const fingerprint=found?SharedPlayer.playerFingerprint(found):'';
    if(probe && (!found || probe.video!==found.video || probe.api!==found.api || probeSource!==fingerprint)){probe.dispose();probe=null;}
    if(found && !probe){probe=SharedPlayer.attachPlayer(found,{canRestoreAudio:()=>bridge.role!=='prepared' && !sites.isPrepared(found.video)});probeSource=fingerprint;}
    const own=found?.video===video,state=own?probe.state():null;
    return {nativeEnhanced:!!own && !!enhancementRoot(),customCapable:!!own,tracks:own?SharedPlayer.playerTracks(found):{},...(state?{ad:state.ad,...probe.audio()}: {})};
  }
  function commandTrack(video,group,id){const found=candidate(),state=localState(video);return state.customCapable && !state.ad && !video.error && video.readyState>=1 && found?.video===video && SharedPlayer.selectPlayerTrack(found,group,id);}
  function playAudible(video){const state=localState(video);return state.customCapable && !state.ad && probe?.video===video && probe.command('play-audible');}
  function restoreAudio(video,value){const state=localState(video);return state.customCapable && !state.ad && bridge.role!=='prepared' && !sites.isPrepared(video) && probe?.video===video && probe.command('restore-audio',value);}
  function enhanceLocal(video){
    guard();const root=enhancementRoot(),found=candidate();
    if(!root || !found || found.video!==video || bridge.role==='prepared' || bridge.parentPresented===false){if(mounted?.native)detach();return false;}
    const signature=SharedPlayer.playerFingerprint(found);
    if(mounted && (!mounted.native || mounted.media!==video || mounted.signature!==signature || !mounted.ui.shell.isConnected))detach();
    if(!mounted){
      const player=SharedPlayer.attachPlayer(found,{canRestoreAudio:()=>bridge.role!=='prepared'});player.nativeRoot=root;player.root=root;
      const ui=SharedPlayer.customPlayerControls(window,player,{nativeUI:true,audioPreferences,
        canRestoreAudio:()=>bridge.role!=='prepared',introSeconds:()=>bridge.parentContext?.introSeconds ?? hooks.introSeconds(),onIntro:()=>{const end=bridge.parentContext?.introSeconds ?? hooks.introSeconds();player.command('seek',Math.min(end,video.duration));},
        onNext:()=>bridge.requestNext(),isFullscreen:()=>bridge.parentFullscreen,onFullscreen:()=>bridge.requestFullscreen()});
      mounted={native:true,media:video,root,signature,player,ui};
    }
    for(const node of root.querySelectorAll('.item-max,.item-min'))node.classList.toggle('d-none',node.classList.contains('item-max')?bridge.parentFullscreen:!bridge.parentFullscreen);
    const page=bridge.parentContext;
    mounted.ui.setContext(page?{url:page.url,episodeID:page.episodeKey,lane:page.language,server:page.server,next:page.next}:null);
    return true;
  }
  function update(media,root,page){
    if(disposed)return false;
    guard();prepareFrames();
    const local=!media?.frame && candidate(),remote=media?.frame && media.state?.customCapable===true;
    if(!root?.isConnected || !media || !(remote || local?.video===media)) {detach();return false;}
    const signature=remote?[media.session?.token,media.frame.src,media.state.mediaId].join('|'):SharedPlayer.playerFingerprint(local);
    if(mounted && (mounted.media!==media || mounted.root!==root || mounted.signature!==signature || !mounted.ui.shell.isConnected || local && (mounted.player.api!==local.api || mounted.player.nativeRoot!==local.root)))detach();
    if(!mounted){
      let player;
      if(remote){
        const current=()=>media.isConnected && media.state?.customCapable===true && bridge.getFrame(media.frame)===media && signature===[media.session?.token,media.frame.src,media.state.mediaId].join('|');
        const state=()=>{const value=media.state || {},ad=value.ad===true,duration=media.duration,time=media.currentTime;
          return {kind:'remote',failed:!!value.error,ready:current() && !ad && !value.error && Number.isFinite(duration) && duration>0 && Number.isFinite(time) && media.readyState>=1,ad,time,duration,rate:media.playbackRate,paused:media.paused,ended:media.ended,played:value.played===true};};
        const command=(action,value)=>{
          if(!state().ready)return false;
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
        player=SharedPlayer.attachPlayer(local,{canRestoreAudio:()=>bridge.role!=='prepared' && !sites.isPrepared(local.video)});player.nativeRoot=local.root;player.root=root;
      }
      const ui=SharedPlayer.customPlayerControls(window,player,{autoPlay:true,
        audioPreferences,canRestoreAudio:()=>bridge.role!=='prepared' && !sites.isPrepared(media) && media.state?.role!=='prepared',
        introSeconds:hooks.introSeconds,onIntro:hooks.onIntro,onNext:()=>Promise.resolve(hooks.onNext()).then(ok=>ok?'navigating':'missing'),
        isFullscreen:hooks.isFullscreen,onFullscreen:hooks.onFullscreen});
      mounted={media,root,signature,player,ui};
    }
    mounted.ui.setContext({url:page.url,episodeID:page.episodeKey,lane:page.language,server:hooks.serverKey(),next:page.next});
    if(remote){
      const record=waiting.get(media.frame),ready=mounted.player.state().ready && !mounted.ui.shell.hidden;
      if(ready){media.frame.dataset.mcDisplay='custom';record?.panel?.dispose();if(record)record.panel=null;}
      else{if(media.frame.dataset.mcDisplay==='custom')record?.reset();if(mounted.player.state().failed)record?.panel?.fail();}
    }
    return true;
  }
  return {guard,enhanceLocal,get nativeRoot(){return enhancementRoot();},localState,commandTrack,playAudible,restoreAudio,update,get active(){return !!mounted;},refresh(){mounted?.ui.update();},dispose(){disposed=true;detach();probe?.dispose();probe=null;observer?.disconnect();rootObserver?.disconnect();for(const [frame,record] of waiting){record.panel?.dispose();frame.removeEventListener('load',record.reset);frame.removeEventListener('error',record.error);}waiting.clear();guardOff?.();document.querySelector('[data-mc-custom-guard]')?.remove();delete document.documentElement.dataset.mcCustomOwner;}};
}
