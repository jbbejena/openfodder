/* Optional, local-only performance recording. GPL-3.0-or-later; see COPYING. */
(function (root) {
  'use strict';
  const MAX_SAMPLES = 1800, MAX_EVENTS = 100, MAX_WALL_MS = 30 * 60 * 1000;
  const TARGET_ACTIVE_MS = 10 * 60 * 1000;
  function intervals() {
    const bins = new Uint32Array(1001);
    let count = 0, total = 0, maximum = 0;
    return {
      add(ms) {
        if (!Number.isFinite(ms) || ms < 0) return;
        bins[ms > 1000 ? 1000 : Math.max(0, Math.ceil(ms) - 1)]++;
        count++; total += ms; maximum = Math.max(maximum, ms);
      },
      snapshot() {
        function percentile(fraction) {
          if (!count) return null;
          const target = Math.ceil(count * fraction); let sum = 0;
          for (let i = 0; i < bins.length; i++) {
            sum += bins[i];
            if (sum >= target) return i === 1000 ? null : i + 1;
          }
          return null;
        }
        return { intervals: count, intervalMs: total, opportunitiesPerSecond: total > 0 ? count * 1000 / total : null,
          p50MsUpperBound: percentile(.5), p95MsUpperBound: percentile(.95), p99MsUpperBound: percentile(.99),
          maxMs: count ? maximum : null, over1000Ms: bins[1000] };
      }
    };
  }
  // Dependencies are explicit so bounds, pause gaps and cleanup can be tested
  // with a deterministic clock, independently of Emscripten and the DOM.
  function create(options) {
    const { native, active, context, now, isoNow, schedule, cancel, requestFrame, cancelFrame } = options;
    let session = null, timer = null, raf = null, previousRaf = null, rafIntervals = intervals();
    let previousContext = '', droppedEvents = 0;
    function changed() { options.changed?.(session); }
    function clear() {
      if (timer !== null) cancel(timer);
      if (raf !== null) cancelFrame(raf);
      timer = raf = previousRaf = null;
    }
    function event(type, detail) {
      if (!session?.recording) return;
      if (session.events.length < MAX_EVENTS) session.events.push({ atMs: now() - session.origin, type, detail });
      else droppedEvents++;
    }
    function sample() {
      if (!session?.recording) return;
      const measurement = native(0), current = context();
      if (!measurement.ok) throw Error(measurement.reason || 'Native measurements unavailable');
      const { engineTick, ...segment } = current;
      const key = JSON.stringify(segment);
      if (key !== previousContext) { event('context', segment); previousContext = key; }
      session.native = measurement;
      session.memory.endCapacityBytes = measurement.wasmCapacityBytes;
      session.memory.peakCapacityBytes = Math.max(session.memory.peakCapacityBytes, measurement.wasmCapacityBytes);
      session.wallMs = now() - session.origin;
      if (session.samples.length < MAX_SAMPLES) session.samples.push({ atMs: session.wallMs,
        activeMs: measurement.activeMs, submittedFrames: measurement.submittedFrames,
        intervalMs: measurement.intervalMs, failedSubmissions: measurement.failedSubmissions,
        wasmCapacityBytes: measurement.wasmCapacityBytes, engineTick: current.engineTick ?? null,
        attempt: current.attempt ?? null, stage: current.stage, pauseReasons: current.pauseReasons });
      changed();
    }
    function stop(reason = 'user') {
      if (!session?.recording) return false;
      try { sample(); } catch (error) { event('measurement-error', String(error.message)); }
      try {
        const final = native(2);
        if (!final.ok) throw Error(final.reason || 'Native stop failed');
        session.native = final;
      } catch (_) { session.nativeStopUnconfirmed = true; /* Preserve the last good snapshot on runtime failure. */ }
      session.memory.endCapacityBytes = session.native.wasmCapacityBytes;
      session.memory.peakCapacityBytes = Math.max(session.memory.peakCapacityBytes, session.native.wasmCapacityBytes);
      session.recording = false; session.endedAt = isoNow(); session.stopReason = reason;
      session.wallMs = now() - session.origin; clear(); changed(); return true;
    }
    function tick() {
      timer = null;
      if (!session?.recording) return;
      try {
        if (now() - session.origin >= MAX_WALL_MS || session.samples.length >= MAX_SAMPLES - 1) { stop('recording-limit'); return; }
        sample(); timer = schedule(tick, 1000);
      } catch (error) { event('measurement-error', String(error.message)); stop('measurement-error'); }
    }
    function frame(time) {
      raf = null;
      if (!session?.recording) return;
      try {
        if (active()) {
          if (previousRaf !== null) rafIntervals.add(time - previousRaf);
          previousRaf = time;
        } else previousRaf = null;
        raf = requestFrame(frame);
      } catch (error) { event('measurement-error', String(error.message)); stop('measurement-error'); }
    }
    return Object.freeze({
      start(deviceLabel = '', loadLabel = 'unspecified') {
        if (session?.recording) return false;
        clear(); const measurement = native(1);
        if (!measurement.ok) throw Error(measurement.reason || 'Native measurements unavailable');
        rafIntervals = intervals(); previousContext = ''; droppedEvents = 0;
        session = { recording: true, origin: now(), startedAt: isoNow(), endedAt: null,
          deviceLabel: String(deviceLabel).slice(0, 120), loadLabel: String(loadLabel).slice(0, 80),
          wallMs: 0, stopReason: null, native: measurement, samples: [], events: [],
          memory: { startCapacityBytes: measurement.wasmCapacityBytes, peakCapacityBytes: measurement.wasmCapacityBytes,
            endCapacityBytes: measurement.wasmCapacityBytes } };
        sample(); timer = schedule(tick, 1000); raf = requestFrame(frame); return true;
      },
      stop,
      notes(value) { if (session) session.notes = String(value).slice(0, 600); },
      break(reason) { previousRaf = null; event('interruption', reason); },
      status() { return { recording: Boolean(session?.recording), wallMs: session?.wallMs || 0, native: session?.native || null }; },
      report() {
        if (!session) return null;
        // Detached copy; no mutable engine state or progress/checkpoint payload.
        const { origin, ...data } = session;
        return JSON.parse(JSON.stringify({ format: 'openfodder-performance', version: 1,
          metadata: options.metadata(), loading: options.loading(), ...data, animationCallbacks: rafIntervals.snapshot(),
          droppedEvents, limits: { samples: MAX_SAMPLES, events: MAX_EVENTS, wallMs: MAX_WALL_MS },
          phoneAcceptance: { status: 'NOT ESTABLISHED BY THIS REPORT', targetRenderedFps: 30,
            requiredActiveMs: TARGET_ACTIVE_MS, recordedActiveMs: data.native.activeMs,
            tenMinutesActive: data.native.activeMs >= TARGET_ACTIVE_MS },
          interpretation: { frames: 'Successful SDL_RenderPresent submissions during active combat; not GPU completion or physical displayed FPS.',
            animationCallbacks: 'requestAnimationFrame opportunities during active combat, independent of SDL submissions.',
            activeMs: 'Elapsed active combat sampled at native callbacks; menu, pause, camera setup and lifecycle gaps excluded.',
            percentiles: '1ms histogram upper bounds. Null with intervals present means the percentile exceeds 1000ms.',
            memory: 'WebAssembly linear memory allocated capacity; not used heap, GPU memory or total Safari RAM. Stable capacity cannot prove absence of leaks.',
            loading: 'Observed wall times, including initialization and verification. Cache state is unknown; loadLabel is supplied by the tester.',
            device: 'User agent/viewport may be emulated; deviceLabel and loadLabel are user supplied. No automatic real-device or mobile acceptance claim.' } }));
      }
    });
  }
  function mount(Module, bridge, shell, build, content, loading) {
    const byId = id => document.getElementById(id);
    const start = byId('performance-start'), stop = byId('performance-stop'), exportButton = byId('performance-export');
    const status = byId('performance-status'), summary = byId('performance-summary'), badge = byId('performance-badge');
    const native = op => JSON.parse(Module.UTF8ToString(Module._of_web_performance(op)));
    const number = (value, suffix = '') => Number.isFinite(value) ? `${value.toFixed(1)}${suffix}` : '—';
    function context() {
      const s = bridge.state(), viewport = root.visualViewport;
      return { stage: s.stage, pauseReasons: s.pauseReasons || 0, lifecycleReasons: s.lifecycleReasons || 0,
        mission: s.mission?.number ?? null, map: s.mission?.map ?? null, attempt: s.mission?.attempt ?? null,
        engineTick: s.engineTick ?? null, cheats: document.body.dataset.cheats === 'on',
        viewport: { width: viewport?.width || root.innerWidth, height: viewport?.height || root.innerHeight,
          dpr: root.devicePixelRatio, canvasWidth: Module.canvas.width, canvasHeight: Module.canvas.height } };
    }
    // Tick changes belong in samples, not context events (which would fill at 1Hz).
    const session = create({ native, active: () => Boolean(Module._of_web_performance_active()),
      context, now: () => performance.now(), isoNow: () => new Date().toISOString(),
      schedule: (fn, ms) => root.setTimeout(fn, ms), cancel: id => root.clearTimeout(id),
      requestFrame: fn => root.requestAnimationFrame(fn), cancelFrame: id => root.cancelAnimationFrame(id),
      loading: () => loading,
      metadata: () => ({ build, content: { id: content.id, dataRevision: content.data_revision,
        logicalBytes: content.files.reduce((sum, f) => sum + f.size, 0), files: content.files.length },
        browser: { userAgent: navigator.userAgent, platform: navigator.platform,
          standalone: Boolean(navigator.standalone || root.matchMedia('(display-mode: standalone)').matches),
          hardwareConcurrency: navigator.hardwareConcurrency || null }, renderer: Module.renderer || 'not initialized',
        audio: 'disabled/null backend' }),
      changed(current) {
        start.disabled = Boolean(current?.recording); stop.disabled = !current?.recording; exportButton.disabled = !current;
        badge.hidden = !current?.recording;
        if (!current) return;
        const n = current.native, seconds = Math.floor(n.activeMs / 1000);
        badge.textContent = `REC ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
        const message = current.recording ? 'Recording. Close Guide and play; paused time is excluded.' :
          `Stopped (${current.stopReason}). Export before reloading or starting another recording.`;
        if (status.textContent !== message) status.textContent = message;
        summary.textContent = `Active combat ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} / 10:00 minimum\n` +
          `Submitted FPS ${number(n.submittedPerActiveSecond)} · p95 interval ${n.intervals && n.p95MsUpperBound === null ? '>1000 ms' : number(n.p95MsUpperBound, ' ms')}\n` +
          `Wasm capacity ${number(n.wasmCapacityBytes / 1048576, ' MiB')} (allocated, not used memory)\n` +
          `Engine ready ${number(loading.runtimeReadyMs, ' ms')} · Start to menu ${number(loading.startToMenuMs, ' ms')}`;
      }
    });
    start.disabled = false;
    start.addEventListener('click', () => {
      try { if (session.start(byId('performance-device').value, byId('performance-load').value)) shell.closeGuide(); }
      catch (error) { session.stop('measurement-error'); status.textContent = `Could not record: ${error.message}`; }
    });
    stop.addEventListener('click', () => { session.notes(byId('performance-notes').value); session.stop(); });
    exportButton.addEventListener('click', () => {
      session.notes(byId('performance-notes').value);
      session.stop('export'); const report = session.report(); if (!report) return;
      const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2) + '\n'], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url;
      link.download = `openfodder-performance-${build.commit.slice(0, 12)}-${report.startedAt.replace(/[:.]/g, '-')}.json`;
      link.click(); root.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    root.addEventListener('blur', () => session.break('blur'));
    root.addEventListener('pagehide', event => { session.break(event.persisted ? 'persisted-pagehide' : 'pagehide'); if (!event.persisted) session.stop('pagehide'); });
    document.addEventListener('visibilitychange', () => session.break(document.hidden ? 'hidden' : 'visible'));
    document.addEventListener('freeze', () => session.break('freeze'));
    document.addEventListener('fodder-game-stage', () => session.break('stage-change'));
    document.addEventListener('fodder-runtime-error', () => session.stop('runtime-error'));
    return session;
  }
  const api = Object.freeze({ intervals, create, mount });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OpenFodderPerformance = api;
})(globalThis);
