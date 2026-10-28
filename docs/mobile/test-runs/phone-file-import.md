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
publication identity/results are also linked from the follow-up draft PR.

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
`build-web/local-only/iphone-import-evidence/`; screenshots contain game art and
are not uploaded. The 390×844 launcher screenshot is viewport-only evidence.

The Site hosts no demo or campaign data. The default Load demo button fetches
all 20 files directly from the existing upstream raw GitHub host at Run `070a6086c62164e859fc3274b75b5f536fa9d902`; all 20 imported files
must match the existing manifest's names, lengths and SHA-256. No extra campaign,
retail files or executable scripts are accepted. Engine/Scripts/toolchain pins
remain unchanged. No C++/CMake or game-control code changed.

On the real phone: open the preview in Safari, sign in as its owner, tap Load
demo from GitHub and wait for verification, then Start game. Rotate to landscape
and tap/briefly hold the campaign row. Record visible build, iPhone/iOS/Safari,
menu/map or the exact failure. Local-file import remains an optional fallback.

Measured size: approximately 2.9 MB cold runtime files plus 223,382 bytes for the
two-mission demo, around 3.1 MB before compression. Matching source is an optional
separate download (around 1.8 MB). Full retail content was not bundled/measured.
A new grant is still needed to mirror/bundle the game data on our own host;
this implementation keeps those bytes at their existing upstream publisher.
