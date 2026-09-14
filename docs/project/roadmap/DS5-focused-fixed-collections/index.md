[< Roadmap](../index.md)

# DS5 — Focused Fixed Collections

**Status:** 🟠 Implemented — pending Navigator validation

---

## Outcome

The user can keep a small private map of explicitly selected WhatsApp conversations in named collections, then move through those conversations without reconstructing searches or opening the general inbox.

Collections remain useful across page reloads and across the WhatsApp separation between the main list and Arquivadas, while revealing no activity signals or message-derived content.

## Why this matters

DS1 reduced repeated search among conversations active in the current tab session. Real use exposed a separate recurring need: a thematic set such as “Casa” can include several groups that are not all recent and can be split between the main list and Arquivadas.

Automatic recency cannot represent that stable relationship. Opening full mode or searching every member again makes the general inbox the easier route.

This Delivery Story translates the promoted exploration in [`../../explorations/focused-fixed-collections/index.md`](../../explorations/focused-fixed-collections/index.md).

## Proposed MVP behavior

- From an open focused conversation, offer **Adicionar à coleção**.
- Use a compact popover to choose an existing collection or create a new named collection.
- Support at most 5 collections with at most 10 unique conversations each.
- Show collections collapsed by default on the focused-conversation navigation shelf, exposing only collection name and member count.
- Allow at most one collection to be expanded at a time.
- Reuse the exact, visually hidden native-search route to open a selected member without exposing the general list.
- Allow a member to be removed and a collection to be deleted.
- Keep fixed collections independent from session-only focused recents and from native mark-unread work.

## Privacy boundary

The Navigator explicitly authorized local persistence for this experiment.

- Persist only user-authored collection names and WhatsApp display titles of conversations explicitly selected by the user.
- Store the collection schema only in `chrome.storage.local`, isolated from WhatsApp page scripts.
- Do not persist messages, previews, search terms, phone numbers, JIDs, URLs, unread state, badges, timestamps, archival state, or DOM snapshots.
- Do not add incoming or merely visited conversations automatically.
- Render all persisted names as plain text.
- Missing, renamed, or duplicate titles must fail closed rather than opening a partial or ambiguous match.

## Product constraints

- A collection is a small private map, not a second inbox.
- Collections are collapsed by default and never display previews, unread indicators, timestamps, or incoming activity.
- Membership changes only through explicit user action.
- The extension must not change whether a member is archived.
- Full mode does not need the collection surface.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| DS5.TS1 | Define the private persisted collection model | Technical Story | A versioned, sanitized `chrome.storage.local` schema enforces the 5×10 limits and admits only collection names and explicitly selected display titles. | Implemented — validation pending |
| DS5.US1 | Add a focused conversation to a collection | User Story | From the open focused conversation, the user can choose an existing collection or create a new one without exposing the general inbox. | Implemented — validation pending |
| DS5.US2 | Browse collapsed focused collections | User Story | The focused-conversation shelf shows collapsed collection names and counts, with no more than one explicitly expanded member list. | Implemented — validation pending |
| DS5.US3 | Reopen a collection member safely | User Story | A selected member reopens through one exact unique hidden-search match across the main list and Arquivadas, failing closed otherwise. | Implemented — validation pending |
| DS5.US4 | Remove collection members and collections | User Story | The user can remove a member or delete a collection while preserving all unrelated collections. | Implemented — validation pending |
| DS5.TS2 | Verify collection privacy and persistence boundaries | Technical Story | Automated and live checks confirm reload persistence, schema sanitization, title-safe rendering, and exclusion of unauthorized WhatsApp-derived data. | Implemented — validation pending |

## Done Condition

DS5 is done when the user can create a collection such as “Casa”, add explicitly selected focused conversations from both the main list and Arquivadas, reload the page, expand the otherwise collapsed collection, reopen each uniquely named member without seeing the general list, remove a member, and delete the collection—while local inspection confirms that only authorized collection names and display titles were persisted.
