# Archived — native Unread filter

## State

Navigator authorized implementation after a reversible native-renderer proof.
Implemented, awaiting final installed interactive validation. 316 Node tests pass
(275 previous + 41 adapter/controller/UI regressions). No DS6 changes or release.
[Investigation, corrected assumptions and native evidence](archived-unread-filter-investigation.md).

## Use

Open Archived while in normal mode or with the sidebar explicitly open. The
**Não lidas** pill in its header toggles native unread filtering. It does not open,
mark, unarchive or send anything. Turning it off restores the latest complete native
list, not a saved snapshot. A conversation opened from the filtered list behaves
normally: opening can mark it read. Native-like sticky retention can keep an opened
row until the filter is turned off, rather than abruptly losing that row.

The control is contextual, not another permanent lateral control. It disappears
on leaving Archived or losing sidebar permission. No-match state explicitly says
there are no archived unread conversations, not that the archive itself is empty.
No filter preference or derived list is persisted.

## Native presentation adapter

- `archived-unread-main.js` runs as a separate MV3 MAIN-world content script because
  page React expando metadata is not visible in the isolated world.
- `archived-unread-ui.js` runs in the isolated world, creating only a body-owned
  header toggle/status and receiving boolean availability/active/empty/error state.
- No chat/model/name/ID/preview data crosses this local bridge. Commands are only
  probe/set/release with a bounded integer drawer epoch. Source/origin/direction and
  payload types are checked; epochs reject late replies from a previous drawer.
  This is not an authentication boundary against WhatsApp's own page JS, which
  already owns the models and DOM. Bridge capabilities are limited to presentation.
- No new permissions, network requests, storage keys, backend or accessible resources.
  The original content-script order remains unchanged.
- Resolve the current committed owner via root.current, never a guessed stale fiber.
  Require unique exact queue/source/model-reference correspondence, native schema,
  finite unread metadata and the archived-only source. No hard-coded hook index.
- Read the existing native archive source getter and native matchFilter/UNREAD
  predicate. Keep original chat models, row renderer, selection and scroll controller.
  Write only the native owner's PRESENTATION state via its captured React setter.
  Never change chat models, source array, collection membership or native filter session.
- Unsupported model/channel schemas disable discovery rather than silently omit rows.
  Private UI coupling is intentionally explicit: this is not a supported WhatsApp API.

## Updates, ownership and cleanup

While active, subscribe to native unread/archive/add/remove/sort/reset/eligibility
events. Reconcile against fresh native source, preserving order and object identity.
Native archive refreshes can overwrite a one-shot filter, so native DOM commits also
schedule bounded, coalesced reconciliation. There is no interval/full-tree polling.
Inactive cached adapters check connectivity cheaply; a full lookup occurs only for
activation/active reconciliation. Equality guards prevent same-list writes. More
than six presentation writes in a second fails closed instead of spinning a renderer
mutation loop. Do not manufacture collection/model events to test this on an account.

Models in the current displayed result that become selected can be held by reference
until off/exit, like native unread retention. No phone/JID is used to maintain this
session-local set. Membership removal prunes retained models.

Leaving archive, auth/focus/overlay transition, normal-mode expiry or mark-unread work
releases ownership and subscriptions. Restore using the latest native source only
for the same still-mounted queue/drawer. Never restore a detached owner/new drawer.
If a changed native schema makes restoration unsafe, use the captured native Back
callback only for that same drawer and show a dismissible five-second error. Native
model state remains untouched. This does not start/cancel/renew any focus deadline.

Pagehide clears observers/timers/subscriptions and restores presentation. Availability
probes and command waits are bounded; a missing bridge cannot leave a disabled button
forever. Instant CSS guards hide body-owned controls under blind/login/transient modes.

## Validation

Automated coverage: native predicate including negative/manual unread counters;
reference/order identity; latest-source restoration; offscreen unread updates; native
refresh overwrite/idempotence; sticky/unarchive/empty behavior; focus/deadline/auth
scope loss; detached/replaced/current committed owners; schema/partial-subscription
failures; parent/sibling cycles; write-loop budget; scoped bridge epochs/origins;
trusted toggle, command timeout, no-match UI, responsive placement and complete cleanup.

Dedicated Chrome runtime startup verified that the actual unpacked manifest loaded
both files in their intended MAIN/ISOLATED worlds and displayed the contextual control
in an eligible normal/Archived state. This is NOT yet a claim that full activation,
live account changes or click navigation were accepted. Final interactive check is
pending; no conversation rows were activated by the agent for this implementation.

Manual route:
1. Reload extension and tab once, enter normal mode normally, open Archived without
   selecting a conversation. Enable Não lidas; all native results should be unread,
   compactly laid out, or the explicit no-match status should appear.
2. Disable it: full current archive/scroll extent returns. Repeat to detect stuck UI.
3. Return to focus/leave Archived: control disappears; re-entry starts unfiltered.
4. Native unread changes may be tested only with explicit user-selected actions.
   Opening a result can mark it read; do not do so unsolicited just for coverage.
5. Naturally occurring login/expiry should clean up; never log out/link devices to
   test. Existing focus deadline must remain unchanged.

Limits: exact installed opening/retention and live-account change acceptance remain
pending. Private React/native module changes can make the filter unavailable. Empty
archive with no native list has no filter control. Narrow panels hide rather than
collide with native header controls. Browser back-forward-cache may require reload
for a stopped script; it must remain unfiltered rather than retain abandoned ownership.
