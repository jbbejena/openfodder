# Mobile acceptance checklist

Status: Phase 1 desktop results are recorded in [test-runs/phase-1.md](test-runs/phase-1.md). See [touch modes](test-runs/touch-commands.md), [camera](test-runs/touch-camera.md), [layout](test-runs/phone-layout.md) and [MOB-008 mission flow](test-runs/mission-flow.md) for desktop/emulation evidence. MOB-008 played unmodified mapm1 to defeat through touch emulation and checked retry/abort/menu; local-only goal fixtures checked victory/continuation. MOB-009 adds [checkpoint semantics](CHECKPOINTS.md) and [Chromium persistence evidence](test-runs/checkpoints.md). MOB-010 adds [interruption policy](LIFECYCLE.md) and [Chrome focus/cache/pixel evidence](test-runs/lifecycle.md), correcting the earlier black battlefield. Actual iPhone Safari, audible audio and phone performance remain untested.

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
| B03 | The preview identifies the fork commit and loads the intended content | Pass — public anonymous access, `1de52e57c4c1`, direct pinned upstream loading; local-file fallback |
| B04 | A desktop browser reaches the menu and loads a map | Pass — current Chromium/SwiftShader screenshot + composited-pixel checks; see MOB-010 correction |
| B05 | Actual iPhone Safari reaches the menu and displays the map | Not run — no real iPhone available |
| B06 | Missing data/download/renderer failure gives a useful error rather than a permanent blank screen | Pass for missing/corrupt pack, Wasm failure and context loss — Phase 1 record |
| B07 | Normal-play cheats are off; diagnostics are explicit | Pass — normal off / explicit checkbox opt-in |

## M2: touch controls, layout and mission flow

| ID | Check | Initial status |
| --- | --- | --- |
| I01 | Select every available squad; selection feedback matches engine state | Emulated touch toolbar: populated squad selected, empty disabled; actual phone not run |
| I02 | Move each squad to an intended destination | Emulated touch: actual order/leader movement passed for the one populated demo squad; phone not run |
| I03 | Hold fire, aim at another location, release; no stuck fire | Emulated touch Fire mode: hold/slide/lift and actual engine aim passed; phone not run |
| I04 | Use available secondary weapons deliberately; displayed ammo matches engine state | Emulated targeting/confirmation fired one grenade and rocket in a separate local ammo fixture; real demo remains zero ammo; phone not run |
| I05 | A HUD tap cannot move/fire troops and one touch does not generate duplicate commands | Emulated touch/engine command counts passed; phone not run |
| I06 | Pan the camera without a stray movement/fire action | Emulated Move two-finger pan and explicit Pan passed with no player ground command; phone not run |
| I07 | Add/remove a second finger during a gesture without leaking an unintended command | Emulated both pan lift orders, third finger, HUD-first ownership and Fire cancellation passed; phone not run |
| I08 | Aim/move coordinates stay correct after pan, resize and rotation | Emulated actual aim after pan/Follow/portrait round trip and pan distances after resize passed; DPR 1/2/3 covered; real Safari rotation not run |
| I09 | Open help/menu, pause/resume, cancel targeting and return to play using touch only | Emulated mission selection/briefing/deploy, Guide pause/scroll/close/resume, retry and menu passed; actual phone NOT RUN |
| I10 | Finger cancellation, leaving the canvas and switching modes release held inputs | Emulated canvas exit, touchCancel, HUD/mode change and resize released fire; desktop pause/blur/API/harness checks passed; phone not run |
| U01 | Controls are readable and reachable around cutouts and the home indicator | Emulated 44×44 minimum controls and simulated 44px side/21px bottom safe areas passed; actual iPhone NOT RUN |
| U02 | Center battlefield stays usable; menus collapse and do not obstruct live combat | Emulated rails outside canvas, contextual weapons and paused scrollable Guide passed; actual iPhone NOT RUN |
| U03 | Portrait guidance is usable; rotating back restores a working landscape layout | Emulated prompt, portrait opt-in, independent pause and landscape aiming passed; actual rotation NOT RUN |
| U04 | Browser-bar changes do not clip controls or misalign targets | Synthetic visualViewport height/offset recomputed bounds and released fire; physical Safari bars NOT RUN |
| G01 | Start and complete the selected mission entirely with touch | Unmodified combat victory NOT RUN; local empty-goal fixtures exercised native win/continue/final result; actual phone NOT RUN |
| G02 | Lose/retry a mission and return to the menu without keyboard input | Pass in local/public touch emulation: unmodified mapm1 defeat, same-mission fresh-recruit retry, menu, mapm2 selection/replay; actual phone NOT RUN |
| G03 | Abort has a clear outcome distinct from victory/defeat | Pass in emulation: confirmation cancellation kept play active; confirmed native abort produced stable aborted result and no continuation |
| G04 | Original desktop mouse/keyboard controls still work | Browser uses DOM mission menus; SDL battlefield right-button aim and P passed; native desktop startup source unchanged; full native mission/hotkey coverage not run |

## M3/M4: persistence, interruptions and performance

| ID | Check | Initial status |
| --- | --- | --- |
| S01 | Save at a documented supported checkpoint and wait for persistence acknowledgement | Pass in local/public Chromium: briefing Save awaits real IDBFS sync; actual iPhone NOT RUN |
| S02 | Close/reopen and restore the correct campaign/mission and surviving recruits | Pass in Chromium: real persistent profile reopened, mission restored; local goal fixture round-tripped four native returning recruits/reserves and deployed mapm2. Actual iPhone NOT RUN |
| S03 | Malformed/incompatible save does not silently destroy the last valid checkpoint | Pass in local/public Chromium: rejected imports unchanged, failed write rolled back; real reopen retained valid save; corrupt primary recovered previous |
| S04 | Unavailable/denied storage gives clear feedback without a false saved indication | Pass with Chromium denied IndexedDB and simulated sync failure; play remains available, Save disabled on denial; actual Safari storage modes NOT RUN |
| S05 | The UI accurately labels checkpoint limits; no unverified mid-battle resume promise | Pass in Chromium/source: mission-start briefing only, current battlefield export rejected; backup export/import passed. Actual Safari Files behavior NOT RUN |
| L01 | Background during combat; no unintended combat advance or catch-up burst on return | Chrome real focus/cache pass; ≤1 update per native callback. Synthetic visibility/freeze pass; real CDP freeze event not observed; actual Safari NOT RUN |
| L02 | Background while firing; held input is released | Local/public Chrome real focus loss released fire synchronously; return required tap. Actual Safari/physical touch NOT RUN |
| L03 | A user-paused game remains paused through background/foreground transitions | Local/public Chrome composed user/Guide/lifecycle pause passed; synthetic portrait interruption retained its own pause. Actual Safari NOT RUN |
| L04 | Interrupt/resume supported audio through normal user interaction without duplicate loops | Not run / unsupported: web build forces null audio backend despite included sound data; audible recovery not implemented or claimed |
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
