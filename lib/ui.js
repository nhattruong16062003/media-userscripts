export function uiStyle(doc) {
  if (doc.getElementById('rp-ui-style')) return;
  const style = doc.createElement('style');style.id = 'rp-ui-style';
  style.textContent = `[data-rp-ui]{font:13px/1.5 system-ui,sans-serif;color:#fff;box-sizing:border-box}[data-rp-ui] button,[data-rp-ui] a{font:inherit;cursor:pointer;background:#202735;color:#fff;border:1px solid #68758a;border-radius:6px;padding:6px 9px;text-decoration:none}[data-rp-ui] button:disabled{opacity:.45;cursor:default}[data-rp-ui] button:focus-visible,[data-rp-ui] a:focus-visible{outline:2px solid #ffe08a;outline-offset:2px}[data-rp-ui] input{font:inherit;color:#fff;background:#202735;border:1px solid #68758a;border-radius:4px;width:65px;padding:4px}.rp-tools{position:absolute;top:8px;right:8px;z-index:2147483645;max-width:calc(100% - 16px)}.rp-row{display:flex;flex-wrap:wrap;gap:5px;align-items:center;padding:7px;background:#101722ed;border-radius:8px;max-width:600px}.rp-tools>summary{cursor:pointer;list-style:none;background:#101722c9;border:1px solid #68758a;border-radius:6px;width:32px;text-align:center;padding:3px}.rp-toast{display:block;max-width:320px;background:#101722e8;border-radius:6px;margin-top:4px;padding:3px 6px}.rp-page{position:fixed;bottom:14px;left:14px;z-index:2147483645}.rp-panel{position:fixed;inset:8vh max(12px,calc((100vw - 720px)/2));z-index:2147483646;overflow:auto;background:#101722;border:1px solid #68758a;border-radius:12px;padding:14px;box-shadow:0 12px 60px #0009;max-height:84vh}.rp-panel article{padding:10px 0;border-bottom:1px solid #394457}.rp-panel p{margin:4px 0}.rp-panel a{display:inline-block;margin:4px 5px 4px 0}`;
  style.textContent+='[data-rp-ui][hidden],[data-rp-ui] [hidden]{display:none!important}';
  style.textContent+='.rp-continue{position:relative;margin:90px 16px 20px;padding:16px;background:#101722;color:#fff;border:1px solid #394457;border-radius:12px;z-index:1}.rp-continue h2{font-size:21px;margin:0 0 12px}.rp-continue h3{font-size:16px;margin:0 0 6px}.rp-history-cards{display:flex;gap:12px;overflow-x:auto;padding:4px 0 10px}.rp-history-cards article{flex:0 0 250px;padding:12px;border:1px solid #394457;border-radius:8px}.rp-history-cards a{display:inline-block;margin:8px 0 0}.rp-history-cards p{margin:4px 0 10px}';
  style.textContent+='[data-rp-custom-controls="1"] .art-bottom,[data-rp-custom-controls="1"] .art-mask,[data-rp-custom-controls="1"] .art-settings,[data-rp-custom-controls="1"] .art-contextmenus,[data-rp-custom-controls="1"] .art-layer-lock,[data-rp-custom-controls="1"] .art-layer-fastForward,[data-rp-custom-controls="1"] .jw-controls,[data-rp-custom-controls="1"] .jw-settings-menu,[data-rp-custom-controls="1"] .jw-rightclick,[data-rp-custom-controls="1"] .guildline{display:none!important;pointer-events:none!important}[data-rp-custom-controls="1"] .loading-screen{pointer-events:none!important}.rp-player-shell{position:absolute;inset:0;z-index:2147483642;pointer-events:none}.rp-gesture-surface{position:absolute;inset:0;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}.rp-player-chrome{position:absolute;bottom:0;left:0;right:0;padding:9px;background:linear-gradient(transparent,#000d);pointer-events:auto}.rp-player-line{display:flex;gap:6px;align-items:center}.rp-player-line button,.rp-unlock{min-height:44px;min-width:44px}.rp-player-time{flex:1;text-align:center;font-size:12px}.rp-player-chrome input[type="range"]{display:block;width:100%;box-sizing:border-box;margin:7px 0 0;min-height:32px;padding:0;accent-color:#ffe08a;touch-action:none}.rp-unlock{position:absolute;left:10px;top:10px;pointer-events:auto;background:#101722ed!important}.rp-player-shell>.rp-toast{position:absolute;top:12px;left:50%;transform:translateX(-50%);pointer-events:none}.rp-player-shell [hidden],.rp-player-shell [hidden].rp-unlock{display:none!important}';
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
