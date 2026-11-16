// Pipeline dùng chung cho bấm tay, mốc 90 giây và ended. Hook player chỉ được
// resolve activate sau khi đã xác nhận đúng tập, seek 0 và phát thực tế.
// Riêng engine giữ nguyên document có thể xác nhận trong commit: khung chuẩn
// bị chỉ cung cấp playlist, không cần khởi động một video thứ hai rồi bỏ nó.
function createMotchillEpisodeMachine(hooks, options = {}) {
  const timeoutMs = options.timeoutMs ?? 20000;
  const noticeMs = options.noticeMs ?? 8000;
  const now = options.now || Date.now;
  let generation = 0;
  let context = '';
  let next = null;
  let nextKey = '';
  let prepared = null;
  let warming = null;
  let switching = null;
  let attemptedAuto = false;
  let attemptedEnd = false;
  let warmAttempted = false;
  let controller = new AbortController();
  let state = { phase: 'idle', message: '', reason: '' };
  const disposed = new WeakSet();
  const abortError = () => Object.assign(new Error('Tác vụ đã được thay thế'), { name: 'AbortError' });
  const report = (phase, message = '', reason = '') => {
    state = { phase, message, reason };
    hooks.onState?.(state);
  };
  function discard(candidate) {
    if (!candidate || typeof candidate !== 'object' || disposed.has(candidate)) return;
    disposed.add(candidate);
    try { hooks.discard?.(candidate); } catch (_) { /* cleanup không che lỗi nguồn */ }
  }
  async function limited(work, parentSignal, cleanup, limitMs=timeoutMs) {
    const operation = new AbortController();
    let deadline;
    let stop;
    let result;
    const interrupted = new Promise((_, reject) => {
      stop = () => { operation.abort(); reject(abortError()); };
      parentSignal.addEventListener('abort', stop, { once: true });
      deadline = setTimeout(() => {
        operation.abort();
        reject(Object.assign(new Error('Nguồn phát chưa sẵn sàng'), { name: 'TimeoutError' }));
      }, limitMs);
      if (parentSignal.aborted) stop();
    });
    const task = Promise.resolve().then(() => {
      if (operation.signal.aborted) throw abortError();
      return work(operation.signal);
    }).then((value) => {
      if (operation.signal.aborted) { cleanup?.(value); throw abortError(); }
      result = value;
      return value;
    });
    try { return await Promise.race([task, interrupted]); }
    finally {
      clearTimeout(deadline);
      parentSignal.removeEventListener('abort', stop);
      // task có thể còn chạy nếu player bên thứ ba không hỗ trợ abort; result
      // muộn được cleanup ở nhánh then phía trên và không được phép commit.
      if (parentSignal.aborted && result) cleanup?.(result);
    }
  }
  function reset(key, target) {
    // Server/language variants can share a viewing URL. Compare the actual
    // selection; never reuse a prepared resource for another target variant.
    const explicitResume = ['server', 'translation'].includes(target?.intent);
    const targetKey = target ? JSON.stringify([target.url || '', target.server || '', target.serverKey || '',
      target.language || '', target.episodeKey || '', explicitResume,
      explicitResume ? target.resume?.position : null, explicitResume ? target.resume?.duration : null,
      !!target.historySelection]) : '';
    if (context === key && nextKey === targetKey) return;
    generation++;
    controller.abort();
    controller = new AbortController();
    discard(prepared);
    context = key;
    next = target || null;
    nextKey = targetKey;
    prepared = null;
    warming = null;
    switching = null;
    attemptedAuto = false;
    attemptedEnd = false;
    warmAttempted = false;
    report('idle');
  }
  function usable(candidate) {
    return candidate && (!candidate.expiresAt || candidate.expiresAt > now() + 30000);
  }
  function warmup() {
    if (!next) return Promise.resolve(null);
    if (usable(prepared)) return Promise.resolve(prepared);
    if (warming) return warming;
    discard(prepared); prepared = null;
    const epoch = generation;
    const target = next;
    const signal = controller.signal;
    warmAttempted = true;
    if (!switching) report('preparing', 'Đang chuẩn bị tập tiếp theo…');
    const task = limited((s) => hooks.prepare(target, { signal: s, fresh: false }), signal, discard)
      .then((candidate) => {
        if (epoch !== generation || signal.aborted) { discard(candidate); return null; }
        prepared = candidate;
        if (!switching) report('ready', 'Tập tiếp theo đã được chuẩn bị');
        return candidate;
      }).catch((error) => {
        if (epoch === generation && error.name !== 'AbortError' && !switching) report('idle');
        return null; // lỗi nạp trước không được dừng tập đang xem
      }).finally(() => { if (epoch === generation) warming = null; });
    warming = task;
    return task;
  }
  function go(reason = 'manual') {
    if (!next) return Promise.resolve(false);
    if (switching) return switching;
    const epoch = generation;
    const target = next;
    const signal = controller.signal;
    if (prepared && !usable(prepared)) { discard(prepared); prepared = null; }
    // Phản hồi đồng bộ trước await/network, kể cả khi chưa có preload.
    report('switching', 'Đang chuyển tập…', reason);
    const notice = setTimeout(() => {
      if (epoch === generation && switching) report('switching', 'Đang tải tập mới, vui lòng chờ…', reason);
    }, noticeMs);
    const task = (async () => {
      let candidate = null;
      try {
        candidate = usable(prepared) ? prepared : warming ? await warming : null;
        for (let attempt = 0; attempt < 2; attempt++) {
          if (signal.aborted || epoch !== generation) throw abortError();
          let committing = false;
          try {
            if (!usable(candidate)) {
              discard(candidate);
              candidate = await limited((s) => hooks.prepare(target, { signal: s, fresh: attempt > 0 }), signal, discard);
            }
            const result = await limited((s) => hooks.activate(candidate, target, { signal: s }), signal);
            if (signal.aborted || epoch !== generation) throw abortError();
            const deferred = options.activateInCommit===true && result?.deferred==='persistent';
            if (!deferred && (!result?.playing || result?.startedAt !== 0)) throw new Error('Tập mới chưa xác nhận phát từ đầu');
            committing = true;
            const committed = await limited((s) => hooks.commit?.(candidate, target, result, {
              signal: s, isCurrent: () => epoch === generation && !s.aborted,
            }), signal, undefined, options.commitTimeoutMs ?? timeoutMs);
            if(deferred && committed?.confirmed!==true)throw new Error('Chưa xác nhận nguồn trong phiên phát');
            if (signal.aborted || epoch !== generation) throw abortError();
            prepared = null; // quyền sở hữu được bàn giao cho player hiện tại
            report('playing', 'Đã chuyển tập', reason);
            return true;
          } catch (error) {
            if (signal.aborted || error.name === 'AbortError') throw error;
            discard(candidate); candidate = null; prepared = null;
            if (committing) throw error; // Không chạy commit hai lần khi đã bắt đầu bàn giao.
            if (attempt) throw error;
            report('refreshing', 'Đang lấy lại nguồn phát mới…', reason);
          }
        }
      } catch (error) {
        discard(candidate);
        if (epoch === generation && error.name !== 'AbortError') {
          hooks.rollback?.();
          report('error', 'Không chuyển được tập. Thử lại hoặc quay về tập hiện tại.', reason);
        }
        return false;
      } finally {
        clearTimeout(notice);
        if (epoch === generation) switching = null;
      }
    })();
    switching = task;
    return task;
  }
  function tick(media, key, target) {
    reset(key, target);
    if (!next || !media || media.ad || media.prepared || switching || state.phase === 'playing') return;
    const duration = Number(media.duration);
    const time = Number(media.currentTime);
    const remaining = duration - time;
    // Keep the original player's ten-minute episode guard. A short clip must
    // not lose most of its content to the fixed ninety-second credits skip.
    // Actual ended remains a separate fallback below.
    const valid = Number.isFinite(duration) && duration >= 600 && Number.isFinite(time) && time > 0 && remaining >= 0;
    if (valid && remaining <= 240 && !warmAttempted) warmup();
    // Ended là dự phòng, kể cả nguồn không báo duration hợp lệ. Tách guard để
    // một lần thất bại ở mốc 90s còn có thể thử lại khi thực sự ended.
    if (media.ended && !attemptedEnd) { attemptedEnd = true; go('ended'); }
    else if (valid && !media.paused && remaining <= 90 && time >= 30 && !attemptedAuto) {
      attemptedAuto = true;
      go('auto');
    }
  }
  return { reset, warmup, go, tick, cancel: () => reset('', null),
    get state() { return state; }, get busy() { return !!switching; }, get prepared() { return prepared; } };
}
