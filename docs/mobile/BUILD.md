# Reproducible browser build (MOB-002/003)

The pinned Phase 1 build now includes the Phase 2 command foundation (MOB-004)
and [touch commands/camera](TOUCH_CONTROLS.md) (MOB-005/006). The [command API](INPUT_API.md)
and squad/Move/Fire/secondary/Pan/Follow controls plus the [phone shell/HUD](PHONE_LAYOUT.md)
(MOB-007) and [mission flow](MISSION_FLOW.md) (MOB-008) are implemented. An unmodified
mission reached defeat through emulated touch. MOB-009 adds [mission-start
checkpoint persistence](CHECKPOINTS.md). MOB-010 adds [interruption-safe return](LIFECYCLE.md)
and corrects the black battlefield found by pixel/screenshot QA. Actual iPhone acceptance remains pending.
[Baseline and game-data permissions](BUILD_BASELINE.md) are separate from engine
licensing. The build hosts **no game data**, including the campaign descriptor.

## Build and run

Linux x86_64 (also usable inside WSL2). Prerequisites: Git, Python 3 with venv/pip,
a C/C++ capable Linux environment, and HTTPS access to GitHub, PyPI and
`storage.googleapis.com`. From a recursive checkout of this fork:

```sh
git submodule update --init --recursive
./scripts/build-web.sh
```

That is the supported build command. It bootstraps and verifies the pins below,
stages only GPL Scripts plus the controlled ini, runs CMake/Ninja, and packages
HTML, JS, Wasm, support `.data`, matching source and license notices. All toolchain,
cache and output files live under ignored `build-web/`. `WEB_JOBS=2` can reduce
parallel compiler memory use (default 4). Do not use `git submodule update --remote`.

```sh
python3 scripts/check-web-artifact.py
python3 -m http.server 8080 --directory build-web/cmake/dist
```

Open `http://localhost:8080/`. `file://` is unsupported. Use HTTPS for a hosted
preview; localhost is a secure context for the pack's SHA-256 verification.
The output entry point is `index.html`, with `index.js`, `index.wasm`, `index.data`,
`bootstrap.js`, `engine-bridge.js`, `touch-controls.js`, `phone-shell.js`,
`mission-flow.js`, `checkpoints.js`, `lifecycle.js`, `input-harness.js`,
`style.css`, `content-manifest.json`, `build-info.json`,
`source.zip`, `SOURCE.txt`, and `notices/`. Serve Wasm as `application/wasm`.
No pthreads, cross-origin isolation headers or external asset services are needed.

For local development with uncommitted changes the header says “local changes”;
artifact verification requires `--allow-dirty` explicitly. Publish only a clean,
committed build. Commit first and run the build command again so both the engine's
git version and visible full build identity match that commit. `source.zip`
contains the actual engine/shell/Scripts/build source used, not an offer to supply
it later. No retail/demo bytes are included in that archive.

The old Windows helper now delegates to this command through WSL. That wrapper
has not been run on Windows in this session; the Linux command is the tested path.

## Exact toolchain

| Component | Tested pin |
| --- | --- |
| emsdk checkout | `c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56` (4.0.23) |
| SDK release bundle | `aaa43392544d695232b70eda706d751f18980c2a` |
| emcc | 4.0.23, `7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed` |
| SDK Node | 22.16.0 |
| CMake / Ninja Python packages | `cmake==3.31.6`, `ninja==1.11.1.4` (Ninja binary 1.11.1) |
| Web SDL port | SDL **3.2.22**, `release-3.2.22`, SDK `tools/ports/sdl3.py` |
| SDL archive verification | SHA-512 `2d49f43f37b681b3b12918518fc2bb89fd79f64b6f9592cceb504402a9cfb3d5c0ae6f437cdbcd8fdef11065dfb15a86fcb61a58cf1fa41af71a61f767ab7260` |

The web SDL pin comes from the tested SDK, not Windows' SDL 3.4.0. The SDK calls
its SDL3 port experimental. FFmpeg auto-detection is disabled for this build.
Existing `OPENFODDER_NO_MIXER` behavior is retained: the browser engine is silent.

## Load the test demo

The selected pack has 20 files (223,382 bytes): 19 demo files and one campaign
from Run `070a6086c62164e859fc3274b75b5f536fa9d902`. The supported first map is
Christmas Special / LAND OF HOPE AND GLORY / `mapm1`. Scripts remain at
`dad04730860bcdd1189aa8562860e379b0f5d783`.

The default phone-only route is **Load demo from GitHub → Start game** in the
hosted preview. All 20 exact files download directly from the existing upstream
publisher at the pinned Run commit. The browser checks each size/SHA-256 before
allowing startup; there are no Site credentials/cookies on those public requests.
A failed or timed-out download can be retried; partial data cannot start the game.
No ZIP, Files-app selection, Git, terminal or compiler is needed on the phone.

Cold top-level runtime/support files are **3,027,663 bytes**, plus **223,382 bytes**
of demo content: roughly **3.25 MB before compression** at `1de52e57c4c1`.
The **1,932,326-byte** source archive is an optional
separate download, not required to start. These sizes describe the selected two-
mission demo; the full retail campaign is not bundled or measured.

The Site continues to host no game data. The browser fetches files from their
existing upstream GitHub location; this does not establish permission to bundle
or mirror those files on our own host. That publication question remains open.

If upstream access is unavailable, expand **Use local files instead**. The local
route accepts the 19 extracted `Data/AmigaFormat_XMAS` files and
`Campaigns/Amiga Format Christmas Special.ofc` across separate picker visits,
or the existing computer-generated pack. On iPhone, **Get local files on iPhone**
links the pinned upstream ZIP for extraction in Files → Downloads. Choose Browse
rather than the photo library. Files stay in browser memory and are never uploaded.

The existing computer-generated pack remains supported:

```sh
python3 scripts/make-local-web-pack.py
```

This writes `build-web/local-only/christmas.ofdata`, outside the served directory.
Keep it local. **Do not upload it to hosting, Git, CI artifacts or this PR.** No
redistribution grant for the demo/campaign has been established. A player supplies
their own files, subject to their applicable terms; the helper is not a license.

Select that file in the preview, choose **Start game**, select a mission, read
its objectives, then **Deploy mission**. The importer
checks every path/size/SHA-256 before writing anything into the in-memory filesystem.
It accepts only the selected pack, not arbitrary scripts or retail content.
No pack data leaves the browser. Reload clears imported game content and the
current battlefield; explicit [confirmed checkpoints](CHECKPOINTS.md) persist
separately in this browser's storage. Load the verified demo again before Continue.

Normal play uses `cheats=false`. The optional Diagnostics checkbox explicitly
passes `--cheats` for that launch; the engine reports the resulting value in the
status/log. Build metadata and logs are available without enabling cheats.

## Desktop verification

On 2026-10-28 the fork built successfully on Linux x86_64 and reached the campaign
menu and a rendered `mapm1` battlefield in Chromium 154.0.8037.57, using real
desktop mouse events and SwiftShader. Screenshots were inspected locally and are
not uploaded because they contain game art. No upstream demo was used as evidence.
The final clean/incremental timings, artifact sizes, failure checks, commit and
preview identity are recorded in [the Phase 1 test run](test-runs/phase-1.md).

Re-run the focused desktop check with a local pack (Playwright Core 1.57.0 and
an installed Chromium; screenshots/results remain under `local-only`):

```sh
npm install --prefix build-web/qa --no-save --no-package-lock playwright-core@1.57.0
PLAYWRIGHT_MODULE="$PWD/build-web/qa/node_modules/playwright-core" \
  CHROMIUM_PATH=/usr/bin/chromium node scripts/smoke-web.cjs \
  http://localhost:8080/ build-web/local-only/christmas.ofdata build-web/local-only/evidence
```

The script checks missing/corrupt pack feedback, menu/map transition, visible
commit, cheats off, explicit cheat opt-in, and failed Wasm download feedback.
DOM state alone does not prove rendering: review `menu.png` and `battlefield.png`.
SwiftShader results are functional desktop evidence, not phone GPU/performance
measurements. The legacy runtime emits a requestAnimationFrame warning; timing,
lifecycle, persistence and a complete mission remain outside this Phase 1 claim.

## CI and preview

`web-build.yml` runs on manual dispatch, relevant-path PRs and relevant-path pushes
to `master`. Feature pushes do not build again alongside their PR. It uses the
same command, recursively checks out the recorded gitlinks, caches SDK/tools/SDL
ports, validates the publication boundary, and uploads only `build-web/cmake/dist/`.
PR builds identify the PR head commit rather than a temporary merge SHA. The
downloadable Actions artifact expires after 30 days.

Native workflows use matching PR/master-push strategy and relevant-path filters.
Docs, browser shell/build scripts and the web-only entry point do not require the
Windows matrix. Windows first runs a small Ubuntu scope check against the PR's
merge base (or a push's before/after commits). Shared C++/headers, native projects,
dependencies and Windows compiler-job changes still run the full existing matrix.
For C++ sources/headers, the gate compares native-visible code after removing only
proven Emscripten-only branches. Native alternatives and other platform guards
remain relevant; unsupported preprocessing falls back to Windows compilation.
Thus a web-only hook in a shared file does not require the Windows matrix.
For CMake, only edits inside a literal `if(EMSCRIPTEN)` branch are excluded; native
branches, changed guards, new/deleted files and ambiguous/dynamic syntax retain
Windows coverage. Changes to CI triggers/routing run validation without starting
Windows. Manual dispatch always requests Windows compilation. Scope decisions
have focused git-fixture tests; no branch protection or required check is changed.
Windows workflow concurrency cancels superseded runs on the same PR/ref.
Linux keeps its existing native CMake check. This change does not repin either
native workflow's dependency/test setup. GitHub PR filters use the full PR diff;
a PR with outstanding shared/native changes still receives Windows checks after
a documentation update, rather than hiding an earlier native failure.

Hosting details and URLs are in the test run/handoff. A local HTTP server or an
Actions ZIP is not a deployed preview. GitHub Pages creation was attempted and
returned HTTP 403 “Resource not accessible by integration”; it was not enabled.
The separate Sites hosting source stores no demo pack. No automatic deployment
from untrusted PRs is configured.

Current [public preview](https://openfodder-phase-one.zanysky263.chatgpt.site), no sign-in required:
Sites version 11, fork build `1de52e57c4c185dde254f679209d253af6009c82`.
MOB-010 immediately releases input and pauses on interruptions; returning requires
an explicit tap and preserves manual/Guide pause. Local/public actual-engine
Chromium checks passed focus loss, real Back/Forward Cache return, native callback
clock bounds and rendered battlefield pixels. Synthetic visibility/freeze/rotation
and context-loss checks passed separately. A real CDP freeze event was not observed
in this automation environment; actual Safari/OS interruptions remain NOT RUN.

**Visual correction:** the DOM mission path left the palette black, and the web
SDL3 renderer did not explicitly present its batches. Native state/DOM checks in
older records did not establish visible gameplay. This build advances the pending
palette and presents the frame; screenshots and composited-pixel checks verify
snow, troops and sidebar before/after return. See [the correction/evidence](test-runs/lifecycle.md).

Checkpoint/layout/launcher regressions passed. The checkpoint wrapper ABI/content
pins are unchanged; this keeps compatible saves. Audio remains explicitly silent:
`OPENFODDER_NO_MIXER` selects `cSound_Null` even though the pack includes sound files.
[The draft branch PR/checks](https://github.com/jbbejena/openfodder/pulls?q=is%3Apr+head%3Amobile%2Fbrowser-lifecycle)
provide final CI/artifact links. No game assets, profiles or progress exports are
hosted. C++ changes are Emscripten-only; the Windows scope check returns
`native:false`; Linux retains its existing native build. Pins/workflows unchanged.

## Actual iPhone Safari checkpoint — NOT RUN

No real iPhone is attached to this environment. To perform B05:

1. Open the deployed URL from the test run in **Safari**. No ChatGPT sign-in is
   required. Record iPhone model, iOS/Safari version and the visible fork commit.
2. Tap **Load demo from GitHub**, wait for all 20 files to verify, and leave cheats
   unchecked. A failure should offer retry or local files; record its exact text.
3. Rotate to landscape and choose **Start game**. Confirm the mission menu is
   visible. No Files-app import is required for the default route.
4. Choose **LAND OF HOPE AND GLORY**, read its objectives, then **Deploy mission**.
   Confirm the snow battlefield, troops
   and squad sidebar are displayed. If taps fail, record that failure; do not
   convert a desktop mouse pass into a phone pass.
5. Record menu/map screenshots privately and loading/errors against that build.
   Full on-device mission play, audio, saves and Home Screen/PWA checks remain
   separate evidence. B05 and M1 remain unpassed until this real test.

## Try the touch commands — real-device verification still required

After the battlefield loads, select the populated squad and tap ground in Move
mode. Choose Fire, hold/slide on ground, then lift. Add a second finger or move
outside the battlefield to confirm fire releases. HUD taps must never order troops.
Touch controls enable automatically for touch devices; desktop can use the
**Guide → Touch controls** checkbox. The first demo mission has zero secondary
ammo, so **Weapons → Grenade/Rocket** stay disabled.
The separate local ammo fixture is not published. [Control map and cancellation
rules](TOUCH_CONTROLS.md). In Move, put both fingers down before dragging to pan;
or select Pan and drag one finger. Lift all fingers before a fresh command.
Follow squad returns the camera. Combat continues while inspecting the map.
The fitted landscape shell keeps controls beside the battlefield. Open **Guide**
to pause and read controls, then **Back to game** to return; a prior user pause
stays paused. Rotate to portrait for guidance or choose **Keep playing in portrait**.
Record actual cutout/home-indicator clearance, browser-bar changes and aim after
rotating back. These real-device checks have **not run**. In Guide, try
**Abort mission → Confirm abort**, check the distinct aborted result, then Retry
and Return to menu. [Mission semantics](MISSION_FLOW.md) explain fresh-recruit
replay and [checkpoint limits](CHECKPOINTS.md). Checkpoints are available at a
briefing; the current battlefield cannot be saved.

## Try mission checkpoints — actual iPhone NOT RUN

1. In Safari open the public URL and verify **`1de52e57c4c1`**. Record model/iOS.
   Load demo → wait for 20 verified files → Start game → choose mission 1.
2. At its briefing tap **Save checkpoint**. Wait for **Saved checkpoint** before
   closing the tab. Reopen the same URL in the same Safari browser/profile.
3. Load demo again → Start game → **Continue**. Confirm the saved mission briefing,
   then Deploy and check the battlefield. This restarts the mission, not the battle
   position. No account sign-in or computer is needed.
4. Save a different mission briefing, return to menu and try **Use previous
   checkpoint**. Check that it restores the earlier mission without overwriting
   the latest save. Try Export backup and Import backup through Safari/Files;
   confirm a malformed file reports failure while Continue still works.

**These physical-device steps have not run.** Chromium close/reopen evidence does
not establish Safari storage durability, Files behavior, private-mode behavior
or browser eviction recovery. Keep an exported backup; use one game tab per
origin. Backgrounding/audio recovery remains MOB-010 and sustained phone
performance remains MOB-011.

## Try interruptions — actual iPhone NOT RUN

1. In Safari verify **`1de52e57c4c1`**, load demo, Start → choose mission → Deploy.
   Confirm a visible snow battlefield, troops and sidebar.
2. In Fire mode hold aim, then switch apps/tabs or lock/unlock the phone. On return,
   check **Game paused while away**. Firing must have released and combat must
   stay paused until **Return to game**; there should be no catch-up burst.
3. Repeat with Guide already open and with a manual pause. Return must preserve
   those pauses. Rotate while away/paused and check reachable controls and aim.
4. Try browser Back then Forward. If Safari reloads instead of retaining the page,
   load demo again and Continue a confirmed checkpoint; there is no live-battle
   reload promise. Record Safari versus Home Screen results separately.

Record model/iOS, exact build, observed focus/visibility/lock behavior and errors.
These device checks and audible audio recovery are **NOT RUN**. The preview is
silent, and sustained phone performance remains MOB-011.

## Record performance — actual iPhone NOT RUN

Open **Guide → Performance test → Record performance**. Play for at least ten
active minutes, reopen Guide, add observations, then **Stop recording → Export
report** to save the local JSON. No sign-in or computer is needed. Paused/menu
time is excluded; export before reload. [Full phone procedure and metric
limits](PERFORMANCE.md), [separate desktop results](test-runs/performance.md).
Submitted FPS and WebAssembly capacity do not establish displayed FPS or used
Safari memory. The engine clock and rendering settings are unchanged.
