# Reproducible browser build (MOB-002/003)

The pinned Phase 1 build now includes the Phase 2 command foundation (MOB-004).
The [command API/test harness](INPUT_API.md) is implemented; a complete touch-playable release remains pending.
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

Cold runtime files are about **2.9 MB**, plus **223 KB** of demo content: roughly
**3.1 MB before compression**. The roughly 1.8 MB source archive is an optional
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
Docs, browser shell/build scripts and the web-only entry point do not require the
Windows matrix. Windows first runs a small Ubuntu scope check against the PR's
merge base (or a push's before/after commits). Shared C++/headers, native projects,
dependencies and Windows compiler-job changes still run the full existing matrix.
For CMake, only edits inside a literal `if(EMSCRIPTEN)` branch are excluded; native
branches, changed guards, new/deleted files and ambiguous/dynamic syntax retain
Windows coverage. Changes to CI triggers/routing run validation without starting
Windows. Manual dispatch always requests Windows compilation. Scope decisions
have focused git-fixture tests; no branch protection or required check is changed.
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
Sites version 4, fork build `d755c600e2f2afe49cabba8cea264ff6f4c5ef31`.
[Web CI passed](https://github.com/jbbejena/openfodder/actions/runs/40775648116);
the [matching engine artifact](https://github.com/jbbejena/openfodder/actions/runs/40775648116/artifacts/12855525161)
contains source/notices and no game assets. The default upstream-download route
passed hosted desktop menu/map verification. See [the follow-up record](test-runs/phone-file-import.md)
for the earlier phone-loading change; [MOB-004's record](test-runs/command-bridge.md)
contains current hosting identity/sizes and command checks. Original Phase 1 measurements are historical.

## Actual iPhone Safari checkpoint — NOT RUN

No real iPhone is attached to this environment. To perform B05:

1. Open the deployed URL from the test run in **Safari**. No ChatGPT sign-in is
   required. Record iPhone model, iOS/Safari version and the visible fork commit.
2. Tap **Load demo from GitHub**, wait for all 20 files to verify, and leave cheats
   unchecked. A failure should offer retry or local files; record its exact text.
3. Rotate to landscape and choose **Start game**. Confirm the campaign menu is
   visible. No Files-app import is required for the default route.
4. Tap/briefly hold the Christmas Special row. Confirm the snow battlefield, troops
   and squad sidebar are displayed. If taps fail, record that failure; do not
   convert a desktop mouse pass into a phone pass.
5. Record menu/map screenshots privately and loading/errors against that build.
   Full touch combat, mission completion, audio, saves and Home Screen/PWA checks
   are separate later milestones. B05 and M1 remain unpassed until this real test.
