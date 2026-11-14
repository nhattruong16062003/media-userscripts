import {storageAPI, diagnostic} from '../lib/core.js';
import {contextKey,introKey,nextRoute} from '../lib/sites.js';
import {createBridge} from '../lib/bridge.js';
import {installGestures} from '../lib/gestures.js';
import {customPlayerControls} from '../lib/custom-controls.js';
import {uiStyle,makeButton,toolsHost,toast} from '../lib/ui.js';

function startGestures(win,page) {
  const store=storageAPI(win),doc=win.document;
  let mounted=null, offGestures=()=>{},site=null,context=null,pageHost=null,bridge=null;
  const next=async()=>{
    if(!site || !context)return;
    const expected=contextKey(context);
    try {
      const url=await nextRoute(site,context,win);
      if(expected!==contextKey(context))return;
      if(!url){if(pageHost)toast(pageHost,'Chưa tìm thấy tập kế tiếp cùng bản dịch');return;}
      // Native legacy links reset server in their click handler. Preserve only an
      // explicitly selected cookie and navigate through the site's own watch route.
      if(site.kind==='legacy-panels'){
        doc.cookie=`selectedServerRophim=${encodeURIComponent(context.server)}; path=/; SameSite=Lax`;
        doc.cookie=`selectedVidTypeRophim=${context.lane}; path=/; SameSite=Lax`;
      }
      win.location.assign(url);
    }catch{if(pageHost)toast(pageHost,'Không đọc được tập kế tiếp. Hãy dùng danh sách tập của trang.');}
  };
  function mountControls(root, player, parent=false) {
    const {host,row}=toolsHost(root);
    const state=()=>parent ? bridge?.state() : player.state();
    const command=(action,value)=>parent ? bridge?.command(action,value) : player.command(action,value);
    const controls=[];
    for(const [label,delta] of [['−10s',-10],['+10s',10]])controls.push(makeButton(doc,label,()=>{const s=state();if(s?.ready)command('seek',s.time+delta);},row));
    controls.push(makeButton(doc,'Phát/Dừng',()=>{const s=state();if(s?.ready)command(s.paused?'play':'pause');},row));
    for(const rate of [.75,1,1.25,1.5,2])controls.push(makeButton(doc,rate+'×',()=>command('rate',rate),row));
    const input=doc.createElement('input');input.type='number';input.min='0';input.max='600';input.step='1';input.value=context ? store.get('rp.gestures.intro.'+introKey(context),90) : 90;input.title='Số giây bỏ qua intro';input.setAttribute('aria-label','Số giây intro');row.append(input);
    input.addEventListener('change',()=>{const value=Number(input.value);if(Number.isFinite(value) && value>=0 && value<=600 && context)store.set('rp.gestures.intro.'+introKey(context),value);});
    controls.push(makeButton(doc,'Bỏ intro',()=>{const s=state(),seconds=Number(input.value);if(s?.ready && Number.isFinite(seconds) && seconds>=0 && seconds<=600)command('seek',s.time+seconds);},row));
    makeButton(doc,'Tập sau',()=>parent ? next() : bridge?.request('next'),row);
    makeButton(doc,'Toàn màn hình',()=>{
      const target=parent ? site?.frame.parentElement : root;
      try { const result=doc.fullscreenElement ? doc.exitFullscreen() : target?.requestFullscreen?.();result?.catch(()=>toast(host,'Trình duyệt chưa cho phép toàn màn hình khung')); }catch{toast(host,'Không bật được toàn màn hình');}
    },row);
    const update=()=>{for(const b of controls)b.disabled=!state()?.ready;};update();
    return {host,update,input};
  }
  const unbind=()=>{offGestures();offGestures=()=>{};mounted?.custom?.dispose();mounted?.host.remove();mounted=null;};
  bridge=createBridge(win,page,'gestures',{
    update(info){
      site=info.site;context=info.context;
      if(win.parent===win){
        if(context && !pageHost && doc.body){uiStyle(doc);pageHost=doc.createElement('div');pageHost.dataset.rpUi='page-controls';pageHost.className='rp-page';doc.body.append(pageHost);mounted=mountControls(pageHost,null,true);mounted.host.style.position='relative';mounted.host.style.top='0';mounted.host.style.right='0';}
        if(pageHost)pageHost.hidden=!context;
        if(mounted){mounted.update();if(context && doc.activeElement!==mounted.input)mounted.input.value=store.get('rp.gestures.intro.'+introKey(context),90);}
      }else if(info.player && mounted?.player!==info.player){
        unbind();mounted={...mountControls(info.player.root,info.player),player:info.player};mounted.custom=customPlayerControls(win,info.player,mounted);
      }
      if(mounted && context && doc.activeElement!==mounted.input)mounted.input.value=store.get('rp.gestures.intro.'+introKey(context),90);
      mounted?.custom?.update();
    },
    unbind,
    request:next,
  });
  // The first bridge callback can occur before assignment. Refresh UI on the
  // next task after bridge is available, and update readiness on every heartbeat.
  const timer=win.setInterval(()=>mounted?.update(),1000);
  win.addEventListener('pagehide',event=>{if(!event.persisted){win.clearInterval(timer);bridge.dispose();unbind();}});
}
startGestures(window, typeof unsafeWindow==='undefined' ? window : unsafeWindow);
