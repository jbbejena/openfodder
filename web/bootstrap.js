/* The hosted artifact contains no game assets. Import only an exact local pack. */
'use strict';
const statusLine = document.getElementById('status');
const startButton = document.getElementById('start');
const packInput = document.getElementById('pack');
const canvas = document.getElementById('canvas');
let runtimeReady = false;
let pack = null;
let manifest;
let started = false;
let failed = false;
const bootStarted = performance.now();

function status(message) {
  if (!failed) statusLine.textContent = message;
}
function fail(message) {
  failed = true;
  statusLine.classList.add('error');
  statusLine.textContent = message;
  startButton.disabled = true;
}
function log(message) {
  const output = document.getElementById('log');
  output.textContent = (output.textContent + String(message) + '\n').slice(-16000);
}
function ready() {
  startButton.disabled = failed || !runtimeReady || !pack || started;
  if (runtimeReady && !pack) status('Engine ready. Select your local demo pack to continue.');
  if (runtimeReady && pack) status('Demo verified. Start game to open the campaign menu.');
}
// Defined before Emscripten's generated script. Boot the runtime/preloaded GPL
// support first, then mount player data and call main only after a user action.
var Module = {
  canvas,
  noInitialRun: true,
  print: log,
  printErr: log,
  setStatus(message) { if (message) status(message); },
  onAbort(reason) { fail(`Engine stopped: ${reason}. Check the build log and reload to retry.`); },
  onExit(code) { fail(`Engine exited (${code}). Check the log and reload to retry.`); },
  onRuntimeInitialized() {
    runtimeReady = true;
    log(`Runtime ready in ${Math.round(performance.now() - bootStarted)} ms.`);
    ready();
  },
  onGameStatus(state, cheats) {
    document.body.dataset.gameState = state;
    document.body.dataset.cheats = cheats ? 'on' : 'off';
    status(`${state === 'menu' ? 'Campaign menu' : state === 'battlefield' ? 'Battlefield loaded' : 'Starting game'} · cheats ${cheats ? 'ON (diagnostic)' : 'off'} · audio disabled`);
    log(`Engine state: ${state}; cheats=${Boolean(cheats)}`);
  }
};
window.addEventListener('error', event => fail(`Could not run the preview: ${event.message || 'engine download failed'}. Check the connection/build log and reload.`));
window.addEventListener('unhandledrejection', event => fail(`Could not load the preview: ${event.reason}. Reload to retry.`));
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  fail('The graphics context was lost. Reload to restart; this preview does not save a battlefield.');
});
canvas.addEventListener('contextmenu', event => event.preventDefault());
setTimeout(() => {
  if (!runtimeReady && !failed) fail('Engine loading timed out after 90 seconds. Check your connection, allow WebAssembly/WebGL, and reload.');
}, 90000);

const metadataReady = Promise.all([
  fetch('build-info.json').then(r => { if (!r.ok) throw Error('Missing build identity'); return r.json(); }),
  fetch('content-manifest.json').then(r => { if (!r.ok) throw Error('Missing content manifest'); return r.json(); })
]).then(([info, content]) => {
  manifest = content;
  document.getElementById('identity').textContent = `jbbejena/openfodder · ${info.commit.slice(0, 12)}${info.dirty ? ' (local changes)' : ''}`;
  document.getElementById('build-details').textContent = JSON.stringify(info, null, 2);
}).catch(error => { fail(error.message); throw error; });

packInput.addEventListener('change', async () => {
  pack = null;
  startButton.disabled = true;
  if (failed) return;
  try {
    await metadataReady;
    const file = packInput.files[0];
    if (!file) { ready(); return; }
    if (file.size > 400000) throw Error('Pack is too large; select the exact Christmas Special pack.');
    status('Checking local demo files…');
    const candidate = JSON.parse(await file.text());
    if (candidate.id !== manifest.id || !candidate.files || Object.keys(candidate.files).length !== manifest.files.length) {
      throw Error('Wrong pack. Use scripts/make-local-web-pack.py with the pinned Run checkout.');
    }
    const checked = [];
    for (const entry of manifest.files) {
      const encoded = candidate.files[entry.path];
      if (typeof encoded !== 'string') throw Error(`Missing ${entry.path}`);
      const data = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)), b => b.toString(16).padStart(2, '0')).join('');
      if (data.length !== entry.size || hash !== entry.sha256) throw Error(`Content mismatch: ${entry.path}`);
      checked.push([entry.path, data]);
    }
    pack = checked;
    ready();
  } catch (error) {
    // File validation is recoverable: keep the picker usable for another file.
    status(`Cannot use this demo pack: ${error.message}`);
    log(error.message);
  }
});
startButton.addEventListener('click', () => {
  if (!runtimeReady || !pack || started || failed) return;
  started = true;
  startButton.disabled = true;
  try {
    for (const [path, data] of pack) {
      Module.FS.mkdirTree('/' + path.slice(0, path.lastIndexOf('/')));
      Module.FS.writeFile('/' + path, data);
    }
    Module.FS.mkdirTree('/Saves');
    const args = document.getElementById('cheats').checked ? ['--cheats'] : [];
    document.getElementById('launch').hidden = true;
    canvas.classList.add('running');
    canvas.focus();
    Module.callMain(args);
    pack = null;
  } catch (error) {
    fail(`Startup failed: ${error.message}. Check the log and reload.`);
  }
});
