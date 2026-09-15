# DS6 — Implementation Notes

## Isolation and authorization

Navigator approved the DS Plan and requested branch isolation. Ariad implementation approval covers DS6.TS1–TS6. No merge, push, release or deployment is authorized.

- Branch: `refactor/ds6-modular-architecture`
- Worktree: `/mnt/e/renato/mirror/focus-lab/whatsapp-focus-extension-ds6`
- Stable worktree: `/mnt/e/renato/mirror/focus-lab/whatsapp-focus-extension`, branch `main`
- Branch base: `4dd73e1`

The stable worktree remains untouched so its existing Chrome installation and CSS hot-refresh do not ingest half-finished refactoring. Any urgent fix belongs in the stable worktree as a separate commit; reconcile it into DS6 deliberately (no automatic merging). Do not change the journey's permanent project path just to point at a temporary worktree. Runtime lifecycle commands currently materialize at the original project path; inspect and transfer any future generated documentation deliberately rather than overwriting branch work.

## First characterization boundary

- Baseline verified locally: 77 tests pass.
- Added six adapter characterization cases for native title priority, hidden-field lookup, input/contenteditable entry, stable outer-row target enumeration and evidenced mousedown activation.
- Added two deterministic normal-mode tests covering five-minute expiry ordering and recent-use confirmation versus eight-second countdown.
- All 85 tests pass before extraction. These new tests exercise existing functions using temporary VM bridges; the native tests will switch to public-factory APIs during extraction. Existing behavior assertions must remain intact.

## Ownership map for staged extraction

- Native reads/writes (`readTitle` through row/title selection; native search text/field operations; result activation/enumeration; empty-search isolation): first adapter slice.
- Nested-view discovery, Chats normalization and loading/readiness: remaining adapter work with controller-owned scheduling.
- Search gate and hidden polling/capture: focused-navigation controller, using the same adapter target reference across stability samples.
- Mode transitions and normal/intent timers: separate controllers; preserve the two-step Continue cleanup/focused transition ordering.
- Session recency and collection persistence: conversation store; render cache and expansion remain UI-local.
- Overlay, awareness, shared controls and focused shelf: surface renderers accepting snapshots and action callbacks.
- CSS/dev assets/bootstrap: later composition slice, not part of the first adapter change.

## Native adapter — first slice

- Extracted title/row reading, input discovery/read/write/clear, candidate enumeration and mousedown activation to `scripts/whatsapp-dom.js`.
- Factory takes document/window and optional debug callbacks; no import-time DOM work, storage or scheduling.
- Switched the six native characterization tests from source-sliced VM execution to the public factory without weakening assertions.
- Manifest and source ownership contracts updated. Native target identity remains unchanged; current stability tests exercise the existing controller.
- Architecture documentation started in `docs/architecture.md`.

## Hidden-navigation controller

- Extracted bounded exact search, unique-target stabilization, header confirmation and diagnostics to `scripts/focused-navigation.js`.
- Injected native operations, rules, scheduler, clock, normalization and outcome callbacks. No root-class or renderer dependency.
- Owned timers are cancelled on cancel/dispose and guarded by a generation token, including late normalization callbacks. Mode exits cancel pending hidden operations.
- Stability tests now exercise the public factory, not source slices; additional header mismatch, missing-field, disposal/restart and route cases pass.
- Full automated suite: 89 passing. Manual search gating and capture still await extraction; no live Chrome refactor validation claimed.

## Remaining

Continue characterization where existing coverage is thin, extract native adapter then navigation, and follow TS3–TS6. No whole-story completion or post-refactor live validation is claimed by these initial checks.
