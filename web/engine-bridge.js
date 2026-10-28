/* Open Fodder browser input boundary. GPL-3.0-or-later; see COPYING. */
(function (root) {
  'use strict';
  const actions = { cancel: 0, selectSquad: 1, move: 2, fireStart: 3, fireAim: 4,
    fireStop: 5, selectWeapon: 6, pan: 7, follow: 8, pause: 9 };
  const errors = { '-1': 'invalid', '-2': 'uninitialized', '-3': 'not-battlefield',
    '-4': 'paused', '-5': 'no-squad', '-6': 'unavailable', '-7': 'busy', '-8': 'unsupported' };
  const rejected = reason => ({ ok: false, reason });
  const finite = (...values) => values.every(Number.isFinite);

  // object-fit:contain, centered, with no canvas border/padding. CSS client
  // coordinates already include zoom/DPR; do not multiply by devicePixelRatio.
  function contentRect(canvas) {
    const rect = canvas.getBoundingClientRect();
    if (!canvas.width || !canvas.height || !rect.width || !rect.height) return null;
    const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
    const width = canvas.width * scale, height = canvas.height * scale;
    return { left: rect.left + (rect.width - width) / 2,
      top: rect.top + (rect.height - height) / 2, width, height };
  }
  function clientToWorld(canvas, view, clientX, clientY) {
    const rect = contentRect(canvas);
    if (!rect || !view || !finite(clientX, clientY)) return null;
    const x = (clientX - rect.left) * view.width / rect.width;
    const y = (clientY - rect.top) * view.height / rect.height;
    if (x < view.sidebar || x >= view.width || y < 0 || y >= view.height) return null;
    return { x: Math.floor(x - view.sidebar + view.cameraX), y: Math.floor(y + view.cameraY) };
  }
  function worldToClient(canvas, view, x, y) {
    const rect = contentRect(canvas);
    if (!rect || !view || !finite(x, y)) return null;
    return { x: rect.left + (x - view.cameraX + view.sidebar) * rect.width / view.width,
      y: rect.top + (y - view.cameraY) * rect.height / view.height };
  }
  function create(Module, canvas) {
    const state = () => typeof Module._of_web_state !== 'function' ? { api: 1, stage: 'uninitialized', ready: false } :
      JSON.parse(Module.UTF8ToString(Module._of_web_state()));
    function send(action, a = 0, b = 0) {
      if (!finite(a, b) || !Number.isInteger(a) || !Number.isInteger(b)) return rejected('invalid');
      if (typeof Module._of_web_command !== 'function') return rejected('uninitialized');
      const id = Module._of_web_command(action, a, b);
      return id >= 0 ? { ok: true, id } : rejected(errors[id] || 'unknown');
    }
    function world(action, point) {
      if (!point || !finite(point.x, point.y)) return rejected('invalid');
      return send(action, Math.floor(point.x), Math.floor(point.y));
    }
    function at(action, x, y) {
      const current = state();
      if (!current.view) return rejected(current.stage === 'uninitialized' ? 'uninitialized' : 'not-battlefield');
      const point = clientToWorld(canvas, current.view, x, y);
      return point ? world(action, point) : rejected('outside-playfield');
    }
    return Object.freeze({
      state,
      cancel: () => send(actions.cancel),
      selectSquad: id => send(actions.selectSquad, id),
      moveTo: point => world(actions.move, point),
      moveAt: (x, y) => at(actions.move, x, y),
      fireStart: point => world(actions.fireStart, point),
      fireStartAt: (x, y) => at(actions.fireStart, x, y),
      fireAim: point => world(actions.fireAim, point),
      fireAimAt: (x, y) => at(actions.fireAim, x, y),
      fireStop: () => send(actions.fireStop),
      selectWeapon: weapon => weapon === 'grenade' || weapon === 'rocket' ?
        send(actions.selectWeapon, weapon === 'grenade' ? 1 : 3) : rejected('invalid'),
      pan: (x, y) => finite(x, y) ? send(actions.pan, Math.round(x), Math.round(y)) : rejected('invalid'),
      follow: () => send(actions.follow),
      setPaused(paused, reason = 'user') {
        const bit = { user: 1, visibility: 2, focus: 4 }[reason];
        return typeof paused === 'boolean' && bit ? send(actions.pause, Number(paused), bit) : rejected('invalid');
      },
      clientToWorld: (x, y) => clientToWorld(canvas, state().view, x, y),
      worldToClient: (x, y) => worldToClient(canvas, state().view, x, y)
    });
  }
  const api = Object.freeze({ create, clientToWorld, worldToClient });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OpenFodderInput = api;
})(globalThis);
