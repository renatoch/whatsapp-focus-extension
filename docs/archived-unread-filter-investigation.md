# Archived unread filter — reanalysis: logical data is already available

The initial scroll/snapshot proposal below is superseded, NOT approved. Navigator
challenged the conflation of virtual rendering with data loading and requested a
new analysis. A read-only logical-data adapter is now the direction to investigate;
no filter implementation is authorized by this analysis request alone.

## Requested outcome

Navigator resumed the separate backlog item after accepting unread-and-leave:
offer the equivalent of the main list's Unread filter inside Archived. A filter
must not silently omit unread conversations that are outside the mounted window.
This is NOT a request to unarchive chats, mark them read or mark them unread.

## Bounded native evidence

Retained dedicated Windows profile, loopback CDP 9222; Navigator opened Archived
with no selected conversation. Only reviewed structural counts/control categories
were returned. No names, previews, messages, IDs, phone values, HTML or screenshots
were exported. No conversations were opened or archive/account settings changed.

- Visible `[data-testid="archived-drawer"]` contains
  `[data-testid="archived-chatlist"]` outside `#side`.
- No input/contenteditable, Unread tab or filter control was found inside the drawer.
  The main Unread button is a native `button[role="tab"]` within `#side`, not Archived.
- Selecting that exact native Unread tab changed its `aria-selected` to true but
  left Archived mounted rows at 16, only 3 with native unread badges. Thus it did
  NOT filter Archived. Original tab selection was restored and verified; Archived
  stayed open and `#main` stayed absent throughout.
- Archived rows are absolutely positioned and virtualized. Native scroller had
  clientHeight 561 and scrollHeight 29674 during a separate bounded scroll probe.
  Mounted windows were 16 at top, 16 midway and 15 at bottom; the original first
  node was disconnected after scrolling. Counts are window observations, NOT
  total conversation or total unread counts.
- The scroll probe restored its original scrollTop and verified `#main` absent.
  Incoming updates can change counts between probes; no inference of total unread
  count or remote read state is made from these samples.

## Rejected shortcuts

- Clicking the main Unread tab: observed to affect only the underlying main view.
- Hiding read rows in currently mounted DOM: incomplete, leaves gaps or prevents
  reaching later virtualized unread rows. Must not claim a complete filter.
- Guessing native search operators, accessing private WhatsApp model/store APIs,
  harvesting IDs, or copying native DOM/message previews: not part of this proposal.

## Initial proposed fallback — superseded after reanalysis

A local, explicit-refresh Archived unread view rather than a supposedly native/live
filter: boundedly scroll the native archive under an activity/blocking layer, collect
only unread titles transiently in extension memory, restore native scroll, and show
an extension-owned result list. Never open chats during enumeration, persist data,
copy previews, or send anything to a backend. Native unread badges remain the source;
this must not turn into an extension-maintained reminder state.

This costs a traversal proportional to archive size and is a snapshot, not reliable
instant/live filtering. Provide explicit Refresh; never represent a partial,
cancelled, timed-out or unstable traversal as an exhaustive/empty successful result.
Do not choose timeouts, claim latency or design a native-like toggle before aligning
on that tradeoff with Navigator.

If accepted, a detailed design must first establish stable enumeration/deduplication
under node recycling/reordering, completion and cancellation bounds, restoring the
original view only while still owner, auth/mode/deadline invalidation, clearing all
transient names on exit, and exact unique fail-closed native navigation on an explicit
result click. Do not reopen based on a stale row or title; duplicate titles must not
silently select a different chat. Archived membership must remain untouched.

## Reanalysis: runtime data versus rendered rows

Reopened only the retained dedicated profile, navigated to the public WhatsApp root
and then the exact native Archived navigation control. No chat was selected/opened,
no filter/model state was mutated, and no scrolling was needed for these findings.
Inspection returned structural schema, aggregate counts and reference-equality
booleans only; never names, model identifiers or message fields.

- A React ancestor of archived-chatlist supplies a `data` array to the native list
  renderer. It held hundreds of logical entries despite only 16 mounted DOM rows.
- In the aggregate verification sample: 389 entries, 389 `entry.chat` models, all
  with `archive === true`. Their numeric `unreadCount` values included 2 positive,
  2 negative and 385 zero. Do not assume `> 0` is the entire unread predicate; manual
  unread/negative-counter semantics need explicit tests.
- Read-only reference matching inside each mounted row found its corresponding
  model in that logical array: 16 matches. Comparing `unreadCount !== 0` against
  native icon-unread-count presence yielded zero mismatches in this mounted sample.
  This is sample validation, not full filter/runtime acceptance for every edge case.
- Array sizes changed during startup (383 then 389), so adapters must respect live
  native updates/current committed React state, not cache a presumed fixed total.
- Main-world inspection can access React expando metadata; the installed extension's
  isolated world was separately tested: the DOM list exists, but the React Fiber
  property is NOT accessible there. A normal content-script DOM helper alone cannot
  directly consume this source.

Correct conclusion: virtualization does NOT require enumerating all rows by scroll.
The native logical list already contains metadata usable for an in-memory unread
selection. The earlier assumption that a full traversal/static snapshot was required
was premature. Main Unread still demonstrably does not filter Archived; absence of
an exposed UI toggle is not proof that client-side filtering requires scrolling.

Recommended next prototype: a minimal MAIN-world, READ-ONLY adapter, communicating
only the minimum transient list metadata locally to an isolated extension-owned view.
Never replace/splice the native data array, dispatch React hook setters, mutate chat
models or call unknown account/store methods. No names in CDP/tool output, logs,
backend, storage or telemetry. This introduces private-UI coupling that must fail
closed on missing/changed schema; it is a tradeoff, not a stable official API.

Before shipping: verify current committed fiber selection, live freshness, title
extraction without previews/IDs, duplicate-name handling, bounded bridge payloads,
mode/auth/deadline cleanup, and explicit-click native navigation. Reusing/mutating
the native renderer is NOT yet established safe; an independent local view may be
safer. Do not force the old slow scan/Refresh-only UX without new evidence.

## Status

Investigation only; corrected approach needs prototype validation. No extension implementation or manifest
change yet. Existing accepted implementation has 275 passing Node tests; those tests
do not establish an Archived filter. DS6 remains isolated, no release/distribution.
