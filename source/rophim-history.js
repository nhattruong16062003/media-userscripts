import {storageAPI} from '../lib/core.js';
import {contextKey} from '../lib/sites.js';
import {createBridge} from '../lib/bridge.js';
import {createHistoryStore,historyRow} from '../lib/history.js';
import {uiStyle,makeButton,toast} from '../lib/ui.js';

function startHistory(win,page) {
  const doc=win.document,top=win.parent===win,db=createHistoryStore(storageAPI(win));
  let active=null,progress=null,media='',savedAt=0,lastKey='',bar=null,resume=null,panel=null,bridge=null,snapshot=null;
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
      link.href=row.url;link.textContent='Về trang đang xem';article.append(title,text,link);
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
    if(row){try{db.save(row);}catch{if(bar)toast(bar,'Không lưu được lịch sử: kiểm tra quyền userscript');}}
    savedAt=Date.now();
  }
  bridge=createBridge(win,page,'history',{
    update(info){
      if(!top)return;
      const nextKey=contextKey(info.context);
      // Flush the immutable old context/progress pair before accepting a new one.
      if(nextKey!==lastKey){persist();lastKey=nextKey;snapshot=info.context ? db.read(info.context) : null;active=info.context;progress=null;media='';savedAt=0;}
      else active=info.context;
      progress=info.state;media=info.media;
      if(active){ensureUI();bar.hidden=false;}else if(bar)bar.hidden=true;
      if(resume){resume.hidden=!(snapshot && snapshot.time>=5 && !snapshot.completed && info.state?.ready && snapshot.time<info.state.duration-5);resume.textContent=snapshot?`Tiếp tục ${format(snapshot.time)}`:'Tiếp tục';}
      if(Date.now()-savedAt>=5000)persist();
    },
  });
  if(top){doc.addEventListener('visibilitychange',()=>{if(doc.hidden)persist();});win.addEventListener('pagehide',persist);}
  win.addEventListener('pagehide',event=>{if(!event.persisted)bridge.dispose();});
}
startHistory(window,typeof unsafeWindow==='undefined' ? window : unsafeWindow);
