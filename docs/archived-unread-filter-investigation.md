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
- Guessing search operators, harvesting IDs, copying native DOM/previews or writing
  private model/store state: rejected. Read-only model/predicate access was initially
  excluded prematurely; it was subsequently investigated below.

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

At this stage the proposed prototype was a MAIN-world READ-ONLY data adapter and
an isolated-owned result view. This was not proof that a separate view was needed.
Subsequent explicitly requested native-renderer investigation below instead tested
reversible presentation-state updates. Chat models/collection remain read-only;
production must never splice native source arrays or invoke account/store mutators. No names in CDP/tool output, logs,
backend, storage or telemetry. This introduces private-UI coupling that must fail
closed on missing/changed schema; it is a tradeoff, not a stable official API.

Before shipping: verify current committed fiber selection, live freshness, title
extraction without previews/IDs, duplicate-name handling, bounded bridge payloads,
mode/auth/deadline cleanup, and explicit-click native navigation. Reusing/mutating
the native renderer is NOT yet established safe; an independent local view may be
safer. Do not force the old slow scan/Refresh-only UX without new evidence.

## Main-list strategy: native unread predicate reuse demonstrated

Navigator asked how main-list Unread works and whether the same strategy can be
used. A second structural/static-code investigation and bounded predicate test found:

1. Main-list All supplies an already-derived array to its virtual renderer (10 chat
   entries in this profile/sample). Switching the native Unread tab produced the
   native empty state, not CSS-hidden rows. Original tab selection was restored.
2. Native panel code stores `filter.kind` and derives chat results from the collection
   before virtual rendering. Visibility/archive eligibility is separate from matching
   the filter; the default main-list branch explicitly excludes archived models.
3. Its matching path calls `WAWebChatMessageSearch.matchFilter(chat, filter)` using
   `WAWebChatSearchFilters.SearchFilters.UNREAD`. The reviewed matchFilter dispatches
   to a native predicate; it does not set the session or mark/read/open a conversation.
4. The native panel listens for collection/archive/unread changes and recomputes
   results. It also has active/sticky-chat behavior for Unread, so full parity is more
   than just a one-time array selection. Do not reimplement it by guessing `> 0`.
5. Invoked the existing predicate READ-ONLY against a new local array of archived
   models. Observed 389 archived models, 3 native unread matches: 1 positive unread
   counter and 2 negative. Zero discrepancies with nonzero unread in this sample.
   The original renderer array remained length 389, no chat opened, no scan/scroll,
   model mutation, native hook dispatch, private identity export or account command.
   Counts differed from the earlier sample due live state; they are not a frozen total.

Therefore reuse the native *criterion and logical-data pipeline*, scoped to Archived,
not the main-list button/session as a whole. Conceptual selection (not shipped code):

```js
archivedEntries.filter(({chat}) =>
  chat.archive && matchFilter(chat, {kind: SearchFilters.UNREAD}));
```

This experimentally removes the need to invent the unread rule or enumerate every
DOM row. It does NOT yet prove safe native-renderer injection, live adapter lifecycle,
committed-fiber selection or actual installed-extension behavior. MAIN-world access,
schema/version guards, transient output, live updates, active-row behavior, ownership
and exact explicit-click navigation still require implementation/testing. No setters,
splicing of native arrays or modifying React session/hook state are proposed.

## Native panel connection: bounded presentation proof succeeded

Navigator explicitly requested investigation of the missing native-renderer connection.
No extension implementation was added. The dedicated profile ran a temporary guarded
presentation experiment, then restored the current native source and closed CDP.

### Native contract established

- Archived owner component has only onClose/ref inputs: no exposed filter prop found.
- It has a memoized native source getter selecting archived/eligible collection models
  (and optionally channel models), a local state array, a stable flat-list controller,
  native single-selection controller and a mapping from state models to native entries.
- Its original row renderer creates the native Chat component with the original model,
  selection controller and native onClick handler. Thus changing its PRESENTATION array
  can reuse the actual native panel, not an extension-made conversation list.
- Located the current committed owner by walking root.current, not trusting stale DOM
  fiber/alternate pointers. Identified the local setter by unique array/model-reference
  correspondence and its native source getter by a narrowly reviewed callback contract;
  no hard-coded hook index was used. Abort on nonunique/missing shape.
- The source getter was invoked read-only and verified to return the same complete,
  ordered model references as the original renderer input before any UI update.

### Bounded reversible experiment

A temporary input shield prevented clicking chats during the proof. Native unread
predicate selected a NEW local array. Invoked only the matched local React setter
for panel presentation; did NOT change chat/archive/unread model fields, the backing
collection, filter session, React component code or the source array.

- First run: 389 entries -> 3 entries, 3 actual native DOM rows, 3 native unread badges.
- Expanded run: 389 -> 4 rows, all 4 with native badges. Counts can change between runs
  due live activity; no changes to unread values were observed within either proof.
- Same native flat-list component and controller, original model references, same
  native Chat component type, same single-selection controller, native click-handler
  functions present with the same static implementation. Clicks were NOT invoked;
  installed navigation acceptance still requires an explicit user-selected test.
- Native scroll area compacted to its viewport (562px), not a long canvas with gaps.
- An empty presentation-array fixture removed the native list and rendered its empty
  branch while the Archived owner stayed mounted. The generic Archived empty copy
  is NOT yet an appropriate 'no unread matches' message; this needs explicit UI work.
- Restored using the FRESH native source getter: 389 entries and full native scroll
  extent (29902px in expanded run). Archive flags unchanged, zero model unread changes
  observed; #main absent throughout. Temporary input shield/listeners removed.
- Original collection stayed complete during filtering; no names, previews, IDs, HTML,
  source-model values or screenshots exported, only counts/reference booleans/schema.

### Remaining implementation and limits

This resolves the missing link experimentally: no separate chat panel or scroll scan
is necessary for this observed native version. It is NOT a stable supported API or
installed extension feature. A production adapter will control PRESENTATION state,
not be entirely read-only; only the conversation models/source stay read-only.

Native refresh P() does setRows(nativeSource()) and overwrites a one-shot filter.
Observed archive listeners include sort, change:archive, add/remove, and other native
eligibility changes; explicit change:unreadCount was not among this archive owner's
listener keys. Native main Unread does listen for unread updates. Production needs
owned, bounded subscriptions/reconciliation for both, without fake collection events,
UI write feedback loops, idle full-tree polling or dropping offscreen new unread chats.
Collection on/off methods exist, but listener integration has not been exercised yet.

Still to implement/test: contextual toggle, live reconciliation/order, current-committed
fiber/schema guards, ownership and cleanup on archive exit/auth/focus/deadline/unmount,
restoration from the latest native source, no-unread copy, optional native-like active
chat retention, unsupported channel/schema fallback, input/observer stability, and
explicit user-selected native opening. No account/client changes should be simulated
to test unread events; use fixtures or separately authorized actual user actions.

## Status

Investigation only; native panel filtering/restoration has been demonstrated, extension toggle/live adapter not implemented. No extension implementation or manifest
change yet. Existing accepted implementation has 275 passing Node tests; those tests
do not establish an Archived filter. DS6 remains isolated, no release/distribution.
