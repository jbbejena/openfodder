# MOB-004 — command bridge verification, 2026-10-28

Branch `mobile/command-bridge`, base `47e956dfcf316b1149a0e54c775197baa0df62af`;
implementation/build **`d755c600e2f2afe49cabba8cea264ff6f4c5ef31`**.
[Draft PR #3](https://github.com/jbbejena/openfodder/pull/3) targets master and
includes pending PR #2's phone-preview improvements. Leave unmerged.

The [API contract](../INPUT_API.md) defines commands, validation, state,
coordinates, asynchronous application and remaining scope. [Current handoff](../../../AGENT_HANDOFF.md)
records commands, hosting and CI. MOB-004 is complete; M1/M2 and actual iPhone
acceptance remain unpassed. This is not the production touch controller.

## Actual engine/browser checks

Committed pinned web build, publication guard and six Node tests passed.
`smoke-web-input.cjs` exercised the actual Wasm/C++ engine in Linux Chromium
154.0.8037.57, Playwright Core 1.57.0, WebGL1/SwiftShader, mouse/direct commands,
DPR 1 and 2, 1100×1000 then 780×900 CSS pixels. Screenshots inspected locally.

| Check | Actual result |
| --- | --- |
| Pre-start/menu actions and malformed raw Wasm arguments | Rejected; cancel safe before start |
| Populated/empty/out-of-range squads | Engine selection accepted; empty and invalid rejected |
| Queue capacity/safety | 32 normal requests accepted, overflow busy; cancel preempted them |
| Movement | Real engine destination set; leader position changed |
| Held primary fire and aim | Engine aim changed; stop, repeat stop, cancel and pause released intent |
| Coordinate stability | Same map target/engine aim through contained-image letterboxing, CSS resize, pan and DPR 1/2 |
| Camera | Bounded intent changed view without movement order; follow returned ownership |
| Pause | Twice stayed paused; mission ticks froze; clearing user reason preserved visibility pause; cancel preserved pause |
| Desktop regression | Original SDL menu pointer, native right-button aim and P pause/resume passed |
| Diagnostic panel | Real pointer hold/release passed; panel-closing cancellation source-inspected |
| Focus cancellation | Synthetic window blur released hold; not an actual phone/background test |
| Secondary weapon with zero ammo | Pinned mission rejected unavailable grenade/rocket selection |
| Secondary weapon with ammo | Separate local fixture below accepted grenade/rocket selection; inventory unchanged |
| Real iPhone Safari / touch controller / full mission | NOT RUN / not implemented in this task |

The pinned first mission starts with four deployed soldiers in squad 0 and zero
secondary ammo. Tests do not silently claim that valid weapon selection used
those original inventory values: a separate test browser verifies/mounts the
original local pack, then amends only its in-memory campaign descriptor before
mission load (`Grenades=3`, `Rockets=2`). The engine loads that fixture and selects
both weapons without consuming ammo. No fixture file is stored/served/committed;
Run, the manifest, pins and public preview data stay unchanged. Secondary firing
itself remains MOB-005.

The original launcher smoke also passed at the committed build: menu/map,
cheats-off/explicit opt-in, corrupt and partial data, individual-file fallback,
failed upstream retry, real upstream loading, and missing Wasm feedback. A first
external-fetch run timed out without the environment proxy CA trusted; the
properly configured browser run passed with TLS verification enabled.

Local evidence: `build-web/local-only/command-bridge-committed-evidence/` and
`build-web/local-only/bridge-committed-regression-evidence/`. These contain game
art and must not be uploaded. Failed assertions during development exposed a
pause snapshot/reconciliation edge and test assumptions about a moving native
camera; the fixed implementation/final committed checks passed. No full mission,
native runtime certification or phone readiness is claimed.

## Hosted build

[Public preview](https://openfodder-phase-one.zanysky263.chatgpt.site), no sign-in;
Sites version **4**, visible **`d755c600e2f2`**. Hosting source
`94fff4aa11982b84bbe9d5dfa75b155e8007b0fa`; deployment
`appgdep_6ae26f6757dc8191bc31d12a27d21ed0` succeeded.

Fresh anonymous hosted Chromium returned HTTP 200 and reached the menu/map after
20 direct pinned-upstream GETs/hash checks, with no supplied credentials or
authorization headers. Real panel pause twice froze engine ticks, resume advanced
them, and cancelling a real held pointer released manual fire. Menu/map/harness
screenshots inspected locally. One cold desktop engine-ready measurement:
**1,534 ms**. Actual iPhone Safari is **NOT RUN**.

Hosted evidence is retained at `/workspace/bridge-hosted-result.json` and
`/workspace/bridge-hosted-{menu,battlefield,harness}.png`, not uploaded.
Runtime **2,920,588 bytes** + upstream demo **223,382 bytes** = **3,143,970 bytes**
before compression. Optional source **1,819,812 bytes**; complete hosted artifact
**4,854,457 bytes**, no game assets. Exact toolchain/data/Scripts pins are unchanged.

[Web CI passed](https://github.com/jbbejena/openfodder/actions/runs/40775648116)
with [matching artifact](https://github.com/jbbejena/openfodder/actions/runs/40775648116/artifacts/12855525161).
[Linux native compilation passed](https://github.com/jbbejena/openfodder/actions/runs/40775648201).
[Windows CI](https://github.com/jbbejena/openfodder/actions/runs/40775648016) was
still installing FFmpeg at this record; no Windows pass is claimed. Latest PR
checks may supersede these snapshot runs after a documentation-only follow-up.

## Phone check and remaining scope

Open Safari, record device/iOS/visible build, Load demo → Start game → Christmas
Special → battlefield for B05. No ChatGPT sign-in or Files-app setup is required.
To inspect the command foundation, enable **Diagnostics → Show input API test
panel before Start**, then expand the panel below the battlefield afterward.
Record any failure against this build. This is a development harness; production
touch ownership, Move/Fire modes, deliberate secondary firing, camera gestures,
phone HUD and complete mission menus remain MOB-005–008. M1/M2 remain unaccepted.
