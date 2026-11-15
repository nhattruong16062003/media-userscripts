// Passive observation only. Never fetch a second copy of a segment/manifest,
// change a request, delay a response or treat a CDN/domain as media identity.
const probes=new WeakMap();
const http=(value,base)=>{if(typeof value!=='string' || !value || value.length>8192)return '';try{const u=new URL(value,base);return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}};
export function manifestLinks(text,base){
  if(typeof text!=='string' || text.length>500000 || !text.trimStart().startsWith('#EXTM3U'))return null;
  const manifests=[],segments=[];let variant=false;
  for(const line of text.split(/\r?\n/)){
    const s=line.trim();if(!s)continue;
    if(s.startsWith('#EXT-X-STREAM-INF:')){variant=true;continue;}
    if(s.startsWith('#EXT-X-MEDIA:') || s.startsWith('#EXT-X-I-FRAME-STREAM-INF:')){const u=http(s.match(/URI="([^"]+)"/)?.[1],base);if(u)manifests.push(u);}
    else if(s.startsWith('#EXT-X-MAP:') || s.startsWith('#EXT-X-PART:')){const u=http(s.match(/URI="([^"]+)"/)?.[1],base);if(u)segments.push(u);}
    else if(!s.startsWith('#')){const u=http(s,base);if(u)(variant?manifests:segments).push(u);variant=false;}
    if(manifests.length+segments.length>6000)return null;
  }
  return {manifests,segments};
}
export function mediaNetworkProbe(win){
  if(probes.has(win))return probes.get(win).acquire();
  const manifests=new Map(),samples=[],pending=new Set();let disposed=false,observer=null,refs=0,revision=0,lastRevision=-1,lastSource='',lastFiles=new Set(),knownSegments=new Set();
  const clock=()=>win.performance?.now?.() ?? 0;
  const later=fn=>typeof win.requestIdleCallback==='function'?win.requestIdleCallback(()=>{if(!disposed)fn();},{timeout:2000}):win.setTimeout(()=>{if(!disposed)fn();},0);
  const wanted=url=>/\.m3u8(?:$|[?#])/i.test(url) || pending.has(url);
  function accept(url,text,alias=''){
    if(disposed)return;const links=manifestLinks(text,url);if(!links)return;
    manifests.set(url,links);if(alias && alias!==url)manifests.set(alias,links);
    revision++;
    for(const child of links.manifests)pending.add(child);
    while(manifests.size>24)manifests.delete(manifests.keys().next().value);
    knownSegments=new Set([...manifests.values()].flatMap(v=>v.segments));
    while(knownSegments.size>12000 && manifests.size>1){manifests.delete(manifests.keys().next().value);knownSegments=new Set([...manifests.values()].flatMap(v=>v.segments));}
    if(pending.size>96)pending.clear();
  }
  const originalFetch=win.fetch;
  const fetch=typeof originalFetch==='function'?function(...args){
    const result=Reflect.apply(originalFetch,this,args),url=http(typeof args[0]==='string'?args[0]:args[0]?.url || String(args[0] || ''),win.location.href);
    // Return the original promise; parsing never blocks the engine's response.
    if(wanted(url))result.then(response=>{
      if(disposed || !response.ok || Number(response.headers?.get('content-length'))>500000)return;
      const copy=response.clone(),reader=copy.body?.getReader?.();
      if(!reader)return;
      later(()=>(async()=>{let bytes=0,text='',decoder=new (win.TextDecoder || globalThis.TextDecoder)();try{for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(disposed || bytes>500000){await reader.cancel();return;}text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();later(()=>accept(http(response.url,win.location.href)||url,text,url));}catch{/* opaque or cancelled body */}finally{reader.releaseLock();}})().catch(()=>{}));
    }).catch(()=>{});
    return result;
  }:null;
  if(fetch)try{win.fetch=fetch;}catch{/* another realm may deny assignment */}
  const proto=win.XMLHttpRequest?.prototype,originalOpen=proto?.open,requests=new WeakMap();
  const open=originalOpen?function(method,url,...rest){
    const absolute=http(url,win.location.href);
    const previous=requests.get(this);if(previous)for(const [type,fn] of previous)this.removeEventListener(type,fn);
    const listeners=[];requests.set(this,listeners);const listen=(type,fn)=>{listeners.push([type,fn]);this.addEventListener(type,fn,{once:true});};
    if(knownSegments.has(absolute)){
      let start=clock();listen('loadstart',()=>{start=clock();});
      listen('load',event=>{const end=clock();if(this.status>=200 && this.status<300 && event.loaded>0 && end>start)collect({entryType:'resource',name:absolute,responseStart:start,responseEnd:end,transferSize:event.loaded,actual:true});});
    }
    if(wanted(absolute)){
      const loaded=()=>{try{if(this.status>=200 && this.status<300 && (!this.responseType || this.responseType==='text')){const url=this.responseURL||absolute,text=this.responseText;if(text.length<=500000)later(()=>accept(url,text,absolute));}}catch{/* opaque */}};
      listen('load',loaded);
    }
    return Reflect.apply(originalOpen,this,[method,url,...rest]);
  }:null;
  if(open)try{proto.open=open;}catch{/* read-only realm */}
  const collect=entry=>{
    if(disposed || entry.entryType!=='resource' || !Number.isFinite(entry.responseEnd) || entry.responseEnd<=0)return;
    samples.push({url:entry.name,start:entry.responseStart,end:entry.responseEnd,bytes:entry.transferSize,actual:entry.actual===true});
    const cutoff=clock()-6000;
    while(samples.length && (samples[0].end<cutoff || samples.length>160))samples.shift();
  };
  try{if(win.PerformanceObserver){observer=new win.PerformanceObserver(list=>{for(const entry of list.getEntries())collect(entry);});observer.observe({type:'resource',buffered:false});}}catch{/* no Resource Timing */}
  function urls(source){
    if(source===lastSource && revision===lastRevision)return lastFiles;
    const files=new Set(),seen=new Set();
    const visit=(url,depth)=>{if(depth>3 || seen.has(url))return;seen.add(url);const item=manifests.get(url);if(!item)return;for(const file of item.segments)files.add(file);for(const child of item.manifests)visit(child,depth+1);};
    visit(source,0);if(!manifests.has(source) && source && !/\.m3u8(?:$|[?#])/i.test(source))files.add(source);
    lastSource=source;lastRevision=revision;lastFiles=files;return files;
  }
  const probe={
    speed(source,since=0){
      const files=urls(source),now=clock(),active=samples.filter(s=>s.end>=Math.max(since,now-5000) && files.has(s.url));
      // Missing TAO is unknown, never a made-up zero or the connection speed.
      const actual=active.filter(s=>s.actual),measured=(actual.length?actual:active).filter(s=>s.bytes>0 && Number.isFinite(s.start) && s.end>s.start);
      if(!measured.length)return null;
      const intervals=measured.map(s=>[s.start,s.end]).sort((a,b)=>a[0]-b[0]);let ms=0,end=-Infinity;
      for(const [start,stop] of intervals){ms+=Math.max(0,stop-Math.max(start,end));end=Math.max(end,stop);}
      return ms>0?measured.reduce((sum,s)=>sum+s.bytes,0)*1000/ms:null;
    },
    source(declared){return manifests.has(declared)?declared:'';},
    acquire(){refs++;let released=false;return {speed:probe.speed,source:probe.source,dispose(){if(released)return;released=true;if(--refs>0)return;disposed=true;observer?.disconnect();if(win.fetch===fetch)win.fetch=originalFetch;if(proto?.open===open)proto.open=originalOpen;manifests.clear();samples.length=0;pending.clear();knownSegments.clear();probes.delete(win);}};},
  };
  probes.set(win,probe);return probe.acquire();
}
