// An extra boundary, independent of ad rules. This is a userscript, not a
// browser extension: Location setters, HTTP redirects and code that ran before
// document-start cannot all be intercepted in Firefox. Never claim otherwise.
export function navigationKind(value,base){
  try{
    const url=new URL(value,base);
    if(['http:','https:'].includes(url.protocol))return url.origin===new URL(base).origin?'internal':'external';
    if(['mailto:','tel:'].includes(url.protocol))return 'external';
  }catch{/* malformed destination */}
  return 'blocked';
}
export function confirmExternal(win,url,trusted,confirm=message=>win.confirm(message)){
  if(!trusted || win.parent!==win || navigationKind(url,win.location.href)!=='external')return false;
  try{return confirm('Mở liên kết bên ngoài?\n'+String(url).slice(0,300))===true;}catch{return false;}
}

// A cross-origin media frame never needs popups/top navigation to load video.
// Keep scripts, cookies/storage, forms and EME; preserve stricter site sandbox
// restrictions. Fullscreen/orientation rights belong to the existing player.
export function protectMediaFrame(frame){
  const doc=frame?.ownerDocument,base=doc?.location?.href;
  if(!base || frame.tagName!=='IFRAME')return false;
  let url;try{url=new URL(frame.getAttribute('src'),base);}catch{return false;}
  if(!['http:','https:'].includes(url.protocol) || url.origin===doc.location.origin)return false;
  const had=frame.hasAttribute('sandbox');
  const tokens=had?(frame.getAttribute('sandbox') || '').split(/\s+/).filter(Boolean):['allow-scripts','allow-same-origin','allow-forms','allow-presentation','allow-orientation-lock'];
  const forbidden=new Set(['allow-popups','allow-popups-to-escape-sandbox','allow-top-navigation','allow-top-navigation-by-user-activation','allow-top-navigation-to-custom-protocols']);
  const sandbox=tokens.filter(t=>!forbidden.has(t)).join(' ');
  if(frame.getAttribute('sandbox')!==sandbox)frame.setAttribute('sandbox',sandbox);
  return true;
}

export function installNavigationGuard(win,page=win,{isMediaFrame=()=>false}={}){
  const doc=win.document;
  const originalOpen=page.open,originalConfirm=page.confirm;
  let disposed=false,approved=null;
  // Firefox's isolated userscript realm may require exported functions when
  // installing a hook on unsafeWindow. No page-script injection/CSP bypass.
  const expose=fn=>{try{return typeof exportFunction==='function'?exportFunction(fn,page):fn;}catch{return fn;}};
  const open=()=>null; // Including blank/same-origin popups later redirected by ads.
  const exposedOpen=expose(open);
  let openDescriptor;try{openDescriptor=Object.getOwnPropertyDescriptor(page,'open');Object.defineProperty(page,'open',{configurable:true,enumerable:openDescriptor?.enumerable??true,get:expose(()=>exposedOpen),set:expose(()=>{})});}catch{/* locked browser binding: DOM/frame boundaries still apply */}
  const stop=event=>{event.preventDefault();event.stopImmediatePropagation();};
  // Use the real top window for the top check; an iframe cannot ask its way out.
  const allowed=(url,trusted)=>confirmExternal(win,url,trusted,message=>Reflect.apply(originalConfirm,page,[message]));
  function click(event){
    if(event.type==='auxclick' && event.button!==1)return;
    const anchor=event.composedPath?.().find(node=>node?.matches?.('a[href],area[href]')) || event.target?.closest?.('a[href],area[href]');
    if(!anchor)return;
    const raw=anchor.getAttribute('href') || '';
    // Site server buttons sometimes use javascript:void(0). Keep their handlers,
    // but never execute an arbitrary javascript: URL as a navigation default.
    if(/^\s*javascript:/i.test(raw)){event.preventDefault();return;}
    let url;try{url=new URL(raw,anchor.baseURI || win.location.href);}catch{stop(event);return;}
    if(navigationKind(url.href,win.location.href)==='internal'){
      if(!event.isTrusted && anchor.target && !['_self','_parent','_top'].includes(anchor.target.toLowerCase()))stop(event);
      return;
    }
    stop(event);
    if(!allowed(url.href,event.isTrusted))return;
    approved=url.href;
    try{
      if(anchor.target && anchor.target!=='_self')Reflect.apply(originalOpen,page,[url.href,'_blank','noopener,noreferrer']);
      else page.location.assign(url.href);
    }finally{approved=null;}
  }
  const submit=event=>{if(navigationKind(event.target?.action || win.location.href,win.location.href)!=='internal')stop(event);};
  win.addEventListener('click',click,true);win.addEventListener('auxclick',click,true);win.addEventListener('submit',submit,true);
  const proto=page.HTMLFormElement?.prototype,originalSubmit=proto?.submit;
  const guardedSubmit=expose(function(...args){if(navigationKind(this.action || win.location.href,win.location.href)!=='internal')return;return Reflect.apply(originalSubmit,this,args);});
  try{if(originalSubmit)proto.submit=guardedSubmit;}catch{/* browser binding locked */}
  const navigate=event=>{
    if(event.navigationType==='traverse' || !event.cancelable || !event.destination?.url)return;
    const url=event.destination.url;
    if(url===approved || navigationKind(url,win.location.href)==='internal')return;
    event.preventDefault();
  };
  page.navigation?.addEventListener?.('navigate',navigate);
  const scan=()=>{
    if(disposed)return;
    for(const frame of doc.querySelectorAll('iframe[src]'))try{if(isMediaFrame(frame))protectMediaFrame(frame);}catch{/* an unknown frame is not authority to change the player */}
  };
  const observer=new win.MutationObserver(scan);observer.observe(doc,{childList:true,subtree:true,attributes:true,attributeFilter:['src','sandbox']});scan();
  const dispose=()=>{
    if(disposed)return;disposed=true;observer.disconnect();win.removeEventListener('click',click,true);win.removeEventListener('auxclick',click,true);win.removeEventListener('submit',submit,true);page.navigation?.removeEventListener?.('navigate',navigate);
    try{if(page.open===exposedOpen){if(openDescriptor)Object.defineProperty(page,'open',openDescriptor);else{delete page.open;page.open=originalOpen;}}}catch{/* page is unloading */}
    try{if(proto?.submit===guardedSubmit)proto.submit=originalSubmit;}catch{/* page is unloading */}
  };
  win.addEventListener('pagehide',event=>{if(!event.persisted)dispose();});
  return {dispose};
}
