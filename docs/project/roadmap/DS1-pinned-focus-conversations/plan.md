# Delivery Story Plan — DS1

**Journey:** extensao-chrome-foco-whatsapp-web  
**Method:** ariad  
**Navigator Flow Unit:** delivery_story

## Delivery Story

Focused Recent Conversations

## Objective

Validate and build a privacy-bounded session working set of up to four unique conversations opened through focused search, available on focused surfaces and reopenable without exposing the full list. Begin with the technical uncertainty: capture only the visible title in tab memory and prove exact, ambiguity-safe reopening through a visually hidden native-search path. Then add bounded automatic membership, focused-surface controls, remove/clear behavior, and aggregate title-free experiment events.

## Child Work Packages

- DS1.TS1 — Validate private title capture and exact focused reopening
- DS1.US1 — Build the automatic session recent set
- DS1.US2 — Show focused recents on focused surfaces
- DS1.US3 — Reopen a focused recent without exposing the full list
- DS1.US4 — Remove or clear focused recents
- DS1.TS2 — Record aggregate experiment outcomes

## Scope

1. Add a small pure in-memory recent-set module with a maximum of four unique titles and deterministic add/reorder/remove/clear behavior.
2. Capture the visible title only after a conversation is opened through the focus search flow. Prefer the active conversation header after navigation rather than retaining the typed search term or unrelated result DOM.
3. Keep the set in JavaScript memory owned by the content script. Reloading the extension/page or closing the tab clears it.
4. Exclude conversations visited through full mode and do not seed from WhatsApp's own recent list.
5. Render a compact **Conversas em andamento** shelf:
   - on the blind Modo Foco overlay when entries exist;
   - in focused-conversation state so switching does not require returning to the overlay;
   - hidden during manual native search and full mode.
6. Render only plain-text conversation titles, with controls to open, remove one entry, or clear the set.
7. Reopen an entry through the existing Chats/Conversas normalization and native search while a dedicated internal-navigation class keeps all intermediate list/results visually hidden.
8. Match a normalized title exactly. Open only when one unambiguous exact result exists; never select the first partial result.
9. On missing, duplicate, or changed titles, fail closed: preserve focus protection, show a neutral error, and offer ordinary intentional search rather than exposing results automatically.
10. Add only title-free aggregate awareness events sufficient to compare focused search/recent navigation, failures, and full-mode reopening. Keep the existing retention and event cap.
11. Preserve DS3 history and existing blind start, three-character search gate, one-second search settle, graceful expiry, Archived normalization, sidebar controls, and full-mode behavior.

## Privacy And Security Boundary

The Navigator explicitly accepted temporary retention of conversation titles under these limits:

- titles exist only in the current tab's JavaScript memory;
- no title may enter `chrome.storage.local`, page `localStorage`, awareness events, console/debug logs, exports, URLs, attributes used for persistence, or project files;
- do not capture previews, messages, unread state, timestamps, badges, phones, JIDs, URLs, drafts, audio state, search history, or DOM snapshots;
- all dynamic titles render through `textContent` or equivalent safe text APIs;
- aggregate events contain route/action/failure enums only;
- clear and remove actions must immediately discard the corresponding in-memory value.

## Technical Design

### Pure recent-set boundary

Create `focused-recents.js`, exposed in the same lightweight style as `focus-state.js`, with pure operations for:

- title normalization for equality only;
- adding/reordering a non-empty display title;
- enforcing four unique entries;
- removing one entry;
- clearing the set.

The module owns no persistence and no DOM access. Node tests cover its behavior.

### DOM adapter in `content.js`

Keep WhatsApp-specific selectors and orchestration in `content.js`:

- read the active conversation title after focus-search selection settles;
- update the in-memory set and rerender both shelf locations;
- enter a dedicated internal recent-navigation state;
- normalize to the main Chats view using the existing `goToMainChatsThen()` path;
- populate the native search field and dispatch the minimum input events WhatsApp requires;
- after native results settle, inspect candidate result titles and click only one exact match;
- transition through the existing focused-conversation state after selection;
- restore a safe focused surface on timeout, no match, or ambiguity.

Any new selector must be centralized, narrow, and covered by contract tests where practical. Debug logging must never print retained titles or inspected result text.

### Visual containment

Add CSS for the internal-navigation state before programmatic search begins. The native sidebar/result list remains hidden for the entire internal route, including settling and failure. The normal manual search flow remains unchanged.

### Aggregate awareness

Extend the allowlist with title-free enums only, preferably one event per completed or failed navigation:

- focused conversation opened via `search` or `recent`;
- recent navigation failed because `not-found`, `ambiguous`, or `title-unavailable`;
- optional remove/clear counts only if useful for evaluating whether the shelf becomes stale.

Do not include list size if it is not needed for the experiment. Because the 500-event cap may shorten the effective window at current usage volume, report the actual retained date range during analysis rather than assuming fourteen complete days.

## Non-Goals

- No durable pins, cross-tab sharing, sync, reload persistence, or browser-session persistence.
- No conversations derived from full mode, incoming activity, WhatsApp's recent list, unread state, or archived-list scanning.
- No previews, message content, timestamps, badges, contact metadata, phone numbers, JIDs, URLs, or search-term history.
- No fuzzy or first-partial-result auto-selection.
- No changing archival state.
- No frozen unread-processing batch.
- No removal of the DS3 prompt or eight-second barrier in this story; their future disposition is a separate product decision.
- No selector redesign outside the minimum focused-title and exact-result adapters.
- No release, push, deployment, or public distribution.

## Acceptance Behavior

1. **Given** an empty session set, **when** a conversation opens through focus search and its active title is available, **then** its title appears once in the focused recent shelf.
2. **Given** more than four unique focused conversations, **when** another is added, **then** only the four most recently focused titles remain.
3. **Given** an existing title is opened again through focus navigation, **when** it is added, **then** it moves to the most-recent position without duplication.
4. **Given** a conversation is visited through full mode, **when** focus mode returns, **then** that visit alone does not add it to the set.
5. **Given** retained entries, **when** the overlay or focused-conversation state is shown, **then** the same bounded plain-title shelf is available without previews or activity signals.
6. **Given** a retained title with exactly one native result, **when** it is selected, **then** the target conversation opens focused and the intermediate sidebar/results are never visible.
7. **Given** no exact result or multiple exact results, **when** internal navigation settles, **then** no result is auto-opened, the full list remains hidden, and a neutral recovery route is shown.
8. **Given** an archived conversation discoverable through native search, **when** its exact retained title is selected, **then** it can open without changing archival state; if WhatsApp does not expose it unambiguously, navigation fails safely.
9. **Given** remove or clear, **when** the user activates it, **then** the title disappears immediately from memory and both rendered shelves.
10. **Given** a page/content-script reload, **when** the extension boots again, **then** no prior conversation title is restored.
11. **Given** awareness export, storage inspection, or debug output, **when** the feature has been used, **then** no retained conversation title appears there.
12. **Given** existing focus flows, **when** the regression route runs, **then** blind start, manual search gating, focused conversation, sidebar normalization, graceful expiry, and DS3 historical summaries remain intact.

## Implementation Order

1. DS1.TS1: write pure contracts and a minimal DOM-oriented spike for active-title capture and exact-result classification; stop if exact reopening cannot fail safely.
2. DS1.US1: implement the bounded in-memory recent set and capture only after focus-search success.
3. DS1.US2: render the title-only shelf on overlay and focused-conversation surfaces.
4. DS1.US3: implement visually hidden internal search, exact unambiguous selection, timeout, and safe recovery.
5. DS1.US4: add remove and clear controls.
6. DS1.TS2: add title-free aggregate instrumentation and summary support needed for the experiment.
7. Run the full automated suite, syntax/manifest checks, privacy scans, and manual Chrome validation.

## Validation Route

### Automated

- pure recent-set tests for uniqueness, ordering, cap, removal, clear, and reload-by-construction;
- title extraction/result-classification tests using minimal synthetic DOM fixtures or pure adapter inputs;
- integration contracts proving internal navigation enables visual containment before native search and opens only one exact match;
- awareness allowlist tests proving unknown fields and attempted titles are stripped;
- full existing test suite plus JavaScript syntax and manifest checks.

### Manual Chrome E2E

Reload the extension, then:

1. Open four distinct conversations through focus search and confirm the shelf builds automatically.
2. Alternate among them from the focused conversation without seeing the full list or search results.
3. Reopen an existing entry and confirm no duplicate appears.
4. Open a fifth focused conversation and confirm the oldest leaves the shelf.
5. Remove one entry, clear the set, and confirm both surfaces update.
6. Visit a conversation through full mode and confirm it is not added merely because it was viewed there.
7. Try an archived conversation without changing archival state.
8. Exercise a missing or ambiguous title and confirm fail-closed behavior.
9. Reload the page and confirm the shelf is empty.
10. Export/inspect awareness and storage and confirm no conversation title is present.
11. Recheck blind start, manual search, sidebar controls, five-minute expiry, and usage summary.

E2E is required because title selectors, native search events, Archived behavior, and visual non-exposure depend on the live WhatsApp DOM.

## Experiment Reading

After several days of natural use, compare:

- full-mode openings and openings soon after focused expiry;
- focused navigation by search versus recent shelf;
- recent-navigation failure rate;
- whether the shelf is removed/cleared often;
- the Navigator's qualitative sense of reduced working-memory cost.

The extension records episodes, not motive. A reduction in full-mode opening is evidence about navigation fit, not a diagnosis of prior behavior.

## Implementation Contract

- TDD for pure behavior and awareness changes.
- Keep WhatsApp DOM logic at the adapter edge.
- Stop if reliable exact matching requires persistent identifiers, message inspection, or ambiguous auto-selection.
- Do not silently absorb unread-batch, durable pinning, prompt removal, or adaptive-friction work.
- No title-bearing test fixture may use real conversation data.
- Stop for Navigator validation before aggregate Validation, release, push, or deployment.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
