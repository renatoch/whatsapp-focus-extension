[< Story](index.md)

# Test Guide — DS5

## Aggregate Validation

Validate the collection model, extension-isolated persistence, collapsed interaction surface, exact reopening, destructive actions, and privacy boundary as one end-to-end outcome.

## Automated Checks

- Pure collection operations: sanitize, create, unique names, add unique member, remove member, delete collection, 5×8 limits.
- Storage boundary: versioned allowlisted schema; malformed or unknown fields are discarded safely.
- Integration contract: `fixed-collections.js` loads before `content.js`; collection UI never uses `innerHTML` for persisted text.
- Navigation reuse: collection members pass through the same exact unique classification and hidden-search activation as focused recents.
- Privacy: titles and collection names never reach awareness, diagnostics, exports, logs, URLs, page `localStorage`, or unrelated storage keys.
- Regression: all existing awareness, expiry, search-gate, and focused-recent tests remain green.

## Live Chrome Route

1. Reload the unpacked extension and WhatsApp tab.
2. Open a normal focused conversation and choose **Adicionar à coleção** → **Nova coleção** → `Casa`.
3. Add a second conversation to `Casa`, including at least one member currently in Arquivadas.
4. Return to Modo Foco and confirm `Casa` is collapsed and shows only its name and count.
5. Expand `Casa`; confirm no previews, unread markers, timestamps, or unrelated conversations appear.
6. Open each member and confirm the general list and intermediate search results remain hidden.
7. Reload the page; confirm `Casa` and its members remain while the collection is collapsed again.
8. Remove one member; confirm other members and collections remain unchanged.
9. Delete `Casa`; confirm it disappears and does not return after reload.
10. Inspect `chrome.storage.local`; confirm only the approved version, collection names, and selected display titles exist under the collection key.

## Failure And Limit Route

- Attempt to add the same title twice to one collection: membership remains unique.
- Attempt a sixth collection and a ninth member: the action is refused without data loss.
- Exercise a missing, renamed, or duplicate title: no partial conversation opens and recovery guidance appears.
- Exercise a malformed stored payload: the extension recovers to an empty safe collection state.

## Navigator Validation

**Expected observation:** a recurring collection spanning main and Arquivadas survives reload and makes focused switching easier while remaining visually quiet and collapsed by default.

**Pass condition:** the complete create/add/reload/expand/open/remove/delete route works; exact failure safety and 5×8 limits hold; storage contains only approved names and titles; DS1 behavior remains intact.

**Fail condition:** the general list flashes, a wrong/partial title opens, unauthorized WhatsApp-derived data persists, collection state leaks into page storage or telemetry, archived members require archival mutation, or the surface behaves like another inbox.

## Validation Evidence

Pending implementation, automated checks, privacy inspection, live Chrome execution, and Navigator acceptance.
