# Current handoff

## Repository move — 2026-10-29 Pacific / 2026-10-30 UTC

The user explicitly requests future game changes in **jbbejena/open-h-hour** and
turning off CI except the relevant web build. Continue implementation there,
default branch `main`, switch branch `build/open-h-hour-playable`. Preserve its
existing import of this engine and its current handoff/test record. Its source
metadata/launcher/publication identify Open H Hour; this repository is historical.

This retirement branch `build/retire-openfodder-ci` starts at fetched master
`2618a60bc03f424282f6ea63a0f1fa8f33caf92a`. Windows/Linux definitions are moved
unchanged to `.github/disabled-workflows/`; web CI becomes manual-only. No
engine, dependencies, artifacts, protections, secrets or releases change.
Static diff/policy checks suffice here; current build/browser verification is
performed in Open H Hour. Open a draft PR targeting master and leave it unmerged.
Default-branch triggers change only after merge; this does not cancel old runs.
No CI settings API is used and no required check is bypassed.

The existing public play URL is retained:
https://openfodder-phase-one.zanysky263.chatgpt.site. Consult Open H Hour's
`docs/mobile/test-runs/open-h-hour-switch.md` for the actual newly served commit,
verification and preview publication. This move does not connect the private
H Hour story application or pass physical iPhone/M1–M4 acceptance.

The following MOB-013 handoff is historical and must not direct new work back
into this repository.

Updated 2026-10-29 Pacific / 2026-10-30 UTC. **MOB-013 candidate preparation is
implemented and locally verified. Bundles remain UNAPPROVED; accepted mobile
baseline and M1–M4 remain blocked on MOB-012 phone evidence.** No tag, release,
public promotion or H Hour work. The user explicitly authorized this independent
preparation while phone checks remain pending.

## Branch, source and review

Codex / `release/mobile-candidate`, from fetched clean master
`e57872b8f9c66732527363fd64da8d04a0f5dc78`, the user's merge of
[PR #13](https://github.com/jbbejena/openfodder/pull/13). Preserve merged acceptance
runner/cadence checks and all touch/save/lifecycle/performance/flicker work.
No unrelated work or worktree conflicts; no dependency repins.

Implementation/tested local candidate:
**77186d1d7adc97ba1970cb680b9e080fdee6b2c3**. Final documentation follows it.
[Draft branch review](https://github.com/jbbejena/openfodder/pulls?q=is%3Apr+head%3Arelease%2Fmobile-candidate)
targets master; final head, CI and downloadable artifact/digest links are recorded
there. Leave unmerged. No force push, protection change or native compiler edit.

## Delivered behavior/files

- `scripts/package-web-candidate.py`: one command runs the existing pinned build
  and source/asset checks; writes a versioned, content-addressed UNAPPROVED ZIP
  and sidecar under ignored `build-web/candidates/`. Exact existing output is
  reused; different output/checksums are never overwritten. `--from-dist` checks
  an exact historical commit; `--verify`/`--extract` require Python only.
- `scripts/web_candidate.py`: fixed ZIP ordering/times/modes, stable metadata,
  whole/per-file checksums, source/content/pin identities, embedded GPL verifier,
  optional separately retained previous-bundle reference, guarded extraction.
  No approval or dirty-build bypass. Candidate integrity is not phone acceptance.
- `scripts/web_artifact.py` / `check-web-artifact.py`: complete source-set matching
  against Git, runtime sizes/browser source/notices and contiguous preload-file
  accounting. Historical `--dist/--ref` verification preserves newer source.
  Original development-only `--allow-dirty` remains; incompatible with `--ref`.
- `scripts/test_web_candidate.py`: 11 synthetic integrity/provenance/rollback tests.
- `.github/workflows/web-build.yml`: same cached/path-filtered build, Python tests,
  candidate packaging/verification and separate ZIP+checksum artifact. Original
  dist upload remains. No feature-push duplicate builds or new native matrix.
- [Operator commands and recovery](docs/mobile/CANDIDATES.md),
  [measured artifact/rollback record](docs/mobile/test-runs/mobile-candidate.md),
  updated README/build/roadmap/task/playtest/handoff and prior user-merge status.

No C++/engine/UI, controls, simulation, checkpoints, audio, force-size or tactical
change. The preview stays unchanged while these build tools are reviewed.

## Actual commands/results

```sh
python3 -m unittest discover -s scripts -p 'test_web_candidate.py' -v
node --test --test-isolation=none web/*.test.cjs
python3 scripts/check-web-artifact.py --dist /workspace/sites/openfodder-phase-one/dist --ref 01231e740c9387b444dea68e0eab6c38b411df57
python3 scripts/package-web-candidate.py --from-dist /workspace/sites/openfodder-phase-one/dist --expect-commit 01231e740c9387b444dea68e0eab6c38b411df57
```

The resulting previous ZIP was passed to the default build command:

```sh
python3 scripts/package-web-candidate.py --previous-candidate PREVIOUS.zip
python3 scripts/check-web-artifact.py
python3 scripts/package-web-candidate.py --verify CANDIDATE.zip --expect-commit FULL_COMMIT --extract NEW_DIRECTORY
```

**11 Python + 61 Node cases passed.** Tests reject changed Wasm, incomplete/edited
source, assets/profiles/unaccounted support bytes, missing licenses, dirty builds,
wrong commits/digests, traversal/duplicates/symlinks, overwrite and approval claims.
Historical source still verifies after later worktree edits. Synthetic fixtures
are not gameplay/device evidence.

Pinned build and strengthened artifact guard passed on clean `77186d1`. All 47
preloaded files are GPL Scripts/config; 26 distributed files include matching
source/notices, not game assets. Repacking identical verified inputs reproduced
the exact ZIP checksum. This is packaging reproducibility, not bit-identical
engine compilation across date/time/source timestamps or Python/zlib versions.

Both extracted tools verified from `/tmp` with `PATH=/nonexistent`: no Git/SDK
needed. Repeat extraction to an existing destination was rejected; bytes intact.
All extracted bytes matched archives. Previous dist matched the retained live
preview artifact exactly.

Local HTTP service through an owned staging symlink first showed new commit
`77186d1d7adc`, menu and battlefield. Atomic symlink rollback then restored old
build-info/JS/Wasm/support bytes; a fresh browser showed **01231e740c93** and the
map. Both existing launcher smokes passed local/upstream data validation,
missing-data/Wasm/retry feedback, cheats off and explicit diagnostic opt-in.
Both routes on both builds had **26 composited sampled colors**; screenshots
reviewed: visible snow/grass/troops/native HUD and correct header.

Browser: Linux Chromium **154.0.8037.57**, Playwright Core **1.57.0**, 1100×900/DPR1,
desktop mouse, opengles2/WebGL1 SwiftShader. Packaging Python **3.12.14**.
Physical iPhone Safari, full combat victory, supported-save recovery on phone,
OS interruptions and ten active phone minutes remain **NOT RUN**. No broader
acceptance claim. [MOB-012 evidence and remaining phone procedure](docs/mobile/ACCEPTANCE.md).

## Exact locally exercised artifacts

Under `build-web/candidates/`, ZIP plus adjacent `.sha256` (ignored):

- Current runtime `77186d1d7adc97ba1970cb680b9e080fdee6b2c3`, 2,849,320 bytes;
  ZIP SHA-256 **c976bad09b57e0174f7157ca70101e3854902721269a4046d0713f36d2486304**.
- Retained runtime `01231e740c9387b444dea68e0eab6c38b411df57`, 2,811,897 bytes;
  ZIP SHA-256 **3e24f216795737a223b12a166056272ce80dd63ab01b73518204086fec799fc2**.

Both approval states are UNAPPROVED. Current manifest references previous source,
filename and digest; previous ZIP is not embedded. Keep it/sidecar separately.
Final documentation/CI heads produce their own explicit build/archive identity;
the hashes above describe the exact locally played/restored pair. CI artifact
retention is 30 days; preserve needed backups separately before expiry.

Proof JSON, logs and screenshots stay ignored under
`build-web/local-only/candidate-*`. No profiles, progress exports, raw images,
local packs or game assets uploaded. Temporary browser proxy CA removed after QA.

## Public preview, pins and boundaries

Public Site stays **v14 / 01231e740c93**, access revision 2:
https://openfodder-phase-one.zanysky263.chatgpt.site. Metadata checked; no Site
write or public rollback/promotion. The existing server-side saved version and
source/hash provenance remain in [the flicker record](docs/mobile/test-runs/battlefield-flicker.md).
An older open tab retains its engine until reload; Load demo only refreshes data.

Run `070a6086c62164e859fc3274b75b5f536fa9d902`; Scripts
`dad04730860bcdd1189aa8562860e379b0f5d783`; emsdk
`c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56`; emcc 4.0.23
`7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed`; SDL 3.2.22;
CMake 3.31.6/Ninja 1.11.1. Demo: original Christmas Special, 20 files / 223,382
bytes, two missions, one populated squad, no secondary ammo. Browser fetches
hash-verified existing upstream or validates player data; no mirroring right
assumed. Engine/Scripts GNU permissions stay separate from game data. Null audio
remains silent. Deployment serves only a verified complete `dist/` atomically;
rollback changes runtime files, not browser storage or live combat.

## Remaining gate / next work

MOB-013 preparation is complete; accepted baseline remains BLOCKED until recorded
MOB-012 phone checks. Follow the [phone procedure](docs/mobile/ACCEPTANCE.md): full
unmodified touch mission and loss/retry/abort; mission-2 briefing Save acknowledgement,
real close/reopen/Continue; held-fire/Guide interruptions, rotation/bars/history;
at least ten active minutes with device/iOS/build context and exported metrics.
Original ammo/audio limitations remain explicit; no fixture or desktop counter
passes phone gates. Accepted promotion/tags/releases require their own explicit
authorization after evidence. MOB-014/H Hour stays deferred.
