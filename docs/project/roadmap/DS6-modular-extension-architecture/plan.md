# Delivery Story Plan — DS6

**Journey:** extensao-chrome-foco-whatsapp-web
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Modular Extension Architecture

## Objective

Decompose extension DOM integration, mode/navigation ownership, UI surfaces and CSS into cohesive testable modules, preserving validated behavior, privacy, storage compatibility and manual reload workflow without adding features.

## Child Work Packages

- DS6.TS1
- DS6.TS2
- DS6.TS3
- DS6.TS4
- DS6.TS5
- DS6.TS6

## Scope

Refactor the current working extension, not an earlier DS1/DS5 snapshot. Planning baseline is code at `2f9f6e3` with its stabilization accepted in `469a85c`: 2,214 lines in `content.js`, 1,187 in `focus.css`, and 77 previously passing tests. Planning itself does not run implementation or claim new test evidence.

### Proposed module boundaries

Keep existing pure modules and storage schemas compatible. Use synchronous factory modules in the MV3 isolated world, loaded explicitly before `content.js`, with CommonJS exports for Node tests as in the existing pure modules. No framework, bundler, runtime dynamic imports, or build requirement.

| Boundary | Responsibility and proposed location | Must not own |
|---|---|---|
| Native adapter | `scripts/whatsapp-dom.js`: title/row reading, search discovery/entry/clear, Conversas/Chats normalization, nested views, native activation, readiness/progress, structural empty-search isolation | Extension UI, persistence, intent decisions |
| Mode controller | `scripts/mode-controller.js`: existing root-class transitions and entry/exit orchestration; Continue and search share the focused destination | Native selector knowledge, template markup |
| Focused navigation | `scripts/focused-navigation.js`: manual gate, hidden reopening, capture tokens, stable unique target polling, bounded diagnostics | Storage and UI construction |
| Conversation stores | `scripts/conversation-store.js`: five tab-only recents; asynchronous isolated collection persistence through existing pure models | DOM inspection, activity-based automatic additions |
| Normal/intent controller | `scripts/normal-mode.js`: declaration/attempt/outcome lifecycle, eight-second barrier, recent-use warning, five-minute bypass and expiry decision | Reading WhatsApp messages or composition state |
| Focused UI | `scripts/ui/focused-navigation.js`: shelf, collection chooser, add/remove/delete controls, expansion/render cache/scroll preservation | Native search and navigation polling |
| Overlay UI | `scripts/ui/overlay.js`: blind card, loading/streak presentation, intent/normal confirmation controls | Timer or persistence ownership |
| Awareness UI | `scripts/ui/awareness-panel.js`: private summary, authored notes, pause/clear/export controls | New telemetry fields |
| Shared controls | `scripts/ui/controls.js`: return/sidebar/search controls and toast/diagnostic copy | Business state or selector duplication |
| Runtime assets | `scripts/dev-assets.js`: existing ordered CSS refresh and development configuration | Public release hardening or automatic Chrome reload |
| Composition | `content.js`: early blind-state setup, factory construction, dependency wiring, one bootstrap | Feature templates, collection algorithms, polling loops |

These are responsibility boundaries, not a quota of files. Split a still-coherent but oversized renderer further by surface if needed; do not replace the current monolith with a giant generic context or utility module. Target `content.js` around 200 lines or less, excluding documentation; exceeding roughly 400 lines in a new module triggers review of responsibilities, not mechanical slicing.

### Dependency and lifecycle contract

- Pure models have no DOM or controller dependencies.
- Adapter and storage boundaries are injected into controllers; renderers receive data and action callbacks rather than calling other controllers by global name.
- Composition wires narrow callbacks/snapshots. No mutable shared `context` exposing every feature's internals, circular imports, or module-load DOM side effects.
- The mode controller owns transitions; each operational controller owns and cancels its timers/tokens. A top-level start/dispose lifecycle installs listeners/observers once and tears down owned resources.
- Preserve the current operational reload model: manual extension/WhatsApp reload. Lifecycle ownership is not a new JS hot-reload feature.
- Keep references needed for unique-target stability only in transient navigation state; do not serialize them.

### Extraction sequence / review boundaries

1. **DS6.TS1:** map functions to owners and characterize the current entry routes, search gating, exact navigation, normal-mode/intent lifecycle and UI continuity. Replace source-sliced VM tests with public-factory behavioral tests as extraction proceeds, preserving original regression assertions.
2. **DS6.TS2:** extract the native adapter, then focused navigation using injected adapter, scheduler and callbacks. Keep selector text and evidenced event dispatch unchanged. Verify stable target identity across polls.
3. **DS6.TS3:** extract mode and normal/intent orchestration; preserve ordering such as normalize → cancel pending confirmation → focused destination → capture, plus token invalidation. Add start/dispose/restart tests.
4. **DS6.TS4:** extract conversation stores and UI surfaces. Keep markup/classes, textContent rendering, collection render cache, scroll restoration and five-slot geometry unchanged.
5. **DS6.TS5:** leave a small composition entry point; split CSS by native visibility/search, overlay/intent, navigation/collections, awareness and controls. Audit cascade dependencies before moving rules. Preserve an explicit authoritative load order in manifest and development refresh; refresh all fragments as one ordered snapshot to avoid partial CSS states. Update web-accessible resources only as necessary for the existing refresh mechanism; no broader host matches or permissions.
6. **DS6.TS6:** complete automated equivalence evidence, architecture documentation and a short targeted Chrome route. Resolve regressions before Navigator acceptance and Debt Review.

Use small functional commits by extraction boundary, with green checks at each boundary. No giant all-at-once rewrite.

## Non-Goals

No new features, UI redesign, renamed user-facing controls, new recent/collection limits, native mark-unread, collection unread lookup, selector experimentation, changed delays, persistence migration, dependency framework, bundler, distribution hardening, release/package/push/deploy, or automatic Chrome reload. Do not fix unrelated discovered behavior silently: record and separate it.

DS5's aggregate lifecycle closure is not implied by the acceptance of individual fixes or this planning request. Retain its pending aggregate evidence/debt history; do not manufacture completed validation for it while planning DS6.

## Acceptance Behavior

```text
Given the extension is installed from the same unpacked directory
When the tab starts or reloads
Then blind state precedes intentional entry, persisted collections survive,
And recents and expansion remain session-only.

Given empty manual search
When known conversations exist
Then the shelf appears without competing native filters/suggestions,
And typing hides it, clearing restores it, native results require three characters
And the initial result reveal still waits one second.

Given Continue, native full-mode selection, search, a recent or collection member
When the selected header is confirmed
Then the five-item recency rule remains unchanged
And Continue/hidden reopening reach the same focused surface.

Given hidden reopening with transient or persistent duplicates
When results are sampled every 150 ms within the existing bounded window
Then only the same unique exact target in two consecutive accepted-query samples opens
And persistent ambiguity, cancellation or unstable targets fail closed.

Given an expanded collection
When members open sequentially and recent membership grows
Then its panel stays visible, expanded and in place with preserved scroll,
And five recent slots prevent the collection from shifting under the pointer.

Given existing normal-mode, intent, expiry and awareness flows
When the same actions occur after extraction
Then destinations, timings, event allowlists and storage outcomes are equivalent.
```

## Validation Route

E2E is required for DOM integration and CSS continuity; source assertions cannot prove equivalence. Follow `test-guide.md`. Automate the broad regression matrix with fake native DOM fixtures and deterministic schedulers, then request one compact live Chrome route concentrated on changed integration seams. Reuse already accepted product behavior as baseline rather than demanding repeated exhaustive user testing. Baseline 77 tests must retain equivalent or stronger coverage even if tests move or split; test count alone is not the success criterion.

## Implementation Contract

- Characterize before extracting; fix a failing regression before continuing to another boundary.
- Keep `chrome.storage.local` keys, allowlisted schemas, authored-note limits, awareness retention and existing legacy behavior unchanged. No automatic title persistence beyond selected collection members.
- Do not introduce real WhatsApp content into fixtures, logs, screenshots, documentation or commits. Use synthetic names and structural diagnostic samples.
- Keep extension UI markers/IDs and native isolation behavior compatible throughout extraction. Preserve current factory and CSS loading at `document_start`; do not introduce asynchronous gaps before blind-state setup.
- Preserve the exact polling budget (initial 100 ms, 150 ms retries, up to 11 inspections), two-observation unique-target rule, bounded structural diagnostics and native mousedown activation.
- Add `docs/architecture.md` covering module ownership, load order, entry transitions, persistence boundaries, timer/disposal ownership and how to test/change a feature. Update README maintenance/test instructions.
- Stop for scope/privacy changes, uncertain native behavior, unresolvable regressions or proposed new dependencies. Planning is not approval to implement; push/release/deployment remain separately unauthorized.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
