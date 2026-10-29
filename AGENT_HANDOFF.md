# Current handoff

Updated 2026-10-29. **MOB-009 browser mission-start checkpoints are implemented.
Actual Wasm + Chromium IndexedDB save/close/reopen, validated restore, recovery
and error checks passed locally and publicly. Returning recruits round-tripped
using a local native-progression fixture. Actual iPhone Safari/physical touch/
storage durability and an unmodified combat victory remain NOT RUN. B05,
MOB-007/008 phone gates and M1/M2/M3 remain unpassed.**

## Branch and review

Active claim: Codex / **MOB-010**, `mobile/browser-lifecycle` from user-merged
master `965b90f3105e5861057e27b36937e66268f4f09d` (PR #9). Scope: explicit
visibility/focus/page interruption policy, released input, safe resume, audio
audit and real-browser checks. Existing preview/evidence below describe MOB-009
until publication. Inherited phone gates remain unpassed.

- Codex / **MOB-009**, `mobile/browser-saves`, from user-merged master
  `86c70318768ce59fcc85b606caeb655ccddf62b1` (PR #8). User work preserved;
  independent implementation authorized while inherited phone gates remain open.
- **Application/tested/published:** `f4696c53ccfab5faea024ff221c5052b7f2a8496`:
  native validation/temporary restore, briefing/menu UI, IDBFS, backups, packaging,
  storage cases/browser smoke and native audit. `aaa99dd` adds previous-selection/
  replacement-import assertions; no runtime change. Final Markdown records this
  handoff without changing the published artifact.
- [Draft branch PR to master](https://github.com/jbbejena/openfodder/pulls?q=is%3Apr+head%3Amobile%2Fbrowser-saves)
  supplies exact final head and observed CI/artifact links. Leave unmerged.
  Roadmap/Phase 1/MOB-004–008 already reached master through user merges.
- No merge, force push, dependency repin, workflow change or game-data upload.

## Behavior and source boundary

Load demo → Start → choose mission → briefing → **Save checkpoint** → wait for
Saved. Reopen same origin/browser/profile → load demo again → Start → **Continue**
→ saved briefing → Deploy. Save after Next mission to retain returning recruits.
Continue starts the mission from its beginning. **No live-battle/phase-exact resume.**

Native JSON contains campaign/mission/recruit IDs/ranks/kills/reserves/heroes/
scores, but omits phase number, sprites/positions/orders, ammo, RNG, camera/input
and within-mission phase counts. Only the pinned Christmas Special's two
single-phase missions are supported. Validate the complete candidate, load a
temporary native object, replace active data only on success, detach all nine
troop pointers and rebuild sprites on Deploy. Shared native save/load unchanged.

IDBFS mounts `/Saves` and loads before main/save discovery. Schema 1 compatibility
pins ABI, Run/Scripts and the full content manifest; producing commit is
informational to support compatible builds. SHA-256 detects corruption.
`current.json`/`previous.json` retain a validated recovery copy. Save/Import waits
for successful `syncfs(false)` before acknowledgement. Failures roll memory back;
denied storage gives nonfatal feedback and still permits play/briefing Export.
Invalid imports preserve stored bytes/scene. Use previous does not replace current.
Backups contain progress JSON, not game assets. No unload-only saving.

Files: Emscripten-only `Source/Start_Emscripten.cpp`, `WebInput.cpp/.hpp`, CMake
IDBFS flags within `if(EMSCRIPTEN)`; new `web/checkpoints.js`/tests, bridge action
17, bootstrap ordering, mission gating, shell/CSS, packaging/guard and real-browser
smoke. Native startup/combat/timing/forces unchanged. [Audit/policy](docs/mobile/CHECKPOINTS.md),
[API](docs/mobile/INPUT_API.md), [exact results/commands](docs/mobile/test-runs/checkpoints.md),
[build/phone steps](docs/mobile/BUILD.md).

## Checks and commands

```sh
node --test web/*.test.cjs
./scripts/build-web.sh
build-web/tools/venv/bin/cmake --build build-web/cmake --target clean
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
./scripts/build-web.sh
python3 scripts/ci/windows_scope.py \
  --base 86c70318768ce59fcc85b606caeb655ccddf62b1 --head HEAD
python3 -m http.server 8094 --bind 127.0.0.1 --directory build-web/cmake/dist
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-saves.cjs http://127.0.0.1:8094/ \
  build-web/local-only/christmas.ofdata build-web/local-only/saves-final-evidence \
  f4696c53ccfab5faea024ff221c5052b7f2a8496 --fixtures
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-saves.cjs https://openfodder-phase-one.zanysky263.chatgpt.site/ \
  upstream build-web/local-only/saves-hosted-final-evidence \
  f4696c53ccfab5faea024ff221c5052b7f2a8496
```

- Passed **38 individual Node cases** across five files (also run directly),
  pinned committed/clean build (69 tasks/cached SDK), incremental no-op and
  source/publication guard (47 GPL/config files). Existing JSON warnings only.
- Local/public actual IndexedDB: real context close/reopen/native mission-2
  restore; explicit previous-1 selection while current-2 retained; downloaded
  backup replacing a different save; rejected malformed/incompatible/invalid
  native fields; forced sync/quota failure then real reopen; synchronized corrupt
  primary/previous recovery; denied IndexedDB, disabled Save, available briefing
  Export and playable battlefield; live export rejected.
- Local empty-goal campaign fixture: native win/Next, original bytes restored,
  save four returning recruits at mission-2 briefing, real reopen, exact native
  serialization round trip, deploy four troops on mapm2. **Not an unmodified
  victory.** No fixture assets uploaded/committed.
- Same artifact passed mission/layout smokes: unmodified emulated-touch mapm1
  defeat/Retry, Guide pause/resume, cancel/confirm Abort, menu/mapm2; local native
  goal fixtures; DPR 1/2/3, 568×320–915×412, simulated safe areas/browser bars,
  focus/scroll, composed pause, portrait/aim/release and narrow native P.
- Linux Chromium 154.0.8037.57, Playwright Core 1.57.0, SwiftShader/WebGL1,
  emulated touch. **No Safari/physical touch/phone-performance claim.**
- Public: HTTP 200/clean fork ID, 20 pinned/hash-verified upstream files per
  startup, no page errors/non-GET/auth headers; TLS verified with temporary browser
  proxy CA removed afterward. Local/public screenshots inspected. Profiles,
  exports and artwork remain ignored/local.
- Logs `/workspace/saves-{clean-build,incremental-build,committed-build,node,final,hosted-final,mission,layout}.log`;
  evidence `build-web/local-only/saves-*-evidence/`.

## Preview, CI and provenance

- [Public preview](https://openfodder-phase-one.zanysky263.chatgpt.site), no login:
  **Sites version 10**, **`f4696c53ccfa`**, supersedes v9/MOB-008.
- Version `appgprj_6ae24fbe89788191a38778521e56e855~appgver_1c0385c31d2c8191968182bba85972e9`;
  deployment `appgdep_6ae3a8ebd3e8819193e6ab91bf128ba1`: succeeded. Hosting
  source `6c80a25750a6b2156d0da235c939f894d9de6a3d`, pushed before saving;
  exact clean output packaged separately. Project
  `appgprj_6ae24fbe89788191a38778521e56e855`, checkout
  `/workspace/sites/openfodder-phase-one`, public audience revision 2 preserved.
- Local Windows comparison returns `native:false`: Ubuntu scope job should pass,
  compiler matrix skip. Linux's existing Source-path check runs. PR body/checks
  record observed final CI/artifact links. No workflow/protection changed. Final
  docs prepared before opening PR; feature pushes do not duplicate web PR builds.
- Run `070a6086c62164e859fc3274b75b5f536fa9d902`, Scripts
  `dad04730860bcdd1189aa8562860e379b0f5d783`, emsdk
  `c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56`, emcc 4.0.23
  `7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`, SDL 3.2.22,
  CMake 3.31.6/Ninja 1.11.1 unchanged; recursive pins clean.
- Runtime/support 3,021,095 + upstream content 223,382 = **3,244,477 bytes**
  before compression. Optional source 1,913,121; hosted total/notices/source
  5,047,510. No game assets/player pack/profiles/progress exports hosted. GPL
  source/notices included. Own demo-mirroring permission remains unresolved,
  separate from engine/Scripts rights; browser fetches existing pinned upstream.

## Remaining checks and next task

MOB-001/002 and desktop MOB-004–006/009 deliverables done. MOB-003/B05 and
MOB-007/008 actual iPhone gates remain open; actual storage/Files durability is
NOT RUN. M1/M2/M3 remain unpassed. **Next bounded implementation: MOB-010**, explicit
visibility/focus/input/audio lifecycle, within active user authorization.

Phone: Safari → public URL → verify `f4696c53ccfa` → Load demo (20 verified) →
Start → choose mission → Save at briefing → wait for Saved. Close/reopen same
Safari URL/profile → Load demo again → Start → Continue → verify briefing →
Deploy. Check previous-save selection and Export/Import through Safari/Files.
Record model/iOS, errors, mission/troops. [Exact steps](docs/mobile/BUILD.md#try-mission-checkpoints--actual-iphone-not-run).
No ChatGPT login, computer or initial Files import is needed.

**Actual device steps have not run.** Use one game tab per origin; browser
clearing/eviction/private mode can remove saves, so retain an exported backup.
No cloud/cross-tab sync or live-battle resume. Lifecycle/audio (currently disabled),
sustained phone performance, larger forces, tactical changes and H Hour remain
unverified/unfinished/outside scope.

## Future handoff template

Task/status, branch/base, commits/review, deployed build; files/behavior;
commands/results and device/browser/input; preview/artifact/data provenance;
source/automated/emulated/real-device distinctions; failures/unperformed checks,
blockers and next dependency-ready work. Preserve user work.
