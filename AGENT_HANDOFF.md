# Current handoff

Updated 2026-10-29 Pacific / 2026-10-30 UTC. **MOB-012 desktop acceptance
work is implemented and all ten public browser suites pass. Formal iPhone
acceptance remains BLOCKED / NOT RUN; M1–M4 remain unpassed.** The user authorized
independent work after saying the full phone session had not yet been done.

## Branch, revisions and scope

Codex / `qa/mobile-acceptance`, from fetched clean master
`7c8413a159a51c9fbd6460f2bed2499bf36e3274`. That is the user's merge of
[PR #12](https://github.com/jbbejena/openfodder/pull/12), the battlefield flicker
fix. The user subsequently reported flashing appears fixed after reload;
model/iOS/build details and a structured session were not supplied. Treat it as
an informal user observation, not a full physical-device pass.

- `46e15fe0726d208fba23cffc681bcfe504563365`: one-command acceptance runner/report,
  six initial reporting safeguards, corrected legacy blur/Return expectation.
- `62d28a7ef3b2fc23f2eb996443ba102ae9d30864`: recorder cadence checks based on
  elapsed time; regression cases and per-cycle evidence. **Runner used for the
  complete verified public pass.** Final documentation follows these commits.
- [Draft branch review](https://github.com/jbbejena/openfodder/pulls?q=is%3Apr+head%3Aqa%2Fmobile-acceptance)
  targets master. Final head, observed CI/artifact links are recorded there.
  Leave unmerged; no force push, tag, release or baseline promotion.

No C++/engine, browser-product UI, combat/timing, input contract, dependency,
workflow/protection or hosting changes. New code is Node QA only. Current
preview stays on the already verified runtime below; no player reload is needed
for this QA-only PR. Touch/mission/save/lifecycle/performance and the flicker fix
are retained. H Hour, larger forces and tactical changes remain deferred.

## Delivered code and documentation

- `scripts/smoke-web-acceptance.cjs`: ten existing suites sequentially, full clean
  runtime identity before/after, fresh output/profile directories, per-suite logs,
  timeout/failure continuation, runner revision and script hashes, focused reruns.
- `scripts/web-acceptance-report.cjs`: all 41 standalone checklist rows; desktop,
  partial/fixture, physical-phone and release results remain distinct. Missing,
  wrong/dirty or incomplete reports cannot silently pass. Every phone cell stays
  NOT RUN; green automation cannot establish an accepted mobile release.
- `scripts/smoke-web-input.cjs`: verifies blur freezes/rejects Fire until the real
  Return button, instead of bypassing the current lifecycle policy. Corrects DOM
  mission-menu evidence wording.
- `scripts/assert-web-performance.cjs` and performance smoke: validate actual
  one-second sample cadence/wall time/endpoints and 1800-row cap instead of a
  fixed five-sample ceiling. Save local per-cycle reports before validation.
- `web/acceptance-report.test.cjs`: nine new meaningful Node cases. Original
  52 + new 9 = **61 individual cases passed**.
- [Acceptance command and phone procedure](docs/mobile/ACCEPTANCE.md),
  [complete measured 41-row record](docs/mobile/test-runs/mobile-acceptance.md),
  updated task/roadmap/playtest/build/performance notes. Current phone steps now
  verify 01231e740c93 rather than stale earlier build IDs. Flicker history records
  the user merge/apparent resolution.

## Commands and actual results

```sh
node --test --test-isolation=none web/*.test.cjs
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
python3 scripts/ci/windows_scope.py --base 7c8413a159a51c9fbd6460f2bed2499bf36e3274 --head HEAD
```

First QA code commit `46e15fe`: clean pinned build and source/artifact guard pass,
47 GPL/config runtime files, no game data; subsequent incremental **ninja: no
work to do**. Final code has 61 passing Node cases. Changes are QA/docs only;
Windows scope **native:false**. Native compiler matrices are unnecessary; final
cached web CI/artifact status is linked in the PR.

```sh
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
CHROMIUM_PATH=/usr/bin/chromium \
node scripts/smoke-web-acceptance.cjs \
  https://openfodder-phase-one.zanysky263.chatgpt.site \
  build-web/local-only/christmas.ofdata \
  build-web/local-only/acceptance-verified-public-01231e7 \
  01231e740c9387b444dea68e0eab6c38b411df57
```

**Final complete invocation: 10/10 PASS; identity stable; exit 0.** Structured
report says `automatedChecksPassed:true`, `acceptance:BLOCKED`; all 41 phone rows
NOT RUN. Initial attempts failed outdated blur/fixed-sample expectations, were
retained, corrected and rerun; no failed record was overwritten or called passed.

Actual unmodified mapm1 defeat (cheats off), fresh-troop Retry, abort/cancellation,
menu and mission-2 replay passed. Real Chromium IDBFS profile close/reopen restored
mission 2/native progress; invalid imports, backup, failed-write rollback,
previous recovery and denied storage passed. An unmodified combat victory remains
NOT RUN. Input/touch ammo fixtures are explicitly partial, separate evidence.

Actual Chrome focus and persisted Back/Forward Cache restore passed, with held
input released, explicit return and composed pause. Synthetic hidden/freeze/
rotation/context-loss checks passed separately; actual CDP freeze was not
established. Layout/aim/native P passed with DPR 1/2/3 and narrow/portrait sizes.
Five recorder/stop/restart cycles passed; capacity/short pacing do not prove used
memory, leaks, physical displayed FPS or ten active phone minutes.

**53 temporal composited frames: zero global jumps or blank frames**, actual
intervals 236–443ms. Reviewed all frames, Guide, 35 UI images and representative
full-size save/safe-area/return images. Units/field/HUD remain visible, no trails
or overbright accumulation, controls/overlays match observed states. This is
Linux Chromium **154.0.8037.57**, Playwright **1.57.0**, Node **24.19.0**,
opengles2/WebGL1 ANGLE/Vulkan **SwiftShader**, emulated touch. Not physical Safari.
Raw reports, profiles, exports, screenshots and local pack stay ignored under
`build-web/local-only/acceptance-*`; nothing uploaded. TLS verified; temporary
browser proxy-CA trust removed after QA.

## Preview, pins and publication boundary

[Public preview](https://openfodder-phase-one.zanysky263.chatgpt.site), **Sites v14**,
header **01231e740c93**, full clean runtime
`01231e740c9387b444dea68e0eab6c38b411df57`. No sign-in. Same live build before/after
all ten suites. This QA branch is newer source for tooling/docs, not a new
published engine. [Prior build/source/hash/publication record](docs/mobile/test-runs/battlefield-flicker.md).

Run `070a6086c62164e859fc3274b75b5f536fa9d902`; Scripts
`dad04730860bcdd1189aa8562860e379b0f5d783`; emsdk
`c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56`; emcc 4.0.23
`7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`; SDL 3.2.22;
CMake 3.31.6/Ninja 1.11.1. Original Christmas demo 20 files / 223,382 bytes;
mapm1 LAND OF HOPE AND GLORY, mapm2 IT'S SNOW TIME! No pins/content changed.

GPL engine/Scripts/source/notices remain hosted; no demo/campaign assets mirrored
or uploaded. Browser uses pinned hash-verified upstream or local player data.
Data-mirroring permission stays unresolved and separate from engine licensing.
Audio remains silent through the existing null backend.

## Blocking next checks

Follow [the exact iPhone procedure](docs/mobile/ACCEPTANCE.md#actual-iphone-session--pending):
verify **01231e740c93**, record model/iOS/Safari, full unmodified touch mission and
loss/Retry/abort; mission-2 briefing Save acknowledgement then real close/reopen/
Continue; held-fire interruption, Guide pause, rotation/bars and history return;
at least ten active minutes with observations and exported performance JSON.
Record every required phone row as observed pass/fail/blocked/not run.

Unmodified combat victory, physical-phone recovery/storage/layout/performance and
cross-refresh weapon timing remain unverified. Original demo's zero secondary
ammo and unsupported audible audio stay explicit limits. MOB-012 is **blocked**
on this evidence; MOB-013 accepted baseline remains pending. Fix reproduced
acceptance failures within scope; preserve the user-tested preview and all newer
work. No release, force-size/cover/suppression or H Hour work is authorized here.
