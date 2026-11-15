import {playerUIStyle} from './player-ui.js';
import {loadMetricsText,validLoadMetrics} from './buffering.js';

// Loading, slow loading and failure all stay inside our UI. None of these
// states falls back to native controls or changes the provider's media source.
export function loadingPanel(win,host,{fixed=false,onRetry=()=>{}}={}){
  playerUIStyle(win.document);
  const node=win.document.createElement('div');node.dataset.rpUi='player-loading';node.className='rp-watch-loading'+(fixed?' rp-loading-fixed':'');node.setAttribute('role','status');
  const spinner=win.document.createElement('span');spinner.className='rp-watch-spinner';spinner.setAttribute('aria-hidden','true');node.append(spinner);
  const message=win.document.createElement('span');message.className='rp-loading-message';message.textContent='Đang tải phim';message.hidden=true;node.append(message);
  const stats=win.document.createElement('output');stats.className='rp-loading-stats';stats.hidden=true;node.append(stats);
  const retry=win.document.createElement('button');retry.type='button';retry.className='rp-loading-retry';retry.textContent='Thử lại';retry.hidden=true;retry.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(!disposed){waiting();onRetry();}});node.append(retry);
  let timer=0,disposed=false;
  function waiting(){win.clearTimeout(timer);spinner.hidden=false;message.hidden=true;retry.hidden=true;node.dataset.rpLoading='waiting';node.setAttribute('aria-label','Đang tải phim');timer=win.setTimeout(()=>{if(!disposed){node.dataset.rpLoading='slow';message.textContent='Đang chờ trình phát';message.hidden=false;retry.hidden=false;}},20000);}
  function fail(text='Chưa tải được phim'){if(disposed)return;win.clearTimeout(timer);node.dataset.rpLoading='error';node.setAttribute('aria-label',text);spinner.hidden=true;message.textContent=text;message.hidden=false;retry.hidden=false;}
  host.append(node);waiting();
  return {node,fail,update(metrics){stats.hidden=!validLoadMetrics(metrics);stats.textContent=loadMetricsText(metrics);},dispose(){disposed=true;win.clearTimeout(timer);node.remove();}};
}

export function childLoading(win){
  const doc=win.document;let panel=null,disposed=false;
  const pending=()=>{if(!disposed && !panel)panel=loadingPanel(win,doc.documentElement,{fixed:true,onRetry:()=>win.location.reload()});};
  const error=event=>{if(event.target?.tagName==='VIDEO'){pending();panel?.fail();}};
  const waiting=event=>{if(event.target?.tagName==='VIDEO')pending();};
  doc.addEventListener('error',error,true);doc.addEventListener('loadstart',waiting,true);doc.addEventListener('emptied',waiting,true);pending();
  return {update(ready,metrics){if(disposed)return;if(ready){panel?.dispose();panel=null;}else{pending();panel?.update(metrics);}},dispose(){disposed=true;panel?.dispose();panel=null;doc.removeEventListener('error',error,true);doc.removeEventListener('loadstart',waiting,true);doc.removeEventListener('emptied',waiting,true);}};
}
