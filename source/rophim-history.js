import {storageAPI,isSiteOrigin,watchDOM} from '../lib/core.js';
import {laneKey} from '../lib/identity.js';
import {contextKey} from '../lib/sites.js';
import {createBridge} from '../lib/bridge.js';
import {createHistoryStore,historyRow} from '../lib/history.js';
import {historyDestination} from '../lib/history-navigation.js';
import {uiStyle,makeButton,toast} from '../lib/ui.js';

function startHistory(win,page) {
  const doc=win.document,top=win.parent===win,db=createHistoryStore(storageAPI(win));
  let active=null,progress=null,media='',savedAt=0,lastKey='',bar=null,resume=null,panel=null,bridge=null,snapshot=null,continuing=null,cardSignature='',savedSignature='';
  const format=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  function showList(){
    if(panel){panel.remove();panel=null;return;}
    panel=doc.createElement('section');panel.dataset.rpUi='history-list';panel.className='rp-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Lịch sử xem RoPhim');
    const header=doc.createElement('h2');header.textContent='Lịch sử xem';panel.append(header);
    makeButton(doc,'Đóng',()=>{panel.remove();panel=null;},panel);
    const rows=db.list().slice(0,300);
    if(!rows.length){const p=doc.createElement('p');p.textContent='Chưa có tiến độ video nội dung được ghi nhận.';panel.append(p);}
    for(const row of rows){
      const article=doc.createElement('article'),title=doc.createElement('strong'),text=doc.createElement('p'),link=doc.createElement('a');
      title.textContent=row.title;text.textContent=`${row.episode} · ${row.lane} · ${row.server} · ${format(row.time)} / ${format(row.duration)}${row.completed?' · Đã xem':''}`;
      link.href=row.url;link.textContent='Trang đã xem';article.append(title,text,link);
      makeButton(doc,'Xem tiếp tại đây',()=>navigate(row,article),article);
      makeButton(doc,'Xóa mục này',()=>{db.remove(row);if(contextKey(active)===contextKey(row)){snapshot=null;resume.hidden=true;}article.remove();},article);panel.append(article);
    }
    const note=doc.createElement('p');note.textContent='Lưu riêng trong trình quản lý userscript; danh sách hiển thị tối đa 300 mục gần nhất.';panel.append(note);doc.body.append(panel);
  }
  function ensureUI(){
    if(!doc.body || bar)return;
    uiStyle(doc);bar=doc.createElement('div');bar.dataset.rpUi='history';bar.className='rp-page rp-row';bar.style.left='auto';bar.style.right='14px';doc.body.append(bar);
    makeButton(doc,'Lịch sử RP',showList,bar);
    resume=makeButton(doc,'Tiếp tục',()=>{if(snapshot && bridge?.state()?.ready && snapshot.time<bridge.state().duration-5){if(bridge.command('seek',snapshot.time)){snapshot=null;resume.hidden=true;toast(bar,'Đã chuyển tới mốc đã lưu');}}},bar);resume.hidden=true;
  }
  function persist(){
    if(!top || !active || !progress || !media)return;
    const row=historyRow(active,progress);
    const signature=row?[contextKey(row),Math.floor(row.time),row.completed].join('|'):'';
    if(row && signature!==savedSignature){try{db.save(row);savedSignature=signature;}catch{if(bar)toast(bar,'Không lưu được lịch sử: kiểm tra quyền userscript');}}
    savedAt=Date.now();
  }
  async function navigate(row,host){
    if(host.dataset.rpNavigating)return;
    host.dataset.rpNavigating='1';toast(host,'Đang tìm đúng phim, tập và bản dịch trên trang này…');
    try{
      const destination=await historyDestination(row,win);
      if(!destination){toast(host,'Chưa tìm được đúng phim/tập/bản dịch trên trang này. Bạn có thể mở phim rồi bấm Tiếp tục.');return;}
      if(destination.source==='legacy-panels')doc.cookie=`selectedVidTypeRophim=${laneKey(destination.lane)==='voiceover'?'tm':'vs'}; path=/; SameSite=Lax`;
      win.location.assign(destination.url);
    }catch{toast(host,'Không đọc được dữ liệu phim của trang này. Hãy thử lại.');}finally{delete host.dataset.rpNavigating;}
  }
  function home(){
    if(!top || !isSiteOrigin(win.location.origin) || !doc.body)return;
    ensureUI();bar.hidden=false;
    if(win.location.pathname.startsWith('/xem-phim/')){if(continuing)continuing.hidden=true;return;}
    if(!continuing?.isConnected){continuing=doc.createElement('section');continuing.dataset.rpUi='continue';continuing.className='rp-continue';doc.body.prepend(continuing);cardSignature='';}
    continuing.hidden=false;
    const rows=db.continuing().slice(0,24),signature=JSON.stringify(rows.map(r=>[contextKey(r),r.time,r.updated]));
    if(signature===cardSignature)return;cardSignature=signature;continuing.replaceChildren();
    const heading=doc.createElement('h2');heading.textContent='Đang xem';continuing.append(heading);
    if(!rows.length){const text=doc.createElement('p');text.textContent='Phim bạn đang xem sẽ xuất hiện tại đây, dùng chung trong Tampermonkey này.';continuing.append(text);}
    const cards=doc.createElement('div');cards.className='rp-history-cards';continuing.append(cards);
    for(const row of rows){
      const card=doc.createElement('article');
      const title=doc.createElement('h3'),description=doc.createElement('p');title.textContent=row.title;description.textContent=`${row.episode} · ${row.lane} · ${format(row.time)} / ${format(row.duration)}`;
      card.append(title,description);makeButton(doc,'Xem tiếp tại đây',()=>navigate(row,card),card);
      const source=doc.createElement('a');source.href=row.url;source.textContent='Trang đã xem';card.append(source);cards.append(card);
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
      if(active){ensureUI();bar.hidden=false;}else if(bar)bar.hidden=win.location.pathname.startsWith('/xem-phim/');
      const compatible=snapshot && info.state?.ready && Math.abs(snapshot.duration-info.state.duration)<=Math.max(5,snapshot.duration*.02);
      if(resume){resume.hidden=!(compatible && snapshot.time>=5 && !snapshot.completed && snapshot.time<info.state.duration-5);resume.textContent=snapshot?`Tiếp tục ${format(snapshot.time)}`:'Tiếp tục';}
      if(snapshot && info.state?.ready && !compatible && bar)toast(bar,'Có lịch sử đã lưu, nhưng bản phim này khác thời lượng nên chưa thể tua đúng mốc.');
      if(Date.now()-savedAt>=5000)persist();
    },
  });
  let offHome=()=>{},homeTimer=0;
  if(top && isSiteOrigin(win.location.origin)){doc.addEventListener('visibilitychange',()=>{if(doc.hidden)persist();else home();});win.addEventListener('pagehide',persist);offHome=watchDOM(win,home);homeTimer=win.setInterval(home,3000);home();}
  win.addEventListener('pagehide',event=>{if(!event.persisted){bridge.dispose();offHome();win.clearInterval(homeTimer);}});
}
startHistory(window,typeof unsafeWindow==='undefined' ? window : unsafeWindow);
