// A fullscreen presentation must contain its real media in the same document.
// A parent shell containing only an iframe cannot supply Firefox Android with
// video dimensions. Keep this contract independent of site names and engines.
export function mediaPresentationRoot(win,video,root){
  return video?.ownerDocument===win.document && root?.ownerDocument===win.document
    && video.isConnected && root.isConnected && root!==video && root.contains(video) ? root : null;
}

const mediaURL=value=>{
  if(typeof value!=='string' || value.length>8192)return null;
  try{const u=new URL(value);return /^https?:$/.test(u.protocol) && !u.username && !u.password?u.href:null;}catch{return null;}
};
// Copy only the public playlist data needed by the existing JW engine. Never
// forward arbitrary config, advertising, callbacks, HTML or executable code.
export function mediaPlaylist(value){
  if(!value || typeof value!=='object')return null;
  const file=mediaURL(value.file || value.sources?.[0]?.file);if(!file)return null;
  const result={file,type:'hls',tracks:[]};
  if(value.sources!=null){
    if(!Array.isArray(value.sources) || value.sources.length>30)return null;
    result.sources=[];
    for(const item of value.sources){const url=mediaURL(item?.file);if(!url)return null;result.sources.push({file:url,type:'hls',...(typeof item.label==='string'?{label:item.label.slice(0,100)}:{})});}
    if(!result.sources.length)return null;
  }
  if(value.tracks!=null){
    if(!Array.isArray(value.tracks) || value.tracks.length>100)return null;
    for(const item of value.tracks){
      if(!['captions','subtitles','thumbnails'].includes(item?.kind))continue;
      // Provider setup includes a null thumbnails placeholder when no sprite
      // is configured. It carries no media and must not reject a valid film.
      if(item.kind==='thumbnails' && !item.file)continue;
      const url=mediaURL(item.file);if(!url)return null;
      result.tracks.push({file:url,kind:item.kind,label:String(item.label || '').slice(0,100),srclang:String(item.srclang || '').slice(0,30),default:item.default===true});
    }
  }
  return result;
}

// The caller supplies an authenticated, verified playlist and owns episode
// identity. This layer only changes the engine's resource, never the document
// or fullscreen element. It keeps Pause, audio and rollback separate from Play.
export function persistentMediaSession(win,{candidate,onPending=()=>{},onIdentity=()=>{}}){
  let generation=0,busy=false,disposed=false;
  const abort=()=>Object.assign(new Error('Nguồn phát đã thay đổi'),{name:'AbortError'});
  const current=c=>!disposed && candidate()?.api===c.api && c.root.isConnected;
  function snapshot(){const c=candidate();return c?.kind==='jw' && typeof c.api.load==='function'?mediaPlaylist(c.api.getPlaylistItem?.()):null;}
  async function load(c,playlist,{signal,position=0,paused=true,muted=true,volume=1},epoch){
    if(signal?.aborted || !current(c) || epoch!==generation)throw abort();
    const check=()=>{
      if(signal?.aborted || !current(c) || epoch!==generation)throw abort();
      const item=mediaPlaylist(c.api.getPlaylistItem?.()),v=c.root.querySelector('video');
      if(item?.file!==playlist.file || !v || v.error || v.readyState<2 || !Number.isFinite(v.duration) || v.duration<=0)return null;
      return v;
    };
    // Mute synchronously BEFORE load: initialization may autostart before its
    // first metadata callback. No new source receives old audible state early.
    c.api.setMute(true);c.api.load(playlist);
    if(signal?.aborted || !current(c) || epoch!==generation)throw abort();
    // JW with autostart:false does not buffer a newly loaded playlist until
    // play is requested. Warm it silently behind the custom loading curtain;
    // readiness/seek acknowledgement below precede restoring Pause and audio.
    await Promise.resolve(c.api.play(true));
    const v=await new Promise((resolve,reject)=>{
      let timer,deadline;const finish=(fn,value)=>{win.clearInterval(timer);win.clearTimeout(deadline);signal?.removeEventListener('abort',cancel);fn(value);};
      const cancel=()=>finish(reject,abort());
      const tick=()=>{try{const video=check();if(video)finish(resolve,video);}catch(error){finish(reject,error);}};
      signal?.addEventListener('abort',cancel,{once:true});timer=win.setInterval(tick,50);deadline=win.setTimeout(()=>finish(reject,new Error('Nguồn phát chưa sẵn sàng')),15000);tick();
    });
    if(signal?.aborted || !current(c) || epoch!==generation)throw abort();
    // The muted warmup must stop before seek acknowledgement. On a busy
    // Android device a playing source can advance beyond the tolerance before
    // the first poll, falsely timing out a successful seek to zero.
    c.api.pause(true);
    const safePos=Number.isFinite(position)?position:0;
    const target=Math.max(0,Math.min(safePos,v.duration-.25));c.api.seek(target);
    // Seek confirmation is required; setting currentTime alone is not an ack.
    await new Promise((resolve,reject)=>{
      let timer,deadline;const finish=(fn,value)=>{win.clearInterval(timer);win.clearTimeout(deadline);signal?.removeEventListener('abort',cancel);fn(value);};
      const cancel=()=>finish(reject,abort());
      const tick=()=>{try{const video=check();if(video && !video.seeking && Math.abs(c.api.getPosition()-target)<1)finish(resolve);}catch(error){finish(reject,error);}};
      signal?.addEventListener('abort',cancel,{once:true});timer=win.setInterval(tick,50);deadline=win.setTimeout(()=>finish(reject,new Error('Chưa xác nhận vị trí phim')),5000);tick();
    });
    if(signal?.aborted || !current(c) || epoch!==generation)throw abort();
    if(paused)c.api.pause(true);else await Promise.resolve(c.api.play(true)).catch(()=>{});
    if(signal?.aborted || !current(c) || epoch!==generation)throw abort();
    if(typeof c.api.setVolume==='function' && Number.isFinite(volume) && volume>=0 && volume<=1)c.api.setVolume(volume*100);
    c.api.setMute(muted);return v;
  }
  return {snapshot,get busy(){return busy;},async replace(value,options={}){
    if(busy || disposed)throw new Error('Đang chuyển nguồn');
    if(options.signal?.aborted)throw abort();
    const c=candidate(),playlist=mediaPlaylist(value),previous=snapshot();
    if(!playlist || !previous || !c || c.kind!=='jw' || !mediaPresentationRoot(win,c.video,c.root))throw new Error('Nguồn không hỗ trợ đổi trong phiên');
    const rawPos=c.api.getPosition();
    const before={position:Number.isFinite(rawPos)?rawPos:0,paused:c.video.paused,muted:c.api.getMute(),volume:c.api.getVolume?.()/100},epoch=++generation;
    busy=true;onPending(true);
    try{const video=await load(c,playlist,options,epoch);onIdentity(options.identity);return video;}
    catch(error){
      // A caller cancellation invalidates the operation. Never resurrect an old
      // Play after Back, disposal, a new session or user cancellation.
      if(current(c) && epoch===generation)try{await load(c,previous,{...before,paused:options.signal?.aborted || before.paused},epoch);}catch{/* custom error stays visible */}
      throw error;
    }finally{if(epoch===generation){busy=false;onPending(false);}}
  },cancel(){generation++;busy=false;onPending(false);},dispose(){disposed=true;generation++;busy=false;}};
}
