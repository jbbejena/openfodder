# Mobile acceptance checklist

Status: Phase 1 desktop results are recorded in [test-runs/phase-1.md](test-runs/phase-1.md). No actual iPhone Safari test has run. Later milestone rows remain untested.

Use this with [TASKS.md](TASKS.md), [ROADMAP.md](ROADMAP.md) and [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md). Keep results tied to one exact artifact and content set.

## Evidence rules

For each row use **pass**, **fail**, **blocked** or **not run**. Include an observed result and evidence/reference. Record build and device identity. Do not prefill passes from source inspection.

- Desktop mouse automation is useful for boot/menu and regression checks.
- Mobile viewport emulation is useful for layout/coordinate checks.
- Real iPhone Safari with touch input is required to establish phone readiness.
- Home Screen launch is a separate result; do not infer it from a Safari pass.
- An unavailable cloud WebGL renderer is an environment limitation, not a finding that the phone cannot render.
- Capture representative screenshots internally for canvas/UI review when tools permit; preserve or share screenshots only within the task's applicable instructions. Text results must still describe observed behavior.

## Run identity

- Date and tester:
- Task / branch / commit:
- Artifact/preview URL and visible build ID:
- Engine / data / Scripts / compiler versions:
- Campaign/map/checkpoint:
- Device and OS:
- Browser/version or Home Screen launch:
- CSS viewport, orientation and device-pixel ratio when available:
- Input method (real touch / mouse / emulated):
- Renderer, audio and storage mode:
- Summary, failures and precise blockers:

## M1: build and startup

| ID | Check | Initial status |
| --- | --- | --- |
| B01 | Clean pinned build produces HTML/JS/Wasm/data without missing dependencies | Pass — Phase 1 record |
| B02 | Incremental rebuild and documented startup work from the recorded revisions | Pass — Phase 1 record |
| B03 | The preview identifies the fork commit and loads the intended content | Pass — owner-private, player-supplied pack |
| B04 | A desktop browser reaches the menu and loads a map | Pass — Chromium/SwiftShader, mouse |
| B05 | Actual iPhone Safari reaches the menu and displays the map | Not run — no real iPhone available |
| B06 | Missing data/download/renderer failure gives a useful error rather than a permanent blank screen | Pass for missing/corrupt pack, Wasm failure and context loss — Phase 1 record |
| B07 | Normal-play cheats are off; diagnostics are explicit | Pass — normal off / explicit checkbox opt-in |

## M2: touch controls, layout and mission flow

| ID | Check | Initial status |
| --- | --- | --- |
| I01 | Select every available squad; selection feedback matches engine state | Not run |
| I02 | Move each squad to an intended destination | Not run |
| I03 | Hold fire, aim at another location, release; no stuck fire | Not run |
| I04 | Use available secondary weapons deliberately; displayed ammo matches engine state | Not run |
| I05 | A HUD tap cannot move/fire troops and one touch does not generate duplicate commands | Not run |
| I06 | Pan the camera without a stray movement/fire action | Not run |
| I07 | Add/remove a second finger during a gesture without leaking an unintended command | Not run |
| I08 | Aim/move coordinates stay correct after pan, resize and rotation | Not run |
| I09 | Open help/menu, pause/resume, cancel targeting and return to play using touch only | Not run |
| I10 | Finger cancellation, leaving the canvas and switching modes release held inputs | Not run |
| U01 | Controls are readable and reachable around cutouts and the home indicator | Not run |
| U02 | Center battlefield stays usable; menus collapse and do not obstruct live combat | Not run |
| U03 | Portrait guidance is usable; rotating back restores a working landscape layout | Not run |
| U04 | Browser-bar changes do not clip controls or misalign targets | Not run |
| G01 | Start and complete the selected mission entirely with touch | Not run |
| G02 | Lose/retry a mission and return to the menu without keyboard input | Not run |
| G03 | Abort has a clear outcome distinct from victory/defeat | Not run |
| G04 | Original desktop mouse/keyboard controls still work | Not run |

## M3/M4: persistence, interruptions and performance

| ID | Check | Initial status |
| --- | --- | --- |
| S01 | Save at a documented supported checkpoint and wait for persistence acknowledgement | Not run |
| S02 | Close/reopen and restore the correct campaign/mission and surviving recruits | Not run |
| S03 | Malformed/incompatible save does not silently destroy the last valid checkpoint | Not run |
| S04 | Unavailable/denied storage gives clear feedback without a false saved indication | Not run |
| S05 | The UI accurately labels checkpoint limits; no unverified mid-battle resume promise | Not run |
| L01 | Background during combat; no unintended combat advance or catch-up burst on return | Not run |
| L02 | Background while firing; held input is released | Not run |
| L03 | A user-paused game remains paused through background/foreground transitions | Not run |
| L04 | Interrupt/resume supported audio through normal user interaction without duplicate loops | Not run |
| P01 | Record cold/warm load time, artifact/data size and renderer identity | Not run |
| P02 | Record sustained frame pacing during at least ten minutes or the full mission if longer | Not run |
| P03 | Simulation/weapon timing remains correct across render rates | Not run |
| P04 | Repeated retry/menu/mission transitions show no unbounded memory/handler growth | Not run |
| R01 | Accepted candidate has reproducible source/content revisions and linked evidence | Not run |
| R02 | Source/notices and data terms match what is actually distributed | Not run |

The initial performance target is responsive play with sustained 30 rendered FPS or better during ordinary combat where feasible. Report measured misses explicitly; do not alter simulation speed to make a frame counter look better.

## Later integration checks (M5/M6; deferred)

| ID | Check | Initial status |
| --- | --- | --- |
| A01 | Valid fixture mission loads its exact map, roster IDs and objectives | Not run |
| A02 | Malformed, unsupported or over-limit mission input is rejected cleanly | Not run |
| A03 | Success/loss/abort produce distinct, schema-valid results from engine events | Not run |
| A04 | Death/clearing/sorting/replacement retain the original application soldier mapping | Not run |
| A05 | Reload/retry preserves pending result identity; duplicate delivery does not duplicate application updates | Not run |
| A06 | If iframe messaging is used, incorrect origin/source/type/version is rejected | Not run |
| A07 | Real story → battle → results → next story cycle agrees with engine outcomes | Not run |
| A08 | Unsupported fields stay explicit; no invented wounds/ammo/casualties | Not run |

## Result record and readiness

For each exercised row add: ID, observed result, status, evidence/build reference, defect or blocker. Store task-scoped results under a proposed `docs/mobile/test-runs/` path once a real run exists. Keep personal data and secrets out of public records.

M1 requires B01–B05 plus any applicable failure/default checks. M2 requires the input/UI/gameplay rows. M3 requires save/lifecycle/performance evidence. M4 requires a full touch-only mission and no unresolved blocker to the core mission loop, an accurate save promise, and a reproducible candidate. A failed performance target must have a clear disposition and cannot be silently converted to pass. M5/M6 require the integration rows as implemented.

Fix the smallest reproduced problem, rerun the affected checks, and expand only when the change or a remaining concern warrants it. Mark unperformed checks not run or blocked rather than asking the next agent to infer readiness.
