import {audioPreference} from '../media.js';

// Preferences are local to the product's watch-page origin, independent of
// cross-site history. Storage failures must never affect movie playback.
export function audioPreferenceStore(storage,key){
  let saved=null;
  try{const value=JSON.parse(storage?.getItem(key) || 'null');if(value?.version===1)saved=audioPreference(value);}catch{/* unavailable or malformed storage */}
  return {
    read:()=>saved && {...saved},
    write(value){const next=audioPreference(value);if(!next)return false;if(saved && next.muted===saved.muted && next.volume===saved.volume)return true;saved=next;try{storage?.setItem(key,JSON.stringify({version:1,...next}));}catch{/* retain the choice for this document */}return true;},
  };
}

export function audioPreferenceSession(win,player,store){
  let attempted=false,learning=false;
  const source=player.fingerprint?.();
  const current=()=>!source || source===player.fingerprint?.();
  const sound=()=>player.audio?.() || {muted:player.video.muted,volume:player.video.volume};
  return {
    checkpoint(state,enabled){
      if(!enabled || !current() || !state.ready || state.ad)return;
      const value=audioPreference(sound()),saved=store.read();
      // Capture the current volume on reload, but never turn a denied restore
      // or an unacknowledged remote command into a new user mute preference.
      if(value && (!saved && !value.muted && value.volume>0 || saved && value.muted===saved.muted))store.write(value);
    },
    intent(muted){
      if(!current() || !player.state().ready || player.state().ad)return;
      attempted=true;learning=false;const value=sound(),volume=Number.isFinite(value.volume)?value.volume:1;
      store.write({muted,volume:!muted && volume<=0?1:volume});
    },
    update(state,enabled){
      if(!enabled || !current() || !state.ready || state.ad || state.paused || !state.played || win.document.hidden)return;
      const saved=store.read();
      if(!attempted){
        attempted=true;
        // Audio only: never issue Play/Pause, retry, or show a permission prompt.
        if(saved)try{player.command('restore-audio',saved);}catch{/* a denied unmute is ignored */}
      }
      if(!saved || learning){const value=audioPreference(sound());if(value && !value.muted && value.volume>0){learning=true;store.write(value);}}
    },
  };
}
