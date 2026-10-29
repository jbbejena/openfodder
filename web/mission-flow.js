/* Engine-backed mission screens. GPL-3.0-or-later; see COPYING. */
(function (root) {
  'use strict';
  function presentation(state) {
    const mission = state.mission || {}, outcome = mission.result?.outcome;
    if (state.stage === 'menu') return { title: 'Choose a mission', description: 'Christmas Special · two demo missions', actions: [] };
    if (state.stage === 'briefing') return { title: mission.name || 'Mission briefing',
      description: 'Read your objectives, then deploy. Retry starts this mission again with fresh recruits.', actions: ['deploy', 'menu'] };
    if (state.stage === 'ending') return { title: 'Mission ending…', description: 'Waiting for the engine to finish this attempt.', actions: [] };
    if (state.stage === 'result') return {
      title: { won: 'Mission complete', lost: 'Mission lost', aborted: 'Mission aborted' }[outcome] || 'Mission ended',
      description: outcome === 'aborted' ? 'You ended this attempt. It is not a victory.' :
        outcome === 'won' ? (mission.canContinue ? 'Objectives complete. Continue to the next briefing or replay this mission.' : 'Objectives complete. No further missions in this demo.') :
        outcome === 'lost' ? 'The mission ended in defeat. Retry with fresh recruits or return to the menu.' : 'The engine did not provide a recognized outcome.',
      actions: ['won', 'lost', 'aborted'].includes(outcome) ? ['retry', ...(outcome === 'won' && mission.canContinue ? ['next'] : []), 'menu'] : ['menu']
    };
    return { title: '', description: '', actions: [] };
  }
  function mount(bridge, shell) {
    const el = id => document.getElementById(id), screen = el('mission-screen'), dialog = el('field-dialog');
    const buttons = Object.fromEntries(['deploy', 'retry', 'next', 'menu'].map(name => [name, el(`mission-${name}`)]));
    let previousStage = '', listKey = '', goalKey = '', pending = null;
    function text(id, value) { if (el(id).textContent !== value) el(id).textContent = value; }
    function hidden(element, value) { if (element.hidden !== value) element.hidden = value; }
    function resetConfirmation() { hidden(el('abort-confirmation'), true); hidden(el('mission-abort'), false); }
    function request(method, ...args) {
      if (pending || document.body.dataset.runtimeError === 'true') return;
      text('mission-message', ''); text('mission-guide-message', '');
      const reply = bridge[method](...args);
      if (reply.ok) { pending = reply.id; text('mission-message', 'Applying selection…'); }
      else { text('mission-message', `Action unavailable (${reply.reason}).`); text('mission-guide-message', `Action unavailable (${reply.reason}).`); }
      refresh();
    }
    function refresh() {
      if (document.body.dataset.runtimeError === 'true') return;
      const state = bridge.state(), mission = state.mission || {}, view = presentation(state);
      if (pending && state.last?.id >= pending) {
        if (state.last.code < 0) text('mission-message', 'The mission changed before that action could run. Choose an available action.');
        else text('mission-message', '');
        pending = null;
      }
      const visible = ['menu', 'briefing', 'ending', 'result'].includes(state.stage);
      hidden(screen, !visible);
      text('mission-title', view.title); text('mission-description', view.description);
      text('mission-selected-name', ['ending', 'result'].includes(state.stage) ? mission.name || '' : '');
      text('mission-campaign', mission.campaign || '');
      const list = JSON.stringify(mission.missions || []);
      if (list !== listKey) {
        listKey = list; el('mission-list').replaceChildren();
        for (const entry of mission.missions || []) {
          const button = document.createElement('button'); button.dataset.mission = entry.number;
          button.textContent = `${entry.number}. ${entry.name}`;
          button.addEventListener('click', () => request('selectMission', entry.number)); el('mission-list').append(button);
        }
      }
      hidden(el('mission-list'), state.stage !== 'menu');
      const goals = JSON.stringify([mission.name, mission.objectives]);
      if (goals !== goalKey) {
        goalKey = goals; text('current-mission-name', mission.name || '');
        for (const id of ['briefing-objectives', 'mission-objectives']) {
          el(id).replaceChildren();
          for (const goal of mission.objectives || []) { const li = document.createElement('li'); li.textContent = goal; el(id).append(li); }
        }
      }
      hidden(el('briefing-objectives'), !['briefing', 'result'].includes(state.stage));
      for (const [name, button] of Object.entries(buttons)) hidden(button, !view.actions.includes(name));
      const busy = Boolean(pending || mission.pending || root.fodderSaves?.state().busy);
      for (const button of screen.querySelectorAll('button')) button.disabled = busy;
      hidden(el('mission-guide'), state.stage !== 'battlefield');
      hidden(el('mission-resume'), !(state.pauseReasons & 1));
      el('confirm-abort').disabled = busy || !state.ready;
      el('mission-abort').disabled = busy || !state.ready;
      root.fodderCheckpointUI?.refresh(state);
      if (state.stage !== previousStage) {
        previousStage = state.stage; resetConfirmation(); text('mission-message', '');
        screen.querySelector('.mission-card').scrollTop=0;
        if (visible) root.requestAnimationFrame(() => { if (!screen.hidden && !dialog.open) el('mission-title').focus({ preventScroll: true }); });
      }
    }
    for (const [name, method] of Object.entries({ deploy: 'deployMission', retry: 'retryMission', next: 'continueMission', menu: 'returnToMenu' }))
      buttons[name].addEventListener('click', () => request(method));
    el('mission-abort').addEventListener('click', () => { hidden(el('abort-confirmation'), false); hidden(el('mission-abort'), true); el('confirm-abort').focus({ preventScroll: true }); });
    el('cancel-abort').addEventListener('click', resetConfirmation);
    el('confirm-abort').addEventListener('click', () => request('abortMission'));
    el('mission-resume').addEventListener('click', () => {
      const reply = bridge.setPaused(false, 'user');
      if (reply.ok) shell.closeGuide(); else text('mission-guide-message', `Could not resume (${reply.reason}).`);
    });
    dialog.addEventListener('close', resetConfirmation);
    document.addEventListener('fodder-storage-change',refresh);
    for (const type of ['keydown', 'keyup']) screen.addEventListener(type, event => event.stopPropagation());
    const timer = root.setInterval(refresh, 100);
    root.addEventListener('pagehide', event => { if (!event.persisted) root.clearInterval(timer); });
    refresh(); return Object.freeze({ refresh });
  }
  const api = Object.freeze({ presentation, mount });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OpenFodderMission = api;
})(globalThis);
