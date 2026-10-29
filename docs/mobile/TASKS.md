# Agent task ledger and specifications

Updated: 2026-10-29. Phase 1 implemented by Codex on `build/mobile-phase-1`, starting at `6b851862a77c3dd9556b5cadae7c88d370b6095f`. [Verification record](test-runs/phase-1.md) and [merged PR #1](https://github.com/jbbejena/openfodder/pull/1). The actual iPhone gate remains unpassed.

Read [ROADMAP.md](ROADMAP.md), [PLAYTEST.md](PLAYTEST.md), the root [AGENTS.md](../../AGENTS.md) and [handoff](../../AGENT_HANDOFF.md) before claiming work.

## Status rules

- **ready:** prerequisites are satisfied and the task can be claimed within the active user scope.
- **pending:** an implementation prerequisite or milestone gate remains.
- **active:** a named agent/task session has claimed a bounded task on a recorded branch.
- **blocked:** record the precise missing capability, data, decision or failed check and what can proceed independently.
- **done:** deliverables and acceptance checks have linked evidence. A successful build does not satisfy device or gameplay checks.
- **deferred:** later integration scope, intentionally held until a standalone mobile baseline and fit assessment.

Only MOB-001 was ready at the initial planning snapshot. MOB-001/002 now have evidence; MOB-003 awaits its real iPhone check. Update ready/pending states as evidence changes. Later tasks can be investigated independently when useful, but dependency gates still control completion/release claims. Read the current user request before changing another repository or publishing anything.

Use the claim/evidence columns for an agent/session + branch and a commit/PR/test-record link. Do not overwrite a different active claim. Branch names in task cards are proposals and are not created by this document.

## Ledger

| Task | Milestone | Status | Dependencies | Claim / branch | Evidence |
| --- | --- | --- | --- | --- | --- |
| MOB-001 | M1 | done | None | Codex / `build/mobile-phase-1` | [Baseline](BUILD_BASELINE.md) |
| MOB-002 | M1 | done | MOB-001 | Codex / `build/mobile-phase-1` | `570be27`, tested at `291de61`; [build](BUILD.md), [clean/incremental + desktop results](test-runs/phase-1.md) |
| MOB-003 | M1 | blocked | MOB-002 | Codex / `web/iphone-file-import` follow-up | `7ec50c3`: current public preview with direct upstream demo loading, anonymous/emulated menu/map passed; [MOB-008 record](test-runs/mission-flow.md). B05 not run: no real iPhone |
| MOB-004 | M2 | done | MOB-002 | Codex / `mobile/command-bridge`, from `47e956d` | `d755c60`: [API contract](INPUT_API.md), [actual-engine DPR 1/2 + hosted checks](test-runs/command-bridge.md), [merged PR #3](https://github.com/jbbejena/openfodder/pull/3). B05/M1 still unpassed. |
| MOB-005 | M2 | done | MOB-004 | Codex / `mobile/touch-command-modes`, from `6afde21` | `1dd9a2c` + `7809755`: [control map](TOUCH_CONTROLS.md), [actual-engine emulated touch + desktop evidence](test-runs/touch-commands.md), [merged PR #5](https://github.com/jbbejena/openfodder/pull/5). Actual iPhone and M2 remain unpassed. |
| MOB-006 | M2 | done | MOB-004, MOB-005 | Codex / `mobile/touch-camera`, from `ec0497a` | `c0dc737` + `1384e4f`: [camera rules](TOUCH_CONTROLS.md), [local/hosted actual-engine emulation at DPR 1/2](test-runs/touch-camera.md), [merged PR #6](https://github.com/jbbejena/openfodder/pull/6). Actual iPhone remains not run. |
| MOB-007 | M2 | blocked | MOB-004 | Codex / `mobile/phone-layout`, from `15b5ff1` | `ecdf558`: [shell/control map](PHONE_LAYOUT.md), [local/public layout and regression evidence](test-runs/phone-layout.md), [merged PR #7](https://github.com/jbbejena/openfodder/pull/7). Implementation complete; actual iPhone landscape/cutout/browser-bar acceptance NOT RUN |
| MOB-008 | M2 | blocked | MOB-005, MOB-006, MOB-007 | Codex / `mobile/mission-flow`, from `7e6b537` | `7ec50c3`: [flow/API semantics](MISSION_FLOW.md), [local/public actual-engine checks](test-runs/mission-flow.md), [branch PR](https://github.com/jbbejena/openfodder/pulls?q=is%3Apr+head%3Amobile%2Fmission-flow). Implementation and emulated touch defeat/retry/abort/menu passed; actual iPhone mission flow and inherited MOB-007 device acceptance NOT RUN |
| MOB-009 | M3 | pending | MOB-002, MOB-008 | Unclaimed | Next implementation candidate: audit/round-trip supported mission-boundary saves, then browser persistence. Phone gates remain unpassed; independent work requires active user scope |
| MOB-010 | M3 | pending | MOB-004, MOB-008 | Unclaimed | — |
| MOB-011 | M3 | pending | MOB-008, MOB-010 | Unclaimed | — |
| MOB-012 | M4 | pending | MOB-003, MOB-008, MOB-009, MOB-010, MOB-011 | Unclaimed | — |
| MOB-013 | M4 | pending | MOB-012 | Unclaimed | — |
| MOB-014 | M5 | deferred | MOB-013 | Unclaimed | — |
| MOB-015 | M5 | deferred | MOB-014 | Unclaimed | — |
| MOB-016 | M5 | deferred | MOB-015 | Unclaimed | — |
| MOB-017 | M5 | deferred | MOB-015, MOB-016 | Unclaimed | — |
| MOB-018 | M5 | deferred | MOB-016, MOB-017 | Unclaimed | — |
| MOB-019 | M6 | deferred | MOB-018 | Unclaimed | — |
| MOB-020 | M6 | deferred | MOB-019 | Unclaimed | — |

## Completion record for each task

Append a concise record near its task card or link a versioned test/handoff record: task ID, branch, starting/final revision, delivered behavior, actual checks and results, device/build/content identities, artifact/preview, remaining limitations, blockers and next task.

Do not populate evidence with planned commands, a test template, upstream behavior or results from an unrelated build. Proposed new files are created by the implementation task, not by this plan.

## Phase 1 completion record

- Start: `6b85186`; baseline `0434d1e`; reproducible engine/shell `570be27`; focused CI `291de61`. [PR #1](https://github.com/jbbejena/openfodder/pull/1) included the roadmap plus these changes; the user merged it as `f27963c`.
- MOB-001: recursive revisions verified, smallest suitable startup campaign inventoried, forced cheats/audio exclusions recorded, redistribution blocker explicit in [BUILD_BASELINE.md](BUILD_BASELINE.md).
- MOB-002: pinned command built clean/incremental; desktop menu/map screenshots reviewed; defaults/error checks passed. [BUILD.md](BUILD.md) and [test record](test-runs/phase-1.md) contain commands, sizes, timings and exact device/build identity.
- MOB-003: cached web workflow, native path filters, [engine artifact](https://github.com/jbbejena/openfodder/actions/runs/40757426969/artifacts/12846461740), and [standalone owner-private preview](https://openfodder-phase-one.zanysky263.chatgpt.site) delivered. Actual iPhone Safari map load remains **not run** (no hardware), so this card is not marked done. No demo/campaign files uploaded; local player-pack route verified on desktop.
- MOB-003 CI follow-up requested by the user at `e615cfb`: cancel unnecessary Windows runs and gate the Windows matrix using native-input comparisons. Seven fixture tests and the actual Phase 1 diff classify correctly; shared/native changes retain Windows coverage. See [the current handoff](../../AGENT_HANDOFF.md#ci-follow-up-skip-unnecessary-windows-builds).
- MOB-003 phone-only testing follow-up: `web/iphone-file-import` starts from merged master `f27963c`; commits `c666734`/`b9abafb` add direct loading from the pinned existing upstream host, plus local-file fallback. [Draft PR #2](https://github.com/jbbejena/openfodder/pull/2) remains unmerged. Sites version 3 visibly serves `b9abafba0601`; hosted desktop menu/map and [web CI](https://github.com/jbbejena/openfodder/actions/runs/40767915225) passed. No game assets mirrored/uploaded; no generated pack/computer required. Actual Safari remains not run. [Record](test-runs/phone-file-import.md).
- Next Phase 1 check: B05 using the exact [phone steps](BUILD.md#actual-iphone-safari-checkpoint--not-run). M1 stays unpassed. No full mission, persistence, touch combat, force/tactical or H Hour change was implemented.
- User-requested access follow-up: preview changed from owner-private to public (access revision 2), without rebuilding/redeploying version 3. Fresh anonymous Chromium passed the menu/map check; Safari no longer requires ChatGPT sign-in. Actual iPhone remains not run.

## Phase 2 start — MOB-004

The user authorized beginning the next phase. `mobile/command-bridge` preserves
the pending phone-preview work from `47e956d`; implementation `d755c60` adds the
engine command/state API, one coordinate boundary, explicit pause/cancel and an
opt-in browser harness. [PR #3](https://github.com/jbbejena/openfodder/pull/3)
included PR #2's changes; the user merged PR #2 as `a9a7476` and PR #3 as `2b28829`.

Six Node tests, the committed pinned build/artifact guard, actual-engine Chromium
at DPR 1/2, launcher regression, anonymous hosted menu/map/pause/cancel and Linux
native compilation passed. The zero-ammo baseline and a separate local in-memory
ammo fixture are distinguished in [the record](test-runs/command-bridge.md).
Public Sites version 4 serves `d755c600e2f2`; no game data was uploaded. Windows
compilation was still pending when recorded; follow latest PR checks. MOB-005 and
MOB-007 are ready. Touch gestures/combat UI and full mission flow remain unfinished;
M1/M2 and actual iPhone Safari remain unpassed.

CI correction after user merges: `ci/windows-web-guards` starts from `2b28829`.
The original shared-file check overclassified Emscripten-only C++ edits, so both
PR runs and the master run were cancelled (`40775648016`, `40777099594`,
`40778617067`). Twelve git-fixture tests and the actual Phase 2/merge comparisons
pass with native-visible C++ classification; genuine native changes retain the
matrix. Windows concurrency now cancels superseded runs. Engine/preview unchanged;
see [the current handoff](../../AGENT_HANDOFF.md#windows-ci-correction).

## MOB-001: Record the build and content baseline

- Milestone: **M1**.
- Prerequisites: None; first implementation task.
- Suggested branch: `build/mobile-baseline`.
- Likely scope: `CMakeLists.txt; Projects/emscripten/; .gitmodules; Run (submodule); Source/Start_Emscripten.cpp`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Audit a recursive checkout at the recorded engine commit. Record the exact data and Scripts submodule commits, compiler/SDL requirements, startup paths, available test campaigns, and content provenance. Separate source-code permissions from permissions for each shipped data pack. Capture a concise reproducibility report in docs/mobile/BUILD_BASELINE.md; distinguish measured behavior from source inspection.

**Deliverable:** A baseline report with exact revisions, content inventory, setup commands or precise blockers, and a selected small test campaign.

**Acceptance checks:**

- Revisions come from git/submodule state, not the latest upstream branches.
- The report identifies which test data can be included in each build or supplied locally; missing redistribution terms do not become an assumed license.
- Record the current web startup's forced cheat flag and audio exclusions without claiming that either has been fixed.

## MOB-002: Build the fork for the web reproducibly

- Milestone: **M1**.
- Prerequisites: MOB-001.
- Suggested branch: `build/reproducible-web`.
- Likely scope: `CMakeLists.txt; Projects/emscripten/; proposed scripts/build-web.*; proposed web/ bootstrap`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Create one documented build command using a tested, pinned Emscripten toolchain. Initialize the recorded submodule revisions recursively. Package only the selected test content; keep compiler output outside source control. Use the existing C++/SDL engine and web entry point. Record the resolved SDL port version rather than assuming the native Windows dependency pin controls the web build. Disable normal-play cheats explicitly while retaining an opt-in diagnostic path.

**Deliverable:** A repeatable HTML/JavaScript/WebAssembly/data build and docs/mobile/BUILD.md with actual commands.

**Acceptance checks:**

- A clean build and an incremental rebuild produce a bootable artifact from the same revisions.
- A browser reaches the campaign menu and loads the selected map without a fatal error.
- Build identity and engine/data/toolchain versions are visible in a diagnostic surface; normal gameplay does not silently enable cheats.
- Record artifact size, first-load time and renderer status; do not call a local compiler success an iPhone pass.

## MOB-003: Provide a stable preview and focused web CI

- Milestone: **M1**.
- Prerequisites: MOB-002.
- Suggested branch: `build/mobile-preview`.
- Likely scope: `.github/workflows/; proposed web/; docs/mobile/BUILD.md`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Add a cached, version-pinned web build with manual dispatch and relevant-path triggers. Prevent duplicate push/PR builds for the same change. Keep docs-only changes out of native compilation through reviewed path filters rather than relying on skipped checks for required validation. Publish a standalone preview through an available, authorized hosting route, with correct asset paths/MIME types and a visible build identifier. Determine how preview data reaches the browser before uploading any data pack.

**Deliverable:** A downloadable artifact, one browser preview URL, and a documented minimal CI path.

**Acceptance checks:**

- The URL serves the fork's recorded commit, not the upstream demo.
- Desktop browser smoke checks and an actual iPhone Safari map-load result are recorded separately.
- Changing only these roadmap documents does not start the native build matrix after filters are implemented.
- Missing hosting access is recorded as a hosting blocker; do not describe an artifact download as a deployed preview.

## MOB-004: Introduce a narrow browser-to-engine command boundary

- Milestone: **M2**.
- Prerequisites: MOB-002.
- Suggested branch: `mobile/command-bridge`.
- Likely scope: `Source/Start_Emscripten.cpp; Source/Event.*; Source/Window.*; Source/Mouse.cpp; Source/Squad.cpp; proposed web/ input bridge`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Expose only the actions and state needed by the mobile interface: select squad, move, start/stop fire, select secondary weapon, camera intent, explicit pause state, and cancel input. Apply commands at the existing engine input/update boundary. Define coordinate conversion once, including letterboxing, camera offsets, device-pixel ratio, and resize. The engine remains authoritative for selected squad, ammo, pause, combat and outcomes. Preserve desktop mouse/keyboard controls.

**Deliverable:** A documented action/state contract and a small exported engine adapter with a browser harness.

**Acceptance checks:**

- Each action has defined valid, invalid, paused and uninitialized behavior.
- Cancel clears held inputs; setting pause twice does not resume the game.
- The same target is reached before/after camera pan, canvas resize and device-pixel-ratio changes.
- Use focused behavioral checks at this boundary; avoid assertions that merely mirror function names.

## MOB-005: Implement squad selection and touch combat commands

- Milestone: **M2**.
- Prerequisites: MOB-004.
- Suggested branch: `mobile/touch-commands`.
- Likely scope: `proposed web/ touch controller and HUD; engine bridge from MOB-004`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Implement visible squad buttons and explicit Move, Fire, Grenade/Rocket modes. Tap a destination in Move mode; hold an aiming point in Fire mode; secondary weapons use deliberate targeting. Track pointer identity and ownership so HUD touches cannot issue world commands, synthetic mouse events cannot duplicate touch commands, and pointer cancellation releases fire. Keep firing behavior consistent with the original combat model.

**Deliverable:** A playable touch command loop with clear mode and squad feedback.

**Acceptance checks:**

- Select each available squad, move it, fire, switch weapon, and cancel the action without a keyboard.
- A HUD tap never moves or fires the squad; a single intended action is delivered once.
- Dragging outside the canvas, lifting a finger, cancelling a gesture and switching modes cannot leave firing held.
- A second finger cannot overwrite the active aim pointer or emit an accidental move.

## MOB-006: Make camera movement safe on touch

- Milestone: **M2**.
- Prerequisites: MOB-004, MOB-005.
- Suggested branch: `mobile/touch-camera`.
- Likely scope: `Source/Camera.cpp; Source/Mouse.cpp where needed; proposed web/ gesture controller`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Prototype two-finger pan against the existing camera behavior, with a dedicated Pan mode as a fallback if simultaneous touch ownership is unreliable. Establish movement thresholds and gesture transitions before committing a ground command. Add a re-center action if needed for squad recovery. Retain usable controls on devices without pointer lock; zoom is optional after pan is proven.

**Deliverable:** A documented camera gesture and a working implementation that preserves command accuracy.

**Acceptance checks:**

- Pan without moving or firing the selected squad.
- Add and remove the second finger during an interaction without producing a stray command.
- Targets remain correct after panning and re-centering.
- Record the chosen gesture and any rejected prototype in brief decision notes only if they explain a remaining tradeoff.

## MOB-007: Build the landscape phone shell and readable HUD

- Milestone: **M2**.
- Prerequisites: MOB-004.
- Suggested branch: `mobile/phone-layout`.
- Likely scope: `proposed web/ HTML/CSS/DOM HUD; Source/Window.cpp or scaling bridge if required`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Replace the generic Emscripten shell with a landscape-first play screen. Use DOM for touch controls, menus and readable text while retaining the engine canvas for combat. Account for safe areas, dynamic browser bars and letterboxing. Provide clear portrait guidance without depending on an orientation lock. Keep the center of the battlefield open; use a compact squad selector and contextual action controls rather than permanent large panels.

**Deliverable:** A responsive mobile shell with an explicit control map and a small loading/error surface.

**Acceptance checks:**

- Essential touch targets are approximately 44 CSS pixels or larger and remain reachable around screen cutouts.
- The actual iPhone landscape screen and a narrow desktop window show readable controls with an unobstructed playfield.
- Rotation and browser-bar changes recalculate canvas/control bounds correctly.
- Touch scrolling/selection is controlled within the play surface while menus remain usable.

## MOB-008: Complete menus and the mission loop without a keyboard

- Milestone: **M2**.
- Prerequisites: MOB-005, MOB-006, MOB-007.
- Suggested branch: `mobile/mission-flow`.
- Likely scope: `Source/Start_Emscripten.cpp; Source/CampaignSelect.cpp; Source/Briefing.cpp; proposed web/ menu layer`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Make startup, campaign/mission selection, start, pause, resume, retry, abort and return-to-menu reachable through touch. Show objectives and relevant squad state without hiding essential action behind desktop hotkeys. Surface mission victory/defeat from engine state. Provide concise controls help and disable unsupported actions visibly. Keep abort and loss distinct from successful completion.

**Deliverable:** A complete touch-only mission flow with clear success, failure and exit states.

**Acceptance checks:**

- Start and finish or lose the selected mission using touch only, then retry or return to the menu.
- Opening help/menu pauses or gates combat input consistently.
- Aborting does not produce a victory/result record.
- Browser back/reload behavior is documented; the UI does not promise an unsupported recovery checkpoint.

## MOB-009: Persist supported checkpoints in the browser

- Milestone: **M3**.
- Prerequisites: MOB-002, MOB-008.
- Suggested branch: `mobile/browser-saves`.
- Likely scope: `Source/GameData.cpp/.hpp; Source/ResourceMan.cpp; browser startup/storage layer; proposed save schema documentation`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Audit exactly what native serialization restores before adding a browser save UI. Begin with supported mission-boundary checkpoints; current source serializes campaign/mission/recruit data, not a complete live battlefield. Mount persistent storage at the real save path, load it before save discovery, and persist completed writes explicitly. Use a versioned wrapper with build/content compatibility metadata and a last-known-good checkpoint. Provide export/import as a recovery mechanism if practical.

**Deliverable:** Documented checkpoint semantics, a persistence implementation, and clear storage-error feedback.

**Acceptance checks:**

- Save at the supported boundary, close/reopen the page and restore the expected mission and surviving recruits.
- A reload does not turn a partial/in-memory write into a claimed saved checkpoint.
- Test denied/unavailable storage, malformed saves and incompatible data versions without silently destroying a valid save.
- Do not claim mid-battle or phase-exact resume unless its state has actually been serialized and round-tripped.

## MOB-010: Handle backgrounding and input/audio lifecycle

- Milestone: **M3**.
- Prerequisites: MOB-004, MOB-008.
- Suggested branch: `mobile/browser-lifecycle`.
- Likely scope: `browser visibility/focus handlers; engine pause/input bridge; Source/Amiga/Sound_Amiga.cpp and web audio path as needed`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Pause or safely suspend combat on visibility loss, page interruptions and focus loss; clear held inputs. Track user pause separately from lifecycle pause. Resume without a large elapsed-time catch-up or unintended unpause. Start/resume supported audio through user interaction and document any web audio limitations already present in the selected content/platform. Treat unload-time saving as a best-effort supplement, not the only persistence mechanism.

**Deliverable:** An explicit lifecycle state policy and visible recovery/resume behavior.

**Acceptance checks:**

- Background while firing; return with firing released and no hidden combat advance/catch-up burst.
- A manually paused game stays paused after leaving and returning.
- Rotate or interrupt audio without duplicate loops, stuck controls or fatal errors.
- Record Safari and Home Screen launch results separately when the latter is tested.

## MOB-011: Measure and address phone performance

- Milestone: **M3**.
- Prerequisites: MOB-008, MOB-010.
- Suggested branch: `mobile/performance`.
- Likely scope: `web diagnostics; render/scaling settings; CMakeLists.txt release flags only when justified; targeted hot paths`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Measure cold/warm load, frame pacing, memory and responsiveness using the selected mission and recorded device. Target responsive play at a sustained 30 rendered frames/second or better during ordinary combat where feasible; preserve the original simulation rate. Reduce unnecessary content, render scale and excessive device-pixel-ratio work before changing gameplay. Keep diagnostics collapsible and record the tested build.

**Deliverable:** A small measured performance report and only fixes supported by those measurements.

**Acceptance checks:**

- Record at least a ten-minute on-device session or the full selected mission if longer.
- Simulation speed and weapon behavior do not depend on display refresh rate or a frame cap.
- The target is measured or explicitly reported unmet; a cloud renderer failure is not an iPhone performance result.
- No repeated mission restarts cause unbounded growth or duplicate event/audio handlers in the observed session.

## MOB-012: Run the complete mobile acceptance pass

- Milestone: **M4**.
- Prerequisites: MOB-003, MOB-008, MOB-009, MOB-010, MOB-011.
- Suggested branch: `qa/mobile-acceptance`.
- Likely scope: `docs/mobile/PLAYTEST.md; proposed docs/mobile/test-runs/; fixes limited to reproduced acceptance failures`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Execute the playtest checklist against one exact preview build. Pair browser smoke checks with a real iPhone Safari touch session. Complete a mission, test failure/retry, persist a supported checkpoint, reopen it, and exercise interruption scenarios. Record device/browser/build identifiers, evidence, blocked items and remaining issues. Fix concrete failures in focused changes rather than expanding combat scope.

**Deliverable:** An acceptance record with explicit pass/fail/blocked results and a prioritized issue list.

**Acceptance checks:**

- Every required checklist row has evidence or a named blocker; no unperformed test is marked passed.
- Phone touch tests use real touch input, not desktop mouse events described as phone testing.
- Mission-end, save/reopen and lifecycle results agree with engine state.
- The first mobile release has no unresolved blocker preventing the core touch-only mission loop.

## MOB-013: Establish the standalone mobile baseline

- Milestone: **M4**.
- Prerequisites: MOB-012.
- Suggested branch: `release/mobile-baseline`.
- Likely scope: `README.md; docs/mobile/BUILD.md; AGENT_HANDOFF.md; approved artifact/hosting configuration`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Record the exact accepted build, preview URL, supported content/device scope and remaining limitations. Provide build/source/notices information appropriate to the distributed engine and data. Prepare a stable mobile baseline commit or release candidate so integration and later combat changes have a rollback point. Create tags/releases or promote hosting only when included in the active user authorization.

**Deliverable:** A reproducible standalone mobile baseline with linked verification and recovery instructions.

**Acceptance checks:**

- A new agent can locate the source revision, matching content, build command and test evidence.
- Mobile completion is backed by MOB-012, not inferred from a green native CI badge.
- The baseline can be rebuilt and the previous working artifact can be restored.
- Update the task ledger and handoff before starting integration work.

## MOB-014: Evaluate fitness for H Hour

- Milestone: **M5**.
- Prerequisites: MOB-013.
- Suggested branch: `design/h-hour-fit`.
- Likely scope: `docs/mobile/ROADMAP.md; proposed docs/mobile/H_HOUR_FIT.md`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Assess the played mobile build against the intended H Hour command experience. Record the existing nine-soldier/three-squad limit, available orders, save fidelity and verified combat mechanics. Separate the work required for a mission/story connection from possible suppression, cover, wounds or platoon expansion. If the combat experience is unsuitable, recommend a bounded experiment or an alternative before building a costly application connection.

**Deliverable:** A fit report with evidence, concrete limitations and the recommended integration scope.

**Acceptance checks:**

- Claims about shooting over cover, suppression and morale are supported by observed/code-verified mechanics, or explicitly marked unverified.
- The mobile baseline remains available independently of this decision.
- The report gives a specific next task and does not treat the roadmap as authorization for new combat systems.

## MOB-015: Specify a versioned mission/result contract

- Milestone: **M5**.
- Prerequisites: MOB-014.
- Suggested branch: `design/mission-contract`.
- Likely scope: `proposed docs/integration/; proposed schemas/ and fixtures/ (locations to be finalized in the task)`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Define a minimal contract before application coupling: schema version, mission/session ID, supported map/content ID, roster IDs mapped to engine recruit IDs, objectives, permitted difficulty/settings and limits. Results include explicit completed/lost/aborted state, each deployed soldier's supported outcome, objective state and simulation elapsed time. Describe unsupported fields, unknown outcomes, restart behavior, stable mappings, errors and duplicate-delivery handling. Distinguish player pause/wall-clock time from simulation time.

**Deliverable:** Reviewed schema documentation, one valid mission/result example and representative invalid cases.

**Acceptance checks:**

- A missing soldier is not silently interpreted as killed; only engine-supported outcomes are encoded.
- Native numeric recruit IDs do not replace application soldier IDs without an explicit stable mapping.
- No API keys, private application data or original commercial assets enter the public fixtures.
- A repeated or mismatched session/result has defined behavior.

## MOB-016: Load a validated mission through the engine adapter

- Milestone: **M5**.
- Prerequisites: MOB-015.
- Suggested branch: `integration/mission-input`.
- Likely scope: `engine browser adapter; Source/Campaign.cpp; Source/GameData.cpp; schemas/fixtures defined by MOB-015`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Validate mission input and create/load a supported scenario with the requested roster mapping and objectives. Use a whitelist of known content IDs and bounds for all counts/settings. Reject unsupported platoon sizes or arbitrary map/script execution rather than silently dropping units. Keep the standalone menu launch path working and normal-play cheats disabled.

**Deliverable:** A standalone harness that starts a fixture mission with the exact intended roster.

**Acceptance checks:**

- Valid input produces the expected map, soldiers and objective state.
- Malformed/unsupported input fails clearly without corrupting a save or leaving a half-started battle.
- Restarting a session resets its transient state while preserving the specified identity semantics.
- Input changes scenario configuration through supported engine code, not through AI-generated executable scripts.

## MOB-017: Export authoritative mission outcomes

- Milestone: **M5**.
- Prerequisites: MOB-015, MOB-016.
- Suggested branch: `integration/mission-results`.
- Likely scope: `engine mission-end/death/objective hooks; Source/GameData.cpp; Source/Start_Emscripten.cpp; result adapter`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Capture outcomes at the engine events that know them, including deaths before native recruit IDs are cleared/reassigned. Preserve the session roster mapping until result finalization. Emit a validated final result once for completion, loss or abort; retain it for delivery/retry without running the battle again. Export ammunition or wounds only after the model and accuracy have been established; otherwise mark them unsupported.

**Deliverable:** Result export plus reproducible fixture runs for success, loss, casualty and abort.

**Acceptance checks:**

- The exported roster and casualties match observed engine events and the incoming roster IDs.
- Abort is distinct from victory, defeat, disconnection and an unfinished session.
- Repeated result delivery retains the same result identity and values.
- Native post-mission troop sorting/recruit replacement does not reassign a casualty to a different application soldier.

## MOB-018: Exercise the contract in a standalone integration harness

- Milestone: **M5**.
- Prerequisites: MOB-016, MOB-017.
- Suggested branch: `integration/standalone-harness`.
- Likely scope: `proposed web/ integration harness; schema/fixture tests; docs/integration/`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Demonstrate loading a fixture mission and receiving its result without changing the H Hour application. Choose direct module calls or an iframe message boundary based on the tested runtime; document it. Validate message type, version, origin and source when crossing frames. Include readiness/error/timeout/reload paths and a result acknowledgement/retry strategy.

**Deliverable:** A working harness and documented transport choice with meaningful contract tests.

**Acceptance checks:**

- A mission → battle → final result cycle works using fixtures.
- Unexpected frame sources, invalid origins and malformed messages are rejected if messaging is used.
- Reload/retry cannot manufacture victory, duplicate finalization or erase an unacknowledged result.
- The standalone mobile launch remains functional.

## MOB-019: Connect one H Hour mission

- Milestone: **M6**.
- Prerequisites: MOB-018.
- Suggested branch: `integration/h-hour-one-mission`.
- Likely scope: `this repository's supported combat adapter; separate H Hour repository only within the active user task`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Inspect current H Hour instructions and current application code before editing that repository. Connect one supported mission with its real soldier IDs and objectives. Keep AI story generation outside the combat engine; validate AI-selected scenario settings against the contract. Persist final outcomes once using mission/session/result identity, and expose retryable delivery errors. Keep secrets and story-provider credentials on the application's existing server boundary.

**Deliverable:** One playable H Hour mission using the accepted mobile combat build.

**Acceptance checks:**

- The real incoming roster matches the soldiers in battle and the returned outcomes.
- The application applies casualties/objectives once across retries and reloads.
- Story text is generated from accepted engine results; it cannot overwrite those results.
- Changes in both repositories identify compatible versions and their deployment/build dependencies.

## MOB-020: Verify the story-to-combat round trip

- Milestone: **M6**.
- Prerequisites: MOB-019.
- Suggested branch: `qa/h-hour-round-trip`.
- Likely scope: `integration test fixtures/harness; both repositories' handoff/test documentation within task scope`. These are investigation breadcrumbs, not permission to rewrite every listed file.

Run the complete story → mission launch → mobile battle → results → next story loop. Test victory, defeat, abort, invalid input, interrupted delivery, duplicate results and reopening the application. Verify that mobile saves and application session state do not conflict. Record the compatible build pair, actual phone evidence, remaining limits and recovery steps.

**Deliverable:** An end-to-end acceptance report and a stable integrated candidate.

**Acceptance checks:**

- All outcome paths preserve soldier identity and exactly-once application updates.
- Interruption recovery is documented and tested at the supported checkpoint boundaries.
- The next story agrees with recorded combat outcomes and unsupported mechanics remain explicit.
- A standalone combat rollback and an application rollback path are documented.

