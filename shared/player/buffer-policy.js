// Verified hls.js 1.6.5 / 1.6.8 / 1.7.3 rule: byte floor then seconds ceiling.
// maxBufferSize is NOT a hard memory cap. Never call it one or increase it.
export function hlsBufferTarget(config,bitrate){
  if(!Number.isFinite(bitrate) || bitrate<0 || !Number.isFinite(config.maxBufferSize) || config.maxBufferSize<=0 || !Number.isFinite(config.maxBufferLength) || config.maxBufferLength<=0 || !Number.isFinite(config.maxMaxBufferLength) || config.maxMaxBufferLength<=0)return null;
  return Math.min(bitrate?Math.max(config.maxBufferLength,8*config.maxBufferSize/bitrate):config.maxBufferLength,config.maxMaxBufferLength);
}
export function bufferExpansionPlan(config,bitrate,otherBufferedSeconds=0,loadingBitrate=bitrate){
  if(!Number.isFinite(bitrate) || bitrate<=0)return null;
  const native=hlsBufferTarget(config,loadingBitrate);if(native===null)return null;
  if(!Number.isFinite(otherBufferedSeconds) || otherBufferedSeconds<0)return null;
  // Native maxBufferSize is a minimum forward target, not a maximum allocation.
  // Keep all native quota handling and maxBufferSize unchanged. Bound the
  // EXTRA estimated data to 16 MiB (15% bitrate margin), all cached ranges to
  // 96 MiB, and the time target to 4x the native goal / four minutes.
  // Preserve a larger native goal instead of reducing its own policy.
  const bytesPerSecond=bitrate*1.15/8;
  const target=Math.floor(Math.min(240,native*4,native+16*1024*1024/bytesPerSecond,96*1024*1024/bytesPerSecond-otherBufferedSeconds));
  if(target<native+10)return null;
  return {before:{maxBufferLength:config.maxBufferLength,maxMaxBufferLength:config.maxMaxBufferLength},after:{maxBufferLength:Math.max(config.maxBufferLength,target),maxMaxBufferLength:Math.max(config.maxMaxBufferLength,target)}};
}
// Spread extra work over healthy playback windows instead of requesting the
// entire 4x allowance at once. Always derive the ceiling from ORIGINAL config.
export function bufferExpansionStep(original,current,bitrate,otherBufferedSeconds=0,loadingBitrate=bitrate){
  const plan=bufferExpansionPlan(original,bitrate,otherBufferedSeconds,loadingBitrate),now=hlsBufferTarget(current,loadingBitrate);
  if(!plan || now===null)return null;
  const maximum=hlsBufferTarget({...original,...plan.after},loadingBitrate),target=Math.min(maximum,Math.floor(now+10));
  if(target<=now)return null;
  return {...plan,after:{maxBufferLength:Math.max(original.maxBufferLength,target),maxMaxBufferLength:Math.max(original.maxMaxBufferLength,target)}};
}
// Unlisted single-variant media has bitrate=0 in HLS. Measure encoded bytes per
// MEDIA second, never confuse this with bytes per second of network loading.
// Use the highest completed full-segment rate, not an optimistic mean.
export function observedMediaBitrate(fragments){
  const samples=fragments.filter(s=>Number.isFinite(s.duration) && s.duration>=.1 && s.duration<=60 && Number.isFinite(s.bytes) && s.bytes>0);
  if(samples.length<5 || samples.reduce((n,s)=>n+s.duration,0)<10)return null;
  return Math.max(...samples.map(s=>s.bytes*8/s.duration));
}
