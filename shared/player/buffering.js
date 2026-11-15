import {mediaNetworkProbe} from './media-network.js';

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
// Enlarging buffers is deliberately gated OFF until the exact engine contract
// has a real-device performance comparison. Never experiment on first play.
export function mediaLoadMonitor(candidate,{active=()=>true,allowExpansion=false}={}){
  const {video,kind,api}=candidate,win=video.ownerDocument.defaultView,clock=()=>win.performance.now();
  const network=mediaNetworkProbe(win);let source='',since=clock(),waiting=false,disposed=false;
  let stableSince=null,lastTime=null,lastAdvance=clock(),engine=null,engineOff=null,fragments=[],policy='native',tuning=null,limited=false;
  const events=['waiting','stalled','playing','canplay','pause','ended','error','emptied','loadstart','seeking','seeked'];
  const onEvent=event=>{
    if(['emptied','loadstart'].includes(event.type)){reset();waiting=false;}
    else if(['waiting','stalled','seeking'].includes(event.type)){waiting=true;stableSince=null;}
    else if(['playing','canplay','seeked','pause','ended'].includes(event.type))waiting=false;
  };
  for(const type of events)video.addEventListener(type,onEvent);
  function restore(){if(tuning){for(const [key,value] of Object.entries(tuning.before))if(tuning.engine.config[key]===tuning.after[key])tuning.engine.config[key]=value;tuning=null;}policy=limited?'limited':'native';}
  function reset(){restore();source='';since=clock();fragments=[];stableSince=null;lastTime=null;lastAdvance=clock();limited=false;}
  function bindEngine(){
    let next=null;
    try{
      // All candidates must own this exact media element. No name/domain guess.
      const provider=kind==='jw'?api?.getProvider?.():null;
      for(const h of [provider?.hlsjs,provider?.hls,win.hls,win.art?.hls])if(h?.media===video && h.config && typeof h.on==='function' && typeof h.off==='function'){next=h;break;}
    }catch{/* provider not public */}
    if(next===engine)return;
    restore();engineOff?.();engine=next;engineOff=null;fragments=[];
    if(engine){
      const fragment=(_event,data)=>{const stats=data?.stats || data?.frag?.stats,s=stats?.loading;if(!active() || data?.frag?.type && data.frag.type!=='main' || !s || !nonnegative(stats.loaded) || !(s.end>s.start) || s.start<since)return;fragments.push({bytes:stats.loaded,start:s.start,end:s.end});if(fragments.length>32)fragments.shift();};
      const error=(_event,data)=>{if(data?.details==='bufferFullError' || data?.error?.name==='QuotaExceededError'){limited=true;restore();}};
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
    if(!enabled || status!=='playing' || video.seeking || ahead<15){stableSince=null;if(tuning && stalled){limited=true;restore();}}
    else if(stableSince===null)stableSince=now;
    // Native quotas remain in charge. Unknown/live engines and startup/seek/
    // prepared frames must never receive a larger target or preload/play call.
    if(allowExpansion && enabled && engine && engine.levels?.[engine.currentLevel]?.details?.live===false && !limited && !tuning && stableSince!==null && now-stableSince>=15000 && Number.isFinite(video.duration) && video.duration>0){
      const level=engine.levels?.[engine.currentLevel],bitrate=level?.maxBitrate || level?.bitrate;
      const config=engine.config,old=config.maxBufferLength,cap=config.maxMaxBufferLength;
      if(bitrate>0 && Number.isFinite(old) && Number.isFinite(cap) && cap>=old){
        const target=Math.min(120,Math.floor(24*1024*1024*8/bitrate));
        if(target>old){const before={maxBufferLength:old,maxMaxBufferLength:cap},after={maxBufferLength:target,maxMaxBufferLength:Math.max(cap,target)};Object.assign(config,after);tuning={engine,before,after};policy='expanded';}
      }
    }
    const diagnosticSource=/^https?:\/\//.test(source)?source:network.source(candidate.declaredSource);
    let speed=enabled?network.speed(diagnosticSource,since):null;
    const recent=fragments.filter(s=>s.end>=Math.max(since,now-5000));
    if(enabled && recent.length){const bytes=recent.reduce((n,s)=>n+s.bytes,0);let duration=0,end=-Infinity;for(const s of [...recent].sort((a,b)=>a.start-b.start)){duration+=Math.max(0,s.end-Math.max(end,s.start));end=Math.max(end,s.end);}if(duration>0)speed=bytes*1000/duration;}
    return {ahead:enabled?ahead:0,status,bytesPerSecond:nonnegative(speed)?speed:null,online:win.navigator.onLine!==false,bufferPolicy:policy};
  }
  return {snapshot(state){if(disposed)return null;try{return snapshot(state);}catch{return {ahead:0,status:'ready',bytesPerSecond:null,online:win.navigator.onLine!==false,bufferPolicy:'native'};}},dispose(){disposed=true;restore();engineOff?.();network.dispose();for(const type of events)video.removeEventListener(type,onEvent);}};
}
