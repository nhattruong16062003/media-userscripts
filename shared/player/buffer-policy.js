// Verified hls.js 1.7.3 rule: min(max(byte floor, seconds), seconds ceiling).
// maxBufferSize is NOT a hard memory cap. Never call it one or increase it.
export function hlsBufferTarget(config,bitrate){
  if(!(bitrate>0) || !Number.isFinite(config.maxBufferSize) || config.maxBufferSize<=0 || !Number.isFinite(config.maxBufferLength) || config.maxBufferLength<=0 || !Number.isFinite(config.maxMaxBufferLength) || config.maxMaxBufferLength<config.maxBufferLength)return null;
  return Math.min(Math.max(config.maxBufferLength,8*config.maxBufferSize/bitrate),config.maxMaxBufferLength);
}
export function bufferExpansionPlan(config,bitrate,otherBufferedSeconds=0){
  const native=hlsBufferTarget(config,bitrate);if(native===null)return null;
  if(!Number.isFinite(otherBufferedSeconds) || otherBufferedSeconds<0)return null;
  // Native maxBufferSize is a minimum forward target, not a maximum allocation.
  // Keep all native quota handling and maxBufferSize unchanged. Bound the
  // EXTRA estimated data to 16 MiB (15% bitrate margin), all cached ranges to
  // 96 MiB, and the time target to four minutes. Preserve a larger native goal.
  const bytesPerSecond=bitrate*1.15/8;
  const target=Math.floor(Math.min(240,native+60,native+16*1024*1024/bytesPerSecond,96*1024*1024/bytesPerSecond-otherBufferedSeconds));
  if(target<native+10)return null;
  return {before:{maxBufferLength:config.maxBufferLength,maxMaxBufferLength:config.maxMaxBufferLength},after:{maxBufferLength:Math.max(config.maxBufferLength,target),maxMaxBufferLength:Math.max(config.maxMaxBufferLength,target)}};
}
