# Touch command modes and camera (MOB-005/006)

The existing C++/SDL engine owns soldiers, movement, targeting, weapons and ammo.
The browser provides one pointer controller in `web/touch-controls.js`, using
the [engine command boundary](INPUT_API.md). MOB-006 adds camera gestures and
Follow squad. The full landscape phone layout and complete touch menus remain
MOB-007–008. Real iPhone Safari acceptance and a complete touch-only mission
have **not run**.

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
  12 CSS pixels cancels; movement is never issued on touch-down. Put two fingers
  down before dragging to pan instead.
- **Fire:** hold ground to use primary fire, slide to aim, and lift to stop.
  Choosing Fire does not consume secondary ammo or change combat timing.
- **Grenade / Rocket:** choose an available weapon, tap a target, then tap
  **Throw grenade / Launch rocket**. The marker shows the world target.
  Marking alone spends nothing. Confirmation requests one native shot and
  returns to Move. Choose the weapon again for another shot.
- **Pan:** drag one finger to inspect the map without a combat command.
  **Follow squad** returns the camera to the selected engine squad.
- **Cancel:** release held input and clear targeting. It cannot undo a movement
  order or projectile already accepted by the engine. Changing modes/squads also
  releases held input. An already-panned view is retained across mode changes
  and Cancel. Follow squad, selecting a squad, issuing Move or disabling touch
  controls restores the engine camera behavior. Weapon buttons show actual ammo
  and disable at zero.

The exact public demo begins with **zero grenades and rockets**. These buttons
are therefore disabled in the published first mission. Local verification of
secondary firing uses an explicitly separate in-memory campaign ammo fixture;
the public demo/pins/manifest are unchanged.

## Pointer ownership and cancellation

One pointer owns a combat gesture until release. An uninterrupted Move tap may
become a two-finger camera gesture when both touch pointers start inside the
battlefield. Put both down before dragging; a one-finger Move drag over 12 CSS
pixels has already cancelled its tap and cannot be recycled into a pan.

Camera motion starts after the pair's centroid moves **8 CSS pixels** (or the
single pointer in Pan mode moves 8 pixels). Drag the terrain: fingers moving left
move the camera right. There is no zoom or inertia. Fractional motion is retained
and coalesced into the existing bounded engine pan command; native map clamping
remains authoritative. The shared coordinate boundary converts client distances
using the contained image scale, without applying camera/sidebar offsets or DPR
again. Resize cancels the current gesture before fresh geometry is used.

Lifting either pan finger ends the gesture and holds the view. The remaining
finger cannot become Move, Fire or a new pan. Lift all fingers before starting
another command. A third finger, HUD/page touch, pointer cancellation, leaving
the visible battlefield or a mode/squad change cancels the gesture and discards
unsent motion. No later inertia or remaining-pointer commands are generated.

**Two-finger promotion is limited to Move.** In Fire/secondary modes a second
finger only cancels; it never starts a pan. Fire begins on the first aiming touch,
so inferring a future camera gesture from that same touch would permit a brief
unwanted shot. Choose Pan before touching the battlefield to pan safely from any
combat mode. Both the Move gesture and explicit Pan route are available; real
Safari gesture reliability is still unverified. HUD-first touches cannot acquire
either route. Neither camera gesture requires pointer lock.

Follow squad releases all held input, requests the existing engine follow action
and returns the browser to Move mode. Switching modes while inspecting the map
uses cancel plus a zero-distance pan to retain the view; the raw API's cancel
semantics are unchanged. A new engine movement/squad command may itself restore
following. Combat continues while inspecting the map. No C++ camera, combat
or timing code changed in MOB-006.

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
PLAYWRIGHT_MODULE=/path/to/playwright-core \
  node scripts/smoke-web-camera.cjs http://127.0.0.1:8090/ \
  build-web/local-only/christmas.ofdata build-web/local-only/camera-evidence
```

The touch smoke script checks the real Wasm engine with CDP touch emulation, actual
orders/positions/aim/ammo, and command counts. Its second browser context amends
only the already-verified browser-memory campaign with Grenades=3/Rockets=2.
Nothing is written into Run or a published data pack. Screenshots contain game
art and remain local. Keep these results separate from actual iPhone Safari.

The camera smoke uses the unmodified zero-ammo campaign at DPR 1/2 and checks
actual camera deltas, both lift orders, threshold/ownership, native clamping,
Follow, post-pan/recenter aiming and resize. Pass `upstream` instead of a local
pack to exercise the public download path; an optional fourth argument verifies
the exact full clean build commit. This is anonymous desktop emulation, not Safari.
