/* The hosted artifact contains no game assets. Verify pinned upstream/local data. */
'use strict';
const statusLine = document.getElementById('status');
const startButton = document.getElementById('start');
const loadButton = document.getElementById('load-demo');
const packInput = document.getElementById('pack');
const filesInput = document.getElementById('demo-files');
const fileProgress = document.getElementById('file-progress');
const localFiles = new Map();
const canvas = document.getElementById('canvas');
let phoneShell = null;
let missionUI = null;
let checkpointUI = null;
let runtimeReady = false;
let pack = null;
let manifest;
let started = false;
let failed = false;
let importing = false;
const bootStarted = performance.now();

function status(message) {
  if (!failed) statusLine.textContent = message;
}
function fail(message) {
  failed = true;
  statusLine.classList.add('error');
  statusLine.textContent = message;
  document.getElementById('status-region').classList.add('has-error');
  document.getElementById('reload').hidden = false;
  phoneShell?.setError();
  document.dispatchEvent(new Event('fodder-runtime-error'));
  updateControls();
}
function log(message) {
  const output = document.getElementById('log');
  output.textContent = (output.textContent + String(message) + '\n').slice(-16000);
}
function updateControls() {
  startButton.disabled = failed || !runtimeReady || !pack || started || importing;
  loadButton.disabled = failed || !runtimeReady || started || importing;
  filesInput.disabled = packInput.disabled = failed || started || importing;
}
function ready() {
  updateControls();
  if (runtimeReady && !pack && !importing) status('Engine ready. Tap Load demo from GitHub to continue.');
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
  async onRuntimeInitialized() {
    try {
      const {info,content}=await metadataReady;
      window.fodderSaves=OpenFodderSaves.create(Module,info,content);
      // Populate the real /Saves mount before main/ResourceMan discovers saves.
      // A storage failure is recoverable; the engine can still play in memory.
      await window.fodderSaves.initialize();
      window.fodderInput = OpenFodderInput.create(Module, canvas);
      checkpointUI=OpenFodderSaves.bind(window.fodderSaves,window.fodderInput);
      window.fodderCheckpointUI=checkpointUI;
      const physical = OpenFodderTouch.mount(window.fodderInput, canvas);
      phoneShell?.connect(window.fodderInput, physical);
      window.fodderLifecycle=OpenFodderLifecycle.mount(window.fodderInput,physical,phoneShell);
      missionUI = OpenFodderMission.mount(window.fodderInput, phoneShell);
      setupInputHarness(window.fodderInput);
      runtimeReady = true;
      log(`Runtime ready in ${Math.round(performance.now() - bootStarted)} ms.`);
      ready();
    } catch(error) { fail(`Could not prepare the preview: ${error.message}. Reload to retry.`); }
  },
  onGameStatus(state, cheats) {
    document.body.dataset.gameState = state;
    document.body.dataset.cheats = cheats ? 'on' : 'off';
    document.getElementById('cheat-tag').hidden = !cheats;
    missionUI?.refresh();
    phoneShell?.setGameState(state);
    document.dispatchEvent(new Event('fodder-game-stage'));
    const label = { menu: 'Mission menu', briefing: 'Mission briefing', battlefield: 'Battlefield loaded', ending: 'Mission ending', result: 'Mission result' }[state] || 'Starting game';
    status(`${label} · cheats ${cheats ? 'ON (diagnostic)' : 'off'} · audio disabled`);
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
document.getElementById('reload').addEventListener('click', () => window.location.reload());
setTimeout(() => {
  if (!runtimeReady && !failed) fail('Engine loading timed out after 90 seconds. Check your connection, allow WebAssembly/WebGL, and reload.');
}, 90000);
try { phoneShell = OpenFodderShell.mount(canvas); }
catch (error) { fail(`Could not prepare the game screen: ${error.message}. Reload to retry.`); }

const metadataReady = Promise.all([
  fetch('build-info.json').then(r => { if (!r.ok) throw Error('Missing build identity'); return r.json(); }),
  fetch('content-manifest.json').then(r => { if (!r.ok) throw Error('Missing content manifest'); return r.json(); })
]).then(([info, content]) => {
  manifest = content;
  document.getElementById('identity').textContent = `Build ${info.commit.slice(0, 12)}${info.dirty ? ' *' : ''}`;
  document.getElementById('identity').title = `jbbejena/openfodder · ${info.commit}${info.dirty ? ' (local changes)' : ''}`;
  document.getElementById('build-details').textContent = JSON.stringify(info, null, 2);
  return {info,content};
}).catch(error => { fail(error.message); throw error; });

async function checkFile(data, entry) {
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)), b => b.toString(16).padStart(2, '0')).join('');
  if (data.length !== entry.size || hash !== entry.sha256) throw Error(`Content mismatch: ${entry.path}`);
}

loadButton.addEventListener('click', async () => {
  if (failed || started || importing || !runtimeReady) return;
  importing = true;
  pack = null;
  updateControls();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let loaded = 0;
  try {
    await metadataReady;
    status('Downloading the demo from upstream GitHub…');
    fileProgress.textContent = '0 of 20 demo files downloaded.';
    // Data stays at its existing publisher. Nothing is bundled or mirrored on
    // the Site. Public cross-origin requests must never carry Site credentials.
    const base = `https://raw.githubusercontent.com/OpenFodder/data/${manifest.data_revision}/`;
    const candidate = await Promise.all(manifest.files.map(async entry => {
      const url = base + entry.path.split('/').map(encodeURIComponent).join('/');
      const response = await fetch(url, {
        mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal
      });
      if (!response.ok) throw Error(`GitHub returned ${response.status} for ${entry.path}`);
      const data = new Uint8Array(await response.arrayBuffer());
      await checkFile(data, entry);
      if (controller.signal.aborted) throw new DOMException('Download canceled', 'AbortError');
      fileProgress.textContent = `${++loaded} of 20 demo files downloaded and verified.`;
      return [entry.path, data];
    }));
    pack = candidate;
    localFiles.clear();
    ready();
  } catch (error) {
    controller.abort();
    const reason = error.name === 'AbortError' ? 'The download timed out.' : error.message;
    status(`Could not load the demo: ${reason} Tap Load demo to retry, or choose local files.`);
    log(reason);
  } finally {
    clearTimeout(timeout);
    importing = false;
    updateControls();
  }
});

filesInput.addEventListener('change', async () => {
  if (failed || started || importing) return;
  const batch = Array.from(filesInput.files);
  if (!batch.length) return;
  pack = null;
  startButton.disabled = true;
  // Snapshot before asynchronous reads so another picker selection cannot change
  // this batch. Keep a previously verified batch if a replacement is invalid.
  let accepted = false;
  importing = true;
  updateControls();
  try {
    await metadataReady;
    if (batch.length > manifest.files.length) throw Error('Choose only the Christmas Special demo files.');
    const candidate = new Map(localFiles);
    for (const file of batch) {
      const entry = manifest.files.find(item => item.path.split('/').pop() === file.name);
      if (!entry) throw Error(`Not a Christmas Special file: ${file.name}. Unzip the archive first and choose its files.`);
      if (file.size !== entry.size) throw Error(`Content mismatch: ${entry.path}`);
      const data = new Uint8Array(await file.arrayBuffer());
      await checkFile(data, entry);
      candidate.set(entry.path, data);
    }
    localFiles.clear();
    for (const [path, data] of candidate) localFiles.set(path, data);
    accepted = true;
  } catch (error) {
    log(error.message);
    status(`Cannot use these demo files: ${error.message}`);
  } finally {
    const missing = manifest ? manifest.files.filter(item => !localFiles.has(item.path)) : [];
    fileProgress.textContent = `${localFiles.size} of 20 demo files verified.${missing.length === 1 ? ` Still needed: ${missing[0].path}` : ''}`;
    if (accepted && localFiles.size < 20) status(fileProgress.textContent);
    if (localFiles.size === 20) {
      pack = manifest.files.map(entry => [entry.path, localFiles.get(entry.path)]);
      ready();
    }
    // Clear the picker, not the verified map: subsequent selections add files.
    filesInput.value = '';
    importing = false;
    updateControls();
  }
});

packInput.addEventListener('change', async () => {
  if (failed || started || importing || !packInput.files.length) return;
  pack = null;
  startButton.disabled = true;
  importing = true;
  updateControls();
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
      await checkFile(data, entry);
      checked.push([entry.path, data]);
    }
    pack = checked;
    localFiles.clear();
    fileProgress.textContent = '20 of 20 demo files verified from the local pack.';
    ready();
  } catch (error) {
    // File validation is recoverable: keep the picker usable for another file.
    status(`Cannot use this demo pack: ${error.message}`);
    log(error.message);
  } finally {
    importing = false;
    updateControls();
  }
});
startButton.addEventListener('click', () => {
  if (!runtimeReady || !pack || started || failed || importing) return;
  started = true;
  updateControls();
  try {
    for (const [path, data] of pack) {
      Module.FS.mkdirTree('/' + path.slice(0, path.lastIndexOf('/')));
      Module.FS.writeFile('/' + path, data);
    }
    Module.FS.mkdirTree('/Saves');
    const args = document.getElementById('cheats').checked ? ['--cheats'] : [];
    document.getElementById('launch').hidden = true;
    canvas.classList.add('running');
    phoneShell.start();
    canvas.focus({ preventScroll: true });
    Module.callMain(args);
    pack = null;
    localFiles.clear();
  } catch (error) {
    fail(`Startup failed: ${error.message}. Check the log and reload.`);
  }
});
