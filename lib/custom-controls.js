import {uiStyle,makeButton,toast} from './ui.js';
import {installGestures} from './gestures.js';

export function customPlayerControls(win,player,tools) {
  const {video,root}=player,doc=win.document;
  uiStyle(doc);
  const shell=doc.createElement('div');shell.dataset.rpUi='player';shell.className='rp-player-shell';
  const surface=doc.createElement('div');surface.dataset.rpGestureSurface='1';surface.className='rp-gesture-surface';surface.setAttribute('aria-label','Vùng thao tác trình phát RoPhim');shell.append(surface);
  const chrome=doc.createElement('div');chrome.className='rp-player-chrome';shell.append(chrome);
  const line=doc.createElement('div');line.className='rp-player-line';chrome.append(line);
  const play=makeButton(doc,'Phát',()=>player.command(player.state().paused?'play':'pause'),line);
  const time=doc.createElement('output');time.className='rp-player-time';line.append(time);
  const seek=doc.createElement('input');seek.type='range';seek.min='0';seek.max='1000';seek.step='1';seek.value='0';seek.setAttribute('aria-label','Tua phim');chrome.append(seek);
  let locked=false,hideTimer=0,scrubbing=false,disposed=false,nativeOwned=false,lastReady=false;
  const savedAttributes=new Map(['controls','playsinline','webkit-playsinline'].map(name=>[name,video.getAttribute(name)]));
  const restoreNative=()=>{
    if(!nativeOwned)return;nativeOwned=false;delete root.dataset.rpCustomControls;
    for(const [name,value] of savedAttributes){if(value===null)video.removeAttribute(name);else video.setAttribute(name,value);}
  };
  const lock=makeButton(doc,'Khóa',()=>setLocked(true),line);
  const fullscreen=makeButton(doc,'Toàn màn hình',async()=>{
    try{if(doc.fullscreenElement)await doc.exitFullscreen();else if(root.requestFullscreen)await root.requestFullscreen();else toast(shell,'Trình duyệt chưa hỗ trợ toàn màn hình khung');}
    catch{toast(shell,'Không bật được toàn màn hình khung');}
  },line);
  const unlock=makeButton(doc,'Mở khóa',()=>setLocked(false),shell);unlock.className='rp-unlock';unlock.hidden=true;
  const show=()=>{chrome.hidden=locked;tools.host.hidden=locked;win.clearTimeout(hideTimer);if(!locked && !player.state().paused && !tools.host.open)hideTimer=win.setTimeout(()=>{if(!scrubbing && !tools.host.open){chrome.hidden=true;tools.host.hidden=true;}},3500);};
  function setLocked(value){locked=value;shell.dataset.rpLocked=String(value);unlock.hidden=!value;offGesturesCancel();show();update();}
  let offGestures=()=>{},offGesturesCancel=()=>{};
  offGestures=installGestures(win,player,text=>toast(shell,text),{surface,exclusive:true,isLocked:()=>locked,onTap:()=>{if(chrome.hidden)show();else{chrome.hidden=true;tools.host.hidden=true;}}});
  // A lock action cancels an ongoing hold through the same cancellation path.
  offGesturesCancel=()=>surface.dispatchEvent(new win.Event('pointercancel',{bubbles:false}));
  const block=e=>e.stopPropagation();
  const inputEvents=['pointerdown','pointermove','pointerup','touchstart','touchmove','touchend','touchcancel','mousedown','mouseup','click','dblclick','contextmenu','keydown','keyup'];
  for(const node of [shell,tools.host])for(const name of inputEvents)node.addEventListener(name,block);
  seek.addEventListener('pointerdown',()=>{scrubbing=true;win.clearTimeout(hideTimer);});
  seek.addEventListener('input',()=>{scrubbing=true;time.textContent=format(Number(seek.value))+' / '+format(player.state().duration);});
  seek.addEventListener('change',()=>{if(!locked)player.command('seek',Number(seek.value));scrubbing=false;show();});
  seek.addEventListener('pointercancel',()=>{scrubbing=false;show();});
  chrome.addEventListener('pointerdown',()=>{win.clearTimeout(hideTimer);});
  const changed=()=>update();
  for(const name of ['loadedmetadata','timeupdate','play','pause','ratechange','durationchange','emptied','loadstart'])video.addEventListener(name,changed);
  const nativeObserver=new win.MutationObserver(()=>{if(nativeOwned && video.controls)video.controls=false;});nativeObserver.observe(video,{attributes:true,attributeFilter:['controls']});
  function format(value){const seconds=Math.max(0,Math.floor(Number(value)||0));return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
  function update(){
    if(disposed)return;const state=player.state();
    surface.hidden=!state.ready;
    if(!state.ready){chrome.hidden=true;tools.host.hidden=true;}
    else if(!lastReady)show();
    lastReady=state.ready;
    if(state.ready){nativeOwned=true;root.dataset.rpCustomControls='1';if(video.controls)video.controls=false;video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');}
    else restoreNative();
    for(const b of [play,lock,fullscreen,seek])b.disabled=!state.ready || locked;
    play.textContent=state.paused?'Phát':'Dừng';
    if(!scrubbing){seek.max=String(Math.max(1,state.duration));seek.value=String(state.time);time.textContent=format(state.time)+' / '+format(state.duration)+' · '+state.rate+'×';}
    if(state.ready && state.paused && !locked){chrome.hidden=false;tools.host.hidden=false;}
  }
  if(win.getComputedStyle(root).position==='static')root.style.position='relative';
  root.append(shell);update();show();
  return {shell,surface,update,dispose(){if(disposed)return;disposed=true;win.clearTimeout(hideTimer);offGestures();nativeObserver.disconnect();for(const name of ['loadedmetadata','timeupdate','play','pause','ratechange','durationchange','emptied','loadstart'])video.removeEventListener(name,changed);for(const node of [shell,tools.host])for(const name of inputEvents)node.removeEventListener(name,block);restoreNative();shell.remove();}};
}
