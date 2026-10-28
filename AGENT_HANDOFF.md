# Current handoff

Updated: 2026-10-28. **Phase 1 desktop build and standalone engine preview are
delivered. Actual iPhone Safari is NOT RUN; M1 remains unpassed.**

## Branch, commits and review

- [jbbejena/openfodder](https://github.com/jbbejena/openfodder), branch
  `build/mobile-phase-1`, created from fetched roadmap tip
  `6b851862a77c3dd9556b5cadae7c88d370b6095f` on `docs/mobile-browser-roadmap`.
  Engine base: `4312ff7c1abe3b6750483921893651d9d3c55b33`.
- [PR #1](https://github.com/jbbejena/openfodder/pull/1) included the roadmap and
  Phase 1 changes. The user merged it as `f27963c93db6c65e8c8138f9e0a1b869521d11a4`.
  The phone-file helper below is a separate branch/preview update.
- Focused commits: `0434d1e` (MOB-001 baseline), `570be27` (MOB-002 pinned build
  and local-file shell), `291de61` (MOB-003 CI/path filters). The subsequent
  documentation/handoff commit is visible at the PR head.
- **Current tested/deployed fork build: `b9abafba0601e1c6000658140e1d06ad4eae8296`**,
  Sites version 3. Original Phase 1 evidence at `291de61` is historical.
  Later documentation commits do not silently replace the preview.
- Implementation uses review branches; the user merged PR #1. No upstream
  repositories, pinned gitlinks or unrelated work were changed.

## Task status and player-visible behavior

| Task | Status | Evidence |
| --- | --- | --- |
| MOB-001 | Done | [Baseline](docs/mobile/BUILD_BASELINE.md): recursive revisions, exact file inventory/provenance, cheat/audio audit |
| MOB-002 | Done | [Build instructions](docs/mobile/BUILD.md), [test record](docs/mobile/test-runs/phase-1.md): clean/incremental build, desktop menu/map, normal cheats off and explicit diagnostic opt-in |
| MOB-003 | Blocked on final phone row | Cached web CI, artifact, native filters and deployed preview delivered; actual iPhone Safari map load not run because no phone is available |

The player taps Load demo from GitHub, waits for the exact files to verify,
starts the engine with cheats off, chooses Christmas Special and sees its first battlefield. Loading,
file/download failures and context loss have readable feedback. Diagnostics can
explicitly enable cheat keys. Browser audio remains disabled. No touch controls,
combat/force changes, persistent saves or H Hour implementation were added.

Changed files: CMake/web startup, `scripts/` build/pack/verification helpers,
`web/` launcher/config/manifest, legacy Windows helper (now WSL delegation), three
CI workflows, build/evidence documentation and planning/handoff entry points.

## Phone-only testing follow-up

Current branch: `web/iphone-file-import`, from merged master `f27963c`. The user
asked for a way to test on iPhone without a compiler/terminal, then requested
hosted files to simplify testing. The default launcher now offers **Load demo
from GitHub**: it fetches the 20 exact files directly from their existing pinned
upstream host, without sending Site credentials, and verifies all hashes before
startup. Browser runtime + demo is roughly 3.1 MB before compression. No game
content is mirrored or bundled on our host. Our own redistribution terms remain
unresolved. Download errors are retryable and partial data cannot start.

Commits: `c666734` (individual-file fallback), `b9abafb` (direct pinned upstream
loading). [Draft PR #2](https://github.com/jbbejena/openfodder/pull/2) targets
master and remains unmerged. Current hosted desktop verification passed: visible
`b9abafba0601`, 20 upstream GET requests without Site credentials, menu and
battlefield, cheats off. Screenshots were inspected locally. Engine-ready was
1,523 ms on one cold desktop navigation, not a phone benchmark.

As an alternative, the launcher accepts the 20 exact extracted demo files across separate Files
picker visits. A pinned upstream ZIP link and on-page instructions replace the
need to generate `.ofdata` on a computer. The existing pack route still works.

Only web shell/import logic, desktop smoke coverage and docs changed. Engine
C++/CMake, dependency/data pins and touch combat are unchanged. User-selected
files are hash-checked before mounting, remain in memory, and are never uploaded.
No game content has been added to hosting or source. Publication rights remain
unresolved; linking the existing upstream download is not a new license grant.

Local desktop checks passed for the original merged build, direct upstream
loading (including failed-download retry), and individual-file fallback: 19 files cannot start; an unexpected script is rejected while retaining
verified files; adding the campaign enables startup; menu and battlefield render
with cheats off. Existing pack opt-in/error checks also passed. A narrow launcher
layout check supplements this; it is not real iPhone Safari evidence. B05 stays
NOT RUN until the user tests the published preview on actual hardware.
See [the follow-up record](docs/mobile/test-runs/phone-file-import.md).

## CI follow-up: skip unnecessary Windows builds

User requested this after the Phase 1 handoff; starting revision `e615cfb` on the
same draft PR/branch. Windows runs `40759181284` and `40757427028` were canceled
because this PR changes only web-specific engine/CMake code and CI routing.

`windows-build.yml` now runs a small Ubuntu scope check before allocating the
Windows matrix. Shared/native C++ and headers, native CMake, Windows dependencies,
and actual compiler/test job edits keep Windows coverage. Literal Emscripten-only
CMake bodies and CI trigger/routing edits do not require Windows. Unknown CMake
syntax is conservative: run Windows. Manual dispatch remains available.

Validation: `python3 -m unittest discover -s scripts/ci -p 'test_*.py' -v` passed
all seven fixture tests, covering native changes, additions/deletions/renames,
web-only changes, CMake guards/nesting/ambiguity and workflow build-step changes.
`python3 scripts/ci/windows_scope.py --base origin/master --head HEAD` returned
`native: false` for the actual Phase 1 PR. The Windows matrix/build/test/deployment
steps were compared to the original job and are unchanged. This follow-up changes
CI only; at that point the deployed preview remained at `291de6153d68…` and B05
was not run. The current phone-only preview is recorded above.

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
  host the local pack, game assets or game-art screenshots. The browser now loads
  directly from the existing upstream host; our own mirror/bundle remains blocked.

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
- Artifact/source guard passed locally and in CI. Original hosted files totaled
  **4,783,792 bytes**; support `.data` contains 47 GPL/config files and no game assets.
  Current `b9abafb` artifact: **4,809,860 bytes** including optional source/notices;
  cold runtime **2,896,387 bytes**, plus **223,382 bytes** fetched from upstream.
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
  **owner-private**: sign in with the owner's ChatGPT account, tap Load demo from
  GitHub, then Start game. Local-file import remains an optional fallback.
- Sites version **3**, project `appgprj_6ae24fbe89788191a38778521e56e855`, deployment
  `appgdep_6ae2637a92308191ab3b39bbae1dc68b`: succeeded. Hosting source commit
  `945c954110b661daafb2948b148a273f9d22babc` mirrors engine/Scripts with its own
  manifest/provenance; shipped fork build ID is `b9abafba0601…`.
- Hosting checkout/manifest: `/workspace/sites/openfodder-phase-one/`. Bundled
  filesystem helpers were unavailable, so native Sites tools, authenticated
  ordinary Git and a deployment archive were used. No credential or generated
  output is committed in either source repository.
- [Current web CI: success](https://github.com/jbbejena/openfodder/actions/runs/40767915225).
  [Matching engine artifact](https://github.com/jbbejena/openfodder/actions/runs/40767915225/artifacts/12850872585)
  has 30-day retention; GitHub login may be required. Source/notices included;
  no player pack. [Original Phase 1 Linux native CI: success](https://github.com/jbbejena/openfodder/actions/runs/40757427139).
  [Windows native CI](https://github.com/jbbejena/openfodder/actions/runs/40757427028)
  was canceled in the user-requested CI follow-up above; no Windows pass is claimed.
- GitHub Pages setup returned HTTP 403 “Resource not accessible by integration”.
  No Pages site was created; Sites resolved the hosting requirement.
- Windows scope validation excludes this web-only Phase 1 diff while retaining
  shared/native coverage. Linux/web path filters still use the PR diff. Feature
  push/PR duplication is avoided; no protection was changed.

## Evidence limits and next checks

- **Original desktop record:** Linux x86_64 Chromium 154.0.8037.57, 1100×900 CSS viewport, DPR 1,
  mouse, SDL `opengles2` / WebGL 1.0 / ANGLE SwiftShader. Local engine-ready 343 ms,
  hosted 2,965 ms on single cold navigations; not phone benchmarks.
- **Deployed desktop:** actual menu/map and visible fork commit verified using
  supported Sites service access with TLS verification. Not an interactive owner
  sign-in or an iPhone test. Audience remains owner-only.
- **Actual iPhone Safari: NOT RUN** (no hardware). [Exact phone steps](docs/mobile/BUILD.md#actual-iphone-safari-checkpoint--not-run):
  open preview, record model/iOS/Safari/build, Load demo from GitHub, Start game,
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
