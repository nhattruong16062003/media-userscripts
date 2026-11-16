import {playerIcon,playerUIStyle} from './player-ui.js';
import {installGestures} from './gestures.js';
import {audioPreferenceSession} from './audio-preferences.js';
import {validLoadMetrics,loadMetricsText} from './buffering.js';

// Lock belongs to the fullscreen presentation, not to an episode's engine/UI.
// Keep it across a source/UI rebind; a real fullscreen exit always clears it,
// even if that exit occurs in the interval between disposing and remounting UI.
const fullscreenLocks = new WeakMap();
function fullscreenLockRecord(doc) {
  let record = fullscreenLocks.get(doc);
  if (!record) {
    record = { scope: null, locked: false }; fullscreenLocks.set(doc, record);
    doc.addEventListener('fullscreenchange', () => {
      if (record.scope !== doc.fullscreenElement) { record.scope = null; record.locked = false; }
    });
  }
  return record;
}

// The same approved UI talks only to the attached player's command/state API.
export function customPlayerControls(win,player,options={}) {
  const {video,root}=player,doc=win.document,nativeRoot=player.nativeRoot || root,element=video.nodeType===1?video:null;playerUIStyle(doc);
  const nativeMode=options.nativeUI===true;
  const contents=new WeakMap();
  const text=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
  const prop=(node,key,value)=>{if(node[key]!==value)node[key]=value;};
  const attr=(node,key,value)=>{value=String(value);if(node.getAttribute(key)!==value)node.setAttribute(key,value);};
  const data=(node,key,value)=>{value=String(value);if(node.dataset[key]!==value)node.dataset[key]=value;};
  const content=(node,key,render)=>{if(contents.get(node)!==key){render();contents.set(node,key);}};
  const icon=(node,kind)=>content(node,'icon:'+kind,()=>{node.innerHTML=playerIcon(kind);node.dataset.rpIcon=kind;});
  const buttonText=(node,value)=>content(node,'text:'+value,()=>{node.textContent=value;delete node.dataset.rpIcon;});
  const shell=doc.createElement('div');shell.dataset.rpUi='player';shell.className='rp-player-shell';shell.dataset.rpLocked='false';shell.dataset.rpChrome='true';if(nativeMode)shell.dataset.rpMode='native-enhancement';
  const surface=doc.createElement('div');surface.className='rp-gesture-surface';surface.dataset.rpGestureSurface='1';surface.setAttribute('aria-label','Chạm để hiện điều khiển; chạm đôi hai bên tua 10 giây; giữ để phát 2 lần');shell.append(surface);
  function button(action,label,icon,host,className='rp-icon'){
    const node=doc.createElement('button');node.type='button';node.dataset.rpAction=action;node.className=className;node.setAttribute('aria-label',label);node.innerHTML=playerIcon(icon);contents.set(node,'icon:'+icon);node.dataset.rpIcon=icon;
    node.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(disposed)return;if(!locked || action==='context')actionClick(action,node);else if(action==='lock')setLocked(false);});host.append(node);return node;
  }
  let disposed=false,locked=false,chromeVisible=true,lockVisible=true,scrubbing=false,nativeOwned=false,lastReady=false,lastPaused=null,context=null,autoPlayAttempted=false;
  const lockRecord=fullscreenLockRecord(doc);
  const fullscreenScope=()=>inFullscreen() ? doc.fullscreenElement || root : null;
  locked=!!fullscreenScope() && lockRecord.scope===fullscreenScope() && lockRecord.locked;
  let hideTimer=0,lockTimer=0,tipTimer=0,errorTimer=0,nextTimer=0,scrubTimer=0,nextPending=null,nextError=null;
  const audio=options.audioPreferences?audioPreferenceSession(win,player,options.audioPreferences):null;
  const savedAttributes=new Map(['controls','playsinline','webkit-playsinline'].map(name=>[name,element?.getAttribute(name) ?? null]));
  const originalPosition=root.style.position;let positioned=false;
  const center=button('play','Tạm dừng','pause',shell,'rp-icon rp-center-play');
  const lock=button('lock','Khóa màn hình','unlock',shell,'rp-icon rp-lock');lock.hidden=true;
  const contextAction=button('context','Bỏ qua giới thiệu','forward',shell,'rp-context-action rp-pill');contextAction.hidden=true;contextAction.setAttribute('aria-live','polite');
  const seekTip=doc.createElement('output');seekTip.className='rp-feedback-seek rp-pill';seekTip.hidden=true;shell.append(seekTip);
  const holdTip=doc.createElement('output');holdTip.className='rp-feedback-hold rp-pill';holdTip.hidden=true;holdTip.innerHTML='2x <span class="rp-chevrons">'+Array(3).fill(playerIcon('play')).join('')+'</span>';shell.append(holdTip);
  const chrome=doc.createElement('div');chrome.className='rp-player-chrome';shell.append(chrome);
  const loadReadout=doc.createElement('output');loadReadout.className='rp-load-readout';chrome.append(loadReadout);
  const buffering=doc.createElement('div');buffering.className='rp-buffering';buffering.hidden=true;buffering.setAttribute('role','status');buffering.setAttribute('aria-label','Đang tải phim');shell.append(buffering);
  const spinner=doc.createElement('span');spinner.className='rp-watch-spinner';spinner.setAttribute('aria-hidden','true');buffering.append(spinner);
  const loadingStats=doc.createElement('output');buffering.append(loadingStats);
  const timeline=doc.createElement('label');timeline.className='rp-player-timeline';chrome.append(timeline);
  const seek=doc.createElement('input');seek.type='range';seek.min='0';seek.max='1';seek.step='.1';seek.value='0';seek.setAttribute('aria-label','Tua phim');timeline.append(seek);
  const line=doc.createElement('div');line.className='rp-player-line';chrome.append(line);
  const play=button('play','Tạm dừng','pause',line),mute=button('mute','Tắt tiếng','volume',line);
  const time=doc.createElement('output');time.className='rp-player-time';line.append(time);
  const spacer=doc.createElement('span');spacer.className='rp-player-spacer';line.append(spacer);
  const next=button('next','Tập tiếp theo','next',line);next.setAttribute('aria-live','polite');
  const settingsButton=button('settings','Cài đặt','settings',line),fullscreen=button('fullscreen','Toàn màn hình','fullscreen',line);
  const settings=doc.createElement('section');settings.className='rp-player-settings';settings.setAttribute('aria-label','Cài đặt tốc độ');settings.hidden=true;shell.append(settings);
  const heading=doc.createElement('div');heading.className='rp-player-settings-header';heading.textContent='Tốc độ';settings.append(heading);button('settings','Đóng cài đặt','close',heading);
  const rates=doc.createElement('div');rates.className='rp-player-speed-options';settings.append(rates);
  for(const rate of [.75,1,1.25,1.5,2]){const node=doc.createElement('button');node.type='button';node.className='rp-speed';node.dataset.rpRate=String(rate);node.textContent=rate+'x';node.addEventListener('click',()=>{if(!locked){command('rate',rate);settings.hidden=true;show();update();}});rates.append(node);}
  const tracks=doc.createElement('div');tracks.className='rp-player-tracks';settings.append(tracks);let trackSignature='';
  const loadDetail=doc.createElement('div');loadDetail.className='rp-load-detail';settings.append(loadDetail);
  function updateTracks(){
    const groups=player.tracks?.() || {},signature=JSON.stringify(groups);
    if(signature===trackSignature)return;trackSignature=signature;tracks.replaceChildren();
    for(const [group,title] of Object.entries({quality:'Chất lượng',audio:'Âm thanh',captions:'Phụ đề'})){
      const items=groups[group];if(!Array.isArray(items) || !items.length || items.length>100)continue;
      const label=doc.createElement('div');label.className='rp-track-label';label.textContent=title;tracks.append(label);
      for(const item of items){
        if(!Number.isInteger(item.id) || typeof item.label!=='string')continue;
        const node=doc.createElement('button');node.type='button';node.className='rp-speed';node.dataset.rpTrack=group;node.dataset.rpTrackId=String(item.id);node.textContent=item.label.slice(0,100);node.setAttribute('aria-pressed',String(item.active===true));
        node.addEventListener('click',()=>{if(!locked && player.state().ready){if(player.selectTrack?.(group,item.id)){settings.hidden=true;show();update();}else report('Chưa đổi được tùy chọn phát.');}});tracks.append(node);
      }
    }
  }
  const error=doc.createElement('output');error.className='rp-player-error';error.setAttribute('role','status');error.hidden=true;shell.append(error);
  function report(text){error.textContent=text;error.hidden=false;win.clearTimeout(errorTimer);errorTimer=win.setTimeout(()=>error.hidden=true,5000);}
  function command(action,value){try{return !!player.command(action,value);}catch{report('Không điều khiển được video này.');return false;}}
  function inFullscreen(){return options.isFullscreen?.()===true || !!doc.fullscreenElement && (doc.fullscreenElement===root || doc.fullscreenElement.contains(root));}
  function restoreNative(){if(!nativeOwned)return;nativeOwned=false;delete nativeRoot.dataset.rpCustomControls;delete nativeRoot.dataset.rpNativeChrome;delete nativeRoot.dataset.rpNativeLocked;if(element)for(const [name,value] of savedAttributes){if(value===null)element.removeAttribute(name);else element.setAttribute(name,value);}}
  function applyChrome(){lockRecord.scope=fullscreenScope();lockRecord.locked=!!lockRecord.scope && locked;data(shell,'rpChrome',chromeVisible);data(shell,'rpLocked',locked);prop(lock,'hidden',!lastReady || !inFullscreen() || locked&&!lockVisible);if(nativeMode){const changed=nativeRoot.dataset.rpNativeChrome!==String(chromeVisible);data(nativeRoot,'rpNativeChrome',chromeVisible);data(nativeRoot,'rpNativeLocked',locked);if(changed && chromeVisible && !locked){const engine=root.querySelector('.jwplayer');engine?.classList.remove('jw-flag-user-inactive');engine?.dispatchEvent(new win.MouseEvent('mousemove',{bubbles:true}));}}}
  function show(){chromeVisible=true;win.clearTimeout(hideTimer);if(!locked && !player.state().paused && settings.hidden)hideTimer=win.setTimeout(()=>{if(!scrubbing && settings.hidden){chromeVisible=false;applyChrome();}},3000);applyChrome();}
  function revealLock(){lockVisible=true;win.clearTimeout(lockTimer);lockTimer=win.setTimeout(()=>{lockVisible=false;applyChrome();},2500);applyChrome();}
  function setLocked(value){if(value && !inFullscreen())return;cancelGestures();locked=value;settings.hidden=true;win.clearTimeout(lockTimer);if(value)revealLock();else show();update();}
  function cancelGestures(){(nativeMode?root:surface).dispatchEvent(new win.Event('pointercancel'));holdTip.hidden=true;}
  function actionClick(action,node){
    if(action==='play' && !player.state().ready && player.state().initializable){autoPlayAttempted=true;audio?.intent(false);command('initialize-play-audible');show();update();return;}
    if(!player.state().ready)return;
    switch(action){
      case 'play':autoPlayAttempted=true;if(player.state().paused)audio?.intent(false);command(player.state().paused?'play-audible':'pause');show();break;
      case 'mute':{const muted=!(player.audio?.().muted ?? video.muted);audio?.intent(muted);command('mute',muted);show();break;}
      case 'lock':setLocked(true);break;
      case 'settings':settings.hidden=!settings.hidden;show();break;
      case 'context':if(node.dataset.rpMode==='intro'){if(options.onIntro)options.onIntro();else command('seek',Math.min(introEnd(),player.state().duration));}else beginNext(node);break;
      case 'next':beginNext(node);break;
      case 'fullscreen':try{if(options.onFullscreen){const pending=options.onFullscreen();if(!pending)report('Chưa kết nối được khung phát.');else pending.then(status=>{if(!disposed && !['fullscreen','windowed'].includes(status))report('Không bật được toàn màn hình khung.');});}else{const result=inFullscreen()?doc.exitFullscreen?.():root.requestFullscreen?.();if(!result && !root.requestFullscreen)report('Trình duyệt chưa hỗ trợ toàn màn hình khung.');result?.catch(()=>report('Không bật được toàn màn hình khung.'));}}catch{report('Không bật được toàn màn hình khung.');}break;
    }
    update();
  }
  function finishNext(status){if(!nextPending)return;win.clearTimeout(nextTimer);nextError={node:nextPending.node,text:status==='missing'?'Chưa có tập cùng bản dịch':status==='timeout'?'Chưa nhận được phản hồi':'Không chuyển được tập'};nextPending=null;update();win.clearTimeout(errorTimer);errorTimer=win.setTimeout(()=>{nextError=null;update();},5000);}
  function beginNext(node){
    if(nextPending)return;nextError=null;settings.hidden=true;chromeVisible=true;win.clearTimeout(hideTimer);cancelGestures();
    nextPending={node,source:player.fingerprint?.(),key:context?.episodeID};update();
    const nextTimeout=Number.isFinite(options.nextTimeoutMs) && options.nextTimeoutMs>=15000 && options.nextTimeoutMs<=60000?options.nextTimeoutMs:nativeMode?45000:15000;
    nextTimer=win.setTimeout(()=>finishNext('timeout'),nextTimeout);
    const active=nextPending;
    try{const result=options.onNext?.();if(result===false || !options.onNext)finishNext('unavailable');else if(result?.then)result.then(status=>{if(disposed || nextPending!==active)return;if(status==='navigating')win.clearTimeout(nextTimer);else if(status)finishNext(status);},()=>{if(!disposed && nextPending===active)finishNext('error');});}catch{finishNext('error');}
  }
  const offGestures=installGestures(win,player,()=>{},{surface:nativeMode?undefined:surface,exclusive:true,isLocked:()=>locked,allowLockedMediaGestures:true,
    isInteractive:nativeMode?target=>!!target?.closest?.('.custom-control,.player-control,.item-btn,.player-dm,#player_top,#video_pop,#video_eps'):undefined,
    onLockedTap:()=>{if(lockVisible){lockVisible=false;win.clearTimeout(lockTimer);applyChrome();}else revealLock();},
    onTap:()=>{if(chromeVisible){chromeVisible=false;settings.hidden=true;win.clearTimeout(hideTimer);applyChrome();}else{show();update();}},
    onHoldChange:active=>{holdTip.hidden=!active;if(active){chromeVisible=false;applyChrome();}},
    onSeek:side=>{seekTip.style.left=side>0?'78%':'22%';seekTip.dataset.side=side>0?'right':'left';seekTip.innerHTML=side>0?'10s '+playerIcon('forward'):playerIcon('back')+' 10s';seekTip.hidden=false;win.clearTimeout(tipTimer);tipTimer=win.setTimeout(()=>seekTip.hidden=true,700);},
  });
  const block=event=>event.stopPropagation();
  const inputEvents=['pointerdown','pointermove','pointerup','touchstart','touchmove','touchend','touchcancel','mousedown','mouseup','click','dblclick','contextmenu','keydown','keyup'];
  for(const name of inputEvents)shell.addEventListener(name,block);
  seek.addEventListener('pointerdown',()=>{scrubbing=true;win.clearTimeout(hideTimer);});
  seek.addEventListener('input',()=>{scrubbing=true;paintTime(Number(seek.value),player.state().duration);});
  seek.addEventListener('change',()=>{if(!locked)command('seek',Number(seek.value));scrubbing=false;show();update();});
  const cancelScrub=()=>{scrubbing=false;update();};seek.addEventListener('pointercancel',cancelScrub);win.addEventListener('blur',cancelScrub);
  const releaseScrub=()=>{if(scrubbing){win.clearTimeout(scrubTimer);scrubTimer=win.setTimeout(()=>{if(!disposed){scrubbing=false;update();}},0);}};win.addEventListener('pointerup',releaseScrub);
  chrome.addEventListener('pointerdown',()=>win.clearTimeout(hideTimer));
  const fsChanged=()=>{if(!inFullscreen() && locked)setLocked(false);show();update();};doc.addEventListener('fullscreenchange',fsChanged);
  const changed=()=>update();const mediaEvents=['error','loadedmetadata','canplay','timeupdate','play','pause','ratechange','volumechange','durationchange','emptied','loadstart','waiting','stalled','playing','progress','seeking','seeked'];for(const name of mediaEvents)video.addEventListener(name,changed);
  // timeupdate stops during a stall. Keep a light heartbeat for the loading UI.
  const loadTimer=win.setInterval(()=>{if(!doc.hidden)update();},1000);
  const checkpointAudio=()=>{try{audio?.checkpoint(player.state(),!!context && options.canRestoreAudio?.()!==false);}catch{/* detached provider */}};win.addEventListener('pagehide',checkpointAudio);
  doc.addEventListener('visibilitychange',changed);
  const offPlayer=player.subscribe?.(changed);
  const lockedKey=event=>{if(locked && inFullscreen() && !event.ctrlKey && !event.metaKey && !event.altKey && [' ','k','j','l','m','f','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','<','>','0','1','2','3','4','5','6','7','8','9'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();}};
  win.addEventListener('keydown',lockedKey,true);win.addEventListener('keyup',lockedKey,true);
  const nativeObserver=new win.MutationObserver(()=>{if(nativeOwned && element?.controls)element.controls=false;});if(element)nativeObserver.observe(element,{attributes:true,attributeFilter:['controls']});
  const introEnd=()=>{const value=options.introSeconds?.() ?? 90;return Number.isFinite(value) && value>=0 && value<=300?value:90;};
  function format(value){const seconds=Math.max(0,Math.floor(Number(value)||0));return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
  function paintTime(position,duration){text(time,format(position)+' / '+format(duration));const value=(duration>0?100*position/duration:0)+'%';if(seek.style.getPropertyValue('--rp-played')!==value)seek.style.setProperty('--rp-played',value);}
  function update(){
    if(disposed)return;const state=player.state(),becameReady=state.ready&&!lastReady;lastReady=state.ready;prop(shell,'hidden',!state.ready&&!state.initializable);
    const metrics=validLoadMetrics(state.load)?state.load:null,loading=!!metrics && state.ready && !state.ad && ['loading','buffering'].includes(metrics.status) && !state.paused && !state.ended;
    const loadText=loadMetricsText(metrics);text(loadReadout,loadText);prop(loadReadout,'hidden',!metrics || loading);
    prop(buffering,'hidden',!loading);text(loadingStats,loadText);data(shell,'rpBuffering',loading);
    const hint=!metrics?'Nguồn chưa cung cấp thông số tải.':!metrics.online?'Thiết bị đang ngoại tuyến.':metrics.status==='error'?'Nguồn phát hoặc giải mã gặp lỗi.':metrics.status==='buffering'?'Đang chờ dữ liệu; chưa đủ bằng chứng kết luận do mạng hay máy chủ.':metrics.bytesPerSecond===null?'Không đo được tốc độ tải của nguồn này; — không có nghĩa là mạng ngừng.':'Tốc độ nhận dữ liệu phim trong các lượt tải gần đây. Engine có thể tạm nghỉ khi đã đủ bộ đệm.';
    text(loadDetail,hint+(metrics?' '+(metrics.bufferPolicy==='expanded'?'Đã mở rộng tải trước có giới hạn.':metrics.bufferPolicy==='limited'?'Giữ giới hạn tải để bảo vệ phát phim.':'Bộ đệm do engine quản lý.'):''));
    if(!trackSignature || !settings.hidden)updateTracks();for(const node of tracks.querySelectorAll('button'))prop(node,'disabled',!state.ready || locked);
    if(locked && !inFullscreen()){cancelGestures();locked=false;settings.hidden=true;win.clearTimeout(lockTimer);show();}
    if(!state.ready){cancelGestures();scrubbing=false;settings.hidden=true;nextPending=null;nextError=null;win.clearTimeout(nextTimer);}
    // Readiness controls OUR UI, never whether the original controls return.
    nativeOwned=true;if(!nativeMode)data(nativeRoot,'rpCustomControls','1');if(element){if(element.controls)element.controls=false;attr(element,'playsinline','');attr(element,'webkit-playsinline','');}
    if(becameReady || lastPaused!==null && state.paused!==lastPaused)show();lastPaused=state.paused;
    for(const node of [center,play,mute,fullscreen,settingsButton,seek,...rates.children])prop(node,'disabled',!state.ready||locked);
    if(state.initializable&&!locked){center.disabled=false;play.disabled=false;}
    for(const node of [center,play]){icon(node,state.paused?'play':'pause');attr(node,'aria-label',state.paused?'Phát':'Tạm dừng');}
    const muted=player.audio?.().muted ?? video.muted;icon(mute,muted?'muted':'volume');attr(mute,'aria-label',muted?'Bật tiếng':'Tắt tiếng');if(nativeMode)for(const node of root.querySelectorAll('.btn-muted')){node.classList.toggle('fa-volume-mute',muted);node.classList.toggle('fa-volume-high',!muted);attr(node,'aria-label',muted?'Bật tiếng':'Tắt tiếng');}
    const full=inFullscreen();icon(fullscreen,full?'shrink':'fullscreen');attr(fullscreen,'aria-label',full?'Thu nhỏ':'Toàn màn hình');
    icon(lock,locked?'lock':'unlock');attr(lock,'aria-label',locked?'Mở khóa màn hình':'Khóa màn hình');
    if(!scrubbing && (chromeVisible&&!locked || state.paused)){prop(seek,'max',String(Math.max(1,state.duration)));prop(seek,'value',String(state.time));paintTime(state.time,state.duration);}
    for(const node of rates.children)attr(node,'aria-pressed',Number(node.dataset.rpRate)===state.rate);
    const intro=state.ready && state.time<introEnd()-5 && state.duration>=600,nearEnd=state.ready && state.duration-state.time<=180;
    data(contextAction,'rpMode',(nextPending?.node===contextAction || nextError?.node===contextAction)?'next':intro?'intro':'next');
    prop(contextAction,'hidden',(!intro && !context) || !(intro || nearEnd || nextPending?.node===contextAction || nextError?.node===contextAction));
    data(line,'rpNextStatus',nextPending?.node===next || nextError?.node===next);
    for(const node of [contextAction,next]){
      data(node,'rpStatus',nextPending?.node===node || nextError?.node===node);
      prop(node,'disabled',!state.ready||locked&&node!==contextAction||(!context && !(node===contextAction && intro))||!!nextPending);attr(node,'aria-busy',nextPending?.node===node);
      if(nextPending?.node===node)buttonText(node,'Đang chuyển tập…');else if(nextError?.node===node)buttonText(node,nextError.text);
      else if(node===contextAction)content(node,'context:'+intro,()=>{node.innerHTML=(intro?'Bỏ qua giới thiệu':'Tập tiếp theo')+' '+playerIcon(intro?'forward':'next');});else icon(node,'next');
    }
    applyChrome();
    // Start only the parent's validated selected episode, once it can play.
    // One attempt per attached resource: never undo a deliberate pause or loop
    // on Firefox autoplay rejection. A blocked attempt leaves Play visible.
    if(options.autoPlay && options.canAutoPlay?.()!==false && context && !autoPlayAttempted && state.ready && video.readyState>=3 && !doc.hidden){
      autoPlayAttempted=true;
      if(state.paused && !state.played && !state.ended)command('play');
    }
    audio?.update(state,!!context && options.canRestoreAudio?.()!==false);
  }
  if(win.getComputedStyle(root).position==='static'){root.style.position='relative';positioned=true;}
  const nativeClick=event=>{
    if(!nativeMode || !player.state().ready)return;
    const playButton=event.target.closest?.('.jw-btn-play,.jw-icon-playback,.jw-display-icon-display,.item-play,.item-pause');
    const muteButton=event.target.closest?.('.btn-muted,.jw-icon-volume');
    if(!playButton && !muteButton)return;
    event.preventDefault();event.stopImmediatePropagation();if(!locked)actionClick(playButton?'play':'mute',playButton?play:mute);
  };
  const nativeVolume=event=>{
    if(!nativeMode || locked || !event.target.closest?.('#volume,.jw-slider-volume'))return;
    win.queueMicrotask(()=>{if(disposed || locked || !player.state().ready)return;const value=player.audio?.() || {};audio?.intent(value.muted===true || value.volume===0);update();});
  };
  if(nativeMode){center.remove();chrome.remove();settings.remove();surface.remove();root.addEventListener('click',nativeClick,true);root.addEventListener('click',nativeVolume,true);root.addEventListener('pointerup',nativeVolume,true);}
  root.append(shell);update();if(locked)revealLock();
  return {shell,surface,update,setContext(value){const key=c=>c ? [c.url,c.episodeID,c.lane,c.server].join('|') : '';const oldKey=key(context);context=value;if(oldKey && oldKey!==key(value)){nextPending=null;nextError=null;win.clearTimeout(nextTimer);cancelGestures();settings.hidden=true;if(!inFullscreen())setLocked(false);}update();},
    requestResult(status){if(status!=='navigating')finishNext(status);},
    dispose(){if(disposed)return;checkpointAudio();disposed=true;win.clearInterval(loadTimer);root.removeEventListener('click',nativeClick,true);root.removeEventListener('click',nativeVolume,true);root.removeEventListener('pointerup',nativeVolume,true);offGestures();offPlayer?.();nativeObserver.disconnect();for(const timer of [hideTimer,lockTimer,tipTimer,errorTimer,nextTimer,scrubTimer])win.clearTimeout(timer);for(const name of mediaEvents)video.removeEventListener(name,changed);for(const name of inputEvents)shell.removeEventListener(name,block);doc.removeEventListener('fullscreenchange',fsChanged);doc.removeEventListener('visibilitychange',changed);win.removeEventListener('blur',cancelScrub);win.removeEventListener('pointerup',releaseScrub);win.removeEventListener('keydown',lockedKey,true);win.removeEventListener('keyup',lockedKey,true);win.removeEventListener('pagehide',checkpointAudio);restoreNative();if(positioned)root.style.position=originalPosition;shell.remove();},
  };
}
