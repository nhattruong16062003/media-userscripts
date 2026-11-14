import {startAds} from '../lib/ads.js';
import {FRAME_ORIGINS,isSiteOrigin,safeURL} from '../lib/core.js';
import {runFamily} from '../../shared/bridge/ownership.js';
runFamily(window,{family:'rophim',feature:'noads',isSiteURL:isSiteOrigin,isFrameURL:value=>FRAME_ORIGINS.has(safeURL(value)?.origin),isFrameOrigin:value=>FRAME_ORIGINS.has(safeURL(value)?.origin)},()=>startAds(window,typeof unsafeWindow==='undefined' ? window : unsafeWindow));
