# DS6 — Implementation Notes

## Current resume status

Astra-only continuation, slice 2: extracted `scripts/dev-assets.js` after `9a0780b`.
Characterization before production edits: 187/187 (five new conversion/refresh cases).
Reviewed final suite: 194/194, syntax/manifest/diff checks passed. Fixed a regression
caught by a red lifecycle test: an interval callback queued before disposal must
remain inert after restart. Slow refreshes are single-flight; CSS/config partial
failure semantics, one-second interval, resource URLs and style IDs are preserved.
No CSS split, selector/config changes, new permissions or framework.
content.js 1,706 → 1,655 lines (-51); new module 97; net production +46.
Quota at verification: 64% five-hour / 58% weekly; refresh before another stage.
Chrome equivalence and application-wide lifecycle remain pending.

The intent checkpoint below is completed history.

Astra-only continuation, slice 1: extracted `scripts/intent-controller.js` from
`7155a7b`. The Navigator authorized multiple bounded checkpoints without Sol handoffs
and a temporary 90% five-hour quota ceiling; the 70% weekly stop still applies.
See `astra-continuation.md` for scope and limits.

Characterization before production edits: 177/177 (six new intent cases). Final
factory/lifecycle/integration suite: 182/182, with syntax/manifest/diff checks passed.
Reviewed outcome ordering, note privacy, reentrant cleanup and three-controller
wiring. content.js 1,748 → 1,706 lines (-42); new module 117; net production +75.
No CSS/selector/storage-schema changes or Chrome acceptance. Prompt/attempt state
is no longer composition-owned; outer listeners/observers and form rendering remain.

The normal-mode checkpoint below is completed history.

Sol executed `normal-mode-handoff.md` from `2304811`; Astra reviewed and approved
this bounded extraction for checkpoint/backup, not final DS6 acceptance. The new `scripts/normal-mode.js` owns confirmation and
bypass timers, recent-attempt route selection and generation guards; mode-controller
semantics, intent UI/state and persistence are unchanged. Manual Foco/shortcut now
cancel through the factory. Late expiry normalization cannot override a non-normal
mode or a cancelled/disposed/reopened bypass.

Before extraction, six new VM behavioral cases plus the existing suite passed
153/153. Those assertions migrated to factory tests; old moved-function bridges
were replaced with real normal/mode integration plus still-composed intent/manual/
Continue wiring. Handle 0 explicitly supported; forced obsolete callbacks and
expiry duplicate invocation rejected. Astra reproduced and fixed two additional
cases with tests first: a reentrant new confirmation supersedes an unfinished
opening (including releasing the old bypass), and expiry normalization completion
is single-use. Confirmation cleanup remains independent of an already-live bypass.
Destination selection at expiry time is also explicitly tested.
Reviewed suite: 171/171 passing; JS syntax, manifest parsing and diff checks passed.
Last review-stage quota read: 15% hourly / 51% weekly, 13 seconds old. Refresh before
further work; no subsequent extraction is started by this checkpoint.
content.js: 1,763 → 1,748 lines (-15); new module 139 lines; net production +124
lines, excluding tests/docs. Intent state/attempt telemetry, outer observer/listener
lifecycle and native helper delays remain future boundaries. No Chrome equivalence
claimed and no main-worktree changes authorized or made.

The paragraphs below describe the previous reviewed checkpoint and planning history.

Navigator explicitly resumed DS6 after the toast adjustment. Recent capture is
extracted into `scripts/recent-capture.js`, preserving six inspections at 300 ms
retry intervals, exact case-sensitive confirmation and route callbacks.

The Astra-reviewed Sol implementation extracts root-class transitions and delayed entry
to `scripts/mode-controller.js`. It owns the 100 ms search handoff and the 250 ms +
350 ms focused/capture chain with cancellation, supersession, late-normalization,
reentrancy and dispose/restart guards. `content.js` retains delegating wrappers and
the existing event/Continue/expiry wiring. Full suite after Astra review: 147/147
passing. Review added full class-set matrices, all-transition capture cancellation,
render reentrancy and post-restart normalization coverage. An isolated comparison
against `1f57f2b:content.js` passed 32 baseline/factory scenarios for normal-flow
class sets, effect ordering, overlay visibility and timing. No blocking production
code defect was found. Pre-extraction characterization was not executed by Sol as
planned; this retrospective baseline comparison supplements the durable factory tests.
Two disabled search debug messages were removed; no public behavior depends on them. `content.js` is 1,763 lines (down from 1,816); the new module is 213 lines.
Production volume increases by 160 lines because lifecycle and injected boundaries
are explicit; this checkpoint optimizes ownership, not total line count.

Astra approved this bounded checkpoint for commit/backup, not final DS6 acceptance.
Syntax checks, manifest parsing and diff checks passed for that checkpoint.
Navigator authorized the next slice; Astra prepared `normal-mode-handoff.md` for
Sol execution, stopping before commit/push. It extracts confirmation/countdown and
temporary normal-access timers first; intent form/state and event association stay
in composition for a later boundary. The older `next-extraction-handoff.md` is the
completed mode-controller handoff, not the current execution plan. Check fresh
quotas before starting. No production implementation in this planning turn.
Normal/intent countdown and bypass ownership, outer listener/observer disposal and
native helper delays remain later work. Do not treat this as DS6 completion or Chrome acceptance.
Main remains untouched. Earlier pause and five-recent references below are historical:
current behavior is ten tab-only recents with five initially visible and retained
expansion. Limited backup push authorization is governed by `docs/github-backup-policy.md`;
merge, release and packaging still require separate authorization.

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

## Case-sensitive titles and subsequent diagnostic-only follow-up

Main `41ef3d8` was incorporated as `cb11f06`: conversation titles distinguish case in recency, collection membership and exact opening/header confirmation, without new identifiers or schema changes. Navigator reported one case variant working; the other still has three exact matches throughout all 11 inspections. Do not assume partial matching, transient duplicates or distinct conversations from those counters alone.

Main `93efc70` adds bounded `matchStructure` diagnostic counts, ported here into the DOM adapter and hidden-navigation controller (rather than copying monolithic content.js). Shared rules/tests/product log are synchronized. Source priority and click policy are unchanged. Last suites: main 85/85, DS6 106/106. Await a newly copied diagnostic to identify the title-reading/target structure; no ambiguity workaround has been implemented. This authorized follow-up does not resume DS6.

## Search-section correction, still outside DS6 execution

Navigator's subsequent DOM inspection established `H2` headings inside direct grid rows for Conversations, Groups in common and Messages. Main `57c9b2e` restricts candidate enumeration to Conversations/Chats, stopping at every next heading or grid/structural boundary. Missing recognized headings fail closed; no first-result fallback. Equivalent change ported into `scripts/whatsapp-dom.js`; the controller propagates only the optional boolean `conversationSectionFound`. Existing exact matching, target stability and header confirmation remain intact.

Tests: main 89/89, DS6 110/110; adapter enumeration fixture now includes the evidenced heading/grid structure while retaining target-identity assertions. Live acceptance is pending. Preserve this patch during later extraction. Refactoring itself remains explicitly paused.

## Intermittent capture diagnosis — concluded and removed

Temporary recorder, title-comparison metadata and mousedown/click probe established the archived-layer boundary described below. After validation in both profiles, main `a3204d7` removes the focus-overlay diagnostic link, tab-memory recorder, pointer observer, header metadata and investigation-only tests. The DS6 worktree mirrors that removal while retaining the archived row fix and the separate exact-reopening failure diagnostic. Do not resurrect temporary instrumentation during extraction unless new evidence justifies it.

## Explicit search-entry focus hotfix

Main `d7427cc` is ported here: shared `focusNativeSearch` explicitly calls focus after click even when the query is empty. Navigator reported lost cursor focus from both entry surfaces. Deterministic tests cover empty and filled fields without assuming synthetic click focuses. Main 102/102; DS6 123/123. Live validation pending. This separate authorized fix does not resume DS6 or resolve intermittent recent capture.

## Archived-layer capture correction from direct browser evidence

Direct loopback CDP inspection (no conversation content exported; one already-read conversation opened by Navigator) established that archived rows live in `[data-testid="archived-chatlist"]` outside `#side`. The same row/title survived mousedown→click, so unmount/timing was not the cause. Existing `#side` guard discarded the opening. It also misclassified the standalone archived navigation button as a conversation, producing misleading frameTitle timeouts.

Main `e94d5e5` narrows valid rows to titled conversation/listitem/row elements inside `#side` or archived-chatlist. In DS6, this belongs to `whatsapp-dom.js` as `conversationListRow`; composition uses it. Tests cover both lists, navigation exclusion and fail-closed outsiders. Navigator validated the fix first in the isolated profile and then in the principal profile. Preserve this adapter boundary; DS6 itself remains paused.

## Native transient surface priority

Direct structural inspection established editor dialogs via `[role="dialog"][aria-modal="true"]` and image/video via `[data-testid="media-viewer-modal"]`. Main `fe2dff1` temporarily hides the focused-navigation shelf while either visible native surface exists and restores it from unchanged child state through the existing mutation observer; Navigator validated editor, image and video. Follow-up `ed401a2` applies the same root state to Buscar, Adicionar à coleção and an open collection chooser. The active-mode add-button selector was more specific than the generic suspension; main `5ba179f` adds an explicit override. Direct computed-style inspection with the media viewer open confirmed both buttons and chooser at `display: none`; Navigator then confirmed shelf, Buscar and Adicionar à coleção visually. Dedicated debug Chrome was closed and port 9222 verified closed. In DS6, detection belongs to the native adapter; composition owns root/shelf visibility. Tests: main 99/99, DS6 120/120. This separate authorized fix does not resume DS6.

## Expandable session recents synchronization

Main `136be41` raises the ephemeral recent-set bound from five to ten while preserving five visible rows by default. An explicit `Mais N` / `Menos` control reveals the second layer, and its expanded state remains tab-session-only across navigation/rerenders. No storage or awareness title path was added. The approved stable change was cherry-picked as `5a807b5`; main passes 101/101 and DS6 122/122. Navigator accepted the live behavior: “Ok, está bom”. This synchronization does not resume DS6.

## Toast dismiss and timeout reduction

Main `feb1ddd` adds an explicit `Fechar` button to toasts/diagnostics and reduces the diagnostic timeout from 30s to 10s (normal toasts to 5s). Synchronized as `dd9a861`. Tests: main 106/106, DS6 127/127. Live validation pending. DS6 remains paused.

## Remaining

Next safe implementation boundary:

1. Completed at resumed checkpoint: extract bounded recent capture and cancellation into a controller using the native adapter; preserve source-route and passive-change tests. Event wiring remains a composition bridge until mode/lifecycle extraction.
2. Finish timer/listener lifecycle ownership as mode/normal-intent controllers are extracted. Some delayed search entry/capture and normalization callbacks are still scheduled by `content.js`; module-local disposal is implemented, but application-level start/dispose is not complete.
3. Extract conversation store and UI surfaces via data/action callbacks, not a global mutable context. Preserve exact collection render cache and fixed five-slot layout.
4. Split CSS and the development asset loader only after auditing cascade order; retain the current CSS untouched until that boundary.
5. Complete docs, full automated verification and one compact Chrome validation route before Debt Review. No whole-story completion, live validation, merge, push or release is claimed.

Latest code checkpoint: `3997ee5` (manual search gate); prior slices `7a43576`, `83ed9d5`, `951a7b3`, characterization `30a3be8`. All work is in the DS6 worktree. The stable main worktree must remain unchanged. No uncommitted implementation is intentionally left at this checkpoint.
