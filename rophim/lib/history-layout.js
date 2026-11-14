// Content placement follows observed layout contracts, independently of hostname
// and of advertising. Never prepend UI to body or above the site's navigation.
export function historyPlacement(doc,watch=false) {
  if(watch){
    const player=doc.querySelector('#wrapper .watch-player,.watch-player');
    if(player)return {kind:'watch',parent:player.parentElement,after:player};
    const frame=doc.querySelector('.player-ratio iframe#embed-player,iframe#player.player-iframe');
    const ratio=frame?.closest('.player-ratio');
    return ratio?{kind:'watch',parent:ratio.parentElement,after:ratio}:null;
  }
  const hero=doc.querySelector('#top_slider .top-slide-wrap');
  const content=doc.querySelector('#wrapper.wrapper-w-slide > .fluid-gap');
  if(hero && content)return {kind:'cinema',parent:content,before:content.firstElementChild};
  const board=doc.querySelector('#section-first.home-section .container .home-board');
  if(board)return {kind:'landing',parent:board.parentElement,after:board};
  // Unknown layouts wait for a real content region instead of guessing at body.
  const main=doc.querySelector('main');
  if(main && main.querySelector('a[href^="/phim/"],a[href^="/xem-phim/"]')){
    const banner=main.querySelector('.hero,.slideshow,[data-hero]');
    return banner && banner.parentElement===main?{kind:'content',parent:main,after:banner}:{kind:'content',parent:main,before:main.firstElementChild};
  }
  return null;
}
export function placeHistory(node,placement) {
  if(!placement)return false;
  node.dataset.rpLayout=placement.kind;
  if(placement.after){if(node.parentElement!==placement.parent || placement.after.nextElementSibling!==node)placement.after.after(node);}
  else if(node.parentElement!==placement.parent || placement.before && placement.before!==node && node.nextElementSibling!==placement.before){placement.parent.insertBefore(node,placement.before===node?node.nextSibling:placement.before || null);}
  return true;
}
