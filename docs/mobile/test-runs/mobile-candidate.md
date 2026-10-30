# MOB-013 candidate preparation — measured record

2026-10-29 Pacific / 2026-10-30 UTC. **Preparation implemented; accepted baseline
BLOCKED.** The user explicitly authorized packaging while phone acceptance is
pending. Every generated artifact remains **UNAPPROVED**. No tag, release,
public promotion or accepted-mobile claim.

## Source and artifacts

Branch `release/mobile-candidate`, from fetched clean master
`e57872b8f9c66732527363fd64da8d04a0f5dc78` (user-merged PR #13).
Implementation/tested packaging source **77186d1d7adc97ba1970cb680b9e080fdee6b2c3**;
final documentation follows that commit. No C++/engine/UI, gameplay/timing,
input/save/audio, dependency pin or native workflow changes.

| Role | Runtime commit | ZIP bytes | SHA-256 | Approval |
| --- | --- | --- | --- | --- |
| New local candidate | `77186d1d7adc97ba1970cb680b9e080fdee6b2c3` | 2,849,320 | `c976bad09b57e0174f7157ca70101e3854902721269a4046d0713f36d2486304` | UNAPPROVED |
| Retained exact preview | `01231e740c9387b444dea68e0eab6c38b411df57` | 2,811,897 | `3e24f216795737a223b12a166056272ce80dd63ab01b73518204086fec799fc2` | UNAPPROVED |

Local files (ignored, not committed/uploaded as source):

- `build-web/candidates/openfodder-mobile-77186d1d7adc97ba1970cb680b9e080fdee6b2c3-c976bad09b57-unapproved.zip`
- `build-web/candidates/openfodder-mobile-01231e740c9387b444dea68e0eab6c38b411df57-3e24f2167957-unapproved.zip`
- Their adjacent `.sha256` files. The current manifest references the previous
  filename/source/digest; it does not embed or implicitly approve the old ZIP.

The previous payload came from retained hosting-source `dist/`, matching the
already verified public v14 artifact. The new package's source/notices and
full support payload were checked against Git before creation. Every outer
file is covered by manifest/checksums; whole-ZIP checksums include the manifest,
README and verifier as well. Immutable output names include source and digest.
No game assets, local pack, screenshot, profile or player export are included.

## Actual commands/results

```sh
python3 -m unittest discover -s scripts -p 'test_web_candidate.py' -v
node --test --test-isolation=none web/*.test.cjs
python3 scripts/check-web-artifact.py --dist /workspace/sites/openfodder-phase-one/dist --ref 01231e740c9387b444dea68e0eab6c38b411df57
python3 scripts/package-web-candidate.py --from-dist /workspace/sites/openfodder-phase-one/dist --expect-commit 01231e740c9387b444dea68e0eab6c38b411df57
python3 scripts/package-web-candidate.py --previous-candidate build-web/candidates/openfodder-mobile-01231e740c9387b444dea68e0eab6c38b411df57-3e24f2167957-unapproved.zip
python3 scripts/check-web-artifact.py
```

- **11 Python tests passed**: deterministic bytes; no approval; changed Wasm;
  missing/edited source; extra assets/profiles/support bytes; missing notices;
  dirty builds; wrong source/digest; traversal/duplicates/symlinks; refuse
  overwrite; previous reference; historical Git verification despite later
  worktree edits. Tests use synthetic payloads and establish no game/device gate.
- **61 existing Node cases passed.** Pinned build and new source/artifact guard
  passed on clean `77186d1`. Source comparison verifies the complete committed
  source set, matching browser files/licenses and every contiguous support-data
  offset; this strengthens the prior byte-presence guard. All 47 support files
  are GPL Scripts/config; no game assets. No compiler/toolchain repins.
- Packaging the same verified dist/previous reference again produced the same
  ZIP path and full checksum **c976bad09b57e0174f7157ca70101e3854902721269a4046d0713f36d2486304**. Existing output was reused,
  not rewritten. This proves deterministic packaging of these inputs, not a
  bit-identical clean engine rebuild across timestamps or platforms.
- Both ZIPs verified/extracted into fresh directories. Embedded `tools/` verifier
  passed from `/tmp` with `PATH=/nonexistent`: no Git/SDK/checkouts required for
  archive verification. A second extraction to each existing destination was
  rejected and left the files intact. Extracted bytes matched every ZIP entry.
- The previous extracted dist matched the retained public artifact byte-for-byte.
  A local HTTP server first served the new complete dist through an owned symlink.
  After its smoke passed, one atomic symlink replacement selected the previous
  complete dist. HTTP build-info/JS/Wasm/support bytes matched the previous
  artifact exactly; a fresh browser then identified **01231e740c93** and rendered
  the map. Production hosting was not involved.

Browser commands, same server/port before and after the local switch:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory build-web/local-only/candidate-current
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core node scripts/smoke-web.cjs http://127.0.0.1:8765 build-web/local-only/christmas.ofdata build-web/local-only/candidate-current-evidence
# After atomically selecting candidate-restored-previous/dist:
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core node scripts/smoke-web.cjs http://127.0.0.1:8765 build-web/local-only/christmas.ofdata build-web/local-only/candidate-rollback-evidence
```

Both actual Wasm smokes passed: source header/full clean identity, menu and map,
normal cheats off/diagnostics opt-in, local-file validation, failed upstream retry,
working pinned upstream route and missing-Wasm error feedback. Both local-pack
and upstream battlefield screenshots had **26 sampled composited colors**.
Screenshots inspected: visible snow/grass, troops and native HUD, matching header,
no blank battlefield. This is Linux **Chromium 154.0.8037.57 / Playwright Core
1.57.0**, desktop mouse, 1100×900/DPR1, SDL opengles2/WebGL1 on SwiftShader;
**physical iPhone Safari NOT RUN**. Existing [MOB-012 evidence](mobile-acceptance.md)
remains scoped to public runtime 01231e7, not automatically copied to a new commit.

Packaging used **Python 3.12.14**. Engine pins unchanged: Run
`070a6086c62164e859fc3274b75b5f536fa9d902`, Scripts
`dad04730860bcdd1189aa8562860e379b0f5d783`, emsdk
`c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56`, emcc 4.0.23
`7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`, SDL 3.2.22,
CMake 3.31.6/Ninja 1.11.1. Original demo 20 files / 223,382 bytes, fetched at
runtime from the existing pinned publisher or loaded from player files. Source
GPL permissions remain separate from unresolved game-data mirroring permission.

## CI, publication and remaining checks

The existing cached/path-filtered web workflow now runs Python package tests,
verifies the dist, packages/verifies an UNAPPROVED candidate and uploads a
separate candidate+checksum Actions artifact. The original web dist artifact is
retained. Feature pushes still do not duplicate PR builds; native compiler
routing/protections are unchanged. Final CI artifact/head/digest links belong in
the [draft branch PR](https://github.com/jbbejena/openfodder/pulls?q=is%3Apr+head%3Arelease%2Fmobile-candidate).
Leave unmerged. Final documentation heads have their own build/archive identity;
the table above describes the exact locally exercised artifacts.

Public preview remains **Sites v14 / 01231e740c93**, public access revision 2,
at https://openfodder-phase-one.zanysky263.chatgpt.site. Metadata was checked;
no Site write/deploy occurred. Temporary browser proxy-CA trust was removed
after tests. Logs, proof JSON and screenshots stay ignored under
`build-web/local-only/candidate-*`.

[Deploy/rollback commands and integrity limits](../CANDIDATES.md) are ready.
Checksums are unsigned corruption/integrity evidence, not acceptance. The known
server-side v14 rollback version remains in [the publication record](battlefield-flicker.md).
Candidate command does not apply it or upload assets.

MOB-012's full iPhone mission/recovery/ten-minute performance and cross-refresh
checks remain unperformed; original zero secondary ammo and null audio remain
explicit. M1–M4 and the accepted MOB-013 baseline remain **unpassed**. Next work
is the [recorded phone session](../ACCEPTANCE.md), followed by scoped fixes and
explicit acceptance/publication decisions. No larger forces, tactical changes,
engine rewrite or H Hour work was advanced.
