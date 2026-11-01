# Mark unread and leave the conversation — prototype

## State and placement

Navigator confirmed the investigation's unread state synced to the mobile list,
then explicitly authorized implementation. The principal case is ALREADY FOCUSED:
only the conversation visible, #side hidden. The new trusted-click action is
an envelope to the LEFT OF SEARCH in the conversation header, with tooltip and
accessible name “Marcar como não lida e sair da conversa”. The previous lateral
button was removed after Navigator accepted the action but found the column noisy.
It is available only for a known conversation, not Channel/Status/login, search or
a native modal. The action/controller/native mutation sequence is unchanged.

Implementation is on main; 269 Node tests pass at this checkpoint. Navigator
accepted both the installed common focused flow and header placement. Subsequent
feedback: several seconds felt stalled, native/extension success notices duplicated,
and normal-mode use wrongly hid the sidebar. Activity/error-only feedback and
origin-mode preservation are now implemented; their installed-runtime confirmation
and Archived remain pending. No DS6 work/release.
[Initial native investigation](mark-unread-and-deselect-investigation.md).

## End state

WhatsApp remains open. The conversation is natively unread AND deselected. From
focused mode the user lands in EMPTY focused search/recents/collections; from normal
mode or an explicitly visible sidebar, that mode remains, with its previous native
main-list query restored. No new normal-mode bypass, mandatory confirmation, new
shortcut or extension-only reminder. Mark unread does not reverse read receipts or override reading elsewhere.
Opening the chat on another client can mark it read again, as normal WhatsApp behavior.

## Implementation

`mark-unread.js` owns a bounded single-flight transaction and a narrow native DOM
adapter. The title is operation-local, case-sensitive after the existing NFKC title
normalization, and cleared on completion/cancellation. No title/state history,
clipboard, telemetry events, storage keys, permissions or backend were added.

1. Snapshot the origin mode and, only for a visible sidebar, its current search
   query transiently. Preserve an existing normal-mode deadline; cancel old bypass
   only for focused origin. Cancel countdown/capture/navigation work and close menus.
   Add only mwf-mark-unread; do not enter normal mode or reuse another operation's
   opening-recent class. Ignore typing/duplicate clicks during the short transaction.
   Escape or Alt+Shift+F can cancel; auth/new navigation invalidates the operation.
2. Keep #side rendered but opacity=0/pointer-events=none. Native command menus use
   filter:opacity(0), preserving native opacity animations. Block native pointer
   interaction while busy. The header envelope becomes disabled with aria-busy;
   it disappears when its conversation header closes. A separate polite status
   “Marcando como não lida…” and reduced-motion-aware spinner persists until cleanup.
   No lateral button is added; no unrelated toast is hidden by progress cleanup.
3. Use the existing hidden native-search route, scoped strictly to Conversas/Chats.
   Wait the existing 1000ms settle interval AFTER input dispatch, then require a
   unique exact-title result stable over two samples. Never trust old query results,
   duplicate display names, a stale connected node or a Groups/Messages result.
4. Open the evidenced header menu and invoke only Fechar conversa. Confirm #main is
   absent before any mark-unread command. Wait for native action popup dismissal.
5. Repeat lookup after close/normalization because search/row nodes may be replaced.
   If the native icon-unread-count is already present, do not toggle it. Otherwise
   mouseover the revalidated row and click its context-btn. Invoke the exact native
   Mark unread command, never the opposite Mark read command.
6. Reacquire the unique result after marking and confirm a visible native
   icon-unread-count on a stable row, twice, while #main remains absent. Native
   badge confirmation avoids reopening a verification popup solely to dismiss it.
7. Before unmasking a still-valid visible-sidebar origin, restore its previous
   main-list query and wait for the usual search settle interval. A bounded final
   hook keeps cancellation/deadline guards active throughout this restoration.
   Focused origin uses setSearchMode; visible origin does NOT call setNormal,
   setSearchMode, start or cancel the original deadline. A read-only hasDeadline
   getter detects expiry even before delayed native normalization changes classes.
8. Remove progress/mask on success, failure, cancellation or auth loss. Success
   relies on WhatsApp's own notice; no extension success toast. Errors distinguish
   unconfirmed marking from confirmed marking with failed query restoration. Normal
   origin keeps its lateral on errors too; focused errors use the protective focus
   surface. Secondary field-restoration exceptions cannot strand the mask/progress.
   Cancelled/superseded work never restores an old query, forces a late landing or
   unmasks a newer run. Origin/query snapshots are discarded, never persisted.

## Feedback and mode-preservation checks

New tests exercise actual composition callbacks with the real surface-expiry
controller: the original zero-valued timer handle survives normal completion and
expires at the original deadline, never at a fresh five minutes. Covered focused
landing without success toast, explicit side-open without a deadline, normal errors,
query restoration/settle, cancellation and expiry during work, accessible/idempotent
progress, independent toast ownership, missing/replaced fields, bounded finalization
and cleanup exceptions. Existing full suite passes (269); no new live browser/account
actions were used for these feedback fixes. Processing is not claimed instantaneous;
visible progress explains native lookup/confirmation/restoration waits.

Nested/Archived views and all native list-filter/scroll state are NOT claimed as
restored by this patch; the verified scope is mode/visibility and main-list query.

## Header placement (accepted by Navigator)

The button remains extension-owned under body, NOT a foreign child of React's
native toolbar or menu. Require exactly one visible native Search button in
#main conversation-header (observed Pesquisar, supported Search/Buscar labels).
A reversible mwf-unread-header-slot CSS rule reserves 44px at Search's inline start;
position the 40px envelope in that slot, using native color and direction. Missing
anchor or insufficient header space hides the icon and removes the margin. Refresh
on native DOM replacement and resize; do not repeatedly write SVG/text/styles.
Explicit hidden/overlay/native-transient/channel CSS guards protect native surfaces.
Busy state disables the icon and exposes aria-busy; no new shortcut/storage/API.
The three-button lateral controls return to their original geometry.

A live layout-only probe used the actual UI functions/CSS under a temporary distinct
ID, with a no-op action. The existing protective focus overlay was NOT removed;
only the temporary probe icon's conditional display guard was overridden to measure
its rectangle underneath it. It reserved the slot, remained body-owned with native
header children untouched, retained its SVG, and fit completely inside the native
header immediately left of Search. All probe nodes/styles/resize listeners/classes
were removed. This is geometry evidence, not installed new-header acceptance.
Dedicated debug Chrome was closed gracefully; port 9222 verified closed, linked
profile retained. No new unread mutation occurred during this placement check.

## Evidence executed

The initial investigation established close → mark → native-menu verification and
Navigator confirmed mobile sync. Navigator subsequently accepted the installed
common focused action, then requested and approved this less intrusive placement. A subsequent live probe started from focused mode
(#side display:none), kept the native sidebar opacity=0 and popups concealed, closed
the chosen read chat, invoked Mark unread through row hover/context-btn, and ended
with #main absent, zero remaining native menuitems, the exact row reacquired and
native icon-unread-count present. No message was sent or another chat opened.

That probe exercised native primitives against the chosen row already in DOM, not
the new integrated hidden-global-search button. This is NOT final installed-runtime
acceptance. Probe classes/styles were restored. Synthetic Escape/outside events did
not establish a reliable dismissal route; successful native commands dismissed their
own popups. The implementation does not depend on synthetic Escape for success.

Node coverage includes exact/ambiguous/case-mismatched/missing results, search settle,
replaced rows, hover recycling, close failure, missing menu controls, no unread badge,
already-unread idempotence, single-flight, cancellation, supersession/disposal, auth
reset, native/extension menu separation, disabled/duplicate native commands, masked
CSS, trusted-click-only UI, eligibility, observer-stable labels and empty-search
result composition. JS syntax, manifest file/load order and diff checks pass.

## Short user acceptance route

1. Reload extension and WhatsApp tab once (new manifest script).
2. Choose an already-read conversation you are willing to mark unread; keep it
   closed in other clients. Enter focused view with the native list hidden.
3. Click the envelope to the left of Search (tooltip: Marcar como não lida e sair da conversa). Activity should appear immediately and persist even after
   the chat closes; it disappears at completion. Focused origin lands in empty
   focused search/recents/collections. No extension success toast should duplicate WA.
4. Check mobile unread state from the list without opening the chat. Then search or
   open another recent to verify the landing is usable. Do not open an unread chat
   merely for validation unless the user chooses to do so.
5. Archived still requires a user-selected test: no unarchive, archive-state loss,
   other chat opening or false success is acceptable. Missing native support must
   fail closed. No automatic archive-membership changes are implemented.
