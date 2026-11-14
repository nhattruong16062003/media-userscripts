import {bounded,normalize,safeURL} from './core.js';

export const identityText=value=>normalize(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();
export function laneKey(value) {
  const text=identityText(value);
  if(['subtitle','vietsub','phu de','vs'].includes(text))return 'subtitle';
  if(['dubbed','long tieng'].includes(text))return 'dubbed';
  if(['voiceover','thuyet minh','tm'].includes(text))return 'voiceover';
  return text;
}
export function episodeKey(value) {
  const text=identityText(value);
  if(/^(full|tap full|trailer)$/.test(text))return text==='trailer'?'trailer':'full';
  const number=text.match(/^(?:(?:tap|episode|ep) )?(\d+)(?: (\d+))?$/);
  return number?String(Number(number[1]))+(number[2]?'.'+Number(number[2]):''):text;
}
export function movieIdentity(movie={}) {
  const type=movie.type==='movie'?'movie':movie.type==='series'?'tv':'';
  return {originalTitle:bounded(movie.origin_name || movie.originalTitle || ''),year:/^(19|20)\d{2}$/.test(String(movie.publish_year || movie.year))?String(movie.publish_year || movie.year):'',mediaType:type,
    externalImdb:/^tt\d+$/.test(movie.imdb_id || '')?movie.imdb_id:'',externalTmdb:type && /^\d+$/.test(String(movie.tmdb_id || ''))?type+':'+movie.tmdb_id:'',poster:bounded(movie.thumbnail || movie.poster || '',2048)};
}
export function sameFilm(a,b) {
  if(!a || !b)return false;
  if(a.year && b.year && a.year!==b.year || a.mediaType && b.mediaType && a.mediaType!==b.mediaType)return false;
  const shared=['externalImdb','externalTmdb'].filter(key=>a[key]&&b[key]);
  if(shared.length)return shared.every(key=>a[key]===b[key]);
  const originalA=identityText(a.originalTitle),originalB=identityText(b.originalTitle);
  if(originalA && originalB && originalA!==originalB)return false;
  if(a.year && b.year && a.year===b.year && (originalA && originalA===originalB || identityText(a.title) && identityText(a.title)===identityText(b.title)))return true;
  // Older local records can still resume on their original source. Internal IDs
  // never establish identity between different source contracts.
  return a.source===b.source && a.movieID===b.movieID && a.movie===b.movie && !!safeURL(a.url) && safeURL(a.url).origin===safeURL(b.url)?.origin;
}
export function sameEpisode(a,b) {
  return sameFilm(a,b) && String(a.season)===String(b.season) && laneKey(a.lane)===laneKey(b.lane) && !!episodeKey(a.episode) && episodeKey(a.episode)===episodeKey(b.episode);
}
