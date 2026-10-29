# MOB-009 checkpoint verification

2026-10-29, Codex. Branch `mobile/browser-saves` from user-merged master
`86c70318768ce59fcc85b606caeb655ccddf62b1` (PR #8). User work and recursive pins
preserved. [Native audit and checkpoint contract](../CHECKPOINTS.md).

Application/source artifact: **`f4696c53ccfab5faea024ff221c5052b7f2a8496`**,
`dirty:false`, visible **`f4696c53ccfa`**. Subsequent test-only commit `aaa99dd`
strengthens previous-save selection and replacement-import checks; final Markdown
does not change the published runtime. Linux x86_64, Chromium **154.0.8037.57**,
Playwright Core 1.57.0, SwiftShader/WebGL1, 844×390 CSS pixels/DPR 2/emulated touch.
Storage tests close/reopen **real IndexedDB persistent browser profiles**.

Christmas Special, missions 1/2 (`mapm1`/`mapm2`), one phase each. Unchanged pins:
Run `070a6086c62164e859fc3274b75b5f536fa9d902`, Scripts
`dad04730860bcdd1189aa8562860e379b0f5d783`; emsdk
`c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56`, emcc 4.0.23
`7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`, SDL 3.2.22,
CMake 3.31.6/Ninja 1.11.1.

**Actual iPhone Safari, physical touch, Safari/Files export/import, private-mode
durability, eviction and Home Screen launch: NOT RUN.** No real device attached.
No unmodified combat victory or phone-performance claim.

## Build and checks

```sh
node --test web/*.test.cjs
./scripts/build-web.sh
build-web/tools/venv/bin/cmake --build build-web/cmake --target clean
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
./scripts/build-web.sh
python3 scripts/ci/windows_scope.py \
  --base 86c70318768ce59fcc85b606caeb655ccddf62b1 --head HEAD
```

Passed: committed build, clean rebuild (69 tasks with cached pinned SDK/SDL),
incremental build (`ninja: no work to do`), source/publication guard (47 GPL/config
files, no game assets), recursive pins and **38 individual Node cases** across
five files. Also ran each file directly: 6 checkpoint, 9 API/coordinates, 17 input
ownership, 3 geometry and 3 mission presentation. This environment groups the
`node --test` result as five passing file jobs. Only existing bundled JSON literal
deprecation warnings; no new compiler failure.

Actual branch comparison classifies `native:false`: C++/linker changes are inside
Emscripten guards. Windows should pass its Ubuntu scope checks and skip its
compiler matrix; Linux retains its existing Source-path native check. No workflow
or required check changed. [Draft branch PR/checks](https://github.com/jbbejena/openfodder/pulls?q=is%3Apr+head%3Amobile%2Fbrowser-saves)
records observed CI conclusions and artifact links. CI identifies final PR head;
this preview identifies the application commit above. Roadmap/Phase 1/MOB-004–008
were already merged by the user.

## Actual-engine storage checks

```sh
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

| Check | Observed result / scope |
| --- | --- |
| Save/close/reopen | Local/public pass: Save missions 1 then 2; close whole context, reopen profile; IDBFS loaded before engine; Continue restored mission-2 briefing/map identity and exact native progress except timestamp/name |
| Explicit previous | Local/public pass: restored mission 1 without changing durable current mission 2; Continue still restored 2 |
| Export/import | Local/public pass: downloaded backup later replaced a different mission-1 save with mission 2, retaining 1 as previous |
| Bad inputs | Local/public pass: malformed JSON/schema/content mismatch; correctly rehashed invalid mission, roster length, counts, DataVersion, rank, future SaveVersion and inconsistent recruit ID rejected; saved bytes/scene unchanged |
| Failed write | Local/public pass with injected sync/quota error: no Saved acknowledgement, memory rolled back; real reopen still read mission 2 |
| Corrupt primary | Local/public pass: harness actually synchronized corrupt current to IndexedDB; real reopen recovered/continued previous mission 1; corrupt primary left untouched |
| Denied storage | Local/public pass with injected IndexedDB SecurityError: visible nonfatal message, Save disabled, briefing Export available; native battlefield still playable |
| Live snapshot | Local/public pass: native export rejected battlefield; no live-battle Save offered |
| Returning recruits | Local-only goal fixture: native win/Next, original campaign restored before Save; four returning recruit IDs/ranks/kills/reserves and other native JSON fields survived real reopen; Deploy produced four troops on mapm2 |

The last row uses an **ephemeral empty-goal campaign fixture**, not an unmodified
combat victory. Only browser memory changes; original pinned campaign bytes are
restored before capture. Public QA uses unmodified campaigns and no fixtures.
Checksums detect corruption, not score authenticity.

The additional import assertion initially read the preceding Save message while
the selected file was still being read. The harness now waits for a new storage
revision and that operation's completed acknowledgement before checking slots;
this was a test timing issue, with no runtime change.

## Regression and visual QA

```sh
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-mission.cjs http://127.0.0.1:8094/ \
  build-web/local-only/christmas.ofdata build-web/local-only/saves-mission-evidence \
  f4696c53ccfab5faea024ff221c5052b7f2a8496 --fixtures
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-layout.cjs http://127.0.0.1:8094/ \
  build-web/local-only/christmas.ofdata build-web/local-only/saves-layout-evidence \
  f4696c53ccfab5faea024ff221c5052b7f2a8496
```

Passed: transition/argument validation and Cancel ownership; unmodified mapm1
emulated-touch movement → native defeat, fresh-recruit Retry, Guide pause/resume,
cancel/confirm Abort, menu and mission-2 replay. Separate localhost goal fixtures
passed native win/continuation/final-demo. Layout: 568×320–915×412, DPR 1/2/3,
≥44px field controls, simulated safe areas/browser bars, Guide focus/scroll,
independent pause, portrait round trip/aim, release and narrow desktop/native P.

Local/public saved/restored screenshots inspected: clean visible fork ID,
readable feedback, reachable controls in the internally scrolling card, header
above overlays. Screenshots, profiles and progress exports remain under ignored
`build-web/local-only/`. Public QA: HTTP 200/full clean commit, 20 pinned/hash-
verified upstream files per startup, no page errors/non-GET requests/auth headers.
TLS stayed verified with a temporary browser proxy CA, removed afterward.

Logs: `/workspace/saves-{clean-build,incremental-build,committed-build,node,final,hosted-final,mission,layout}.log`.
JSON/screenshots/profiles: `build-web/local-only/saves-{final,hosted-final,mission,layout}-evidence/`.

## Preview and remaining checks

- [Public preview](https://openfodder-phase-one.zanysky263.chatgpt.site), no login:
  **Sites version 10**, visible **`f4696c53ccfa`**.
- Project `appgprj_6ae24fbe89788191a38778521e56e855`; version
  `appgprj_6ae24fbe89788191a38778521e56e855~appgver_1c0385c31d2c8191968182bba85972e9`.
- Deployment `appgdep_6ae3a8ebd3e8819193e6ab91bf128ba1`: succeeded. Hosting
  source `6c80a25750a6b2156d0da235c939f894d9de6a3d`, pushed before saving;
  exact clean dist packaged separately, public audience revision 2 preserved.
- Runtime/support 3,021,095 bytes + upstream content 223,382 = **3,244,477 bytes**
  before compression; optional source 1,913,121; total hosted files/notices/source
  5,047,510. No game assets/player pack/profiles/progress exports uploaded.
  GPL source/notices included. Own demo-mirroring permission remains unresolved,
  separate from engine/Scripts rights.

[Phone steps](../BUILD.md#try-mission-checkpoints--actual-iphone-not-run): verify
build ID, load demo, Start, choose mission, Save at briefing/wait, close/reopen the
same Safari URL/profile, load demo again, Start → Continue → Deploy. Record model/
iOS, mission/troops/errors. Test previous and Export/Import through Safari/Files.

**Actual iPhone checks remain NOT RUN.** Browser clearing/eviction can remove
saves; keep an exported backup. No cloud/cross-tab sync, live-battle resume, audio
(disabled), interruption recovery or sustained phone-performance claim. B05,
MOB-007/008 device gates and M1/M2/M3 remain unpassed. Next bounded implementation
task: **MOB-010**, lifecycle/input/audio, within active user authorization.
