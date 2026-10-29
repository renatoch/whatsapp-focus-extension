# Surface-aware normal-mode expiry

## Implemented scope; Chrome acceptance pending

The five-minute deadline no longer normalizes every active #main to Chats.

| Foreground at deadline (visible, focused tab) | Effect |
| --- | --- |
| Conversation | Normalize Chats, then preserve focused conversation. |
| Selected channel | Keep native content, hide channel drawer and underlying Chats column. |
| Status player | Keep player, suppress extension conversation menus; native person changes remain allowed. |
| Status/channel list, unknown | Blind focus overlay. |

Existing inactive/hidden-tab fallback remains blind overlay at expiry. A preserved
Status player returns to focus as soon as a known list/other surface appears after
closure. An unclassified loading gap alone does not prove closure. DOM commits are
coalesced with one animation-frame reconciliation, not a new timeout or grace period.
Channel continuation keeps the side list hidden; it does not wait for a fictitious
“back to list” action. Leaving the native channel context returns to focus. No new
five-minute period is created by mutation, Status navigation or continued reading.

## Evidence and boundaries

Dedicated-profile structural inspection found:

- `newsletter-drawer` / `newsletter-tab-channel-list` for channel navigation;
- `newsletter-tab-newsletter-cell` with selected descendant `[aria-selected="true"]`;
- selected channel content reuses `#main` (`conversation-panel-wrapper`);
- the channel drawer sits under `[data-testid="drawer-left"]`, separate from #side;
- #side's immediate parent is the underlying Chats column and excludes #main.

A reversible layout probe hid the channel drawer and #side parent: #main remained
the same DOM node, its width expanded from 1011 to 1472 pixels, both side structures
were hidden, then original geometry was restored. No content/media/name was read;
no native clicking/navigation was performed. Channel markers and geometry were
captured before the old installed expiry intervened. A later accelerated probe
could only see unknown/no visible main, so it is NOT evidence that the new installed
controller has passed live testing. Dedicated Chrome was closed; port 9222 verified
closed. Profile remains, without copying/removing its login.

## Ownership

- `native-surface.js`: no import-time DOM access; classifies visible Status before
  channel drawer/selection before conversation. When our CSS has hidden the channel
  sidebar, temporarily removes only the channel-focused class synchronously during
  measurement and restores it before paint, preventing self-hidden detection loops.
- `focus-state.js`: pure expiry decision with optional surface, preserving old input
  compatibility. New destination labels are internal, not new telemetry enums.
- `surface-expiry.js`: owns bypass timer, continuation state, generation guards and
  one queued animation frame. A new bypass/manual focus/explicit focused transition
  cancels obsolete work. Sidebar-only toggles retain the original unexpired timer;
  they can cancel an already-expired continuation. It does not own normal countdown,
  intent state, search-entry timers or whole-application disposal.
- `content.js`: binds native normalization, mode entry, actual observer, CSS markers,
  manual focus and control visibility. No separate duplicate bypassTimer remains.
- `focus.css`: hides only the evidenced channel side structures, suppresses
  conversation shelf/search/add/chooser/Lateral over channel UI, and preserves
  Foco/Ajustar cópia access. Status continuation suppresses extension surfaces.

No new persistence/permissions, channel recents or Status names. Existing recents,
collections, expansion/scroll and exact reopening remain unchanged. “Continue
conversation” is not offered for a channel just because #main exists. Manual Foco
and its shortcut remain available; use normal-mode authorization again if broad
navigation is wanted.

Awareness records `focus_returned` only at an actual focused-conversation application
or blind return (manual/expiry), not merely when keeping native Status/channel.
Conversation expiry records after normalization rather than before completion.
No channel/status label or content is added to the persisted allowlist.

## Verification and next action

174/174 passed during pre-change characterization. Characterization of the known
foreground gap was migrated to the new correct behavior; it is no longer pinned
as a desired legacy behavior. 195/195 pass after implementation/review, including
pure decision, DOM adapter, exact deadline, native continuation/closure, transition
gaps, stale callbacks, single-use normalization, manual Foco/shortcut, reentrant
cancellation and sidebar deadline preservation. JS syntax, manifest and diff checks
also required before checkpoint.

Navigator's short acceptance route after reload of extension + WhatsApp:

1. During natural normal-mode use, leave a selected channel active at expiry:
   content remains, side list disappears, no Buscar/Add/recents overlay appears.
2. On another normal-mode use, leave a Status player open at expiry: it stays open;
   closing to its list returns to focus immediately, without renewing the timer.
3. Spot-check a normal conversation expiry and manual Foco. Test matrix timing is
   automated; no repeated five-minute waits are required just to re-prove every case.

If a live difference appears, gather only the structural state of the user-selected
surface; do not broaden selectors from guesses. DS6 worktree was not changed or
merged; deliberate future reconciliation is still needed.
