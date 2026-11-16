import {finite, clampSeek,audioPreference} from '../media.js';
import {mediaLoadMonitor} from '../player/buffering.js';

export function mediaVisible(node, win) {
  if (!node?.isConnected) return false;
  for (let n = node; n && n.nodeType === 1; n = n.parentElement) {
    const style = win.getComputedStyle(n);
    if (n.hidden || style.display === 'none' || style.visibility === 'hidden') return false;
  }
  return true;
}
export function playerCandidate(win, page = win, {nativeContract=()=>false}={}) {
  const doc = win.document;
  const videos = [...doc.querySelectorAll('video')].filter(v => mediaVisible(v,win));
  if (videos.length !== 1) return null; // Do not guess between ads, preloads or concurrent players.
  const video = videos[0], jwRoot = video.closest('.jwplayer');
  if (jwRoot) {
    try {
      const api = typeof page.jwplayer === 'function' && page.jwplayer(jwRoot.id);
      if (api?.getContainer?.() === jwRoot && typeof api.seek === 'function' && typeof api.getPosition === 'function') return {kind:'jw', video, root:jwRoot, api};
    } catch { /* runtime not ready */ }
    return null;
  }
  const artRoot = video.closest('.art-video-player');
  if (artRoot && video.classList.contains('art-video')) {
    // The surveyed embed consumes ?url= into #player > .art-video-player.
    // Diagnostics additionally require seeing this exact manifest response;
    // this declaration alone never authorizes playback, commands or history.
    let declaredSource='';try{const url=new URL(win.location.href).searchParams.get('url');if(artRoot.parentElement?.id==='player' && /^https?:\/\//.test(url || ''))declaredSource=new URL(url).href;}catch{/* absent contract */}
    return {kind:'art-native',video,root:artRoot,declaredSource};
  }
  if (video.id === 'vid' && video.classList.contains('vid') && doc.querySelector('.guildline') && doc.querySelector('.loading-screen')) return {kind:'native-cdn',video,root:video.parentElement};
  const nativeRoot=nativeContract(video);
  if(nativeRoot?.nodeType===1 && nativeRoot.contains(video))return {kind:'html5',video,root:nativeRoot};
  return null;
}
// Track IDs are opaque engine indices. Labels are data, never markup or URLs.
export function playerTracks(candidate){
  if(candidate?.kind!=='jw')return {};
  const api=candidate.api,groups={quality:['getQualityLevels','getCurrentQuality','setCurrentQuality'],audio:['getAudioTracks','getCurrentAudioTrack','setCurrentAudioTrack'],captions:['getCaptionsList','getCurrentCaptions','setCurrentCaptions']},result={};
  for(const [kind,[list,current,set]] of Object.entries(groups))try{
    if(typeof api[list]!=='function' || typeof api[current]!=='function' || typeof api[set]!=='function')continue;
    const items=api[list]();if(!Array.isArray(items) || items.length>100)continue;
    const selected=api[current]();
    result[kind]=items.map((item,id)=>({id,label:String(item.label || item.name || (kind==='captions' && id===0?'Tắt':id+1)).slice(0,100),active:id===selected}));
  }catch{/* a provider may populate tracks after metadata */}
  return result;
}
export function selectPlayerTrack(candidate,kind,id){
  const names={quality:'setCurrentQuality',audio:'setCurrentAudioTrack',captions:'setCurrentCaptions'};
  if(candidate?.kind!=='jw' || !Object.hasOwn(names,kind) || !Number.isInteger(id) || !playerTracks(candidate)[kind]?.some(item=>item.id===id))return false;
  try{candidate.api[names[kind]](id);return true;}catch{return false;}
}
export function attachPlayer(candidate,{canRestoreAudio=()=>true,monitorLoad=true,allowExpansion=true}={}) {
  const {kind,video,root,api} = candidate;
  const initialSource=playerFingerprint(candidate);
  let audioGeneration=0;
  const loadMonitor=monitorLoad?mediaLoadMonitor(candidate,{active:canRestoreAudio,allowExpansion}):null;
  const audio=()=>{
    try{const muted=kind==='jw' && typeof api.getMute==='function'?api.getMute():video.muted,volume=kind==='jw' && typeof api.getVolume==='function'?api.getVolume()/100:video.volume;return {muted:!!muted,volume:finite(volume) && volume>=0 && volume<=1?volume:1};}
    catch{return {muted:!!video.muted,volume:finite(video.volume)?video.volume:1};}
  };
  const setMute=value=>kind==='jw' && typeof api.setMute==='function'?api.setMute(value):(video.muted=value);
  const setVolume=value=>kind==='jw' && typeof api.setVolume==='function'?api.setVolume(value*100):(video.volume=value);
  function restoreAudio(value){
    const wanted=audioPreference(value);if(!wanted || !canRestoreAudio())return false;
    const navigator=video.ownerDocument.defaultView.navigator;
    if(!wanted.muted && wanted.volume>0 && typeof navigator.getAutoplayPolicy==='function'){
      try{if(navigator.getAutoplayPolicy(video)!=='allowed')return false;}catch{/* unsupported policy query: attempt only the audio setters */}
    }
    const previous=audio(),generation=++audioGeneration;
    const rollback=()=>{
      if(generation!==audioGeneration || playerFingerprint(candidate)!==initialSource || !video.isConnected || !canRestoreAudio() || !state().ready)return;
      try{setVolume(previous.volume)?.catch?.(()=>{});}catch{/* denied setter */}
      try{setMute(previous.muted)?.catch?.(()=>{});}catch{/* denied setter */}
    };
    try{
      setVolume(wanted.volume)?.catch?.(rollback);
      setMute(wanted.muted)?.catch?.(rollback);
      return true;
    }catch{rollback();return false;}
  }
  let adActive = false;
  const handlers = [],subscribers=new Set();
  if (kind === 'jw') for (const [event,value] of [['adRequest',true],['adPlay',true],['adComplete',false],['adSkipped',false],['adError',false]]) {
    const handler = () => { adActive = value;for(const notify of subscribers)notify(); };
    api.on?.(event,handler); handlers.push([event,handler]);
  }
  const isAd = () => adActive || !!video.closest('.jw-flag-ads,.jw-ad-media') || ['loading','playing','paused'].includes(api?.getAdState?.());
  const state = () => {
    try {
      const duration = kind === 'jw' ? api.getDuration() : video.duration;
      const time = kind === 'jw' ? api.getPosition() : video.currentTime;
      const ad = !!isAd();
      const connected=video.isConnected && playerFingerprint(candidate)===initialSource && mediaVisible(video,video.ownerDocument.defaultView),engineState=kind==='jw'?api.getState?.():null,failed=!!video.error || engineState==='error';
      // JW may deliberately leave an empty <video> until an explicit Play.
      // Native chrome is hidden, so our Play must remain reachable before
      // metadata without authorizing gestures/seek on an unready resource.
      const item=kind==='jw'?api.getPlaylistItem?.():null,file=item?.file || item?.sources?.[0]?.file;
      const initializable=connected && !failed && !ad && video.readyState===0 && kind==='jw' && ['idle','paused'].includes(engineState) && typeof file==='string' && /^https?:\/\//.test(file);
      const value={kind,failed,initializable,ready:connected && !failed && video.readyState >= 1 && finite(duration) && duration > 0 && finite(time) && !ad, ad, time:finite(time) ? time : 0, duration:finite(duration) ? duration : 0, rate:video.playbackRate, paused:video.paused, ended:video.ended,played:video.played.length>0};
      return loadMonitor?{...value,load:loadMonitor.snapshot(value)}:value;
    } catch { return {kind,ready:false,ad:true,time:0,duration:0,rate:1,paused:true,ended:false,played:false}; }
  };
  const command = (action,value) => {
    const s = state();
    if(action==='initialize-play-audible'){
      if(!s.initializable)return false;
      api.setMute(false);const volume=api.getVolume?.();if(!finite(volume) || volume<=0)api.setVolume?.(100);api.play(true)?.catch?.(()=>{});return true;
    }
    if (!s.ready || s.ad) return false;
    switch (action) {
      case 'seek': if (!finite(value)) return false; if (kind === 'jw') api.seek(clampSeek(value,s.duration)); else video.currentTime = clampSeek(value,s.duration); break;
      case 'rate': if (!finite(value) || value < 0.25 || value > 4) return false; if (kind === 'jw' && typeof api.setPlaybackRate === 'function') api.setPlaybackRate(value); else video.playbackRate = value; break;
      case 'restore-audio':return restoreAudio(value);
      case 'mute': if(typeof value!=='boolean')return false;audioGeneration++;setMute(value);break;
      case 'play-audible': {
        audioGeneration++;
        // Only an explicit Play click uses this action. Autoplay/preparation
        // keeps its existing mute state and cannot consume this user intent.
        if (kind === 'jw' && typeof api.setMute==='function') api.setMute(false); else video.muted=false;
        const volume=kind==='jw' && typeof api.getVolume==='function'?api.getVolume()/100:video.volume;
        if (!finite(volume) || volume<=0) {
          if(kind==='jw' && typeof api.setVolume==='function')api.setVolume(100);else video.volume=1;
        }
      }
      // Fall through so sound and playback are changed in the same handler.
      case 'play': if (kind === 'jw' && typeof api.play==='function') api.play(true)?.catch?.(()=>{}); else video.play()?.catch(()=>{}); break;
      case 'pause': if (kind === 'jw' && typeof api.pause==='function') api.pause(true); else video.pause(); break;
      default:return false;
    }
    return true;
  };
  return {kind,video,root,api,state,command,audio,tracks:()=>playerTracks(candidate),selectTrack:(group,id)=>state().ready && selectPlayerTrack(candidate,group,id),fingerprint:()=>playerFingerprint(candidate),subscribe(notify){subscribers.add(notify);return ()=>subscribers.delete(notify);},dispose() {audioGeneration++;loadMonitor?.dispose();subscribers.clear();for (const [event,handler] of handlers) api.off?.(event,handler); }};
}
export function playerFingerprint(candidate) {
  try {
    const item=candidate?.kind==='jw' ? candidate.api.getPlaylistItem?.() : null;
    return [candidate?.video.currentSrc || candidate?.video.src || '',item?.file || item?.sources?.[0]?.file || ''].join('\u0000');
  }catch{return '';}
}
