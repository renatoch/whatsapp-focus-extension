# Extension Architecture — DS6 migration

DS6 is in progress on `refactor/ds6-modular-architecture` in the separate
`whatsapp-focus-extension-ds6` worktree. The original worktree and its Chrome
installation remain on `main`. This document describes implemented boundaries,
not an assertion that the entire refactor is finished.

## Load order and composition

Manifest content scripts load synchronously at `document_start`:

1. `awareness.js`, `focus-state.js`, `focused-recents.js`, `fixed-collections.js`: existing pure rules/storage adapters.
2. `scripts/whatsapp-dom.js`: exports an injected factory; no import-time DOM access.
3. `scripts/focused-navigation.js`: injected hidden-search controller; owns its bounded polling and confirmation timers.
4. `scripts/search-gate.js`: isolated manual-search settlement policy and timer.
5. `scripts/recent-capture.js`: bounded header confirmation and cancellation for deliberate recent capture.
6. `scripts/mode-controller.js`: root-class transitions plus cancellable delayed search/focused entry.
7. `content.js`: constructs the factories and still owns remaining controllers, UI, timers and bootstrap.

No bundler or new dependency. Factories expose an isolated-world browser namespace
and CommonJS exports for Node tests. Names returned from a factory close over its
injected dependencies, not a giant mutable application context.

## Native adapter (first slice)

`createWhatsAppDom({ document, window, debugLog?, describeElement? })` owns title
and row reading, search-field discovery/read/write/clear, candidate enumeration
and the evidenced `mousedown` activation. It returns actual native targets,
preserving identity between consecutive stability polls. It neither schedules
navigation nor persists titles. Debug behavior remains governed by the existing
`DEBUG = false` composition setting.

`tests/whatsapp-dom.test.js` exercises the public factory with synthetic fixtures.
The same six assertions were first run against the pre-extraction code.
The adapter also owns nested-view discovery/exit, Chats button selection,
readiness/progress and empty-search structural isolation. Composition injects
`isMirrorControl` and the overlay ID so native discovery never selects extension
controls. Scheduling the Chats normalization callback remains a controller
responsibility. Search policy remains outside the adapter.

## Focused hidden navigation

`createFocusedNavigation({ native, rules, scheduler, now?, normalizeChats,
onBegin, onOpened, onFailure })` owns one active hidden reopening, structural
diagnostics and target stabilization. UI callbacks receive the outcome; the
controller never reads root classes, persists titles or renders DOM. Initial
inspection remains 100 ms, retries 150 ms, at most 11 inspections. Header
confirmation remains mandatory. `cancel` clears pending timers and invalidates
late normalization callbacks; `dispose` additionally rejects new requests until
`start`. Mode exits in composition cancel pending hidden navigation. Existing
recency and telemetry policy stays in the success/failure callbacks.

The public-factory stability suite also covers persistent/transient ambiguity,
changing target identity, mismatched query/header, missing fields, disposal and
restart. No source extraction is used for polling tests now.

## Manual search gate

`createSearchGate({ readText, isSearching, onState, scheduler, minimum, delayMs })`
reports gate state without constructing UI. It preserves the one-second initial
reveal, three-character threshold and no repeated delay once results are visible.
Reset/dispose invalidate stale settlement callbacks. Composition renders the
reported flags and keeps the independent empty-search navigation choice.
`tests/search-gate.test.js` exercises time and cancellation directly; the
empty-search integration suite connects this real factory to the UI bridge.

`tests/bootstrap.test.js` loads scripts in actual manifest order, verifies no
factory module reads the DOM at import time, then checks blind root classes
before `document.body` exists. This is a composition check, not live Chrome E2E.

## Recent capture

`createRecentCapture({ readTitle, normalizeTitle, onCaptured, scheduler, retries })`
owns header confirmation: one immediate inspection and up to five retries at
300 ms. Only deliberate capture requests can add a title; incoming activity does
not start capture. Superseding a request, cancel or dispose clears the owned timer
and invalidates queued callbacks. Start permits reuse after disposal. Composition
keeps recency updates and route-specific awareness outside the controller.

`tests/recent-capture.test.js` exercises the public factory. The existing opening
route tests now use that factory too, retaining VM bridges only for not-yet-extracted
click/keyboard wiring and Continue ordering. Deliberate capture confirmation remains
owned here while the mode controller owns when the delayed request begins.

## Mode transitions and delayed entry

`createModeController(...)` owns the established root-class mutations for active,
normal, search, sidebar-open, sidebar-hidden, focused and hidden-navigation states.
It receives narrow operational callbacks and a focused `surfaces` callback group;
it does not read storage or native selectors. Composition retains small delegating
wrappers so not-yet-extracted listeners and normal/intent flows keep stable call sites.

The controller owns the 100 ms search handoff and the 250 ms focused transition plus
350 ms capture chain. Every public transition invalidates owned work. Generation
guards also reject callbacks that a scheduler invokes after cancellation, late Chats
normalization, superseded selections and reentrant callbacks that switch mode.
`dispose` rejects transitions until `start`; this is controller-local lifecycle only,
not yet application-wide listener/observer disposal.

`tests/mode-controller.test.js` uses a deterministic scheduler at exact boundaries,
checks existing class/effect ordering, latest-selection behavior, mode changes between
delays, forced stale callbacks, reentrancy and restart. Continue, full-mode capture,
recent/collection success and expiry remain integration contracts in their existing
tests. Native normalization's own 260/360 ms callbacks remain in composition.

## Invariants during extraction

Keep schema keys, recent/collection limits, exact unique target stabilization,
manual search delays, native event dispatch, empty-search isolation, panel
geometry, expansion and scroll behavior unchanged. Native selectors may move,
but must not silently change. Preserve side-effect ordering and existing root
classes. Tests covering not-yet-extracted controllers still use VM bridges;
migrate those to public factory tests when their owning module is extracted.

## Verification

Run `node --test tests/*.test.js`, syntax-check every changed JS module, parse the
manifest, and run `git diff --check` before committing each extraction boundary.
Live Chrome validation is required before final DS6 acceptance, but is not required
for the Navigator after every internal extraction. No merge/push/release is
implied by local verification.
