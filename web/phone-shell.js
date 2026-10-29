/* Viewport shell and presentation pause. GPL-3.0-or-later; see COPYING. */
(function (root) {
  'use strict';
  function fitSize(width, height, availableWidth, availableHeight) {
    if (![width, height, availableWidth, availableHeight].every(n => Number.isFinite(n) && n > 0)) return null;
    const scale = Math.min(availableWidth / width, availableHeight / height);
    return { width: width * scale, height: height * scale };
  }
  function mount(canvas) {
    const app = document.getElementById('app'), field = document.getElementById('playfield');
    const dialog = document.getElementById('field-dialog'), guideButton = document.getElementById('field-guide');
    const portrait = document.getElementById('portrait-guide'), dock = document.getElementById('debug-dock');
    const mission = document.getElementById('mission-screen');
    let bridge, controller, running = false, failed = false, portraitAllowed = false;
    let gameStage = 'uninitialized';
    let frame = null, previousBox = '', previousOrientation = '';
    function blocked() { return failed || dialog.open || !portrait.hidden || !mission.hidden; }
    function release() {
      if (!failed && controller?.snapshot().enabled) controller.cancel('View changed. Input released.');
    }
    function syncPause() {
      if (!bridge || failed) return;
      const state = bridge.state();
      // Menu/startup has no battlefield clock. Input is gated there instead.
      if (state.stage !== 'battlefield') return;
      const wanted = blocked();
      if (Boolean(state.pauseReasons & 8) !== wanted) bridge.setPaused(wanted, 'shell');
    }
    function updatePresentation() {
      if (!running) return;
      const viewport = root.visualViewport;
      const width = viewport?.width || root.innerWidth, height = viewport?.height || root.innerHeight;
      for (const [name, value] of Object.entries({ width, height, left: viewport?.offsetLeft || 0, top: viewport?.offsetTop || 0 })) {
        const key = `--viewport-${name}`, next = `${value}px`;
        if (app.style.getPropertyValue(key) !== next) app.style.setProperty(key, next);
      }
      const orientation = width < height ? 'portrait' : 'landscape';
      if (orientation !== previousOrientation) {
        release();
        if (orientation === 'landscape') portraitAllowed = false;
        previousOrientation = orientation;
      }
      document.body.dataset.orientation = orientation;
      document.body.dataset.compact = String(height < 380);
      const touch = document.getElementById('touch-enabled').checked || root.matchMedia('(pointer: coarse)').matches;
      const showPortrait = gameStage === 'battlefield' && orientation === 'portrait' && touch && !portraitAllowed && !failed;
      if (portrait.hidden === showPortrait) {
        release(); portrait.hidden = !showPortrait;
      }
      document.body.dataset.portraitBlocked = String(showPortrait);
      field.inert = showPortrait || !mission.hidden || failed;
      dock.inert = showPortrait || dialog.open || !mission.hidden || failed;
      syncPause();
    }
    function fit() {
      frame = null;
      if (!running) return;
      updatePresentation();
      const box = field.getBoundingClientRect();
      const size = fitSize(canvas.width, canvas.height, box.width, box.height);
      if (!size) return;
      const key = [box.left, box.top, box.width, box.height, canvas.width, canvas.height].map(n => n.toFixed(3)).join(',');
      if (previousBox && previousBox !== key) release();
      previousBox = key;
      canvas.style.width = `${size.width}px`; canvas.style.height = `${size.height}px`;
      document.body.dataset.layoutReady = 'true';
    }
    function requestFit() {
      if (!running || frame !== null) return;
      document.body.dataset.layoutReady = 'false';
      frame = root.requestAnimationFrame(fit);
    }
    function closeGuide() {
      if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
      updatePresentation();
      guideButton.focus({ preventScroll: true });
    }
    guideButton.addEventListener('click', () => {
      release();
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
      updatePresentation();
    });
    document.getElementById('close-guide').addEventListener('click', closeGuide);
    dialog.addEventListener('cancel', event => { event.preventDefault(); closeGuide(); });
    dialog.addEventListener('close', updatePresentation);
    for (const type of ['keydown', 'keyup']) {
      document.getElementById('topbar').addEventListener(type, event => event.stopPropagation());
      dialog.addEventListener(type, event => {
        event.stopPropagation();
        if (type === 'keydown' && event.key === 'Escape') { event.preventDefault(); closeGuide(); }
        // Keep Tab within the guide, including the native-dialog/browser edge.
        if (type === 'keydown' && event.key === 'Tab') {
          const items = [...dialog.querySelectorAll('button,a[href],input,summary')].filter(el => !el.disabled && el.getClientRects().length);
          const first = items[0], last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      });
    }
    document.getElementById('keep-portrait').addEventListener('click', () => {
      portraitAllowed = true; updatePresentation(); requestFit(); canvas.focus({ preventScroll: true });
    });
    // Stop new gameplay gestures/keys under an overlay. Releases/cancellations
    // still pass, so existing physical IDs and SDL button latches can clear.
    for (const type of ['pointerdown', 'pointermove', 'touchstart', 'touchmove', 'mousedown', 'mousemove', 'keydown', 'keyup']) {
      document.addEventListener(type, event => {
        if (!running || !blocked()) return;
        if (event.target.closest?.('#field-dialog, #field-guide, #portrait-guide, #mission-screen, #status-region, #lifecycle-dialog')) return;
        if (event.cancelable) event.preventDefault();
        event.stopImmediatePropagation();
      }, { capture: true, passive: false });
    }
    root.addEventListener('resize', requestFit);
    root.visualViewport?.addEventListener('resize', requestFit);
    root.visualViewport?.addEventListener('scroll', requestFit);
    new MutationObserver(requestFit).observe(canvas, { attributes: true, attributeFilter: ['width', 'height'] });
    new MutationObserver(requestFit).observe(document.body, { attributes: true, attributeFilter: ['data-touch-controls'] });
    new MutationObserver(requestFit).observe(document.getElementById('input-harness'), { attributes: true, attributeFilter: ['hidden', 'open'] });
    new MutationObserver(requestFit).observe(mission, { attributes: true, attributeFilter: ['hidden'] });
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(requestFit) : null;
    observer?.observe(field); observer?.observe(dock); observer?.observe(app);
    const timer = root.setInterval(() => { if (running && !failed) syncPause(); }, 100);
    root.addEventListener('pagehide', event => { if (!event.persisted) root.clearInterval(timer); });
    return Object.freeze({
      connect(input, physical) { bridge = input; controller = physical; },
      closeGuide,
      refresh() { updatePresentation(); requestFit(); },
      start() {
        running = true; document.body.classList.add('game-running');
        document.getElementById('battle-ui').hidden = false; guideButton.hidden = false;
        root.scrollTo(0, 0); fit();
      },
      setGameState(stage) {
        gameStage = stage;
        if (stage !== 'battlefield' && dialog.open) closeGuide();
        document.getElementById('scene-feedback').textContent = stage === 'menu' ? 'Choose the Christmas Special campaign.' :
          stage === 'battlefield' ? 'Mouse and keyboard active. Open Guide for controls.' : 'Starting game…';
        requestFit();
      },
      setError() {
        failed = true;
        document.body.dataset.runtimeError = 'true';
        try { controller?.cancel('Input released.'); bridge?.setPaused(true, 'shell'); } catch (_) { /* Preserve the original runtime error. */ }
        document.getElementById('status-region').classList.add('has-error');
        document.getElementById('status').setAttribute('role', 'alert');
        document.getElementById('reload').hidden = false;
        if (dialog.open) closeGuide();
        if (running) updatePresentation();
      }
    });
  }
  const api = Object.freeze({ fitSize, mount });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OpenFodderShell = api;
})(globalThis);
