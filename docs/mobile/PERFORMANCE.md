# Optional performance recording (MOB-011)

Open [the standalone preview](https://openfodder-phase-one.zanysky263.chatgpt.site)
in Safari. No ChatGPT login, computer or local game files are required. Check the
build identifier against the [test record](test-runs/performance.md). Load the
demo from GitHub, Start game, select the first mission and Deploy.

1. Open **Guide → Performance test**. Enter the actual iPhone model and iOS
   version. Choose first/cleared-cache or repeat/reload only when that describes
   this page load. Those are tester labels, not verified cache states.
2. Tap **Record performance**. Guide closes. Play normally, including movement,
   primary fire and camera gestures. The header shows `REC` and active combat
   time. Menus, Guide, user pause, camera setup and away time do not count.
3. Keep one recording for **at least ten active minutes**, or the whole mission
   if longer. Retry or return to the menu as needed; the recording can span
   attempts. Exercise several retries/menu cycles. Note input response, visible
   stutter, heat and interruptions. Recording stops at 30 minutes of wall time;
   export and start a new segment if a longer mission requires it.
4. Open Guide again. Add observations, then **Stop recording → Export report**.
   Safari downloads a JSON file; save it in Files if prompted. Export also stops
   a running recording. Export before reloading or starting another recording,
   which replaces the old one. The JSON contains measurements and labels, not
   game content or a checkpoint. It stays on the device; nothing is uploaded.
5. For a repeat-load comparison, export first, reload in the same Safari tab,
   load/start/deploy again and repeat. Record connection and whether Safari's
   cache was intentionally cleared. Do not clear website data without first
   exporting any checkpoint you want to retain.

Record Safari-tab and Home Screen sessions separately. An away/Back/Forward
Cache return retains the recorder if the page survives; use **Return to game**.
A reload/OS page eviction loses an unexported report and the live battlefield.
Audio remains disabled by the existing null backend.

Actual iPhone testing and the 30 **rendered** FPS target remain **NOT RUN / not
established**. User agent, viewport emulation, compiler success and a report's
`tenMinutesActive: true` cannot establish physical-device acceptance. Observed
desktop results are [recorded separately](test-runs/performance.md). No
performance settings or simulation/weapon timing were changed without phone
measurements.

## What is measured

| Field | Boundary and limits |
| --- | --- |
| Submitted FPS | Successful `SDL_RenderPresent` calls divided by sampled active combat time (`submittedPerActiveSecond`). Calls can outnumber browser animation callbacks. This is **not physical displayed FPS**, GPU completion or compositor throughput. |
| Submission pacing | Time between consecutive successful active submissions; each resumed segment starts a new baseline. `submittedFps` is the reciprocal average interval; p50/p95/p99 are histogram **upper bounds** in milliseconds. Null with nonzero intervals means the percentile is over 1000ms; `over1000Ms` and exact maximum identify those stalls. Failed presents are counted separately; the next success includes the gap. |
| Animation callbacks | `requestAnimationFrame` intervals/opportunities during active combat, independent of submissions. Not rendered FPS. Inactive/lifecycle/stage gaps reset this baseline. |
| Active and wall time | Native callbacks sample active battlefield time; paused, ending/menu, initial camera setup and lifecycle holds are excluded. Wall time includes them. This is diagnostic sampling, not a replacement simulation clock. |
| Wasm capacity | `emscripten_get_heap_size()`: allocated WebAssembly linear memory capacity, start/peak/end and one-second samples. **Not used heap or total Safari/GPU RAM**. Capacity can stay high after freeing memory; stable capacity cannot prove no leaks. JS heap usage is not fabricated when unavailable. |
| Engine ready | Navigation start to runtime, metadata, checkpoint storage and browser-adapter initialization. Includes waits; not just Wasm compilation. |
| Content load | Click/picker processing to read/fetch + SHA-256 verification; source and success are recorded. Local-file batches can be partial. Exact full demo logical size is 223,382 bytes, 20 pinned files. These are not network transfer bytes. |
| Start / Deploy | Start click to native menu stage; Deploy/Retry click to native battlefield stage. These stage boundaries precede guaranteed visual presentation. |
| Sizes and identity | Full fork commit/dirty flag, pinned Run/Scripts/compiler/SDL, content ID and logical runtime-file sizes from `build-info.json`. Source/notices and metadata sizes are separate; compressed transfer size/cache state are unknown. |
| Context | Mission/map/attempt, native ticks, pause reasons, viewport/canvas/DPR, cheat flag, user agent, optional user labels/observations and tab/Home Screen mode. A context event omits continuously changing ticks; one-second samples retain them. No URL query, cookies, checkpoint or filesystem payload is read. |

The selected original Christmas demo has four troops on `mapm1`, nine allocated
slots and three squads. The engine/data/Scripts pins and game content are
unchanged. The host still contains no game assets: the browser fetches the
existing pinned upstream files with credentials omitted and verifies their hashes,
or validates a player-supplied local pack. Data mirroring permission remains
unresolved; GPL source permissions are separate.

## Implementation and bounds

`Source/WebPerformance.*` is entirely Emscripten-only. Measurements are off by
default. `Window::FrameEnd` calls the normal SDL present once and observes its
result. `web_loop` observes time without changing scheduling, the existing
interrupt/phase logic or `Sleep(10)`. Stage and synchronous lifecycle boundaries
break the interval baseline so suspension time cannot become a frame-time spike.
Original engine simulation ticks remain authoritative.

The optional ABI is additive and independent of command API v1 and checkpoints:

```text
of_web_performance(0) → JSON snapshot
of_web_performance(1) → reset counters and start
of_web_performance(2) → stop counters and snapshot
of_web_performance_active() → cheap boolean RAF gate
```

Operations must be finite integral 0/1/2; invalid operations return `ok:false`
without resetting or changing gameplay. Copy the returned C string immediately
using `Module.UTF8ToString`. Native histograms have 1001 fixed buckets. The JS
recorder runs only while opted in: one one-second timeout and one RAF chain,
at most 1800 sample rows, 100 context/interruption events and 30 minutes wall
time. Excess events are counted, not retained. Stop/export cancels both chains;
another recording resets the session. Startup retains only the last 20 content
attempts and 20 deployment timings, independently of recording. Repeated
pageshow does not install handlers or create another recorder.

Reports use `format: openfodder-performance`, `version: 1`. Export stops the
session and downloads locally; reload is intentionally not a persistence path.
Runtime failure stops sampling best-effort and marks `nativeStopUnconfirmed` if
the native boundary no longer answers. No telemetry service or new dependency.

## Repeatable desktop checks

```sh
./scripts/build-web.sh
node --test --test-isolation=none web/*.test.cjs # Node 24, 52 individual tests
python3 scripts/check-web-artifact.py
python3 -m http.server 8765 --bind 127.0.0.1 --directory build-web/cmake/dist
```

In another terminal, using Playwright Core 1.57.0 and Chromium 154 in the
recorded environment (or point these variables at your installed equivalents):

```sh
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
CHROMIUM_PATH=/usr/bin/chromium node scripts/smoke-web-performance.cjs \
  http://127.0.0.1:8765 build-web/local-only/christmas.ofdata \
  build-web/local-only/performance-evidence "$(git rev-parse HEAD)"
```

Create the ignored local pack using [the build instructions](BUILD.md), or use
`upstream` instead of its path to fetch/verify the pinned data in the browser.
The same script accepts the public preview URL and full published code commit.
It downloads/parses the real report, probes the actual native ABI, checks
pause/away exclusions, five recording/abort/menu-or-retry cycles, stopped sampler
cleanup, first/repeat navigation timings and composited battlefield pixels. It
checks fifteen actual native callbacks rather than assuming one per display
frame. Screenshots, reports and profiles stay ignored under `build-web/local-only`;
they are not committed or uploaded. Focus/cache and storage regressions have
their own [lifecycle](LIFECYCLE.md) and [checkpoint](CHECKPOINTS.md) scripts.
