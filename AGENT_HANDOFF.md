# Current handoff

Updated 2026-10-28. **MOB-005 touch command modes are implemented and verified
with desktop/emulated input. Actual iPhone Safari and a full touch-only mission
are NOT RUN. M1/B05 and M2 remain unpassed.**

## Active task: MOB-006

Codex claimed `mobile/touch-camera` from user-merged master
`ec0497aa4b565f1e09ee5c6391470522167a6fb0` (PR #5). Scope: safe touch camera
gestures, explicit Pan mode, Follow squad, and input/coordinate validation.
Implementation/testing are in progress. The public preview below remains the
MOB-005 artifact until a new committed build is verified and published.

## Branch, commits and review

- Task/claim: Codex / **MOB-005**, `mobile/touch-command-modes`, from current
  user-merged master `6afde21d77f11780d578f909ab609627c8b41a93` (PR #4).
- `1dd9a2c80ca83fa052b21b2ad2e187327b0f3d02`: touch toolbar, modes, pointer
  ownership and deliberate native secondary fire.
- **Tested/published code:** `7809755786a7999b835c814b63c945beb5c12f66`, including
  the desktop resize ownership fix. Later docs do not change that artifact.
- [Draft PR #5](https://github.com/jbbejena/openfodder/pull/5), targeting master,
  left unmerged. Prior roadmap/Phase 1, phone loader, command bridge and Windows
  correction are already in master through the user's merges of PRs #1–4.
- No merge, force push, repin, native control rewrite or game-data upload here.

## Delivered behavior

The battlefield toolbar defaults on for touch devices and can be enabled with
**Touch commands** on desktop. Squad buttons show engine counts/selection and
reject empty squads. Move commits one tap on release; a drag cancels. Fire
holds primary aiming until lift/cancel. Grenade/Rocket modes mark a world target
then require an explicit Throw/Launch confirmation; one native shot is requested,
then the browser returns to Move. Ammo and projectile creation stay in C++.

A second canvas finger cancels the active gesture and cannot inherit it. HUD
pointers remain separate. Pointer cancellation/lost capture, leaving the visible
battlefield, mode/squad changes, resize, blur/hidden/pagehide release input.
Capture-phase handlers suppress duplicate SDL legacy touch/compatibility mouse
commands. Unchecking the controller retains desktop SDL controls.

The exact demo begins with four troops in Squad 1, empty Squads 2/3, and zero
secondary ammo. Published weapon buttons are correctly disabled. Separate local
browser-memory Grenades=3/Rockets=2 fixtures proved native firing/ammo changes;
no fixture was committed or published. No squad splitting was added.

Changed implementation: `web/touch-controls.js` and nine tests, shell/CSS/bootstrap,
additive `secondaryTo/At` bridge methods and Emscripten-only `Source/WebInput.cpp`
one-shot latch. Packaging/artifact allowlist includes the new JS; web CI runs
all browser Node test files. Real-engine touch smoke and desktop resize regression
are in `scripts/smoke-web-touch.cjs` / `smoke-web-input.cjs`.

[Control map](docs/mobile/TOUCH_CONTROLS.md), [API contract](docs/mobile/INPUT_API.md),
[full evidence/known limits](docs/mobile/test-runs/touch-commands.md).

## Commands and actual results

```sh
node web/engine-bridge.test.cjs
node web/touch-controls.test.cjs
node --test web/*.test.cjs
python3 -m unittest discover -s scripts/ci -p 'test_*.py' -q
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
python3 scripts/ci/windows_scope.py --base origin/master --head HEAD
python3 -m http.server 8090 --directory build-web/cmake/dist
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-touch.cjs http://127.0.0.1:8090/ \
  build-web/local-only/christmas.ofdata build-web/local-only/touch-final-evidence
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-input.cjs http://127.0.0.1:8090/ \
  build-web/local-only/christmas.ofdata build-web/local-only/touch-final-bridge-evidence
```

- All 15 Node cases and 12 Windows scope fixtures passed; task diff is web-only.
- Committed pinned build/source guard passed for `7809755`; 47 GPL/config support
  files, no game assets. Limited host syntax check passed; full Linux CI passed.
- Chromium 154.0.8037.57 / Playwright 1.57.0, Linux SwiftShader/WebGL1. Actual Wasm
  orders, leader movement/aim, command counts, native secondary ammo, HUD/multiple
  fingers, exit/cancel and post-resize targeting passed with CDP touch emulation
  at DPR 2, 915×600 then 844×390. This is not real iPhone input.
- Desktop bridge DPR 1/2 passed, including native menu/right-fire/P, explicit pause
  reasons/frozen ticks, queue/cancel and opt-in harness hold/release.
- The initial desktop regression caught disabled touch controls cancelling camera
  input on resize. Fixed in `7809755`; durable actual-engine regression passed.
- Fresh anonymous hosted HTTP 200, exact clean ID, 20 verified upstream GETs,
  menu/map and touch Move/primary Fire/release/second-finger cancellation passed.
  No supplied credentials, authentication headers or page errors. One cold
  engine-ready measurement: 2,440 ms, not a phone benchmark.
- Initial hosted coordinate QA failed with an unlocked moving follow camera;
  the final stationary-camera comparison passed. Details in the test record.
- Final local and hosted screenshots were inspected and remain local. Logs and
  JSON: `/workspace/touch-final-*.log`, `/workspace/touch-hosted-result.json`,
  `/workspace/touch-hosted-smoke.log`, `build-web/local-only/touch-final-evidence/`
  and `touch-final-bridge-evidence/`. No game-art screenshots uploaded.

## Preview, artifact and CI

- [Public preview](https://openfodder-phase-one.zanysky263.chatgpt.site), **no sign-in**:
  Sites version **5**, visible build **`7809755786a7`**; previous `d755c60` is superseded.
- Saved version `appgprj_6ae24fbe89788191a38778521e56e855~appgver_48599b79f2408191865c305e452299bd`.
  Deployment `appgdep_6ae27d0cf85881919e97fef47cbb4488` succeeded. Source commit
  `1ccf34dced62f9a600542ff9fbad914934228040`, manifest/source checkout
  `/workspace/sites/openfodder-phase-one/`, project
  `appgprj_6ae24fbe89788191a38778521e56e855`. Public access preserved.
- [Web CI passed](https://github.com/jbbejena/openfodder/actions/runs/40783411106),
  [matching artifact](https://github.com/jbbejena/openfodder/actions/runs/40783411106/artifacts/12856464683),
  source/notices included, 30-day retention, no player pack.
- [Linux CI passed](https://github.com/jbbejena/openfodder/actions/runs/40783411112).
- [Windows scope run](https://github.com/jbbejena/openfodder/actions/runs/40783411082):
  scope job `123150494839` passed; compiler job `123150565587` **SKIPPED**. No
  Windows runner was allocated. The user-merged PR #4 correctly recognizes this
  file's Emscripten guards; native-visible edits/manual dispatch remain covered.
- Follow PR #5 for the latest checks on the docs handoff. Aggregate PR diffs can
  retrigger web/Linux validation; Windows stays gated. No protection bypassed.

## Dependencies and publication

Run `070a6086c62164e859fc3274b75b5f536fa9d902`, Scripts
`dad04730860bcdd1189aa8562860e379b0f5d783`, emsdk
`c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56`, Emscripten 4.0.23
(`7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`), SDL 3.2.22,
CMake 3.31.6/Ninja 1.11.1: unchanged. See [BUILD.md](docs/mobile/BUILD.md).

Runtime 2,937,519 bytes; upstream demo 223,382 bytes; about 3.16 MB combined
before compression. Optional source 1,840,045 bytes; all hosted files 4,891,621.
The Site hosts engine/support/source only. Exact demo files load directly from
the pinned existing upstream publisher or local files, hash-checked in memory.
Our own data-mirroring grant remains unresolved; engine/GPL Scripts licensing
is separate. Synthetic ammo never entered Run, the manifest or the public Site.

## Remaining tasks and gates

| Task | Status / next action |
| --- | --- |
| MOB-001/002 | Done; historical [baseline](docs/mobile/BUILD_BASELINE.md), [Phase 1 evidence](docs/mobile/test-runs/phase-1.md) |
| MOB-003 | Blocked on actual iPhone Safari B05 menu/map result |
| MOB-004 | Done; [command foundation](docs/mobile/test-runs/command-bridge.md) |
| MOB-005 | Done implementation/emulated checks; physical iPhone remains not run |
| **MOB-006** | **Ready / next: safe touch camera gesture**, building on single-owner cancellation |
| MOB-007 | Independently ready: full landscape phone layout/HUD, safe areas and dynamic browser bounds |
| MOB-008 | Pending camera/layout: complete mission menus, retry/abort/results without keyboard |

The current basic toolbar makes the battlefield small on short viewports and
can require scrolling. It is not the full MOB-007 phone shell. Camera pan is not
available through touch; two fingers currently cancel. Audio remains disabled;
vehicles remain unsupported through the API. Full mission, save persistence,
real interruption recovery/performance, larger forces, tactical changes and
H Hour were not implemented or accepted in this task.

Phone steps: open the public URL in Safari and verify `7809755786a7`; Load demo →
Start → briefly hold the Christmas campaign row. Record model/iOS and B05 map
load. Then select Squad 1, Move/tap ground, Fire/hold/slide/lift, add a second
finger, leave the battlefield and Cancel. HUD taps must never order troops;
zero-ammo weapon buttons remain disabled. Record actual observations/failures.
No ChatGPT login, PC or local demo files are needed. **These phone checks have
not run**, and compilation/emulation/user merges cannot pass them.

## Future handoff template

Task/status, branch/base, final commits/PR, deployed build; changed behavior/files;
actual commands/results and input/device/browser; preview/artifact/provenance;
source-inspected/automated/emulated/real-device distinctions; failures/unperformed
checks/blockers; exact next dependency-ready task. Preserve user work and pins.
