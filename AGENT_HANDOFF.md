# Current handoff

Updated 2026-10-28. **Phase 2 has begun: MOB-004 is implemented and desktop-verified.
Actual iPhone Safari remains NOT RUN; M1 and M2 are not accepted.**

## Active task: MOB-005

Codex claimed `mobile/touch-command-modes` from current master
`6afde21d77f11780d578f909ab609627c8b41a93` (user-merged PR #4). Scope: visible
squad selection, explicit Move/Fire/Grenade/Rocket modes, pointer ownership and
deliberate secondary firing through the existing engine boundary. Camera gestures,
the full phone layout and mission menus remain separate tasks. Implementation and
verification are in progress; the published build below is still MOB-004.

## Branch, review and exact build

- Current follow-up branch: `ci/windows-web-guards`, from user-merged master
  `2b28829cb827388e8881c5c9c648a1c570107149`. Scope: correct Windows CI classification
  for Emscripten-only sections in shared files; cancel redundant Windows runs.
- MOB-004 branch `mobile/command-bridge` started at
  `47e956dfcf316b1149a0e54c775197baa0df62af` from the phone-preview branch.
- Implementation commit **`d755c600e2f2afe49cabba8cea264ff6f4c5ef31`**. Later
  documentation commits do not change the tested/deployed artifact.
- The user merged [PR #3](https://github.com/jbbejena/openfodder/pull/3) as `2b28829`,
  after merging [PR #2](https://github.com/jbbejena/openfodder/pull/2) as `a9a7476`.
- The user previously merged PR #1 (roadmap plus Phase 1) as `f27963c`.
  No merge, force push, submodule repin or game-data upload was performed here.

## Windows CI correction

The prior gate classified any shared C++ file edit as native, including MOB-004's
changes wholly inside Emscripten guards. A documentation push repeated that PR
classification, and the user's merge started a third run on master. All three
are now confirmed **cancelled**: [40775648016](https://github.com/jbbejena/openfodder/actions/runs/40775648016),
[40777099594](https://github.com/jbbejena/openfodder/actions/runs/40777099594),
[40778617067](https://github.com/jbbejena/openfodder/actions/runs/40778617067).

`windows_scope.py` now compares native-visible C++ outside proven Emscripten
guards, retaining native includes, macros, alternatives and other platform
branches. Browser-only new files may have no native declarations. Ambiguous
syntax fails closed to Windows validation; literal/macro whitespace is preserved.
Workflow concurrency cancels superseded runs on the same PR/ref. The Windows
compiler/test/package job and manual-dispatch behavior are unchanged.

Validation: all **12 git-fixture tests passed**; the actual diffs from `f27963c`
to `d755c60`, `d9b35f0` and merged `2b28829` all return `native: false`. Real native
changes remain covered by the fixture checks. The public preview remains at
`d755c60`, with no engine, content, toolchain or hosting changes in this follow-up.
Follow the CI-fix branch PR checks for the live scope decision; Phase 2 touch
implementation remains the next separate task.

## Delivered behavior and task status

The public launcher still loads the exact demo directly from its existing pinned
upstream host. Normal cheats remain off. Before Start game, Diagnostics →
**Show input API test panel** enables a panel below the battlefield. It exercises
engine-backed squad selection, movement, held primary fire/aim/stop, available
secondary-weapon selection, camera pan/follow, explicit pause/resume and cancel.
The real engine provides counts, ammo, selection, positions and targets.

Commands are validated and applied at `Phase_Loop_Interrupt`. Cancel clears
pending physical commands and held input while preserving pause reasons. Repeated
pause requests cannot resume play; user/visibility/focus reasons compose. Native
P remains supported. The browser loop yields/polls SDL while paused and skips
mission updates. CSS/canvas/camera/sidebar/DPR conversion happens in one boundary.

| Task | Status | Evidence |
| --- | --- | --- |
| MOB-001/002 | Done | [Baseline](docs/mobile/BUILD_BASELINE.md), [build](docs/mobile/BUILD.md), [Phase 1 record](docs/mobile/test-runs/phase-1.md) |
| MOB-003 | Blocked on actual phone | Public preview/CI/desktop delivered; B05 iPhone map load NOT RUN |
| MOB-004 | Done | [API contract](docs/mobile/INPUT_API.md), [test record](docs/mobile/test-runs/command-bridge.md), commit `d755c60` |
| MOB-005 | Ready / next | Touch command modes, pointer ownership, deliberate secondary firing |
| MOB-007 | Ready | Landscape phone shell/HUD; separate bounded task |
| MOB-006/008 | Pending | Depend on the remaining touch controls/layout work |

This is the command foundation and an opt-in diagnostic harness. Production
canvas touch modes/gestures, secondary firing, full phone HUD and mission menus
remain MOB-005–008. No full mission, persistence, background-resume policy,
phone performance, larger forces, cover/suppression or H Hour work is claimed.
Vehicles explicitly return `unsupported` for movement/fire through this API.

Changed implementation: `Source/WebInput.*`, Emscripten-only hooks in
`Source/Fodder.cpp` and `Start_Emscripten.cpp`, the Emscripten runtime export,
`web/engine-bridge.js`, its six Node tests, diagnostic harness/shell/CSS,
packaging/artifact guard and actual-engine smoke script. Web CI runs the six Node
checks. Shared/native validation remains enabled; no native CI gate was weakened.

## Commands and actual results

```sh
node --test web/engine-bridge.test.cjs
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
python3 scripts/make-local-web-pack.py
python3 -m http.server 8090 --directory build-web/cmake/dist
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-input.cjs http://127.0.0.1:8090/ \
  build-web/local-only/christmas.ofdata build-web/local-only/command-bridge-committed-evidence
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web.cjs http://127.0.0.1:8090/ \
  build-web/local-only/christmas.ofdata build-web/local-only/bridge-committed-regression-evidence
```

- Six Node tests passed. Committed build and artifact/source guard passed for
  `d755c60`; `.data` still contains 47 GPL/config files, no game assets.
- Actual-engine Chromium tests passed at DPR 1 and 2: real movement/aim, same
  world target after pan/resize/letterboxing, queue overflow/cancel priority,
  stop/cancel, idempotent pause with frozen mission ticks and separate reasons,
  native menu/P/right-button input, and real diagnostic pointer down/up.
- The pinned mission has zero secondary ammo: rejection passed. Valid grenade/
  rocket selection passed with a clearly separate, local in-memory campaign
  fixture (`Grenades=3`, `Rockets=2`), without consuming ammo or modifying Run/pins.
- Launcher regression passed: menu/map, defaults, opt-in cheats, corrupt/partial
  files, failed-download retry, real upstream loading and missing-Wasm feedback.
  External-fetch QA used the environment proxy CA with TLS verification enabled.
- Screenshots of committed local and hosted menu/map/harness were inspected and
  retained locally. Logs: `/workspace/command-bridge-committed-build.log`,
  `/workspace/command-bridge-committed-smoke.log`, `/workspace/bridge-committed-regression.log`.
- A limited host syntax check of the changed translation units passed using
  `c++ -std=c++14 -fsyntax-only -DOPENFODDER_NO_MIXER -ISource -Ibuild-web/cmake/Source -Ibuild-web/cache/ports/sdl3/SDL-release-3.2.22/include Source/Fodder.cpp Source/WebInput.cpp Source/Start_Emscripten.cpp`.
  Full Linux CI also passed; this syntax check is not a full native runtime test.

## Public preview and CI

- [Preview](https://openfodder-phase-one.zanysky263.chatgpt.site): **public, no sign-in**,
  Sites version **4**, visible fork ID **`d755c600e2f2`**. Prior version 3 / `b9abafb`
  was the Phase 1 phone-loading preview and is superseded.
- Project `appgprj_6ae24fbe89788191a38778521e56e855`; deployment
  `appgdep_6ae26f6757dc8191bc31d12a27d21ed0`: succeeded. Hosting source
  `94fff4aa11982b84bbe9d5dfa75b155e8007b0fa`, checkout/manifest
  `/workspace/sites/openfodder-phase-one/`. Source pushed before saving/deploying;
  output was packaged separately, not committed. Audience stayed public.
- Fresh anonymous hosted Chromium: HTTP 200, correct ID, 20 verified upstream
  GET requests, menu/map, real panel pause twice with frozen ticks, resume and
  held-fire cancellation. No supplied credentials/authorization headers. Engine
  ready 1,534 ms on one cold desktop navigation, not a phone benchmark.
- [Web CI passed](https://github.com/jbbejena/openfodder/actions/runs/40775648116);
  [matching artifact](https://github.com/jbbejena/openfodder/actions/runs/40775648116/artifacts/12855525161),
  30-day retention, includes matching source/notices and no player pack.
- [Linux native CI passed](https://github.com/jbbejena/openfodder/actions/runs/40775648201).
  The Windows runs were cancelled in the correction above; **no Windows pass
  claimed**. The original file-level gate overclassified Emscripten-only edits
  in shared `Source/Fodder.cpp`; native-visible changes still require validation.
- PR path filters use the aggregate PR diff; a documentation follow-up to an
  outstanding shared-C++ PR may trigger native CI again. Feature-push/PR build
  duplication remains prevented. No check/protection was bypassed.

## Dependencies, data and publication boundary

- Run `070a6086c62164e859fc3274b75b5f536fa9d902`; Scripts
  `dad04730860bcdd1189aa8562860e379b0f5d783`, unchanged recursive pins.
- emsdk `c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56`; Emscripten 4.0.23
  (`7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`); SDL 3.2.22;
  CMake 3.31.6 / Ninja 1.11.1. Full pins/commands in BUILD.md.
- Current cold runtime 2,920,588 bytes; upstream two-mission demo 223,382 bytes,
  roughly 3.14 MB total before compression. Optional source 1,819,812 bytes;
  all hosted files 4,854,457 bytes. Full retail data was not measured/bundled.
- Engine/GPL Scripts and game-data permissions remain separate. Our own demo
  mirroring/bundling grant is unresolved. Data is loaded directly from the pinned
  existing publisher or local files, hash-checked and held in browser memory.
  Synthetic ammo edits exist only in the local test browser, never the preview.
  No game assets, player packs, credentials or game-art screenshots were uploaded.

## Evidence limits and next checks

Desktop: Linux Chromium 154.0.8037.57, Playwright Core 1.57.0,
1100×1000 then 780×900, DPR 1/2, mouse/direct commands, WebGL1/SwiftShader.
Synthetic blur supplements real pointer tests; it is not a phone interruption test.
Actual iPhone Safari, full touch combat, mission completion and saves: **NOT RUN**.
Audio remains disabled; the existing requestAnimationFrame warning remains.

Phone checkpoint: open the public preview in Safari and record model/iOS/build.
Load demo → Start → select Christmas Special and confirm the battlefield (B05).
To inspect this foundation, enable the diagnostic test panel before Start and
try its explicit controls afterward. This does not substitute for touch-mode,
gesture or full-mission acceptance. [Phone steps](docs/mobile/BUILD.md#actual-iphone-safari-checkpoint--not-run).

Next dependency-ready task: **MOB-005**, using this API for single-owner touch
Move/Fire/secondary targeting and cancellation. MOB-007 is independently ready;
MOB-006 follows MOB-005. M1/M2 stay unpassed until their real device/gameplay checks.
Keep persistence/lifecycle/performance and H Hour at their documented later gates.

## Future handoff template

- Task/status, branch/base, final commits/PR and exact deployed build.
- Changed behavior/files, actual commands/results, browser/device/input.
- Preview/artifact/provenance, source-inspected/automated/emulated/real-device limits.
- Failures/unperformed checks/blockers; next task and remaining dependencies.
