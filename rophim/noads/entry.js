import {startAds} from '../lib/ads.js';
import {FRAME_ORIGINS,isFrameURL,isSiteOrigin,safeURL} from '../lib/core.js';
import {runFamily} from '../../shared/bridge/ownership.js';
import {installNavigationGuard} from '../../shared/navigation/guard.js';
runFamily(window,{family:'rophim',feature:'noads',isSiteURL:isSiteOrigin,isFrameURL,isFrameOrigin:value=>FRAME_ORIGINS.has(safeURL(value)?.origin)},()=>{
 const page=typeof unsafeWindow==='undefined' ? window : unsafeWindow;
 installNavigationGuard(window,page,{isMediaFrame:frame=>isFrameURL(frame.src)});
 startAds(window,page);
});
