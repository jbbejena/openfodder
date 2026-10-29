# MOB-008 verification — 2026-10-29

Implementation and local/public actual-engine emulation passed. The unmodified
first mission reached defeat through touch movement, then retried without a
keyboard/reload. **Actual iPhone Safari/physical touch and an unmodified combat
victory are NOT RUN. MOB-007's inherited device gate remains unpassed; MOB-008
stays blocked on actual device acceptance. M1/B05 and M2 remain unpassed.**

## Exact source and publication

- Branch `mobile/mission-flow`, from user-merged master
  `7e6b537bbcb9a587f30ec27b7fdca1a71e3aef76` (PR #7).
- **Tested/published implementation:** `7ec50c315b0e98d3ca6b8247b604e47f8bfb645c`.
  Later Markdown handoff changes do not change that deployed artifact.
- Engine/mission implementation `7ec8a5d09036751f1e9d7145009366b541805b42`;
  `7ec50c3` adds the small header stacking fix identified during public visual QA.
- [Branch PR](https://github.com/jbbejena/openfodder/pulls?q=is%3Apr+head%3Amobile%2Fmission-flow),
  draft to master, left unmerged. Its body/checks provide the final handoff commit,
  exact CI and artifact links. Roadmap, Phase 1 and MOB-004–007 are already in the
  base through user merges. No merge or force push was performed here.
- [Public preview](https://openfodder-phase-one.zanysky263.chatgpt.site): Sites
  **version 9**, visible ID **`7ec50c315b0e`**, no sign-in; supersedes v8.
- Saved version `appgprj_6ae24fbe89788191a38778521e56e855~appgver_fbc778e09e9c8191ac66b7bc422c0115`;
  deployment `appgdep_6ae2d001998481918d53c28d342e61c6`: succeeded.
- Hosting source `2b20c46d397b43187f4c5dca4d201dd6fa52cb4c`, checkout
  `/workspace/sites/openfodder-phase-one`, project
  `appgprj_6ae24fbe89788191a38778521e56e855`. Matching source pushed before saving;
  static output packaged separately; public audience revision 2 preserved.

Run `070a6086c62164e859fc3274b75b5f536fa9d902`, nested Scripts
`dad04730860bcdd1189aa8562860e379b0f5d783`, emsdk
`c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56`, Emscripten 4.0.23
(`7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`), web SDL 3.2.22,
CMake 3.31.6/Ninja 1.11.1: unchanged. Christmas Special missions `mapm1` /
LAND OF HOPE AND GLORY and `mapm2` / IT'S SNOW TIME! First mission starts with
four troops in Squad 1 and no secondary ammo. No force/combat/data changes.

## Implementation boundary

[Flow/control semantics](../MISSION_FLOW.md) and [API](../INPUT_API.md).
Emscripten startup now holds menu, briefing, battlefield, ending and result states.
The bridge validates additive actions 11–16 at submission and application. Scene
preparation runs after the input queue/redraw lock. One transition can wait; a
Cancel cannot erase it. Native phase logic owns goal/defeat/abort cleanup and
outcome capture. No JavaScript setter can declare victory or loss.

Retry performs a fresh native start of the selected mission with fresh recruits;
Continue calls native Phase_Next. Returning to menu discards this run but retains
loaded content. Guide pauses; Back preserves a prior user pause, while Resume
combat explicitly clears it. Abort requires confirmation and has precedence over
winning flags. Browser mouse users use the same DOM mission screens, then the
existing SDL battlefield controls. Native desktop startup is unchanged.

## Commands and observed results

```sh
node --test web/*.test.cjs
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
python3 scripts/ci/windows_scope.py \
  --base 7e6b537bbcb9a587f30ec27b7fdca1a71e3aef76 --head HEAD
python3 -m http.server 8093 --bind 127.0.0.1 --directory build-web/cmake/dist
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-mission.cjs http://127.0.0.1:8093/ \
  build-web/local-only/christmas.ofdata build-web/local-only/mission-header-final-evidence \
  7ec50c315b0e98d3ca6b8247b604e47f8bfb645c --fixtures
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-layout.cjs http://127.0.0.1:8093/ \
  build-web/local-only/christmas.ofdata build-web/local-only/mission-header-layout-evidence \
  7ec50c315b0e98d3ca6b8247b604e47f8bfb645c
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-mission.cjs https://openfodder-phase-one.zanysky263.chatgpt.site/ \
  upstream build-web/local-only/mission-header-hosted-evidence \
  7ec50c315b0e98d3ca6b8247b604e47f8bfb645c
```

- **32 Node cases passed:** nine coordinate/API, 17 ownership, three shell
  geometry, three mission-presentation safety cases. Existing CI wildcard covers
  all files. Unknown/aborted/lost results cannot offer winning continuation.
- Pinned build and committed incremental relink passed. Artifact/source guard
  passed at clean `7ec50c3`: 47 GPL/config support files, 245,998-byte `.data`,
  no game assets. See PR checks for the fresh CI build/artifact.
- Windows scope returns **`native: false`** for the actual base/head diff. All
  three C++/header edits are inside Emscripten guards. CMake, dependency pins and
  workflows are unchanged. The Windows compiler matrix should skip; Linux's
  existing Source-path native check still runs. Final observed CI is linked in PR.
- Linux Chromium **154.0.8037.57**, Playwright Core 1.57.0, SwiftShader/WebGL1.
  Actual Wasm with emulated touch at 844×390/DPR 2. Local fitted-layout checks
  also cover DPR 3 and native desktop DPR 1. **No physical Safari/GPU claim.**

| Check | Actual observation |
| --- | --- |
| Command validation | Invalid/fractional/out-of-range mission IDs, nonzero unused argument and wrong-stage commands rejected; duplicate transition busy; queued Select survived Cancel |
| Briefing | Both names/maps/objectives read from the engine; choosing/returning/deploying used touch buttons |
| Unmodified defeat | Touch movement sent the four soldiers into enemy territory without firing; native troop loss produced `lost`, cheats=false, no continuation |
| Stable results | Result fields/tick held unchanged while waiting; combat commands rejected; no automatic restart/advance |
| Retry | Touch Retry cleared old result, incremented attempt, restarted the same mission/map with four fresh troops; no reload |
| Pause/help | Guide froze mission ticks; cancelling abort and Back resumed; separate manual-pause regression probe resumed via the touch Resume button |
| Abort | Confirmed native abort became `aborted`, no Next action; cancellation did not end play; Return to menu cleared result |
| Mission selection | Mission 2 deployed as `mapm2`; its Retry stayed on mission 2; repeated abort/retry/menu cycles worked |
| Short/portrait menus | 568×320 and 390×844 cards scrolled internally, buttons stayed ≥44px, page scroll stayed zero |
| Local victory fixtures | Empty-goal campaign phases in this browser's memory let native goal checks complete; won/Continue/native Phase_Next/mission-2/final-demo branches passed |

The mission smoke's API validation and manual-pause probes are separate from its
touch-only normal mission play. The normal defeat/retry/abort/menu episode uses
the unmodified, hash-verified data and no keyboard or cheat keys. **Fixture wins
are not an unmodified combat victory.** `--fixtures` is restricted to localhost;
it edits only ephemeral campaign JSON in one browser, never data on disk, Git,
the artifact or the host. Hosted verification runs without fixtures.

Committed layout checks passed: 568×320 through 915×412, 44px controls outside the
canvas, simulated cutouts/browser bars, held-fire release on geometry change,
Guide scroll/focus/P/Escape and composed pause, portrait round trip/actual aim,
DPR 3 aim, and 640×480 native P. Existing combat/input/camera/loading regressions
passed during implementation: actual movement/aim/release, local-only secondary
ammo fixture, native right-fire/P, harness/queue/pause safety, camera ownership/
Follow/resize/clamp, missing/corrupt/partial content, upstream failure/retry,
default/opt-in cheats and missing-Wasm feedback. Startup helpers now use DOM
mission selection/deployment, matching the new browser UI.

Resolved QA setup issues: after adding a new HTML element, a JS-only packaging
shortcut left stale generated HTML and produced clear runtime/reload feedback;
the documented full build fixed it. An initial victory probe modified raw sprite
bytes after resource loading and did not affect the selected resource; the final
fixture changes reloaded campaign goals instead. Native outcomes were never
overridden to satisfy tests. Hosted Chromium screenshots also caught header
painting disappearing above the mission surface despite correct hit testing;
giving the header an explicit stacking level above the overlay fixed it. Final
committed mission/layout runs passed, with the header fix included.

## Anonymous preview and content boundary

The public run used a fresh anonymous context, HTTP 200/full clean fork ID,
**20 pinned hash-verified upstream files**, no supplied authorization headers,
unexpected methods or page errors. It completed the unmodified defeat/retry/
pause/abort/menu/mission-2 episode. TLS stayed verified with the temporary proxy
CA, removed after testing. Local and public screenshots were inspected and stay
local because they contain game art.

Top-level runtime/support files excluding source ZIP: **2,983,624 bytes**; upstream
demo **223,382 bytes**, combined about **3.21 MB** before compression. Optional
source ZIP: 1,889,823 bytes. All hosted files including source/notices: 4,986,741.
Engine/GPL Scripts source/notices accompany the build. No game assets or player
pack were uploaded here. Our own data-mirroring permission remains unresolved;
browser loading uses the existing pinned upstream publisher or local files.

Logs: `/workspace/mission-committed-build.log`, `mission-header-build.log`, `mission-header-final.log`,
`mission-header-layout.log`, `mission-header-hosted.log`, `mission-touch.log`,
`mission-input.log`, `mission-camera.log`, `mission-launcher.log`, `mission-node.log`.
JSON/screenshots under `build-web/local-only/mission-*-evidence/`.

## Actual iPhone checks — NOT RUN

1. Refresh the public URL in Safari and verify **`7ec50c315b0e`**. Record model/iOS.
2. Load demo → 20 verified files → Start game → LAND OF HOPE AND GLORY → read
   objectives → Deploy mission. Record menu/map and landscape control clearance.
3. Try Move/Fire/Pan/Follow. Open Guide, scroll objectives/help, return. Check
   portrait guidance and aim after rotating back/showing Safari bars (MOB-007).
4. Guide → Abort mission → Keep playing must leave the attempt active. Confirm
   abort on the next try, check the aborted result, then Retry and Return to menu.
5. Play to an actual victory or defeat, verify the matching result, Retry, and
   try mission 2. Record observations/failures against this exact build.

No sign-in, PC or Files-app import is needed. **These actual-device steps have
not run.** Missing real-device access is the precise remaining acceptance blocker.
Next implementation candidate: **MOB-009**, audit native checkpoint fidelity and
add explicit browser persistence. Current menus do not save progress. Full
interruption recovery, audio, sustained phone performance, larger forces,
tactical changes and H Hour remain later/outside scope.
