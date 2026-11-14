import {finite} from './core.js';

export function installGestures(win, player, notify = () => {}) {
  const {root,video}=player;
  const interactive = target => !!target?.closest?.('[data-rp-ui],a,button,input,select,textarea,[contenteditable="true"],[role="slider"],[role="button"],.jw-controlbar,.jw-settings-menu,.jw-rightclick,.art-controls,.art-settings,.art-contextmenus');
  let press=null, lastTap=null, holdTimer=0, suppressUntil=0;
  const source=()=>video.currentSrc || video.src;
  function restore() {
    win.clearTimeout(holdTimer);holdTimer=0;
    if (press?.held && video.isConnected && press.source === source() && video.playbackRate === 2) {
      // Restore the rate captured at press time, never assume it was 1×.
      try { player.command('rate',press.rate); } catch { /* replaced player */ }
    }
    press=null;
  }
  function cancel() {restore();lastTap=null;}
  const point = event => {
    const box=video.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0 || event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom - 60) return null;
    const ratio=(event.clientX-box.left)/box.width;
    return ratio < .4 ? -1 : ratio > .6 ? 1 : 0;
  };
  const down = e => {
    if (e.isPrimary === false) {cancel();return;}
    if (interactive(e.target) || e.button !== 0 || !player.state().ready) return;
    const side=point(e);if (side === null) return;
    restore();press={id:e.pointerId,x:e.clientX,y:e.clientY,side,at:Date.now(),source:source(),rate:player.state().rate,held:false};
    holdTimer=win.setTimeout(()=>{
      if (!press || !player.state().ready || source()!==press.source) return cancel();
      if(player.command('rate',2)){press.held=true;lastTap=null;notify('Giữ 2×');}
    },450);
  };
  const move = e => {if(press && (e.pointerId!==press.id || Math.hypot(e.clientX-press.x,e.clientY-press.y)>14)) cancel();};
  const up = e => {
    if(!press || e.pointerId!==press.id)return;
    const p=press, now=Date.now();restore();
    if(p.held){suppressUntil=now+400;notify('Đã khôi phục tốc độ');e.preventDefault();e.stopImmediatePropagation();return;}
    if(now-p.at>350 || !p.side || source()!==p.source || !player.state().ready)return;
    if(lastTap && now-lastTap.at<320 && p.side===lastTap.side && Math.hypot(p.x-lastTap.x,p.y-lastTap.y)<48){
      player.command('seek',player.state().time+p.side*10);lastTap=null;suppressUntil=now+400;notify(p.side>0?'+10 giây':'−10 giây');e.preventDefault();e.stopImmediatePropagation();
    } else lastTap={...p,at:now};
  };
  const click = e => {if(Date.now()<suppressUntil && !interactive(e.target)){e.preventDefault();e.stopImmediatePropagation();}};
  const menu = e => {if(press?.held){e.preventDefault();e.stopImmediatePropagation();}};
  const visibility = () => {if(win.document.hidden)cancel();};
  for(const [name,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['lostpointercapture',cancel],['click',click],['dblclick',click],['contextmenu',menu]]) root.addEventListener(name,fn,true);
  win.addEventListener('blur',cancel);win.addEventListener('pointerup',up,true);win.document.addEventListener('visibilitychange',visibility);
  video.addEventListener('emptied',cancel);video.addEventListener('loadstart',cancel);
  return () => {cancel();for(const [name,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['lostpointercapture',cancel],['click',click],['dblclick',click],['contextmenu',menu]])root.removeEventListener(name,fn,true);win.removeEventListener('blur',cancel);win.removeEventListener('pointerup',up,true);win.document.removeEventListener('visibilitychange',visibility);video.removeEventListener('emptied',cancel);video.removeEventListener('loadstart',cancel);};
}
