# Phone-only demo loading — 2026-10-28

Branch `web/iphone-file-import`, based on user-merged master
`f27963c93db6c65e8c8138f9e0a1b869521d11a4`. B05 actual iPhone Safari remains
**NOT RUN**. This change adds direct loading from the existing pinned upstream host with
local-file fallback, removing the computer-generated pack requirement; it does not implement touch combat or certify mobile readiness.

The merged build was rebuilt locally, passed the artifact/source guard, and
passed the existing desktop menu/map smoke test. The new shell then passed
`./scripts/build-web.sh`, `python3 scripts/check-web-artifact.py --allow-dirty`
and the updated `scripts/smoke-web.cjs` against the same pinned content.
The committed preview is rebuilt with its own visible fork commit before hosting;
publication identity/results are recorded below and in [draft PR #2](https://github.com/jbbejena/openfodder/pull/2).

## Published build and evidence

- Fork build: `b9abafba0601e1c6000658140e1d06ad4eae8296`, clean committed tree.
  Commits `c666734` and `b9abafb` add the fallback and direct-download launcher.
- [Preview](https://openfodder-phase-one.zanysky263.chatgpt.site): public, no sign-in required,
  Sites version 3; hosting source `945c954110b661daafb2948b148a273f9d22babc`;
  deployment `appgdep_6ae2637a92308191ab3b39bbae1dc68b` succeeded.
- [Web CI](https://github.com/jbbejena/openfodder/actions/runs/40767915225) passed;
  [artifact](https://github.com/jbbejena/openfodder/actions/runs/40767915225/artifacts/12850872585).
  No native Windows build was triggered by this web-only follow-up.
- Committed build: `./scripts/build-web.sh` and
  `python3 scripts/check-web-artifact.py` passed; updated desktop smoke passed
  including failed-upstream retry and real pinned upstream loading.
- Hosted Chromium verified visible `b9abafba0601`, 20 upstream GET requests,
  hash verification, menu and battlefield with cheats off. Menu/map screenshots
  were inspected locally. No Site authorization was sent to upstream.
  Engine-ready: 1,523 ms on one cold desktop navigation, not a phone benchmark.
- Initial hosted checks used supported Sites service access with TLS verification.
  The user then requested access without ChatGPT sign-in. Sites access changed
  to public (revision 2), preserving version 3 and its build/artifact.
- Anonymous verification: fresh Chromium context with no initial cookies,
  credentials supplied or authorization headers sent; HTTP 200, visible
  `b9abafba0601`, 20 upstream GETs, verified files, menu/battlefield and cheats off.
  Screenshots inspected locally. Engine-ready 2,378 ms on one desktop navigation.
  Evidence: `/workspace/public-hosted-result.json` and
  `/workspace/public-hosted-{menu,battlefield}.png`, not uploaded.
  A separate Python urllib probe returned HTTP 403; its cause was not diagnosed.
  The browser result above is a separate successful check, not a claim that every
  non-browser HTTP client works. Actual iPhone Safari remains **NOT RUN**.

| Check | Actual result |
| --- | --- |
| Select 19 extracted demo files | Verified; Start remains disabled; missing campaign path shown |
| Add an unexpected Settings.js | Rejected without executing it or losing the 19 verified files |
| Add the campaign from another picker visit | 20/20 verified; Start enabled |
| Start and choose Christmas Special | Desktop menu and rendered battlefield passed; screenshots inspected locally |
| Direct upstream download and retry | All 20 files verified; forced network failure blocked startup and offered retry; successful retry reached menu and battlefield with cheats off |
| Original `.ofdata` route | Corrupt pack rejected; valid pack and explicit cheat opt-in still work |
| Normal play / missing Wasm | Cheats off; failed download gives readable reload/error feedback |
| Network boundary | Browser requests were GET-only; no selected file uploaded |
| Narrow launcher layout | Chromium viewport check; not a native Safari file-picker test |
| Actual iPhone Files picker, Safari menu/map | NOT RUN; user checkpoint remains required |

Desktop: Chromium 154.0.8037.57, Playwright Core 1.57.0, Linux x86_64,
1100×900 DPR 1, mouse, SDL opengles2/WebGL1/SwiftShader. Evidence retained under
`build-web/local-only/iphone-import-evidence/` (individual files) and
`build-web/local-only/direct-final-evidence/` (committed direct loading).
Hosted evidence is retained locally at `/workspace/direct-hosted-result.json`
and `/workspace/direct-hosted-{menu,battlefield}.png`. Screenshots contain game art
and are not uploaded. The 390×844 launcher screenshot is viewport-only evidence.

The Site hosts no demo or campaign data. The default Load demo button fetches
all 20 files directly from the existing upstream raw GitHub host at Run `070a6086c62164e859fc3274b75b5f536fa9d902`; all 20 imported files
must match the existing manifest's names, lengths and SHA-256. No extra campaign,
retail files or executable scripts are accepted. Engine/Scripts/toolchain pins
remain unchanged. No C++/CMake or game-control code changed.

On the real phone: open the public preview in Safari (no sign-in), tap Load
demo from GitHub and wait for verification, then Start game. Rotate to landscape
and tap/briefly hold the campaign row. Record visible build, iPhone/iOS/Safari,
menu/map or the exact failure. Local-file import remains an optional fallback.

Measured size: 2,896,387 bytes (approximately 2.9 MB) cold runtime files plus
223,382 bytes for the two-mission demo, 3,119,769 bytes total before compression.
Matching source is an optional separate download (1,799,416 bytes). All hosted
files total 4,809,860 bytes, including source/notices. Full retail content was not bundled/measured.
A new grant is still needed to mirror/bundle the game data on our own host;
this implementation keeps those bytes at their existing upstream publisher.
