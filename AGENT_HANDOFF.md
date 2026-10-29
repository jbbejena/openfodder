# Current handoff

Updated 2026-10-29. **MOB-006 touch camera is implemented and desktop/emulation
checks passed locally and publicly. Actual iPhone Safari, physical touch and a
full touch-only mission are NOT RUN. M1/B05 and M2 remain unpassed.**

## Branch and review

- Codex / MOB-006, branch `mobile/touch-camera`, from user-merged master
  `ec0497aa4b565f1e09ee5c6391470522167a6fb0` (PR #5). Preserve this base/user work.
- `c0dc737edb1cad93ef467c42d7e48f5a17949c08`: browser camera gestures, Pan/Follow,
  shared distance projection, tests and gesture documentation.
- **Tested/published code:** `1384e4f1809edc1a6d7f24967da46768152033d1`:
  accurate idle release feedback and an asynchronous Follow test correction.
  Later Markdown handoff changes do not change that deployed artifact.
- [Draft PR for this branch](https://github.com/jbbejena/openfodder/pulls?q=is%3Apr+head%3Amobile%2Ftouch-camera),
  target master, left unmerged. Its body/checks provide the exact final handoff
  commit, web CI and artifact links. The user already merged PRs #1–5; roadmap,
  Phase 1, phone loading, command foundation and combat controls are in the base.
- No merge, force push, dependency repin, native source/workflow change or game-data
  upload was performed in this task.

## Delivered behavior

In Move mode, put both fingers on the battlefield before dragging: the pending
Move tap becomes a camera gesture once its centroid moves eight CSS pixels.
Alternatively choose Pan and drag one finger. Drag the terrain; lift either pan
finger to finish, then lift all before a fresh command. Remaining, third and
HUD-owned pointers cannot become troop commands. Fire/secondary second touches
cancel without becoming pan. Follow squad restores the existing engine follow
behavior and returns to Move. Modes/Cancel retain an already-panned view.

Fractional distances use the shared contained-image/CSS/DPR boundary, coalesce
into bounded existing engine pan intents and stop at native map bounds. Resize,
cancel/lost capture, foreign touches, mode/squad changes or invalid engine input
end the gesture; no inertia or delayed pointer inheritance. Combat continues.

Changed files: `web/touch-controls.js`, bridge/helper/tests, shell/CSS and
`scripts/smoke-web-camera.cjs`. **No C++/CMake/Run/workflow changes.** Existing
native camera, combat, timing and three-squad/nine-allocated-soldier scope remain.
The real demo begins with four troops in Squad 1 and zero secondary ammo.

[Control/gesture rules](docs/mobile/TOUCH_CONTROLS.md),
[API](docs/mobile/INPUT_API.md), [exact verification](docs/mobile/test-runs/touch-camera.md).

## Commands and observed evidence

```sh
node web/engine-bridge.test.cjs
node web/touch-controls.test.cjs
node --test web/*.test.cjs
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
python3 scripts/ci/windows_scope.py --base origin/master --head HEAD
git diff --exit-code origin/master -- Source CMakeLists.txt Run .gitmodules .github/workflows
python3 -m http.server 8091 --directory build-web/cmake/dist
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-camera.cjs http://127.0.0.1:8091/ \
  build-web/local-only/christmas.ofdata build-web/local-only/camera-final-evidence \
  1384e4f1809edc1a6d7f24967da46768152033d1
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-camera.cjs https://openfodder-phase-one.zanysky263.chatgpt.site/ \
  upstream build-web/local-only/camera-hosted-evidence \
  1384e4f1809edc1a6d7f24967da46768152033d1
```

- **25 Node cases passed** (8 coordinate/API, 17 ownership). Committed pinned
  build/artifact/source guard passed for `1384e4f`; 47 GPL/config support files,
  no game assets. Actual scope diff returns `native: false`.
- Actual Wasm camera checks passed locally and publicly at DPR 1/2: known camera
  delta +32/+24 without player ground orders; threshold, both lifting orders,
  third/HUD-first pointers, Fire cancellation, one-finger Pan, retained view,
  native Follow/movement, same world aim after pan/recenter, cancellation,
  post-resize geometry and map-edge clamping.
- Linux Chromium 154.0.8037.57 / Playwright Core 1.57.0, SwiftShader/WebGL1,
  emulated touch, 915×600 then 844×390. **This is not iPhone Safari.**
- Combat and desktop bridge regressions passed on `c0dc737`, including native
  SDL menu/right-fire/P, movement/aim/release, queue/pause/frozen ticks, prior
  local-only secondary-ammo fixture and disabled-touch resize. `1384e4f` changes
  runtime release wording and the camera smoke's wait, not command logic.
- QA correction: wait for Follow's actual view movement/readiness as well as
  cleared manual ownership. The earlier immediate comparison raced its queued
  engine update; final local/hosted runs passed. A wrong expected-hash invocation
  was also rejected before gameplay and rerun with the exact full commit.
- Public QA used fresh anonymous contexts: HTTP 200, full clean fork ID, 20
  verified upstream files per context, no supplied credentials/auth headers,
  unexpected methods or page errors. TLS stayed verified with the proxy CA.
- Local/hosted canvas and toolbar screenshots were inspected and remain local;
  no game-art screenshot was uploaded. Logs `/workspace/camera-final-*.log`,
  `camera-hosted-smoke.log`, `camera-node-*.log`, `camera-committed-touch.log`,
  `camera-committed-bridge.log`; evidence in `build-web/local-only/camera-*-evidence/`.

## Preview, source and CI

- [Public preview](https://openfodder-phase-one.zanysky263.chatgpt.site), no sign-in:
  **Sites version 6**, visible ID **`1384e4f1809e`**, supersedes v5 / `7809755`.
- Saved version `appgprj_6ae24fbe89788191a38778521e56e855~appgver_d377bcea63c48191b42400f95cd34129`;
  deployment `appgdep_6ae28d63b8348191bc199e05c01c2f2a`: succeeded. Source
  `4a6a99b8cb4c74eb6a1aca5869cdb1a370d1355f`, checkout/manifest
  `/workspace/sites/openfodder-phase-one`, project
  `appgprj_6ae24fbe89788191a38778521e56e855`. Source pushed before saving;
  built output packaged separately; public audience preserved.
- The branch PR supplies final web CI/artifact links. Feature pushes are outside
  its master push trigger; final docs were prepared before opening the PR to
  avoid a repeated web build. Source/native workflow paths are unchanged, so
  native compilation is outside this browser-only diff. Required native checks
  still apply to actual native-visible changes; no gate/protection was bypassed.

## Pins and data boundary

Run `070a6086c62164e859fc3274b75b5f536fa9d902`, Scripts
`dad04730860bcdd1189aa8562860e379b0f5d783`, emsdk
`c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56`, Emscripten 4.0.23
(`7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`), web SDL 3.2.22,
CMake 3.31.6/Ninja 1.11.1: unchanged, recursive pins clean.
[Build instructions](docs/mobile/BUILD.md).

Runtime 2,942,880 bytes plus demo 223,382 bytes from existing upstream: about
3.17 MB before compression. Optional source 1,852,653 bytes; all hosted files
4,909,590. Source and notices accompany the engine. No game assets/player pack
are mirrored or bundled; browser loading uses the existing pinned publisher or
local files and verifies hashes. Our own data-mirroring grant remains unresolved;
engine/GPL Scripts licensing is separate. Camera tests use unmodified content;
prior synthetic ammo tests stay in local browser memory and were not published.

## Remaining tasks and phone steps

| Task | Status / next action |
| --- | --- |
| MOB-001/002 | Done; historical [baseline](docs/mobile/BUILD_BASELINE.md) / [Phase 1 evidence](docs/mobile/test-runs/phase-1.md) |
| MOB-003 | Blocked on actual iPhone Safari B05 menu/map |
| MOB-004/005 | Done implementation; [bridge](docs/mobile/test-runs/command-bridge.md) / [combat evidence](docs/mobile/test-runs/touch-commands.md) |
| MOB-006 | Done implementation/local/public emulation; actual phone not run |
| **MOB-007** | **Ready / next: landscape phone shell/HUD**, safe areas/dynamic browser bounds/readability |
| MOB-008 | Pending MOB-007: full touch mission menus/retry/abort/results |

Phone: open/refresh the public URL in Safari and verify `1384e4f1809e`, record
model/iOS, Load demo → Start → hold Christmas row, and record B05 menu/map. In
Move, put both fingers down before dragging; lift either then both and check
that troops received no order. Try Pan with one finger, Follow squad, then fresh
Fire/aim/release. A second Fire touch should cancel without panning. Record real
observations/failures. No ChatGPT login, PC or Files-app import is needed.

**These real phone checks have not run.** The toolbar still makes the battlefield
small and can scroll on short viewports; MOB-007 owns its redesign. Full mission,
real rotation/browser bars, audio (disabled), saves, interruption recovery,
sustained performance, larger forces, tactical changes and H Hour remain outside
this task. No compile/emulation/merge result can pass the actual device gates.

## Future handoff template

Task/status, branch/base, final commits/review, exact deployed build; changed
files/behavior; commands/results and device/browser/input; preview/artifact/data
provenance; source/automated/emulated/real-device distinctions; failed/unperformed
checks/blockers and the exact next dependency-ready task. Preserve user work.
