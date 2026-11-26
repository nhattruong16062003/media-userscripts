import {accessibleHls} from '../engines/hls-access.js';

const AD_SEGMENT_RE=/\/v\d+\/[0-9a-f]{32}\/segment_\d{3,5}\.ts(?:[?#]|$)/i;

function fragUrl(frag){
  const raw=frag?.url || frag?.relurl || '';
  return typeof raw==='string'?raw:'';
}
function fragDir(url){
  if(!url)return '';
  const clean=url.split(/[?#]/)[0];
  const idx=clean.lastIndexOf('/');
  return idx>=0?clean.slice(0,idx+1):'';
}
function isUnencrypted(frag){
  const d=frag?.decryptdata;
  if(!d)return true;
  if(d.method && d.method!=='NONE')return false;
  return !d.uri;
}

// Pure structural SSAI detector for HLS media playlists.
// Requires a discontinuity-bounded run sandwiched between two film runs from
// the same directory, with unencrypted hash-folder segment_NNNN.ts URIs and
// total duration 15-60s. Domain-independent and read-only.
export function detectHlsAdBreaks(fragments){
  if(!Array.isArray(fragments) || fragments.length<5)return [];
  const runs=[];
  let current=null;
  for(const frag of fragments){
    if(!frag || !Number.isFinite(frag.start) || !Number.isFinite(frag.duration) || frag.duration<=0)continue;
    const cc=Number.isFinite(frag.cc)?frag.cc:0;
    if(!current || current.cc!==cc){
      current={cc,start:frag.start,end:frag.start+frag.duration,duration:frag.duration,frags:[frag]};
      runs.push(current);
    }else{
      current.end=frag.start+frag.duration;
      current.duration+=frag.duration;
      current.frags.push(frag);
    }
  }
  if(runs.length<3)return [];
  const breaks=[];
  for(let i=1;i<runs.length-1;i++){
    const prev=runs[i-1],run=runs[i],next=runs[i+1];
    if(run.duration<15 || run.duration>60 || run.frags.length<2)continue;
    const prevDir=fragDir(fragUrl(prev.frags.at(-1))),nextDir=fragDir(fragUrl(next.frags[0]));
    if(prevDir!==nextDir)continue;
    const allAd=run.frags.every(f=>{
      const u=fragUrl(f);
      return AD_SEGMENT_RE.test(u) && fragDir(u)!==prevDir && isUnencrypted(f);
    });
    if(allAd)breaks.push({start:run.start,end:run.end,duration:Math.round(run.duration),source:'hls'});
  }
  return breaks;
}

export function parseM3u8Fragments(text,baseUrl){
  if(typeof text!=='string' || !text.includes('#EXTINF:'))return [];
  const lines=text.split(/\r?\n/),fragments=[];
  let cc=0,t=0,dur=0,decryptdata={method:'NONE',uri:null};
  for(const rawLine of lines){
    const line=rawLine.trim();
    if(!line)continue;
    if(line.startsWith('#EXT-X-DISCONTINUITY')){cc++;continue;}
    if(line.startsWith('#EXT-X-KEY:')){
      const method=line.match(/METHOD=([^,\s]+)/i)?.[1] || 'NONE';
      const uri=line.match(/URI="([^"]+)"/i)?.[1] || null;
      decryptdata={method:method.toUpperCase(),uri};
      continue;
    }
    if(line.startsWith('#EXTINF:')){dur=parseFloat(line.slice(8)) || 0;continue;}
    if(!line.startsWith('#')){
      let url=line;
      if(baseUrl)try{url=new URL(line,baseUrl).href;}catch{/* keep relative */}
      if(dur>0){fragments.push({cc,start:t,duration:dur,url,decryptdata});t+=dur;}
      dur=0;
    }
  }
  return fragments;
}

const breakCache=new WeakMap();
const manifestCache=new Map();
function fetchManifestBreaks(win,playlistUrl){
  if(!playlistUrl || typeof win?.fetch!=='function')return [];
  const entry=manifestCache.get(playlistUrl);
  if(entry)return entry.breaks;
  const record={breaks:[]};
  manifestCache.set(playlistUrl,record);
  if(manifestCache.size>32){const first=manifestCache.keys().next().value;manifestCache.delete(first);}
  const load=async(url,depth=0)=>{
    const res=await win.fetch(url,{credentials:'omit'});
    if(!res.ok)return [];
    const text=await res.text();
    if(text.length>2_000_000)return [];
    if(text.includes('#EXT-X-STREAM-INF') && depth<2){
      const sub=text.split(/\r?\n/).map(l=>l.trim()).find(l=>l && !l.startsWith('#'));
      if(sub)return load(new URL(sub,res.url || url).href,depth+1);
      return [];
    }
    return detectHlsAdBreaks(parseM3u8Fragments(text,res.url || url));
  };
  load(playlistUrl).then(found=>{if(Array.isArray(found))record.breaks=found;}).catch(()=>{});
  return record.breaks;
}

export function readPlayerAdBreaks(candidate){
  if(!candidate || !candidate.video || candidate.video.nodeType!==1)return [];
  let hls=null;
  try{hls=accessibleHls(candidate);}catch{hls=null;}
  const fragments=hls?.levels?.[hls.currentLevel]?.details?.fragments;
  if(Array.isArray(fragments) && fragments.length){
    if(breakCache.has(fragments))return breakCache.get(fragments);
    const found=detectHlsAdBreaks(fragments);
    breakCache.set(fragments,found);
    return found;
  }
  // Fallback for direct m3u8 players (e.g. JW 8.9.3 + Hls 0.14.3 on top-level OPhim)
  // whose internal Hls instance is not exposed on the public provider API.
  let playlistUrl='';
  try{
    const item=candidate.kind==='jw'?candidate.api?.getPlaylistItem?.():null;
    const raw=item?.file || item?.sources?.[0]?.file || '';
    if(/^https:\/\/[^"'\s]+\.m3u8(?:[?#]|$)/i.test(raw))playlistUrl=raw;
  }catch{/* unavailable */}
  if(playlistUrl)return fetchManifestBreaks(candidate.video.ownerDocument?.defaultView,playlistUrl);
  return [];
}
