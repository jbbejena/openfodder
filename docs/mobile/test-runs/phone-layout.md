# MOB-007 verification — 2026-10-29

Implementation, local regressions and public desktop/emulation checks passed.
**MOB-007 is blocked on its actual iPhone layout acceptance. Actual iPhone Safari,
physical touch and a full touch-only mission are NOT RUN. M1/B05 and M2 remain
unpassed.** [Control/layout policy](../PHONE_LAYOUT.md).

## Exact source and publication

- Branch `mobile/phone-layout`, from user-merged master
  `15b5ff1aa63a1556f74ff35475c9d12c4d938cf3` (PR #6).
- **Tested/published implementation:** `ecdf5587ce784a12f22354ec2e5757c3225ddb66`.
  Later Markdown handoff changes do not change this artifact.
- [Branch PR](https://github.com/jbbejena/openfodder/pulls?q=is%3Apr+head%3Amobile%2Fphone-layout),
  draft to master, unmerged. Roadmap, Phase 1 and MOB-004–006 already belong to
  the base through the user's merges. The PR body/checks supply the final docs
  commit and CI/artifact links. No merge/force push was performed here.
- [Public preview](https://openfodder-phase-one.zanysky263.chatgpt.site): Sites
  version **7**, visible ID **`ecdf5587ce78`**, no sign-in; supersedes v6.
- Saved version `appgprj_6ae24fbe89788191a38778521e56e855~appgver_03a0657165b88191b2f6fef7dde65188`;
  deployment `appgdep_6ae2a1278f0c81918ce5d9962db642f1`: succeeded.
- Hosting source `2c6b6314c2f51197c2a8992b5375eaa82c03ba0b`, checkout
  `/workspace/sites/openfodder-phase-one`, project
  `appgprj_6ae24fbe89788191a38778521e56e855`. Matching source pushed before
  saving, static output packaged separately, public audience preserved.

Run `070a6086c62164e859fc3274b75b5f536fa9d902`, nested Scripts
`dad04730860bcdd1189aa8562860e379b0f5d783`, emsdk
`c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56`, Emscripten 4.0.23
(`7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`), web SDL 3.2.22,
CMake 3.31.6/Ninja 1.11.1: unchanged. Christmas Special / LAND OF HOPE AND GLORY /
`mapm1`, four soldiers in Squad 1, two empty squads, zero secondary ammo.

## Commands and results

```sh
node web/engine-bridge.test.cjs
node web/touch-controls.test.cjs
node web/phone-shell.test.cjs
node --test web/*.test.cjs
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
python3 scripts/ci/windows_scope.py \
  --base 15b5ff1aa63a1556f74ff35475c9d12c4d938cf3 --head HEAD
python3 -m http.server 8092 --bind 127.0.0.1 --directory build-web/cmake/dist
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-layout.cjs http://127.0.0.1:8092/ \
  build-web/local-only/christmas.ofdata build-web/local-only/phone-layout-final-evidence \
  ecdf5587ce784a12f22354ec2e5757c3225ddb66
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-camera.cjs http://127.0.0.1:8092/ \
  build-web/local-only/christmas.ofdata build-web/local-only/phone-camera-final-evidence \
  ecdf5587ce784a12f22354ec2e5757c3225ddb66
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
  node scripts/smoke-web-layout.cjs https://openfodder-phase-one.zanysky263.chatgpt.site/ \
  upstream build-web/local-only/phone-layout-hosted-evidence \
  ecdf5587ce784a12f22354ec2e5757c3225ddb66
```

- **28 Node cases passed:** eight coordinate/API, 17 ownership, three geometry.
  The existing CI wildcard includes the new shell tests.
- Pinned Wasm build and committed incremental relink passed. Artifact/source
  guard passed at the exact clean implementation commit: 47 GPL/config support
  files, 245,998 bytes in `.data`, no game assets.
- Windows scope returns **`native: false`** for this actual diff. The C++ change
  only permits pause bit 8 inside the existing Emscripten-only file guard.
  Native-visible code, CMake, pins and workflows are unchanged. The Windows
  compiler matrix should skip; Linux's existing Source-path native check still
  runs. See the final branch PR checks for observed CI results.
- Linux Chromium **154.0.8037.57**, Playwright Core 1.57.0, SwiftShader/WebGL1;
  CDP emulated touch at DPR 2/3, native desktop mouse/keyboard at DPR 1.
  **This is not Safari or physical touch/performance evidence.**

| Check | Actual Wasm observation, local and public |
| --- | --- |
| Landscape fit | 844×390, 812×375, 667×375, 568×320 and 915×412; all visible HUD buttons ≥44×44 CSS px, inside safe frame, no canvas overlap or page overflow |
| Cutout simulation | 44px side/21px bottom insets at 844×390; actual fitted canvas 402.5×283 CSS px, controls outside image |
| Browser-bar simulation | Synthetic visualViewport height 315px and offsetTop 24px; frame moved/resized, held fire released, controls remained in safe bounds |
| Guide | Touch open/scroll/close; Tab stays inside; P does not reach SDL; Escape closes without abort; no player ground command |
| Pause composition | User bit 1 + shell bit 8 gives mask 9 and frozen engine ticks; closing Guide preserves user pause; resume advances ticks |
| Contextual controls | Weapons replaces squad choices; actual zero ammo remains disabled, no ground order |
| Portrait | 390×844 with simulated top 47px/bottom 34px; prompt and Guide compose pause; opting in preserves user pause; rotation back restores actual world aim/hold/release |
| Coordinates | DPR 3 aim reaches exact native world pixels; displayed image aspect matches intrinsic canvas |
| Narrow desktop | 640×480 uses fitted native canvas without touch rails; native P pause/resume works |

The exact committed build also passed the camera smoke at DPR 1/2: threshold,
known +32/+24 native pan, both lift orders, third/HUD-first pointer ownership,
Fire cancellation, Pan/Follow, retained view/aim, resize and map-edge clamp.

Before the implementation commit, the same Wasm/code passed the adapted existing
`smoke-web-touch.cjs`, `smoke-web-input.cjs` and `smoke-web.cjs` regressions at
`15b5ff1` + local changes. These covered actual movement/aim/release, deliberate
secondary shots in the pre-existing **local-only browser-memory ammo fixture**,
queue/pause safety, native SDL menu/right-fire/P, modeless input harness,
disabled-touch resize, missing/corrupt packs, repeated local-file picks,
cheats opt-in/off, upstream failure/retry/menu/map and missing-Wasm feedback.
The later runtime edits only allow rail scrolling and restore canvas focus with
preventScroll; the final committed layout/camera checks include those changes.

The first layout run caught Tab leaving the native dialog at its final control;
explicit focus wrapping fixed it, and final local/public runs passed. An upstream
retry regression initially lacked this environment's browser proxy CA. Installing
that CA temporarily made the same launcher test pass; TLS stayed verified.
Chromium also needs the executor's network permission to start its local sockets.
Those environment issues do not establish a product or iPhone failure.

## Hosting/data evidence

Three fresh anonymous contexts: HTTP 200 and the full expected clean fork ID;
menu/map and all layout checks passed. Each downloaded **20 pinned, hash-verified
upstream files** (60 requests total), with no supplied authorization headers,
unexpected methods or page errors. Proxy CA trust was removed after the run.
Local/public screenshots were visually inspected, including landscape safe-area
fit, portrait guidance/play, Guide and narrow desktop. They remain local because
they contain game art. Representative geometry screenshots deliberately use user
pause, so combat buttons appear disabled there.

Top-level runtime/support files excluding `source.zip`: **2,964,600 bytes**;
demo from upstream: **223,382 bytes**, combined about **3.19 MB** before compression.
Optional matching source ZIP: 1,871,699 bytes. All hosted files including notices
and source: 4,949,593 bytes. No downloaded game files, player pack, synthetic
campaign, game-art screenshot or generated artifact was committed/uploaded to
the Site source. Our own game-data mirroring grant remains unresolved; engine
and GPL Scripts licenses are separate from data permissions.

Logs: `/workspace/phone-layout-committed-build.log`, `phone-layout-final.log`,
`phone-layout-hosted.log`, `phone-camera-final.log`, `phone-touch-regression.log`,
`phone-input-regression.log`, `phone-launcher-ca.log`, `phone-node-*.log`.
JSON/screenshots: `build-web/local-only/phone-layout-{final,hosted}-evidence/`,
`phone-camera-final-evidence/` and the corresponding regression evidence folders.

## Outstanding phone acceptance and next task

1. Open/refresh the public URL in **Safari** and verify **`ecdf5587ce78`**.
   Record iPhone model and iOS/Safari version; no ChatGPT login/PC/file import is needed.
2. Load demo → wait for 20 verified files → Start game → briefly hold Christmas
   Special. Record whether menu and snow battlefield display (B05).
3. In landscape, check that Guide, squads, Move/Fire/Pan, Cancel/Follow and Weapons
   remain readable/reachable around the cutout/home indicator. The rails should
   stay beside the unobstructed image with no page scrolling.
4. Open Guide; scroll it, then Back to game. Confirm the field pauses while open
   and resumes afterward. Try Move, Fire hold/aim/lift, Pan and Follow.
5. Rotate to portrait: confirm guidance; optionally Keep playing in portrait.
   Rotate back and check aim. Show/hide Safari bars and confirm controls and
   target mapping still fit. Record actual observations/failures against the build.

**None of these actual phone steps has run.** That missing hardware/session is
the precise MOB-007 blocker. M1/B05 and M2 remain unpassed. The next implementation
candidate is **MOB-008**, full touch mission menus/retry/abort/results; independent
investigation may continue under user authorization while this device gate stays
unpassed. Full mission, saves, lifecycle recovery, audio, sustained performance,
larger forces, tactical changes and H Hour remain outside this task.
