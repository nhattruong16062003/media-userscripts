import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const version='0.2.0';
const shared=['core','identity','sites','players','bridge','ui'];
const bundles={noads:['core','ads'],gestures:[...shared,'gestures','custom-controls'],history:[...shared,'history','history-navigation']};
const matches=['https://player.phimapi.com/player/*','https://api.clubc.org/embed/*','https://dora.nobitayeuxuka.xyz/temp*'];
const siteInclude=String.raw`/^https:\/\/(?:[a-z0-9-]+\.)*[a-z0-9-]*rophim[a-z0-9-]*(?:\.[a-z0-9-]+)+(?::\d+)?\//`;
const repository='https://github.com/nhattruong16062003/rophim-userscripts';
const downloads='https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/refs/heads/main/dist';
await mkdir(path.join(root,'dist'),{recursive:true});
for(const [name,libraries] of Object.entries(bundles)){
  const sources=await Promise.all([...libraries.map(lib=>`lib/${lib}.js`),`source/rophim-${name}.js`].map(async file=>`// ---- ${file} ----\n`+(await readFile(path.join(root,file),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'')));
  const grants=['unsafeWindow',...(name==='noads'?[]:['GM_getValue','GM_setValue','GM_listValues','GM_deleteValue'])];
  const title={noads:'Chặn quảng cáo',gestures:'Thao tác trình phát',history:'Lịch sử xem'}[name];
  const header=['// ==UserScript==',`// @name         RoPhim — ${title}`,'// @namespace    rophim-userscripts.local',`// @version      ${version}`,'// @author       zic',`// @description  ${title} cho trang xem RoPhim.`,`// @homepageURL  ${repository}`,`// @supportURL   ${repository}/issues`,`// @downloadURL  ${downloads}/rophim-${name}.user.js`,`// @updateURL    ${downloads}/rophim-${name}.user.js`,'// @include      '+siteInclude,...matches.map(m=>'// @match        '+m),'// @run-at       document-start',...grants.map(g=>'// @grant        '+g),'// ==/UserScript=='];
  const result=header.join('\n')+'\n\n(function () {\n\'use strict\';\n'+sources.join('\n\n')+'\n})();\n';
  new vm.Script(result,{filename:`rophim-${name}.user.js`});
  await writeFile(path.join(root,`dist/rophim-${name}.user.js`),result);
  console.log(`Built rophim-${name}.user.js (${Buffer.byteLength(result)} bytes)`);
}
