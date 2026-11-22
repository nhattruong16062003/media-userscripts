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

function isNewWindowTarget(target){
  const normalized=String(target || '').trim().toLowerCase();
  return !!normalized && !['_self','_parent','_top'].includes(normalized);
}
function isBlankFrame(frame){
  if(!frame || frame.tagName!=='IFRAME')return false;
  if(frame.hasAttribute('srcdoc'))return true;
  if(!frame.hasAttribute('src'))return true;
  const raw=(frame.getAttribute('src') || '').trim();
  return !raw || /^about:blank(?:[?#]|$)/i.test(raw);
}

export function installNavigationGuard(win,page=win,{isMediaFrame=()=>false}={}){
  const doc=win.document;
  const originalOpen=page.open,originalConfirm=page.confirm;
  let disposed=false,approved=null;
  const restores=[];
  // Firefox's isolated userscript realm may require exported functions when
  // installing a hook on unsafeWindow or accessible child windows. No CSP bypass.
  const exposeTo=(fn,target=page)=>{try{return typeof exportFunction==='function'?exportFunction(fn,target):fn;}catch{return fn;}};
  const open=()=>null; // Including blank/same-origin popups later redirected by ads.
  const exposedOpen=exposeTo(open,page);
  let openDescriptor;try{openDescriptor=Object.getOwnPropertyDescriptor(page,'open');Object.defineProperty(page,'open',{configurable:true,enumerable:openDescriptor?.enumerable??true,get:exposeTo(()=>exposedOpen,page),set:exposeTo(()=>{},page)});}catch{/* locked browser binding: DOM/frame boundaries still apply */}
  const stop=event=>{event.preventDefault();event.stopImmediatePropagation();};
  // Use the real top window for the top check; an iframe cannot ask its way out.
  const allowed=(url,trusted)=>confirmExternal(win,url,trusted,message=>Reflect.apply(originalConfirm,page,[message]));

  const resolveBase=targetWin=>{
    try{const href=targetWin?.location?.href;if(href && /^https?:/i.test(href))return href;}catch{/* inaccessible */}
    return win.location.href;
  };
  const baseTargetOf=node=>{
    try{return node?.ownerDocument?.querySelector?.('base[target]')?.getAttribute?.('target') || '';}catch{return '';}
  };
  function shouldBlockProgrammaticAnchor(anchor,targetWin){
    const target=(anchor?.getAttribute?.('target') || anchor?.target || '') || baseTargetOf(anchor);
    if(isNewWindowTarget(target))return true;
    const hasHref=anchor?.hasAttribute?anchor.hasAttribute('href'):Boolean(anchor?.href);
    if(!hasHref)return false;
    const raw=anchor?.getAttribute?(anchor.getAttribute('href') || ''):(anchor?.href || '');
    const trimmed=raw.trim();
    if(!trimmed || trimmed.startsWith('#'))return false;
    if(/^\s*javascript:/i.test(raw))return false;
    if(/^about:/i.test(trimmed))return true;
    const baseHref=resolveBase(targetWin);
    const docBase=(anchor?.baseURI && /^https?:/i.test(anchor.baseURI))?anchor.baseURI:baseHref;
    let url;try{url=new URL(raw,docBase);}catch{return true;}
    return navigationKind(url.href,baseHref)!=='internal';
  }
  function shouldBlockForm(form,submitter,targetWin,trusted=false){
    const baseHref=resolveBase(targetWin);
    const target=submitter?.getAttribute?.('formtarget') || submitter?.formTarget
      || form?.getAttribute?.('target') || form?.target || baseTargetOf(form);
    if(!trusted && isNewWindowTarget(target))return true;
    const rawAction=submitter?.getAttribute?.('formaction')
      || (form?.getAttribute?form.getAttribute('action'):form?.action) || '';
    const trimmed=rawAction.trim();
    if(!trimmed){
      const ownHref=form?.ownerDocument?.location?.href || targetWin?.location?.href || '';
      return navigationKind(ownHref,baseHref)!=='internal';
    }
    if(/^about:/i.test(trimmed))return true;
    const docBase=(form?.baseURI && /^https?:/i.test(form.baseURI))?form.baseURI:baseHref;
    let url;try{url=new URL(trimmed,docBase);}catch{return true;}
    return navigationKind(url.href,baseHref)!=='internal';
  }
  function handleClick(event,targetWin,allowConfirm){
    if(disposed)return;
    if(event.type==='auxclick' && event.button!==1)return;
    const anchor=event.composedPath?.().find(node=>node?.matches?.('a[href],area[href]')) || event.target?.closest?.('a[href],area[href]');
    if(!anchor)return;
    const raw=anchor.getAttribute('href') || '';
    const effectiveTarget=anchor.target || baseTargetOf(anchor);
    // Site server buttons sometimes use javascript:void(0). Keep their handlers,
    // but never execute an arbitrary javascript: URL as a navigation default.
    if(/^\s*javascript:/i.test(raw)){
      if(!event.isTrusted && isNewWindowTarget(effectiveTarget)){stop(event);return;}
      event.preventDefault();return;
    }
    const baseHref=resolveBase(targetWin);
    const docBase=(anchor.baseURI && /^https?:/i.test(anchor.baseURI))?anchor.baseURI:baseHref;
    let url;try{url=new URL(raw,docBase);}catch{stop(event);return;}
    if(navigationKind(url.href,baseHref)==='internal'){
      if(!event.isTrusted && isNewWindowTarget(effectiveTarget))stop(event);
      return;
    }
    stop(event);
    if(!allowConfirm || !allowed(url.href,event.isTrusted))return;
    approved=url.href;
    try{
      if(effectiveTarget && effectiveTarget.toLowerCase()!=='_self')Reflect.apply(originalOpen,page,[url.href,'_blank','noopener,noreferrer']);
      else page.location.assign(url.href);
    }finally{approved=null;}
  }

  function patchMethod(targetWin,proto,key,makeWrapper,trackRestore){
    if(!proto)return;
    let orig,ownDesc;
    try{
      orig=proto[key];
      ownDesc=Object.getOwnPropertyDescriptor(proto,key);
    }catch{return;}
    if(typeof orig!=='function')return;
    if(ownDesc && !ownDesc.configurable && !ownDesc.writable)return;
    const wrapped=exposeTo(makeWrapper(orig),targetWin);
    try{
      if(!ownDesc || ownDesc.configurable){
        Object.defineProperty(proto,key,{configurable:true,enumerable:ownDesc?ownDesc.enumerable:false,writable:true,value:wrapped});
      }else{
        proto[key]=wrapped;
      }
      if(trackRestore){
        restores.push(()=>{
          try{
            if(proto[key]!==wrapped)return;
            if(ownDesc)Object.defineProperty(proto,key,ownDesc);
            else delete proto[key];
          }catch{/* page is unloading */}
        });
      }
    }catch{/* browser binding locked */}
  }

  const guardedOpens=new WeakSet();
  const guardedProtos=new WeakSet();
  const guardedDocs=new WeakSet();
  function installProtoGuards(targetWin,trackRestore){
    const htmlElemProto=targetWin.HTMLElement?.prototype;
    const anchorProto=targetWin.HTMLAnchorElement?.prototype;
    const areaProto=targetWin.HTMLAreaElement?.prototype;
    const formProto=targetWin.HTMLFormElement?.prototype;
    const makeClick=orig=>function(...args){
      if(!disposed && (this?.tagName==='A' || this?.tagName==='AREA') && shouldBlockProgrammaticAnchor(this,targetWin))return;
      return Reflect.apply(orig,this,args);
    };
    if(htmlElemProto && typeof htmlElemProto.click==='function'){
      patchMethod(targetWin,htmlElemProto,'click',makeClick,trackRestore);
      if(anchorProto && Object.prototype.hasOwnProperty.call(anchorProto,'click')){
        patchMethod(targetWin,anchorProto,'click',makeClick,trackRestore);
      }
    }else if(anchorProto){
      patchMethod(targetWin,anchorProto,'click',makeClick,trackRestore);
    }
    const makeAnchorDispatch=orig=>function(...args){
      const event=args[0];
      if(!disposed && (event?.type==='click' || event?.type==='auxclick') && shouldBlockProgrammaticAnchor(this,targetWin))return false;
      return Reflect.apply(orig,this,args);
    };
    patchMethod(targetWin,anchorProto,'dispatchEvent',makeAnchorDispatch,trackRestore);
    patchMethod(targetWin,areaProto,'dispatchEvent',makeAnchorDispatch,trackRestore);

    patchMethod(targetWin,formProto,'submit',orig=>function(...args){
      if(!disposed && shouldBlockForm(this,null,targetWin,false))return;
      return Reflect.apply(orig,this,args);
    },trackRestore);
    patchMethod(targetWin,formProto,'requestSubmit',orig=>function(...args){
      if(!disposed && shouldBlockForm(this,args[0],targetWin,false))return;
      return Reflect.apply(orig,this,args);
    },trackRestore);
    patchMethod(targetWin,formProto,'dispatchEvent',orig=>function(...args){
      const event=args[0];
      if(!disposed && event?.type==='submit' && shouldBlockForm(this,event?.submitter,targetWin,false))return false;
      return Reflect.apply(orig,this,args);
    },trackRestore);

    const iframeProto=targetWin.HTMLIFrameElement?.prototype;
    if(iframeProto){
      for(const prop of ['contentWindow','contentDocument']){
        let desc;try{desc=Object.getOwnPropertyDescriptor(iframeProto,prop);}catch{continue;}
        if(!desc || typeof desc.get!=='function' || !desc.configurable)continue;
        const origGet=desc.get;
        const wrappedGet=exposeTo(function(){
          const val=Reflect.apply(origGet,this,[]);
          if(!disposed && val){
            const child=prop==='contentDocument'?val.defaultView:val;
            if(child)guardChildWindow(child);
          }
          return val;
        },targetWin);
        try{
          Object.defineProperty(iframeProto,prop,{configurable:true,enumerable:desc.enumerable,get:wrappedGet,set:desc.set});
          if(trackRestore){
            restores.push(()=>{
              try{if(Object.getOwnPropertyDescriptor(iframeProto,prop)?.get===wrappedGet)Object.defineProperty(iframeProto,prop,desc);}catch{/* page is unloading */}
            });
          }
        }catch{/* browser binding locked */}
      }
    }
  }

  function guardChildWindow(candidate){
    if(disposed || !candidate)return;
    let raw;try{raw=candidate.wrappedJSObject || candidate;}catch{raw=candidate;}
    if(!raw || raw===win || raw===page)return;
    let currentOpen,childDoc,protoKey;
    try{
      // Cross-origin access throws SecurityError before any mutation.
      childDoc=raw.document;
      void raw.location.href;
      currentOpen=raw.open;
      protoKey=raw.HTMLElement?.prototype || raw.HTMLAnchorElement?.prototype || raw.Window;
    }catch{return;}
    if(!currentOpen || !guardedOpens.has(currentOpen)){
      const origChildOpen=currentOpen;
      const childOpen=exposeTo((...args)=>{
        if(disposed && typeof origChildOpen==='function')return Reflect.apply(origChildOpen,raw,args);
        return null;
      },raw);
      guardedOpens.add(childOpen);
      try{
        const desc=Object.getOwnPropertyDescriptor(raw,'open');
        Object.defineProperty(raw,'open',{configurable:true,enumerable:desc?.enumerable??true,get:exposeTo(()=>childOpen,raw),set:exposeTo(()=>{},raw)});
      }catch{/* locked binding */}
    }
    if(protoKey && !guardedProtos.has(protoKey)){
      guardedProtos.add(protoKey);
      installProtoGuards(raw,false);
    }
    if(childDoc && !guardedDocs.has(childDoc)){
      guardedDocs.add(childDoc);
      const childClick=exposeTo(event=>handleClick(event,raw,false),raw);
      const childSubmit=exposeTo(event=>{if(!disposed && shouldBlockForm(event.target,event.submitter,raw,false))stop(event);},raw);
      try{
        raw.addEventListener('click',childClick,true);
        raw.addEventListener('auxclick',childClick,true);
        raw.addEventListener('submit',childSubmit,true);
      }catch{/* unloading or restricted */}
    }
  }

  const click=event=>handleClick(event,win,true);
  const submit=event=>{if(!disposed && shouldBlockForm(event.target,event.submitter,win,event.isTrusted))stop(event);};
  win.addEventListener('click',click,true);win.addEventListener('auxclick',click,true);win.addEventListener('submit',submit,true);
  installProtoGuards(page,true);
  const navigate=event=>{
    if(event.navigationType==='traverse' || !event.cancelable || !event.destination?.url)return;
    const url=event.destination.url;
    if(url===approved || navigationKind(url,win.location.href)==='internal')return;
    event.preventDefault();
  };
  page.navigation?.addEventListener?.('navigate',navigate);
  const scan=()=>{
    if(disposed)return;
    for(const frame of doc.querySelectorAll('iframe')){
      if(isBlankFrame(frame)){
        // Only inspect blank/srcdoc iframes eagerly; never touch .contentWindow
        // of iframes with a real URL src (e.g. /tp or /tvc-embed.html).
        try{const child=frame.contentWindow;if(child)guardChildWindow(child);}catch{/* detached or cross-origin */}
        continue;
      }
      if(frame.hasAttribute('src')){
        try{if(isMediaFrame(frame))protectMediaFrame(frame);}catch{/* an unknown frame is not authority to change the player */}
      }
    }
  };
  const observer=new win.MutationObserver(scan);observer.observe(doc,{childList:true,subtree:true,attributes:true,attributeFilter:['src','srcdoc','sandbox']});scan();
  const dispose=()=>{
    if(disposed)return;disposed=true;observer.disconnect();win.removeEventListener('click',click,true);win.removeEventListener('auxclick',click,true);win.removeEventListener('submit',submit,true);page.navigation?.removeEventListener?.('navigate',navigate);
    try{if(page.open===exposedOpen){if(openDescriptor)Object.defineProperty(page,'open',openDescriptor);else{delete page.open;page.open=originalOpen;}}}catch{/* page is unloading */}
    while(restores.length)restores.pop()();
  };
  win.addEventListener('pagehide',event=>{if(!event.persisted)dispose();});
  return {dispose};
}
