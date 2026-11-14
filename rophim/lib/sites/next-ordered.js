export function detectNextOrdered(candidate){
  const {episode}=candidate;
  if(typeof episode.server_type==='string' && (Number.isFinite(episode.episode_order) || episode.episode_order===null && /^(?:tập\s*)?full$/i.test(episode.name)) && Number.isFinite(episode.season_number))return {kind:'next-ordered',...candidate};
  return null;
}
