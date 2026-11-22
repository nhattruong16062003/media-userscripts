// Permission boundaries only. Website names may change; source contracts select adapters.
export const FRAME_ORIGINS = new Set(['https://player.phimapi.com', 'https://api.clubc.org', 'https://dora.nobitayeuxuka.xyz', 'https://api.rophim10.ink']);
const ROPHIM_HOST = /(^|\.)[a-z\d-]*rophim[a-z\d-]*(?:\.[a-z\d-]+)+$/i;
export function isFrameURL(value) {
  const url=safeURL(value);
  if (!url) return false;
  if (FRAME_ORIGINS.has(url.origin)) return url.origin!=='https://api.rophim10.ink' || /^\/embed\/[1-9]\d*\/?$/.test(url.pathname);
  return ROPHIM_HOST.test(url.hostname) && /^\/embed\/\d+\/[1-9]\d*\/?$/.test(url.pathname);
}
export function isFrameOrigin(value) {
  const url=safeURL(value);
  return !!url && (FRAME_ORIGINS.has(url.origin) || isFrameURL(value));
}
export function safeURL(value, base) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try { const u = new URL(value, base); return u.protocol === 'https:' && !u.username && !u.password ? u : null; } catch { return null; }
}
export function isSiteOrigin(value) {
  const url=safeURL(value);
  return !!url && !FRAME_ORIGINS.has(url.origin) && !isFrameURL(value) && ROPHIM_HOST.test(url.hostname);
}
export const normalize = value => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
export const bounded = (value, max = 200) => String(value || '').slice(0, max);
export {finite,clampSeek} from '../../shared/media.js';
export const token = win => Array.from(win.crypto.getRandomValues(new Uint32Array(4)), x => x.toString(16).padStart(8, '0')).join('');
export function diagnostic(doc, feature, state) {
  const node = doc.documentElement;
  if (node) node.dataset['rp' + feature[0].toUpperCase() + feature.slice(1)] = bounded(state, 160);
}
export function watchDOM(win, callback) {
  let timer = 0;
  const schedule = () => { if (!timer) timer = win.setTimeout(() => { timer = 0; callback(); }, 100); };
  const observer = new win.MutationObserver(records => {
    if (records.some(r => !r.target.closest?.('[data-rp-ui]') && !(r.type === 'attributes' && r.attributeName?.startsWith('data-rp')))) schedule();
  });
  observer.observe(win.document, {subtree:true, childList:true, attributes:true, attributeFilter:['src','class','data-panel']});
  return () => { observer.disconnect(); win.clearTimeout(timer); };
}
export function storageAPI(win) {
  // Deliberately no localStorage fallback: that would silently split cross-origin history.
  return {
    get: (k, d) => typeof GM_getValue === 'function' ? GM_getValue(k, d) : d,
    set: (k, v) => { if (typeof GM_setValue !== 'function') throw new Error('Thiếu quyền lưu userscript'); GM_setValue(k, v); },
    keys: () => typeof GM_listValues === 'function' ? GM_listValues() : [],
    remove: k => { if (typeof GM_deleteValue === 'function') GM_deleteValue(k); },
  };
}
