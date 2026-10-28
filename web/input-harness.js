/* Opt-in MOB-004 diagnostics, separate from the production touch controller. */
'use strict';
function setupInputHarness(bridge) {
  const panel = document.getElementById('input-harness');
  const enabled = document.getElementById('input-test');
  const result = document.getElementById('input-result');
  const output = document.getElementById('input-state');
  for (const type of ['keydown', 'keyup']) panel.addEventListener(type, event => event.stopPropagation());
  const x = document.getElementById('input-x'), y = document.getElementById('input-y');
  let initialized = false;
  const point = () => ({ x: x.valueAsNumber, y: y.valueAsNumber });
  const report = receipt => { result.textContent = receipt.ok ? `Accepted command ${receipt.id}; see engine state below.` : `Rejected: ${receipt.reason}`; };
  panel.querySelectorAll('[data-squad]').forEach(button => button.addEventListener('click', () => report(bridge.selectSquad(Number(button.dataset.squad)))));
  panel.querySelectorAll('[data-weapon]').forEach(button => button.addEventListener('click', () => report(bridge.selectWeapon(button.dataset.weapon))));
  panel.querySelectorAll('[data-pan]').forEach(button => button.addEventListener('click', () => report(bridge.pan(...JSON.parse(button.dataset.pan)))));
  document.getElementById('input-move').addEventListener('click', () => report(bridge.moveTo(point())));
  document.getElementById('input-follow').addEventListener('click', () => report(bridge.follow()));
  document.getElementById('input-pause').addEventListener('click', () => report(bridge.setPaused(true)));
  document.getElementById('input-resume').addEventListener('click', () => report(bridge.setPaused(false)));
  document.getElementById('input-cancel').addEventListener('click', () => report(bridge.cancel()));
  const fire = document.getElementById('input-fire');
  let heldPointer = null;
  fire.addEventListener('pointerdown', event => {
    if (event.button !== 0 || heldPointer !== null) return;
    event.preventDefault();
    heldPointer = event.pointerId;
    fire.setPointerCapture(event.pointerId);
    report(bridge.fireStart(point()));
  });
  const stop = event => {
    if (heldPointer === null || event.pointerId !== heldPointer) return;
    heldPointer = null;
    report(bridge.fireStop());
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) fire.addEventListener(type, stop);
  fire.addEventListener('keydown', event => {
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      if (!event.repeat) report(bridge.fireStart(point()));
    }
  });
  fire.addEventListener('keyup', event => {
    if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); report(bridge.fireStop()); }
  });
  function cancel() { heldPointer = null; bridge.cancel(); }
  enabled.addEventListener('change', () => { if (!enabled.checked) cancel(); refresh(); });
  panel.addEventListener('toggle', () => { if (!panel.open) cancel(); });
  window.addEventListener('blur', cancel);
  window.addEventListener('pagehide', cancel);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
  function refresh() {
    const state = bridge.state();
    panel.hidden = !enabled.checked || state.stage !== 'battlefield';
    if (panel.hidden) return;
    if (!initialized && state.ready && state.squads?.[state.selectedSquad]?.leader) {
      const leader = state.squads[state.selectedSquad].leader;
      x.value = leader.x + 24; y.value = leader.y;
      initialized = true;
    }
    output.textContent = JSON.stringify(state, null, 2);
    const canAct = state.ready && !state.paused;
    panel.querySelectorAll('[data-squad]').forEach(button => {
      button.disabled = !canAct || !state.squads[Number(button.dataset.squad)].count;
    });
    const squad = state.squads?.[state.selectedSquad];
    panel.querySelectorAll('[data-weapon]').forEach(button => {
      button.disabled = !canAct || !(squad?.[button.dataset.weapon === 'grenade' ? 'grenades' : 'rockets'] > 0);
    });
    for (const id of ['input-move', 'input-fire', 'input-follow']) document.getElementById(id).disabled = !canAct || !squad?.count;
    panel.querySelectorAll('[data-pan]').forEach(button => { button.disabled = !canAct; });
  }
  const timer = setInterval(refresh, 150);
  window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
  refresh();
}
