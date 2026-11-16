// Both the native server row and the translation component use this contract.
// A claimed but failed/slow history read must never become a current-time fallback.
function lookupMotchillHistoryProgress(target, options = {}) {
  return new Promise((resolve) => {
    const id = crypto.randomUUID();
    let timer, settled = false, claimed = false;
    const cancel = () => finish({ status: 'cancelled' });
    const finish = (result) => {
      if (settled) return;
      settled = true; clearTimeout(timer); options.pending?.delete(cancel);
      document.removeEventListener('mc-history-resume-response', response);
      options.signal?.removeEventListener('abort', cancel); resolve(result);
    };
    const received = (value) => {
      if (value === null) return finish({ status: 'missing' });
      if (value && Number.isFinite(value.position) && value.position >= 0 && Number.isFinite(value.duration)
        && value.duration > 0 && value.position < value.duration) {
        finish({ status: 'found', value: { position: value.position, duration: value.duration } });
      } else finish({ status: 'error' });
    };
    const response = (event) => {
      let result;
      try { result = JSON.parse(event.detail); } catch (_) { return; }
      if (result?.id !== id) return;
      if (result.error) finish({ status: 'error' }); else received(result.value);
    };
    document.addEventListener('mc-history-resume-response', response);
    options.pending?.add(cancel); options.signal?.addEventListener('abort', cancel, { once: true });
    if (options.signal?.aborted) { cancel(); return; }
    timer = setTimeout(() => {
      const present = claimed || document.getElementById('mh-style') || document.readyState === 'loading';
      finish({ status: options.lookupProgress || present ? 'timeout' : 'unavailable' });
    }, options.lookupTimeout ?? 800);
    if (options.lookupProgress) {
      try { Promise.resolve(options.lookupProgress(target)).then(received, () => finish({ status: 'error' })); }
      catch (_) { finish({ status: 'error' }); }
    } else claimed = !document.dispatchEvent(new CustomEvent('mc-history-resume-request', {
      cancelable: true, detail: JSON.stringify({ id, info: target }),
    }));
  });
}
