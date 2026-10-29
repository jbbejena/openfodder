# Phase 1 verification — 2026-10-28

Tester: Codex, automated desktop mouse plus local screenshot review. **No actual
iPhone or Safari session was available. M1 is not accepted on a phone.**

## Build and source identity

- Branch: `build/mobile-phase-1`, from fetched roadmap tip
  `6b851862a77c3dd9556b5cadae7c88d370b6095f` (engine code `4312ff7`).
- Tested/deployed fork commit: **`291de6153d68fce44d88d5cc95d3746e24667ec9`**,
  clean working tree. Later evidence/handoff commits do not change this preview.
- Baseline: `0434d1e`; browser implementation: `570be27`; CI: `291de61`.
- Run: `070a6086c62164e859fc3274b75b5f536fa9d902`; Scripts:
  `dad04730860bcdd1189aa8562860e379b0f5d783`. Gitlinks were not advanced.
- Emscripten 4.0.23 (`7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`),
  web SDL 3.2.22, CMake 3.31.6, Ninja 1.11.1. Full pins in [BUILD.md](../BUILD.md).
- Content: player-supplied Christmas Special pack (20 files, 223,382 decoded
  bytes; 298,685-byte `.ofdata`). First mission LAND OF HOPE AND GLORY / `mapm1`.
- Support `.data`: 47 GPL/config files, 245,998 bytes, **no game assets**.

## Actual commands and results

```sh
git submodule status --recursive
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
python3 scripts/make-local-web-pack.py
python3 -m http.server 8080 --directory build-web/cmake/dist
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web.cjs http://127.0.0.1:8080/ \
  build-web/local-only/christmas.ofdata build-web/local-only/clean-evidence
```

For the recorded clean run, moved the previous `build-web/cmake/` outside the
repository, then ran the same build command with no CMake/object/output directory.
Toolchain/SDL caches were retained. Result: **68/68 steps passed, 69.82 s**.
The initial empty-cache build also succeeded; CI independently bootstrapped its
empty SDK/SDL cache and built successfully in **150 s** (19:47:34–19:50:04 UTC).

Unchanged incremental run: **2.34 s**, Ninja “no work to do”. SHA-256 for all ten
top-level output files (including source.zip) was identical before/after. This
is repeatability in this checkout, not a cross-host byte-identical-build claim.
Artifact/source publication checks passed locally and in Actions. SDK's
experimental SDL3 warning and existing `micropather::PathNode` memset warning
were observed; neither was suppressed or converted to a failure.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| index.html | 1,726 | `101f3a0376d07b887f57c73c801675197937dd29fbbdc3724cc09c4722a0ca3b` |
| index.js | 240,212 | `cbf9cf1becf77c1cc0b32ad6f2961a3d2046a504eb7e90522021858d277dc401` |
| index.wasm | 2,391,738 | `68ee2d90413b049d2dc82afd18014af0f88e1d324a94a240f428bd8a8654070f` |
| index.data | 245,998 | `11fddc314672fd109fe9e43a3789f38dce0ef46b77a863070d0ab684c9aab7ac` |
| source.zip | 1,779,015 | `3dc1a2fd9a7d90479b994c39004ef47b96f00de02881399527fcd6de9f3c8de5` |

Total uncompressed hosted files including notices: **4,783,792 bytes**. Source,
build scripts, engine/dependency notices are included. No output or downloaded
game assets are committed in the fork or the hosting source repository.

## Desktop results

Linux x86_64; Chromium **154.0.8037.57** (Debian 13), Playwright Core **1.57.0**;
1100×900 CSS pixels, DPR 1, mouse. SDL renderer `opengles2`, WebGL 1.0 / ES2,
ANGLE Vulkan 1.3 SwiftShader (Subzero). This software GPU is not phone evidence.

| Check | Status | Observation |
| --- | --- | --- |
| B01 clean build | Pass | HTML/JS/Wasm/support data/source/notices; exact pins; CI cold bootstrap passed too |
| B02 incremental/startup | Pass | 2.34 s, no compile/link; unchanged hashes; documented command boots |
| B03 fork preview identity/content | Pass | Local and deployed header `jbbejena/openfodder · 291de6153d68`, no dirty marker; exact local pack accepted |
| B04 campaign menu/map | Pass, desktop only | Menu row visible; 200 ms mouse hold selected campaign; snow map, troops and squad sidebar visible; no fatal JS errors |
| B05 real iPhone Safari menu/map | **Not run** | No real iPhone available; exact phone steps in BUILD.md |
| B06 missing data/download | Pass | No pack disables Start with instructions; changed AFXBASE.BLK rejected before mounting; valid replacement accepted; aborted Wasm request shows readable error/reload guidance |
| B06 renderer interruption | Pass for context loss | `WEBGL_lose_context` exercised against the actual menu context; error tells player to reload and does not promise a saved battlefield |
| B07 normal/diagnostic defaults | Pass | Normal launch/menu/map reports cheats off; separate explicit checkbox launch reports cheats on |

Screenshots reviewed locally: `build-web/local-only/clean-evidence/menu.png`,
`battlefield.png`, plus `/workspace/hosted-menu.png` and `hosted-battlefield.png`.
They contain game art and are deliberately absent from the public PR/artifact.
Raw local machine-readable results: `build-web/local-only/clean-evidence/desktop.json`.

One cold local navigation to engine-ready took **343 ms** (runtime log 239 ms).
One hosted navigation took **2,965 ms** (runtime log 796 ms), with network/service
access overhead. These are individual desktop observations, not a performance
benchmark, phone measurement, or time to a playable mission. Map selection is a
separate user action. Warm-cache and sustained performance were not measured.

## Published preview and CI evidence

- [Standalone preview](https://openfodder-phase-one.zanysky263.chatgpt.site) —
  **owner-private**, sign in with the owner's ChatGPT account. No audience change.
- Sites version **1**, project `appgprj_6ae24fbe89788191a38778521e56e855`;
  deployment `appgdep_6ae251e240cc819185866b937294f5c9`, succeeded 19:50:13 UTC.
- Hosting source commit `e37ada656c7d0432072f588338f7dbb32a1dab03` mirrors the
  engine/Scripts source with a separate `.openai/hosting.json` and provenance
  record. Build output was archived for deployment, not committed. The full
  matching **fork** commit inside the artifact remains `291de6153d68…`.
- Native Sites create/save/private-deploy tools and authenticated ordinary Git
  plus a static deployment archive were used. Bundled Sites filesystem helpers
  were unavailable in this environment. Site checkout/manifest is retained at
  `/workspace/sites/openfodder-phase-one/`; no credential is persisted there.
- Verified deployed HTTP 200, engine-ready, visible fork commit, campaign menu,
  battlefield and cheats off in desktop Chromium using the supported Sites
  service-access header. TLS verification stayed enabled; the environment proxy
  CA was added to Chromium's trust store for QA. This was **not** the owner's
  interactive sign-in flow or a real iPhone session. Anonymous access correctly
  returns a sign-in-required page.
- [Web CI run](https://github.com/jbbejena/openfodder/actions/runs/40757426969):
  **success**, including cold build, publication guard and cache save.
- [Download engine artifact](https://github.com/jbbejena/openfodder/actions/runs/40757426969/artifacts/12846461740)
  (2,567,543-byte ZIP, 30-day retention; GitHub login may be required).
- [Linux native run](https://github.com/jbbejena/openfodder/actions/runs/40757427139):
  **success**. [Windows native run](https://github.com/jbbejena/openfodder/actions/runs/40757427028):
  still in progress at this record, installing its existing vcpkg FFmpeg dependencies.
- All three workflow YAMLs parsed; representative filters checked: docs/handoff
  excluded, shared C++/headers/CMake included, web entry/shell excluded from native
  compilation. One PR run per workflow and no duplicate feature-push run observed.
  GitHub evaluates PR path filters against the PR diff; updating documentation
  within this implementation PR can still match its existing code changes.
- [Draft PR #1](https://github.com/jbbejena/openfodder/pull/1), targeting `master`,
  includes the roadmap documents and Phase 1 changes. Unmerged.

## Limits and remaining gates

1. **Real phone gate:** B05 is not run. Follow [the exact iPhone checkpoint](../BUILD.md#actual-iphone-safari-checkpoint--not-run).
   Open the preview, supply the local pack, reach the menu and display the map.
   Record device/iOS/Safari/build. Do not infer success from the desktop result.
2. **Bundled-data gate:** no rights-holder redistribution grant for the exact
   selected demo/campaign was found. No demo/campaign bytes were uploaded.
   Instant play without a local file remains blocked by that permission question.
3. Audio is disabled. No full mission, touch combat, save round trip, lifecycle,
   phone performance, Safari/Home Screen or H Hour test has run.
4. A zero-delay desktop click can miss the legacy sampled menu input; the tested
   action is a brief hold. No touch-control fix is claimed. The legacy runtime
   emits a requestAnimationFrame timing warning; MOB-010/011 must investigate
   timing/lifecycle rather than inferring mobile performance from this smoke run.
5. Windows native CI completion remains to check. GitHub Pages creation was
   blocked by integration permissions (HTTP 403); no Pages site was created.

MOB-001 and MOB-002 have acceptance evidence. MOB-003 has its CI, downloadable
artifact and deployed preview; its actual-iPhone acceptance row remains blocked
by missing hardware. M1 stays unpassed. The next Phase 1 check is B05. MOB-004 is
dependency-ready for a separately authorized Phase 2 task; no Phase 2 work was done.

## Subsequent Windows CI follow-up

After the original record, the user requested skipping Windows for these web-only
changes. Runs `40757427028` and `40759181284` were canceled; neither establishes a
Windows pass. The workflow now gates Windows runners with a small Ubuntu native-
input check. Seven git-fixture tests passed locally and the actual Phase 1 diff
returned `native: false`. Shared C++/headers, native CMake/dependencies and Windows
compiler-job edits retain coverage; ambiguous CMake runs Windows conservatively.
Only CI/docs changed; the tested/deployed game build and unperformed phone gate
above remain the same. [Details](../BUILD.md#ci-and-preview).
