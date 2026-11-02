# Mark unread and leave — direct selected-model revision

## State

The original search/close-first version and its header envelope/normal-sidebar UX
were accepted. Navigator subsequently authorized replacing its backend after the
[direct native-command investigation](selected-chat-unread-investigation.md).
This revision is implemented; installed trusted-click validation is pending.
The original [menu/search investigation](mark-unread-and-deselect-investigation.md)
is historical, NOT a requirement for the new path.

## Behavior retained

Use the envelope immediately LEFT OF SEARCH in the conversation header, tooltip
“Marcar como não lida e sair da conversa”. No lateral control added. Trusted clicks
only; no Channel/Status/login/search/modal action. WhatsApp stays open.

- Focused origin: finish in existing empty focused search/recents/collections.
- Normal/explicit-sidebar origin: keep that mode and sidebar, no new normal bypass
  or deadline reset. The operation does not read/write the native search query.
- Immediate polite “Marcando como não lida…”/reduced-motion spinner. Normal sidebar
  remains recognizable under the existing translucent blocker; focused list stays
  hidden. Native pointer/typing blocked while busy; Escape/Alt+Shift+F cancels waiting.
- No extension success toast; native success feedback is not duplicated. Errors never
  claim a failed partial mark was not sent. Closing can succeed before mark is confirmed.

## New backend: no title lookup, no menus, no search settle

`selected-unread-main.js` is a fixed MAIN-world transaction. It canonicalizes the
current committed header's unique chat model with WAWebStateUtils.unproxy. It requires
one conversation search control, bounded/cycle-checked ancestry (512) and traversal
(20000), unique host/model correspondence, finite unread metadata and reviewed
native Cmd function shape. No hard-coded hook index, title/phone/JID lookup or DOM row.

A genuine trusted click on the exact extension envelope captures a one-use model grant
for at most 1500ms. A window message alone cannot mark anything. Recheck model identity
and mode, then execute without yielding between native commands:

```js
if (!targetIsAlreadyUnread) Cmd.markChatUnread(model, true);
Cmd.closeChat(model);
```

The close is targeted and skipped if marking already removed #main. Never close a
newly selected conversation. Native marking is async: AFTER close, check native model
unread plus #main absence twice, 100ms samples, at most 5 seconds. No wait for a search
or query restoration. Already-unread state is idempotent, never toggled to read.

`mark-unread.js` is now the isolated transport/action controller. Its local bridge
carries only run/cancel, numeric request ID, booleans and allowlisted error codes;
no models/titles/IDs/messages cross worlds. Requests are single-flight; timeout 6.5s,
late/foreign/malformed replies ignored. Source/origin checks are not an authentication
boundary against WhatsApp's page JS; the trusted, single-use, current-model grant and
fixed capabilities prevent message-only arbitrary-account commands. No generic Cmd,
arbitrary target, mark-read, send or unarchive interface is exposed.

`content.js` retains eligibility/geometry/progress/origin-mode ownership, but no longer
captures a title for this operation or touches native search. Removed prepareLookup,
hover/menu routing, restoration hooks and their 1000ms settle waits. Focused success
still opens the existing EMPTY user navigation surface afterward; that is not a
lookup of the target conversation.

## Cancellation and failure

Mode/auth/overlay/search/navigation/deadline changes invalidate ownership. Waiting
can be cancelled; already issued native commands cannot be rolled back and must not
be undone with mark-read. Captured model/grant/verification timer is released. No late
landing may seize a newer view. Native membership changes cancel confirmation rather
than silently claiming archive preservation. Schema failures stop with an error;
there is deliberately NO legacy-search fallback after a partial native action.

The native command may take time to acknowledge or be overwritten by another client
reading the chat. A timeout means unconfirmed, not a promise that marking did not
happen. Does not undo read receipts. Keep the target closed on other devices for
synchronization tests. No new storage, permissions, backend or telemetry.

## Validation

Unit/controller/VM coverage replaces obsolete menu/lookup fixtures: canonical current
model/proxy and stale-fiber guards, deep/cyclic/ambiguous schema, native API drift,
trusted one-shot gesture, expiry and wrong-origin/source, fixed payload, async native
mark/close, two-sample confirmation, idempotence, timeout/cancel, newer navigation,
partial errors, no search fallback, original zero-valued deadline and normal/sidebar
preservation, immediate/owned accessible progress and cleanup.

Real investigation proved the native direct transaction on a user-selected already-
read target, including model/badge persistence and unchanged archive flag. This is
NOT installed new-envelope validation. Next: genuine envelope clicks in normal and
focused origin, verify native unread/deselection/landing/deadline and original query
untouched. New live tests require a user-selected authorized read conversation; do
not reopen a newly unread chat or choose an unsolicited target just for coverage.
No new mobile-sync/Archived-case acceptance is inferred. No DS6/release changes.
