// Permissions choose a product owner, never a website/player adapter. A shared
// embed must inherit its family from its actual parent before mounting UI.
export function runFamily(win,{family,feature,isSiteURL,isFrameURL,isFrameOrigin=()=>false},start){
  const tag='media-userscripts-owner-v1';
  let active=false,disposed=false,timer=0,blankTimer=0,blankTicks=0;
  const challenge=Array.from(win.crypto.getRandomValues(new Uint32Array(4)),value=>value.toString(16).padStart(8,'0')).join('');
  const allowed=value=>{try{return !!(isSiteURL(value) || isFrameURL(value));}catch{return false;}};
  const parentOrigin=()=>{try{return win.document.referrer?new URL(win.document.referrer).origin:null;}catch{return null;}};
  const ask=()=>{if(!active && !disposed)win.parent.postMessage({tag,type:'ready',family,feature,challenge},parentOrigin() || '*');};
  const stopBlank=()=>{if(blankTimer){win.clearInterval(blankTimer);blankTimer=0;}win.removeEventListener('DOMContentLoaded',checkLocation);win.removeEventListener('load',checkLocation);};
  const activate=()=>{if(active || disposed)return;active=true;stopBlank();win.clearInterval(timer);for(const frame of win.document.querySelectorAll('iframe[src]'))if(allowed(frame.src))frame.contentWindow?.postMessage({tag,type:'probe',family,feature},new URL(frame.src).origin);start();};
  const checkLocation=()=>{
    if(active || disposed)return stopBlank();
    let detached=false;try{detached=!!(win.closed || (win.frameElement && !win.frameElement.isConnected));}catch{/* cross-origin frameElement */}
    if(detached)return dispose();
    const href=win.location.href;
    if(href==='about:blank'){if(++blankTicks>=200)dispose();return;}
    stopBlank();
    if(isSiteURL(href))activate();
    else if(win.parent!==win && isFrameURL(href) && !timer){timer=win.setInterval(ask,1000);ask();}
  };
  const receive=event=>{
    const data=event.data;
    if(disposed || data?.tag!==tag || data.family!==family || data.feature!==feature)return;
    const expectedParent=parentOrigin();
    const fromParent=win.parent!==win && event.source===win.parent && (isSiteURL(event.origin) || isFrameOrigin(event.origin)) && (!expectedParent || expectedParent===event.origin);
    const frameReady=isFrameURL(win.location.href);
    if(data.type==='probe' && !active && fromParent && frameReady){ask();return;}
    if(typeof data.challenge!=='string' || !/^[a-f0-9]{32}$/.test(data.challenge))return;
    if(data.type==='ready' && active){
      const frame=[...win.document.querySelectorAll('iframe[src]')].find(node=>node.isConnected && node.contentWindow===event.source);
      if(!frame || !allowed(frame.src))return;
      let origin;try{origin=new URL(frame.src).origin;}catch{return;}
      if(event.origin!==origin)return;
      frame.contentWindow.postMessage({tag,type:'owner',family,feature,challenge:data.challenge},origin);return;
    }
    if(data.type==='owner' && !active && data.challenge===challenge && fromParent && frameReady)activate();
  };
  win.addEventListener('message',receive);
  // Register the responder first: a synchronous child request must not race it.
  if(isSiteURL(win.location.href))activate();
  else if(win.parent!==win && isFrameURL(win.location.href)){
    timer=win.setInterval(ask,1000);ask();
  }else if(win.parent!==win && win.location.href==='about:blank'){
    win.addEventListener('DOMContentLoaded',checkLocation);
    win.addEventListener('load',checkLocation);
    blankTimer=win.setInterval(checkLocation,50);
  }
  const dispose=()=>{disposed=true;stopBlank();win.clearInterval(timer);win.removeEventListener('message',receive);win.removeEventListener('pagehide',hide);};
  const hide=event=>{
    if(event.persisted)return;
    // Blink fires pagehide when unloading the initial about:blank document right
    // before committing a same-origin navigation onto the reused Window.
    if(!active && blankTimer && win.location.href==='about:blank'){queueMicrotask(checkLocation);return;}
    dispose();
  };
  win.addEventListener('pagehide',hide);
  return {get active(){return active;},dispose};
}
