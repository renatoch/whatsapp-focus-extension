# Investigation — mark unread and deselect

## Subsequent implementation

Navigator confirmed mobile unread sync and subsequently authorized implementation.
The initial investigation below is historical; the action now has an implementation
checkpoint with 249 tests. [Current design, limits and acceptance](mark-unread-and-deselect.md).

## Scope and intended result

Navigator authorized INVESTIGATION, not implementation, of a native action for an
already-open conversation. The desired end state is WhatsApp still open, that
conversation marked unread and DESELECTED, with focused search/recents/collections
available. Do not confuse this with closing WhatsApp, showing the full list, or
forcing the initial decision overlay. Marking unread does not undo read receipts.

No production code, manifest, permissions or storage changes in this checkpoint.
DS6 remains separate. All experiments were bounded to the read conversation chosen
by Navigator in the retained linked dedicated debug profile. Navigator explicitly
permitted marking that conversation and leaving it unread/closed. No other chat was
opened, no messages sent, no archive/account settings changed.

## Native evidence

- Header three-dot menu: native “Fechar conversa” exists; no “Marcar como não lida”.
  The observed trigger is a BUTTON in `#main [data-testid="conversation-header"]`
  with `aria-haspopup="menu"`.
- Chosen chat's list menu: native “Marcar como não lida” exists as a BUTTON with
  role=menuitem. Recognize the exact action label in its own descendants; the whole
  menuitem text can also contain shortcut annotations. No shortcut was established.
- In #side, the current header display title matched exactly ONE
  `[data-testid="cell-frame-container"]`. Matching reused existing title selectors,
  case-sensitive normalization and bounded stability checks. Title strings were
  transient local lookup values only, never exported or saved.
- The list-row dropdown trigger is `button[data-testid="context-btn"]`.
  It may disappear when no longer hovered; a synthetic mouseover on the freshly
  revalidated row exposed it, and its native button .click() reopened the menu.
- A synthetic contextmenu event did NOT open the menu in this experiment. Do not
  claim that all untrusted events fail or copy that failed route into production.

## Executed sequence and observations

1. Header command “Fechar conversa” was invoked after confirming the chosen target.
   #main disappeared: native deselection worked without opening another chat.
2. First automatic row-menu attempt failed; processing stopped before marking.
   Navigator manually opened the same row's dropdown to continue.
3. Mark-unread was invoked while #main was absent. A conservative weak-reference /
   title-mutation guard stopped verification because native rendering changed the
   row and removed its dropdown control. A connected node alone is NOT sufficient
   identity proof; do not reuse the old DOM target after mutation.
4. Navigator noted they may have opened the conversation in another chat/client.
   That can interfere with unread state; the early attempt is not a persistence
   or synchronization acceptance result.
5. Repeat: Navigator's current menu and sole native row dropdown were present,
   #main absent, chosen display-title match unique and stable across samples.
   Mark-unread was invoked; the row was reacquired by exact title after rendering,
   using only an operation-local string. Synthetic mouseover + row-button click
   reopened its native menu. It offered “Marcar como lida”, not “Marcar como não
   lida”, and still did after an additional 2.5 seconds. #main remained absent.
   This confirms the common-list native close → mark → verify route in that session.

Collected outputs contained only structural marker provenance, counts, action-kind
enums and booleans. No conversation names, messages, previews, phone/JID/URL values,
HTML, screenshots, credentials or clipboard data were exported. Temporary pointer
listeners / weak DOM references were cleaned up. No native unread history was stored.
Dedicated Chrome was closed gracefully after the successful repeat; port 9222
verified closed, linked profile retained. Chosen conversation was not reopened.

## Candidate implementation plan — NOT executed

1. Offer a single explicit action only for a known conversation, not Channel/Status.
   Capture the open conversation title transiently and require an unambiguous native
   row target before doing anything. Block double invocation and supersede old work.
2. Conceal list/native menus during execution without granting normal mode or a new
   bypass. Reuse the existing hidden-navigation design, but TEST hover/menu behavior
   under that mask; the live route above was not a focused-mask equivalence test.
3. Close the chosen conversation using the evidenced native header command; confirm
   #main is absent before marking. This order avoids the open chat rereading itself.
4. Reacquire and revalidate the unique row after every native render/navigation;
   do not trust a still-connected stale node. Expose its native dropdown through the
   evidenced mouseover/button route and invoke only the exact unread command. If it
   already offers Mark as read, treat it as already unread, never toggle it to read.
5. Reopen the target's menu to confirm Mark as read, without reopening the chat.
   On failure distinguish “closed but marking unconfirmed” from success. Do not
   infer persistence from a click, an unread CSS class, or a disconnected old row.
6. Dismiss any menus and enter focused EMPTY search/navigation, leaving #main absent
   and recents/collections available. Do not show the full list or the initial
   intentional-access confirmation as the final landing surface.

## Remaining investigation/acceptance

- Navigator CONFIRMED unread sync in the mobile list. Keep the chat closed in other
  clients when testing; external opening can reread it.
- Archived conversation route was NOT exercised. Must preserve archive membership
  and confirm native commands/target lookup without unarchiving or opening others.
- Subsequently exercised native close/hover/menu/mark with #side initially hidden
  and a temporary opaque mask: main absent, no menus left, icon-unread-count present.
  Integrated hidden-global-search/button acceptance still pending.
- This investigation checkpoint did not implement the feature. Later authorization
  produced the separate implementation documented above, without a new shortcut or
  persistent reminder. Original baseline was 223 tests; current checkpoint is 249.
