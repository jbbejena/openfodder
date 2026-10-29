# Current handoff

Updated 2026-10-29. **MOB-010 interruption-safe return is implemented with local/
public actual-Wasm Chromium evidence. Real focus loss and persisted Back/Forward
Cache return passed; synthetic hidden/freeze/rotation checks are separate. A black
battlefield missed by earlier state checks is fixed and guarded by pixels. Actual
iPhone Safari/OS interruptions, physical touch and audible audio remain NOT RUN.
MOB-010 acceptance is blocked on those checks; M1/M2/M3 remain unpassed.**

## Branch, commits and review

- Codex / **MOB-010**, `mobile/browser-lifecycle` from user-merged master
  `965b90f3105e5861057e27b36937e66268f4f09d` (PR #9). User work preserved.
- `a5e61a8068e6d8dc3de2826a0ffc5f2ed68f58c1`: restore pending web palette fade,
  explicitly present SDL3 frames, add composited-pixel guard to launcher smoke.
- `b6fbf095792ba73c6753f96a8e3449e8b97dc558`: synchronous lifecycle safety,
  explicit return, retained UI timers, tests, contract and audio audit.
- **Tested/published:** `1de52e57c4c185dde254f679209d253af6009c82`; test-only
  correction observes actual engine callbacks instead of assuming display cadence.
  Final Markdown records the handoff; published runtime remains this commit.
- [Draft branch PR to master](https://github.com/jbbejena/openfodder/pulls?q=is%3Apr+head%3Amobile%2Fbrowser-lifecycle)
  records exact final head and observed CI/artifact links. Leave unmerged.
  Roadmap/Phase 1/MOB-004–009 already reached master through user merges.
- No merge, force push, workflow/dependency repin, new audio path or asset upload.

## Behavior and source boundary

Blur/hidden/pagehide/freeze synchronously releases physical/native held input and
gates the entire web loop. Focus/visible return keeps a latch. **Return to game**
removes only lifecycle pause, preserving user/Guide/portrait pause. An accepted
mission transition waits safely while away. Persisted history return retains the
existing page/engine/UI; reload still needs Load demo → Start → Continue a confirmed
mission-start checkpoint. No live-battle reload recovery or unload-only save.

New `of_web_lifecycle(mask)` accepts only bits 2/4/16, bounds JS and C++ values,
releases input/stale SDL events immediately, retains explicit pause/mission
requests and rejects new gameplay until return. Lifecycle ownership survives
stage changes. Existing clock, Sleep(10), phase threshold and combat rules remain;
no wall-time debt or catch-up loop introduced. Renderer/palette changes are
presentation only. Native-visible C++ is unchanged.

Files: Emscripten `Start_Emscripten.cpp`, `WebInput.cpp/.hpp`, guarded web branch
in `Window.cpp`; `web/lifecycle.js`/tests, bridge, bootstrap, shell/CSS, four UI
timer owners, packaging/guard, lifecycle smoke and composited-frame helper/launcher
checks. [Policy/audio audit](docs/mobile/LIFECYCLE.md), [API](docs/mobile/INPUT_API.md),
[exact evidence/correction](docs/mobile/test-runs/lifecycle.md).

**Visual correction:** DOM mission flow bypassed the old palette fade and the
web SDL3 renderer omitted explicit presentation. Old MOB-008/009 battlefield
screenshots are black despite running engine state. Do not treat those older
state/DOM passes or affected visual claims as rendered-game evidence. Current
local/public screenshots visibly show terrain, troops/sidebar before/after
interruption/cache return, with composited-pixel checks. Wrong drawing-buffer and
display-frame test assumptions were corrected; no engine outcomes were fabricated.

Audio: `OPENFODDER_NO_MIXER` makes `Versions.cpp` return `cSound_Null` for every
version. The pack does contain `AFXBASE.INS/SNG`; silence is backend selection,
not missing those files or a proven Safari autoplay restriction. No supported
audible path/context to resume; audible start/resume/duplicate-loop checks are
not passed. Real CDP freeze event was also not established with automation's
emulated visibility; synthetic freeze is labeled separately. Real cache return
and focus loss did pass.

## Commands and verification

```sh
node --test web/*.test.cjs
build-web/tools/venv/bin/cmake --build build-web/cmake --target clean
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
./scripts/build-web.sh
python3 scripts/ci/windows_scope.py \
  --base 965b90f3105e5861057e27b36937e66268f4f09d --head HEAD
python3 -m http.server 8095 --bind 127.0.0.1 --directory build-web/cmake/dist
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-lifecycle.cjs http://127.0.0.1:8095/ \
  build-web/local-only/christmas.ofdata build-web/local-only/lifecycle-release-evidence \
  1de52e57c4c185dde254f679209d253af6009c82
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-lifecycle.cjs https://openfodder-phase-one.zanysky263.chatgpt.site/ \
  upstream build-web/local-only/lifecycle-hosted-evidence \
  1de52e57c4c185dde254f679209d253af6009c82
```

- Passed **44 Node cases** across six files (also run directly); clean build at
  `b6fbf09` (69 tasks/cached pinned tools), incremental no-op, exact release build
  at `1de52e5` (About identity/relink) and publication/source guard (47 GPL/config
  files/no assets). Existing JSON warnings only.
- Local/public actual Wasm: raw-mask/transition validation; same-turn native fire
  release/paused ticks on real focus loss; manual/Guide/lifecycle composition,
  P/Escape isolation, synthetic visibility/rotation/freeze; fifteen observed
  native callbacks advanced zero/one tick each; three synthetic persisted cycles;
  real persisted history restore, rendered pixels, Abort/menu/mapm2 flow and
  reachable Reload after synthetic context loss.
- Regression smokes at same runtime implementation `b6fbf09`: layout DPR 1/2/3,
  safe-area/bar/portrait/aim/native P; actual IndexedDB close/reopen, save/import/
  previous/error/recovery and local goal-fixture recruits/mapm2; launcher partial/
  corrupt data, local/upstream rendered field, network retry, cheats and Wasm error.
  No unmodified combat victory or actual phone-performance result claimed.
- Linux Chromium 154.0.8037.57, Playwright Core 1.57.0, SwiftShader/WebGL1,
  emulated touch; 844×390/DPR 2 main run. Public: HTTP 200/full clean ID, 20 pinned
  verified upstream files, no page errors/non-GET/auth headers; TLS verified with
  temporary browser proxy CA removed afterward. Screenshots inspected locally.
- Logs `/workspace/lifecycle-{clean-build,incremental-build,release-build,release,hosted,layout,saves,launcher}.log`;
  ignored evidence `build-web/local-only/lifecycle-*-evidence/`. No profiles,
  progress exports or screenshots in source/hosting/CI artifacts.

## Preview, CI and provenance

- [Public preview](https://openfodder-phase-one.zanysky263.chatgpt.site), no login:
  **Sites v11**, visible **`1de52e57c4c1`**, supersedes v10/MOB-009.
- Version `appgprj_6ae24fbe89788191a38778521e56e855~appgver_087a8a2014a08191bf01314cd013a07a`;
  deployment `appgdep_6ae3b8fd480081918891c80df0ed86c1`: succeeded.
- Hosting source `2c77a94d2a5bd7d4c6317b6cf93110e3d3fcc1be`, pushed before
  saving; exact clean output packaged separately. Project
  `appgprj_6ae24fbe89788191a38778521e56e855`, checkout
  `/workspace/sites/openfodder-phase-one`, audience revision 2 preserved.
- Actual local Windows scope: `native:false`; Ubuntu scope job runs, compiler
  jobs should skip. Linux retains its existing Source-path build. PR body/checks
  carry observed final CI/artifact links; final docs prepared before PR to avoid
  duplicate PR builds. No workflow/protection change.
- Pins unchanged/clean: Run `070a6086c62164e859fc3274b75b5f536fa9d902`, Scripts
  `dad04730860bcdd1189aa8562860e379b0f5d783`, emsdk
  `c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56`, emcc 4.0.23
  `7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`, SDL 3.2.22,
  CMake 3.31.6/Ninja 1.11.1.
- Runtime/support 3,027,663 + upstream demo 223,382 = **3,251,045 bytes** before
  compression; optional source 1,932,326; host total/notices/source 5,073,283.
  No game assets/player pack mirrored; GPL source/notices included. Own data-
  mirroring permission remains unresolved and separate; browser fetches pinned
  existing upstream or supplied local files.

## Remaining checks and next work

MOB-009 desktop persistence deliverables complete. MOB-003/B05, MOB-007/008 phone
checks and **MOB-010 actual Safari/OS/audio acceptance remain open**. All actual
iPhone/physical touch/OS lock/Home Screen/audible recovery tests are NOT RUN.
M1/M2/M3 remain unpassed. Next bounded work is **MOB-011** instrumentation and
performance measurements; sustained phone measurements require a real device.

Phone: Safari → public URL → verify `1de52e57c4c1` → Load demo/Start/Deploy → verify
visible snow/troops. Hold Fire, switch apps/tabs or lock/unlock, return; expect held
fire released and paused until Return. Repeat with Guide/manual pause, rotation,
Back/Forward. If the page reloads, load demo and Continue a confirmed checkpoint.
Record model/iOS and Safari versus Home Screen. [Full phone steps](docs/mobile/BUILD.md#try-interruptions--actual-iphone-not-run).
No ChatGPT login/computer needed. No live-battle reload/audio/performance readiness
claim. Larger forces, tactical changes and H Hour remain outside scope.

## Future handoff template

Task/status, branch/base, commits/review, deployed build; files/behavior;
commands/results and device/browser/input; preview/artifact/data provenance;
source/automated/emulated/real-device distinctions; failures/unperformed checks,
blockers and next dependency-ready or explicitly authorized independent work.
Preserve user work.
