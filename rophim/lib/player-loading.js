import {playerUIStyle} from './player-ui.js';
import {loadingPanel} from '../../shared/player/loading.js';
export {loadingPanel,childLoading} from '../../shared/player/loading.js';

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
