# Touch command modes (MOB-005)

The existing C++/SDL engine owns soldiers, movement, targeting, weapons and ammo.
The browser provides one pointer controller in `web/touch-controls.js`, using
the [engine command boundary](INPUT_API.md). Camera gestures, the full landscape
phone layout and complete touch menus remain MOB-006–008. Real iPhone Safari
acceptance and a complete touch-only mission have **not run**.

## Play this build

Load demo → Start game → briefly hold the Christmas Special campaign row.
The touch toolbar appears on the battlefield. Touch commands default on with a
coarse pointer; the first battlefield touch also enables them on a hybrid device.
On desktop, check **Touch commands** to try the same loop with a mouse. Uncheck
it to use the original SDL mouse/keyboard controls.

- Select a populated squad. The highlighted button and soldier count come from
  engine state. Empty squads are disabled; this demo starts with four soldiers
  in Squad 1 and no soldiers in Squads 2/3. Squad formation/splitting is not added.
- **Move:** tap and release ground to send one movement order. A drag over
  12 CSS pixels cancels; movement is never issued on touch-down.
- **Fire:** hold ground to use primary fire, slide to aim, and lift to stop.
  Choosing Fire does not consume secondary ammo or change combat timing.
- **Grenade / Rocket:** choose an available weapon, tap a target, then tap
  **Throw grenade / Launch rocket**. The marker shows the world target.
  Marking alone spends nothing. Confirmation requests one native shot and
  returns to Move. Choose the weapon again for another shot.
- **Cancel:** release held input and clear targeting. It cannot undo a movement
  order or projectile already accepted by the engine. Changing modes/squads also
  releases held input. Weapon buttons show actual ammo and disable at zero.

The exact public demo begins with **zero grenades and rockets**. These buttons
are therefore disabled in the published first mission. Local verification of
secondary firing uses an explicitly separate in-memory campaign ammo fixture;
the public demo/pins/manifest are unchanged.

## Pointer ownership and cancellation

One pointer owns a battlefield gesture until its release. A second canvas finger
cancels the pending command/hold and neither pointer can become a new action
until all are lifted. HUD/page pointers retain their own IDs and cannot issue a
ground command or become the aim owner. A second finger on the HUD releases an
existing aiming pointer. This is a safe cancellation rule; two-finger panning is
the next task.

Pointer Events are the sole command source during enabled battlefield control.
Capture-phase listeners block SDL3's legacy Touch Events and compatibility mouse
events, preventing the same touch from also becoming a native left click.
Menu input remains on the existing SDL route. Pointer capture retains release
events, while explicit bounds checks cancel when dragging into letterboxing,
the native sidebar or outside the canvas. Re-entry does not resume firing.

Pointer cancellation/lost capture, mode/squad/weapon changes, resize, focus loss,
hidden visibility and pagehide release held input/targeting. Existing physical
IDs stay blocked until up/cancel, so a mode change cannot recycle a held finger.
Background pause/resume and interruption recovery remain MOB-010; this task only
releases commands. Window resize cancels the active gesture and recalculates
coordinates on the next touch through the shared CSS/camera/DPR boundary.

The toolbar is a basic command surface above the canvas, with 44px buttons and
a contained image. The reduced battlefield on a short landscape viewport and
browser scrolling still need the full MOB-007 shell. No safe-area/real Safari
rotation/browser-bar or full-mission acceptance is claimed here.

## Focused checks

```sh
node --test web/*.test.cjs
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
python3 scripts/make-local-web-pack.py
python3 -m http.server 8090 --directory build-web/cmake/dist
PLAYWRIGHT_MODULE=/path/to/playwright-core \
  node scripts/smoke-web-touch.cjs http://127.0.0.1:8090/ \
  build-web/local-only/christmas.ofdata build-web/local-only/touch-evidence
```

The smoke script checks the real Wasm engine with CDP touch emulation, actual
orders/positions/aim/ammo, and command counts. Its second browser context amends
only the already-verified browser-memory campaign with Grenades=3/Rockets=2.
Nothing is written into Run or a published data pack. Screenshots contain game
art and remain local. Keep these results separate from actual iPhone Safari.
