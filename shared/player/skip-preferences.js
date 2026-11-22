const KEY='media.skip.prefs.v1';
const MAX_MARKS=200;

function readRaw(win){
  try{if(typeof GM_getValue==='function'){const v=GM_getValue(KEY,null);if(v)return typeof v==='string'?JSON.parse(v):v;}}catch{/* unavailable */}
  try{const v=win.localStorage?.getItem(KEY);if(v)return JSON.parse(v);}catch{/* blocked storage */}
  return null;
}
function writeRaw(win,data){
  const json=JSON.stringify(data);
  try{if(typeof GM_setValue==='function'){GM_setValue(KEY,json);return;}}catch{/* unavailable */}
  try{win.localStorage?.setItem(KEY,json);}catch{/* blocked storage */}
}
function normalizeData(raw){
  const out={autoSkipIntro:false,autoSkipAd:false,adMarks:{}};
  if(!raw || typeof raw!=='object')return out;
  out.autoSkipIntro=raw.autoSkipIntro===true;
  out.autoSkipAd=raw.autoSkipAd===true;
  if(raw.adMarks && typeof raw.adMarks==='object' && !Array.isArray(raw.adMarks)){
    for(const [k,v] of Object.entries(raw.adMarks)){
      if(typeof k==='string' && k && v && Number.isFinite(v.start) && v.start>=0 && Number.isFinite(v.duration) && v.duration>=5 && v.duration<=180){
        out.adMarks[k]={start:Math.round(v.start),duration:Math.round(v.duration),updated:Number.isFinite(v.updated)?v.updated:0};
      }
    }
  }
  return out;
}

export function filmKeyFromContext(context){
  if(!context || typeof context!=='object')return '';
  if(typeof context.movie==='string' && context.movie.trim())return context.movie.trim().toLowerCase();
  if(typeof context.film==='string' && context.film.trim())return context.film.trim().toLowerCase();
  if(typeof context.url==='string'){
    try{
      const p=new URL(context.url).pathname.replace(/\/+$/,'');
      const m=p.match(/\/(?:xem-phim|phim-le|phim|tap-phim)\/([^/]+)/i);
      if(m)return m[1].replace(/\.\d+$/,'').replace(/-tap-\d+.*$/i,'').toLowerCase();
    }catch{/* invalid url */}
  }
  return '';
}

export function createSkipPreferences(win){
  let data=normalizeData(readRaw(win));
  const save=()=>{
    const entries=Object.entries(data.adMarks);
    if(entries.length>MAX_MARKS){
      entries.sort((a,b)=>(b[1].updated||0)-(a[1].updated||0));
      data.adMarks=Object.fromEntries(entries.slice(0,MAX_MARKS));
    }
    writeRaw(win,data);
  };
  return {
    get(){
      const fresh=readRaw(win);
      if(fresh)data=normalizeData(fresh);
      return {autoSkipIntro:data.autoSkipIntro,autoSkipAd:data.autoSkipAd};
    },
    set(patch){
      if(typeof patch?.autoSkipIntro==='boolean')data.autoSkipIntro=patch.autoSkipIntro;
      if(typeof patch?.autoSkipAd==='boolean')data.autoSkipAd=patch.autoSkipAd;
      save();
      return {autoSkipIntro:data.autoSkipIntro,autoSkipAd:data.autoSkipAd};
    },
    getAdMark(filmKey){
      if(!filmKey)return null;
      const fresh=readRaw(win);
      if(fresh)data=normalizeData(fresh);
      return data.adMarks[filmKey] || null;
    },
    setAdMark(filmKey,start,end){
      if(!filmKey || !Number.isFinite(start) || !Number.isFinite(end))return null;
      const duration=Math.round(end-start);
      if(start<0 || duration<5 || duration>180)return null;
      const mark={start:Math.round(start),duration,updated:Date.now()};
      data.adMarks[filmKey]=mark;
      save();
      return mark;
    },
    clearAdMark(filmKey){
      if(!filmKey || !data.adMarks[filmKey])return false;
      delete data.adMarks[filmKey];
      save();
      return true;
    },
  };
}
