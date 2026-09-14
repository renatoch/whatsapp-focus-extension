# Delivery Story Plan — DS5

**Journey:** extensao-chrome-foco-whatsapp-web
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Focused Fixed Collections

## Objective

Deliver collapsed, persistent focused collections that let the user explicitly organize and safely reopen a small cross-archive set of WhatsApp conversations without recreating the general inbox or persisting unauthorized WhatsApp-derived data.

## Child Work Packages

- DS5.TS1
- DS5.US1
- DS5.US2
- DS5.US3
- DS5.US4
- DS5.TS2

## Scope

- Add a pure `fixed-collections.js` domain boundary for sanitization, uniqueness, 5×8 limits, create/add/remove/delete operations, and recovery from malformed state.
- Persist a versioned collection schema under an extension-owned `chrome.storage.local` key.
- Persist only user-authored collection names and explicitly selected WhatsApp display titles.
- Add **Adicionar à coleção** while a focused conversation with a readable title is open.
- Open a compact chooser that supports an existing collection or **Nova coleção** without exposing the WhatsApp list.
- Render collections beside session recents on the focused-conversation navigation shelf, collapsed by default with name and member count; allow at most one expanded collection.
- Reuse the proven hidden native-search path and exact unique title classification to open a member across the main list and Arquivadas.
- Allow removing one member and deleting one collection without changing unrelated collections.
- Keep session-only focused recents behavior intact and independent.

## Non-Goals

- Reading or persisting messages, previews, search terms, phones, JIDs, URLs, unread state, timestamps, badges, archival state, or DOM snapshots.
- Importing WhatsApp custom lists or adding conversations automatically from activity, recency, unread state, or full mode.
- Renaming or reordering collections, moving members between collections, nested collections, synchronization across Chrome profiles, or mobile collection UI.
- Native **Marcar como não lida** behavior or the frozen unread-processing batch.
- Changing whether any WhatsApp conversation is archived.

## Acceptance Behavior

```text
Given a focused conversation from either the main list or Arquivadas
When the user adds it to a new or existing collection
Then only the collection name and exact display title are persisted locally
And the collapsed collection appears on the open focused-conversation shelf with its member count
And the user can switch members without first returning to the Modo Foco overlay.

Given a persisted collection after a page reload
When the user expands it and selects a uniquely named member
Then that conversation opens through hidden native search without exposing the general list
And the collection returns to its collapsed focused surface.

Given a missing, renamed, or duplicate title
When the user tries to open that member
Then navigation fails closed with a useful recovery message and opens no partial match.

Given the 5-collection or 8-member limit
When the user attempts to exceed it
Then the extension refuses clearly without altering existing collection data.
```

## Validation Route

E2E is required because persistence and WhatsApp DOM navigation cannot be established by unit contracts alone.

1. Automated: run all Node tests, JavaScript syntax checks, manifest JSON validation/equivalent parse, and diff checks.
2. Privacy inspection: inspect the isolated collection key after create/add/remove/delete and verify its exact allowlisted shape.
3. Live Chrome: create **Casa**, add at least one main-list and one archived conversation, reload, enter a focused conversation, expand the collection on that same surface, and open both without returning to the overlay.
4. Live failure safety: use or simulate a missing/ambiguous title and confirm that no conversation opens.
5. Live limits/removal: confirm 5×8 enforcement, remove one member, delete one collection, and verify unrelated data remains.
6. Navigator acceptance: collections feel like a small collapsed map rather than a second inbox.

## Implementation Contract

- Use TDD for the collection model, persistence adapter boundary, integration contracts, privacy allowlist, limits, and failure cases.
- Keep the persisted model separate from session-only `focusedRecents`; do not silently make recents durable.
- Reuse exact-title normalization/classification and the evidenced `mousedown` activation route instead of duplicating WhatsApp navigation logic.
- Keep collection expansion state in tab memory; persistence stores collection membership, not current UI state.
- Render every name with `textContent`; never interpolate persisted values into HTML.
- Treat malformed storage as empty safe state without reading page `localStorage` or migrating unrelated keys.
- Do not emit collection names or member titles to awareness events, exports, diagnostics, logs, URLs, or project artifacts.
- Stop for Navigator review if reliable cross-archive reopening would require persistent WhatsApp identifiers or broader DOM-derived storage.
- Scope implementation to the six DS5 child packages; no silent absorption of native unread work.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
