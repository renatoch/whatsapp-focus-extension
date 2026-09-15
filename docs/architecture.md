# Extension Architecture — DS6 migration

DS6 is in progress on `refactor/ds6-modular-architecture` in the separate
`whatsapp-focus-extension-ds6` worktree. The original worktree and its Chrome
installation remain on `main`. This document describes implemented boundaries,
not an assertion that the entire refactor is finished.

## Load order and composition

Manifest content scripts load synchronously at `document_start`:

1. `awareness.js`, `focus-state.js`, `focused-recents.js`, `fixed-collections.js`: existing pure rules/storage adapters.
2. `scripts/whatsapp-dom.js`: exports an injected factory; no import-time DOM access.
3. `content.js`: constructs the adapter and currently still owns remaining controllers, UI, timers and bootstrap.

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
Nested-view helpers, readiness/progress and empty-search isolation remain in
`content.js` for the next adapter slice. Search policy remains outside the adapter.

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
