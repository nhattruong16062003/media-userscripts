// Approved player design. Local SVG assets; no icon CDN or runtime dependency.
export function playerIcon(name) {
  // Play/pause and chevrons: Lucide 1.72.0 (LICENSE.lucide).
  // Filled toolbar geometry and simple locks follow the user's reference.
  const paths={
    play:"<path d=\"M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z\" />",
    pause:"<rect x=\"14\" y=\"3\" width=\"5\" height=\"18\" rx=\"1\" /><rect x=\"5\" y=\"3\" width=\"5\" height=\"18\" rx=\"1\" />",
    forward:"<path d=\"m6 17 5-5-5-5\" /><path d=\"m13 17 5-5-5-5\" />",
    back:"<path d=\"m11 17-5-5 5-5\" /><path d=\"m18 17-5-5 5-5\" />",
    close:"<path d=\"M18 6 6 18\" /><path d=\"m6 6 12 12\" />",
  };
  const filled={
    next:'<path d="M18 4h3v16h-3zM3 4l13 8-13 8z"/>',
    volume:'<path d="M3 9h4l6-5v16l-6-5H3zM15 8v2a2.5 2.5 0 0 1 0 4v2a4.5 4.5 0 0 0 0-8zm0-4v2a6.5 6.5 0 0 1 0 12v2a8.5 8.5 0 0 0 0-16z"/>',
    muted:'<path d="M3 9h4l6-5v16l-6-5H3zm12-1 3 3 3-3 1 1-3 3 3 3-1 1-3-3-3 3-1-1 3-3-3-3z"/>',
    settings:'<path fill-rule="evenodd" d="m10 2-.7 3-1.5.9-3-.9-2 3.5L5 10.7v2.6l-2.2 2.2 2 3.5 3-.9 1.5.9.7 3h4l.7-3 1.5-.9 3 .9 2-3.5-2.2-2.2v-2.6l2.2-2.2-2-3.5-3 .9-1.5-.9L14 2zm2 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>',
    fullscreen:'<path d="M14 3h7v7l-2.5-2.5-4 4-2-2 4-4zM3 14l2.5 2.5 4-4 2 2-4 4L10 21H3z"/>',
    shrink:'<path d="m21 3-5.5 5.5L13 6v7h7l-2.5-2.5L23 5zM3 21l5.5-5.5L11 18v-7H4l2.5 2.5L1 19z"/>',
  };
  const simple={lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',unlock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>'};
  const solid=Object.hasOwn(filled,name);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="${solid?'currentColor':'none'}" stroke="${solid?'none':'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${filled[name] || (simple[name]?`<g transform="translate(0 -1.3)">${simple[name]}</g>`:paths[name]) || ''}</svg>`;
}
export function playerUIStyle(doc) {
  if(doc.getElementById('rp-player-style'))return;
  const style=doc.createElement('style');style.id='rp-player-style';
  style.textContent=`
  html[data-rp-controls-boot] .art-notice,html[data-rp-controls-boot] .art-info,html[data-rp-controls-boot] .art-loading,html[data-rp-controls-boot] .art-layer-auto-playback,html[data-rp-controls-boot] .jw-title,html[data-rp-controls-boot] .jw-logo,html[data-rp-controls-boot] .jw-error-msg,html[data-rp-controls-boot] .jw-nextup-container,html[data-rp-controls-boot] .art-bottom,html[data-rp-controls-boot] .art-mask,html[data-rp-controls-boot] .art-vtitle-bar,html[data-rp-controls-boot] .art-settings,html[data-rp-controls-boot] .art-contextmenus,html[data-rp-controls-boot] .art-layer-lock,html[data-rp-controls-boot] .art-layer-fastForward,html[data-rp-controls-boot] .art-layer-autoOrientation,html[data-rp-controls-boot] .jw-controls,html[data-rp-controls-boot] .jw-settings-menu,html[data-rp-controls-boot] .jw-rightclick,html[data-rp-controls-boot] .jw-display,html[data-rp-controls-boot] .guildline,html[data-rp-controls-boot] .loading-screen{display:none!important;pointer-events:none!important}
  html[data-rp-controls-boot] video::-webkit-media-controls{display:none!important}
  html[data-rp-frame-guard] .player-ratio iframe#embed-player:not([data-rp-display="custom"]),html[data-rp-frame-guard] iframe#player.player-iframe:not([data-rp-display="custom"]){opacity:0!important;pointer-events:none!important}
  [data-rp-frame-host]{position:relative}[data-rp-frame-host]:fullscreen{width:100%;height:100%;background:#000;overflow:hidden}[data-rp-frame-host]:fullscreen>iframe{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:0!important}
  .rp-watch-loading{position:absolute;inset:0;z-index:2147483645;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#000;color:#fff;font:14px/1.4 Arial,sans-serif;pointer-events:auto}.rp-watch-loading.rp-loading-fixed{position:fixed}.rp-watch-loading [hidden]{display:none!important}.rp-loading-retry{font:inherit;padding:8px 18px;border:1px solid #ffffff55;border-radius:6px;background:#ffffff18;color:#fff;cursor:pointer;min-height:42px}.rp-watch-spinner{width:28px;height:28px;border:2px solid #ffffff38;border-top-color:#fff;border-radius:50%;animation:rp-watch-spin .8s linear infinite}@keyframes rp-watch-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.rp-watch-spinner{animation:none}}
  [data-rp-custom-controls="1"] .art-bottom,[data-rp-custom-controls="1"] .art-mask,[data-rp-custom-controls="1"] .art-vtitle-bar,[data-rp-custom-controls="1"] .art-settings,[data-rp-custom-controls="1"] .art-contextmenus,[data-rp-custom-controls="1"] .art-layer-lock,[data-rp-custom-controls="1"] .art-layer-fastForward,[data-rp-custom-controls="1"] .jw-controls,[data-rp-custom-controls="1"] .jw-settings-menu,[data-rp-custom-controls="1"] .jw-rightclick,[data-rp-custom-controls="1"] .guildline{display:none!important;pointer-events:none!important}
  [data-rp-custom-controls="1"] .loading-screen{pointer-events:none!important}
  [data-rp-ui="player"].rp-player-shell{position:absolute;inset:0;z-index:2147483642;pointer-events:none;font:14px/1.4 Arial,sans-serif;color:#fff;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
  .rp-player-shell *{box-sizing:border-box}.rp-player-shell[hidden],.rp-player-shell [hidden]{display:none!important}
  .rp-player-shell button{font:inherit;color:#fff;cursor:pointer;touch-action:manipulation}.rp-player-shell button:focus-visible,.rp-player-shell input:focus-visible{outline:2px solid #fff;outline-offset:2px}.rp-player-shell button:disabled{cursor:default}
  .rp-gesture-surface{position:absolute;inset:0;pointer-events:auto;touch-action:none}
  .rp-player-shell .rp-icon{display:inline-flex;align-items:center;justify-content:center;min-width:40px;min-height:40px;margin:0;padding:8px;border:0;border-radius:0;background:transparent;color:#eee;pointer-events:auto}.rp-player-shell .rp-icon svg{width:20px;height:20px}
  .rp-player-shell .rp-center-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:grid;place-items:center;width:60px;height:60px;padding:12px;border-radius:50%;background:rgba(0,0,0,.5);box-shadow:0 2px 14px rgba(0,0,0,.35);color:#fff}.rp-player-shell .rp-center-play svg{width:36px;height:36px;stroke-width:2.5;fill:currentColor;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}
  .rp-player-chrome{position:absolute;bottom:0;left:0;right:0;padding:12px 12px 2px;background:linear-gradient(transparent,rgba(0,0,0,.8));pointer-events:auto}
  .rp-player-timeline{display:flex;align-items:center;height:18px}.rp-player-shell input[type="range"]{appearance:none;-webkit-appearance:none;display:block;width:100%;height:4px;margin:0;padding:0;border:0;border-radius:1px;background:linear-gradient(to right,#fff 0%,#fff var(--rp-played,0%),#626262 var(--rp-played,0%),#626262 100%);touch-action:none;cursor:ew-resize}.rp-player-shell input[type="range"]::-webkit-slider-thumb{appearance:none;width:10px;height:10px;border:0;border-radius:50%;background:#fff}.rp-player-shell input[type="range"]::-moz-range-thumb{width:10px;height:10px;border:0;border-radius:50%;background:#fff}
  .rp-player-line{display:flex;align-items:center;gap:0;min-height:42px}.rp-player-time{font:12px/1 Arial,sans-serif;white-space:nowrap;font-variant-numeric:tabular-nums;color:#eee}.rp-player-spacer{flex:1}
  .rp-player-line .rp-icon[data-rp-status="true"]{max-width:160px;font-size:12px;line-height:1.2;white-space:normal}
  .rp-player-shell .rp-pill{color:#fff;font:500 14px sans-serif;border:.5px solid rgba(255,255,255,.28);border-radius:999px;background:rgba(255,255,255,.12);backdrop-filter:blur(10px) saturate(140%);-webkit-backdrop-filter:blur(10px) saturate(140%);padding:6px 14px;display:flex;align-items:center;gap:6px;white-space:nowrap}
  .rp-context-action{position:absolute;right:16px;bottom:68px;min-height:32px;pointer-events:auto}.rp-context-action svg{width:16px;height:16px}
  .rp-player-shell .rp-lock{position:absolute;left:48px;top:50%;transform:translateY(-50%);width:48px;height:48px;padding:0;border-radius:50%;background:rgba(0,0,0,.12);border:.5px solid rgba(255,255,255,.35);color:#fff}.rp-player-shell .rp-lock svg{width:24px;height:24px}
  .rp-feedback-seek{position:absolute;top:40%;left:78%;transform:translate(-50%,-50%);pointer-events:none}.rp-feedback-seek svg{width:16px;height:16px}.rp-feedback-seek[data-side="right"] svg{animation:rp-nudge-right .35s ease-out}.rp-feedback-seek[data-side="left"] svg{animation:rp-nudge-left .35s ease-out}
  .rp-feedback-hold{position:absolute;left:50%;top:12%;transform:translate(-50%,-50%);pointer-events:none}.rp-chevrons{display:flex}.rp-chevrons svg{width:9px;height:12px;fill:currentColor;stroke-width:0;margin-left:-1px;opacity:.3;animation:rp-run 1s ease-in-out infinite}.rp-chevrons svg:nth-child(2){animation-delay:.15s}.rp-chevrons svg:nth-child(3){animation-delay:.3s}
  .rp-player-settings{position:absolute;bottom:64px;right:16px;z-index:2;width:200px;max-height:70%;overflow-y:auto;padding:4px 12px 10px;border:0;border-radius:2px;background:#1a1a1a;color:#fff;pointer-events:auto}.rp-player-settings-header{display:flex;align-items:center;justify-content:space-between;font-size:13px}.rp-player-speed-options{display:flex;flex-wrap:wrap;gap:4px}.rp-player-shell .rp-speed{padding:6px 10px;min-height:38px;border:0;border-radius:2px;background:#303030;color:#eee;font-size:13px}.rp-player-shell .rp-speed[aria-pressed="true"]{background:#555}.rp-track-label{font-size:13px;margin:10px 0 4px}.rp-player-tracks .rp-speed{margin:2px}
  .rp-player-error{position:absolute;bottom:76px;left:12px;right:12px;padding:6px 10px;border-radius:4px;background:#151515ed;color:#fff;font-size:12px;pointer-events:none}
  .rp-player-shell[data-rp-chrome="false"] .rp-player-chrome,.rp-player-shell[data-rp-chrome="false"] .rp-center-play,.rp-player-shell[data-rp-chrome="false"][data-rp-locked="false"] .rp-lock,.rp-player-shell[data-rp-locked="true"] .rp-player-chrome,.rp-player-shell[data-rp-locked="true"] .rp-center-play{visibility:hidden;pointer-events:none}
  @keyframes rp-run{0%,100%{opacity:.3;transform:translateX(0)}35%{opacity:1;transform:translateX(2px)}}@keyframes rp-nudge-right{from{transform:translateX(-4px);opacity:.3}to{transform:none;opacity:1}}@keyframes rp-nudge-left{from{transform:translateX(4px);opacity:.3}to{transform:none;opacity:1}}
  @media(max-width:480px){.rp-player-shell .rp-lock{left:24px}.rp-player-chrome{padding:8px 8px 0}.rp-player-shell .rp-icon:not(.rp-center-play):not(.rp-lock){min-width:36px;padding:6px}.rp-player-time{font-size:11px}.rp-player-line[data-rp-next-status="true"] .rp-player-time{display:none}.rp-player-shell .rp-pill{font-size:13px}}
  @media(pointer:coarse){.rp-player-shell .rp-icon{min-width:44px;min-height:44px}.rp-player-timeline{height:24px}.rp-context-action{bottom:76px;min-height:38px}.rp-player-settings{bottom:74px}}
  @media(prefers-reduced-motion:reduce){.rp-chevrons svg,.rp-feedback-seek svg{animation:none;opacity:1}}
  `;
  (doc.head || doc.documentElement).append(style);
}
export function playerStartupGuard(win){
  const doc=win.document;playerUIStyle(doc);doc.documentElement.dataset.rpControlsBoot='1';
  const suppress=()=>{for(const video of doc.querySelectorAll('video[controls]'))video.removeAttribute('controls');};
  const observer=new win.MutationObserver(suppress);
  observer.observe(doc,{childList:true,subtree:true,attributes:true,attributeFilter:['controls']});suppress();
  return ()=>{observer.disconnect();delete doc.documentElement.dataset.rpControlsBoot;};
}
