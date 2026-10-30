# Mobile acceptance (MOB-012)

Current [standalone preview](https://openfodder-phase-one.zanysky263.chatgpt.site):
**01231e740c93**, full commit
`01231e740c9387b444dea68e0eab6c38b411df57`, Sites v14. No ChatGPT sign-in or
computer is needed to play. Reload an older open tab and check the header;
**Load demo from GitHub** loads content, not a new running engine.

[Measured acceptance record](test-runs/mobile-acceptance.md) distinguishes desktop
checks, fixtures, user reports and physical-phone checks. M1–M4 remain unpassed
until the required device evidence exists. This work does not promote a release
or begin H Hour/combat changes.

## One desktop command

Use the [pinned build/local pack instructions](BUILD.md). Install or select the
existing QA pin, **Playwright Core 1.57.0**, and Chromium. Keep the pack, profiles,
reports and screenshots in ignored `build-web/local-only/`.

```sh
PLAYWRIGHT_MODULE=/path/to/playwright-core \
CHROMIUM_PATH=/usr/bin/chromium \
node scripts/smoke-web-acceptance.cjs \
  https://openfodder-phase-one.zanysky263.chatgpt.site \
  build-web/local-only/christmas.ofdata \
  build-web/local-only/acceptance-new-run \
  01231e740c9387b444dea68e0eab6c38b411df57
```

This executes the ten existing suites sequentially: launcher, native input,
touch, camera, mission, saves, layout, lifecycle, performance and temporal
rendering. Each owns a fresh context/profile. The output directory must be new;
reusing old reports or browser saves is rejected. Source identity is checked
before and after; dirty builds, wrong commits, unsuccessful children and missing
reports fail. Each suite has a five-minute timeout. Independent suites continue
after a failure. Logs/reports/screenshots are retained in their suite directory.
No player files are uploaded; the launcher also tests the pinned upstream route.

`acceptance.json` records runtime pins/content, runner revision and script hashes,
suite outcomes and every standalone B/I/U/G/S/L/P/R checklist row. It checkpoints
progress during the run. A nonzero exit indicates automation/identity failure;
zero indicates only that the requested suites completed. **Neither exit code is
phone acceptance.** `automatedChecksPassed` requires all ten suites and stable
identity; `acceptance` stays `BLOCKED`, physical checks stay `NOT RUN`, and image
review remains required. Inspect actual composited screenshots; JSON alone does
not establish visible play.

For a focused rerun, append `--only=input` (or comma-separated suite IDs) and use
another fresh evidence directory. Omitted suites remain NOT RUN; a partial run
cannot become a complete automated pass. On a local `localhost`/`127.0.0.1` build,
`--fixtures` additionally exercises mission/save empty-goal branches. Those
fixtures are rejected on public URLs. The older input/touch suites already use
explicitly labelled ephemeral ammo fixtures. Fixtures never prove an unmodified
combat win or ordinary-content secondary-weapon acceptance and are never shipped.

For a local candidate, serve its dist and supply its **full clean build commit**.
A later documentation/QA head has a different build identifier even when engine
behavior matches. Do not substitute it for the public preview's identity.

## Actual iPhone session — pending

Record iPhone model, iOS/Safari version, date, build header and Safari-tab mode.
Home Screen behavior is a separate later result. The following stages collect
missing evidence; they are not prefilled passes.

1. **Load and controls.** Open the public URL in landscape, verify **01231e740c93**,
   load the 20 verified demo files, Start, choose **LAND OF HOPE AND GLORY** and
   Deploy with cheats off. Wait for the entry fade. Test Move, held Fire/aim/
   release, Pan, Follow, Guide, portrait/landscape and reachable controls. Observe
   stationary grass/HUD brightness for 20 seconds. The first view has snow above
   the football pitch; Pan south to see the field. The original demo has one
   populated squad and zero secondary ammo; unavailable buttons should explain
   that state. Do not count the desktop ammo fixture as a phone weapon test.
2. **Mission loop.** Complete the unmodified mission through touch. Also record
   a real loss/Retry, abort confirmation/cancellation and return to menu. Retry
   must rebuild the same mission with fresh troops; native results distinguish
   win, loss and abort. A full combat victory remains unverified until observed.
3. **Checkpoint recovery.** From the menu choose **IT'S SNOW TIME! (mission 2)**.
   In its briefing press Save and wait for the saved acknowledgement. Close the
   tab, reopen the same URL/Safari profile, load demo/Start, then Continue the
   checkpoint. Confirm mission **2** is restored, not default mission 1. Supported
   saves are mission-start briefings; live camera/projectiles/combat are not
   resumed. Export/import a backup through Files if practical; record failures.
4. **Interruption.** While firing, switch apps and return. Held fire must stop;
   combat waits for **Return to game** and does not catch up. Repeat with Guide
   already open; Return must preserve its pause until Guide closes. Test Back/
   Forward and rotation. If Safari reloads/evicts, use the confirmed checkpoint
   route; record reload separately from a retained live page. Audio stays silent
   through the null backend; audible recovery is unsupported.
5. **Performance.** Guide → Performance test → device/iOS → Record. Play for at
   least ten **active** minutes, or the full mission if longer, including several
   retries/menu cycles. Pause/away/menu time is excluded. Guide → observations →
   Stop → Export report. Export before reloading; the unsaved report/live battle
   will be lost on reload. Compare first/repeat loads with truthful cache labels.
   [Metric limits and full procedure](PERFORMANCE.md): SDL submissions and RAFs
   do not prove displayed FPS, and Wasm capacity is not used Safari memory.

Record each [PLAYTEST.md](PLAYTEST.md) result as pass/fail/blocked/not run with
observed behavior and its build. A useful short report is:

```text
Build / iPhone / iOS-Safari / date:
Menu-map and controls / rotation:
Full mission result / loss-retry / abort-menu:
Mission-2 checkpoint saved acknowledgement / close-reopen result:
Held-fire interruption / Guide pause / Back-Forward:
Performance report and active duration / stutter / heat:
Remaining failures or unperformed checks:
```

Use the resulting failures to choose focused fixes. MOB-013's stable baseline
requires this acceptance evidence; H Hour and broader combat work remain deferred.
