# Browser checkpoints (MOB-009)

At a **mission briefing**, tap **Save checkpoint** and keep the tab open until
**Saved checkpoint** appears. After closing and reopening the same preview in the
same browser, load the demo again, tap Start game, then **Continue**. Continue
opens the saved mission's briefing; Deploy starts its battlefield from the
beginning. Saving is explicit, rather than dependent on an unload event.

Supported content is the pinned **Amiga Format Christmas Special**, missions
1 and 2, each with one phase. Save after Next mission to retain returning recruits
at the next mission's start. Retry creates fresh native game data; returning to
the menu discards the current run. Neither changes an already confirmed save.
Live combat, result screens and arbitrary phases cannot be saved.

## Native fidelity audit

Inspected `sGameData::ToJson`, `FromJson`, `Clear`, `Phase_Next`, troop promotion,
native save discovery and `Game_Load` at base
`86c70318768ce59fcc85b606caeb655ccddf62b1`. The adapter keeps the existing native
format and loader; shared native save behavior is unchanged.

| Native JSON contains | Meaning at the supported boundary |
| --- | --- |
| SaveVersion 1, timestamp, data version, campaign/name | Validated identity, not an executable script |
| Mission number | First phase only; phase number is absent |
| Recruitment/alive counts, available reserve, next recruit ID | Campaign recruit progress |
| Nine troop entries: recruit ID, rank, animation variant (`field_6`), kills | Returning roster; empty slots use ID -1 |
| Hero IDs/ranks/kills and home/away scores | Native campaign history |

Not serialized: live sprite pointers/positions, targets/orders, camera, squad
assignments, ammunition/projectiles, input/pause, RNG, mission tick, objective
progress, phase number or each troop's within-mission phase count. Phase counts
reset on a native mission boundary. This supports mission starts in the selected
single-phase content; it does **not** establish mid-battle or phase-exact resume.

The native loader clears its receiver before validating every field, accepts
future version numbers and may succeed without a valid mission. The web adapter
first bounds/validates the complete candidate, loads a **temporary** `sGameData`
with the loaded campaign, then replaces active data only after success. It resets
phase/squad state, detaches all nine troop pointers, and lets native preparation
rebuild sprites at the next Deploy. UI summaries come from the validated engine
data, and browser code cannot declare a mission outcome.

Web validation accepts native SaveVersion exactly 1, the exact loaded DataVersion,
the supported campaign/mission, exactly nine troops, bounded integral
IDs/ranks/counts, unique active/hero identities and known field shapes. Empty native
heroes are normalized to an array. Unknown/incompatible input is rejected rather
than passed to the permissive native loader. The import limit is 64 KiB; canonical
JSON is limited to 12 levels and safe integer numbers.

## Persistence and compatibility

Emscripten links `-lidbfs.js`. `web/checkpoints.js` mounts **IDBFS at `/Saves`**
and awaits `FS.syncfs(true)` before enabling Start game, calling main or native
ResourceMan save discovery. This is the real native save directory. Wrapper files
are under `/Saves/browser-v1/`, use `.json` instead of native `.ofg`, and are not
offered as native saved-game files. The validation staging file is outside that
mount at `/tmp/openfodder-checkpoint.json`.

The wrapper contains schema 1, boundary `mission-start`, the native JSON, creation
time, producing fork/build commit, compatibility metadata and SHA-256 checksum.
Compatibility requires ABI `openfodder-mission-start-1`, exact Run and Scripts
pins, content-manifest ID and a hash of the entire canonical manifest. The native
DataVersion is separately checked by C++. A newer fork commit with the same
compatible format/content can load an older checkpoint. **Bump the ABI/schema
when changing restore semantics**; a build hash alone is not a compatibility
policy. SHA-256 detects corruption; it is not proof of an authorized score.

Only two progress files are persisted:

- `current.json`: latest confirmed checkpoint.
- `previous.json`: previous validated checkpoint, retained when Save or Import
  replaces current. **Use previous checkpoint** restores it without overwriting
  the latest save. If current is corrupt/incompatible, startup can recover the
  validated previous copy and says so. Invalid files are left untouched until an
  explicit Save/Import replaces them.

Save/Import operations serialize within the tab and gate mission transitions.
They stage the previous valid copy and candidate, then await `FS.syncfs(false)`.
The UI acknowledges success only after its callback succeeds. On failure the
adapter rolls the in-memory files back and keeps the prior validated checkpoint;
no unload-time retry silently promotes an unconfirmed in-memory write. Denied,
unavailable or timed-out storage gives visible feedback and still permits play.
When storage is unavailable, Export backup at a briefing remains available.

These saves belong to this browser profile and exact website origin. Clearing
site data, private browsing, browser eviction, a changed hostname or a different
browser/device can make them unavailable. There is no account/cloud sync or
cross-tab conflict resolution; use one game tab per origin. Do not treat browser
storage as a permanent backup.

## Recovery files and content boundary

**Export backup** downloads progress JSON: a fresh supported briefing checkpoint,
or the last validated saved checkpoint from the menu. Export does not change the
browser save or claim browser persistence. **Import backup** in the mission menu
validates checksum, compatibility and native fields before committing; a rejected
file leaves the prior save and current scene unchanged. Export first if you want
to keep more than the two browser slots. Actual iPhone download/Files-picker
behavior remains untested.

Backup JSON contains recruit progress and identifiers, not demo assets, Scripts
or arbitrary code. Demo content must be loaded/verified again after reopening.
Capture checks the actual campaign bytes against the pinned manifest, rejecting
modified diagnostic campaigns. No game data, browser profiles, personal progress
exports or screenshots belong in source, source archives or public CI artifacts.
Engine/Scripts licensing and unresolved demo-mirroring permission remain separate.

## Adapter surface and checks

`window.fodderSaves` owns storage and feedback. The command bridge adds action
**17**, `resumeCheckpoint()` (menu only, zero arguments). The service stages the
validated native candidate and waits for that queued command to reach briefing.
`of_web_checkpoint(0)` exports native JSON only at a phase-1 briefing with no
pending transition; `(1)` validates the staging file and returns an engine-read
summary without changing the active game. Return JSON pointers are copied
immediately. See [the command contract](INPUT_API.md).

```sh
node --test web/*.test.cjs
./scripts/build-web.sh
python3 scripts/check-web-artifact.py
python3 -m http.server 8094 --bind 127.0.0.1 --directory build-web/cmake/dist
PLAYWRIGHT_MODULE=/path/to/playwright-core \
  node scripts/smoke-web-saves.cjs http://127.0.0.1:8094/ \
  build-web/local-only/christmas.ofdata build-web/local-only/save-evidence \
  FULL_BUILD_COMMIT --fixtures
```

The smoke closes/reopens real Chromium persistent profiles and IDBFS, restores
native progress, checks rejection/recovery/failure/denied-storage paths, and
downloads/imports a backup. `--fixtures` is allowed only on localhost: an ephemeral
empty-goal campaign exercises native mission advancement; original campaign bytes
are restored before saving returning recruits. This is not an unmodified combat
victory. Use `upstream` instead of the local pack for public QA, **without** fixtures.
Evidence/profiles/exports stay in ignored `build-web/local-only/`.

Desktop storage checks are not iPhone Safari durability evidence. See the task's
test record and [handoff](../../AGENT_HANDOFF.md) for exact tested builds, public
preview identity and remaining device checks. Lifecycle/audio remains MOB-010.
