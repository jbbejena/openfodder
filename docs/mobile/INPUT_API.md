# Browser command boundary (MOB-004)

The C++/SDL engine owns orders, selection, ammunition, targeting, simulation and
pause. `web/engine-bridge.js` maps browser coordinates to commands; it does not
simulate troops. `Source/WebInput.cpp` applies queued commands at the start of
`Phase_Loop_Interrupt`, before the existing input/mission update. It uses existing
squad/path/weapon/camera routines. The browser remains single-threaded.

MOB-005 adds [touch command modes](TOUCH_CONTROLS.md) and deliberate secondary
fire to this foundation. MOB-006 adds touch camera gestures and Follow using the same existing
engine intents. MOB-007 adds the [viewport shell/HUD](PHONE_LAYOUT.md) and its independent
presentation pause. MOB-008 adds [mission states and touch menus](MISSION_FLOW.md).
Vehicles receive `unsupported` rather than an invented order.
Native mouse/keyboard paths remain in use when the bridge does not own input.

## JavaScript surface

After runtime initialization, `window.fodderInput` exposes these methods:

| Method | Meaning |
| --- | --- |
| `state()` | Read the engine/adapter snapshot; never a writable engine object |
| `selectMission(number)` | Select a loaded demo mission from the menu and show its briefing |
| `deployMission()` | Deploy from that briefing through native phase preparation |
| `retryMission()` | Restart the result's mission from its first phase with fresh native game data/recruits |
| `abortMission()` | End an active attempt through native abort handling; available while paused |
| `returnToMenu()` | Leave briefing/results and discard the current run |
| `continueMission()` | Advance a winning result through native `Phase_Next`, if another phase/mission exists |
| `selectSquad(0..2)` | Select a populated engine squad; clears held input |
| `moveTo({x,y})` / `moveAt(clientX,clientY)` | Issue an on-foot engine movement order; preserves native path/waypoint rules |
| `fireStart({x,y})` / `fireStartAt(clientX,clientY)` | Hold primary fire at a map target; repeated starts update aim without resetting the fire cooldown |
| `fireAim({x,y})` / `fireAimAt(clientX,clientY)` | Change the held primary-fire target; requires an applied fire start |
| `fireStop()` | Release manual fire; safe repeatedly, also clears queued fire requests |
| `selectWeapon('grenade'/'rocket')` | Select an available secondary weapon without firing/consuming ammo |
| `secondaryTo({x,y})` / `secondaryAt(clientX,clientY)` | Request one shot with the selected available grenade/rocket; native weapon/projectile rules decide whether it fires |
| `pan(dx,dy)` | Apply a bounded camera intent in map pixels, at most 128 per axis; clamps to map bounds; cancels held input |
| `follow()` | Resume the engine's squad-follow camera |
| `setPaused(boolean, reason='user')` | Set/clear one explicit pause reason: `user` (1), `visibility` (2), `focus` (4), or reserved `shell` (8) |
| `cancel()` | Clear pending physical commands, held fire and native button/control latches; return camera ownership to the engine; preserve pause reasons and already-issued movement/projectiles |
| `clientToWorld(x,y)` / `worldToClient(x,y)` | Read-only projection for the current canvas/view |
| `clientDeltaToMap(dx,dy)` | Read-only CSS distance conversion using the contained image scale; returns fractional map pixels or null for missing geometry |

Commands return `{ok:true,id}` when accepted or `{ok:false,reason}` when rejected.
A positive ID means queued, not completed; inspect `state().last` after an input
boundary. A newer ID or changed stage may supersede an older command. Cancel and
stop before engine initialization are safe no-ops (`id:0`). Secondary fire is
additive action **10** in API version 1; existing action numbers are unchanged.
The underlying Wasm
exports are `of_web_command(action,a,b)` and `of_web_state()` (JSON string pointer,
decoded/copied immediately). Arbitrary scripts, state writes and outcome mutation
are not part of this API.

## Validation, state and ownership

| Engine condition | Result |
| --- | --- |
| Runtime/engine not started | `uninitialized`; cancel/stop safe |
| Menu, finished/aborted phase, or map overview | Combat commands return `not-battlefield`; cancel/stop safe; mission commands follow the stage rules below |
| Paused | Gameplay commands rejected as `paused`; explicit pause/resume/cancel/stop accepted |
| Input disabled or camera start adjustment running | `busy`; retry only after state becomes ready |
| Empty squad, unavailable secondary ammo/weapon, or secondary fire while the leader is in water | `unavailable` |
| Missing valid selected squad/leader | `no-squad` |
| Invalid index, weapon, nonfinite/fractional raw argument, map target, or oversized pan | `invalid` |
| Vehicle move/fire | `unsupported` |
| Normal queue has 32 entries, waypoint queue is near capacity, or another secondary request awaits its native weapon update | `busy` |

Arguments are validated in JS and C++; C++ revalidates at application time because
selection/phase/pause can change after enqueue. Safety commands coalesce and keep
reserved capacity; cancel cannot be blocked by a full normal queue. Cancelling
retains pending pause and mission-transition requests. Fire-stop removes pending fire starts/aims and secondary requests. An
accepted order may therefore be superseded or rejected at the input boundary.

`state()` includes API/stage/readiness, last applied ID/result, pending count,
pause reasons/effective pause, held-fire/secondary-pending/manual-camera state, actual mission tick,
selected squad, actual squad counts/ammo/secondary weapon, and leader
position/destination/aim. The viewport and map bounds also come from the engine.
The numeric applied result codes are 0 success, -1 invalid, -2 uninitialized,
-3 not-battlefield, -4 paused, -5 no-squad, -6 unavailable, -7 busy, -8 unsupported.
Mission commands are additive actions **11–16** in the table's order; they accept
only a mission number for Select and zero arguments otherwise. Wrong-stage
mission actions return `unavailable`, invalid IDs/arguments return `invalid`,
and a second pending transition returns `busy`. They are revalidated at the
input boundary; scene preparation runs afterward, outside the queue/redraw lock.
`stage` additionally reports `briefing`, `ending` and `result`. `mission` contains
engine-read campaign/mission/map/objectives, available missions, attempt counter,
transition pending state, `canContinue` and a frozen `result` (or null).
See [mission semantics](MISSION_FLOW.md) for result fields and supported scope.

A primary-fire hold owns aiming until stopped/cancelled. Engine targeting and
cooldowns remain authoritative; holding fire does not generate a new mouse-down
edge on every frame. Native autonomous return fire and committed projectiles are
not undone by releasing manual input. Selecting a squad/weapon, moving, panning,
pausing, losing a valid phase/selection, or cancelling releases held fire.
Camera pan owns the view until follow, cancel, selection, movement or pause.

Secondary fire sets the original left+right weapon latch once and uses existing
targeting/troop/projectile routines. Native ammo, cooldown, water, projectile
capacity and terrain behavior remain authoritative. The latch is consumed by
the native attempt and never re-armed by later input interrupts. An accepted
request is an attempt, not a promise that a projectile was created. Inspect
engine ammo/state; `secondaryPending` distinguishes the short pending attempt
from a primary-fire hold. Changing squad/leader/weapon, stop/cancel or pause
releases the request; a committed projectile is never undone.

Pause reasons compose with OR. Setting user pause twice cannot resume the game;
clearing user pause cannot clear a visibility/focus/shell pause. Guide and
portrait guidance jointly own `shell`; closing either leaves it set while the
other is open. Native P remains the
user pause input. The Emscripten loop keeps rendering/yielding/polling SDL while
paused and skips mission updates; it never enters the native blocking pause loop.
The harness cancels input on blur, hidden visibility and pagehide. Full automatic
background pause/resume, timing and restoration policy remains MOB-010.

## Coordinate boundary

Commands use **integer engine map pixels**, independent of camera/CSS/DPR.
The engine exports logical viewport width/height, sidebar width, camera origin
and visible map bounds. Rendering crops the surface's 16-pixel border; the
playfield begins at `SIDEBAR_WIDTH` (48 at this baseline). Sprite ground positions
render at `screenX = mapX - cameraX + sidebar`, `screenY = mapY - cameraY`.

The canvas has zero border/padding and centered `object-fit:contain`. For a client
point, compute its position within the contained image rectangle (reject its
letterbox bands), then scale to the engine's logical viewport:

```text
screenX = (clientX - image.left) * view.width  / image.width
screenY = (clientY - image.top)  * view.height / image.height
mapX = floor(screenX - view.sidebar + view.cameraX)
mapY = floor(screenY + view.cameraY)
```

Reject the sidebar, outside image and outside map. Read the rectangle and engine
view for each command, including after scroll, resize and rotation. Client
coordinates already reflect CSS scaling and device pixel ratio; never multiply
by DPR a second time. Intrinsic canvas changes preserve this projection.

Only the C++ fire adapter reverses the original targeting routine's cursor
hotspot (+16 X, +8 Y); that adjustment must not appear in JS. Movement uses the
existing map-target routine directly. Camera gestures convert distances with
`clientDeltaToMap`; distances receive no camera/sidebar translation. The touch
controller retains fractions and sends bounded integer pan intents. Panning changes camera/render state, not
movement orders or simulation time.

## Diagnostic harness and checks

Before Start game, expand Diagnostics and check **Show input API test panel**.
After choosing and deploying a mission, expand **Control bridge test panel** below the
canvas. Use the engine map coordinates, squad/weapon buttons, Move, held primary
fire, camera arrows/follow, Pause/Resume and Cancel. The JSON readout reflects the
actual engine. Empty squads and unavailable weapons are disabled. The panel is
not the production touch combat layout. Leave **Guide → Touch controls** unchecked
for the original desktop canvas controls; the checkbox defaults off for a fine
pointer. Touch devices enable the production controller by default.

```sh
node --test web/*.test.cjs
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
python3 -m http.server 8090 --directory build-web/cmake/dist
PLAYWRIGHT_MODULE=/path/to/playwright-core \
  node scripts/smoke-web-input.cjs http://127.0.0.1:8090/ \
  build-web/local-only/christmas.ofdata build-web/local-only/input-evidence
```

Use `scripts/make-local-web-pack.py` for the local smoke fixture. The public
launcher still fetches exact pinned files from the existing upstream host; no
assets were added to the engine artifact or this repository. Screenshot evidence
contains game art and remains local. Desktop DPR checks are not actual iPhone
Safari acceptance. See the task test record/handoff for measured results and the
precise preview identity.
