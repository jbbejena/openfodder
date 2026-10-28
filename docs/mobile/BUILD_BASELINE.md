# Phase 1 build and content baseline (MOB-001)

Inspected 2026-10-28 in a fresh recursive Linux x86_64 checkout. This is a
source/content audit; measured build and browser results belong in [BUILD.md](BUILD.md).

## Exact starting state

| Component | Repository / revision |
| --- | --- |
| Roadmap branch fetched before branching | `jbbejena/openfodder`, `docs/mobile-browser-roadmap`, `6b851862a77c3dd9556b5cadae7c88d370b6095f` |
| Engine code at that tip / master at inspection | `4312ff7c1abe3b6750483921893651d9d3c55b33` |
| Implementation branch | `build/mobile-phase-1`, created from the fetched roadmap tip |
| Run | `https://github.com/OpenFodder/data`, `070a6086c62164e859fc3274b75b5f536fa9d902` |
| Run/Scripts | `https://github.com/OpenFodder/scripts.git`, `dad04730860bcdd1189aa8562860e379b0f5d783` |

Commands actually used:

```sh
git clone --recursive --branch docs/mobile-browser-roadmap https://github.com/jbbejena/openfodder.git
cd openfodder
git fetch origin
git switch -c build/mobile-phase-1 origin/docs/mobile-browser-roadmap
git log -3 --oneline
git submodule status --recursive
git -C Run log -1 --format=fuller
git -C Run/Scripts log -1 --format=fuller
```

Both nested submodules matched their gitlinks with clean worktrees; no `--remote`
updates or latest dependency substitution. There was no pre-existing local work.

## Build requirements and baseline findings

- C++14, CMake, a build executor (Ninja selected), Python 3, Git, Emscripten and
  its matching Node/LLVM/Binaryen. The baseline CMake web path asks for SDL3 via
  `-sUSE_SDL=3`. Windows' SDL `release-3.4.0` and mixer commit do **not** pin the
  Emscripten port. The selected SDK and resolved web SDL are recorded after testing
  in BUILD.md.
- The old Windows/Docker helper uses `emscripten/emsdk:latest`, downloads Ninja
  and copies an ini into the Run submodule. It is not a reproducible baseline.
- CMake preloads **all** Run into `/`, including other demos, retail placeholder
  directories, nested Git metadata and unrelated content. Phase 1 will stage an
  explicit allowlist instead.
- `Source/Start_Emscripten.cpp:161` forces `Params->mCheatsEnabled = true` after
  parsing ini/CLI, overriding `cheats=false`. Alternative mouse is also forced.
  These are source observations at the starting revision, not claims of fixes.
- Web excludes `Source/PC/Sound_PC.cpp`, `Sound_PC2.cpp`, and native `Start.cpp`.
  `OPENFODDER_NO_MIXER` makes `sGameVersion::GetSound()` return `cSound_Null` for
  **all** releases, including Amiga. Amiga sound code still compiles but is not
  selected. Phase 1 retains this silent baseline; audio is not verified.
- Startup first switches to the Christmas Special to draw the campaign menu.
  Empty data cannot establish menu/map success. `ResourceMan::findVersions()`
  requires all 19 filenames for this version, including music files even though
  this web configuration is silent; checksum mismatches are logged, not rejected.

## Small test content

Selected **Amiga Format Christmas Special**, mission 1 **LAND OF HOPE AND GLORY**,
`mapm1.map` + `mapm1.spt`. This is the smallest complete included Amiga demo
directory (222,823 bytes in 19 files), already required by the web menu's startup.
Its two single-phase missions avoid retail assets and a larger demo. This is a
small suitable existing campaign, not a claim that its combat is phone-playable.

Required local pack: all 19 files in `Run/Data/AmigaFormat_XMAS/` and
`Run/Campaigns/Amiga Format Christmas Special.ofc` (Sensible Software attribution;
two missions). [The machine-readable inventory](../../web/content-manifest.json)
records every path, byte count and SHA-256 from the pinned Run revision. No art,
map, music or campaign bytes are copied into the engine repository.

The 19 files are `AFXBASE.BLK`, `AFXBASE.INS`, `AFXBASE.SNG`, `AFXSUB0.BLK`,
`afxarmy.lbm`, `afxbase.bht`, `afxbase.hit`, `afxbase.pal`, `afxbase.swp`,
`afxcopt.lbm`, `afxsub0.bht`, `afxsub0.hit`, `afxsub0.swp`, `apmenu.lbm`,
`mapm1.map`, `mapm1.spt`, `mapm2.map`, `mapm2.spt`, `pstuff.lbm`.
The casing is preserved. The 20-file inventory is authoritative for sizes.

Scripts at the nested pin and a controlled web ini are separate runtime support.
`about.png`, retail data, Custom, Saves, Tests, other campaigns/demos and `.git`
files are not needed for this checkpoint and must not be preloaded.

## Provenance and publication boundary

| Material | Evidence / permitted route |
| --- | --- |
| Engine | Source headers: GPL-3.0-or-later; root COPYING and bundled dependency notices. Ship matching source/build scripts and notices with the browser engine. |
| Scripts | Nested repository has GPLv3 COPYING and source headers; keep its pin/source/notices with the engine artifact. |
| Christmas demo and `.ofc` | Present in the pinned data repository, whose README only says “Cannon Fodder Demos & Campaign Data”. No license or redistribution grant for these exact files found in that tree. The `.ofc` attributes Sensible Software. A public repository, demo label, installer or upstream demo is not a permission grant. |
| Other Run content / about image | Not selected; no need to publish or infer permission. |

**Blocker:** permission to redistribute the selected demo and campaign has not
been established. Do not upload those bytes, even in an Actions artifact or a
private hosted Site. A rights holder's grant covering these files and browser
distribution, or an explicitly licensed replacement, is needed for a bundled
instant-play preview.

Independent route: build/distribute the engine, GPL Scripts and config only;
accept the exact selected pack from the player's local files into browser memory
before starting the engine. The local pack is not uploaded or persisted. Build
and local desktop testing can use the pinned recursive checkout. A preview using
this route must say that data must be supplied, and must not promise that a phone
can display the map without those files. No iPhone hardware result exists here.
