# Codex agent instructions

## Purpose and current scope

This fork is being prepared for a standalone, landscape-first mobile-browser version of Open Fodder. The first product target is a complete touch-only mission on iPhone Safari with a supported persistent checkpoint. H Hour integration follows a verified mobile baseline.

The engine remains C++/SDL compiled with Emscripten. Keep combat, simulation timing, soldiers, objectives and outcomes authoritative in the engine. Use a small browser interface and explicit engine adapter for controls and readable UI. This is an existing-engine port, not a Phaser or other engine rewrite.

The roadmap began as planning documents only. Phase 1 has a pinned build, public preview and [desktop menu/map evidence](docs/mobile/test-runs/phase-1.md). Phase 2's [command foundation](docs/mobile/test-runs/command-bridge.md), [touch modes](docs/mobile/test-runs/touch-commands.md), [camera](docs/mobile/test-runs/touch-camera.md), [phone shell](docs/mobile/test-runs/phone-layout.md) and [mission flow](docs/mobile/test-runs/mission-flow.md) (MOB-004–008) are implemented with desktop/emulation evidence. The unmodified first mission was played to defeat through emulated touch; wins/continuation were checked with local-only goal fixtures. Actual iPhone layout/mission acceptance remains blocked/unrun, so M1/B05 and M2 remain unpassed. Browser persistence and H Hour remain unimplemented. The active user request determines which work is authorized.

## Read first

1. [Current handoff](AGENT_HANDOFF.md).
2. [Mobile roadmap and decisions](docs/mobile/ROADMAP.md).
3. [Task ledger and task specifications](docs/mobile/TASKS.md).
4. [Playtest requirements](docs/mobile/PLAYTEST.md).
5. Existing [build instructions](COMPILING.md), [installation/data instructions](INSTALL.md), and the source files relevant to the selected task.

Inspect the actual current branch and upstream changes before relying on the handoff's snapshot. Instructions from the active user take precedence over repository guidance. Do not request confirmation again for an action already authorized in the session.

## Start and finish a bounded task

- Select the earliest dependency-ready task within the user-authorized scope; one task per implementation branch is the default.
- Record its ID, starting revision, branch, scope and claim in the handoff/task ledger. Proposed branch names in TASKS.md are suggestions, not evidence that those branches exist.
- Read the source before changing it. Confirm the working tree and preserve unrelated user work. Use an isolated checkout/worktree when needed.
- While the planning documents exist only on `docs/mobile-browser-roadmap`, start implementation from that branch's current tip, or carry this documentation commit onto the base explicitly chosen for the task. Do not assume these files already exist on `master`.
- Finish the task's deliverables and appropriate checks. Update its status, evidence, remaining issues and exact next task. A dependency is complete only when its acceptance evidence exists.
- Missing hardware, data or hosting can block a particular verification. Record the precise blocker, continue independent authorized work when useful, and leave the affected gate unpassed.
- Do not spawn or coordinate additional agents unless the active user request or other applicable instructions explicitly permit delegation. This roadmap alone is not a delegation request.

Respect the user's existing authorization for branch updates, drafts, merges, releases and hosting. Do not force-push, overwrite another agent's work, merge, publish a release or change production merely because the roadmap lists that future step.

## Engineering boundaries

- Preserve original game behavior during the mobile pass: nine deployed soldiers and three controllable squads at the inspected baseline. Larger forces and tactical-system changes need their own scoped task.
- Keep browser input mapping in one layer. Distinguish Move, Fire, secondary-weapon targeting, camera gestures, HUD interaction, menu input and pause states.
- Use explicit start/stop/cancel and explicit pause state. Release held input on cancellation, focus loss, backgrounding and mode changes.
- Calculate coordinates at a documented boundary and test letterboxing, camera offset, resize and device-pixel ratio. Prevent duplicate touch/synthetic-mouse commands.
- Keep DOM HUD state derived from engine state. Browser UI and later AI must not invent casualties, ammo, victory, wounds or cover behavior.
- Preserve native controls and supported native builds. Prefer additive web-specific adapters over a broad engine refactor.
- Pin tested engine/data/Scripts/toolchain revisions. Do not substitute upstream `latest` for a known working dependency without a focused reason and verification.
- Generated build output and downloaded game data do not belong in source commits. Keep data/asset provenance separate from the engine's license.
- Do not commit retail game content or claim that a bundled demo is freely licensed for all uses. Resolve distribution terms for the exact files being published; continue source work with appropriate local/synthetic fixtures when distribution is unresolved.
- Later mission input is validated data through supported engine APIs, not AI-generated executable scripts. Keep application/provider secrets outside the browser and this public repository.

## Validation and CI economy

- Run focused checks appropriate to changed behavior. Documentation-only edits need link/content/diff validation, not a native compiler matrix.
- For implementation, run the relevant web build and focused input/save/contract checks. Compile affected shared/native paths when a shared C++ change could break them.
- Browser emulation and mouse-driven automation supplement real-device testing. They do not establish real iPhone touch behavior.
- Record the exact preview/build and distinguish source inspection, automated smoke checks, emulation, and real-device results.
- Native green badges, successful compilation, upstream-demo behavior and cloud-renderer failures are not mobile acceptance evidence for this fork.
- Inspect a CI failure before retrying. Cache pinned dependencies, use relevant-path triggers, and avoid duplicate native/web builds. Do not disable required checks or bypass protections to save time.
- The existing runtime checks require appropriate data. A missing fixture is a blocker to that check, not an automatic test pass.

## Required handoff

Include task ID/status, branch and commit, files changed, actual commands/results, tested device/browser/build, preview or artifact URL, known limitations, blockers, and the next dependency-ready task. State explicitly when an iPhone test or full mission has not been performed. Use the template in [AGENT_HANDOFF.md](AGENT_HANDOFF.md).

For a PR, lead with the player-visible problem and resulting behavior, then validation and material limits. Keep it specific to the final change.
