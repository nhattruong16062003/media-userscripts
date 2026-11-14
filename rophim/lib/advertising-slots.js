// Shared advertising DOM evidence only; never used to select site/player adapters.
export function sponsorDirectories(doc) {
  return [...doc.querySelectorAll('.topics-list.topics-grid')].filter(node=>{
    const headings=[...node.querySelectorAll('.heading-sm,.heading-md,h2,h3')];
    const named=headings.some(heading=>/nhà\s+(?:cái|tài\s+trợ)\s+uy\s+tín/i.test(heading.textContent || ''));
    // The named directory plus dedicated sponsor cards remains identifiable
    // before/after Revive fills a slot, without depending on the ad destination.
    return named && !!node.querySelector('.row-topic.adserver,.row-topic-ad,ins[data-revive-id]') && !node.querySelector('video,audio,iframe#embed-player,iframe#player,.server-picker,form,a.row-topic:not(.adserver):not(.row-topic-ad)');
  });
}
