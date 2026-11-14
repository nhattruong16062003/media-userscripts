export function detectNextBasic(doc,candidate){
  if(doc.querySelector('.player-frame-stable') && candidate.frame.classList.contains('player-frame-content'))return {kind:'next-basic',...candidate};
  return null;
}
