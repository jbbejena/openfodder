# Phone-only file import — 2026-10-28

Branch `web/iphone-file-import`, based on user-merged master
`f27963c93db6c65e8c8138f9e0a1b869521d11a4`. B05 actual iPhone Safari remains
**NOT RUN**. This change removes the computer-generated pack requirement from the
launcher; it does not implement touch combat or certify mobile readiness.

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
| Original `.ofdata` route | Corrupt pack rejected; valid pack and explicit cheat opt-in still work |
| Normal play / missing Wasm | Cheats off; failed download gives readable reload/error feedback |
| Network boundary | Browser requests were GET-only; no selected file uploaded |
| Narrow launcher layout | Chromium viewport check; not a native Safari file-picker test |
| Actual iPhone Files picker, Safari menu/map | NOT RUN; user checkpoint remains required |

Desktop: Chromium 154.0.8037.57, Playwright Core 1.57.0, Linux x86_64,
1100×900 DPR 1, mouse, SDL opengles2/WebGL1/SwiftShader. Evidence retained under
`build-web/local-only/iphone-import-evidence/`; screenshots contain game art and
are not uploaded. The 390×844 launcher screenshot is viewport-only evidence.

The Site hosts no demo or campaign data. Its link points to the already-public
upstream ZIP at Run `070a6086c62164e859fc3274b75b5f536fa9d902`; all 20 imported files
must match the existing manifest's names, lengths and SHA-256. No extra campaign,
retail files or executable scripts are accepted. Engine/Scripts/toolchain pins
remain unchanged. No C++/CMake or game-control code changed.

On the real phone: open the preview, sign in as its owner, download the upstream
ZIP, tap it in Files → Downloads to extract it, select all 19 files inside
Data/AmigaFormat_XMAS, use the picker again for Campaigns/Amiga Format Christmas
Special.ofc, then Start game. Rotate to landscape and tap/briefly hold the
campaign row. Record visible build, iPhone/iOS/Safari, menu/map or exact failure.
