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

const breakCache=new WeakMap();
export function readPlayerAdBreaks(candidate){
  if(!candidate || !candidate.video || candidate.video.nodeType!==1)return [];
  let hls=null;
  try{hls=accessibleHls(candidate);}catch{return [];}
  const fragments=hls?.levels?.[hls.currentLevel]?.details?.fragments;
  if(!Array.isArray(fragments) || !fragments.length)return [];
  if(breakCache.has(fragments))return breakCache.get(fragments);
  const found=detectHlsAdBreaks(fragments);
  breakCache.set(fragments,found);
  return found;
}
