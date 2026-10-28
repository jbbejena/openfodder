# Reproducible browser build (MOB-002/003)

This is a Phase 1 engine preview, not a touch-playable mobile release.
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
`bootstrap.js`, `style.css`, `content-manifest.json`, `build-info.json`,
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

## Supply local test data

The selected pack has 20 files (223,382 bytes): 19 demo files and one campaign
from Run `070a6086c62164e859fc3274b75b5f536fa9d902`. The supported first map is
Christmas Special / LAND OF HOPE AND GLORY / `mapm1`. Scripts remain at
`dad04730860bcdd1189aa8562860e379b0f5d783`.

```sh
python3 scripts/make-local-web-pack.py
```

This writes `build-web/local-only/christmas.ofdata`, outside the served directory.
Keep it local. **Do not upload it to hosting, Git, CI artifacts or this PR.** No
redistribution grant for the demo/campaign has been established. A player supplies
their own files, subject to their applicable terms; the helper is not a license.

Select that file in the preview, choose **Start game**, then click and briefly hold
the Christmas Special campaign row. This web entry point starts the battlefield
directly; it does not implement the native briefing/recruit flow. The importer
checks every path/size/SHA-256 before writing anything into the in-memory filesystem.
It accepts only the selected pack, not arbitrary scripts or retail content.
No pack data leaves the browser, and reload clears the imported data and saves.
This is not the later browser checkpoint/persistence implementation.

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
Docs, browser shell/build scripts and the web-only entry point do not compile the
native matrix; shared C++/headers, CMake, native projects/dependencies, and each
workflow's own definition still do. No required check/protection was disabled.
This change does not repin the native workflows' existing dependency/test setup.

Hosting details and URLs are in the test run/handoff. A local HTTP server or an
Actions ZIP is not a deployed preview. GitHub Pages creation was attempted and
returned HTTP 403 “Resource not accessible by integration”; it was not enabled.
The separate Sites hosting source stores no demo pack. No automatic deployment
from untrusted PRs is configured.

## Actual iPhone Safari checkpoint — NOT RUN

No real iPhone is attached to this environment. To perform B05:

1. Prepare the exact local pack above on your own computer. Transfer it privately
   to the iPhone's Files app; do not place it in the hosted Site.
2. Open the deployed URL from the test run in **Safari** (sign in as the Site owner
   if required). Rotate to landscape. Record iPhone model, iOS/Safari version,
   viewport/orientation and visible fork commit.
3. Choose the local `.ofdata` file, wait for “Demo verified”, leave cheats unchecked,
   and choose Start game. Confirm the campaign menu is visible.
4. Tap/briefly hold the Christmas Special row. Confirm the snow battlefield, troops
   and squad sidebar are displayed. If taps fail, record that failure; do not
   convert a desktop mouse pass into a phone pass.
5. Record menu/map screenshots privately and loading/errors against that build.
   Full touch combat, mission completion, audio, saves and Home Screen/PWA checks
   are separate later milestones. B05 and M1 remain unpassed until this real test.
