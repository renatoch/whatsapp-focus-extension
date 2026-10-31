# Surface-aware normal-mode expiry

## Compact confirmation labels

Navigator reported the longer Continue label pushed “Abrir mesmo assim” onto another
row. Restored “Continuar na conversa” in the normal-mode confirmation and used the
analogous “Continuar no canal” there. Main focus-card labels retain “aberta”/“aberto”.
No font, button spacing, timer or Status change. Text replacement remains guarded
by equality to avoid the previous observer loop. Label-context and observer-settling
regressions pass; full suite 203/203. Chrome line placement awaits confirmation.

## Channel geometry correction and Status acceptance

Navigator confirmed Status behavior works as expected, then requested channel focus
preserve the lateral column rather than expanding #main. Channel CSS now uses
visibility:hidden + pointer-events:none on the same two evidenced native structures
and their descendants, instead of display:none. This keeps the sidebar's allocated
width while hiding both newsletter content and underlying Chats; #main and navigation
rail are untouched. Descendant visibility rules prevent explicit native visibility
styles from exposing items. No Status policy, timer or observer logic changed.
Regression test first rejected the collapsing rule, then passed with geometry-
preserving CSS; full suite remains 202/202. Channel layout needs manual confirmation.
The earlier width-expansion probe below is historical, not the desired layout now.

## Urgent observer-loop correction

Navigator reported F5 stalled and Chrome offered to terminate the unresponsive tab.
Code inspection found the Continue-label update unconditionally replaced textContent
inside updateOverlayState, which itself is called by a subtree childList observer.
Even equal textContent replacement generates child-list mutations: the callback
could continually reschedule itself and starve navigation/input tasks. This defect
was introduced with channel-resume labeling, not by the test-duration shortcut.

Two regression tests failed first: stable updates must not rewrite owned text nodes,
and a simulated child-list feedback queue must settle. The fix only assigns the
Continue label when its text differs. Full suite: 202/202; syntax/diff checks pass.
No selector, expiry policy, channel content, storage or permissions changed.

Recovery requires terminating only the hung tab if it cannot reload, reloading the
extension from chrome://extensions, then opening a new WhatsApp tab. Do not kill the
whole normal Chrome profile or repeatedly force F5 in the starved renderer. Manual
browser confirmation is pending; no private-content inspection was performed.

## Focus policy confirmed; ten-second test shortcut

Navigator reported channel expiry returned blind and the overlay lacked Resume.
A real timer in the active dedicated-extension session reproduced this exact bounded
snapshot: surface=channel, visible=true, documentHasFocus=false, hasMain=true,
destination=blind-overlay. Detection remained channel before/after layout hiding,
two frames and a settled delay; selected-cell markers stayed present. The suspected
virtualization/marker-loss cause was NOT reproduced; no classifier cache was added.

Root cause for this reproduced path is the retained focus-policy fallback, not a
channel selector. Navigator explicitly confirmed KEEPING it: an unfocused document
or hidden tab must return blind even for native Status/channel, accepting false
negatives to prioritize focus. This is intentional behavior, not a pending policy bug.

Resume fix: overlay now offers Continuar no canal aberto for a known selected
channel. Explicit Continue enters native focused-channel continuation directly,
clears overlay/conflicting mode classes, never normalizes to Chats/captures a recent
and does not start a new bypass. 198 tests pass, including actual Continue/helper/
overlay wiring. It is independently safe; whole channel-expiry acceptance is still
pending. Login/linking-screen work is queued next in login-surface-plan.md.

## Test duration without repeated reloads

Alt+Shift+T in the WhatsApp tab toggles a tab-memory flag between 10,000 ms test
and normal 300,000 ms duration. It is trusted-keydown only, ignores auto-repeat,
changes the existing full-mode button label and reports the next-opening duration.
The controller samples duration once at start, never shortens/extends an armed timer.
Reload resets to normal; no storage, telemetry, permission or background command.
The eight-second confirmation delay is unchanged. The toolbar popup is now static
information/shortcut reference, with all legacy clipboard/ZIP UI removed.
200 tests pass after shortcut/popup cleanup; native Chrome acceptance remains pending.

## Initially implemented scope; Chrome acceptance pending

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
- `surface-expiry.js`: explicit `continueChannel` supports resume from Focus without
  a new deadline. It owns bypass timer, continuation state, generation guards and
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
