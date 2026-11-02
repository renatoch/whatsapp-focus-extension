# Resume checkpoint — Archived unread filter

## Latest visual correction

Navigator reported black-on-dark inactive pill text in light theme; active green was readable. Fixed inactive background to transparent over the native header with native/inherited foreground. Active green unchanged. 322 tests pass. No new browser/account action. Await visual confirmation.

## Latest checkpoint — installed toggle validated, user acceptance pending (historical)

Current total: 321 tests passing. Installed activation exposed an asynchronous off
race: immediate rediscovery before React restoration commit hid the button. Fixed
by retaining the validated inactive adapter on off while restoring current source.
Also added bounded retries for quiet initial unavailable replies during mount.
Regression tests cover delayed commits, negative retries and exhausted retry bounds.

Actual installed trusted clicks passed two on/off cycles (3 unread native rows/full
17 mounted rows), later on with 4 unread rows. Header pill retained and busy cleared,
no errors. Native Back while active removed control; re-entry unfiltered. Focus
shortcut while active hid controls and restored full native 389-entry source verified
read-only. #main absent throughout; no chat rows opened, marks or membership changes.
Natural no-match, opening/sticky retention and live account changes still need user-
selected validation, not fake native events. Do not call those cases accepted.

Navigator asked about automating diagnostic setup. Demonstrated routine extension
reload via existing chrome://extensions own card dev-reload-button, then Page.reload;
no private install APIs. Foreground the WA target before geometry/input, because
background native transitions are throttled. Normal entry for technical tests used
Other, NO note, actual visible UI flow + eight-second wait/explicit recent confirmation.
Do not attribute a personal motive, bypass countdown, force root flags or click hidden
controls. Personal choices/account actions still require user involvement.

Temporary helpers added: /tmp/archive-extension-cdp.ps1, archive-extension-reload.js,
archive-installed-version.ps1 (safe source markers), archive-enter-normal-for-test.js,
archive-navigation-geometry.js. archive-send-input.ps1 now supports reload/foreground/
focus as well as existing input. Context IDs change after every reload. Do not reuse.

CURRENT diagnostic browser CLOSED gracefully and port 9222 verified closed. Profile
retained, normal Chrome untouched. Earlier 'currently OPEN' paragraph below is history.
Next: get Navigator's visual acceptance; optional explicitly user-selected live/empty/
opening tests. Do not redo basic renderer research or ask for routine reload repeatedly.

## Resume progress after token-limit reset (historical)

Navigator resumed and prepared normal Archived with #main absent. Both actual installed
scripts loaded (fresh context IDs were 3 MAIN, 5 UI; never reuse). Missing button was
traced with a read-only instrumented discovery probe: native ancestry was 138 nodes,
not a cycle, exceeding the original 100-parent guard. Corrected guard to 512 with
cycle detection intact; added valid-deep and over-limit tests. Current total 318 pass.

Corrected controller was invoked directly against the real native adapter, without
installing another bridge/listener copy. It subscribed successfully, filtered 16
mounted rows to 3 actual unread rows, remained active/stable, released and restored
16 mounted rows. #main absent and no errors throughout. No native chat rows clicked,
no model/account mutations, no native synthetic collection events. The installed
script still caches the prior 100 guard until extension/tab reload; do not claim its
button was exercised. Next: ask Navigator to reload extension AND tab, then normal
Archived with no conversation selected. Click only the owned filter button.

Diagnostic Chrome is currently OPEN for this ongoing test, loopback 9222. No active
filter/probe remains after the direct controller test. Close owned browser and verify
port closure when validation session finishes. Previous closure below was at pause,
not current state. See /tmp/archive-discovery-diagnostic.js, /tmp/archive-parent-depth.js,
/tmp/archive-controller-runtime.js for reviewed structural/direct-controller probes.

## Why paused

Navigator reported 91% token consumption and asked to finish this checkpoint and
record exactly where to continue. STOP new work; this is an intentional pause,
not completed acceptance. Implementation was explicitly authorized before the pause.

## Repository / boundaries

Stable: E:\renato\mirror\focus-lab\whatsapp-focus-extension (WSL
/mnt/e/renato/mirror/focus-lab/whatsapp-focus-extension), main.
Preserve untracked .mirror/. DS6 is a separate worktree/branch; do not sync/merge.
Ordinary checked backup commits/pushes authorized; no packaging/release/distribution.
Journey DB context is stale; these repo documents are the current continuity.

## Implemented now

- archived-unread-main.js: separate MAIN-world manifest script. Discovers current
  committed native Archived owner using root.current, unique queue/source/model
  reference shape, bounded traversal and native getter/predicate fingerprints.
- Reads native archive source and matchFilter/UNREAD; writes ONLY local presentation
  state, never chat/archive/unread models or backing collection. Keeps native renderer,
  row handlers, selection and scroll controller. Source/order restored fresh on off/exit.
- Active native-event subscriptions plus coalesced DOM-commit reconciliation, idempotent
  list comparison, six-writes/second loop guard, best-effort unsubscription. Native-like
  sticky selected rows by model reference; no IDs exported or used for that set.
- Restore only exact owned drawer/queue. If restoration schema fails, captured native
  Back callback is fallback for that same drawer. No setters on new/replaced owners.
- archived-unread-ui.js: isolated-world body-owned Não lidas pill at Archive header;
  native theme, pressed/busy/keyboard accessibility; explicit no-match overlay, errors
  with Fechar + five-second auto-close; narrow-pane and instant focus/auth CSS guards.
- Local bridge carries only commands/epoch and boolean status (no names/models/IDs).
  Validates window source, origin, types; drawer epochs reject late replies. Command
  acknowledgment timeout and availability probes bounded. No new permissions/storage.
- Original content script list/order unchanged. MAIN and isolated UI are additional
  manifest entries. focus.css adds scoped styles. No original content.js edits needed.

## Validation checkpoint

316/316 Node tests pass; JS syntax and git diff --check pass. Log:
/tmp/archive-filter-pause.txt (temporary, not durable).
New tests: tests/archived-unread.test.js and tests/archived-unread-ui.test.js,
41 cases covering adapter/controller/UI, including cycles, unsupported data, current
fiber resolution, scope/deadline/auth cleanup, subscription errors, loops, latest-source
restore, sticky/manual-negative unread, bridge epochs and missing acknowledgments.

Earlier bounded presentation proofs (before integrated files) demonstrated actual
native 389 -> 3/4 unread rows -> 389 restoration, compact native scroll extent, native
components/handlers/controllers retained, no native row clicked/account mutation.
An empty presentation fixture also restored correctly; its generic native empty text
was not suitable, hence the new explanatory overlay. See investigation doc for counts.

Actual dedicated Chrome startup loaded the new unpacked scripts automatically:
Debugger metadata showed archived-unread-main.js in MAIN context 1 and UI in isolated
context 2. Do NOT reuse context IDs. A contextual button appeared in eligible normal
Archived state, available and unpressed. THIS DOES NOT PROVE FULL TOGGLE ACCEPTANCE.

Agent attempted the existing Alt+Shift+L shortcut for setup; it is NOT a direct normal
mode opener and only works under canToggleSidebar. Final observed state was focused
SEARCH (mwf-searching true, normal/sidebar-open false), Archived native view present,
#main absent, filter hidden correctly. Do not keep sending L in search: it is disabled
there. Do NOT force root classes or click hidden normal-now to bypass the entry policy.
No conversation rows were clicked or selected by agent in this implementation phase.
The diagnostic browser initially had #main present; do not claim none was ever open.

At pause: owned diagnostic browser gracefully CLOSED, loopback port 9222 verified
closed, linked profile retained. Normal Chrome untouched. No active CDP/probes remain.

## First next steps (no re-investigation of already proven renderer wiring)

1. Read docs/archived-unread-filter.md and current files. Confirm git status/branch.
2. Reopen only the dedicated debug profile if interactive validation is wanted:
   tools/start-debug-browser.ps1. Ask Navigator to reload extension and WA tab once,
   enter NORMAL mode through the usual intention/countdown flow, open Archived and
   leave NO conversation selected. This avoids fabricating intentions/bypassing focus
   setup or accidentally opening unread chats. Current source files need fresh loading
   after last guard fixes. Do not infer normal mode merely from native DOM visibility.
3. Check button availability/position, actual trusted activation, native unread rows,
   off/full-list restoration and repeated on/off, without opening chats. Prior actual
   unpacked runtime verified loading/availability only; no trusted toggle clicked yet.
4. Check scope cleanup/exit/re-entry and no-match behavior. Node tests cover these;
   installed behavior still requires runtime validation.
5. Live unread events and exact selected-row retention/opening require separately
   user-selected/authorized actions. Never manufacture native collection events that
   might trigger account-side listeners. Never mark/unarchive or open an unsolicited
   chat just to get a test case. Do not claim this coverage from pure predicates/fixtures.
6. Investigate/fix discrepancies with scoped probes only, no private exports. If native
   on/off subscription signature or React shape differs, fail safe; do not loosen schema
   guards blindly. Maintain original normal deadline and hidden/unfocused expiry policy.
7. On acceptance update docs/closure; until then keep 'implemented, interactive validation
   pending'. Close owned Chrome and verify port 9222 after each finished investigation.

## Temporary helpers (may disappear)

/tmp/channel-cdp.ps1: evaluate reviewed script, optionally fresh ContextId.
/tmp/channel-contexts.ps1: enumerate contexts without exporting origin URLs.
/tmp/archive-debug-scripts.ps1: confirms actual file names/world context.
/tmp/archive-feature-state.js: safe scope/button/count/geometry status.
/tmp/archive-open-only.js: native Archive NAVIGATION only; no chat row activation.
/tmp/archive-send-input.ps1: existing sidebar shortcut or coordinate click (only use
 known extension control coordinates, never conversation rows); L is NOT normal entry.
/tmp/reopen-archive-analysis.ps1: opens public WA root only if target missing.
/tmp/close-unread-debug.ps1: owned-profile Browser.close and port closure verification.
/tmp/archive-native-render-proof.js: MUTATES local presentation temporarily; historical
 proof only. Do not rerun indiscriminately; integrated feature is now the test target.

Git push uses Windows Git if needed:
'C:/Program Files/Git/cmd/git.exe' -C 'E:/renato/mirror/focus-lab/whatsapp-focus-extension' push origin main
WSL fetch may warn credential-manager-core despite success; verify actual status.
