# MOB-006 verification — 2026-10-29

Implementation and desktop/emulated checks passed. **Actual iPhone Safari,
physical touch and a full mission are NOT RUN. M1/B05 and M2 remain unpassed.**

## Exact build and publication

- Branch `mobile/touch-camera`, from user-merged master
  `ec0497aa4b565f1e09ee5c6391470522167a6fb0` (PR #5).
- `c0dc737edb1cad93ef467c42d7e48f5a17949c08`: touch camera/Follow, shared distance
  projection and focused ownership/actual-engine checks.
- **Tested/published code:** `1384e4f1809edc1a6d7f24967da46768152033d1`.
  It clarifies below-threshold release feedback and fixes the Follow test's
  asynchronous observation. Later docs do not change this artifact.
- [Branch PR](https://github.com/jbbejena/openfodder/pulls?q=is%3Apr+head%3Amobile%2Ftouch-camera),
  target master, draft/unmerged. The roadmap/Phase 1 and MOB-004/005 are already
  in its base through user merges. No merge/force push was performed here.
- [Public preview](https://openfodder-phase-one.zanysky263.chatgpt.site): Sites
  version **6**, visible ID **`1384e4f1809e`**, public/no sign-in, supersedes v5.
- Saved version `appgprj_6ae24fbe89788191a38778521e56e855~appgver_d377bcea63c48191b42400f95cd34129`;
  deployment `appgdep_6ae28d63b8348191bc199e05c01c2f2a`: succeeded.
- Hosting source `4a6a99b8cb4c74eb6a1aca5869cdb1a370d1355f`, checkout
  `/workspace/sites/openfodder-phase-one`, project
  `appgprj_6ae24fbe89788191a38778521e56e855`. Source pushed before saving;
  static output packaged separately and not committed. Public audience preserved.

Run `070a6086c62164e859fc3274b75b5f536fa9d902` and nested Scripts
`dad04730860bcdd1189aa8562860e379b0f5d783` remain pinned/clean. Emscripten 4.0.23,
web SDL 3.2.22, CMake 3.31.6/Ninja 1.11.1 and the full [BUILD.md pins](../BUILD.md)
are unchanged. Christmas Special / LAND OF HOPE AND GLORY / `mapm1`; four soldiers
in the one populated squad, zero secondary ammo. No new camera fixture or data.

## Gesture decision

Two fingers in **Move** may acquire the camera before the pending tap commits.
The pair's centroid must move eight CSS pixels. **Pan** mode provides a one-finger
route with the same threshold. Drag the terrain; lift either finger to end the
pair and retain the inspected view. Neither remaining finger nor a third/HUD
finger can become another action. Mode switches retain an already-panned view;
Follow squad restores the existing native follow behavior.

Promotion from Fire/secondary was excluded: Fire starts on its first touch, so
waiting to infer a future camera gesture would allow a brief unwanted shot. A
second touch in those modes cancels input. Explicit Pan is available before
placing a finger. Real Safari gesture reliability remains unverified. No pointer
lock, zoom, inertia, combat timing or C++ camera changes were added.

## Commands and observed results

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

- **25 Node cases passed**: eight coordinate/API cases and 17 physical input/
  ownership cases, including prior combat behavior. Web CI runs both files.
- Committed pinned build and artifact/source guard passed for `1384e4f`. Support
  `.data` remains 47 GPL/config files, with no game assets. Incremental relinks
  succeeded; no new clean-build or phone-performance measurement is claimed.
- Actual diff classifier: `native: false`. Source, CMake, Run/Scripts and native
  workflows are unchanged; no new native compilation is needed for this diff.
  Follow the branch PR checks for the final web build/artifact and workflow scope.
- Linux Chromium **154.0.8037.57**, Playwright Core 1.57.0, SwiftShader/WebGL1;
  CDP emulated touch, DPR **1 and 2**, 915×600 then 844×390.

| Check | Actual Wasm observation, local and public |
| --- | --- |
| Threshold | Sub-eight-pixel centroid jitter sent no nonzero pan |
| Two fingers | A known drag changed native camera X/Y by +32/+24; no player Move/Fire/secondary command; previous troop destination unchanged |
| Pointer ownership | Both lifting orders ended the gesture; the remaining finger emitted no command; third/HUD-first touches could not acquire it |
| Fire separation | Existing held fire released on second touch; it did not promote to pan |
| Explicit Pan | One finger changed the actual camera, with the shared contained-image distance conversion |
| Follow | Native manual ownership cleared and the camera actually moved; the same map aim was reached after recentering |
| Mode change | Switching to Fire retained the inspected view; aiming still reached the intended native target |
| Cancellation/resize | Emulated touchCancel and viewport resize ended the gesture; no later motion/order leaked; fresh pan distances matched new geometry |
| Map edge | Native clamping held the view at the boundary while extra drag intents were accepted |

The stationary aim comparison explicitly holds the camera after Follow has
completed; it does not compare a stale screen point while following is moving.
Combat/autonomous behavior continues during panning.

The existing actual-engine combat smoke and desktop bridge smoke also passed at
`c0dc737`, including movement, held aim/release, zero-ammo rejection, deliberate
secondary firing in the pre-existing local browser-memory ammo fixture, native
SDL menu/right-fire/P, explicit pause/frozen ticks, queue safety and disabled-touch
resize behavior. The only runtime difference in `1384e4f` is release feedback;
command logic is unchanged. Final camera checks ran against the exact clean
`1384e4f` artifact locally and on the public host.

Resolved QA issues: an initial invocation supplied the wrong expected commit
argument and stopped at identity before gameplay. A repeated test then observed
Follow's cleared manual flag before the asynchronous camera movement finished.
The final test waits for engine readiness, cleared ownership **and** changed
view coordinates. Both local/hosted DPR runs passed afterward. No engine behavior
or data was modified to satisfy these checks.

## Anonymous hosting and content boundary

Two fresh browser contexts, one per DPR: HTTP 200, full expected clean commit,
menu/map and all camera checks passed. Each loaded **20 exact upstream files**
through the normal verified launcher (40 requests total). No supplied credentials,
authorization headers, unexpected HTTP methods or page errors were observed.
TLS verification stayed enabled with the environment proxy CA for this QA.
Screenshots of the local and hosted canvas/toolbar were inspected and remain local.

Runtime: **2,942,880 bytes** across 11 top-level runtime files; upstream demo
**223,382 bytes**; combined 3,166,262 bytes (about 3.17 MB) before compression.
Optional source ZIP 1,852,653 bytes; all hosted files 4,909,590 bytes.
The Site hosts no demo/retail game assets or player pack. It serves engine/support,
matching GPL source and notices. Data stays at its pinned existing upstream host
or comes from local files; our own data-mirroring grant remains unresolved.
No game-art screenshots, synthetic campaign or generated output entered Git.

Local evidence: `/workspace/camera-final-build.log`, `camera-final-smoke.log`,
`camera-hosted-smoke.log`, `camera-node-coordinates.log`, `camera-node-ownership.log`,
`camera-committed-touch.log`, `camera-committed-bridge.log`; JSON/screenshots under
`build-web/local-only/camera-final-evidence/`, `camera-hosted-evidence/`,
`camera-committed-touch-evidence/` and `camera-committed-bridge-evidence/`.

## Remaining checks

Actual iPhone Safari/physical touch, safe areas, browser-bar changes, real rotation,
full mission/retry/abort, saves, sustained performance and interruption recovery:
**NOT RUN**. Audio remains disabled. The basic toolbar still leaves a small
battlefield and can require scrolling on short viewports; MOB-007 owns that shell.

Phone steps: open/refresh the public URL in Safari and verify `1384e4f1809e`.
Load demo → Start → briefly hold the Christmas row. Record model/iOS and B05
menu/map first. In Move, put two fingers down before dragging, lift either then
both, and confirm no troop order. Try Pan with one finger, Follow squad, then a
fresh Fire hold/aim/release. In Fire, a second touch should release firing without
panning. HUD taps must not order troops. Record actual failures/observations;
these instructions are not a claim that the phone checks passed.

Next dependency-ready task: **MOB-007**, landscape phone shell/HUD. MOB-008 remains
pending on that layout. M1/B05 and M2 stay unpassed until real device/gameplay evidence.
