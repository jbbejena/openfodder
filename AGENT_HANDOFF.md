# Current handoff

Updated: 2026-10-28. **Phase 1 desktop build and standalone engine preview are
delivered. Actual iPhone Safari is NOT RUN; M1 remains unpassed.**

## Branch, commits and review

- [jbbejena/openfodder](https://github.com/jbbejena/openfodder), branch
  `build/mobile-phase-1`, created from fetched roadmap tip
  `6b851862a77c3dd9556b5cadae7c88d370b6095f` on `docs/mobile-browser-roadmap`.
  Engine base: `4312ff7c1abe3b6750483921893651d9d3c55b33`.
- [Draft PR #1](https://github.com/jbbejena/openfodder/pull/1), targeting `master`,
  includes **the roadmap documents plus Phase 1 changes**. Leave it unmerged.
- Focused commits: `0434d1e` (MOB-001 baseline), `570be27` (MOB-002 pinned build
  and local-file shell), `291de61` (MOB-003 CI/path filters). The subsequent
  documentation/handoff commit is visible at the PR head.
- **Tested/deployed fork build: `291de6153d68fce44d88d5cc95d3746e24667ec9`.**
  Later documentation commits do not silently replace the preview.
- No changes to master, upstream repositories, pinned gitlinks or unrelated work.

## Task status and player-visible behavior

| Task | Status | Evidence |
| --- | --- | --- |
| MOB-001 | Done | [Baseline](docs/mobile/BUILD_BASELINE.md): recursive revisions, exact file inventory/provenance, cheat/audio audit |
| MOB-002 | Done | [Build instructions](docs/mobile/BUILD.md), [test record](docs/mobile/test-runs/phase-1.md): clean/incremental build, desktop menu/map, normal cheats off and explicit diagnostic opt-in |
| MOB-003 | Blocked on final phone row | Cached web CI, artifact, native filters and deployed preview delivered; actual iPhone Safari map load not run because no phone is available |

The player selects the exact local demo pack, starts the engine normally with
cheats off, chooses Christmas Special and sees its first battlefield. Loading,
file/download failures and context loss have readable feedback. Diagnostics can
explicitly enable cheat keys. Browser audio remains disabled. No touch controls,
combat/force changes, persistent saves or H Hour implementation were added.

Changed files: CMake/web startup, `scripts/` build/pack/verification helpers,
`web/` launcher/config/manifest, legacy Windows helper (now WSL delegation), three
CI workflows, build/evidence documentation and planning/handoff entry points.

## Exact dependencies and content

- Run/data `070a6086c62164e859fc3274b75b5f536fa9d902`; nested Scripts
  `dad04730860bcdd1189aa8562860e379b0f5d783`. No `--remote` updates.
- emsdk `c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56`, Emscripten 4.0.23
  (`7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`), web SDL **3.2.22**,
  CMake 3.31.6 / Ninja 1.11.1. Full pins in BUILD.md.
- Christmas Special / LAND OF HOPE AND GLORY / `mapm1`: 20 files, 223,382 decoded
  bytes; [manifest](web/content-manifest.json) records every path/hash.
- **Game-data publication remains unresolved.** GPL engine/Scripts permissions do
  not cover the demo/campaign. No grant for those exact files was found. Do not
  host the local pack, game assets or game-art screenshots. Instant play without
  supplying a local pack remains blocked by that permission question.

## Commands and actual results

```sh
git submodule update --init --recursive
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
python3 scripts/make-local-web-pack.py
python3 -m http.server 8080 --directory build-web/cmake/dist
```

The single build command installs/checks its pins and packages engine/Scripts,
source and notices. Output: `build-web/cmake/dist/`; player pack:
`build-web/local-only/christmas.ofdata`, outside the served directory. Generated
output/downloads are ignored and uncommitted. Windows WSL wrapper was not tested.

- Clean CMake/object/output build with toolchain/SDL cache: **69.82 s**, 68/68 steps.
- Incremental: **2.34 s**, “no work to do”; identical hashes for all ten top-level
  output files. Fresh CI bootstrap/build: **150 s**, success.
- Artifact/source guard passed locally and in CI. Hosted files total **4,783,792
  bytes**; support `.data` contains 47 GPL/config files and no game assets.
- Desktop smoke command with installed Playwright Core 1.57.0:

```sh
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web.cjs http://127.0.0.1:8080/ \
  build-web/local-only/christmas.ofdata build-web/local-only/clean-evidence
```

Menu/map, visible commit, cheats off/explicit opt-in, missing/corrupt pack and
failed Wasm download checks passed. Actual WebGL context loss was also exercised:
readable reload/error feedback. Screenshots reviewed locally, not published.
Exact sizes/hashes/results are in [the test record](docs/mobile/test-runs/phase-1.md).

## Preview, hosting and CI

- [Standalone preview](https://openfodder-phase-one.zanysky263.chatgpt.site) is
  **owner-private**: sign in with the owner's ChatGPT account, supply the local pack.
- Sites version **1**, project `appgprj_6ae24fbe89788191a38778521e56e855`, deployment
  `appgdep_6ae251e240cc819185866b937294f5c9`: succeeded. Hosting source commit
  `e37ada656c7d0432072f588338f7dbb32a1dab03` mirrors engine/Scripts with its own
  manifest/provenance; shipped fork build ID is `291de6153d68…`.
- Hosting checkout/manifest: `/workspace/sites/openfodder-phase-one/`. Bundled
  filesystem helpers were unavailable, so native Sites tools, authenticated
  ordinary Git and a deployment archive were used. No credential or generated
  output is committed in either source repository.
- [Web CI: success](https://github.com/jbbejena/openfodder/actions/runs/40757426969).
  [Matching engine artifact](https://github.com/jbbejena/openfodder/actions/runs/40757426969/artifacts/12846461740)
  has 30-day retention; GitHub login may be required. Source/notices included;
  no player pack. [Linux native CI: success](https://github.com/jbbejena/openfodder/actions/runs/40757427139).
  [Windows native CI](https://github.com/jbbejena/openfodder/actions/runs/40757427028)
  was still installing existing vcpkg FFmpeg dependencies at handoff; do not claim
  Windows build/tests passed. Check the run/PR for updates.
- GitHub Pages setup returned HTTP 403 “Resource not accessible by integration”.
  No Pages site was created; Sites resolved the hosting requirement.
- Filters exclude documentation-only PRs and cover shared C++/CMake. PR path
  filters use the PR diff, so a docs update inside this implementation PR may
  still compile. Feature push/PR duplication is avoided; no protection disabled.

## Evidence limits and next checks

- **Desktop:** Linux x86_64 Chromium 154.0.8037.57, 1100×900 CSS viewport, DPR 1,
  mouse, SDL `opengles2` / WebGL 1.0 / ANGLE SwiftShader. Local engine-ready 343 ms,
  hosted 2,965 ms on single cold navigations; not phone benchmarks.
- **Deployed desktop:** actual menu/map and visible fork commit verified using
  supported Sites service access with TLS verification. Not an interactive owner
  sign-in or an iPhone test. Audience remains owner-only.
- **Actual iPhone Safari: NOT RUN** (no hardware). [Exact phone steps](docs/mobile/BUILD.md#actual-iphone-safari-checkpoint--not-run):
  open preview, record model/iOS/Safari/build, select pack from Files, Start game,
  reach menu, tap/briefly hold campaign row, display battlefield. Record failure
  if touch cannot select it. Full touch combat is Phase 2.
- No full mission, checkpoint/save round trip, lifecycle, phone performance,
  Home Screen/PWA or H Hour test. Reload loses data/state. Audio disabled.
- Zero-delay clicks can miss the sampled menu input; a brief hold was tested.
  A requestAnimationFrame warning remains; timing/performance is not certified.

Next Phase 1 check: **B05 actual iPhone Safari menu/map**, then close MOB-003/M1
only with that evidence. MOB-004 is dependency-ready for a separately authorized
Phase 2 task. Keep touch combat, cover/suppression, larger forces and H Hour deferred.

| Gate | Status |
| --- | --- |
| M1: reproducible preview + phone map load | Blocked on phone; build/CI/preview/desktop passed |
| M2: touch-only mission | Not run / no Phase 2 implementation |
| M3: persistence/lifecycle/phone performance | Not run |
| M4: standalone mobile baseline | Not run; depends on M1–M3 |
| M5/M6: H Hour fit/harness/round trip | Deferred |

## Future handoff template

- Task/status, starting revision/branch, final commit/PR, changed behavior/files.
- Actual commands/results, build/content identity, preview/artifact, device/input.
- Source-inspected / automated / emulated / real-device evidence and checkpoint limits.
- Failures/unperformed checks/blockers; next task and remaining dependencies.
