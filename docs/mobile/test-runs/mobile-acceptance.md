# MOB-012 acceptance evidence

Run 2026-10-29 Pacific / 2026-10-30 UTC. **Desktop acceptance groundwork is
implemented; physical-iPhone acceptance remains BLOCKED.** M1–M4 are unpassed.
The user authorized this independent work while confirming that the full phone
session had not yet been done.

## Source, preview and content

- Branch `qa/mobile-acceptance`, from fetched master
  `7c8413a159a51c9fbd6460f2bed2499bf36e3274` (user-merged PR #12), starting clean.
- Runner/report implementation `46e15fe0726d208fba23cffc681bcfe504563365`;
  cadence regression correction `62d28a7ef3b2fc23f2eb996443ba102ae9d30864`.
  Final documentation follows those commits.
- Exact tested [public preview](https://openfodder-phase-one.zanysky263.chatgpt.site):
  **01231e740c93**, full **01231e740c9387b444dea68e0eab6c38b411df57**, clean,
  Sites v14/public access revision 2. Preview/runtime unchanged by this QA task.
  The user reported that flicker appears fixed after reload; model/iOS/build
  details were not supplied, so this is an informal user observation rather than
  a completed phone checklist.
- Run `070a6086c62164e859fc3274b75b5f536fa9d902`, Scripts
  `dad04730860bcdd1189aa8562860e379b0f5d783`; verified recursive checkout/pins.
  Emscripten 4.0.23 `7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`, emsdk
  `c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56`, SDL 3.2.22,
  CMake 3.31.6/Ninja 1.11.1. No repins.
- Original Amiga Format Christmas Special, `mapm1` / LAND OF HOPE AND GLORY and
  `mapm2` / IT'S SNOW TIME!: 20 hash-verified files, 223,382 logical bytes.
  Launcher tests both player files and pinned upstream loading. Input/touch
  suites explicitly label separate in-memory ammo fixtures. This public run
  enables no goal fixtures; no game content or combat behavior is changed.
- Linux Chromium **154.0.8037.57**, Playwright Core **1.57.0**, Node **24.19.0**,
  SDL opengles2/WebGL1 on ANGLE/Vulkan **SwiftShader**. Desktop mouse and CDP
  touch/viewport emulation, including DPR 1/2/3. No physical iPhone, Safari,
  WebKit, alternate GPU, Home Screen or actual OS freeze measurement.

## Implementation and reproduced harness failures

`scripts/smoke-web-acceptance.cjs` runs all ten existing suites sequentially, writes
per-suite logs and a conservative 41-row `acceptance.json`, validates a full clean
runtime identity before/after, and records runner revision/script hashes. Fresh
output directories prevent stale reports/profile reuse. Failed independent suites
do not suppress later checks; timeouts and missing/wrong-build/incomplete reports
fail the run. A focused `--only` run cannot claim the full automated pass.

`scripts/web-acceptance-report.cjs` separates desktop observations, partial/fixture
coverage, physical checks and release gates. All phone cells remain NOT RUN;
short renderer submissions, capacity/restart observations and goal fixtures cannot
pass full combat, sustained phone, memory-leak or release acceptance. Visual
review is explicitly separate. No product/engine/timing/input/UI changes.

The full pass reproduced two outdated QA assumptions:

1. The old input harness tried Fire immediately after synthetic blur. The actual
   engine correctly rejected it as paused (`lifecycleReasons:20`), frozen at the
   same tick with held fire released. The harness now verifies that rejection,
   focuses the page, clicks the production **Return to game** button, and only
   then exercises Fire again. Desktop mission-menu evidence now correctly says
   DOM menu rather than native SDL menu.
2. The old performance harness asserted `samples.length<=5` regardless of
   elapsed recording time. A slower cycle can legitimately exceed that count.
   The corrected check uses wall time, monotonic sample timestamps, the 1800-row
   cap, and at least 950ms between scheduled one-second samples (50ms tolerance),
   while permitting the explicit stop sample immediately after a timer sample.
   Duplicate sampler chains still fail. Per-cycle reports now retain wall time
   and samples before validation for diagnosis.

**61 individual Node cases passed**, including wrong/dirty identity, missing or
incomplete reports, failed/partial suites, checklist coverage drift, refusal to
turn green desktop/fixture results into phone acceptance, slow valid recordings,
duplicate timers and intentional stop endpoints. Actual Wasm checks supplement
these unit cases; the unit cases do not stand in for gameplay.

## Commands actually exercised

```sh
node --test --test-isolation=none web/*.test.cjs
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
python3 scripts/ci/windows_scope.py --base 7c8413a159a51c9fbd6460f2bed2499bf36e3274 --head HEAD
```

The clean build/artifact guard ran at the first QA code commit `46e15fe`;
47 GPL/config runtime files, no game assets. Its next incremental build reported
**ninja: no work to do**. Native-visible inputs are unchanged; scope returns
`native:false`. Native compiler jobs are unnecessary for QA/docs-only changes.
Final-head web CI/artifact links and observed status are recorded in the draft PR.

```sh
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
CHROMIUM_PATH=/usr/bin/chromium \
node scripts/smoke-web-acceptance.cjs \
  https://openfodder-phase-one.zanysky263.chatgpt.site \
  build-web/local-only/christmas.ofdata \
  build-web/local-only/acceptance-verified-public-01231e7 \
  01231e740c9387b444dea68e0eab6c38b411df57
```

**Final complete invocation passed all ten suites**, with stable clean identity
before and after. The runner itself was commit `62d28a7ef3b2fc23f2eb996443ba102ae9d30864`.
`automatedChecksPassed:true`; `acceptance:BLOCKED`; **all 41 phone rows NOT RUN**.

| Suite | Result | Duration |
| --- | --- | --- |
| launcher | PASS | 17.16s |
| input | PASS | 23.88s |
| touch | PASS | 15.68s |
| camera | PASS | 19.14s |
| mission | PASS | 36.66s |
| saves | PASS | 22.56s |
| layout | PASS | 16.69s |
| lifecycle | PASS | 16.16s |
| performance | PASS | 65.65s |
| rendering | PASS | 54.28s |

The actual unmodified mission ended **lost** at native tick
**426**, cheats **false**.
The test then verified fresh-troop Retry, stable abort/cancellation, return/menu
and mapm2 replay. Saves used real persistent Chromium profiles: mission 2 and
native progress survived closing/reopening; invalid imports, failed sync rollback,
previous recovery, backup import and denied storage passed. No unmodified win
was asserted.

Temporal rendering: **53 actual composited canvas images**, **zero unexplained
jumps or black frames**, actual sample intervals **236–443ms**. Twelve stationary
images remained identical in patch brightness across 1/3/2 native-callback batching.
Visual review covered all 53 frames, the Guide transition and 35 UI screenshots;
full-size checkpoint, safe-area and return-modal images were also inspected.
Units/field/HUD remained visible with no persistent trails or overbright
accumulation. Controls/mission/save/return states matched their observed purpose.
Physical Safari geometry remains unverified.

Lifecycle passed actual Chromium tab focus and persisted Back/Forward Cache
restore; synthetic hidden/freeze/rotation/context-loss checks are labelled
separately. A real CDP freeze event was not established. Native callbacks advanced
zero/one tick; timing across physical display refresh rates remains untested.

Five performance record/stop/retry cycles passed the elapsed-time/cadence checks
with one native start/stop per session. Cycle wall time and sample count are
retained in `performance/cycle-*.json`. Observed allocated Wasm capacity and
short submission/RAF pacing are not used-memory, leak-free or rendered-phone-FPS
proof. No ten-minute on-device session was run.

Initial attempts remain under ignored `acceptance-public-01231e7` (obsolete
blur expectation) and `acceptance-final-public-01231e7` (obsolete fixed sample
count). They exited nonzero and were never reported as full passes. The final
attempt uses fresh evidence/profiles and the corrected harnesses. No failed
result is overwritten. Keep raw screenshots, browser profiles, local game pack,
checkpoint exports, performance reports and logs private/local; no evidence or
assets were uploaded. TLS verification stays enabled; temporary proxy-CA trust
is removed after browser QA.

## Complete standalone checklist disposition

The desktop column below includes explicit manual/prior-build review for
B01/B02/R02; the automated JSON conservatively leaves those manual rows NOT RUN.
A desktop pass remains desktop evidence. Physical phone results below are NOT
RUN even when an emulated counterpart passes. The original campaign's zero-ammo
content and the silent audio backend are explicit limitations.

| ID | Check | Desktop result/evidence | Physical iPhone |
| --- | --- | --- | --- |
| B01 | Clean pinned build produces HTML/JS/Wasm/data without missing dependencies | PASS (prior exact runtime + QA build): Pinned/clean/incremental build evidence in battlefield-flicker.md; current QA code build/guard also passed. | NOT RUN |
| B02 | Incremental rebuild and documented startup work from the recorded revisions | PASS (prior exact runtime + QA build): Pinned/clean/incremental build evidence in battlefield-flicker.md; current QA code build/guard also passed. | NOT RUN |
| B03 | The preview identifies the fork commit and loads the intended content | PASS: launcher | NOT RUN |
| B04 | A desktop browser reaches the menu and loads a map | PASS: launcher, rendering | NOT RUN |
| B05 | Actual iPhone Safari reaches the menu and displays the map | NOT RUN: Requires an actual iPhone Safari session. | NOT RUN |
| B06 | Missing data/download/renderer failure gives a useful error rather than a permanent blank screen | PASS: launcher, lifecycle | NOT RUN |
| B07 | Normal-play cheats are off; diagnostics are explicit | PASS: launcher | NOT RUN |
| B08 | Consecutive composited battlefield frames retain stable background/HUD brightness after entry fade and through controls/return/retry | PASS: rendering | NOT RUN |
| I01 | Select every available squad; selection feedback matches engine state | PASS: input, touch | NOT RUN |
| I02 | Move each squad to an intended destination | PASS: touch | NOT RUN |
| I03 | Hold fire, aim at another location, release; no stuck fire | PASS: touch | NOT RUN |
| I04 | Use available secondary weapons deliberately; displayed ammo matches engine state | NOT RUN: Original demo has zero secondary ammo. The touch suite uses an explicitly separate in-memory ammo fixture; it cannot pass ordinary-content weapon acceptance. | NOT RUN |
| I05 | A HUD tap cannot move/fire troops and one touch does not generate duplicate commands | PASS: touch | NOT RUN |
| I06 | Pan the camera without a stray movement/fire action | PASS: camera | NOT RUN |
| I07 | Add/remove a second finger during a gesture without leaking an unintended command | PASS: camera | NOT RUN |
| I08 | Aim/move coordinates stay correct after pan, resize and rotation | PASS: camera, layout | NOT RUN |
| I09 | Open help/menu, pause/resume, cancel targeting and return to play using touch only | PASS: mission, layout | NOT RUN |
| I10 | Finger cancellation, leaving the canvas and switching modes release held inputs | PASS: touch, camera, lifecycle | NOT RUN |
| U01 | Controls are readable and reachable around cutouts and the home indicator | PASS: layout | NOT RUN |
| U02 | Center battlefield stays usable; menus collapse and do not obstruct live combat | PASS: layout | NOT RUN |
| U03 | Portrait guidance is usable; rotating back restores a working landscape layout | PASS: layout | NOT RUN |
| U04 | Browser-bar changes do not clip controls or misalign targets | PASS: layout | NOT RUN |
| G01 | Start and complete the selected mission entirely with touch | NOT RUN: Requires an unmodified combat victory through touch. Empty-goal fixtures cannot pass this row. | NOT RUN |
| G02 | Lose/retry a mission and return to the menu without keyboard input | PASS: mission | NOT RUN |
| G03 | Abort has a clear outcome distinct from victory/defeat | PASS: mission | NOT RUN |
| G04 | Original desktop mouse/keyboard controls still work | PASS: input, layout | NOT RUN |
| S01 | Save at a documented supported checkpoint and wait for persistence acknowledgement | PASS: saves | NOT RUN |
| S02 | Close/reopen and restore the correct campaign/mission and surviving recruits | PASS: saves | NOT RUN |
| S03 | Malformed/incompatible save does not silently destroy the last valid checkpoint | PASS: saves | NOT RUN |
| S04 | Unavailable/denied storage gives clear feedback without a false saved indication | PASS: saves | NOT RUN |
| S05 | The UI accurately labels checkpoint limits; no unverified mid-battle resume promise | PASS: saves | NOT RUN |
| L01 | Background during combat; no unintended combat advance or catch-up burst on return | PASS: lifecycle | NOT RUN |
| L02 | Background while firing; held input is released | PASS: lifecycle | NOT RUN |
| L03 | A user-paused game remains paused through background/foreground transitions | PASS: lifecycle | NOT RUN |
| L04 | Interrupt/resume supported audio through normal user interaction without duplicate loops | BLOCKED: Web audio uses the null backend; audible recovery is unsupported. | NOT RUN |
| P01 | Record cold/warm load time, artifact/data size and renderer identity | NOT RUN: Sizes/renderer/loading are observed; current harness interception disables cache. Verified cold/warm phone comparison is not established. | NOT RUN |
| P02 | Record sustained frame pacing during at least ten minutes or the full mission if longer | NOT RUN: Short SDL/RAF diagnostics are not ten-minute on-device displayed-FPS measurements. | NOT RUN |
| P03 | Simulation/weapon timing remains correct across render rates | NOT RUN: Zero/one tick per callback is not cross-refresh-rate phone weapon-timing evidence. | NOT RUN |
| P04 | Repeated retry/menu/mission transitions show no unbounded memory/handler growth | NOT RUN: Short restart/capacity observations cannot prove no unbounded used-memory/handler growth. | NOT RUN |
| R01 | Accepted candidate has reproducible source/content revisions and linked evidence | NOT RUN: An accepted release candidate requires the remaining phone gates. | NOT RUN |
| R02 | Source/notices and data terms match what is actually distributed | PASS (current distribution boundary): GPL engine/Scripts/source/notices retained; 47 support files; no game assets hosted or newly uploaded. Data mirroring permission unresolved. | NOT RUN |

A01–A08 are later H Hour integration checks: **deferred / NOT RUN**, outside
MOB-012. MOB-013's accepted candidate/release is also pending.

## Prioritized remaining evidence

1. **Blocking: actual phone mission loop.** Record the exact build/model/iOS,
   reach the menu/map, exercise controls/rotation, complete an unmodified mission,
   and check real loss/retry/abort. The short user flicker observation does not
   supply the full session or a verified build/device identity.
2. **Blocking: actual Safari recovery.** Confirm mission-2 checkpoint save
   acknowledgement and real close/reopen/restore, held-fire interruption and
   explicit Return, Guide pause composition, actual Safari bars/rotation and
   Back/Forward behavior. Real OS eviction/freeze is not a synthetic event.
3. **Blocking: phone performance.** Ten active minutes or the full mission if
   longer, truthful first/repeat cache labels, responsiveness/heat, cross-refresh
   simulation/weapon timing and repeated transitions. SDL/RAF counters and Wasm
   capacity cannot satisfy displayed-FPS/used-memory/leak claims by themselves.
4. **Known limits:** original test content has no secondary ammunition; ammo
   fixtures are partial coverage. Audio remains unsupported by the null backend.
   Data mirroring terms remain unresolved; host the engine/Scripts/source/notices
   and retain the upstream/player-data route.

[Exact phone procedure and report fields](../ACCEPTANCE.md#actual-iphone-session--pending).
No tags, release promotion, new content, larger forces, tactical systems or H Hour
integration. [PR #13](https://github.com/jbbejena/openfodder/pull/13) was opened as a draft;
the user merged it as `e57872b8f9c66732527363fd64da8d04a0f5dc78`. Independent
[MOB-013 packaging preparation](../CANDIDATES.md) now exists; an accepted stable
baseline remains blocked on the required phone evidence.
