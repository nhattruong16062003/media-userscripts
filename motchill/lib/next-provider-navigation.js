// Keep the observed Next episode contract and engine behind the shared custom
// UI. This controller owns navigation and the stable parent fullscreen host.
function createMotchillNextProviderNavigation(sites,bridge,players,fullscreen,hooks={}){
  let active=false,shell=null,currentMedia=null,identity='',override=null,disposed=false,lastURL='';
  let buttonClasses=null;
  let rollback=null,clicked=null,transferring=false,recovering=null;
  const state=()=>sites.nextProviderState();
  const page=()=>sites.read();
  const key=()=>{const source=state();return [location.href,source?.frame.src,source?.episode.id,source && bridge.getFrame(source.frame)?.state.mediaId].join('|');};
  const ready=remote=>remote?.state?.customCapable===true && remote.state.nativeEnhanced===true && remote.readyState>=2 && remote.duration>0 && !remote.state.ad && !remote.state.error;
  // HAVE_METADATA during seek/buffering is not a different media resource.
  // Keep readiness as the prepare gate; identity/ad/fatal checks own validity
  // while start-zero and resume wait for their actual acknowledgements.
  const current=candidate=>candidate.frame.isConnected && candidate.frame.src===candidate.src && bridge.getFrame(candidate.frame)===candidate.remote
    && candidate.remote.state.customCapable===true && candidate.remote.state.nativeEnhanced===true && !candidate.remote.state.ad && !candidate.remote.state.error
    && !!candidate.mediaId && candidate.remote.state.mediaId===candidate.mediaId;
  const wait=(check,signal)=>new Promise((resolve,reject)=>{
    let timer;const finish=(fn,value)=>{clearInterval(timer);signal.removeEventListener('abort',abort);fn(value);};
    const abort=()=>finish(reject,Object.assign(new Error('Đã hủy chuyển nguồn'),{name:'AbortError'}));
    const tick=()=>{if(signal.aborted)return abort();try{bridge.poll();const value=check();if(value)finish(resolve,value);}catch(error){finish(reject,error);}};
    signal.addEventListener('abort',abort,{once:true});timer=setInterval(tick,100);tick();
  });
  function report(value){
    if(!clicked?.isConnected)return;
    if(['switching','refreshing'].includes(value.phase)){clicked.disabled=true;clicked.textContent='Đang chuyển…';}
    else if(value.phase==='error'){clicked.disabled=false;clicked.textContent='Chưa đổi được nguồn · Thử lại';}
    else {clicked.disabled=false;clicked.textContent=clicked.dataset.mcNativeLabel || '';}
  }
  const machine=createMotchillEpisodeMachine({onState:report,
    async prepare(target,{signal}){
      const original=state(),sourcePage=page(),route=sites.route(target.url,sites.families.NEXT),targetURL=sites.url(target.url);
      if(!original || !sourcePage || !shell?.isConnected || targetURL?.origin!==location.origin || route?.slug!==sourcePage.slug)throw new Error('Đường dẫn tập không hợp lệ');
      const choices=original.data.movie.episodes.filter(ep=>ep && ep.slug===route.episode && ep.type==='m3u8');
      let server=target.server || original.episode.server;
      if(target.serverKey){const choice=players.serverChoices().find(item=>item.key===target.serverKey);if(!choice)throw new Error('Không tìm thấy server');server=choice.label;}
      if(target.language && sites.translationKey(server)!==target.language){const matches=[...new Set(choices.filter(ep=>sites.translationKey(ep.server)===target.language).map(ep=>ep.server))];if(matches.length!==1)throw new Error('Hãy chọn đúng server cho bản dịch');server=matches[0];}
      const matches=choices.filter(ep=>ep.server===server);if(matches.length!==1)throw new Error('Chưa có tập trên server đang chọn');
      const episode=matches[0],src=new URL('/embed/'+episode.id,original.source).href;
      if(!sites.knownEmbedPage(src))throw new Error('Nguồn nhúng chưa cấp quyền');
      if(target.intent==='server' && !target.historySelection && sites.translationKey(server)!==sourcePage.language){
        // Native server buttons and the translation component must apply the
        // same saved-target policy, before warming or replacing any resource.
        document.dispatchEvent(new Event('mc-before-server-change'));
        const before=key(),media=currentMedia,mediaId=media?.state?.mediaId;
        const stored=await lookupMotchillHistoryProgress({...sourcePage,...target,server,language:sites.translationKey(server),episodeKey:sites.episodeKey(route.episode)},{signal});
        if(signal.aborted || key()!==before || currentMedia!==media || media?.state?.mediaId!==mediaId || state()?.episode.id!==original.episode.id)throw new Error('Nguồn đã đổi trong lúc đọc lịch sử');
        if(!['found','missing','unavailable'].includes(stored.status))throw new Error('Chưa đọc được lịch sử bản dịch. Hãy thử lại');
        if(stored.status==='found')target.resume=stored.value;
      }
      const frame=document.createElement('iframe');frame.className=original.frame.className+' mc-native-prepared';frame.title='Chuẩn bị nguồn phim';
      frame.dataset.mcManaged='provider';frame.dataset.mcRole='prepared';frame.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';frame.allowFullscreen=true;
      frame.referrerPolicy=original.frame.referrerPolicy || 'strict-origin-when-cross-origin';frame.src=src;shell.append(frame);
      const candidate={frame,src,episode,target,sourceKey:key(),remote:null,activated:false};
      const abort=()=>{if(!candidate.activated)frame.remove();};signal.addEventListener('abort',abort,{once:true});
      try{await wait(()=>{
        if(key()!==candidate.sourceKey)throw new Error('Trang đã đổi nguồn');
        const remote=bridge.getFrame(frame);if(remote?.state?.error)throw new Error('Nguồn tập bị lỗi');
        if(!ready(remote) || remote.state.role!=='prepared')return false;
        candidate.remote=remote;candidate.mediaId=remote.state.mediaId;remote.muted=true;remote.pause();return true;
      },signal);return candidate;}catch(error){frame.remove();throw error;}finally{signal.removeEventListener('abort',abort);}
    },
    async activate(candidate,_target,{signal}){
      if(!current(candidate) || key()!==candidate.sourceKey)throw new Error('Nguồn chuẩn bị đã đổi');
      const persistent=!!(currentMedia?.state.localPresentation && currentMedia?.state.nativeEnhanced && currentMedia?.state.playlist);
      rollback={media:currentMedia,muted:!!currentMedia?.muted,paused:!!currentMedia && currentMedia.paused!==false,persistent};
      // The visible mobile engine loads/seeks/confirms this playlist during
      // commit. Starting the disposable iframe first triggers the provider's
      // captured native resume handler and can undo seek-zero. Keep this
      // descriptor paused/silent; never claim that it has started at zero.
      if(persistent)return {deferred:'persistent'};
      bridge.setRole(candidate.frame,'current');candidate.remote.command('start-zero');
      // The child verifies seek-zero and its first actual Play before setting
      // startedAtZero. A delayed parent poll may observe >3s; requiring that
      // transient position again loses a valid acknowledgement on Android.
      await wait(()=>{if(!current(candidate))throw new Error('Nguồn không còn sẵn sàng');return candidate.remote.state.startedAtZero && !candidate.remote.paused;},signal);
      const resume=candidate.target.resume;
      if(resume && ['server','translation'].includes(candidate.target.intent) && Number.isFinite(resume.position) && resume.position>=0 && Number.isFinite(resume.duration) && Math.abs(resume.duration-candidate.remote.duration)<=Math.max(30,candidate.remote.duration*.03)){
        const position=Math.min(resume.position,candidate.remote.duration-1);candidate.remote.currentTime=position;
        await wait(()=>{if(!current(candidate))throw new Error('Nguồn đã thay đổi');return Math.abs(candidate.remote.currentTime-position)<3;},signal);
      }
      return {playing:true,startedAt:0};
    },
    async commit(candidate,target,result,operation){
      if(operation.signal.aborted || !operation.isCurrent() || !current(candidate) || key()!==candidate.sourceKey)throw new Error('Tác vụ không còn hiện hành');
      const old=state()?.frame;if(!old)throw new Error('Khung cũ đã đổi');
      if(result?.deferred==='persistent'){
        const original=currentMedia,previousFile=original?.state.playlist?.file,provider=candidate.remote.state.provider,playlist=candidate.remote.state.playlist;
        if(!original?.state.localPresentation || !original.state.nativeEnhanced || !previousFile || !playlist || !provider || provider.movieId!==original.state.provider?.movieId || provider.season!==original.state.provider?.season || provider.id!==String(candidate.episode.id) || provider.server!==candidate.episode.server)throw new Error('Nguồn không cùng phim/mùa/server');
        document.dispatchEvent(new Event('mc-before-server-change'));
        // History must not bind a new media URL to the previous route during
        // an asynchronous engine load. The same visible document stays full.
        transferring=true;old.dataset.mcManaged='provider';bridge.setRole(old,'current');old.dataset.mcRole='prepared';
        const resume=target.resume,compatible=resume && ['server','translation'].includes(target.intent) && Number.isFinite(resume.position) && Number.isFinite(resume.duration) && Math.abs(resume.duration-candidate.remote.duration)<=Math.max(30,candidate.remote.duration*.03);
        try{
          await original.replaceMedia({playlist,provider,position:compatible?resume.position:0,paused:['server','translation'].includes(target.intent) && !!rollback?.paused,muted:rollback?.muted ?? false,volume:Number.isFinite(original.volume)?original.volume:1},operation.signal);
          if(operation.signal.aborted || !operation.isCurrent() || old.src!==original.session.src)throw Object.assign(new Error('Đã hủy chuyển tập'),{name:'AbortError'});
          const route=sites.route(target.url,sites.families.NEXT);
          old.dataset.mcProviderSource=old.src;old.dataset.mcProviderPath=route.path;old.dataset.mcProviderId=String(candidate.episode.id);old.dataset.mcProviderFile=playlist.file;
          History.prototype[target.pop?'replaceState':'pushState'].call(history,{...history.state,mcNativeEpisode:true},'',target.url);
          // This controller has already confirmed its seek (zero or resume).
          // Only an explicit history-card selection hands that seek to history.
          old.dataset.mcRole='current';old.dataset.mcStartZero=target.historySelection?'0':'1';currentMedia=original;
          candidate.remote.pause();candidate.remote.muted=true;candidate.frame.remove();candidate.activated=true;
          try{sessionStorage.setItem('active-server-'+state().data.movie.slug,candidate.episode.server);sessionStorage.setItem('active-server-type','m3u8');}catch{/* storage disabled */}
          const info=page();document.title=info.title+' · '+info.episode;document.dispatchEvent(new CustomEvent('mc-episode-changed',{detail:info}));
          syncButtons();rollback=null;override=null;identity=key();lastURL=location.href;bridge.poll();hooks.poll?.(currentMedia,identity);return {confirmed:true};
        }catch(error){
          // Reveal a rolled-back resource only after its actual playlist is
          // confirmed. An unknown/late result stays isolated from history.
          recovering={frame:old,remote:original,file:previousFile};
          if(original.state.playlist?.file===previousFile && !original.state.changing){old.dataset.mcRole='current';recovering=null;}
          throw error;
        }finally{transferring=false;}
      }
      document.dispatchEvent(new Event('mc-before-server-change'));rollback?.media?.pause();
      bridge.setRole(old,'prepared');old.dataset.mcRole='prepared';old.hidden=true;old.style.display='none';
      candidate.frame.classList.remove('mc-native-prepared');candidate.frame.dataset.mcRole='current';candidate.frame.dataset.mcStartZero=target.historySelection?'0':'1';candidate.frame.title='Trình phát phim';candidate.activated=true;
      currentMedia=candidate.remote;currentMedia.muted=rollback?.muted ?? false;
      // Keep Pause for an explicit server change; Next starts the new episode.
      if(['server','translation'].includes(target.intent) && rollback?.paused)currentMedia.pause();
      History.prototype[target.pop?'replaceState':'pushState'].call(history,{...history.state,mcNativeEpisode:true},'',target.url);if(old.dataset.mcManaged==='provider')old.remove();else{old.dataset.mcManaged='provider';old.dataset.mcNativeRetired='1';}
      try{sessionStorage.setItem('active-server-'+state().data.movie.slug,candidate.episode.server);sessionStorage.setItem('active-server-type','m3u8');}catch{/* storage disabled */}
      const info=page();document.title=info.title+' · '+info.episode;document.dispatchEvent(new CustomEvent('mc-episode-changed',{detail:info}));
      syncButtons();
      rollback=null;override=null;identity=key();lastURL=location.href;
      // Publish the new visible frame and episode context immediately.
      bridge.poll();
      hooks.poll?.(currentMedia,identity);
    },
    // A persistent child owns its rollback, including Pause/audio. Parent
    // commands here could unmute or resume an unconfirmed intermediate source.
    rollback(){if(rollback?.media && !rollback.persistent){rollback.media.muted=rollback.muted;if(!rollback.paused)rollback.media.play()?.catch(()=>{});}rollback=null;},
    discard(candidate){if(!candidate.activated)candidate.frame.remove();},
  },{commitTimeoutMs:45000,activateInCommit:true});
  const style=document.createElement('style');style.dataset.mcNativeNavigation='1';style.textContent='.mc-native-prepared{position:fixed!important;left:-10000px!important;top:0!important;width:640px!important;height:360px!important;opacity:0!important;pointer-events:none!important}.player-frame-stable:fullscreen{width:100vw!important;height:100vh!important;padding:0!important;background:#000}';
  function syncButtons(){
    const current=state(),nodes=sites.nextProviderButtons();if(!current || !nodes.length)return;
    const label=node=>node.dataset.mcNativeLabel || node.textContent.trim();
    if(!buttonClasses){const selected=nodes.find(node=>label(node)===current.episode.server),other=nodes.filter(node=>label(node)!==current.episode.server);if(selected && other.length && other.every(node=>node.className===other[0].className) && selected.className!==other[0].className)buttonClasses={active:selected.className,idle:other[0].className};}
    for(const node of nodes){const selected=label(node)===current.episode.server;node.setAttribute('aria-pressed',String(selected));if(buttonClasses)node.className=selected?buttonClasses.active:buttonClasses.idle;}
  }
  function poll(){
    if(transferring)return true;
    // The result message can arrive before the parent's next state heartbeat.
    // Restore history eligibility only when the old resource is confirmed,
    // including recovery that finishes after the outer operation was aborted.
    if(recovering){
      const {frame,remote,file}=recovering;
      if(!frame.isConnected || frame.src!==remote.session.src)recovering=null;
      else if(remote.state.playlist?.file===file && !remote.state.changing){frame.dataset.mcRole='current';recovering=null;}
    }
    const source=state();if(!source){if(active){machine.cancel();identity='';active=false;}return false;}
    active=true;shell=source.frame.parentElement;if(!style.isConnected)(document.head || document.documentElement).append(style);
    const newKey=key();
    const sameEpisode=identity && identity.split('|').slice(0,3).join('|')===newKey.split('|').slice(0,3).join('|');
    const keepError=!!sameEpisode && machine.state.phase==='error';
    if(identity && identity!==newKey && !keepError){machine.cancel();override=null;}
    if(!keepError)identity=newKey;
    lastURL=location.href;syncButtons();
    currentMedia=bridge.getFrame(source.frame) || null;
    if(currentMedia)hooks.poll?.(currentMedia,newKey);
    if(!machine.busy && (!keepError || currentMedia?.ended)){const info=page(),target=override || info?.next;machine.tick({currentTime:currentMedia?.currentTime,duration:currentMedia?.duration,paused:currentMedia?.paused!==false,ended:currentMedia?.ended,ad:currentMedia?.state.ad},keepError?identity:newKey,target);}
    return true;
  }
  async function transitionTo(target,reason='manual'){
    if(!state() || machine.busy)return false;
    override={...target,intent:target.intent || reason};machine.reset(key(),override);
    const success=await machine.go(reason);override=null;return success;
  }
  function goNext(reason='manual'){if(!machine.busy)clicked=null;const info=page();return info?.next?transitionTo(info.next,reason):Promise.resolve(false);}
  function toggleFullscreen(){return shell?fullscreen.toggle(shell):Promise.resolve('unavailable');}
  document.addEventListener('click',event=>{
    const source=state();if(!source || !active)return;
    const button=sites.nextProviderButtons().find(node=>node===event.target || node.contains(event.target));
    if(button){
      event.preventDefault();event.stopImmediatePropagation();const server=button.dataset.mcNativeLabel || button.textContent.trim();
      if(server===source.episode.server || machine.busy)return;
      clicked=button;button.dataset.mcNativeLabel=server;
      const historySelection=button.dataset.mcHistoryResume==='1';
      // History's pending-selection flow has deliberately detached its old
      // watcher; it restores the verified saved target after this commit.
      transitionTo({...page(),server,historySelection,resume:historySelection?null:{position:currentMedia?.currentTime,duration:currentMedia?.duration},language:sites.translationKey(server),intent:'server'},'server');return;
    }
    const link=event.target.closest?.('a[href]');if(!link || link.closest('.mh-continue') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button!==0 || link.target==='_blank')return;
    const target=sites.url(link.href),route=target && sites.route(target.href,sites.families.NEXT),info=page();
    if(target?.origin!==location.origin || route?.slug!==info.slug || route.episode===source.episode.slug)return;
    event.preventDefault();event.stopImmediatePropagation();transitionTo({url:target.href,server:source.episode.server,language:info.language},'manual');
  },true);
  addEventListener('message',event=>{if(active && ['NEXT_EPISODE','CHANGE_EPISODE'].includes(event.data?.type)){event.stopImmediatePropagation();}},true);
  addEventListener('popstate',event=>{
    if(!active || !lastURL)return;
    const destination=location.href,before=sites.route(lastURL,sites.families.NEXT),after=sites.route(destination,sites.families.NEXT);
    if(!before || !after || before.slug!==after.slug)return;
    event.stopImmediatePropagation();machine.cancel();override=null;
    History.prototype.replaceState.call(history,history.state,'',lastURL);
    const current=state();if(current)transitionTo({url:destination,server:current.episode.server,language:sites.translationKey(current.episode.server),pop:true},'pop');
  },true);
  addEventListener('pagehide',event=>{machine.cancel();if(!event.persisted){disposed=true;style.remove();}});
  return {poll,goNext,transitionTo,toggleFullscreen,machine,get active(){return active && !disposed;},get shell(){return shell;},get media(){return currentMedia;}};
}
