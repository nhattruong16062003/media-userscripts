import {isSiteOrigin, FRAME_ORIGINS, safeURL, token, finite, diagnostic, watchDOM} from './core.js';
import {detectSite, readContext, contextKey} from './sites.js';
import {playerCandidate, attachPlayer, playerFingerprint} from './players.js';

export function validState(s) {
  return s && ['jw','art-native','native-cdn'].includes(s.kind) && typeof s.ready === 'boolean' && typeof s.ad === 'boolean' && typeof s.played === 'boolean' && typeof s.paused === 'boolean' && typeof s.ended === 'boolean' && finite(s.time) && s.time >= 0 && finite(s.duration) && s.duration >= 0 && s.time <= s.duration + 5 && finite(s.rate) && s.rate >= 0.25 && s.rate <= 4;
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
  if (top ? !isSiteOrigin(win.location.origin) : !FRAME_ORIGINS.has(win.location.origin)) return {dispose(){},state:()=>null,command:()=>false};
  let session = null, site = null, context = null, local = null, media = '', lastSource = '', remote = null, generation = 0, sequence = 0, disposed = false;
  let boundFrame = null;
  let knownSource=false, snapshot=null, pending='', retryAfter=0;
  const referrer = safeURL(win.document.referrer)?.origin;
  const emit = () => callbacks.update?.({site,context,player:local,state:top ? remote : local?.state(),media});
  const resetRemote = () => { remote = null; media = ''; session = null; generation++; emit(); };
  const loaded = () => { resetRemote(); tick(); };
  const send = data => { if (session) session.source.postMessage({...data,channel,token:session.token,generation:session.generation,seq:++sequence},session.origin); };
  const onMessage = event => {
    const d = event.data;
    if (!d || d.channel !== channel) return;
    if (!top && d.type === 'hello') {
      if (event.source !== win.parent || !isSiteOrigin(event.origin) || (referrer && event.origin !== referrer) || !/^[a-f\d]{32}$/.test(d.token) || !Number.isSafeInteger(d.generation)) return;
      if (session?.token !== d.token || session?.generation !== d.generation) {
        session = {source:event.source,origin:event.origin,token:d.token,generation:d.generation,seq:-1};sequence = 0;
      }
      context=bridgeContext(d.context);emit();
      return;
    }
    if (!acceptsPacket(event,session,channel)) return;
    if (top) {
      if (!boundFrame?.isConnected || boundFrame.contentWindow !== event.source || boundFrame.src !== session.src || contextKey(context) !== session.key) return;
      if (d.type === 'state' && validState(d.state) && /^[a-f\d]{32}$/.test(d.media)) {
        session.seq = d.seq; session.seen = Date.now(); media = d.media;remote = {...d.state};emit();
      } else if (d.type === 'request' && d.action === 'next' && d.media===media && remote?.ready && !remote.ad && Date.now()-session.seen<=4000) { session.seq = d.seq;callbacks.request?.('next'); }
    } else if (d.type === 'command' && d.media === media) {
      session.seq = d.seq;
      try { local?.command(d.action,d.value); } catch { /* player changed while message was queued */ }
    }
  };
  const tick = () => {
    if (disposed) return;
    if (top) {
      let nextSite = detectSite(win.document,win.location.href,page);
      if(nextSite)knownSource=true;
      const liveFrame=win.document.querySelector('.player-ratio iframe#embed-player');
      const currentHref=win.location.href;
      if(!nextSite && snapshot?.href===currentHref && snapshot.src===liveFrame?.src){nextSite={...snapshot.site,frame:liveFrame};}
      // App-router fetches do not necessarily append to __next_f. Refresh a
      // known source from same-origin HTML, parsed inertly, after route changes.
      if(!nextSite && knownSource && liveFrame && typeof win.fetch==='function' && currentHref!==pending && Date.now()>retryAfter && win.location.pathname.startsWith('/xem-phim/')){
        pending=currentHref;retryAfter=Date.now()+5000;
        win.fetch(currentHref,{credentials:'same-origin'}).then(r=>r.ok ? r.text() : '').then(html=>{
          if(!html || html.length>2_000_000 || disposed || win.location.href!==currentHref)return;
          const parsed=new win.DOMParser().parseFromString(html,'text/html');
          const found=detectSite(parsed,currentHref);
          if(found && found.frame.src===liveFrame.src){snapshot={href:currentHref,src:liveFrame.src,site:found};tick();}
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
      if (!nextContext || !frame || !url || !FRAME_ORIGINS.has(url.origin) || !frame.contentWindow || frame.hasAttribute('sandbox') && !frame.sandbox.contains('allow-same-origin')) {
        diagnostic(win.document,feature, nextContext ? 'iframe chưa cấp quyền/không nhận diện' : 'chờ nguồn website');return;
      }
      if (!session) { session = {source:frame.contentWindow,origin:url.origin,src:frame.src,key:contextKey(context),token:token(win),generation,seq:-1,seen:0};sequence = 0; }
      send({type:'hello',context});
      if (session.seen && Date.now() - session.seen > 4000) {remote = null;media = '';emit();}
      diagnostic(win.document,feature,site.kind + '/' + (remote?.ready ? remote.kind : 'chờ player nội dung'));
    } else {
      const candidate = playerCandidate(win,page);
      let source = '';
      try { source = candidate ? playerFingerprint(candidate) : ''; } catch { /* not ready */ }
      if (candidate?.video !== local?.video || candidate?.api !== local?.api || candidate?.kind !== local?.kind || source !== lastSource) {
        callbacks.unbind?.(local); local?.dispose();local = candidate ? attachPlayer(candidate) : null;lastSource = source;media = local ? token(win) : '';emit();
      }
      if (local && session) send({type:'state',state:local.state(),media});
      if(local)emit();
      diagnostic(win.document,feature,local ? local.kind + '/' + (local.state().ready ? 'ready' : 'chờ metadata/nội dung') : 'player chưa nhận diện');
    }
  };
  win.addEventListener('message',onMessage);
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
    request(action) { if (!top && action === 'next' && local?.state().ready) send({type:'request',action,media}); },
    refresh:tick,
    dispose() { disposed = true;win.clearInterval(timer);offDOM();win.removeEventListener('message',onMessage);boundFrame?.removeEventListener('load',loaded);callbacks.unbind?.(local);local?.dispose(); },
  };
  return bridge;
}
