# Current handoff

Updated: 2026-10-28

## Goal

Make Open Fodder playable as a standalone, landscape-first iPhone Safari game, then connect a limited mission/result interface to H Hour. Start with the existing combat model and force size.

## Repository and branch

- Repository: [jbbejena/openfodder](https://github.com/jbbejena/openfodder).
- Planning branch: `docs/mobile-browser-roadmap`.
- Inspected default branch: `master`.
- Planning base commit: `4312ff7c1abe3b6750483921893651d9d3c55b33`.
- This branch contains planning documentation and a README entry point only.
- Until these documents are merged or intentionally carried to another base, implementation branches should include this planning branch's current tip.

## Completed in this handoff

- [x] Inspected the fork's current source tree, web entry point, build configuration, submodule references and native workflow triggers.
- [x] Added root agent instructions, a six-milestone roadmap, twenty scoped task specifications, and a mobile acceptance checklist.
- [x] Recorded important unknowns and separated proposed work from verified behavior.

## Not implemented or verified by this work

- No mobile controls, gameplay modifications, web build workflow, hosting configuration or H Hour application changes.
- No fork build, deployed preview, completed battle, browser-save round trip or actual iPhone test.
- No roadmap implementation task is done; documentation completion does not satisfy MOB-001.
- No change to `master` or upstream repositories.

## Immediate next task

**MOB-001 — Record the build and content baseline.** Status: ready; unclaimed.

Read [AGENTS.md](AGENTS.md), [ROADMAP.md](docs/mobile/ROADMAP.md), [TASKS.md](docs/mobile/TASKS.md), and [PLAYTEST.md](docs/mobile/PLAYTEST.md). Work within the active user's implementation authorization.

The next agent should inspect a recursive checkout, verify the engine/data/Scripts revisions below, identify the smallest appropriate test campaign and its provenance, and write `docs/mobile/BUILD_BASELINE.md`. Then proceed to MOB-002 when its dependencies are satisfied and the current task scope includes it.

## Source observations to verify before implementation

- Engine baseline: `4312ff7c1abe3b6750483921893651d9d3c55b33`.
- `Run` points to `OpenFodder/data` at `070a6086c62164e859fc3274b75b5f536fa9d902`.
- That data revision points to Scripts at `dad04730860bcdd1189aa8562860e379b0f5d783`. Use the recorded submodule chain, not unrelated latest heads.
- `Projects/emscripten/build_emscripten.cmd` uses a Windows/Docker helper and an unpinned `emscripten/emsdk:latest` image.
- `CMakeLists.txt` has an Emscripten build path with SDL3, memory growth, preloaded `Run` data and web-specific audio exclusions. This is evidence of a build path, not a successful reproduction.
- `Source/Start_Emscripten.cpp` currently forces cheats enabled and uses alternative mouse input. Normal-play cheat behavior needs an explicit implementation task.
- `Source/Window.cpp` translates basic finger events to mouse events. Full touch combat, multiple pointers, camera gestures and Safari behavior remain unverified.
- `Source/GameData.hpp` allocates nine mission troops. Squad control in the inspected source uses three player squads.
- `Source/GameData.cpp` serializes campaign/mission/recruit data. Its restore path is not a demonstrated complete live-battle snapshot; supported checkpoint semantics must be established.
- Both existing native workflows trigger on pushes and pull requests without relevant-path filtering. Browser CI is not yet present.
- An earlier upstream-demo attempt in a cloud browser failed to create a WebGL renderer. That is not a fork-build failure or evidence that an iPhone cannot run it.

## Current gate status

| Gate | Status | Evidence |
| --- | --- | --- |
| M1: reproducible fork preview and phone map load | Not run | No fork artifact/preview yet |
| M2: complete touch-only mission controls | Not run | No input/UI implementation |
| M3: persistence, lifecycle and measured performance | Not run | No browser/device evidence |
| M4: standalone mobile baseline | Not run | Depends on M1–M3 acceptance |
| M5: fit assessment and standalone mission/result harness | Deferred | After the mobile baseline |
| M6: H Hour story/combat round trip | Deferred | After the harness |

## Future agent handoff template

- Task ID / status:
- Starting revision and working branch:
- Final commit / PR:
- Player-visible behavior:
- Files changed:
- Build/test commands and actual results:
- Preview/artifact URL and build identity:
- Device, OS/browser, viewport/orientation, input method:
- Source-inspected / automated / emulated / real-device evidence:
- Save/checkpoint and content versions used:
- Known failures, unperformed checks and precise blockers:
- Next task and remaining dependencies:
