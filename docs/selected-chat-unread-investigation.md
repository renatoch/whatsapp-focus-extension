# Selected chat → native unread → close — investigation only

## Request / scope

After accepting the original unread-and-leave implementation, Navigator questioned
why it searches by title and closes first. They reported their manual flow: mark
unread while selected, then deselect. Investigation authorized; NOT implementation.
Navigator chose an already-read conversation in the retained dedicated diagnostic
profile and explicitly allowed it to remain unread/closed at the end. No other
conversation was opened, no messages sent, archive membership/settings unchanged.

## What was established

1. From #main conversation-header's React ancestors, captured a unique native chat
   model transiently, without reading/exporting its title, phone or JID. Verified
   unreadCount was initially zero and native composer existed (conversation, not
   Status/channel). Revalidate the current header model before acting.
2. Native header and row can use different proxies for the SAME underlying model.
   Reference equality alone initially failed. Observed WAWebStateUtils.unproxy in
   native Cmd code and used it to compare canonical model references, not identifiers.
3. A bounded walk of the committed React root matched that canonical model to its
   currently mounted sidebar row. Did NOT search, type a title or scroll to find it.
   Synthetic mouseover, bounded wait and fresh row reacquisition exposed context-btn.
4. Opened ONLY that row's native menu while the chosen conversation stayed selected.
   Recognized exact unread label in descendants (shortcut annotations can be adjacent
   in whole text). No raw menu/title/message text was returned to tool output.
5. Native Cmd exposes markChatUnread and closeChat. Reviewed their static code:
   markChatUnread unproxies its model and triggers the native mark_chat_unread path;
   closeChat unproxies its target and triggers native closure. These are native
   account/UI commands, NOT setters for an extension-only reminder or badge.
6. Used a temporary debugger function-call breakpoint on Cmd.markChatUnread, then
   clicked the real native unread menu action. Before allowing the call to continue,
   compared the argument's canonical model to Navigator's chosen model. Equal.
   Observed native call contract: Cmd.markChatUnread(chosenModel, true).
   No monkeypatching of Cmd, no fabricated model/collection events. Breakpoint removed
   and execution resumed normally. Only booleans/argument-type metadata exported.
7. After native action: #main still present, chosen model still selected, unread
   state true, native icon-unread-count present. Thus close-first is NOT a demonstrated
   requirement: native UI successfully marked this selected conversation unread.
8. Then invoked Cmd.closeChat(chosenModel) after rechecking it was the same selected
   model and already unread. No Escape key was used/tested, no chat reopened.
9. At 100ms, 500ms and 2500ms cumulative after closure: #main absent, native model
   unread true, freshly reacquired row's native unread badge present, archive flag
   unchanged. No title lookup/global search/settle interval was involved.

## Conclusion and precise validation limits

The user's manual ORDER is demonstrated. A canonical model reference is a stronger
operation-local identity than a title and can avoid the hidden-search lookup. Native
mark command and targeted native close command exist, with the marking arguments
observed from the actual UI path. Native models stay in page memory; no identities
need to cross a MAIN/isolated boundary.

This was NOT a new installed implementation. Marking was initiated through the native
row menu while selected; its Cmd invocation was intercepted/verified, NOT independently
called as a replacement extension action. Direct targeted Cmd.closeChat was exercised.
Do not claim an isolated direct mark+close implementation or native-menu-independent
focused-mode integration has already been validated. The native menu may do additional
UI work around its Cmd call; prove direct invocation equivalence before replacement.
Sidebar-hidden selected capture/call, cancellation, auth/navigation ownership, original
mode/deadline/clipboard/toast interactions and mobile sync for this reordered route
still need tests. Visibility/window-focus at the precise mark invocation was not
recorded; do not infer focused-window expiry equivalence from this sample. Previous
mobile-sync acceptance covered the old close-first flow, not this new order.

No reopening the just-marked-unread target just to repeat: that can read new messages.
Any further selected-chat mutation test needs a user-selected/authorized case. No need
to redo proof by name or open an unrelated conversation. Escape is a separate optional
UI question, not a prerequisite: targeted native close already worked here.

## Implementation direction, only if Navigator authorizes

A scoped MAIN-world operation could capture/canonicalize the current conversation,
verify trusted action/current identity, perform the native marking and targeted close,
then confirm native model unread + native deselection. Keep model references private
and transient. Do NOT expose a generic command-by-name or arbitrary-target bridge.
Preserve existing normal/sidebar/focused landing, original deadline, cancellation and
error-only feedback. Never silently invoke mark-read or mutate unreadCount manually.
Only use the old safe route as a fallback BEFORE any partial native action, not as a
blind second attempt after a newer human navigation. Fail closed on module/schema drift.

## Checkpoint

Investigation only. No content script, manifest, CSS, storage, permissions or production
behavior changes. Accepted code checkpoint remains 322 passing tests; no new tests
claimed for an unimplemented replacement. DS6 untouched; no release/distribution.
Temporary selected model/probe/debugger references must be cleared, owned Chrome closed,
port 9222 verified closed, linked profile retained. Target left unread and closed.
