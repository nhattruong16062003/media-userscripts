// Permissions choose a product owner, never a website/player adapter. A shared
// embed must inherit its family from its actual parent before mounting UI.
export function runFamily(win,{family,feature,isSiteURL,isFrameURL,isFrameOrigin=()=>false},start){
  const tag='media-userscripts-owner-v1',doc=win.document;
  let active=false,disposed=false,timer=0;
  const challenge=Array.from(win.crypto.getRandomValues(new Uint32Array(4)),value=>value.toString(16).padStart(8,'0')).join('');
  const allowed=value=>{try{return !!(isSiteURL(value) || isFrameURL(value));}catch{return false;}};
  const parentOrigin=(()=>{try{return doc.referrer?new URL(doc.referrer).origin:null;}catch{return null;}})();
  const ask=()=>{if(!active && !disposed)win.parent.postMessage({tag,type:'ready',family,feature,challenge},parentOrigin || '*');};
  const activate=()=>{if(active || disposed)return;active=true;win.clearInterval(timer);for(const frame of doc.querySelectorAll('iframe[src]'))if(allowed(frame.src))frame.contentWindow?.postMessage({tag,type:'probe',family,feature},new URL(frame.src).origin);start();};
  const receive=event=>{
    const data=event.data;
    if(disposed || data?.tag!==tag || data.family!==family || data.feature!==feature)return;
    const fromParent=win.parent!==win && event.source===win.parent && (isSiteURL(event.origin) || isFrameOrigin(event.origin)) && (!parentOrigin || parentOrigin===event.origin);
    if(data.type==='probe' && !active && fromParent){ask();return;}
    if(typeof data.challenge!=='string' || !/^[a-f0-9]{32}$/.test(data.challenge))return;
    if(data.type==='ready' && active){
      const frame=[...doc.querySelectorAll('iframe[src]')].find(node=>node.isConnected && node.contentWindow===event.source);
      if(!frame || !allowed(frame.src))return;
      let origin;try{origin=new URL(frame.src).origin;}catch{return;}
      if(event.origin!==origin)return;
      frame.contentWindow.postMessage({tag,type:'owner',family,feature,challenge:data.challenge},origin);return;
    }
    if(data.type==='owner' && !active && data.challenge===challenge && fromParent)activate();
  };
  win.addEventListener('message',receive);
  // Register the responder first: a synchronous child request must not race it.
  if(isSiteURL(win.location.href))activate();
  else if(win.parent!==win && isFrameURL(win.location.href)){
    timer=win.setInterval(ask,1000);ask();
  }
  const dispose=()=>{disposed=true;win.clearInterval(timer);win.removeEventListener('message',receive);win.removeEventListener('pagehide',hide);};
  const hide=event=>{if(!event.persisted)dispose();};win.addEventListener('pagehide',hide);
  return {get active(){return active;},dispose};
}
