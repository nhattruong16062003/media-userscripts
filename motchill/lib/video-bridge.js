// Liên lạc iframe chỉ trong chuỗi nguồn phát đã nhận diện. Trang cha là nơi
// ghi DB; iframe không tự tạo bản lịch sử thứ hai từ URL trình phát.
function createMotchillVideoBridge(sites, channel, options = {}) {
  const nonce = () => Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) => n.toString(16)).join('-');
  const parentOrigin = sites.parentOrigin();
  const trustedOrigin = (origin) => {
    const parsed = sites.url(origin);
    return parsed && (sites.isMotchill(parsed.hostname) || sites.embedHosts.has(parsed.hostname));
  };
  const sourceFrames = (values) => [...new Set((Array.isArray(values) ? values : []).slice(0, 8)
    .filter((value) => typeof value === 'string' && value.length <= 8192 && /^https?:\/\//i.test(value))
    .map((value) => sites.url(value))
    .filter((value) => value && !value.username && !value.password && trustedOrigin(value.origin))
    .map((value) => value.href))].slice(0, 8);
  const mediaSource = (value) => {
    if (typeof value !== 'string' || value.length > 8192 || !/^https?:\/\//i.test(value)) return '';
    const parsed = sites.url(value);
    return parsed && !parsed.username && !parsed.password ? parsed.href : '';
  };
  function localMediaSource(video) {
    const native = mediaSource(video.currentSrc || video.src);
    if (native) return native;
    // TOP1 at motchillf.im uses a JW-managed blob, so the native URL alone
    // cannot prove its HLS source. Only the API of this exact player root may
    // provide its current playlist file; server buttons/DOM attributes are not
    // proof that their source is the media currently being played.
    const root = video.closest('.jwplayer');
    if (!root?.id || !root.isConnected || typeof window.jwplayer !== 'function') return '';
    try {
      const player = window.jwplayer(root.id);
      if (player?.getContainer?.() !== root || typeof player.getPlaylistItem !== 'function') return '';
      const active = [...root.querySelectorAll('video')].filter((node) => sites.visible(node)
        && !sites.isPrepared(node) && !node.closest('.jw-flag-ads,[data-ad]'));
      if (active.length !== 1 || active[0] !== video) return '';
      return mediaSource(player.getPlaylistItem()?.file);
    } catch (_) { return ''; }
  }
  const sessions = new Map();
  let upstream = null;
  let remote = null;
  let activeFrame = null;
  let local = null;
  let localOff = () => {};
  let role = 'current';
  let managed = false;
  let roleFromParent = false;
  let nativeGestures = false;
  let lastStarted = false;
  let startGeneration = 0;
  let seekStartOff = () => {};
  let relayFrame = null;
  let parentContext=null,parentFullscreen=false,parentPresented=window.top===window;
  const nextRequests=new Map();
  const replacementRequests=new Map();let localReplacement=null;
  const providerIdentity=value=>value && typeof value.id==='string' && /^[1-9]\d*$/.test(value.id) && typeof value.movieId==='string' && /^[1-9]\d*$/.test(value.movieId) && Number.isSafeInteger(value.season) && value.season>=1 && value.season<=1000 && typeof value.server==='string' && value.server.length<200 && sites.translationKey(value.server) ? {id:value.id,movieId:value.movieId,season:value.season,server:value.server}:null;
  function readParentContext(value,origin){
    const target=sites.url(value?.url),route=target && sites.route(target.href,value?.family);
    const originHost=sites.url(origin)?.hostname || '';
    const originMatches=!!target && (target.origin===origin || sites.embedHosts.has(originHost));
    const routeEp=route && sites.episodeKey(route.episode);
    const validEpisode=routeEp===value?.episodeKey || (value?.family===sites.families.NEXT_REVIVE && routeEp==='ep:1' && value?.episodeKey==='full');
    const validLanguage=value?.language==='' || !!sites.translationKey(value?.language);
    if(!target || !originMatches || !sites.isMotchill(target.hostname) || !route || route.slug!==value.slug || !validEpisode || !validLanguage)return null;
    const result=Object.fromEntries(['url','family','slug','film','episode','episodeKey','language','server'].map(key=>[key,String(value[key] || '').slice(0,2048)]));
    if(Number.isFinite(value.introSeconds) && value.introSeconds>=0 && value.introSeconds<=300)result.introSeconds=value.introSeconds;
    const next=sites.url(value.next?.url),nextRoute=next && sites.route(next.href,result.family);
    if(next?.origin===target.origin && nextRoute?.slug===route.slug && Number(sites.episodeKey(nextRoute.episode).replace('ep:',''))===Number(result.episodeKey.replace('ep:',''))+1)result.next={url:next.href};
    return result;
  }
  const remotes = new Map();
  function frames() {
    const ordinary = sites.playerFrames();
    if (!options.includePrepared) return ordinary;
    const prepared = [...document.querySelectorAll('iframe[data-mc-managed="episode"],iframe[data-mc-managed="provider"]')].filter((frame) => {
      const target = sites.url(frame.src);
      return frame.isConnected && target && (frame.dataset.mcManaged==='provider'?sites.knownEmbedPage(target.href):target.origin === location.origin);
    });
    return [...new Set([...ordinary, ...prepared])];
  }
  function documentRole() {
    if (roleFromParent) return role;
    try {
      if (window.frameElement?.dataset.mcManaged === 'episode') {
        managed = true;
        return window.frameElement.dataset.mcRole || role;
      }
    } catch (_) { /* iframe khác origin dùng handshake */ }
    return role;
  }
  function setRole(frame, value) {
    const session = sessions.get(frame);
    if (!session || !['prepared', 'current'].includes(value)) return;
    session.assignedRole=value;
    frame.contentWindow?.postMessage({ tag: channel, type: 'role', token: session.token, role: value, managed: true }, session.origin);
  }
  function hello(frame, session) {
    const currentRole = documentRole();
    const ownContext = sites.adapter().read();
    const introSeconds = window.top === window ? options.introSeconds?.() : (parentContext?.introSeconds ?? options.introSeconds?.());
    const context = ownContext ? { ...ownContext, introSeconds } : parentContext;
    frame.contentWindow?.postMessage({ tag: channel, type: 'hello', token: session.token,
      managed: ['episode','provider'].includes(frame.dataset.mcManaged) || managed,
      role: session.assignedRole || frame.dataset.mcRole || currentRole,
      presented: parentPresented && !sites.isPrepared(frame), context,
      fullscreen: Boolean(document.fullscreenElement?.contains(frame) || parentFullscreen) }, session.origin);
  }
  function openSession(frame,origin){
    const previous=sessions.get(frame);if(previous?.loaded)frame.removeEventListener('load',previous.loaded);
    const session={token:nonce(),origin,src:frame.src};
    session.loaded=()=>{
      if(sessions.get(frame)!==session || !frame.isConnected || frame.src!==session.src)return;
      session.token=nonce();session.seenAt=0;remotes.delete(frame);
      if(activeFrame===frame){activeFrame=null;remote=null;}
      if(relayFrame===frame)relayFrame=null;hello(frame,session);
    };
    sessions.set(frame,session);frame.addEventListener('load',session.loaded);return session;
  }
  function validRemote(frame) {
    const receiver = remotes.get(frame);
    const session = sessions.get(frame);
    return receiver && receiver.session === session && frame.isConnected && frame.src === session.src
      && Date.now() - (session.seenAt || 0) <= 10000 ? receiver : undefined;
  }
  function relayRemote() {
    if (remote && validRemote(remote.frame)) return remote;
    if (!managed) return null;
    // Prepared media stays outside active/history selection, while the owner
    // still needs its readiness and a route for pause/mute/start commands.
    const wantedRole = documentRole();
    const selected = frames().map(validRemote).find((receiver) => receiver
      && (receiver.state.role === wantedRole || receiver.frame.dataset.mcRole === wantedRole));
    return selected || (relayFrame && validRemote(relayFrame)) || null;
  }
  class RemoteVideo extends EventTarget {
    constructor(frame, session) {
      super(); this.frame = frame; this.session = session; this.state = {};
    }
    get currentTime() { return this.state.position || 0; }
    set currentTime(value) { this.command('seek', value); }
    get duration() { return this.state.duration || 0; }
    get readyState() { return this.state.readyState ?? (this.duration > 0 ? 1 : 0); }
    get paused() { return this.state.paused !== false; }
    get ended() { return !!this.state.ended; }
    get playbackRate() { return this.state.playbackRate || 1; }
    set playbackRate(value) { this.command('rate', value); }
    get muted() { return !!this.state.muted; }
    get volume() { const value=this.state.volume;return Number.isFinite(value) && value>=0 && value<=1?value:undefined; }
    set muted(value) { this.command('mute', !!value); }
    get isConnected() { return this.frame.isConnected && sites.visible(this.frame) && this.frame.src === this.session.src; }
    closest() { return null; }
    play() { this.command('play'); return Promise.resolve(); }
    pause() { this.command('pause'); }
    replaceMedia(value,signal){
      if(validRemote(this.frame)!==this || !this.state.localPresentation || !this.state.playlist || !value?.playlist || signal?.aborted)return Promise.reject(new Error('Nguồn không còn hiện hành'));
      const id=nonce(),mediaId=this.state.mediaId,token=this.session.token,frame=this.frame,origin=this.session.origin;
      return new Promise((resolve,reject)=>{
        const finish=(fn,result)=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);replacementRequests.delete(id);fn(result);};
        const cancel=()=>{frame.contentWindow?.postMessage({tag:channel,type:'cancel-replace',token,id},origin);};
        // Child readiness + seek may take 20s, and a failed load needs the
        // same budget to roll back. Do not abandon its result halfway through
        // recovery; the owner's commit deadline is deliberately longer.
        const timer=setTimeout(()=>{cancel();finish(reject,new Error('Chưa xác nhận đổi nguồn'));},43000);replacementRequests.set(id,{frame,token,resolve:result=>finish(resolve,result),reject:error=>finish(reject,signal?.aborted?Object.assign(error,{name:'AbortError'}):error)});
        signal?.addEventListener('abort',cancel,{once:true});frame.contentWindow.postMessage({tag:channel,type:'replace-media',token,id,mediaId,value},origin);
      });
    }
    command(action, value) {
      if(validRemote(this.frame)!==this)return false;
      if (action === 'start-zero') this.state = { ...this.state, startedAtZero: false, paused: true };
      this.frame.contentWindow?.postMessage({ tag: channel, type: 'command', token: this.session.token, mediaId:this.state.mediaId, action, value }, this.session.origin);
      return true;
    }
  }
  function state() {
    const currentRole = documentRole();
    const video = sites.findVideo();
    observeLocal(video);
    if (video) {
      const page = sites.adapter().read();
      return { position: Number.isFinite(video.currentTime) ? video.currentTime : 0,
        duration: Number.isFinite(video.duration) ? video.duration : 0, paused: video.paused,
        readyState: video.readyState, playbackRate: video.playbackRate, muted: video.muted,volume:video.volume,
        error: video.error ? { code: video.error.code } : null,
        buffered: video.buffered?.length ? video.buffered.end(0) : 0,
        startedAtZero: lastStarted, managed, role: currentRole, nativeGestures,
        ended: video.ended, played:video.played?.length>0, ad: !!video.closest('.jw-flag-ads,[data-ad]'),
        mediaId: video.currentSrc || video.src || '', mediaSource: localMediaSource(video), sourceFrames: [],
        page, direct: !!page && !!video.closest('.jwplayer') && sites.adapter().gestures,
        ...(options.userSeek ? { userSeek: options.userSeek() } : {}),
        ...(options.customState?.(video) || {}),
      };
    }
    if (local?.isConnected && local.closest('.jw-flag-ads,[data-ad]')) return { position: 0, duration: 0, paused: true, ad: true, direct: false, page: null };
    const selected = relayRemote();
    return selected?.state ? { ...selected.state, sourceFrames: sourceFrames([selected.frame.src, ...sourceFrames(selected.state.sourceFrames)]), page: sites.adapter().read() || selected.state.page,
      managed, role: currentRole } : null;
  }
  function sendState() {
    if (!upstream) return;
    const value = state();
    window.parent.postMessage({ tag: channel, type: 'state', token: upstream.token, value }, upstream.origin);
  }
  function requestFullscreen() {
    if (documentRole() !== 'current') return;
    if (upstream) window.parent.postMessage({ tag: channel, type: 'fullscreen-toggle', token: upstream.token }, upstream.origin);
    else document.dispatchEvent(new CustomEvent('mc-fullscreen-request'));
  }
  function requestNext(){
    if(documentRole()!=='current')return false;
    if(upstream){
      if(nextRequests.size)return false;
      const id=nonce(),mediaId=state()?.mediaId;if(!mediaId)return false;
      return new Promise(resolve=>{
        const timer=setTimeout(()=>{nextRequests.delete(id);resolve('timeout');},45000);
        nextRequests.set(id,{resolve,timer,mediaId,token:upstream.token});
        window.parent.postMessage({tag:channel,type:'next-episode',token:upstream.token,id,mediaId},upstream.origin);
      });
    }
    return options.onNext?.() || false;
  }
  function requestIntro(){
    const value=state();if(documentRole()!=='current' || !upstream || !value?.mediaId || value.ad)return false;
    window.parent.postMessage({tag:channel,type:'intro-episode',token:upstream.token,mediaId:value.mediaId},upstream.origin);return true;
  }
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.tag !== channel || !trustedOrigin(event.origin)) return;
    if (event.source === window.parent && window.parent !== window && parentOrigin === event.origin) {
      if(data.type==='cancel-replace' && upstream?.token===data.token && localReplacement?.id===data.id){localReplacement.controller.abort();return;}
      if(data.type==='replace-media' && upstream?.token===data.token){
        const video=sites.findVideo(),value=data.value,provider=providerIdentity(value?.provider),playlist=typeof SharedPlayer!=='undefined' && SharedPlayer.mediaPlaylist(value?.playlist);
        if(localReplacement || !options.replaceMedia || !video || video.closest('.jw-flag-ads,[data-ad]') || typeof data.mediaId!=='string' || !data.mediaId || data.mediaId!==(video.currentSrc || video.src || '') || typeof data.id!=='string' || !/^[a-f0-9-]{16,100}$/.test(data.id) || !playlist || !provider || !Number.isFinite(value.position) || value.position<0 || typeof value.paused!=='boolean' || typeof value.muted!=='boolean' || !Number.isFinite(value.volume) || value.volume<0 || value.volume>1)return;
        const job={id:data.id,token:data.token,controller:new AbortController()};localReplacement=job;
        Promise.resolve(options.replaceMedia(video,{playlist,provider,position:value.position,paused:value.paused,muted:value.muted,volume:value.volume},job.controller.signal)).then(()=>{
          if(localReplacement===job && upstream?.token===job.token && !job.controller.signal.aborted){sendState();window.parent.postMessage({tag:channel,type:'replace-result',token:job.token,id:job.id,ok:true},upstream.origin);}
        },()=>{if(localReplacement===job && upstream?.token===job.token){sendState();window.parent.postMessage({tag:channel,type:'replace-result',token:job.token,id:job.id,ok:false},upstream.origin);}}).finally(()=>{if(localReplacement===job)localReplacement=null;});return;
      }
      if(data.type==='next-result' && upstream?.token===data.token && typeof data.id==='string'){
        const request=nextRequests.get(data.id);
        if(request && request.token===data.token && data.mediaId===request.mediaId && (data.status==='navigating' || request.mediaId===state()?.mediaId) && ['navigating','missing','error'].includes(data.status)){
          clearTimeout(request.timer);nextRequests.delete(data.id);request.resolve(data.status);
        }return;
      }
      if (data.type === 'hello' && typeof data.token === 'string' && data.token.length < 100) {
        if(upstream?.token!==data.token)localReplacement?.controller.abort();
        upstream = { token: data.token, origin: event.origin };
        parentContext=readParentContext(data.context,event.origin);parentFullscreen=data.fullscreen===true;parentPresented=data.presented!==false;
        if (data.managed && ['prepared', 'current'].includes(data.role)) {
          managed = true; role = data.role; roleFromParent = true;
          for (const frame of frames()) setRole(frame, role);
          document.dispatchEvent(new CustomEvent('mc-player-role', { detail: { role, managed } }));
        }
        options.onHello?.();
        sendState();
      }
      if (data.type === 'role' && upstream?.token === data.token && data.managed && ['prepared', 'current'].includes(data.role)) {
        managed = true; role = data.role; roleFromParent = true;
        for (const frame of frames()) setRole(frame, role);
        document.dispatchEvent(new CustomEvent('mc-player-role', { detail: { role, managed } }));
      }
      if (data.type === 'command' && upstream?.token === data.token) {
        if(data.action==='play-audible' && (typeof data.mediaId!=='string' || !data.mediaId || documentRole()==='prepared'))return;
        if(data.action==='initialize-play-audible' && documentRole()==='prepared')return;
        if(data.action==='restore-audio' && (typeof data.mediaId!=='string' || !data.mediaId || documentRole()==='prepared' || typeof data.value?.muted!=='boolean' || !Number.isFinite(data.value?.volume) || data.value.volume<0 || data.value.volume>1))return;
        const video = sites.findVideo();
        observeLocal(video);
        if (!video) {const relay=relayRemote();if(data.mediaId && data.mediaId!==relay?.state?.mediaId)return;return relay?.command(data.action,data.value);}
        if(data.mediaId && data.mediaId!==(video.currentSrc || video.src || ''))return;
        if(data.action==='initialize-play-audible'){
          if(video.closest('.jw-flag-ads,[data-ad]') || video.error || video.readyState!==0)return;
          options.initializePlayAudible?.(video);return;
        }
        if(data.action==='play-audible'){
          if(video.closest('.jw-flag-ads,[data-ad]') || video.error || video.readyState<1)return;
          options.playAudible?.(video);return;
        }
        if(data.action==='restore-audio'){
          if(video.closest('.jw-flag-ads,[data-ad]') || video.error || video.readyState<1)return;
          options.restoreAudio?.(video,data.value);return;
        }
        if(typeof data.action==='string' && data.action.startsWith('track-')){
          if(typeof data.mediaId!=='string' || !data.mediaId || data.mediaId!==(video.currentSrc || video.src || '') || video.closest('.jw-flag-ads,[data-ad]') || video.error || video.readyState<1)return;
          options.selectTrack?.(video,data.action.slice(6),data.value);return;
        }
        if (data.action === 'seek' && Number.isFinite(data.value) && data.value >= 0 && data.value < video.duration) {
          options.beforeSeek?.(data.value); video.currentTime = data.value;
        }
        if (data.action === 'play') video.play()?.catch(() => {});
        if (data.action === 'pause') video.pause();
        if (data.action === 'reveal-controls') document.dispatchEvent(new CustomEvent('mc-reveal-controls'));
        if (data.action === 'mute' && typeof data.value === 'boolean') { if (!options.setMute?.(video, data.value)) video.muted = data.value; }
        if (data.action === 'rate' && Number.isFinite(data.value) && data.value >= .25 && data.value <= 4) video.playbackRate = data.value;
        if (data.action === 'start-zero') {
          const operation = ++startGeneration;
          lastStarted = false;
          seekStartOff();
          video.muted = true;
          options.beforeSeek?.(0);
          video.currentTime = 0;
          const source = video.currentSrc || video.src || '';
          // Phải quan sát seek thực tế, không coi command gửi đi là thành công.
          const start = () => {
            if (operation !== startGeneration) return;
            if (video.currentTime > .5 || video.seeking) return;
            video.removeEventListener('seeked', start);
            seekStartOff = () => {};
            Promise.resolve(video.play()).then(() => {
              if (operation !== startGeneration || video !== local || !video.isConnected || source !== (video.currentSrc || video.src || '') || video.currentTime > 3 || video.paused) return;
              lastStarted = true;
              sendState();
            }).catch(() => { if (operation === startGeneration) { lastStarted = false; sendState(); } });
          };
          video.addEventListener('seeked', start);
          seekStartOff = () => video.removeEventListener('seeked', start);
          start();
        }
      }
      return;
    }
    // event.source phải chính là frame đang hiện; không tin một message chỉ vì cùng domain.
    const frame = frames().find((el) => el.contentWindow === event.source);
    if (!frame || sites.url(frame.src)?.origin !== event.origin) return;
    let session = sessions.get(frame);
    if(data.type==='intro-episode'){
      const receiver=validRemote(frame);
      if(!session || data.token!==session.token || session.src!==frame.src || session.origin!==event.origin || !receiver?.state.localPresentation || receiver.state.ad || receiver.state.changing || frame.dataset.mcRole==='prepared' || receiver.state.role==='prepared' || !data.mediaId || data.mediaId!==receiver.state.mediaId || Date.now()-(session.lastIntro || 0)<500)return;
      session.lastIntro=Date.now();if(upstream)requestIntro();else options.onIntro?.();return;
    }
    if(data.type==='replace-result'){
      const request=replacementRequests.get(data.id);
      if(!request || request.frame!==frame || request.token!==data.token || session?.token!==data.token || session.src!==frame.src || session.origin!==event.origin)return;
      if(data.ok===true)request.resolve(true);else request.reject(new Error('Không đổi được nguồn trong phiên'));return;
    }
    if(data.type==='next-episode'){
      const receiver=validRemote(frame);
      if(!session || data.token!==session.token || session.src!==frame.src || session.origin!==event.origin || !(receiver?.state?.nativeEnhanced || receiver?.state?.localPresentation) || !receiver.state.customCapable || receiver.state.ad || frame.dataset.mcRole==='prepared' || receiver.state.role==='prepared' || !data.mediaId || data.mediaId!==receiver.state.mediaId || typeof data.id!=='string' || !/^[a-f0-9-]{16,100}$/.test(data.id) || session.nextPending)return;
      const currentSession=session;session.nextPending=true;
      Promise.resolve(upstream?requestNext():options.onNext?.()).then(ok=>{
        if(validRemote(frame)!==receiver || sessions.get(frame)!==currentSession || receiver.state.mediaId!==data.mediaId && ok!==true && ok!=='navigating')return;
        const status=ok===true || ok==='navigating'?'navigating':ok==='error' || ok==='timeout'?'error':'missing';
        frame.contentWindow.postMessage({tag:channel,type:'next-result',token:session.token,id:data.id,mediaId:data.mediaId,status},session.origin);
      }).catch(()=>{
        if(validRemote(frame)===receiver && sessions.get(frame)===currentSession)frame.contentWindow.postMessage({tag:channel,type:'next-result',token:session.token,id:data.id,mediaId:data.mediaId,status:'error'},session.origin);
      }).finally(()=>{currentSession.nextPending=false;});return;
    }
    if (data.type === 'fullscreen-toggle') {
      const receiver = validRemote(frame);
      if (!session || session.token !== data.token || session.origin !== event.origin || session.src !== frame.src
        || !receiver || frame.dataset.mcRole === 'prepared' || receiver.state.role === 'prepared') return;
      requestFullscreen();
      return;
    }
    if (data.type === 'ready') {
      remotes.delete(frame);
      if (relayFrame === frame) relayFrame = null;
      if (activeFrame === frame) { activeFrame = null; remote = null; }
      session = openSession(frame,event.origin);
      hello(frame, session);
      return;
    }
    if (data.type !== 'state' || !session || session.token !== data.token || session.origin !== event.origin || session.src !== frame.src) return;
    let value = data.value;
    if (value === null) { remotes.delete(frame); if (frame === activeFrame) { remote = null; activeFrame = null; } return; }
    if (!value || !Number.isFinite(value.position) || !Number.isFinite(value.duration) || value.position < 0 || value.duration < 0 || value.position > value.duration + 1) return;
    // Diagnostics are optional and numeric only; never relay a media URL or
    // arbitrary message as display markup through this extension of the bridge.
    const load=typeof SharedPlayer!=='undefined' && SharedPlayer.validLoadMetrics(value.load)?Object.fromEntries(['ahead','status','bytesPerSecond','online','bufferPolicy'].map(key=>[key,value.load[key]])):null;
    value={...value,load};
    // This field comes through the same frame/window/origin/nonce checks as
    // mediaId. It conveys a media URL only, never original-page authority.
    const tracks={};
    for(const group of ['quality','audio','captions']){
      const items=value.tracks?.[group];
      if(Array.isArray(items) && items.length<=100 && items.every(item=>item && Number.isInteger(item.id) && item.id>=0 && item.id<100 && typeof item.label==='string' && item.label.length<=100 && typeof item.active==='boolean'))tracks[group]=items.map(({id,label,active})=>({id,label,active}));
    }
    value = { ...value, mediaSource: mediaSource(value.mediaSource),nativeEnhanced:value.nativeEnhanced===true,customCapable:value.customCapable===true,initializable:value.initializable===true,played:value.played===true,tracks,
      localPresentation:value.localPresentation===true,playlist:channel==='motchill-player-controls-v2' && typeof SharedPlayer!=='undefined'?SharedPlayer.mediaPlaylist(value.playlist):null,provider:providerIdentity(value.provider),changing:value.changing===true };
    // Generic player chỉ có quyền báo video, không tự nhận là website gốc.
    if (sites.embedHosts.has(sites.url(frame.src).hostname)) value = { ...value, page: null, direct: false,
      sourceFrames: sourceFrames(value.sourceFrames).filter((value) => sites.knownEmbedPage(value)) };
    else value = { ...value, sourceFrames: sourceFrames(value.sourceFrames) };
    session.seenAt = Date.now();
    let receiver = remotes.get(frame);
    if (!receiver || receiver.session !== session) { receiver = new RemoteVideo(frame, session); remotes.set(frame, receiver); }
    const previous = receiver.state;
    const changedMedia = previous.mediaId && value.mediaId && previous.mediaId !== value.mediaId;
    if (changedMedia || previous.ad !== value.ad && (previous.ad || value.ad)) receiver.dispatchEvent(new Event('emptied'));
    receiver.state = value;
    relayFrame = frame;
    const prepared = frame.dataset.mcRole === 'prepared' || value.role === 'prepared';
    if (!prepared) { activeFrame = frame; remote = receiver; }
    else if (frame === activeFrame) { activeFrame = null; remote = null; }
    if ((!previous.duration || changedMedia || previous.ad && !value.ad) && value.duration) receiver.dispatchEvent(new Event('loadedmetadata'));
    receiver.dispatchEvent(new Event('timeupdate'));
    if (!previous.paused && value.paused) receiver.dispatchEvent(new Event('pause'));
    if (value.ended && !previous.ended) receiver.dispatchEvent(new Event('ended'));
    sendState();
  });
  function observeLocal(video) {
    if (!video || video === local) return;
    localOff();
    local = video;
    lastStarted = false;
    startGeneration++;
    seekStartOff(); seekStartOff = () => {};
    const invalidateStart = () => {
      if (video !== local) return;
      startGeneration++; lastStarted = false; seekStartOff(); seekStartOff = () => {};
      sendState();
    };
    const events = ['loadedmetadata', 'timeupdate', 'pause', 'ended', 'playing', 'error', 'ratechange'];
    video.addEventListener('loadstart', invalidateStart);
    video.addEventListener('emptied', invalidateStart);
    for (const type of events) video.addEventListener(type, sendState);
    localOff = () => {
      video.removeEventListener('loadstart', invalidateStart);
      video.removeEventListener('emptied', invalidateStart);
      for (const type of events) video.removeEventListener(type, sendState);
    };
  }
  function poll() {
    const currentFrames = frames();
    for (const [frame, session] of sessions) {
      if (!currentFrames.includes(frame) || frame.src !== session.src || Date.now() - (session.seenAt || Date.now()) > 10000) { frame.removeEventListener('load',session.loaded);sessions.delete(frame); remotes.delete(frame); }
    }
    if (remote && (!currentFrames.includes(activeFrame) || !validRemote(activeFrame))) { remote = null; activeFrame = null; }
    for (const frame of currentFrames) {
      if (!sessions.has(frame)) {
        const target = sites.url(frame.src);
        const session = openSession(frame,target.origin);
        hello(frame, session);
      }
      else if(channel==='motchill-player-controls-v2')hello(frame,sessions.get(frame));
    }
    if (parentOrigin && window.parent !== window && trustedOrigin(parentOrigin) && !upstream) window.parent.postMessage({ tag: channel, type: 'ready' }, parentOrigin);
    const video = sites.findVideo();
    observeLocal(video);
    sendState();
    return video || (remote?.isConnected ? remote : null);
  }
  return { poll, state, setRole, requestFullscreen,requestNext,requestIntro,get parentContext(){return parentContext;},get parentFullscreen(){return parentFullscreen;},get parentPresented(){return parentPresented;},getFrame: validRemote,
    setNativeGestures(value) { nativeGestures = value === true; },
    get role() { return documentRole(); }, get managed() { documentRole(); return managed; }, get remote() { return remote; } };
}
