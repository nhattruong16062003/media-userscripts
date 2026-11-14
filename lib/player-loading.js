import {playerUIStyle} from './player-ui.js';

// Loading, slow loading and failure all stay inside our UI. None of these
// states falls back to native controls or changes the provider's media source.
export function loadingPanel(win,host,{fixed=false,onRetry=()=>{}}={}){
  playerUIStyle(win.document);
  const node=win.document.createElement('div');node.dataset.rpUi='player-loading';node.className='rp-watch-loading'+(fixed?' rp-loading-fixed':'');node.setAttribute('role','status');
  const spinner=win.document.createElement('span');spinner.className='rp-watch-spinner';spinner.setAttribute('aria-hidden','true');node.append(spinner);
  const message=win.document.createElement('span');message.className='rp-loading-message';message.textContent='Đang tải phim';message.hidden=true;node.append(message);
  const retry=win.document.createElement('button');retry.type='button';retry.className='rp-loading-retry';retry.textContent='Thử lại';retry.hidden=true;retry.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(!disposed){waiting();onRetry();}});node.append(retry);
  let timer=0,disposed=false;
  function waiting(){win.clearTimeout(timer);spinner.hidden=false;message.hidden=true;retry.hidden=true;node.dataset.rpLoading='waiting';node.setAttribute('aria-label','Đang tải phim');timer=win.setTimeout(()=>{if(!disposed){node.dataset.rpLoading='slow';message.textContent='Đang chờ trình phát';message.hidden=false;retry.hidden=false;}},20000);}
  function fail(text='Chưa tải được phim'){if(disposed)return;win.clearTimeout(timer);node.dataset.rpLoading='error';node.setAttribute('aria-label',text);spinner.hidden=true;message.textContent=text;message.hidden=false;retry.hidden=false;}
  host.append(node);waiting();
  return {node,fail,dispose(){disposed=true;win.clearTimeout(timer);node.remove();}};
}

export function childLoading(win){
  const doc=win.document;let panel=null,disposed=false;
  const pending=()=>{if(!disposed && !panel)panel=loadingPanel(win,doc.documentElement,{fixed:true,onRetry:()=>win.location.reload()});};
  const error=event=>{if(event.target?.tagName==='VIDEO'){pending();panel?.fail();}};
  const waiting=event=>{if(event.target?.tagName==='VIDEO')pending();};
  doc.addEventListener('error',error,true);doc.addEventListener('loadstart',waiting,true);doc.addEventListener('emptied',waiting,true);pending();
  return {update(ready){if(disposed)return;if(ready){panel?.dispose();panel=null;}else pending();},dispose(){disposed=true;panel?.dispose();panel=null;doc.removeEventListener('error',error,true);doc.removeEventListener('loadstart',waiting,true);doc.removeEventListener('emptied',waiting,true);}};
}

// This guard is installed before the site descriptor/RSC arrives. CSS masks
// the iframe in the first render, while the observer supplies our loading UI.
export function frameLoading(win){
  const doc=win.document,selector='.player-ratio iframe#embed-player,iframe#player.player-iframe',records=new Map();let disposed=false;
  playerUIStyle(doc);doc.documentElement.dataset.rpFrameGuard='1';
  function prepare(frame,force=false){
    if(disposed || !frame?.isConnected)return null;
    let record=records.get(frame);
    if(!record){record={src:null,panel:null,awaitingLoad:false,loaded:()=>{prepare(frame,true);record.awaitingLoad=false;}};records.set(frame,record);frame.addEventListener('load',record.loaded);}
    if(force || record.src!==frame.src || record.host!==frame.parentElement){
      if(record.src!==null && record.src!==frame.src)record.awaitingLoad=true;
      record.src=frame.src;frame.dataset.rpDisplay='loading';record.panel?.dispose();
      const host=frame.parentElement;record.host=host;host.dataset.rpFrameHost='1';
      record.panel=loadingPanel(win,host,{onRetry:()=>{if(!frame.isConnected)return;record.awaitingLoad=true;prepare(frame,true);frame.src=record.src;}});
    }
    return record;
  }
  function scan(){
    for(const frame of doc.querySelectorAll(selector))prepare(frame);
    for(const [frame,record] of records)if(!frame.isConnected){record.panel?.dispose();frame.removeEventListener('load',record.loaded);records.delete(frame);}
  }
  const observer=new win.MutationObserver(scan);observer.observe(doc,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});scan();
  return {
    begin(frame){const record=prepare(frame,true);if(record)record.awaitingLoad=true;},
    update(info){
      const frame=info.site?.frame,record=prepare(frame);if(!record)return;
      if(!record.awaitingLoad && info.controlsReady===true && info.state?.ready && !info.state.ad && info.context && info.media && record.src===frame.src){frame.dataset.rpDisplay='custom';record.panel?.dispose();record.panel=null;}
      else if(frame.dataset.rpDisplay==='custom')prepare(frame,true);
      if(info.state?.failed===true)record.panel?.fail();
    },
    dispose(){disposed=true;observer.disconnect();for(const [frame,record] of records){record.panel?.dispose();frame.removeEventListener('load',record.loaded);delete frame.dataset.rpDisplay;}records.clear();delete doc.documentElement.dataset.rpFrameGuard;},
  };
}
