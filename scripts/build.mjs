import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {build} from 'esbuild';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const check=process.argv.includes('--check');
const repository='https://github.com/nhattruong16062003/media-userscripts';
const raw='https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/refs/heads/main';
const license='/*\n'+await readFile(path.join(root,'LICENSE.lucide'),'utf8')+'\n*/\n';
async function save(file,text){
  const output=text.replace(/\r\n/g,'\n');
  new vm.Script(output,{filename:file});
  const dest=path.join(root,file);
  if(check){if(await readFile(dest,'utf8')!==output)throw Error('Needs rebuild: '+file);}
  else{await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,output);}
  console.log((check?'Verified ':'Built ')+file);
}
const shared=await build({absWorkingDir:root,entryPoints:['shared/player/index.js'],bundle:true,write:false,format:'iife',globalName:'SharedPlayer',target:'es2020',legalComments:'inline'});
const ownership=await build({absWorkingDir:root,entryPoints:['shared/bridge/ownership.js'],bundle:true,write:false,format:'iife',globalName:'MediaSiteOwner',target:'es2020',legalComments:'inline'});
const navigationGuard=await build({absWorkingDir:root,entryPoints:['shared/navigation/guard.js'],bundle:true,write:false,format:'iife',globalName:'MediaNavigation',target:'es2020',legalComments:'inline'});
// Adapter fragments are inserted within the existing site factory's scope.
// Keep that lexical boundary: website data cannot choose executable imports.
const adapterFragments=new Map();
for(const name of await readdir(path.join(root,'motchill/lib/sites')))if(name!=='index.js' && name.endsWith('.js'))adapterFragments.set(name,await readFile(path.join(root,'motchill/lib/sites',name),'utf8'));
let sites=await readFile(path.join(root,'motchill/lib/sites/index.js'),'utf8');
sites=sites.replace(/\/\/ @include ([a-z-]+\.js)/g,(_all,name)=>`/* adapter:${name} */\n${adapterFragments.get(name)}`);

function metadata(site,kind,version,old){
  const download=`${raw}/${site}/${kind}/${site}-${kind}.user.js`;
  return old.replace(/^(\/\/ @version\s+).*$/m,(_,prefix)=>prefix+version)
    .replace(/^(\/\/ @(?:updateURL|downloadURL)\s+).*$/gm,(_,prefix)=>prefix+download)
    .replace(/^(\/\/ @homepageURL\s+).*$/m,(_,prefix)=>prefix+repository+'/'+(site==='motchill'?'tree/main/motchill': 'tree/main/rophim'))
    .replace(/^(\/\/ @supportURL\s+).*$/m,(_,prefix)=>prefix+repository+'/issues');
}
await save('motchill/lib/sites.js','// Generated from lib/sites/index.js and family fragments; do not edit.\n'+sites);
for(const kind of ['noads','gestures','history','source']){
  if(kind!=='source'){
  const {version}=JSON.parse(await readFile(path.join(root,'rophim/package.json'),'utf8')),title={noads:'Chặn quảng cáo',gestures:'Thao tác trình phát',history:'Lịch sử xem'}[kind];
  const header=['// ==UserScript==',`// @name         RoPhim — ${title}`,'// @namespace    rophim-userscripts.local',`// @version      ${version}`,'// @author       zic',`// @description  ${title} cho trang xem RoPhim.`,`// @homepageURL  ${repository}/tree/main/rophim`,`// @supportURL   ${repository}/issues`,`// @downloadURL  ${raw}/rophim/${kind}/rophim-${kind}.user.js`,`// @updateURL    ${raw}/rophim/${kind}/rophim-${kind}.user.js`,String.raw`// @include      /^https:\/\/(?:[a-z0-9-]+\.)*[a-z0-9-]*rophim[a-z0-9-]*(?:\.[a-z0-9-]+)+(?::\d+)?\//`,...['https://player.phimapi.com/player/*','https://api.clubc.org/embed/*','https://api.rophim10.ink/embed/*','https://dora.nobitayeuxuka.xyz/temp*'].map(v=>'// @match        '+v),'// @run-at       document-start','// @grant        unsafeWindow',...(kind==='noads'?[]:['GM_getValue','GM_setValue','GM_listValues','GM_deleteValue'].map(v=>'// @grant        '+v)),'// ==/UserScript=='].join('\n');
  const output=await build({absWorkingDir:root,entryPoints:[`rophim/${kind}/entry.js`],bundle:true,write:false,format:'iife',target:'es2020',legalComments:'inline',treeShaking:false});
  await save(`rophim/${kind}/rophim-${kind}.user.js`,header+'\n\n'+(kind==='gestures'?license:'')+output.outputFiles[0].text);
  }
  const entry=await readFile(path.join(root,`motchill/${kind}/entry.js`),'utf8');
  let headerMotchill=entry.slice(0,entry.indexOf('// ==/UserScript==')+'// ==/UserScript=='.length);
  const mcVersion=JSON.parse(await readFile(path.join(root,'motchill/package.json'),'utf8')).version;
  headerMotchill=metadata('motchill',kind,mcVersion,headerMotchill);
  const libs=['sites.js','video-bridge.js',...(kind==='gestures'?['history-resume.js','episode-machine.js','player-adapters.js','player-controller.js','next-provider-navigation.js','translations.js','custom-player.js']:[])];
  const body=[];
  for(const file of libs)body.push('// ---- lib/'+file+' ----\n'+(file==='sites.js'?sites:await readFile(path.join(root,'motchill/lib',file),'utf8')));
  const start=entry.indexOf('// BEGIN MOTCHILL SITES (generated)'),end=entry.indexOf('// END MOTCHILL SITES')+'// END MOTCHILL SITES'.length;
  if(start<0 || end<'// END MOTCHILL SITES'.length)throw Error('Missing library marker: '+kind);
  let tail=entry.slice(end);
  const entryMarker='  sites.runWhenAllowed(() => {';
  if(!tail.includes(entryMarker))throw Error('Missing family entry: '+kind);
  tail=tail.replace(entryMarker,`  MediaSiteOwner.runFamily(window,{family:'motchill',feature:'${kind}',isSiteURL:value=>{const parsed=sites.url(value);return !!parsed && sites.isMotchill(parsed.hostname);},isFrameURL:value=>sites.knownEmbedPage(value),isFrameOrigin:value=>{const parsed=sites.url(value);return !!parsed && sites.embedHosts.has(parsed.hostname);}},()=>{\n${entryMarker}`);
  tail=tail.replace(/\}\)\(\);\s*$/, '});\n})();');
  const prefix=entry.slice(entry.indexOf('// ==/UserScript==')+'// ==/UserScript=='.length,start);
  await save(`motchill/${kind}/motchill-${kind}.user.js`,headerMotchill+prefix+ownership.outputFiles[0].text+(kind==='noads'?navigationGuard.outputFiles[0].text:'')+'// BEGIN MOTCHILL SITES (generated)\n'+(kind==='gestures'?license+shared.outputFiles[0].text:'')+body.join('\n\n')+'\n// END MOTCHILL SITES'+tail);
}
