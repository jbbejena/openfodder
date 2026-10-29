# Landscape phone shell (MOB-007)

The play screen fits the visible viewport after **Start game**. The loading page
scrolls normally. The engine remains the existing C++/SDL Wasm build; DOM controls
read squad counts, ammo and pause state from its bridge. This implementation still
requires actual iPhone Safari validation. [Verification](test-runs/phone-layout.md).

| Surface | Control map |
| --- | --- |
| Header | Selected squad/count, current input mode, fork build ID, **Guide** |
| Left rail | Three squad buttons; **Weapons** replaces them with available grenade/rocket choices |
| Battlefield | Original engine canvas; existing Move, Fire and camera gestures |
| Right rail | **Move**, **Fire**, **Pan**, **Cancel**, **Follow**; a marked secondary target replaces Follow with **Throw/Launch** |
| Bottom line | Input feedback; truncates long messages without shrinking the field |
| Guide | Pauses battlefield; scrollable controls, touch toggle, save/audio limits, build/source/log details; **Back to game** stays visible |

Controls have a minimum 44×44 CSS-pixel target. Landscape rails sit beside the
canvas, with no live overlay over its center. Below 380 CSS pixels of visible
height, Cancel and Follow/confirmation share a row. The weapons picker preserves
the engine's zero-ammo disabled state. It does not grant weapons. HUD pointers
retain their existing ownership and cannot become ground orders.

`viewport-fit=cover` and safe-area environment insets reserve cutout/home-indicator
space. `web/phone-shell.js` tracks `visualViewport` size/offset, window resize,
host resize and SDL's intrinsic canvas size. It fits the canvas box to its native
aspect ratio; letterboxing belongs to the surrounding host. SDL mouse/menu
coordinates and the explicit browser bridge therefore use the same displayed
image. The engine render resolution and simulation rate are unchanged. Geometry
changes cancel an active touch gesture before accepting a fresh one.

Portrait touch users see a paused rotation prompt with **Keep playing in
portrait** as an alternative. That choice puts controls below the field until
returning to landscape. No orientation lock is required. Fine-pointer desktop
windows retain native controls unless touch controls are explicitly enabled.

Guide and portrait guidance share the reserved `shell` pause reason (bit 8).
Their combined state is ORed with user/visibility/focus pause reasons. Closing
Guide cannot resume a user-paused or portrait-blocked game. Guide consumes
keyboard input, traps Tab focus and uses Escape to close without aborting the
native mission. New gameplay gestures are gated under overlays while release
events can still clear existing latches. The guide scrolls internally; the play
surface prevents page scrolling/selection. Exceptionally short rail regions can
scroll independently without passing gestures to the canvas.

The input harness remains explicitly opt-in and modeless so its live regression
controls still work; it reduces available field space when opened. It is inert
while Guide/portrait/error blocks input. A runtime failure releases held input
where possible, presents the original error and offers **Reload preview**.

Normal play starts with cheats off. Progress is not persistent; reloading starts
a new game. Audio remains disabled. Full touch mission menus, retry/abort/results
belong to MOB-008; storage/lifecycle/performance remain later tasks.
