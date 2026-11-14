import {startAds} from '../lib/ads.js';
startAds(window,typeof unsafeWindow==='undefined' ? window : unsafeWindow);
