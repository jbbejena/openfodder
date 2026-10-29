# Current handoff

Updated 2026-10-29. **MOB-008 mission flow is implemented and local/public actual
Wasm touch emulation passed. The unmodified first mission reached defeat and
retried without a keyboard/reload. Actual iPhone Safari/physical touch and an
unmodified combat victory are NOT RUN. MOB-007/008 device acceptance remains
blocked; M1/B05 and M2 remain unpassed.**

## Branch and review

Active claim: Codex / **MOB-009**, `mobile/browser-saves` from user-merged master
`86c70318768ce59fcc85b606caeb655ccddf62b1` (PR #8). Scope: native checkpoint
fidelity audit, browser persistence, validated restore and clear storage feedback.
Independent work is user-authorized while phone gates remain unpassed. The
preview/evidence below still describe MOB-008 until this task is published.

- Codex / MOB-008, `mobile/mission-flow`, from user-merged master
  `7e6b537bbcb9a587f30ec27b7fdca1a71e3aef76` (PR #7). User work preserved.
- `7ec8a5d09036751f1e9d7145009366b541805b42`: engine-backed mission states,
  touch menus/results, transition commands, tests and semantics.
- **Tested/published code:** `7ec50c315b0e98d3ca6b8247b604e47f8bfb645c`:
  explicit header stacking above mission overlays, found during hosted visual QA.
  Later Markdown handoff changes do not change that artifact.
- [Draft PR for this branch](https://github.com/jbbejena/openfodder/pulls?q=is%3Apr+head%3Amobile%2Fmission-flow),
  target master, left unmerged. Its body/checks supply the exact final handoff
  commit and CI/artifact links. Roadmap, Phase 1 and MOB-004–007 are already in
  master through the user's merges of PRs #1–7.
- No merge, force push, dependency repin, workflow change or game-data upload.

## Delivered behavior and source boundary

Load demo → Start game → choose either demo mission → engine briefing/objectives
→ Deploy. Guide pauses combat, shows objectives/help and supports confirmed
Abort. Back restores the previous pause; Resume combat clears a native user pause.
Native end cleanup leads to a stable result: won, lost or aborted remain distinct.
Retry starts the same mission afresh with new recruits. Next mission uses native
Phase_Next when available. Return to menu discards the run but keeps content
loaded. Progress is not saved; Back/reload has no checkpoint/resume promise.

Emscripten-only changes: `Source/Start_Emscripten.cpp`, `Source/WebInput.cpp/.hpp`.
Transition commands use the existing validated queue; scene allocation/stage
changes occur afterward, outside its iteration/redraw lock. Cancel cannot erase
an accepted mission selection. Native phase/goal/defeat/abort routines own results;
JS cannot declare an outcome. Existing loop pacing and battlefield controls remain.
Native desktop startup, combat rules, CMake, pins and workflows are unchanged.

Browser changes: `web/mission-flow.js` + focused tests, bridge/actions, shell/CSS,
bootstrap and phone-shell gating. Packaging/guard includes the new JS. Existing
smokes use DOM mission selection/deploy; new `scripts/smoke-web-mission.cjs`
exercises real Wasm. Mission screens scroll internally in either orientation;
portrait rotation guidance remains on the battlefield. No force/tactical changes.

[Mission semantics](docs/mobile/MISSION_FLOW.md), [API](docs/mobile/INPUT_API.md),
[exact verification](docs/mobile/test-runs/mission-flow.md),
[build/data provenance](docs/mobile/BUILD.md).

## Commands and evidence

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
  node scripts/smoke-web-mission.cjs https://openfodder-phase-one.zanysky263.chatgpt.site/ \
  upstream build-web/local-only/mission-header-hosted-evidence \
  7ec50c315b0e98d3ca6b8247b604e47f8bfb645c
```

- **32 Node cases passed** (9 coordinate/API, 17 ownership, 3 geometry, 3 result
  presentation). Pinned build/incremental relink and clean artifact/source guard
  passed: 47 GPL/config files, no game assets. See PR for fresh CI build evidence.
- Local/public actual-engine checks passed: state/argument validation, duplicate
  transition rejection, Select surviving Cancel, two mission briefings, unmodified
  mapm1 touch movement → actual defeat, stable result/no auto restart, fresh-troop
  same-mission Retry, Guide pause/resume, abort confirmation cancellation, distinct
  abort, menu and mission-2 selection/replay. No keyboard/cheats in normal play.
- **Local-only empty-goal campaign fixtures** exercised native goal completion,
  win/Continue/Phase_Next/mission-2 and final-demo branches. They are not an
  unmodified combat victory. Only one browser's ephemeral campaign JSON changes;
  no fixture asset is written to disk, committed or uploaded. Hosted QA has no fixtures.
- Committed layout checks passed at DPR 1/2/3: 568×320 through 915×412, simulated
  safe areas/browser bars, ≥44px controls outside canvas, Guide focus/scroll and
  composed pause, portrait round trip/aim, held-fire release and narrow native P.
- Combat, native-field input/harness, camera and launcher regressions passed during
  implementation. Exact scope in test record: movement/aim/release, local ammo
  fixture, queue/pause, native right-fire/P, pan/Follow/cancel/resize/clamp,
  corrupt/partial/missing data, upstream retry, cheats opt-in/off and Wasm failure.
- Linux Chromium 154.0.8037.57 / Playwright Core 1.57.0, SwiftShader/WebGL1,
  mouse/keyboard and emulated touch. **No Safari/physical touch/performance claim.**
- Public QA: fresh anonymous context, HTTP 200/full clean fork ID, 20 pinned
  hash-verified upstream files, no auth headers, unexpected methods or page errors.
  TLS stayed verified with temporary browser proxy CA, removed afterward.
- Visual QA caught header painting disappearing above mission screens in hosted
  Chromium; explicit header stacking fixed it. Other QA corrections: full rebuild
  after HTML changes (a JS-only shortcut left stale HTML), and campaign-goal
  fixtures replacing an ineffective post-load sprite-file mutation. No engine
  outcome was overridden. Screenshots were inspected and remain local.
- Logs `/workspace/mission-{committed-build,header-build,header-final,header-layout,header-hosted}.log`,
  `mission-{touch,input,camera,launcher}.log`, `mission-node.log`;
  JSON/screenshots under `build-web/local-only/mission-*-evidence/`.

## Preview, source and CI

- [Public preview](https://openfodder-phase-one.zanysky263.chatgpt.site), no sign-in:
  **Sites version 9**, visible ID **`7ec50c315b0e`**, supersedes v8 / `7ec8a5d`.
- Saved version `appgprj_6ae24fbe89788191a38778521e56e855~appgver_fbc778e09e9c8191ac66b7bc422c0115`;
  deployment `appgdep_6ae2d001998481918d53c28d342e61c6`: succeeded. Source
  `2b20c46d397b43187f4c5dca4d201dd6fa52cb4c`, checkout/manifest
  `/workspace/sites/openfodder-phase-one`, project
  `appgprj_6ae24fbe89788191a38778521e56e855`. Source pushed before saving;
  built output packaged separately; public audience revision 2 preserved.
- Actual Windows classifier returns `native: false`; its scope job should pass
  and compiler matrix skip. Linux's existing Source-path native check still runs.
  No workflow/protection was weakened. Final docs were prepared before opening
  the PR to avoid duplicate PR builds; feature pushes are outside the web master
  push trigger. PR body/checks record observed CI outcomes and artifact links.

## Pins and data boundary

Run `070a6086c62164e859fc3274b75b5f536fa9d902`, Scripts
`dad04730860bcdd1189aa8562860e379b0f5d783`, emsdk
`c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56`, Emscripten 4.0.23
(`7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`), web SDL 3.2.22,
CMake 3.31.6/Ninja 1.11.1: unchanged, recursive pins clean.

Top-level runtime/support 2,983,624 bytes plus upstream demo 223,382 bytes: about
3.21 MB before compression. Optional source 1,889,823 bytes; all hosted files
including notices/source 4,986,741 bytes. Engine/GPL Scripts source and notices
are included. No game assets/player pack are hosted here; loading uses pinned
existing upstream or local files and verifies hashes. Our own data-mirroring
permission remains unresolved and is separate from engine/Scripts licensing.

## Remaining tasks and phone steps

| Task | Status / next action |
| --- | --- |
| MOB-001/002 | Done; historical baseline/Phase 1 evidence |
| MOB-003 | Blocked on actual iPhone Safari B05 menu/map |
| MOB-004–006 | Implemented with desktop/emulation evidence; actual phone not run |
| MOB-007 | Implemented; blocked on actual iPhone landscape/cutout/browser-bar acceptance |
| MOB-008 | Implemented; emulated defeat/retry/abort/menu and fixture wins passed; inherited/actual phone gates unpassed |
| **MOB-009** | **Next implementation candidate:** audit native checkpoint fidelity, round-trip supported mission-boundary saves, then browser persistence; active user scope still controls next work |

Phone: refresh the public URL in Safari and verify `7ec50c315b0e`; record model/iOS.
Load demo → 20 verified files → Start game → LAND OF HOPE AND GLORY → read objectives
→ Deploy. Record B05 menu/map and MOB-007 landscape/rotation/bar clearance.
Guide → Abort mission → Keep playing should leave play active; confirm abort on
another try, check the aborted result, Retry, then Return to menu. Play to an
actual win/loss and verify results. No ChatGPT login, PC or Files import is needed.

**Those actual device steps have not run.** Missing real-device access is the
precise remaining acceptance blocker. Unmodified combat victory, persistent
checkpoints, interruption recovery, audio (disabled), sustained phone performance,
larger forces, tactical changes and H Hour remain unverified/unimplemented/outside scope.

## Future handoff template

Task/status, branch/base, commits/review, deployed build; files/behavior;
commands/results and device/browser/input; preview/artifact/data provenance;
source/automated/emulated/real-device distinctions; failures/unperformed checks,
blockers and next dependency-ready work. Preserve user work.
