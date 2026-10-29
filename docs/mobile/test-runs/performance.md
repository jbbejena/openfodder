# MOB-011 performance diagnostics verification

2026-10-29. **Recorder implemented; actual phone acceptance blocked.** Branch
`mobile/performance` starts at user-merged master
`9daff60dfa41f393214174217df05ec65df6171a` (PR #10). Engine clock, renderer
scale, weapons and content/toolchain pins are unchanged.
[Phone procedure and metric definitions](../PERFORMANCE.md).

## Exact build and environment

- Native instrumentation `d641978`, Guide/report `8503b17`, frozen stopped reports `60d56c56b0283fe01e7a27de0faca300bdb91869`; final public application **`d3edef36fc529ab051060524516168dc976a53ee`**, dirty=false. The last commit corrects only the anonymous-host smoke assertion; engine/browser behavior is identical to the local regression build `60d56c5`. Final Markdown follows.
- [Public preview](https://openfodder-phase-one.zanysky263.chatgpt.site), visible **d3edef36fc52**, Sites **v13**, anonymous access. Hosting source `69127411e5063da1441b8694f9559913ea69092a`; version `appgprj_6ae24fbe89788191a38778521e56e855~appgver_98ea5e900a2c8191837ee149b5f4f5d0`; deployment `appgdep_6ae3c6cf06c0819192517f771b680f7a` succeeded.
- Linux Chromium 154.0.8037.57 / Playwright Core 1.57.0, SwiftShader, SDL `opengles2` (WebGL1), emulated touch. Main viewport 844×390/DPR2; scrollable Guide checked at 568×320 and 390×844, screenshots reviewed.
- Original Christmas demo `mapm1`, four deployed troops; nine allocated slots and three squads. Run `070a6086c62164e859fc3274b75b5f536fa9d902`, Scripts `dad04730860bcdd1189aa8562860e379b0f5d783`, emcc 4.0.23, SDL 3.2.22. Exact pins in build-info and [build instructions](../BUILD.md).

## Desktop observations, not phone benchmarks

Short **starting-area** recordings, not sustained ordinary combat or a ten-minute
session. Automation polls state/takes screenshots, adding overhead. Desktop QA
intercepts requests, **disabling browser HTTP cache**; network/CDN caches are
uncontrolled. First/reload observations below are not verified cold/warm-cache
results. Shipping reports leave cache state unknown; tester labels are separate.

| Measurement | Local `60d56c5` | Public `d3edef3` |
| --- | ---: | ---: |
| Active sampling window | 9.355s | 9.018s |
| Successful SDL submissions | 510 | 541 |
| Submissions per active second | 54.52 | 59.99 |
| Submission interval p95 upper bound | 21ms | 20ms |
| Longest submission interval | 305.4ms | 59.3ms |
| Failed presents | 0 | 0 |
| RAF opportunities/second | 55.18 | 59.33 |
| Wasm capacity start/peak/end | 24,903,680 bytes | 24,903,680 bytes |

Neither submissions nor RAF proves physical displayed FPS. Capacity is allocated
linear memory, not used heap/total Safari RAM. Sustained 30 rendered FPS on phone
is **not established**. No tuning is justified by these software-rendered results.

| Observed wall time (ms) | Local first | Local reload | Public first | Public reload |
| --- | ---: | ---: | ---: | ---: |
| Navigation → engine/storage/adapters ready | 417.9 | 262.9 | 2337.5 | 1252.5 |
| Local pack read / upstream fetch + verification | 28.7 | 37.3 | 696.7 | 558.0 |
| Start click → native menu stage | 270.3 | 113.5 | 255.7 | 106.3 |
| Deploy click → native battlefield stage | 39.2 | 33.3 | 48.1 | 46.3 |

Stage timings precede guaranteed presentation; composited screenshots separately
verify snow, troops and sidebar. Public first/reload loaded 20 exact upstream
files each (40 requests total), with SHA-256/size verification. No page errors,
non-GET/auth headers or upstream cookies. TLS verified; temporary browser proxy
CA removed afterward. Fresh anonymous context, no imported login/storage state.
The host may issue anonymous visitor/bot-management cookies.

Core runtime/support: **3,048,057 bytes** before compression; external demo:
**223,382 bytes**, 20 files; combined 3,271,439 plus small JSON metadata. Optional
source 1,959,286; all hosted files 5,125,933. `build-info.runtime_files_bytes`
gives logical file sizes, verified by the artifact guard. Compressed transfer and
Safari memory are not inferred. No game data/player pack hosted. GPL source terms
and unresolved demo mirroring permission remain separate.

## Commands and checks

The [handoff](../../../AGENT_HANDOFF.md) records full commands and commits. Ran:

```sh
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
node --test --test-isolation=none web/*.test.cjs
python3 scripts/ci/windows_scope.py --base 9daff60dfa41f393214174217df05ec65df6171a --head HEAD
```

Passed pinned builds/incremental identity relinks, clean source/artifact guard
(47 GPL/config files/no assets), **52 individual Node 24.19.0 cases**. Only
existing vendored JSON warnings. New cases cover percentile bounds/overflow,
opt-in, pause gaps, frozen snapshots, restart cleanup, sample/event/time limits
and runtime failure. Invalid native operations cannot reset an active session.

Actual-Wasm `smoke-web-performance.cjs` passed locally at `60d56c5` and publicly
at `d3edef3`, using [the documented arguments](../PERFORMANCE.md):

- No sampler before opt-in; positive submissions and composited battlefield pixels.
- Guide and synthetic blur/return gaps exclude active time/frames and freeze engine ticks. Stop freezes counters/identity/loading snapshot; real JSON download parsed and matched build/content metadata. `tenMinutesActive` was false.
- Fifteen actual native callbacks advanced zero/one tick each; normal scheduler unchanged, no assumption of one callback per display frame.
- Five recording/abort/menu-or-retry cycles: one native start/stop each, no stopped sampling, three sample rows/three context events each publicly (three–four rows locally), capacity 24,903,680 in every cycle. A short observation cannot prove no long-term allocation or handler leaks.
- Repeat navigation records a new load with honest cache limits. Public baseline exported 15 rows/eight events. Bounds of 1800/100 were tested deterministically, not by claiming a thirty-minute hardware run.

`smoke-web-layout.cjs`, `smoke-web-lifecycle.cjs`, `smoke-web-saves.cjs` passed
locally at `60d56c5` using the original local pack: layout/DPR/safe-area/portrait/
native aim; real Chrome focus and persisted Back/Forward Cache return with pixels;
actual IndexedDB close/reopen, invalid imports, failed-write rollback, prior
recovery and denied storage. Synthetic lifecycle signals are labeled separately;
actual OS freeze was not established. No new goal fixtures or full combat win.

Initial public v12 (`60d56c5`) reached/exported successfully but failed only its
final incorrect empty-cookie-jar assertion. Hosting sets anonymous visitor/bot
cookies. Corrected QA starts anonymous and verifies credential-free upstream
requests; it allows hosting cookies and never logs/exports their values. Final
v13 rerun passed. No application login/data route change.

Evidence is ignored under `build-web/local-only/performance-{final,public-final,
layout,lifecycle,checkpoints}-evidence/` and associated logs. No screenshots,
profiles, raw reports, checkpoint exports or assets in Git/CI/Sites. Matching
source was pushed before saving/deploying exact clean output and notices. Local
Windows scope is `native:false`; observed CI/artifact links belong in the
[draft branch PR](https://github.com/jbbejena/openfodder/pulls?q=is%3Apr+head%3Amobile%2Fperformance).
Final documentation precedes PR creation to avoid duplicate builds.

## Real device — NOT RUN

No actual iPhone is available here. Safari cold/warm loads, ten active minutes
or full mission if longer, sustained displayed FPS, physical touch/weapon
response, heat, long-run memory, OS interruptions and Home Screen are **NOT RUN**.
Audio remains unsupported by the null backend. Unchanged clock/source and short
callback checks do not establish weapons across real display refresh rates.
M1/M2/M3 remain unpassed; MOB-011 acceptance and MOB-012 remain blocked.

On iPhone verify d3edef36fc52; Load demo → Start → choose mission → Deploy →
Guide → Performance test → model/iOS → Record. Play ten active minutes with
movement/fire/camera/retries, then Guide → observations → Stop → Export to Files.
[Full instructions](../PERFORMANCE.md) separate Safari-tab/Home Screen and
first/repeat loads. No ChatGPT sign-in or computer required.
