import {mediaNetworkProbe} from './media-network.js';
import {accessibleHls} from '../engines/hls-access.js';
import {bufferExpansionPlan,hlsBufferTarget} from './buffer-policy.js';

export function bufferedAhead(video,time=video.currentTime){
  if(!Number.isFinite(time) || time<0)return 0;
  try{for(let i=0;i<video.buffered.length;i++)if(video.buffered.start(i)<=time && time<=video.buffered.end(i))return Math.max(0,video.buffered.end(i)-time);}catch{/* source discarded */}
  return 0;
}
const nonnegative=n=>Number.isFinite(n) && n>=0 && n<=1e12;
export function validLoadMetrics(value){
  return !!value && nonnegative(value.ahead) && ['loading','buffering','playing','paused','ready','ended','error'].includes(value.status) && (value.bytesPerSecond===null || nonnegative(value.bytesPerSecond)) && typeof value.online==='boolean' && ['native','observed','expanded','limited'].includes(value.bufferPolicy);
}
export function loadMetricsText(value){
  if(!validLoadMetrics(value))return '↓ — · Tải trước —';
  const speed=value.bytesPerSecond;
  const rate=speed===null?'—':speed>=1000000?(speed/1000000).toLocaleString('vi-VN',{maximumFractionDigits:1})+' MB/s':Math.round(speed/1000).toLocaleString('vi-VN')+' kB/s';
  return '↓ '+rate+' · Tải trước '+Math.floor(value.ahead)+' giây';
}
// Only the integration opts in, and the verified engine + runtime health
// checks still apply. Never change first-play/seek loading targets.
export function mediaLoadMonitor(candidate,{active=()=>true,allowExpansion=false}={}){
  const {video,kind,api}=candidate,doc=video.ownerDocument,win=doc.defaultView,clock=()=>win.performance.now();
  const network=mediaNetworkProbe(win);let source='',since=clock(),waiting=false,disposed=false;
  let stableSince=null,lastTime=null,lastAdvance=clock(),engine=null,engineOff=null,fragments=[],policy='native',tuning=null,limited=false;
  let levelIndex=null,qualityBaseline=null,lastPolicyCheck=-Infinity,stableTime=null,cooldownUntil=0,healthyFrames=false;
  const events=['waiting','stalled','playing','canplay','pause','ended','error','emptied','loadstart','seeking','seeked','ratechange'];
  const onEvent=event=>{
    if(['emptied','loadstart'].includes(event.type)){reset();waiting=false;}
    else if(['waiting','stalled','seeking'].includes(event.type)){waiting=true;stableSince=null;restore();qualityBaseline=null;healthyFrames=false;}
    else if(event.type==='ratechange'){restore();stableSince=null;qualityBaseline=null;healthyFrames=false;}
    else if(['playing','canplay','seeked','pause','ended'].includes(event.type)){waiting=false;if(['pause','ended'].includes(event.type)){restore();stableSince=null;qualityBaseline=null;healthyFrames=false;}}
  };
  for(const type of events)video.addEventListener(type,onEvent);
  const onHidden=()=>{if(doc.hidden){restore();stableSince=null;qualityBaseline=null;healthyFrames=false;}};
  doc.addEventListener('visibilitychange',onHidden);
  function restore(){if(tuning){for(const [key,value] of Object.entries(tuning.before))if(tuning.engine.config[key]===tuning.after[key])tuning.engine.config[key]=value;tuning=null;}policy=limited || clock()<cooldownUntil?'limited':engine?'observed':'native';}
  function reset(){restore();source='';since=clock();fragments=[];stableSince=null;lastTime=null;lastAdvance=clock();limited=false;cooldownUntil=0;qualityBaseline=null;healthyFrames=false;levelIndex=null;}
  function bindEngine(){
    let next=null;
    try{
      // All candidates must own this exact media element. No name/domain guess.
      next=accessibleHls(candidate);
    }catch{/* provider not public */}
    if(next===engine)return;
    restore();engineOff?.();engine=next;engineOff=null;fragments=[];stableSince=null;qualityBaseline=null;healthyFrames=false;levelIndex=null;limited=false;cooldownUntil=0;since=clock();lastPolicyCheck=-Infinity;policy=engine?'observed':'native';
    if(engine){
      const fragment=(_event,data)=>{const stats=data?.stats || data?.frag?.stats,s=stats?.loading;if(!active() || data?.frag?.type && data.frag.type!=='main' || !s || !nonnegative(stats.loaded) || !(s.end>s.start) || s.start<since)return;fragments.push({bytes:stats.loaded,start:s.start,end:s.end});if(fragments.length>32)fragments.shift();};
      const error=(_event,data)=>{if(data?.fatal || data?.details==='bufferFullError' || data?.error?.name==='QuotaExceededError'){limited=true;restore();}};
      const bound=engine;bound.on('hlsFragLoaded',fragment);bound.on('hlsError',error);engineOff=()=>{bound.off('hlsFragLoaded',fragment);bound.off('hlsError',error);};
    }
  }
  function snapshot(state){
    const now=clock(),time=state.time;
    const current=kind==='jw'?api?.getPlaylistItem?.()?.file || api?.getPlaylistItem?.()?.sources?.[0]?.file:video.currentSrc || video.src;
    if(current!==source){reset();source=current || '';waiting=false;}
    bindEngine();
    const ahead=bufferedAhead(video,time),enabled=active() && !state.ad;
    if(lastTime===null || Math.abs(time-lastTime)>.02){lastTime=time;lastAdvance=now;}
    const stalled=!video.paused && !video.ended && (video.readyState<3 && (waiting || now-lastAdvance>900) || now-lastAdvance>1500 && ahead<.25);
    const status=state.failed?'error':video.ended?'ended':video.paused?'paused':stalled?'buffering':video.readyState<2?'loading':state.ready?'playing':'ready';
    if(engine?.currentLevel!==levelIndex){restore();levelIndex=engine?.currentLevel;stableSince=null;qualityBaseline=null;healthyFrames=false;}
    if(!enabled || status!=='playing' || video.seeking || ahead<15 || video.playbackRate!==1 || doc.hidden || now<cooldownUntil || tuning && engine.levels?.[engine.currentLevel]?.details?.live!==false){stableSince=null;qualityBaseline=null;healthyFrames=false;if(tuning && stalled)limited=true;restore();}
    else if(stableSince===null){stableSince=now;stableTime=time;qualityBaseline=null;healthyFrames=false;}
    if(!tuning && !limited && now>=cooldownUntil && policy==='limited')policy=engine?'observed':'native';
    if(now-lastPolicyCheck>=1000){
      const delayed=now-lastPolicyCheck>2500 && lastPolicyCheck!==-Infinity;lastPolicyCheck=now;
      let quality=null;try{quality=video.getVideoPlaybackQuality?.();}catch{/* unavailable */}
      if(stableSince!==null && quality && Number.isFinite(quality.totalVideoFrames) && Number.isFinite(quality.droppedVideoFrames)){
        if(!qualityBaseline)qualityBaseline={total:quality.totalVideoFrames,dropped:quality.droppedVideoFrames,at:now};
        const total=quality.totalVideoFrames-qualityBaseline.total,dropped=quality.droppedVideoFrames-qualityBaseline.dropped;
        if(total<0 || dropped<0 || total>=100 && dropped/total>.01 || dropped>=3 && total<30 || tuning && delayed){
          // Cold decoding can drop frames before any tuning. Wait for another
          // healthy window; a regression AFTER expansion disables it for this
          // source instead of repeatedly trying and causing visible stutters.
          if(tuning)limited=true;cooldownUntil=now+15000;stableSince=null;qualityBaseline=null;healthyFrames=false;restore();
        }
        else if(now-qualityBaseline.at>=5000){healthyFrames=total>=100 && dropped/total<=.01;qualityBaseline={total:quality.totalVideoFrames,dropped:quality.droppedVideoFrames,at:now};}
      }else {qualityBaseline=null;healthyFrames=false;}
    }
    // Native quotas remain in charge. Unknown/live engines and startup/seek/
    // prepared frames must never receive a larger target or preload/play call.
    if(allowExpansion && enabled && engine?.constructor?.version==='1.7.3' && engine.levels?.[engine.currentLevel]?.details?.live===false && !limited && !tuning && healthyFrames && qualityBaseline && stableSince!==null && now-stableSince>=15000 && time-stableTime>=12 && Number.isFinite(video.duration) && video.duration>0){
      const level=engine.levels?.[engine.currentLevel],bitrate=level?.maxBitrate || level?.bitrate;
      let cachedSeconds=0;try{for(let i=0;i<video.buffered.length;i++)cachedSeconds+=video.buffered.end(i)-video.buffered.start(i);}catch{/* discarded source: no expansion */cachedSeconds=Infinity;}
      const plan=bufferExpansionPlan(engine.config,bitrate,Math.max(0,cachedSeconds-ahead));
      const measured=fragments.filter(s=>s.end>=now-30000),seconds=measured.reduce((n,s)=>n+(s.end-s.start)/1000,0),bytes=measured.reduce((n,s)=>n+s.bytes,0);
      const native=hlsBufferTarget(engine.config,bitrate),actual=engine.streamController?.getMaxBufferLength?.(bitrate);
      if(plan && measured.length>=3 && seconds>0 && bytes*8/seconds>bitrate*2 && Number.isFinite(actual) && Math.abs(actual-native)<.01){Object.assign(engine.config,plan.after);tuning={engine,...plan};policy='expanded';}
    }
    if(tuning){
      let cached=0;try{for(let i=0;i<video.buffered.length;i++)cached+=video.buffered.end(i)-video.buffered.start(i);}catch{cached=Infinity;}
      const level=engine.levels?.[engine.currentLevel],bitrate=level?.maxBitrate || level?.bitrate;
      if(!(bitrate>0) || cached*bitrate*1.15/8>96*1024*1024){limited=true;restore();}
    }
    const diagnosticSource=/^https?:\/\//.test(source)?source:network.source(candidate.declaredSource);
    let speed=enabled?network.speed(diagnosticSource,since):null;
    const recent=fragments.filter(s=>s.end>=Math.max(since,now-5000));
    if(enabled && recent.length){const bytes=recent.reduce((n,s)=>n+s.bytes,0);let duration=0,end=-Infinity;for(const s of [...recent].sort((a,b)=>a.start-b.start)){duration+=Math.max(0,s.end-Math.max(end,s.start));end=Math.max(end,s.end);}if(duration>0)speed=bytes*1000/duration;}
    return {ahead:enabled?ahead:0,status,bytesPerSecond:nonnegative(speed)?speed:null,online:win.navigator.onLine!==false,bufferPolicy:policy};
  }
  return {snapshot(state){if(disposed)return null;try{return snapshot(state);}catch{restore();return {ahead:0,status:'ready',bytesPerSecond:null,online:win.navigator.onLine!==false,bufferPolicy:'native'};}},dispose(){disposed=true;restore();engineOff?.();network.dispose();doc.removeEventListener('visibilitychange',onHidden);for(const type of events)video.removeEventListener(type,onEvent);}};
}
