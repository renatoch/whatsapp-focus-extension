[< Parent](../index.md)

# DS6 — Modular Extension Architecture

**Status:** 🟡 DS Plan — awaiting Navigator approval

---

## Outcome

Make the extension safer and cheaper to change by separating WhatsApp DOM access, navigation, state transitions, and UI surfaces into cohesive modules. Preserve the current user experience and privacy boundaries rather than merely splitting files by line count.

## Context

The Navigator requested a dedicated refactoring Delivery Story after DS5's collection surface correction. Pure rules already live in `awareness.js`, `focus-state.js`, `focused-recents.js`, and `fixed-collections.js`, but DOM orchestration and UI remain concentrated in `content.js`.

Planning baseline at code commit `2f9f6e3`, accepted in `469a85c`: `content.js` has 2,214 lines and `focus.css` has 1,187 lines. The last automated run passed 77 tests, including source-level and source-sliced VM contracts; those contracts alone do not establish runtime equivalence.

Navigator requested DS6 planning after accepting the stabilized reopening adjustment. DS6 is now the active planning item in Delivery Story flow. See [plan.md](plan.md) and [test-guide.md](test-guide.md). Implementation remains blocked until plan approval. DS5's separate aggregate lifecycle evidence is not retroactively closed by this request.

## Scope

- Inventory responsibilities and dependencies before choosing final module boundaries.
- Add behavioral characterization tests for the seams being extracted, including state transitions and navigation failure paths.
- Isolate WhatsApp selectors, title reading, native search interaction, and evidenced result activation behind a DOM adapter.
- Separate focused search/navigation orchestration from rendering and persistence.
- Centralize existing mode transitions and timer ownership without redesigning their semantics.
- Extract overlay/full-mode/intent/awareness UI and focused recents/collections UI into cohesive surface modules.
- Divide CSS by surface while preserving selector specificity, cascade order, and development refresh behavior.
- Keep `content.js` as a small composition/bootstrap entry point with explicit dependencies and lifecycle ownership.
- Update manifest load order, development asset loading, architecture documentation, and test commands together.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| DS6.TS1 | Characterize existing behavior and define module contracts | Technical Story | Behavioral tests and a dependency map establish extraction seams and regression evidence. | Candidate |
| DS6.TS2 | Isolate the WhatsApp DOM adapter and focused navigation | Technical Story | Selectors and native activation have one owner; navigation can be exercised with a controlled adapter. | Candidate |
| DS6.TS3 | Centralize mode transitions and lifecycle ownership | Technical Story | Existing state transitions, timers, listeners, and observers have explicit ownership without behavior changes or duplicate installation. | Candidate |
| DS6.TS4 | Extract cohesive UI surface modules | Technical Story | Overlay, intent/awareness, and focused recents/collections rendering are separated from bootstrap and native DOM interaction. | Candidate |
| DS6.TS5 | Split styles and simplify extension composition | Technical Story | Surface styles and script loading preserve cascade and execution order; content.js becomes the composition entry point. | Candidate |
| DS6.TS6 | Verify equivalence and document maintenance boundaries | Technical Story | Automated evidence and targeted Chrome validation confirm unchanged behavior, persistence, and privacy; module ownership is documented. | Candidate |

## Invariants

- Blind start, three-character manual search gate, one-second initial reveal, and hidden-sidebar focused state remain unchanged.
- Preserve exact unique hidden-search reopening, bounded polling, the evidenced `mousedown` activation, and fail-closed recovery.
- Preserve normal-mode timing, intent outcomes, graceful expiry, and existing storage keys/schema compatibility.
- Recent titles remain session-only; collections persist only explicitly selected titles and authored collection names.
- Collections remain on the focused surface and in empty manual search, not the overlay. Preserve five recents, five collections × ten members, fixed recent-slot height, retained expansion/scroll during switching, opaque panel and empty-search native isolation.
- Preserve two consecutive unique-target observations before activation, bounded retries and structural sample diagnostics.
- No title-bearing telemetry, broader WhatsApp data collection, archival mutation, or persistence expansion.

## Non-Goals

- New product features, native mark-unread, unread batches, visual redesign, or new friction.
- Framework migration, bundler adoption, or a new build system without a separately justified plan decision.
- Arbitrary file-size targets that produce fragmented modules or circular dependencies.
- Push, release, packaging, deployment, or public distribution.

## Validation Approach

Use test-first characterization and small reviewable extraction commits. Replace extraction-sensitive source assertions with meaningful behavioral tests where practical; retain privacy and manifest contracts. Run the full suite, syntax checks, manifest validation, and diff checks after each extraction boundary.

Live Chrome validation should target changed integration seams: blind entry, search to focus, recent and collection switching, failure recovery, normal-mode return/expiry, and reload persistence. Reuse existing evidence for unchanged paths rather than asking for repeated exhaustive manual testing. Do not claim equivalence from source-pattern assertions alone.

## Done Condition

The extension's bootstrap, DOM adapter, navigation/state ownership, UI surfaces, and styles have explicit cohesive boundaries. No feature implementation requires routinely editing a monolithic content script. Automated checks and targeted live Chrome evidence show preserved behavior and privacy, documentation explains module ownership and load order, and Navigator validation plus Ariad Debt Review are complete.
