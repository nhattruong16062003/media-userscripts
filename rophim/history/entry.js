import {storageAPI,isSiteOrigin,watchDOM,FRAME_ORIGINS,isFrameURL,safeURL} from '../lib/core.js';
import {runFamily} from '../../shared/bridge/ownership.js';
import {laneKey} from '../lib/identity.js';
import {contextKey} from '../lib/sites.js';
import {createBridge} from '../lib/bridge.js';
import {createHistoryStore,historyRow} from '../lib/history.js';
import {historyDestination} from '../lib/history-navigation.js';
import {makeButton,toast} from '../lib/ui.js';
import {historyPlacement,placeHistory} from '../lib/history-layout.js';
import {historyUIStyle,historyCard,historyIcon,historyArtwork,loadHistoryArtwork} from '../lib/history-ui.js';

function startHistory(win,page) {
  const doc=win.document,top=win.parent===win,db=createHistoryStore(storageAPI(win));
  let active=null,progress=null,media='',savedAt=0,lastKey='',bar=null,resume=null,panel=null,bridge=null,snapshot=null,continuing=null,cardSignature='',savedSignature='';
  const artworkRequests=new Set();let stopped=false;
  const format=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  function showList(){
    if(panel){const opened=panel;panel=null;opened.close?.();opened.remove();return;}
    historyUIStyle(doc);
    const dialog=doc.createElement('dialog');panel=dialog;dialog.dataset.rpUi='history-list';dialog.className='rp-history-dialog';dialog.setAttribute('aria-label','Lịch sử xem');
    const heading=doc.createElement('div');heading.className='rp-history-heading';const title=doc.createElement('h2');title.textContent='Lịch sử xem';heading.append(title);dialog.append(heading);
    const close=makeButton(doc,'',()=>{dialog.close?.();dialog.remove();if(panel===dialog)panel=null;},heading);close.className='rp-dialog-close';close.innerHTML=historyIcon('close');close.setAttribute('aria-label','Đóng lịch sử');
    const cards=doc.createElement('div');cards.className='rp-history-cards';dialog.append(cards);
    const rows=db.list().slice(0,300);
    if(!rows.length)emptyHistory(dialog,'Lịch sử xem của bạn sẽ xuất hiện ở đây.');
    for(const row of rows)cards.append(historyCard(doc,row,{onContinue:navigate,onRemove:(value,card)=>{db.remove(value);if(contextKey(active)===contextKey(value)){snapshot=null;if(resume)resume.hidden=true;}card.remove();cardSignature='';home();if(!cards.children.length)emptyHistory(dialog,'Bạn chưa có phim trong lịch sử.');}}));
    dialog.addEventListener('close',()=>{dialog.remove();if(panel===dialog)panel=null;});
    dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left || event.clientX>box.right || event.clientY<box.top || event.clientY>box.bottom)close.click();}});
    doc.body.append(dialog);if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  }
  function emptyHistory(host,text){const empty=doc.createElement('div');empty.className='rp-history-empty';empty.innerHTML=historyIcon('history');const label=doc.createElement('p');label.textContent=text;empty.append(label);host.append(empty);}
  function ensureUI(){
    if(!doc.body || bar)return;
    historyUIStyle(doc);bar=doc.createElement('div');bar.dataset.rpUi='history';bar.className='rp-history-toolbar';
    resume=makeButton(doc,'Tiếp tục',()=>{if(snapshot && bridge?.state()?.ready && snapshot.time<bridge.state().duration-5){if(bridge.command('seek',snapshot.time)){snapshot=null;resume.hidden=true;}}},bar);resume.className='rp-resume-prompt';resume.hidden=true;
    const all=makeButton(doc,'',showList,bar);all.className='rp-history-all';all.innerHTML=historyIcon('history')+'<span>Lịch sử</span>';
  }
  function persist(){
    if(!top || !active || !progress || !media)return;
    const row=historyRow(active,progress);
    const signature=row?[contextKey(row),Math.floor(row.time),row.completed].join('|'):'';
    if(row && signature!==savedSignature){try{db.save(row);savedSignature=signature;}catch{if(bar)toast(bar,'Không lưu được lịch sử: kiểm tra quyền userscript');}}
    savedAt=Date.now();
  }
  async function navigate(row,host,trigger){
    if(host.dataset.rpNavigating)return;
    host.dataset.rpNavigating='1';
    const buttons=[...host.querySelectorAll('button')];for(const button of buttons)button.disabled=true;
    const original=trigger?.innerHTML;if(trigger){trigger.textContent='Đang mở…';trigger.setAttribute('aria-busy','true');}
    const status=text=>{let node=host.querySelector('.rp-card-status');if(!node){node=doc.createElement('p');node.className='rp-card-status';node.setAttribute('role','status');host.append(node);}node.textContent=text;};
    const href=win.location.href;
    try{
      const destination=await historyDestination(row,win);
      if(win.location.href!==href)return;
      if(!destination){status('Chưa tìm thấy bản phim này trên trang hiện tại. Dùng biểu tượng mở trang đã xem trên ảnh bìa.');return;}
      if(destination.source==='legacy-panels')doc.cookie=`selectedVidTypeRophim=${laneKey(destination.lane)==='voiceover'?'tm':'vs'}; path=/; SameSite=Lax`;
      win.location.assign(destination.url);
    }catch{status('Chưa mở được phim. Bạn có thể thử lại.');}finally{delete host.dataset.rpNavigating;for(const button of buttons)button.disabled=false;if(trigger){trigger.innerHTML=original;trigger.removeAttribute('aria-busy');}}
  }
  function home(){
    if(!top || !isSiteOrigin(win.location.origin) || !doc.body)return;
    ensureUI();
    const watch=win.location.pathname.startsWith('/xem-phim/'),placement=historyPlacement(doc,watch);
    if(watch){if(continuing)continuing.remove();if(placement)placeHistory(bar,placement);else bar.remove();return;}
    bar.remove();
    if(!placement){continuing?.remove();return;}
    if(!continuing){continuing=doc.createElement('section');continuing.dataset.rpUi='continue';continuing.className='rp-history-section';continuing.setAttribute('aria-label','Đang xem');}
    if(!continuing.isConnected)cardSignature='';placeHistory(continuing,placement);
    const rows=db.continuing().slice(0,24),signature=JSON.stringify(rows.map(r=>[contextKey(r),r.time,r.updated,r.poster]));
    if(signature===cardSignature)return;cardSignature=signature;continuing.replaceChildren();
    const heading=doc.createElement('div');heading.className='rp-history-heading';const title=doc.createElement('h2');title.textContent='Đang xem';heading.append(title);continuing.append(heading);
    const all=makeButton(doc,'',showList,heading);all.className='rp-history-all';all.innerHTML='<span>Lịch sử</span>'+historyIcon('arrow');all.setAttribute('aria-label','Mở lịch sử xem');
    if(!rows.length){emptyHistory(continuing,'Phim đang xem sẽ xuất hiện ở đây.');return;}
    const cards=doc.createElement('div');cards.className='rp-history-cards';continuing.append(cards);
    for(const row of rows){
      cards.append(historyCard(doc,row,{onContinue:navigate}));
      const key=contextKey(row);
      if(!historyArtwork(row,doc) && !artworkRequests.has(key) && artworkRequests.size<4 && typeof win.fetch==='function'){
        artworkRequests.add(key);
        loadHistoryArtwork(row,win).then(poster=>{if(stopped || !poster)return;const current=db.read(row);if(current && current.updated===row.updated){try{db.save({...current,poster});cardSignature='';home();}catch{/* Poster enrichment must not affect saved playback. */}}});
      }
    }
  }
  bridge=createBridge(win,page,'history',{
    update(info){
      if(!top)return;
      const nextKey=contextKey(info.context);
      // Flush the immutable old context/progress pair before accepting a new one.
      if(nextKey!==lastKey){persist();lastKey=nextKey;snapshot=info.context ? db.read(info.context) : null;active=info.context;progress=null;media='';savedAt=0;savedSignature='';}
      else active=info.context;
      progress=info.state;media=info.media;
      if(active){ensureUI();bar.hidden=false;placeHistory(bar,historyPlacement(doc,true));}else if(bar)bar.hidden=win.location.pathname.startsWith('/xem-phim/');
      const compatible=snapshot && info.state?.ready && Math.abs(snapshot.duration-info.state.duration)<=Math.max(5,snapshot.duration*.02);
      if(resume){resume.hidden=!(compatible && snapshot.time>=5 && !snapshot.completed && snapshot.time<info.state.duration-5);resume.textContent=snapshot?`Tiếp tục ${format(snapshot.time)}`:'Tiếp tục';}
      if(snapshot && info.state?.ready && !compatible && bar)toast(bar,'Có lịch sử đã lưu, nhưng bản phim này khác thời lượng nên chưa thể tua đúng mốc.');
      if(Date.now()-savedAt>=5000)persist();
    },
  });
  let offHome=()=>{},homeTimer=0;
  if(top && isSiteOrigin(win.location.origin)){doc.addEventListener('visibilitychange',()=>{if(doc.hidden)persist();else home();});win.addEventListener('pagehide',persist);offHome=watchDOM(win,home);homeTimer=win.setInterval(home,3000);home();}
  win.addEventListener('pagehide',event=>{if(!event.persisted){stopped=true;bridge.dispose();offHome();win.clearInterval(homeTimer);}});
}
runFamily(window,{family:'rophim',feature:'history',isSiteURL:isSiteOrigin,isFrameURL,isFrameOrigin:value=>FRAME_ORIGINS.has(safeURL(value)?.origin)},()=>startHistory(window,typeof unsafeWindow==='undefined' ? window : unsafeWindow));
