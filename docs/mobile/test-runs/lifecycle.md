# MOB-010 interruption and rendering verification

2026-10-29, Codex. `mobile/browser-lifecycle` from user-merged master
`965b90f3105e5861057e27b36937e66268f4f09d` (PR #9). Pins/user work preserved.
Application/preview **`1de52e57c4c185dde254f679209d253af6009c82`**, clean,
visible **`1de52e57c4c1`**. Commits: `a5e61a8` rendering/pixel guard; `b6fbf09`
lifecycle; `1de52e5` callback-observer test. Final Markdown does not change runtime.

Linux Chromium **154.0.8037.57**, Playwright Core 1.57.0, SwiftShader/WebGL1,
emulated touch at 844×390/DPR 2; real browser focus and history navigation.
Christmas Special `mapm1`/`mapm2`, Run
`070a6086c62164e859fc3274b75b5f536fa9d902`, Scripts
`dad04730860bcdd1189aa8562860e379b0f5d783`. Same emsdk
`c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56`, emcc 4.0.23
`7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`, SDL 3.2.22,
CMake 3.31.6/Ninja 1.11.1.

**Actual iPhone Safari, physical touch, OS lock/app suspension, audible audio and
Home Screen launch: NOT RUN.** M1/M2/M3 and inherited device gates remain unpassed.
[Policy, native boundary and audio audit](../LIFECYCLE.md).

## Findings and corrections

1. **Black battlefield, fixed.** Saved MOB-008/009 battlefield screenshots were
   black despite working DOM/native state checks. The DOM menu path omitted the
   pending palette fade; web `Phase_Cycle` excludes native palette fading. The
   web renderer also omitted explicit SDL3 presentation. This branch advances
   the pending palette in the web loop and presents SDL3 batches, within existing
   Emscripten branches. Current screenshots visibly show snow, troops and sidebar.
   `assert-web-frame.cjs` now checks composited canvas PNG pixels in lifecycle and
   launcher smokes. **Older state/DOM passes and affected visual claims do not
   establish visible gameplay; use this build's evidence.**
2. **Return tap blocked by mission input gate, fixed.** The new recovery modal is
   allowed through the shell's overlay gate. Return works above briefing/Guide,
   keeps their pause, and remains reachable after rotation. Context-loss error
   handling closes recovery so the existing Reload route remains accessible.
3. **Automation limits distinguished.** Playwright keeps document visibility
   emulated; disabling focus emulation allowed real focus loss but did not yield
   a real document `freeze` event after CDP's request. That freeze probe is **not
   run/established**, while synthetic freeze/visibility and a real persisted
   Back/Forward Cache round trip passed. History navigation uses CDP's actual
   history entry because a cache restoration does not fire another load event.
4. **Timing check corrected.** Multiple existing engine callbacks can occur per
   display frame. The final test observes the pinned Emscripten runtime's actual
   pre/post callback hooks without changing cadence: fifteen callbacks each
   advanced native mission time by zero or one tick. No display-FPS or sustained
   phone-performance conclusion is drawn. Direct WebGL-buffer reads were also
   unsuitable after presentation; the pixel guard reads composited screenshots.

## Actual checks

```sh
node --test web/*.test.cjs
build-web/tools/venv/bin/cmake --build build-web/cmake --target clean
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
./scripts/build-web.sh
python3 scripts/ci/windows_scope.py \
  --base 965b90f3105e5861057e27b36937e66268f4f09d --head HEAD
python3 -m http.server 8095 --bind 127.0.0.1 --directory build-web/cmake/dist
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-lifecycle.cjs http://127.0.0.1:8095/ \
  build-web/local-only/christmas.ofdata build-web/local-only/lifecycle-release-evidence \
  1de52e57c4c185dde254f679209d253af6009c82
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-lifecycle.cjs https://openfodder-phase-one.zanysky263.chatgpt.site/ \
  upstream build-web/local-only/lifecycle-hosted-evidence \
  1de52e57c4c185dde254f679209d253af6009c82
```

Passed: **44 individual Node cases** (also run directly across six files: 6 saves,
9 bridge/geometry, 6 lifecycle, 17 ownership, 3 fitting, 3 mission presentation).
This environment groups `node --test` output as six passing file jobs; CI reports
individual cases. Clean build at `b6fbf09` completed 69 tasks using cached pinned
tools; incremental build had `ninja: no work to do`. The final test-only commit
recompiled About/relinked for identity and passed exact artifact/source guard:
47 GPL/config files, no game assets. Existing bundled JSON warnings only.

| Check | Local/public observation on exact preview build |
| --- | --- |
| Transition race | Accepted Deploy stayed at briefing while interrupted; new commands returned paused; Return applied retained Deploy |
| Real focus loss while firing | Held emulated-touch fire released synchronously in the native call, at the same native tick; clock remained fixed during absence; focus restoration kept Return latch; no inherited firing |
| Independent pauses | User + Guide + lifecycle = 25; Return left 9, close Guide left 1, explicit user unpause alone resumed time; P/Escape under recovery could not bypass/abort |
| Synthetic freeze/resume | Released fire and held native time before another callback; required explicit Return; distinct from genuine browser/OS freeze |
| Visibility/rotation | Synthetic hidden bit immediately released fire; portrait while interrupted stayed frozen; Return retained portrait pause until landscape |
| Repeated persisted signals | Three synthetic persisted pagehide/pageshow cycles retained UI timers; subsequent native Abort/result/menu/mapm2 flow updated correctly |
| Real Back/Forward Cache | Same document token and real persisted pageshow; existing mapm2, controls and rendered pixels restored via explicit Return |
| Pixels | Composited battlefield samples exceeded the blank threshold before/after focus and after real cache restoration; screenshots inspected for actual art/UI |
| Context-loss route | Synthetic graphics loss while recovery was open closed the modal and exposed Reload/error feedback |

Public run: fresh browser context, HTTP 200/full clean fork ID, 20 pinned/hash-
verified upstream files, no page errors/non-GET requests/authentication headers.
TLS remained verified with a temporary browser proxy CA, removed afterward.

## Regression scope

On `b6fbf095792ba73c6753f96a8e3449e8b97dc558` (same runtime implementation;
`1de52e5` changes only test sampling/identity), these passed:

```sh
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-layout.cjs http://127.0.0.1:8095/ \
  build-web/local-only/christmas.ofdata build-web/local-only/lifecycle-layout-evidence \
  b6fbf095792ba73c6753f96a8e3449e8b97dc558
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-saves.cjs http://127.0.0.1:8095/ \
  build-web/local-only/christmas.ofdata build-web/local-only/lifecycle-saves-evidence \
  b6fbf095792ba73c6753f96a8e3449e8b97dc558 --fixtures
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web.cjs http://127.0.0.1:8095/ \
  build-web/local-only/christmas.ofdata build-web/local-only/lifecycle-launcher-evidence
```

Layout: DPR 1/2/3, 568×320–915×412, simulated safe areas/browser bars, Guide
focus/scroll, composed pause, portrait/aim/release, narrow native P. Saves: real
IndexedDB profile close/reopen, native progress, previous selection, backup
replacement, rejection/failure/denied storage/recovery; local empty-goal fixture
round-tripped four returning recruits and deployed mapm2. That fixture is **not
an unmodified combat victory**. Launcher: partial/corrupt/unexpected-file rejection,
local/upstream menu and **rendered** battlefield, retryable network failure,
cheats off/explicit opt-in and Wasm failure. No unmodified victory was played in
this task; prior engine defeat evidence does not substitute for phone acceptance.

Logs `/workspace/lifecycle-{clean-build,incremental-build,release-build,release,hosted,layout,saves,launcher}.log`;
JSON/screenshots under ignored `build-web/local-only/lifecycle-*-evidence/`.
Profiles, progress exports and screenshots stay local; none is uploaded as a Site
or CI artifact. [Draft branch PR/checks](https://github.com/jbbejena/openfodder/pulls?q=is%3Apr+head%3Amobile%2Fbrowser-lifecycle)
record observed final CI and downloadable PR-head artifact. Actual branch Windows
scope returns `native:false`; Ubuntu scope checks run, compiler jobs should skip.
Linux retains its existing Source-path native build; no workflow/protection changed.

## Publication and remaining acceptance

- [Public preview](https://openfodder-phase-one.zanysky263.chatgpt.site), no login:
  **Sites v11**, **`1de52e57c4c1`**, source commit above.
- Version `appgprj_6ae24fbe89788191a38778521e56e855~appgver_087a8a2014a08191bf01314cd013a07a`;
  deployment `appgdep_6ae3b8fd480081918891c80df0ed86c1`: succeeded.
- Hosting source `2c77a94d2a5bd7d4c6317b6cf93110e3d3fcc1be`, pushed before
  saving; clean output packaged separately. Same project/manifest/public audience
  revision 2; no source, dependency or data pin replaced with latest.
- Runtime/support 3,027,663 bytes + upstream demo 223,382 = **3,251,045 bytes**
  before compression. Optional source 1,932,326; total host files/notices/source
  5,073,283. No game assets/player pack mirrored; exact upstream files remain
  external. Own demo-mirroring permission unresolved, separate from GPL rights.

[Phone steps](../BUILD.md#try-interruptions--actual-iphone-not-run): verify build,
load demo/Deploy, hold Fire then switch apps/lock, return and check pause/release,
tap Return; repeat with Guide/manual pause, rotation and Back/Forward. Record
model/iOS, Safari versus Home Screen and errors. **All actual device steps remain
NOT RUN.** Audio is still unsupported: null backend despite existing sound data;
audible start/resume/duplicate-stream acceptance is not passed. MOB-010 device/
audio acceptance and M3 remain open. Next bounded work: MOB-011 instrumentation/
performance measurements, with sustained phone results requiring a real device.
