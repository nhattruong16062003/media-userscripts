export function uiStyle(doc) {
  if (doc.getElementById('rp-ui-style')) return;
  const style = doc.createElement('style');style.id = 'rp-ui-style';
  style.textContent = `[data-rp-ui]{font:13px/1.5 system-ui,sans-serif;color:#fff;box-sizing:border-box}[data-rp-ui] button,[data-rp-ui] a{font:inherit;cursor:pointer;background:#202735;color:#fff;border:1px solid #68758a;border-radius:6px;padding:6px 9px;text-decoration:none}[data-rp-ui] button:disabled{opacity:.45;cursor:default}[data-rp-ui] button:focus-visible,[data-rp-ui] a:focus-visible{outline:2px solid #ffe08a;outline-offset:2px}[data-rp-ui] input{font:inherit;color:#fff;background:#202735;border:1px solid #68758a;border-radius:4px;width:65px;padding:4px}.rp-tools{position:absolute;top:8px;right:8px;z-index:2147483645;max-width:calc(100% - 16px)}.rp-row{display:flex;flex-wrap:wrap;gap:5px;align-items:center;padding:7px;background:#101722ed;border-radius:8px;max-width:600px}.rp-tools>summary{cursor:pointer;list-style:none;background:#101722c9;border:1px solid #68758a;border-radius:6px;width:32px;text-align:center;padding:3px}.rp-toast{display:block;max-width:320px;background:#101722e8;border-radius:6px;margin-top:4px;padding:3px 6px}.rp-page{position:fixed;bottom:14px;left:14px;z-index:2147483645}.rp-panel{position:fixed;inset:8vh max(12px,calc((100vw - 720px)/2));z-index:2147483646;overflow:auto;background:#101722;border:1px solid #68758a;border-radius:12px;padding:14px;box-shadow:0 12px 60px #0009;max-height:84vh}.rp-panel article{padding:10px 0;border-bottom:1px solid #394457}.rp-panel p{margin:4px 0}.rp-panel a{display:inline-block;margin:4px 5px 4px 0}`;
  style.textContent+='[data-rp-ui][hidden],[data-rp-ui] [hidden]{display:none!important}';
  (doc.head || doc.documentElement).append(style);
}
export function makeButton(doc, label, action, parent) {
  const b = doc.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();action(event);});parent?.append(b);return b;
}
export function toast(host, text) {
  let node = host.querySelector('.rp-toast');
  if (!node) { node=host.ownerDocument.createElement('output');node.className='rp-toast';node.setAttribute('aria-live','polite');host.append(node); }
  node.textContent=text;
}
export function toolsHost(root) {
  const doc=root.ownerDocument;uiStyle(doc);
  const host=doc.createElement('details');host.dataset.rpUi='controls';host.className='rp-tools';
  const summary=doc.createElement('summary');summary.textContent='RP';summary.title='Thao tác RoPhim';host.append(summary);
  const row=doc.createElement('div');row.className='rp-row';host.append(row);
  if (doc.defaultView.getComputedStyle(root).position === 'static') { root.style.position='relative'; }
  root.append(host);return {host,row};
}
