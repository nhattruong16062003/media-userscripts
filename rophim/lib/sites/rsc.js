// Literal JSON parsing only. RSC strings are data; no eval or site-code execution.
export function jsonFragment(text, offset) {
  const start = text[offset];
  if (start !== '{' && start !== '[' && start !== '"') return null;
  let depth = 0, quoted = start === '"', escaped = false;
  for (let i = offset + (quoted ? 1 : 0); i < Math.min(text.length, offset + 1_500_000); i++) {
    const c = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') { quoted = false; if (start === '"') { try { return JSON.parse(text.slice(offset, i + 1)); } catch { return null; } } }
    } else if (c === '"') quoted = true;
    else if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') {
      if (--depth === 0) { try { return JSON.parse(text.slice(offset, i + 1)); } catch { return null; } }
    }
  }
  return null;
}
const rscCache = new WeakMap();
export function rscObjects(doc, page = {}) {
  const scriptTexts = [], pageTexts = [];
  for (const script of doc.querySelectorAll('script:not([src])')) {
    const raw = script.textContent || '';
    if (!raw.includes('__next_f.push')) continue;
    let cached = rscCache.get(script);
    if (!cached || cached.raw !== raw) {
      cached = {raw, texts:[]};
      const re = /self\.__next_f\.push\(\[1,\s*/g;
      for (const match of raw.matchAll(re)) {
        const value = jsonFragment(raw, match.index + match[0].length);
        if (typeof value === 'string') cached.texts.push(value);
      }
      rscCache.set(script, cached);
    }
    scriptTexts.push(...cached.texts);
  }
  // App-router transitions can append RSC data without adding inline script nodes.
  try { for (const item of (page.__next_f || []).slice(-100)) if (Array.isArray(item) && item[0] === 1 && typeof item[1] === 'string') pageTexts.push(item[1]); } catch { /* sandbox */ }
  const result = {episodes:[], movies:[]};
  for (const text of [scriptTexts.join(''), pageTexts.join('')]) {
    if (!text) continue;
    for (const m of text.matchAll(/"(episode|movie)":\s*(?=\{)/g)) {
      const value = jsonFragment(text, m.index + m[0].length);
      if (value && value.id && value.slug && value.name) result[m[1] === 'episode' ? 'episodes' : 'movies'].push(value);
    }
  }
  return result;
}
