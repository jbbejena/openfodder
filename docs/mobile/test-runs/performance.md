# MOB-011 performance diagnostics verification

2026-10-29. Implementation branch `mobile/performance` starts at user-merged
master `9daff60dfa41f393214174217df05ec65df6171a` (PR #10). Scope is the
[opt-in recorder and phone procedure](../PERFORMANCE.md). The engine clock,
renderer scale, game content and pinned dependencies are unchanged.

Initial development check: the pinned browser build and 51 individual Node 24
tests passed. The actual-Wasm Chromium script passed recording/export, Guide
and synthetic-away exclusions, five restart cycles, native callback cadence,
first/repeat navigation and composited battlefield pixels. Screenshots of the
recording header and the scrollable Guide at 844×390, 568×320 and 390×844 were
reviewed locally. This check used a dirty development artifact; committed-build
and publication results will be recorded in the final handoff.

The script's starting area is a short **desktop** `mapm1` measurement with four
troops, not sustained phone combat. Actual iPhone Safari, physical touch, heat,
audible audio, Home Screen and the ten-minute on-device session are **NOT RUN**.
The 30 rendered FPS target is **not established**. M1/M2/M3 remain unpassed;
MOB-011 acceptance is blocked on the real-device measurements. No speculative
performance tuning was applied. Raw reports, screenshots and profiles stay
ignored and are excluded from the source archive and hosted artifact.
