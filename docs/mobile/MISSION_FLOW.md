# Touch mission flow (MOB-008)

The standalone demo uses DOM mission screens and the existing C++/SDL battlefield.
Mission names/objectives, selection validation and outcomes come from the engine.
The loaded content supports **Amiga Format Christmas Special**, two missions,
one phase each. Other campaigns/retail content are outside this preview's content
set; no unsupported campaign selector is offered.

Load demo → Start game → choose a mission → read objectives → **Deploy mission**.
On the battlefield, **Guide** pauses combat and shows objectives/controls.
**Back to game** restores the previous pause state. If a native user pause is
set, **Resume combat** clears that reason and closes Guide; other pause reasons
remain independent. **Abort mission → Confirm abort** ends the attempt. **Keep
playing** cancels the confirmation without issuing an engine abort.

| Engine stage | Player action / behavior |
| --- | --- |
| `menu` | Choose either loaded demo mission |
| `briefing` | Read engine objectives; Deploy, or Return to menu |
| `battlefield` | Existing squad/combat/camera controls and paused Guide |
| `ending` | Wait for the native end countdown and cleanup; new gameplay/mission commands are gated |
| `result` | Read the outcome; Retry, Return to menu, or Next mission when a winning result has a successor |

`Source/Start_Emscripten.cpp` owns this state machine. It retains native
`Game_Setup`, phase preparation, `Phase_Cycle`, goal/defeat/abort flags, cleanup
and `Phase_Next`. The existing browser loop pacing stays in place. The native
desktop startup/menu path is unchanged. Browser mouse users use the same DOM
mission screens, with original SDL mouse/keyboard controls on the battlefield.

The adapter captures `won` only for an engine-winning return with completion set
and neither abort nor try-again set. Abort has precedence; try-again is `lost`.
An otherwise unclassified engine stop is `ended` and is never shown as a win.
The read-only result freezes outcome, current mission/phase/map, attempt number,
engine tick and diagnostic cheat flag. It remains unchanged until a new choice.
It does not infer casualties/wounds or export an application result record.

Retry invokes a fresh native start of that result's mission, beginning at phase
one with new recruits. It discards that attempt and earlier run state; it does
not revive individual troops or restore a checkpoint. Continue uses native
progression and carries the engine's current campaign state into the next
briefing. At the final demo result, Next is unavailable. Returning to menu clears
the run while leaving the already-loaded content available in this tab.

The [command bridge](INPUT_API.md) adds actions 11–16. Commands are validated on
submission and at the input boundary; only one transition can wait at once.
Cancel/fire-stop cannot erase a queued mission choice. Scene allocation and stage
changes occur after command iteration, outside the redraw mutex. Stage changes
release held input and clear old pause state. Once an attempt is ending, native
cleanup continues without a user/Guide pause trapping the countdown. Live troop
commands are rejected in all non-battlefield states.

Mission cards scroll internally at short landscape/portrait sizes, keep 44px
buttons, gate canvas input and use engine text as plain text. They replace the
browser's old canvas campaign menu. Portrait rotation guidance is limited to
the battlefield, so selection/briefing/results can be read in either orientation.
The [phone shell](PHONE_LAYOUT.md) continues to own fitting/safe areas and Guide.

**Progress is not saved.** Returning to menu or reloading discards the run.
Browser Back can leave the page; there is no supported checkpoint recovery or
Back/Forward Cache resume promise. If browser history restores a stale screen,
reload and start again. Persistent mission-boundary checkpoints are MOB-009;
full browser lifecycle recovery is MOB-010. Audio stays disabled.

[Verification and exact phone steps](test-runs/mission-flow.md) separate actual
Wasm touch emulation from real iPhone Safari, which remains **NOT RUN**. The
unmodified first mission was played to defeat through emulated touch. Separate,
local-only empty-goal campaign fixtures exercise native victory/continue/final
result branches; they are not evidence of an unmodified combat victory. Fixture
data never enters source commits, build artifacts or hosting.
