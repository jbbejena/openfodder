# UNAPPROVED mobile candidates (MOB-013 preparation)

Candidate preparation is implemented while [MOB-012 phone acceptance](ACCEPTANCE.md)
remains pending. Every bundle is explicitly **UNAPPROVED**. Packaging, checksums,
compiler success and desktop screenshots do not approve a mobile release. The
command creates local files; publication, tags, releases and accepted-baseline
promotion are separate actions.

## One packaging command

Use a clean recursive Linux/WSL checkout with the [documented build prerequisites](BUILD.md):

```sh
python3 scripts/package-web-candidate.py
```

This runs the existing pinned build, verifies committed source and dependencies,
checks the asset boundary, then writes an immutable ZIP and adjacent `.sha256`
file under ignored `build-web/candidates/`. Names include the full source commit,
archive-digest prefix and `unapproved`. Identical existing output is reused;
different artifacts/checksums are never overwritten. No game files are fetched
or included by packaging. Git, Python and the existing pinned builder suffice.

To package an already built dist without recompiling:

```sh
python3 scripts/package-web-candidate.py \
  --from-dist build-web/cmake/dist --expect-commit FULL_40_CHARACTER_COMMIT
```

The full expected commit is mandatory for `--from-dist`. Historical artifacts
are checked against that Git revision, including its Run/Scripts gitlinks,
without replacing newer source. Initialize the recorded submodules first; never
use `submodule update --remote`. A historical revision must exist in the local
Git object databases. The packager's own source checkout must also be clean.

## Contents and verification

The ZIP contains:

- `dist/`: exact HTML/JS/Wasm/support data, build/content identities, complete
  matching `source.zip`, `SOURCE.txt` and license notices.
- `candidate.json`: UNAPPROVED status, full runtime/packager commits, tested
  compiler/dependency pins, per-file bytes/SHA-256, content route and optional
  previous-bundle reference. Phone acceptance is explicitly unestablished.
- `SHA256SUMS`: all payload, metadata, verifier and README files except itself.
- `README.txt` and `tools/`: deployment/recovery steps and GPL verifier source.
  The extracted verifier needs Python only, not a Git checkout or SDK.

The existing artifact guard now validates the complete source set against Git,
checks source/notices, and accounts for every preloaded support-file byte using
the pinned Emscripten metadata. The support `.data` contains only GPL Scripts
and config; the 20 demo/campaign files are fetched by the browser from existing
pinned upstream or supplied by the player. The engine license does not grant
permission to mirror game data. Data-mirroring terms remain unresolved.

```sh
python3 scripts/package-web-candidate.py --verify PATH_TO_CANDIDATE.zip
python3 scripts/package-web-candidate.py --verify PATH_TO_CANDIDATE.zip \
  --expect-commit FULL_40_CHARACTER_COMMIT --extract NEW_DIRECTORY
```

Keep the original ZIP/sidecar names together. Alternatively pass a trusted full
`--expect-sha256 DIGEST` instead of the adjacent sidecar. Verification checks the
whole archive, paths/file types, internal checksums, metadata identity, source,
licenses and support payload. Unexpected files, symlinks, traversal, missing or
modified content, and approval claims fail. Extraction validates first and
refuses any existing destination. It never updates a running site or overwrites
a working directory.

After a trusted extraction the same commands work through
`NEW_DIRECTORY/tools/package-web-candidate.py`, even with Git/SDK unavailable.
Check the whole-ZIP digest against a trusted CI/PR record before executing tools
from a downloaded archive. These bundles are unsigned; checksums detect changes
but are not signatures or device-acceptance evidence.

Packaging uses sorted file order, fixed ZIP timestamps/modes and stable JSON.
**The same verified inputs and Python/zlib implementation reproduce the same
ZIP bytes.** This is not a bit-identical cross-machine engine-build claim:
`About.cpp` embeds compilation date/time, and the matching inner source ZIP
retains source-file timestamps. Preserve an exact verified artifact for rollback;
full commits/pins and the existing build command provide rebuild provenance.

## Deployment and rollback procedure

Download/extract the Actions `openfodder-mobile-candidate-COMMIT` artifact to
obtain the candidate ZIP and sidecar, then verify/extract as above. CI retains
them for 30 days; copy any required rollback artifacts to durable operator
storage before expiry. A previous-bundle reference is not a backup or download.

Serve **only `NEW_DIRECTORY/dist/`**, not the whole bundle:

```sh
python3 -m http.server 8080 --directory NEW_DIRECTORY/dist
```

Use localhost for local tests. Future authorized hosting uses HTTPS and
`application/wasm`; upload the complete verified dist atomically. Confirm its
full served `build-info.json`, visible header and expected Wasm digest, then
reach the menu and battlefield. Do not mix new JS/Wasm with an older data/support
set. An existing open tab keeps its engine until reload; Load demo refreshes
content, not that engine.

To retain an explicit rollback reference when packaging:

```sh
python3 scripts/package-web-candidate.py --previous-candidate PREVIOUS.zip
```

Both the previous ZIP and sidecar must verify. Its source commit, checksum,
filename and approval status are recorded; the old ZIP is **not embedded** and
is not implicitly approved. Retain it separately. Before switching builds,
retain/export supported mission checkpoints. Rollback restores runtime files;
it does not restore browser storage or a live battlefield.

1. Verify the retained previous ZIP/sidecar, extract into another **new** directory.
2. Smoke-test that dist with the previous full commit. Check menu/map and hashes.
3. When a deployment rollback is authorized, switch the whole hosting version or
   staging-directory pointer atomically. Reload a test tab; verify the **old**
   header/build-info and actual runtime bytes. Do not clear website data to get
   a new engine; that can erase checkpoints.
4. Keep the failed/new artifact for diagnosis; do not overwrite the good backup.

The [measured local rollback](test-runs/mobile-candidate.md) restored the exact
`01231e740c93` preview bytes and rendered its map. The public Site itself stays
at v14. Its retained server-side version is recorded in
[the flicker publication record](test-runs/battlefield-flicker.md); a future Sites
rollback should reuse that same project/version and audience through an
explicitly authorized deployment. This packaging task performs no public
promotion or rollback.

## Tests and limits

```sh
python3 -m unittest discover -s scripts -p 'test_web_candidate.py' -v
node --test web/*.test.cjs
python3 scripts/check-web-artifact.py
```

For an older dist the guard accepts `--dist DIRECTORY --ref FULL_COMMIT`; this
uses Git snapshots rather than the current worktree. `--allow-dirty` remains a
local-development-only guard mode and cannot be combined with `--ref`. The
candidate command has no dirty-build or approval bypass.

[Measured commands/artifacts/rollback](test-runs/mobile-candidate.md) distinguish
real browser evidence, synthetic packaging tests and unperformed phone checks.
The [phone procedure](ACCEPTANCE.md) still supplies the missing full mission,
checkpoint/recovery, interruption and sustained-performance evidence. M1–M4 and
the accepted MOB-013 baseline remain unpassed. No engine, gameplay, touch,
checkpoint/audio contract, larger forces or H Hour integration change.
