export const finite = value => typeof value === 'number' && Number.isFinite(value);
export function clampSeek(time,duration){return Math.max(0,Math.min(Math.max(0,duration-0.25),time));}
export function audioPreference(value){
  return value && typeof value==='object' && typeof value.muted==='boolean' && finite(value.volume) && value.volume>=0 && value.volume<=1 ? {muted:value.muted,volume:value.volume}:null;
}
