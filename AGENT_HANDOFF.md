# Current handoff

Updated 2026-10-29. **MOB-007 phone shell/HUD implementation and local/public
emulation checks passed. The task remains blocked on its actual iPhone layout
acceptance. Actual iPhone Safari, physical touch and a full touch-only mission
are NOT RUN. M1/B05 and M2 remain unpassed.**

## Branch and review

- Codex / MOB-007, branch `mobile/phone-layout`, from user-merged master
  `15b5ff1aa63a1556f74ff35475c9d12c4d938cf3` (PR #6). User work preserved.
- **Tested/published code:** `ecdf5587ce784a12f22354ec2e5757c3225ddb66`, viewport
  shell/HUD, independent presentation pause and actual-engine layout tests.
  Later Markdown handoff changes do not change that artifact.
- [Draft PR for this branch](https://github.com/jbbejena/openfodder/pulls?q=is%3Apr+head%3Amobile%2Fphone-layout),
  target master, left unmerged. Its body/checks supply the exact final handoff
  commit, web CI and artifact links. Roadmap, Phase 1 and MOB-004–006 are already
  in master through the user's merges of PRs #1–6.
- No merge, force push, dependency repin, workflow change or game-data upload.

## Delivered behavior and files

The play screen fits the visible viewport. Compact landscape rails keep squads
and contextual weapons on the left, Move/Fire/Pan and Cancel/Follow/confirmation
on the right. Controls are at least 44×44 CSS px and stay outside the canvas.
Guide opens a paused, internally scrollable help panel; Back returns to play
without clearing a prior user pause. Portrait provides guidance and an optional
portrait layout; no orientation lock. Errors have visible feedback/reload.

`web/phone-shell.js`, shell/CSS/bootstrap handle visualViewport, safe areas,
canvas fitting, portrait, Guide focus/input and error gating. `touch-controls.js`
keeps state engine-derived and restores canvas focus without scrolling. The
opt-in input harness remains modeless. Packaging includes the new shell script;
`scripts/smoke-web-layout.cjs` exercises the actual Wasm engine. Existing smokes
were adapted to contextual weapons and the fitted diagnostic dock.

The sole C++ edit permits the additive reserved shell pause bit 8 inside the
existing Emscripten-only `Source/WebInput.cpp` guard. User/visibility/focus reasons
remain independent. No native-visible C++, CMake, pins or workflows changed.
Simulation, combat, camera and soldier/squad limits remain the existing engine's.
The actual demo deploys four soldiers in Squad 1 and has zero secondary ammo.

[Layout/control policy](docs/mobile/PHONE_LAYOUT.md), [API](docs/mobile/INPUT_API.md),
[exact verification](docs/mobile/test-runs/phone-layout.md),
[build/data provenance](docs/mobile/BUILD.md).

## Commands and evidence

```sh
node web/engine-bridge.test.cjs
node web/touch-controls.test.cjs
node web/phone-shell.test.cjs
node --test web/*.test.cjs
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
python3 scripts/ci/windows_scope.py \
  --base 15b5ff1aa63a1556f74ff35475c9d12c4d938cf3 --head HEAD
python3 -m http.server 8092 --bind 127.0.0.1 --directory build-web/cmake/dist
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-layout.cjs http://127.0.0.1:8092/ \
  build-web/local-only/christmas.ofdata build-web/local-only/phone-layout-final-evidence \
  ecdf5587ce784a12f22354ec2e5757c3225ddb66
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-layout.cjs https://openfodder-phase-one.zanysky263.chatgpt.site/ \
  upstream build-web/local-only/phone-layout-hosted-evidence \
  ecdf5587ce784a12f22354ec2e5757c3225ddb66
```

- **28 Node cases passed** (8 coordinate/API, 17 ownership, 3 shell geometry).
  Pinned build/incremental relink and clean implementation artifact guard passed:
  47 GPL/config files, no game assets. See PR checks for fresh CI build evidence.
- Actual Wasm local/public layout checks passed: 568×320 through 915×412, ≥44px
  buttons, safe bounds/no canvas overlap/page overflow, synthetic cutouts/bars,
  Guide scroll/focus/P/Escape, composed pause mask 9 with frozen ticks, portrait
  round trip/aim, DPR 3 aim and 640×480 native desktop/P. At simulated 844×390
  with 44px side/21px bottom insets, canvas measures 402.5×283 CSS px.
- Final committed camera smoke passed at DPR 1/2. Existing touch, input bridge
  and launcher regressions passed on the pre-commit implementation, including
  native SDL menu/right-fire/P, movement/aim/release, local-only secondary-ammo
  fixture, harness/queue/pause safety, corrupt/missing data, upstream retry,
  default/opt-in cheats and Wasm error feedback. Exact boundaries in test record.
- Linux Chromium 154.0.8037.57 / Playwright Core 1.57.0, SwiftShader/WebGL1,
  mouse/keyboard and CDP emulated touch. **No Safari/physical touch claim.**
- Public checks used three fresh anonymous contexts, HTTP 200/full clean fork ID,
  20 verified upstream files per context (60 total), no authorization headers,
  unexpected methods or page errors. TLS stayed verified with temporary proxy CA.
- First layout run caught a dialog Tab-focus escape; explicit wrapping fixed it.
  An upstream retry check needed this environment's browser CA trust; trusted
  rerun passed. Screenshots were inspected and remain local, with no asset upload.
- Logs `/workspace/phone-layout-{committed-build,final,hosted}.log`,
  `phone-camera-final.log`, `phone-{touch,input}-regression.log`,
  `phone-launcher-ca.log`, `phone-node-*.log`; JSON/screenshots under
  `build-web/local-only/phone-*-evidence/`.

## Preview, source and CI

- [Public preview](https://openfodder-phase-one.zanysky263.chatgpt.site), no sign-in:
  **Sites version 7**, visible ID **`ecdf5587ce78`**, supersedes v6 / `1384e4f`.
- Saved version `appgprj_6ae24fbe89788191a38778521e56e855~appgver_03a0657165b88191b2f6fef7dde65188`;
  deployment `appgdep_6ae2a1278f0c81918ce5d9962db642f1`: succeeded. Source
  `2c6b6314c2f51197c2a8992b5375eaa82c03ba0b`, checkout/manifest
  `/workspace/sites/openfodder-phase-one`, project
  `appgprj_6ae24fbe89788191a38778521e56e855`. Source pushed before saving;
  built output packaged separately; public audience preserved.
- Actual Windows classifier returns `native: false`; the existing Windows
  workflow scope job should run and compiler matrix skip. Linux's existing
  Source-path native check still runs. No workflow/protection was weakened.
  Final handoff docs were prepared before PR creation to avoid duplicate web CI;
  feature pushes are outside its master push trigger. Observe PR checks for
  actual CI/artifact links, including any native failure.

## Pins and content boundary

Run `070a6086c62164e859fc3274b75b5f536fa9d902`, Scripts
`dad04730860bcdd1189aa8562860e379b0f5d783`, emsdk
`c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56`, Emscripten 4.0.23
(`7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`), web SDL 3.2.22,
CMake 3.31.6/Ninja 1.11.1: unchanged, recursive pins clean.

Top-level runtime/support 2,964,600 bytes plus demo 223,382 bytes from pinned
upstream: about 3.19 MB before compression. Optional source 1,871,699 bytes;
all hosted files including notices/source 4,949,593 bytes. No game assets/player
pack are hosted here. The browser uses the existing upstream publisher or local
files and verifies hashes. Our own data-mirroring grant remains unresolved;
engine/GPL Scripts licensing is separate. Layout/camera use unmodified content;
prior synthetic ammo tests stay in local browser memory and were not published.

## Remaining tasks and actual phone steps

| Task | Status / next action |
| --- | --- |
| MOB-001/002 | Done; historical baseline/Phase 1 evidence |
| MOB-003 | Blocked on actual iPhone Safari B05 menu/map |
| MOB-004/005/006 | Implemented; desktop/emulation evidence; actual phone not run |
| **MOB-007** | **Implementation complete; blocked on actual iPhone landscape/cutout/browser-bar acceptance** |
| **MOB-008** | **Next implementation candidate:** touch mission menus/retry/abort/results; pending MOB-007 acceptance, independent investigation allowed under user authorization |

Phone: open/refresh the public URL in Safari and verify `ecdf5587ce78`. Record
model/iOS. Load demo → wait for 20 verified files → Start → briefly hold Christmas
Special. Record B05 menu/map, then landscape control readability/clearance around
cutouts and the home indicator. Open Guide, scroll it, return; check pause/resume.
Try Move, Fire hold/aim/lift, Pan and Follow. Rotate to portrait for guidance or
optional portrait play, rotate back, then show/hide Safari bars and check aim.
No ChatGPT login, PC or Files-app import is needed. Record observed failures.

**Those actual device steps have not run.** Missing real-device access is the
precise remaining layout blocker. Full mission/retry/abort/results, persistent
checkpoints, interruption recovery, audio (disabled), sustained performance,
larger forces, tactical changes and H Hour remain outstanding/out of this task.

## Future handoff template

Task/status, branch/base, final commits/review, exact deployed build; changed
files/behavior; commands/results and device/browser/input; preview/artifact/data
provenance; source/automated/emulated/real-device distinctions; failed/unperformed
checks/blockers and the next dependency-ready task. Preserve user work.
