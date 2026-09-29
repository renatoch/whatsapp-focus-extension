# Astra → Sol → Astra: mode transitions and delayed focused entry

## Authority and execution boundary

Navigator authorized resuming DS6 and this model-separated cycle. This is a bounded
implementation handoff within the approved DS6 plan, not approval to finish DS6.

- Work only in `/mnt/e/renato/mirror/focus-lab/whatsapp-focus-extension-ds6`.
- Branch: `refactor/ds6-modular-architecture`; inspected base: `1f57f2b`.
- Main and its installed extension stay untouched. Never modify runtime `.mirror/`.
- Sol implements and runs checks, then stops BEFORE commit or push for Astra review.
- Astra reviews behavior and tests before permitting a checkpoint commit/backup.
- No merge, release, package, new feature or selector changes.
- Before each substantial step, read only sanitized quota fields from
  `~/.pi/agent/codex-usage-status.json`. Both consumed percentages must be <70.
  If hourly usage is >=70, stop and ask Navigator with reset time. If weekly usage
  is >=70, suspend refactor. Missing/stale quota data does not imply permission.
- Planning snapshot: Astra, 6% hourly / 26% weekly. Recheck; do not reuse it as live evidence.

## Goal

Extract mode-transition ownership from content.js and give the two-stage focused
entry timer an explicit cancellable owner. Preserve the existing normal/intent
policy, native normalization, UI geometry, selectors, storage and telemetry.

Read implementation-notes.md, architecture.md, plan.md and test-guide.md first.
The earlier five-recent references are historical: retain ten recents, five visible
initially, session expansion, modal priority and dismissible diagnostics.

## Scope and proposed boundary

New factory `scripts/mode-controller.js`, exposed with the existing browser namespace
plus CommonJS pattern. No import-time DOM access; load before content.js.

Move the transition policy for these existing functions:

- setActive({ showOverlay })
- setNormal()
- setSearchMode()
- setSidebarOpen()
- setSidebarHiddenManually()
- setSearchFocusedConversation()
- beginHiddenNavigationSurface()
- enterFocusedConversationSoon(expectedTitle)

Small delegating wrappers in content.js are acceptable to avoid unrelated call-site
churn. Native helpers, query functions, event listeners, rendering implementations,
Continue, expiry, normal-mode intention/countdown/bypass, dev refresh and bootstrap
remain in composition for this checkpoint.

Inject narrow named dependencies: root-class access, scheduler, readiness predicate,
existing operational cancel/reset callbacks and surface hooks. Group coherent UI
hooks if useful; do NOT pass a mutable global context, content.js scope or all stores.
Controller owns class transition decisions and timer sequencing. UI hooks only
ensure/render surfaces, set overlay visibility, or perform existing intent cleanup.
Document the actual dependency interface after implementation.

Avoid extracting a generic timer library or creating extra modules for this slice.

## Preserve ordering and effects

Characterize current behavior before moving it. Compare exact class additions,
removals and retained unrelated classes, not merely the final 'mode' label.

1. Active: cancel hidden navigation/capture, close chooser, cancel pending attempt
   when present, clear intent prompt state, clear normal delay, update streak;
   apply classes; ensure current controls/surfaces; render recents and collections;
   apply requested overlay visibility.
2. Normal: preserve existing hidden-navigation cancel, chooser close and normal-delay
   cleanup, class changes and overlay hiding. Do not silently introduce changes to
   full-mode capture policy or bypass scheduling.
3. Search: preserve cancellation and readiness fallback to active overlay. If ready,
   reset gate, apply classes, collapse collection selection as today (not recent
   expansion), ensure/render known navigation, update empty query and hide overlay.
   After 100 ms call existing Chats normalization then focus native search with its
   existing options. Preserve the helper's 260 ms normalization and 360 ms fallback
   delays; do not migrate their implementation in this slice.
4. Sidebar modes: preserve their exact class mutation lists and overlay hide. Do not
   normalize all classes via a new mutually-exclusive state representation.
5. Focused: reset gate; add active/search-focused/sidebar-hidden; remove exactly the
   existing conflicting classes; ensure/render current focused controls; hide overlay.
6. Hidden navigation entry: cancel capture and reset gate, apply its current class
   list, hide overlay and render recents. Do NOT cancel focusedNavigation itself from
   its onBegin callback, which would cancel the request being started.
7. Continue must retain normalize → setActive(false) → focused → capture without
   search telemetry. Existing expiry and recent/collection success routes stay intact.

## Delayed operations and lifecycle

The controller owns the 100 ms search-entry timer and the 250 ms + 350 ms focused
entry chain. Use owned timer handles and generation guards.

- A deliberate search selection schedules focused transition at 250 ms, then capture
  at 350 ms after that transition. Preserve expected title and default search route.
- A second selection supersedes the previous chain; the latest target wins.
- Explicit mode transitions invalidate pending mode-entry work and post-transition
  captures from earlier requests. This is lifecycle correctness required by DS6,
  not permission to change normal/intent timing or capture policy generally.
- The internal focused transition at 250 ms must not invalidate its own subsequent
  350 ms capture. Use an internal apply step versus public transition entry, or an
  equally explicit operation-token design. Reentrant callbacks must not revive an
  obsolete chain.
- When the 100 ms search entry has already handed off to Chats normalization, a
  later mode change must invalidate the completion callback before it can focus
  native search. Normalization already performed is not undone.
- dispose cancels all owned timers and rejects further transitions/requests until
  start. Repeated start/dispose must be safe. Do not claim application-wide disposal:
  the outer listeners/observers and native helper delays still have other owners.
- Do not introduce a second authoritative mode state that can drift from root classes.

## TDD and acceptance tests

First create behavioral characterization against existing transitions using the
project's temporary VM bridge convention; then move equivalent assertions onto the
public factory, retaining the same effect ordering and class fixtures.

Use synthetic data and a deterministic scheduler capable of advancing to exact
boundaries, cancelling handles and deliberately invoking already-queued callbacks.

Required cases:

- All seven immediate transitions: class mutations, callback ordering, relevant
  overlay visibility and no accidental clearing of unrelated classes such as native
  modal state/recent expansion state.
- Search unavailable → active overlay, with no scheduled native search.
- Search ready: no normalization before 100 ms; normalize then focus with existing
  options; late normalized callback is inert after mode exit/dispose.
- Delayed focused entry: nothing at 249 ms, focused at 250 ms, no capture before
  another 350 ms, exact expected title captured once afterward.
- Two selections: only latest chain survives, both before and after first transition.
- Mode change before 250 ms and between 250/600 ms: no stale transition/capture.
- Cancelled callback invoked anyway: no UI/capture changes.
- Dispose/restart: no pending work or post-disposal effects; fresh request works
  after start, and repeated lifecycle calls do not install timers by themselves.
- Preserve Continue ordering and no false search telemetry for full-mode/Continue;
  preserve recent/collection success and expiry integration assertions.
- Manifest order/bootstrap: factory imports do not touch DOM and blind state still
  precedes body availability. Update exact manifest expectations where necessary.

Keep source assertions only where they establish composition/CSS contracts. Do not
replace meaningful behavioral checks with a regex that merely finds a method name.
Do not test only a mock that reimplements the production transition policy.

## Files expected to change

- New scripts/mode-controller.js and tests/mode-controller.test.js.
- content.js: injected composition and delegating wrappers.
- manifest.json plus tests with exact load-order contracts.
- Existing transition/entry integration tests as their owning boundary moves.
- docs/architecture.md and implementation-notes.md with actual outcomes and limitations.

No CSS, storage schemas, native selector strings or main-worktree files need changes.
If one seems necessary, stop and explain rather than expand scope.

## Checks and Sol handback

Run full Node suite, syntax-check content.js and every scripts/*.js module, parse
manifest JSON and run git diff --check. Do not claim green until executed.

Report:

1. Files and responsibilities moved; important decisions or deviations.
2. Actual before/after line counts for content.js and new production module(s),
   separating production growth from tests/docs (no promised reduction target).
3. Test commands/results and any remaining source bridges/lifecycle ownership gaps.
4. Current quota percentages and measurement freshness.
5. Explicit status: ready for Astra review, uncommitted, not pushed, no Chrome
   equivalence claimed. Request model switch; do not continue into normal/intent extraction.

Astra review must inspect the complete diff and behavioral tests, especially
self-cancellation, callbacks reentering transitions, hidden-navigation onBegin,
Continue cleanup ordering and pre-body bootstrap. Resolve findings and rerun checks
before commit/backup. Final DS6 Chrome acceptance and debt review remain later gates.
