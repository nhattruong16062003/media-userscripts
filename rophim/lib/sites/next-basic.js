export function detectNextBasic(doc,candidate){
  if(doc.querySelector('.player-frame-stable') && candidate.frame.classList.contains('player-frame-content'))return {kind:'next-basic',...candidate};
  if(Number.isFinite(candidate.episode?.order_index) && candidate.frame?.id==='embed-player')return {kind:'next-basic',...candidate};
  return null;
}
