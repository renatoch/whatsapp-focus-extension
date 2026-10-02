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
7. `scripts/normal-mode.js`: confirmation/countdown and temporary-normal-access timers.
8. `scripts/intent-controller.js`: prompt/attempt state and outcome association.
9. `scripts/dev-assets.js`: CSS/config conversion, refresh cache and owned interval.
10. `scripts/ui/toast.js`: toast rendering and cancellable dismissal timer.
11. `content.js`: constructs the factories and still owns remaining controllers, UI, timers and bootstrap.

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

## Normal confirmation and temporary access

`createNormalMode` owns confirmation timeout/interval, the recent-attempt route flag,
bypass timeout and separate generation guards. Injected constants preserve the
8-second barrier, 200 ms countdown display tick and 5-minute bypass. UI hooks are
`prepare(): boolean`, `reset()`, `setPending()`, `setRecent()`,
`updateWarning(lastOpenedAt)` and `setCountdown(seconds)`; selectors, markup and
copy remain in composition. Storage, attempt timestamps, intent declarations and
outcome association remain outside this factory.

Operations are `beginConfirmation`, `clearConfirmation`, `openNow`,
`openTemporarily(route)`, `cancelBypass`, `resetRecentAttempt`, `dispose`, `start`.
Confirmation cleanup deliberately does not cancel bypass. This permits the mode
controller's nested cleanup during normal entry without invalidating the new bypass.
A separate request generation lets a reentrant new confirmation supersede an
unfinished opening without cancelling an already-live bypass. Composition calls
`resetRecentAttempt` when finishing its existing intent attempt.
Both manual focus entry handlers cancel bypass through the factory.

Expiry reads destination at firing time, emits the existing event, and normalizes
Chats before focused entry. Late normalization checks its bypass generation and
current native root mode; completion is single-use. Cancel/dispose/reopen invalidate the old completion;
callbacks forced after cancellation are inert. Disposal is controller-local and
emits no extra telemetry. Intent UI/state, outer listeners/observers and native
normalization helper delays are still not application-disposable.

The six new baseline cases ran against the old VM bridge before extraction;
`tests/normal-mode.test.js` now exercises the factory, including handle 0, exact
boundaries, reentrancy, stale callbacks and restart. The previous characterization
file now integrates real normal/mode factories with the still-composed attempt,
manual-control and Continue wiring. Final live Chrome equivalence remains pending.

## Intent and attempt association

`createIntentController` owns the prompt clock, attempt clock and pending authored
declaration. Injected UI hooks only check overlay availability, read/validate the
form and show/hide/reset prompt fields. Clock/attempt-ID creation, awareness sink,
normal-confirmation hooks and active-mode callback are injected. Composition no
longer duplicates these three state values; all factories are inert until boot.

`begin`, `proceed`, `decline`, `returnToFocus`, `clearPrompt`, `beginAttempt`,
`finishAttempt` and `cancelPendingAttempt` preserve declaration versus attempt
semantics, event order and routes. Resetting the prompt alone does not discard a
pending attempt. Authored input reaches only existing intent outcomes; aggregate
attempt events do not acquire note/title data. Existing awareness sanitization and
280-character authored-note policy remain unchanged.

Generation checks protect synchronous reentrant callbacks. Completed association
is detached before invoking event sinks; a newer action cannot be overwritten by
old cleanup. `dispose/start` clears private state without telemetry/UI effects and
does not manage the separate normal-mode timers or application listeners.

Six cases were characterized against the old source before extraction, then moved
to the factory with VM bridges only for still-composed field rendering/reading.
Normal-mode integration uses all three real controllers (mode, normal, intent).

## Development assets

`createDevAssets` receives fetchText, style application, config conversion, error
reporting and scheduler dependencies. Pure `cssFromConfig` preserves the existing
fragment order, default geometry, selector interpolation and escaping. Native styles
are not split yet. Composition retains extension URL/cache-busting fetch and style
node creation; no manifest resource/permission changes were needed.

`start` performs an immediate pass and owns one 1-second interval; repeated start
is inert. `refresh` keeps CSS-before-config ordering and unchanged-content caches.
Slow passes are single-flight so an older response cannot roll newer styles back.
This bounds asynchronous ownership rather than altering the interval cadence.
Existing partial-failure semantics are preserved: valid CSS can apply even when
config is malformed, which keeps the previous config override. Empty CSS does not
clear styles; an empty converted config does clear previous overrides.

`dispose` clears the interval, invalidates queued ticks and async completions, and
retains the already-applied styles. Restart permits fresh work while obsolete fetch
results/errors are ignored; it does not abort browser fetches already in progress.
The five baseline cases passed against the original implementation before migration
to the factory; lifecycle tests include handle 0, slow fetches, restart, stale tick,
reentrant disposal and unchanged fetch URL/no-store behavior.

## Toast surface

`createToast({ document, scheduler, id, copyDiagnostic })` owns toast rendering and
one dismissal timer. It preserves textContent, button copy/classes, DOM reuse,
5-second ordinary and 10-second diagnostic duration. `show/hide/dispose/start` guard
stale timeout and detached-button callbacks across replacement and restart. No DOM
access occurs during construction. Clipboard serialization/fallback remains in
composition; disposal cannot cancel an already-started clipboard operation.
Baseline UI cases ran before extraction (196 tests); final surface/lifecycle suite
passes 198 tests. Stable toast manual acceptance remains pending.

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
