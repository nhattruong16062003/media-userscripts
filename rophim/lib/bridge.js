import {isSiteOrigin, FRAME_ORIGINS,isFrameURL, safeURL, token, finite, diagnostic, watchDOM} from './core.js';
import {detectSite, readContext, contextKey, commitWatchSite} from './sites.js';
import {playerCandidate, attachPlayer, playerFingerprint} from './players.js';
import {validLoadMetrics} from '../../shared/player/buffering.js';

export function validState(s) {
  return s && ['jw','art-native','native-cdn','html5'].includes(s.kind) && typeof s.ready === 'boolean' && (s.initializable === undefined || typeof s.initializable === 'boolean') && (s.failed === undefined || typeof s.failed === 'boolean') && typeof s.ad === 'boolean' && typeof s.played === 'boolean' && typeof s.paused === 'boolean' && typeof s.ended === 'boolean' && finite(s.time) && s.time >= 0 && finite(s.duration) && s.duration >= 0 && s.time <= s.duration + 5 && finite(s.rate) && s.rate >= 0.25 && s.rate <= 4;
}
export function acceptsPacket(event, session, channel) {
  const d = event.data;
  return !!session && event.source === session.source && event.origin === session.origin && d?.channel === channel && d.token === session.token && d.generation === session.generation && Number.isSafeInteger(d.seq) && d.seq > session.seq;
}
export function bridgeContext(value) {
  const keys=['source','movie','movieID','title','episode','episodeID','season','lane','server','url'];
  if(!value || !['next-ordered','next-basic','legacy-panels'].includes(value.source) || keys.some(k=>typeof value[k]!=='string' || value[k].length>2048))return null;
  const url=safeURL(value.url);
  if(!url || !isSiteOrigin(url.origin) || !url.pathname.startsWith('/xem-phim/'))return null;
  const result=Object.fromEntries(keys.map(k=>[k,value[k]]));
  for(const key of ['originalTitle','year','mediaType','externalImdb','externalTmdb','poster'])if(typeof value[key]==='string' && value[key].length<=2048)result[key]=value[key];
  return result;
}
export function createBridge(win, page, feature, callbacks = {}) {
  const channel = 'rophim.' + feature + '.v1';
  const top = win.parent === win;
  const doc = win.document;
  if (top ? !isSiteOrigin(win.location.origin) : !isFrameURL(win.location.href)) return {dispose(){},state:()=>null,command:()=>false};
  let session = null, site = null, context = null, local = null, media = '', lastSource = '', remote = null, generation = 0, sequence = 0, disposed = false;
  let boundFrame = null,frameFullscreen=false,frameLocked=false,controlsReady=false;
  let snapshot=null, pending='', retryAfter=0, fetchKey='', fetchAttempts=0;
  const requests=new Map();
  const resultStatuses=action=>action==='fullscreen'?['fullscreen','windowed','error','unavailable']:['missing','error','navigating','unavailable'];
  const clearRequests=()=>{for(const request of requests.values()){win.clearTimeout(request.timer);request.resolve('unavailable');}requests.clear();};
  const referrer = safeURL(win.document.referrer)?.origin;
  const emit = () => callbacks.update?.({site,context,player:local,state:top ? remote : local?.state(),media,fullscreen:frameFullscreen,locked:frameLocked,controlsReady:top?controlsReady:false});
  const resetRemote = () => { remote = null; controlsReady=false;media = ''; session = null; generation++; emit(); };
  const loaded = () => { resetRemote(); tick(); };
  const send = data => { if (session) session.source.postMessage({...data,channel,token:session.token,generation:session.generation,seq:++sequence},session.origin); };
  const report = () => {if(local && session)send({type:'state',state:local.state(),media,controlsReady:callbacks.controlsReady?.()===true});};
  const onMessage = event => {
    const d = event.data;
    if (!d || d.channel !== channel) return;
    if (!top && d.type === 'hello') {
      if (event.source !== win.parent || !isSiteOrigin(event.origin) || (referrer && event.origin !== referrer) || !/^[a-f\d]{32}$/.test(d.token) || !Number.isSafeInteger(d.generation)) return;
      if(!Number.isSafeInteger(d.seq) || d.seq<0)return;
      if (session?.token !== d.token || session?.generation !== d.generation) {
        clearRequests();
        session = {source:event.source,origin:event.origin,token:d.token,generation:d.generation,seq:-1,lockSynced:false};sequence = 0;
      }
      if(d.seq<=session.seq)return;
      session.seq=d.seq;
      const nextContext=bridgeContext(d.context);if(contextKey(nextContext)!==contextKey(context))clearRequests();context=nextContext;frameFullscreen=d.fullscreen===true;
      if(!frameFullscreen)frameLocked=false;
      else if(!session.lockSynced){session.lockSynced=true;frameLocked=d.locked===true;}
      emit();report();
      return;
    }
    if (!acceptsPacket(event,session,channel)) return;
    if (top) {
      if (!boundFrame?.isConnected || boundFrame.contentWindow !== event.source || boundFrame.src !== session.src || contextKey(context) !== session.key) return;
      if (d.type === 'state' && validState(d.state) && /^[a-f\d]{32}$/.test(d.media)) {
        session.seq = d.seq; session.seen = Date.now(); media = d.media;remote = {...d.state,load:validLoadMetrics(d.state.load)?Object.fromEntries(['ahead','status','bytesPerSecond','online','bufferPolicy'].map(key=>[key,d.state.load[key]])):null};controlsReady=d.controlsReady===true;emit();
      } else if (d.type === 'lock' && typeof d.locked === 'boolean' && (!media || d.media === media)) {
        session.seq = d.seq;
        frameFullscreen = !!win.document.fullscreenElement?.contains(boundFrame);
        frameLocked = frameFullscreen && d.locked;
      } else if (d.type === 'request' && ['next','fullscreen'].includes(d.action) && /^[a-f\d]{32}$/.test(d.id) && d.media===media && remote?.ready && !remote.ad && Date.now()-session.seen<=4000) {
        session.seq = d.seq;
        if(session.requesting && Date.now()<=session.requesting.until)return;
        const active=session,activeMedia=media,requestMarker={until:Date.now()+11000};active.requesting=requestMarker;
        const isCurrent=()=>!disposed && session===active && active.requesting===requestMarker && Date.now()<=requestMarker.until && media===activeMedia && boundFrame?.isConnected && boundFrame.contentWindow===active.source && boundFrame.src===active.src && contextKey(context)===active.key && remote?.ready && !remote.ad;
        Promise.resolve().then(()=>isCurrent()?callbacks.request?.(d.action,{isCurrent}):'unavailable').then(status=>{
          if(!isCurrent())return;
          send({type:'result',id:d.id,media:activeMedia,status:resultStatuses(d.action).includes(status)?status:'error'});
        }).catch(()=>{if(isCurrent())send({type:'result',id:d.id,media:activeMedia,status:'error'});}).finally(()=>{if(active.requesting===requestMarker)active.requesting=null;});
      }
    } else if (d.type === 'command' && d.media === media) {
      session.seq = d.seq;
      try { local?.command(d.action,d.value); } catch { /* player changed while message was queued */ }
    } else if(!top && d.type==='result' && d.media===media && requests.has(d.id) && resultStatuses(requests.get(d.id).action).includes(d.status)){
      session.seq=d.seq;const request=requests.get(d.id);requests.delete(d.id);win.clearTimeout(request.timer);request.resolve(d.status);
    }
  };
  const tick = () => {
    if (disposed) return;
    if (top) {
      let nextSite = detectSite(win.document,win.location.href,page);
      const liveFrame=win.document.querySelector('.player-ratio iframe#embed-player');
      const currentHref=win.location.href;
      if(!nextSite && snapshot?.href===currentHref && snapshot.src===liveFrame?.src){nextSite={...snapshot.site,frame:liveFrame};}
      // App-router fetches do not necessarily append to __next_f. Refresh from
      // same-origin HTML, parsed inertly, after route changes (including landing->watch SPA).
      const nextFetchKey=liveFrame?currentHref+'|'+liveFrame.src:'';
      if(nextFetchKey!==fetchKey){fetchKey=nextFetchKey;fetchAttempts=0;retryAfter=0;}
      if(!nextSite && liveFrame && typeof win.fetch==='function' && currentHref!==pending && fetchAttempts<3 && Date.now()>retryAfter && win.location.pathname.startsWith('/xem-phim/')){
        pending=currentHref;fetchAttempts++;retryAfter=Date.now()+5000*fetchAttempts;
        win.fetch(currentHref,{credentials:'same-origin'}).then(r=>r.ok ? r.text() : '').then(html=>{
          if(!html || html.length>2_000_000 || disposed || win.location.href!==currentHref || !liveFrame.isConnected)return;
          const parsed=new win.DOMParser().parseFromString(html,'text/html');
          const found=detectSite(parsed,currentHref);
          if(found && found.frame.src===liveFrame.src){snapshot={href:currentHref,src:liveFrame.src,site:found};commitWatchSite(win.document,found);tick();}
        }).catch(()=>{}).finally(()=>{pending='';});
      }
      const nextContext = readContext(nextSite,win.document);
      const frame = nextSite?.frame, url = safeURL(frame?.src);
      const changed = frame !== boundFrame || contextKey(nextContext) !== contextKey(context) || frame?.src !== session?.src;
      site = nextSite;context = nextContext;
      if (changed) {
        boundFrame?.removeEventListener('load',loaded);
        boundFrame = frame || null; resetRemote();
        boundFrame?.addEventListener('load',loaded);
      }
      if (!nextContext || !frame || !url || !isFrameURL(url.href) || !frame.contentWindow || frame.hasAttribute('sandbox') && !frame.sandbox.contains('allow-same-origin')) {
        diagnostic(win.document,feature, nextContext ? 'iframe chưa cấp quyền/không nhận diện' : 'chờ nguồn website');return;
      }
      if (!session) { session = {source:frame.contentWindow,origin:url.origin,src:frame.src,key:contextKey(context),token:token(win),generation,seq:-1,seen:0};sequence = 0; }
      frameFullscreen=!!win.document.fullscreenElement?.contains(frame);
      if(!frameFullscreen)frameLocked=false;
      send({type:'hello',context,fullscreen:frameFullscreen,locked:frameLocked});
      if (session.seen && Date.now() - session.seen > 4000) {remote = null;controlsReady=false;media = '';emit();}
      diagnostic(win.document,feature,site.kind + '/' + (remote?.ready ? remote.kind : 'chờ player nội dung'));
    } else {
      const nativeContract=video=>video.id==='video' && video.closest('#player-wrap')?.querySelector('#controls')?video.closest('#player-wrap'):null;
      const candidate = playerCandidate(win,page,{nativeContract});
      let source = '';
      try { source = candidate ? playerFingerprint(candidate) : ''; } catch { /* not ready */ }
      if (candidate?.video !== local?.video || candidate?.api !== local?.api || candidate?.kind !== local?.kind || source !== lastSource) {
        clearRequests();callbacks.unbind?.(local); local?.dispose();local = candidate ? attachPlayer(candidate,{monitorLoad:feature==='gestures'}) : null;lastSource = source;media = local ? token(win) : '';emit();
      }
      if(local){emit();report();}
      diagnostic(win.document,feature,local ? local.kind + '/' + (local.state().ready ? 'ready' : 'chờ metadata/nội dung') : 'player chưa nhận diện');
    }
  };
  const onFullscreenChange = () => {
    if (!top || disposed) return;
    frameFullscreen = !!boundFrame && !!doc.fullscreenElement?.contains(boundFrame);
    if (!frameFullscreen) frameLocked = false;
    if (session) send({type:'hello',context,fullscreen:frameFullscreen,locked:frameLocked});
  };
  win.addEventListener('message',onMessage);
  if (top) doc.addEventListener('fullscreenchange',onFullscreenChange);
  const offDOM = watchDOM(win,tick), timer = win.setInterval(tick,1000);
  tick();
  const bridge = {
    state:() => top ? remote : local?.state(),
    context:() => context,
    command(action,value) {
      if (!top) return local?.command(action,value) || false;
      if (!remote?.ready || remote.ad || !media || !session || Date.now() - session.seen > 4000) return false;
      send({type:'command',action,value,media});return true;
    },
    setLocked(value) {
      if (top || !session || !media) return false;
      frameLocked = frameFullscreen && !!value;
      if (session) session.lockSynced = true;
      send({type:'lock',locked:frameLocked,media});
      return true;
    },
    request(action) {
      if(top || !['next','fullscreen'].includes(action) || !local?.state().ready || !session || !context)return false;
      if(requests.size)return false;
      const id=token(win);
      return new Promise(resolve=>{
        const timer=win.setTimeout(()=>{requests.delete(id);resolve('timeout');},12000);
        requests.set(id,{resolve,timer,action});
        // Flush state so the parent validates the same active resource even
        // before the first heartbeat.
        report();send({type:'request',action,id,media});
      });
    },
    refresh:tick,
    dispose() { disposed = true;clearRequests();win.clearInterval(timer);offDOM();win.removeEventListener('message',onMessage);if(top)doc.removeEventListener('fullscreenchange',onFullscreenChange);boundFrame?.removeEventListener('load',loaded);callbacks.unbind?.(local);local?.dispose(); },
  };
  return bridge;
}
