# Browser interruptions (MOB-010)

Leaving a started game pauses it. On returning, **Game paused while away** asks
for **Return to game** before the engine runs again. Held touch/native input is
released. A prior manual pause or open Guide/portrait guidance remains paused
after Return; close that surface or explicitly resume combat as appropriate.
This policy also gates mission transitions, including a Deploy accepted just
before interruption. It does not save or reconstruct a live battlefield.

## Events and ownership

| Event | Policy |
| --- | --- |
| Window blur / document hidden | Synchronously release input, gate engine work and latch explicit return |
| Focus / visible again | Remove that physical blocker; retain return latch |
| Page hide / Chromium freeze | Suspend and latch return before the browser can stop callbacks |
| Page show / Chromium resume | Re-read visibility/focus, preserve return; present the dialog only when active |
| Return to game | Clear lifecycle latch only when visible, focused and not suspended; preserve user/Guide pause |
| Reload / page discarded | Load demo again and Continue a confirmed mission-start checkpoint; unsaved battlefield is gone |

Before main starts, visibility/focus can gate startup without inventing an
interrupted mission. Once started, menu/briefing/result interruptions also require
Return so a queued transition cannot surprise the player after coming back.
Repeated signals coalesce, rather than toggling pause or registering extra loops.

`web/lifecycle.js` owns these browser signals. It cancels the physical controller
and diagnostic input, then calls the **synchronous** native safety operation
`of_web_lifecycle(mask)` through `fodderInput.setLifecycle(mask)`. A queued pause
could miss the last animation callback before a page freeze, so it is not used
for this boundary. Normal combat and mission commands retain their existing queue.

The mask contains only **2** (hidden), **4** (unfocused), **16** (suspended or
awaiting Return). JS and C++ both reject nonintegral, nonfinite, out-of-range or
unknown bits. A valid call works before engine startup. It releases primary/
secondary latches, camera ownership, native buttons/control/key state and stale
SDL input events; removes queued physical combat actions; retains accepted
mission transitions and explicit pause requests. It returns 0 or -1, not a queued
command ID. `state().lifecycleReasons` is available at every stage; battlefield
`pauseReasons` combines it with ordinary **1** (user) and **8** (presentation).
Legacy queued visibility/focus pause operations remain additive, not owners of
the synchronous lifecycle latch.

The native adapter keeps lifecycle bits separate from user/Guide bits, and stage
changes cannot clear them. `web_loop` returns before native simulation, input,
render and ending cleanup whenever lifecycle is held. Main-loop registration
stays intact so the browser can schedule it again. Resume uses the existing
ordinary per-callback clock; no elapsed-time accumulator, catch-up loop, changed
simulation rate or replacement engine is introduced. The current battlefield's
movement/projectiles remain engine state and continue only after Return.

## Back/Forward Cache and recovery

The touch HUD, Guide/shell, mission UI and diagnostics keep their existing timers
on a **persisted** pagehide. The browser freezes/resumes them; pageshow does not
install duplicate intervals or handlers. A nonpersisted unload stops those timers
and the next page initializes normally. Shell geometry is refreshed after return.

The lifecycle dialog uses the existing safe-area/visual-viewport layout and native
modal focus containment. It can sit above an already open Guide without closing
it. Underlying mission/Guide input gates allow its Return button while still
blocking playfield input. Escape cannot bypass explicit return or reach native
abort. Graphics/runtime failure retains the existing reload/error route.

Browser/OS eviction, an interrupted process with no delivered event and actual
Safari Back/Forward Cache behavior are not guaranteed by this policy. A live
page return and a reload are different cases. There is no unload-only save;
confirmed [MOB-009 checkpoints](CHECKPOINTS.md) and exported backups remain the
supported reload recovery route. No cloud/offline/PWA storage is added.

## Audio audit and limitation

At base `965b90f3105e5861057e27b36937e66268f4f09d`, CMake defines
`OPENFODDER_NO_MIXER` for Emscripten. `sGameVersion::GetSound()` in `Versions.cpp`
therefore returns `cSound_Null` for **all** versions before reaching the Amiga
backend. `Sound_Null.cpp` opens no device and its play/stop methods do nothing.
The Amiga SDL audio stream code compiles but is not selected.

The pinned pack **does** include `AFXBASE.INS` (44,025 bytes) and `AFXBASE.SNG`
(1,020 bytes). Silent operation is a build/backend limitation, not missing those
files or a proven Safari autoplay failure. This task retains that explicit silent
baseline. There is no supported active audio context to resume, no automatic
audio restart on focus and no new audio asset download. Audible playback,
user-gesture audio unlock, interruptions and duplicate-stream prevention require
a separately enabled/tested audio path; they are **not claimed passed** here.
Do not add a cosmetic sound switch that suggests otherwise.

## Verification boundary

```sh
node --test web/*.test.cjs
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
python3 -m http.server 8095 --bind 127.0.0.1 --directory build-web/cmake/dist
PLAYWRIGHT_MODULE=/path/to/playwright-core \
  node scripts/smoke-web-lifecycle.cjs http://127.0.0.1:8095/ \
  build-web/local-only/christmas.ofdata build-web/local-only/lifecycle-evidence \
  FULL_BUILD_COMMIT
```

The smoke records exact browser/build identity, immediate native input release,
paused ticks, independent pauses, a Chromium freeze/resume attempt, per-frame
increments, repeated persisted signals and an actual Back/Forward Cache attempt.
Real browser signals, synthetic signals and any cache miss are reported separately.
For public QA use `upstream` instead of the pack; no assets/profiles/screenshots
are uploaded. See the task test record/handoff for observed results.

Actual iPhone Safari/physical touch/audio/OS interruptions and Home Screen launch
remain separate checks, **NOT RUN** without that hardware. Emulation, Chrome
freeze and successful builds do not pass M1/M2/M3 or establish mobile readiness.
