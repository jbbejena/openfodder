# MOB-005 verification — 2026-10-28

Implemented and automated checks passed. **Actual iPhone Safari and a complete
mission are NOT RUN. M1/B05 and M2 are not accepted.**

## Exact source and preview

- Branch `mobile/touch-command-modes`, from user-merged master
  `6afde21d77f11780d578f909ab609627c8b41a93` (PR #4).
- `1dd9a2c80ca83fa052b21b2ad2e187327b0f3d02`: touch modes/ownership, squad toolbar,
  deliberate secondary targeting and the native one-shot adapter.
- **Tested/published implementation:** `7809755786a7999b835c814b63c945beb5c12f66`,
  including the desktop resize regression fix. Documentation follow-ups do not
  change that deployed artifact.
- [Draft PR #5](https://github.com/jbbejena/openfodder/pull/5), target master,
  unmerged. Roadmap/Phase 1, phone loader, MOB-004 and Windows gating are already
  in the base through user merges; this PR adds only the next bounded task.
- [Public preview](https://openfodder-phase-one.zanysky263.chatgpt.site): Sites
  version **5**, visible fork ID **`7809755786a7`**, no ChatGPT sign-in.
- Saved version `appgprj_6ae24fbe89788191a38778521e56e855~appgver_48599b79f2408191865c305e452299bd`;
  deployment `appgdep_6ae27d0cf85881919e97fef47cbb4488`: succeeded.
- Hosting source `1ccf34dced62f9a600542ff9fbad914934228040`, checkout
  `/workspace/sites/openfodder-phase-one`, project
  `appgprj_6ae24fbe89788191a38778521e56e855`. Exact source pushed before saving;
  static output packaged separately, never committed. Public audience preserved.

Run `070a6086c62164e859fc3274b75b5f536fa9d902`, nested Scripts
`dad04730860bcdd1189aa8562860e379b0f5d783`, Emscripten 4.0.23, web SDL 3.2.22,
CMake 3.31.6/Ninja 1.11.1 remain unchanged. Full toolchain pins are in [BUILD.md](../BUILD.md).

## Commands and observed results

```sh
node web/engine-bridge.test.cjs
node web/touch-controls.test.cjs
node --test web/*.test.cjs
python3 -m unittest discover -s scripts/ci -p 'test_*.py' -q
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
python3 scripts/ci/windows_scope.py --base origin/master --head HEAD
c++ -std=c++14 -fsyntax-only -DOPENFODDER_NO_MIXER -ISource \
  -Ibuild-web/cmake/Source \
  -Ibuild-web/cache/ports/sdl3/SDL-release-3.2.22/include Source/WebInput.cpp
python3 -m http.server 8090 --directory build-web/cmake/dist
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-touch.cjs http://127.0.0.1:8090/ \
  build-web/local-only/christmas.ofdata build-web/local-only/touch-final-evidence
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-input.cjs http://127.0.0.1:8090/ \
  build-web/local-only/christmas.ofdata build-web/local-only/touch-final-bridge-evidence
```

- Six coordinate/API and nine touch ownership cases passed. CI runs both files.
  All 12 Windows scope fixture tests passed. Actual task diff: `native: false`.
- Pinned build and artifact/source verification passed for committed `7809755`:
  HTML/JS/Wasm/support data and exact source; 47 GPL/config files, no game assets.
  The prior committed relink at `1dd9a2c` took 15.29 seconds; no clean-build time
  was remeasured. Phase 1 retains the historical clean/incremental evidence.
- Limited host syntax check passed. Full [Linux CI passed](https://github.com/jbbejena/openfodder/actions/runs/40783411112).
- [Web CI passed](https://github.com/jbbejena/openfodder/actions/runs/40783411106);
  [matching artifact](https://github.com/jbbejena/openfodder/actions/runs/40783411106/artifacts/12856464683),
  30-day retention, source/notices included, no player pack.
- [Windows workflow](https://github.com/jbbejena/openfodder/actions/runs/40783411082):
  Ubuntu scope job `123150494839` passed; Windows build job `123150565587`
  **skipped**. No Windows compiler runner was allocated for this implementation.
  Later documentation pushes may rerun PR checks against its aggregate diff;
  see PR #5 for the latest checks. Native-visible changes still require Windows.

## Actual-engine input checks

Linux Chromium **154.0.8037.57**, Playwright Core 1.57.0, SwiftShader/WebGL1;
CDP touch emulation at DPR 2, 915×600 then 844×390. This is desktop emulation.

| Check | Observed result |
| --- | --- |
| Squad selection | The one populated demo squad selected; engine counts/highlight matched; empty squads disabled |
| Move | No order on down; one on release; actual engine destination and leader position changed; no legacy/synthetic duplicate |
| Fire | Hold/slide changed actual engine aim; lift released fire; no secondary ammo used |
| Second finger | Cancels Fire and a pending Move tap; neither finger inherits aim/movement after the other lifts |
| HUD | A second HUD touch releases aim; HUD/mode taps never send a ground command |
| Drag/exit/cancel | A >12px Move drag, leaving the canvas and emulated touchCancel release input; re-entry never resumes firing |
| Secondary targeting | Mark and Cancel spent nothing; confirm requested exactly one native grenade/rocket; duplicate confirm did not repeat; mode returned to Move |
| Resize/coordinates | Resize released held input; a fresh touch reached the intended engine map target after resize/contain letterboxing at DPR 2 |
| Desktop regression | Bridge checks at DPR 1/2 passed: coordinates, movement/aim, queue/cancel, pause reasons/frozen ticks, native SDL menu/right fire/P, diagnostic hold/release |

The original campaign has **zero secondary ammo**: UI disable/API rejection
passed. A second local browser context modified only the already-verified
in-memory campaign to Grenades=3/Rockets=2 before mission load. Confirmed shots
changed native ammo to 2/1. No data, manifest, pin or published demo was altered.

One regression was fixed in `7809755`: an unconditional touch resize listener
could cancel a desktop diagnostic camera command while touch controls were off.
It now acts only while enabled. The actual-engine bridge script retains an
explicit check that a disabled touch controller preserves camera ownership/ID
across resize. Final committed bridge and touch runs passed afterward.

## Anonymous hosted check

Fresh anonymous Chromium/CDP touch context, no supplied cookies or authorization
headers: HTTP 200, exact full build identity/clean flag, 20 verified upstream
GETs, campaign menu and battlefield passed. Touch Move changed the engine order
and leader position; primary aim/hold/release and second-finger cancellation
passed. The unmodified zero-ammo baseline disabled secondary buttons. No page
errors were observed. Engine ready was 2,440 ms on this one cold navigation;
this is not a phone performance benchmark.

The first hosted coordinate comparison omitted camera ownership after a Move
order, allowing follow-camera movement between projection and input. That QA
comparison did not finish; the mission eventually lost its soldiers. The final
run used the same explicit stationary-camera comparison as the local bridge
checks and passed. No preview data or engine behavior was changed for this check.

Local evidence: `/workspace/touch-final-smoke.log`, `touch-final-bridge.log`,
`touch-final-build.log`, `touch-hosted-result.json`, `touch-hosted-smoke.log`;
JSON/screenshots in `build-web/local-only/touch-final-evidence/` and
`touch-final-bridge-evidence/`. Hosted menu/battlefield screenshots are under
`/workspace/touch-hosted-*.png`. Screenshots were inspected and remain local;
none were uploaded or included in source/artifacts. TLS verification stayed
on, using the environment proxy CA for upstream/hosted QA.

## Publication boundary and limits

Cold runtime: **2,937,519 bytes** across 11 top-level runtime files; demo fetched
from its existing pinned upstream host: **223,382 bytes**. Combined 3,160,901
bytes (about 3.16 MB) before compression. Optional source archive 1,840,045 bytes;
all hosted files 4,891,621 bytes. Game data is not mirrored/committed/bundled;
our own redistribution grant remains unresolved. Engine/GPL Scripts licensing
is separate. The synthetic ammo fixture was never published.

Real iPhone Safari, physical touch, safe areas, rotation/browser bars, ten-minute
performance, full mission/retry/abort, saves and interruption recovery: **NOT RUN**.
The basic toolbar and short-viewport battlefield still need MOB-007. Camera
panning is not implemented through touch; the current second-finger rule is
cancellation. Audio stays disabled; vehicles remain unsupported by this API.

On iPhone: open the public URL in Safari, verify `7809755786a7`, Load demo → Start
→ hold the Christmas row. Record B05 menu/map first, then populated squad → Move
→ tap ground, Fire → hold/slide/lift, second finger/canvas exit and Cancel. Record
model/iOS and failures; zero-ammo secondary buttons should stay disabled. This
checklist is not a claim that those real-device steps passed.

Next task: **MOB-006**, safe touch camera intent. MOB-007 is independently ready;
MOB-008 remains pending on camera/layout work. Full phone acceptance stays open.
