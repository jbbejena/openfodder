/* Touch command ownership. GPL-3.0-or-later; see COPYING. */
(function (root) {
  'use strict';
  const weapons = { grenade: 1, rocket: 3 };
  const hints = { move: 'Tap ground to move. Dragging cancels the order.',
    fire: 'Hold ground to fire; slide to aim. Lift or leave the battlefield to stop.',
    grenade: 'Tap a target, then confirm Throw grenade.', rocket: 'Tap a target, then confirm Launch rocket.' };
  function create(bridge, changed = () => {}) {
    let enabled = false, mode = 'move', owner = null, target = null, selecting = null;
    let message = hints.move, previous = bridge.state(), lastAim = null;
    const pointers = new Set();
    const selected = state => state.squads?.[state.selectedSquad];
    const canAct = state => state.stage === 'battlefield' && state.ready && !state.paused && selected(state)?.count > 0;
    function notify() { changed({ enabled, mode, target, message, owner: owner?.id ?? null }, bridge.state()); }
    function receipt(result, success) {
      message = result.ok ? success : `Command unavailable: ${result.reason}.`;
      notify();
      return result;
    }
    function release() {
      owner = target = selecting = lastAim = null;
      // Keep physical IDs until their up/cancel. Changing modes cannot transfer
      // an already-held finger to a fresh command.
      bridge.cancel();
    }
    function cancel(text = 'Target cancelled. Tap fresh ground to continue.') {
      release(); mode = 'move'; message = text; notify();
    }
    function setMode(next) {
      if (!['move', 'fire', 'grenade', 'rocket'].includes(next)) return false;
      const state = bridge.state();
      if (!enabled || !canAct(state)) return false;
      if (weapons[next] && !(selected(state)[next === 'grenade' ? 'grenades' : 'rockets'] > 0)) return false;
      release();
      if (weapons[next]) {
        const result = bridge.selectWeapon(next);
        if (!result.ok) { mode = 'move'; receipt(result); return false; }
        selecting = result.id;
      }
      mode = next; message = hints[mode]; notify(); return true;
    }
    function down(event) {
      if (event.button !== 0 || pointers.has(event.pointerId)) return;
      pointers.add(event.pointerId);
      if (pointers.size !== 1) { cancel('Multiple touches cancelled the command. Lift all fingers to try again.'); return; }
      const state = bridge.state();
      if (!enabled || !canAct(state) || selecting || !bridge.clientToWorld(event.clientX, event.clientY)) return;
      owner = { id: event.pointerId, x: event.clientX, y: event.clientY, mode,
        latest: { x: event.clientX, y: event.clientY }, squad: state.selectedSquad };
      target = null;
      if (mode === 'fire') {
        const result = bridge.fireStartAt(event.clientX, event.clientY);
        if (!result.ok) { release(); receipt(result); return; }
        owner.startId = result.id;
        lastAim = { ...owner.latest };
        message = 'Firing. Lift to stop.';
      }
      notify();
    }
    function move(event) {
      if (!owner || event.pointerId !== owner.id) return;
      if (!bridge.clientToWorld(event.clientX, event.clientY)) { cancel('Outside battlefield. Input released.'); return; }
      if (owner.mode !== 'fire' && Math.hypot(event.clientX - owner.x, event.clientY - owner.y) > 12) {
        cancel('Drag cancelled. Tap ground for a command.'); return;
      }
      owner.latest = { x: event.clientX, y: event.clientY };
    }
    function up(event) {
      const active = owner?.id === event.pointerId ? owner : null;
      pointers.delete(event.pointerId);
      if (!active) return;
      move(event); // Check the release point too, even if no move was delivered.
      if (!owner) return;
      const state = bridge.state();
      if (!canAct(state) || state.selectedSquad !== active.squad) { cancel('Battlefield changed. Input released.'); return; }
      owner = null; lastAim = null;
      if (active.mode === 'fire') receipt(bridge.fireStop(), 'Fire released. Hold ground to fire again.');
      else if (active.mode === 'move') receipt(bridge.moveAt(event.clientX, event.clientY), 'Movement order sent.');
      else {
        target = bridge.clientToWorld(event.clientX, event.clientY);
        message = `Target marked. ${mode === 'grenade' ? 'Throw grenade' : 'Launch rocket'} to confirm, or Cancel.`;
        notify();
      }
    }
    function lost(event) {
      pointers.delete(event.pointerId);
      if (owner?.id === event.pointerId) cancel('Touch cancelled. Input released.');
    }
    function confirm() {
      if (!target || !weapons[mode] || selecting || !enabled || !canAct(bridge.state())) return;
      const point = target;
      target = null; mode = 'move'; // Synchronous disarm: a double tap cannot fire twice.
      receipt(bridge.secondaryTo(point), 'Secondary shot requested. Choose a weapon again for another shot.');
    }
    function tick() {
      const state = bridge.state();
      if (enabled && (state.stage !== previous.stage || state.selectedSquad !== previous.selectedSquad ||
          (state.paused && !previous.paused))) {
        cancel(state.paused ? 'Paused. Held input released.' : 'Squad or mission changed. Move mode ready.');
      }
      previous = state;
      if (selecting && state.last?.id >= selecting) {
        const valid = state.last.code === 0 && selected(state)?.weapon === weapons[mode];
        selecting = null;
        if (!valid) cancel('Weapon selection changed. Choose a weapon again.');
      }
      if ((owner || target) && !canAct(state)) cancel('Battlefield unavailable. Input released.');
      if (owner?.mode === 'fire' && state.last?.id >= owner.startId && !state.fireHeld) cancel('Fire ended. Lift and touch again to fire.');
      if (weapons[mode] && !selecting && (selected(state)?.weapon !== weapons[mode] ||
          !(selected(state)?.[mode === 'grenade' ? 'grenades' : 'rockets'] > 0))) cancel('Weapon unavailable. Move mode ready.');
      if (owner?.mode === 'fire' && state.fireHeld &&
          (owner.latest.x !== lastAim.x || owner.latest.y !== lastAim.y)) {
        const point = owner.latest;
        const result = bridge.fireAimAt(point.x, point.y);
        if (!result.ok) { cancel(`Aim unavailable: ${result.reason}. Input released.`); return; }
        lastAim = { ...point };
      }
      notify();
    }
    return Object.freeze({ down, move, up, lost, confirm, tick, cancel, setMode,
      foreignDown(event) {
        pointers.add(event.pointerId);
        if (owner) cancel('HUD or page touched. Input released.');
      },
      setEnabled(value) { if (enabled === Boolean(value)) return; cancel(); enabled = Boolean(value); notify(); },
      selectSquad(id) {
        if (!enabled || !canAct(bridge.state())) return;
        cancel(); receipt(bridge.selectSquad(id), 'Squad selection requested.');
      },
      snapshot: () => ({ enabled, mode, target, owner: owner?.id ?? null, pointers: pointers.size, selecting })
    });
  }

  function mount(bridge, canvas) {
    const panel = document.getElementById('touch-commands');
    const toggle = document.getElementById('touch-enabled');
    const controls = document.getElementById('touch-actions');
    const output = document.getElementById('touch-feedback');
    const confirm = document.getElementById('touch-confirm');
    const marker = document.getElementById('touch-target');
    const game = document.getElementById('playfield');
    const squadButtons = [...panel.querySelectorAll('[data-touch-squad]')];
    const modeButtons = [...panel.querySelectorAll('[data-touch-mode]')];
    const controller = create(bridge, (ui, state) => {
      panel.hidden = state.stage !== 'battlefield';
      controls.hidden = !ui.enabled;
      canvas.classList.toggle('touch-commands', ui.enabled && !panel.hidden);
      if (output.textContent !== ui.message) output.textContent = ui.message;
      const canAct = ui.enabled && state.ready && !state.paused;
      const squad = state.squads?.[state.selectedSquad];
      squadButtons.forEach(button => {
        const id = Number(button.dataset.touchSquad), info = state.squads?.[id];
        button.disabled = !canAct || !info?.count;
        button.setAttribute('aria-pressed', String(state.selectedSquad === id));
        button.textContent = `Squad ${id + 1} · ${info?.count ?? 0}`;
      });
      modeButtons.forEach(button => {
        const mode = button.dataset.touchMode, secondary = weapons[mode];
        const ammo = secondary ? squad?.[mode === 'grenade' ? 'grenades' : 'rockets'] ?? 0 : null;
        button.disabled = !canAct || !squad?.count || (secondary && !ammo);
        button.setAttribute('aria-pressed', String(ui.mode === mode));
        button.textContent = secondary ? `${mode === 'grenade' ? 'Grenade' : 'Rocket'} · ${ammo}` : mode === 'move' ? 'Move' : 'Fire';
      });
      confirm.hidden = !ui.target;
      confirm.disabled = !canAct || !ui.target;
      confirm.textContent = ui.mode === 'grenade' ? 'Throw grenade' : 'Launch rocket';
      document.getElementById('touch-selection').textContent = state.paused ? 'Paused' :
        squad?.count ? `Squad ${state.selectedSquad + 1} · ${squad.count} soldiers` : 'No squad selected';
      marker.hidden = !ui.target;
      if (ui.target) {
        const client = bridge.worldToClient(ui.target.x, ui.target.y), rect = game.getBoundingClientRect();
        if (client) { marker.style.left = `${client.x - rect.left}px`; marker.style.top = `${client.y - rect.top}px`; }
      }
    });
    const ownsCanvas = () => toggle.checked && bridge.state().stage === 'battlefield';
    const stop = event => { if (event.cancelable) event.preventDefault(); event.stopImmediatePropagation(); };
    const foreign = new Set();
    document.addEventListener('pointerdown', event => {
      if (event.target !== canvas && ownsCanvas()) {
        foreign.add(event.pointerId); controller.foreignDown(event);
      }
    }, true);
    for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, event => {
      if (foreign.delete(event.pointerId)) controller.lost(event);
    }, true);
    for (const [type, handler] of [['pointerdown', 'down'], ['pointermove', 'move'], ['pointerup', 'up'],
      ['pointercancel', 'lost'], ['lostpointercapture', 'lost']]) {
      canvas.addEventListener(type, event => {
        if (!ownsCanvas() && !controller.snapshot().pointers) return;
        stop(event);
        if (type === 'pointerdown') {
          try { canvas.setPointerCapture(event.pointerId); } catch (_) { /* Cancel/up still releases. */ }
        }
        controller[handler](event);
      }, { capture: true, passive: false });
    }
    // SDL3's Emscripten backend also registers legacy touch/mouse handlers.
    // Stop them before SDL sees a command owned by this controller. Pointer
    // events are the single command source; no separate touch-to-mouse mapping.
    for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel',
      'mousedown', 'mouseup', 'mousemove', 'click', 'dblclick', 'contextmenu']) {
      canvas.addEventListener(type, event => { if (ownsCanvas()) stop(event); }, { capture: true, passive: false });
    }
    canvas.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch' && bridge.state().stage === 'battlefield' && !toggle.checked) {
        toggle.checked = true; controller.setEnabled(true);
        stop(event); canvas.setPointerCapture(event.pointerId); controller.down(event);
      }
    }, { capture: true, passive: false });
    // A HUD gesture never reaches SDL's document mouse-up/keyboard listeners.
    // Any second finger on the HUD also releases an existing aiming pointer.
    panel.addEventListener('pointerdown', event => {
      if (controller.snapshot().owner !== null) controller.cancel('HUD touched. Input released.');
      event.stopPropagation();
    });
    for (const type of ['pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'touchcancel',
      'mousedown', 'mouseup', 'keydown', 'keyup']) panel.addEventListener(type, event => event.stopPropagation());
    toggle.checked = matchMedia('(pointer: coarse)').matches;
    toggle.addEventListener('change', () => controller.setEnabled(toggle.checked));
    squadButtons.forEach(button => button.addEventListener('click', () => controller.selectSquad(Number(button.dataset.touchSquad))));
    modeButtons.forEach(button => button.addEventListener('click', () => controller.setMode(button.dataset.touchMode)));
    confirm.addEventListener('click', controller.confirm);
    document.getElementById('touch-cancel').addEventListener('click', () => controller.cancel());
    function interrupt() {
      if (controller.snapshot().enabled) controller.cancel('Input released. Choose a mode to continue.');
    }
    window.addEventListener('blur', interrupt);
    window.addEventListener('pagehide', interrupt);
    window.addEventListener('resize', interrupt);
    document.addEventListener('visibilitychange', () => { if (document.hidden) interrupt(); });
    controller.setEnabled(toggle.checked);
    const timer = setInterval(controller.tick, 50);
    window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
    controller.tick();
    return controller;
  }
  const api = Object.freeze({ create, mount });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OpenFodderTouch = api;
})(globalThis);
