# Current handoff

Updated 2026-10-29. **FIX-MOBILE-FLICKER implemented, desktop and public-preview
temporal checks passed. Actual physical iPhone Safari confirmation: NOT RUN.**
M1/M2/M3 and inherited phone/full-mission/performance gates remain unpassed.
This is a bounded rendering fix; no unrelated roadmap advancement.

## Branch, commits and review

Codex / `fix/mobile-battlefield-flicker`, from fetched master
`8bf8290f2f78e5d4a3c2b44128c2d935037c5c6d` (user-merged PR #11), starting clean.
Fetched master again before handoff: still that revision. Unrelated local work
was preserved. No worktree was needed; Run/Scripts pins stayed unchanged.

- `1b7c4f3bbc96f1df9b2e5e095134c216b7ee83b7`: pre-redraw clear, temporal regression and claim.
- `01231e740c9387b444dea68e0eab6c38b411df57`: isolate ordinary samples from mission transitions; **clean published/tested runtime**.
- Final documentation follows that runtime commit. Final branch head and CI are
  visible in the [draft branch review](https://github.com/jbbejena/openfodder/pulls?q=is%3Apr+head%3Afix%2Fmobile-battlefield-flicker), targeting master. **Leave unmerged**.

The roadmap/Phase 1 and MOB-004–011 were already merged onto master. Preserve
all newer touch, camera, mission, checkpoint, lifecycle and optional-performance
work. No force push, dependency/CI/protection change or release.

## Demonstrated cause and correction

The original MP4 is unavailable here; its described frames were not independently
inspected. Rebuilt current master reproduced idle flashing. The prior live
preview actually served clean `d3edef36fc529ab051060524516168dc976a53ee`, rather
than the recording's `1de52e57c4c185dde254f679209d253af6009c82`.

The complete base texture is additive. Web `FrameEnd` presented without clearing,
so multiple complete native redraws before one browser composite added the same
pixels together. Idle grass alternated RGB green 80/160/240/255; the original HUD
brightened too. A stationary 1/3/2-callback diagnostic failed on the old clean
runtime with **nine global jumps**, while CPU grass texels remained green 80.
Palette restart/CSS scaling were not the demonstrated cause.

Emscripten-only `Window::FrameBegin` now clears to opaque black immediately
before a complete redraw, including the legacy paused composition. `FrameEnd`
still presents exactly once per completed image and records its result; it does
not clear afterward. No new image/lifecycle-paused callback clears the canvas.
Existing additive overlays, palette fades and the earlier black-field correction
remain. Native presentation and simulation scheduling/Sleep(10) are unchanged.

Changed implementation: `Source/Window.cpp`, `Source/Window.hpp`,
`Source/Fodder.cpp`, `scripts/smoke-web-rendering.cjs`. Documentation: this file,
`docs/mobile/BUILD.md`, `TASKS.md`, `PLAYTEST.md` and the new
[full reproduction/verification record](docs/mobile/test-runs/battlefield-flicker.md).

## Commands and actual results

Run at code commit `01231e740c9387b444dea68e0eab6c38b411df57`, before final docs:

```sh
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
node --test --test-isolation=none web/*.test.cjs
python3 scripts/ci/windows_scope.py --base 8bf8290f2f78e5d4a3c2b44128c2d935037c5c6d --head HEAD
python3 -m http.server 8765 --bind 127.0.0.1 --directory build-web/cmake/dist
export PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core
```

```sh
node scripts/smoke-web-rendering.cjs http://127.0.0.1:8765 build-web/local-only/christmas.ofdata build-web/local-only/flicker-final-01231e7 01231e740c9387b444dea68e0eab6c38b411df57
node scripts/smoke-web-rendering.cjs https://openfodder-phase-one.zanysky263.chatgpt.site upstream build-web/local-only/flicker-public-01231e7 01231e740c9387b444dea68e0eab6c38b411df57
```

Existing `smoke-web-lifecycle.cjs`, `smoke-web-layout.cjs` and
`smoke-web-performance.cjs` passed locally with the same URL/pack/commit and
separate `build-web/local-only/flicker-{lifecycle,layout,performance}` evidence.

- Pinned build, committed build and incremental **ninja: no work to do** passed;
  source/artifact guard passed (47 GPL/config runtime files; no game assets).
  **52 individual Node cases passed**. Existing vendored warnings only.
- **53 local + 53 anonymous public composited images** across idle, stationary
  batching, real touch Move/held Fire/release, Pan/Follow, Guide, synthetic
  interruption/explicit return and Retry: **zero unexplained jumps or blanks**.
  Reviewed both full sequences visually: stable grass/HUD, visible moving/firing
  units, no persistent trails/overbright accumulation. Stationary patch luminance
  remained 57.216 across all 12 images. Old runtime fails the same check.
- Six 12×12 background patches, 4/6 same-direction >12/255 and >20% threshold;
  requested post-capture gap 90ms, actual local intervals 241–416ms / public
  231–939ms. Fades/recentering/Guide/ending transitions excluded. QA-only paused
  batching leaves simulation tick fixed; no production fixtures/controls added.
- Diagnostic callbacks each had one clear/upload/draw. Overall local GL
  draws/clears 2,697/2,697; public 2,708/2,708. Initial active samples separately
  observed 132/131 successful SDL presents. Neither counter establishes displayed
  FPS. Existing performance export/cycle checks passed without timing changes.
- Lifecycle: actual Chromium focus and persisted Back/Forward Cache restore,
  held-input release, composed pause and rendered pixels passed. Synthetic
  hidden/freeze/rotation/context-loss tests passed separately. Actual CDP freeze
  was not established. Layout/aim/native P passed at DPR 1/2/3 and narrow/portrait
  sizes. Physical Safari/OS behavior remains NOT RUN.
- Native GCC 14.2 syntax compilation of affected Window/Fodder units passed
  without EMSCRIPTEN, using SDL 3.2.22 public headers and null-mixer define;
  [exact command/limits](docs/mobile/test-runs/battlefield-flicker.md). Native-visible
  code is unchanged. Windows scope **native:false**; Linux compile retains normal
  Source triggering. Full linked native CI/artifact status is recorded in the PR.
- An initial harness run outlived the ordinary squad and attempted Follow after
  defeat. It now retries between bounded action groups and excludes native
  ending transitions explicitly; no demo/combat changes. Full revised runs pass.

## Public preview and reproducibility

Open **https://openfodder-phase-one.zanysky263.chatgpt.site**, **Sites v14**, header
**01231e740c93**, full runtime commit above. No ChatGPT sign-in. Anonymous public
QA loaded the same 20 hash-verified upstream files and matched the visible ID.
Served HTML/JS/Wasm/support data/build-info hashes also matched the clean artifact.
Wasm SHA-256 `ef5e3b859c83f40bf7b95d09072faa6c87ee207bda940f43a9220100c958c6e6`.

Project `appgprj_6ae24fbe89788191a38778521e56e855`; saved version
`appgprj_6ae24fbe89788191a38778521e56e855~appgver_a71da610185c8191b164ddb907d46afe`;
deployment `appgdep_6ae3d6e62e308191add7201c111610f3` **succeeded**.
Hosting source `5b446e10f9379ebb3f97fce862a63f4637ea6075` pushed before saving;
public access revision 2 preserved. Source/notices/executable modes retained;
no assets, test evidence or profiles uploaded. Temporary browser proxy CA removed.

Run `070a6086c62164e859fc3274b75b5f536fa9d902`; Scripts
`dad04730860bcdd1189aa8562860e379b0f5d783`; emsdk
`c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56`; emcc 4.0.23
`7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`; SDL 3.2.22;
CMake 3.31.6/Ninja 1.11.1. Core runtime/support 3,048,293 + external demo 223,382 =
3,271,675 logical bytes before compression; source ZIP 1,968,706, all hosted files
5,135,589. GPL engine/Scripts terms remain separate from unresolved data-mirroring
permission. Browser fetches pinned existing upstream or validates local data.

## Next check — physical iPhone Safari NOT RUN

On iPhone: open public URL → verify **01231e740c93** → Load demo / Start →
**LAND OF HOPE AND GLORY (mission 1 / mapm1)** → Deploy, cheats off. After the
entry fade, Pan south from the snowy strip onto the football pitch. Observe
stationary grass/HUD for 20 seconds, then Move, held Fire/release, Pan/Follow,
Guide open/close, app interruption / explicit Return, and abort/Retry. Record
model/iOS/build/actions and any continuing flash. [Exact phone steps](docs/mobile/test-runs/battlefield-flicker.md#physical-iphone-safari--not-run).

No physical iPhone, Safari/WebKit or alternate GPU was tested here. Audio stays
silent through the null backend. Actual phone rendering, ten-minute performance,
full touch mission/storage and inherited M1/M2/M3 gates remain open; MOB-012
acceptance is blocked on that evidence. No tactical, force-size, engine or H Hour
integration work was advanced. Prior contracts/evidence remain in
[LIFECYCLE.md](docs/mobile/LIFECYCLE.md), [PERFORMANCE.md](docs/mobile/PERFORMANCE.md),
[CHECKPOINTS.md](docs/mobile/CHECKPOINTS.md) and their linked test records.
