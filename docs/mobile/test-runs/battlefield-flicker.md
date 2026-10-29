# Battlefield brightness flutter — FIX-MOBILE-FLICKER

2026-10-29. Focused defect fix; no broader mobile milestone is passed.
Branch `fix/mobile-battlefield-flicker` starts at fetched master
`8bf8290f2f78e5d4a3c2b44128c2d935037c5c6d` (PR #11 merged). Working tree was clean;
no isolated worktree was needed. Newer performance, touch, mission, checkpoint
and lifecycle work is retained.

## Identity and reproduction

The user reported whole-field/HUD flashing in a 910×512, 30fps, approximately
64.6s recording of the football-pitch demo, identifying
`1de52e57c4c185dde254f679209d253af6009c82`. **The original MP4 is unavailable in
this workspace; it was not independently inspected.** Its described frames are
user evidence, not our root-cause proof.

At the start of this work, anonymous HTTPS `build-info.json` on the public preview
actually identified clean `d3edef36fc529ab051060524516168dc976a53ee`. Current master
was independently rebuilt with the pinned toolchain and reproduced the symptom.
That first local artifact reported `8bf8290` / `dirty:true` because only the
handoff/ledger claim had been written; C++ and runtime inputs still matched
master exactly. The subsequent retained-old and final comparisons use clean
identities. Rebuilding the older recording revision was unnecessary. The unchanged
previous public artifact was also retained locally for the before/after test.

Content: **Amiga Format Christmas Special → mission 1, LAND OF HOPE AND GLORY,
`mapm1`**. Its starting view has snow above the football pitch; Pan south to see
the grass. Mission 2, `mapm2`, is IT'S SNOW TIME! The demo is sometimes called
Cannon Soccer; neither the field nor its original pixel-art HUD is defective.
Use the same unmodified 20-file, **223,382-byte** validated demo in both builds.

Pins unchanged: Run `070a6086c62164e859fc3274b75b5f536fa9d902`; nested Scripts
`dad04730860bcdd1189aa8562860e379b0f5d783`; emsdk
`c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56`; emcc **4.0.23**,
`7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`; SDL **3.2.22**;
CMake **3.31.6**, Ninja **1.11.1**. Recursive checkout verified, no repins.

Desktop evidence: Linux **Chromium 154.0.8037.57**, **Playwright Core 1.57.0**,
844×390 CSS viewport, DPR 2, emulated touch, SDL **opengles2 / WebGL 1**,
ANGLE/Vulkan **SwiftShader**. Context has `preserveDrawingBuffer:false`, alpha and
premultiplied alpha enabled, antialias off. Renderer/environment/data are held
constant for comparison. This is not physical iPhone or Safari evidence.

## Demonstrated cause and correction

In a normal idle run of rebuilt master, 80 composited canvas images over 55.3s
showed the same six lower-field grass patches alternately at RGB green **80, 160, 240 and
255**. The native HUD brightened too. A trace showed **2,496 uploads/draws and zero
clears**. Main streaming textures use additive `SRC_ALPHA, ONE`; `LoadPng` also
uses additive alpha-0xa0 overlays. The CPU image's sampled grass texel remained
`[0,80,0,0]` after the entry fade. A bounded source sampler reset at the paused
diagnostic captured 24 unchanged texels while the displayed image jumped. The palette was not repeatedly restarting.

`Interrupt_Sim_Tick` redraws the CPU image; `Video_Sleep` draws/uploads it and
`FrameEnd` presents the SDL batch. These are completed native images, not
simulation ticks or RAF opportunities. Multiple completed images can be drawn
before one browser composite. The web path presented without clearing; the
complete additive base therefore added to the earlier image in the same drawing
buffer. Browser automatic clearing between composites is insufficient. This
explains the exact brightness multiples and their dependence on scheduling.
No evidence implicated CSS scaling, field art or the new performance recorder.

The temporal diagnostic pauses simulation and completes **1,3,2,1** ordinary
native render callbacks per controlled RAF opportunity, repeated three times.
On clean old `d3edef3`, it produced **nine global jumps in 12 images**, patch
luminance **57.216–171.648**, unchanged source texels, and one upload/draw but no
clear per callback. An investigation-only pre-draw GL clear also eliminated the
accumulation across 28 normal screenshots; that injection is not shipped.

`Window::FrameBegin`, Emscripten-only, now queues an opaque-black clear immediately
before each complete `Video_SurfaceRender` redraw and the legacy paused
background/text composition. The complete base plus any overlays are drawn onto
a known black target; existing additive overlay modes remain intact. `FrameEnd`
still presents once and records that result. No clear is queued after present
or during a callback with no new image, including lifecycle suspension. Native
presentation behavior and all palette/fade code remain unchanged, including the
black-field correction from `a5e61a8`.

No CSS filter, blanket opaque-texture change, fade suppression, frame-rate cap,
simulation delay or scheduling change. Web loop, Sleep(10), input release,
camera/world coordinates, mission outcomes, checkpoints and opt-in performance
recording retain their contracts. No production diagnostics or fixtures added.

## Temporal check and exclusions

`scripts/smoke-web-rendering.cjs` reuses the existing Playwright/Chromium harness
and bundled PNG decoder. It captures **page-composited PNGs clipped to the canvas**,
never `gl.readPixels` from a discarded drawing buffer. Six fixed 12×12 patches
at canvas fractions x=0.35/0.55/0.75, y=0.32/0.62 sample the grass away from the
native sidebar, troops and cursor. Median Rec.709 luminance reduces isolated
sprite/bullet/line effects. A jump fails when **at least four of six** patches
change in the same direction by **>12/255 luminance and >20%**. Fewer than eight
sampled canvas colors also fails as a blank-image guard.

The harness waits three seconds after entry/Retry, then fixes the camera over
the pitch at map Y=208. It excludes intentional entry fades, Guide backdrops,
Follow recentering and native ending/result screens. It fixes the camera again
before comparisons after Guide/return. Small live Pan steps are compared over
uniform grass. Movement and held Fire use real emulated touch; Pan commands and
Follow use the real adapter. Background tests use synthetic blur/focus here;
actual focus and persisted history return have their own existing smoke test.

Requested gap is **90ms after each screenshot**; screenshot/browser cost adds to
that. Per-frame timestamps and actual intervals are saved, not described as a
30fps video. Twelve stationary images use controlled RAF opportunities and real
complete native callbacks while simulation time remains fixed. Their 1/3/2
batching is QA-only; normal mission scheduling is unchanged. The test also
observes actual SDL submission counters separately from GL draws and RAFs.
Normal enemies remain active in ordinary samples: bounded action groups retry
between attempts, and ending transitions are excluded explicitly. A test run
that exhausted the squad before Follow exposed this harness race; it was fixed
without changing game data or combat.

After results, screenshots and diagnostic samples must be visually reviewed.
A passing metric alone cannot prove stable presentation on other GPUs/devices.
Raw screenshots, reports, local pack and profiles remain ignored under
`build-web/local-only/flicker-*`; none are uploaded or committed.

## Commands and results

```sh
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
node --test --test-isolation=none web/*.test.cjs
python3 scripts/ci/windows_scope.py --base 8bf8290f2f78e5d4a3c2b44128c2d935037c5c6d --head HEAD
python3 -m http.server 8765 --bind 127.0.0.1 --directory build-web/cmake/dist
export PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core
export CHROMIUM_PATH=/usr/bin/chromium
node scripts/smoke-web-rendering.cjs http://127.0.0.1:8765 build-web/local-only/christmas.ofdata build-web/local-only/flicker-final-01231e7 01231e740c9387b444dea68e0eab6c38b411df57
node scripts/smoke-web-lifecycle.cjs http://127.0.0.1:8765 build-web/local-only/christmas.ofdata build-web/local-only/flicker-lifecycle 01231e740c9387b444dea68e0eab6c38b411df57
node scripts/smoke-web-layout.cjs http://127.0.0.1:8765 build-web/local-only/christmas.ofdata build-web/local-only/flicker-layout 01231e740c9387b444dea68e0eab6c38b411df57
node scripts/smoke-web-performance.cjs http://127.0.0.1:8765 build-web/local-only/christmas.ofdata build-web/local-only/flicker-performance 01231e740c9387b444dea68e0eab6c38b411df57
```

Create the ignored local pack with [BUILD.md](../BUILD.md), or use `upstream` as
the content argument. The same temporal command works on the public preview;
pass its full served commit. Add `--diagnostic-only` after the commit for a short
ordinary-idle/stationary check. To reproduce the regression, run that command
against the retained clean old artifact on local port 8766 with commit
`d3edef36fc529ab051060524516168dc976a53ee`; it must fail the brightness check.

All commands above passed on clean code commit **01231e740c9387b444dea68e0eab6c38b411df57**,
before the final documentation commit. Rebuilding a later documentation head
produces that head's new identifier; supply it to the harness instead.

- Pinned full recompilation after the header edit and clean committed build
  passed. The next incremental build reported **ninja: no work to do**. Existing
  vendored JSON warnings only. Artifact/source guard passed: 47 GPL/config
  runtime files, no game assets. **52 individual Node 24.19.0 cases passed**.
- Final local temporal run: **53 images, zero global jumps or blank frames** in
  nine segments. Actual image intervals **241–416ms**, excluding group setup.
  All six stationary patch medians stayed **57.216**, including 1/3/2 batching.
  Each diagnostic callback had exactly one clear, upload and draw; overall
  **2,697 draws / 2,697 clears**. The initial active sample separately observed
  **132 successful SDL presentations**. Simulation tick stayed fixed throughout
  the paused diagnostic. These are distinct counters, not displayed FPS.
- Final anonymous public temporal run using `upstream`: **53 images, zero jumps
  or blank frames**, actual intervals **231–939ms**; **2,708 draws / 2,708 clears**;
  initial active sample **131 SDL presentations**. Visible header and full clean
  served commit matched. The original additive blend mode was retained.
- Visually reviewed both complete 53-image contact sheets and full-size frames:
  grass/HUD brightness stays steady, moving/firing units and cursor remain
  visible in view, field lines do not accumulate trails, no overbright/black
  frames. Guide and mission transitions remain visible and usable. No full
  unmodified mission victory or real-phone performance claim.
- Existing lifecycle suite passed actual Chromium focus loss/return, immediate
  held-input release, composed user/Guide/away pause, native callbacks advancing
  zero/one simulation tick, real persisted Back/Forward Cache restore and
  rendered pixels. Synthetic hidden/freeze/rotation/context-loss checks passed
  separately. A real CDP freeze event was not observed; actual OS freeze NOT RUN.
- Existing layout suite passed 568×320–915×412 landscape, portrait guidance,
  simulated safe areas, Guide, native P and actual map aiming/release at DPR
  1/2/3. Actual Safari cutouts/browser bars/rotation NOT RUN.
- Existing optional-performance suite passed default-off behavior, valid/invalid
  native operations, pause/away exclusion, real JSON export, frozen stopped
  reports and five record/abort/menu-or-retry cycles. Clock/scheduling unchanged;
  no ten-minute, used-memory, leak-free or displayed-FPS conclusion.
- Affected translation units compiled with native **GCC 14.2.0**, without
  `EMSCRIPTEN`, using SDL 3.2.22 public headers and the null-mixer define:

  ```sh
  mkdir -p build-web/local-only/native-include
  ln -sfn ../../cache/sysroot/include/SDL3 build-web/local-only/native-include/SDL3
  c++ -std=c++14 -fsyntax-only -DOPENFODDER_NO_MIXER -ISource -Ibuild-web/cmake/Source -Ibuild-web/local-only/native-include Source/Window.cpp Source/Fodder.cpp
  ```

  This is a native syntax compile, not a full linked native executable. All
  rendering changes are Emscripten-guarded; native-visible source is unchanged.
  Windows scope returns **native:false**. The normal Linux CI compile remains
  triggered by Source changes; observed CI/artifact status belongs in the draft
  PR. No workflow or protection was changed.

Before checks intentionally failed with nine stationary jumps at both rebuilt
master and the retained clean old public runtime; the final clean/public checks
passed. A separate investigation-only source sampler confirmed unchanged CPU
texels through the old build's diagnostic jumps. No test content was modified.

## Preview and source

Code/fix commit `1b7c4f3bbc96f1df9b2e5e095134c216b7ee83b7`;
harness transition correction / **published runtime**
`01231e740c9387b444dea68e0eab6c38b411df57`. Final documentation follows that
runtime commit. [Draft branch review](https://github.com/jbbejena/openfodder/pulls?q=is%3Apr+head%3Afix%2Fmobile-battlefield-flicker)
targets master and stays unmerged.

[Public preview](https://openfodder-phase-one.zanysky263.chatgpt.site): **Sites v14**,
visible **01231e740c93**; audience remains public, access revision 2.
Project `appgprj_6ae24fbe89788191a38778521e56e855`; saved version
`appgprj_6ae24fbe89788191a38778521e56e855~appgver_a71da610185c8191b164ddb907d46afe`;
deployment `appgdep_6ae3d6e62e308191add7201c111610f3` **succeeded**.
Matching hosting source `5b446e10f9379ebb3f97fce862a63f4637ea6075` was pushed before
saving/deploying. The archive contains only the static dist and hosting manifest;
source/notices are included, with executable modes retained. No profile/evidence
or game data was published.

Anonymous browser SHA-256 verification matched served HTML, JS, Wasm, support
data and build-info byte-for-byte against the clean local artifact. Wasm is
2,438,371 bytes, SHA-256
`ef5e3b859c83f40bf7b95d09072faa6c87ee207bda940f43a9220100c958c6e6`.
Core runtime/support **3,048,293 bytes**, plus external demo 223,382 =
**3,271,675 bytes** logically, before compression; source ZIP 1,968,706;
all hosted files/source/notices 5,135,589. Metadata/source are separate from the
core total. TLS verification remained enabled; temporary browser proxy-CA entries
were removed after public checks.

Engine/Scripts GPL source and notices accompany the runtime. No game assets are
hosted or uploaded: the browser fetches the existing pinned upstream files with
credentials omitted and checks hashes, or validates player-supplied local data.
Game-data mirroring permission remains unresolved and separate from source
licensing. Audio remains silent through the existing null backend.

## Physical iPhone Safari — NOT RUN

No physical iPhone is available to this session. Desktop Chromium, touch/viewport
emulation and the successful compiler do not prove iPhone acceptance. Other
Safari/WebKit/GPU backends, actual OS interruptions, Home Screen mode and the
inherited full mission/performance/storage gates remain unpassed.

1. Open https://openfodder-phase-one.zanysky263.chatgpt.site directly in Safari;
   no ChatGPT account is needed. Reload and verify **01231e740c93** in the header.
2. Load demo from GitHub (20 verified files), Start game, choose **LAND OF HOPE
   AND GLORY** and Deploy with cheats off. Wait for the normal entry fade.
3. Select Pan and drag upward to look south from the snowy starting strip onto
   the football pitch. Leave the camera still for at least 20 seconds. Grass and
   the tiny native HUD should keep the same brightness; the DOM controls stay
   steady. Troops/animations should remain visible when in view.
4. Exercise Move; hold Fire, aim, release; Pan and Follow; Guide open/close;
   switch apps and return using **Return to game**; abort/Retry and deploy again.
   The field should not flash, accumulate trails, overbrighten or turn black.
5. Record the iPhone model/iOS, build header, mission and actions, and a screen
   recording if the problem persists. Actual phone confirmation of this fix is
   the next required check; do not advance unrelated roadmap features.
