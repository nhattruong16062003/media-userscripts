export const finite = value => typeof value === 'number' && Number.isFinite(value);
export function clampSeek(time,duration){return Math.max(0,Math.min(Math.max(0,duration-0.25),time));}
