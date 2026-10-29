# Mobile browser roadmap

Status: Phase 1 desktop build/preview and Phase 2 command foundation, touch modes and camera (MOB-004–006) implemented; actual iPhone gate not run. Updated: 2026-10-29. See [Phase 1 evidence](test-runs/phase-1.md) and [MOB-004 verification](test-runs/command-bridge.md); [MOB-005 touch verification](test-runs/touch-commands.md) records emulated input. [MOB-006 camera evidence](test-runs/touch-camera.md) records local/public checks. Phone layout and mission flow remain planned.

This roadmap applies to the fork [jbbejena/openfodder](https://github.com/jbbejena/openfodder). Read the root [agent instructions](../../AGENTS.md), [current handoff](../../AGENT_HANDOFF.md), [task specifications](TASKS.md), and [playtest checklist](PLAYTEST.md) together. An implementation status requires evidence; a planned deliverable is not an existing feature.

## Product target

First ship a standalone game in which a player on iPhone Safari can start a mission, select squads, move, aim/fire, use available secondary weapons, pan the camera, pause, complete or lose the mission, and recover a supported saved checkpoint after reopening the page.

The initial target is landscape play with touch-only operation. Desktop controls remain usable for development and regression checks. A Home Screen/PWA path, broader device coverage and offline behavior can follow measured browser reliability; they are not assumed from a working Safari tab.

The later target is one H Hour story-to-combat-to-results cycle with stable soldier identities and authoritative engine outcomes. H Hour stays in a separate application repository. Do not add its private source, credentials or player data to this public fork.

## Fixed decisions for the first pass

- Retain the C++/SDL engine and compile the existing web path with Emscripten. Add a small HTML/CSS/JavaScript browser shell and explicit engine adapter. Do not rebuild the game in Phaser, Three.js or another engine.
- Preserve the original combat model, timing and the inspected nine-soldier/three-squad scope.
- Let the engine own combat state, selection, ammunition, deaths, objectives, mission outcome and simulation time. The browser owns physical input mapping, readable controls, loading feedback and browser persistence/lifecycle integration.
- Use tap-to-move and an explicit Fire mode with held aiming input. Secondary weapons require deliberate targeting. Two-finger pan begins in Move mode; explicit Pan mode provides a one-finger route. Fire/secondary second touches cancel without acquiring camera ownership. See the [gesture rules](TOUCH_CONTROLS.md).
- Keep the battlefield center clear. Use a compact squad selector, contextual actions and pause/help surfaces.
- Save only a verified checkpoint state. Begin with supported mission boundaries, not a promised live-battle snapshot.
- Establish a standalone mobile baseline before changing H Hour. Define narrow interfaces so this sequence does not require discarding the mobile work.
- Keep toolchain and data revisions reproducible; measure on a real phone. Timeline estimates remain provisional until the first build/device result.

## Current baseline and facts

The planning base is `4312ff7c1abe3b6750483921893651d9d3c55b33` on `master`, inspected 2026-10-28. The table below preserves those original source observations; [BUILD_BASELINE.md](BUILD_BASELINE.md), [BUILD.md](BUILD.md) and [the Phase 1 record](test-runs/phase-1.md) supersede its build/preview unknowns with measured evidence.

| Area | Inspected state | What remains to establish |
| --- | --- | --- |
| Engine/build | CMake has an Emscripten/SDL3 branch and preloads Run data | A clean, pinned build of this fork |
| Web startup | Separate `Source/Start_Emscripten.cpp`; cheats are forced on | Normal-play defaults and complete mobile flow |
| Build helper | Windows/Docker helper uses `emscripten/emsdk:latest` | Cross-environment repeatability with a tested pin |
| Content | Run/data and Scripts are nested submodules | Exact usable campaign files, provenance and publication terms |
| Input | Basic finger-to-mouse translation exists | Reliable fire, secondary weapons, pointer cancellation and camera gestures |
| Forces | Nine allocated mission soldiers; three controlled squads | No platoon expansion in this mobile pass |
| Campaign data | Recruit IDs, ranks and kills exist; JSON save functions exist | Browser persistence, checkpoint fidelity and stable application mapping |
| CI | Linux and Windows workflows trigger for every push/PR | Focused web CI, caching and economical path filters |
| Device evidence | No fork iPhone acceptance result | Actual Safari and, later, Home Screen testing |
| H Hour interface | No implemented mission/result bridge | Versioned schema, engine hooks, harness and application integration |

Read the source again if the baseline changes. Upstream website/demo versions, native status badges and default-branch names are not substitutes for the fork's actual tested revision.

## Milestones and gates

| Milestone | Tasks | Exit evidence |
| --- | --- | --- |
| M1 — Build and preview | MOB-001–003 | Exact dependency chain/artifact/preview and desktop smoke recorded; **real iPhone Safari map load not run** |
| M2 — Touch-playable mission flow | MOB-004–008 | Select/move/fire/weapons/camera/pause/menus work through touch without stray or stuck commands |
| M3 — Browser reliability | MOB-009–011 | A supported checkpoint survives reopening; interruption policy works; phone performance is measured |
| M4 — Standalone mobile baseline | MOB-012–013 | Full checklist with real-device evidence and a reproducible accepted candidate |
| M5 — H Hour fit and adapter harness | MOB-014–018 | Fit assessment, versioned contracts, validated mission input and authoritative result export demonstrated independently |
| M6 — One connected H Hour mission | MOB-019–020 | Story → mobile battle → accepted results → next story, with stable IDs and duplicate-safe application updates |

A failed or unavailable device check stays failed or blocked. Independent work can continue within the user's authorization, but it must not be used to mark that gate passed or call the release phone-ready. An unsuitable combat fit is a reason to reconsider the integration scope after M4.

## Architecture boundaries

### Engine and browser

Keep the first change narrow. The existing engine is not perfectly separated internally; do not require a large architectural rewrite before the first playable build.

The browser's command adapter maps physical inputs to engine actions. Export only required operations and read-only display state. Apply commands at an existing engine update/input boundary. Document whether each coordinate is canvas, viewport or map space and convert it once. Account for camera movement, scaling and letterboxing explicitly.

Track pointer IDs and ownership. A touch begins as HUD, aiming/movement, or camera intent and cannot silently become another action. Clear held inputs on pointer cancellation, focus loss, pause, menu changes and backgrounding. Avoid duplicated synthetic mouse events.

Use explicit pause reasons rather than repeated toggle commands. User pause, menu pause and background pause must not accidentally cancel one another. Returning to a foreground tab must not advance a large backlog of combat ticks.

### Browser saves

Native JSON serialization is a starting point, not proof of browser persistence or full checkpoint coverage. Audit the native restore path, save location and mission/phase semantics first.

Mount/load persistent storage before discovering save files. Acknowledge completed persistence, version it, retain a valid previous checkpoint, and expose storage errors. Do not rely solely on unload handlers. A recovery export is useful, but automatic cross-origin transfer of standalone saves into H Hour is not assumed.

### Later mission/result interface

Design this after the mobile baseline and fit assessment, then prove it in a local/standalone harness before application changes.

Input should be validated data with a schema version, mission/session identity, supported map/content identity, bounded settings, objectives and roster IDs mapped to engine recruit IDs. Reject unsupported counts and features explicitly.

Capture outcomes where the engine knows them. Soldier death events and mappings must survive native troop clearing, sorting and replacement. Results distinguish completion, loss, abort and unfinished sessions. Only export modeled, validated fields; missing records do not imply death and an AI must not infer wounds/ammo as engine facts.

Choose direct module calls or iframe messaging based on tested runtime behavior. For a message transport validate type, version, origin and source; include readiness, error, acknowledgement and retry states. The receiving application applies each mission/session/result once and returns acknowledgement. Do not combine standalone save recovery and application result application into an untested implicit behavior.

Keep story generation outside combat. The AI selects supported mission parameters and writes from accepted outcomes; it does not control the combat clock or rewrite results.

## Repository workflow

1. Read AGENTS.md and the current handoff. Inspect the real branch, submodules and working tree.
2. Take one dependency-ready task from TASKS.md within the active user request. Record the claim and branch.
3. Make the smallest coherent change and validate its behavior. Keep generated binaries/data out of source commits.
4. Provide a preview/artifact and focused testing instructions when the task changes browser behavior.
5. Update task status, evidence and the handoff. Name the next ready task and exact blockers.
6. Use a focused PR when the active workflow calls for one; do not merge or publish merely because a later milestone mentions release.

While these documents live only on `docs/mobile-browser-roadmap`, feature branches need its current tip or the equivalent documentation commit on their chosen base. Keep the upstream baseline traceable.

Use one cached web build with relevant-path triggers. Avoid running both push and PR builds for identical changes. Change native workflow filters carefully so shared C++ changes still receive appropriate native validation; documentation-only commits do not need a compiler matrix.

## Content and publication

Source-code and game-data permissions are separate. Record the provenance and terms of the exact data files in the proposed artifact/preview. The repository's GPL engine license does not automatically cover Cannon Fodder maps, art, audio or retail data.

An unresolved redistribution question blocks publishing those particular files, not all source work. Use appropriate fixtures, original/cleared test content or a deliberate user-supplied-data route as supported by the engine. Supply engine source/notices appropriate to the build being distributed. Private/noncommercial use does not itself establish a new asset license.

No asset conversion, original art generation, retail campaign redistribution or mobile map-editor port is included in the initial roadmap.

## Deferred combat and product scope

The following need separately scoped work after a played mobile baseline: platoon-scale forces, directional cover, taking cover and shooting over it, suppression, morale, richer wounds, expanded weapon models, new WWII art/maps, multiplayer, a mobile editor, full mid-battle snapshots and offline/PWA installation.

These are not acceptance criteria for the first mobile port and must not be reported as delivered by it. M5 must state which of them, if any, are necessary for a useful H Hour connection before estimating their work.

## Risks and responses

| Risk | Response / task |
| --- | --- |
| Latest SDK or mismatched nested submodules break the web build | Lock and record tested revisions in MOB-001/002 |
| Source builds but suitable data is absent or not cleared for a preview | Inventory exact content and choose a valid test-data route in MOB-001/003 |
| Touch duplicates mouse events, gestures issue commands, or fire stays held | Single command boundary and pointer ownership tests in MOB-004–006 |
| Native saves lose data on reload or restore the wrong phase | Audit checkpoint semantics and explicit persistence in MOB-009 |
| Backgrounding advances combat, resumes user-paused play or loses audio | Explicit lifecycle policy in MOB-010 |
| Cloud WebGL failure is misreported as a phone failure | Separate environment evidence and real-device records in MOB-011/012 |
| Arcade combat does not satisfy H Hour's tactical needs | Evaluate the played build before integration in MOB-014 |
| Cleared/sorted recruits or duplicate result delivery corrupt campaign soldiers | Snapshot roster mapping, event-based outcomes and idempotent application in MOB-015–020 |
| Source/API work expands before a mobile baseline exists | Task dependencies and milestone evidence in TASKS.md |

## Evidence and references

Code breadcrumbs: `CMakeLists.txt`; `Projects/emscripten/`; `.gitmodules`; `Source/Start_Emscripten.cpp`; `Source/Window.cpp`; `Source/Mouse.cpp`; `Source/Camera.cpp`; `Source/Squad.cpp`; `Source/GameData.cpp/.hpp`; `Source/Campaign.cpp/.hpp`; `Source/ResourceMan.cpp`; `Source/ScriptingEngine.cpp`.

- [Existing build instructions](../../COMPILING.md).
- [Existing data/installation instructions](../../INSTALL.md).
- [Engine license](../../COPYING) and other license notices at the repository root.
- [Emscripten file-system API and persistence](https://emscripten.org/docs/api_reference/Filesystem-API.html).
- [Emscripten C/C++ and JavaScript interfaces](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html).

Suggested future paths such as `web/`, `scripts/build-web.*`, schemas and test-run records do not exist merely because a task proposes them. Confirm their final locations during implementation.
