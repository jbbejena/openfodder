# Current handoff

Updated 2026-10-29. **MOB-011 diagnostics are implemented and publicly available.
The actual ten-minute iPhone Safari session, displayed-FPS target and inherited
phone gates remain NOT RUN. MOB-011 acceptance is blocked; M1/M2/M3 remain
unpassed.** No mobile-release or phone-performance claim.

## Branch and commits

Codex / `mobile/performance`, from fetched user-merged master
`9daff60dfa41f393214174217df05ec65df6171a` (PR #10), starting clean. Independent
implementation was user-authorized while inherited hardware gates stayed blocked.

- `d641978a44f396edcb392b218b56e627e287a782`: optional native submission/time measurements.
- `8503b174377318a4c9e257df36d1e8872029804e`: Guide recorder, bounded samples, loading/size metadata, local JSON export, tests and procedure.
- `60d56c56b0283fe01e7a27de0faca300bdb91869`: freeze stopped report metadata/loading; clear observations for a new recording.
- **Published/tested:** `d3edef36fc529ab051060524516168dc976a53ee`. Only the anonymous-host smoke assertion changes from `60d56c5`; engine/browser behavior is identical. Final documentation follows this application commit.

[Draft branch PR targeting master](https://github.com/jbbejena/openfodder/pulls?q=is%3Apr+head%3Amobile%2Fperformance)
records final head, observed CI and artifact links. Leave unmerged. Roadmap,
Phase 1 and MOB-004–010 are already on master through user merges. No force push,
workflow/protection change, dependency repin or asset upload.

## Delivered behavior

Guide → Performance test → Record closes Guide; the header shows REC/active time.
Stop/export cancels sampling, freezes identity/loading/measurements and downloads
local JSON. Pauses, menus, camera setup and away time are excluded. Reports
separate SDL submissions, RAF opportunities, native ticks and allocated Wasm
capacity; none automatically proves displayed FPS or physical-device acceptance.
At most 1800 one-second rows, 100 events and 30 minutes wall time; fixed histograms.
No idle sampler or telemetry. Startup retains only 20 content/deployment records.

New `Source/WebPerformance.*`, guarded presentation/stage/lifecycle/loop hooks;
`web/performance.js`/tests, Guide/CSS/bootstrap, packaging/guard and performance
smoke. [Contract/phone steps](docs/mobile/PERFORMANCE.md), [measured record](docs/mobile/test-runs/performance.md).
Original scheduling, Sleep(10), weapons, scale, touch controls, checkpoint ABI and
content are unchanged. No larger forces, tactical change, audio path or H Hour.
The earlier [black-field correction](docs/mobile/test-runs/lifecycle.md) remains;
older black screenshots/state-only passes are not rendered-game evidence.

## Actual commands and results

```sh
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
node --test --test-isolation=none web/*.test.cjs
python3 scripts/ci/windows_scope.py --base 9daff60dfa41f393214174217df05ec65df6171a --head HEAD
python3 -m http.server 8765 --bind 127.0.0.1 --directory build-web/cmake/dist
```

With `PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core`:

```sh
node scripts/smoke-web-performance.cjs http://127.0.0.1:8765 build-web/local-only/christmas.ofdata build-web/local-only/performance-final-evidence 60d56c56b0283fe01e7a27de0faca300bdb91869
node scripts/smoke-web-performance.cjs https://openfodder-phase-one.zanysky263.chatgpt.site upstream build-web/local-only/performance-public-final-evidence d3edef36fc529ab051060524516168dc976a53ee
```

- Pinned builds/incremental identity relinks and clean artifact/source guards passed: 47 GPL/config files, no assets. Existing vendored JSON warnings only. **52 individual Node 24.19.0 cases** across seven files passed.
- Local `60d56c5` and public `d3edef3` actual Wasm passed default-off, invalid native operations, positive submissions/pixels, Guide/synthetic-away exclusions, actual report download, stopped sampler and five recording/abort/menu-or-retry cycles. Exactly one native start/stop per recording. Fifteen actual native callbacks advanced zero/one simulation tick each; no display-cadence assumption.
- Public starting-area sample: 9.018 active seconds, 541 submissions, 59.99 submissions/active second, p95 ≤20ms; RAF 59.33 opportunities/second. Wasm capacity 24,903,680 bytes throughout five short restart observations. Not sustained combat, displayed phone FPS, used memory or proof of no leaks.
- Existing `smoke-web-layout.cjs`, `smoke-web-lifecycle.cjs`, `smoke-web-saves.cjs` passed locally at `60d56c5`, same arguments/pack with separate evidence directories: layout/DPR/safe-area/portrait/aim; real Chrome focus and persisted history return with pixels; actual IndexedDB close/reopen, invalid import, failed-write rollback, previous recovery and denied storage. No new goal fixtures or full combat win claimed.
- Chromium 154.0.8037.57 / Playwright Core 1.57.0, Linux SwiftShader, SDL opengles2/WebGL1, emulated touch. Main 844×390/DPR2; Guide 568×320 and 390×844. Screenshots inspected locally. Public HTTP 200/full clean ID, 40 pinned upstream requests across two loads; no page errors, non-GET/auth or upstream cookies. TLS verified; temporary proxy CA removed afterward.
- An initial public run failed only its incorrect end-of-run empty-cookie-jar assertion. Hosting sets anonymous visitor/bot cookies. Corrected QA checks a fresh anonymous context and credential-free upstream requests; final rerun passed. No account login. Cookie values are not exported/logged by the corrected harness.
- Desktop interception disables HTTP cache: first/reload timings are observations, not a verified cold/warm benchmark. Actual Safari cold/warm loads, ten minutes, heat and response remain open. Logs/evidence stay ignored under `build-web/local-only/performance-*`; no reports, profiles, screenshots or player exports uploaded.

## Preview, CI and provenance

[Public preview](https://openfodder-phase-one.zanysky263.chatgpt.site), **Sites v13**,
visible **d3edef36fc52**, no sign-in. Project
`appgprj_6ae24fbe89788191a38778521e56e855`; version
`appgprj_6ae24fbe89788191a38778521e56e855~appgver_98ea5e900a2c8191837ee149b5f4f5d0`;
deployment `appgdep_6ae3c6cf06c0819192517f771b680f7a`: succeeded.
Hosting source `69127411e5063da1441b8694f9559913ea69092a` was pushed before saving;
checkout `/workspace/sites/openfodder-phase-one`. Exact clean dist/matching source,
executable permissions and notices retained. Public audience/access revision 2
preserved. Version13 supersedes v12 with corrected QA source included.

Local Windows scope `native:false`; Ubuntu scope should run and compiler jobs
skip. Linux retains its Source-path build. **Observed** final CI/jobs/artifact
links belong in the PR. Final docs are committed before PR creation to avoid
duplicate builds; published runtime stays the application commit above.

Pins unchanged and recursive checkout clean: Run
`070a6086c62164e859fc3274b75b5f536fa9d902`, Scripts
`dad04730860bcdd1189aa8562860e379b0f5d783`, emsdk
`c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56`, emcc 4.0.23
`7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`, SDL 3.2.22,
CMake 3.31.6/Ninja 1.11.1. Core runtime/support 3,048,057 + external demo 223,382 =
**3,271,439 bytes** before compression, plus small JSON metadata. Optional source
1,959,286; all hosted files/notices/source 5,125,933. No game data mirrored/bundled.
GPL engine/Scripts terms and unresolved data-mirroring permission remain separate;
browser fetches existing pinned upstream or validates local player data.

## Remaining checks and next work

On actual iPhone: public URL → verify d3edef36fc52 → Load demo / Start / Deploy →
Guide → Performance test → model/iOS → Record → ten active minutes → Guide →
observations / Stop / Export. [Exact procedure](docs/mobile/PERFORMANCE.md).
No ChatGPT login, computer or local assets required. Safari-tab and Home Screen
separately; exercise retries and export before reload. Reload loses unexported
reports/live battle; Continue restores a supported mission-start checkpoint.

MOB-003/B05, MOB-007/008 phone acceptance, MOB-010 actual Safari/OS/audio and
MOB-011 sustained phone/cold-warm/response checks remain open. Null audio stays
silent. M1/M2/M3 remain unpassed. Next required work is physical-device evidence;
MOB-012 full mobile acceptance remains blocked on that evidence.

## Future handoff template

Task/status, branch/base, commits/review, deployed build; files/behavior;
commands/results and device/browser/input; preview/artifact/data provenance;
source/automated/emulated/real-device distinctions; failures/unperformed checks,
blockers and next dependency-ready or authorized independent work. Preserve user work.
