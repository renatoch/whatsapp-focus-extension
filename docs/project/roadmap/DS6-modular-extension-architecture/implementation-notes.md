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

## Native adapter — remaining selectors

- Moved nested-view discovery/exit, Back/Chats selection, readiness/progress and empty-search sibling isolation into the native adapter. Preserved selector priority and Escape fallback.
- Added four direct-factory normalization tests. Empty-search isolation test now uses the public adapter and synthetic field visibility rather than a source bridge.
- 93 tests pass. `content.js` is now 1,817 lines; adapter 236, hidden navigation 102. Counts are progress evidence, not completion criteria.

## Manual-search gate

- Extracted query settlement/timer policy into `scripts/search-gate.js`, preserving three characters, one-second initial reveal and non-flickering refinement.
- UI classes/message updates remain in composition callbacks. Reset/dispose invalidate queued callbacks; tests connect the real public gate to empty-search integration.
- Added manifest-order/bootstrap execution test verifying import-time DOM inertness and blind entry before body exists.
- Full suite: 98 passing. No new dependency or user-visible change intended.

## Resume checkpoint — explicitly paused by Navigator

Navigator requested verification and continuity notes only, not further implementation. Wait for a new instruction to resume; the earlier autonomous-work request must not override this pause.

Verified at this pause:

- DS6 worktree was clean at `84786c7` (documentation checkpoint); latest code change remains `3997ee5`.
- Stable `main` remains at `4dd73e1`. Its only untracked entry is runtime `.mirror/`; do not commit or remove it.
- Current sizes: `content.js` 1,779 lines; `scripts/whatsapp-dom.js` 236; `scripts/focused-navigation.js` 102; `scripts/search-gate.js` 42.
- Last executed verification: 98/98 tests, JS syntax checks, manifest parsing and diff checks passed before `84786c7`. Tests were not rerun during this pause-only inspection.
- No implementation is stranded in uncommitted files. Refactoring is partial; Chrome validation of DS6 has not happened.

To resume after explicit authorization: work in the DS6 worktree, inspect `git status`/`git log`, read this file plus `plan.md` and `docs/architecture.md`, rerun `node --test tests/*.test.js`, then take the first remaining extraction below. Do not recreate the branch, reapprove the already-approved plan, switch the stable installation, or start from the original monolithic code.

## Authorized hotfix synchronization while DS6 stays paused

After the pause checkpoint, Navigator authorized one isolated stable-worktree fix and its incorporation here: hide overlay recents during intent declaration and normal-mode confirmation. No DS6 implementation was resumed.

- Main hotfix: `6b2cd0a`; incorporated into DS6 as `e7684c5` via cherry-pick, including regression tests and backlog notes.
- Main suite: 80 passing. DS6 suite after incorporation: 101 passing. Both diff checks pass; no implementation is left uncommitted.
- The eight-second timer remains unchanged. A future experiment without it is recorded in `docs/product-log.md`, not authorized for implementation.
- During later CSS extraction, preserve the two decision-state selectors hiding `.mwf-focused-recents-overlay`; normal overlay navigation must reappear with its contents intact.
- The explicit DS6 pause remains in effect. Resume only on a new instruction; preserve this hotfix rather than restoring the older CSS baseline.

## Remaining

Next safe implementation boundary:

1. Extract recent capture (including bounded confirmation retries and cancellation) into a controller using the native adapter; migrate `recent-opening-capture.test.js` from its remaining VM bridge without weakening source-route and passive-change tests.
2. Finish timer/listener lifecycle ownership as mode/normal-intent controllers are extracted. Some delayed search entry/capture and normalization callbacks are still scheduled by `content.js`; module-local disposal is implemented, but application-level start/dispose is not complete.
3. Extract conversation store and UI surfaces via data/action callbacks, not a global mutable context. Preserve exact collection render cache and fixed five-slot layout.
4. Split CSS and the development asset loader only after auditing cascade order; retain the current CSS untouched until that boundary.
5. Complete docs, full automated verification and one compact Chrome validation route before Debt Review. No whole-story completion, live validation, merge, push or release is claimed.

Latest code checkpoint: `3997ee5` (manual search gate); prior slices `7a43576`, `83ed9d5`, `951a7b3`, characterization `30a3be8`. All work is in the DS6 worktree. The stable main worktree must remain unchanged. No uncommitted implementation is intentionally left at this checkpoint.
