# Archived unread filter — native investigation / design decision pending

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

## Proposed fallback — requires Navigator alignment before implementation

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

## Status

Investigation only; design decision pending. No extension implementation or manifest
change yet. Existing accepted implementation has 275 passing Node tests; those tests
do not establish an Archived filter. DS6 remains isolated, no release/distribution.
